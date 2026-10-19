"""FDOT v6: awarded-contract forecasts. Fitting is restricted to Kaggle."""
import os
os.environ.setdefault('OMP_NUM_THREADS','2');os.environ.setdefault('MKL_NUM_THREADS','2')
from pathlib import Path
import sys,json,hashlib,time,copy,zipfile,platform
import numpy as np,pandas as pd,joblib,sklearn,torch
from torch import nn
from sklearn.preprocessing import StandardScaler,OneHotEncoder
from sklearn.linear_model import Ridge,LogisticRegression
from sklearn.ensemble import ExtraTreesRegressor,ExtraTreesClassifier,HistGradientBoostingRegressor,HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score
R=Path(sys.argv[1]);assert str(R).startswith('/kaggle/working/') and Path('/kaggle/input').is_dir(),'Fit only on Kaggle'
D=R/'data';O=R/'results';O.mkdir(exist_ok=True);torch.set_num_threads(2);SEED=42197;np.random.seed(SEED);start=time.time()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,x):(O/n).write_text(json.dumps(x,indent=2,allow_nan=False)+'\n')
for n,h in json.loads((D/'manifest.json').read_text()).items():assert sha(D/n)==h,n
C=json.loads((D/'contract.json').read_text())
F={s:pd.read_csv(D/f'{s}_features.csv',dtype={'district':str,'project_family':str}) for s in ('train','validation','refit_extra','test')}
L={s:pd.read_csv(D/f'{s}_labels.csv') for s in ('train','validation','refit_extra')}
for s in L:assert F[s].contract_id.tolist()==L[s].contract_id.tolist()
for s in L:assert not set(F[s].project_family)&set(F['test'].project_family)
assert not set(F['train'].project_family)&set(F['validation'].project_family)
NUM=C['numeric_features'];CAT=C['categorical_features']
def numeric(f):return np.log1p(f[NUM].to_numpy(float))
def prep_fit(f):return dict(scale=StandardScaler().fit(numeric(f)),encoder=OneHotEncoder(handle_unknown='ignore',sparse_output=False).fit(f[CAT]),numerics=NUM,categoricals=CAT)
def features(prep,f):return np.column_stack([prep['scale'].transform(numeric(f)),prep['encoder'].transform(f[CAT])]).astype(np.float32)
def base(f,task):return f['original_cost_usd' if task=='cost' else 'original_days'].to_numpy(float)
def target(l,task):return l[{'cost':'actual_cost_usd','duration':'actual_days_used','risk':'cost_overrun_gt_10pct'}[task]].to_numpy(float)
def metrics(y,p,task,threshold=.5):
 y=np.asarray(y);p=np.asarray(p)
 if task!='risk':
  e=np.abs(p-y)/y;return dict(n=len(y),MAPE=float(e.mean()),WAPE=float(np.abs(p-y).sum()/y.sum()),MAE=float(np.abs(p-y).mean()),within_10pct=float((e<=.1).mean()),median_relative_error=float(np.median(e)),coverage=float(np.isfinite(p).mean()))
 pred=p>=threshold;tn=int(((y==0)&~pred).sum());fp=int(((y==0)&pred).sum());fn=int(((y==1)&~pred).sum());tp=int(((y==1)&pred).sum());neg=tn+fp;pos=tp+fn
 return dict(n=len(y),accuracy=float((pred==y).mean()),balanced_accuracy=float((tn/neg+tp/pos)/2) if min(neg,pos)>0 else None,overrun_recall=tp/pos if pos else None,no_overrun_recall=tn/neg if neg else None,Brier=float(((p-y)**2).mean()),ROC_AUC=float(roc_auc_score(y,p)) if min(neg,pos)>0 else None,confusion_matrix=[[tn,fp],[fn,tp]],negative_count=neg,positive_count=pos,coverage=float(np.isfinite(p).mean()))
def threshold(y,p):
 rows=[(float(t),metrics(y,p,'risk',t)) for t in np.round(np.arange(.05,.9501,.025),6)]
 return min(rows,key=lambda x:(-x[1]['balanced_accuracy'],abs(x[0]-.5)))
def ranking(row):
 m=row['validation'];return (-m['balanced_accuracy'],m['Brier'],row['name']) if row['task']=='risk' else (-m['within_10pct'],m['MAPE'],row['name'])
def infer(b,f):
 task=b['task'];kind=b['kind']
 if kind=='baseline':return np.full(len(f),b['value']) if task=='risk' else base(f,task)*b['value']
 if kind=='group':
  ratio=np.array([b['groups'].get(str(d)+'|'+str(ch),b['global']) for d,ch in zip(f.district,f.letting_channel)]);return base(f,task)*ratio
 x=features(b['prep'],f)
 if kind=='neural':
  for i,w in enumerate(b['weights']):
   x=x@w['weight'].T+w['bias']
   if i<len(b['weights'])-1:x=np.maximum(x,0)
  raw=x.ravel()*b['std']+b['mean'];p=1/(1+np.exp(-np.clip(raw,-30,30))) if task=='risk' else np.exp(np.clip(raw,-8,8))*base(f,task)
 else:p=b['model'].predict_proba(x)[:,1] if task=='risk' else np.exp(np.clip(b['model'].predict(x),-8,8))*base(f,task)
 return p if task=='risk' else base(f,task)+b.get('blend',1.)*(p-base(f,task))
def estimator(name,task):
 p=name.split('_')
 if task=='risk':
  if p[0]=='logistic':return LogisticRegression(C=float(p[1]),class_weight='balanced',max_iter=2000,random_state=SEED)
  if p[0]=='hist':return HistGradientBoostingClassifier(max_iter=200,max_leaf_nodes=int(p[1]),min_samples_leaf=30,l2_regularization=10,class_weight='balanced',learning_rate=.05,early_stopping=False,random_state=SEED)
  return ExtraTreesClassifier(n_estimators=250,min_samples_leaf=int(p[1]),max_features=.8,class_weight='balanced',random_state=SEED,n_jobs=2)
 if p[0]=='ridge':return Ridge(alpha=float(p[1]))
 if p[0]=='hist':return HistGradientBoostingRegressor(loss='absolute_error' if p[1]=='abs' else 'squared_error',max_iter=200,max_leaf_nodes=int(p[2]),min_samples_leaf=30,l2_regularization=10,learning_rate=.05,early_stopping=False,random_state=SEED)
 return ExtraTreesRegressor(n_estimators=250,min_samples_leaf=int(p[1]),max_features=.8,random_state=SEED,n_jobs=2)
def neural_fit(x,y,task,widths,xv=None,yv=None,fv=None,epochs=None,objective='log_huber'):
 torch.manual_seed(SEED);layers=[];dim=x.shape[1]
 for width in widths:layers += [nn.Linear(dim,width),nn.ReLU()];dim=width
 layers.append(nn.Linear(dim,1));net=nn.Sequential(*layers);opt=torch.optim.AdamW(net.parameters(),lr=.002,weight_decay=.03)
 mean=0. if task=='risk' else float(y.mean());std=1. if task=='risk' else max(float(y.std()),.05)
 tx=torch.tensor(x);ty=torch.tensor((y-mean)/std,dtype=torch.float32).reshape(-1,1);gen=torch.Generator().manual_seed(SEED);curve=[];best=None;bestkey=None
 for ep in range(1,(epochs or 250)+1):
  losses=[]
  for ix in torch.randperm(len(x),generator=gen).split(64):
   opt.zero_grad();pred=net(tx[ix])
   if task=='risk':loss=nn.functional.binary_cross_entropy_with_logits(pred,ty[ix],pos_weight=torch.tensor([(1-y).sum()/max(y.sum(),1)]))
   elif objective=='relative_huber':loss=nn.functional.smooth_l1_loss(torch.exp(torch.clamp((pred-ty[ix])*std,-8,8)),torch.ones_like(pred),beta=.1)
   else:loss=nn.functional.smooth_l1_loss(pred,ty[ix])
   loss.backward();nn.utils.clip_grad_norm_(net.parameters(),3.);opt.step();losses.append(float(loss.detach()))
  if epochs is None and (ep==1 or ep%5==0):
   with torch.no_grad():raw=net(torch.tensor(xv)).numpy().ravel()*std+mean
   yp=1/(1+np.exp(-np.clip(raw,-30,30))) if task=='risk' else np.exp(np.clip(raw,-8,8))*base(fv,task)
   if task=='risk':th,m=threshold(yv,yp);key=(-m['balanced_accuracy'],m['Brier'])
   else:m=metrics(yv,yp,task);key=(-m['within_10pct'],m['MAPE'])
   curve.append(dict(epoch=ep,loss=float(np.mean(losses)),validation=m))
   if bestkey is None or key<bestkey:bestkey=key;best=copy.deepcopy(net.state_dict());bestep=ep
 if epochs is None:net.load_state_dict(best)
 else:bestep=epochs
 return dict(kind='neural',weights=[dict(weight=m.weight.detach().numpy(),bias=m.bias.detach().numpy()) for m in net if isinstance(m,nn.Linear)],widths=widths,mean=mean,std=std,epochs=bestep,objective=objective,parameter_count=sum(p.numel() for p in net.parameters())),curve
def grouped(f,l,task,shrink):
 ratios=target(l,task)/base(f,task);g=float(np.median(ratios));keys=f.district+'|'+f.letting_channel;groups={}
 for k in keys.unique():
  z=ratios[keys.eq(k)];groups[k]=float((len(z)*np.median(z)+shrink*g)/(len(z)+shrink))
 return dict(kind='group',task=task,groups=groups,global_=g,shrink=shrink)
selected={};allrows=[];curves={};valpred={}
for task in ('cost','duration','risk'):
 yraw=target(L['train'],task);yv=target(L['validation'],task);y=yraw if task=='risk' else np.log(yraw/base(F['train'],task));rows=[];bundles={}
 def record(name,b):
  b['task']=task;p=infer(b,F['validation']);th,m=threshold(yv,p) if task=='risk' else (None,metrics(yv,p,task));r=dict(task=task,name=name,kind=b['kind'],threshold=th,epochs=b.get('epochs'),blend=b.get('blend'),validation=m);rows.append(r);bundles[name]=b;valpred[task+'__'+name]=p;print('V6 VALIDATION',json.dumps(r),flush=True)
 if task=='risk':
  record('always_no_overrun',dict(kind='baseline',value=0.));record('always_overrun',dict(kind='baseline',value=1.));record('train_prevalence',dict(kind='baseline',value=float(y.mean())))
 else:
  record('unchanged_initial',dict(kind='baseline',value=1.));record('median_ratio',dict(kind='baseline',value=float(np.median(np.exp(y)))))
  for shrink in [20,100]:
   b=grouped(F['train'],L['train'],task,shrink);b['global']=b.pop('global_');record(f'group_shrink_{shrink}',b)
 prep=prep_fit(F['train']);xt=features(prep,F['train']);xv=features(prep,F['validation'])
 names=['logistic_0.1','logistic_1','hist_7','hist_15','extra_10','extra_30'] if task=='risk' else ['ridge_1','ridge_10','ridge_100','hist_abs_7','hist_abs_15','hist_sq_7','hist_sq_15','extra_10','extra_30']
 for name in names:
  m=estimator(name,task);m.fit(xt,y.astype(int) if task=='risk' else y)
  for blend in ([1.] if task=='risk' else [.5,1.]):record(name+(f'__blend_{blend:g}' if task!='risk' else ''),dict(kind='sklearn',prep=prep,model=m,estimator_name=name,blend=blend))
 configs=[([32,16],'log_huber')] if task=='risk' else [([32,16],'log_huber'),([64,32],'log_huber'),([32,16],'relative_huber'),([64,32],'relative_huber')]
 for widths,objective in configs:
  nb,curve=neural_fit(xt,y,task,widths,xv,yv,F['validation'],objective=objective);nb.update(task=task,prep=prep);name='neural_'+'_'.join(map(str,widths))+'_'+objective;curves[task+'__'+name]=curve
  for blend in ([1.] if task=='risk' else [.5,1.]):record(name+(f'__blend_{blend:g}' if task!='risk' else ''),dict(nb,blend=blend))
 best=min(rows,key=ranking);selected[task]=dict(row=best,bundle=bundles[best['name']]);allrows+=rows
 nr=min([r for r in rows if r['kind']=='neural'],key=ranking);joblib.dump(bundles[nr['name']],O/f'{task}_best_validation_neural.joblib');save(f'{task}_best_neural_summary.json',nr)
 print('V6 SELECTED',task,best['name'],flush=True)
save('validation_candidates.json',allrows);save('neural_learning_curves.json',curves)
pd.DataFrame(valpred,index=F['validation'].contract_id).to_csv(O/'validation_predictions.csv',index_label='contract_id')
save('frozen_selection.json',dict(contract_sha256=sha(D/'contract.json'),test_labels_opened=False,selections={t:x['row'] for t,x in selected.items()}))
ff=pd.concat([F[s] for s in L],ignore_index=True);ll=pd.concat([L[s] for s in L],ignore_index=True);models={};hashes={}
for task,item in selected.items():
 b=copy.deepcopy(item['bundle']);yr=target(ll,task);y=yr if task=='risk' else np.log(yr/base(ff,task))
 if b['kind']=='baseline':
  if task=='risk':b['value']=float(y.mean()) if item['row']['name']=='train_prevalence' else b['value']
  else:b['value']=1. if item['row']['name']=='unchanged_initial' else float(np.median(np.exp(y)))
 elif b['kind']=='group':b=grouped(ff,ll,task,b['shrink']);b['global']=b.pop('global_')
 else:
  prep=prep_fit(ff);xx=features(prep,ff)
  if b['kind']=='neural':
   nb,_=neural_fit(xx,y,task,b['widths'],epochs=b['epochs'],objective=b['objective']);nb.update(prep=prep,task=task,blend=b['blend']);b=nb
  else:b['prep']=prep;b['model']=estimator(b['estimator_name'],task);b['model'].fit(xx,y.astype(int) if task=='risk' else y)
 b.update(selected_name=item['row']['name'],threshold=item['row']['threshold'],scope=C['scope']);models[task]=b;p=O/f'{task}_selected_model.joblib';joblib.dump(b,p);hashes[p.name]=sha(p)
save('frozen_model_hashes.json',dict(test_labels_opened=False,hashes=hashes))
pred={task:infer(b,F['test']) for task,b in models.items()}
# First semantic read of held-out labels, after model/configuration freeze.
lt=pd.read_csv(D/'test_labels.csv');assert lt.contract_id.tolist()==F['test'].contract_id.tolist()
out=F['test'].copy();tasks={};baselines={};acceptance={}
for task,p in pred.items():
 y=target(lt,task);out[task+'_actual']=y;out[task+'_prediction']=p;b=models[task];tasks[task]=dict(selected_name=b['selected_name'],threshold=b['threshold'],test=metrics(y,p,task,b['threshold'] or .5))
 if task=='risk':out['risk_class']=(p>=b['threshold']).astype(int);baselines[task]=metrics(y,np.zeros(len(y)),task,.5)
 else:
  bp=base(F['test'],task);out[task+'_baseline']=bp;out[task+'_relative_error']=np.abs(y-p)/y;baselines[task]=metrics(y,bp,task)
five=out.set_index('contract_id').loc[C['five_projects']].reset_index()
for task in ['cost','duration']:acceptance[task]=bool(tasks[task]['test']['within_10pct']>=.9 and (five[task+'_relative_error']<=.1).all() and tasks[task]['test']['coverage']==1.)
m=tasks['risk']['test'];acceptance['risk']=bool((m['balanced_accuracy'] or 0)>=.9 and (m['overrun_recall'] or 0)>=.9 and min(m['negative_count'],m['positive_count'])>=10 and (five.risk_actual==five.risk_class).all() and m['coverage']==1.)
out.to_csv(O/'heldout_predictions.csv',index=False);five.to_csv(O/'five_project_results.csv',index=False)
save('evaluation.json',dict(tasks=tasks,baselines=baselines,acceptance=acceptance,candidate_count=len(allrows),neural_training_configurations=len(curves),five_projects=C['five_projects'],full_engines_accepted=0,overall_seven_engine_goal_met=False,scope=C['scope'],limitations=C['limitations'],runtime_seconds=time.time()-start,runtime=dict(python=platform.python_version(),sklearn=sklearn.__version__,torch=torch.__version__,training_location='Kaggle CPU'),script_sha256=sha(Path(__file__))))
save('inference_fixtures.json',dict(features=F['test'].head(3).to_dict(orient='records'),predictions={t:p[:3].tolist() for t,p in pred.items()}))
save('artifact_manifest.json',{p.name:sha(p) for p in sorted(O.iterdir()) if p.is_file() and p.name!='artifact_manifest.json'})
with zipfile.ZipFile('/kaggle/working/ACEP_FDOT_v6_results.zip','w',zipfile.ZIP_DEFLATED,6) as z:
 for p in sorted(O.iterdir()):z.write(p,'results/'+p.name)
print('V6 FINISHED',json.dumps(json.loads((O/'evaluation.json').read_text())),flush=True)
