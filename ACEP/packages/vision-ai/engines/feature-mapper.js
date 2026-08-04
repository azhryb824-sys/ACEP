const { getLogger } = require('../logger');
const LOGGER = getLogger({ service: 'VisionAI-FeatureMap' });

const FEATURE_CATEGORIES = {
  facade: { label: 'واجهة', icon: '🏛️' },
  doors: { label: 'أبواب', icon: '🚪' },
  windows: { label: 'نوافذ', icon: '🪟' },
  flooring: { label: 'أرضيات', icon: '🧱' },
  ceilings: { label: 'أسقف', icon: '⬆️' },
  paint: { label: 'دهانات', icon: '🎨' },
  lighting: { label: 'إنارة', icon: '💡' },
  structure: { label: 'هيكل إنشائي', icon: '🏗️' },
  landscaping: { label: 'أعمال خارجية', icon: '🌳' },
  parking: { label: 'مواقف', icon: '🅿️' },
  fencing: { label: 'أسوار', icon: '🧱' },
  mep: { label: 'ميكانيكا وكهرباء', icon: '⚡' },
};

class FeatureMap {
  constructor() {
    this.features = [];
    this.byCategory = {};
    this.boqMatchCount = 0;
    this.boqTotalCount = 0;
    this.suggestedFeatures = [];
  }

  addFeature(category, key, value, source = 'BOQ', confidence = 1.0) {
    const feature = {
      category, key, value,
      source, confidence,
      isSuggested: source === 'suggestion',
      boqCode: null,
      description: '',
    };
    this.features.push(feature);
    if (!this.byCategory[category]) this.byCategory[category] = [];
    this.byCategory[category].push(feature);
    if (source === 'BOQ') this.boqMatchCount++;
    this.boqTotalCount++;
  }

  addSuggestedFeature(category, key, value, reason) {
    const feature = {
      category, key, value,
      source: 'suggestion',
      confidence: 0.5,
      isSuggested: true,
      boqCode: null,
      description: reason,
      reason,
    };
    this.features.push(feature);
    if (!this.byCategory[category]) this.byCategory[category] = [];
    this.byCategory[category].push(feature);
    if (!this.suggestedFeatures) this.suggestedFeatures = [];
    this.suggestedFeatures.push(feature);
    this.boqTotalCount++;
  }

  getFeature(category, key) {
    return this.features.find(f => f.category === category && f.key === key) || null;
  }

  toJSON() {
    return {
      features: this.features,
      byCategory: Object.fromEntries(
        Object.entries(this.byCategory).map(([k, v]) => [k, v])
      ),
      boqMatchCount: this.boqMatchCount,
      boqTotalCount: this.boqTotalCount,
      suggestedFeatures: this.suggestedFeatures || [],
      matchRate: this.boqTotalCount > 0
        ? Math.round(this.boqMatchCount / this.boqTotalCount * 100) : 100,
    };
  }

  summarize() {
    const lines = [];
    for (const [cat, features] of Object.entries(this.byCategory)) {
      const info = FEATURE_CATEGORIES[cat] || { label: cat, icon: '' };
      const vals = features.map(f => `${f.key}: ${f.value}${f.isSuggested ? ' (مقترح)' : ''}`).join(', ');
      lines.push(`${info.icon} ${info.label}: ${vals}`);
    }
    return lines.join('\n');
  }

  getPromptParts() {
    const parts = [];
    for (const [cat, features] of Object.entries(this.byCategory)) {
      for (const f of features) {
        if (f.category === 'landscaping' && f.value === true) {
          parts.push(`${f.key.replace(/_/g, ' ')}`);
        } else if (f.category === 'parking' && f.value === true) {
          parts.push(`parking area`);
        } else if (f.category === 'fencing' && f.value === true) {
          parts.push(`fences and walls`);
        } else if (f.category === 'mep') {
          parts.push(`${f.key} system: ${f.value}`);
        } else {
          parts.push(`${f.key}: ${f.value}`);
        }
      }
    }
    return parts;
  }
}

const BOQ_TO_FEATURE_RULES = [
  { pattern: /facade|cladding|واجهة|تكسي/i, category: 'facade', key: 'facade', extractValue: (name) => {
    if (/curtain|ستارة/i.test(name)) return 'Curtain Wall';
    if (/stone|حجر/i.test(name)) return 'Stone';
    if (/glass|زجاج/i.test(name)) return 'Glass';
    if (/alumini|المنيوم|الومنيوم/i.test(name)) return 'Aluminum Composite';
    if (/concrete|خرسانة/i.test(name)) return 'Concrete';
    if (/marble|رخام/i.test(name)) return 'Marble';
    if (/brick|طوب|بلوك/i.test(name)) return 'Brick';
    return 'Standard Facade';
  }},
  { pattern: /paint|دهان/i, category: 'paint', key: 'paint color', extractValue: (name) => {
    if (/white|ابيض|أبيض|بيج/i.test(name)) return 'White';
    if (/cream|كريم/i.test(name)) return 'Cream';
    if (/beige|بيج/i.test(name)) return 'Beige';
    if (/gray|grey|رمادي|رمادى/i.test(name)) return 'Gray';
    if (/brown|بني/i.test(name)) return 'Brown';
    if (/black|اسود|أسود/i.test(name)) return 'Black';
    if (/green|اخضر|أخضر/i.test(name)) return 'Green';
    if (/blue|ازرق|أزرق/i.test(name)) return 'Blue';
    if (/yellow|اصفر|أصفر/i.test(name)) return 'Yellow';
    if (/red|احمر|أحمر/i.test(name)) return 'Red';
    return 'White';
  }},
  { pattern: /door|باب/i, category: 'doors', key: 'door', extractValue: (name) => {
    if (/fire|مقاومة.*حريق|حريق/i.test(name)) return 'Fire-Resistant Door';
    if (/wood|خشب/i.test(name)) return 'Wood Door';
    if (/alumini|المنيوم|الومنيوم/i.test(name)) return 'Aluminum Door';
    if (/glass|زجاج/i.test(name)) return 'Glass Door';
    if (/sliding|منزلق/i.test(name)) return 'Sliding Door';
    return 'Standard Door';
  }},
  { pattern: /window|شباك|نافذة/i, category: 'windows', key: 'window', extractValue: (name) => {
    if (/curtain|ستارة/i.test(name)) return 'Curtain Wall';
    if (/sliding|منزلق/i.test(name)) return 'Sliding Window';
    if (/double.*glass|مزدوج.*عازل/i.test(name)) return 'Double Glass Window';
    if (/alumini|المنيوم|الومنيوم/i.test(name)) return 'Aluminum Window';
    return 'Standard Window';
  }},
  { pattern: /ceramic|سيراميك|porcelain|بورسلان|بورسلين|tile|بلاط/i, category: 'flooring', key: 'flooring', extractValue: () => {
    return 'Ceramic / Porcelain Tiles';
  }},
  { pattern: /marble|رخام/i, category: 'flooring', key: 'flooring', extractValue: () => 'Marble Flooring' },
  { pattern: /parquet|باركيه|خشب/i, category: 'flooring', key: 'flooring', extractValue: () => 'Parquet / Wood Flooring' },
  { pattern: /gypsum|جبس|false ceiling|سقف.*معلق/i, category: 'ceilings', key: 'ceiling', extractValue: () => 'Gypsum Ceiling' },
  { pattern: /light|انارة|إنارة|led/i, category: 'lighting', key: 'lighting', extractValue: () => 'LED Lighting' },
  { pattern: /landscap|لاندسكيب|تنسيق.*موقع|garden|حديقة/i, category: 'landscaping', key: 'landscaped', extractValue: () => true },
  { pattern: /palm|نخيل/i, category: 'landscaping', key: 'palm trees', extractValue: () => true },
  { pattern: /water.*feature|نافورة|بركة/i, category: 'landscaping', key: 'water features', extractValue: () => true },
  { pattern: /parking|مواقف|كراج|garage/i, category: 'parking', key: 'parking', extractValue: () => true },
  { pattern: /fence|سور|سياج/i, category: 'fencing', key: 'fencing', extractValue: () => true },
  { pattern: /concrete|خرسانة/i, category: 'structure', key: 'material', extractValue: () => 'Reinforced Concrete' },
  { pattern: /steel|حديد/i, category: 'structure', key: 'material', extractValue: () => 'Structural Steel' },
];

function buildFeatureMap(upm) {
  const map = new FeatureMap();

  const boqItems = upm.boqSummary.items || [];

  for (const item of boqItems) {
    const name = (item.name || item.specification || '') + ' ' + (item.specification || '');
    for (const rule of BOQ_TO_FEATURE_RULES) {
      if (rule.pattern.test(name)) {
        const value = rule.extractValue ? rule.extractValue(name) : item.name;
        const existing = map.getFeature(rule.category, rule.key);
        if (!existing) {
          map.addFeature(rule.category, rule.key, value, 'BOQ', item.confidence || 0.8);
        } else if (existing.source !== 'BOQ') {
          existing.value = value;
          existing.source = 'BOQ';
          existing.confidence = item.confidence || 0.8;
        }
      }
    }
  }

  const f = upm.facade;
  if (f.material && !map.getFeature('facade', 'facade')) {
    map.addFeature('facade', 'facade', f.material + (f.type ? ' ' + f.type : ''), 'UPM', 0.8);
  }

  if (upm.colors.paint && !map.getFeature('paint', 'paint color')) {
    map.addFeature('paint', 'paint color', upm.colors.paint, 'UPM', 0.8);
  }

  if (upm.doors.type && !map.getFeature('doors', 'door')) {
    map.addFeature('doors', 'door', upm.doors.material ? `${upm.doors.material} ${upm.doors.type}` : upm.doors.type, 'UPM', 0.7);
  }

  if (upm.windows.type && !map.getFeature('windows', 'window')) {
    const glazing = upm.windows.glazing || '';
    map.addFeature('windows', 'window', `${glazing} ${upm.windows.type}`.trim(), 'UPM', 0.7);
  }

  if (upm.flooring.type && !map.getFeature('flooring', 'flooring')) {
    map.addFeature('flooring', 'flooring', upm.flooring.type, 'UPM', 0.7);
  }

  if (upm.ceilings.type && !map.getFeature('ceilings', 'ceiling')) {
    map.addFeature('ceilings', 'ceiling', `${upm.ceilings.type} Ceiling`, 'UPM', 0.7);
  }

  if (upm.lighting.interior && !map.getFeature('lighting', 'lighting')) {
    map.addFeature('lighting', 'lighting', upm.lighting.interior, 'UPM', 0.6);
  }

  for (const [key, val] of Object.entries(upm.exterior)) {
    if (val && !map.getFeature('landscaping', key)) {
      map.addFeature('landscaping', key, true, 'UPM', 0.6);
    }
  }

  if (upm.structure.system && !map.getFeature('structure', 'system')) {
    map.addFeature('structure', 'system', upm.structure.system, 'UPM', 0.7);
  }

  LOGGER.info(`Feature map built: ${map.features.length} features (${map.boqMatchCount} from BOQ)`);
  return map;
}

module.exports = { FeatureMap, buildFeatureMap, BOQ_TO_FEATURE_RULES, FEATURE_CATEGORIES };
