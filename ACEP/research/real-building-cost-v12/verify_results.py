"""Independent hashes, splits, metrics and frozen-weight inference; no fitting."""
from pathlib import Path
import json,hashlib,math
import numpy as np,pandas as pd
from model_runtime import predict
R=Path(__file__).resolve().parent;D=R/'data';O=R/'kaggle-output'
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def same(a,b):assert np.allclose(np.asarray(a,float),np.asarray(b,float),rtol=1e-9,atol=1e-7),(a,b)
def metric(y,p):
 y=np.asarray(y,float);p=np.asarray(p,float);ok=np.isfinite(p)&(p>0);e=np.where(ok,np.abs(p-y)/y,np.inf)
 return dict(count=len(y),covered=int(ok.sum()),coverage=float(ok.mean()),within10_count=int((e<=.1).sum()),within10=float((e<=.1).mean()),mape=float(e.mean()),median_ape=float(np.median(e)),p95_ape=float(np.quantile(e,.95)),max_ape=float(e.max()),mae=float(np.abs(p-y).mean()))
for n,h in read(D/'manifest.json').items():assert sha(D/n)==h,n
for n,h in read(O/'input_manifest.json').items():assert sha(D/n)==h,n
for n,h in read(O/'output_manifest.json').items():assert sha(O/n)==h,n
for n,h in read(O/'source_manifest.json').items():assert sha(R/n)==h,n
for n,h in read(O/'transport_manifest.json').items():assert sha(R/n)==h,n
sources=read(D/'sources.json')
for s in sources:assert sha(R/'sources'/s['file'])==s['sha256'],s['file']
features={s:pd.read_csv(D/f'{s}_features.csv',dtype={'school_type':str}) for s in ['development','calibration','test']}
labels={s:pd.read_csv(D/f'{s}_labels.csv').set_index('project_id') for s in features}
for s,f in features.items():assert f.project_id.is_unique and f.project_id.tolist()==labels[s].index.tolist()
for a,b in [('development','calibration'),('development','test'),('calibration','test')]:
 assert not set(features[a].project_id)&set(features[b].project_id)
 assert not set(features[a].facility_group)&set(features[b].facility_group)
assert features['development'].year.max()==2020 and set(features['calibration'].year)=={2021} and set(features['test'].year)=={2024}
# Independent direct-cell source reconciliation, including the holdout target.
column_maps={r['year']:r['columns_zero_based'] for r in read(D/'column_maps.json')};reconciled=0
for source in sources:
 raw=pd.read_excel(R/'sources'/source['file'],sheet_name='SummaryAllConstr',header=None);mapping=column_maps[source['year']]
 for split,f in features.items():
  for _,r in f[f.source_file.eq(source['file'])].iterrows():
   cells=raw.iloc[int(r.source_row)-1];target=float(cells.iloc[mapping['contract_cost']]);same(target,labels[split].loc[r.project_id,'contract_cost'])
   for name in ['gross_ft2','net_ft2','students','teachers','classes_k5','classes_68','classes_912']:
    if pd.notna(r[name]):same(float(cells.iloc[mapping[name]]),r[name])
   assert str(cells.iloc[mapping['facility']]).strip()==r.facility
   reconciled+=1
contract=read(D/'contract.json');folds=read(D/'folds.json');dev=features['development'].set_index('project_id');validation=pd.read_csv(O/'validation_predictions.csv');selection=read(O/'selection.json');scores=[]
for candidate in selection['candidates']:
 v=validation[validation.candidate.eq(candidate['name'])]
 assert len(v)==sum(len(f['validation_ids']) for f in folds)
 for fi,fold in enumerate(folds):
  rows=v[v.fold.eq(fi)];assert rows.project_id.tolist()==[i for i in dev.index if i in set(fold['validation_ids'])]
  assert not set(dev.loc[fold['train_ids'],'facility_group'])&set(dev.loc[fold['validation_ids'],'facility_group'])
  assert dev.loc[fold['train_ids'],'year'].max()<dev.loc[fold['validation_ids'],'year'].min()
 same(v.actual,labels['development'].loc[v.project_id,'contract_cost']);m=metric(v.actual,v.prediction)
 for k,n in m.items():same(n,candidate['metrics'][k])
 scores.append((candidate['name'],m))
winner=sorted(scores,key=lambda x:(-x[1]['within10'],x[1]['mape'],x[0]))[0][0];assert winner==selection['selected']
model=read(O/'selected_model.json');baseline=read(O/'baseline_model.json');cal=features['calibration'];test=features['test'];p=predict(test,model);base=predict(test,baseline);calp=predict(cal,model)
cp=pd.read_csv(O/'calibration_predictions.csv');same(calp,cp.prediction);same(cp.actual,labels['calibration'].loc[cp.project_id,'contract_cost'])
res=np.abs(np.log(cp.actual.to_numpy()/calp));q=np.sort(res)[math.ceil((len(res)+1)*.9)-1];same(q,read(O/'calibration.json')['absolute_log_residual_quantile'])
tp=pd.read_csv(O/'test_predictions.csv');blind=pd.read_csv(O/'blind_test_predictions.csv');assert tp.project_id.tolist()==test.project_id.tolist()==blind.project_id.tolist();same(p,tp.prediction);same(base,tp.baseline_prediction);same(tp.actual,labels['test'].loc[tp.project_id,'contract_cost']);same(p*np.exp(-q),tp.lower);same(p*np.exp(q),tp.upper)
for c in blind.columns:
 if c!='project_id':same(blind[c],tp[c])
evaluation=read(O/'evaluation.json');m=metric(tp.actual,p);bm=metric(tp.actual,base)
for k,n in m.items():same(n,evaluation['test'][k]);same(bm[k],evaluation['baseline'][k])
ordered=test.assign(order=test.project_id.map(lambda x:hashlib.sha256(('ACEP-FDOE-V12-FIVE|'+x).encode()).hexdigest())).sort_values('order').drop_duplicates('facility_group').head(5).project_id.tolist();assert ordered==contract['five_projects']
five=tp.set_index('project_id').loc[ordered];fivepassed=int((np.abs(five.prediction-five.actual)/five.actual<=.1).sum());assert fivepassed==evaluation['five_passed']
gates={'within10_at_least_90pct':m['within10']>=.9,'all_five_within10':fivepassed==5,'full_coverage':m['coverage']==1,'mape_no_worse_than_baseline':m['mape']<=bm['mape'],'p95_no_worse_than_baseline':m['p95_ape']<=bm['p95_ape']};assert gates==evaluation['gates'] and all(gates.values())==evaluation['scoped_acceptance_passed']
covered=((tp.actual>=tp.lower)&(tp.actual<=tp.upper));same(covered.mean(),evaluation['interval']['test_coverage']);same(np.median((tp.upper-tp.lower)/tp.prediction),evaluation['interval']['median_width_over_prediction'])
events=read(O/'events.json');stages=[e['stage'] for e in events];assert stages.index('selection_frozen')<stages.index('final_models_frozen')<stages.index('test_predictions_frozen_before_label_loading')<stages.index('test_labels_opened')
for e in events:
 if e['stage']=='selection_frozen':assert e['selection_sha256']==sha(O/'selection.json')
 if e['stage']=='final_models_frozen':assert e['model_sha256']==sha(O/'selected_model.json') and e['baseline_sha256']==sha(O/'baseline_model.json')
 if e['stage']=='test_predictions_frozen_before_label_loading':assert e['sha256']==sha(O/'blind_test_predictions.csv')
strata=[]
joined=test.merge(tp,on='project_id',validate='one_to_one')
for column in ['school_type','project_scope']:
 for value,f in joined.groupby(column):strata.append({'posthoc':True,'column':column,'value':str(value),**metric(f.actual,f.prediction)})
result={'verified':True,'source_workbooks':len(sources),'source_rows_reconciled':reconciled,'candidate_metrics_verified':len(scores),'test_predictions_reproduced':len(test),'calibration_predictions_reproduced':len(cal),'selected':winner,'test':m,'baseline':bm,'five_passed':fivepassed,'gates':gates,'local_fits':0,'no_production_promotion':True,'stratified_diagnostics_not_used_for_selection':strata}
(R/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='stratified_diagnostics_not_used_for_selection'},indent=2))
