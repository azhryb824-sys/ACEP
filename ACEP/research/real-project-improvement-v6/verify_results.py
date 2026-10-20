"""Recompute v6 evidence and inference without fitting anything locally."""
from pathlib import Path
import hashlib,json,warnings
import numpy as np,pandas as pd,joblib
from sklearn.metrics import roc_auc_score
R=Path(__file__).resolve().parent;D=R/'data';O=R/'kaggle-output/results'
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def close(a,b):assert np.allclose(a,b,rtol=2e-5,atol=2e-6),(a,b)
def metric(y,p,task,th=.5):
 if task!='risk':
  er=np.abs(p-y)/y;return dict(n=len(y),MAPE=er.mean(),WAPE=np.abs(p-y).sum()/y.sum(),MAE=np.abs(p-y).mean(),within_10pct=(er<=.1).mean(),median_relative_error=np.median(er),coverage=np.isfinite(p).mean())
 pred=p>=th;tn=int(((y==0)&~pred).sum());fp=int(((y==0)&pred).sum());fn=int(((y==1)&~pred).sum());tp=int(((y==1)&pred).sum());n=tn+fp;pos=tp+fn
 return dict(n=len(y),accuracy=(pred==y).mean(),balanced_accuracy=(tn/n+tp/pos)/2 if n*pos else None,overrun_recall=tp/pos if pos else None,no_overrun_recall=tn/n if n else None,Brier=((p-y)**2).mean(),ROC_AUC=roc_auc_score(y,p) if n*pos else None,confusion_matrix=[[tn,fp],[fn,tp]],negative_count=n,positive_count=pos,coverage=np.isfinite(p).mean())
def check_metrics(actual,expected):
 assert set(actual)==set(expected)
 for k,v in actual.items():
  if v is None:assert expected[k] is None
  else:close(v,expected[k])
def predict(b,f):
 task=b['task'];base=f['original_cost_usd' if task=='cost' else 'original_days'].to_numpy(float)
 if b['kind']=='baseline':return np.full(len(f),b['value']) if task=='risk' else base*b['value']
 if b['kind']=='group':return base*np.array([b['groups'].get(str(d)+'|'+str(c),b['global']) for d,c in zip(f.district,f.letting_channel)])
 pr=b['prep'];x=np.column_stack([pr['scale'].transform(np.log1p(f[pr['numerics']].to_numpy(float))),pr['encoder'].transform(f[pr['categoricals']])]).astype(np.float32)
 if b['kind']=='neural':
  for i,w in enumerate(b['weights']):
   x=x@w['weight'].T+w['bias']
   if i<len(b['weights'])-1:x=np.maximum(x,0)
  raw=x.ravel()*b['std']+b['mean'];p=1/(1+np.exp(-np.clip(raw,-30,30))) if task=='risk' else np.exp(np.clip(raw,-8,8))*base
 else:p=b['model'].predict_proba(x)[:,1] if task=='risk' else np.exp(np.clip(b['model'].predict(x),-8,8))*base
 return p if task=='risk' else base+b.get('blend',1.)*(p-base)
def main():
 for folder,name in [(D,'manifest.json'),(O,'artifact_manifest.json')]:
  for n,h in read(folder/name).items():assert sha(folder/n)==h,n
 for s in read(R/'sources/downloads.json'):assert sha(R/'sources'/s['file'])==s['sha256']
 c=read(D/'contract.json');e=read(O/'evaluation.json');sel=read(O/'frozen_selection.json');v=read(O/'validation_candidates.json');vp=pd.read_csv(O/'validation_predictions.csv')
 assert sel['contract_sha256']==sha(D/'contract.json') and e['script_sha256']==sha(R/'train_kaggle.py')
 for n,h in read(O/'frozen_model_hashes.json')['hashes'].items():assert sha(O/n)==h,n
 f={s:pd.read_csv(D/f'{s}_features.csv',dtype={'district':str,'project_family':str}) for s in ['train','validation','refit_extra','test']};labels={s:pd.read_csv(D/f'{s}_labels.csv') for s in f}
 for s in f:assert f[s].contract_id.tolist()==labels[s].contract_id.tolist()
 for s in ['train','validation','refit_extra']:assert not set(f[s].project_family)&set(f['test'].project_family)
 assert not set(f['train'].project_family)&set(f['validation'].project_family)
 lineage=pd.read_csv(D/'audited_contracts.csv',dtype={'project_family':str})
 assert lineage.loc[lineage.split.eq('train'),'report_end'].max()<'2019-01-01'
 assert lineage.loc[lineage.split.isin(['train','validation','refit_extra']),'report_end'].max()<'2023-01-01'
 assert lineage.loc[lineage.split.eq('test'),'let_date'].min()>='2023-01-01'
 assert vp.contract_id.tolist()==f['validation'].contract_id.tolist()
 labelmap={'cost':'actual_cost_usd','duration':'actual_days_used','risk':'cost_overrun_gt_10pct'}
 for row in v:
  t=row['task'];y=labels['validation'][labelmap[t]].to_numpy();p=vp[t+'__'+row['name']].to_numpy();check_metrics(metric(y,p,t,row['threshold'] or .5),row['validation'])
 pred=pd.read_csv(O/'heldout_predictions.csv');assert pred.contract_id.tolist()==f['test'].contract_id.tolist()
 five=pd.read_csv(O/'five_project_results.csv');assert five.contract_id.tolist()==c['five_projects']
 assert sorted(f['test'].contract_id,key=lambda x:hashlib.sha256(('ACEP-FDOT-V6-FIVE|'+x).encode()).hexdigest())[:5]==c['five_projects']
 result={};refit=pd.concat([f[s] for s in ['train','validation','refit_extra']],ignore_index=True)
 for task,label in labelmap.items():
  rank=lambda r:(-r['validation']['balanced_accuracy'],r['validation']['Brier'],r['name']) if task=='risk' else (-r['validation']['within_10pct'],r['validation']['MAPE'],r['name'])
  assert min([r for r in v if r['task']==task],key=rank)['name']==sel['selections'][task]['name']
  y=labels['test'][label].to_numpy();p=pred[task+'_prediction'].to_numpy();close(y,pred[task+'_actual']);th=e['tasks'][task]['threshold'] or .5;check_metrics(metric(y,p,task,th),e['tasks'][task]['test'])
  bp=np.zeros(len(y)) if task=='risk' else f['test']['original_cost_usd' if task=='cost' else 'original_days'].to_numpy();check_metrics(metric(y,bp,task),e['baselines'][task])
  with warnings.catch_warnings():warnings.simplefilter('ignore');b=joblib.load(O/f'{task}_selected_model.joblib')
  if 'prep' in b:close(b['prep']['scale'].mean_,np.log1p(refit[b['prep']['numerics']].to_numpy(float)).mean(axis=0))
  yp=predict(b,f['test']);close(yp,p)
  for column in [task+'_actual',task+'_prediction']:close(five[column],pred.set_index('contract_id').loc[c['five_projects'],column])
  if task=='risk':
   m=e['tasks'][task]['test'];gate=(m['balanced_accuracy'] or 0)>=.9 and (m['overrun_recall'] or 0)>=.9 and min(m['negative_count'],m['positive_count'])>=10 and (five.risk_actual==five.risk_class).all() and m['coverage']==1
  else:gate=metric(y,p,task)['within_10pct']>=.9 and (np.abs(five[task+'_prediction']-five[task+'_actual'])/five[task+'_actual']<=.1).all() and np.isfinite(p).all()
  assert bool(gate)==e['acceptance'][task]
  result[task]=dict(rows=len(y),selected_name=b['selected_name'],metrics_verified=True,inference_max_abs_difference=float(np.abs(yp-p).max()),acceptance=bool(gate))
 output=dict(fitting_performed_locally=False,source_files_verified=10,validation_candidates_verified=len(v),test_contracts=len(pred),checks=result,seven_engine_goal_met=False)
 (R/'independent_verification.json').write_text(json.dumps(output,indent=2)+'\n');print(json.dumps(output,indent=2))
if __name__=='__main__':main()
