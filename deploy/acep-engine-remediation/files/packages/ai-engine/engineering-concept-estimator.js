'use strict';

/**
 * Engineering concept estimate library.
 *
 * This module deliberately produces a concept cost plan, not a tender BOQ.  It
 * keeps quantities, work-package coverage, and cost composition internally
 * consistent while drawings, specifications, and a dated rate book are absent.
 * Rates are parametric allocations of the governed research cost prediction;
 * they are never described as live market quotations.
 */

const VALID_UNITS = new Set(['مقطوعية', 'م²', 'م³', 'م طولي', 'كم', 'طن', 'عدد', 'نقطة', 'سرير', 'م.و', 'م.ف.أ', 'ك.ف.أ']);
const { applyScope } = require('./project-scope');

function finitePositive(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function perimeter(area) {
  const width = Math.sqrt(Math.max(1, area) / 1.5);
  return 2 * (width + width * 1.5);
}

function item(code, description, category, unit, quantity, share, calculationBasis, phase = 'CONCEPT') {
  return { code, description, category, unit, quantity, share, calculationBasis, phase };
}

function getCostComposition(projectType, family) {
  const contingencyByFamily = {
    building: 0.08,
    existing: 0.15,
    industrial: 0.12,
    linear: 0.11,
    site: 0.10,
    utility: 0.12,
    other: 0.12
  };
  let contingencyRate = contingencyByFamily[family] ?? 0.12;
  if (['hospital', 'data_center', 'tunnel', 'dam', 'oil_gas', 'heritage'].includes(projectType)) {
    contingencyRate += 0.03;
  }
  return {
    indirectRate: ['linear', 'site', 'utility'].includes(family) ? 0.11 : 0.10,
    contingencyRate,
    profitRate: 0.07,
    taxRate: 0.15,
    taxBasis: 'VAT applied after direct, indirect, contingency, and profit',
    status: 'concept_assumption'
  };
}

function allInFactor(composition) {
  const beforeProfit = 1 + composition.indirectRate + composition.contingencyRate;
  return beforeProfit * (1 + composition.profitRate) * (1 + composition.taxRate);
}

function buildingLines(type, c) {
  const facade = perimeter(c.footprint) * Math.max(1, c.floors) * 3.6;
  const external = Math.max(0, c.land - c.footprint);
  const lines = [
    item('BLD-PRE-001', 'الأعمال التمهيدية وإدارة الموقع', 'Preliminaries', 'م²', c.gross, 0.055, 'المساحة المبنية الإجمالية'),
    item('EXC-001', 'تجهيز الموقع والحفر والردم', 'Earthworks', 'م³', c.footprint * 1.5, 0.030, 'بصمة المبنى × عمق حفر مفاهيمي 1.5م'),
    item('BLD-SUB-001', 'الأساسات والأعمال تحت منسوب الأرض', 'Substructure', 'م²', c.footprint * (1 + c.basements * 0.75), 0.095, 'البصمة مع أثر الأقبية'),
    item('BLD-STR-001', 'الهيكل الإنشائي', 'Structure', 'م²', c.gross, 0.205, 'المساحة المبنية الإجمالية'),
    item('BLD-ENV-001', 'الواجهات والعزل والأسقف', 'Envelope', 'م²', facade, 0.075, 'محيط تقريبي × ارتفاع الطوابق'),
    item('BLD-ARC-001', 'القواطع والتشطيبات والأعمال المعمارية', 'Architecture', 'م²', c.gross, 0.135, 'المساحة المبنية الإجمالية'),
    item('BLD-MEC-001', 'أنظمة التكييف والتهوية الميكانيكية', 'Mechanical', 'م²', c.gross, 0.105, 'المساحة المخدومة'),
    item('BLD-ELE-001', 'القوى والإنارة والتيار الخفيف', 'Electrical', 'م²', c.gross, 0.100, 'المساحة المخدومة'),
    item('BLD-PLB-001', 'المياه والصرف والتجهيزات الصحية', 'Plumbing', 'م²', c.gross, 0.055, 'المساحة المخدومة'),
    item('BLD-FIR-001', 'الحريق والسلامة وأنظمة الإخلاء', 'FireLifeSafety', 'م²', c.gross, 0.045, 'المساحة المحمية'),
    item('BLD-EXT-001', 'الطرق والمواقف وتنسيق الموقع', 'ExternalWorks', 'م²', external, 0.045, 'المساحة الخارجية المعالجة'),
    item('BLD-COM-001', 'الاختبارات والتشغيل والتسليم', 'Commissioning', 'م²', c.gross, 0.025, 'المساحة المبنية الإجمالية')
  ];
  const specialist = {
    hospital: ['BLD-SPC-HSP', 'حزمة الأنظمة السريرية والغازات الطبية والتعقيم', 'ClinicalSystems', 'سرير', c.capacity || Math.max(1, c.gross / 290), 0.090, 'عدد الأسرة المعلن أو المستنتج'],
    hotel: ['BLD-SPC-HTL', 'حزمة غرف النزلاء والمطابخ والمغاسل', 'HospitalitySystems', 'عدد', c.capacity || Math.max(1, c.gross / 55), 0.060, 'عدد الغرف المعلن أو المستنتج'],
    data_center: ['BLD-SPC-DCT', 'حزمة الطاقة الحرجة والتبريد والاحتواء', 'MissionCritical', 'ك.ف.أ', Math.max(1, c.electricalKVA), 0.180, 'الحمل الكهربائي المرجعي'],
    mall: ['BLD-SPC-MAL', 'حزمة المناطق العامة والواجهات التجارية', 'RetailSystems', 'م²', c.gross, 0.050, 'المساحة المبنية الإجمالية'],
    school: ['BLD-SPC-SCH', 'حزمة المختبرات والملاعب وتجهيزات التعليم', 'EducationSystems', 'عدد', c.capacity || Math.max(1, c.gross / 12), 0.045, 'سعة الطلاب المعلنة أو المستنتجة'],
    mosque: ['BLD-SPC-MSQ', 'حزمة قاعة الصلاة والصوتيات والوضوء', 'WorshipSystems', 'عدد', c.capacity || Math.max(1, c.gross / 1.2), 0.045, 'سعة المصلين المعلنة أو المستنتجة'],
    mixed_use: ['BLD-SPC-MIX', 'حزمة فصل الاستخدامات والأنظمة المشتركة', 'MixedUseInterfaces', 'م²', c.gross, 0.050, 'المساحة متعددة الاستخدامات']
  }[type];
  if (specialist) lines.push(item(...specialist));
  return lines;
}

function industrialLines(type, c) {
  const lines = [
    item('IND-PRE-001', 'الأعمال التمهيدية والتجهيزات المؤقتة', 'Preliminaries', 'م²', c.gross, 0.055, 'المساحة الصناعية'),
    item('IND-EAR-001', 'تسوية الموقع والأعمال الترابية', 'Earthworks', 'م²', c.land, 0.050, 'مساحة الموقع'),
    item('IND-FND-001', 'الأساسات والقواعد للمباني والمعدات', 'Foundations', 'م²', c.footprint, 0.115, 'بصمة المنشآت'),
    item('IND-FRM-001', 'الهيكل الإنشائي والإطارات', 'Structure', 'م²', c.gross, 0.170, 'المساحة المغطاة'),
    item('IND-CLD-001', 'الأسقف والكسوات والعزل', 'Envelope', 'م²', c.gross, 0.080, 'المساحة المغطاة'),
    item('IND-FLR-001', 'الأرضيات الصناعية والأحمال الخاصة', 'IndustrialFloor', 'م²', c.gross, 0.075, 'مساحة الأرضيات'),
    item('IND-PRO-001', 'تركيبات العملية والخدمات الصناعية', 'ProcessSystems', 'م²', c.gross, type === 'warehouse' ? 0.055 : 0.155, 'المساحة الصناعية'),
    item('IND-MEC-001', 'الأنظمة الميكانيكية والتهوية', 'Mechanical', 'م²', c.gross, 0.080, 'المساحة المخدومة'),
    item('IND-ELE-001', 'القوى والتحكم والإنارة', 'Electrical', 'م²', c.gross, type === 'data_center' ? 0.180 : 0.105, 'المساحة المخدومة'),
    item('IND-FIR-001', 'الحريق وكشف الغاز والسلامة', 'FireLifeSafety', 'م²', c.gross, 0.065, 'المساحة المحمية'),
    item('IND-UTL-001', 'المرافق والشبكات الخارجية', 'Utilities', 'م²', c.land, 0.070, 'مساحة الموقع'),
    item('IND-COM-001', 'التشغيل المتكامل واختبارات الأداء', 'Commissioning', 'م²', c.gross, type === 'data_center' ? 0.080 : 0.035, 'المساحة الصناعية')
  ];
  if (type === 'power_plant') lines.push(item('IND-SPC-PWR', 'معدات التوليد والربط وأنظمة القدرة', 'GenerationEquipment', 'م.و', c.capacity || 1, 0.260, 'القدرة المعلنة'));
  if (type === 'oil_gas') lines.push(item('IND-SPC-OG', 'معدات العملية والأنابيب والآلات الدوارة', 'ProcessEquipment', 'مقطوعية', 1, 0.280, 'حزمة عملية مفاهيمية'));
  if (type === 'data_center') lines.push(item('IND-SPC-DCT', 'الخوادم الحرجة وUPS والمولدات والتبريد الدقيق', 'MissionCritical', 'ك.ف.أ', Math.max(1, c.electricalKVA), 0.240, 'الحمل الكهربائي المرجعي'));
  return lines;
}

function roadLines(c) {
  const lanes = Math.max(2, Math.round(c.width / 3.5));
  return [
    item('RD-PRE-001', 'التعبئة وإدارة الحركة المؤقتة', 'Preliminaries', 'كم', c.length / 1000, 0.055, 'طول الطريق'),
    item('RD-SUR-001', 'الرفع المساحي والتوقيع', 'Survey', 'كم', c.length / 1000, 0.020, 'طول الطريق'),
    item('RD-CLR-001', 'إزالة العوائق وتنظيف الحرم', 'SiteClearance', 'م²', c.area, 0.025, 'الطول × العرض'),
    item('RD-EWK-001', 'القطع والردم والأعمال الترابية', 'Earthworks', 'م³', c.area * 0.45, 0.115, 'مساحة الممر × عمق ترابي مفاهيمي 0.45م'),
    item('RD-SUB-001', 'تحسين ودك التربة التأسيسية', 'Subgrade', 'م²', c.area, 0.070, 'مساحة الرصف'),
    item('RD-SBB-001', 'طبقة تحت الأساس الحصوية', 'Subbase', 'م³', c.area * 0.25, 0.095, 'مساحة الرصف × 0.25م'),
    item('RD-BAS-001', 'طبقة الأساس الحصوية', 'Roadbase', 'م³', c.area * 0.20, 0.095, 'مساحة الرصف × 0.20م'),
    item('RD-ASB-001', 'الطبقة الإسفلتية الرابطة', 'Asphalt', 'طن', c.area * 0.07 * 2.35, 0.135, 'مساحة الرصف × 0.07م × كثافة 2.35طن/م³'),
    item('RD-ASW-001', 'طبقة الإسفلت السطحية', 'Asphalt', 'طن', c.area * 0.05 * 2.35, 0.125, 'مساحة الرصف × 0.05م × كثافة 2.35طن/م³'),
    item('RD-DRN-001', 'تصريف مياه الأمطار والعبارات', 'Drainage', 'م طولي', c.length * 2, 0.085, 'جانبا الطريق'),
    item('RD-KRB-001', 'الأرصفة والبردورات', 'Kerbs', 'م طولي', c.length * 2, 0.040, 'جانبا الطريق'),
    item('RD-MRK-001', 'الدهانات والعلامات الأرضية', 'RoadMarking', 'م طولي', c.length * (lanes + 1), 0.025, 'خطوط المسارات والحواف'),
    item('RD-LGT-001', 'إنارة الطريق', 'Lighting', 'نقطة', Math.max(1, Math.ceil(c.length / 35)), 0.040, 'نقطة كل 35م تقريبًا'),
    item('RD-SGN-001', 'اللوحات والحواجز وتجهيزات السلامة', 'RoadFurniture', 'عدد', Math.max(1, Math.ceil(c.length / 250)), 0.035, 'توزيع مفاهيمي على طول المسار'),
    item('RD-UTL-001', 'تحويل وحماية الخدمات القائمة', 'UtilityDiversions', 'كم', c.length / 1000, 0.040, 'طول الطريق')
  ];
}

function bridgeLines(c) {
  return [
    item('BR-PRE-001', 'التعبئة وإدارة الموقع والتحويلات', 'Preliminaries', 'م²', c.area, 0.055, 'مساحة سطح الجسر'),
    item('BR-SUR-001', 'الرفع والتحريات الجيوتقنية والهيدرولوجية', 'Investigations', 'م طولي', c.length, 0.035, 'طول الجسر'),
    item('BR-FND-001', 'الخوازيق والقواعد والدعامات', 'Substructure', 'م³', c.area * 0.55, 0.245, 'حجم خرساني مفاهيمي للبنية التحتية'),
    item('BR-SUP-001', 'الكمرات والبلاطة والهيكل العلوي', 'Superstructure', 'م³', c.area * 0.50, 0.270, 'حجم خرساني مفاهيمي للهيكل العلوي'),
    item('BR-STL-001', 'حديد التسليح والشد اللاحق', 'StructuralSteel', 'طن', c.area * 0.11, 0.135, 'معدل 0.11 طن/م² سطح'),
    item('BR-BRG-001', 'المساند وفواصل التمدد', 'BearingsJoints', 'عدد', Math.max(4, Math.ceil(c.length / 35) * 4), 0.060, 'حسب عدد البحور المفاهيمي'),
    item('BR-DEC-001', 'عزل ورصف سطح الجسر', 'DeckFinishes', 'م²', c.area, 0.055, 'مساحة السطح'),
    item('BR-DRN-001', 'تصريف السطح', 'Drainage', 'م طولي', c.length * 2, 0.025, 'جانبا الجسر'),
    item('BR-SAF-001', 'الحواجز والدرابزين واللوحات', 'RoadFurniture', 'م طولي', c.length * 2, 0.040, 'جانبا الجسر'),
    item('BR-APP-001', 'طرق الاقتراب والحماية', 'ApproachWorks', 'م²', Math.max(c.area * 0.5, c.width * 200), 0.050, 'منطقتا الاقتراب'),
    item('BR-COM-001', 'اختبارات التحميل والتشغيل', 'Commissioning', 'مقطوعية', 1, 0.030, 'حزمة اختبار واحدة')
  ];
}

function tunnelLines(c) {
  return [
    item('TN-PRE-001', 'التعبئة والتحريات ومراقبة الحركة الأرضية', 'Preliminaries', 'م طولي', c.length, 0.055, 'طول النفق'),
    item('TN-EXC-001', 'الحفر والدعم الأولي', 'ExcavationSupport', 'م³', c.area * 0.85, 0.260, 'مساحة المقطع المعالجة × معامل الحفر'),
    item('TN-LIN-001', 'البطانة الخرسانية الدائمة', 'Lining', 'م³', c.area * 0.35, 0.180, 'حجم بطانة مفاهيمي'),
    item('TN-WPR-001', 'العزل المائي والحقن', 'Waterproofing', 'م²', c.area * 1.8, 0.055, 'مساحة غلاف مفاهيمية'),
    item('TN-SLB-001', 'بلاطة الطريق أو السكة', 'TrackRoadSlab', 'م²', c.area, 0.080, 'المساحة المعالجة'),
    item('TN-VEN-001', 'التهوية والتحكم بالدخان', 'Ventilation', 'م طولي', c.length, 0.105, 'طول النفق'),
    item('TN-FIR-001', 'الحريق والإخلاء ومخارج الطوارئ', 'FireLifeSafety', 'م طولي', c.length, 0.090, 'طول النفق'),
    item('TN-ELE-001', 'القوى والإنارة والتحكم والاتصالات', 'ElectricalControls', 'م طولي', c.length, 0.095, 'طول النفق'),
    item('TN-DRN-001', 'الصرف ومحطات الضخ', 'Drainage', 'م طولي', c.length * 2, 0.050, 'خطا صرف طوليان'),
    item('TN-COM-001', 'التشغيل المتكامل وسيناريوهات الطوارئ', 'Commissioning', 'مقطوعية', 1, 0.030, 'حزمة اختبار واحدة')
  ];
}

function railwayLines(c) {
  return [
    item('RL-PRE-001', 'التعبئة والمسح والتحريات', 'Preliminaries', 'كم', c.length / 1000, 0.045, 'طول المسار'),
    item('RL-EWK-001', 'الأعمال الترابية وتشكيل المسار', 'Earthworks', 'م³', c.area * 0.60, 0.160, 'مساحة الحرم × عمق مفاهيمي'),
    item('RL-DRN-001', 'الصرف والعبارات', 'Drainage', 'م طولي', c.length * 2, 0.065, 'جانبا المسار'),
    item('RL-FRM-001', 'طبقات التأسيس وتحت البالاست', 'Formation', 'م³', c.area * 0.35, 0.115, 'مساحة المسار × 0.35م'),
    item('RL-BAL-001', 'البالاست', 'Ballast', 'م³', c.area * 0.30, 0.080, 'مساحة المسار × 0.30م'),
    item('RL-TRK-001', 'القضبان والفلنكات والمثبتات', 'Trackwork', 'كم', c.length / 1000, 0.210, 'طول السكة'),
    item('RL-SIG-001', 'الإشارات والاتصالات والتحكم', 'Signalling', 'كم', c.length / 1000, 0.115, 'طول المسار'),
    item('RL-PWR-001', 'الكهربة ومحطات التغذية', 'TractionPower', 'كم', c.length / 1000, 0.105, 'طول المسار'),
    item('RL-COM-001', 'الاختبارات والتشغيل التجريبي', 'Commissioning', 'كم', c.length / 1000, 0.055, 'طول المسار')
  ];
}

function renewableLines(c) {
  const capacity = c.capacity || Math.max(1, c.land / 10000);
  return [
    item('RE-PRE-001', 'الدراسات والتعبئة وإدارة الموقع', 'Preliminaries', 'م.و', capacity, 0.045, 'القدرة المعلنة'),
    item('RE-CIV-001', 'التسوية والطرق والأساسات', 'CivilWorks', 'م²', c.land, 0.105, 'مساحة الموقع'),
    item('RE-GEN-001', 'وحدات التوليد المتجدد', 'GenerationEquipment', 'م.و', capacity, 0.355, 'القدرة المعلنة'),
    item('RE-MNT-001', 'الهياكل وأنظمة التتبع', 'MountingSystems', 'م.و', capacity, 0.120, 'القدرة المعلنة'),
    item('RE-DC-001', 'شبكات التيار المستمر والتجميع', 'DCCollection', 'م.و', capacity, 0.085, 'القدرة المعلنة'),
    item('RE-INV-001', 'العواكس ومحطات التحويل', 'InvertersTransformers', 'م.و', capacity, 0.115, 'القدرة المعلنة'),
    item('RE-GRD-001', 'محطة الربط وخط التصدير', 'GridConnection', 'م.و', capacity, 0.095, 'القدرة المعلنة'),
    item('RE-SCA-001', 'الحماية والتحكم وSCADA والأرصاد', 'Controls', 'م.و', capacity, 0.040, 'القدرة المعلنة'),
    item('RE-SEC-001', 'السياج والأمن والمراقبة', 'Security', 'م طولي', perimeter(c.land), 0.020, 'محيط الموقع التقريبي'),
    item('RE-COM-001', 'الاختبارات والتشغيل وقياس الأداء', 'Commissioning', 'م.و', capacity, 0.020, 'القدرة المعلنة')
  ];
}

function waterLines(c) {
  if (c.length > 0) {
    const diameter = Math.max(0.2, Math.min(2.0, Math.sqrt((c.capacity || 10000) / 86400 / 1.2 / Math.PI) * 2));
    return [
      item('WT-PRE-001', 'التعبئة والمسح وكشف الخدمات', 'Preliminaries', 'كم', c.length / 1000, 0.055, 'طول الخط'),
      item('WT-TRN-001', 'حفر الخندق وتدعيمه ونزح المياه', 'Trenching', 'م³', c.length * c.width * 2.2, 0.155, 'الطول × عرض الخندق × عمق مفاهيمي'),
      item('WT-BED-001', 'فرشة وإحاطة الأنبوب', 'Bedding', 'م³', c.length * c.width * 0.55, 0.065, 'الطول × عرض الخندق × 0.55م'),
      item('WT-PIP-001', 'توريد وتركيب خط الأنابيب', 'Pipeline', 'م طولي', c.length, 0.360, `طول الخط؛ قطر هيدروليكي مرجعي ${round(diameter, 2)}م`),
      item('WT-VLV-001', 'غرف المحابس والملحقات', 'ValvesChambers', 'عدد', Math.max(2, Math.ceil(c.length / 1000)), 0.105, 'غرفة لكل كيلومتر تقريبًا'),
      item('WT-TST-001', 'الاختبار والتطهير والتشغيل', 'TestingCommissioning', 'م طولي', c.length, 0.055, 'طول الخط'),
      item('WT-REI-001', 'إعادة الوضع والطرق والمعابر', 'Reinstatement', 'م²', c.length * c.width, 0.145, 'مساحة مسار الخندق'),
      item('WT-CNT-001', 'القياس والتحكم وSCADA', 'Controls', 'عدد', Math.max(1, Math.ceil(c.length / 5000)), 0.060, 'نقاط تحكم موزعة')
    ];
  }
  return [
    item('WTP-PRE-001', 'الدراسات والتعبئة والأعمال المؤقتة', 'Preliminaries', 'م²', c.land, 0.055, 'مساحة الموقع'),
    item('WTP-CIV-001', 'الأحواض والمنشآت الخرسانية', 'CivilStructures', 'م³', c.area * 0.55, 0.235, 'حجم خرساني مفاهيمي'),
    item('WTP-PRO-001', 'معدات المعالجة والمرشحات', 'ProcessEquipment', 'مقطوعية', 1, 0.285, 'حزمة معالجة مفاهيمية'),
    item('WTP-PMP-001', 'المضخات والأنابيب والصمامات', 'Mechanical', 'مقطوعية', 1, 0.155, 'حزمة ميكانيكية'),
    item('WTP-ELE-001', 'القوى والتوزيع والمولدات', 'Electrical', 'ك.ف.أ', Math.max(1, c.electricalKVA), 0.105, 'الحمل المرجعي'),
    item('WTP-ICA-001', 'الأجهزة والتحكم وSCADA', 'Controls', 'مقطوعية', 1, 0.080, 'حزمة تحكم'),
    item('WTP-EXT-001', 'الخزانات والشبكات والأعمال الخارجية', 'ExternalWorks', 'م²', c.land, 0.055, 'مساحة الموقع'),
    item('WTP-COM-001', 'اختبارات الأداء والتشغيل', 'Commissioning', 'مقطوعية', 1, 0.030, 'حزمة اختبار واحدة')
  ];
}

function powerLines(c) {
  const capacity = c.capacity || Math.max(1, c.electricalKVA / 1000);
  return [
    item('PW-PRE-001', 'الدراسات والتعبئة والتنسيق مع الشبكة', 'Preliminaries', 'مقطوعية', 1, 0.050, 'حزمة واحدة'),
    item('PW-CIV-001', 'المباني والقواعد والممرات والخنادق', 'CivilWorks', 'م²', c.land, 0.140, 'مساحة الموقع'),
    item('PW-TRF-001', 'المحولات ومعدات الجهد العالي', 'PrimaryEquipment', 'م.ف.أ', capacity, 0.315, 'القدرة الظاهرية بالميجافولت أمبير؛ ليست مستوى الجهد'),
    item('PW-SWG-001', 'المفاتيح والقضبان ومعدات الحماية', 'Switchgear', 'م.ف.أ', capacity, 0.180, 'القدرة الظاهرية بالميجافولت أمبير'),
    item('PW-CAB-001', 'الكابلات والنهايات ومساراتها', 'Cabling', 'م طولي', Math.max(100, c.land * 0.12), 0.115, 'طول كابلات مفاهيمي'),
    item('PW-EAR-001', 'شبكة التأريض والحماية من الصواعق', 'Earthing', 'م²', c.land, 0.050, 'مساحة الموقع'),
    item('PW-CTL-001', 'الحماية والتحكم والاتصالات وSCADA', 'Controls', 'مقطوعية', 1, 0.095, 'حزمة تحكم'),
    item('PW-COM-001', 'الاختبارات والربط والتشغيل', 'Commissioning', 'م.ف.أ', capacity, 0.055, 'القدرة الظاهرية بالميجافولت أمبير')
  ];
}

function damLines(c) {
  return [
    item('DM-PRE-001', 'التحريات والتعبئة وتحويل المجرى', 'Preliminaries', 'مقطوعية', 1, 0.070, 'حزمة واحدة'),
    item('DM-EXC-001', 'الحفر والمعالجة الجيوتقنية', 'Excavation', 'م³', c.area * 0.9, 0.135, 'مساحة الأعمال × عمق مفاهيمي'),
    item('DM-BDY-001', 'جسم السد والردميات أو الخرسانة', 'DamBody', 'م³', c.area * 1.1, 0.330, 'حجم مرجعي من نموذج النوع'),
    item('DM-SPW-001', 'المفيض ومنشآت التبديد', 'Spillway', 'مقطوعية', 1, 0.150, 'حزمة مفيض'),
    item('DM-INT-001', 'المآخذ والمخارج والبوابات', 'HydraulicStructures', 'مقطوعية', 1, 0.120, 'حزمة هيدروليكية'),
    item('DM-GRT-001', 'الحقن والستارة القاطعة والصرف', 'GroundTreatment', 'م²', c.area, 0.080, 'مساحة المعالجة'),
    item('DM-INS-001', 'الأجهزة والمراقبة والتحكم', 'Instrumentation', 'عدد', Math.max(10, Math.ceil(c.area / 5000)), 0.055, 'نقاط مراقبة مفاهيمية'),
    item('DM-EXT-001', 'طرق الوصول والمرافق', 'ExternalWorks', 'م²', c.land, 0.040, 'مساحة الموقع'),
    item('DM-COM-001', 'الملء الأول والتشغيل وخطة الطوارئ', 'Commissioning', 'مقطوعية', 1, 0.020, 'حزمة واحدة')
  ];
}

function telecomLines(c) {
  const length = c.length || Math.sqrt(c.land) * 4;
  return [
    item('TC-PRE-001', 'التصميم والمسح والتصاريح', 'Preliminaries', 'كم', length / 1000, 0.060, 'طول الشبكة'),
    item('TC-CIV-001', 'الحفر والدكت وغرف التفتيش', 'CivilWorks', 'م طولي', length, 0.210, 'طول الشبكة'),
    item('TC-FBR-001', 'كابلات الألياف والوصلات', 'FiberNetwork', 'م طولي', length, 0.250, 'طول الشبكة'),
    item('TC-TWR-001', 'الأبراج والقواعد والهوائيات', 'Towers', 'عدد', Math.max(1, Math.ceil(length / 5000)), 0.180, 'برج لكل 5كم تقريبًا'),
    item('TC-ACT-001', 'المعدات النشطة ومراكز التجميع', 'ActiveEquipment', 'عدد', Math.max(1, Math.ceil(length / 2500)), 0.170, 'عقد شبكة موزعة'),
    item('TC-PWR-001', 'الطاقة الاحتياطية والتأريض', 'Power', 'عدد', Math.max(1, Math.ceil(length / 5000)), 0.075, 'حسب مواقع الأبراج'),
    item('TC-NMS-001', 'إدارة الشبكة والأمن السيبراني', 'Controls', 'مقطوعية', 1, 0.035, 'حزمة واحدة'),
    item('TC-COM-001', 'الاختبارات والقبول والتشغيل', 'Commissioning', 'كم', length / 1000, 0.020, 'طول الشبكة')
  ];
}

function landscapeLines(c) {
  return [
    item('LS-PRE-001', 'المسح والتعبئة وحماية الموقع', 'Preliminaries', 'م²', c.land, 0.050, 'مساحة الموقع'),
    item('LS-EWK-001', 'التشكيل والأعمال الترابية وتحسين التربة', 'Earthworks', 'م³', c.land * 0.20, 0.105, 'مساحة الموقع × 0.20م'),
    item('LS-HRD-001', 'الرصف والساحات والعناصر الصلبة', 'Hardscape', 'م²', c.land * 0.35, 0.270, '35% من مساحة الموقع'),
    item('LS-SFT-001', 'الزراعة والأشجار والتربة الزراعية', 'Softscape', 'م²', c.land * 0.50, 0.205, '50% من مساحة الموقع'),
    item('LS-IRR-001', 'شبكة الري والتحكم', 'Irrigation', 'م²', c.land * 0.50, 0.130, 'المساحة المزروعة'),
    item('LS-LGT-001', 'إنارة الموقع', 'Lighting', 'نقطة', Math.max(1, Math.ceil(c.land / 400)), 0.085, 'نقطة لكل 400م² تقريبًا'),
    item('LS-DRN-001', 'الصرف السطحي وإدارة مياه الأمطار', 'Drainage', 'م²', c.land, 0.075, 'مساحة الموقع'),
    item('LS-FUR-001', 'الأثاث والعلامات وتجهيزات الموقع', 'SiteFurniture', 'عدد', Math.max(1, Math.ceil(c.land / 800)), 0.055, 'عنصر لكل 800م² تقريبًا'),
    item('LS-COM-001', 'الاختبارات وفترة التأسيس والصيانة الأولية', 'Commissioning', 'م²', c.land, 0.025, 'مساحة الموقع')
  ];
}

function existingLines(type, c) {
  const conservation = type === 'heritage';
  return [
    item('EX-PRE-001', 'المسح وفتح العينات والتوثيق', 'Investigations', 'م²', c.gross, conservation ? 0.085 : 0.050, 'المساحة القائمة'),
    item('EX-DEM-001', 'الإزالة الانتقائية والتخلص', 'Demolition', 'م²', c.gross, 0.100, 'المساحة القائمة'),
    item('EX-REP-001', conservation ? 'تدعيم وترميم النسيج التاريخي' : 'الإصلاحات والتدعيم الإنشائي', conservation ? 'Conservation' : 'StructuralRepairs', 'م²', c.gross, conservation ? 0.220 : 0.120, 'المساحة القائمة'),
    item('EX-ENV-001', 'إصلاح الغلاف والعزل ومنع التسرب', 'Envelope', 'م²', perimeter(c.footprint) * c.floors * 3.3, 0.095, 'مساحة الواجهات التقريبية'),
    item('EX-ARC-001', 'القواطع والتشطيبات والتجهيز الداخلي', 'Architecture', 'م²', c.gross, type === 'fitout' ? 0.260 : 0.185, 'المساحة القائمة'),
    item('EX-MEP-001', 'تجديد الأنظمة الميكانيكية والصحية', 'Mechanical', 'م²', c.gross, 0.135, 'المساحة المخدومة'),
    item('EX-ELE-001', 'تجديد القوى والإنارة والتيار الخفيف', 'Electrical', 'م²', c.gross, 0.115, 'المساحة المخدومة'),
    item('EX-FIR-001', 'تحديث الحريق والسلامة', 'FireLifeSafety', 'م²', c.gross, 0.060, 'المساحة المحمية'),
    item('EX-EXT-001', 'إعادة الوضع والأعمال الخارجية', 'ExternalWorks', 'م²', Math.max(1, c.land - c.footprint), 0.035, 'المساحة الخارجية'),
    item('EX-COM-001', 'الاختبارات والتشغيل والتسليم المرحلي', 'Commissioning', 'م²', c.gross, 0.035, 'المساحة القائمة')
  ];
}

function genericSiteLines(type, c) {
  const label = type === 'airport' ? 'المطار' : type === 'port' ? 'الميناء' : type === 'sports' ? 'المنشأة الرياضية' : 'الموقع';
  return [
    item('ST-PRE-001', `الدراسات والتعبئة وإدارة ${label}`, 'Preliminaries', 'م²', c.land, 0.055, 'مساحة الموقع'),
    item('ST-EWK-001', 'التسوية والأعمال الترابية', 'Earthworks', 'م³', c.land * 0.35, 0.125, 'مساحة الموقع × عمق مفاهيمي'),
    item('ST-CIV-001', 'المنشآت والأعمال المدنية الرئيسية', 'CivilWorks', 'م²', c.area, 0.220, 'المساحة المعالجة'),
    item('ST-PAV-001', 'الساحات والطرق والرصف التشغيلي', 'Pavements', 'م²', c.land * 0.55, 0.185, '55% من الموقع'),
    item('ST-BLD-001', 'المباني التشغيلية والخدمية', 'Buildings', 'م²', Math.max(c.area * 0.15, c.gross * 0.15), 0.145, 'حصة مبانٍ تشغيلية مفاهيمية'),
    item('ST-MEP-001', 'المرافق والأنظمة الميكانيكية والكهربائية', 'Utilities', 'م²', c.land, 0.125, 'مساحة الموقع'),
    item('ST-SPC-001', 'المعدات والأنظمة التشغيلية المتخصصة', 'SpecialistSystems', 'مقطوعية', 1, 0.095, 'حزمة متخصصة'),
    item('ST-SAF-001', 'الأمن والسلامة والتحكم', 'SafetySecurity', 'مقطوعية', 1, 0.030, 'حزمة واحدة'),
    item('ST-COM-001', 'اختبارات التكامل والتشغيل', 'Commissioning', 'مقطوعية', 1, 0.020, 'حزمة واحدة')
  ];
}

function genericLines(c) {
  return [
    item('GN-PRE-001', 'الدراسات والتعبئة وإدارة المشروع', 'Preliminaries', 'م²', c.area, 0.080, 'المساحة المعالجة'),
    item('GN-CIV-001', 'الأعمال المدنية والإنشائية', 'CivilWorks', 'م²', c.area, 0.300, 'المساحة المعالجة'),
    item('GN-ARC-001', 'الأعمال المعمارية والتشطيبات', 'Architecture', 'م²', c.area, 0.180, 'المساحة المعالجة'),
    item('GN-MEP-001', 'الأعمال الميكانيكية والصحية', 'Mechanical', 'م²', c.area, 0.150, 'المساحة المعالجة'),
    item('GN-ELE-001', 'الأعمال الكهربائية والتحكم', 'Electrical', 'م²', c.area, 0.140, 'المساحة المعالجة'),
    item('GN-EXT-001', 'المرافق والأعمال الخارجية', 'ExternalWorks', 'م²', c.land, 0.100, 'مساحة الموقع'),
    item('GN-COM-001', 'الاختبارات والتشغيل والتسليم', 'Commissioning', 'مقطوعية', 1, 0.050, 'حزمة واحدة')
  ];
}

function selectLines(type, family, c) {
  if (type === 'road') return roadLines(c);
  if (type === 'bridge') return bridgeLines(c);
  if (type === 'tunnel') return tunnelLines(c);
  if (type === 'railway') return railwayLines(c);
  if (type === 'renewable_energy') return renewableLines(c);
  if (type === 'water') return waterLines(c);
  if (type === 'dam') return damLines(c);
  if (type === 'power') return powerLines(c);
  if (type === 'telecom') return telecomLines(c);
  if (type === 'landscape') return landscapeLines(c);
  if (['airport', 'port', 'sports'].includes(type)) return genericSiteLines(type, c);
  if (family === 'existing') return existingLines(type, c);
  if (family === 'industrial') return industrialLines(type, c);
  if (family === 'building') return buildingLines(type, c);
  if (family === 'site') return genericSiteLines(type, c);
  return genericLines(c);
}

function buildConceptEstimate(prediction, extra = {}) {
  if (!prediction?.available) return null;
  const type = prediction.projectType;
  const family = prediction.family;
  const gross = finitePositive(prediction.inputs.grossBuiltArea, 1);
  const footprint = finitePositive(prediction.inputs.footprintArea, gross);
  const land = finitePositive(prediction.inputs.landArea, footprint * 1.2);
  const suppliedLength = finitePositive(extra.length);
  const suppliedWidth = finitePositive(extra.width);
  let width = suppliedWidth;
  let length = suppliedLength;
  if (!length && width) length = gross / width;
  if (!width && length) width = gross / length;
  if (!length && ['linear', 'utility'].includes(family)) {
    width = width || ({ road: 24, bridge: 20, tunnel: 12, railway: 12, water: 2, telecom: 1.2 }[type] || 10);
    length = gross / width;
  }
  length = length || Math.sqrt(gross * 1.5);
  width = width || gross / length;

  const context = {
    type,
    family,
    gross,
    area: gross,
    footprint,
    land,
    floors: finitePositive(prediction.inputs.floors, 1),
    basements: Math.max(0, Number(prediction.inputs.basements) || 0),
    capacity: finitePositive(extra.capacity, finitePositive(prediction.inputs.capacity)),
    length,
    width,
    electricalKVA: finitePositive(prediction.predictions.electricalKVA, 1)
  };
  const fullDefinitions = selectLines(type, family, context).filter(definition => finitePositive(definition.quantity));
  const scope = applyScope(fullDefinitions, extra, family);
  if (scope.unresolved || !scope.items.some(line => !['Preliminaries', 'Commissioning', 'TestingCommissioning'].includes(line.category))) {
    return { items: [], assumptions: [], summary: { status: 'blocked', reason: 'scope_needs_clarification', totalCost: null, totalItems: 0, scope, contractualUse: false } };
  }
  const definitions = scope.items;
  // Do not renormalize remaining packages: excluded work must reduce the cost.
  const totalShare = scope.allShare;
  const composition = getCostComposition(type, family);
  const modelAllInCost = finitePositive(prediction.predictions.costSar, 0);
  const directBudget = modelAllInCost / allInFactor(composition);
  const items = definitions.map((definition, index) => {
    const quantity = round(definition.quantity, 2);
    const normalizedShare = definition.share / totalShare;
    const allocatedCost = directBudget * normalizedShare;
    const unitPrice = round(allocatedCost / quantity, 2);
    const totalPrice = round(quantity * unitPrice, 2);
    return {
      code: definition.code,
      description: definition.description,
      category: definition.category,
      discipline: definition.discipline,
      scopeStatus: definition.scopeStatus,
      material: definition.category,
      unit: VALID_UNITS.has(definition.unit) ? definition.unit : 'مقطوعية',
      quantity,
      unitPrice,
      totalPrice,
      phase: definition.phase,
      phaseName: 'تقدير مفاهيمي',
      calculationMethod: definition.calculationBasis,
      quantityFormula: definition.calculationBasis,
      dataSource: `${prediction.modelId}:engineering-work-package-library`,
      rateBasis: 'parametric_cost_allocation_not_live_market_rate',
      costShare: round(normalizedShare, 5),
      referenceFullDirectBudget: directBudget,
      confidence: 0.62,
      estimateStatus: 'experimental_concept_cost_plan',
      insufficient: false,
      editable: true,
      needsReview: true,
      contractualUse: false,
      suitableForProcurement: false,
      sequence: index + 1
    };
  });
  const directCost = round(items.reduce((sum, current) => sum + current.totalPrice, 0), 2);
  const categories = [...new Set(items.map(current => current.category))];
  return {
    items,
    suggestedItems: [],
    assumptions: items.map(current => ({
      code: current.code,
      description: current.description,
      quantity: current.quantity,
      unit: current.unit,
      calculationMethod: current.calculationMethod,
      rateBasis: current.rateBasis,
      requiresConfirmation: true
    })),
    lifecyclePhases: [{ id: 'CONCEPT', name: 'خطة تكلفة مفاهيمية', order: 0 }],
    phase: 'Conceptual',
    summary: {
      totalItems: items.length,
      insufficientCount: 0,
      suggestedCount: 0,
      totalCost: directCost,
      directCost,
      modelAllInCost: round(modelAllInCost, 2),
      averageConfidence: 0.62,
      phasesUsed: 1,
      engineVersion: '5.0-engineering-concept',
      generatedAt: new Date().toISOString(),
      dataSource: `${prediction.modelId}:engineering-work-package-library`,
      dataProvenance: prediction.dataProvenance,
      status: 'experimental_concept_cost_plan',
      detailLevel: 'concept_cost_plan',
      projectType: type,
      family,
      categories,
      scope: { ...scope, items: undefined },
      assumptions: prediction.assumptions,
      independentValidation: false,
      reconciliationBasis: 'shared_parametric_reference_not_independent_accuracy',
      costComposition: composition,
      trainingDataAvailable: prediction.trainingRecords,
      trainedReference: {
        scope: 'full_project_reference',
        usableAsScopedQuantities: scope.excludedPackages.length === 0,
        modelId: prediction.modelId,
        projectType: prediction.projectType,
        trainingRecords: prediction.trainingRecords,
        dataProvenance: prediction.dataProvenance,
        quantities: Object.fromEntries(['concreteM3', 'steelTon', 'blocksM2', 'hvacTR', 'electricalKVA', 'waterLpd']
          .map(target => [target, round(prediction.predictions[target], 2)])),
        intervals: prediction.intervals,
        suitableForModelApproval: false
      },
      predictionSource: 'governed_research_candidate_with_engineering_rules',
      contractualUse: false,
      suitableForProcurement: false,
      requiresHumanReview: true,
      limitations: [
        'This is a concept cost plan, not a measured tender BOQ.',
        'Package rates are parametric allocations and are not current supplier quotations.',
        'Drawings, specifications, measurement rules, geotechnical data, and a dated local rate book are required before procurement.'
      ]
    }
  };
}

module.exports = {
  VALID_UNITS,
  allInFactor,
  buildConceptEstimate,
  getCostComposition
};
