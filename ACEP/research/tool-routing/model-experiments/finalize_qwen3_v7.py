"""Keep measured regressions visible and archive independently after all workers."""
from pathlib import Path
import time,json,zipfile,hashlib
R=Path('/kaggle/working/acep-engineering-v1');O=R/'qwen3_v7_final';O.mkdir(exist_ok=True)
def save(n,d):(O/n).write_text(json.dumps(d,ensure_ascii=False,indent=2))
start=time.time()
try:
 save('status.json',dict(stage='waiting_for_comparisons',engineering_deployment_allowed=False))
 while not all((R/'qwen3_v7_evaluation'/n/'report.json').is_file() for n in ['base','v7','retained_v5']):
  p=R/'qwen3_v7_experiment/status.json'
  if p.exists() and json.loads(p.read_text())['stage']=='failed':raise RuntimeError('parent experiment failed')
  if time.time()-start>7200:raise TimeoutError('comparison workers')
  time.sleep(10)
 before=json.loads((R/'qwen3_v7_evaluation/retained_v5/report.json').read_text());after=json.loads((R/'qwen3_v7_evaluation/v7/report.json').read_text())
 failures=[]
 for group in ['per_tool','per_suite']:
  for k,b in before[group].items():
   a=after[group][k]
   for metric in ['exact','contract_valid']:
    if a[metric]<b[metric]:failures.append(dict(group=group,key=k,metric=metric,before=b[metric],after=a[metric]))
   for metric in ['calls_on_missing_input','incorrect_contract_valid_calls']:
    if len(a[metric])>len(b[metric]):failures.append(dict(group=group,key=k,metric=metric,before=len(b[metric]),after=len(a[metric])))
 choose=after['exact']>before['exact'] and not failures
 label='qwen3_v7' if choose else 'retained_v5'
 adapter=R/('qlora_qwen3_v7' if choose else 'qlora_tool_pilot_v5')/'adapter'
 prompt=R/('qwen3_v7_plan/system_prompt.txt' if choose else 'v6_experiment/selected_system_prompt.txt')
 descriptor=dict(label=label,adapter=str(adapter),adapter_sha256=hashlib.sha256((adapter/'adapter_model.safetensors').read_bytes()).hexdigest(),system_prompt=str(prompt),system_prompt_sha256=hashlib.sha256(prompt.read_bytes()).hexdigest(),precision='fp16' if choose else 'nf4',scope='research extraction candidate; not engineering deployment',engineering_deployment_allowed=False)
 save('selected_candidate.json',descriptor)
 save('selection_report.json',dict(selected=label,retained_v5=before,v7=after,regressions=failures,independent_hard_test=False,engineering_deployment_allowed=False))
 # Wait for the parent archive to close before saving its final status/logs.
 while json.loads((R/'qwen3_v7_experiment/status.json').read_text())['stage']!='completed':
  if time.time()-start>7200:raise TimeoutError('parent archive')
  time.sleep(5)
 roots=['qwen3_v7_plan','tool_data_qwen3_v7','qlora_qwen3_v7/adapter','qlora_tool_pilot_v5/adapter','qwen3_v7_evaluation','qwen3_v7_experiment','qwen3_v7_final','qwen3_base_comparison','tool_contract_gate_v1','tool_data_pilot_v6','v6_frozen_probe','v6_experiment']
 paths={p for folder in roots for p in (R/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ['.zip','.partial']}
 paths.update(p for p in R.glob('*.py') if 'qwen3' in p.name or p.name=='predict_selected.py')
 paths.add(R/'baseline_tool_config.json')
 manifest={str(p.relative_to(R)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}
 archive=Path('/kaggle/working/ACEP_Qwen3_v7_verified_complete.zip')
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted(paths):z.write(p,str(p.relative_to(R)))
  z.writestr('BACKUP_MANIFEST.json',json.dumps(manifest,indent=2))
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None
  for n,h in manifest.items():assert hashlib.sha256(z.read(n)).hexdigest()==h
 save('status.json',dict(stage='completed',selected=label,archive=str(archive),bytes=archive.stat().st_size,archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),backup_verified=True,engineering_deployment_allowed=False))
except BaseException as e:save('status.json',dict(stage='failed',error=repr(e)));raise
