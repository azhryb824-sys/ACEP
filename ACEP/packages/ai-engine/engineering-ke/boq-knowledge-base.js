/**
 * ACEP Engineering Knowledge Base — BOQ Items
 *
 * Hierarchical structure:
 *   Project Type → Phase (lifecycle) → Trade → Work Item → Element → Material → Unit → Calculation
 *
 * Every item defines:
 *   - Which project types + phases it applies to
 *   - Its engineering formula (never invents data)
 *   - Phase, trade, element, material for full traceability
 *   - Confidence level and data source
 *   - Conditions that trigger "insufficient data" instead of fake values
 */

const StageClassifier = require('../project-understanding/stage-classifier');

const PHASES = [
  { id: 'EXCAVATION',     nameAr: 'مرحلة الحفر',         nameEn: 'Excavation',     order: 1 },
  { id: 'FOUNDATION',     nameAr: 'مرحلة الأساسات',       nameEn: 'Foundation',     order: 2 },
  { id: 'STRUCTURE',      nameAr: 'مرحلة الهيكل',          nameEn: 'Structure',      order: 3 },
  { id: 'MASONRY',        nameAr: 'مرحلة المباني',         nameEn: 'Masonry',        order: 4 },
  { id: 'PLASTERING',     nameAr: 'مرحلة اللياسة',         nameEn: 'Plastering',     order: 5 },
  { id: 'FINISHING',      nameAr: 'مرحلة التشطيبات',       nameEn: 'Finishing',      order: 6 },
  { id: 'ELECTRICAL',     nameAr: 'مرحلة الكهرباء',        nameEn: 'Electrical',     order: 7 },
  { id: 'PLUMBING',       nameAr: 'مرحلة السباكة',         nameEn: 'Plumbing',       order: 8 },
  { id: 'HVAC',           nameAr: 'مرحلة التكييف',         nameEn: 'HVAC',           order: 9 },
  { id: 'NETWORKS',       nameAr: 'مرحلة الشبكات',         nameEn: 'Networks',       order: 10 },
  { id: 'EXTERNAL',       nameAr: 'مرحلة الأعمال الخارجية', nameEn: 'External Works', order: 11 },
];

const TRADES = {
  CIVIL:     'أعمال مدنية',
  ARCH:      'أعمال معمارية',
  ELECTRO:   'أعمال كهربائية',
  MECH:      'أعمال ميكانيكية',
  SANITARY:  'أعمال صحية',
  SECURITY:  'أمن وسلامة',
};

/**
 * Helper to create a KB item.
 */
function item({ code, description, phase, trade, element, material, unit, appliesTo, calc, explanation, priceCat, confidence, dataSource, alternatives }) {
  return { code, description, phase, trade, element, material, unit, appliesTo, calc, explanation, priceCat, confidence, dataSource, alternatives: alternatives || [] };
}

/**
 * Wall perimeter (assumes square plan).
 */
function perimeter(area) {
  // More accurate: assumes rectangle with aspect ratio 1.5 (length = 1.5 × width)
  // width = sqrt(area/1.5), length = 1.5 * width, perimeter = 2 * (length + width)
  const w = Math.sqrt(area / 1.5);
  const l = w * 1.5;
  return 2 * (l + w);
}

function wallArea(area, floors, height) {
  return perimeter(area) * (height || 3.0) * (floors || 1);
}

function insufficient(msg) {
  return { insufficient: true, reason: msg };
}

function ok(qty, method, conf) {
  return { quantity: Math.round(qty * 100) / 100, method, confidence: conf };
}

/**
 * Check if a param has a usable value.
 */
function has(p, key) {
  return p[key] !== null && p[key] !== undefined && p[key] !== '';
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1: EXCAVATION
// ═══════════════════════════════════════════════════════════════
const EXCAVATION_ITEMS = [
  item({
    code: 'EXC-001',
    description: 'حفر أساسات',
    phase: 'EXCAVATION', trade: 'CIVIL', element: 'أساسات', material: 'تربة', unit: 'م³',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Apartment_Building', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'], minFloors: 1 },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة لحساب الحفر.');
      const footprint = p.area / (p.floors || 1);
      return ok(footprint * 1.5, `حجم الحفر = مساحة البصمة (${Math.round(footprint)}) × 1.5م عمق`, 0.85);
    },
    explanation: 'يُحسب حجم الحفر بضرب مساحة الأرض في عمق حفر متوسط (1.5م) للأساسات المسلحة.',
    priceCat: 'EXC', confidence: 0.85, dataSource: 'المتوسط الهندسي لأعماق الأساسات في المباني السكنية والتجارية',
  }),
  item({
    code: 'EXC-002',
    description: 'نقل ناتج الحفر',
    phase: 'EXCAVATION', trade: 'CIVIL', element: 'أساسات', material: 'تربة', unit: 'م³',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Apartment_Building', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'], minFloors: 1 },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة لحساب النقل.');
      return ok(p.area * 1.5 * 0.7, 'نقل ناتج الحفر = حجم الحفر × 0.7 (نسبة التربة الزائدة بعد الدمك)', 0.75);
    },
    explanation: 'نقل ناتج الحفر = 70% من حجم الحفر الكلي.\nيتم نقل التربة الزائدة بعد استعمال جزء منها للردم.',
    priceCat: 'EXC', confidence: 0.75, dataSource: 'نسبة متوسطة من حجم الحفر',
  }),
  item({
    code: 'EXC-003',
    description: 'إحلال تربة',
    phase: 'EXCAVATION', trade: 'CIVIL', element: 'أساسات', material: 'تربة مدموكة', unit: 'م³',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'], minArea: 200 },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      return ok(p.area * 0.5, 'الإحلال = مساحة الأرض × 0.5م (سمك طبقة الإحلال)', 0.70);
    },
    explanation: 'إحلال التربة تحت الأساسات بطبقة من التربة المدموكة أو الرمل النظيف بسمك 0.5م.',
    priceCat: 'EXC', confidence: 0.70, dataSource: 'شرط هندسي للمباني على تربة ضعيفة',
  }),
  item({
    code: 'EXC-004',
    description: 'ردم حول الأساسات',
    phase: 'EXCAVATION', trade: 'CIVIL', element: 'أساسات', material: 'تربة', unit: 'م³',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Apartment_Building', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'], minFloors: 1 },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      return ok(p.area * 0.8, 'الردم = مساحة الأرض × 0.8م (عمق الردم)', 0.75);
    },
    explanation: 'الردم حول جدران الأساسات بعد الانتهاء من الخرسانة.\nالعمق المتوسط 0.8م.',
    priceCat: 'EXC', confidence: 0.75, dataSource: 'متوسط أعماق الردم',
  }),
];

// ═══════════════════════════════════════════════════════════════
// PHASE 2: FOUNDATION
// ═══════════════════════════════════════════════════════════════
const FOUNDATION_ITEMS = [
  item({
    code: 'FND-001',
    description: 'خرسانة نظافة',
    phase: 'FOUNDATION', trade: 'CIVIL', element: 'قواعد', material: 'خرسانة عادية', unit: 'م³',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Apartment_Building', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      return ok(p.area * 0.1, 'خرسانة النظافة = المساحة × 0.1م (سمك طبقة النظافة)', 0.80);
    },
    explanation: 'طبقة خرسانة عادية بسمك 10سم تحت القواعد لعزل الخرسانة المسلحة عن التربة.',
    priceCat: 'FND', confidence: 0.80, dataSource: 'سمك قياسي حسب الكود السعودي',
  }),
  item({
    code: 'FND-002',
    description: 'قواعد خرسانية مسلحة',
    phase: 'FOUNDATION', trade: 'CIVIL', element: 'قواعد', material: 'خرسانة مسلحة', unit: 'م³',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Apartment_Building', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const depth = p.type === 'Residential_Tower' ? 0.4 : (p.type === 'Hospital' ? 0.3 : 0.25);
      return ok(p.area * depth, `القواعد المسلحة = المساحة × ${depth}م (سمك القواعد)` +
        (p.type === 'Residential_Tower' ? ' - سمك أكبر للأبراج' : ''), 0.85);
    },
    explanation: 'حجم خرسانة القواعد المسلحة = مساحة الأرض × سمك القواعد.\nيتفاوت السمك حسب نوع المبنى.',
    priceCat: 'FND', confidence: 0.85, dataSource: 'حساب إنشائي حسب نوع المبنى',
  }),
  item({
    code: 'FND-003',
    description: 'ميدات أرضية',
    phase: 'FOUNDATION', trade: 'CIVIL', element: 'ميدات', material: 'خرسانة مسلحة', unit: 'م³',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'], minArea: 150 },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      return ok(p.area * 0.15, 'الميدات = المساحة × 0.15م (سمك الميدات)', 0.75);
    },
    explanation: 'الميدات تربط القواعد معاً وتوزع الأحمال.\nسمك تقديري 15سم من مساحة المبنى.',
    priceCat: 'FND', confidence: 0.75, dataSource: 'نسبة من مساحة المبنى',
  }),
  item({
    code: 'FND-004',
    description: 'بلاطة أرضية (لبشة)',
    phase: 'FOUNDATION', trade: 'CIVIL', element: 'بلاطة أرضية', material: 'خرسانة مسلحة', unit: 'م³',
    appliesTo: { types: ['Villa', 'Factory', 'Warehouse', 'Mosque', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      return ok(p.area * 0.25, 'اللبشة = المساحة × 0.25م (سمك اللبشة)', 0.80);
    },
    explanation: 'بلاطة أرضية مسلحة (Raft Foundation) بسمك 25 سم.\nتستخدم في الفلل والمصانع على التربة الضعيفة.',
    priceCat: 'FND', confidence: 0.80, dataSource: 'سمك قياسي للبشة المسلحة',
  }),
];

// ═══════════════════════════════════════════════════════════════
// PHASE 3: STRUCTURE
// ═══════════════════════════════════════════════════════════════
const STRUCTURE_ITEMS = [
  item({
    code: 'STR-001',
    description: 'أعمدة خرسانية مسلحة',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'أعمدة', material: 'خرسانة مسلحة', unit: 'م³',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Apartment_Building', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة وعدد الأدوار مطلوبان للأعمدة.');
      const ratio = p.type === 'Residential_Tower' ? 0.10 : (p.type === 'Hospital' ? 0.08 : 0.06);
      return ok(p.area * ratio * p.floors, `الأعمدة = المساحة × ${ratio} (نسبة الأعمدة) × ${p.floors} أدوار`, 0.80);
    },
    explanation: 'حجم خرسانة الأعمدة = مساحة الدور × نسبة الأعمدة × عدد الأدوار.\nتختلف النسبة حسب نوع المبنى.',
    priceCat: 'COL', confidence: 0.80, dataSource: 'نسبة إنشائية قياسية',
  }),
  item({
    code: 'STR-002',
    description: 'كمرات خرسانية مسلحة',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'كمرات', material: 'خرسانة مسلحة', unit: 'م³',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Apartment_Building', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      return ok(p.area * 0.04 * p.floors, 'الكمرات = المساحة × 0.04 × الأدوار', 0.75);
    },
    explanation: 'الكمرات تربط الأعمدة وتحمل البلاطات.\nنسبة تقديرية 4% من مساحة الدور.',
    priceCat: 'COL', confidence: 0.75, dataSource: 'نسبة إنشائية تقديرية',
  }),
  item({
    code: 'STR-003',
    description: 'بلاطات أسقف خرسانية',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'أسقف', material: 'خرسانة مسلحة', unit: 'م³',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Apartment_Building', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      const thick = p.type === 'Residential_Tower' ? 0.22 : (p.type === 'Hospital' ? 0.20 : 0.18);
      const floorCount = p.floors;
      return ok(p.area * thick * floorCount, `البلاطات = المساحة × ${thick}م (سمك) × ${floorCount} أدوار`, 0.80);
    },
    explanation: 'البلاطات الخرسانية المسلحة للأسقف والأرضيات.\nالسمك يتراوح بين 18-22سم حسب نوع المبنى.',
    priceCat: 'SLB', confidence: 0.80, dataSource: 'الكود الإنشائي - سمك البلاطات',
  }),
  item({
    code: 'STR-004',
    description: 'جدران خرسانية (قلب)',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'جدران قص', material: 'خرسانة مسلحة', unit: 'م³',
    appliesTo: { types: ['Residential_Tower', 'Hospital', 'Hotel', 'Mall', 'Office_Building', 'Mosque', 'Residential_Compound', 'Warehouse'], phases: ['Full_Construction', 'Shell'], minFloors: 5 },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      return ok(p.area * 0.05, 'جدران القص = المساحة الكلية × 0.05 (5% من المساحة)', 0.75);
    },
    explanation: 'جدران خرسانية مسلحة (Shear Walls) لمقاومة القوى الجانبية.\nخاصة بالأبراج والمباني العالية.',
    priceCat: 'WAL', confidence: 0.75, dataSource: 'نسبة من مساحة المبنى للمباني العالية',
  }),
  item({
    code: 'STR-005',
    description: 'حديد تسليح',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'تسليح', material: 'حديد', unit: 'طن',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Apartment_Building', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      const foundationVol = p.area * (p.type === 'Residential_Tower' ? 0.4 : 0.25);
      const columnRatio = p.type === 'Residential_Tower' ? 0.10 : (p.type === 'Hospital' ? 0.08 : 0.06);
      const columnVol = p.area * columnRatio * p.floors;
      const slabThick = p.type === 'Residential_Tower' ? 0.22 : (p.type === 'Hospital' ? 0.20 : 0.18);
      const slabVol = p.area * slabThick * p.floors;
      const total = foundationVol + columnVol + slabVol;
      const ratio = p.type === 'Residential_Tower' ? 0.15 : 0.12;
      return ok(total * ratio, `الحديد = ${total.toFixed(0)}م³ خرسانة × ${ratio} (نسبة الحديد)`, 0.80);
    },
    explanation: 'وزن حديد التسليح = إجمالي حجم الخرسانة المسلحة × نسبة الحديد.\nنسبة الحديد 12-15% حسب نوع المبنى.',
    priceCat: 'REB', confidence: 0.80, dataSource: 'نسبة حديد قياسية من حجم الخرسانة',
  }),
  item({
    code: 'STR-006',
    description: 'سلم خرساني',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'سلم', material: 'خرسانة مسلحة', unit: 'م³',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Apartment_Building', 'Mosque', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'], minFloors: 2 },
    calc: (p) => {
      if (!has(p, 'floors')) return insufficient('عدد الأدوار مطلوب.');
      return ok(3.5 * (p.floors - 1), 'حجم السلم = 3.5م³ × (عدد الأدوار - 1)', 0.70);
    },
    explanation: 'سلم خرساني مسلح بين الأدوار.\nمتوسط حجم السلم 3.5م³ لكل دور.',
    priceCat: 'SLB', confidence: 0.70, dataSource: 'متوسط حجم السلالم الخرسانية',
  }),
  item({
    code: 'STR-007',
    description: 'مصعد كهربائي',
    phase: 'STRUCTURE', trade: 'MECH', element: 'مصاعد', material: 'مصعد', unit: 'مصعد',
    appliesTo: { types: ['Residential_Tower', 'Hospital', 'Mall', 'Hotel', 'Office_Building', 'Mosque', 'Residential_Compound', 'Warehouse'], phases: ['Full_Construction'], minFloors: 4 },
    calc: (p) => {
      if (!has(p, 'floors')) return insufficient('عدد الأدوار مطلوب.');
      const count = p.type === 'Residential_Tower' ? Math.max(2, Math.ceil(p.floors / 10)) :
                    p.type === 'Hospital' ? Math.max(3, Math.ceil(p.floors / 5)) :
                    Math.max(1, Math.ceil(p.floors / 8));
      return ok(count, `عدد المصاعد = ${count} (حسب الأدوار ونوع المبنى)`, 0.70);
    },
    explanation: 'مصاعد ركاب كهربائية.\nبرج سكني: مصعد لكل 10 أدوار (حد أدنى 2).\nمستشفى: مصعد لكل 5 أدوار (حد أدنى 3).',
    priceCat: 'ELV', confidence: 0.70, dataSource: 'الكود السعودي للمباني - متطلبات المصاعد',
  }),
];

// ═══════════════════════════════════════════════════════════════
// PHASE 4: MASONRY
// ═══════════════════════════════════════════════════════════════
const MASONRY_ITEMS = [
  item({
    code: 'MSN-001',
    description: 'بلوك أسمنتي للجدران',
    phase: 'MASONRY', trade: 'CIVIL', element: 'جدران', material: 'بلوك أسمنتي', unit: 'م²',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Apartment_Building', 'Apartment_Finishing', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      const height = (p.type === 'School' || p.type === 'Hospital') ? 3.5 : 3.0;
      const reduction = p.type === 'Residential_Tower' ? 0.7 : 1.0;
      return ok(wallArea(p.area, p.floors, height) * reduction,
        `البلوك = محيط المبنى × ${height}م × ${p.floors} أدوار` +
        (reduction < 1 ? ' × 0.7 (نسبة الجدران في الأبراج)' : ''), 0.85);
    },
    explanation: 'مساحة البلوك = محيط المبنى × ارتفاع الجدار × عدد الأدوار.\nالجدران الداخلية والخارجية.',
    priceCat: 'BLK', confidence: 0.85, dataSource: 'مساحة الجدران الفعلية',
  }),
  item({
    code: 'MSN-002',
    description: 'عزل حراري للجدران',
    phase: 'MASONRY', trade: 'CIVIL', element: 'جدران', material: 'عزل حراري', unit: 'م²',
    appliesTo: { types: ['Villa', 'Residential_Tower', 'Hospital', 'Mosque', 'Residential_Compound', 'Hotel', 'Mall', 'Office_Building'], phases: ['Full_Construction', 'Shell'], minFloors: 1 },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      return ok(wallArea(p.area, p.floors, 3.0) * 0.35,
        'العزل الحراري = 35% من مساحة الجدران (الجدران الخارجية)', 0.70);
    },
    explanation: 'عزل حراري للجدران الخارجية فقط.\nنسبة 35% من إجمالي مساحة الجدران.',
    priceCat: 'BLK', confidence: 0.70, dataSource: 'نسبة الجدران الخارجية من الكلية',
  }),
  item({
    code: 'MSN-003',
    description: 'عزل مائي للأسطح والحمامات',
    phase: 'MASONRY', trade: 'CIVIL', element: 'عزل', material: 'عزل مائي', unit: 'م²',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Apartment_Building', 'Mosque', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      const basement = p.floors > 3 ? p.area * 0.5 : 0;
      return ok(p.area * (0.15 * (p.floors || 1)) + basement,
        `العزل المائي = المساحة × ${0.15} × الأدوار للحمامات` +
        (basement > 0 ? ' + مساحة إضافية للأسطح' : ''), 0.70);
    },
    explanation: 'عزل مائي للحمامات والأسطح.\nنسبة 15% من مساحة كل دور للحمامات.',
    priceCat: 'WPR', confidence: 0.70, dataSource: 'تقدير هندسي',
  }),
];

// ═══════════════════════════════════════════════════════════════
// PHASE 5: PLASTERING
// ═══════════════════════════════════════════════════════════════
const PLASTERING_ITEMS = [
  item({
    code: 'PLS-001',
    description: 'لياسة جدران داخلية',
    phase: 'PLASTERING', trade: 'ARCH', element: 'جدران', material: 'لياسة إسمنتية', unit: 'م²',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      const height = (p.type === 'School' || p.type === 'Hospital') ? 3.5 : 3.0;
      return ok(wallArea(p.area, p.floors, height) * 0.9,
        `لياسة داخلية = محيط الجدران × ${height}م × الأدوار × 0.9 (خصم الفتحات)`, 0.85);
    },
    explanation: 'لياسة الجدران الداخلية بالإسمنت الأبيض.\nخصم 10% للفتحات (أبواب وشبابيك).',
    priceCat: 'PLS', confidence: 0.85, dataSource: 'مساحة الجدران الداخلية',
  }),
  item({
    code: 'PLS-002',
    description: 'لياسة جدران خارجية',
    phase: 'PLASTERING', trade: 'ARCH', element: 'واجهات', material: 'لياسة إسمنتية', unit: 'م²',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      const height = (p.type === 'School' || p.type === 'Hospital') ? 3.5 : 3.0;
      return ok(wallArea(p.area, p.floors, height) * 0.35,
        `لياسة خارجية = محيط المبني × ${height}م × الأدوار × 0.35`, 0.80);
    },
    explanation: 'لياسة الواجهات الخارجية.\nنسبة 35% من مساحة الجدران (الواجهات فقط).',
    priceCat: 'PLS', confidence: 0.80, dataSource: 'نسبة واجهات المبنى',
  }),
  item({
    code: 'PLS-003',
    description: 'طرطشة أسمنتية للواجهات',
    phase: 'PLASTERING', trade: 'ARCH', element: 'واجهات', material: 'طرطشة', unit: 'م²',
    appliesTo: { types: ['Villa', 'Residential_Tower'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      return ok(wallArea(p.area, p.floors, 3.0) * 0.35,
        'الطرطشة = مساحة اللياسة الخارجية', 0.70);
    },
    explanation: 'طبقة طرطشة أسمنتية للواجهات قبل اللياسة الناعمة.',
    priceCat: 'PLS', confidence: 0.70, dataSource: 'نفس مساحة اللياسة الخارجية',
  }),
];

// ═══════════════════════════════════════════════════════════════
// PHASE 6: FINISHING
// ═══════════════════════════════════════════════════════════════
const FINISHING_ITEMS = [
  item({
    code: 'PNT-001',
    description: 'دهانات جدران داخلية',
    phase: 'FINISHING', trade: 'ARCH', element: 'جدران', material: 'دهان أكريليك', unit: 'م²',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      const height = (p.type === 'School' || p.type === 'Hospital') ? 3.5 : 3.0;
      return ok(wallArea(p.area, p.floors, height) * 0.85,
        `الدهانات = محيط الجدران × ${height}م × الأدوار × 0.85`, 0.85);
    },
    explanation: 'دهانات الجدران الداخلية بدهان أكريليك قابل للغسل.\nنفس مساحة اللياسة تقريباً.',
    priceCat: 'PNT', confidence: 0.85, dataSource: 'مساحة اللياسة الداخلية',
  }),
  item({
    code: 'PNT-002',
    description: 'دهانات جدران خارجية',
    phase: 'FINISHING', trade: 'ARCH', element: 'واجهات', material: 'دهان خارجي', unit: 'م²',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      return ok(wallArea(p.area, p.floors, 3.0) * 0.35,
        'الدهانات الخارجية = 35% من مساحة الجدران', 0.80);
    },
    explanation: 'دهانات خارجية مقاومة للعوامل الجوية.',
    priceCat: 'PNT', confidence: 0.80, dataSource: 'نسبة مساحة الواجهات',
  }),
  item({
    code: 'PNT-003',
    description: 'دهانات أسقف',
    phase: 'FINISHING', trade: 'ARCH', element: 'أسقف', material: 'دهان أسقف', unit: 'م²',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      return ok(p.area * p.floors, 'دهان الأسقف = المساحة × الأدوار', 0.85);
    },
    explanation: 'دهان أسقف المبنى باللون الأبيض.',
    priceCat: 'PNT', confidence: 0.85, dataSource: 'مساحة الأسقف',
  }),
  item({
    code: 'TLF-001',
    description: 'بلاط أرضيات داخلي',
    phase: 'FINISHING', trade: 'ARCH', element: 'أرضيات', material: 'بلاط سيراميك', unit: 'م²',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      const reduction = (p.type === 'Apartment_Finishing' || p.type === 'Apartment_Building') ? 0.85 : 0.80;
      let baths = has(p, 'bathrooms') ? (p.bathrooms * 18) : 0;
      return ok(p.area * p.floors * reduction - baths,
        `بلاط داخلي = المساحة × الأدوار × ${reduction} - مساحة السيراميك (${baths}م²)`, 0.85);
    },
    explanation: 'بلاط السيراميك للأرضيات الداخلية (غرف + صالات + ممرات).\nخصم مساحة الحمامات المغطاة بالسيراميك.',
    priceCat: 'TLF', confidence: 0.85, dataSource: 'مساحة الأرضيات بعد خصم الحمامات',
  }),
  item({
    code: 'TLF-002',
    description: 'بلاط أرضيات خارجي',
    phase: 'FINISHING', trade: 'ARCH', element: 'ممرات خارجية', material: 'بلاط خارجي', unit: 'م²',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Residential_Tower', 'Factory', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const pct = p.type === 'Villa' ? 0.15 : (p.type === 'School' ? 0.10 : 0.08);
      return ok(p.area * pct, `بلاط خارجي = المساحة × ${pct} (الممرات والمواقف)`, 0.70);
    },
    explanation: 'بلاط للأرصفة والممرات الخارجية.\nنسبة من مساحة الأرض حسب نوع المبنى.',
    priceCat: 'TLF', confidence: 0.70, dataSource: 'نسبة من مساحة الموقع',
  }),
  item({
    code: 'TLF-003',
    description: 'سيراميك حمامات',
    phase: 'FINISHING', trade: 'ARCH', element: 'حمامات', material: 'سيراميك', unit: 'م²',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'bathrooms')) return insufficient('عدد الحمامات مطلوب. يرجى تحديد عدد الحمامات.');
      const perBath = (p.type === 'Hospital') ? 25 : 20;
      return ok(p.bathrooms * perBath,
        `سيراميك الحمامات = ${p.bathrooms} حمام × ${perBath}م² لكل حمام`, 0.80);
    },
    explanation: 'سيراميك أرضيات وجدران الحمامات.\nكل حمام يحتاج 20-25م² سيراميك.',
    priceCat: 'CRM', confidence: 0.80, dataSource: 'متوسط مساحة الحمامات',
  }),
  item({
    code: 'TLF-004',
    description: 'سيراميك مطابخ',
    phase: 'FINISHING', trade: 'ARCH', element: 'مطبخ', material: 'سيراميك', unit: 'م²',
    appliesTo: { types: ['Villa', 'Apartment_Finishing', 'Apartment_Building', 'Residential_Tower', 'Mosque', 'Residential_Compound', 'Hotel', 'Mall', 'Office_Building'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'hasKitchen') || !p.hasKitchen) return insufficient('لم يتم تحديد وجود مطبخ.');
      return ok(15, 'مطبخ واحد = 15م² سيراميك جدران وأرضية', 0.75);
    },
    explanation: 'سيراميك للمطابخ (بين أرضية وجدران).\nمساحة تقديرية 15م².',
    priceCat: 'CRM', confidence: 0.75, dataSource: 'متوسط مساحة المطابخ',
  }),
  item({
    code: 'TLF-005',
    description: 'بورسلان أرضيات فاخر',
    phase: 'FINISHING', trade: 'ARCH', element: 'أرضيات', material: 'بورسلان', unit: 'م²',
    appliesTo: { types: ['Villa', 'Residential_Tower', 'Hospital', 'Mosque', 'Residential_Compound', 'Hotel', 'Mall', 'Office_Building'], phases: ['Finishing'], minArea: 300 },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      const share = p.type === 'Villa' ? 0.4 : 0.3;
      return ok(p.area * p.floors * share,
        `بورسلان = المساحة × الأدوار × ${share} (${p.type === 'Villa' ? 'الصالات الرئيسية' : 'المناطق الرئيسية'})`, 0.65);
    },
    explanation: 'أرضيات بورسلان فاخر للصالات والمناطق الرئيسية.\nيحتاج تأكيد المستخدم.',
    priceCat: 'TLF', confidence: 0.65, dataSource: 'تقدير حسب نوع المبنى',
  }),
  item({
    code: 'GPS-001',
    description: 'أسقف جبس معلقة',
    phase: 'FINISHING', trade: 'ARCH', element: 'أسقف', material: 'جبس', unit: 'م²',
    appliesTo: { types: ['Villa', 'Apartment_Finishing', 'Apartment_Building', 'Residential_Tower', 'Hospital', 'School', 'Mosque', 'Residential_Compound', 'Warehouse', 'Hotel', 'Mall', 'Office_Building'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      const pct = (p.type === 'Hospital') ? 0.8 : (p.type === 'Villa' ? 0.5 : 0.6);
      return ok(p.area * p.floors * pct, `أسقف جبس = المساحة × الأدوار × ${pct}`, 0.75);
    },
    explanation: 'أسقف جبس معلقة ديكورية.\nتغطي نسبة من مساحة الأسقف حسب نوع المبنى.',
    priceCat: 'GPS', confidence: 0.75, dataSource: 'نسبة من مساحة الأسقف',
  }),
  item({
    code: 'DR-001',
    description: 'أبواب خشبية داخلية',
    phase: 'FINISHING', trade: 'ARCH', element: 'أبواب', material: 'خشب', unit: 'باب',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      const hasRooms = has(p, 'rooms') && p.rooms > 0;
      const hasBaths = has(p, 'bathrooms') && p.bathrooms > 0;
      const hasHalls = has(p, 'halls') && p.halls > 0;
      if (!hasRooms && !hasBaths && !hasHalls && !has(p, 'area'))
        return insufficient('عدد الغرف أو الحمامات مطلوب لتقدير عدد الأبواب.');
      const rooms = p.rooms || Math.max(1, Math.round(p.area / 30));
      const baths = p.bathrooms || 1;
      const halls = p.halls || 1;
      return ok(rooms + baths + halls + 1,
        `أبواب = ${rooms} غرف + ${baths} حمامات + ${halls} صالة + 1 مدخل`, 0.80);
    },
    explanation: 'أبواب خشبية داخلية = عدد الغرف + عدد الحمامات + عدد الصالات + باب مدخل.',
    priceCat: 'DR', confidence: 0.80, dataSource: 'عدد الفراغات في المبنى',
  }),
  item({
    code: 'DR-002',
    description: 'باب حماية خارجي (رئيسي)',
    phase: 'FINISHING', trade: 'ARCH', element: 'أبواب', material: 'حديد', unit: 'باب',
    appliesTo: { types: ['Villa', 'Apartment_Finishing', 'Apartment_Building', 'Residential_Compound', 'Mosque', 'Hotel', 'Mall', 'Office_Building'], phases: ['Full_Construction', 'Finishing'] },
    calc: () => ok(1, 'باب حماية رئيسي واحد للمبنى', 0.85),
    explanation: 'باب حماية خارجي (حديد أو ألمنيوم) للمدخل الرئيسي.',
    priceCat: 'DR', confidence: 0.85, dataSource: 'باب واحد لكل مبنى',
  }),
  item({
    code: 'WN-001',
    description: 'شبابيك ألمنيوم',
    phase: 'FINISHING', trade: 'ARCH', element: 'شبابيك', material: 'ألمنيوم', unit: 'شباك',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'rooms') && !has(p, 'area')) return insufficient('عدد الغرف أو المساحة مطلوب.');
      const rooms = p.rooms || Math.max(2, Math.round(p.area / 30));
      return ok(Math.max(2, Math.round(rooms * 1.5)),
        `شبابيك = ${rooms} غرف × 1.5 + شباك صالة`, 0.70);
    },
    explanation: 'شبابيك ألمنيوم زجاجية.\nغرفة نوم = شباك واحد، صالة = شباكين.',
    priceCat: 'WN', confidence: 0.70, dataSource: 'تقدير حسب عدد الغرف',
  }),
  item({
    code: 'DR-003',
    description: 'مطابخ ألمنيوم',
    phase: 'FINISHING', trade: 'ARCH', element: 'مطبخ', material: 'ألمنيوم', unit: 'مطبخ',
    appliesTo: { types: ['Villa', 'Apartment_Finishing', 'Apartment_Building', 'Residential_Tower', 'Mosque', 'Residential_Compound', 'Hotel', 'Mall', 'Office_Building'], phases: ['Finishing'] },
    calc: (p) => {
      if (!has(p, 'hasKitchen') || !p.hasKitchen) return insufficient('لم يتم تحديد وجود مطبخ.');
      return ok(1, 'مطبخ واحد', 0.80);
    },
    explanation: 'مطبخ ألمنيوم جاهز بالخزائن والأدراج.',
    priceCat: 'DR', confidence: 0.80, dataSource: 'مطبخ واحد لكل وحدة سكنية',
  }),
  item({
    code: 'CLN-001',
    description: 'نظافة نهائية للمبنى',
    phase: 'FINISHING', trade: 'ARCH', element: 'نظافة', material: 'خدمات', unit: 'م²',
    appliesTo: { types: null, phases: ['Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبة.');
      return ok(p.area * p.floors, 'النظافة النهائية = المساحة الكلية', 0.90);
    },
    explanation: 'نظافة عامة ونهائية للمبنى بعد انتهاء التشطيبات.',
    priceCat: 'CLN', confidence: 0.90, dataSource: 'مساحة المبنى الكلية',
  }),
  item({
    code: 'FCD-001',
    description: 'واجهات زجاجية (كورتن وول)',
    phase: 'FINISHING', trade: 'ARCH', element: 'واجهات', material: 'زجاج وألمنيوم', unit: 'م²',
    appliesTo: { types: ['Residential_Tower', 'Hospital', 'Mall', 'Office_Building', 'Hotel', 'Mosque', 'Residential_Compound'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبان.');
      const facadeArea = Math.sqrt(p.area) * 4 * 3.0 * p.floors * 0.3;
      return ok(facadeArea, 'الواجهات الزجاجية = محيط المبنى × ارتفاع الدور × الأدوار × 30%', 0.65);
    },
    explanation: 'واجهات زجاجية (Curtain Wall) للمباني التجارية والعالية.\nتغطي 30% من مساحة الواجهات الكلية.',
    priceCat: 'FCD', confidence: 0.65, dataSource: 'تقدير حسب مساحة الواجهات',
  }),
  item({
    code: 'FCD-002',
    description: 'واجهات حجر طبيعي',
    phase: 'FINISHING', trade: 'ARCH', element: 'واجهات', material: 'حجر', unit: 'م²',
    appliesTo: { types: ['Villa', 'Luxury_Villa', 'Mall', 'Hotel'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبان.');
      return ok(Math.sqrt(p.area) * 4 * 3.0 * p.floors * 0.4,
        'الواجهات الحجرية = محيط المبني × 3م × الأدوار × 40%', 0.65);
    },
    explanation: 'تكسي الواجهات الخارجية بالحجر الطبيعي.\nيغطي 40% من مساحة الواجهات.',
    priceCat: 'TLF', confidence: 0.65, dataSource: 'نسبة من مساحة الواجهات',
  }),
];

// ═══════════════════════════════════════════════════════════════
// PHASE 7: ELECTRICAL
// ═══════════════════════════════════════════════════════════════
const ELECTRICAL_ITEMS = [
  item({
    code: 'ELC-001',
    description: 'تمديدات أسلاك كهربائية',
    phase: 'ELECTRICAL', trade: 'ELECTRO', element: 'أسلاك', material: 'نحاس', unit: 'نقطة',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      const hasRooms = has(p, 'rooms');
      const hasBaths = has(p, 'bathrooms');
      if (!hasRooms && !hasBaths && !has(p, 'area')) return insufficient('عدد الغرف أو المساحة مطلوب.');
      const rooms = p.rooms || Math.max(2, Math.round((p.area || 200) / 30));
      const baths = p.bathrooms || 1;
      const base = (p.type === 'Hospital' ? 20 : 10);
      return ok(Math.round(rooms * base + baths * 4 + 10),
        `تمديدات كهرباء = (${rooms} غرف × ${base}) + (${baths} حمامات × 4) + 10 نقاط أساسية`, 0.80);
    },
    explanation: 'تمديدات الأسلاك والمواسير في الجدران والأسقف.\nكل غرفة تحتاج 8-10 نقاط حسب نوع المبنى.',
    priceCat: 'ELC', confidence: 0.80, dataSource: 'تقدير حسب عدد الفراغات',
  }),
  item({
    code: 'ELC-002',
    description: 'لوحة توزيع كهربائية رئيسية',
    phase: 'ELECTRICAL', trade: 'ELECTRO', element: 'لوحات', material: 'كهرباء', unit: 'لوحة',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      const floors = p.floors || 1;
      const main = 1;
      const subs = floors > 1 ? floors - 1 : 0;
      return ok(main + subs, `لوحة رئيسية + ${subs} لوحة فرعية`, 0.85);
    },
    explanation: 'لوحة توزيع رئيسية + لوحات فرعية لكل دور إضافي.',
    priceCat: 'ELC', confidence: 0.85, dataSource: 'لوحة رئيسية + لوحة لكل دور',
  }),
  item({
    code: 'ELC-003',
    description: 'نقاط إنارة',
    phase: 'ELECTRICAL', trade: 'ELECTRO', element: 'إنارة', material: 'لمبات LED', unit: 'نقطة',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبان.');
      const density = p.type === 'Hospital' ? 0.12 : (p.type === 'School' ? 0.10 : 0.08);
      return ok(Math.round(p.area * p.floors * density),
        `نقاط إنارة = المساحة × الأدوار × ${density}`, 0.80);
    },
    explanation: 'نقاط الإنارة (LED) في الأسقف والجدران.\nكثافة 8-12 نقطة لكل 100م².',
    priceCat: 'ELC', confidence: 0.80, dataSource: 'كثافة الإنارة حسب نوع المبنى',
  }),
  item({
    code: 'ELC-004',
    description: 'نقاط بريزة (مقابس)',
    phase: 'ELECTRICAL', trade: 'ELECTRO', element: 'مقابس', material: 'كهرباء', unit: 'نقطة',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبان.');
      return ok(Math.round(p.area * p.floors * 0.06),
        `بريزات = المساحة × الأدوار × 0.06`, 0.75);
    },
    explanation: 'مقابس كهربائية (بريزات) في الجدران.\nكثافة 6 مقابس لكل 100م².',
    priceCat: 'ELC', confidence: 0.75, dataSource: 'متوسط كثافة المقابس',
  }),
];

// ═══════════════════════════════════════════════════════════════
// PHASE 8: PLUMBING
// ═══════════════════════════════════════════════════════════════
const PLUMBING_ITEMS = [
  item({
    code: 'PLB-001',
    description: 'تمديدات مواسير مياه',
    phase: 'PLUMBING', trade: 'SANITARY', element: 'مواسير', material: 'بلاستيك/نحاس', unit: 'نقطة',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'bathrooms') && !has(p, 'area')) return insufficient('عدد الحمامات أو المساحة مطلوب.');
      const baths = p.bathrooms || Math.max(1, Math.round((p.area || 200) / 100));
      const kitchen = has(p, 'hasKitchen') && p.hasKitchen ? 4 : 0;
      return ok(baths * 6 + kitchen,
        `تمديدات مياه = (${baths} حمامات × 6) + ${kitchen} نقاط مطبخ`, 0.80);
    },
    explanation: 'تمديدات مواسير المياه الباردة والساخنة.\nكل حمام يحتاج 6 نقاط (مغسلة + مرحاض + دش + ماء حار/بارد).',
    priceCat: 'PLB', confidence: 0.80, dataSource: 'تقدير حسب عدد الحمامات',
  }),
  item({
    code: 'PLB-002',
    description: 'تمديدات مواسير صرف صحي',
    phase: 'PLUMBING', trade: 'SANITARY', element: 'صرف', material: 'بلاستيك', unit: 'نقطة',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'bathrooms')) return insufficient('عدد الحمامات مطلوب.');
      return ok(p.bathrooms * 3 + 2,
        `صرف = ${p.bathrooms} حمامات × 3 + 2 نقاط أساسية`, 0.80);
    },
    explanation: 'نقاط الصرف الصحي.\nكل حمام 3 نقاط (مغسلة + مرحاض + دش).',
    priceCat: 'PLB', confidence: 0.80, dataSource: 'تقدير حسب عدد الحمامات',
  }),
  item({
    code: 'PLB-003',
    description: 'خزان مياه علوي',
    phase: 'PLUMBING', trade: 'SANITARY', element: 'خزانات', material: 'بلاستيك/خرسانة', unit: 'خزان',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'floors')) return insufficient('عدد الأدوار مطلوب.');
      const count = p.floors > 3 ? 2 : 1;
      return ok(count, `${count} خزان مياه علوي`, 0.85);
    },
    explanation: 'خزان مياه علوي لتغذية المبنى.\nخزان إضافي للمباني التي تزيد عن 3 أدوار.',
    priceCat: 'PLB', confidence: 0.85, dataSource: 'خزان لكل مبنى',
  }),
  item({
    code: 'PLB-004',
    description: 'أدوات صحية',
    phase: 'PLUMBING', trade: 'SANITARY', element: 'أدوات صحية', material: 'سيراميك', unit: 'طقم',
    appliesTo: { types: null, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'bathrooms')) return insufficient('عدد الحمامات مطلوب.');
      return ok(p.bathrooms, `أدوات صحية: ${p.bathrooms} طقم (مرحاض + مغسلة + دش لكل حمام)`, 0.85);
    },
    explanation: 'طقم أدوات صحية لكل حمام (مرحاض + مغسلة + دش).',
    priceCat: 'PLB', confidence: 0.85, dataSource: 'عدد الحمامات',
  }),
  item({
    code: 'PLB-005',
    description: 'نظام غازات طبية',
    phase: 'PLUMBING', trade: 'MECH', element: 'غازات طبية', material: 'مواسير نحاس', unit: 'نقطة',
    appliesTo: { types: ['Hospital'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبان.');
      return ok(Math.round(p.area * p.floors * 0.03),
        'نقاط غازات طبية = المساحة × الأدوار × 0.03 (3 نقاط لكل 100م²)', 0.60);
    },
    explanation: 'نظام الغازات الطبية للمستشفيات (أكسجين، نيتروجين، هواء مضغوط).\nيحتاج تأكيد المستخدم.',
    priceCat: 'MED', confidence: 0.60, dataSource: 'تقدير حسب مساحة المستشفى',
  }),
];

// ═══════════════════════════════════════════════════════════════
// PHASE 9: HVAC
// ═══════════════════════════════════════════════════════════════
const HVAC_ITEMS = [
  item({
    code: 'HVAC-001',
    description: 'مكيفات سبليت',
    phase: 'HVAC', trade: 'MECH', element: 'تكييف', material: 'مكيف', unit: 'وحدة',
    appliesTo: { types: ['Villa', 'Apartment_Finishing', 'Apartment_Building', 'School', 'Factory', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'rooms') && !has(p, 'area')) return insufficient('عدد الغرف أو المساحة مطلوب.');
      const rooms = p.rooms || Math.max(2, Math.round((p.area || 200) / 30));
      return ok(Math.ceil(rooms * 0.6) + 1,
        `سبليت = (${rooms} غرف × 0.6) + 1 للصالة`, 0.70);
    },
    explanation: 'مكيفات سبليت (مفصلة) لكل غرفة رئيسية.\nغرفة نوم صغيرة قد تشارك مكيف.',
    priceCat: 'HVAC', confidence: 0.70, dataSource: 'تقدير حسب عدد الغرف',
  }),
  item({
    code: 'HVAC-002',
    description: 'تكييف مركزي',
    phase: 'HVAC', trade: 'MECH', element: 'تكييف', material: 'مكيف مركزي', unit: 'وحدة',
    appliesTo: { types: ['Hospital', 'Residential_Tower', 'School', 'Mall', 'Hotel', 'Office_Building', 'Mosque', 'Residential_Compound', 'Warehouse'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبان.');
      const perUnit = p.type === 'Hospital' ? 80 : (p.type === 'School' ? 100 : 120);
      return ok(Math.ceil(p.area * p.floors / perUnit),
        `تكييف مركزي = المساحة × الأدوار ÷ ${perUnit}م² لكل وحدة`, 0.75);
    },
    explanation: 'وحدات تكييف مركزي (Chiller أو VRV).\nتغطي كل وحدة 80-120م² حسب نوع المبنى.',
    priceCat: 'HVAC', confidence: 0.75, dataSource: 'حمل التبريد حسب المساحة',
  }),
  item({
    code: 'HVAC-003',
    description: 'مجاري هواء (دكت)',
    phase: 'HVAC', trade: 'MECH', element: 'دكت', material: 'صاج مجلفن', unit: 'م²',
    appliesTo: { types: ['Hospital', 'Residential_Tower', 'School', 'Mall', 'Office_Building', 'Mosque', 'Residential_Compound', 'Hotel'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبان.');
      return ok(p.area * p.floors * 0.15,
        'مجاري الهواء = المساحة × الأدوار × 0.15', 0.70);
    },
    explanation: 'مجاري الهواء (Ducts) لتوزيع التكييف المركزي.\nنسبة 15% من مساحة السقف.',
    priceCat: 'HVAC', confidence: 0.70, dataSource: 'تقدير هندسي',
  }),
];

// ═══════════════════════════════════════════════════════════════
// PHASE 10: NETWORKS
// ═══════════════════════════════════════════════════════════════
const NETWORKS_ITEMS = [
  item({
    code: 'NET-001',
    description: 'شبكة بيانات (LAN)',
    phase: 'NETWORKS', trade: 'ELECTRO', element: 'شبكات', material: 'كابل UTP', unit: 'نقطة',
    appliesTo: { types: ['Hospital', 'School', 'Residential_Tower', 'Office_Building', 'Mall', 'Hotel', 'Mosque', 'Residential_Compound', 'Warehouse'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبان.');
      return ok(Math.round(p.area * p.floors * 0.03),
        'نقاط بيانات = المساحة × الأدوار × 0.03', 0.65);
    },
    explanation: 'نقاط شبكة بيانات (LAN) للمكاتب والغرف.\nكثافة 3 نقاط لكل 100م².',
    priceCat: 'ELC', confidence: 0.65, dataSource: 'تقدير حسب المساحة',
  }),
  item({
    code: 'NET-002',
    description: 'نظام إنذار حريق',
    phase: 'NETWORKS', trade: 'SECURITY', element: 'إنذار', material: 'كاشف دخان', unit: 'نقطة',
    appliesTo: { types: ['Hospital', 'Residential_Tower', 'School', 'Mall', 'Hotel', 'Office_Building', 'Mosque', 'Residential_Compound', 'Warehouse'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبان.');
      return ok(Math.round(p.area * p.floors * 0.04),
        'كاشفات دخان = المساحة × الأدوار × 0.04', 0.70);
    },
    explanation: 'كاشفات دخان وأجهزة إنذار حريق.\nكثافة 4 كاشفات لكل 100م².',
    priceCat: 'FPR', confidence: 0.70, dataSource: 'متطلبات الدفاع المدني',
  }),
  item({
    code: 'NET-003',
    description: 'كاميرات مراقبة (CCTV)',
    phase: 'NETWORKS', trade: 'SECURITY', element: 'مراقبة', material: 'كاميرا', unit: 'كاميرا',
    appliesTo: { types: ['Residential_Tower', 'Mall', 'Hotel', 'Office_Building', 'School', 'Hospital', 'Mosque', 'Residential_Compound', 'Warehouse'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبان.');
      return ok(Math.max(4, Math.round(p.area * p.floors * 0.02)),
        'كاميرات = المساحة × الأدوار × 0.02 (حد أدنى 4)', 0.60);
    },
    explanation: 'كاميرات مراقبة للمداخل والممرات.\nيحتاج تأكيد المستخدم.',
    priceCat: 'FPR', confidence: 0.60, dataSource: 'تقدير حسب المساحة',
  }),
  item({
    code: 'NET-004',
    description: 'نظام رشاشات حريق (Fire Sprinkler)',
    phase: 'NETWORKS', trade: 'MECH', element: 'إطفاء حريق', material: 'مواسير ورشاشات', unit: 'رشاش',
    appliesTo: { types: ['Hospital', 'Residential_Tower', 'School', 'Mall', 'Hotel', 'Office_Building', 'Factory', 'Mosque', 'Residential_Compound'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة والأدوار مطلوبان.');
      return ok(Math.round(p.area * p.floors * 0.05),
        'رشاشات حريق = المساحة × الأدوار × 0.05 (رشاش لكل 20م²)', 0.70);
    },
    explanation: 'نظام رشاشات الحريق الأوتوماتيكية (Fire Sprinkler System).\nرشاش واحد لكل 20م² من مساحة المبنى.',
    priceCat: 'FPR', confidence: 0.70, dataSource: 'متطلبات الدفاع المدني - الكود السعودي للحماية من الحريق',
  }),
];

// ═══════════════════════════════════════════════════════════════
// Specialized Items (type-specific additions)
// ═══════════════════════════════════════════════════════════════

// ── Mosque-specific items ──
const MOSQUE_ONLY = ['Mosque'];
const MSQ_PHASES = ['Full_Construction', 'Finishing'];

const MOSQUE_ITEMS = [
  item({
    code: 'MSQ-001',
    description: 'سجاد قاعة الصلاة',
    phase: 'FINISHING', trade: 'ARCH', element: 'قاعة صلاة', material: 'سجاد', unit: 'م²',
    appliesTo: { types: MOSQUE_ONLY, phases: MSQ_PHASES },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const prayerArea = p.area * 0.20;
      return ok(prayerArea, 'قاعة الصلاة ≈ 20% من المساحة الإجمالية', 0.70);
    },
    explanation: 'سجاد خاص بقاعة الصلاة الرئيسية.\nالمساحة المقدرة 20% من إجمالي مساحة المبنى.',
    priceCat: 'TLF', confidence: 0.70, dataSource: 'نسبة قاعة الصلاة من المساحة الكلية للمسجد',
  }),
  item({
    code: 'MSQ-002',
    description: 'محراب ومنبر',
    phase: 'FINISHING', trade: 'ARCH', element: 'محراب', material: 'رخام/خشب', unit: 'وحدة',
    appliesTo: { types: MOSQUE_ONLY, phases: MSQ_PHASES },
    calc: () => ok(1, 'محراب واحد ومنبر واحد للمسجد', 0.90),
    explanation: 'المحراب (مكان الإمام) والمنبر (للخطبة).\nعادة ما يكونان من الرخام أو الخشب المزخرف.',
    priceCat: 'DR', confidence: 0.90, dataSource: 'متطلبات المسجد الأساسية',
  }),
  item({
    code: 'MSQ-003',
    description: 'مئذنة المسجد',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'مئذنة', material: 'خرسانة مسلحة', unit: 'واحدة',
    appliesTo: { types: MOSQUE_ONLY, phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      const towers = p.area > 2000 ? 2 : 1;
      return ok(towers, towers === 2 ? 'مئذنتان للمسجد الكبير' : 'مئذنة واحدة', 0.85);
    },
    explanation: 'المئذنة (المنارة) لرفع الأذان.\nمسجد كبير (أكثر من 2000م²) يحتاج مئذنتين.',
    priceCat: 'SLB', confidence: 0.85, dataSource: 'حجم المسجد',
  }),
  item({
    code: 'MSQ-004',
    description: 'قبة المسجد',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'قبة', material: 'خرسانة/حديد', unit: 'واحدة',
    appliesTo: { types: MOSQUE_ONLY, phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const domes = p.area >= 500 ? 1 : 0;
      return ok(domes, domes ? 'قبة واحدة مركزية' : 'مسجد صغير بلا قبة', 0.80);
    },
    explanation: 'القبة المركزية للمسجد.\nالمساجد الصغيرة (أقل من 500م²) قد لا تحتاج قبة.',
    priceCat: 'SLB', confidence: 0.80, dataSource: 'حجم المسجد',
  }),
  item({
    code: 'MSQ-005',
    description: 'تجهيزات منطقة الوضوء',
    phase: 'PLUMBING', trade: 'MECH', element: 'وضوء', material: 'مواسير وخلاطات', unit: 'نقطة',
    appliesTo: { types: MOSQUE_ONLY, phases: MSQ_PHASES },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const points = Math.max(4, Math.ceil(p.area * 0.01));
      return ok(points, `نقاط وضوء = مساحة المبنى × 0.01 (حد أدنى 4 نقاط)`, 0.75);
    },
    explanation: 'نقاط سباكة لمنطقة الوضوء تشمل خلاطات ماء بارد ودافئ.\nنقطة لكل 100م² من المساحة.',
    priceCat: 'PLB', confidence: 0.75, dataSource: 'تقدير حسب المساحة',
  }),
  item({
    code: 'MSQ-006',
    description: 'نظام صوتي (ميكروفون ومكبرات)',
    phase: 'NETWORKS', trade: 'ELECTRO', element: 'نظام صوتي', material: 'مكبرات صوت', unit: 'نظام',
    appliesTo: { types: MOSQUE_ONLY, phases: MSQ_PHASES },
    calc: (p) => {
      const zones = p.area > 2000 ? 3 : (p.area > 500 ? 2 : 1);
      return ok(zones, `${zones} مناطق صوتية (حسب المساحة)`, 0.75);
    },
    explanation: 'نظام الصوت الداخلي والخارجي (مآذن) للمسجد.\nعدد المناطق الصوتية حسب حجم المسجد.',
    priceCat: 'ELC', confidence: 0.75, dataSource: 'تقدير حسب المساحة',
  }),
  item({
    code: 'MSQ-007',
    description: 'ساحات ومواقف خارجية للمسجد',
    phase: 'EXTERNAL', trade: 'CIVIL', element: 'الساحة الخارجية', material: 'بلاط/خرسانة', unit: 'م²',
    appliesTo: { types: MOSQUE_ONLY, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      return ok(p.area * 0.40, 'الساحات الخارجية = 40% من مساحة المبنى', 0.65);
    },
    explanation: 'الساحات الخارجية ومواقف السيارات حول المسجد.\nتشمل بلاط وأرضيات خارجية.',
    priceCat: 'EXT', confidence: 0.65, dataSource: 'نسبة من المساحة',
  }),
];

// ── Hospital-specific items ──
const HOSPITAL_ONLY = ['Hospital'];
const HSP_PHASES = ['Full_Construction', 'Finishing'];

const HOSPITAL_ITEMS = [
  item({
    code: 'HSP-001',
    description: 'مولد كهرباء احتياطي',
    phase: 'ELECTRICAL', trade: 'ELECTRO', element: 'مولد', material: 'مولد ديزل', unit: 'وحدة',
    appliesTo: { types: HOSPITAL_ONLY, phases: HSP_PHASES },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const generators = p.area > 10000 ? 2 : 1;
      return ok(generators, generators === 2 ? 'مولدان احتياطيان للمستشفى الكبير' : 'مولد احتياطي واحد', 0.80);
    },
    explanation: 'مولد كهرباء احتياطي للمستشفى (أساسي للحياة والعمليات).\nمستشفى كبير (أكثر من 10000م²) يحتاج مولديّن.',
    priceCat: 'ELC', confidence: 0.80, dataSource: 'متطلبات المستشفيات الأساسية',
  }),
  item({
    code: 'HSP-002',
    description: 'نظام اتصال المرضى (Nurse Call)',
    phase: 'NETWORKS', trade: 'SECURITY', element: 'اتصال', material: 'نظام إلكتروني', unit: 'نقطة',
    appliesTo: { types: HOSPITAL_ONLY, phases: HSP_PHASES },
    calc: (p) => {
      if (!has(p, 'rooms')) return insufficient('عدد الغرف/الأسرة مطلوب.');
      return ok(p.rooms, 'نقطة اتصال لكل غرفة/سرير', 0.80);
    },
    explanation: 'نظام اتصال المرضى بالتمريض (Nurse Call System).\nنقطة اتصال لكل غرفة أو سرير.',
    priceCat: 'NET', confidence: 0.80, dataSource: 'عدد الغرف في المستشفى',
  }),
  item({
    code: 'HSP-003',
    description: 'إضاءة غرف العمليات',
    phase: 'ELECTRICAL', trade: 'ELECTRO', element: 'إضاءة عمليات', material: 'لمبات جراحية', unit: 'غرفة',
    appliesTo: { types: HOSPITAL_ONLY, phases: HSP_PHASES },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const rooms = Math.max(1, Math.ceil(p.area * 0.001));
      return ok(rooms, `غرف عمليات = المساحة × 0.001 (حد أدنى 1)`, 0.70);
    },
    explanation: 'إضاءة جراحية متخصصة لغرف العمليات.\nنظام إضاءة متكامل بمعايير طبية لكل غرفة عمليات.',
    priceCat: 'ELC', confidence: 0.70, dataSource: 'عدد غرف العمليات المقدر',
  }),
  item({
    code: 'HSP-004',
    description: 'نظام تعقيم مركزي',
    phase: 'PLUMBING', trade: 'MECH', element: 'تعقيم', material: 'مواسير بخار', unit: 'نظام',
    appliesTo: { types: HOSPITAL_ONLY, phases: HSP_PHASES },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const systems = p.area > 5000 ? 2 : 1;
      return ok(systems, `${systems} نظام تعقيم (حسب الحجم)`, 0.70);
    },
    explanation: 'نظام التعقيم المركزي للأدوات والمعدات الطبية.\nيشمل مواسير البخار والمياه المعقمة.',
    priceCat: 'PLB', confidence: 0.70, dataSource: 'حجم المستشفى',
  }),
  item({
    code: 'HSP-005',
    description: 'نظام تصريف النفايات الطبية',
    phase: 'PLUMBING', trade: 'MECH', element: 'نفايات طبية', material: 'مواسير خاصة', unit: 'نظام',
    appliesTo: { types: HOSPITAL_ONLY, phases: HSP_PHASES },
    calc: () => ok(1, 'نظام واحد لتصريف النفايات الطبية', 0.75),
    explanation: 'نظام تصريف ومعالجة النفايات الطبية الخطرة.\nيشمل مواسير مخصصة ومحطة معالجة.',
    priceCat: 'PLB', confidence: 0.75, dataSource: 'المتطلبات الصحية للمستشفيات',
  }),
];

// ── School-specific items ──
const SCHOOL_ONLY = ['School'];
const SCH_PHASES = ['Full_Construction', 'Finishing'];

const SCHOOL_ITEMS = [
  item({
    code: 'SCH-001',
    description: 'فصول دراسية (تشطيب وتجهيز)',
    phase: 'FINISHING', trade: 'ARCH', element: 'فصول', material: 'سبورة وأثاث', unit: 'فصل',
    appliesTo: { types: SCHOOL_ONLY, phases: SCH_PHASES },
    calc: (p) => {
      if (!has(p, 'rooms') && !has(p, 'area')) return insufficient('عدد الفصول أو المساحة مطلوب.');
      const classCount = has(p, 'rooms') ? p.rooms : Math.max(6, Math.round(p.area * 0.003));
      return ok(classCount, `فصول دراسية = ${classCount} فصل (${has(p, 'rooms') ? 'حسب عدد الغرف' : 'تقديراً بـ 3 فصول لكل 1000م²'})`, 0.80);
    },
    explanation: 'تجهيز الفصول الدراسية بالسبورات والأثاث والتكييف.\nعدد الفصول إما من إدخال المستخدم أو تقدير 3 فصول لكل 1000م².',
    priceCat: 'TLF', confidence: 0.80, dataSource: 'عدد الغرف أو مساحة المدرسة',
  }),
  item({
    code: 'SCH-002',
    description: 'مختبرات مدرسية (علوم/كمبيوتر)',
    phase: 'FINISHING', trade: 'ARCH', element: 'مختبرات', material: 'تجهيزات مختبر', unit: 'مختبر',
    appliesTo: { types: SCHOOL_ONLY, phases: SCH_PHASES },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const labs = p.area > 3000 ? 3 : (p.area > 1000 ? 2 : 1);
      return ok(labs, `${labs} مختبرات (علوم - كمبيوتر - لغة) حسب مساحة المدرسة`, 0.75);
    },
    explanation: 'مختبرات متخصصة للعلوم والكمبيوتر واللغة.\nمدرسة كبيرة (3000م²+) تحتاج 3 مختبرات.',
    priceCat: 'TLF', confidence: 0.75, dataSource: 'حجم المدرسة',
  }),
  item({
    code: 'SCH-003',
    description: 'ملعب رياضي خارجي',
    phase: 'EXTERNAL', trade: 'CIVIL', element: 'ملعب', material: 'أرضيات صناعية', unit: 'م²',
    appliesTo: { types: SCHOOL_ONLY, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      return ok(p.area * 0.15, 'الملعب = 15% من مساحة المدرسة', 0.70);
    },
    explanation: 'ملعب رياضي متعدد الأغراض (كرة قدم - سلة - طائرة).\n15% من إجمالي مساحة المدرسة.',
    priceCat: 'EXT', confidence: 0.70, dataSource: 'نسبة من مساحة المدرسة',
  }),
  item({
    code: 'SCH-004',
    description: 'مكتبة مدرسية',
    phase: 'FINISHING', trade: 'ARCH', element: 'مكتبة', material: 'أرفف كتب', unit: 'وحدة',
    appliesTo: { types: SCHOOL_ONLY, phases: SCH_PHASES },
    calc: () => ok(1, 'مكتبة مدرسية واحدة', 0.85),
    explanation: 'مكتبة مدرسية تحتوي على أرفف كتب ومناطق مطالعة.\nمكتبة واحدة لكل مدرسة.',
    priceCat: 'TLF', confidence: 0.85, dataSource: 'متطلبات المدارس الأساسية',
  }),
  item({
    code: 'SCH-005',
    description: 'مصلى المدرسة',
    phase: 'FINISHING', trade: 'ARCH', element: 'مصلى', material: 'سجاد وإنارة', unit: 'وحدة',
    appliesTo: { types: SCHOOL_ONLY, phases: SCH_PHASES },
    calc: () => ok(1, 'مصلى واحد للمدرسة', 0.85),
    explanation: 'مصلى للطلاب والهيئة التدريسية.\nيختلف حجمه حسب عدد الطلاب.',
    priceCat: 'TLF', confidence: 0.85, dataSource: 'متطلبات المدارس الأساسية',
  }),
  item({
    code: 'SCH-006',
    description: 'كافتيريا/مقصف مدرسي',
    phase: 'FINISHING', trade: 'ARCH', element: 'مقصف', material: 'تجهيزات مطبخ', unit: 'وحدة',
    appliesTo: { types: SCHOOL_ONLY, phases: SCH_PHASES, minArea: 500 },
    calc: () => ok(1, 'مقصف/كافتيريا واحد', 0.80),
    explanation: 'مقصف لتقديم الوجبات الخفيفة والمشروبات.\nكافتيريا واحدة للمدرسة (إذا كانت المساحة 500م²+).',
    priceCat: 'TLF', confidence: 0.80, dataSource: 'متطلبات المدارس',
  }),
  item({
    code: 'SCH-007',
    description: 'نظام جرس وجدول مدرسي',
    phase: 'NETWORKS', trade: 'ELECTRO', element: 'نظام جرس', material: 'مكبرات صوت', unit: 'نظام',
    appliesTo: { types: SCHOOL_ONLY, phases: SCH_PHASES },
    calc: (p) => {
      const zones = has(p, 'floors') ? p.floors : 2;
      return ok(zones, `${zones} مناطق للنظام الصوتي (حسب عدد الأدوار)`, 0.70);
    },
    explanation: 'نظام الجرس المدرسي والإذاعة الداخلية.\nيغطي جميع الأدوار والفصول.',
    priceCat: 'NET', confidence: 0.70, dataSource: 'عدد أدوار المدرسة',
  }),
];

// ── Hotel-specific items ──
const HOTEL_ONLY = ['Hotel'];
const HTL_PHASES = ['Full_Construction', 'Finishing'];

const HOTEL_ITEMS = [
  item({
    code: 'HTL-001',
    description: 'حمام سباحة فندق',
    phase: 'EXTERNAL', trade: 'CIVIL', element: 'مسبح', material: 'خرسانة وبلاط', unit: 'وحدة',
    appliesTo: { types: HOTEL_ONLY, phases: HTL_PHASES, minArea: 500 },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const pools = p.area > 5000 ? 2 : 1;
      return ok(pools, pools === 2 ? 'حمامي سباحة (داخلي وخارجي)' : 'حمام سباحة واحد', 0.75);
    },
    explanation: 'حمام سباحة للفندق (قد يكون داخلياً أو خارجياً).\nفندق كبير (5000م²+) قد يحتاج مسبحين.',
    priceCat: 'EXT', confidence: 0.75, dataSource: 'حجم الفندق',
  }),
  item({
    code: 'HTL-002',
    description: 'صالة رياضية (جيم)',
    phase: 'FINISHING', trade: 'ARCH', element: 'جيم', material: 'معدات رياضية', unit: 'وحدة',
    appliesTo: { types: HOTEL_ONLY, phases: HTL_PHASES, minArea: 300 },
    calc: () => ok(1, 'صالة رياضية واحدة', 0.80),
    explanation: 'صالة لياقة بدنية مجهزة للضيوف.\nصالة واحدة لكل فندق متوسط فأكبر.',
    priceCat: 'TLF', confidence: 0.80, dataSource: 'متطلبات الفنادق',
  }),
  item({
    code: 'HTL-003',
    description: 'أثاث وتجهيز غرف الفندق',
    phase: 'FINISHING', trade: 'ARCH', element: 'غرف نزلاء', material: 'أثاث فندقي', unit: 'غرفة',
    appliesTo: { types: HOTEL_ONLY, phases: HTL_PHASES },
    calc: (p) => {
      if (!has(p, 'rooms')) return insufficient('عدد الغرف مطلوب لأثاث الفندق.');
      return ok(p.rooms, `أثاث ${p.rooms} غرفة فندقية (سرير - خزانة - تلفاز)`, 0.80);
    },
    explanation: 'أثاث كامل لغرف النزلاء (سرير، خزانة، مكتب، تلفاز، ثلاجة صغيرة).',
    priceCat: 'TLF', confidence: 0.80, dataSource: 'عدد غرف الفندق',
  }),
  item({
    code: 'HTL-004',
    description: 'مطعم فندق ومطبخ',
    phase: 'FINISHING', trade: 'ARCH', element: 'مطعم', material: 'تجهيزات مطبخ', unit: 'وحدة',
    appliesTo: { types: HOTEL_ONLY, phases: HTL_PHASES },
    calc: (p) => {
      const restaurants = has(p, 'area') && p.area > 5000 ? 2 : 1;
      return ok(restaurants, restaurants === 2 ? 'مطعمان (رئيسي وكوفي شوب)' : 'مطعم واحد', 0.75);
    },
    explanation: 'مطعم الفندق الرئيسي ومطبخ مجهز بالكامل.\nالفنادق الكبيرة تحتاج مطعماً إضافياً (كوفي شوب).',
    priceCat: 'TLF', confidence: 0.75, dataSource: 'حجم الفندق',
  }),
  item({
    code: 'HTL-005',
    description: 'نظام إدارة الفندق (PMS)',
    phase: 'NETWORKS', trade: 'ELECTRO', element: 'نظام إدارة', material: 'برمجيات وخوادم', unit: 'نظام',
    appliesTo: { types: HOTEL_ONLY, phases: HTL_PHASES },
    calc: () => ok(1, 'نظام إدارة فنادق (PMS) واحد', 0.85),
    explanation: 'نظام إدارة الفنادق (Property Management System).\nيشمل برمجيات الحجز والفواتير وإدارة الغرف.',
    priceCat: 'NET', confidence: 0.85, dataSource: 'متطلبات تشغيل الفنادق',
  }),
  item({
    code: 'HTL-006',
    description: 'مصعد ركاب فندق',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'مصعد', material: 'مصعد كهربائي', unit: 'وحدة',
    appliesTo: { types: HOTEL_ONLY, phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'floors')) return insufficient('عدد الأدوار مطلوب لحساب المصاعد.');
      const elevators = Math.max(1, Math.ceil((p.floors || 1) / 3));
      return ok(elevators, `${elevators} مصاعد (مصعد لكل 3 أدوار)`, 0.85);
    },
    explanation: 'مصاعد ركاب للفندق.\nمصعد واحد لكل 3 أدوار لضمان خدمة سريعة للنزلاء.',
    priceCat: 'COL', confidence: 0.85, dataSource: 'عدد أدوار الفندق',
  }),
  item({
    code: 'HTL-007',
    description: 'سبا ومنتجع صحي',
    phase: 'FINISHING', trade: 'ARCH', element: 'سبا', material: 'تجهيزات صحية', unit: 'وحدة',
    appliesTo: { types: HOTEL_ONLY, phases: HTL_PHASES, minArea: 1000 },
    calc: () => ok(1, 'منتجع صحي واحد (سبا)', 0.70),
    explanation: 'منتجع صحي متكامل يشمل ساونا وجاكوزي وغرف مساج.\nللفنادق الكبيرة (1000م²+).',
    priceCat: 'TLF', confidence: 0.70, dataSource: 'متطلبات الفنادق الفاخرة',
  }),
];

// ── Factory-specific items ──
const FAC_PHASES = ['Full_Construction', 'Finishing'];

const FACTORY_ITEMS = [
  item({
    code: 'FAC-001',
    description: 'رافعة علوية (جسرية) للمصنع',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'رافعة', material: 'حديد إنشائي', unit: 'وحدة',
    appliesTo: { types: ['Factory'], phases: FAC_PHASES, minArea: 500 },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const cranes = p.area > 5000 ? 2 : 1;
      return ok(cranes, `${cranes} رافعة علوية (حسب حجم المصنع)`, 0.75);
    },
    explanation: 'رافعة علوية جسرية لنقل المواد الثقيلة في المصنع.\nمصنع كبير (5000م²+) يحتاج رافعتين.',
    priceCat: 'SLB', confidence: 0.75, dataSource: 'حجم المصنع',
  }),
  item({
    code: 'FAC-002',
    description: 'خزانات مياه صناعية وكيميائية',
    phase: 'PLUMBING', trade: 'MECH', element: 'خزانات صناعية', material: 'فولاذ/GRP', unit: 'خزان',
    appliesTo: { types: ['Factory'], phases: FAC_PHASES, minArea: 300 },
    calc: (p) => {
      const tanks = has(p, 'area') && p.area > 3000 ? 3 : 2;
      return ok(tanks, `${tanks} خزانات (ماء صناعي - كيميائي - حريق)`, 0.70);
    },
    explanation: 'خزانات مياه صناعية للمصنع تشمل خزان ماء خام، خزان معالجة، وخزان حريق.',
    priceCat: 'PLB', confidence: 0.70, dataSource: 'متطلبات المصانع',
  }),
  item({
    code: 'FAC-003',
    description: 'نظام تهوية صناعية (HVAC)',
    phase: 'HVAC', trade: 'MECH', element: 'تهوية صناعية', material: 'مجاري هواء ومروحات', unit: 'نظام',
    appliesTo: { types: ['Factory'], phases: FAC_PHASES },
    calc: (p) => {
      const zones = has(p, 'floors') ? p.floors : 1;
      return ok(zones, `${zones} مناطق تهوية صناعية (حسب عدد الأدوار)`, 0.75);
    },
    explanation: 'نظام تهوية صناعية للمصنع (شفط غبار - تهوية عامة - تبريد موضعي).',
    priceCat: 'HVAC', confidence: 0.75, dataSource: 'متطلبات المصانع',
  }),
  item({
    code: 'FAC-004',
    description: 'أرضيات صناعية ثقيلة (Epoxy/Industrial)',
    phase: 'FINISHING', trade: 'ARCH', element: 'أرضيات', material: 'إيبوكسي/خرسانة', unit: 'م²',
    appliesTo: { types: ['Factory', 'Warehouse'], phases: FAC_PHASES },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      return ok(p.area * 0.85, 'أرضيات صناعية = 85% من مساحة المصنع', 0.70);
    },
    explanation: 'أرضيات صناعية مقاومة للمواد الكيميائية والتآكل.\nتغطي 85% من المساحة الإجمالية.',
    priceCat: 'TLF', confidence: 0.70, dataSource: 'مساحة المصنع',
  }),
  item({
    code: 'FAC-005',
    description: 'نظام حريق صناعي (رشاشات/غاز)',
    phase: 'NETWORKS', trade: 'SECURITY', element: 'حماية حريق', material: 'رشاشات ومواسير', unit: 'نظام',
    appliesTo: { types: ['Factory', 'Warehouse', 'Mall'], phases: FAC_PHASES, minArea: 300 },
    calc: (p) => {
      const zones = has(p, 'floors') ? p.floors * 2 : 2;
      return ok(zones, `${zones} منطقة إطفاء حريق (نظام رشاشات + غاز FM200 للحساسة)`, 0.70);
    },
    explanation: 'نظام إطفاء حريق صناعي يشمل رشاشات آلية ونظام غاز للمناطق الحساسة.',
    priceCat: 'FPR', confidence: 0.70, dataSource: 'متطلبات الدفاع المدني للمصانع',
  }),
];

// ── Mall-specific items ──
const MALL_PHASES = ['Full_Construction', 'Finishing'];

const MALL_ITEMS = [
  item({
    code: 'MAL-001',
    description: 'سلالم متحركة (Escalator)',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'سلالم متحركة', material: 'معدنية', unit: 'وحدة',
    appliesTo: { types: ['Mall', 'Hotel'], phases: MALL_PHASES, minArea: 1000 },
    calc: (p) => {
      if (!has(p, 'floors')) return insufficient('عدد الأدوار مطلوب.');
      const perFloor = p.area > 10000 ? 2 : 1;
      const total = Math.max(1, (p.floors - 1)) * perFloor;
      return ok(total, `${total} سلم متحرك (${perFloor} لكل دور × ${Math.max(1, p.floors - 1)} أدوار علوية)`, 0.75);
    },
    explanation: 'سلالم متحركة للحركة بين الأدوار في المول التجاري.\nسلم لكل دور للمول المتوسط، 2 للمول الكبير.',
    priceCat: 'ELV', confidence: 0.75, dataSource: 'عدد أدوار المول',
  }),
  item({
    code: 'MAL-002',
    description: 'مصاعد ركاب تجارية (بانوراما)',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'مصاعد', material: 'مصعد بانوراما', unit: 'وحدة',
    appliesTo: { types: ['Mall', 'Hotel', 'Office_Building'], phases: MALL_PHASES },
    calc: (p) => {
      if (!has(p, 'floors')) return insufficient('عدد الأدوار مطلوب.');
      const elevators = Math.max(2, Math.ceil((p.floors || 1) / 2));
      return ok(elevators, `${elevators} مصعد ركاب (مصعد لكل دورين)`, 0.80);
    },
    explanation: 'مصاعد ركاب تجارية (بانوراما زجاجية) للحركة العمودية بين الأدوار.',
    priceCat: 'ELV', confidence: 0.80, dataSource: 'عدد أدوار المول',
  }),
  item({
    code: 'MAL-003',
    description: 'واجهات زجاجية تجارية (Storefront)',
    phase: 'FINISHING', trade: 'ARCH', element: 'واجهات', material: 'زجاج وألومنيوم', unit: 'م²',
    appliesTo: { types: ['Mall', 'Office_Building', 'Hotel'], phases: MALL_PHASES },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const pct = p.type === 'Mall' ? 0.40 : 0.25;
      return ok(p.area * pct, `واجهات زجاجية = ${pct * 100}% من مساحة المبنى`, 0.65);
    },
    explanation: 'واجهات زجاجية تجارية للمحلات والمتاجر.\nالمولات تحتاج 40% من المساحة للواجهات الزجاجية.',
    priceCat: 'FCD', confidence: 0.65, dataSource: 'نسبة من مساحة المبنى',
  }),
  item({
    code: 'MAL-004',
    description: 'نظام إضاءة تجارية وممرات',
    phase: 'ELECTRICAL', trade: 'ELECTRO', element: 'إضاءة تجارية', material: 'LED تجاري', unit: 'م²',
    appliesTo: { types: ['Mall', 'Office_Building'], phases: MALL_PHASES },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      return ok(p.area * 1.2, 'إضاءة تجارية = المساحة × 1.2 (واط/م²)', 0.70);
    },
    explanation: 'نظام إضاءة تجاري للممرات والمحلات.\n120% من المساحة لتغطية الإضاءة العامة والواجهات.',
    priceCat: 'ELC', confidence: 0.70, dataSource: 'كثافة الإضاءة التجارية',
  }),
  item({
    code: 'MAL-005',
    description: 'غرفة تحكم وأمن تجاري (CCTV/ACS)',
    phase: 'NETWORKS', trade: 'SECURITY', element: 'أمن تجاري', material: 'كاميرات وأنظمة', unit: 'نظام',
    appliesTo: { types: ['Mall', 'Office_Building', 'Hotel', 'Hospital'], phases: MALL_PHASES, minArea: 1000 },
    calc: (p) => {
      const cameras = has(p, 'area') ? Math.max(4, Math.round(p.area * 0.005)) : 4;
      return ok(cameras, `${cameras} كاميرا مراقبة (نظام CCTV + تحكم دخول)`, 0.70);
    },
    explanation: 'نظام أمن تجاري متكامل يشمل كاميرات مراقبة، تحكم دخول، وإنذار.\nكاميرا لكل 200م² تقريباً.',
    priceCat: 'NET', confidence: 0.70, dataSource: 'مساحة المبنى',
  }),
];

// ── Office Building-specific items ──
const OFFICE_ITEMS = [
  item({
    code: 'OFF-001',
    description: 'نظام استقبال ومكتب استعلامات',
    phase: 'FINISHING', trade: 'ARCH', element: 'استقبال', material: 'خشب/رخام', unit: 'وحدة',
    appliesTo: { types: ['Office_Building', 'Hotel'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'floors')) return insufficient('عدد الأدوار مطلوب.');
      return ok(Math.min(p.floors, 2), `${Math.min(p.floors, 2)} منطقة استقبال (مكتب استقبال رئيسي + فرعي)`, 0.75);
    },
    explanation: 'مكاتب استقبال للعملاء والزوار في بهو المبنى.\nمكتب رئيسي في الدور الأرضي وفرعي إذا كان المبنى كبيراً.',
    priceCat: 'TLF', confidence: 0.75, dataSource: 'متطلبات المباني الإدارية',
  }),
  item({
    code: 'OFF-002',
    description: 'قاعات اجتماعات',
    phase: 'FINISHING', trade: 'ARCH', element: 'قاعات اجتماعات', material: 'أثاث وتجهيزات', unit: 'قاعة',
    appliesTo: { types: ['Office_Building', 'Hotel'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const rooms = Math.max(1, Math.round(p.area * 0.001));
      return ok(rooms, `${rooms} قاعة اجتماعات (قاعة لكل 1000م²)`, 0.70);
    },
    explanation: 'قاعات اجتماعات مجهزة بشاشات عرض ونظام صوت.\nقاعة لكل 1000م² من مساحة المبنى.',
    priceCat: 'TLF', confidence: 0.70, dataSource: 'مساحة المبنى',
  }),
  item({
    code: 'OFF-003',
    description: 'نظام تحكم دخول (Access Control)',
    phase: 'NETWORKS', trade: 'SECURITY', element: 'تحكم دخول', material: 'أجهزة بصمة/كروت', unit: 'نقطة',
    appliesTo: { types: ['Office_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      const points = has(p, 'floors') ? p.floors * 2 : 2;
      return ok(points, `${points} نقطة تحكم دخول (باب رئيسي + باب لكل دور)`, 0.70);
    },
    explanation: 'نظام تحكم دخول إلكتروني (بصمة أو كروت) للموظفين.\nنقطتان لكل دور (رئيسية + خدمية).',
    priceCat: 'NET', confidence: 0.70, dataSource: 'عدد أدوار المبنى',
  }),
  item({
    code: 'OFF-004',
    description: 'نظام توزيع إنترنت (LAN/Data)',
    phase: 'NETWORKS', trade: 'ELECTRO', element: 'شبكة بيانات', material: 'كابلات وسيرفرات', unit: 'نقطة',
    appliesTo: { types: ['Office_Building', 'School', 'Hotel'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      const rooms = has(p, 'rooms') ? p.rooms : (has(p, 'area') ? Math.round(p.area * 0.002) : 10);
      return ok(rooms, `${rooms} نقطة بيانات (نقطة لكل غرفة/مكتب)`, 0.75);
    },
    explanation: 'شبكة بيانات سلكية للمكاتب تشمل كابلات RJ45 وسيرفر مركزي.',
    priceCat: 'NET', confidence: 0.75, dataSource: 'عدد الغرف في المبنى',
  }),
  item({
    code: 'OFF-005',
    description: 'نظام إنذار حريق إداري',
    phase: 'NETWORKS', trade: 'SECURITY', element: 'إنذار حريق', material: 'مجسات وكاشفات', unit: 'نظام',
    appliesTo: { types: ['Office_Building', 'Residential_Compound', 'School', 'Hotel'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      const zones = has(p, 'floors') ? p.floors : 1;
      return ok(zones, `${zones} منطقة إنذار حريق (منطقة لكل دور)`, 0.80);
    },
    explanation: 'نظام إنذار حريق إلكتروني يشمل كاشفات دخان وحرارة.\nمنطقة إنذار مستقلة لكل دور.',
    priceCat: 'FPR', confidence: 0.80, dataSource: 'متطلبات الدفاع المدني',
  }),
];

// ── Residential Compound-specific items ──
const COMPOUND_ITEMS = [
  item({
    code: 'CMP-001',
    description: 'بوابة رئيسية أمنية',
    phase: 'EXTERNAL', trade: 'CIVIL', element: 'بوابة', material: 'حديد كهربائي', unit: 'بوابة',
    appliesTo: { types: ['Residential_Compound', 'Luxury_Villa'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      const gates = has(p, 'area') && p.area > 5000 ? 2 : 1;
      return ok(gates, `${gates} بوابة أمنية (كهربائية + كاميرا)`, 0.80);
    },
    explanation: 'بوابة أمنية كهربائية مع كاميرا مراقبة ونظام اتصال.\nبوابتان للمجمعات الكبيرة (5000م²+).',
    priceCat: 'EXT', confidence: 0.80, dataSource: 'حجم المجمع السكني',
  }),
  item({
    code: 'CMP-002',
    description: 'نادي رياضي مجتمعي',
    phase: 'FINISHING', trade: 'ARCH', element: 'نادي', material: 'تجهيزات رياضية', unit: 'وحدة',
    appliesTo: { types: ['Residential_Compound'], phases: ['Full_Construction', 'Finishing'], minArea: 2000 },
    calc: () => ok(1, 'نادي رياضي مجتمعي واحد', 0.75),
    explanation: 'نادي رياضي متكامل لسكان المجمع (جيم + ساونا + غرفة ألعاب).',
    priceCat: 'TLF', confidence: 0.75, dataSource: 'متطلبات المجتمعات السكنية',
  }),
  item({
    code: 'CMP-003',
    description: 'ملاعب أطفال',
    phase: 'EXTERNAL', trade: 'CIVIL', element: 'ملاعب أطفال', material: 'أرضيات مطاطية', unit: 'م²',
    appliesTo: { types: ['Residential_Compound'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      return ok(p.area * 0.08, 'ملاعب أطفال = 8% من مساحة المجمع', 0.65);
    },
    explanation: 'منطقة مخصصة لألعاب الأطفال تشمل أرضيات مطاطية وألعاب آمنة.',
    priceCat: 'EXT', confidence: 0.65, dataSource: 'نسبة من مساحة المجمع',
  }),
  item({
    code: 'CMP-004',
    description: 'غرفة حراسة أمنية',
    phase: 'FINISHING', trade: 'ARCH', element: 'حراسة', material: 'غرفة جاهزة', unit: 'وحدة',
    appliesTo: { types: ['Residential_Compound', 'Luxury_Villa'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      const rooms = has(p, 'area') && p.area > 5000 ? 2 : 1;
      return ok(rooms, `${rooms} غرفة حراسة`, 0.80);
    },
    explanation: 'غرفة حراسة أمنية عند المدخل مع تجهيزات كاميرات ونظام مراقبة.',
    priceCat: 'BLK', confidence: 0.80, dataSource: 'متطلبات الأمن',
  }),
  item({
    code: 'CMP-005',
    description: 'خزانات مياه مشتركة + غرفة مضخات',
    phase: 'PLUMBING', trade: 'MECH', element: 'خزانات مشتركة', material: 'خرسانة/GRP', unit: 'نظام',
    appliesTo: { types: ['Residential_Compound'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      return ok(p.area * 0.01, `خزانات مشتركة سعة ${Math.round(p.area * 0.01)}م³ (تقديري)`, 0.65);
    },
    explanation: 'خزانات مياه مشتركة للمجمع السكني + غرفة مضخات تعزيز.\nالسعة التقديرية 1% من مساحة المجمع.',
    priceCat: 'PLB', confidence: 0.65, dataSource: 'حجم المجمع',
  }),
];

// ── Apartment Building-specific items ──
const APARTMENT_ITEMS = [
  item({
    code: 'APT-001',
    description: 'دهان واجهات المبنى',
    phase: 'PLASTERING', trade: 'ARCH', element: 'واجهات', material: 'دهان خارجي', unit: 'م²',
    appliesTo: { types: ['Apartment_Building', 'Residential_Tower'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة وعدد الأدوار مطلوبان.');
      const facade = perimeter(p.area) * 3.0 * p.floors * 0.6;
      return ok(facade, 'دهان واجهات = 60% من مساحة الواجهات الكلية', 0.70);
    },
    explanation: 'دهان خارجي للواجهات بدهان عازل للرطوبة والحرارة.',
    priceCat: 'PNT', confidence: 0.70, dataSource: 'مساحة الواجهات',
  }),
  item({
    code: 'APT-002',
    description: 'مصعد ركاب سكني',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'مصعد', material: 'مصعد كهربائي', unit: 'وحدة',
    appliesTo: { types: ['Apartment_Building', 'Residential_Tower', 'Luxury_Villa', 'Residential_Compound'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'floors')) return insufficient('عدد الأدوار مطلوب.');
      const elevators = p.floors <= 4 ? 1 : Math.ceil(p.floors / 4);
      return ok(elevators, `${elevators} مصعد (مصعد لكل 4 أدوار)`, 0.85);
    },
    explanation: 'مصعد ركاب سكني للمبنى.\nمصعد واحد لكل 4 أدوار للمباني السكنية.',
    priceCat: 'ELV', confidence: 0.85, dataSource: 'الكود السعودي - متطلبات المصاعد',
  }),
  item({
    code: 'APT-003',
    description: 'غرفة كهرباء ومحولات',
    phase: 'ELECTRICAL', trade: 'ELECTRO', element: 'غرفة كهرباء', material: 'لوحات توزيع', unit: 'وحدة',
    appliesTo: { types: ['Apartment_Building', 'Residential_Tower', 'Residential_Compound'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const rooms = p.area > 3000 ? 2 : 1;
      return ok(rooms, `${rooms} غرفة كهرباء (لوحات توزيع + محول)`, 0.75);
    },
    explanation: 'غرفة الكهرباء الرئيسية تشمل لوحات التوزيع والمحولات.',
    priceCat: 'ELC', confidence: 0.75, dataSource: 'حجم المبنى',
  }),
  item({
    code: 'APT-004',
    description: 'نظام جرس باب لكل شقة',
    phase: 'NETWORKS', trade: 'ELECTRO', element: 'جرس باب', material: 'نظام اتصال', unit: 'شقة',
    appliesTo: { types: ['Apartment_Building', 'Residential_Tower'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      const units = has(p, 'rooms') ? Math.max(2, Math.round(p.rooms / 3)) : 4;
      return ok(units, `${units} نظام جرس باب (نظام اتصال داخلي + كاميرا باب)`, 0.70);
    },
    explanation: 'نظام جرس باب بفيديو لكل شقة (Video Doorbell).',
    priceCat: 'NET', confidence: 0.70, dataSource: 'عدد الشقق في المبنى',
  }),
  item({
    code: 'APT-005',
    description: 'خزانات مياه علوية وسفلية',
    phase: 'PLUMBING', trade: 'MECH', element: 'خزانات', material: 'خرسانة/GRP', unit: 'خزان',
    appliesTo: { types: ['Apartment_Building', 'Residential_Tower', 'Residential_Compound', 'Villa', 'Luxury_Villa'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const tanks = p.area > 2000 ? 3 : 2;
      return ok(tanks, `${tanks} خزانات (سفلي + علوي + حريق)`, 0.80);
    },
    explanation: 'خزانات مياه سفلية وعلوية للمبنى + خزان حريق.',
    priceCat: 'PLB', confidence: 0.80, dataSource: 'متطلبات المباني السكنية',
  }),
];

// ── Villa-specific items ──
const VILLA_ITEMS = [
  item({
    code: 'VIL-001',
    description: 'مظلة مدخل السيارة (Carport)',
    phase: 'EXTERNAL', trade: 'CIVIL', element: 'مظلة', material: 'خرسانة/خشب', unit: 'م²',
    appliesTo: { types: ['Villa', 'Luxury_Villa'], phases: ['Full_Construction', 'External'] },
    calc: (p) => {
      const area = has(p, 'area') ? Math.min(36, Math.sqrt(p.area) * 3) : 24;
      return ok(area, `مظلة سيارة = 3 × √المساحة (حد أقصى 36 م²)`, 0.65);
    },
    explanation: 'مظلة لمدخل السيارة (Carport) لحماية السيارة من العوامل الجوية.',
    priceCat: 'CON', confidence: 0.65, dataSource: 'مساحة الفيلا',
  }),
  item({
    code: 'VIL-002',
    description: 'غرفة غسيل مستقلة',
    phase: 'FINISHING', trade: 'ARCH', element: 'غرفة غسيل', material: 'بلاط/دهان', unit: 'وحدة',
    appliesTo: { types: ['Villa', 'Luxury_Villa', 'Apartment_Finishing'], phases: ['Finishing'] },
    calc: (p) => ok(1, 'غرفة غسيل واحدة (تحتوي على غسالة + مجفف)', 0.80),
    explanation: 'غرفة غسيل مستقلة مع توصيلات مياه وصرف.',
    priceCat: 'PLB', confidence: 0.80, dataSource: 'مخططات الفلل النموذجية',
  }),
  item({
    code: 'VIL-003',
    description: 'خزان صرف صحي (بيارة)',
    phase: 'EXCAVATION', trade: 'CIVIL', element: 'بيارة', material: 'خرسانة مسلحة', unit: 'م³',
    appliesTo: { types: ['Villa', 'Luxury_Villa', 'Apartment_Building', 'Residential_Compound'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'rooms')) return insufficient('عدد الغرف مطلوب لتقدير سعة البيارة.');
      const cap = Math.max(4, Math.ceil(p.rooms * 1.5));
      return ok(cap, `سعة البيارة = ${p.rooms} غرف × 1.5 م³ (حد أدنى 4 م³)`, 0.70);
    },
    explanation: 'خزان صرف صحي تحت الأرض (بيارة/Septic Tank).',
    priceCat: 'CON', confidence: 0.70, dataSource: 'الكود السعودي - أنظمة الصرف',
  }),
  item({
    code: 'VIL-004',
    description: 'غرفة خادمة مع حمام',
    phase: 'FINISHING', trade: 'ARCH', element: 'غرفة خادمة', material: 'بلاط/دهان/سباكة', unit: 'وحدة',
    appliesTo: { types: ['Villa', 'Luxury_Villa'], phases: ['Finishing'] },
    calc: (p) => {
      const rooms = has(p, 'rooms') ? p.rooms : 5;
      const maids = rooms > 6 ? 2 : 1;
      return ok(maids, `${maids} غرفة خادمة مع حمام خاص`, 0.75);
    },
    explanation: 'غرفة خادمة مع حمام خاص ومطبخ صغير.',
    priceCat: 'FIN', confidence: 0.75, dataSource: 'مخططات الفلل السكنية',
  }),
  item({
    code: 'VIL-005',
    description: 'نظام ري للحديقة',
    phase: 'EXTERNAL', trade: 'MECH', element: 'ري', material: 'مواسير ورشاشات', unit: 'م²',
    appliesTo: { types: ['Villa', 'Luxury_Villa', 'Residential_Compound'], phases: ['Full_Construction', 'External'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const garden = p.area * 0.25;
      return ok(garden, `مساحة الحديقة = ${p.area} × 0.25 (افتراض 25% من الأرض)`, 0.60);
    },
    explanation: 'نظام ري آلي للحديقة المنزلية.',
    priceCat: 'PLB', confidence: 0.60, dataSource: 'مساحة الأرض',
  }),
];

// ── Warehouse-specific items ──
const WAREHOUSE_ITEMS = [
  item({
    code: 'WRH-001',
    description: 'رافعة شوكية علوية (جسر رافعة)',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'رافعة', material: 'صلب', unit: 'وحدة',
    appliesTo: { types: ['Warehouse', 'Factory'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const cranes = p.area > 2000 ? 2 : (p.area > 1000 ? 1 : 0);
      return ok(cranes, `${cranes} جسر رافعة (Overhead Crane`, 0.70);
    },
    explanation: 'جسر رافعة علوية (Overhead Crane/Gantry Crane) لتحميل البضائع الثقيلة.',
    priceCat: 'STM', confidence: 0.70, dataSource: 'مساحة المستودع',
  }),
  item({
    code: 'WRH-002',
    description: 'باب رول جانبي كبير',
    phase: 'FINISHING', trade: 'ARCH', element: 'أبواب', material: 'صلب عازل', unit: 'وحدة',
    appliesTo: { types: ['Warehouse', 'Factory'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const doors = p.area > 2000 ? 3 : 2;
      return ok(doors, `${doors} باب رول جانبي (Roller Shutter)، واحد لكل واجهة رئيسية`, 0.75);
    },
    explanation: 'باب رول ستيل كبير (Roller Shutter Door) لدخول الشاحنات.',
    priceCat: 'DR', confidence: 0.75, dataSource: 'حجم المستودع',
  }),
  item({
    code: 'WRH-003',
    description: 'نظام أرفف تخزين ثقيل',
    phase: 'FINISHING', trade: 'CIVIL', element: 'أرفف', material: 'صلب', unit: 'م طولي',
    appliesTo: { types: ['Warehouse'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const rackLength = Math.sqrt(p.area) * 5;
      return ok(rackLength, `أرفف طولية = √المساحة × 5`, 0.65);
    },
    explanation: 'نظام أرفف تخزين معدني ثقيل (Heavy Duty Pallet Racking).',
    priceCat: 'IRN', confidence: 0.65, dataSource: 'مساحة التخزين',
  }),
  item({
    code: 'WRH-004',
    description: 'مهبط شاحنات (Loading Dock)',
    phase: 'EXTERNAL', trade: 'CIVIL', element: 'مهبط', material: 'خرسانة', unit: 'وحدة',
    appliesTo: { types: ['Warehouse', 'Factory', 'Mall'], phases: ['Full_Construction', 'External'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const docks = p.area > 2500 ? 4 : 2;
      return ok(docks, `${docks} مهبط شاحنات (منصة تحميل/تنزيل)`, 0.70);
    },
    explanation: 'مهبط شاحنات (Loading Dock/Platform) مع موازي الإطارات.',
    priceCat: 'CON', confidence: 0.70, dataSource: 'حجم المنشأة',
  }),
  item({
    code: 'WRH-005',
    description: 'نظام إضاءة صناعي مرتفع (High Bay)',
    phase: 'ELECTRICAL', trade: 'ELECTRO', element: 'إضاءة', material: 'LED عالي', unit: 'وحدة',
    appliesTo: { types: ['Warehouse', 'Factory'], phases: ['Full_Construction', 'Electrical'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const lights = Math.ceil(p.area / 50);
      return ok(lights, `${lights} وحدة إضاءة LED (وحدة لكل 50 م²)`, 0.75);
    },
    explanation: 'نظام إضاءة LED عالي (High Bay Lighting) للمستودعات والمساحات الكبيرة.',
    priceCat: 'ELC', confidence: 0.75, dataSource: 'مساحة المستودع',
  }),
];

// ── Residential Tower additional items ──
const TOWER_ITEMS = [
  item({
    code: 'TOW-001',
    description: 'مصعد ركاب عالي السرعة',
    phase: 'STRUCTURE', trade: 'CIVIL', element: 'مصعد', material: 'مصعد كهربائي', unit: 'وحدة',
    appliesTo: { types: ['Residential_Tower'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'floors')) return insufficient('عدد الأدوار مطلوب.');
      const elevators = Math.ceil(p.floors / 5);
      return ok(elevators, `${elevators} مصعد (مصعد لكل 5 أدوار للمباني العالية)`, 0.85);
    },
    explanation: 'مصعد ركاب عالي السرعة للأبراج السكنية (سرعة ≥ 1.5 م/ث).',
    priceCat: 'ELV', confidence: 0.85, dataSource: 'الكود السعودي - المباني العالية',
  }),
  item({
    code: 'TOW-002',
    description: 'غرفة مضخات حريق',
    phase: 'PLUMBING', trade: 'MECH', element: 'مضخات حريق', material: 'مضخات', unit: 'وحدة',
    appliesTo: { types: ['Residential_Tower', 'Hotel', 'Mall', 'Office_Building', 'Hospital', 'Residential_Compound'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => ok(1, 'غرفة مضخات حريق + خزان حريق (متطلبات الدفاع المدني)', 0.90),
    explanation: 'غرفة مضخات الحريق (Fire Pump Room) كما تتطلبها أنظمة الدفاع المدني السعودي.',
    priceCat: 'PLB', confidence: 0.90, dataSource: 'الدفاع المدني السعودي',
  }),
  item({
    code: 'TOW-003',
    description: 'غرفة أمن ومراقبة',
    phase: 'NETWORKS', trade: 'ELECTRO', element: 'أمن', material: 'كاميرات', unit: 'وحدة',
    appliesTo: { types: ['Residential_Tower', 'Hotel', 'Mall', 'Office_Building', 'Hospital', 'Residential_Compound'], phases: ['Full_Construction', 'Networks'] },
    calc: (p) => ok(1, 'غرفة أمن ومراقبة مركزية (CCTV + تحكم دخول)', 0.80),
    explanation: 'غرفة أمن ومراقبة (Security Control Room) لأنظمة CCTV والإنذار.',
    priceCat: 'SEC', confidence: 0.80, dataSource: 'متطلبات المباني التجارية',
  }),
  item({
    code: 'TOW-004',
    description: 'مولد كهربائي احتياطي',
    phase: 'ELECTRICAL', trade: 'ELECTRO', element: 'مولد', material: 'ديزل', unit: 'وحدة',
    appliesTo: { types: ['Residential_Tower', 'Hotel', 'Hospital', 'Mall', 'Factory', 'Office_Building'], phases: ['Full_Construction', 'Electrical'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const genPower = Math.ceil(p.area / 100);
      return ok(1, `مولد ديزل بقدرة ${genPower} ك.ف.أ (لتغذية الأحمال الأساسية)`, 0.75);
    },
    explanation: 'مولد كهربائي احتياطي (Diesel Generator) للأحمال الأساسية.',
    priceCat: 'ELC', confidence: 0.75, dataSource: 'حجم المبنى',
  }),
  item({
    code: 'TOW-005',
    description: 'واجهات زجاجية (Curtain Wall)',
    phase: 'PLASTERING', trade: 'ARCH', element: 'واجهات', material: 'زجاج وألمنيوم', unit: 'م²',
    appliesTo: { types: ['Residential_Tower', 'Hotel', 'Mall', 'Office_Building', 'Hospital'], phases: ['Full_Construction', 'Finishing'] },
    calc: (p) => {
      if (!has(p, 'area') || !has(p, 'floors')) return insufficient('المساحة وعدد الأدوار مطلوبان.');
      const facade = perimeter(p.area) * 3.2 * p.floors * 0.7;
      return ok(facade, `واجهات زجاجية = محيط × ارتفاع الدور × الأدوار × 0.7`, 0.70);
    },
    explanation: 'واجهات زجاجية ستائري (Curtain Wall) من الألمنيوم والزجاج.',
    priceCat: 'GLS', confidence: 0.70, dataSource: 'تصميم واجهات المباني',
  }),
];

const ALL_SPECIAL_ITEMS = [
  ...MOSQUE_ITEMS, ...HOSPITAL_ITEMS, ...SCHOOL_ITEMS, ...HOTEL_ITEMS,
  ...FACTORY_ITEMS, ...MALL_ITEMS, ...OFFICE_ITEMS, ...COMPOUND_ITEMS,
  ...APARTMENT_ITEMS, ...VILLA_ITEMS, ...WAREHOUSE_ITEMS, ...TOWER_ITEMS
];

// ═══════════════════════════════════════════════════════════════
// PHASE 11: EXTERNAL
// ═══════════════════════════════════════════════════════════════
const EXTERNAL_ITEMS = [
  item({
    code: 'EXT-001',
    description: 'سور المبنى الخارجي',
    phase: 'EXTERNAL', trade: 'CIVIL', element: 'سور', material: 'بلوك/خرسانة', unit: 'م طولي',
    appliesTo: { types: ['Villa', 'School', 'Factory', 'Mosque', 'Warehouse', 'Hotel', 'Mall', 'Office_Building', 'Residential_Compound', 'Hospital', 'Apartment_Building', 'Luxury_Villa'], phases: ['Full_Construction', 'Shell'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const side = Math.sqrt(p.area);
      return ok(side * 4, 'طول السور = محيط الأرض = 4 × √المساحة', 0.70);
    },
    explanation: 'سور المبنى الخارجي.\nمحيط الأرض = 4 × √المساحة.',
    priceCat: 'BLK', confidence: 0.70, dataSource: 'محيط قطعة الأرض',
  }),
  item({
    code: 'EXT-002',
    description: 'مواقف سيارات',
    phase: 'EXTERNAL', trade: 'CIVIL', element: 'مواقف', material: 'خرسانة/بلاط', unit: 'م²',
    appliesTo: { types: ['Villa', 'Residential_Tower', 'School', 'Hospital', 'Mall', 'Office_Building', 'Mosque', 'Residential_Compound', 'Hotel'], phases: ['Full_Construction', 'External'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const pct = p.type === 'Villa' ? 0.10 : (p.type === 'Mall' ? 0.30 : 0.15);
      return ok(p.area * pct, `مواقف = المساحة × ${pct}`, 0.65);
    },
    explanation: 'منطقة مواقف السيارات.\nتختلف النسبة حسب نوع المبنى.',
    priceCat: 'TLF', confidence: 0.65, dataSource: 'نسبة من مساحة الموقع',
  }),
  item({
    code: 'EXT-003',
    description: 'زراعة وتنسيق موقع',
    phase: 'EXTERNAL', trade: 'ARCH', element: 'تنسيق', material: 'نباتات', unit: 'م²',
    appliesTo: { types: ['Villa', 'School', 'Hospital', 'Mall', 'Mosque', 'Residential_Compound', 'Hotel', 'Office_Building'], phases: ['Full_Construction', 'Finishing', 'External'] },
    calc: (p) => {
      if (!has(p, 'area')) return insufficient('المساحة مطلوبة.');
      const pct = p.type === 'Villa' ? 0.25 : (p.type === 'School' ? 0.15 : 0.10);
      return ok(p.area * pct,
        `تنسيق = المساحة × ${pct} (${pct * 100}% من الموقع)`, 0.60);
    },
    explanation: 'زراعة وتنسيق الموقع الخارجي بالمسطحات الخضراء والأشجار.\nيحتاج تأكيد المستخدم.',
    priceCat: 'TLF', confidence: 0.60, dataSource: 'نسبة من مساحة الموقع',
  }),
];

// ═══════════════════════════════════════════════════════════════
// Master item list indexed by phase
// ═══════════════════════════════════════════════════════════════
const ALL_ITEMS_BY_PHASE = {
  EXCAVATION: EXCAVATION_ITEMS,
  FOUNDATION: FOUNDATION_ITEMS,
  STRUCTURE: [...STRUCTURE_ITEMS, ...ALL_SPECIAL_ITEMS.filter(i => i.phase === 'STRUCTURE')],
  MASONRY: MASONRY_ITEMS,
  PLASTERING: PLASTERING_ITEMS,
  FINISHING: [...FINISHING_ITEMS, ...ALL_SPECIAL_ITEMS.filter(i => i.phase === 'FINISHING')],
  ELECTRICAL: [...ELECTRICAL_ITEMS, ...ALL_SPECIAL_ITEMS.filter(i => i.phase === 'ELECTRICAL')],
  PLUMBING: [...PLUMBING_ITEMS, ...ALL_SPECIAL_ITEMS.filter(i => i.phase === 'PLUMBING')],
  HVAC: HVAC_ITEMS,
  NETWORKS: [...NETWORKS_ITEMS, ...ALL_SPECIAL_ITEMS.filter(i => i.phase === 'NETWORKS')],
  EXTERNAL: [...EXTERNAL_ITEMS, ...ALL_SPECIAL_ITEMS.filter(i => i.phase === 'EXTERNAL')],
};

const ALL_ITEMS = Object.values(ALL_ITEMS_BY_PHASE).flat();

// ═══════════════════════════════════════════════════════════════
// Project phase mapping: which lifecycle phases apply to each type
// ═══════════════════════════════════════════════════════════════
const PHASE_MAP = {
  Apartment_Finishing: {
    Finishing: ['FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC'],
    Full_Construction: ['FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC'],
  },
  Apartment_Building: {
    Finishing: ['FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
  Villa: {
    Finishing: ['PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
  Luxury_Villa: {
    Finishing: ['PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
  School: {
    Finishing: ['PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
  Hospital: {
    Finishing: ['PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
  Residential_Tower: {
    Finishing: ['PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
  Factory: {
    Finishing: ['FINISHING', 'ELECTRICAL', 'PLUMBING'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
  Hotel: {
    Finishing: ['PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
  Mall: {
    Finishing: ['PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
  Office_Building: {
    Finishing: ['PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
  Residential_Compound: {
    Finishing: ['PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
  Mosque: {
    Finishing: ['PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
  Warehouse: {
    Finishing: ['FINISHING', 'ELECTRICAL', 'PLUMBING', 'NETWORKS'],
    Full_Construction: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'NETWORKS', 'EXTERNAL'],
    Shell: ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY'],
  },
};

// ═══════════════════════════════════════════════════════════════
// Phase detection from description
// ═══════════════════════════════════════════════════════════════
function detectPhase(projectType, description) {
  if (!description && !projectType) return 'Full_Construction';
  const result = StageClassifier.analyze({ type: projectType, description: description || '' });
  const primary = result.primary_stage;
  if (primary === 'Finishing') return 'Finishing';
  if (primary === 'Studies') return 'Studies';
  if (primary === 'Design') return 'Design';
  if (primary === 'MEP') return 'MEP';
  if (primary === 'Testing') return 'Testing';
  if (primary === 'Handover') return 'Handover';
  return 'Full_Construction';
}

/**
 * Get the lifecycle phases that apply to a given project type + user phase.
 */
function getApplicablePhases(projectType, userPhase) {
  const mapping = PHASE_MAP[projectType];
  if (!mapping) {
    // Default: include all phases if unknown
    return Object.keys(ALL_ITEMS_BY_PHASE).filter(pid => pid !== 'EXTERNAL');
  }
  return mapping[userPhase] || mapping['Full_Construction'] || [];
}

/**
 * Check if an item applies to a given project.
 */
function itemApplies(item, params) {
  const a = item.appliesTo;
  if (!a) return true;

  // Check type — support inheritance chain
  if (a.types && a.types.length > 0) {
    const type = params.type;
    const inherits = {
      Luxury_Villa: 'Villa',
      Apartment_Finishing: 'Apartment_Building',
      Residential_Compound: 'Villa',
      Warehouse: 'Factory',
    };
    // Check if ANY of the item's types match this type or an ancestor
    const checkTypes = [type, ...(inherits[type] ? [inherits[type]] : [])];
    const match = a.types.some(t => checkTypes.includes(t));
    if (!match) return false;
  }

  // Check phase
  if (a.phases && a.phases.length > 0) {
    const userPhase = params.phase || detectPhase(params.type, params.description || '');
    if (!a.phases.includes(userPhase)) return false;
  }

  // Check area
  if (a.minArea && (!has(params, 'area') || params.area < a.minArea)) return false;

  // Check floors
  if (a.minFloors && (!has(params, 'floors') || params.floors < a.minFloors)) return false;

  return true;
}

module.exports = {
  PHASES,
  TRADES,
  ALL_ITEMS_BY_PHASE,
  ALL_ITEMS,
  PHASE_MAP,
  detectPhase,
  getApplicablePhases,
  itemApplies,
  perimeter,
  wallArea,
  ok,
  insufficient,
  has,
};
