"""Test the selected configuration once on frozen fresh authored requests."""
from pathlib import Path
from decimal import Decimal
import ast
import hashlib
import json
import os
import subprocess
import sys
import time
import zipfile

ROOT=Path('/kaggle/working/acep-engineering-v1')
OUT=ROOT/'v6_frozen_probe'
OUT.mkdir(exist_ok=True)
started=time.time()

def status(stage,**extra):
    data=dict(stage=stage,updated=time.time(),training_started=False,**extra)
    p=OUT/'status.partial'
    p.write_text(json.dumps(data,indent=2))
    p.replace(OUT/'status.json')
    print(json.dumps(data),flush=True)

try:
    status('waiting_for_frozen_selection')
    while True:
        p=ROOT/'v6_packaging/status.json'
        state=json.loads(p.read_text())['stage'] if p.exists() else 'pending'
        if state=='failed':raise RuntimeError('Final selection/backup failed')
        if state=='completed':break
        if time.time()-started>7200:raise TimeoutError('selected model')
        time.sleep(10)
    spec=json.loads((ROOT/'v6_experiment/selected_model.json').read_text())
    frozen=json.loads((OUT/'freeze_report.json').read_text())
    raw=(OUT/'cases.jsonl').read_text()
    assert hashlib.sha256(raw.encode()).hexdigest()==frozen['sha256']
    cases=[json.loads(x) for x in raw.splitlines()]
    assert len(cases)==24
    (OUT/'selected_model.json').write_text(json.dumps(spec,indent=2))
    result_path=OUT/'proposals.jsonl'
    if not result_path.exists():
        status('evaluating_frozen_requests',configuration=spec['configuration'],records=24)
        requests=''.join(json.dumps({'text':r['instruction']},ensure_ascii=False)+'\n' for r in cases)
        temporary=result_path.with_suffix('.partial')
        with temporary.open('w') as output,(OUT/'inference.log').open('a') as log:
            subprocess.run([sys.executable,'-u',str(ROOT/'predict_selected.py')],check=True,
                input=requests,text=True,stdout=output,stderr=log,env=dict(os.environ,CUDA_VISIBLE_DEVICES='0'))
        proposals=[json.loads(x) for x in temporary.read_text().splitlines()]
        assert len(proposals)==24
        temporary.replace(result_path)
    else:
        proposals=[json.loads(x) for x in result_path.read_text().splitlines()]
        assert len(proposals)==24
    # Use exactly the comparison scorer, without importing/loading its model.
    tree=ast.parse((ROOT/'evaluate_v6_comparison.py').read_text())
    nodes=[n for n in tree.body if (isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='numeric' for t in n.targets))
           or (isinstance(n,ast.FunctionDef) and n.name=='eq')]
    assert len(nodes)==2
    namespace={'Decimal':Decimal}
    exec(compile(ast.Module(body=nodes,type_ignores=[]),'<frozen-scorer>','exec'),namespace)
    scored=[]
    for case,proposal in zip(cases,proposals):
        assert proposal['configuration']==spec['configuration']
        assert proposal['calculation_executed'] is False
        scored.append(dict(case,raw=proposal['raw'],prediction=proposal['prediction'],
            exact=namespace['eq'](proposal['prediction'],case['target']),
            contract_valid=proposal['contract']['status']!='blocked'))
    report=dict(total=24,exact=sum(r['exact'] for r in scored),contract_valid=sum(r['contract_valid'] for r in scored),
        calls_on_missing_input=[r['id'] for r in scored if r['target']['action']=='clarify' and isinstance(r['prediction'],dict) and r['prediction'].get('action')=='call'],
        per_tool={tool:dict(total=sum(r['family']==tool for r in scored),exact=sum(r['family']==tool and r['exact'] for r in scored)) for tool in sorted({r['family'] for r in scored})},
        failed_ids=[r['id'] for r in scored if not r['exact']],failures=[r for r in scored if not r['exact']],
        selected_model=spec,cases_sha256=frozen['sha256'],
        purpose='fresh authored post-selection extraction probe; results not used to select this model',
        independent_engineering_hard_test=False,independent_target_validation=False,
        model_changed=False,training_started=False,tools_executed=False,engineering_deployment_allowed=False)
    (OUT/'scored_predictions.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in scored))
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    paths=[p for p in OUT.iterdir() if p.is_file() and p.name not in {'status.json','supervisor.log','active.json'} and not p.name.endswith('.partial')]
    archive=ROOT.parent/'ACEP_v6_frozen_probe.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as bundle:
        for p in paths:bundle.write(p,p.name)
    with zipfile.ZipFile(archive) as bundle:assert bundle.testzip() is None
    status('completed',total=24,exact=report['exact'],contract_valid=report['contract_valid'],failed_ids=report['failed_ids'],archive=str(archive))
except BaseException as error:
    status('failed',error=repr(error))
    raise
