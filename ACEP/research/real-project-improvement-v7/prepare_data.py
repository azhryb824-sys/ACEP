"""Prepare v7 evidence without model fitting. All selection is development-only."""
from pathlib import Path
import hashlib,io,json,math,re,zipfile
import numpy as np,pandas as pd,openpyxl
R=Path(__file__).resolve().parent; D=R/'data'; D.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,o):(D/n).write_text(json.dumps(o,indent=2,allow_nan=False)+'\n')
def green(c):return c.fill.fgColor.type=='rgb' and c.fill.fgColor.rgb=='FF00FF00' and c.value in (None,'G')
def number(v):
 try:z=float(v);return z if math.isfinite(z) else None
 except (ValueError,TypeError):return None
def groupname(s):
 s=re.sub(r'\([^)]*\)|\d+','',str(s).lower())
 s=re.sub(r'foundations|structural work|finishing works?|\s+',' ',s)
 return ' '.join(s.split())
def h(s):return hashlib.sha256(s.encode()).hexdigest()
source=R/'sources/DSLIB3.4.zip';assert sha(source)=='19f87632c589f5d49f72b5f071992efc6379df2beb35f1efd3a60ac1381dc277'
w=openpyxl.load_workbook(R/'sources/DSLIB_Analysis_Sheet.xlsx',data_only=True)
rescheduled={r[0] for r in w['Updates'].iter_rows(values_only=True) if len(r)>6 and 'rescheduled' in str(r[6]).lower()}
audit=[];rows=[];source_manifest={}
with zipfile.ZipFile(source) as z:
 names=[n for n in z.namelist() if n.startswith('DSLIB 3.4/Excel/') and n.endswith('.xlsx')]
 for ri,r in enumerate(w['DSLIB'],1):
  v=[c.value for c in r];pid=str(v[0]);reason=None
  if not re.fullmatch(r'C\d{4}-\d{2}',pid):continue
  if not str(v[3]).lower().startswith('construction'):reason='not_construction'
  elif not green(r[8]) or not green(r[9]):reason='authenticity_not_green_for_both_project_and_tracking'
  elif pid in rescheduled:reason='baseline_rescheduled_by_publisher'
  elif not all(number(v[j]) is not None and number(v[j])>0 for j in (10,11,12,82,83)):reason='missing_or_nonpositive_final_or_baseline_values'
  matches=[n for n in names if Path(n).name.startswith(pid+' ')]
  if reason is None and len(matches)!=1:reason='missing_or_ambiguous_workbook'
  info=dict(project_id=pid,source_row=ri,source_auth_project=str(v[8]),source_auth_tracking=str(v[9]),project_auth_fill=r[8].fill.fgColor.rgb if r[8].fill.fgColor.type=='rgb' else None,tracking_auth_fill=r[9].fill.fgColor.rgb if r[9].fill.fgColor.type=='rgb' else None)
  if reason:audit.append(dict(info,status='excluded',reason=reason));continue
  raw=z.read(matches[0]);p=R/'sources/projects'/f'{pid}.xlsx';p.parent.mkdir(exist_ok=True);p.write_bytes(raw);source_manifest[str(p.relative_to(R))]=sha(p)
  wb=openpyxl.load_workbook(io.BytesIO(raw),read_only=True,data_only=True)
  try:
   bs=wb['Baseline Schedule'];baserows=list(bs.iter_rows(values_only=True));first=baserows[2]
   sheets=[s for s in wb.sheetnames if re.fullmatch(r'(?:Project Control - )?TP\d+',s)]
   assert sheets
   last=max(sheets,key=lambda n:int(re.search(r'TP(\d+)',n).group(1)));lastrows=list(wb[last].iter_rows(values_only=True));lasthead={str(c).strip():j for j,c in enumerate(lastrows[3]) if c is not None};summary=lastrows[4]
   final_cost=number(summary[lasthead['Actual Cost']]);base_cost=number(first[13]);base_reconciled=base_cost is not None
   # Recent exports omit computed project-summary cells. Reconcile final cost
   # by summing WBS leaves; retain publisher BAC when its detail total is absent.
   paths={r[0]:str(r[2]) for r in baserows[2:] if isinstance(r[0],(int,float)) and r[2] is not None}
   leaves={i for i,pth in paths.items() if not any(p!=pth and p.startswith(pth+'.') for p in paths.values())}
   if final_cost is None:
    vals=[number(rr[lasthead['Actual Cost']]) for rr in lastrows[4:] if rr[0] in leaves]
    assert vals and all(x is not None for x in vals),'missing_leaf_actual_cost'
    final_cost=sum(vals)
   if base_cost is None:base_cost=float(v[12])
   assert final_cost and base_cost
   # Analysis sheet rounds monetary totals; retain its values and record reconciliation.
   assert abs(base_cost-float(v[12]))<=max(2,1e-5*float(v[12])),'baseline_cost_mismatch'
   assert abs(final_cost-float(v[83]))<=max(2,1e-5*float(v[83])),'actual_cost_mismatch'
   # Exports use both Excel datetimes and text dates; dates are lineage only.
   start=first[5];lastdate=lastrows[0][2]
  except (AssertionError,KeyError,IndexError,TypeError,ValueError) as exc:
   audit.append(dict(info,status='excluded',reason='workbook_summary_reconciliation_failed',detail=str(exc)));continue
  finally:wb.close()
  feat={name:number(v[j]) for name,j in [('activities',10),('planned_days',11),('renewable',14),('consumable',15),('SP',19),('AD',20),('LA',21),('TF',22)]}
  # Missing resource counts stay missing, with train-only imputation later.
  sector=str(v[3]).lower().replace('construction','').strip(' ()')
  rows.append(dict(project_id=pid,project_name=str(v[1]),collector_hash=h('DSLIB|'+str(v[2]).lower())[:16],name_family=groupname(v[1]),cohort=int(pid[1:5]),sector=sector,baseline_cost=float(v[12]),actual_cost=float(v[83]),actual_days=float(v[82]),source_row=ri,baseline_start=start.isoformat() if hasattr(start,'isoformat') else str(start),last_tracking_date=lastdate.isoformat() if hasattr(lastdate,'isoformat') else str(lastdate),last_tracking_sheet=last,**feat))
  audit.append(dict(info,status='eligible',workbook=matches[0],base_cost_reconciled=base_reconciled,base_cost_difference=base_cost-float(v[12]) if base_reconciled else None,final_cost_difference=final_cost-float(v[83])))
f=pd.DataFrame(rows).sort_values('project_id').reset_index(drop=True)
save('dslib_source_audit.json',audit)
print('Pre-split eligible',len(f),'cohorts',f.cohort.value_counts().to_dict(),flush=True)
# Connected components share a collector or normalized project-name family.
parent=list(range(len(f)))
def root(i):
 while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
 return i
for col in ['collector_hash','name_family']:
 for _,inds in f.groupby(col).groups.items():
  inds=list(inds)
  for i in inds[1:]:parent[root(i)]=root(inds[0])
f['group']=[h('DSLIB-GROUP|'+f.loc[root(i),'project_id'])[:16] for i in range(len(f))]
test=f.cohort.ge(2025);dev=~test&~f.group.isin(f.loc[test,'group']);f['split']=np.where(test,'test',np.where(dev,'development','excluded_group_overlap'))
assert len(f.loc[test])>=5 and len(f.loc[dev])>=30
groups=f.loc[dev].group.value_counts();bins=[[],[],[]];sizes=[0,0,0]
for g,n in sorted(groups.items(),key=lambda x:(-x[1],h('V7-FOLD|'+x[0]))):
 k=min(range(3),key=lambda i:sizes[i]);bins[k].append(g);sizes[k]+=int(n)
f['fold']=-1
for k,gs in enumerate(bins):f.loc[dev&f.group.isin(gs),'fold']=k
num=['planned_days','activities','renewable','consumable','SP','AD','LA','TF'];cat=['sector']
feature=['project_id','group','cohort','fold','baseline_cost']+num+cat
for name,mask in [('development',dev),('test',test)]:
 g=f.loc[mask];g[feature].to_csv(D/f'dslib_{name}_features.csv',index=False,float_format='%.12g');g[['project_id','actual_cost','actual_days']].to_csv(D/f'dslib_{name}_labels.csv',index=False,float_format='%.12g')
f.to_csv(D/'dslib_lineage.csv',index=False,float_format='%.12g');save('dslib_source_audit.json',audit);save('dslib_source_hashes.json',source_manifest)
five=sorted(f.loc[test,'project_id'],key=lambda s:h('ACEP-DSLIB-V7-FIVE|'+s))[:5]
# FDOT v6 development only; exposed test rows are excluded from prepared inputs.
v6=R.parent/'real-project-improvement-v6'
if not v6.is_dir():v6=R.parent/'real-projects-v6'
old=pd.read_csv(v6/'data/audited_contracts.csv',dtype={'project_family':str,'district':str});old=old[old.report_end.le('2022-06-30')].copy()
old=old.rename(columns={'contract_id':'project_id','project_family':'group','original_cost_usd':'baseline_cost','original_days':'planned_days','actual_cost_usd':'actual_cost','actual_days_used':'actual_days'})
fdnum=['let_year','let_month','baseline_cost','contingency_fraction','planned_days','initial_cost_per_day'];fdcat=['district','letting_channel']
fdfeatures=['project_id','group','report_end','let_date']+fdnum+fdcat
old[fdfeatures].to_csv(D/'fdot_development_features.csv',index=False,float_format='%.12g');old[['project_id','actual_cost','actual_days']].to_csv(D/'fdot_development_labels.csv',index=False,float_format='%.12g')
folds=[]
for cut,letmin,end in [('2016-06-30','2017-01-01','2020-06-30'),('2017-06-30','2018-01-01','2021-06-30'),('2018-06-30','2019-01-01','2022-06-30')]:
 tr=old[old.report_end.le(cut)];va=old[old.report_end.eq(end)&old.let_date.ge(letmin)&~old.group.isin(tr.group)]
 assert len(va)>30
 folds.append(dict(train_ids=tr.project_id.tolist(),validation_ids=va.project_id.tolist(),train_report_end=cut,validation_report_end=end,validation_let_min=letmin))
save('fdot_folds.json',folds)
contract=dict(version='7.0',seed=71357,training_location='Kaggle only',datasets=dict(fdot=dict(numeric=fdnum,categorical=fdcat,independent_test=False,scope='Development-only FDOT v6 stability evaluation. Old test is excluded.'),dslib=dict(numeric=num,categorical=cat,independent_test=True,five_projects=five,scope='Forecast source-reported final cost and working-day project duration from baseline estimates for green-authenticity construction projects. Currency scale excluded from predictors. Not Saudi pricing or resource optimization.')),
 seeds=[71357,71358,71359],regression_gate=dict(test_within_10pct_min=.9,all_five_within_10pct=True,coverage=1.),risk_gate=dict(balanced_accuracy_min=.9,overrun_recall_min=.9,each_class_min=10,all_five_correct=True,coverage=1.),
 policy='Three development folds select a fixed training recipe. Neural models use zero-initialized bounded residual outputs, unstandardized log-ratio targets, fixed optimizer-update budgets and three-seed ensembles. Final fit repeats the exact recipe.',
 selection='Regression: candidate cannot worsen pooled development P95 relative error by >5% or MAPE by >5% versus unchanged baseline; maximize worst-fold within-10%, then pooled within-10%, then MAPE. Risk: cross-fitted sigmoid probability calibration for nonconstant candidates; threshold and selection use development predictions only, requiring Brier <= prevalence baseline *1.10; maximize balanced accuracy, then Brier. Baselines always remain eligible.',
 limitations=['DSLIB IDs encode data-collection years, not project start dates. Held-out 2025 collection cohort is not a proven chronological test.','DSLIB revised reports are retrospective; known rescheduled baselines excluded. Full baseline version history is unavailable.','Source colour is publisher-assessed authenticity, not a new independent field audit.','Related collector/name families are grouped; full contractor/site identity is unavailable.','Source-reported cost units retained; no FX conversion or Saudi price claim.','Source summary rounds costs and working days. Final costs reconcile to workbook summary or WBS leaf totals. Recent exports omit computed baseline totals, so their BAC comes from the publisher analysis sheet without a separate detail-total reconciliation.','FDOT folds overlap training history but have distinct validation report years; no new independent FDOT test exists in this run.','No end-to-end seven-engine acceptance is established by these scoped tasks.'])
save('contract.json',contract)
summary=dict(dslib=dict(source_projects=len(audit),eligible=len(f),development=int(dev.sum()),test=int(test.sum()),development_groups=int(f.loc[dev,'group'].nunique()),test_groups=int(f.loc[test,'group'].nunique()),fold_sizes=sizes,five_projects=five,excluded_reasons=pd.Series([x.get('reason') for x in audit if x['status']=='excluded']).value_counts().to_dict()),fdot=dict(development=len(old),folds=[dict(train=len(x['train_ids']),validation=len(x['validation_ids'])) for x in folds]),fit_performed=False)
save('audit.json',summary);save('manifest.json',{p.name:sha(p) for p in D.iterdir() if p.is_file() and p.name!='manifest.json'})
print(json.dumps(summary,indent=2))
