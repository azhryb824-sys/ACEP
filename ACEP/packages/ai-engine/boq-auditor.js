/**
 * ACEP BOQ Auditor AI
 *
 * Audits BOQ items for:
 * - Quantity correctness (duplicates, zeros, negatives)
 * - Unit consistency against knowledge base
 * - Saudi Building Code compliance
 * - Price reasonableness per trade
 * - Missing items for project type
 * - Cross-phase dependency completeness
 *
 * Complements the existing BOQ Engine and QA modules.
 */
const path = require('path');

const SAUDI_CODE_REFERENCES = {
  'SBC 301': 'Structural',
  'SBC 302': 'Fire Protection',
  'SBC 303': 'Electrical',
  'SBC 304': 'Mechanical',
  'SBC 305': 'Sanitary/Plumbing',
  'SBC 306': 'Energy',
};

const UNIT_COMPATIBILITY = {
  'م³': { categories: ['excavation', 'concrete', 'earthwork'], alternatives: ['m3', 'm³', 'CBM'] },
  'م²': { categories: ['finishing', 'tiles', 'paint', 'plaster', 'block'], alternatives: ['m2', 'm²', 'SQM'] },
  'م': { categories: ['pipe', 'cable', 'trim'], alternatives: ['m', 'LM', 'linear'] },
  'كجم': { categories: ['steel', 'rebar'], alternatives: ['kg', 'KG'] },
  'طن': { categories: ['steel_bulk', 'cement_bulk'], alternatives: ['ton', 'TN'] },
  'عدد': { categories: ['fixtures', 'doors', 'windows', 'equipment'], alternatives: ['each', 'EA', 'unit', 'no', 'No.', 'no.'] },
  'لتر': { categories: ['paint', 'waterproofing'], alternatives: ['L', 'liter'] },
  'م³/يوم': { categories: ['pumping', 'dewatering'], alternatives: ['m3/day'] },
};

const DEFAULT_PRICE_RANGES = {
  EXC: { min: 10, max: 100, unit: 'م³', label: 'حفر' },
  FND: { min: 200, max: 800, unit: 'م³', label: 'أساسات' },
  COL: { min: 300, max: 900, unit: 'م³', label: 'أعمدة' },
  SLB: { min: 300, max: 800, unit: 'م³', label: 'سقف' },
  REB: { min: 2000, max: 6000, unit: 'طن', label: 'حديد تسليح' },
  BLK: { min: 15, max: 100, unit: 'م²', label: 'بلوك' },
  PLS: { min: 15, max: 50, unit: 'م²', label: 'لياسة' },
  PNT: { min: 10, max: 40, unit: 'م²', label: 'دهان' },
  TLF: { min: 40, max: 120, unit: 'م²', label: 'بلاط/سيراميك' },
  DR: { min: 400, max: 2500, unit: 'عدد', label: 'أبواب' },
  WN: { min: 200, max: 1000, unit: 'عدد', label: 'نوافذ' },
  GPS: { min: 30, max: 120, unit: 'م²', label: 'جبس' },
  ELC: { min: 50, max: 300, unit: 'عدد', label: 'كهرباء' },
  PLB: { min: 80, max: 400, unit: 'عدد', label: 'سباكة' },
  HVAC: { min: 2000, max: 10000, unit: 'عدد', label: 'تكييف' },
};

const REQUIRED_ITEMS_BY_TYPE = {
  Villa: ['EXC', 'FND', 'COL', 'SLB', 'REB', 'BLK', 'PLS', 'PNT', 'TLF', 'DR', 'WN', 'ELC', 'PLB'],
  Apartment_Building: ['EXC', 'FND', 'COL', 'SLB', 'REB', 'BLK', 'PLS', 'PNT', 'TLF', 'DR', 'WN', 'ELC', 'PLB', 'HVAC'],
  Residential_Tower: ['EXC', 'FND', 'COL', 'SLB', 'REB', 'BLK', 'PLS', 'PNT', 'TLF', 'DR', 'WN', 'ELC', 'PLB', 'HVAC', 'FPR'],
  Mosque: ['EXC', 'FND', 'COL', 'SLB', 'REB', 'BLK', 'PLS', 'PNT', 'TLF', 'DR', 'WN', 'ELC', 'PLB', 'GPS'],
  School: ['EXC', 'FND', 'COL', 'SLB', 'REB', 'BLK', 'PLS', 'PNT', 'TLF', 'DR', 'WN', 'ELC', 'PLB', 'HVAC', 'FPR'],
  Hospital: ['EXC', 'FND', 'COL', 'SLB', 'REB', 'BLK', 'PLS', 'PNT', 'TLF', 'DR', 'WN', 'ELC', 'PLB', 'HVAC', 'FPR', 'MED'],
  Hotel: ['EXC', 'FND', 'COL', 'SLB', 'REB', 'BLK', 'PLS', 'PNT', 'TLF', 'DR', 'WN', 'ELC', 'PLB', 'HVAC', 'FPR'],
  Mall: ['EXC', 'FND', 'COL', 'SLB', 'REB', 'BLK', 'PLS', 'PNT', 'TLF', 'DR', 'WN', 'ELC', 'PLB', 'HVAC', 'FPR', 'ELV'],
  Factory: ['EXC', 'FND', 'COL', 'SLB', 'REB', 'BLK', 'PLS', 'PNT', 'ELC', 'PLB'],
  Warehouse: ['EXC', 'FND', 'COL', 'SLB', 'REB', 'BLK', 'PLS', 'PNT', 'ELC', 'PLB'],
};

const TRADE_DEPENDENCIES = {
  FND: { dependsOn: ['EXC'], description: 'الأساسات تحتاج حفر مسبق' },
  COL: { dependsOn: ['FND', 'REB'], description: 'الأعمدة تحتاج أساسات وحديد' },
  SLB: { dependsOn: ['COL', 'REB'], description: 'السقف يحتاج أعمدة وحديد' },
  BLK: { dependsOn: ['SLB', 'COL'], description: 'البلوك يحتاج هيكل إنشائي' },
  PLS: { dependsOn: ['BLK'], description: 'اللياسة تحتاج بلوك' },
  PNT: { dependsOn: ['PLS'], description: 'الدهان يحتاج لياسة' },
  TLF: { dependsOn: ['PLS'], description: 'البلاط يحتاج لياسة' },
  GPS: { dependsOn: ['PLS'], description: 'الجبس يحتاج لياسة' },
  DR: { dependsOn: ['BLK', 'WAL'], description: 'الأبواب تحتاج جدران' },
  WN: { dependsOn: ['BLK', 'WAL'], description: 'النوافذ تحتاج جدران' },
};

class BOQAuditor {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
    this._auditLog = [];
  }

  audit(project, boqResult) {
    const items = boqResult?.items || project?.boq?.items || [];
    const projectType = project?.getEffective?.('type').value || project?.approved?.type || 'Unknown';
    const projectArea = project?.getEffective?.('area').value || 0;
    const projectFloors = project?.getEffective?.('floors').value || 1;

    const categories = {};

    // 1. Quantity Audit
    categories.quantities = this._auditQuantities(items);

    // 2. Unit Consistency
    categories.units = this._auditUnits(items);

    // 3. Price Reasonableness
    categories.prices = this._auditPrices(items);

    // 4. Saudi Code Compliance
    categories.saudiCode = this._auditSaudiCode(items, projectType);

    // 5. Missing Items
    categories.missingItems = this._auditMissingItems(items, projectType);

    // 6. Dependency Completeness
    categories.dependencies = this._auditDependencies(items);

    // 7. Duplicate Detection
    categories.duplicates = this._auditDuplicates(items);

    // 8. Quantity Reasonableness
    categories.quantityReasonableness = this._auditQuantityReasonableness(items, projectArea, projectFloors);

    const allIssues = [];
    for (const [key, cat] of Object.entries(categories)) {
      if (cat.issues) allIssues.push(...cat.issues);
    }

    const scores = Object.values(categories).map(c => c.score || 100);
    const overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;

    const result = {
      projectId: project?.id || 'unknown',
      timestamp: new Date().toISOString(),
      overall,
      overallGrade: this._grade(overall),
      categories,
      totalIssues: allIssues.length,
      issues: allIssues,
      criticalIssues: allIssues.filter(i => i.severity === 'critical'),
      warnings: allIssues.filter(i => i.severity === 'warning'),
      info: allIssues.filter(i => i.severity === 'info'),
    };

    if (project && project.validation) {
      project.validation.boqAudit = {
        score: overall,
        issues: allIssues.filter(i => i.severity === 'critical' || i.severity === 'error'),
        warnings: allIssues.filter(i => i.severity === 'warning'),
        lastChecked: result.timestamp,
      };
    }

    this._auditLog.push(result);
    return result;
  }

  _auditQuantities(items) {
    const issues = [];
    let validCount = 0;
    let zeroQuantities = 0;
    let negativeQuantities = 0;
    let nullQuantities = 0;

    for (const item of items) {
      const qty = item.quantity;
      if (qty === null || qty === undefined) {
        nullQuantities++;
        issues.push({ code: 'QNT-001', severity: 'error', item: item.code || item.name, message: `الكمية غير محددة للبند ${item.name || item.code}` });
      } else if (qty === 0) {
        zeroQuantities++;
        issues.push({ code: 'QNT-002', severity: 'warning', item: item.code || item.name, message: `الكمية صفر للبند ${item.name || item.code}` });
      } else if (qty < 0) {
        negativeQuantities++;
        issues.push({ code: 'QNT-003', severity: 'critical', item: item.code || item.name, message: `الكمية سالبة (${qty}) للبند ${item.name || item.code}` });
      } else {
        validCount++;
      }
    }

    const score = items.length > 0 ? Math.round((validCount / items.length) * 100) : 100;

    return { score, validCount, zeroQuantities, negativeQuantities, nullQuantities, issues };
  }

  _auditUnits(items) {
    const issues = [];
    let correctUnits = 0;
    let wrongUnits = 0;

    const unitCategories = {};
    for (const [unit, info] of Object.entries(UNIT_COMPATIBILITY)) {
      for (const cat of info.categories) {
        unitCategories[cat] = unit;
      }
    }

    for (const item of items) {
      const unit = item.unit || '';
      if (!unit) {
        issues.push({ code: 'UNT-001', severity: 'warning', item: item.code || item.name, message: `الوحدة غير محددة للبند ${item.name || item.code}` });
        wrongUnits++;
        continue;
      }

      const name = (item.name || item.description || '').toLowerCase();
      let expectedUnit = null;
      for (const [category, u] of Object.entries(unitCategories)) {
        if (name.includes(category) || name.includes(category.replace('_', ' '))) {
          expectedUnit = u;
          break;
        }
      }

      if (expectedUnit) {
        const acceptedUnits = [expectedUnit, ...(UNIT_COMPATIBILITY[expectedUnit]?.alternatives || [])];
        if (!acceptedUnits.includes(unit)) {
          issues.push({ code: 'UNT-002', severity: 'warning', item: item.code || item.name, message: `الوحدة "${unit}" غير متوقعة للبند ${item.name || item.code} (متوقع: ${expectedUnit})` });
          wrongUnits++;
        } else {
          correctUnits++;
        }
      } else {
        correctUnits++;
      }
    }

    const total = correctUnits + wrongUnits;
    const score = total > 0 ? Math.round((correctUnits / total) * 100) : 100;

    return { score, correctUnits, wrongUnits, issues };
  }

  _auditPrices(items) {
    const issues = [];
    let inRange = 0;
    let outOfRange = 0;
    let zeroPrices = 0;
    let missingPrices = 0;

    for (const item of items) {
      const price = item.unitPrice;
      if (price === null || price === undefined) {
        missingPrices++;
        issues.push({ code: 'PRC-001', severity: 'warning', item: item.code || item.name, message: `السعر غير محدد للبند ${item.name || item.code}` });
        continue;
      }
      if (price === 0) {
        zeroPrices++;
        issues.push({ code: 'PRC-002', severity: 'info', item: item.code || item.name, message: `السعر صفر للبند ${item.name || item.code}` });
        continue;
      }

      const trade = item.priceCat || item.trade || '';
      const range = DEFAULT_PRICE_RANGES[trade];
      if (range) {
        if (price >= range.min && price <= range.max) {
          inRange++;
        } else {
          outOfRange++;
          issues.push({
            code: 'PRC-003', severity: 'warning',
            item: item.code || item.name,
            message: `سعر ${item.name || item.code} (${price} ر.س/${item.unit}) خارج المدى المتوقع (${range.min}-${range.max})`,
            expected: range, actual: price,
          });
        }
      } else {
        inRange++;
      }
    }

    const total = inRange + outOfRange;
    const score = total > 0 ? Math.round((inRange / total) * 100) : 100;

    return { score, inRange, outOfRange, zeroPrices, missingPrices, issues };
  }

  _auditSaudiCode(items, projectType) {
    const issues = [];
    const relevantCodes = [];

    if (projectType) {
      const kbType = this.kb?.getProjectType ? this.kb.getProjectType(projectType) : null;
      if (kbType) {
        const hasFire = kbType.costPerM2 > 3000 || ['Residential_Tower', 'Hotel', 'Hospital', 'Mall'].includes(projectType);
        if (hasFire) relevantCodes.push('SBC 302');
        relevantCodes.push('SBC 301', 'SBC 303', 'SBC 305');
        if (kbType.roofType === 'Flat') relevantCodes.push('SBC 306');
      }
    }

    const itemNames = items.map(i => (i.name || i.description || '').toLowerCase());
    const allText = itemNames.join(' ');

    if (relevantCodes.includes('SBC 302')) {
      const hasFireItems = itemNames.some(n =>
        n.includes('fire') || n.includes('حريق') || n.includes('اطفاء') || n.includes('sprinkler')
      );
      if (!hasFireItems) {
        issues.push({
          code: 'SBC-302', severity: 'warning',
          message: `SBC 302 (الحماية من الحريق): مشاريع ${projectType} تتطلب بنود حماية من الحريق`,
          code: relevantCodes.find(c => c.includes('302')),
        });
      }
    }

    if (relevantCodes.includes('SBC 306')) {
      const hasInsulation = itemNames.some(n =>
        n.includes('insulation') || n.includes('عازل') || n.includes('حراري')
      );
      if (!hasInsulation) {
        issues.push({
          code: 'SBC-306', severity: 'info',
          message: 'SBC 306 (العزل الحراري): يوصى بإضافة بنود عزل للأسطح والجدران',
        });
      }
    }

    const score = issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 20);

    return { score, relevantCodes, compliantCodes: relevantCodes.length - issues.length, issues };
  }

  _auditMissingItems(items, projectType) {
    const issues = [];
    const itemCodes = new Set(items.map(i => (i.code || '').substring(0, 3)));
    const required = REQUIRED_ITEMS_BY_TYPE[projectType] || [];

    const missing = required.filter(code => ![...itemCodes].some(c => c.startsWith(code)));

    for (const code of missing) {
      const range = DEFAULT_PRICE_RANGES[code];
      if (range) {
        issues.push({ code: 'MIS-' + code, severity: 'warning', message: `بند ${range.label} (${code}) مفقود لمشاريع ${projectType}` });
      }
    }

    const score = required.length > 0 ? Math.round(((required.length - missing.length) / required.length) * 100) : 100;

    return { score, requiredItems: required.length, presentItems: required.length - missing.length, missing, issues };
  }

  _auditDependencies(items) {
    const issues = [];
    const itemCodes = new Set(items.map(i => (i.code || '').substring(0, 3)));

    let depsMet = 0;
    let depsMissing = 0;

    for (const [code, depInfo] of Object.entries(TRADE_DEPENDENCIES)) {
      if (!itemCodes.has(code)) continue;
      for (const dep of depInfo.dependsOn) {
        if (itemCodes.has(dep)) {
          depsMet++;
        } else {
          depsMissing++;
          issues.push({
            code: 'DEP-' + code, severity: 'warning',
            message: `${depInfo.description}: ${code} يحتاج ${dep}`,
          });
        }
      }
    }

    const total = depsMet + depsMissing;
    const score = total > 0 ? Math.round((depsMet / total) * 100) : 100;

    return { score, dependenciesMet: depsMet, dependenciesMissing: depsMissing, issues };
  }

  _auditDuplicates(items) {
    const issues = [];
    const seen = new Map();

    for (const item of items) {
      const key = item.code || (item.name || '').toLowerCase().trim();
      if (!key) continue;

      if (seen.has(key)) {
        const existing = seen.get(key);
        if (Math.abs((item.quantity || 0) - (existing.quantity || 0)) < 0.01) {
          issues.push({ code: 'DUP-001', severity: 'warning', item: key, message: `بند مكرر: ${item.name || item.code} (نفس الكمية: ${item.quantity})` });
        } else {
          issues.push({ code: 'DUP-002', severity: 'info', item: key, message: `بند مكرر بكمية مختلفة: ${item.name || item.code} (${existing.quantity} vs ${item.quantity})` });
        }
      } else {
        seen.set(key, item);
      }
    }

    return { score: issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 15), duplicatesFound: issues.length, issues };
  }

  _auditQuantityReasonableness(items, area, floors) {
    const issues = [];
    if (!area || area === 0) return { score: 100, issues: [], note: 'No area data for quantity validation' };

    const totalBuiltUp = area * (floors || 1);
    const concreteItems = items.filter(i =>
      (i.code || '').startsWith('COL') || (i.code || '').startsWith('SLB') || (i.code || '').startsWith('FND')
    );
    const totalConcrete = concreteItems.reduce((s, i) => s + (i.quantity || 0), 0);

    if (totalConcrete > 0) {
      const expectedConcrete = totalBuiltUp * 0.25;
      const ratio = totalConcrete / expectedConcrete;
      if (ratio < 0.3) {
        issues.push({ code: 'QTY-001', severity: 'warning', message: `كمية الخرسانة (${Math.round(totalConcrete)} م³) قليلة جداً مقارنة بالمساحة (${Math.round(totalBuiltUp)} م²)` });
      } else if (ratio > 4) {
        issues.push({ code: 'QTY-002', severity: 'warning', message: `كمية الخرسانة (${Math.round(totalConcrete)} م³) كبيرة جداً مقارنة بالمساحة (${Math.round(totalBuiltUp)} م²)` });
      }
    }

    const paintItems = items.filter(i =>
      (i.code || '').startsWith('PNT') || (i.name || '').toLowerCase().includes('paint') || (i.name || '').toLowerCase().includes('دهان')
    );
    const totalPaint = paintItems.reduce((s, i) => s + (i.quantity || 0), 0);

    if (totalPaint > 0) {
      const wallArea = totalBuiltUp * 0.7;
      const ratio = totalPaint / wallArea;
      if (ratio > 2) {
        issues.push({ code: 'QTY-003', severity: 'info', message: `كمية الدهان (${Math.round(totalPaint)} م²) أكبر من مساحة الجدران المتوقعة (${Math.round(wallArea)} م²)` });
      }
    }

    return { score: issues.length === 0 ? 100 : Math.max(70, 100 - issues.length * 15), issues };
  }

  _grade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  getAuditLog(projectId) {
    if (projectId) return this._auditLog.filter(a => a.projectId === projectId);
    return this._auditLog;
  }
}

module.exports = BOQAuditor;
