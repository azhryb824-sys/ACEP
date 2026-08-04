const kb = require('./boq-knowledge-base');

class AssumptionManager {
  constructor() {
    this.userDecisions = { rejected: [], modified: [], accepted: [] };
    this.learningData = { patterns: {}, projectHistory: [] };
    this.assumptionCounter = {};
  }

  generateAssumptions(params) {
    const assumptions = [];
    const missing = this._detectMissing(params);
    const phase = params.phase || kb.detectPhase(params.type || '', params.description || '');
    const phases = kb.getApplicablePhases(params.type || 'Unknown', phase);

    // Collect all applicable items
    for (const phaseId of phases) {
      const phaseItems = kb.ALL_ITEMS_BY_PHASE[phaseId] || [];
      for (const item of phaseItems) {
        if (!kb.itemApplies(item, params)) continue;
        const calcResult = item.calc(params);
        const assumption = this._buildAssumption(item, calcResult, params);
        assumptions.push(assumption);
      }
    }

    // Generate engineering estimates for missing parameters
    let missingIdx = 0;
    for (const [field, info] of Object.entries(missing)) {
      const estimate = this._estimateMissing(params, field, info);
      if (estimate) {
        assumptions.push({
          id: 'assumption-missing-' + field,
          type: 'missing_parameter',
          field,
          reason: info.reason || `لم يتم تحديد ${field}`,
          proposedValue: estimate.value,
          unit: estimate.unit || '',
          confidence: estimate.confidence,
          explanation: estimate.explanation || `تقدير هندسي لـ ${field} بناءً على ${estimate.basedOn}`,
          basedOn: estimate.basedOn,
          editable: true,
          source: 'engineering_inference',
          requiresConfirmation: true,
        });
      }
    }

    this._lastAssumptions = assumptions;

    return {
      projectType: params.type,
      phase,
      lifecyclePhases: phases.map(pid => {
        const p = kb.PHASES.find(x => x.id === pid);
        return { id: pid, name: p ? p.nameAr : pid, order: p ? p.order : 99 };
      }),
      params,
      assumptions,
      totalAssumptions: assumptions.length,
      insufficientCount: assumptions.filter(a => a.insufficient).length,
      missingParameters: Object.keys(missing),
    };
  }

  applyDecisions(params, decisions) {
    const merged = { ...params };

    for (const decision of decisions) {
      // Look up assumption from cache if code is an assumption id
      let assumption = null;
      if (decision.code) {
        assumption = this._lastAssumptions?.find(a => a.id === decision.code) || null;
      }

      if (decision.action === 'accept') {
        // Accept can come as: {code: 'assumption-area-0'} for missing params
        // or {code: 'assumption-EXC-001', field: 'quantity', approvedValue: ...}
        if (assumption && assumption.type === 'missing_parameter' && assumption.field) {
          merged[assumption.field] = decision.approvedValue ?? assumption.proposedValue;
          decision.field = assumption.field;
        } else if (decision.field) {
          merged[decision.field] = decision.approvedValue ?? decision.proposedValue;
        } else if (assumption?.field) {
          merged[assumption.field] = decision.approvedValue ?? assumption.proposedValue;
          decision.field = assumption.field;
        }
        this._recordLearning(decision, 'accepted');
      } else if (decision.action === 'modify' && decision.field) {
        merged[decision.field] = decision.approvedValue;
        this._recordLearning(decision, 'modified');
      } else if (decision.action === 'reject') {
        this._recordLearning(decision, 'rejected');
      }
    }

    return merged;
  }

  cacheAssumptions(assumptions) {
    this._lastAssumptions = assumptions;
  }

  getLearningInsights() {
    const ud = this.userDecisions || { accepted: [], modified: [], rejected: [] };
    const ld = this.learningData || { patterns: {}, projectHistory: [] };
    return {
      patterns: ld.patterns || {},
      totalDecisions: {
        accepted: (ud.accepted || []).length,
        modified: (ud.modified || []).length,
        rejected: (ud.rejected || []).length,
      },
      recentHistory: (ld.projectHistory || []).slice(-50),
    };
  }

  _detectMissing(params) {
    const missing = {};

    if (!params.area || params.area <= 0) {
      const type = params.type || 'Unknown';
      const baseArea = { Villa: 400, Apartment_Finishing: 150, Apartment_Building: 500, School: 2000, Hospital: 5000, Residential_Tower: 800, Factory: 3000, Mosque: 1000, Mall: 5000, Office_Building: 1500, Hotel: 2000, Warehouse: 2000, Residential_Compound: 5000, Luxury_Villa: 800 };
      missing.area = { reason: 'لم يتم تحديد مساحة المبنى', defaultHint: baseArea[type] || null };
    }

    if (!params.floors || params.floors <= 0) {
      const type = params.type || 'Unknown';
      const baseFloors = { Villa: 2, Apartment_Finishing: 1, Apartment_Building: 5, School: 2, Hospital: 4, Residential_Tower: 10, Factory: 2, Mosque: 2, Mall: 2, Office_Building: 5, Hotel: 6, Warehouse: 1, Residential_Compound: 2, Luxury_Villa: 2 };
      missing.floors = { reason: 'لم يتم تحديد عدد الأدوار', defaultHint: baseFloors[type] || null };
    }

    if (!params.rooms || params.rooms <= 0) {
      if (params.type !== 'Warehouse' && params.type !== 'Factory') {
        const type = params.type || 'Unknown';
        const baseRooms = { Villa: 5, Apartment_Finishing: 3, Apartment_Building: 10, School: 20, Hospital: 50, Residential_Tower: 40, Mosque: 5, Mall: 30, Office_Building: 25, Hotel: 60, Residential_Compound: 30, Luxury_Villa: 7 };
        missing.rooms = { reason: 'لم يتم تحديد عدد الغرف', defaultHint: baseRooms[type] || 5 };
      }
    }

    if (!params.bathrooms || params.bathrooms <= 0) {
      const type = params.type || 'Unknown';
      const baseBaths = { Villa: 3, Apartment_Finishing: 2, Apartment_Building: 8, School: 10, Hospital: 30, Residential_Tower: 40, Mosque: 8, Mall: 15, Office_Building: 10, Hotel: 40, Warehouse: 3, Residential_Compound: 20, Luxury_Villa: 5 };
      missing.bathrooms = { reason: 'لم يتم تحديد عدد الحمامات', defaultHint: baseBaths[type] || 3 };
    }

    if (!params.hasOwnProperty('hasKitchen') && (params.type === 'Villa' || params.type === 'Apartment_Finishing' || params.type === 'Apartment_Building' || params.type === 'Luxury_Villa')) {
      missing.hasKitchen = { reason: 'لم يتم تحديد وجود مطبخ', defaultHint: true };
    }

    return missing;
  }

  _estimateMissing(params, field, info) {
    const type = params.type || 'Unknown';

    const estimators = {
      area: () => ({
        value: info.defaultHint,
        unit: 'م²',
        confidence: 0.40,
        explanation: `تقدير المساحة بناءً على متوسط مساحة ${type} في قاعدة البيانات الهندسية`,
        basedOn: `متوسط مساحة ${type}`,
      }),
      floors: () => ({
        value: info.defaultHint,
        unit: 'دور',
        confidence: 0.50,
        explanation: `تقدير عدد الأدوار بناءً على نوع المشروع (${type})`,
        basedOn: `متوسط أدوار ${type}`,
      }),
      rooms: () => ({
        value: info.defaultHint,
        unit: 'غرفة',
        confidence: 0.45,
        explanation: `تقدير عدد الغرف بناءً على ${type} بمساحة ${params.area || '?'}م²`,
        basedOn: `متوسط غرف ${type}`,
      }),
      bathrooms: () => ({
        value: info.defaultHint,
        unit: 'حمام',
        confidence: 0.50,
        explanation: `تقدير عدد الحمامات بناءً على ${type}`,
        basedOn: `متوسط حمامات ${type}`,
      }),
      hasKitchen: () => ({
        value: true,
        unit: '',
        confidence: 0.60,
        explanation: 'افتراض وجود مطبخ للمشاريع السكنية',
        basedOn: 'طبيعة المشروع السكنية',
      }),
    };

    const estimator = estimators[field];
    return estimator ? estimator() : null;
  }

  _buildAssumption(itemDef, calcResult, params) {
    const phaseDef = kb.PHASES.find(p => p.id === itemDef.phase);
    return {
      id: 'assumption-' + itemDef.code,
      type: calcResult.insufficient ? 'insufficient_data' : 'calculated',
      code: itemDef.code,
      description: itemDef.description,
      phase: itemDef.phase,
      phaseName: phaseDef ? phaseDef.nameAr : itemDef.phase,
      phaseOrder: phaseDef ? phaseDef.order : 99,
      trade: itemDef.trade,
      tradeName: kb.TRADES[itemDef.trade] || itemDef.trade,
      element: itemDef.element,
      material: itemDef.material,
      unit: itemDef.unit,
      insufficient: calcResult.insufficient || false,
      reason: calcResult.reason || null,
      quantity: calcResult.insufficient ? null : calcResult.quantity,
      method: calcResult.insufficient ? null : calcResult.method,
      confidence: calcResult.insufficient ? 0 : itemDef.confidence,
      priceCategory: itemDef.priceCat,
      pricePerUnit: null,
      dataSource: itemDef.dataSource,
      explanation: itemDef.explanation,
      requiresConfirmation: calcResult.insufficient || itemDef.confidence < 0.70,
      editable: calcResult.insufficient || itemDef.confidence < 0.85,
    };
  }

  _recordLearning(decision, actionType) {
    this.userDecisions[actionType].push({
      ...decision,
      timestamp: new Date().toISOString(),
    });

    const key = decision.code || decision.field || 'unknown';
    if (!this.learningData.patterns[key]) {
      this.learningData.patterns[key] = { count: 0, acceptRate: 0, typicalValue: null, modifications: [] };
    }
    const pattern = this.learningData.patterns[key];
    pattern.count++;

    if (actionType === 'accepted') {
      pattern.acceptRate = (pattern.acceptRate * (pattern.count - 1) + 1) / pattern.count;
      pattern.typicalValue = decision.approvedValue || decision.proposedValue;
    } else if (actionType === 'modified') {
      pattern.acceptRate = (pattern.acceptRate * (pattern.count - 1)) / pattern.count;
      pattern.modifications.push({ from: decision.originalValue, to: decision.approvedValue });
      if (pattern.modifications.length > 10) pattern.modifications.shift();
    } else if (actionType === 'rejected') {
      pattern.acceptRate = (pattern.acceptRate * (pattern.count - 1)) / pattern.count;
    }
  }
}

module.exports = AssumptionManager;
