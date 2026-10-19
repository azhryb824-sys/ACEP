"""Frozen v5 research. This file refuses to fit outside Kaggle."""
import os
os.environ.setdefault('OMP_NUM_THREADS','2')
os.environ.setdefault('MKL_NUM_THREADS','2')
from pathlib import Path
import sys, json, hashlib, time, copy, zipfile, platform
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import Ridge, LogisticRegression
from sklearn.svm import SVR
from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor, ExtraTreesClassifier, HistGradientBoostingClassifier
from sklearn.metrics import balanced_accuracy_score, brier_score_loss, roc_auc_score, confusion_matrix
import sklearn
import torch
from torch import nn
torch.set_num_threads(2)

ROOT=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/kaggle/working/acep-real-v5')
assert str(ROOT).startswith('/kaggle/working/') and Path('/kaggle/input').is_dir(), 'Training is authorized on Kaggle only.'
DATA=ROOT/'data'; OUT=ROOT/'results';OUT.mkdir(exist_ok=True)
SEED=42195;np.random.seed(SEED);torch.manual_seed(SEED)
START=time.time()
def save(name,obj): (OUT/name).write_text(json.dumps(obj,indent=2,allow_nan=False)+'\n')
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
manifest=json.loads((DATA/'manifest.json').read_text())
for name,h in manifest.items(): assert sha(DATA/name)==h,name
contract=json.loads((DATA/'contract.json').read_text())
F={k:pd.read_csv(DATA/f'{k}_features.csv') for k in ('train','validation','refit_extra','test')}
L={k:pd.read_csv(DATA/f'{k}_labels.csv') for k in ('train','validation','refit_extra')}
for k in L:assert F[k].project_id.tolist()==L[k].project_id.tolist()
assert not set(F['test'].project_id)&set(pd.concat([F[k] for k in L]).project_id)
assert all(not any(v in c for v in ('completion','V-7','V-9','V-10','economic_21')) for c in contract['feature_sets']['economic'])
print('V5 FROZEN CONTRACT',sha(DATA/'contract.json'),flush=True)
print('TRAIN / VALIDATE / FINAL FIT / TEST:',162,81,274,38,flush=True)

def reg_metrics(y,p):
 y=np.asarray(y,float);p=np.asarray(p,float);e=np.abs(p-y)/y
 return dict(n=len(y),MAPE=float(e.mean()),WAPE=float(np.abs(p-y).sum()/y.sum()),MAE=float(np.abs(p-y).mean()),RMSE=float(np.sqrt(np.mean((p-y)**2))),within_10pct=float(np.mean(e<=.1)),median_relative_error=float(np.median(e)),coverage=float(np.mean(np.isfinite(p))))
def cls_metrics(y,p,threshold):
 y=np.asarray(y,int);p=np.clip(np.asarray(p,float),0,1);pred=(p>=threshold).astype(int)
 tn,fp,fn,tp=confusion_matrix(y,pred,labels=[0,1]).ravel()
 neg=tn+fp;pos=tp+fn
 return dict(n=len(y),accuracy=float(np.mean(y==pred)),balanced_accuracy=float((tn/neg+tp/pos)/2) if min(neg,pos)>0 else None,overrun_recall=float(tp/pos) if pos else None,no_overrun_recall=float(tn/neg) if neg else None,Brier=float(brier_score_loss(y,p)),ROC_AUC=float(roc_auc_score(y,p)) if min(neg,pos)>0 else None,confusion_matrix=[[int(tn),int(fp)],[int(fn),int(tp)]],negative_count=int(neg),positive_count=int(pos),coverage=1.0)
def threshold_on_validation(y,p):
 rows=[(t,cls_metrics(y,p,t)) for t in np.round(np.arange(.1,.9001,.025),6)]
 return sorted(rows,key=lambda a:(-float(a[1]['balanced_accuracy'] or 0),abs(a[0]-.5)))[0]
def prep_fit(df,cols):
 nums=[c for c in cols if c!='locality']
 v=df[nums].to_numpy(float);v=np.sign(v)*np.log1p(np.abs(v))
 scale=StandardScaler().fit(v);enc=OneHotEncoder(handle_unknown='ignore',sparse_output=False).fit(df[['locality']])
 return dict(columns=cols,numerics=nums,scale=scale,encoder=enc)
def prep_apply(prep,df):
 v=df[prep['numerics']].to_numpy(float);v=np.sign(v)*np.log1p(np.abs(v))
 return np.column_stack([prep['scale'].transform(v),prep['encoder'].transform(df[['locality']])]).astype(np.float32)
def decode(raw,task,df):
 if task=='risk':return 1/(1+np.exp(-np.clip(raw,-30,30)))
 scale=df.preliminary_unit_1e4_irr.to_numpy() if task=='cost' else 1.
 return np.exp(np.clip(raw,-15,15))*scale
def target(labels,task,df):
 if task=='risk':return labels.cost_overrun_gt_10pct.to_numpy(float)
 if task=='cost':return np.log(labels.construction_cost_unit_1e4_irr.to_numpy()/df.preliminary_unit_1e4_irr.to_numpy())
 return np.log(labels.duration_quarters.to_numpy())
def actual(labels,task):return labels[{'cost':'construction_cost_unit_1e4_irr','duration':'duration_quarters','risk':'cost_overrun_gt_10pct'}[task]].to_numpy()
def make_net(dim,widths):
 layers=[]
 for w in widths:layers.extend([nn.Linear(dim,w),nn.ReLU()]);dim=w
 layers.append(nn.Linear(dim,1));return nn.Sequential(*layers)
def neural_fit(X,y,task,widths,Xv=None,yv=None,dfv=None,epochs=None):
 torch.manual_seed(SEED);net=make_net(X.shape[1],widths)
 mean=0. if task=='risk' else float(y.mean());std=1. if task=='risk' else max(float(y.std()),.01)
 yt=torch.tensor((y-mean)/std,dtype=torch.float32).reshape(-1,1);xt=torch.tensor(X)
 opt=torch.optim.AdamW(net.parameters(),lr=.003,weight_decay=.01)
 lossfn=nn.BCEWithLogitsLoss(pos_weight=torch.tensor([(1-y).sum()/max(y.sum(),1)])) if task=='risk' else nn.SmoothL1Loss()
 best=None;bestkey=None;curve=[];end=epochs or 400
 gen=torch.Generator().manual_seed(SEED)
 for ep in range(1,end+1):
  net.train();ix=torch.randperm(len(X),generator=gen);losses=[]
  for chunk in ix.split(32):
   opt.zero_grad();loss=lossfn(net(xt[chunk]),yt[chunk]);loss.backward();nn.utils.clip_grad_norm_(net.parameters(),5.);opt.step();losses.append(float(loss.detach()))
  if epochs is None and (ep==1 or ep%5==0):
   net.eval()
   with torch.no_grad():raw=net(torch.tensor(Xv)).numpy().ravel()*std+mean
   p=decode(raw,task,dfv)
   if task=='risk':th,m=threshold_on_validation(yv,p);key=(-m['balanced_accuracy'],m['Brier'])
   else:m=reg_metrics(yv,p);key=(m['MAPE'],m['WAPE'])
   curve.append(dict(epoch=ep,loss=float(np.mean(losses)),validation=m))
   if bestkey is None or key<bestkey:bestkey=key;best=copy.deepcopy(net.state_dict());best_ep=ep
 if epochs is None:net.load_state_dict(best)
 else:best_ep=end
 weights=[{'weight':m.weight.detach().numpy(),'bias':m.bias.detach().numpy()} for m in net if isinstance(m,nn.Linear)]
 return dict(kind='neural',weights=weights,target_mean=mean,target_std=std,widths=widths,epochs=best_ep,parameter_count=sum(p.numel() for p in net.parameters())),curve
def predict(bundle,df):
 task=bundle['task'];kind=bundle['kind']
 if kind=='baseline':
  if task=='cost':return df.preliminary_unit_1e4_irr.to_numpy()*bundle['factor']
  return np.full(len(df),bundle['constant'])
 X=prep_apply(bundle['prep'],df)
 if kind=='neural':
  z=X
  for i,layer in enumerate(bundle['weights']):
   z=z@layer['weight'].T+layer['bias']
   if i<len(bundle['weights'])-1:z=np.maximum(z,0)
  return decode(z.ravel()*bundle['target_std']+bundle['target_mean'],task,df)
 if task=='risk':return bundle['model'].predict_proba(X)[:,1]
 return decode(bundle['model'].predict(X),task,df)
def estimator(name,task):
 if task=='risk':
  if name.startswith('logistic'):return LogisticRegression(C=float(name.split('_')[-1]),class_weight='balanced',max_iter=3000,random_state=SEED)
  if name.startswith('extra'):return ExtraTreesClassifier(n_estimators=400,min_samples_leaf=int(name.split('_')[-1]),max_features=.8,class_weight='balanced',n_jobs=2,random_state=SEED)
  if name.startswith('hist'):return HistGradientBoostingClassifier(max_iter=250,max_leaf_nodes=int(name.split('_')[-1]),min_samples_leaf=10,l2_regularization=5,class_weight='balanced',early_stopping=False,random_state=SEED)
 else:
  if name.startswith('ridge'):return Ridge(alpha=float(name.split('_')[-1]))
  if name.startswith('svr'):return SVR(C=float(name.split('_')[-1]),epsilon=.05)
  if name.startswith('extra'):return ExtraTreesRegressor(n_estimators=400,min_samples_leaf=int(name.split('_')[-1]),max_features=.8,n_jobs=2,random_state=SEED)
  if name.startswith('hist'):return HistGradientBoostingRegressor(max_iter=250,max_leaf_nodes=int(name.split('_')[-1]),min_samples_leaf=10,l2_regularization=5,early_stopping=False,random_state=SEED)
 raise ValueError(name)

candidates=[];selected={};validation_predictions={};curves={}
for task in ('cost','duration','risk'):
 y=target(L['train'],task,F['train']);yv=actual(L['validation'],task)
 taskrows=[]
 def record(name,bundle):
  p=predict(bundle,F['validation'])
  if task=='risk':threshold,m=threshold_on_validation(yv,p)
  else:threshold=None;m=reg_metrics(yv,p)
  row=dict(task=task,name=name,validation=m,threshold=threshold,kind=bundle['kind'],features=bundle.get('feature_set'),epochs=bundle.get('epochs'))
  taskrows.append((row,bundle));validation_predictions[task+'__'+name]=p
  print('VALIDATION',task,name,json.dumps(m),flush=True)
 if task=='cost':
  record('initial_estimate',dict(kind='baseline',task=task,factor=1.))
  record('median_cost_ratio',dict(kind='baseline',task=task,factor=float(np.median(np.exp(y)))))
 elif task=='duration':record('median_duration',dict(kind='baseline',task=task,constant=float(np.median(np.exp(y)))))
 else:
  record('always_overrun',dict(kind='baseline',task=task,constant=1.))
  record('train_prevalence',dict(kind='baseline',task=task,constant=float(y.mean())))
 names=['logistic_0.1','logistic_1','extra_2','extra_5','hist_7','hist_15'] if task=='risk' else ['ridge_1','ridge_10','ridge_100','svr_1','svr_10','extra_2','extra_5','hist_7','hist_15']
 for feature_set,cols in contract['feature_sets'].items():
  prep=prep_fit(F['train'],cols);X=prep_apply(prep,F['train']);Xv=prep_apply(prep,F['validation'])
  for name in names:
   model=estimator(name,task);model.fit(X,y.astype(int) if task=='risk' else y)
   record(feature_set+'__'+name,dict(kind='sklearn',task=task,prep=prep,model=model,feature_set=feature_set,estimator_name=name))
  for widths in ([32,16],[64,32]):
   name=feature_set+'__neural_'+'_'.join(map(str,widths))
   b,curve=neural_fit(X,y,task,widths,Xv,yv,F['validation']);b.update(task=task,prep=prep,feature_set=feature_set)
   record(name,b);curves[task+'__'+name]=curve
 def rank(item):
  row=item[0];m=row['validation']
  return (-m['balanced_accuracy'],m['Brier'],row['name']) if task=='risk' else (m['MAPE'],m['WAPE'],row['name'])
 row,bundle=sorted(taskrows,key=rank)[0]
 selected[task]=dict(row=row,bundle=bundle)
 candidates.extend(r for r,b in taskrows)
 # Retain best validation neural evidence, even when a simpler model wins.
 nr,nb=sorted([(r,b) for r,b in taskrows if b['kind']=='neural'],key=rank)[0]
 joblib.dump(nb,OUT/f'{task}_best_validation_neural.joblib')
 save(f'{task}_best_neural_summary.json',nr)
 print('SELECTED',task,row['name'],flush=True)
save('validation_candidates.json',candidates);save('neural_learning_curves.json',curves)
pd.DataFrame(validation_predictions,index=F['validation'].project_id).to_csv(OUT/'validation_predictions.csv',index_label='project_id')
save('frozen_selection.json',{'contract_sha256':sha(DATA/'contract.json'),'selection_time_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'test_labels_opened':False,'selections':{k:v['row'] for k,v in selected.items()}})

# Refit selected configurations with all pre-test-origin outcomes. No test-based tuning.
ff=pd.concat([F[k] for k in ('train','validation','refit_extra')],ignore_index=True)
ll=pd.concat([L[k] for k in ('train','validation','refit_extra')],ignore_index=True)
models={};frozen={}
for task,item in selected.items():
 b=copy.deepcopy(item['bundle']);y=target(ll,task,ff)
 if b['kind']=='baseline':
  if task=='cost':b['factor']=1. if item['row']['name']=='initial_estimate' else float(np.median(np.exp(y)))
  elif task=='duration':b['constant']=float(np.median(np.exp(y)))
  else:b['constant']=1. if item['row']['name']=='always_overrun' else float(y.mean())
 else:
  prep=prep_fit(ff,contract['feature_sets'][b['feature_set']]);X=prep_apply(prep,ff)
  if b['kind']=='neural':
   new,_=neural_fit(X,y,task,b['widths'],epochs=b['epochs']);new.update(task=task,prep=prep,feature_set=b['feature_set']);b=new
  else:
   b['prep']=prep;b['model']=estimator(b['estimator_name'],task);b['model'].fit(X,y.astype(int) if task=='risk' else y)
 b.update(selected_name=item['row']['name'],threshold=item['row']['threshold'],scope=contract['scope'],feature_exclusions=contract['feature_exclusions'])
 models[task]=b;path=OUT/f'{task}_selected_model.joblib';joblib.dump(b,path);frozen[path.name]=sha(path)
save('frozen_model_hashes.json',{'test_labels_opened':False,'hashes':frozen})
test_pred={task:predict(b,F['test']) for task,b in models.items()}

# First opening of test labels occurs only after all fitted model artifacts are frozen.
lt=pd.read_csv(DATA/'test_labels.csv');assert lt.project_id.tolist()==F['test'].project_id.tolist()
metrics={};five={};rows=F['test'][['project_id','start_year','start_quarter','floor_area_m2','preliminary_unit_1e4_irr']].copy()
baseline={};acceptance={}
for task,p in test_pred.items():
 y=actual(lt,task);b=models[task];rows[task+'_actual']=y;rows[task+'_predicted']=p
 if task=='risk':
  m=cls_metrics(y,p,b['threshold']);rows['risk_class']=(p>=b['threshold']).astype(int)
  baseline[task]=cls_metrics(y,np.ones(len(y)),.5)
 else:
  m=reg_metrics(y,p);rows[task+'_relative_error']=np.abs(p-y)/y
  bp=F['test'].preliminary_unit_1e4_irr.to_numpy() if task=='cost' else np.full(len(y),np.median(ll.duration_quarters))
  baseline[task]=reg_metrics(y,bp);rows[task+'_baseline']=bp
 metrics[task]=dict(selected_name=b['selected_name'],threshold=b['threshold'],test=m)
five_rows=rows.set_index('project_id').loc[contract['five_projects']].reset_index()
for task in ('cost','duration'):
 acceptance[task]=bool((five_rows[task+'_relative_error']<=.1).all() and metrics[task]['test']['within_10pct']>=.9 and metrics[task]['test']['coverage']==1.)
m=metrics['risk']['test'];acceptance['risk']=bool((m['balanced_accuracy'] or 0)>=.9 and (m['overrun_recall'] or 0)>=.9 and min(m['negative_count'],m['positive_count'])>=5 and (five_rows.risk_actual==five_rows.risk_class).all())
rows.to_csv(OUT/'heldout_predictions.csv',index=False);five_rows.to_csv(OUT/'five_project_results.csv',index=False)
evaluation={'tasks':metrics,'baselines':baseline,'acceptance':acceptance,'five_projects':contract['five_projects'],'full_engines_accepted':0,'overall_seven_engine_goal_met':False,'scope':contract['scope'],'runtime_seconds':time.time()-START,'runtime':{'python':platform.python_version(),'sklearn':sklearn.__version__,'torch':torch.__version__,'training_location':'Kaggle CPU'},'script_sha256':sha(Path(__file__))}
save('evaluation.json',evaluation)
save('inference_fixtures.json',{'features':F['test'].head(3).to_dict(orient='records'),'predictions':{t:p[:3].tolist() for t,p in test_pred.items()}})
for name,h in frozen.items():assert sha(OUT/name)==h
save('artifact_manifest.json',{p.name:sha(p) for p in sorted(OUT.iterdir()) if p.is_file() and p.name!='artifact_manifest.json'})
with zipfile.ZipFile('/kaggle/working/ACEP_Real_Projects_v5_results.zip','w',zipfile.ZIP_DEFLATED,6) as z:
 for p in sorted(OUT.iterdir()):
  if p.is_file():z.write(p,'results/'+p.name)
print('V5 FINISHED',json.dumps(evaluation),flush=True)
