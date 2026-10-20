"""Test a separately frozen FP16/few-shot configuration; never repair answers."""
from pathlib import Path
import ast
import hashlib
import json
import os
import subprocess
import sys
import time

ROOT=Path('/kaggle/working/acep-engineering-v1')
OUT=ROOT/'qwen3_fp16_fewshot'
OUT.mkdir(exist_ok=True)
SYSTEM='''Extract explicit facts from the Arabic user request for one of four elementary tools. Return exactly one JSON object, no markdown or explanation. Never calculate the final numeric result.
Only these four root keys are allowed: action, tool, arguments, missing_fields.
action="call": tool is a tool name below, arguments contains ALL required fields and ONLY those fields, missing_fields=[].
action="clarify": tool=null, arguments={}, missing_fields lists ALL missing or unresolved required numeric fields using the EXACT English identifiers below. Never use Arabic descriptions as field identifiers.
action="invalid_input": tool=null, arguments={}, missing_fields=[].
Tools:
rectangular_volume: length_m,width_m,height_m,count. Convert cm/سم/سنتيمتر to m by /100, mm/مم/مليمتر by /1000. height_m means thickness/سمك/سماكة or height/ارتفاع/البعد الرأسي. Positive dimensions, positive integer count. Explicit singular one means 1, explicit dual forms like عمودان/قطعتان/كمرتان mean 2. Never assume count=1 for an uncounted group.
net_area: gross_m2,openings_m2. Gross area must be positive; openings >=0 and <=gross. Equal gross and openings is VALID. Zero openings is VALID. Extract the two supplied values even when equal; never replace a supplied openings value by zero.
add_waste: net_quantity,waste_percent,unit. Both numeric fields must be >=0; unit is exactly "m2". Zero is a known valid value, NOT missing.
line_cost: quantity,unit_price,quantity_unit,price_unit. Both numbers must be >=0; quantity_unit="m2", price_unit="SAR/m2". Supplied zero/free price is VALID. A zero quantity is VALID. Do not add waste again to a supplied final purchase quantity.
Numeric arguments may be JSON numbers or decimal strings, without embedded units. Preserve supplied decimal precision and convert Arabic/Persian digits. Any negative required numeric value is invalid; Arabic سالب or ناقص followed by a number denotes a negative value. Unprovided data requires clarification, not invalid_input. Conflicting unapproved values require clarification of the affected field.
Bind a value to its semantic label and unit. Document numbers, dates, invoice numbers, and room numbers are NOT quantities, prices, dimensions, or counts. A known zero must never become a missing field. Do not ask for information that is already explicitly supplied. Never invent a value or infer reinforcement from project floor area; missing reinforcement design requires structural_design_and_reinforcement_details.
For missing_fields use only: length_m,width_m,height_m,count,gross_m2,openings_m2,net_quantity,waste_percent,quantity,unit_price,structural_design_and_reinforcement_details.
'''
def target(tool=None,args=None,missing=None,invalid=False):
    return dict(action='invalid_input' if invalid else 'clarify' if missing else 'call',tool=tool,
                arguments=args or {},missing_fields=missing or [])
examples=[
 ('بلاطة واحدة مستطيلة، طولها 2.4 م وعرضها 1.5 م وسمكها 12 سم. حجمها دون هدر.',target('rectangular_volume',dict(length_m='2.4',width_m='1.5',height_m='0.12',count=1))),
 ('فاتورة رقم 7000: كمية البلاط النهائية 23.5 م² وسعر المتر صفر ريال؛ التوريد هدية. استخرج مدخلات قيمة التوريد.',target('line_cost',dict(quantity='23.5',unit_price='0',quantity_unit='m2',price_unit='SAR/m2'))),
 ('الإجمالي 37.6 م² والفتحات 37.6 م² بالضبط. مطلوب صافي الوجه.',target('net_area',dict(gross_m2='37.6',openings_m2='37.6'))),
 ('مذكرة 347 تطلب كمية البلاط بعد الهدر؛ حصر الصافي لم يصل ونسبة الهدر لم تعتمد.',target(missing=['net_quantity','waste_percent'])),
 ('توريد 12.8 م² بلاط؛ سعر المتر ناقص 4.3 ريال. استخرج مدخلات التكلفة.',target(invalid=True)),
 ('عنصر مستطيل واحد طوله 2.4 م فقط. العرض والارتفاع غير مقاسين. أريد حجمه.',target(missing=['height_m','width_m'])),
 ('قطعتان مستطيلتان منفصلتان؛ طول الواحدة 3.2 م وعرضها 0.4 م وارتفاعها 0.7 م. الحجم الإجمالي دون تداخل.',target('rectangular_volume',dict(length_m='3.2',width_m='0.4',height_m='0.7',count=2))),
 ('إجمالي الوجه 17.43 م² والفتحات 17.49 م². احسب الصافي.',target(invalid=True)),
]
EXAMPLES=[]
for question,answer in examples:
    EXAMPLES.extend([dict(role='user',content=question),dict(role='assistant',content=json.dumps(answer,ensure_ascii=False))])
started=time.time()
def read(p):return json.loads(p.read_text())
def status(stage,**extra):
    data=dict(stage=stage,updated=time.time(),training_started=False,tools_executed=False,
              independent_hard_test=False,engineering_deployment_allowed=False,**extra)
    p=OUT/'status.partial';p.write_text(json.dumps(data,indent=2));p.replace(OUT/'status.json')
    print(json.dumps(data),flush=True)
try:
    frozen=dict(system_sha256=hashlib.sha256(SYSTEM.encode()).hexdigest(),
        examples_sha256=hashlib.sha256(json.dumps(EXAMPLES,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),
        precision='float16; no weight quantization',examples=len(examples),
        purpose='separate prompted configuration; no claim of an isolated architecture effect')
    p=OUT/'prompt_identity.json'
    if p.exists():assert read(p)==frozen
    else:p.write_text(json.dumps(frozen,indent=2))
    (OUT/'system_prompt.txt').write_text(SYSTEM)
    (OUT/'examples.json').write_text(json.dumps(EXAMPLES,ensure_ascii=False,indent=2))
    status('waiting_for_second_gpu',prompt_identity=frozen)
    while True:
        p=ROOT/'qwen3_base_comparison/status.json'
        stage=read(p)['stage'] if p.exists() else 'pending'
        if stage in {'completed','screen_completed_not_advanced','failed'}:break
        if time.time()-started>7200:raise TimeoutError('GPU')
        time.sleep(10)
    time.sleep(3)
    source=ROOT/'evaluate_qwen3_base.py'
    assert source.is_file()
    tree=ast.parse(source.read_text())
    class Configure(ast.NodeTransformer):
        def visit_Assign(self,node):
            self.generic_visit(node)
            names={t.id for t in node.targets if isinstance(t,ast.Name)}
            if 'SYSTEM' in names:node.value=ast.Constant(SYSTEM)
            if 'OUT' in names:node.value=ast.parse("ROOT/'qwen3_fp16_fewshot'/'evaluation'",mode='eval').body
            if 'metadata' in names:
                for k,v in zip(node.value.keys,node.value.values):
                    if isinstance(k,ast.Constant) and k.value=='quantization':v.value='none; float16'
                node.value.keys.extend([ast.Constant('examples_sha256'),ast.Constant('prompt_style')])
                node.value.values.extend([ast.Constant(frozen['examples_sha256']),ast.Constant('English explicit schema with eight synthetic few-shot pairs')])
            return node
        def visit_Call(self,node):
            self.generic_visit(node)
            if isinstance(node.func,ast.Attribute) and node.func.attr=='from_pretrained' and isinstance(node.func.value,ast.Name) and node.func.value.id=='AutoModelForCausalLM':
                node.keywords=[kw for kw in node.keywords if kw.arg!='quantization_config']
            if isinstance(node.func,ast.Attribute) and node.func.attr=='apply_chat_template':
                node.args[0]=ast.parse("[{'role':'system','content':SYSTEM}]+EXAMPLES+[{'role':'user','content':c['instruction']}]",mode='eval').body
            return node
    tree=Configure().visit(tree)
    tree.body.insert(0,ast.Assign(targets=[ast.Name(id='EXAMPLES',ctx=ast.Store())],value=ast.parse(repr(EXAMPLES),mode='eval').body))
    ast.fix_missing_locations(tree)
    code=ast.unparse(tree)
    compile(code,'evaluate_qwen3_fp16_fewshot.py','exec')
    runner=ROOT/'evaluate_qwen3_fp16_fewshot.py'
    if runner.exists():assert runner.read_text()==code
    else:runner.write_text(code)
    environment=dict(os.environ,CUDA_VISIBLE_DEVICES='1',TOKENIZERS_PARALLELISM='false')
    status('screening_fp16_fewshot',records=32)
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
        status('screen_completed_not_advanced',total=32,exact=screen['exact'],contract_valid=screen['contract_valid'],
               calls_on_missing_input=screen['calls_on_missing_input'])
except BaseException as error:
    status('failed',error=repr(error));raise
