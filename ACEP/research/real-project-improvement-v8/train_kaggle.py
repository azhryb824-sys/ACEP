"""V8: award-feature ablation, non-degradation selection and constrained risk alerts.
All fitting, including calibration and preprocessing, is restricted to Kaggle.
"""
import os
os.environ.setdefault('OMP_NUM_THREADS','2');os.environ.setdefault('MKL_NUM_THREADS','2')
from pathlib import Path
import sys,json,hashlib,time,platform,zipfile,warnings
import numpy as np,pandas as pd,joblib,sklearn,torch
from torch import nn
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler,OneHotEncoder
from sklearn.linear_model import Ridge,LogisticRegression
from sklearn.ensemble import HistGradientBoostingRegressor,ExtraTreesRegressor,HistGradientBoostingClassifier,ExtraTreesClassifier
from sklearn.metrics import roc_auc_score
R=Path(sys.argv[1]);assert str(R).startswith('/kaggle/working/') and Path('/kaggle/input').is_dir(),'Fit only on Kaggle'
D=R/'data';O=R/'results';O.mkdir(exist_ok=True);torch.set_num_threads(2);START=time.time();fit_counts={};curves=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,x):(O/n).write_text(json.dumps(x,indent=2,allow_nan=False)+'\n')
for n,h in json.loads((D/'manifest.json').read_text()).items():assert sha(D/n)==h,n
C=json.loads((D/'contract.json').read_text());C['datasets']=C['feature_sets'];SEEDS=[C['seed']+i for i in range(3)]
def metrics(y,p,task,threshold=.5):
 y=np.asarray(y);p=np.asarray(p)
 if task!='risk':
  e=np.abs(p-y)/y
  return dict(n=len(y),MAPE=float(e.mean()),P95_APE=float(np.quantile(e,.95)),max_APE=float(e.max()),within_10pct=float((e<=.1).mean()),coverage=float(np.isfinite(p).mean()),MAE=float(np.abs(p-y).mean()))
 z=p>=threshold;tn=int(((y==0)&~z).sum());fp=int(((y==0)&z).sum());fn=int(((y==1)&~z).sum());tp=int(((y==1)&z).sum());neg=tn+fp;pos=tp+fn
 return dict(n=len(y),specificity=tn/neg if neg else None,precision=tp/(tp+fp) if tp+fp else 0.,accuracy=float((z==y).mean()),balanced_accuracy=float((tn/neg+tp/pos)/2) if neg*pos else None,overrun_recall=tp/pos if pos else None,Brier=float(((p-y)**2).mean()),ROC_AUC=float(roc_auc_score(y,p)) if neg*pos else None,confusion_matrix=[[tn,fp],[fn,tp]],negative_count=neg,positive_count=pos,coverage=float(np.isfinite(p).mean()))
def target(l,f,task):return (l.actual_cost.to_numpy()>1.1*f.baseline_cost.to_numpy()).astype(float) if task=='risk' else l['actual_cost' if task=='cost' else 'actual_days'].to_numpy(float)
def base(f,t):return f['baseline_cost' if t=='cost' else 'planned_days'].to_numpy(float)
def prep_fit(f,ds):
 cols=C['datasets'][ds];im=SimpleImputer(strategy='median',keep_empty_features=True);num=im.fit_transform(np.log1p(f[cols['numeric']].to_numpy(float)));scale=StandardScaler().fit(num);enc=OneHotEncoder(handle_unknown='ignore',sparse_output=False).fit(f[cols['categorical']])
 return dict(imputer=im,scale=scale,encoder=enc,numeric=cols['numeric'],categorical=cols['categorical'])
def features(p,f):return np.column_stack([p['scale'].transform(p['imputer'].transform(np.log1p(f[p['numeric']].to_numpy(float)))),p['encoder'].transform(f[p['categorical']])]).astype(np.float32)
def sigmoid(x):return 1/(1+np.exp(-np.clip(x,-30,30)))
def logit(p):return np.log(np.clip(p,1e-6,1-1e-6)/(1-np.clip(p,1e-6,1-1e-6)))
def predict(b,f,calibrate=True):
 t=b['task'];k=b['kind']
 if k=='constant':return np.full(len(f),b['value']) if t=='risk' else base(f,t)*b['value']
 if k=='ensemble':p=np.mean([predict(m,f,False) for m in b['models']],axis=0)
 else:
  x=features(b['prep'],f)
  if k=='neural':
   for i,w in enumerate(b['weights']):
    x=x@w['weight'].T+w['bias']
    if i<len(b['weights'])-1:x=np.maximum(x,0)
   raw=np.tanh(x.ravel())*b['bound'];p=np.exp(raw)*base(f,t)
  else:p=b['model'].predict_proba(x)[:,1] if t=='risk' else np.exp(np.clip(b['model'].predict(x),-5,5))*base(f,t)
 if t!='risk':p=base(f,t)+b.get('blend',1.)*(p-base(f,t))
 if t=='risk' and calibrate and 'calibration' in b:p=sigmoid(b['calibration']['coef']*logit(p)+b['calibration']['intercept'])
 return p
def interval_ratio(r):
 vals=np.unique(np.r_[1.,np.quantile(r,np.linspace(0,1,201))]);return float(min(vals,key=lambda x:(-np.mean(np.abs(x-r)/r<=.1),np.mean(np.abs(x-r)/r),abs(x-1))))
def neural(x,y,width,updates,seed,task,tag):
 torch.manual_seed(seed);net=nn.Sequential(nn.Linear(x.shape[1],width),nn.ReLU(),nn.Linear(width,max(4,width//2)),nn.ReLU(),nn.Linear(max(4,width//2),1));nn.init.zeros_(net[-1].weight);nn.init.zeros_(net[-1].bias)
 bound=float(np.log(4 if task=='cost' else 8));opt=torch.optim.AdamW(net.parameters(),lr=.001,weight_decay=.03);tx=torch.tensor(x);ty=torch.tensor(np.clip(y,-5,5),dtype=torch.float32);gen=torch.Generator().manual_seed(seed);curve=[]
 for step in range(1,updates+1):
  ix=torch.randint(len(x),(min(128,len(x)),),generator=gen);opt.zero_grad();pred=torch.tanh(net(tx[ix]).ravel())*bound;loss=nn.functional.smooth_l1_loss(pred,ty[ix],beta=.1);loss.backward();nn.utils.clip_grad_norm_(net.parameters(),1.);opt.step()
  if step in [1,50,150,500]:curve.append(dict(update=step,loss=float(loss.detach())))
 curves.append(dict(tag=tag,seed=seed,width=width,updates=updates,loss=curve));fit_counts['neural']=fit_counts.get('neural',0)+1
 return dict(kind='neural',weights=[dict(weight=m.weight.detach().numpy(),bias=m.bias.detach().numpy()) for m in net if isinstance(m,nn.Linear)],bound=bound,seed=seed,updates=updates)
def fit_one(f,l,ds,task,name,tag):
 y=target(l,f,task)
 if name=='unchanged':return dict(kind='constant',task=task,value=1.)
 if name in ['median_ratio','interval_ratio']:
  r=y/base(f,task);return dict(kind='constant',task=task,value=float(np.median(r)) if name=='median_ratio' else interval_ratio(r))
 if name in ['always_no','prevalence']:return dict(kind='constant',task=task,value=0. if name=='always_no' else float(y.mean()))
 p=prep_fit(f,ds);x=features(p,f);z=y if task=='risk' else np.log(y/base(f,task));args=name.split('_')
 if args[0]=='neural':
  models=[]
  for seed in SEEDS:
   b=neural(x,z,int(args[1]),int(args[2]),seed,task,tag);b.update(prep=p,task=task);models.append(b)
  return dict(kind='ensemble',task=task,models=models,seeds=SEEDS)
 if task=='risk':
  if len(np.unique(y))<2:return dict(kind='constant',task=task,value=float(y.mean()))
  if args[0]=='logistic':m=LogisticRegression(C=float(args[1]),max_iter=1500,random_state=SEEDS[0])
  elif args[0]=='hist':m=HistGradientBoostingClassifier(max_leaf_nodes=7,max_iter=150,min_samples_leaf=max(5,min(25,len(f)//10)),l2_regularization=10,learning_rate=.03,early_stopping=False,random_state=SEEDS[0])
  else:m=ExtraTreesClassifier(n_estimators=200,min_samples_leaf=max(3,min(20,len(f)//10)),max_features=.8,n_jobs=2,random_state=SEEDS[0])
 else:
  if args[0]=='ridge':m=Ridge(alpha=float(args[1]))
  elif args[0]=='hist':m=HistGradientBoostingRegressor(loss='absolute_error',max_leaf_nodes=7,max_iter=150,min_samples_leaf=max(5,min(25,len(f)//10)),l2_regularization=10,learning_rate=.03,early_stopping=False,random_state=SEEDS[0])
  else:m=ExtraTreesRegressor(n_estimators=200,min_samples_leaf=max(3,min(int(args[1]),len(f)//10)),max_features=.8,n_jobs=2,random_state=SEEDS[0])
 m.fit(x,z);fit_counts['sklearn']=fit_counts.get('sklearn',0)+1
 return dict(kind='sklearn',task=task,prep=p,model=m)
def threshold(y,p):
 vals=[]
 for th in np.round(np.arange(.01,.991,.01),6):
  m=metrics(y,p,'risk',th);vals.append((-(m['balanced_accuracy'] or 0),abs(th-.5),float(th)))
 return min(vals)[2]
def calibration(y,p):
 if len(np.unique(y))<2:return dict(coef=0.,intercept=float(logit(np.array([(y.sum()+1)/(len(y)+2)]))[0]))
 m=LogisticRegression(C=1.,max_iter=1000).fit(logit(p).reshape(-1,1),y);fit_counts['calibration']=fit_counts.get('calibration',0)+1;return dict(coef=float(m.coef_[0,0]),intercept=float(m.intercept_[0]))
f=pd.read_csv(D/'development_features.csv',dtype={'group':str,'district':str,'contract_type':str});l=pd.read_csv(D/'development_labels.csv');assert f.project_id.tolist()==l.project_id.tolist()
folds=[(np.flatnonzero(f.project_id.isin(z['train_ids'])),np.flatnonzero(f.project_id.isin(z['validation_ids']))) for z in json.loads((D/'folds.json').read_text())]
allmetrics={};selected={};final={};models={}
for task in ['cost','duration','risk']:
 constant=['prevalence'] if task=='risk' else ['unchanged','median_ratio']
 learned=['logistic_0.1','logistic_1','hist','extra'] if task=='risk' else ['ridge_100','hist','extra_30','neural_16_150','neural_32_500']
 specs=[(n,'base',n) for n in constant]+[(fs+'::'+n,fs,n) for fs in ['base','rich'] for n in learned]
 oof={};ids=[];foldids=[];ys=[];bs=[]
 for k,(tr,va) in enumerate(folds):
  assert not set(f.iloc[tr].group)&set(f.iloc[va].group)
  tf=f.iloc[tr];tl=l.iloc[tr];vf=f.iloc[va];vl=l.iloc[va]
  ids+=vf.project_id.tolist();foldids += [k]*len(va);ys.extend(target(vl,vf,task));bs.extend(np.zeros(len(va)) if task=='risk' else base(vf,task));prev=float(target(tl,tf,'risk').mean())
  for label,fs,name in specs:
   b=fit_one(tf,tl,fs,task,name,f'{task}/fold{k}/{fs}/{name}');p=predict(b,vf);models.setdefault(task+'::'+label,[]).append(b)
   blends=[1.] if name in constant else [.5,1.]
   for blend in blends:
    tag=label if blend==1 else label+'::blend0.5';prior=prev if task=='risk' else base(vf,task)
    pv=prior+blend*(p-prior);oof.setdefault(tag,[]).extend(pv)
  print('V8 FOLD',task,k,flush=True)
 y=np.asarray(ys);foldids=np.asarray(foldids);frame=pd.DataFrame(dict(project_id=ids,fold=foldids,actual=y,baseline=bs));rows=[]
 baseline=metrics(y,np.asarray(oof['prevalence'] if task=='risk' else bs),task);population=float(y.mean()) if task=='risk' else None
 for name,pv in oof.items():
  p=np.asarray(pv);th=None;eligible=False
  if task=='risk':
   thresholds=[]
   for tt in np.round(np.arange(.01,.991,.01),6):
    m=metrics(y,p,task,tt)
    if m['specificity']>=.8 and m['overrun_recall']>=.5 and m['precision']>=max(.1,2*population) and m['balanced_accuracy']>.5 and m['Brier']<=baseline['Brier']:
     thresholds.append((-m['balanced_accuracy'],-m['precision'],abs(tt-.5),float(tt)))
   if thresholds:th=min(thresholds)[3];eligible=True
  m=metrics(y,p,task,th or .5);fm=[metrics(y[foldids==k],p[foldids==k],task,th or .5) for k in range(3)]
  if task!='risk':eligible=name=='unchanged' or (m['within_10pct']>=baseline['within_10pct']+.01 and m['MAPE']<=baseline['MAPE'] and m['P95_APE']<=baseline['P95_APE'] and m['max_APE']<=baseline['max_APE']*1.05)
  row=dict(name=name,pooled=m,folds=fm,eligible=bool(eligible),threshold=th,worst_fold_within10=min(z['within_10pct'] for z in fm) if task!='risk' else None)
  rows.append(row);frame[name]=p
 rank=(lambda r:(-r['pooled']['balanced_accuracy'],-r['pooled']['precision'],r['pooled']['Brier'],r['name'])) if task=='risk' else (lambda r:(-r['worst_fold_within10'],-r['pooled']['within_10pct'],r['pooled']['MAPE'],r['name']))
 good=[r for r in rows if r['eligible']];choice=min(good,key=rank) if good else next(r for r in rows if r['name']=='prevalence')
 raw=choice['name'].replace('::blend0.5','');_,fs,nm=next(z for z in specs if z[0]==raw)
 b=fit_one(f,l,fs,task,nm,f'{task}/FINAL/{fs}/{nm}');b.update(blend=.5 if choice['name'].endswith('::blend0.5') else 1.,selected_name=choice['name'],threshold=choice['threshold'],feature_set=fs,risk_decision_validated=bool(good) if task=='risk' else None)
 if task=='risk':b['risk_blend_prior']=float(target(l,f,task).mean())
 joblib.dump(b,O/f'{task}_model.joblib');final[task]=b;selected[task]=choice;allmetrics[task]=rows;frame.to_csv(O/f'{task}_development_predictions.csv',index=False)
 print('V8 SELECTED',task,choice['name'],json.dumps(choice['pooled']),flush=True)
save('development_candidates.json',allmetrics);save('training_curves.json',curves)
save('frozen_selection.json',dict(test_labels_opened=False,contract_sha256=sha(D/'contract.json'),selection=selected,model_hashes={p.name:sha(p) for p in O.glob('*_model.joblib')}))
# Semantic test-label read occurs only after final artifacts and selections are frozen.
tf=pd.read_csv(D/'test_features.csv',dtype={'group':str,'district':str,'contract_type':str});tl=pd.read_csv(D/'test_labels.csv');assert tf.project_id.tolist()==tl.project_id.tolist()
assert not set(tf.group)&set(f.group);out=tf.copy();test={};baselines={};acceptance={}
for task in ['cost','duration','risk']:
 b=final[task];y=target(tl,tf,task);p=predict(b,tf)
 if task=='risk':p=b['risk_blend_prior']+b['blend']*(p-b['risk_blend_prior'])
 th=b['threshold'];m=metrics(y,p,task,th or .5)
 if task=='risk' and not b['risk_decision_validated']:
  for n in ['specificity','precision','accuracy','balanced_accuracy','overrun_recall','confusion_matrix']:m[n]=None
  m['classification_coverage']=0.
 elif task=='risk':m['classification_coverage']=1.
 test[task]=dict(selected_name=b['selected_name'],threshold=th,metrics=m,decision_status='requires_review' if task=='risk' and not b['risk_decision_validated'] else 'research_only')
 baselines[task]=metrics(y,np.full(len(y),float(target(l,f,'risk').mean())) if task=='risk' else base(tf,task),task)
 out[task+'_actual']=y;out[task+'_prediction']=p
 if task=='risk':out['risk_class']=(p>=th).astype(int) if th is not None else np.nan
 else:out[task+'_APE']=np.abs(p-y)/y
five=out.set_index('project_id').loc[C['five_projects']].reset_index()
for task in ['cost','duration']:acceptance[task]=bool(test[task]['metrics']['within_10pct']>=.9 and (five[task+'_APE']<=.1).all() and test[task]['metrics']['coverage']==1.)
m=test['risk']['metrics'];acceptance['risk']=bool((m['balanced_accuracy'] or 0)>=.9 and (m['overrun_recall'] or 0)>=.9 and min(m['negative_count'],m['positive_count'])>=10 and (five.risk_actual==five.risk_class).all() and m['classification_coverage']==1.)
out.to_csv(O/'heldout_predictions.csv',index=False);five.to_csv(O/'five_project_results.csv',index=False)
result=dict(test=test,baselines=baselines,acceptance=acceptance,full_engines_accepted=0,seven_engine_goal_met=False,fit_counts=fit_counts,candidate_counts={k:len(v) for k,v in allmetrics.items()},runtime_seconds=time.time()-START,runtime=dict(python=platform.python_version(),sklearn=sklearn.__version__,torch=torch.__version__,location='Kaggle CPU'),training_source_sha256=sha(Path(__file__)),limits=C['limits'])
save('evaluation.json',result);save('artifact_manifest.json',{p.name:sha(p) for p in O.iterdir() if p.is_file() and p.name!='artifact_manifest.json'})
with zipfile.ZipFile('/kaggle/working/ACEP_v8_results.zip','w',zipfile.ZIP_DEFLATED,6) as z:
 for p in sorted(O.iterdir()):z.write(p,'results/'+p.name)
print('V8 FINISHED',json.dumps(result),flush=True)
