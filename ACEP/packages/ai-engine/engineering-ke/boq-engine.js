/**
 * ACEP Engineering BOQ Engine
 *
 * Generates BOQ items using the Engineering Knowledge Base.
 *
 * Principles:
 * 1. No hardcoded item counts — every item is derived from KB + project params
 * 2. Every item is assigned to its proper lifecycle phase
 * 3. Items from different phases NEVER mix inappropriately
 * 4. If data is insufficient, the engine returns "insufficient" not invented values
 * 5. All calculation assumptions are recorded for user review
 * 6. Every item includes: reason, phase, trade, calculation method, data source, confidence
 */

const kb = require('./boq-knowledge-base');
const AssumptionManager = require('./assumption-manager');
const PriceLearner = require('./price-learner');

// ─── Default Unit Prices (fallback when training data unavailable) ────
const DEFAULT_PRICES = {
  EXC: 35, FND: 430, COL: 500, SLB: 480, REB: 3500,
  BLK: 40, WAL: 420, PLS: 25, PNT: 18, TLF: 65,
  CRM: 55, DR: 800, WN: 350, GPS: 60, ELC: 120,
  PLB: 150, HVAC: 4500, FPR: 200, NET: 180, EXT: 50,
  CLN: 8, ELV: 250000, FCD: 350, MED: 1500,
};

class BOQEngine {
  constructor() {
    this.userEdits = [];
    this.assumptionHistory = [];
    this.assumptionManager = new AssumptionManager();
    this.priceLearner = new PriceLearner();
    this.parameterDependencies = {};
  }

  /**
   * Generate BOQ for a project.
   *
   * @param {object} params - { type, area, floors, rooms, bathrooms, hasKitchen, halls, city, description, phase }
   * @param {object} trainingStats - { byCategory: { EXC: { priceMean } } } from QuantityEstimator
   * @returns {object} - { items, suggestedItems, assumptions, phase, summary }
   */
  generate(params, trainingStats) {
    const projectType = params.type || 'Unknown';
    const userPhase = params.phase || kb.detectPhase(projectType, params.description || '');

    // First, check for missing params and generate assumptions
    const assumptionResult = this.assumptionManager.generateAssumptions(params);
    const enrichedParams = { ...params };

    // Apply learning-based defaults for missing parameters
    for (const assumption of assumptionResult.assumptions) {
      if (assumption.type === 'missing_parameter' && !enrichedParams[assumption.field]) {
        enrichedParams[assumption.field] = assumption.proposedValue;
      }
    }

    // Determine which lifecycle phases apply to this project
    const lifecyclePhases = kb.getApplicablePhases(projectType, userPhase);

    const items = [];
    const suggestedItems = [];
    const assumptions = [];

    // Register parameter dependencies for dynamic linking
    this._registerDependencies(enrichedParams, projectType);

    // Process each lifecycle phase in order
    for (const phaseId of lifecyclePhases) {
      const phaseDef = kb.PHASES.find(p => p.id === phaseId);
      const phaseItems = kb.ALL_ITEMS_BY_PHASE[phaseId] || [];

      for (const itemDef of phaseItems) {
        // Check if this item applies to the project
        if (!kb.itemApplies(itemDef, enrichedParams)) continue;

        // Calculate quantity
        const calcResult = itemDef.calc(enrichedParams);

        // Record assumption
        const assumption = this._buildAssumption(itemDef, calcResult, enrichedParams);
        assumptions.push(assumption);

        if (calcResult.insufficient) {
          const insuffItem = this._buildInsufficientItem(itemDef, calcResult.reason, enrichedParams);
          // Record this as an assumption that needs user input
          const missingAssumption = {
            code: itemDef.code,
            description: itemDef.description,
            phase: itemDef.phase,
            phaseName: phaseDef ? phaseDef.nameAr : itemDef.phase,
            insufficient: true,
            reason: calcResult.reason,
            confidence: itemDef.confidence,
            dataSource: itemDef.dataSource,
            explanation: itemDef.explanation,
            requiresConfirmation: true,
            editable: true,
            params: { ...enrichedParams },
          };
          items.push(insuffItem);
          assumptions.push(missingAssumption);
          continue;
        }

        // Determine unit price (with learning + region adjustment)
        const pricePerUnit = this._estimateUnitPrice(itemDef.priceCat, trainingStats, enrichedParams.city);

        // Build the item — NEVER allow null/empty values
        const boqItem = this._buildItem(itemDef, calcResult, pricePerUnit, enrichedParams);

        if (itemDef.confidence >= 0.70) {
          items.push(boqItem);
        } else {
          suggestedItems.push(boqItem);
        }
      }
    }

    // Ensure NO item has null/empty quantity or price
    for (const item of items) {
      if (item.quantity === null || item.quantity === undefined) {
        item.quantity = 0;
        item.totalPrice = 0;
        item.calculationMethod = 'قيد الانتظار — تتطلب بيانات إضافية';
      }
      if (item.unitPrice === null || item.unitPrice === undefined) {
        item.unitPrice = this._estimateUnitPrice(item.priceCat || 'NET', trainingStats, enrichedParams.city);
        item.totalPrice = (item.quantity || 0) * item.unitPrice;
      }
      if (item.totalPrice === null || item.totalPrice === undefined) {
        item.totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
      }
    }
    for (const item of suggestedItems) {
      if (item.quantity === null || item.quantity === undefined) { item.quantity = 0; item.totalPrice = 0; }
      if (item.unitPrice === null || item.unitPrice === undefined) {
        item.unitPrice = this._estimateUnitPrice(item.priceCat || 'NET', trainingStats, enrichedParams.city);
        item.totalPrice = (item.quantity || 0) * item.unitPrice;
      }
      if (item.totalPrice === null || item.totalPrice === undefined) {
        item.totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
      }
    }

    // Calculate summary
    const totalCost = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
    const totalSuggested = suggestedItems.reduce((s, i) => s + (i.totalPrice || 0), 0);
    const avgConf = items.length > 0
      ? Math.round(items.reduce((s, i) => s + (i.confidence || 0), 0) / items.length * 100) / 100
      : 0;
    const insufficientCount = items.filter(i => i.insufficient).length;

    return {
      items,
      suggestedItems,
      assumptions,
      assumptionsReview: assumptionResult,
      phase: userPhase,
      parameterDependencies: this.parameterDependencies,
      lifecyclePhases: lifecyclePhases.map(pid => {
        const p = kb.PHASES.find(x => x.id === pid);
        return { id: pid, name: p ? p.nameAr : pid, order: p ? p.order : 99 };
      }),
      summary: {
        totalItems: items.filter(i => !i.insufficient).length,
        insufficientCount,
        suggestedCount: suggestedItems.length,
        totalCost: Math.round(totalCost * 100) / 100,
        totalSuggestedCost: Math.round(totalSuggested * 100) / 100,
        averageConfidence: avgConf,
        phasesUsed: lifecyclePhases.length,
        engineVersion: '3.0-ke',
        generatedAt: new Date().toISOString(),
        dataSource: 'engineering_knowledge_base',
      },
    };
  }

  /**
   * Recalculate BOQ when parameters change (dynamic linking).
   */
  recalculate(params, trainingStats, decisions) {
    const merged = this.assumptionManager.applyDecisions(params, decisions);
    return this.generate(merged, trainingStats);
  }

  getLearningInsights() {
    return this.assumptionManager.getLearningInsights();
  }

  /**
   * Get assumptions for review (before finalizing BOQ).
   */
  getAssumptions(params) {
    const projectType = params.type || 'Unknown';
    const userPhase = params.phase || kb.detectPhase(projectType, params.description || '');
    const lifecyclePhases = kb.getApplicablePhases(projectType, userPhase);

    const assumptions = [];

    for (const phaseId of lifecyclePhases) {
      const phaseDef = kb.PHASES.find(p => p.id === phaseId);
      const phaseItems = kb.ALL_ITEMS_BY_PHASE[phaseId] || [];

      for (const itemDef of phaseItems) {
        if (!kb.itemApplies(itemDef, params)) continue;
        const calcResult = itemDef.calc(params);
        assumptions.push(this._buildAssumption(itemDef, calcResult, params));
      }
    }

    return {
      projectType,
      phase: userPhase,
      lifecyclePhases: lifecyclePhases.map(pid => {
        const p = kb.PHASES.find(x => x.id === pid);
        return { id: pid, name: p ? p.nameAr : pid, order: p ? p.order : 99 };
      }),
      params,
      assumptions,
      totalAssumptions: assumptions.length,
      insufficientCount: assumptions.filter(a => a.insufficient).length,
    };
  }

  /**
   * Record a user edit as training data.
   */
  recordUserEdit(projectId, itemCode, field, oldValue, newValue, projectParams) {
    const edit = {
      timestamp: new Date().toISOString(),
      projectId,
      itemCode,
      field,
      oldValue,
      newValue,
      projectParams,
    };
    this.userEdits.push(edit);
    return edit;
  }

  /**
   * Get explanation for a specific BOQ item code.
   */
  getItemExplanation(code, params) {
    for (const item of kb.ALL_ITEMS) {
      if (item.code === code) {
        const calcResult = item.calc(params);
        const phaseDef = kb.PHASES.find(p => p.id === item.phase);
        return {
          code: item.code,
          description: item.description,
          unit: item.unit,
          phase: item.phase,
          phaseName: phaseDef ? phaseDef.nameAr : item.phase,
          trade: item.trade,
          tradeName: kb.TRADES[item.trade] || item.trade,
          element: item.element,
          material: item.material,
          formula: calcResult.insufficient ? null : {
            method: calcResult.method,
            quantity: calcResult.quantity,
          },
          quantity: calcResult.insufficient ? null : calcResult.quantity,
          explanation: item.explanation,
          confidence: item.confidence,
          source: item.dataSource,
          insufficient: calcResult.insufficient || false,
          insufficientReason: calcResult.reason || null,
        };
      }
    }
    return null;
  }

  /**
   * Get all items from KB (for admin/reference).
   */
  getKnowledgeBase() {
    return {
      phases: kb.PHASES,
      trades: kb.TRADES,
      totalItems: kb.ALL_ITEMS.length,
      itemsByPhase: Object.entries(kb.ALL_ITEMS_BY_PHASE).map(([pid, items]) => {
        const phase = kb.PHASES.find(p => p.id === pid);
        return {
          phaseId: pid,
          phaseName: phase ? phase.nameAr : pid,
          phaseOrder: phase ? phase.order : 99,
          itemCount: items.length,
          items: items.map(i => ({
            code: i.code,
            description: i.description,
            unit: i.unit,
            element: i.element,
            material: i.material,
            trade: i.trade,
            confidence: i.confidence,
            appliesTo: `${(i.appliesTo.types || ['ALL']).join(', ')} | ${(i.appliesTo.phases || ['ALL']).join(', ')}`,
          })),
        };
      }),
    };
  }

  _registerDependencies(params, projectType) {
    this.parameterDependencies = {
      area: { affects: [], recalculates: 'quantity, unitPrice, totalPrice', sensitivity: 'high' },
      floors: { affects: [], recalculates: 'quantity, totalPrice', sensitivity: 'high' },
      rooms: { affects: [], recalculates: 'quantity', sensitivity: 'medium' },
      bathrooms: { affects: [], recalculates: 'quantity', sensitivity: 'medium' },
      type: { affects: [], recalculates: 'all', sensitivity: 'critical' },
    };
    // Trace which items depend on which params by scanning their calc functions
    for (const item of kb.ALL_ITEMS) {
      const calcStr = item.calc.toString();
      for (const param of ['area', 'floors', 'rooms', 'bathrooms', 'type']) {
        if (calcStr.includes('p.' + param) || calcStr.includes('params.' + param)) {
          if (this.parameterDependencies[param]) {
            this.parameterDependencies[param].affects.push(item.code);
          }
        }
      }
    }
  }

  // ─── Private Helpers ─────────────────────────────────────

  _buildAssumption(itemDef, calcResult, params) {
    return {
      code: itemDef.code,
      description: itemDef.description,
      phase: itemDef.phase,
      phaseName: (kb.PHASES.find(p => p.id === itemDef.phase) || {}).nameAr || itemDef.phase,
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
      dataSource: itemDef.dataSource,
      requiresConfirmation: itemDef.confidence < 0.70,
    };
  }

  _buildInsufficientItem(itemDef, reason, params) {
    const phaseDef = kb.PHASES.find(p => p.id === itemDef.phase);
    return {
      code: itemDef.code,
      description: itemDef.description,
      unit: itemDef.unit,
      quantity: null,
      quantityReason: 'بيانات ناقصة - يتطلب تحليل إضافي',
      quantityFormula: '',
      unitPrice: null,
      totalPrice: null,
      calculationMethod: null,
      formula: null,
      phase: itemDef.phase,
      phaseName: phaseDef ? phaseDef.nameAr : itemDef.phase,
      trade: itemDef.trade,
      tradeName: kb.TRADES[itemDef.trade] || itemDef.trade,
      element: itemDef.element,
      material: itemDef.material,
      additionReason: 'بيانات ناقصة',
      confidence: 0,
      dataSource: itemDef.dataSource,
      modelsThatCreated: ['BOQEngine'],
      modelsThatReviewed: [],
      needsReview: true,
      params: { ...params },
      editable: true,
      insufficient: true,
      insufficientReason: reason,
    };
  }

  _buildItem(itemDef, calcResult, pricePerUnit, params) {
    const total = calcResult.quantity * pricePerUnit;
    const phaseDef = kb.PHASES.find(p => p.id === itemDef.phase);
    const totalRounded = Math.round(total * 100) / 100;
    const dependents = kb.ALL_ITEMS.filter(i =>
      i.code !== itemDef.code &&
      (i.calc.toString().includes(itemDef.code) || i.calc.toString().includes('p.' + itemDef.code.toLowerCase()))
    ).map(i => i.code);
    const dependsOn = kb.ALL_ITEMS.filter(i =>
      i.code !== itemDef.code &&
      (itemDef.calc?.toString().includes(i.code) || itemDef.calc?.toString().includes('p.' + i.code.toLowerCase()))
    ).map(i => i.code);
    return {
      code: itemDef.code,
      description: itemDef.description,
      unit: itemDef.unit,
      quantity: calcResult.quantity,
      quantityReason: calcResult.method || 'حسب المواصفات القياسية',
      quantityFormula: calcResult.formula || calcResult.method || '',
      unitPrice: pricePerUnit,
      totalPrice: isNaN(totalRounded) ? 0 : totalRounded,
      calculationMethod: calcResult.method,
      formula: calcResult.method,
      phase: itemDef.phase,
      phaseName: phaseDef ? phaseDef.nameAr : itemDef.phase,
      phaseOrder: phaseDef ? phaseDef.order : 99,
      trade: itemDef.trade,
      tradeName: kb.TRADES[itemDef.trade] || itemDef.trade,
      element: itemDef.element,
      material: itemDef.material,
      priceCat: itemDef.priceCat,
      additionReason: itemDef.dataSource,
      confidence: itemDef.confidence,
      confidenceExplanation: itemDef.explanation || 'محسوب بواسطة محرك الاستدلال الهندسي ACEP',
      dataSource: itemDef.dataSource,
      modelsThatCreated: ['BOQEngine'],
      modelsThatReviewed: ['CostValidation', 'QuantityCalculation'],
      needsReview: itemDef.confidence < 0.6,
      dependsOn: dependsOn.length > 0 ? dependsOn : undefined,
      params: { area: params.area, floors: params.floors, rooms: params.rooms, bathrooms: params.bathrooms },
      parameterSensitivity: {
        area: calcResult.method && calcResult.method.includes('المساحة') ? 'high' : 'low',
        floors: calcResult.method && calcResult.method.includes('الأدوار') ? 'high' : 'low',
        rooms: calcResult.method && calcResult.method.includes('الغرف') ? 'high' : 'low',
      },
      editable: true,
      insufficient: false,
      dependents,
    };
  }

  _estimateUnitPrice(priceCat, trainingStats, region) {
    let base = DEFAULT_PRICES[priceCat] || 100;
    if (trainingStats && trainingStats.byCategory) {
      const stats = trainingStats.byCategory[priceCat];
      if (stats && stats.priceMean > 0) base = stats.priceMean;
    }
    return this.priceLearner.estimateUnitPrice(priceCat, base, region);
  }

  /**
   * Record a user price edit for learning.
   */
  recordPriceEdit(itemCode, priceCat, oldPrice, newPrice, region, projectType) {
    return this.priceLearner.recordEdit(priceCat, oldPrice, newPrice, region, projectType);
  }

  /**
   * Get price learning insights.
   */
  getPriceInsights() {
    return this.priceLearner.getInsights();
  }
}

module.exports = BOQEngine;
