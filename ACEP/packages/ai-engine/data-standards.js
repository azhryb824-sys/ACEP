const path = require('path');
const fs = require('fs');
const { EGT_PROJECT_TYPES } = require('./shared-constants');

const SCHEMAS = {
  project: {
    fields: {
      projectId: { type: 'string', required: true, pattern: /^SA-[A-Z]\d{5}$/ },
      city: { type: 'string', required: true, values: ['Riyadh','Jeddah','Makkah','Madinah','Dammam','Khobar','Dhahran','Tabuk','Hail','Abha','Khamis Mushait','Najran','Buraidah','Unaizah','Taif','Yanbu','Arar','Jubail','Qatif'] },
      region: { type: 'string', required: true, values: ['Central','Western','Eastern','Northern','Southern'] },
      projectType: { type: 'string', required: true },
      buildingArea: { type: 'number', required: true, min: 10, max: 1000000 },
      floors: { type: 'number', required: true, min: 1, max: 200 },
      finishingLevel: { type: 'string', values: ['Raw','Standard','Good','Premium','Luxury','UltraLuxury'] },
    },
  },
  boqItem: {
    fields: {
      itemCode: { type: 'string', required: true, pattern: /^\d{2}[A-Z]{2}$/ },
      description: { type: 'string', required: true },
      category: { type: 'string', required: true },
      unit: { type: 'string', required: true, values: ['m2','m3','m','no','kg','ton','hour','day','week','month','lump_sum'] },
      quantity: { type: 'number', required: true, min: 0 },
      unitPrice: { type: 'number', required: true, min: 0 },
      confidence: { type: 'number', min: 0, max: 100 },
      wasteFactor: { type: 'number', min: 0, max: 1 },
    },
  },
  materialPrice: {
    fields: {
      material: { type: 'string', required: true },
      unit: { type: 'string', required: true },
      category: { type: 'string', required: true },
      price: { type: 'number', required: true, min: 0 },
      city: { type: 'string' },
      year: { type: 'number', min: 2000, max: 2030 },
    },
  },
  laborRate: {
    fields: {
      trade: { type: 'string', required: true },
      rate: { type: 'number', required: true, min: 0 },
      unit: { type: 'string', values: ['hour','day','week','month'] },
      city: { type: 'string' },
    },
  },
  equipmentRate: {
    fields: {
      equipment: { type: 'string', required: true },
      category: { type: 'string', required: true },
      rate: { type: 'number', required: true, min: 0 },
      unit: { type: 'string', values: ['hour','day','week','month'] },
    },
  },
  supplier: {
    fields: {
      name: { type: 'string', required: true },
      city: { type: 'string' },
      speciality: { type: 'string' },
      rating: { type: 'number', min: 0, max: 5 },
    },
  },
  risk: {
    fields: {
      projectId: { type: 'string' },
      riskCategory: { type: 'string', values: ['Schedule','Safety','Financial','Quality','Environmental','Regulatory'] },
      probability: { type: 'number', min: 1, max: 5 },
      impact: { type: 'number', min: 1, max: 5 },
    },
  },
  qualityDefect: {
    fields: {
      defectType: { type: 'string' },
      severity: { type: 'string', values: ['Low','Medium','High','Critical'] },
      elementType: { type: 'string' },
    },
  },
  egt: {
    fields: {
      uuid: { type: 'string', required: true },
      version: { type: 'string' },
      source: { type: 'string' },
      classification: { type: 'object', required: true },
      geometry: { type: 'object', required: true },
      location: { type: 'object' },
      boq: { type: 'array' },
      cost: { type: 'object' },
      schedule: { type: 'object' },
      risks: { type: 'array' },
      quality: { type: 'object' },
      validation: { type: 'object' },
    },
  },
};

const CODE_PATTERNS = {
  itemCode: /^\d{2}[A-Z]{2,4}$/,
  projectTypeCode: /^[A-Z][a-zA-Z_]+$/,
  materialCode: /^[A-Z]{2,6}\d{0,4}$/,
};

const UNIT_STANDARDS = {
  area: { base: 'm2', aliases: { 'sqm': 'm2', 'متر مربع': 'm2', 'م2': 'm2', 'm²': 'm2', 'square meter': 'm2' } },
  volume: { base: 'm3', aliases: { 'cbm': 'm3', 'متر مكعب': 'm3', 'م3': 'm3', 'm³': 'm3' } },
  length: { base: 'm', aliases: { 'meter': 'm', 'متر': 'm', 'mtr': 'm' } },
  count: { base: 'no', aliases: { 'each': 'no', 'unit': 'no', 'عدد': 'no', 'حبة': 'no', 'pc': 'no', 'pcs': 'no' } },
  mass: { base: 'kg', aliases: { 'kilo': 'kg', 'kilogram': 'kg', 'ton': 'ton', 'tonne': 'ton', 'طن': 'ton' } },
  time: { base: 'day', aliases: { 'days': 'day', 'يوم': 'day', 'hour': 'hour', 'ساعة': 'hour', 'hr': 'hour' } },
  currency: { base: 'SAR', aliases: { 'ريال': 'SAR', 'sr': 'SAR', 'Saudi Riyal': 'SAR' } },
};

const FINISHING_LEVELS = ['Raw', 'Standard', 'Good', 'Premium', 'Luxury', 'UltraLuxury'];
const CONSTRUCTION_METHODS = ['Conventional', 'SlipForm', 'SteelFrame', 'PostTension', 'Precast', 'InsulatedForm', 'TiltUp', 'FlyingForm'];
const STRUCTURAL_SYSTEMS = ['RC Frame', 'Steel Frame', 'Load Bearing', 'Shear Wall', 'Flat Slab', 'Waffle Slab', 'PostTension Slab'];

class DataStandards {
  constructor() {
    this.schemas = SCHEMAS;
    this.codePatterns = CODE_PATTERNS;
    this.unitStandards = UNIT_STANDARDS;
    this.finishingLevels = FINISHING_LEVELS;
    this.constructionMethods = CONSTRUCTION_METHODS;
    this.structuralSystems = STRUCTURAL_SYSTEMS;
    this._validationCache = new Map();
  }

  validate(entityType, data) {
    const cacheKey = `${entityType}:${JSON.stringify(data)}`;
    if (this._validationCache.has(cacheKey)) return this._validationCache.get(cacheKey);

    const schema = this.schemas[entityType];
    if (!schema) return { valid: false, errors: [`Unknown entity type: ${entityType}`] };

    const errors = [];
    for (const [field, rules] of Object.entries(schema.fields)) {
      const value = data[field];
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Missing required field: ${field}`);
        continue;
      }
      if (value === undefined || value === null) continue;

      if (rules.type === 'number' && typeof value !== 'number') {
        errors.push(`Field ${field}: expected number, got ${typeof value}`);
        continue;
      }
      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`Field ${field}: expected string, got ${typeof value}`);
        continue;
      }

      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) errors.push(`Field ${field}: ${value} < minimum ${rules.min}`);
        if (rules.max !== undefined && value > rules.max) errors.push(`Field ${field}: ${value} > maximum ${rules.max}`);
      }

      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push(`Field ${field}: "${value}" does not match pattern ${rules.pattern}`);
      }

      if (rules.values && !rules.values.includes(value)) {
        errors.push(`Field ${field}: "${value}" not in allowed values [${rules.values.join(', ')}]`);
      }
    }

    const result = { valid: errors.length === 0, errors, entityType };
    if (errors.length === 0) result.valid = true;
    this._validationCache.set(cacheKey, result);
    return result;
  }

  validateBatch(entityType, items) {
    const results = items.map((item, i) => {
      const r = this.validate(entityType, item);
      return { index: i, ...r };
    });
    return {
      total: items.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length,
      results,
    };
  }

  normalizeUnit(unit) {
    if (!unit) return null;
    const lower = unit.toLowerCase().trim();
    for (const [, info] of Object.entries(this.unitStandards)) {
      if (lower === info.base) return info.base;
      for (const [alias, base] of Object.entries(info.aliases)) {
        if (lower === alias.toLowerCase()) return base;
      }
    }
    return unit;
  }

  normalizeFinishingLevel(level) {
    if (!level) return 'Standard';
    const lower = level.toLowerCase();
    for (const std of this.finishingLevels) {
      if (std.toLowerCase() === lower) return std;
    }
    const map = { 'rough': 'Raw', 'basic': 'Standard', 'medium': 'Good', 'high': 'Premium', 'lux': 'Luxury', 'ultra': 'UltraLuxury' };
    return map[lower] || 'Standard';
  }

  validateItemCode(code) {
    if (!code || typeof code !== 'string') return false;
    return this.codePatterns.itemCode.test(code);
  }

  getSchema(entityType) {
    return this.schemas[entityType] || null;
  }

  getAllowedValues(entityType, field) {
    const schema = this.schemas[entityType];
    if (!schema || !schema.fields[field]) return null;
    return schema.fields[field].values || null;
  }

  getStats() {
    return {
      schemas: Object.keys(this.schemas).length,
      schemaNames: Object.keys(this.schemas),
      codePatterns: Object.keys(this.codePatterns).length,
      unitStandards: Object.keys(this.unitStandards).length,
      finishingLevels: this.finishingLevels.length,
      constructionMethods: this.constructionMethods.length,
      structuralSystems: this.structuralSystems.length,
    };
  }

  validateEGT(egt) {
    if (!egt) return { valid: false, errors: ['EGT is null'], score: 0 };
    const errors = [];
    if (!egt.uuid) errors.push('Missing EGT uuid');
    if (!egt.classification || !egt.classification.projectType) errors.push('Missing classification.projectType');
    if (!egt.geometry || egt.geometry.totalArea === undefined) errors.push('Missing geometry.totalArea');
    if (!egt.geometry || !egt.geometry.floors) errors.push('Missing/invalid geometry.floors');
    if (egt.classification && egt.classification.projectType && !EGT_PROJECT_TYPES.includes(egt.classification.projectType)) {
      errors.push(`Unknown projectType: ${egt.classification.projectType}`);
    }
    if (egt.cost && typeof egt.cost.total === 'number' && egt.cost.total < 0) errors.push('Negative cost.total');
    if (egt.schedule && typeof egt.schedule.totalDurationMonths === 'number' && egt.schedule.totalDurationMonths <= 0 && egt.cost && egt.cost.total > 0) {
      errors.push('Schedule missing for a project with cost');
    }
    const score = Math.max(0, Math.round((1 - errors.length / 6) * 100));
    return { valid: errors.length === 0, errors, score };
  }
}

module.exports = DataStandards;
