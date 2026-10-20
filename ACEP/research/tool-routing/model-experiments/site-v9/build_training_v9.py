from pathlib import Path
import json,hashlib,subprocess,sys,os
R=Path('/kaggle/working/acep-engineering-v1');D=R/'v9_site'
assert (D/'v8_development/report.json').exists(),'baseline must complete first'
assert (D/'v8_published/report.json').exists(),'published example baseline must complete first'
# Verify all remediation targets against the contract, and keep frozen/legacy text outside training.
import importlib.util
spec=importlib.util.spec_from_file_location('v9_gate_preflight',R/'v8_units/contract_v2/contract_gate.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);gate=mod.gate
train=[json.loads(x) for x in (D/'training.jsonl').read_text().splitlines()]
val=[json.loads(x) for x in (D/'validation.jsonl').read_text().splitlines()]
assert len(train)==640 and len(val)==16
held=[]
for p in [D/'development_cases.jsonl',D/'frozen_cases.jsonl',D/'published_cases.jsonl',R/'v8_units/v8_evaluation348/predictions.jsonl']:
 held +=[json.loads(x)['instruction'] for x in p.read_text().splitlines()]
norm=lambda s:' '.join(s.casefold().split())
assert not {norm(r['instruction']) for r in train+val}&{norm(x) for x in held}
assert not {norm(r['instruction']) for r in train}&{norm(r['instruction']) for r in val}
for r in train+val:assert gate(json.loads(r['output']))['status']!='blocked',r['id']
parent=R/'qlora_units_v8/adapter/adapter_model.safetensors'
assert hashlib.sha256(parent.read_bytes()).hexdigest()=='82c96b3399c105e3df3aa285e4b24da45fcc693b10cbdaddcc4952ad04e09944'
# Strict bounded one-epoch research run, with unchanged prompt and retained replay.
s=(R/'train_units_v8.py').read_text()
s=s.replace("O=R/'qlora_units_v8'","O=R/'qlora_site_v9'")
s=s.replace("R/'tool_data_units_v8'/name","R/'v9_site'/name")
s=s.replace("R/'qlora_qwen3_v7/adapter'","R/'qlora_units_v8/adapter'")
s=s.replace('set_seed(8301)','set_seed(9301)').replace('seed=8301','seed=9301')
s=s.replace('learning_rate=2e-5','learning_rate=1e-5').replace('eval_steps=28','eval_steps=24').replace('save_steps=28','save_steps=24')
s=s.replace('TRAINING_V7','TRAINING_V9').replace('V7_COMPLETED','V9_COMPLETED')
compile(s,'train_site_v9.py','exec');(R/'train_site_v9.py').write_text(s)
policy=dict(parent_adapter_sha256=hashlib.sha256(parent.read_bytes()).hexdigest(),training_sha256=hashlib.sha256((D/'training.jsonl').read_bytes()).hexdigest(),validation_sha256=hashlib.sha256((D/'validation.jsonl').read_bytes()).hexdigest(),frozen_sha256=hashlib.sha256((D/'frozen_cases.jsonl').read_bytes()).hexdigest(),epochs=1,learning_rate=1e-5,seed=9301,promotion='v7 remains default; v9 research only unless separately reviewed',frozen_used_for_training=False,engineering_deployment_allowed=False)
(D/'training_policy.json').write_text(json.dumps(policy,indent=2));print('PREFLIGHT_PASS',json.dumps(policy),flush=True)
f=(D/'training.log').open('a');p=subprocess.Popen([sys.executable,'-u',str(R/'train_site_v9.py')],stdout=f,stderr=subprocess.STDOUT,env=dict(os.environ,CUDA_VISIBLE_DEVICES='0',TOKENIZERS_PARALLELISM='false'));f.close();print('TRAIN_PID',p.pid)
