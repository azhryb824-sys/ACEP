"""Prepare a bounded continuation experiment in the restored Kaggle workspace."""
from pathlib import Path
from decimal import Decimal
from collections import Counter
import ast
import hashlib
import json
import re
import sys
import unicodedata

ROOT = Path('/kaggle/working/acep-engineering-v1')
DATA = ROOT / 'tool_data_pilot_v6'
EXP = ROOT / 'v6_experiment'
PARENT_SHA = '19049cee53597001db1ab7784e181f57cf0940b918deb83dac85aef80b6ace6b'
sys.path.insert(0, str(ROOT / 'tool_contract_gate_v1'))
from contract_gate import gate


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    if path.exists():
        assert path.read_text() == value, f'Existing different file: {path}'
    else:
        path.write_text(value)


def lines(path):
    return [json.loads(x) for x in path.read_text().splitlines() if x.strip()]


def dump_rows(path, rows):
    write(path, ''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows))


assert sha(ROOT / 'qlora_tool_pilot_v5/adapter/adapter_model.safetensors') == PARENT_SHA
DATA.mkdir(exist_ok=True)
EXP.mkdir(exist_ok=True)
system = json.loads((ROOT / 'baseline_tool_config.json').read_text())['system_prompt']
system = system.replace('الأبعاد والكميات والأسعار موجبة، والفتحات والهدر غير سالبين.',
    'الأبعاد والمساحة الإجمالية وعدد العناصر موجبة. الكميات الصافية وكميات التوريد والأسعار والفتحات والهدر غير سالبة. الصفر قيمة معلومة وليس نقصًا.')
system = system.replace('unit واحدة من m2,m3,kg,ton.', 'unit=m2 في هذه التجربة المحدودة.')
system = system.replace('quantity_unit واحدة من m2,m3,kg,ton,item.', 'quantity_unit=m2 وprice_unit=SAR/m2 في هذه التجربة المحدودة.')
system += '\nقواعد ملزمة: السعر صفر مقبول ولو كان التوريد هدية أو مجانيًا. تساوي الفتحات والإجمالي مقبول وصافي المساحة صفر. السمك صفر غير صالح. اجمع كل الحقول الناقصة في missing_fields ولا تطلب حقلًا واحدًا فقط عند غياب أكثر من حقل. لا تجعل count=1 لمجموعة عددها مجهول. عند clarify يجب tool=null وarguments={}. لا call مع أي حقل ناقص أو null.\n'
write(DATA / 'system_prompt.txt', system)
new = []


def add(family, instruction, tool=None, args=None, missing=None, invalid=False, prefix='v6-supplement'):
    action = 'invalid_input' if invalid else ('clarify' if missing else 'call')
    target = dict(action=action, tool=tool if action == 'call' else None,
                  arguments=args or {}, missing_fields=sorted(missing or []))
    assert gate(target)['status'] != 'blocked', (instruction, target)
    row = dict(id=f'{prefix}-{len(new):04d}', family=family, instruction=instruction, target=target)
    if action == 'call':
        a = target['arguments']
        if tool == 'rectangular_volume':
            result = Decimal(a['length_m']) * Decimal(a['width_m']) * Decimal(a['height_m']) * a['count']
        elif tool == 'net_area':
            result = Decimal(a['gross_m2']) - Decimal(a['openings_m2'])
        elif tool == 'add_waste':
            result = Decimal(a['net_quantity']) * (1 + Decimal(a['waste_percent']) / 100)
        else:
            result = Decimal(a['quantity']) * Decimal(a['unit_price'])
        assert result.is_finite() and result >= 0
        row['reference_result'] = str(result)
    new.append(row)


for i in range(16):
    q = str(Decimal('153.17') + Decimal(i) * Decimal('2.13'))
    p = str(Decimal('67.43') + Decimal(i) * Decimal('1.27'))
    g = str(Decimal('217.39') + Decimal(i) * Decimal('3.17'))
    w = str(Decimal('3.35') + Decimal(i) * Decimal('.17'))
    zero = ['صفر', '0', '٠', '0.00'][i % 4]
    texts = [f'توريد {q} م² بلاط بسعر {zero} ريال/م² لأن المورد يقدمها هدية. استخرج مدخلات قيمة التوريد.',
             f'المورد أعفى البند من الثمن: سعر الوحدة {zero} ريال للمتر المربع. كمية الشراء النهائية {q} م². ما مدخلات التكلفة؟',
             f'الطلب فيه {q} متر مربع بلاط؛ التوريد مجاني وسعره المعتمد {zero} ريال/م². احسب قيمة التوريد فقط.',
             f'تسعير البند = {zero} ريال/م²، والكمية {q} م² بعد الهدر. عاوز قيمة التوريد وحده.']
    add('zero_price', texts[i % 4], 'line_cost', dict(quantity=q, unit_price='0', quantity_unit='m2', price_unit='SAR/m2'))
    add('positive_price', f'السعر {p} ريال/م² للكمية النهائية {q} م²؛ المطلوب قيمة التوريد دون أي إضافات.',
        'line_cost', dict(quantity=q, unit_price=p, quantity_unit='m2', price_unit='SAR/m2'))
    add('negative_price', f'كمية البند {q} م²، وسعره مسجل بالسالب -{p} ريال للمتر المربع. أوجد قيمة التوريد.', invalid=True)
    area_texts = [f'مساحة وجه الحائط الإجمالية {g} م²، ومجموع فتحاته {g} م² بالضبط. احسب الصافي.',
                  f'أريد خصم {g} م² فتحات من إجمالي {g} م² للوجه. القيمتان متساويتان. أوجد الصافي.',
                  f'الحصر قبل الخصم {g} متر مربع، والفتحات تستغرق كامل المساحة نفسها {g} متر مربع. المطلوب الصافي.',
                  f'صافي مساحة الوجه مطلوب: الإجمالي {g} م²؛ فتحات للخصم {g} م²، دون جوانب الفتحات.']
    add('equal_openings', area_texts[i % 4], 'net_area', dict(gross_m2=g, openings_m2=g))
    add('zero_openings', f'وجه الحائط مساحته الإجمالية {g} م². لا توجد فتحات ومساحتها {zero} م². احسب صافي الوجه.',
        'net_area', dict(gross_m2=g, openings_m2='0'))
    add('excessive_openings', f'إجمالي وجه الحائط {g} م²، وفتحاته {Decimal(g)+1} م². استخرج مدخلات الصافي.', invalid=True)
    missing_waste = ['أريد كمية الشراء بعد الهدر، لكن لا يوجد صافي بلاط ولا نسبة هدر.',
                     'احسب إجمالي طلب البلاط مع بدل القص؛ حصر الصافي وتحديد نسبة البدل كلاهما معلقان.',
                     'عاوز كمية بلاط شاملة الهدر. الصافي غير معروف ونسبة الهدر غير متوفرة.',
                     'كم نشتري بلاط بعد إضافة الهدر؟ لا نعرف المساحة الصافية ولا النسبة.']
    # Context identifiers are unrelated numbers; do not substitute them for missing values.
    add('missing_waste_both', f'ملف الموقع {831+i}: ' + missing_waste[i % 4], missing=['net_quantity', 'waste_percent'])
    missing_cost = ['أريد إجمالي تكلفة توريد البلاط؛ لا نملك كمية الطلب أو سعر الوحدة.',
                    'كم قيمة طلب البلاط؟ الكمية النهائية والتسعير لم يعتمدا بعد.',
                    'احسب التوريد فقط. حصر كمية البلاط لم يصل وعرض السعر كذلك لم يصل.',
                    'عاوز أعرف إجمالي قيمة التوريد؛ لا كمية عندنا ولا سعر للمتر.']
    add('missing_cost_both', f'رقم العرض {931+i}. ' + missing_cost[i % 4], missing=['quantity', 'unit_price'])
    add('missing_geometry_multiple', f'عنصر خرساني مستطيل واحد طوله {q} سم؛ العرض والسمك لم يقاسا. أريد الحجم.', missing=['width_m', 'height_m'])
    add('zero_net', f'صافي البلاط المعتمد {zero} م²، والهدر {w}% من الصافي. المطلوب مدخلات كمية الشراء.',
        'add_waste', dict(net_quantity='0', waste_percent=w, unit='m2'))
    add('zero_quantity', f'كمية التوريد النهائية {zero} م²، وسعر المتر {p} ريال. احسب قيمة التوريد دون افتراض كمية بديلة.',
        'line_cost', dict(quantity='0', unit_price=p, quantity_unit='m2', price_unit='SAR/m2'))
    length, width, height, count = 533+i*7, 271+i*3, 143+i*2, 2+i%6
    add('valid_volume_mixed', f'عدد {count} بلاطات مستطيلة متطابقة منفصلة بلا فتحات؛ طول الواحدة {length} سم وعرضها {width} سم وسماكتها {height} مم. استخرج مدخلات إجمالي الحجم دون هدر.',
        'rectangular_volume', dict(length_m=str(Decimal(length)/100), width_m=str(Decimal(width)/100), height_m=str(Decimal(height)/1000), count=count))

supplement = new
assert len(supplement) == 192
new = []
for i in range(2):
    q = str(Decimal('381.287') + i * Decimal('13.019'))
    p = str(Decimal('137.125') + i * Decimal('9.061'))
    g = str(Decimal('493.263') + i * Decimal('17.043'))
    add('zero_price', f'اعتماد مشتريات {1201+i}: بند بلاط نهائي {q} متر مربع؛ الاتفاق أن المتر دون مقابل وقيمته صفر ريال. حدد استدعاء قيمة هذا البند.', 'line_cost', dict(quantity=q, unit_price='0', quantity_unit='m2', price_unit='SAR/m2'), prefix='v6-validation')
    add('tiny_positive_price', f'المبلغ المعتمد للوحدة 0.125 ريال/م². الكمية التي ستحاسب عليها {q} م². استخرج مدخلات التوريد فقط.', 'line_cost', dict(quantity=q, unit_price='0.125', quantity_unit='m2', price_unit='SAR/m2'), prefix='v6-validation')
    add('negative_price', f'سجلت الفاتورة الكمية {q} متر مربع، وسعر الوحدة ناقص {p} ريال/م². المطلوب التوريد.', invalid=True, prefix='v6-validation')
    add('equal_openings', f'راجع صافي الواجهة: مجموع المساحة قبل الخصم {g} م²، وتقرير الفتحات يثبت المساحة نفسها {g} م². أهمل جوانب الفتحات.', 'net_area', dict(gross_m2=g, openings_m2=g), prefix='v6-validation')
    add('zero_openings', f'معاينة الجدار {1201+i} أثبتت إجمالي {g} م²، وخانة الفتحات تسجل صفر متر مربع. ما مدخلات صافي المساحة؟', 'net_area', dict(gross_m2=g, openings_m2='0'), prefix='v6-validation')
    add('excessive_openings', f'الكشف الإجمالي لوجه الدهان {g} م²؛ قياس فتحاته {Decimal(g)+Decimal(".125")} م². استخرج مدخلات الصافي.', invalid=True, prefix='v6-validation')
    add('missing_waste_both', f'طلب شراء رقم {1201+i} يحتاج تحديد إجمالي البلاط متضمنًا بدل القص. لم يستلم المسؤول حصر الصافي ولم يصله قرار نسبة بدل القص.', missing=['net_quantity','waste_percent'], prefix='v6-validation')
    add('missing_cost_both', f'راجع مستخلص توريد رقم {1301+i}. الحصر النهائي للبلاط غائب وعرض سعر المتر غائب أيضًا؛ نحتاج قيمة التوريد الإجمالية.', missing=['quantity','unit_price'], prefix='v6-validation')
    add('missing_geometry_multiple', f'بطاقة عنصر واحد مستطيل لا تتضمن إلا طول {q} سم؛ خانتا الضلع الأفقي الآخر والبعد الرأسي فارغتان. حدد ما يلزم لحجمه.', missing=['width_m','height_m'], prefix='v6-validation')
    add('zero_net', f'محضر الإلغاء {1401+i} اعتمد صافي مساحة البلاط صفر م² مع إبقاء هدر 7.125% من الصافي. استخرج مدخلات كمية الشراء.', 'add_waste', dict(net_quantity='0', waste_percent='7.125', unit='m2'), prefix='v6-validation')
    add('zero_quantity', f'اعتمد المحاسب في هذا البند كمية صفر متر مربع وسعر {p} ريال للمتر المربع. المطلوب مدخلات قيمة التوريد.', 'line_cost', dict(quantity='0', unit_price=p, quantity_unit='m2', price_unit='SAR/m2'), prefix='v6-validation')
    add('valid_volume_mixed', f'كشف الصب فيه {7+i} قطع مستطيلة متطابقة منفصلة بلا فتحات. قياس الواحدة: {719+i*11} سنتيمتر للطول، {383+i*13} سنتيمتر للعرض، {187+i*2} مليمتر للسماكة. المطلوب مجموع الحجم دون هدر.', 'rectangular_volume', dict(length_m=str(Decimal(719+i*11)/100), width_m=str(Decimal(383+i*13)/100), height_m=str(Decimal(187+i*2)/1000), count=7+i), prefix='v6-validation')
    add('zero_height', f'ورقة القياس لقطعة مستطيلة واحدة: الطول {q} سم والعرض {p} سم والبعد الرأسي يساوي 0 مليمتر. المطلوب الحجم.', invalid=True, prefix='v6-validation')
    add('negative_waste', f'مذكور في الكشف صافي بلاط {q} م² مع زيادة هدر قدرها -7.125%. المطلوب الشراء.', invalid=True, prefix='v6-validation')
    add('missing_area_both', f'ملف {1501+i} يحتاج صافي دهان الحائط بعد خصم الفتحات؛ إجمالي الوجه وحصر الفتحات لم يرسلا بعد.', missing=['gross_m2','openings_m2'], prefix='v6-validation')
    add('missing_count', f'مواصفات قطع مستطيلة متطابقة: طول القطعة {q} سم وعرضها {p} سم وسماكتها 187 مم، بلا فتحات أو تداخلات. جدول عدد القطع فارغ. أريد حجمها الإجمالي.', missing=['count'], prefix='v6-validation')
validation = new
assert len(validation) == 32

old = lines(ROOT / 'tool_data_pilot_v5/training.jsonl')
assert len(old) == 744
training = [dict(r, system=system) for r in old]
for r in supplement:
    training.append(dict(id=r['id'], system=system, instruction=r['instruction'], input='', output=json.dumps(r['target'], ensure_ascii=False, sort_keys=True)))
val_rows = [dict(id=r['id'], system=system, instruction=r['instruction'], input='', output=json.dumps(r['target'], ensure_ascii=False, sort_keys=True)) for r in validation]
digits = str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹٫−', '01234567890123456789.-')
def norm(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC',text).translate(digits)).strip()
questions = [norm(r['instruction']) for r in training]
assert len(questions) == len(set(questions)), 'Duplicate training question'
assert len({norm(r['instruction']) for r in validation}) == 32
assert not set(questions) & {norm(r['instruction']) for r in validation}
def signature(target):
    if target['action'] != 'call':
        return None
    a = dict(target['arguments'])
    for k in a:
        if k not in {'unit','quantity_unit','price_unit'}:
            a[k] = str(Decimal(str(a[k])).normalize())
    return json.dumps([target['tool'],a], sort_keys=True)
train_signatures = {signature(json.loads(r['output'])) for r in training} - {None}
val_signatures = {signature(r['target']) for r in validation} - {None}
assert not train_signatures & val_signatures, 'Training/validation call overlap'
for r in training + val_rows:
    assert gate(json.loads(r['output']))['status'] != 'blocked', r['id']

known = [dict(r,suite='regression40') for r in lines(ROOT/'four_tool_comparison_v4_v5/comparison_cases.jsonl')]
previous = lines(ROOT/'v5_resume_evaluation_nf4/cases.jsonl')
tools = ['rectangular_volume','net_area','add_waste','line_cost']
for r in previous:
    if 'family' not in r:
        r['family'] = tools[int(r['id'].rsplit('-',1)[1])//4]
    r['suite'] = 'development48'
new_eval = []
for r in validation:
    r = dict(r,suite='validation32')
    if r['target']['action'] == 'call':
        r['family'] = r['target']['tool']
    elif r['family'] in {'negative_price','missing_cost_both'}:
        r['family'] = 'line_cost'
    elif r['family'] in {'excessive_openings','missing_area_both'}:
        r['family'] = 'net_area'
    elif r['family'] in {'missing_waste_both','negative_waste'}:
        r['family'] = 'add_waste'
    else:
        r['family'] = 'rectangular_volume'
    new_eval.append(r)
cases = known + previous + new_eval
assert len(cases) == 120 and len({r['id'] for r in cases}) == 120
assert not {norm(r['instruction']) for r in validation} & {norm(r['instruction']) for r in known+previous}

dump_rows(DATA/'training.jsonl', training)
dump_rows(DATA/'validation.jsonl', val_rows)
dump_rows(DATA/'validation_targets.jsonl', validation)
dump_rows(DATA/'supplement.jsonl', supplement)
dump_rows(EXP/'evaluation_cases.jsonl', cases)
expected = {n:sha(DATA/n) for n in ['training.jsonl','validation.jsonl']}
decision = dict(scope='limited synthetic four-tool continuation research', parent_adapter_sha256=PARENT_SHA,
                training_records=len(training), supplement_records=192, validation_records=32,
                training_actions=dict(Counter(json.loads(r['output'])['action'] for r in training)),
                normalized_question_overlap=0, normalized_call_overlap=0,
                independent_hard_test=False, independent_engineer_review=False,
                research_training_authorized=True, engineering_deployment_allowed=False, data_sha256=expected)
write(DATA/'decision.json', json.dumps(decision, ensure_ascii=False, indent=2))

# Reuse the previously successful assistant-only token boundaries/collator.
source = (ROOT/'train_evaluate_tool_v5.py').read_text().split('# إعادة استخدام المقارنة نفسها')[0]
source = source.replace('"tool_data_pilot_v5"', '"tool_data_pilot_v6"').replace('"qlora_tool_pilot_v5"','"qlora_tool_pilot_v6"')
source = source.replace('len(train_data) == 744 and len(val_data) == 16', 'len(train_data) == 936 and len(val_data) == 32')
source = source.replace('بدء v5: 744 تدريبًا، 16 تحققًا، دورتان، ', 'بدء v6: 936 تدريبًا، 32 تحققًا، دورة واحدة، ')
source = source.replace('186 خطوة متوقعة', '117 خطوة متوقعة')
tree = ast.parse(source)
for node in tree.body:
    if isinstance(node, ast.ImportFrom) and node.module == 'peft':
        node.names.append(ast.alias(name='PeftModel'))
    if isinstance(node, ast.Assign) and any(isinstance(t,ast.Name) and t.id=='EXPECTED' for t in node.targets):
        node.value = ast.parse(repr(expected), mode='eval').body
class Continuation(ast.NodeTransformer):
    def visit_Assign(self,node):
        self.generic_visit(node)
        if isinstance(node.value,ast.Call) and isinstance(node.value.func,ast.Name) and node.value.func.id=='get_peft_model':
            node.value=ast.parse('PeftModel.from_pretrained(model, str(ROOT / "qlora_tool_pilot_v5/adapter"), is_trainable=True)',mode='eval').body
        if isinstance(node.value,ast.Dict):
            for k,v in zip(node.value.keys,node.value.values):
                if isinstance(k,ast.Constant) and k.value=='epochs':
                    v.value=1
            if any(isinstance(t,ast.Name) and t.id=='experiment' for t in node.targets):
                node.value.keys.append(ast.Constant('parent_adapter_sha256'))
                node.value.values.append(ast.Constant(PARENT_SHA))
        return node
    def visit_Constant(self,node):
        if node.value == 1e-4:
            node.value=3e-5
        elif node.value == 'fresh base model with new LoRA':
            node.value='continue verified v5 LoRA; one epoch with retained original data'
        return node
    def visit_keyword(self,node):
        self.generic_visit(node)
        if node.arg=='num_train_epochs': node.value=ast.Constant(1)
        if node.arg=='warmup_ratio':
            node.arg='warmup_steps'
            node.value=ast.Constant(6)
        if node.arg in {'eval_steps','save_steps'}: node.value=ast.Constant(30)
        if node.arg=='torch_dtype': node.arg='dtype'
        return node
tree=Continuation().visit(tree)
ast.fix_missing_locations(tree)
train_source=ast.unparse(tree)
compile(train_source,'train_tool_pilot_v6.py','exec')
write(ROOT/'train_tool_pilot_v6.py',train_source)

# Same revised prompt, cases, quantization, decoding and scorer for BOTH models.
base=(ROOT/'evaluate_v5_resume_nf4.py').read_text()
prefix=base[:base.index('cases=')]
prefix=prefix.replace("OUT=ROOT/'v5_resume_evaluation_nf4'", "import argparse\nparser=argparse.ArgumentParser()\nparser.add_argument('--label',choices=['v5','v6'],required=True)\nLABEL=parser.parse_args().label\nADAPTER=ROOT/('qlora_tool_pilot_'+LABEL)/'adapter'\nOUT=ROOT/'v6_experiment'/'evaluation'/LABEL")
prefix=prefix.replace('OUT.mkdir(exist_ok=True)','OUT.mkdir(exist_ok=True,parents=True)')
prefix=prefix.replace("SYSTEM=config['system_prompt']",'SYSTEM='+repr(system))
case_source="cases=[json.loads(x) for x in (ROOT/'v6_experiment/evaluation_cases.jsonl').read_text().splitlines()]\n"
metadata_source="""
metadata={'label':LABEL,'revision':REV,'adapter_sha256':hashlib.sha256((ADAPTER/'adapter_model.safetensors').read_bytes()).hexdigest(),'prompt_sha256':hashlib.sha256(SYSTEM.encode()).hexdigest(),'cases_sha256':hashlib.sha256((ROOT/'v6_experiment/evaluation_cases.jsonl').read_bytes()).hexdigest(),'quantization':'nf4 double quantization, fp16 compute','do_sample':False,'max_new_tokens':256,'independent_hard_test':False}
mp=OUT/'metadata.json'
if mp.exists(): assert json.loads(mp.read_text())==metadata,'Changed evaluation identity'
else: mp.write_text(json.dumps(metadata,indent=2))
def strict_loads(raw):
    def pairs(items):
        result={}
        for k,v in items:
            if k in result:raise ValueError('duplicate_json_key')
            result[k]=v
        return result
    def reject(value):raise ValueError('nonstandard_constant')
    return json.loads(raw,object_pairs_hook=pairs,parse_constant=reject)
"""
tail=base[base.index('numeric='):]
assert "str(ROOT/'qlora_tool_pilot_v5/adapter')" in tail
tail=tail.replace("str(ROOT/'qlora_tool_pilot_v5/adapter')",'str(ADAPTER)')
tail=tail.replace("['validation16','new_development']","['regression40','development48','validation32']")
tail=tail.replace('pred=json.loads(raw)','pred=strict_loads(raw)')
eval_source=prefix+case_source+metadata_source+tail
compile(eval_source,'evaluate_v6_comparison.py','exec')
write(ROOT/'evaluate_v6_comparison.py',eval_source)
print(json.dumps(decision,ensure_ascii=False,indent=2))
print('Data and scripts prepared; no training in this preparation step.')
