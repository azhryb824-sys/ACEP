"""Authored site-style extraction scenarios, not actual project records."""
from pathlib import Path
from decimal import Decimal as D
import json,random,hashlib,zipfile
R=Path('/kaggle/working/acep-engineering-v1');O=R/'v9_site';O.mkdir(exist_ok=True)
S=(R/'v8_units/system_prompt_v3.txt').read_text()
def target(tool=None,**args):return dict(action='call' if tool else 'invalid_input',tool=tool,arguments=args,missing_fields=[])
def clarify(*fields):return dict(action='clarify',tool=None,arguments={},missing_fields=list(fields))
cases=[]
def add(text,t,f,split='development'):
 cases.append(dict(id='site-v9-%03d'%len(cases),suite='site_style_'+split,family=f,instruction=text,target=t,provenance='authored realistic workflow, not an actual project; arithmetic reference only'))
# Each request is a single supported operation; irrelevant document IDs/quantities are deliberate.
for split,data in [('development',[(212.75,24.38),(84.62,84.63),(366.125,0),(147.0061,147.0062)]),('frozen',[(319.47,35.08),(62.004,62.005)])]:
 for i,(g,o) in enumerate(data):
  g,o=str(g),str(o)
  add(f'محضر حصر دهان وجه واحد بالممر. رقم المحضر 731 وارتفاع الدور 3.2 م للمعلومية فقط. إجمالي الوجه {g} م²، والفتحات التي تخص هذا الوجه {o} م². المطلوب استخراج مدخلات الصافي فقط، ولا تضف هدرًا أو أسعارًا.',target('net_area',gross_m2=g,openings_m2=o) if D(o)<=D(g) else target(), 'net_area',split)
  add(f'Facade survey, sheet 409: openings {o} m2; gross face area {g} m2. The adjacent facade is 55 m2 and is excluded. Extract the net-area inputs for the first face only.',target('net_area',gross_m2=g,openings_m2=o) if D(o)<=D(g) else target(),'net_area',split)
for split in ['development','frozen']:
 n=1 if split=='development' else 2
 add(f'طلب صب رقم {802+n}: عدد البلاطات المستطيلة المتطابقة {n}، طول الواحدة 6.35 م وعرضها 4.72 م وسمكها 180 مم. مساحة الأرض 600 م² لا تدخل في الحصر. استخرج مدخلات حجم هذه البلاطات فقط، بلا هدر.',target('rectangular_volume',length_m='6.35',width_m='4.72',height_m='0.18',count=n),'rectangular_volume',split)
 add(f'حصر قواعد منفصلة رقم {903+n}: {n+3} قواعد مستطيلة متطابقة، طول القاعدة 210 سم وعرضها 175 سم وارتفاعها 55 سم. لا تدرج خرسانة النظافة. مطلوب مدخلات مجموع حجم القواعد فقط.',target('rectangular_volume',length_m='2.1',width_m='1.75',height_m='0.55',count=n+3),'rectangular_volume',split)
 add('مذكرة موقع 611: بلاطة واحدة طولها 7.25 م وعرضها 5.4 م؛ المخطط لا يذكر السمك، ولا يجوز افتراضه. استخرج مدخلات الحجم.',clarify('height_m'),'rectangular_volume',split)
 add('جدول تشطيبات: إجمالي وجه الدهان 286.45 م². توجد أبواب ونوافذ، لكن مساحاتها لم تحصر. نحتاج الصافي، ولا تعتبر مساحة الفتحات صفرًا.',clarify('openings_m2'),'net_area',split)
 q='284.65' if n==1 else '391.75'
 add(f'مراجعة طلب البلاط: الصافي المعتمد {q} م² والهدر المعتمد 7.5% من الصافي. السعر القديم 65 ريال للمتر لا يخص المطلوب. استخرج مدخلات كمية الشراء فقط دون تقريب كراتين.',target('add_waste',net_quantity=q,waste_percent='7.5',unit='m2'),'add_waste',split)
 add(f'طلب حديد معتمد للتوريد: الكمية النهائية {n+2}.45 طن، وسعر المورد 2.85 ريال لكل كجم. الكمية تشمل الهدر بالفعل. استخرج مدخلات قيمة التوريد فقط دون نقل أو ضريبة.',target('line_cost',quantity=str((D(n+2)+D('.45'))*1000),unit_price='2.85',quantity_unit='kg',price_unit='SAR/kg'),'line_cost',split)
 add(f'سجل مستخلص رقم 120{n}: كمية الدهان النهائية 482.3 م²، وسعر البند المتفق عليه 18.75 ريال/م². الحسم والضريبة خارج نطاق الطلب. استخرج مدخلات قيمة هذا البند فقط.',target('line_cost',quantity='482.3',unit_price='18.75',quantity_unit='m2',price_unit='SAR/m2'),'line_cost',split)
 add('عرض توريد خرسانة 34.6 م³؛ وصل عرضان 285 و297 ريال/م³ ولم يعتمد أيهما. لا تختَر سعرًا من عندك. مطلوب قيمة التوريد.',clarify('unit_price'),'line_cost',split)
 add('محضر مساحة وجه واحد: الإجمالي 94.51 م²، وفي مراجعة ثانية 98.15 م²؛ لا توجد مراجعة معتمدة. الفتحات 12.4 م². استخرج مدخلات الصافي.',clarify('gross_m2'),'net_area',split)
 add('حصر تبليط: الصافي 178.3 م²، نسبة الهدر لم تعتمد بعد. رقم العقد 8 وليس نسبة هدر. مطلوب مدخلات كمية الشراء.',clarify('waste_percent'),'add_waste',split)
# dedup cross-split questions: repeated missing scenarios belong only to development
seen=set();unique=[]
for c in cases:
 if c['instruction'] not in seen:seen.add(c['instruction']);unique.append(c)
cases=unique
for split in ['development','frozen']:
 rows=[c for c in cases if c['suite']=='site_style_'+split]
 p=O/(split+'_cases.jsonl');assert not p.exists() or p.read_text()==''.join(json.dumps(c,ensure_ascii=False)+'\n' for c in rows)
 p.write_text(''.join(json.dumps(c,ensure_ascii=False)+'\n' for c in rows))
# Prepare disjoint remediation examples BEFORE inspecting frozen outputs. No test case copied into train.
rng=random.Random(190919);train=[];val=[]
for i in range(256):
 g=D(rng.randrange(100000,900000))/1000
 mode=i%8
 o=g+D(rng.randrange(1,10))/10000 if mode in [0,1,2] else g if mode==3 else D(0) if mode==4 else g*D('0.21')
 gs,os=format(g,'f'),format(o,'f')
 layouts=[f'حصر الواجهة رقم {4000+i}: الإجمالي {gs} م². قياس الفتحات {os} م². احسب صافي هذه الواجهة فقط.',f'Openings survey: {os} m2. Gross wall face: {gs} m2. Extract net area inputs without exchanging field values.',f'المساحة قبل خصم الفتحات {gs} متر مربع؛ الفتحات {os} متر مربع. صافي وجه الدهان مطلوب. رقم السجل {7000+i}.',f'For paint sheet {3000+i}, gross area is {gs} m2 and openings area is {os} m2. Extract only the net-area tool inputs.']
 t=target() if o>g else target('net_area',gross_m2=gs,openings_m2=os)
 if mode==6:
  layouts=[f'إجمالي وجه الدهان {gs} م²، الفتحات لم تقَس بعد. نحتاج الصافي. رقم المحضر {6000+i}.'];t=clarify('openings_m2')
 if mode==7:
  layouts=[f'لوجه واحد إجماليان {gs} و{gs}1 م² ولم يعتمد أي منهما. الفتحات {os} م². استخرج الصافي.'];t=clarify('gross_m2')
 text=layouts[(i//8)%len(layouts)]
 row=dict(id='site-v9-remediation-%03d'%i,instruction=text,input='',system=S,output=json.dumps(t,ensure_ascii=False),source='authored and arithmetic-checked; not real project')
 (val if i%17==0 else train).append(row)
# A representative replay drawn from prior training only.
old=[json.loads(x) for x in (R/'tool_data_units_v8/training.jsonl').read_text().splitlines()];rng.shuffle(old)
train+=old[:336]
assert not {c['instruction'].strip() for c in cases}&{r['instruction'].strip() for r in train+val}
for name,rows in [('training.jsonl',train),('validation.jsonl',val)]:
 (O/name).write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows))
report=dict(development=sum(c['suite']=='site_style_development' for c in cases),frozen=sum(c['suite']=='site_style_frozen' for c in cases),train=len(train),validation=len(val),actual_projects=0,scope='realistic authored scenarios; not independent engineering validation',test_training_exact_overlap=0,source_methods=['https://archive.nptel.ac.in/content/storage2/courses/105103023/module5/lec3/2.html'],source_numbers_used=False,engineering_deployment_allowed=False)
(O/'data_manifest.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
