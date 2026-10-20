"""Secondary comparison of already-frozen models; never fits or selects models."""
from pathlib import Path
import hashlib,json,math
import numpy as np,pandas as pd
R=Path(__file__).resolve().parent
protocol=json.loads((R/'paired_comparison_protocol.json').read_text())
p=R/'v12_reference_predictions.csv'
assert hashlib.sha256(p.read_bytes()).hexdigest()==protocol['prediction_file_sha256']
old=pd.read_csv(p);new=pd.read_csv(R/'kaggle-output/test_predictions.csv')
f=new.merge(old,on='project_id',suffixes=('_v13','_v12'),validate='one_to_one')
assert len(f)==64
def metrics(pred):
 e=np.abs(pred-f.actual)/f.actual;n=len(e);k=int((e<=.1).sum());z=1.959963984540054;p=k/n;den=1+z*z/n
 center=(p+z*z/(2*n))/den;half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
 return {'n':n,'within10_count':k,'within10':p,'mape':float(e.mean()),'p95_ape':float(np.quantile(e,.95)),'max_ape':float(e.max()),'mae_usd':float(np.abs(pred-f.actual).mean()),'wilson_95_interval_within10':[center-half,center+half]}
result={'scope':'Secondary same-cohort comparison, not used for candidate selection','test_year':2025,'local_fits':0,'v12':metrics(f.prediction_v12),'v13':metrics(f.prediction_v13),'uncertainty_limit':'Wilson interval assumes independent Bernoulli observations; records share regions and some facility groups, so it is descriptive, not guaranteed population coverage.','causal_architecture_attribution':False}
(R/'paired_comparison.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
