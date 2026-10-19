"""Independent v7 metric, split, lineage and saved-weight checks. No fitting."""
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
 return dict(n=len(y),accuracy=(z==y).mean(),balanced_accuracy=np.mean(cm.diagonal()/cm.sum(axis=1)) if neg*pos else None,overrun_recall=cm[1,1]/pos if pos else None,Brier=np.mean((p-y)**2),ROC_AUC=roc_auc_score(y,p) if neg*pos else None,confusion_matrix=cm.tolist(),negative_count=int(neg),positive_count=int(pos),coverage=np.isfinite(p).mean())
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
   m=b['model'];assert type(m).__name__ in ['Ridge','LogisticRegression']
   raw=(x@m.coef_.T+m.intercept_).ravel();p=1/(1+np.exp(-raw)) if t=='risk' else np.exp(np.clip(raw,-5,5))*base
 if t!='risk':return base+b.get('blend',1.)*(p-base)
 if 'calibration' in b:
  q=np.clip(p,1e-6,1-1e-6);z=b['calibration']['coef']*np.log(q/(1-q))+b['calibration']['intercept'];p=1/(1+np.exp(-np.clip(z,-30,30)))
 return p
def main():
 for folder,name in [(D,'manifest.json'),(O,'artifact_manifest.json')]:
  for n,h in read(folder/name).items():assert sha(folder/n)==h,n
 for n,h in read(D/'dslib_source_hashes.json').items():assert sha(R/n)==h,n
 E=read(O/'evaluation.json');S=read(O/'frozen_selection.json');C=read(D/'contract.json');V=read(O/'development_candidates.json')
 assert E['training_source_sha256']==sha(R/'train_kaggle.py') and S['contract_sha256']==sha(D/'contract.json')
 for n,h in S['model_hashes'].items():assert sha(O/n)==h
 assert S['test_labels_opened'] is False
 counts={};results={}
 for ds in ['fdot','dslib']:
  f=pd.read_csv(D/f'{ds}_development_features.csv',dtype={'district':str,'group':str});l=pd.read_csv(D/f'{ds}_development_labels.csv');assert f.project_id.tolist()==l.project_id.tolist()
  if ds=='fdot':
   folds=read(D/'fdot_folds.json');assert f.report_end.max()<='2022-06-30'
   for fold in folds:
    a=f[f.project_id.isin(fold['train_ids'])];b=f[f.project_id.isin(fold['validation_ids'])];assert not set(a.group)&set(b.group);assert a.report_end.max()<=fold['train_report_end'];assert b.let_date.min()>=fold['validation_let_min']
  else:
   test=pd.read_csv(D/'dslib_test_features.csv',dtype={'group':str});assert not set(test.group)&set(f.group);assert f.cohort.max()<2025 and test.cohort.min()>=2025
   for k in range(3):assert not set(f[f.fold.eq(k)].group)&set(f[f.fold.ne(k)].group)
  for t in ['cost','duration','risk']:
   key=ds+'__'+t;vp=pd.read_csv(O/f'{key}_development_predictions.csv',float_precision='round_trip');ys=vp.actual.to_numpy();n=0
   expected_ids=[f[f.project_id.isin(z['validation_ids'])].project_id.tolist() for z in folds] if ds=='fdot' else [f[f.fold.eq(k)].project_id.tolist() for k in range(3)]
   assert vp.project_id.is_unique
   assert vp.project_id.tolist()==sum(expected_ids,[])
   assert vp.fold.tolist()==sum([[k]*len(z) for k,z in enumerate(expected_ids)],[])
   expected=l.set_index('project_id').loc[vp.project_id,'actual_cost' if t!='duration' else 'actual_days'].to_numpy();bases=f.set_index('project_id').loc[vp.project_id,'baseline_cost' if t!='duration' else 'planned_days'].to_numpy()
   if t=='risk':expected=(expected>1.1*bases).astype(float)
   close(ys,expected)
   baseline=metric(ys,np.zeros(len(ys)) if t=='risk' else bases,t)
   brier_limit=metric(ys,vp.prevalence.to_numpy(),t)['Brier']*1.10 if t=='risk' else None
   for row in V[key]:
    p=vp[row['name']].to_numpy();th=row['threshold'] or .5;check(metric(ys,p,t,th),row['pooled'])
    for k in range(3):mask=vp.fold.eq(k).to_numpy();check(metric(ys[mask],p[mask],t,th),row['folds'][k])
    m=row['pooled'];name=row['name']
    eligible=(name in ['always_no','prevalence'] or m['Brier']<=brier_limit) if t=='risk' else (name=='unchanged' or (m['P95_APE']<=baseline['P95_APE']*1.05 and m['MAPE']<=baseline['MAPE']*1.05))
    assert bool(eligible)==row['eligible']
    if t!='risk':close(row['worst_fold_within_10pct'],min(z['within_10pct'] for z in row['folds']))
    n+=1
   if t=='risk':rank=lambda r:(-(r['pooled']['balanced_accuracy'] or 0),r['pooled']['Brier'],r['name'])
   else:rank=lambda r:(-r['worst_fold_within_10pct'],-r['pooled']['within_10pct'],r['pooled']['MAPE'],r['name'])
   choice=min([r for r in V[key] if r['eligible']],key=rank);assert choice==S['selection'][key];counts[key]=n
 f=pd.read_csv(D/'dslib_test_features.csv',dtype={'group':str});l=pd.read_csv(D/'dslib_test_labels.csv');p=pd.read_csv(O/'dslib_heldout_predictions.csv',float_precision='round_trip');five=pd.read_csv(O/'five_project_results.csv',float_precision='round_trip')
 assert f.project_id.tolist()==p.project_id.tolist()==l.project_id.tolist()
 ids=C['datasets']['dslib']['five_projects'];assert five.project_id.tolist()==ids==sorted(f.project_id,key=lambda s:hashlib.sha256(('ACEP-DSLIB-V7-FIVE|'+s).encode()).hexdigest())[:5]
 for t in ['cost','duration','risk']:
  y=l['actual_cost' if t!='duration' else 'actual_days'].to_numpy();base=f['baseline_cost' if t!='duration' else 'planned_days'].to_numpy()
  if t=='risk':y=(y>1.1*base).astype(float)
  close(y,p[t+'_actual']);yp=p[t+'_prediction'].to_numpy();th=E['test'][t]['threshold'] or .5;check(metric(y,yp,t,th),E['test'][t]['metrics']);check(metric(y,np.zeros(len(y)) if t=='risk' else base,t),E['baselines'][t])
  with warnings.catch_warnings():warnings.simplefilter('ignore');b=joblib.load(O/f'dslib__{t}_model.joblib')
  reproduced=predict(b,f);close(reproduced,yp)
  for col in [t+'_actual',t+'_prediction']:close(five[col],p.set_index('project_id').loc[ids,col])
  if t=='risk':
   close(p.risk_class,(yp>=th).astype(int));close(five.risk_class,(five.risk_prediction>=th).astype(int))
  else:
   close(p[t+'_APE'],np.abs(yp-y)/y);close(five[t+'_APE'],np.abs(five[t+'_prediction']-five[t+'_actual'])/five[t+'_actual'])
  if t=='risk':
   m=E['test'][t]['metrics'];gate=(m['balanced_accuracy'] or 0)>=.9 and (m['overrun_recall'] or 0)>=.9 and min(m['negative_count'],m['positive_count'])>=10 and np.all(five.risk_actual==five.risk_class) and m['coverage']==1
  else:gate=E['test'][t]['metrics']['within_10pct']>=.9 and np.all(five[t+'_APE']<=.1) and np.isfinite(yp).all()
  assert bool(gate)==E['acceptance'][t];results[t]=dict(metrics_verified=True,max_inference_difference=float(np.max(np.abs(yp-reproduced))),acceptance=bool(gate))
 out=dict(local_fitting=False,validation_candidates_verified=counts,source_workbooks_verified=len(read(D/'dslib_source_hashes.json')),test_projects=len(f),test_results=results,seven_engine_goal_met=False)
 (R/'independent_verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
if __name__=='__main__':main()
