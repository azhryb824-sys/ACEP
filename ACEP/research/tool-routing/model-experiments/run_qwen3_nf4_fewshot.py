"""Isolate precision using exactly the frozen FP16 few-shot prompt and cases."""
from pathlib import Path
import ast
import json
import os
import subprocess
import sys
import time

ROOT=Path('/kaggle/working/acep-engineering-v1')
OUT=ROOT/'qwen3_nf4_fewshot'
OUT.mkdir(exist_ok=True)
started=time.time()
def read(p):return json.loads(p.read_text())
def status(stage,**extra):
    value=dict(stage=stage,updated=time.time(),training_started=False,tools_executed=False,
               independent_hard_test=False,engineering_deployment_allowed=False,**extra)
    p=OUT/'status.partial';p.write_text(json.dumps(value,indent=2));p.replace(OUT/'status.json')
    print(json.dumps(value),flush=True)
try:
    status('waiting_for_free_first_gpu')
    while True:
        p=ROOT/'v6_frozen_probe/status.json'
        state=read(p)['stage'] if p.exists() else 'pending'
        if state=='failed':raise RuntimeError('Frozen probe failed')
        if state=='completed' and (ROOT/'evaluate_qwen3_fp16_fewshot.py').is_file():break
        if time.time()-started>7200:raise TimeoutError('GPU/source')
        time.sleep(10)
    time.sleep(3)
    tree=ast.parse((ROOT/'evaluate_qwen3_fp16_fewshot.py').read_text())
    class Precision(ast.NodeTransformer):
        def visit_Assign(self,node):
            self.generic_visit(node)
            names={t.id for t in node.targets if isinstance(t,ast.Name)}
            if 'OUT' in names:node.value=ast.parse("ROOT/'qwen3_nf4_fewshot'/'evaluation'",mode='eval').body
            if 'metadata' in names:
                for k,v in zip(node.value.keys,node.value.values):
                    if isinstance(k,ast.Constant) and k.value=='quantization':v.value='nf4 double quantization, fp16 compute'
            return node
        def visit_Call(self,node):
            self.generic_visit(node)
            if isinstance(node.func,ast.Attribute) and node.func.attr=='from_pretrained' and isinstance(node.func.value,ast.Name) and node.func.value.id=='AutoModelForCausalLM':
                assert not any(kw.arg=='quantization_config' for kw in node.keywords)
                node.keywords.append(ast.keyword(arg='quantization_config',value=ast.parse("BitsAndBytesConfig(load_in_4bit=True,bnb_4bit_quant_type='nf4',bnb_4bit_use_double_quant=True,bnb_4bit_compute_dtype=torch.float16)",mode='eval').body))
            return node
    tree=Precision().visit(tree);ast.fix_missing_locations(tree)
    code=ast.unparse(tree);compile(code,'evaluate_qwen3_nf4_fewshot.py','exec')
    runner=ROOT/'evaluate_qwen3_nf4_fewshot.py'
    if runner.exists():assert runner.read_text()==code
    else:runner.write_text(code)
    environment=dict(os.environ,CUDA_VISIBLE_DEVICES='0',TOKENIZERS_PARALLELISM='false')
    status('screening_nf4_fewshot',records=32)
    with (OUT/'screen.log').open('a') as log:
        subprocess.run([sys.executable,'-u',str(runner),'--label','qwen3_base','--screen-only'],check=True,
                       env=environment,stdout=log,stderr=subprocess.STDOUT)
    report=read(OUT/'evaluation/report.json');screen=report['suites']['validation32']
    assert screen['total']==32
    (OUT/'screen_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    if screen['exact']>=26 and screen['contract_valid']>=30 and not screen['calls_on_missing_input']:
        status('completing_all_120_cases',screen_exact=screen['exact'])
        with (OUT/'full.log').open('a') as log:
            subprocess.run([sys.executable,'-u',str(runner),'--label','qwen3_base'],check=True,
                           env=environment,stdout=log,stderr=subprocess.STDOUT)
        rows=[json.loads(x) for x in (OUT/'evaluation/predictions.jsonl').read_text().splitlines()]
        assert len(rows)==120
        summary=dict(total=120,exact=sum(r['exact'] for r in rows),contract_valid=sum(r['contract_valid'] for r in rows))
        (OUT/'summary.json').write_text(json.dumps(summary,indent=2))
        status('completed',summary=summary)
    else:
        status('screen_completed_not_advanced',total=32,exact=screen['exact'],contract_valid=screen['contract_valid'],calls_on_missing_input=screen['calls_on_missing_input'])
except BaseException as error:
    status('failed',error=repr(error));raise
