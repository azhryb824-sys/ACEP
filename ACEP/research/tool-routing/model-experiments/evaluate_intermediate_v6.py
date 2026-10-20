"""Evaluate saved intermediate adapters on the otherwise idle second GPU.

No training is started or modified. All targets remain development targets.
"""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time

ROOT = Path('/kaggle/working/acep-engineering-v1')
EXP = ROOT/'v6_experiment'
OUT = ROOT/'v6_checkpoint_evaluation'
OUT.mkdir(exist_ok=True)
START = time.time()

def status(**data):
    data.update(updated=time.time(),scope='intermediate development comparison',training_modified=False)
    temp=OUT/'status.partial'
    temp.write_text(json.dumps(data,indent=2))
    temp.replace(OUT/'status.json')
    print(json.dumps(data),flush=True)

def wait_for(test,description):
    while not test():
        if time.time()-START > 7200: raise TimeoutError(description)
        if (EXP/'status.json').exists() and json.loads((EXP/'status.json').read_text())['stage']=='failed':
            raise RuntimeError('Parent experiment failed')
        time.sleep(10)

try:
    status(stage='waiting_for_baseline_and_checkpoint')
    wait_for(lambda:(EXP/'evaluation/v5/report.json').is_file(),'baseline report')
    # The baseline writes its report immediately before exiting.
    time.sleep(5)
    source=(ROOT/'evaluate_v6_comparison.py').read_text()
    assert "choices=['v5','v6']" in source
    assert "OUT=ROOT/'v6_experiment'/'evaluation'/LABEL" in source
    source=source.replace("choices=['v5','v6']","choices=['v6_step60','v6_step90']")
    source=source.replace("OUT=ROOT/'v6_experiment'/'evaluation'/LABEL","OUT=ROOT/'v6_checkpoint_evaluation'/LABEL")
    runner=ROOT/'evaluate_v6_intermediate_comparison.py'
    if runner.exists(): assert runner.read_text()==source
    else: runner.write_text(source)
    compile(source,str(runner),'exec')
    for step in [60,90]:
        label=f'v6_step{step}'
        checkpoint=ROOT/'qlora_tool_pilot_v6'/f'checkpoint-{step}'
        status(stage='waiting_for_checkpoint',step=step)
        wait_for(lambda:(checkpoint/'trainer_state.json').is_file(),f'checkpoint {step}')
        assert json.loads((checkpoint/'trainer_state.json').read_text())['global_step']==step
        adapter=ROOT/f'qlora_tool_pilot_{label}'/'adapter'
        adapter.mkdir(parents=True,exist_ok=True)
        for name in ['adapter_config.json','adapter_model.safetensors']:
            src=checkpoint/name
            digest=hashlib.sha256(src.read_bytes()).hexdigest()
            dst=adapter/name
            if dst.exists(): assert hashlib.sha256(dst.read_bytes()).hexdigest()==digest
            else: shutil.copyfile(src,dst)
            assert hashlib.sha256(dst.read_bytes()).hexdigest()==digest
        status(stage='evaluating_checkpoint',step=step)
        with (OUT/f'{label}.log').open('a') as log:
            subprocess.run([sys.executable,'-u',str(runner),'--label',label],check=True,
                env=dict(os.environ,CUDA_VISIBLE_DEVICES='1',TOKENIZERS_PARALLELISM='false'),
                stdout=log,stderr=subprocess.STDOUT)
        status(stage='checkpoint_evaluated',step=step)
    status(stage='completed')
except BaseException as error:
    status(stage='failed',error=repr(error))
    raise
