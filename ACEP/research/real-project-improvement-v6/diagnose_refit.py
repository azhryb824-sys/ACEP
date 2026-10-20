"""Posthoc inference-only diagnosis. This does not replace the frozen primary test."""
from pathlib import Path
import json,warnings,joblib,pandas as pd
from verify_results import metric,predict,sha
R=Path(__file__).resolve().parent;D=R/'data';O=R/'kaggle-output/results'
manifest=json.loads((O/'artifact_manifest.json').read_text())
rows=[]
for task,label in [('cost','actual_cost_usd'),('duration','actual_days_used'),('risk','cost_overrun_gt_10pct')]:
 selected=json.loads((O/'frozen_selection.json').read_text())['selections'][task]
 for variant,suffix in [('retained_validation_checkpoint','best_validation_neural'),('final_refit','selected_model')]:
  p=O/f'{task}_{suffix}.joblib';assert sha(p)==manifest[p.name]
  with warnings.catch_warnings():warnings.simplefilter('ignore');b=joblib.load(p)
  for split in ['validation','test']:
   f=pd.read_csv(D/f'{split}_features.csv',dtype={'district':str,'project_family':str});l=pd.read_csv(D/f'{split}_labels.csv');yp=predict(b,f)
   rows.append(dict(task=task,variant=variant,split=split,independent=(split=='test' or variant=='retained_validation_checkpoint'),metrics=metric(l[label].to_numpy(),yp,task,selected['threshold'] or .5)))
out=dict(status='POSTHOC_DIAGNOSTIC_ONLY',acceptance_replacement_allowed=False,fitting_performed=False,note='The original v6 primary result is the final-refit model. Retained pre-refit checkpoints are evaluated after seeing that result, to diagnose refit instability. They are not newly selected or promoted using test results. Refit validation rows are in-sample.',results=rows)
(R/'refit_diagnostics.json').write_text(json.dumps(out,indent=2,default=lambda x:x.item())+'\n')
for r in rows:
 m=r['metrics'];print(r['task'],r['variant'],r['split'],m.get('within_10pct',m.get('balanced_accuracy')),m.get('MAPE'))
