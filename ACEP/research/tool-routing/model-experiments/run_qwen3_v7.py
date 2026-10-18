"""Bounded base/LoRA experiment, resumable training, automatic evidence archive."""
from pathlib import Path
import subprocess,sys,os,time,json,hashlib,zipfile
R=Path('/kaggle/working/acep-engineering-v1');O=R/'qwen3_v7_experiment';O.mkdir(exist_ok=True)
def status(stage,**extra):
 d=dict(stage=stage,updated=time.time(),engineering_deployment_allowed=False,**extra);p=O/'status.partial';p.write_text(json.dumps(d,indent=2));p.replace(O/'status.json');print(json.dumps(d),flush=True)
def env(gpu):return dict(os.environ,CUDA_VISIBLE_DEVICES=str(gpu),TOKENIZERS_PARALLELISM='false')
def run(script,args,gpu,name):
 with (O/(name+'.log')).open('a') as f:subprocess.run([sys.executable,'-u',str(R/script)]+args,env=env(gpu),stdout=f,stderr=subprocess.STDOUT,check=True)
try:
 status('preparing')
 run('prepare_qwen3_v7.py',[],0,'prepare')
 baseline_log=(O/'baseline.log').open('a')
 baseline=subprocess.Popen([sys.executable,'-u',str(R/'evaluate_qwen3_v7.py'),'--label','base'],env=env(0),stdout=baseline_log,stderr=subprocess.STDOUT)
 status('training_with_parallel_base_evaluation',baseline_pid=baseline.pid,training_gpu=1,baseline_gpu=0)
 run('train_qwen3_v7.py',[],1,'train')
 status('evaluating_trained_adapter')
 run('evaluate_qwen3_v7.py',['--label','v7'],1,'evaluation')
 assert baseline.wait()==0
 before=json.loads((R/'qwen3_v7_evaluation/base/report.json').read_text());after=json.loads((R/'qwen3_v7_evaluation/v7/report.json').read_text())
 # Promotion to production is never inferred from authored development accuracy.
 report=dict(base=before,v7=after,training=json.loads((R/'qlora_qwen3_v7/completed.json').read_text()),selection='research_candidate_pending_comparison_to_retained_v5',independent_hard_test=False,engineering_deployment_allowed=False)
 (O/'comparison.json').write_text(json.dumps(report,indent=2))
 paths=[]
 for folder in ['qwen3_v7_plan','tool_data_qwen3_v7','qlora_qwen3_v7/adapter','qwen3_v7_evaluation','qwen3_v7_experiment']:
  paths.extend(p for p in (R/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
 paths +=[R/n for n in ['prepare_qwen3_v7.py','train_qwen3_v7.py','evaluate_qwen3_v7.py','run_qwen3_v7.py']]
 manifest={str(p.relative_to(R)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
 archive=Path('/kaggle/working/ACEP_Qwen3_v7_research_complete.zip')
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
  for p in paths:z.write(p,str(p.relative_to(R)))
  z.writestr('BACKUP_MANIFEST.json',json.dumps(manifest,indent=2))
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None
  for n,h in manifest.items():assert hashlib.sha256(z.read(n)).hexdigest()==h
 status('completed',base_exact=before['exact'],v7_exact=after['exact'],total=240,archive=str(archive),archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),backup_verified=True)
except BaseException as e:status('failed',error=repr(e));raise
