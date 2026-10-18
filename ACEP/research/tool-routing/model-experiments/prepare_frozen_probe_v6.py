"""Freeze 24 fresh authored extraction cases before candidate selection.

No independent engineer or external benchmark is claimed.
"""
from pathlib import Path
from decimal import Decimal
import hashlib
import json
import re
import sys
import unicodedata

ROOT=Path('/kaggle/working/acep-engineering-v1')
OUT=ROOT/'v6_frozen_probe'
OUT.mkdir(exist_ok=True)
sys.path.insert(0,str(ROOT/'tool_contract_gate_v1'))
from contract_gate import gate
rows=[]

def add(tool,text,args=None,missing=None,invalid=False):
    target=dict(action='invalid_input' if invalid else 'clarify' if missing else 'call',
        tool=tool if args is not None else None,arguments=args or {},missing_fields=sorted(missing or []))
    assert gate(target)['status']!='blocked',(text,target)
    rows.append(dict(id=f'frozen-v6-{len(rows):03d}',suite='frozen_probe24',family=tool,instruction=text,target=target))

add('rectangular_volume','ثلاث قطع صب مستطيلة متطابقة ومنفصلة، بلا فتحات: طول القطعة 994.6 سم وعرضها 3.125 م وسماكتها 88 مم. أريد مجموع الحجم الهندسي قبل الهدر.',dict(length_m='9.946',width_m='3.125',height_m='0.088',count=3))
add('rectangular_volume','كمرتان مستطيلتان منفصلتان دون أي تداخل؛ طول الكمرة 4.625 م وعرض مقطعها 275 مم وارتفاعه 510 مم. استخرج مدخلات مجموع حجم الخرسانة دون هدر.',dict(length_m='4.625',width_m='0.275',height_m='0.51',count=2))
add('rectangular_volume','حجم قطعة مستطيلة واحدة مطلوب. طولها 9.946 متر، وعرضها 3.125 متر؛ قياس السماكة لم يرد في المستند.',missing=['height_m'])
add('rectangular_volume','مجموعة قطع مستطيلة متماثلة؛ طول القطعة 9.946 م وعرضها 3.125 م وسماكتها 88 مم. لا يوجد بيان بعدد القطع، والمطلوب الحجم الكلي.',missing=['count'])
add('rectangular_volume','قطعة مستطيلة واحدة بطول 9.946 م وعرض 3.125 م وسماكة مسجلة -88 مم. استخرج مدخلات الحجم.',invalid=True)
add('rectangular_volume','قطعة صب واحدة مستطيلة، طولها 9.946 م وعرضها صفر متر وسماكتها 88 مم. أريد حجمها.',invalid=True)
add('net_area','وجه جدار إجماليه 175.625 متر مربع، وفتحاته للخصم 0.625 متر مربع. احسب مساحة الوجه الصافية، دون جوانب الفتحات.',dict(gross_m2='175.625',openings_m2='0.625'))
add('net_area','مساحة وجه قبل أي خصم 61.875 م². مجموع الفتحات المسجل 0 م². أوجد الصافي فقط.',dict(gross_m2='61.875',openings_m2='0'))
add('net_area','في هذا الوجه الإجمالي والفتحات متساويان: كل منهما 58.052 م². المطلوب الصافي بعد خصم الفتحات مرة واحدة.',dict(gross_m2='58.052',openings_m2='58.052'))
add('net_area','مساحة الفتحات 5.26 م²، لكن قياس المساحة الإجمالية لوجه الجدار غير موجود. أريد الصافي بعد خصمها.',missing=['gross_m2'])
add('net_area','ملف الواجهة 893: نريد الصافي بعد خصم الفتحات. لا يوجد قياس للإجمالي ولا حصر لمساحة الفتحات.',missing=['gross_m2','openings_m2'])
add('net_area','حصر وجه الجدار يسجل إجماليًا -61.875 م²، والفتحات 5.26 م². أوجد صافي المساحة.',invalid=True)
add('add_waste','محضر الموقع 2026 يثبت صافي البلاط 48.312 م². بدل القص المعتمد 9.375% من الصافي. استخرج كمية الشراء دون تقريب إلى عبوات.',dict(net_quantity='48.312',waste_percent='9.375',unit='m2'))
add('add_waste','اعتمدنا صافي تبليط 17.25 متر مربع، ونسبة الهدر 0 بالمئة. المطلوب إجمالي كمية الطلب دون تقريب.',dict(net_quantity='17.25',waste_percent='0',unit='m2'))
add('add_waste','صافي بند البلاط صفر م²، ونسبة الزيادة للهدر 22.5% من الصافي. أريد كمية الشراء بلا تقريب.',dict(net_quantity='0',waste_percent='22.5',unit='m2'))
add('add_waste','نسبة بدل القص 6.25% من صافي البلاط. حصر الصافي لم يصل بعد. أريد إجمالي كمية الشراء دون تقريب.',missing=['net_quantity'])
add('add_waste','المعاملة 894 تخص طلب بلاط مع احتياطي قص. المساحة الصافية غير معروفة، ونسبة الاحتياطي غير معتمدة. استخرج المطلوب لكمية الشراء.',missing=['net_quantity','waste_percent'])
add('add_waste','صافي البلاط 48.312 م²، والهدر المطلوب سالب 9.375 بالمئة. احسب إجمالي الشراء.',invalid=True)
add('line_cost','السعر المحدد ٣٢٫٦٢٥ ريال لكل متر مربع، والكمية النهائية للشراء ٧١٫٤٢٥ م². المطلوب قيمة التوريد وحده، دون إضافات.',dict(quantity='71.425',unit_price='32.625',quantity_unit='m2',price_unit='SAR/m2'))
add('line_cost','المورد يمنح هذا البند بلا مقابل: المبلغ المطلوب للمتر صفر ريال. كمية الطلب النهائية 43.875 متر مربع. استخرج قيمة التوريد فقط.',dict(quantity='43.875',unit_price='0',quantity_unit='m2',price_unit='SAR/m2'))
add('line_cost','كمية بند التوريد المعتمدة 0 م²، وسعر وحدته 82.215 ريال/م². أريد قيمة البند دون مصاريف أخرى.',dict(quantity='0',unit_price='82.215',quantity_unit='m2',price_unit='SAR/m2'))
add('line_cost','طلب الشراء 734 يثبت كمية توريد 71.425 م²، ولم يحدد المورد سعر المتر. أريد إجمالي قيمة التوريد.',missing=['unit_price'])
add('line_cost','عرض المورد يسجل 32.625 ريال/م² للبلاط. كمية الطلب لم تعتمد بعد؛ المطلوب التكلفة الإجمالية للتوريد.',missing=['quantity'])
add('line_cost','كمية التوريد النهائية 71.425 م². للبند نفسه سعران متعارضان: 54.2 و58.3 ريال/م²، ولا يوجد سعر معتمد. أريد قيمة التوريد دون اختيار افتراضي.',missing=['unit_price'])
assert len(rows)==24
translation=str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹٫−','01234567890123456789.-')
def norm(text):return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',text).translate(translation)).strip()
comparison=[]
for path in [ROOT/'tool_data_pilot_v6/training.jsonl',ROOT/'v6_experiment/evaluation_cases.jsonl']:
    comparison.extend(json.loads(x) for x in path.read_text().splitlines())
assert not {norm(r['instruction']) for r in rows}&{norm(r['instruction']) for r in comparison}
raw=''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows)
path=OUT/'cases.jsonl'
if path.exists():assert path.read_text()==raw
else:path.write_text(raw)
report=dict(records=24,sha256=hashlib.sha256(raw.encode()).hexdigest(),
    normalized_known_question_overlap=0,frozen_before_final_selection=True,
    independent_target_validation=False,independent_engineering_hard_test=False,
    purpose='fresh authored post-selection extraction probe',training_started=False)
(OUT/'freeze_report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
