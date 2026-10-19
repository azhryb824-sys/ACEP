"""Deterministic preparation only. No model fitting; all fits run on Kaggle."""
from pathlib import Path
import pandas as pd,numpy as np,json,hashlib,re,zipfile,sys
R=Path(__file__).resolve().parent; S=R/'sources'; O=R/'data';O.mkdir(exist_ok=True)
def sha(s):return hashlib.sha256(s.encode()).hexdigest()
# Site groups join permits sharing a normalized public address, including multi-address permits.
parent={}
def find(x):
 parent.setdefault(x,x)
 while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
 return x
def union(a,b):
 a,b=find(a),find(b)
 if a!=b:parent[max(a,b)]=min(a,b)
missing=set()
for p in sorted(S.glob('la-permit-addresses-*.csv')):
 for row in pd.read_csv(p,dtype=str,keep_default_na=False).itertuples(index=False):
  permit=row.permit.strip(); address=re.sub(r'[^A-Z0-9]','',row.address.upper())
  if permit and address and address not in {'UNKNOWN','NA','NONE'}:union('P:'+permit,'A:'+address)
  else:missing.add(permit)
raw=pd.concat([pd.read_csv(p,dtype=str,keep_default_na=False) for p in sorted(S.glob('la-20[12][0-9]-*.csv'))],ignore_index=True)
audit={'raw_records':len(raw),'source':'LA Building and Safety Inspections 9w5z-rg2h','license':'CC0','download_date':'2026-10-19'}
assert len(raw)==1181033
for c in raw:raw[c]=raw[c].str.strip()
raw['date']=pd.to_datetime(raw.inspection_date,errors='coerce').dt.floor('D')
valid=(raw.permit!='')&(raw.inspection!='')&raw.date.notna()&raw.inspection_result.isin(['Approved','Corrections Issued'])&raw.permit.map(lambda p:'P:'+p in parent)
audit['missing_or_invalid_rows']=int((~valid).sum());df=raw[valid].copy();del raw
key=['permit','date','inspection']
dups=df.duplicated(key+['inspection_result']);audit['duplicate_same_outcome_rows']=int(dups.sum());df=df[~dups].copy()
conflict=df.duplicated(key,keep=False);audit['conflicting_daily_event_rows']=int(conflict.sum());df=df[~conflict].copy()
df['y']=(df.inspection_result=='Corrections Issued').astype('int8')
df['site']=df.permit.map(lambda p:sha('ACEP-LA-site-v4|'+find('P:'+p))[:20]);df['year']=df.date.dt.year
# All sites appearing in 2024 are test-only; then remaining 2023 sites are validation-only.
test_sites=set(df.loc[df.year==2024,'site']);val_sites=set(df.loc[df.year==2023,'site'])-test_sites
site_counts=df[df.year==2024].groupby('site').size();eligible=site_counts[site_counts>=30].index
five=sorted(eligible,key=lambda p:sha('ACEP-LA-FIVE-v4|'+p))[:5];assert len(five)==5
contract={'version':'4.0','seed':42190,'task':'Predict Corrections Issued versus Approved for a daily permit/type inspection event, using strictly earlier daily outcomes.',
 'split':'train 2021-2022 excluding any site occurring in 2023-2024; validation 2023 excluding any site in 2024; test all 2024 sites.',
 'site_group':'Connected components of permit and normalized street address. Address aliases may remain; a site is not necessarily a single contract.',
 'five_selection':'First five SHA256(ACEP-LA-FIVE-v4|site) sorted sites with at least 30 eligible 2024 daily events; outcome labels and scores not used.',
 'five_sites':five,'metrics':['accuracy','balanced_accuracy','correction_recall','approval_recall','Brier','ROC_AUC'],
 'pass_rule':{'each_of_five':{'accuracy':0.90,'balanced_accuracy':0.90,'coverage':1.0,'min_per_class':5}},
 'scope':'Conditional inspection outcome forecasting only. No engineering safety certification, defect localization, whole-engine or Saudi generalization claim.',
 'candidates':['always_approved','train_prevalence','logistic_C0.1','logistic_C1','hist_gradient_31','hist_gradient_63','extra_trees_160','neural_mlp_64_32'],
 'selection':'Highest validation balanced_accuracy, tie lower Brier, then candidate order. Threshold 0.10 to 0.90 by 0.025 selected only on validation. Freeze model before opening test labels.',
 'history':'Only approved/correction events since 2021; left-censored and filtered. All events on current date excluded from history; no future statuses, IDs or address used as predictive features.'}
# Freeze the rule and five sites before any candidate fitting or test scoring.
(O/'contract.json').write_text(json.dumps(contract,indent=2)+'\n')
print('frozen contract',hashlib.sha256((O/'contract.json').read_bytes()).hexdigest(),flush=True)
# Daily cumulative history ensures simultaneous inspections cannot leak into one another.
daily=df.groupby(['permit','date'],sort=True).agg(n=('y','size'),bad=('y','sum')).reset_index()
daily['prior_n']=daily.groupby('permit').n.cumsum()-daily.n
daily['prior_bad']=daily.groupby('permit').bad.cumsum()-daily.bad
daily['prior_correction_rate']=np.where(daily.prior_n>0,daily.prior_bad/daily.prior_n,-1)
daily['last_day_correction_rate']=(daily.bad/daily.n).groupby(daily.permit).shift().fillna(-1)
daily['days_since_prior']=(daily.date-daily.groupby('permit').date.shift()).dt.days.fillna(-1)
daily['days_since_first']=(daily.date-daily.groupby('permit').date.transform('min')).dt.days
history=['prior_n','prior_correction_rate','last_day_correction_rate','days_since_prior','days_since_first']
df=df.merge(daily[['permit','date']+history],on=['permit','date'],validate='many_to_one')
df=df.sort_values(['permit','inspection','date'],kind='stable')
g=df.groupby(['permit','inspection'],sort=False)
df['prior_type_n']=g.cumcount();bad=g.y.cumsum()-df.y
df['prior_type_correction_rate']=np.where(df.prior_type_n>0,bad/df.prior_type_n,-1)
df['month']=df.date.dt.month
features=['inspection','month']+history+['prior_type_n','prior_type_correction_rate']
df['permit_id']=df.permit.map(lambda p:sha('ACEP-permit-v4|'+p)[:20]);df['event_id']=[sha('|'.join((p,d.strftime('%Y-%m-%d'),t)))[:24] for p,d,t in zip(df.permit,df.date,df.inspection)]
df['date']=df.date.dt.strftime('%Y-%m-%d')
train=df[(df.year<=2022)&~df.site.isin(test_sites|val_sites)]
val=df[(df.year==2023)&df.site.isin(val_sites)]
test=df[df.year==2024]
assert not (set(train.site)&set(val.site) or set(train.site)&set(test.site) or set(val.site)&set(test.site))
assert train.date.max()<val.date.min()<test.date.min()
cols=['event_id','site','permit_id','date']+features
for name,part in [('train',train),('validation',val),('test',test)]:
 part=part.sort_values(['site','permit_id','date','inspection'])
 part[cols].to_csv(O/f'{name}_features.csv.gz',index=False,compression={'method':'gzip','mtime':0},float_format='%.8g')
 part[['event_id','y']].to_csv(O/f'{name}_labels.csv.gz',index=False,compression={'method':'gzip','mtime':0})
 audit[name]={'rows':len(part),'sites':part.site.nunique(),'permits':part.permit.nunique(),'first_date':part.date.min(),'last_date':part.date.max()}
 # Do not inspect test class frequencies prior to freeze/selection.
 if name!='test':audit[name]['correction_rate']=float(part.y.mean())
audit.update(usable_records=len(df),model_features=features,discarded_for_temporal_group_isolation=int(len(df)-len(train)-len(val)-len(test)),five_site_event_counts={s:int(site_counts[s]) for s in five},site_normalization='uppercase alphanumeric exact address; connected to permit; no fuzzy parcel merge',quality_limit='Duplicate identical daily events are coalesced; contradictory same-day/type outcomes are quarantined.')
(O/'audit.json').write_text(json.dumps(audit,indent=2)+'\n')
manifest={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in O.iterdir() if p.name!='manifest.json'}
(O/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(audit,indent=2),flush=True)
with zipfile.ZipFile(R/'inspection_data_v4.zip','w',zipfile.ZIP_DEFLATED,6) as z:
 for p in sorted(O.iterdir()):z.write(p,'data/'+p.name)
print('package bytes',(R/'inspection_data_v4.zip').stat().st_size,flush=True)
