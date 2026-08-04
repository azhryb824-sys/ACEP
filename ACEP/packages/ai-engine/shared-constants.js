/**
 * ACEP Shared Constants – Single Source of Truth
 *
 * Consolidates all duplicated definitions across the codebase.
 * Project type mappings, phase definitions, material keywords,
 * and color definitions all in one place.
 */
const PROJECT_TYPE_MAP = {
  'tower': 'Tower', 'برج': 'Tower', 'ابراج': 'Tower',
  'villa': 'Villa', 'فيلا': 'Villa', 'فلل': 'Villa',
  'apartment': 'Apartment', 'شقة': 'Apartment', 'شقق': 'Apartment',
  'residential': 'Residential', 'سكني': 'Residential',
  'mosque': 'Mosque', 'مسجد': 'Mosque', 'جامع': 'Mosque',
  'school': 'School', 'مدرسة': 'School', 'جامعة': 'School',
  'hospital': 'Hospital', 'مستشفى': 'Hospital',
  'mall': 'Mall', 'مول': 'Mall', 'مركز تجاري': 'Mall',
  'factory': 'Factory', 'مصنع': 'Factory',
  'warehouse': 'Warehouse', 'مستودع': 'Warehouse',
  'hotel': 'Hotel', 'فندق': 'Hotel',
  'office': 'Office', 'مكتب': 'Office', 'اداري': 'Office', 'إداري': 'Office',
  'compound': 'Compound', 'كمباوند': 'Compound',
  'palace': 'Palace', 'قصر': 'Palace',
  'building': 'Building', 'مبنى': 'Building', 'عمارة': 'Building',
};

const PHASES = [
  { id: 'EXCAVATION', ar: 'مرحلة الحفر', en: 'Excavation', order: 1 },
  { id: 'FOUNDATION', ar: 'مرحلة الأساسات', en: 'Foundation', order: 2 },
  { id: 'STRUCTURE', ar: 'مرحلة الهيكل', en: 'Structure', order: 3 },
  { id: 'MASONRY', ar: 'مرحلة المباني', en: 'Masonry', order: 4 },
  { id: 'PLASTERING', ar: 'مرحلة اللياسة', en: 'Plastering', order: 5 },
  { id: 'FINISHING', ar: 'مرحلة التشطيبات', en: 'Finishing', order: 6 },
  { id: 'ELECTRICAL', ar: 'مرحلة الكهرباء', en: 'Electrical', order: 7 },
  { id: 'PLUMBING', ar: 'مرحلة السباكة', en: 'Plumbing', order: 8 },
  { id: 'HVAC', ar: 'مرحلة التكييف', en: 'HVAC', order: 9 },
  { id: 'NETWORKS', ar: 'مرحلة الشبكات', en: 'Networks', order: 10 },
  { id: 'EXTERNAL', ar: 'مرحلة الأعمال الخارجية', en: 'External Works', order: 11 },
];

const MATERIALS = [
  'concrete', 'خرسانة', 'steel', 'حديد', 'wood', 'خشب',
  'aluminum', 'المنيوم', 'الومنيوم', 'glass', 'زجاج',
  'stone', 'حجر', 'marble', 'رخام', 'brick', 'طوب', 'بلوك',
  'ceramic', 'سيراميك', 'porcelain', 'بورسلان', 'بورسلين',
];

const COLORS = {
  white: ['white', 'ابيض', 'أبيض', 'بيج'],
  beige: ['beige', 'بيج', 'عاجي'],
  cream: ['cream', 'كريم'],
  gray: ['gray', 'grey', 'رمادي', 'رمادى'],
  brown: ['brown', 'بني'],
  black: ['black', 'اسود', 'أسود'],
  green: ['green', 'اخضر', 'أخضر'],
  blue: ['blue', 'ازرق', 'أزرق'],
  yellow: ['yellow', 'اصفر', 'أصفر'],
  red: ['red', 'احمر', 'أحمر'],
};

const CONFIDENCE_LABELS = {
  critical: { min: 0.7, ar: 'حرج' },
  high: { min: 0.5, ar: 'عالي' },
  medium: { min: 0.3, ar: 'متوسط' },
  low: { min: 0, ar: 'منخفض' },
};

// ─── EGT (Engineering Ground Truth) Constants ────────────────────
const EGT_VERSION = '1.0.0';

const EGT_PROJECT_TYPES = [
  'Villa', 'Building', 'Tower', 'Hotel', 'Mosque', 'Hospital', 'School',
  'Mall', 'Warehouse', 'Bridge', 'Road', 'Factory', 'Farm', 'Infrastructure',
  'WaterTreatment', 'Sports', 'Office', 'Residential', 'Commercial',
  'Apartment', 'Compound', 'Palace', 'MixedUse',
];

const EGT_FINISHING_LEVELS = ['Raw', 'Standard', 'Good', 'Premium', 'Luxury', 'UltraLuxury'];

const EGT_REQUIRED_FIELDS = ['uuid', 'classification', 'geometry'];

const EGT_TOP_LEVEL_FIELDS = [
  'uuid', 'version', 'source', 'originalId', 'createdAt', 'updatedAt',
  'description', 'projectUnderstanding', 'classification', 'geometry',
  'location', 'boq', 'cost', 'schedule', 'risks', 'quality', 'images',
  'navigation', 'digitalTwin', 'materials', 'suppliers',
  'constructionSequence', 'lessonsLearned', 'validation', 'confidence', 'tags',
];

const EGT_SOURCES = ['csv', 'edl', 'kb', 'continuous-learning', 'profile', 'manual'];

function normalizeProjectType(input) {
  if (!input) return 'Building';
  const matched = matchProjectType(String(input));
  return EGT_PROJECT_TYPES.includes(matched) ? matched : 'Building';
}

function matchProjectType(input) {
  if (!input) return null;
  const lower = input.toLowerCase().replace(/[^a-z\u0600-\u06FF\s]/g, '');
  for (const [key, value] of Object.entries(PROJECT_TYPE_MAP)) {
    if (lower.includes(key)) return value;
  }
  if (lower.includes('mixed') || lower.includes('متعدد')) return 'MixedUse';
  if (lower.includes('commercial') || lower.includes('تجاري')) return 'Commercial';
  return 'Building';
}

function getPhaseById(id) {
  return PHASES.find(p => p.id === id) || null;
}

function getPhaseByArabic(name) {
  return PHASES.find(p => p.ar === name) || null;
}

function detectColor(text) {
  const lower = text.toLowerCase();
  for (const [color, aliases] of Object.entries(COLORS)) {
    if (aliases.some(a => lower.includes(a))) return color;
  }
  return null;
}

function detectMaterial(text) {
  const lower = text.toLowerCase();
  for (let i = 0; i < MATERIALS.length; i += 2) {
    if (lower.includes(MATERIALS[i + 1]) || lower.includes(MATERIALS[i])) {
      return MATERIALS[i];
    }
  }
  return null;
}

module.exports = {
  PROJECT_TYPE_MAP,
  PHASES,
  MATERIALS,
  COLORS,
  CONFIDENCE_LABELS,
  EGT_VERSION,
  EGT_PROJECT_TYPES,
  EGT_FINISHING_LEVELS,
  EGT_REQUIRED_FIELDS,
  EGT_TOP_LEVEL_FIELDS,
  EGT_SOURCES,
  matchProjectType,
  normalizeProjectType,
  getPhaseById,
  getPhaseByArabic,
  detectColor,
  detectMaterial,
};
