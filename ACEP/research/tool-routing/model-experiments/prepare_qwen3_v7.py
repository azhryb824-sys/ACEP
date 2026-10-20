"""Balanced fact-bound contrast data; authored development, no engineering claims."""
from pathlib import Path
from decimal import Decimal as D
from collections import Counter
import json,hashlib,re,random,unicodedata,sys
R=Path('/kaggle/working/acep-engineering-v1');O=R/'tool_data_qwen3_v7';O.mkdir(exist_ok=True)
S=(R/'qwen3_v7_plan/system_prompt.txt').read_text()
sys.path.insert(0,str(R/'tool_contract_gate_v1'));from contract_gate import gate

def num(x):return format(D(str(x)),'f')
def norm(s):
 s=unicodedata.normalize('NFKC',s).translate(str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹٫','01234567890123456789.'))
 return re.sub(r'\s+',' ',s).strip().lower()
def target(tool=None,args=None,missing=None,invalid=False):
 return dict(action='invalid_input' if invalid else 'clarify' if missing else 'call',tool=None if missing or invalid else tool,arguments={} if missing or invalid else args,missing_fields=missing or [])
def make(i,f,validation=False):
 # Disjoint values, with document IDs independent of every supplied tool number.
 j=i+(1000 if validation else 0);q=num(D('43.217')+D(j)*D('1.137'));p=num(D('18.625')+D(j)*D('.713'));g=num(D('92.731')+D(j)*D('1.419'));w=num(D('2.125')+D(j%31)*D('.125')+(D('.003') if validation else D('0')))
 L=num(D('421')+j*D('1.25'));W=num(D('213')+j*D('.75'));H=num(D('131')+j%53);doc=8000+j*7
 args=None;missing=None;invalid=False;tool=None
 # Clause ordering and labels vary independently of action validity.
 z=i%6
 costq=[f'الكمية النهائية {q} م²',f'حصر التوريد: {q} متر مربع',f'{q} م² هي كمية الشراء المعتمدة',f'سنورد بلاطًا بمساحة {q} م²',f'الطلب النهائي بعد الهدر {q} م²',f'كمية بند التوريد = {q} م²'][z]
 price=[f'سعر المتر المربع {p} ريال',f'التسعير {p} ريال/م²',f'{p} ريال لكل متر مربع',f'وحدة التوريد بسعر {p} ريال/م²',f'المورد يعتمد {p} ريال للمتر المربع',f'سعر الوحدة = {p} ر.س/م²'][z]
 if f in ['zero_price','positive_price','negative_price']:
  tool='line_cost';v='0' if f=='zero_price' else p
  if f=='zero_price':price=['سعر الوحدة صفر ريال/م²','التوريد هدية بسعر 0 ريال للمتر','المتر المربع مجانًا؛ سعره صفر','سعر المتر المربع ٠ ريال','التسعير المعتمد 0 ر.س/م²','لا مقابل للتوريد؛ سعر الوحدة صفر'][z]
  if f=='negative_price':price=f'سعر الوحدة {"سالب" if i%2 else "ناقص"} {p} ريال/م²';invalid=True
  clauses=[costq,price];args=dict(quantity=q,unit_price=v,quantity_unit='m2',price_unit='SAR/m2');request='قيمة التوريد فقط دون إضافات أو هدر جديد.'
 elif f in ['equal_openings','less_openings','excess_openings']:
  tool='net_area';o=g if f=='equal_openings' else num(D(g)-D('.125')) if f=='less_openings' else num(D(g)+D('.125'))
  clauses=[f'مساحة الوجه الإجمالية {g} م²',f'مساحة الفتحات المطلوب خصمها {o} م²'];args=dict(gross_m2=g,openings_m2=o);invalid=f=='excess_openings';request='المطلوب صافي الوجه دون جوانب الفتحات.'
 elif f in ['negative_waste','valid_waste','zero_net']:
  tool='add_waste';n='0' if f=='zero_net' else q;waste=f'{"سالب" if i%2 else "ناقص"} {w}' if f=='negative_waste' else w
  clauses=[f'احتياج البلاط الصافي {n} م²',f'بدل القص {waste}% من الصافي'];args=dict(net_quantity=n,waste_percent=w,unit='m2');invalid=f=='negative_waste';request='أريد كمية الشراء بعد الزيادة دون تقريب لعبوات.'
 elif f in ['zero_height','vertical_height','mixed_units','dual_volume']:
  tool='rectangular_volume';h='0' if f=='zero_height' else H;cnt=2 if f=='dual_volume' else 1
  if f=='mixed_units':clauses=[f'{L} سنتيمتر للطول',f'{W} سم للعرض',f'{h} مم للسماكة']
  else:clauses=[f'الطول {L} سم',f'العرض {W} سنتيمتر',f'البعد الرأسي {h} مليمتر']
  entity=['عمودان مستطيلان متطابقان منفصلان','كمرتان مستطيلتان متطابقتان منفصلتان'][i%2] if cnt==2 else 'عنصر مستطيل واحد'
  request=entity+'؛ احسب الحجم الهندسي بلا فتحات أو تداخل أو هدر.'
  args=dict(length_m=num(D(L)/100),width_m=num(D(W)/100),height_m=num(D(h)/1000),count=cnt);invalid=f=='zero_height'
 elif f=='waste_both_missing':
  clauses=['حصر الصافي لم يصل','نسبة بدل القص لم تعتمد'];missing=['net_quantity','waste_percent'];request='أريد كمية شراء البلاط شاملة الهدر دون تقريب.'
 elif f=='cost_both_missing':
  clauses=['كمية الطلب غير معروفة','عرض سعر المتر لم يصل'];missing=['quantity','unit_price'];request='المطلوب إجمالي تكلفة توريد البلاط فقط.'
 elif f=='two_dimensions_missing':
  clauses=[f'عنصر مستطيل واحد طوله {L} سم','العرض والارتفاع لم يقاسا'];missing=['width_m','height_m'];request='استخرج مدخلات حساب الحجم.'
 else:raise ValueError(f)
 if i%2:clauses=clauses[::-1]
 sep=['؛ ','، ',' | ','\n',' / ','؛ ثم '][z]
 prefix=['رقم المستند','رقم المحضر','معرّف الطلب','كشف رقم','رقم الموقع','مرجع البند'][z]+f' {doc}. '
 text=prefix+sep.join(clauses)+'. '+request if i%3 else request+' '+sep.join(clauses)+'. '+prefix
 if validation:
  # Distinct wrapper and labels; still authored, related task families.
  text='راجع البيانات المرسلة من الموقع ولا تفترض أي قيمة: '+text.replace('المطلوب','نحتاج').replace('الطول','الامتداد الطولي').replace('العرض','الامتداد العرضي')+' أعد قرار الأداة والحقول فقط.'
 if i%4==2:text=text.translate(str.maketrans('0123456789','٠١٢٣٤٥٦٧٨٩'))
 t=target(tool,args,missing,invalid)
 assert gate(t)['status']!='blocked',(text,t)
 r=dict(id=f'qwen3-v7-{"val" if validation else "train"}-{f}-{i:03}',family=f,instruction=text,target=t,source='authored contrast; supplied geometry and prices only',facts=dict(document_id=doc))
 if t['action']=='call':
  a=t['arguments'];r['reference']=num(D(a['length_m'])*D(a['width_m'])*D(a['height_m'])*a['count']) if tool=='rectangular_volume' else num(D(a['gross_m2'])-D(a['openings_m2'])) if tool=='net_area' else num(D(a['net_quantity'])*(1+D(a['waste_percent'])/100)) if tool=='add_waste' else num(D(a['quantity'])*D(a['unit_price']))
 return r
families=['zero_price','positive_price','negative_price','equal_openings','less_openings','excess_openings','negative_waste','valid_waste','zero_net','zero_height','vertical_height','mixed_units','dual_volume','waste_both_missing','cost_both_missing','two_dimensions_missing']
supp=[make(i,f) for f in families for i in range(48)]
val=[make(i+100,f,True) for f in families for i in range(6)]
old=[json.loads(s) for s in (R/'tool_data_pilot_v6/training.jsonl').read_text().splitlines()]
training=[dict(id=r.get('id',f'retained-{i}'),instruction=r['instruction'],input=r.get('input',''),system=S,output=r['output']) for i,r in enumerate(old)]
training +=[dict(id=r['id'],instruction=r['instruction'],input='',system=S,output=json.dumps(r['target'],ensure_ascii=False,sort_keys=True)) for r in supp]
validation=[dict(id=r['id'],instruction=r['instruction'],input='',system=S,output=json.dumps(r['target'],ensure_ascii=False,sort_keys=True)) for r in val]
assert len(training)==1704 and len(validation)==96
assert all(gate(json.loads(r['output']))['status']!='blocked' for r in training+validation)
def call_key(t):
 if t['action']!='call':return None
 a={k:num(v) if k not in {'unit','quantity_unit','price_unit'} else v for k,v in t['arguments'].items()}
 return json.dumps([t['tool'],a],sort_keys=True)
assert not {call_key(json.loads(r['output'])) for r in training if json.loads(r['output'])['action']=='call'} & {call_key(r['target']) for r in val if r['target']['action']=='call'}
assert len({norm(r['instruction']) for r in training})==len(training)
assert not {norm(r['instruction']) for r in training}&{norm(r['instruction']) for r in validation}
# Old evaluation questions remain outside training.
known=[]
for p in [R/'v6_experiment/evaluation_cases.jsonl',R/'v6_frozen_probe/cases.jsonl']:
 if p.exists():known +=[json.loads(x) for x in p.read_text().splitlines()]
assert not {norm(r['instruction']) for r in supp}&{norm(r.get('instruction',r.get('text',''))) for r in known}
random.Random(7301).shuffle(training)
for name,rows in [('training.jsonl',training),('validation.jsonl',validation),('validation_targets.jsonl',val),('supplement_audit.jsonl',supp)]:
 p=O/name;text=''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows)
 if p.exists():assert p.read_text()==text
 else:p.write_text(text)
report=dict(training=len(training),retained=len(old),new_contrast=len(supp),validation=len(val),families=Counter(r['family'] for r in supp),actions=Counter(json.loads(r['output'])['action'] for r in training),normalized_question_overlap=0,independent_target_review=False,independent_hard_test=False,scope='four elementary tools; authored development only',files_sha256={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in O.glob('*.jsonl')})
(O/'preflight.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
