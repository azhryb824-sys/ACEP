"""Render the Arabic verified-results report. No fitting or model selection."""
from pathlib import Path
import csv
import html
import json

R = Path(__file__).resolve().parent
def read(name): return json.loads((R / name).read_text())
e = read('kaggle-output/evaluation.json')
v = read('verification.json')
p = read('run_provenance.json')
review = read('kaggle-output/input_review.json')
s = read('kaggle-output/selection.json')
assert v['verified']
m = e['diagnostic']
metrics = [('التقديرات ضمن ±10%', 'within10'), ('متوسط الخطأ النسبي المطلق', 'mape'), ('المئين 95 للخطأ', 'p95_ape'), ('متوسط أسوأ 10% من الأخطاء', 'cvar90_ape'), ('أكبر خطأ', 'max_ape')]
rows = ''
for label, key in metrics:
    rows += '<tr><th>' + label + '</th>' + ''.join(f'<td>{e[k][key]:.2%}</td>' for k in ['baseline', 'v13_same_cohort', 'v14_same_cohort', 'diagnostic']) + '</tr>'
rows += '<tr><th>أخطاء تتجاوز 100%</th>' + ''.join(f'<td>{e[k]["over100_count"]}</td>' for k in ['baseline', 'v13_same_cohort', 'v14_same_cohort', 'diagnostic']) + '</tr>'
five = list(csv.DictReader((R / 'kaggle-output/five_projects.csv').open()))
fr = ''
for row in five:
    fr += '<tr><td class="ltr">' + html.escape(row['project_id']) + '</td><td class="ltr">' + html.escape(row['facility']) + '</td>' + ''.join(f'<td>{float(row[k]):,.0f}</td>' for k in ['actual', 'v14_prediction', 'prediction']) + f'<td>{float(row["absolute_percentage_error"]):.2%}</td></tr>'
selected = next(c for c in s['candidates'] if c['name'] == s['selected'])
eligible = sum(c['tail_eligible'] for c in s['candidates'])
doc = f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ACEP v15 — نتائج التحسين</title><style>
*{{box-sizing:border-box}}body{{background:#edf2f4;color:#16333e;font-family:Tahoma,Arial,sans-serif;line-height:1.9;margin:0}}main{{max-width:1080px;background:white;margin:30px auto;padding:40px;border-top:8px solid #08787a;border-radius:9px}}h1{{font-size:29px}}h2{{font-size:21px;color:#08787a;margin-top:28px}}.note{{background:#fff0df;border-right:4px solid #b66d12;padding:15px}}table{{width:100%;border-collapse:collapse;font-size:13px}}td,th{{padding:10px;border-bottom:1px solid #d8e5e8;text-align:right}}thead{{background:#eaf4f4}}.scroll{{overflow:auto}}.ltr{{direction:ltr;text-align:left}}code,a{{overflow-wrap:anywhere}}a{{color:#00739b}}footer{{font-size:13px;border-top:1px solid #ddd;margin-top:25px;padding-top:15px}}@media(max-width:700px){{main{{margin:0;padding:20px 12px}}}}
</style></head><body><main><div>ACEP · الدورة 15 · 20 أكتوبر 2026</div><h1>اختبار أساس المساحة وضبط الأخطاء الشديدة</h1>
<div class="note"><b>نتيجة بحثية تشخيصية؛ لا اعتماد إنتاجي.</b> المشاريع الـ64 سبق تقييمها، ولا يوجد اختبار مستقل جديد. هدف اعتماد المحركات السبعة بنسبة 90% ما زال غير مثبت.</div>
<h2>النتيجة الفعلية</h2><p>اختير <code>{html.escape(e['selected'])}</code> من 37 وصفة، منها {eligible} اجتازت قيود التطوير. حقق {m['within10_count']} من 64 ضمن ±10% ({m['within10']:.2%})، ومتوسط خطأ نسبي {m['mape']:.2%}، وأكبر خطأ {m['max_ape']:.2%}. نجح {e['five_passed']} من المشاريع الخمسة الثابتة. اجتياز جميع البوابات الرقمية: <b>{'نعم' if e['numerical_gates_passed'] else 'لا'}</b>.</p>
<div class="scroll"><table><thead><tr><th>المقياس</th><th>خط الوسيط</th><th>v13</th><th>v14</th><th>v15</th></tr></thead><tbody>{rows}</tbody></table></div>
<p>المقام ثابت: 64، ولا تُحذف الحالات الصعبة أو المعلّمة للمراجعة. المقارنة لا تعزل أثر تعديل واحد، ولا تعني أن بيانات 2025 عادت اختبارًا أعمى.</p>
<h2>خلل موثق في هوية الأعمال</h2><p><b>التقرير الأصلي يصف صفّين منفصلين لأقفاص تدريب البيسبول والسوفتبول في Central School.</b> تطابق المساحة والتكلفة لا يجعلهما تكرارًا؛ حذف أحدهما سابقًا كان خللًا في تعريف العمل. هذا السجل يمثل أكبر خطأ تحقق لدى المرشحين الـ37، ويكشف خلط منشآت رياضية فرعية مع أعمال المباني في المدخلات.</p><p>أعاد تدقيق مستقل استخراج الصفين ووصفهما، واستُعيد السجل المحذوف في نسخة مراجعة تضم 611 سجل تطوير، مع القيم الأصلية ومجموعة المنشأة نفسها. لم تُغيّر نتائج التجربة الجارية. الربط الفردي بين وصفي العمل وصفّي الملخص ما زال غير محسوم، وباقي وصف الأعمال يحتاج تدقيقًا؛ النسخة المقترحة غير مستخدمة للتدريب أو الاعتماد.</p><p><b>هذه الدورة لم تحسّن الدقة.</b> رفضت القيود جميع النماذج الـ36 الجديدة، فاختير الوسيط الاحتياطي. انخفضت بعض مقاييس الأخطاء الشديدة لكن متوسط الخطأ ارتفع، ونسبة النجاح ضمن ±10% أصبحت صفرًا. لا يُرقّى النموذج الاحتياطي، ولا يُخفَّف شرط الاختيار بعد رؤية النتيجة.</p><h2>ما تغير</h2><p>قورنت التكلفة الإجمالية المباشرة بالتكلفة لكل مساحة إجمالية أو صافية، مع مؤشر أسعار السنة السابقة وبدونه. تستخدم المدخلات المساحة الصافية والإجمالية بصورة مستقلة، والنسبة بينهما، والسعة والسنة والنوع والمنطقة والنطاق. استُبعدت حقول المعلمين والفصول من المتنبئات. لم تتغير القيم الأصلية أو العقود أو التقسيمات أو قائمة المشاريع الخمسة.</p>
<p>لم يعد المئين 95 وحده كافيًا: يجب ألا يتجاوز المرشح خط الوسيط في المتوسط والمئين 95 ومتوسط أسوأ 10% وأكبر خطأ وعدد الأخطاء فوق 100%. ويُطبق شرط أكبر خطأ داخل كل طية زمنية. بعد ذلك يكون الترتيب بنسبة النجاح ضمن ±10% ثم المتوسط. تحقق الاختيار على 124 سجلًا في سنوات 2021–2023؛ لم تستخدم نتائج 2024 أو 2025 في الاختيار.</p>
<h2>فحص المدخلات والمصادر</h2><p>علّم الفحص {review['flagged_count']} من 64 سجلًا لمراجعة المدخلات، باستخدام حدود من بيانات التطوير فقط، مع حالات النطاق غير المؤكد والقيم المفقودة. العلامات إشارات مراجعة، وليست كشفًا مؤكدًا لخطأ المصدر أو ضمانًا لدقة الحالات الأخرى.</p>
<p>كشف التقرير المالي الرسمي لشارلوت عن التزام لتركيب وحدات جاهزة في Liberty Elementary بمبلغ 847,434 دولارًا في يونيو 2024. لا يوجد رقم عقد مطابق وتسوية نهائية تربطه بصورة قاطعة بسجل FDOE البالغ 822,037 دولارًا؛ لذلك لم تتغير التكلفة. مساحة Collins بقيت كما نشرها المصدر، وطلب تمويل Marion لا يمثل عقدًا نهائيًا مطابقًا. تفاصيل المطابقة وحدودها محفوظة في الحزمة.</p>
<h2>التشغيل والتحقق</h2><p>توقفت النسخة 19 بسبب مساحة صافية مفقودة أثناء التطوير، قبل الاختيار النهائي والتقييم التشخيصي. أُصلحت المعالجة باستخدام وسيط نسبة الصافي إلى الإجمالي المحسوب داخل طية التدريب فقط. تُحفظ النسبة مع النموذج وتستخدم عند الاستدلال؛ لا تُستبدل قيمة المصدر. لم تتغير المقارنات أو ترتيب الاختيار بعد الفشل.</p>
<p>اكتملت النسخة {p['kaggle_version']} خلال {p['kaggle_runtime_seconds']} ثانية على Kaggle. الملاءمات الناجحة: {e['fits']['sklearn']} للنماذج التقليدية، و{e['fits']['neural']} للشبكات العصبية، و{e['fits']['preprocessors']} للمعالجة المسبقة، و{e['fits']['area_imputers']} لتعويض المساحة، و{e['fits']['medians']} للوسيط. تشمل الأعداد الطيات والبذور. التدريب المحلي: صفر.</p>
<p>أعاد التحقق المستقل حساب المقاييس الـ37 وقيود كل طية والترتيب، وطابق 64 تنبؤًا جديدًا و46 للمعايرة و128 من الإصدارين السابقين، وراجع إشارات المدخلات وبصمات الملفات. بلغ أكبر فرق نسبي في اختبارات تصدير الأوزان {e['export_checks']['max_relative_prediction_difference']:.3g}. تغطية نطاقات 90% الاسمية هي {e['interval']['covered']}/64 ({e['interval']['diagnostic_coverage']:.2%})؛ وهي مختلفة عن دقة التقدير ولا تحمل ضمانًا عبر الزمن.</p>
<h2>المشاريع الخمسة</h2><div class="scroll"><table><thead><tr><th>المعرف</th><th>المشروع</th><th>الفعلي بالدولار</th><th>v14</th><th>v15</th><th>خطأ v15</th></tr></thead><tbody>{fr}</tbody></table></div>
<h2>ما يلزم للاعتماد</h2><p>تظل مطابقة المساحة بنطاق العقد ونوع الإنشاء والمكونات المشمولة غير مكتملة. يلزم جمع سجلات أصلية مؤرخة تربط المخططات والكميات والعقد والمدد ونتائج الجودة والموردين بالمشروع نفسه، ثم تجميد اختبار مستقل. بيانات المدارس الأمريكية والتكلفة الاسمية الحالية لا تثبت تسعيرًا سعوديًا أو جاهزية المحركات السبعة. لم يحدث دمج أو نشر أو ترقية نموذج.</p>
<p><a href="{p['kaggle_log_url']}">سجل Kaggle الخاص</a> · <a href="https://github.com/azhryb824-sys/ACEP/pull/2">مسودة التغيير</a> · الالتزام <code>{p['git_commit']}</code>.</p>
<footer>مصادر البيانات: Florida Department of Education؛ BLS عبر FRED؛ التقرير المالي لمجلس مدارس شارلوت. المراجع الدقيقة والبصمات موجودة في الحزمة. يتضمن الأرشيف أدلة v14 السابقة لتسهيل إعادة الفحص؛ الشيفرة محفوظة في Git.</footer></main></body></html>'''
(R / 'RESULTS_AR.html').write_text(doc)
print(json.dumps({'report': str((R / 'RESULTS_AR.html').resolve()), 'bytes': len(doc.encode())}))
