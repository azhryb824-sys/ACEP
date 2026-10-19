"""Independent v8 metric, split, lineage and saved-weight checks. No fitting."""
from pathlib import Path
import hashlib,json,warnings
import numpy as np,pandas as pd,joblib
from sklearn.metrics import roc_auc_score
R=Path(__file__).resolve().parent;D=R/'data';O=R/'kaggle-output/results'
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def close(a,b):assert np.allclose(a,b,rtol=2e-5,atol=2e-6,equal_nan=False),(a,b)
def metric(y,p,t,th=.5):
 y=np.asarray(y);p=np.asarray(p)
 if t!='risk':
  e=np.abs(p-y)/y;return dict(n=len(y),MAPE=e.mean(),P95_APE=np.quantile(e,.95),max_APE=e.max(),within_10pct=np.mean(e<=.1),coverage=np.isfinite(p).mean(),MAE=np.abs(p-y).mean())
 z=p>=th;cm=np.array([[np.sum((y==0)&~z),np.sum((y==0)&z)],[np.sum((y==1)&~z),np.sum((y==1)&z)]]);neg,pos=cm.sum(axis=1)
 return dict(n=len(y),specificity=cm[0,0]/neg if neg else None,precision=cm[1,1]/cm[:,1].sum() if cm[:,1].sum() else 0.,accuracy=(z==y).mean(),balanced_accuracy=np.mean(cm.diagonal()/cm.sum(axis=1)) if neg*pos else None,overrun_recall=cm[1,1]/pos if pos else None,Brier=np.mean((p-y)**2),ROC_AUC=roc_auc_score(y,p) if neg*pos else None,confusion_matrix=cm.tolist(),negative_count=int(neg),positive_count=int(pos),coverage=np.isfinite(p).mean())
def check(a,b):
 assert set(a)==set(b)
 for k,v in a.items():
  if v is None:assert b[k] is None
  else:close(v,b[k])
def predict(b,f):
 t=b['task'];base=f['baseline_cost' if t=='cost' else 'planned_days'].to_numpy(float)
 if b['kind']=='constant':return np.full(len(f),b['value']) if t=='risk' else base*b['value']
 if b['kind']=='ensemble':p=np.mean([predict(m,f) for m in b['models']],axis=0)
 else:
  # Reconstruct transforms from frozen arrays: no fitting or sklearn-version-dependent transform.
  pre=b['prep'];a=np.log1p(f[pre['numeric']].to_numpy(float));a=np.where(np.isnan(a),pre['imputer'].statistics_,a)
  a=(a-pre['scale'].mean_)/pre['scale'].scale_;enc=pre['encoder'];assert enc.drop is None and not enc._infrequent_enabled
  cats=np.column_stack([(f[col].to_numpy()[:,None]==values).astype(float) for col,values in zip(pre['categorical'],enc.categories_)])
  x=np.column_stack([a,cats]).astype(np.float32)
  if b['kind']=='neural':
   for i,w in enumerate(b['weights']):
    x=x@w['weight'].T+w['bias']
    if i<len(b['weights'])-1:x=np.maximum(x,0)
   p=np.exp(np.tanh(x.ravel())*b['bound'])*base
  else:
   raw=model_output(b['model'],x,t);p=raw if t=='risk' else np.exp(np.clip(raw,-5,5))*base
 if t!='risk':return base+b.get('blend',1.)*(p-base)
 if 'calibration' in b:
  q=np.clip(p,1e-6,1-1e-6);z=b['calibration']['coef']*np.log(q/(1-q))+b['calibration']['intercept'];p=1/(1+np.exp(-np.clip(z,-30,30)))
 return p
def model_output(m,x,t):
 name=type(m).__name__
 if name in ['Ridge','LogisticRegression']:
  raw=(x@m.coef_.T+m.intercept_).ravel();return 1/(1+np.exp(-raw)) if t=='risk' else raw
 if name.startswith('ExtraTrees'):
  predictions=[]
  for est in m.estimators_:
   tr=est.tree_;inds=np.zeros(len(x),dtype=int)
   for j,row in enumerate(x):
    while tr.children_left[inds[j]]!=-1:
     node=inds[j];inds[j]=tr.children_left[node] if row[tr.feature[node]]<=tr.threshold[node] else tr.children_right[node]
   vals=tr.value[inds,0,:]
   predictions.append(vals[:,1]/vals.sum(axis=1) if t=='risk' else vals[:,0])
  return np.mean(predictions,axis=0)
 if name.startswith('HistGradientBoosting'):
  raw=np.full(len(x),float(m._baseline_prediction[0,0]))
  for stage in m._predictors:
   nodes=stage[0].nodes;assert not np.any(nodes['is_categorical'])
   for j,row in enumerate(x):
    i=0
    while not nodes[i]['is_leaf']:
     nd=nodes[i];i=int(nd['left'] if row[nd['feature_idx']]<=nd['num_threshold'] else nd['right'])
    raw[j]+=nodes[i]['value']
  return 1/(1+np.exp(-raw)) if t=='risk' else raw
 raise AssertionError(name)
def main():
 for folder,name in [(D,'manifest.json'),(O,'artifact_manifest.json')]:
  for n,h in read(folder/name).items():assert sha(folder/n)==h,n
 v6=R.parent/'real-project-improvement-v6'
 if not v6.exists():v6=R.parent/'real-projects-v6'
 if not v6.exists():v6=R/'sources/fdot-v6'
 prov=read(D/'input_provenance.json');assert sha(v6/'data/audited_contracts.csv')==prov['v6_audited_sha256']
 for n,h in prov['source_hashes'].items():assert sha(v6/'sources'/n)==h,n
 E=read(O/'evaluation.json');S=read(O/'frozen_selection.json');C=read(D/'contract.json');V=read(O/'development_candidates.json')
 assert E['training_source_sha256']==sha(R/'train_kaggle.py') and S['contract_sha256']==sha(D/'contract.json') and S['test_labels_opened'] is False
 for n,h in S['model_hashes'].items():assert sha(O/n)==h
 f=pd.read_csv(D/'development_features.csv',dtype={'group':str,'district':str,'contract_type':str});l=pd.read_csv(D/'development_labels.csv');tf=pd.read_csv(D/'test_features.csv',dtype={'group':str,'district':str,'contract_type':str});tl=pd.read_csv(D/'test_labels.csv')
 old=pd.read_csv(v6/'data/audited_contracts.csv',dtype={'project_family':str})
 assert len(f)==1612 and len(tf)==98 and f.report_end.max()<='2021-06-30' and tf.let_date.min()>='2022-07-01'
 assert not set(tf.group)&set(old.loc[old.split.ne('excluded'),'project_family'])
 assert not set(tf.project_id)&set(old.loc[old.split.ne('excluded'),'contract_id'])
 assert not set(f.group)&set(tf.group)
 folds=read(D/'folds.json');ids=[];fis=[]
 for k,z in enumerate(folds):
  a=f[f.project_id.isin(z['train_ids'])];b=f[f.project_id.isin(z['validation_ids'])];assert not set(a.group)&set(b.group);assert a.report_end.max()<=z['train_report_end'];assert b.let_date.min()>=z['validation_let_min'];ids+=b.project_id.tolist();fis += [k]*len(b)
 counts={}
 for t in ['cost','duration','risk']:
  p=pd.read_csv(O/f'{t}_development_predictions.csv',float_precision='round_trip');assert p.project_id.tolist()==ids and p.fold.tolist()==fis and p.project_id.is_unique
  bas=f.set_index('project_id').loc[ids,'baseline_cost' if t!='duration' else 'planned_days'].to_numpy();y=l.set_index('project_id').loc[ids,'actual_cost' if t!='duration' else 'actual_days'].to_numpy()
  if t=='risk':y=(y>1.1*bas).astype(float)
  close(p.actual,y);bm=metric(y,p.prevalence.to_numpy() if t=='risk' else bas,t)
  for row in V[t]:
   pp=p[row['name']].to_numpy();th=row['threshold'];check(metric(y,pp,t,th or .5),row['pooled'])
   for k in range(3):mask=p.fold.eq(k);check(metric(y[mask],pp[mask],t,th or .5),row['folds'][k])
   m=row['pooled']
   if t!='risk':
    eligible=row['name']=='unchanged' or (m['within_10pct']>=bm['within_10pct']+.01 and m['MAPE']<=bm['MAPE'] and m['P95_APE']<=bm['P95_APE'] and m['max_APE']<=bm['max_APE']*1.05)
    close(row['worst_fold_within10'],min(z['within_10pct'] for z in row['folds']))
   else:
    ts=[]
    for tt in np.round(np.arange(.01,.991,.01),6):
     mm=metric(y,pp,t,tt)
     if mm['specificity']>=.8 and mm['overrun_recall']>=.5 and mm['precision']>=max(.1,2*y.mean()) and mm['balanced_accuracy']>.5 and mm['Brier']<=bm['Brier']:ts.append((-mm['balanced_accuracy'],-mm['precision'],abs(tt-.5),float(tt)))
    eligible=bool(ts);assert th==(min(ts)[3] if ts else None)
   assert bool(eligible)==row['eligible']
  rank=(lambda r:(-r['pooled']['balanced_accuracy'],-r['pooled']['precision'],r['pooled']['Brier'],r['name'])) if t=='risk' else (lambda r:(-r['worst_fold_within10'],-r['pooled']['within_10pct'],r['pooled']['MAPE'],r['name']))
  good=[r for r in V[t] if r['eligible']];choice=min(good,key=rank) if good else next(r for r in V[t] if r['name']=='prevalence');assert choice==S['selection'][t];counts[t]=len(V[t])
 p=pd.read_csv(O/'heldout_predictions.csv',float_precision='round_trip');five=pd.read_csv(O/'five_project_results.csv',float_precision='round_trip');assert p.project_id.tolist()==tf.project_id.tolist()==tl.project_id.tolist()
 ids=C['five_projects'];assert ids==five.project_id.tolist()==sorted(tf.project_id,key=lambda s:hashlib.sha256(('ACEP-FDOT-V8-FIVE|'+s).encode()).hexdigest())[:5]
 verified={}
 for t in ['cost','duration','risk']:
  bas=tf['baseline_cost' if t!='duration' else 'planned_days'].to_numpy();y=tl['actual_cost' if t!='duration' else 'actual_days'].to_numpy()
  if t=='risk':y=(y>1.1*bas).astype(float)
  close(y,p[t+'_actual']);yp=p[t+'_prediction'].to_numpy();th=E['test'][t]['threshold'];m=metric(y,yp,t,th or .5)
  if t=='risk':
   if th is None:
    for k in ['specificity','precision','accuracy','balanced_accuracy','overrun_recall','confusion_matrix']:m[k]=None
    m['classification_coverage']=0.;assert p.risk_class.isna().all()
   else:m['classification_coverage']=1.;close(p.risk_class,(yp>=th).astype(int))
  check(m,E['test'][t]['metrics'])
  prior=float((l.actual_cost>1.1*f.baseline_cost).mean());check(metric(y,np.full(len(y),prior) if t=='risk' else bas,t),E['baselines'][t])
  with warnings.catch_warnings():warnings.simplefilter('ignore');b=joblib.load(O/f'{t}_model.joblib')
  reproduced=predict(b,tf)
  if t=='risk':reproduced=b['risk_blend_prior']+b['blend']*(reproduced-b['risk_blend_prior'])
  close(yp,reproduced)
  for col in [t+'_actual',t+'_prediction']:close(five[col],p.set_index('project_id').loc[ids,col])
  if t=='risk':gate=(m['balanced_accuracy'] or 0)>=.9 and (m['overrun_recall'] or 0)>=.9 and min(m['negative_count'],m['positive_count'])>=10 and np.all(five.risk_actual==five.risk_class) and m['classification_coverage']==1
  else:
   close(p[t+'_APE'],np.abs(yp-y)/y);close(five[t+'_APE'],p.set_index('project_id').loc[ids,t+'_APE']);gate=m['within_10pct']>=.9 and np.all(five[t+'_APE']<=.1) and m['coverage']==1
  assert bool(gate)==E['acceptance'][t];verified[t]=dict(metrics_verified=True,max_inference_difference=float(np.abs(yp-reproduced).max()),acceptance=bool(gate))
 out=dict(local_fitting=False,source_workbooks_verified=len(prov['source_hashes']),development_candidates_verified=counts,untouched_by_prior_FDOT_model_runs=98,test_results=verified,seven_engine_goal_met=False)
 (R/'independent_verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
if __name__=='__main__':main()
