"""Pure NumPy inference for ACEP research snapshots. Contains no fitting."""
import numpy as np
NUM=['year','gross_ft2','net_ft2','students','teachers','classes_k5','classes_68','classes_912']
CAT=['school_type','project_scope','district']
def raw_numeric(frame,style="full"):
 if style=="physical":
  gross=frame.gross_ft2.to_numpy(float);net=frame.net_ft2.to_numpy(float);students=frame.students.to_numpy(float)
  return np.column_stack([(frame.year.to_numpy(float)-2010)/10,np.log1p(gross),np.log1p(net),np.log(net/gross),np.log1p(students),np.log1p(net/(students+1)),(students==0).astype(float)])
 a=frame[NUM].to_numpy(dtype=float);a[:,0]=(a[:,0]-2010)/10
 a[:,2]=a[:,2]/a[:,1]
 for i in [1,3,4,5,6,7]:a[:,i]=np.log1p(a[:,i])
 return a[:,:3] if style=="compact" else a
def category_values(frame,k):return frame[k].fillna('__MISSING__').astype(str).to_numpy()
def transform(frame,prep):
 a=raw_numeric(frame,prep.get("feature_style","full"));missing=~np.isfinite(a);a=np.where(missing,np.asarray(prep['median']),a)
 x=[(a-np.asarray(prep['mean']))/np.asarray(prep['scale']),missing.astype(float)]
 for k in CAT:
  c=category_values(frame,k);x.append(np.column_stack([c==v for v in prep['categories'][k]]).astype(float))
 return np.concatenate(x,axis=1)
def tree_value(x,t):
 left=np.asarray(t['left']);right=np.asarray(t['right']);feature=np.asarray(t['feature']);threshold=np.asarray(t['threshold']);value=np.asarray(t['value'])
 node=np.zeros(len(x),dtype=int)
 for _ in range(len(left)):
  active=left[node]>=0
  if not active.any():break
  ix=np.flatnonzero(active);n=node[ix];node[ix]=np.where(x[ix,feature[n]]<=threshold[n],left[n],right[n])
 return value[node]
def predict_rate(frame,model):
 kind=model['kind']
 if kind=='ppi_residual':
  factor=frame.ppi_lag1.to_numpy(float)
  if not np.all(np.isfinite(factor)&(factor>0)):raise ValueError('Invalid external price index')
  return predict_rate(frame,model['residual'])*factor
 if kind=='trend_residual':
  factor=np.exp(np.clip(model['slope']*(frame.year.to_numpy(float)-model['origin_year']),-2,2))
  return predict_rate(frame,model['residual'])*factor
 if kind=='geometric_ensemble':
  return np.exp(np.mean([np.log(predict_rate(frame,m)) for m in model['members']],axis=0))
 if kind=='median':
  rate=np.full(len(frame),model['global_rate'])
  if model.get('groups'):
   for i,(typ,scope) in enumerate(zip(category_values(frame,'school_type'),category_values(frame,'project_scope'))):rate[i]=model['groups'].get(typ+'|'+scope,model['global_rate'])
  return rate
 x=transform(frame,model['preprocessing'])
 if kind=='linear':v=x@np.asarray(model['coef'])+model['intercept']
 elif kind=='forest':v=np.mean([tree_value(x,t) for t in model['trees']],axis=0)
 elif kind=='boosting':v=model['initial']+model['learning_rate']*np.sum([tree_value(x,t) for t in model['trees']],axis=0)
 elif kind=='neural_ensemble':
  values=[]
  for net in model['networks']:
   h=x
   for i,layer in enumerate(net):
    h=h@np.asarray(layer['weight']).T+np.asarray(layer['bias'])
    if i<len(net)-1:h=np.maximum(h,0)
   values.append(model['origin']+model['bound']*np.tanh(h[:,0]))
  v=np.mean(values,axis=0)
 else:raise ValueError('Unsupported model kind')
 return np.exp(np.clip(v,-20,20))
def output_scale(frame,model):
 basis=model.get('output_basis','gross')
 if basis not in ['gross','net','total']:raise ValueError('Unknown output basis')
 if basis=='total':return np.ones(len(frame))
 a=frame[basis+'_ft2'].to_numpy(float)
 if basis=='net':
  bad=~np.isfinite(a)|(a<=0)
  if bad.any():
   ratio=model.get('area_fallback_ratio')
   if ratio is None or not np.isfinite(ratio) or ratio<=0:raise ValueError('Missing training-only net area fallback')
   a=np.where(bad,frame.gross_ft2.to_numpy(float)*ratio,a)
 if not np.all(np.isfinite(a)&(a>0)):raise ValueError('Invalid area scale')
 return a
def predict(frame,model):
 if model['schema_version']!=1 or model['scope']!='FDOE_reported_building_contract_cost' or model['currency']!='USD' or model['area_unit']!='ft2':raise ValueError('Incompatible research model')
 a=output_scale(frame,model)
 return predict_rate(frame,model)*a
def metric(actual,prediction):
 y=np.asarray(actual,float);p=np.asarray(prediction,float)
 if y.shape!=p.shape or not np.all(np.isfinite(y)&(y>0)):raise ValueError('Invalid target alignment')
 good=np.isfinite(p)&(p>0);error=np.where(good,np.abs(p-y)/y,np.inf)
 return {'count':len(y),'covered':int(good.sum()),'coverage':float(good.mean()),'within10_count':int((error<=.1).sum()),'within10':float((error<=.1).mean()),'mape':float(error.mean()),'median_ape':float(np.median(error)),'p95_ape':float(np.quantile(error,.95)),'max_ape':float(error.max()),'mae':float(np.mean(np.where(good,np.abs(p-y),np.inf)))}


def tail_metric(actual,prediction):
 m=metric(actual,prediction);e=np.abs(np.asarray(prediction,float)-np.asarray(actual,float))/np.asarray(actual,float)
 m['cvar90_ape']=float(np.sort(e)[-max(1,int(np.ceil(.1*len(e)))):].mean())
 m['over100_count']=int((e>1).sum())
 return m

def review_reasons(frame,support):
 values={'gross':frame.gross_ft2.to_numpy(float),'net':frame.net_ft2.to_numpy(float),'ratio':frame.net_ft2.to_numpy(float)/frame.gross_ft2.to_numpy(float)}
 result=[[] for _ in range(len(frame))]
 for name,a in values.items():
  lo,hi=support[name]
  for i in np.flatnonzero(~np.isfinite(a)|(a<=0)):result[i].append(name+'_missing_or_invalid')
  for i in np.flatnonzero(np.isfinite(a)&((a<lo)|(a>hi))):result[i].append(name+'_outside_training_1_99_percentile')
 for i,row in enumerate(frame.to_dict('records')):
  if row['project_scope']=='unverified':result[i].append('scope_unverified')
  if row['students']>0 and any(row[k]>row['students']/2 for k in ['classes_k5','classes_68','classes_912']):result[i].append('suspect_classroom_count')
 return result
