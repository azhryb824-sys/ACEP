"""All model/preprocessor fitting is restricted to the Kaggle runtime."""
from pathlib import Path
import os
R=Path(__file__).resolve().parent
if not str(R).startswith('/kaggle/working/'):raise RuntimeError('Fitting is restricted to Kaggle')
os.environ['OMP_NUM_THREADS']='2';os.environ['MKL_NUM_THREADS']='2'
import numpy as np,pandas as pd,json,hashlib,time,math,platform
from sklearn.linear_model import Ridge,HuberRegressor
from sklearn.ensemble import ExtraTreesRegressor,GradientBoostingRegressor
import sklearn,torch
from model_runtime import NUM,CAT,raw_numeric,category_values,predict,metric
D=R/'data';O=R/'output';O.mkdir(exist_ok=True)
torch.set_num_threads(2);torch.use_deterministic_algorithms(True)
START=time.monotonic();EVENTS=[];FIT_COUNTS={'preprocessors':0,'sklearn':0,'neural':0,'medians':0};EXPORT_CHECKS=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,v):(O/n).write_text(json.dumps(v,indent=2,allow_nan=False)+'\n')
def event(stage,**values):
 x={'stage':stage,'elapsed_seconds':time.monotonic()-START,**values};EVENTS.append(x);print(json.dumps(x),flush=True)
def fit_preprocessor(frame,feature_style="full"):
 FIT_COUNTS['preprocessors']+=1;a=raw_numeric(frame,feature_style);median=np.nanmedian(np.where(np.isfinite(a),a,np.nan),axis=0);median=np.where(np.isfinite(median),median,0)
 a=np.where(np.isfinite(a),a,median);mean=a.mean(0);scale=a.std(0);scale=np.where(scale<1e-9,1,scale)
 return {'feature_style':feature_style,'median':median.tolist(),'mean':mean.tolist(),'scale':scale.tolist(),'categories':{k:sorted(set(category_values(frame,k))) for k in CAT}}
def stamp(d):return {'schema_version':1,'scope':'FDOE_reported_building_contract_cost','currency':'USD','area_unit':'ft2','accuracy_validated':False,'production_approved':False,**d}
def verify_export(frame,model,log_reference):
 reference=np.exp(np.clip(log_reference,-20,20))*frame.gross_ft2.to_numpy(float)
 actual=predict(frame,model);relative=float(np.max(np.abs(actual-reference)/reference))
 assert relative<5e-6,relative
 EXPORT_CHECKS.append(relative);return model
def packtree(t):
 a=t.tree_;return {'left':a.children_left.tolist(),'right':a.children_right.tolist(),'feature':a.feature.tolist(),'threshold':a.threshold.tolist(),'value':a.value[:,0,0].tolist()}
BASE=[{'name':'baseline_median','kind':'median'},{'name':'recent_median','kind':'median','recent':3},{'name':'scope_median','kind':'median','grouped':True}]
FAMILIES=[{'name':'ridge10','kind':'ridge','alpha':10},{'name':'ridge100','kind':'ridge','alpha':100},{'name':'forest5','kind':'forest','leaf':5},{'name':'forest15','kind':'forest','leaf':15},{'name':'boost_huber','kind':'boosting','loss':'huber','depth':2},{'name':'boost_absolute','kind':'boosting','loss':'absolute_error','depth':2},{'name':'neural32','kind':'neural','width':32,'updates':2000},{'name':'neural64','kind':'neural','width':64,'updates':2000}]
CONFIGS=BASE+[dict(c,name=f"{style}_{'ppi' if ppi else 'raw'}_{c['name']}",feature_style=style,ppi=ppi) for style in ['full','compact'] for ppi in [False,True] for c in FAMILIES]
assert len(CONFIGS)==35
def fit(frame,y,config):
 if config.get('ppi'):
  factor=frame.ppi_lag1.to_numpy(float);child=dict(config,ppi=False)
  assert np.all(np.isfinite(factor)&(factor>0))
  return stamp({'kind':'ppi_residual','index_series':'PCU236222236222','lag_years':1,'residual':fit(frame,np.asarray(y)/factor,child)})
 rate=np.asarray(y)/frame.gross_ft2.to_numpy(float);target=np.log(rate);kind=config['kind']
 if kind=='median':
  FIT_COUNTS['medians']+=1;mask=frame.year.ge(frame.year.max()-config.get('recent',100)+1).to_numpy();global_rate=float(np.median(rate[mask]));groups={}
  if config.get('grouped'):
   keys=category_values(frame,'school_type')+'|'+category_values(frame,'project_scope')
   for k in sorted(set(keys)):
    m=keys==k
    if m.sum()>=5:groups[k]=float(np.median(rate[m]))
  return stamp({'kind':'median','global_rate':global_rate,'groups':groups})
 prep=fit_preprocessor(frame,config.get("feature_style","full"))
 from model_runtime import transform
 x=transform(frame,prep)
 if kind in ['ridge','huber']:
  estimator=Ridge(alpha=config['alpha']) if kind=='ridge' else HuberRegressor(alpha=1,epsilon=1.35,max_iter=2000)
  estimator.fit(x,target);FIT_COUNTS['sklearn']+=1
  return verify_export(frame,stamp({'kind':'linear','preprocessing':prep,'coef':estimator.coef_.tolist(),'intercept':float(estimator.intercept_)}),estimator.predict(x))
 if kind=='forest':
  estimator=ExtraTreesRegressor(n_estimators=240,min_samples_leaf=config['leaf'],max_features=.8,random_state=82026,n_jobs=2).fit(x,target);FIT_COUNTS['sklearn']+=1
  return verify_export(frame,stamp({'kind':'forest','preprocessing':prep,'trees':[packtree(t) for t in estimator.estimators_]}),estimator.predict(x))
 if kind=='boosting':
  estimator=GradientBoostingRegressor(loss=config['loss'],n_estimators=150,learning_rate=.04,max_depth=config['depth'],min_samples_leaf=10,random_state=82026).fit(x,target);FIT_COUNTS['sklearn']+=1
  return verify_export(frame,stamp({'kind':'boosting','preprocessing':prep,'trees':[packtree(t[0]) for t in estimator.estimators_],'initial':float(estimator.init_.constant_[0,0]),'learning_rate':.04}),estimator.predict(x))
 origin=float(np.median(target));bound=math.log(4);networks=[];native_predictions=[]
 for seed in [82026,82027,82028]:
  torch.manual_seed(seed);width=config['width'];model=torch.nn.Sequential(torch.nn.Linear(x.shape[1],width),torch.nn.ReLU(),torch.nn.Linear(width,width//2),torch.nn.ReLU(),torch.nn.Linear(width//2,1))
  torch.nn.init.zeros_(model[-1].weight);torch.nn.init.zeros_(model[-1].bias)
  xx=torch.tensor(x,dtype=torch.float32);yy=torch.tensor(target,dtype=torch.float32);opt=torch.optim.AdamW(model.parameters(),lr=.002,weight_decay=.01)
  for step in range(config['updates']):
   opt.zero_grad();pred=origin+bound*torch.tanh(model(xx)[:,0]);loss=torch.nn.functional.smooth_l1_loss(pred,yy,beta=.15);loss.backward();torch.nn.utils.clip_grad_norm_(model.parameters(),5);opt.step()
  networks.append([{'weight':layer.weight.detach().numpy().tolist(),'bias':layer.bias.detach().numpy().tolist()} for layer in model if isinstance(layer,torch.nn.Linear)]);FIT_COUNTS['neural']+=1
  with torch.no_grad():native_predictions.append((origin+bound*torch.tanh(model(xx)[:,0])).numpy())
 return verify_export(frame,stamp({'kind':'neural_ensemble','preprocessing':prep,'origin':origin,'bound':bound,'networks':networks}),np.mean(native_predictions,axis=0))

manifest=json.loads((D/'manifest.json').read_text())
for n,h in manifest.items():assert sha(D/n)==h,n
contract=json.loads((D/'contract.json').read_text());folds=json.loads((D/'folds.json').read_text())
dev=pd.read_csv(D/'development_features.csv',dtype={'school_type':str});labels=pd.read_csv(D/'development_labels.csv').set_index('project_id')
assert list(labels.index)==dev.project_id.tolist();y=labels.loc[dev.project_id,'contract_cost'].to_numpy()
event('inputs_verified',files=len(manifest),development=len(dev),candidates=len(CONFIGS),previously_exposed_diagnostic_cohort=True)
validation=[];results=[]
for config in CONFIGS:
 current=[]
 for fi,fold in enumerate(folds):
  ti=np.flatnonzero(dev.project_id.isin(fold['train_ids']));vi=np.flatnonzero(dev.project_id.isin(fold['validation_ids']))
  assert not set(dev.iloc[ti].facility_group)&set(dev.iloc[vi].facility_group)
  model=fit(dev.iloc[ti],y[ti],config);pred=predict(dev.iloc[vi],model)
  for index,value in zip(vi,pred):current.append({'candidate':config['name'],'fold':fi,'project_id':dev.iloc[index].project_id,'actual':float(y[index]),'prediction':float(value)})
 validation.extend(current);m=metric([r['actual'] for r in current],[r['prediction'] for r in current]);results.append({'name':config['name'],'config':config,'metrics':m});event('candidate_complete',name=config['name'],within10=m['within10'],mape=m['mape'],p95=m['p95_ape'])
pd.DataFrame(validation).to_csv(O/'validation_predictions.csv',index=False,float_format='%.17g')
reference=results[0]['metrics']
for r in results:r['tail_eligible']=r['metrics']['mape']<=reference['mape']+1e-12 and r['metrics']['p95_ape']<=reference['p95_ape']+1e-12
selected=sorted([r for r in results if r['tail_eligible']],key=lambda r:(-r['metrics']['within10'],r['metrics']['mape'],r['name']))[0]
save('selection.json',{'candidates':results,'selected':selected['name'],'selection_uses_calibration_or_diagnostic_labels':False,'tail_constraint_reference':'baseline_median'});event('selection_frozen',selected=selected['name'],selection_sha256=sha(O/'selection.json'))
model=fit(dev,y,selected['config']);baseline=fit(dev,y,CONFIGS[0]);save('selected_model.json',model);save('baseline_model.json',baseline)
event('final_models_frozen',model_sha256=sha(O/'selected_model.json'),baseline_sha256=sha(O/'baseline_model.json'))
cal=pd.read_csv(D/'calibration_features.csv',dtype={'school_type':str});calpred=predict(cal,model);caly=pd.read_csv(D/'calibration_labels.csv');assert list(caly.project_id)==list(cal.project_id)
residual=np.abs(np.log(caly.contract_cost.to_numpy()/calpred));order=math.ceil((len(residual)+1)*.9);q=float(np.sort(residual)[order-1]);save('calibration.json',{'n':len(residual),'nominal_coverage':.9,'order_statistic':order,'absolute_log_residual_quantile':q,'exchangeability_guaranteed':False})
pd.DataFrame({'project_id':cal.project_id,'actual':caly.contract_cost,'prediction':calpred,'absolute_log_residual':residual}).to_csv(O/'calibration_predictions.csv',index=False,float_format='%.17g')
test=pd.read_csv(D/'test_features.csv',dtype={'school_type':str});original=pd.read_csv(D/'test_original_features.csv',dtype={'school_type':str});assert test.project_id.tolist()==original.project_id.tolist()
pred=predict(test,model);base=predict(test,baseline);old=predict(original,json.loads((D/'v13_model.json').read_text()));low=pred*np.exp(-q);high=pred*np.exp(q)
blind=pd.DataFrame({'project_id':test.project_id,'prediction':pred,'baseline_prediction':base,'v13_prediction':old,'lower':low,'upper':high});blind.to_csv(O/'frozen_diagnostic_predictions.csv',index=False,float_format='%.17g');event('diagnostic_predictions_frozen_before_current_run_label_loading',sha256=sha(O/'frozen_diagnostic_predictions.csv'))
testy=pd.read_csv(D/'test_labels.csv');assert list(testy.project_id)==list(test.project_id);event('diagnostic_labels_opened',count=len(testy),previously_exposed=True);actual=testy.contract_cost.to_numpy();m=metric(actual,pred);bm=metric(actual,base);om=metric(actual,old)
previous=pd.read_csv(D/'v13_test_predictions.csv');assert previous.project_id.tolist()==test.project_id.tolist();assert np.allclose(previous.prediction,old,rtol=1e-9,atol=1e-6);assert np.allclose(previous.actual,actual,rtol=0,atol=1e-7)
blind['actual']=actual;blind['absolute_percentage_error']=np.abs(pred-actual)/actual;blind['within10']=blind.absolute_percentage_error.le(.1);blind['interval_covers']=((actual>=low)&(actual<=high));blind.to_csv(O/'diagnostic_predictions.csv',index=False,float_format='%.17g')
five=blind.set_index('project_id').loc[contract['five_projects']].reset_index();five=five.merge(test[['project_id','facility','district','project_scope','school_type']],on='project_id',validate='one_to_one');five.to_csv(O/'five_projects.csv',index=False,float_format='%.17g')
gates={'within10_at_least_90pct':m['within10']>=.9,'all_five_within10':bool(five.within10.all()),'full_coverage':m['coverage']==1,'mape_no_worse_than_baseline':m['mape']<=bm['mape'],'p95_no_worse_than_baseline':m['p95_ape']<=bm['p95_ape']}
summary={'cycle':'ACEP v14','status':'completed','selected':selected['name'],'diagnostic':m,'baseline':bm,'v13_same_cohort':om,'five_passed':int(five.within10.sum()),'five_total':5,'numerical_diagnostic_gates':gates,'numerical_gates_passed':all(gates.values()),'independent_acceptance_established':False,'new_independent_test_records':0,'full_engine_accuracy_validated':False,'production_model_promoted':False,'seven_engine_90pct_established':False,'interval':{'nominal_coverage':.9,'diagnostic_coverage':float(blind.interval_covers.mean()),'covered':int(blind.interval_covers.sum()),'median_width_over_prediction':float(np.median((high-low)/pred)),'exchangeability_guaranteed':False},'fits':FIT_COUNTS,'export_checks':{'count':len(EXPORT_CHECKS),'max_relative_prediction_difference':max(EXPORT_CHECKS)},'runtime':{'python':platform.python_version(),'numpy':np.__version__,'sklearn':sklearn.__version__,'torch':torch.__version__},'seconds':time.monotonic()-START,'boundary':contract['scope']}
save('evaluation.json',summary);save('events.json',EVENTS);save('source_manifest.json',{p.name:sha(p) for p in R.glob('*.py')});save('input_manifest.json',manifest);save('output_manifest.json',{p.name:sha(p) for p in O.iterdir() if p.is_file() and p.name!='output_manifest.json'});print(json.dumps(summary,indent=2),flush=True)
