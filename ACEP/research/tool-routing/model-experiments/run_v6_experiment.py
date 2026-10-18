"""Run a resumable v5/v6 development comparison and archive all evidence."""
from pathlib import Path
from collections import Counter
import hashlib
import json
import os
import subprocess
import sys
import time
import zipfile

ROOT = Path('/kaggle/working/acep-engineering-v1')
EXP = ROOT / 'v6_experiment'
EXP.mkdir(exist_ok=True)
STARTED = time.time()
PARENT_SHA = '19049cee53597001db1ab7784e181f57cf0940b918deb83dac85aef80b6ace6b'


def save(path, value):
    temp = path.with_suffix(path.suffix + '.partial')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2))
    temp.replace(path)


def status(stage, **extra):
    data = dict(stage=stage, started=STARTED, updated=time.time(),
                engineering_deployment_allowed=False, **extra)
    save(EXP/'status.json',data)
    print(json.dumps(data,ensure_ascii=False),flush=True)


def env(gpu):
    return dict(os.environ,CUDA_VISIBLE_DEVICES=str(gpu),TOKENIZERS_PARALLELISM='false',PYTHONUNBUFFERED='1')


def run(name, command, gpu):
    with (EXP/(name+'.log')).open('a') as stream:
        subprocess.run(command,check=True,env=env(gpu),stdout=stream,stderr=subprocess.STDOUT)


baseline = None
try:
    assert hashlib.sha256((ROOT/'qlora_tool_pilot_v5/adapter/adapter_model.safetensors').read_bytes()).hexdigest()==PARENT_SHA
    import torch
    assert torch.cuda.is_available()
    count=torch.cuda.device_count()
    status('preparing',gpu_count=count)
    subprocess.run([sys.executable,str(ROOT/'prepare_v6.py')],check=True)
    train=[sys.executable,'-u',str(ROOT/'train_tool_pilot_v6.py')]
    evaluation=[sys.executable,'-u',str(ROOT/'evaluate_v6_comparison.py')]
    if count >= 2:
        baseline_log=(EXP/'baseline_v5.log').open('a')
        baseline=subprocess.Popen(evaluation+['--label','v5'],env=env(1),stdout=baseline_log,stderr=subprocess.STDOUT)
        status('training_v6_with_parallel_v5_evaluation',training_gpu=0,baseline_gpu=1,baseline_pid=baseline.pid)
    else:
        status('baseline_v5_evaluation',gpu=0)
        run('baseline_v5',evaluation+['--label','v5'],0)
        status('training_v6',gpu=0)
    run('training_v6',train,0)
    status('evaluating_v6',gpu=0)
    if baseline is not None:
        code=baseline.wait()
        baseline_log.close()
        assert code==0, 'v5 baseline evaluation failed; inspect baseline_v5.log'
    run('evaluation_v6',evaluation+['--label','v6'],0)
    reports={}
    metadata={}
    rows={}
    for label in ['v5','v6']:
        folder=EXP/'evaluation'/label
        rows[label]=[json.loads(x) for x in (folder/'predictions.jsonl').read_text().splitlines()]
        assert len(rows[label])==120 and len({r['id'] for r in rows[label]})==120
        metadata[label]=json.loads((folder/'metadata.json').read_text())
        report=json.loads((folder/'report.json').read_text())
        reports[label]={
            'total':120,
            'exact':sum(r['exact'] for r in rows[label]),
            'contract_valid':sum(r['contract_valid'] for r in rows[label]),
            'calls_on_missing_input':sum(len(v['calls_on_missing_input']) for v in report['suites'].values()),
            'suites':{s:{k:v for k,v in result.items() if k!='failures'} for s,result in report['suites'].items()},
            'per_tool':{},
        }
        for tool in ['rectangular_volume','net_area','add_waste','line_cost']:
            selected=[r for r in rows[label] if r['family']==tool]
            reports[label]['per_tool'][tool]={'total':len(selected),'exact':sum(r['exact'] for r in selected)}
    assert metadata['v5']['prompt_sha256']==metadata['v6']['prompt_sha256']
    assert metadata['v5']['cases_sha256']==metadata['v6']['cases_sha256']
    v5,v6=reports['v5'],reports['v6']
    checks={
        'overall_exact_improved':v6['exact']>v5['exact'],
        'contracts_not_worse':v6['contract_valid']>=v5['contract_valid'],
        'missing_input_calls_not_worse':v6['calls_on_missing_input']<=v5['calls_on_missing_input'],
        'each_suite_not_worse':all(v6['suites'][s]['exact']>=v5['suites'][s]['exact'] for s in v5['suites']),
        'each_tool_not_worse':all(v6['per_tool'][t]['exact']>=v5['per_tool'][t]['exact'] for t in v5['per_tool']),
    }
    baseline_by_id={r['id']:r for r in rows['v5']}
    improvements=[r['id'] for r in rows['v6'] if r['exact'] and not baseline_by_id[r['id']]['exact']]
    regressions=[r['id'] for r in rows['v6'] if not r['exact'] and baseline_by_id[r['id']]['exact']]
    comparison=dict(scope='120 authored development extraction cases; not independent engineering accuracy',
                    models=reports,metadata=metadata,selection_checks=checks,
                    preferred_development_candidate='v6' if all(checks.values()) else 'v5_retained_pending_review',
                    improvements=improvements,regressions=regressions,
                    training_started=True,tools_executed=False,model_grounding_guard_applied=False,
                    independent_hard_test=False,platform_integration_tested=False,
                    engineering_deployment_allowed=False)
    save(EXP/'comparison_report.json',comparison)
    assert hashlib.sha256((ROOT/'qlora_tool_pilot_v5/adapter/adapter_model.safetensors').read_bytes()).hexdigest()==PARENT_SHA
    archive=ROOT.parent/'ACEP_tool_v6_experiment_complete.zip'
    folders=[ROOT/'qlora_tool_pilot_v6',ROOT/'tool_data_pilot_v6',EXP,ROOT/'qlora_tool_pilot_v5/adapter']
    paths=set()
    for folder in folders:
        for p in folder.rglob('*'):
            if p.is_file() and not any(x.startswith('checkpoint-') or x=='__pycache__' for x in p.relative_to(ROOT).parts):
                paths.add(p)
    for name in ['prepare_v6.py','run_v6_experiment.py','train_tool_pilot_v6.py','evaluate_v6_comparison.py','baseline_tool_config.json','tool_contract_gate_v1/contract_gate.py']:
        paths.add(ROOT/name)
    # Do not include active log/status files in a cryptographic archive manifest.
    paths={p for p in paths if p.name not in {'supervisor.log','status.json'} and not p.name.endswith('.partial')}
    hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    temp=archive.with_suffix('.zip.partial')
    with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED,compresslevel=1) as bundle:
        for p in sorted(paths):bundle.write(p,p.relative_to(ROOT))
        bundle.writestr('V6_BACKUP_MANIFEST.json',json.dumps(hashes,indent=2))
    with zipfile.ZipFile(temp) as bundle:
        assert bundle.testzip() is None
        for name,digest in hashes.items():assert hashlib.sha256(bundle.read(name)).hexdigest()==digest
    temp.replace(archive)
    status('completed',archive=str(archive),archive_bytes=archive.stat().st_size,backup_verified=True,
           preferred_development_candidate=comparison['preferred_development_candidate'],models=reports,
           improvements=improvements,regressions=regressions,v5_preserved=True)
except Exception as error:
    if baseline is not None and baseline.poll() is None:
        baseline.terminate()
    status('failed',error=repr(error))
    raise
