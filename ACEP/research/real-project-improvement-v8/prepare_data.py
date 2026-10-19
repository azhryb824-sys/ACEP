"""Freeze previously unused FDOT contracts and award-time feature ablation. No fitting."""
from pathlib import Path
import json,hashlib,math
import pandas as pd,numpy as np,openpyxl
R=Path(__file__).resolve().parent;D=R/'data';D.mkdir(exist_ok=True)
V6=R.parent/'real-project-improvement-v6'
if not V6.exists():V6=R.parent/'real-projects-v6'
if not V6.exists():V6=R/'sources/fdot-v6'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,x):(D/n).write_text(json.dumps(x,indent=2,allow_nan=False)+'\n')
def norm(s):return ' '.join(str(s or '').split()).lower()
def num(x):
 try:z=float(x);return z if math.isfinite(z) else None
 except (TypeError,ValueError):return None
old=pd.read_csv(V6/'data/audited_contracts.csv',dtype={'district':str,'project_family':str})
dev=old[old.report_end.le('2021-06-30')].copy()
test=old[old.split.eq('excluded')&old.let_date.ge('2022-07-01')&old.let_date.lt('2023-01-01')&~old.project_family.isin(old.loc[old.split.ne('excluded'),'project_family'])].copy()
assert len(dev)==1612 and len(test)==98
assert not set(test.contract_id)&set(old.loc[old.split.ne('excluded'),'contract_id'])
assert not set(test.project_family)&set(old.loc[old.split.ne('excluded'),'project_family'])
needed=set(dev.contract_id)|set(test.contract_id)|{'E6M90'};extra={};quality=[];sources=[]
for rec in json.loads((V6/'sources/downloads.json').read_text()):
 if rec['file'] not in set(pd.concat([dev,test,old[old.contract_id.eq('E6M90')]]).source_file):continue
 p=V6/'sources'/rec['file'];assert sha(p)==rec['sha256'];sources.append(rec)
 w=openpyxl.load_workbook(p,read_only=True,data_only=True);s=w['Detailed Data'];it=s.iter_rows(max_col=112,values_only=True);head={norm(x):i for i,x in enumerate(next(it)) if x is not None}
 for ri,row in enumerate(it,2):
  cid=row[head['contract number']]
  if cid not in needed:continue
  expected=old[old.contract_id.eq(cid)].iloc[0]
  if expected.source_file!=p.name or expected.source_row!=ri:continue
  get=lambda name:row[head[norm(name)]] if norm(name) in head else None
  estimate=num(get('DOT Original Estimate'));typ=str(get('Innovative Contract Type') or 'UNSPECIFIED').strip()
  extra[cid]=dict(dot_original_estimate=estimate if estimate and estimate>0 else np.nan,contract_type=typ)
  paid=num(get('Total CRS Amount Paid to Contractor'));actual=num(get('Actual Expenditure (Does Not Include Innovative Contract Adjustment Payments)'));after=num(get('Amount Paid After CRS'));innov=num(get('CRS Innovative Contract Adjustments'))
  # Different reporting scopes can prevent a simple identity. Flag, never invent a correction.
  flags=[]
  if paid and paid>0 and actual and (actual/paid<.1 or actual/paid>10):flags.append('extreme_expenditure_to_CRS_payment_requires_source_review')
  if estimate is None or estimate<=0:flags.append('missing_positive_DOT_original_estimate')
  quality.append(dict(contract_id=cid,source_file=p.name,source_row=ri,actual_expenditure=actual,CRS_paid=paid,after_CRS=after,innovative_adjustment=innov,flags=flags,label_changed=False,excluded_from_primary_metrics=False))
assert needed==set(extra)
base=['let_year','let_month','baseline_cost','contingency_fraction','planned_days','initial_cost_per_day'];rich=base+['dot_original_estimate','award_to_DOT_estimate_ratio']
for name,f in [('development',dev),('test',test)]:
 f=f.rename(columns={'contract_id':'project_id','project_family':'group','original_cost_usd':'baseline_cost','original_days':'planned_days','actual_cost_usd':'actual_cost','actual_days_used':'actual_days'})
 f['dot_original_estimate']=f.project_id.map(lambda c:extra[c]['dot_original_estimate']);f['contract_type']=f.project_id.map(lambda c:extra[c]['contract_type']);f['award_to_DOT_estimate_ratio']=f.baseline_cost/f.dot_original_estimate
 f[['project_id','group','let_date','report_end','source_file','source_row']+rich+['district','letting_channel','contract_type']].to_csv(D/f'{name}_features.csv',index=False,float_format='%.12g')
 f[['project_id','actual_cost','actual_days']].to_csv(D/f'{name}_labels.csv',index=False,float_format='%.12g')
folds=[]
for tr,vr,vl in [('2016-06-30','2018-06-30','2017-01-01'),('2017-06-30','2020-06-30','2018-01-01'),('2018-06-30','2021-06-30','2019-01-01')]:
 a=dev[dev.report_end.le(tr)];b=dev[dev.report_end.eq(vr)&dev.let_date.ge(vl)&~dev.project_family.isin(a.project_family)]
 folds.append(dict(train_ids=a.contract_id.tolist(),validation_ids=b.contract_id.tolist(),train_report_end=tr,validation_report_end=vr,validation_let_min=vl))
five=sorted(test.contract_id,key=lambda x:hashlib.sha256(('ACEP-FDOT-V8-FIVE|'+x).encode()).hexdigest())[:5]
contract=dict(version='8.0',seed=81971,training_location='Kaggle only',development_count=len(dev),test_count=len(test),five_projects=five,feature_sets={'base':dict(numeric=base,categorical=['district','letting_channel']),'rich':dict(numeric=rich,categorical=['district','letting_channel','contract_type'])},
 selection={'regression':'Unchanged baseline remains default. Learned candidate must improve pooled within10 by >=1 percentage point, not worsen MAPE/P95, and maxAPE<=1.05*baseline; rank worst-fold within10, pooled within10, MAPE.',
 'risk':'Select threshold/model only from OOF development. Require specificity>=0.80, recall>=0.50, precision>=max(0.10,2*prevalence), balanced accuracy>0.50 and Brier<=prevalence Brier. Otherwise return unvalidated prevalence probability with null decision; no always-negative accuracy claim.'},
 acceptance=dict(regression_within10=.9,all_five=True,coverage=1.,risk_balanced_accuracy=.9,risk_recall=.9,risk_each_class_min=10),
 test_policy='Previously audited but never model-fitted or model-evaluated v6 excluded contracts, let July-Dec2022; primary financial families absent from every previously used FDOT partition. Source outcomes were read for audit, not model selection. Existing test sets are not rerun.',
 limits=['Historical reports, not prospective observation or a newly collected external dataset.','Development ends June2021; new contract letting begins July2022. Complete historical release/version history remains unverified.','Only primary financial family is available; complete contractor/site independence is not established.','Additional fields explicitly named DOT Original Estimate and Innovative Contract Type; snapshot version histories are unavailable.','Extreme source records are flagged, not silently repaired or removed.','Source costs are Florida transport-contract USD and Days Used, not Saudi prices or resource-feasible scheduling.','No independent seven-engine acceptance follows from these scoped tasks.'])
save('contract.json',contract);save('folds.json',folds);save('sources.json',sources);save('source_quality_audit.json',quality)
save('input_provenance.json',dict(v6_audited_sha256=sha(V6/'data/audited_contracts.csv'),source_hashes={x['file']:x['sha256'] for x in sources},prior_exposed_test_excluded=True))
save('audit.json',dict(development=len(dev),test=len(test),fold_counts=[dict(train=len(x['train_ids']),validation=len(x['validation_ids'])) for x in folds],five_projects=five,source_quality_flags=[{k:v for k,v in x.items() if k not in ['actual_expenditure','CRS_paid','after_CRS','innovative_adjustment']} for x in quality if x['flags']],local_fitting=False))
save('manifest.json',{p.name:sha(p) for p in sorted(D.glob('*')) if p.name!='manifest.json'})
print(json.dumps(dict(development=len(dev),test=len(test),fold_sizes=[len(x['validation_ids']) for x in folds],five=five,flagged=sum(bool(x['flags']) for x in quality)),indent=2))
