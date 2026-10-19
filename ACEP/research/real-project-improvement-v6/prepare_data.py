"""Header-driven FDOT extraction with chronological, financial-family-purged splits.
No fitting. Source reports describe completed construction contracts, not buildings.
"""
from pathlib import Path
import datetime,hashlib,json,math,re
import openpyxl,pandas as pd
R=Path(__file__).resolve().parent;D=R/'data';D.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,x):(D/n).write_text(json.dumps(x,indent=2,allow_nan=False)+'\n')
def norm(s):return ' '.join(str(s or '').split()).lower()
rows=[];rejected=[];source_counts={}
for rec in json.loads((R/'sources/downloads.json').read_text()):
 p=R/'sources'/rec['file'];assert sha(p)==rec['sha256']
 y,q=map(int,re.search(r'FY(\d+)_Q(\d)',p.name).groups());end=f'{y}-06-30' if q==4 else f'{y}-03-31' if q==3 else f'{y-1}-12-31'
 w=openpyxl.load_workbook(p,read_only=True,data_only=True);s=w['Detailed Data'];rr=s.iter_rows(max_col=35,values_only=True);head={norm(v):i for i,v in enumerate(next(rr)) if v is not None};count=0
 def get(row,name):return row[head[norm(name)]]
 for ri,row in enumerate(rr,2):
  cid=get(row,'Contract Number')
  if not isinstance(cid,str) or not re.fullmatch(r'[A-Z][A-Z0-9]{4}',cid):continue
  count+=1
  try:
   dt=get(row,'Let Date');assert isinstance(dt,datetime.datetime)
   fp=str(get(row,'Financial Project ID')).strip().replace('.0','');assert fp.isdigit() and len(fp)>=6
   vals={k:float(get(row,v)) for k,v in {'original_cost_usd':'CRS Original Contract Amount','contingency_usd':'Amount Included in Original for Contingency Pay Item','adjusted_original_usd':'Adjusted Original Amount','original_days':'Original Contract Days','actual_cost_usd':'Actual Expenditure (Does Not Include Innovative Contract Adjustment Payments)','actual_days_used':'Days Used'}.items()}
   assert all(math.isfinite(v) for v in vals.values())
   assert min(vals[k] for k in ('original_cost_usd','adjusted_original_usd','original_days','actual_cost_usd','actual_days_used'))>0
   assert 0<=vals['contingency_usd']<vals['original_cost_usd']
   assert abs(vals['original_cost_usd']-vals['contingency_usd']-vals['adjusted_original_usd'])<=2.0
   district=str(get(row,'District')).zfill(2);assert district in [f'{i:02d}' for i in range(1,9)]
   assert dt.date().isoformat()<=end
   rows.append(dict(contract_id=cid,financial_project_id=fp,project_family=fp[:6],district=district,letting_channel=cid[0],let_date=dt.date().isoformat(),let_year=dt.year,let_month=dt.month,report_end=end,source_file=p.name,source_row=ri,**vals))
  except (AssertionError,TypeError,ValueError):rejected.append(dict(contract_id=cid,source_file=p.name,source_row=ri,reason='Invalid/missing initial amount, target, district, date or arithmetic identity'))
 source_counts[p.name]=count
f=pd.DataFrame(rows).sort_values(['report_end','source_file','source_row']);dups=f[f.duplicated('contract_id',keep=False)]
dups.to_csv(D/'duplicate_contract_audit.csv',index=False)
f=f.drop_duplicates('contract_id',keep='first').reset_index(drop=True)
train=f.report_end.le('2018-06-30');val0=f.let_date.ge('2019-01-01')&f.report_end.le('2022-06-30')&~train
val=val0&~f.project_family.isin(f.loc[train,'project_family'])
refit=f.report_end.le('2022-06-30')&~(train|val)
test0=f.let_date.ge('2023-01-01')&f.report_end.gt('2022-06-30');test=test0&~f.project_family.isin(f.loc[train|val|refit,'project_family'])
assert all(not(set(f.loc[a,'project_family'])&set(f.loc[b,'project_family'])) for a,b in [(train,val),(train,test),(val,test),(refit,test)])
f['split']='excluded';f.loc[train,'split']='train';f.loc[val,'split']='validation';f.loc[refit,'split']='refit_extra';f.loc[test,'split']='test'
f['contingency_fraction']=f.contingency_usd/f.original_cost_usd
f['initial_cost_per_day']=f.original_cost_usd/f.original_days
f.to_csv(D/'audited_contracts.csv',index=False,float_format='%.12g')
features=['contract_id','project_family','district','letting_channel','let_year','let_month','original_cost_usd','contingency_fraction','original_days','initial_cost_per_day']
labels=['contract_id','actual_cost_usd','actual_days_used']
for split in ('train','validation','refit_extra','test'):
 g=f[f.split.eq(split)];g[features].to_csv(D/f'{split}_features.csv',index=False,float_format='%.12g');ll=g[labels].copy();ll['cost_overrun_gt_10pct']=(g.actual_cost_usd>1.1*g.original_cost_usd).astype(int);ll.to_csv(D/f'{split}_labels.csv',index=False,float_format='%.12g')
five=sorted(f.loc[test,'contract_id'],key=lambda s:hashlib.sha256(('ACEP-FDOT-V6-FIVE|'+s).encode()).hexdigest())[:5]
assert len(five)==5 and train.sum()>500 and val.sum()>100 and test.sum()>100
contract=dict(version='6.0',seed=42197,source='FDOT Cost & Time Reports',source_url='https://www.fdot.gov/construction/constadm/reports',tasks=['actual_cost_usd','actual_days_used','cost_overrun_gt_10pct'],numeric_features=['let_year','let_month','original_cost_usd','contingency_fraction','original_days','initial_cost_per_day'],categorical_features=['district','letting_channel'],features_excluded=['contract_id','financial_project_id','project_family','number_projects','number_of_SAs','present_contract_days','present_contract_amount','work_to_date','adjustments','actual_expenditure','days_used','weather_days','holiday_days','time_extensions','final_dates','report_end'],splits={'train':'completed reports through 2018-06-30','validation':'let >=2019-01-01, reports through 2022-06-30, financial families absent from train','refit_extra':'all other eligible reports through 2022-06-30; only after selection','test':'let >=2023-01-01, reports after 2022-06-30 through 2026-06-30, no family seen in final fit'},five_projects=five,five_rule='Five smallest SHA256(ACEP-FDOT-V6-FIVE|contract_id) before fitting; no outcome used.',selection='Regression: highest validation fraction within 10%, tie lowest MAPE, then candidate name. Risk: highest balanced accuracy, tie lowest Brier. All checkpoints, blending and thresholds chosen only on validation.',refit='Selected configuration is fit once on train+validation+refit_extra. Thresholds/epochs frozen from validation; test outcomes unopened until fitted artifact hashes saved.',regression_gate={'test_fraction_within_10pct_min':.9,'each_of_five_relative_error_max':.1,'coverage':1.0},risk_gate={'balanced_accuracy_min':.9,'overrun_recall_min':.9,'each_class_min':10,'all_five_correct':True,'coverage':1.0},scope='Forecast recorded final expenditure excluding innovative-contract adjustment payments and recorded contract Days Used, conditional on an awarded construction contract. Historical Florida transport works in USD. Not pre-design building cost, not calendar completion date or resource optimization, not Saudi price validation.',limitations=['Retrospective report-vintage chronology with six-month gap. Exact historical publication dates and later report revisions are not independently verified.','Only completed contracts are observed. Later letting cohorts overrepresent shorter contracts; not a full prospective cohort.','Missing FY2019 and partial FY2023/FY2025 reports; sample is not all FDOT contracts.','Only Detailed Data is used; separate PPP sheets and raw staging tabs are excluded.','Financial-project family is first six digits of the listed primary ID. Additional project identities within a multi-project contract are unavailable; complete shared-site independence cannot be proven.','Original contract amount includes contingency, while target excludes innovative adjustment payments as defined by the report. Comparisons are against this exact disclosed scope.','A few rows were read to audit schema before freezing; no test-based candidate selection.','These are new contracts for ACEP research; seven-engine end-to-end acceptance remains a separate unmet goal.'])
save('contract.json',contract);save('rejected_rows.json',rejected)
audit=dict(source_rows=sum(source_counts.values()),source_counts=source_counts,unique_eligible_contracts=len(f),duplicate_rows_removed=len(rows)-len(f),rejected_rows=len(rejected),split_counts=f.split.value_counts().to_dict(),validation_families_purged=int((val0&~val).sum()),test_families_purged=int((test0&~test).sum()),final_fit=int((train|val|refit).sum()),five_projects=five,features_target_separated=True,training_location_required='Kaggle',fit_performed=False)
save('audit.json',audit);save('manifest.json',{p.name:sha(p) for p in sorted(D.iterdir()) if p.is_file() and p.name!='manifest.json'})
print(json.dumps(audit,indent=2))
