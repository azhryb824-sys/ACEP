#!/usr/bin/env python3
"""ACEP AI Data Factory - Generate synthetic engineering datasets for all 10 domains."""
import json, os, random, math, hashlib
from datetime import datetime, timedelta

BASE = os.path.join(os.path.dirname(__file__), '..', 'datasets')
DOMAINS = ["engineering_llm","quantity_ai","cost_ai","planning_ai","procurement_ai",
           "contract_ai","drawing_ai","quality_ai","safety_ai","risk_ai"]
SEED = 42
random.seed(SEED)

# ─── Construction Knowledge Base ───
PROJECT_TYPES = ["Villa","Apartment_Building","Residential_Tower","Hospital","Hotel","School","Mosque","Mall","Office_Building","Factory","Warehouse","Bridge","Road"]
CITIES_AR = ["الرياض","جدة","الخبر","مكة","المدينة","أبها","تبوك","بريدة","الدمام","حائل"]
CITIES_EN = ["Riyadh","Jeddah","Khobar","Makkah","Madinah","Abha","Tabuk","Buraydah","Dammam","Hail"]
FINISHING = ["Standard","Good","Premium","Luxury"]
MATERIALS = ["Concrete","Steel","Cement","Block","Tiles","Paint","Aluminum","Glass","Plumbing","Electrical","HVAC","Waterproofing"]
UNITS_MAP = {"Concrete":"m3","Steel":"ton","Cement":"ton","Block":"m2","Tiles":"m2","Paint":"L","Aluminum":"m2","Glass":"m2","Plumbing":"no","Electrical":"no","HVAC":"unit","Waterproofing":"m2"}

def pid(): return f"PROJ-{random.randint(10000,99999)}"
def fmt(n): return round(n, 2)

def make_instruction(system, instruction, response, domain="engineering_llm"):
    return {
        "id": hashlib.md5((system+instruction+response+str(random.random())).encode()).hexdigest()[:16],
        "domain": domain,
        "system": system,
        "instruction": instruction,
        "output": response,
        "source": "ACEP-Data-Factory-v1",
        "created": datetime.now().isoformat()
    }

# ═══ DOMAIN 1: Engineering LLM ═══
def gen_engineering_llm(n=200):
    samples = []
    for _ in range(n):
        pt = random.choice(PROJECT_TYPES)
        city = random.choice(CITIES_AR)
        area = random.randint(300, 50000)
        floors = random.randint(1, 30)
        fin = random.choice(FINISHING)
        cost = area * floors * random.randint(2000, 6000)
        dur = random.randint(6, 48)

        q_types = [
            f"ما هي تكلفة بناء {pt} بمساحة {area} م² و {floors} أدوار في {city}؟",
            f"احسب كمية الخرسانة والحديد لمشروع {pt} مساحة {area} م²",
            f"قارن بين التشطيب {fin} والتشطيب Standard لمشروع {pt}",
            f"ما هي مدة تنفيذ {pt} بمساحة {area} م² في {city}؟",
            f"احسب تكلفة العمالة لمشروع {pt} بـ {floors} أدوار في {city}",
            f"Estimate the concrete volume for a {pt} with area {area} m² and {floors} floors in {city}",
            f"Calculate steel reinforcement for a {pt} building with area {area} m²",
            f"Compare cost between {fin} and Standard finishing for a {pt}"
        ]
        q = random.choice(q_types)
        concrete = fmt(area * floors * random.uniform(0.2, 0.4))
        steel = fmt(concrete * random.uniform(0.08, 0.14))
        cost_per_m2 = random.randint(2000, 6000)
        labor_pct = random.uniform(0.25, 0.35)
        material_pct = random.uniform(0.40, 0.55)

        if "تكلفة" in q or "cost" in q.lower() or "Calculate" in q:
            resp = f"تقدير التكلفة لمشروع {pt} بمساحة {area} م² و {floors} أدوار:\n"
            resp += f"- المساحة الإجمالية: {area * floors:,} م²\n-تكلفة المتر المربع: {cost_per_m2:,} ريال/م²\n"
            resp += f"- التكلفة الإجمالية التقديرية: {cost:,} ريال\n- مدة التنفيذ: {dur} شهر\n"
            resp += f"- نسبة العمالة: {labor_pct*100:.0f}% | المواد: {material_pct*100:.0f}%\n"
            resp += f"المرجع: متوسط أسعار السوق السعودي 2024-2026"
        elif "خرسانة" in q or "حديد" in q or "concrete" in q.lower() or "steel" in q.lower():
            resp = f"تقدير كميات الخرسانة والحديد لمشروع {pt}:\n"
            resp += f"- حجم الخرسانة: {concrete} م³\n- كمية الحديد: {steel} طن\n"
            resp += f"- نسبة الحديد: {fmt(steel/concrete*1000)} كجم/م³\n"
            resp += f"المرجع: SBC 301, ACI 318-19"
        elif "مدة" in q or "duration" in q.lower():
            resp = f"جدول زمني تقديري لمشروع {pt}:\n- مدة التنفيذ: {dur} شهر ({dur*22} يوم عمل)\n"
            resp += f"- الأعمال الترابية: شهر | الأساسات: {max(2,dur//6)} أشهر\n"
            resp += f"- الهيكل الخرساني: {max(3,dur//4)} أشهر | التشطيب: {max(3,dur//4)} أشهر\n"
            resp += f"- نسبة الإنجاز الأسبوعي المتوقعة: {fmt(100/dur/4.3)}%"
        else:
            resp = f"تحليل ومقارنة لمشروع {pt}:\nالتشطيب {fin}: تكلفة أعلى بنسبة {random.randint(20,80)}% من Standard\n"
            resp += f"جودة أعلى، عمر افتراضي أطول، صيانة أقل"

        samples.append(make_instruction(
            "أنت مستشار هندسي متخصص في التشييد والبناء. أجب بالعربية.", q, resp, "engineering_llm"))
    return samples

# ═══ DOMAIN 2: Quantity AI ═══
def gen_quantity_ai(n=200):
    samples = []
    for _ in range(n):
        pt = random.choice(PROJECT_TYPES)
        area = random.randint(200, 20000)
        floors = random.randint(1, 30)
        total_area = area * floors
        mat = random.choice(MATERIALS)
        qty = fmt(total_area * random.uniform(0.05, 1.5))
        waste = random.uniform(0.03, 0.10)
        unit = UNITS_MAP[mat]

        q = random.choice([
            f"احسب كمية {mat} لمشروع {pt} مساحة {area} م² و {floors} أدوار",
            f"كم يحتاج مشروع {pt} من {mat} مع نسبة هدر {waste*100:.0f}%؟",
            f"Estimate {mat} quantity for a {pt} with area {area} m²",
            f"BOQ item: {mat} for {pt} project, area {total_area} m²"
        ])
        resp = f"تقدير كمية {mat} لمشروع {pt}:\n- الكمية الصافية: {qty} {unit}\n"
        resp += f"- نسبة الهدر: {waste*100:.0f}%\n- الكمية الإجمالية مع الهدر: {fmt(qty*(1+waste))} {unit}\n"
        resp += f"- سعر الوحدة التقديري: {random.randint(20,3500)} ريال/{unit}\n"
        resp += f"- إجمالي التكلفة: {fmt(qty * random.randint(20,3500))} ريال\n"
        resp += f"المرجع: جداول الكميات النموذجية لمشاريع المملكة"

        samples.append(make_instruction("أنت مهندس كميات محترف. احسب الكميات بدقة.", q, resp, "quantity_ai"))
    return samples

# ═══ DOMAIN 3: Cost AI ═══
def gen_cost_ai(n=200):
    samples = []
    for _ in range(n):
        pt = random.choice(PROJECT_TYPES)
        city = random.choice(CITIES_AR)
        area = random.randint(300, 30000)
        floors = random.randint(1, 30)
        mat_cost = area * floors * random.randint(500, 2500)
        labor_cost = mat_cost * random.uniform(0.25, 0.40)
        equip_cost = mat_cost * random.uniform(0.08, 0.18)
        direct = mat_cost + labor_cost + equip_cost
        indirect = direct * random.uniform(0.10, 0.20)
        total = direct + indirect

        q = random.choice([
            f"احسب تكلفة مشروع {pt} في {city} مساحة {area} م²",
            f"Cost estimation for {pt} in {city}: area {area} m², {floors} floors",
            f"حلل تكاليف مشروع {pt} واعط breakdown كامل",
            f"ما هي تكلفة المواد vs العمالة لمشروع {pt}؟"
        ])
        resp = f"تقدير التكاليف لمشروع {pt} في {city}:\n\n"
        resp += f"1. التكاليف المباشرة:\n   - المواد: {mat_cost:,.0f} ريال ({mat_cost/direct*100:.0f}%)\n"
        resp += f"   - العمالة: {labor_cost:,.0f} ريال ({labor_cost/direct*100:.0f}%)\n"
        resp += f"   - المعدات: {equip_cost:,.0f} ريال ({equip_cost/direct*100:.0f}%)\n"
        resp += f"2. التكاليف غير المباشرة: {indirect:,.0f} ريال\n"
        resp += f"3. التكلفة الإجمالية: {total:,.0f} ريال\n"
        resp += f"4. تكلفة المتر المربع: {fmt(total/(area*floors)):,.0f} ريال/م²\n"
        resp += f"المرجع: متوسط أسعار السوق السعودي 2024-2026، مؤشر تكاليف التشييد"

        samples.append(make_instruction("أنت خبير تقدير تكاليف. قدم تحليل دقيق.", q, resp, "cost_ai"))
    return samples

# ═══ DOMAIN 4: Planning AI ═══
def gen_planning_ai(n=200):
    samples = []
    for _ in range(n):
        pt = random.choice(PROJECT_TYPES)
        area = random.randint(500, 50000)
        floors = random.randint(1, 50)
        dur = random.randint(4, 60)
        method = random.choice(["Traditional","Precast","SteelFrame","ICF","AAC","PostTension"])

        q = random.choice([
            f"ضع جدول زمني لمشروع {pt} بمساحة {area} م² و {floors} أدوار",
            f"Schedule a {pt} construction project: {area} m², {floors} floors",
            f"ما هي critical path لمشروع {pt}؟",
            f"قارن بين طريقة {method} والطريقة التقليدية للمشروع"
        ])
        resp = f"الجدول الزمني لمشروع {pt}:\nالمدة الإجمالية: {dur} شهراً ({dur*22} يوم)\n"
        resp += f"\nالأنشطة الرئيسية:\n"
        phases = [("Site Preparation", 0.08), ("Foundation", 0.15), ("Structural Frame", 0.25),
                  ("MEP Rough-in", 0.12), ("Masonry & Block", 0.08), ("Plaster & Finishing", 0.10),
                  ("Flooring & Tiles", 0.06), ("Painting & Decoration", 0.04), ("Commissioning", 0.03)]
        for name, w in phases:
            d = max(1, int(dur * w * 22))
            resp += f"  - {name}: {d} يوم\n"
        resp += f"\nالمسار الحرج (Critical Path): Site Preparation → Foundation → Structural Frame → Finishing → Commissioning\n"
        resp += f"طريقة التنفيذ المقترحة: {method}\n"
        if method != "Traditional":
            resp += f"توفير متوقع في المدة: {random.randint(10,40)}%\n"
        resp += f"المرجع: PMBOK Guide, ACEP Schedule Optimizer"

        samples.append(make_instruction("أنت مهندس تخطيط وجدولة محترف.", q, resp, "planning_ai"))
    return samples

# ═══ DOMAIN 5: Procurement AI ═══
def gen_procurement_ai(n=200):
    import statistics
    samples = []
    for _ in range(n):
        mat = random.choice(MATERIALS)
        city = random.choice(CITIES_AR)
        suppliers = random.randint(3, 8)
        prices = [random.randint(100, 5000) for _ in range(suppliers)]
        best = min(prices)
        worst = max(prices)

        q = random.choice([
            f"قارن أسعار {mat} في {city} بين {suppliers} موردين",
            f"Procurement analysis for {mat} in {city}: {suppliers} suppliers",
            f"أفضل مورد لـ {mat} في {city} مع تحليل الأسعار",
            f"Supplier comparison for {mat}: price, quality, delivery"
        ])
        resp = f"تحليل المشتريات لـ {mat} في {city}:\n"
        resp += f"عدد الموردين: {suppliers}\n"
        resp += f"نطاق الأسعار: {best:,} - {worst:,} ريال\n"
        resp += f"متوسط السعر: {statistics.mean(prices):,.0f} ريال\n"
        resp += f"أفضل سعر: {best:,} ريال (توفير {fmt((1-best/statistics.mean(prices))*100)}%)\n"
        resp += f"\nتوصية: "
        if best < statistics.mean(prices) * 0.85:
            resp += "شراء من المورد الأقل سعراً مع فحص الجودة"
        else:
            resp += "الموازنة بين السعر والجودة واختيار مورد متوسط السعر"
        resp += f"\nمهلة التوريد المتوقعة: {random.randint(3,30)} يوماً"
        resp += f"\nالمرجع: CMPEP Supplier Intelligence, هيئة المحتوى المحلي"

        samples.append(make_instruction("أنت خبير مشتريات ومقارنة موردين.", q, resp, "procurement_ai"))
    return samples

# ═══ DOMAIN 6: Contract AI ═══
def gen_contract_ai(n=200):
    samples = []
    clauses = ["شرط التعويضات", "جدول الدفعات", "مهلة الإنجاز", "شروط السلامة", "التأمين", "مخالفات التأخير",
               "ضمان الجودة", "نطاق العمل", "التغييرات والتعديلات", "فض النزاعات"]
    for _ in range(n):
        pt = random.choice(PROJECT_TYPES)
        clause = random.choice(clauses)
        value = random.randint(500000, 50000000)

        q = random.choice([
            f"راجع بند {clause} في عقد مشروع {pt} بقيمة {value:,} ريال",
            f"Review {clause} clause for {pt} contract value {value:,} SAR",
            f"ما هي المخاطر التعاقدية في عقد {pt}؟",
            f"تحليل بنود الدفع لعقد مشروع {pt}"
        ])
        resp = f"تحليل العقد لمشروع {pt}:\n"
        resp += f"قيمة العقد: {value:,} ريال\n"
        resp += f"البند: {clause}\n\n"
        resp += f"التحليل:\n"
        if "تعويضات" in clause:
            resp += "- نسبة التعويضات المقترحة: 1-2% أسبوعياً من قيمة العقد\n- الحد الأقصى: 10% من قيمة العقد"
        elif "دفعات" in clause:
            resp += "- دفعة مقدمة: 15-20%\n- دفعات دورية شهرية حسب الإنجاز\n- دفعة استلام نهائي: 5-10%"
        elif "سلامة" in clause:
            resp += "- يجب الالتزام بنظام السلامة المهنية OSHA\n- توفير معدات الوقاية الشخصية\n- تدريب العمالة على السلامة"
        else:
            resp += f"- يجب صياغة {clause} بشكل واضح وقانوني\n- يفضل الرجوع إلى عقد FIDIC كنموذج مرجعي"
        resp += f"\n\nالتوصية: مراجعة العقد من قبل مستشار قانوني متخصص"
        resp += f"\nالمرجع: FIDIC Red Book, SBC, نظام المنافسات والمشتريات الحكومية"

        samples.append(make_instruction("أنت مستشار تعاقدات هندسية.", q, resp, "contract_ai"))
    return samples

# ═══ DOMAIN 7: Drawing AI ═══
def gen_drawing_ai(n=200):
    samples = []
    for _ in range(n):
        pt = random.choice(PROJECT_TYPES)
        area = random.randint(100, 10000)
        elements = {"Walls": random.randint(10,50), "Columns": random.randint(6,30),
                    "Beams": random.randint(8,40), "Doors": random.randint(3,20),
                    "Windows": random.randint(4,25), "Rooms": random.randint(4,15)}
        scale = random.choice(["1:50","1:100","1:200"])

        q = random.choice([
            f"حلل المخطط المعماري لمشروع {pt} مساحة {area} م²",
            f"Analyze architectural drawing for {pt}: {area} m², scale {scale}",
            f"استخرج العناصر من المخطط الإنشائي لمشروع {pt}",
            f"قراءة المخططات الكهربائية لمشروع {pt}"
        ])
        resp = f"تحليل المخططات لمشروع {pt}:\n"
        resp += f"المقياس: {scale}  | المساحة: {area:,} م²\n\n"
        resp += f"العناصر المستخرجة:\n"
        for elem, cnt in elements.items():
            resp += f"  - {elem}: {cnt}\n"
        resp += f"\nملاحظات:\n"
        resp += f"- نوع الأساسات: {random.choice(['منفصلة','شريطية','لبشة','ركائز'])}\n"
        resp += f"- نظام الإنشاء: {random.choice(['إطار خرساني','جدران حاملة','هيكل معدني','بلاطة مسطحة'])}\n"
        resp += f"- عدد الأدوار: {random.randint(1,10)}\n"
        resp += f"- التوصية: مراجعة تطابق المخططات المعمارية مع الإنشائية"
        resp += f"\nالمرجع: SBC 301, ACI 318-19"

        samples.append(make_instruction("أنت مهندس معماري وإنشائي محلل للمخططات.", q, resp, "drawing_ai"))
    return samples

# ═══ DOMAIN 8: Quality AI ═══
def gen_quality_ai(n=200):
    samples = []
    defects = ["Crack","Spalling","Efflorescence","Honeycombing","Settlement","Corrosion",
               "تشقق","تآكل","فراغات","تصدع","هبوط","تسرب"]
    for _ in range(n):
        d = random.choice(defects)
        sev = random.choice(["Critical","High","Medium","Low"])
        loc = random.choice(["Foundation","Column","Beam","Slab","Wall","Ceiling","Floor"])

        q = random.choice([
            f"شكت من {d} في {loc} في مشروع {random.choice(PROJECT_TYPES)}. ما العلاج؟",
            f"Quality defect: {d} detected in {loc}. What is the remedy?",
            f"تقرير فحص جودة: {d} درجة {sev} في {loc}",
            f"NCR: {d} at {loc}. Analyze root cause and recommend repair"
        ])
        resp = f"تقرير فحص الجودة:\n"
        resp += f"العيب: {d}\nالموقع: {loc}\nالدرجة: {sev}\n\n"
        resp += f"تحليل السبب الجذري (RCA):\n"
        if "تشقق" in d or "Crack" in d:
            resp += f"- الانكماش اللدن (Plastic Shrinkage)\n- معامل التمدد الحراري\n- جودة الخرسانة"
        elif "تآكل" in d or "Corrosion" in d:
            resp += f"- ضعف غطاء الخرسانة\n- نفاذية الخرسانة العالية\n- الرطوبة والأملاح"
        elif "فراغات" in d or "Honeycombing" in d:
            resp += f"- ضعف دمك الخرسانة\n- تباعد حديد التسليح الكبير\n- قابلية تشغيل منخفضة"
        else:
            resp += f"- تنفيذ غير مطابق للمواصفات\n- نقص الإشراف الفني\n- ظروف جوية غير مناسبة"
        resp += f"\n\nالإجراء التصحيحي المقترح:\n"
        resp += f"- درجة {sev}: "
        if sev == "Critical": resp += "إيقاف العمل فوراً، استشارة المصمم، اختبارات مواد"
        elif sev == "High": resp += "معالجة خلال 48 ساعة، تقرير هندسي معتمد"
        elif sev == "Medium": resp += "معالجة ضمن جدول الصيانة الدورية"
        else: resp += "توثيق ومتابعة في التقارير الدورية"
        resp += f"\nالمرجع: ACI 224R, ASTM C823, SBC 304"

        samples.append(make_instruction("أنت مهندس جودة وتفتيش.", q, resp, "quality_ai"))
    return samples

# ═══ DOMAIN 9: Safety AI ═══
def gen_safety_ai(n=200):
    samples = []
    hazards = ["السقوط من ارتفاع","انهيار حفر","صعق كهربائي","سقوط مواد","حرائق","اختناق",
               "Fall from height","Excavation collapse","Electrocution","Fire","Confined space"]
    for _ in range(n):
        h = random.choice(hazards)
        workers = random.randint(10, 200)

        q = random.choice([
            f"تقييم مخاطر {h} في موقع مشروع {random.choice(PROJECT_TYPES)} بـ {workers} عامل",
            f"Safety risk assessment: {h} on construction site with {workers} workers",
            f"خطة السلامة لمنع {h} في مشروع بناء",
            f"PPE requirements for {h} hazard on site"
        ])
        resp = f"تقييم مخاطر السلامة:\n"
        resp += f"الخطر: {h}\nعدد العمال: {workers}\n\n"
        resp += f"تقييم المخاطر:\n- الاحتمالية: {random.choice(['عالية','متوسطة','منخفضة'])}\n"
        resp += f"- الشدة: {random.choice(['عالية جداً','عالية','متوسطة'])}\n"
        resp += f"- مستوى الخطورة: {random.choice(['عالٍ','متوسط','مقبول'])}\n\n"
        resp += f"إجراءات التحكم:\n"
        resp += f"1. هندسية: {random.choice(['درابزين','سقالة معتمدة','غطاء حفر','نظام تأريض'])}\n"
        resp += f"2. إدارية: تدريب العمال، تصاريح العمل، إجراءات الطوارئ\n"
        resp += f"3. PPE: {random.choice(['حزام أمان، خوذة','قفازات عازلة، نظارات','جهاز تنفس، بدلة واقية'])}\n"
        resp += f"\nالمرجع: OSHA 1926, SBC 302, نظام السلامة المهنية السعودي"

        samples.append(make_instruction("أنت مهندس سلامة مهنية.", q, resp, "safety_ai"))
    return samples

# ═══ DOMAIN 10: Risk AI ═══
def gen_risk_ai(n=200):
    samples = []
    risks_list = [("Financial","تقلب أسعار المواد"),("Schedule","تأخير التمويل"),("Technical","خطأ في التصميم"),
             ("Safety","ظروف جوية"),("Quality","مواد غير مطابقة"),("Financial","تقلب أسعار المواد"),
             ("Schedule","تأخير التمويل"),("Technical","خطأ في التصميم")]
    for _ in range(n):
        cat, desc = random.choice(risks_list)
        prob = random.uniform(0.2, 0.9)
        impact = random.uniform(0.3, 1.0)
        score = prob * impact

        q = random.choice([
            f"حلل مخاطر {cat}: {desc} لمشروع {random.choice(PROJECT_TYPES)}",
            f"Risk analysis for {cat}: {desc} in construction project",
            f"ما هي مخاطر {cat} في مشاريع التشييد وكيف تخففها؟",
            f"Risk assessment: {desc} for {random.choice(PROJECT_TYPES)}"
        ])
        resp = f"تحليل المخاطر:\n"
        resp += f"الفئة: {cat}\nالوصف: {desc}\n\n"
        resp += f"التقييم الكمي:\n- الاحتمالية: {prob:.0%}\n- التأثير: {impact:.0%}\n"
        resp += f"- درجة المخاطر: {score:.0%} - {('عالية' if score>0.5 else 'متوسطة' if score>0.25 else 'منخفضة')}\n\n"
        resp += f"خطة التخفيف:\n"
        if "سعر" in desc or "price" in desc.lower():
            resp += "- عقود ثابتة السعر مع الموردين\n- تحوط مالي\n- مخزون استراتيجي"
        elif "تأخير" in desc or "delay" in desc.lower():
            resp += "- جدول زمني باحتياطي 15%\n- مسار حرج مضغوط\n- دفعات مالية مضمونة"
        elif "تصميم" in desc or "design" in desc.lower():
            resp += "- مراجعة تصميم مستقلة\n- نموذج BIM للكشف المبكر\n- تأمين ضد أخطاء التصميم"
        else:
            resp += "- خطة طوارئ\n- تدريب الفريق\n- أنظمة مراقبة وتحذير مبكر"
        resp += f"\n\nالمرجع: PMBOK Risk Management, ISO 31000"

        samples.append(make_instruction("أنت خبير إدارة مخاطر مشاريع.", q, resp, "risk_ai"))
    return samples

# ═══ GENERATE ALL ═══
GENERATORS = {
    "engineering_llm": (gen_engineering_llm, 300),
    "quantity_ai": (gen_quantity_ai, 200),
    "cost_ai": (gen_cost_ai, 200),
    "planning_ai": (gen_planning_ai, 200),
    "procurement_ai": (gen_procurement_ai, 200),
    "contract_ai": (gen_contract_ai, 200),
    "drawing_ai": (gen_drawing_ai, 200),
    "quality_ai": (gen_quality_ai, 200),
    "safety_ai": (gen_safety_ai, 200),
    "risk_ai": (gen_risk_ai, 200),
}

def split_data(data, train_pct=0.8, val_pct=0.1):
    random.shuffle(data)
    n = len(data)
    train_end = int(n * train_pct)
    val_end = train_end + int(n * val_pct)
    return data[:train_end], data[train_end:val_end], data[val_end:]

def save_dataset(domain, train, val, test):
    d = os.path.join(BASE, domain)
    os.makedirs(d, exist_ok=True)
    def write(fname, data):
        with open(os.path.join(d, fname), 'w', encoding='utf-8') as f:
            for item in data:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
    write("training.jsonl", train)
    write("validation.jsonl", val)
    write("test.jsonl", test)

    metadata = {
        "dataset": domain, "version": "1.0", "generator": "ACEP-Data-Factory",
        "total_samples": len(train)+len(val)+len(test),
        "train": len(train), "validation": len(val), "test": len(test),
        "languages": ["Arabic","English"],
        "domains": [domain],
        "generated": datetime.now().isoformat()
    }
    with open(os.path.join(d, "metadata.json"), 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    topics = {}
    for item in train:
        inst = item.get("instruction","")
        for t in ["تكلفة","كمية","مخطط","مخاطر","سلامة","جودة","عقد","مشتريات","جدول","مقارنة",
                  "cost","quantity","drawing","risk","safety","quality","contract","schedule"]:
            if t in inst:
                topics[t] = topics.get(t, 0) + 1
    stats = {
        "total": len(train)+len(val)+len(test),
        "train": len(train), "validation": len(val), "test": len(test),
        "avg_instruction_len": int(sum(len(s["instruction"]) for s in train)/max(1,len(train))),
        "avg_output_len": int(sum(len(s["output"]) for s in train)/max(1,len(train))),
        "unique_ids": len(set(s["id"] for s in train)),
        "topics": topics
    }
    with open(os.path.join(d, "statistics.json"), 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    print(f"  [{domain}] Generated: {len(train)} train + {len(val)} val + {len(test)} test = {len(train)+len(val)+len(test)} total")

def main():
    print("="*60)
    print("  ACEP AI Data Factory - Dataset Generator v1.0")
    print("="*60)
    total = 0
    for domain, (gen_fn, count) in GENERATORS.items():
        print(f"\nGenerating {domain} ({count} samples)...")
        data = gen_fn(count)
        train, val, test = split_data(data)
        save_dataset(domain, train, val, test)
        total += len(data)
    print(f"\n{'='*60}")
    print(f"  TOTAL: {total} samples across {len(GENERATORS)} domains")
    print(f"  Saved to: {BASE}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
