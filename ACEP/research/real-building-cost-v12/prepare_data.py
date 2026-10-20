"""Read official workbooks without executing macros. Audit and freeze splits; no fitting."""
from pathlib import Path
import json,hashlib,re,math
import pandas as pd
R=Path(__file__).resolve().parent;S=R/'sources';D=R/'data';D.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
def text(v):return '' if pd.isna(v) else ' '.join(str(v).split())
def norm(v):return re.sub('[^a-z0-9]','',text(v).lower())
def num(v):
 try:r=float(v);return r if math.isfinite(r) else None
 except (ValueError,TypeError):return None
def parse(path,sheet):
 d=pd.read_excel(path,sheet_name=sheet,header=None);start=next(i for i,r in d.iterrows() if norm(r.iloc[0]).startswith('type'))
 candidates=[]
 for i,r in d.iloc[start+1:].iterrows():
  if num(r.iloc[0]) in [1,2,3,4] and text(r.iloc[1]) and text(r.iloc[2]) and not re.search('average|total',text(r.iloc[2]),re.I):candidates.append((i,r))
 assert candidates,(path,sheet)
 head=[''.join(norm(x) for x in d.iloc[start:candidates[0][0],j] if pd.notna(x)) for j in range(d.shape[1])]
 def col(*keys):
  found=[i for i,h in enumerate(head) if any(h.endswith(k) for k in keys)]
  assert len(found)==1,(path.name,sheet,keys,head);return found[0]
 columns={'district':col('districtname'),'facility':col('facilityname'),'students':col('studentstations'),'teachers':col('teacherstations'),'net_ft2':col('netsquarefeet'),'gross_ft2':col('grosssquarefeet'),'contract_cost':col('contractcost','contactcost')}
 classes={}
 for name,suffix in [('classes_k5','k5'),('classes_68','68'),('classes_912','912')]:
  found=[i for i,h in enumerate(head) if h.endswith(suffix) and ('clsrms' in h or 'clasrms' in h or 'classrms' in h)]
  assert len(found)==1,(path.name,sheet,name,head);columns[name]=found[0]
 rate=[i for i,h in enumerate(head) if h=='constcontractcostperstudentstation'];columns['published_cost_per_student']=rate[0] if len(rate)==1 else None
 rows=[]
 for i,r in candidates:
  row={k:(None if c is None else (text(r.iloc[c]) if k in ['district','facility'] else num(r.iloc[c]))) for k,c in columns.items()}
  row.update(school_type=str(int(r.iloc[0])),source_row=int(i+1),source_sheet=sheet,source_file=path.name)
  rows.append(row)
 return rows,columns
source=json.loads((S/'downloads.json').read_text());rows=[];audit=[];maps=[];duplicates=[];rejected=[]
def key(r):return tuple(r[k] for k in ['district','facility','school_type','gross_ft2','net_ft2','students'])
for rec in source:
 p=S/rec['file'];assert sha(p)==rec['sha256']
 main,c=parse(p,'SummaryAllConstr');new,_=parse(p,'SummaryNewConstr');add,_=parse(p,'Additions');nkeys={key(r) for r in new};akeys={key(r) for r in add};seen=set()
 for r in main:
  r['year']=rec['year'];r['project_id']=f"FDOE-{rec['year']}-{r['source_row']:03d}";r['facility_group']=norm(r['district'])+'|'+norm(r['facility'])
  r['project_scope']='new' if key(r) in nkeys and key(r) not in akeys else 'addition' if key(r) in akeys and key(r) not in nkeys else 'unverified'
  signature=json.dumps({k:r[k] for k in ['district','facility','school_type','gross_ft2','net_ft2','students','teachers','classes_k5','classes_68','classes_912','contract_cost']},sort_keys=True)
  if signature in seen:duplicates.append({'project_id':r['project_id'],'reason':'exact_duplicate_source_row'});continue
  seen.add(signature)
  why=[]
  for k in ['gross_ft2','contract_cost']:
   if r[k] is None or r[k]<=0:why.append('nonpositive_or_missing_'+k)
  if r['net_ft2'] is not None and r['gross_ft2'] is not None and r['net_ft2']>r['gross_ft2']:why.append('net_area_exceeds_gross')
  if why:rejected.append({'project_id':r['project_id'],'reasons':why});continue
  flags=[]
  for k in ['students','teachers','classes_k5','classes_68','classes_912','net_ft2']:
   if r[k] is None or r[k]<0 or (k!='net_ft2' and not r[k].is_integer()):flags.append('missing_or_invalid_'+k);r[k]=None
  if r['project_scope']=='unverified':flags.append('scope_membership_unverified')
  if r['students'] and r['published_cost_per_student'] is not None and abs(r['contract_cost']/r['students']-r['published_cost_per_student'])>1.1:flags.append('published_unit_cost_disagrees')
  if flags:audit.append({'project_id':r['project_id'],'flags':flags})
  rows.append(r)
 maps.append({'year':rec['year'],'source_rows':len(main),'new_subset_rows':len(new),'addition_subset_rows':len(add),'columns_zero_based':c})
allrows=pd.DataFrame(rows).sort_values(['year','project_id']).reset_index(drop=True)
test=allrows[allrows.year.eq(2024)].copy();testgroups=set(test.facility_group)
cal=allrows[allrows.year.eq(2021)&~allrows.facility_group.isin(testgroups)].copy();calgroups=set(cal.facility_group)
dev=allrows[allrows.year.le(2020)&~allrows.facility_group.isin(testgroups|calgroups)].copy()
assert len(test)>=5 and len(cal)>=10 and len(dev)>=100
features=['year','gross_ft2','net_ft2','students','teachers','classes_k5','classes_68','classes_912','school_type','project_scope','district']
meta=['project_id','facility_group','facility','source_file','source_sheet','source_row']
for name,f in [('development',dev),('calibration',cal),('test',test)]:
 f[meta+features].to_csv(D/f'{name}_features.csv',index=False,float_format='%.15g');f[['project_id','contract_cost']].to_csv(D/f'{name}_labels.csv',index=False,float_format='%.15g')
folds=[]
for y in [2018,2019,2020]:
 va=dev[dev.year.eq(y)];tr=dev[dev.year.lt(y)&~dev.facility_group.isin(va.facility_group)]
 assert len(va)>5 and len(tr)>50
 folds.append({'year':y,'train_ids':tr.project_id.tolist(),'validation_ids':va.project_id.tolist()})
five=[];used=set()
for r in sorted(test.to_dict('records'),key=lambda r:hashlib.sha256(('ACEP-FDOE-V12-FIVE|'+r['project_id']).encode()).hexdigest()):
 if r['facility_group'] not in used:five.append(r['project_id']);used.add(r['facility_group'])
 if len(five)==5:break
contract={'cycle':'ACEP v12','seed':82024,'fit_environment':'Kaggle only','scope':'Retrospective nominal-USD construction-contract cost estimation from reported building characteristics and completion-reference year. Not an award-time forecast, Saudi quote, total plant cost, or whole-engine acceptance.','feature_availability':'Historical design versions are unavailable; reported net/gross areas, capacities, scope and year may reflect as-built outcomes. No claim these were known at tender.','numeric_features':features[:8],'categorical_features':features[8:],'target':'contract_cost','currency':'USD','area_unit':'ft2','sqft_to_m2':0.09290304,'development_years':[2010,2020],'calibration_year':2021,'test_year':2024,'five_projects':five,'selection':'Pooled temporal-fold within-10% rate descending, then mean absolute percentage error ascending, then candidate name. No calibration/test labels used for model selection. Final fit uses development only.','interval':'90% nominal split-conformal multiplicative interval using 2021 calibration residuals after final fitting. Time shift prevents an exchangeability guarantee; report test coverage and width separately from point accuracy.','acceptance':{'within10':0.90,'all_five_within10':True,'coverage':1.0,'mape_no_worse_than_baseline':True,'p95_no_worse_than_baseline':True},'excluded_features':['all monetary inputs','cost per area','cost per station','plant/facility totals','fees','funding codes','facility name/id','district outcomes'],'test_policy':'New source and unseen cohort for ACEP. Test labels are parsed for data validity and stored separately, not inspected or used for fitting/model selection. Five distinct facility groups are fixed by ID hash before any model runs.','limits':['Completed public-sector Florida facility construction only.','Missing 2022 and 2023 annual workbooks in this cohort; 2024 tests temporal extrapolation.','Facility-name normalization is not verified parcel/site/contractor independence.','Repeated facility groups are purged across heldout partitions.','No initial estimates, execution durations, BOQ quantities, risks, inspections or supplier outcomes are available here.','Official publication is not a Creative Commons license declaration. Attribute FDOE; original source bytes retained for research reproducibility.']}
if (R/'frozen_contract.json').exists():assert contract==json.loads((R/'frozen_contract.json').read_text()),'Frozen protocol changed'
save(D/'contract.json',contract);save(D/'folds.json',folds);save(D/'sources.json',source);save(D/'column_maps.json',maps);save(D/'source_quality.json',{'flags':audit,'rejected':rejected,'duplicates':duplicates})
included=set(dev.project_id)|set(cal.project_id)|set(test.project_id)
allrows[['project_id','year','facility_group','source_file','source_row']].assign(split=allrows.project_id.map({**dict.fromkeys(dev.project_id,'development'),**dict.fromkeys(cal.project_id,'calibration'),**dict.fromkeys(test.project_id,'test')}).fillna('excluded_group_overlap')).to_csv(D/'split_audit.csv',index=False)
summary={'source_files':len(source),'source_rows':sum(x['source_rows'] for x in maps),'audited_eligible_rows':len(allrows),'exact_duplicates':len(duplicates),'rejected':len(rejected),'flagged':len(audit),'development':len(dev),'calibration':len(cal),'test':len(test),'excluded_group_overlap':len(allrows)-len(included),'folds':[{'year':x['year'],'train':len(x['train_ids']),'validation':len(x['validation_ids'])} for x in folds],'five_projects':five,'local_fits':0,'test_labels_inspected_for_model_selection':False}
save(D/'audit.json',summary);save(D/'manifest.json',{p.name:sha(p) for p in sorted(D.glob('*')) if p.name!='manifest.json'})
print(json.dumps(summary,indent=2))
