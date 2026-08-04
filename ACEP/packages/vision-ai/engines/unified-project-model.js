const { getLogger } = require('../logger');
const LOGGER = getLogger({ service: 'VisionAI-UPM' });

const PROJECT_TYPES = [
  'Tower', 'Building', 'Villa', 'Apartment', 'Mosque', 'School',
  'Hospital', 'Mall', 'Factory', 'Warehouse', 'Hotel', 'Office',
  'Compound', 'Palace', 'Farm', 'Residential', 'Commercial', 'MixedUse',
];

const SUB_TYPES = {
  Tower: ['Residential', 'Commercial', 'Hotel', 'MixedUse', 'Office'],
  Building: ['Residential', 'Commercial', 'MixedUse', 'Government'],
  Villa: ['Private', 'Duplex', 'Twin', 'Corner'],
  Apartment: ['Standard', 'Luxury', 'Studio', 'Penthouse'],
  Mosque: ['Jamea', 'Masjid', 'Musalla'],
  School: ['Primary', 'Secondary', 'University'],
  Hospital: ['General', 'Clinic', 'Specialized'],
  Mall: ['Shopping', 'Hypermarket', 'Complex'],
  Factory: ['Industrial', 'Warehouse', 'Production'],
};

class UnifiedProjectModel {
  constructor(projectId) {
    this.projectId = projectId;
    this.metadata = { name: '', description: '', createdAt: new Date().toISOString() };
    this.projectType = { main: null, sub: null, confidence: 0, source: '' };
    this.physical = { area: 0, floors: 0, totalArea: 0, height: 0, basement: false, units: 0 };
    this.location = { city: '', region: '', country: 'Saudi Arabia' };
    this.structure = {
      system: null, foundation: null, roof: null, slabs: null,
      walls: null, columns: null, seismic: false, constructionMethod: null,
    };
    this.phase = { current: 'Completed', percentage: 100, source: '' };
    this.finishing = { level: 'Standard', quality: 'Standard' };
    this.style = { architectural: 'Modern', exterior: null, interior: null };
    this.colors = { paint: null, facade: null, roof: null, trim: null };
    this.materials = [];
    this.doors = { count: 0, type: null, material: null, fireRating: null };
    this.windows = { count: 0, type: null, material: null, glazing: null };
    this.facade = { type: null, material: null, color: null };
    this.flooring = { type: null, material: null, rooms: [] };
    this.ceilings = { type: null, material: null };
    this.lighting = { interior: null, exterior: null };
    this.exterior = {
      landscaping: false, parking: false, roads: false,
      lighting: false, fences: false, walkways: false,
      palmTrees: false, waterFeatures: false, greenAreas: false,
    };
    this.mep = { hvac: null, electrical: null, plumbing: null, fire: null };
    this.codes = [];
    this.boqSummary = { totalItems: 0, totalCost: 0, confidence: 0, items: [] };
    this.verification = { completeness: 0, warnings: [], errors: [] };
    this.knowledgeBase = { matches: 0, totalChecked: 0, matchRate: 100 };
    this.previousProjects = { count: 0, similar: [] };
    this.dataSources = [];
  }

  toJSON() {
    return JSON.parse(JSON.stringify(this));
  }

  summarize() {
    const s = this;
    return {
      type: `${s.projectType.main || '?'}${s.projectType.sub ? ' - ' + s.projectType.sub : ''}`,
      floors: s.physical.floors,
      area: s.physical.area,
      phase: s.phase.current,
      finishing: s.finishing.level,
      facade: s.facade.type ? `${s.facade.material || ''} ${s.facade.type}`.trim() : null,
      paint: s.colors.paint,
      doors: `${s.doors.count || 0} ${s.doors.type || ''}`.trim(),
      windows: `${s.windows.count || 0} ${s.windows.type || ''}`.trim(),
      structure: s.structure.system,
      items: s.boqSummary.totalItems,
      cost: s.boqSummary.totalCost,
      materials: s.materials.length,
    };
  }
}

function buildUPM(projectId, sources = {}) {
  const upm = new UnifiedProjectModel(projectId);
  const { projectParams, boqData, profile, kbData, description } = sources;

  upm.metadata.description = description || projectParams?.description || '';
  upm.metadata.name = projectParams?.name || '';

  if (profile) {
    mergeProfile(upm, profile);
  }

  if (projectParams) {
    mergeProjectParams(upm, projectParams);
  }

  if (boqData && boqData.items && boqData.items.length > 0) {
    mergeBOQ(upm, boqData);
  }

  if (kbData) {
    mergeKnowledgeBase(upm, kbData);
  }

  deriveProperties(upm);

  upm.verification = verifyCompleteness(upm);

  return upm;
}

function mergeProfile(upm, profile) {
  upm.dataSources.push('digitalProfile');

  if (profile.projectType) {
    const mainType = matchProjectType(profile.projectType);
    if (mainType) {
      upm.projectType.main = mainType;
      upm.projectType.confidence = profile.projectTypeConfidence || profile.confidence || 0;
      upm.projectType.source = 'ProjectProfiler';
    }
  }

  if (profile.usageCategory) {
    upm.projectType.sub = profile.usageCategory;
  }

  if (profile.structure) {
    const s = profile.structure;
    if (s.structuralSystem) upm.structure.system = s.structuralSystem;
    if (s.foundationType) upm.structure.foundation = s.foundationType;
    if (s.roofType) upm.structure.roof = s.roofType;
    if (s.slabSystem) upm.structure.slabs = s.slabSystem;
    if (s.wallSystem) upm.structure.walls = s.wallSystem;
    if (s.columnSystem) upm.structure.columns = s.columnSystem;
    if (s.hasBasement) upm.physical.basement = true;
    if (s.seismicRequired) upm.structure.seismic = true;
    if (s.constructionMethod) upm.structure.constructionMethod = s.constructionMethod;
    if (s.height) upm.physical.height = s.height;
  }

  if (profile.physical) {
    if (profile.physical.floors) upm.physical.floors = profile.physical.floors;
    if (profile.physical.area) upm.physical.area = profile.physical.area;
    if (profile.physical.totalArea) upm.physical.totalArea = profile.physical.totalArea;
    if (profile.physical.basement !== undefined) upm.physical.basement = profile.physical.basement;
    if (profile.physical.units) upm.physical.units = profile.physical.units;
  }

  if (profile.finishingLevel) {
    upm.finishing.level = profile.finishingLevel;
  }

  if (profile.applicableCodes && Array.isArray(profile.applicableCodes)) {
    upm.codes = profile.applicableCodes;
  }

  if (profile.mep) {
    const m = profile.mep;
    if (m.hvac && m.hvac.system) upm.mep.hvac = m.hvac.system;
    if (m.electrical && m.electrical.loadKva) upm.mep.electrical = `${m.electrical.loadKva}KVA`;
    if (m.plumbing) upm.mep.plumbing = 'Included';
  }
}

function mergeProjectParams(upm, params) {
  upm.dataSources.push('projectParams');

  if (params.type) {
    const mainType = matchProjectType(params.type);
    if (mainType && !upm.projectType.main) {
      upm.projectType.main = mainType;
      upm.projectType.confidence = 0.7;
      upm.projectType.source = 'projectParams';
    }
  }

  if (params.area && !upm.physical.area) upm.physical.area = params.area;
  if (params.floors && !upm.physical.floors) upm.physical.floors = params.floors;
  if (params.city) upm.location.city = params.city;
  if (params.finishing) upm.finishing.level = params.finishing;
  if (params.style) upm.style.architectural = params.style;

  if (params.materials && Array.isArray(params.materials)) {
    for (const m of params.materials) {
      if (!upm.materials.includes(m)) upm.materials.push(m);
    }
  }

  if (params.description && !upm.metadata.description) {
    upm.metadata.description = params.description;
  }

  if (params.type && SUB_TYPES[params.type]) {
    const normalizedSub = params.subType || params.usage;
    if (normalizedSub && SUB_TYPES[params.type].includes(normalizedSub)) {
      upm.projectType.sub = normalizedSub;
    }
  }
}

function mergeBOQ(upm, boqData) {
  upm.dataSources.push('BOQ');
  const items = boqData.items || [];

  upm.boqSummary.totalItems = items.length;
  upm.boqSummary.totalCost = items.reduce((sum, i) => sum + (i.totalCost || i.total || 0), 0);
  upm.boqSummary.confidence = items.reduce((sum, i) => sum + (i.confidence || 0.5), 0) / (items.length || 1);
  upm.boqSummary.items = items.map(i => ({
    code: i.code || i.id || '',
    name: i.name || i.description || '',
    phase: i.phase || '',
    quantity: i.quantity || 0,
    unit: i.unit || '',
    unitPrice: i.unitPrice || i.unit_price || 0,
    totalCost: i.totalCost || i.total || 0,
    material: i.material || '',
    specification: i.specification || '',
    confidence: i.confidence || 0.5,
    isSuggested: i.isSuggested || i.suggested || false,
  }));

  deriveFeaturesFromBOQ(upm, items);
}

function deriveFeaturesFromBOQ(upm, items) {
  const lowerNames = items.map(i => (i.name || i.description || '').toLowerCase());

  for (const name of lowerNames) {
    if (name.includes('door') || name.includes('باب')) {
      if (!upm.doors.count) upm.doors.count = 0;
      if (name.includes('wood') || name.includes('خشب')) upm.doors.material = 'Wood';
      if (name.includes('alumini') || name.includes('المنيوم') || name.includes('الومنيوم')) upm.doors.material = 'Aluminum';
      if (name.includes('glass') || name.includes('زجاج')) upm.doors.material = 'Glass';
      if (name.includes('fire') || name.includes('مقاومة') || name.includes('حريق')) upm.doors.fireRating = 'Fire-Resistant';
      if (name.includes('sliding') || name.includes('منزلقة')) upm.doors.type = 'Sliding';
      if (!upm.doors.type) upm.doors.type = 'Standard';
    }

    if (name.includes('window') || name.includes('شباك') || name.includes('نافذة')) {
      if (!upm.windows.count) upm.windows.count = 0;
      if (name.includes('sliding') || name.includes('منزلق')) upm.windows.type = 'Sliding';
      if (name.includes('curtain') || name.includes('ستارة')) upm.windows.type = 'Curtain Wall';
      if (name.includes('double') || name.includes('مزدوج') || name.includes('عازل')) upm.windows.glazing = 'Double Glass';
      if (name.includes('alumini') || name.includes('المنيوم')) upm.windows.material = 'Aluminum';
      if (!upm.windows.type) upm.windows.type = 'Standard';
    }

    if (name.includes('facade') || name.includes('واجهة') || name.includes('cladding') || name.includes('تكسي')) {
      if (name.includes('stone') || name.includes('حجر')) upm.facade.material = 'Stone';
      if (name.includes('glass') || name.includes('زجاج')) upm.facade.material = 'Glass';
      if (name.includes('alumini') || name.includes('المنيوم') || name.includes('الومنيوم')) upm.facade.material = 'Aluminum Composite';
      if (name.includes('concrete') || name.includes('خرسانة')) upm.facade.material = 'Concrete';
      if (name.includes('marble') || name.includes('رخام')) upm.facade.material = 'Marble';
      if (name.includes('curtain') || name.includes('ستارة')) upm.facade.type = 'Curtain Wall';
      if (!upm.facade.type) upm.facade.type = 'Standard';
      if (!upm.facade.material) upm.facade.material = 'Unknown';
    }

    if (name.includes('paint') || name.includes('دهان') || name.includes('دهان')) {
      const colors = [
        ['white', 'ابيض', 'أبيض', 'بيج'], ['beige', 'بيج', 'عاجي'],
        ['cream', 'كريم'], ['gray', 'grey', 'رمادي', 'رمادى'],
        ['brown', 'بني'], ['black', 'اسود', 'أسود'],
        ['green', 'اخضر', 'أخضر'], ['blue', 'ازرق', 'أزرق'],
        ['yellow', 'اصفر', 'أصفر'], ['red', 'احمر', 'أحمر'],
      ];
      for (const [color, ...aliases] of colors) {
        if (aliases.some(a => name.includes(a))) {
          upm.colors.paint = color;
          break;
        }
      }
      if (!upm.colors.paint) upm.colors.paint = 'White';
    }

    if (name.includes('floor') || name.includes('ارضيات') || name.includes('أرضيات') ||
        name.includes('ceramic') || name.includes('سيراميك') || name.includes('بلاط') ||
        name.includes('porcelain') || name.includes('بورسلان') || name.includes('باركيه') ||
        name.includes('parquet') || name.includes('رخام') || name.includes('marble')) {
      if (name.includes('ceramic') || name.includes('سيراميك')) upm.flooring.type = 'Ceramic';
      if (name.includes('porcelain') || name.includes('بورسلان')) upm.flooring.type = 'Porcelain';
      if (name.includes('parquet') || name.includes('باركيه') || name.includes('خشب')) upm.flooring.type = 'Parquet';
      if (name.includes('marble') || name.includes('رخام')) upm.flooring.type = 'Marble';
      if (name.includes('tile') || name.includes('بلاط')) upm.flooring.type = 'Tiles';
      if (!upm.flooring.type) upm.flooring.type = 'Standard';
    }

    if (name.includes('ceiling') || name.includes('سقف') || name.includes('جبس') ||
        name.includes('gypsum') || name.includes('false') || name.includes('معلق')) {
      if (name.includes('gypsum') || name.includes('جبس')) upm.ceilings.type = 'Gypsum';
      if (name.includes('suspended') || name.includes('معلق')) upm.ceilings.type = 'Suspended';
      if (!upm.ceilings.type) upm.ceilings.type = 'Standard';
    }

    if (name.includes('light') || name.includes('انارة') || name.includes('إنارة') ||
        name.includes('led') || name.includes('لمبة') || name.includes('lamp')) {
      if (name.includes('led')) upm.lighting.interior = 'LED';
      if (name.includes('exterior') || name.includes('خارجي') || name.includes('outside')) upm.lighting.exterior = 'LED';
      if (!upm.lighting.interior) upm.lighting.interior = 'Standard';
    }

    if (name.includes('landscap') || name.includes('لاندسكيب') || name.includes('تنسيق') ||
        name.includes('حديقة') || name.includes('garden') || name.includes('green')) {
      upm.exterior.landscaping = true;
      if (name.includes('palm') || name.includes('نخيل')) upm.exterior.palmTrees = true;
      if (name.includes('water') || name.includes('نافورة') || name.includes('مياه') || name.includes('بركة')) upm.exterior.waterFeatures = true;
      if (name.includes('green') || name.includes('مسطح') || name.includes('اخضر') || name.includes('عشب')) upm.exterior.greenAreas = true;
      if (name.includes('fence') || name.includes('سور') || name.includes('سياج')) upm.exterior.fences = true;
      if (name.includes('walkway') || name.includes('ممر') || name.includes('path')) upm.exterior.walkways = true;
      if (name.includes('light') || name.includes('انارة')) upm.exterior.lighting = true;
    }

    if (name.includes('parking') || name.includes('مواقف') || name.includes('كراج') || name.includes('garage')) {
      upm.exterior.parking = true;
    }

    if (name.includes('road') || name.includes('طريق') || name.includes('سفلت') || name.includes('asphalt')) {
      upm.exterior.roads = true;
    }

    const materials_map = {
      'concrete': ['concrete', 'خرسانة', 'خرسانه', 'باطون'],
      'steel': ['steel', 'حديد', 'صلب'],
      'wood': ['wood', 'خشب'],
      'aluminum': ['aluminum', 'aluminium', 'المنيوم', 'الومنيوم', 'الuminium'],
      'glass': ['glass', 'زجاج'],
      'stone': ['stone', 'حجر'],
      'marble': ['marble', 'رخام'],
      'brick': ['brick', 'طوب', 'بلوك'],
      'ceramic': ['ceramic', 'سيراميك'],
      'porcelain': ['porcelain', 'بورسلان', 'بورسلين'],
    };
    for (const [matName, aliases] of Object.entries(materials_map)) {
      if (aliases.some(a => name.includes(a))) {
        if (!upm.materials.includes(matName)) upm.materials.push(matName);
      }
    }
  }

  const doorItems = items.filter(i => {
    const n = (i.name || '').toLowerCase();
    return n.includes('door') || n.includes('باب');
  });
  if (doorItems.length > 0) {
    const totalQty = doorItems.reduce((s, i) => s + (i.quantity || 0), 0);
    if (totalQty > 0) upm.doors.count = Math.round(totalQty);
  }

  const windowItems = items.filter(i => {
    const n = (i.name || '').toLowerCase();
    return n.includes('window') || n.includes('شباك') || n.includes('نافذة');
  });
  if (windowItems.length > 0) {
    const totalQty = windowItems.reduce((s, i) => s + (i.quantity || 0), 0);
    if (totalQty > 0) upm.windows.count = Math.round(totalQty);
  }

  upm.materials = [...new Set(upm.materials)];
}

function mergeKnowledgeBase(upm, kbData) {
  upm.dataSources.push('KnowledgeBase');
  if (kbData.materials && Array.isArray(kbData.materials)) {
    for (const m of kbData.materials) {
      if (typeof m === 'string' && !upm.materials.includes(m)) upm.materials.push(m);
    }
  }
  if (kbData.codes && Array.isArray(kbData.codes)) {
    for (const c of kbData.codes) {
      if (!upm.codes.includes(c)) upm.codes.push(c);
    }
  }
}

function matchProjectType(input) {
  if (!input) return null;
  const lower = input.toLowerCase().replace(/[^a-z\u0600-\u06FF\s]/g, '');

  const typeMap = {
    'tower': 'Tower', 'برج': 'Tower', 'ابراج': 'Tower',
    'villa': 'Villa', 'فيلا': 'Villa', 'فلل': 'Villa',
    'apartment': 'Apartment', 'شقة': 'Apartment', 'شقق': 'Apartment', 'سكني': 'Residential',
    'mosque': 'Mosque', 'مسجد': 'Mosque', 'جامع': 'Mosque',
    'school': 'School', 'مدرسة': 'School', 'مدارس': 'School', 'جامعة': 'School',
    'hospital': 'Hospital', 'مستشفى': 'Hospital', 'مستشفي': 'Hospital', 'مركز صحي': 'Hospital',
    'mall': 'Mall', 'مول': 'Mall', 'مركز تجاري': 'Mall', 'سوق': 'Mall',
    'factory': 'Factory', 'مصنع': 'Factory', 'معمل': 'Factory',
    'warehouse': 'Warehouse', 'مستودع': 'Warehouse', 'مخزن': 'Warehouse',
    'hotel': 'Hotel', 'فندق': 'Hotel',
    'office': 'Office', 'مكتب': 'Office', 'اداري': 'Office', 'إداري': 'Office',
    'compound': 'Compound', 'كمباوند': 'Compound', 'مجمع سكني': 'Compound',
    'palace': 'Palace', 'قصر': 'Palace',
    'building': 'Building', 'مبنى': 'Building', 'عمارة': 'Building',
  };

  for (const [key, value] of Object.entries(typeMap)) {
    if (lower.includes(key)) return value;
  }

  if (lower.includes('mixed') || lower.includes('متعدد')) return 'MixedUse';
  if (lower.includes('commercial') || lower.includes('تجاري')) return 'Commercial';
  if (lower.includes('residential') || lower.includes('سكني')) return 'Residential';

  return 'Building';
}

function deriveProperties(upm) {
  if (!upm.physical.totalArea && upm.physical.area && upm.physical.floors) {
    upm.physical.totalArea = upm.physical.area * upm.physical.floors;
  }
  if (!upm.physical.height && upm.physical.floors) {
    upm.physical.height = upm.physical.floors * 3.2;
  }

  const t = upm.projectType.main;
  if (!upm.style.architectural && t) {
    const styleMap = {
      'Mosque': 'Islamic',
      'School': 'Modern Educational',
      'Hospital': 'Modern Healthcare',
    };
    upm.style.architectural = styleMap[t] || 'Modern';
  }
}

function verifyCompleteness(upm) {
  const warnings = [];
  const errors = [];
  let score = 0;
  const checks = [
    { field: 'projectType.main', weight: 15, desc: 'Project type' },
    { field: 'physical.area', weight: 10, desc: 'Area' },
    { field: 'physical.floors', weight: 10, desc: 'Floor count' },
    { field: 'location.city', weight: 3, desc: 'City' },
    { field: 'structure.system', weight: 8, desc: 'Structural system' },
    { field: 'phase.current', weight: 5, desc: 'Phase' },
    { field: 'finishing.level', weight: 5, desc: 'Finishing level' },
    { field: 'materials', weight: 8, desc: 'Materials', check: v => v.length > 0 },
    { field: 'boqSummary.items', weight: 15, desc: 'BOQ items', check: v => v.length > 0 },
    { field: 'doors.type', weight: 5, desc: 'Door type' },
    { field: 'windows.type', weight: 5, desc: 'Window type' },
    { field: 'facade.material', weight: 6, desc: 'Facade material' },
    { field: 'colors.paint', weight: 3, desc: 'Paint color' },
  ];

  for (const check of checks) {
    const parts = check.field.split('.');
    let val = upm;
    for (const p of parts) val = val ? val[p] : undefined;

    const passed = check.check ? check.check(val) : (val !== null && val !== undefined && val !== '');
    if (passed) {
      score += check.weight;
    } else {
      warnings.push(`Missing: ${check.desc}`);
    }
  }

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  return { completeness: Math.round(score / totalWeight * 100), warnings, errors };
}

function isDataComplete(upm) {
  return upm.verification.completeness >= 70;
}

module.exports = { UnifiedProjectModel, buildUPM, isDataComplete, PROJECT_TYPES, SUB_TYPES };
