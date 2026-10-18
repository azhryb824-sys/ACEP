"""Screen an official newer base on the same development contract in Kaggle."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import time

ROOT=Path('/kaggle/working/acep-engineering-v1')
OUT=ROOT/'qwen3_base_comparison'
OUT.mkdir(exist_ok=True)
started=time.time()

def read(path):return json.loads(path.read_text())

def status(stage,**extra):
    value=dict(stage=stage,updated=time.time(),training_started=False,tools_executed=False,
               independent_hard_test=False,engineering_deployment_allowed=False,**extra)
    p=OUT/'status.partial'
    p.write_text(json.dumps(value,indent=2))
    p.replace(OUT/'status.json')
    print(json.dumps(value),flush=True)

try:
    status('waiting_for_free_second_gpu_and_cached_base')
    while True:
        p=ROOT/'v6_checkpoint_evaluation/status.json'
        stage=read(p)['stage'] if p.exists() else 'pending'
        if stage=='failed':raise RuntimeError('Checkpoint comparison failed')
        if stage=='completed' and (OUT/'download_verified.json').exists():break
        if time.time()-started>7200:raise TimeoutError('base preparation or GPU')
        time.sleep(10)
    identity=read(OUT/'identity.json')
    base=(ROOT/'evaluate_v6_comparison.py').read_text()
    assert "MODEL='Qwen/Qwen2.5-3B-Instruct'" in base
    assert "REV='9bbedf2d140158eb7dc95a89e776b86befc70e1a'" in base
    assert "model=PeftModel.from_pretrained(base,str(ADAPTER)).eval()" in base
    base=base.replace("MODEL='Qwen/Qwen2.5-3B-Instruct'",'MODEL='+repr(identity['model']))
    base=base.replace("REV='9bbedf2d140158eb7dc95a89e776b86befc70e1a'",'REV='+repr(identity['revision']))
    base=base.replace("choices=['v5','v6']","choices=['qwen3_base']")
    base=base.replace('LABEL=parser.parse_args().label',"parser.add_argument('--screen-only',action='store_true')\nCLI=parser.parse_args()\nLABEL=CLI.label")
    base=base.replace("OUT=ROOT/'v6_experiment'/'evaluation'/LABEL","OUT=ROOT/'qwen3_base_comparison'/'evaluation'")
    base=base.replace("'adapter_sha256':hashlib.sha256((ADAPTER/'adapter_model.safetensors').read_bytes()).hexdigest()","'model':MODEL,'adapter_sha256':None,'case_order':'validation32 first; independent requests'")
    base=base.replace("model=PeftModel.from_pretrained(base,str(ADAPTER)).eval()","model=base.eval()")
    base=base.replace('AutoTokenizer.from_pretrained(MODEL,revision=REV)', 'AutoTokenizer.from_pretrained(MODEL,revision=REV,local_files_only=True)')
    base=base.replace('MODEL,revision=REV,dtype=', 'MODEL,revision=REV,local_files_only=True,dtype=')
    case_line="cases=[json.loads(x) for x in (ROOT/'v6_experiment/evaluation_cases.jsonl').read_text().splitlines()]"
    assert case_line in base
    base=base.replace(case_line,case_line+"\ncases=sorted(cases,key=lambda r:r['suite']!='validation32')")
    assert 'for c in cases:\n' in base
    base=base.replace('for c in cases:\n','for c in cases:\n if CLI.screen_only and len(saved)>=32:break\n')
    base=base.replace("if c['suite']==suite]","if c['suite']==suite and c['id'] in saved]")
    base=base.replace("(OUT/'report.json').write_text", "report['screen_only']=CLI.screen_only\n(OUT/'report.json').write_text")
    runner=ROOT/'evaluate_qwen3_base.py'
    compile(base,str(runner),'exec')
    if runner.exists():assert runner.read_text()==base
    else:runner.write_text(base)
    environment=dict(os.environ,CUDA_VISIBLE_DEVICES='1',TOKENIZERS_PARALLELISM='false')
    status('screening_new_base',model=identity['model'],revision=identity['revision'],records=32)
    with (OUT/'screen.log').open('a') as log:
        subprocess.run([sys.executable,'-u',str(runner),'--label','qwen3_base','--screen-only'],
            check=True,env=environment,stdout=log,stderr=subprocess.STDOUT)
    report=read(OUT/'evaluation/report.json')
    screen=report['suites']['validation32']
    assert screen['total']==32
    (OUT/'screen_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    proceed=screen['exact']>=26 and screen['contract_valid']>=30 and not screen['calls_on_missing_input']
    if not proceed:
        status('screen_completed_not_advanced',screen=screen,full_comparison_started=False)
    else:
        status('completing_all_120_cases',screen_exact=screen['exact'])
        with (OUT/'full.log').open('a') as log:
            subprocess.run([sys.executable,'-u',str(runner),'--label','qwen3_base'],check=True,
                env=environment,stdout=log,stderr=subprocess.STDOUT)
        report=read(OUT/'evaluation/report.json')
        rows=[json.loads(x) for x in (OUT/'evaluation/predictions.jsonl').read_text().splitlines()]
        assert len(rows)==120 and len({r['id'] for r in rows})==120
        summary=dict(total=120,exact=sum(r['exact'] for r in rows),contract_valid=sum(r['contract_valid'] for r in rows),
            calls_on_missing_input=[r['id'] for r in rows if r['target']['action']=='clarify' and isinstance(r['prediction'],dict) and r['prediction'].get('action')=='call'])
        (OUT/'summary.json').write_text(json.dumps(summary,indent=2))
        status('completed',summary=summary)
except BaseException as error:
    status('failed',error=repr(error))
    raise
