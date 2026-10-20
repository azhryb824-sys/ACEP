"""Second code path checks supplied values and exact quote spans in new call data.
Restricted to these authored templates; this is not independent engineer review.
"""
from pathlib import Path
from decimal import Decimal as D
import re,json
R=Path('/kaggle/working/acep-engineering-v1');O=R/'tool_data_qwen3_v7'
T=str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹٫','01234567890123456789.')
N=r'([0-9]+(?:\.[0-9]+)?)'
rows=[json.loads(x) for x in (O/'supplement_audit.jsonl').read_text().splitlines()]+[json.loads(x) for x in (O/'validation_targets.jsonl').read_text().splitlines()]
checks=[];errors=[]
for row in rows:
 t=row['target']
 if t['action']!='call':continue
 text=row['instruction'];s=text.translate(T);a=t['arguments'];evidence={}
 def check(field,patterns,scale=D(1),word_zero=False):
  hits=[]
  for pattern in patterns:
   for m in re.finditer(pattern,s):
    value=D(m.group(1))*scale
    if value==D(str(a[field])):hits.append(m)
  if word_zero and D(str(a[field]))==0:
   hits += list(re.finditer(r'(?:سعر الوحدة صفر|بسعر 0|سعره صفر|سعر المتر المربع 0|المعتمد 0|الوحدة صفر)',s))
  if not hits:raise ValueError('no source for '+field)
  m=hits[0];evidence[field]=dict(quote=text[m.start():m.end()],start=m.start(),end=m.end(),normalized_value=str(a[field]))
 tool=t['tool']
 try:
  if tool=='line_cost':
   check('quantity',[N+r'\s*(?:م²|متر مربع)'])
   check('unit_price',[N+r'\s*(?:ريال|ر\.س)'],word_zero=True)
   result=D(a['quantity'])*D(a['unit_price'])
  elif tool=='net_area':
   check('gross_m2',[r'الإجمالية\s*'+N+r'\s*م²'])
   check('openings_m2',[r'خصمها\s*'+N+r'\s*م²'])
   result=D(a['gross_m2'])-D(a['openings_m2'])
  elif tool=='add_waste':
   check('net_quantity',[r'الصافي\s*'+N+r'\s*م²'])
   check('waste_percent',[r'القص\s*'+N+r'\s*%'])
   result=D(a['net_quantity'])*(1+D(a['waste_percent'])/100)
  else:
   check('length_m',[r'(?:الطول|الامتداد الطولي)\s*'+N+r'\s*سم',N+r'\s*سنتيمتر للطول'],D('.01'))
   check('width_m',[r'(?:العرض|الامتداد العرضي)\s*'+N+r'\s*سنتيمتر',N+r'\s*سم للعرض'],D('.01'))
   check('height_m',[r'الرأسي\s*'+N+r'\s*مليمتر',N+r'\s*مم للسماكة'],D('.001'))
   expected=2 if re.search(r'عمودان|كمرتان',s) else 1 if 'عنصر مستطيل واحد' in s else None
   assert expected==a['count']
   m=re.search(r'عمودان|كمرتان|عنصر مستطيل واحد',s);evidence['count']=dict(quote=text[m.start():m.end()],start=m.start(),end=m.end(),normalized_value=expected)
   result=D(a['length_m'])*D(a['width_m'])*D(a['height_m'])*a['count']
  assert result==D(row['reference'])
  for v in evidence.values():assert text[v['start']:v['end']]==v['quote']
  checks.append(dict(id=row['id'],fields=evidence,reference_checked=True))
 except Exception as e:errors.append(dict(id=row['id'],error=str(e),instruction=text))
decisions=[]
for row in rows:
 t=row['target']
 if t['action']=='call':continue
 text=row['instruction'];s=text.translate(T);family=row['family']
 try:
  if t['action']=='invalid_input':
   if family in ['negative_price','negative_waste']:
    m=re.search(r'(?:سالب|ناقص)\s*'+N,s);assert m and D(m.group(1))>0
   elif family=='zero_height':
    m=re.search(r'الرأسي\s*'+N+r'\s*مليمتر',s);assert m and D(m.group(1))==0
   elif family=='excess_openings':
    m=re.search(r'الإجمالية\s*'+N,s);o=re.search(r'خصمها\s*'+N,s);assert m and o and D(o.group(1))>D(m.group(1))
   else:raise ValueError('Unsupported invalid family')
   evidence=dict(quote=text[m.start():m.end()],start=m.start(),end=m.end())
  else:
   if family=='waste_both_missing':assert sorted(t['missing_fields'])==['net_quantity','waste_percent'] and 'الصافي لم يصل' in s and 'لم تعتمد' in s
   elif family=='cost_both_missing':assert sorted(t['missing_fields'])==['quantity','unit_price'] and 'كمية الطلب غير معروفة' in s and 'لم يصل' in s
   elif family=='two_dimensions_missing':assert sorted(t['missing_fields'])==['height_m','width_m'] and 'والارتفاع لم يقاسا' in s
   else:raise ValueError('Unsupported clarification family')
   evidence=dict(quote=text,start=0,end=len(text))
  assert text[evidence['start']:evidence['end']]==evidence['quote']
  decisions.append(dict(id=row['id'],action=t['action'],evidence=evidence))
 except Exception as e:errors.append(dict(id=row['id'],error=str(e),instruction=text))
report=dict(records=len(rows),call_records=len(checks),source_checks_passed=len(checks),non_call_decisions_checked=len(decisions),total_passed=len(checks)+len(decisions),errors=errors,scope='second restricted code path for new authored templates only',independent_engineer_review=False,training_data_modified=False)
(O/'source_binding_audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
(O/'source_binding_evidence.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in checks+decisions))
print('V7_SOURCE_AUDIT',json.dumps(report,ensure_ascii=False),flush=True)
assert not errors
