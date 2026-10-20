from pathlib import Path
import json,subprocess,sys,os,time,hashlib
R=Path('/kaggle/working/acep-engineering-v1');D=R/'v9_site'
# Fixed policy before candidate training/evaluation; no automatic deployment.
policy=dict(version='v9_site_research',development_must_not_regress=True,regression_exact_at_least=346,incorrect_contract_valid_calls_allowed=0,calls_on_missing_allowed=0,frozen_not_for_selection=True,default_remains='v7',engineering_deployment_allowed=False)
p=D/'evaluation_policy.json'
if p.exists():assert json.loads(p.read_text())==policy
else:p.write_text(json.dumps(policy,indent=2))
train_log=D/'training.log';done=R/'qlora_site_v9/completed.json'
while not done.exists():
 if train_log.exists() and any(x in train_log.read_text()[-10000:] for x in ['Traceback (most recent call last)','CUDA out of memory']):raise RuntimeError('training failed; inspect training.log')
 time.sleep(15)
# New and legacy checks run on separate GPUs, same frozen inference configuration.
def launch(adapter,suite,gpu,shard=None):
 args=[sys.executable,'-u',str(R/'evaluate_site_v9.py'),'--adapter',adapter,'--suite',suite]
 if shard is not None:args+=['--shard',str(shard)]
 f=(D/(adapter+'_'+suite+('_'+str(shard) if shard is not None else '')+'.log')).open('a')
 p=subprocess.Popen(args,stdout=f,stderr=subprocess.STDOUT,env=dict(os.environ,CUDA_VISIBLE_DEVICES=str(gpu)));f.close();return p
# 348 regression generation sharded across both GPUs. Fresh cases afterwards.
ps=[launch('v9','regression',i,i) for i in [0,1]]
for p in ps:assert p.wait()==0
rs=[]
for i in [0,1]:rs +=[json.loads(x) for x in (D/('v9_regression_shard'+str(i))/'predictions.jsonl').read_text().splitlines()]
assert len(rs)==348 and len({r['id'] for r in rs})==348
(D/'v9_regression_merged.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rs))
def counts(rows):return dict(total=len(rows),exact=sum(r['exact'] for r in rows),contract_valid=sum(r['contract_valid'] for r in rows),incorrect_contract_valid_calls=[r['id'] for r in rows if not r['exact'] and r['contract_valid'] and isinstance(r['prediction'],dict) and r['prediction'].get('action')=='call'],calls_on_missing=[r['id'] for r in rows if r['target']['action']=='clarify' and isinstance(r['prediction'],dict) and r['prediction'].get('action')=='call'])
reg=counts(rs)
assert launch('v9','development',0).wait()==0
assert launch('v9','published',1).wait()==0
dev=json.loads((D/'v9_development/report.json').read_text());baseline=json.loads((D/'v8_development/report.json').read_text())
eligible=dev['exact']>=baseline['exact'] and reg['exact']>=346 and not reg['incorrect_contract_valid_calls'] and not reg['calls_on_missing'] and not dev['incorrect_contract_valid_calls'] and not dev['calls_on_missing']
decision=dict(policy=policy,development_before={k:baseline[k] for k in ['total','exact','incorrect_contract_valid_calls','calls_on_missing']},development_after={k:dev[k] for k in ['total','exact','incorrect_contract_valid_calls','calls_on_missing']},regression=reg,research_candidate_passed_selection=eligible,selected_general_model='v7',reason='candidate must remain research; no actual-project or expert review',frozen_test_used_for_selection=False)
(D/'selection_before_frozen.json').write_text(json.dumps(decision,indent=2));print('SELECTION_FROZEN',json.dumps(decision),flush=True)
ps=[launch('v9','frozen',0),launch('v8','frozen',1)]
for p in ps:assert p.wait()==0
(D/'pipeline_completed.json').write_text(json.dumps(dict(completed=True,selection=decision,adapter_sha256=hashlib.sha256((R/'qlora_site_v9/adapter/adapter_model.safetensors').read_bytes()).hexdigest()),indent=2));print('PIPELINE_COMPLETED',flush=True)
