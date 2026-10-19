"""Project-disjoint conditional BOQ quantity/cost research; Kaggle fitting only."""
import os
os.environ.setdefault('OMP_NUM_THREADS','2')
from pathlib import Path
import sys,json,hashlib,time,copy,zipfile,platform
import numpy as np,pandas as pd,joblib,torch,sklearn
from torch import nn
from sklearn.preprocessing import StandardScaler,OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import Ridge
from sklearn.ensemble import ExtraTreesRegressor,HistGradientBoostingRegressor
R=Path(sys.argv[1]);assert str(R).startswith('/kaggle/working/') and Path('/kaggle/input').is_dir()
D=R/'data';O=R/'results';O.mkdir(exist_ok=True);torch.set_num_threads(2);SEED=42196;start=time.time()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,x):(O/n).write_text(json.dumps(x,indent=2,allow_nan=False)+'\n')
for n,h in json.loads((D/'manifest.json').read_text()).items():assert sha(D/n)==h,n
C=json.loads((D/'contract.json').read_text());A=json.loads((D/'audit.json').read_text())
F={k:pd.read_csv(D/f'{k}_features.csv',dtype={'wbs':str}) for k in ('train','validation','test')}
L={k:pd.read_csv(D/f'{k}_labels.csv') for k in ('train','validation')}
for k in L:assert F[k].item_id.tolist()==L[k].item_id.tolist()
assert not set(F['test'].project_id)&set(pd.concat([F['train'],F['validation']]).project_id)
enc=OneHotEncoder(handle_unknown='ignore',sparse_output=False).fit(F['train'][['unit','wbs']])
text=TfidfVectorizer(max_features=128,ngram_range=(1,2),min_df=1).fit(F['train'].description)
def numeric(f):return np.log1p(f[['planned_quantity','planned_cost_aud']].to_numpy(float))
scale=StandardScaler().fit(numeric(F['train']))
def X(f):return np.column_stack([scale.transform(numeric(f)),enc.transform(f[['unit','wbs']]),text.transform(f.description).toarray()]).astype(np.float32)
xt=X(F['train']);xv=X(F['validation'])
def score(y,p):
 y=np.asarray(y,float);p=np.maximum(np.asarray(p,float),0)
 e=np.zeros(len(y));positive=y>0;e[positive]=np.abs(p[positive]-y[positive])/y[positive];e[~positive]=np.where(p[~positive]<=1e-8,0,1e12)
 bounded=np.abs(p-y)/np.maximum(np.maximum(p,y),1e-12)
 return dict(n=len(y),within_10pct=float((e<=.1).mean()),mean_bounded_relative_error=float(bounded.mean()),positive_target_MAPE=float(e[positive].mean()) if positive.any() else None,zero_actual_cases=int((~positive).sum()),coverage=1.0)
def predict(b,f):
 base=f[b['base']].to_numpy(float)
 if b['kind']=='baseline':return base*b['ratio']
 if b['kind']=='unit':return base*np.array([b['ratios'].get(u,b['default']) for u in f.unit])
 xx=X(f)
 if b['kind']=='neural':
  for i,z in enumerate(b['weights']):
   xx=xx@z['weight'].T+z['bias']
   if i<len(b['weights'])-1:xx=np.maximum(xx,0)
  ratio=np.exp(np.clip(xx.ravel()*b['std']+b['mean'],-15,15))
 else:ratio=np.exp(np.clip(b['model'].predict(xx),-15,15))
 return base*ratio
models={};selections={};candidates=[];curves={}
for task,base in [('actual_quantity','planned_quantity'),('actual_cost_aud','planned_cost_aud')]:
 y=L['train'][task].to_numpy(float);yv=L['validation'][task].to_numpy(float);ratio=y/F['train'][base].to_numpy();z=np.log(np.maximum(ratio,1e-6));rows=[]
 def add(name,b):
  b.update(base=base,task=task);m=score(yv,predict(b,F['validation']));r=dict(task=task,name=name,validation=m,epochs=b.get('epochs'));rows.append((r,b));print('BOQ VALIDATION',json.dumps(r),flush=True)
 add('unchanged_baseline',dict(kind='baseline',ratio=1.))
 median=float(np.median(ratio));add('global_median_ratio',dict(kind='baseline',ratio=median))
 unitratios={u:float(np.median(ratio[F['train'].unit.eq(u)])) for u in F['train'].unit.unique()}
 add('unit_median_ratio',dict(kind='unit',ratios=unitratios,default=median))
 for name in ['ridge_1','ridge_10','ridge_100','extra_2','extra_5','hist_7']:
  if name.startswith('ridge'):m=Ridge(alpha=float(name.split('_')[1]))
  elif name.startswith('extra'):m=ExtraTreesRegressor(n_estimators=300,min_samples_leaf=int(name.split('_')[1]),max_features=.8,random_state=SEED,n_jobs=2)
  else:m=HistGradientBoostingRegressor(max_leaf_nodes=7,max_iter=200,min_samples_leaf=10,l2_regularization=5,early_stopping=False,random_state=SEED)
  m.fit(xt,z);add(name,dict(kind='sklearn',model=m))
 torch.manual_seed(SEED);net=nn.Sequential(nn.Linear(xt.shape[1],32),nn.ReLU(),nn.Linear(32,16),nn.ReLU(),nn.Linear(16,1));opt=torch.optim.AdamW(net.parameters(),lr=.003,weight_decay=.02)
 mean=float(z.mean());std=max(float(z.std()),.01);tx=torch.tensor(xt);ty=torch.tensor((z-mean)/std,dtype=torch.float32).reshape(-1,1);curve=[];best=None;key=None
 for ep in range(1,401):
  opt.zero_grad();loss=nn.functional.smooth_l1_loss(net(tx),ty);loss.backward();nn.utils.clip_grad_norm_(net.parameters(),5.);opt.step()
  if ep==1 or ep%5==0:
   with torch.no_grad():p=np.exp(np.clip(net(torch.tensor(xv)).numpy().ravel()*std+mean,-15,15))*F['validation'][base].to_numpy()
   m=score(yv,p);k=(-m['within_10pct'],m['mean_bounded_relative_error']);curve.append(dict(epoch=ep,loss=float(loss.detach()),validation=m))
   if key is None or k<key:key=k;best=copy.deepcopy(net.state_dict());best_ep=ep
 net.load_state_dict(best);weights=[dict(weight=m.weight.detach().numpy(),bias=m.bias.detach().numpy()) for m in net if isinstance(m,nn.Linear)]
 nb=dict(kind='neural',weights=weights,mean=mean,std=std,epochs=best_ep);add('neural_32_16',nb);curves[task]=curve
 joblib.dump(dict(model=nb,encoder=enc,scaler=scale,vectorizer=text),O/f'{task}_neural.joblib')
 row,b=sorted(rows,key=lambda a:(-a[0]['validation']['within_10pct'],a[0]['validation']['mean_bounded_relative_error'],a[0]['name']))[0]
 models[task]=b;selections[task]=row;candidates.extend(r for r,b in rows)
 joblib.dump(dict(model=b,encoder=enc,scaler=scale,vectorizer=text),O/f'{task}_selected.joblib')
save('validation_candidates.json',candidates);save('neural_learning_curves.json',curves)
save('frozen_selection.json',{'contract_sha256':sha(D/'contract.json'),'test_labels_opened':False,'selections':selections,'model_hashes':{p.name:sha(p) for p in O.glob('*selected.joblib')}})
pred={t:predict(b,F['test']) for t,b in models.items()}
lt=pd.read_csv(D/'test_labels.csv');assert lt.item_id.tolist()==F['test'].item_id.tolist()
results={};out=F['test'].copy();project_rows=[]
for task,p in pred.items():
 y=lt[task].to_numpy(float);out[task]=y;out[task+'_prediction']=p;out[task+'_baseline']=F['test'][models[task]['base']]
 results[task]={'selected':selections[task]['name'],'test':score(y,p),'baseline':score(y,out[task+'_baseline'])}
 for pid in C['test_projects']:
  mask=F['test'].project_id.eq(pid).to_numpy();m=score(y[mask],p[mask]);bm=score(y[mask],out.loc[mask,task+'_baseline']);total=A['per_project_counts'][pid]
  m.update(project_id=pid,task=task,all_audited_lines=total,eligible_coverage=m['n']/total,within_10pct_all_audited=m['within_10pct']*m['n']/total,baseline_within_10pct=bm['within_10pct'])
  if task=='actual_cost_aud':m['eligible_cost_total_relative_error']=float(abs(p[mask].sum()-y[mask].sum())/y[mask].sum()) if y[mask].sum() else None
  m['pass']=bool(m['within_10pct_all_audited']>=.9 and (task!='actual_cost_aud' or (m['eligible_cost_total_relative_error'] is not None and m['eligible_cost_total_relative_error']<=.1)))
  project_rows.append(m)
out.to_csv(O/'heldout_predictions.csv',index=False)
pd.DataFrame(project_rows).to_csv(O/'five_project_results.csv',index=False)
save('evaluation.json',{'tasks':results,'projects':project_rows,'full_engines_accepted':0,'overall_seven_engine_goal_met':False,'runtime_seconds':time.time()-start,'runtime':{'python':platform.python_version(),'sklearn':sklearn.__version__,'torch':torch.__version__,'training_location':'Kaggle CPU'},'script_sha256':sha(Path(__file__)),'limitations':C['limitations'],'scope':C['scope']})
save('artifact_manifest.json',{p.name:sha(p) for p in O.iterdir() if p.name!='artifact_manifest.json'})
with zipfile.ZipFile('/kaggle/working/ACEP_BOQ_v5b_results.zip','w',zipfile.ZIP_DEFLATED,6) as zz:
 for p in O.iterdir():zz.write(p,'results/'+p.name)
print('BOQ FINISHED',json.dumps(results),flush=True)
