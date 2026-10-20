"""Wait for the active experiment and checkpoint comparisons, then package."""
from pathlib import Path
import json
import subprocess
import sys
import time

ROOT=Path('/kaggle/working/acep-engineering-v1')
OUT=ROOT/'v6_packaging'
OUT.mkdir(exist_ok=True)
started=time.time()

def status(stage,**extra):
    value=dict(stage=stage,updated=time.time(),**extra)
    temporary=OUT/'status.partial'
    temporary.write_text(json.dumps(value,indent=2))
    temporary.replace(OUT/'status.json')
    print(json.dumps(value),flush=True)

try:
    status('waiting_for_all_comparisons')
    paths=[ROOT/'v6_experiment/status.json',ROOT/'v6_checkpoint_evaluation/status.json']
    while True:
        states=[json.loads(p.read_text())['stage'] if p.exists() else 'pending' for p in paths]
        if 'failed' in states: raise RuntimeError(f'Comparison failed: {states}')
        if all(s=='completed' for s in states): break
        if time.time()-started>7200:raise TimeoutError('comparisons')
        time.sleep(10)
    status('selecting_and_archiving')
    subprocess.run([sys.executable,'-u',str(ROOT/'finalize_v6.py')],check=True)
    status('completed')
except BaseException as error:
    status('failed',error=repr(error))
    raise
