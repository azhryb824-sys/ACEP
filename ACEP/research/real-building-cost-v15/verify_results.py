"""Independent reconciliation, metrics and frozen NumPy inference. Never fits."""
from pathlib import Path
import json,hashlib,math,io
import numpy as np,pandas as pd,pdfplumber
from model_runtime import predict
R=Path(__file__).resolve().parent;D=R/'data';O=R/'kaggle-output';OLD=R.parent/('real-building-cost-v13' if (R.parent/'real-building-cost-v13/data').exists() else 'real-v13')
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def same(a,b):assert np.allclose(np.asarray(a,float),np.asarray(b,float),rtol=1e-9,atol=1e-7),(a,b)
def metric(y,p):
 y=np.asarray(y,float);p=np.asarray(p,float);ok=np.isfinite(p)&(p>0);e=np.where(ok,np.abs(p-y)/y,np.inf)
 return dict(cvar90_ape=float(np.sort(e)[-max(1,int(np.ceil(.1*len(e)))):].mean()),over100_count=int((e>1).sum()),count=len(y),covered=int(ok.sum()),coverage=float(ok.mean()),within10_count=int((e<=.1).sum()),within10=float((e<=.1).mean()),mape=float(e.mean()),median_ape=float(np.median(e)),p95_ape=float(np.quantile(e,.95)),max_ape=float(e.max()),mae=float(np.abs(p-y).mean()))
for location,manifest in [(D,D/'manifest.json'),(D,O/'input_manifest.json'),(O,O/'output_manifest.json'),(R,O/'source_manifest.json'),(R,O/'transport_manifest.json')]:
 for n,h in read(manifest).items():assert sha(location/n)==h,(manifest,n)
for s in read(OLD/'all_sources_manifest.json'):assert sha(OLD/'sources'/s['file'])==s['sha256'],s['file']
for n,h in read(OLD/'kaggle-output/input_manifest.json').items():assert sha(OLD/'data'/n)==h,n
index=read(D/'price_index.json');assert sha(R/'sources/price_index_source.html')==index['source_sha256']
table=pd.read_html(io.StringIO((R/'sources/price_index_source.html').read_text()),attrs={'id':'data-table-observations'})[0]
table['year']=table.DATE.astype(str).str[:4].astype(int);table=table[table.year.between(2009,2024)];assert len(table)==192
for year,g in table.groupby('year'):assert len(g)==12;same(g.VALUE.mean(),index['annual'][str(year)])
features={s:pd.read_csv(D/f'{s}_features.csv',dtype={'school_type':str}) for s in ['development','calibration','test']};labels={s:pd.read_csv(D/f'{s}_labels.csv').set_index('project_id') for s in features}
repair=read(D/'data_repairs.json');changes={r['project_id']:r['new'] for r in repair['scope_changes']};assert len(changes)==len(repair['scope_changes'])
for split,f in features.items():
 orig=pd.read_csv(OLD/'data'/f'{split}_features.csv',dtype={'school_type':str});assert f.project_id.tolist()==orig.project_id.tolist()==labels[split].index.tolist()
 assert sha(D/f'{split}_labels.csv')==sha(OLD/'data'/f'{split}_labels.csv')
 for c in orig.columns:
  if c!='project_scope':assert f[c].fillna('__').equals(orig[c].fillna('__')),(split,c)
 expected=[changes.get(i,s) for i,s in zip(orig.project_id,orig.project_scope)];assert f.project_scope.tolist()==expected
 same(f.ppi_lag1,[index['annual'][str(int(y)-1)]/100 for y in f.year])
for a,b in [('development','calibration'),('development','test'),('calibration','test')]:assert not set(features[a].facility_group)&set(features[b].facility_group)
# Re-read all matched scope cells using pdfplumber, independently of model code.
scope=read(R/'scope_audit.json');docs={y:pdfplumber.open(OLD/'sources'/f'schools_{y}.pdf') for y in [2022,2023,2025]};checks=0
for match in scope['matches']:
 year=int(match['source_file'][8:12]);page=docs[year].pages[match['page']-1];words=page.extract_words(x_tolerance=1,y_tolerance=1)
 for c in match['cells']:
  near=[w for w in words if abs((w['top']+w['bottom'])/2-page.bbox[1]-c['y'])<2 and c['x0']<=(w['x0']+w['x1'])/2-page.bbox[0]<c['x1']]
  raw=''.join(w['text'] for w in sorted(near,key=lambda w:w['x0']));assert raw==c['raw']==c['independent_raw'];checks+=1
for doc in docs.values():doc.close()
for pid,new in changes.items():assert {m['scope'] for m in scope['matches'] if m['project_id']==pid}=={new}
assert not set(changes)&set(scope['conflicts'])
folds=read(D/'folds.json');dev=features['development'].set_index('project_id');val=pd.read_csv(O/'validation_predictions.csv');sel=read(O/'selection.json');scores=[]
for c in sel['candidates']:
 f=val[val.candidate.eq(c['name'])];assert len(f)==sum(len(x['validation_ids']) for x in folds)
 for fi,fold in enumerate(folds):
  assert f[f.fold.eq(fi)].project_id.tolist()==[i for i in dev.index if i in set(fold['validation_ids'])]
  assert not set(dev.loc[fold['train_ids'],'facility_group'])&set(dev.loc[fold['validation_ids'],'facility_group'])
  assert dev.loc[fold['train_ids'],'year'].max()<dev.loc[fold['validation_ids'],'year'].min()
 same(f.actual,labels['development'].loc[f.project_id,'contract_cost']);m=metric(f.actual,f.prediction)
 for k,n in m.items():same(n,c['metrics'][k])
 fm=[]
 for fi in range(len(folds)):
  part=f[f.fold.eq(fi)];mm=metric(part.actual,part.prediction);fm.append(mm)
  for k,n in mm.items():same(n,c['fold_metrics'][fi][k])
 scores.append((c['name'],m,c['tail_eligible'],fm))
bm=next(m for n,m,e,fm in scores if n=='baseline_median');bf=next(fm for n,m,e,fm in scores if n=='baseline_median')
for n,m,eligible,fm in scores:assert eligible==(all(m[k]<=bm[k]+1e-12 for k in ['mape','p95_ape','cvar90_ape','max_ape','over100_count']) and all(a['max_ape']<=b['max_ape']+1e-12 for a,b in zip(fm,bf)))
winner=sorted([x for x in scores if x[2]],key=lambda x:(-x[1]['within10'],x[1]['mape'],x[0]))[0][0];assert winner==sel['selected']
model=read(O/'selected_model.json');base=read(O/'baseline_model.json');cal=features['calibration'];test=features['test'];p=predict(test,model);bp=predict(test,base);cp=predict(cal,model)
old=predict(pd.read_csv(D/'test_original_features.csv',dtype={'school_type':str}),read(D/'v13_model.json'));same(old,pd.read_csv(D/'v13_test_predictions.csv').prediction)
calout=pd.read_csv(O/'calibration_predictions.csv');same(calout.prediction,cp);same(calout.actual,labels['calibration'].loc[calout.project_id,'contract_cost'])
q=np.sort(np.abs(np.log(calout.actual.to_numpy()/cp)))[math.ceil((len(cp)+1)*.9)-1];same(q,read(O/'calibration.json')['absolute_log_residual_quantile'])
pred=pd.read_csv(O/'diagnostic_predictions.csv');frozen=pd.read_csv(O/'frozen_diagnostic_predictions.csv');assert pred.project_id.tolist()==test.project_id.tolist()==frozen.project_id.tolist()
same(pred.prediction,p);same(pred.baseline_prediction,bp);same(pred.v13_prediction,old);same(pred.actual,labels['test'].loc[pred.project_id,'contract_cost']);same(pred.lower,p*np.exp(-q));same(pred.upper,p*np.exp(q))
for c in frozen.columns:
 if c!='project_id':same(frozen[c],pred[c])
v14=predict(test,read(R/'comparison/v14_model.json'));prior14=pd.read_csv(R/'comparison/v14_test_predictions.csv');same(v14,prior14.prediction);same(v14,pred.v14_prediction);same(v14,pd.read_csv(D/'v14_frozen_predictions.csv').prediction)
evaluation=read(O/'evaluation.json');metrics={'diagnostic':metric(pred.actual,p),'baseline':metric(pred.actual,bp),'v13_same_cohort':metric(pred.actual,old),'v14_same_cohort':metric(pred.actual,v14)}
for key,m in metrics.items():
 for k,n in m.items():same(n,evaluation[key][k])
contract=read(D/'contract.json');assert contract['five_projects']==read(OLD/'data/contract.json')['five_projects'];five=pred.set_index('project_id').loc[contract['five_projects']];fivepassed=int((np.abs(five.prediction-five.actual)/five.actual<=.1).sum());assert fivepassed==evaluation['five_passed']
m,b=metrics['diagnostic'],metrics['baseline'];gates={'within10_at_least_90pct':m['within10']>=.9,'all_five_within10':fivepassed==5,'full_coverage':m['coverage']==1,'mape_no_worse_than_baseline':m['mape']<=b['mape'],'p95_no_worse_than_baseline':m['p95_ape']<=b['p95_ape'],'cvar90_no_worse_than_baseline':m['cvar90_ape']<=b['cvar90_ape'],'max_no_worse_than_baseline':m['max_ape']<=b['max_ape'],'severe_count_no_worse_than_baseline':m['over100_count']<=b['over100_count']};assert gates==evaluation['numerical_diagnostic_gates']
same(((pred.actual>=pred.lower)&(pred.actual<=pred.upper)).mean(),evaluation['interval']['diagnostic_coverage']);same(np.median((pred.upper-pred.lower)/pred.prediction),evaluation['interval']['median_width_over_prediction'])
events=read(O/'events.json');stages=[e['stage'] for e in events];assert stages.index('selection_frozen')<stages.index('final_models_frozen')<stages.index('diagnostic_predictions_frozen_before_current_run_label_loading')<stages.index('diagnostic_labels_opened')
for e in events:
 if e['stage']=='selection_frozen':assert e['selection_sha256']==sha(O/'selection.json')
 if e['stage']=='final_models_frozen':assert e['model_sha256']==sha(O/'selected_model.json') and e['baseline_sha256']==sha(O/'baseline_model.json')
 if e['stage']=='diagnostic_predictions_frozen_before_current_run_label_loading':assert e['sha256']==sha(O/'frozen_diagnostic_predictions.csv')
assert evaluation['independent_acceptance_established'] is False and evaluation['production_model_promoted'] is False and evaluation['new_independent_test_records']==0
# Independent reconstruction of the training-only review profile and every flag.
support=read(O/'support_profile.json');dv=features['development']
for name,a in {'gross':dv.gross_ft2,'net':dv.net_ft2,'ratio':dv.net_ft2/dv.gross_ft2}.items():same(support[name],np.nanquantile(a,[.01,.99]))
review=read(O/'input_review.json');assert [x['project_id'] for x in review['rows']]==test.project_id.tolist()
for row,record in zip(test.to_dict('records'),review['rows']):
 expected=[]
 for name,value in [('gross',row['gross_ft2']),('net',row['net_ft2']),('ratio',row['net_ft2']/row['gross_ft2'])]:
  lo,hi=support[name]
  if not np.isfinite(value) or value<=0:expected.append(name+'_missing_or_invalid')
  if np.isfinite(value) and (value<lo or value>hi):expected.append(name+'_outside_training_1_99_percentile')
 if row['project_scope']=='unverified':expected.append('scope_unverified')
 if row['students']>0 and any(row[k]>row['students']/2 for k in ['classes_k5','classes_68','classes_912']):expected.append('suspect_classroom_count')
 assert record['reasons']==expected and record['requires_input_review']==bool(expected)
assert review['flagged_count']==sum(x['requires_input_review'] for x in review['rows'])
assert sha(R/'protocol.json')==sha(D/'protocol.json')
assert len(sel['candidates'])==read(R/'protocol.json')['candidates']==37
# Verify the final area fallback from development features, without fitting.
if model.get('output_basis')=='net':
 ratio=(dv.net_ft2/dv.gross_ft2).to_numpy(float);expected=float(np.median(ratio[np.isfinite(ratio)&(ratio>0)]));same(expected,model['area_fallback_ratio'])
 if model['kind']=='ppi_residual':same(expected,model['residual']['area_fallback_ratio'])
assert evaluation['numerical_gates_passed']==all(gates.values())
assert evaluation['seven_engine_90pct_established'] is False and evaluation['full_engine_accuracy_validated'] is False
supplementary=read(R/'source_manifest.json')
for item in supplementary:assert sha(R/'sources'/item['file'])==item['sha256']
result={'verified':True,'source_reports_verified':16,'supplementary_sources_verified':len(supplementary),'ppi_months_verified':192,'scope_cell_rechecks':checks,'scope_changes_verified':len(changes),'candidate_metrics_verified':len(scores),'selection':winner,'diagnostic_predictions_reproduced':len(p),'calibration_predictions_reproduced':len(cp),'v13_predictions_reproduced':len(old),'v14_predictions_reproduced':len(v14),'input_review_flags_verified':len(review['rows']),'flagged_input_records':review['flagged_count'],'five_passed':fivepassed,'local_fits':0,'new_independent_holdout':False,'production_promoted':False,**metrics}
(R/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
