"""Independent result verification; no model or transformer fitting."""
from pathlib import Path
import json,hashlib,warnings
import numpy as np,pandas as pd,joblib
R=Path(__file__).resolve().parent
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def close(a,b):assert np.allclose(a,b,rtol=2e-5,atol=2e-6),(a,b)
def manifests(d,o):
 for name,h in read(d/'manifest.json').items():assert sha(d/name)==h,name
 for name,h in read(o/'artifact_manifest.json').items():assert sha(o/name)==h,name
def load(p):
 with warnings.catch_warnings():
  warnings.simplefilter('ignore');return joblib.load(p)
def forward(x,weights):
 for i,w in enumerate(weights):
  x=x@w['weight'].T+w['bias']
  if i<len(weights)-1:x=np.maximum(x,0)
 return x.ravel()
def residential():
 d=R/'data';o=R/'kaggle-output/results';manifests(d,o)
 e=read(o/'evaluation.json');f=pd.read_csv(d/'test_features.csv');l=pd.read_csv(d/'test_labels.csv');p=pd.read_csv(o/'heldout_predictions.csv');c=read(d/'contract.json');s=read(o/'frozen_selection.json');v=read(o/'validation_candidates.json')
 assert s['contract_sha256']==sha(d/'contract.json')
 assert f.project_id.tolist()==p.project_id.tolist()==l.project_id.tolist()
 assert not set(f.project_id)&set(pd.concat([pd.read_csv(d/(k+'_features.csv')) for k in ['train','validation','refit_extra']]).project_id)
 for name,h in read(o/'frozen_model_hashes.json')['hashes'].items():assert sha(o/name)==h
 checks={}
 for task,label in [('cost','construction_cost_unit_1e4_irr'),('duration','duration_quarters'),('risk','cost_overrun_gt_10pct')]:
  close(p[task+'_actual'],l[label]);a=l[label].to_numpy();z=p[task+'_predicted'].to_numpy();m=e['tasks'][task]['test']
  rank=(lambda r:(-r['validation']['balanced_accuracy'],r['validation']['Brier'],r['name'])) if task=='risk' else (lambda r:(r['validation']['MAPE'],r['validation']['WAPE'],r['name']))
  assert min([r for r in v if r['task']==task],key=rank)['name']==s['selections'][task]['name']
  if task=='risk':
   pred=z>=e['tasks'][task]['threshold'];tn=int(((a==0)&~pred).sum());fp=int(((a==0)&pred).sum());fn=int(((a==1)&~pred).sum());tp=int(((a==1)&pred).sum())
   assert [[tn,fp],[fn,tp]]==m['confusion_matrix'];close((pred==a).mean(),m['accuracy']);close((tn/(tn+fp)+tp/(tp+fn))/2,m['balanced_accuracy']);close(((z-a)**2).mean(),m['Brier'])
  else:
   err=np.abs(a-z)/a;close(err.mean(),m['MAPE']);close((err<=.1).mean(),m['within_10pct']);close(np.abs(a-z).sum()/a.sum(),m['WAPE'])
   bp=p[task+'_baseline'].to_numpy();close((np.abs(a-bp)/a).mean(),e['baselines'][task]['MAPE'])
  b=load(o/f'{task}_selected_model.joblib');pr=b['prep'];x=f[pr['numerics']].to_numpy(float);x=np.sign(x)*np.log1p(np.abs(x));x=np.column_stack([pr['scale'].transform(x),pr['encoder'].transform(f[['locality']])]).astype(np.float32)
  if b['kind']=='neural':
   raw=forward(x,b['weights'])*b['target_std']+b['target_mean'];yp=np.exp(np.clip(raw,-15,15))*(f.preliminary_unit_1e4_irr.to_numpy() if task=='cost' else 1.)
  else:yp=b['model'].predict_proba(x)[:,1]
  close(yp,z);checks[task]={'rows':len(a),'inference_max_abs_difference':float(np.abs(yp-z).max()),'metrics_and_selection_verified':True}
 five=p.set_index('project_id').loc[c['five_projects']];assert read(o/'evaluation.json')['five_projects']==c['five_projects']
 for task in ['cost','duration']:assert e['acceptance'][task]==bool((five[task+'_relative_error']<=.1).all() and e['tasks'][task]['test']['within_10pct']>=.9)
 assert not any(e['acceptance'].values());assert e['script_sha256']==sha(R/'train_kaggle.py')
 return {'candidate_count':len(v),'neural_candidates':sum(r['kind']=='neural' for r in v),'checks':checks,'acceptance':e['acceptance']}
def boq():
 d=R/'boq_data';o=R/'boq-kaggle-output/results';manifests(d,o)
 e=read(o/'evaluation.json');s=read(o/'frozen_selection.json');c=read(d/'contract.json');v=read(o/'validation_candidates.json');audit=read(d/'audit.json')
 assert s['contract_sha256']==sha(d/'contract.json')
 for name,h in s['model_hashes'].items():assert sha(o/name)==h
 f=pd.read_csv(d/'test_features.csv',dtype={'wbs':str});l=pd.read_csv(d/'test_labels.csv');p=pd.read_csv(o/'heldout_predictions.csv')
 assert f.item_id.tolist()==l.item_id.tolist()==p.item_id.tolist()
 assert not set(f.project_id)&set(pd.concat([pd.read_csv(d/(k+'_features.csv')) for k in ['train','validation']]).project_id)
 checks={}
 for task,base in [('actual_quantity','planned_quantity'),('actual_cost_aud','planned_cost_aud')]:
  close(l[task],p[task]);y=l[task].to_numpy();z=p[task+'_prediction'].to_numpy();err=np.where(y>0,np.abs(z-y)/np.maximum(y,1e-12),np.where(z<=1e-8,0,1e12))
  m=e['tasks'][task]['test'];close((err<=.1).mean(),m['within_10pct'])
  rank=lambda r:(-r['validation']['within_10pct'],r['validation']['mean_bounded_relative_error'],r['name'])
  assert min([r for r in v if r['task']==task],key=rank)['name']==s['selections'][task]['name']
  b=load(o/f'{task}_selected.joblib');model=b['model'];bas=f[base].to_numpy()
  if model['kind']=='baseline':yp=bas*model['ratio']
  elif model['kind']=='unit':yp=bas*np.array([model['ratios'].get(u,model['default']) for u in f.unit])
  else:
   x=np.column_stack([b['scaler'].transform(np.log1p(f[['planned_quantity','planned_cost_aud']].to_numpy(float))),b['encoder'].transform(f[['unit','wbs']]),b['vectorizer'].transform(f.description).toarray()]).astype(np.float32)
   raw=forward(x,model['weights'])*model['std']+model['mean'] if model['kind']=='neural' else model['model'].predict(x)
   yp=bas*np.exp(np.clip(raw,-15,15))
  close(yp,z)
  for r in [r for r in e['projects'] if r['task']==task]:
   ix=f.project_id.eq(r['project_id']).to_numpy();success=int((err[ix]<=.1).sum());total=audit['per_project_counts'][r['project_id']]
   close(success/total,r['within_10pct_all_audited']);close(ix.sum()/total,r['eligible_coverage'])
   passed=success/total>=.9
   if task=='actual_cost_aud':ce=abs(z[ix].sum()-y[ix].sum())/y[ix].sum();close(ce,r['eligible_cost_total_relative_error']);passed=passed and ce<=.1
   assert bool(passed)==r['pass']
  checks[task]={'rows':len(y),'inference_max_abs_difference':float(np.abs(yp-z).max()),'metrics_selection_and_project_gates_verified':True}
 assert e['script_sha256']==sha(R/'train_boq_kaggle.py')
 return {'candidate_count':len(v),'neural_candidates':2,'checks':checks,'projects_passing':{task:sum(r['pass'] for r in e['projects'] if r['task']==task) for task in checks}}
if __name__=='__main__':
 result={'fitting_performed_locally':False,'residential':residential()}
 if (R/'boq-kaggle-output/results').is_dir():result['boq']=boq()
 (R/'independent-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
