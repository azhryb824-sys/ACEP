from pathlib import Path
import json,zipfile,hashlib,os
from decimal import Decimal
R=Path('/kaggle/working/acep-engineering-v1');D=R/'v9_site'
assert (D/'pipeline_completed.json').exists()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(R/'qlora_units_v8/adapter/adapter_model.safetensors')=='82c96b3399c105e3df3aa285e4b24da45fcc693b10cbdaddcc4952ad04e09944'
assert sha(R/'qlora_qwen3_v7/adapter/adapter_model.safetensors')=='38882574197bd06f2f6acc30a269e5bb5341c0a9b40715660f91bc549d5f93a3'
summary=dict(scope='bounded four-tool extraction; authored site workflows and two variants of one published manufacturer example; no real project records or expert certification',default_model='v7',training=json.loads((R/'qlora_site_v9/completed.json').read_text()),data=json.loads((D/'data_manifest.json').read_text()),selection=json.loads((D/'selection_before_frozen.json').read_text()),comparisons={},engineering_deployment_allowed=False)
for suite in ['development','published','frozen']:
 summary['comparisons'][suite]={}
 for v in ['v8','v9']:
  r=json.loads((D/(v+'_'+suite)/'report.json').read_text());summary['comparisons'][suite][v]={k:r[k] for k in ['total','exact','contract_valid','incorrect_contract_valid_calls','calls_on_missing']}
rs=[json.loads(x) for x in (D/'v9_regression_merged.jsonl').read_text().splitlines()]
summary['regression_per_tool']={t:dict(total=len([r for r in rs if r['family']==t]),exact=sum(r['exact'] for r in rs if r['family']==t)) for t in sorted({r['family'] for r in rs})}
summary['regression_failures']=[r for r in rs if not r['exact']]
summary['v7_default_development']=json.loads((D/'v7_development/report.json').read_text())
summary['v7_comparison_note']='v7 uses its original retained prompt/contract; causal training comparison is v8 vs v9 with unchanged prompt v3 and contract v2'
refs={c['id']:c for c in map(json.loads,(D/'published_cases.jsonl').read_text().splitlines())}
summary['published_arithmetic_check']={}
for v in ['v8','v9']:
 checks=[]
 for r in map(json.loads,(D/(v+'_published')/'predictions.jsonl').read_text().splitlines()):
  p=r['prediction'];value=None
  if r['contract_valid'] and isinstance(p,dict) and p.get('action')=='call' and p.get('tool')=='rectangular_volume':
   a=p['arguments'];value=Decimal(str(a['length_m']))*Decimal(str(a['width_m']))*Decimal(str(a['height_m']))*Decimal(str(a['count']))
  expected=Decimal(refs[r['id']]['reference_volume_m3']);checks.append(dict(id=r['id'],expected_volume_m3=str(expected),calculated_from_proposal_m3=str(value) if value is not None else None,matched=value==expected,scope='offline arithmetic audit, not execution authorization'))
 summary['published_arithmetic_check'][v]=checks
(D/'final_report.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
s=(R/'infer_acep_research.py').read_text()
s=s.replace("p.add_argument('--candidate-v8',action='store_true');a=p.parse_args()","g=p.add_mutually_exclusive_group();g.add_argument('--candidate-v8',action='store_true');g.add_argument('--candidate-v9',action='store_true');a=p.parse_args()")
s=s.replace("version='v8' if a.candidate_v8 else selection['selected']","version='v9' if a.candidate_v9 else 'v8' if a.candidate_v8 else selection['selected']")
s=s.replace("'qlora_units_v8' if version=='v8' else 'qlora_qwen3_v7'","'qlora_site_v9' if version=='v9' else 'qlora_units_v8' if version=='v8' else 'qlora_qwen3_v7'")
s=s.replace("if version=='v8' else", "if version in ['v8','v9'] else")
compile(s,'infer_acep_research.py','exec');(R/'infer_acep_research.py').write_text(s)
readme='''ACEP v9 — تدريب بحثي على سياقات الموقع\nهذه محولات LoRA وليست نموذج أساس مستقلًا. يتطلب التشغيل Python وtorch وtransformers وpeft وGPU، وتنزيل Qwen3-4B بالنسخة المثبتة في identity.json.\nالنموذج العام الافتراضي يبقى v7. --candidate-v9 و--candidate-v8 مرشحان بحثيان، ولا ينفذ سكربت الاستدلال أدوات أو يعتمد حسابات هندسية.\nاختبار الموقع: 18 حالة تطوير +9 حالات مجمدة، مؤلفة تحاكي سياقات العمل، وليست مشروعات منفذة. توجد صياغتان متريتان لمثال بلاطة واحد منشور من QUIKRETE، وليستا مشروعين مستقلين. القوالب مترابطة ولا يوجد فصل دلالي مستقل أو تحكيم هندسي.\nالتدريب: 640 سجلًا (336 احتفاظ +240 حدود مساحة +64 معالجة سياق)، 16 تحقق، دورة واحدة،80 خطوة،LR1e-5. اختيرت أمثلة المعالجة بعد مراجعة التطوير، بينما لم تدخل أسئلة الاختبار أو المجمد إلى التدريب.\nتفاصيل النتائج الخام والاختيار داخل v9_site/final_report.json وملفات predictions.jsonl. لا تستنتج نسبة دقة هندسية شاملة من نجاح الاستخراج.\nمثال تشغيل: python infer_acep_research.py 'إجمالي وجه الدهان 80 م² والفتحات 12 م²؛ استخرج مدخلات الصافي' --candidate-v9\nالمثال المنشور: https://www.quikrete.com/dealers/training/presentations/3-mixing-placing-concrete-cement-mixes-training.pdf صفحات11–12؛ القياسات حُوّلت إلى المتر صراحة، ولم يُختبر تصميم البلاطة أو أكياس الخرسانة.\n'''
(R/'README_V9_AR.txt').write_text(readme)
base=Path('/kaggle/working/ACEP_v8_units_research_complete.zip')
with zipfile.ZipFile(base) as z:names=set(z.namelist())
for folder in [D,R/'qlora_site_v9/adapter']:
 for p in folder.rglob('*'):
  if p.is_file() and '__pycache__' not in p.parts:names.add(str(p.relative_to(R)))
for name in ['train_site_v9.py','evaluate_site_v9.py','run_site_v9_pipeline.py','finalize_site_v9.py','prepare_site_v9.py','prepare_additional_v9.py','build_training_v9.py','README_V9_AR.txt']:names.add(name)
# Completed training metrics included, optimizer checkpoints deliberately excluded.
names.add('qlora_site_v9/completed.json')
names.discard('V9_MANIFEST.json')
manifest={name:sha(R/name) for name in sorted(names)}
(R/'V9_MANIFEST.json').write_text(json.dumps(manifest,indent=2))
archive=Path('/kaggle/working/ACEP_v9_site_research_complete.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for name in sorted(names|{'V9_MANIFEST.json'}):z.write(R/name,name)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for name,digest in manifest.items():assert hashlib.sha256(z.read(name)).hexdigest()==digest,name
receipt=dict(file=archive.name,bytes=archive.stat().st_size,sha256=sha(archive),files=len(names)+1)
(D/'archive_receipt.json').write_text(json.dumps(receipt,indent=2));print('FINAL_REPORT',json.dumps(summary,ensure_ascii=False));print('ARCHIVE',json.dumps(receipt))
from IPython.display import display,FileLink
os.chdir('/kaggle/working');display(FileLink(archive.name))
