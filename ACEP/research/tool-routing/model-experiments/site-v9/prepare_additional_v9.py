from pathlib import Path
import json
from decimal import Decimal as D
R=Path('/kaggle/working/acep-engineering-v1');O=R/'v9_site';S=(R/'v8_units/system_prompt_v3.txt').read_text()
rows=[json.loads(x) for x in (O/'training.jsonl').read_text().splitlines()]
if len(rows)==576:
 for i in range(64):
  if i%2==0:
   g=str(D(18217+i*193)/100);o=str(D(183+i*3)/100)
   text=f'Wall A gross area {g} m2; its openings {o} m2. Wall B area 43.8 m2 belongs to a different bill and must not be included. Extract net-area inputs for wall A alone. Reference {9140+i}.'
   t=dict(action='call',tool='net_area',arguments=dict(gross_m2=g,openings_m2=o),missing_fields=[])
  else:
   q=str(D(2175+i*67)/100);p=211+i
   text=f'طلب توريد خرسانة {q} متر مكعب. ورد تسعيران {p} و{p+13} ريال لكل متر مكعب ولم يعتمد أي عرض بعد. احسب قيمة التوريد فقط مع طلب المعلومة غير المحسومة.'
   t=dict(action='clarify',tool=None,arguments={},missing_fields=['unit_price'])
  rows.append(dict(id='site-v9-context-%03d'%i,instruction=text,input='',system=S,output=json.dumps(t,ensure_ascii=False),source='authored remediation after development review'))
 (O/'training.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows))
assert len(rows)==640
m=json.loads((O/'data_manifest.json').read_text());m['train']=640;m['remediation_after_development_review']=64;(O/'data_manifest.json').write_text(json.dumps(m,indent=2))
# Two requests adapted from one published manufacturer worked example. Converted measurements are explicit.
source='https://www.quikrete.com/dealers/training/presentations/3-mixing-placing-concrete-cement-mixes-training.pdf'
cs=[]
for i,(h,ref) in enumerate([('0.1016','0.56633693184'),('0.1143','0.63712904832')]):
 text=f'من مثال بلاطة QUIKRETE التعليمية بعد تحويل الأبعاد إلى المتر: بلاطة واحدة طولها 3.048 م وعرضها 1.8288 م وسمكها {h} م. استخرج مدخلات حجم البلاطة الهندسي فقط دون هدر أو أكياس.'
 t=dict(action='call',tool='rectangular_volume',arguments=dict(length_m='3.048',width_m='1.8288',height_m=h,count=1),missing_fields=[])
 assert D('3.048')*D('1.8288')*D(h)==D(ref)
 cs.append(dict(id='site-v9-published-%02d'%i,suite='published_example',family='rectangular_volume',instruction=text,target=t,source=source,source_page=11+i,reference_volume_m3=ref,notes='one shared slab example, metric-normalized; second uses published average thickness; not two real projects'))
(O/'published_cases.jsonl').write_text(''.join(json.dumps(c,ensure_ascii=False)+'\n' for c in cs))
print('READY',len(rows),'published',len(cs))
