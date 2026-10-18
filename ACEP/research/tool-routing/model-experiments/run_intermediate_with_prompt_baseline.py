"""Retain the earlier v5 prompt as a competing development configuration."""
from pathlib import Path
import ast
import json
import os
import subprocess
import sys

ROOT=Path('/kaggle/working/acep-engineering-v1')
previous=ast.parse((ROOT/'evaluate_prompt_v2_regression40.py').read_text())
assignments=[node for node in previous.body if isinstance(node,ast.Assign)
             and any(isinstance(t,ast.Name) and t.id=='SYSTEM' for t in node.targets)]
assert len(assignments)==2
namespace={'config':json.loads((ROOT/'baseline_tool_config.json').read_text())}
exec(compile(ast.Module(body=assignments,type_ignores=[]),'<previous-prompt>','exec'),namespace)
system=namespace['SYSTEM']
assert isinstance(system,str)
source=(ROOT/'evaluate_v6_comparison.py').read_text()
assert len([line for line in source.splitlines() if line.startswith('SYSTEM=')])==1
source='\n'.join('SYSTEM='+repr(system) if line.startswith('SYSTEM=') else line for line in source.splitlines())+'\n'
assert "OUT=ROOT/'v6_experiment'/'evaluation'/LABEL" in source
source=source.replace("OUT=ROOT/'v6_experiment'/'evaluation'/LABEL","OUT=ROOT/'v5_prompt_v2_comparison120'")
runner=ROOT/'evaluate_previous_prompt_comparison120.py'
compile(source,str(runner),'exec')
if runner.exists(): assert runner.read_text()==source
else: runner.write_text(source)
with (ROOT/'v6_checkpoint_evaluation/previous_prompt.log').open('a') as log:
    subprocess.run([sys.executable,'-u',str(runner),'--label','v5'],check=True,
        env=dict(os.environ,CUDA_VISIBLE_DEVICES='1'),stdout=log,stderr=subprocess.STDOUT)
subprocess.run([sys.executable,'-u',str(ROOT/'evaluate_intermediate_v6.py')],check=True)
