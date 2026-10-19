"""All candidate fitting, threshold selection and held-out scoring run on Kaggle only."""
from pathlib import Path
import os,sys,json,hashlib,time,zipfile,platform,copy,warnings
assert Path('/kaggle/working').exists(), 'Training must run on Kaggle'
for k in ['OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS']:os.environ[k]='4'
import numpy as np,pandas as pd,sklearn,joblib
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder,StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier,ExtraTreesClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score,balanced_accuracy_score,recall_score,brier_score_loss,roc_auc_score,confusion_matrix
from threadpoolctl import threadpool_limits
warnings.filterwarnings('ignore',category=UserWarning,module='sklearn')
threadpool_limits(4);ROOT=Path(sys.argv[1]);D=ROOT/'data';O=ROOT/'results';O.mkdir(exist_ok=True);started=time.time()
def save(name,obj): (O/name).write_text(json.dumps(obj,indent=2,allow_nan=False)+'\n')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((D/'manifest.json').read_text())
for name,h in manifest.items():assert digest(D/name)==h,name
contract=json.loads((D/'contract.json').read_text());audit=json.loads((D/'audit.json').read_text());features=audit['model_features']
seed=contract['seed'];np.random.seed(seed)
def read_features(split):return pd.read_csv(D/f'{split}_features.csv.gz',keep_default_na=False)
def read_labels(split,x):
 y=pd.read_csv(D/f'{split}_labels.csv.gz');assert np.array_equal(x.event_id,y.event_id);return y.y.to_numpy(dtype=np.int8)
train=read_features('train');val=read_features('validation');y=read_labels('train',train);yv=read_labels('validation',val)
assert not set(train.site)&set(val.site)
cat=['inspection'];num=[x for x in features if x not in cat]
pre=ColumnTransformer([('type',OneHotEncoder(handle_unknown='infrequent_if_exist',min_frequency=100,sparse_output=False,dtype=np.float32),cat),('numeric',StandardScaler(),num)],sparse_threshold=0)
X=pre.fit_transform(train[features]).astype('float32');V=pre.transform(val[features]).astype('float32')
print('TRAIN',len(y),'VALIDATION',len(yv),'FEATURES',X.shape[1],flush=True)
thresholds=np.round(np.arange(.10,.9001,.025),3)
def metrics(y,p,t):
 pred=(p>=t).astype('int8');both=len(np.unique(y))==2
 tn,fp,fn,tp=confusion_matrix(y,pred,labels=[0,1]).ravel()
 return dict(n=len(y),approvals=int((y==0).sum()),corrections=int((y==1).sum()),accuracy=float(accuracy_score(y,pred)),balanced_accuracy=float(balanced_accuracy_score(y,pred)) if both else None,correction_recall=float(tp/(tp+fn)) if tp+fn else None,approval_recall=float(tn/(tn+fp)) if tn+fp else None,brier=float(brier_score_loss(y,p)),roc_auc=float(roc_auc_score(y,p)) if both else None,confusion={'tn':int(tn),'fp':int(fp),'fn':int(fn),'tp':int(tp)},coverage=1.0)
def choose_threshold(yy,p):
 scores=[(float(balanced_accuracy_score(yy,p>=t)),-abs(float(t)-.5),float(t)) for t in thresholds]
 return max(scores)[2]
reports=[];best=None;selected=None;selected_threshold=None;selected_name=None;neural_curve=[]
def consider(name,model,p,extra=None,fixed=None):
 global best,selected,selected_threshold,selected_name
 t=float(fixed) if fixed is not None else choose_threshold(yv,p);m=metrics(yv,p,t)
 record=dict(candidate=name,threshold=t,validation=m,**(extra or {}));reports.append(record)
 rank=(m['balanced_accuracy'],-m['brier'])
 if best is None or rank>best:best=rank;selected=copy.deepcopy(model);selected_threshold=t;selected_name=name
 print('CANDIDATE',json.dumps(record),flush=True)
consider('always_approved',{'constant':0.0},np.zeros(len(yv)),fixed=.5)
consider('train_prevalence',{'constant':float(y.mean())},np.full(len(yv),y.mean()),fixed=.5)
candidates=[
 ('logistic_C0.1',LogisticRegression(C=.1,class_weight='balanced',max_iter=300,random_state=seed)),
 ('logistic_C1',LogisticRegression(C=1,class_weight='balanced',max_iter=300,random_state=seed)),
 ('hist_gradient_31',HistGradientBoostingClassifier(max_iter=250,max_leaf_nodes=31,learning_rate=.07,l2_regularization=10,min_samples_leaf=50,early_stopping=False,class_weight='balanced',random_state=seed)),
 ('hist_gradient_63',HistGradientBoostingClassifier(max_iter=250,max_leaf_nodes=63,learning_rate=.05,l2_regularization=20,min_samples_leaf=70,early_stopping=False,class_weight='balanced',random_state=seed)),
 ('extra_trees_160',ExtraTreesClassifier(n_estimators=160,max_depth=16,min_samples_leaf=30,max_features=.8,class_weight='balanced',n_jobs=4,random_state=seed))]
for name,model in candidates:
 t0=time.time();model.fit(X,y);p=model.predict_proba(V)[:,1];consider(name,model,p,{'fit_seconds':time.time()-t0});del model
# Fixed maximum 30 epochs, select checkpoint by independent validation; no randomized validation rows.
model=MLPClassifier(hidden_layer_sizes=(64,32),activation='relu',alpha=.01,batch_size=1024,learning_rate_init=.001,max_iter=1,random_state=seed,shuffle=True,early_stopping=False)
nbest=None;chosen_neural=None;neural_prob=None;chosen_epoch=None;t0=time.time()
for epoch in range(1,31):
 model.partial_fit(X,y,classes=np.array([0,1]))
 if epoch%5==0:
  p=model.predict_proba(V)[:,1];t=choose_threshold(yv,p);m=metrics(yv,p,t);rank=(m['balanced_accuracy'],-m['brier']);neural_curve.append(dict(epoch=epoch,loss=float(model.loss_),threshold=t,validation=m))
  print('NEURAL_EPOCH',epoch,'balanced_accuracy',m['balanced_accuracy'],flush=True)
  if nbest is None or rank>nbest:nbest=rank;chosen_neural=copy.deepcopy(model);neural_prob=p.copy();chosen_epoch=epoch
joblib.dump({'preprocessor':pre,'model':chosen_neural,'features':features,'selected_epoch':chosen_epoch},O/'neural_inspection_model.joblib',compress=3)
consider('neural_mlp_64_32',chosen_neural,neural_prob,{'fit_seconds':time.time()-t0,'selected_epoch':chosen_epoch,'parameter_count':int(sum(a.size for a in model.coefs_)+sum(a.size for a in model.intercepts_))})
save('validation_candidates.json',reports);save('neural_learning_curve.json',neural_curve)
joblib.dump({'preprocessor':pre,'model':selected,'threshold':selected_threshold,'features':features,'candidate':selected_name},O/'selected_inspection_model.joblib',compress=3)
frozen={'candidate':selected_name,'threshold':selected_threshold,'model_sha256':digest(O/'selected_inspection_model.joblib'),'contract_sha256':digest(D/'contract.json'),'training_script_sha256':digest(ROOT/'train_kaggle.py'),'selected_without_test_labels':True,'fit_platform':'Kaggle','runtime':{'python':platform.python_version(),'sklearn':sklearn.__version__},'selected_validation':next(r for r in reports if r['candidate']==selected_name)}
save('frozen_selection.json',frozen)
print('FROZEN_SELECTION',json.dumps(frozen),flush=True)
# Only now load held-out features and labels. A failure does not trigger re-fitting or reselection.
test=read_features('test');yt=read_labels('test',test)
assert not(set(train.site)&set(test.site) or set(val.site)&set(test.site));assert train.date.max()<val.date.min()<test.date.min()
if isinstance(selected,dict):p=np.full(len(test),selected['constant'])
else:
 p=np.concatenate([selected.predict_proba(pre.transform(test.iloc[i:i+25000][features]).astype('float32'))[:,1] for i in range(0,len(test),25000)])
overall=metrics(yt,p,selected_threshold);baseline=metrics(yt,np.zeros(len(yt)),.5)
rows=[]
for s in contract['five_sites']:
 mask=(test.site==s).to_numpy();m=metrics(yt[mask],p[mask],selected_threshold)
 m.update(site=s,passes=bool(m['accuracy']>=.9 and m['balanced_accuracy'] is not None and m['balanced_accuracy']>=.9 and m['approvals']>=5 and m['corrections']>=5),baseline_accuracy=float(np.mean(yt[mask]==0)))
 rows.append(m)
pred=test[['event_id','site','permit_id','date','inspection']].copy();pred['actual']=yt;pred['correction_probability']=p;pred['prediction']=(p>=selected_threshold).astype(int);pred['five_site_acceptance']=pred.site.isin(contract['five_sites'])
pred.to_csv(O/'heldout_predictions.csv.gz',index=False,compression={'method':'gzip','mtime':0})
eval={'scope':contract['scope'],'overall_2024':overall,'always_approved_baseline':baseline,'five_sites':rows,'five_sites_passed':sum(x['passes'] for x in rows),'all_five_passed':all(x['passes'] for x in rows),'full_engines_validated':0,'engine_promotion':False,'deployment':False,'training_seconds':time.time()-started,'limitations':['USA administrative inspection outcomes; no Saudi transfer validation.','Site groups from exact normalized public addresses; aliases and contract boundaries unknown.','Filtered daily Approved/Corrections outcomes only; not all inspection statuses.','Previous dates outcomes are known forecast inputs; predictions are conditional, not cold-start.','No images, defect severity, quantities, costs, resources, supplier delivery or physical ground truth.','Thresholds optimize balanced accuracy; probability calibration is not certified.']}
save('evaluation.json',eval);save('five_site_results.json',rows)
# Small validation fixture proves output artifact inference on unseen validation examples.
fixture=val.iloc[:5];fixture_p=np.full(5,selected['constant']) if isinstance(selected,dict) else selected.predict_proba(pre.transform(fixture[features]).astype('float32'))[:,1]
save('inference_fixture.json',{'rows':fixture[features].to_dict('records'),'expected_probabilities':fixture_p.tolist(),'tolerance':1e-7})
save('artifact_manifest.json',{f.name:digest(f) for f in sorted(O.iterdir()) if f.name!='artifact_manifest.json'})
archive=Path('/kaggle/working/ACEP_Inspection_v4_results.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,6) as z:
 for f in sorted(O.iterdir()):z.write(f,'results/'+f.name)
print('FINAL',json.dumps(eval),flush=True);print('RESULT_ARCHIVE',str(archive),archive.stat().st_size,flush=True)
