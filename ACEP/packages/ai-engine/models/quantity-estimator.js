/**
 * ACEP Smart Quantity Estimator — v3 (Rule Engine + Training Data)
 *
 * Hybrid approach:
 * 1. Rule Engine determines WHICH items to generate based on project type + phase
 * 2. Training data (85,062 real BOQ items) provides unit prices per category
 * 3. No hardcoded building defaults. Every item is derived from project params + rules.
 */

const fs = require('fs');
const path = require('path');
const kb = require('../knowledge-base');
const boqRules = require('./boq-rules');
const millionProjectModel = require('./million-project-model');

const DETAILED_RULE_MODEL_TYPES = new Set([
  'villa', 'apartment', 'apartment_building', 'residential_tower', 'residential_compound',
  'office', 'mall', 'hotel', 'hospital', 'school', 'mosque', 'factory', 'warehouse', 'fitout'
]);

class QuantityEstimator {
  constructor() {
    this.trained = false;
    this.boqData = [];
    this.byCategory = {};
    this.byProjectType = {};
    this.userEdits = []; // tracked training feedback
  }

  async train(csvPath) {
    const fp = csvPath || path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv', 'boq_items.csv');
    this.boqData = fs.readFileSync(fp, 'utf8').trim().split('\n').slice(1).map(l => {
      const c = l.split(',');
      return {
        projectId: c[0], itemCode: c[1], description: c[2],
        category: c[3], unit: c[4], quantity: parseFloat(c[5]) || 0,
        unitPrice: parseFloat(c[6]) || 0, confidence: parseInt(c[7]) || 0,
        wasteFactor: parseFloat(c[8]) || 0
      };
    });

    // Build per-category price stats from training data
    const cats = {};
    for (const item of this.boqData) {
      if (!item.unitPrice || item.unitPrice <= 0) continue;
      const prefix = (item.itemCode || item.category || 'GEN').split('-')[0];
      if (!cats[prefix]) cats[prefix] = [];
      cats[prefix].push(item.unitPrice);
    }
    for (const [cat, prices] of Object.entries(cats)) {
      prices.sort((a, b) => a - b);
      this.byCategory[cat] = {
        count: prices.length,
        priceMean: prices.reduce((s, v) => s + v, 0) / prices.length,
        priceMedian: prices[Math.floor(prices.length / 2)],
        priceMin: prices[0],
        priceMax: prices[prices.length - 1]
      };
    }

    this.trained = true;
    this._boqCount = this.boqData.length;
    this.boqData = null;
    return { items: this._boqCount, categories: Object.keys(this.byCategory).length };
  }

  /**
   * Generate BOQ for a project.
   *
   * @param {string} projectType - e.g. 'Apartment_Finishing', 'Villa', etc.
   * @param {number} area - land/building area in m²
   * @param {number} floors - number of floors
   * @param {string} finishing - finishing level (Standard, Premium, etc.)
   * @param {string} region - region/city name
   * @param {object} extraParams - { rooms, bathrooms, hasKitchen, halls, city, description, phase }
   * @returns {{ items: object[], summary: object }}
   */
  estimateBOQ(projectType, area, floors, finishing = 'Standard', region = 'Riyadh', extraParams = {}) {
    if (!this.trained) return { items: [], summary: { totalItems: 0, totalCost: 0, averageConfidence: 0 } };

    const params = {
      type: projectType,
      area: area || 0,
      floors: floors || 1,
      rooms: extraParams.rooms || null,
      bathrooms: extraParams.bathrooms || null,
      hasKitchen: extraParams.hasKitchen || false,
      halls: extraParams.halls || null,
      city: extraParams.city || region,
      description: extraParams.description || '',
      phase: extraParams.phase || null
    };

    const trainedPrediction = millionProjectModel.predict({
      projectType: extraParams.modelType || projectType,
      grossBuiltArea: extraParams.grossBuiltArea || (Number(area) * Number(floors)),
      footprintArea: extraParams.footprintArea || area,
      landArea: extraParams.landArea,
      floors,
      basements: extraParams.basements,
      buildings: extraParams.buildings,
      capacity: extraParams.capacity,
      city: extraParams.city || region,
      finishing,
      method: extraParams.method
    });

    const modelType = String(extraParams.modelType || '').trim().toLowerCase();
    if (modelType && !DETAILED_RULE_MODEL_TYPES.has(modelType)) {
      return this._conceptualBOQ(params, extraParams, trainedPrediction, finishing, region);
    }

    // Generate detailed items only for project types covered by explicit item
    // rules. Proxy and infrastructure types must not inherit building finishes.
    const result = boqRules.generateBOQ(params, { byCategory: this.byCategory });

    // Apply finishing & region price adjustments from training data
    const multiplier = kb.getMaterialPriceMultiplier(finishing);
    const regionIndex = kb.getRegionIndex(region);
    if (multiplier !== 1 || regionIndex !== 1) {
      for (const item of result.items) {
        if (item.unitPrice && !item.insufficient) {
          item.unitPrice = Math.round(item.unitPrice * multiplier * regionIndex * 100) / 100;
          item.totalPrice = Math.round(item.quantity * item.unitPrice * 100) / 100;
          item.priceNote = `سعر الأساس معدل بعامل التشطيب (${multiplier}) وعامل المنطقة (${regionIndex})`;
        }
      }
    }

    const trainedReference = trainedPrediction.available ? {
      modelId: trainedPrediction.modelId,
      projectType: trainedPrediction.projectType,
      trainingRecords: trainedPrediction.trainingRecords,
      dataProvenance: trainedPrediction.dataProvenance,
      quantities: {
        concreteM3: Math.round(trainedPrediction.predictions.concreteM3 * 100) / 100,
        steelTon: Math.round(trainedPrediction.predictions.steelTon * 100) / 100,
        blocksM2: Math.round(trainedPrediction.predictions.blocksM2 * 100) / 100,
        hvacTR: Math.round(trainedPrediction.predictions.hvacTR * 100) / 100,
        electricalKVA: Math.round(trainedPrediction.predictions.electricalKVA * 100) / 100,
        waterLpd: Math.round(trainedPrediction.predictions.waterLpd * 100) / 100
      },
      intervals: trainedPrediction.intervals,
      suitableForModelApproval: false
    } : null;

    return {
      items: result.items,
      suggestedItems: result.suggestedItems,
      assumptions: result.assumptions,
      lifecyclePhases: result.lifecyclePhases,
      phase: result.phase,
      summary: {
        ...result.summary,
        trainingDataAvailable: this._boqCount || 0,
        priceDataPoints: Object.keys(this.byCategory).length,
        assumptionsCount: (result.assumptions || []).length,
        trainedReference,
        predictionSource: trainedReference ? 'million_project_research_candidate_guardrail' : 'engineering_knowledge_base',
        region,
        finishing
      }
    };
  }

  _conceptualBOQ(params, extraParams, prediction, finishing, region) {
    const grossArea = Number(extraParams.grossBuiltArea) > 0
      ? Number(extraParams.grossBuiltArea)
      : Number(params.area) * Number(params.floors || 1);
    const modelType = String(extraParams.modelType || params.type || 'other').trim().toLowerCase();
    if (!prediction.available) {
      return {
        items: [],
        suggestedItems: [],
        assumptions: [],
        lifecyclePhases: [],
        phase: 'Conceptual',
        summary: {
          totalItems: 0,
          insufficientCount: 1,
          suggestedCount: 0,
          totalCost: null,
          averageConfidence: 0,
          phasesUsed: 0,
          engineVersion: '4.0-conceptual-gated',
          dataSource: 'none',
          status: 'blocked',
          reason: prediction.reason || 'trained conceptual model unavailable',
          projectType: modelType,
          region,
          finishing
        }
      };
    }

    const labels = {
      mixed_use: 'المساحة المبنية متعددة الاستخدامات', sports: 'مساحة المنشأة الرياضية',
      cultural: 'مساحة المنشأة الثقافية', data_center: 'مساحة مركز البيانات',
      power_plant: 'مساحة منشأة التوليد', renewable_energy: 'مساحة موقع الطاقة المتجددة',
      oil_gas: 'مساحة المنشأة الصناعية المعالجة', road: 'مساحة ممر الطريق المعالج',
      bridge: 'مساحة سطح الجسر المرجعية', tunnel: 'مساحة مقطع النفق المعالج',
      railway: 'مساحة ممر السكة المعالج', airport: 'مساحة منشأة المطار المعالجة',
      port: 'مساحة منشأة الميناء المعالجة', water: 'مساحة منشأة المياه المعالجة',
      dam: 'مساحة الأعمال المدنية للسد', power: 'مساحة منشأة شبكة القدرة',
      telecom: 'مساحة منشأة الاتصالات', landscape: 'مساحة تنسيق الموقع',
      renovation: 'مساحة المبنى محل التأهيل', heritage: 'مساحة النسيج التراثي',
      other: 'مساحة المشروع المعالجة'
    };
    const definitions = [
      ['SCP-001', labels[modelType] || 'مساحة المشروع المعالجة', 'م²', grossArea, null, null, 'Scope', 'نطاق المشروع'],
      ['CON-REF', 'خرسانة — مرجع كمي مفاهيمي', 'م³', prediction.predictions.concreteM3, 'concreteM3', prediction.intervals.concreteM3, 'Concrete', 'خرسانة'],
      ['STL-REF', 'حديد تسليح/إنشاء — مرجع كمي مفاهيمي', 'طن', prediction.predictions.steelTon, 'steelTon', prediction.intervals.steelTon, 'Steel', 'حديد'],
      ['BLK-REF', 'مبانٍ وقواطع — مرجع كمي مفاهيمي', 'م²', prediction.predictions.blocksM2, 'blocksM2', prediction.intervals.blocksM2, 'Block', 'بلوك'],
      ['HVC-REF', 'سعة تبريد مرجعية', 'طن تبريد', prediction.predictions.hvacTR, 'hvacTR', prediction.intervals.hvacTR, 'HVAC', 'تكييف'],
      ['ELC-REF', 'حمل كهربائي مرجعي', 'ك.ف.أ', prediction.predictions.electricalKVA, 'electricalKVA', prediction.intervals.electricalKVA, 'Electrical', 'كهرباء']
    ];
    const items = definitions
      .filter(([, , , quantity]) => Number(quantity) > 0)
      .map(([code, description, unit, quantity, target, interval, category, material]) => ({
        code,
        description,
        unit,
        quantity: Math.round(Number(quantity) * 100) / 100,
        quantityRange: interval ? {
          lower: Math.round(Number(interval.lower) * 100) / 100,
          upper: Math.round(Number(interval.upper) * 100) / 100,
          basis: 'synthetic_holdout_p90_error'
        } : null,
        unitPrice: null,
        totalPrice: null,
        category,
        material,
        phase: 'CONCEPTUAL',
        calculationMethod: target ? `ACEP research model target: ${target}` : 'Explicit project treated area',
        dataSource: target ? prediction.modelId : 'structured_project_brief',
        confidence: target ? 0.60 : 0.95,
        estimateStatus: target ? 'experimental_model_reference' : 'user_input_reference',
        insufficient: false,
        editable: true,
        needsReview: true,
        contractualUse: false,
        suitableForProcurement: false
      }));
    const assumptions = items.map(item => ({
      code: item.code,
      description: item.description,
      quantity: item.quantity,
      range: item.quantityRange,
      dataSource: item.dataSource,
      requiresConfirmation: true,
      reason: item.estimateStatus === 'user_input_reference'
        ? 'Derived from the explicit project scale.'
        : 'Concept-stage reference learned from synthetic engineering priors; detailed drawings are required.'
    }));
    return {
      items,
      suggestedItems: [],
      assumptions,
      lifecyclePhases: [{ id: 'CONCEPTUAL', name: 'كميات مفاهيمية', order: 0 }],
      phase: 'Conceptual',
      summary: {
        totalItems: items.length,
        insufficientCount: 0,
        suggestedCount: 0,
        totalCost: null,
        totalSuggestedCost: null,
        averageConfidence: 0.65,
        phasesUsed: 1,
        engineVersion: '4.0-conceptual-gated',
        generatedAt: new Date().toISOString(),
        dataSource: prediction.modelId,
        status: 'experimental_conceptual_only',
        detailLevel: 'conceptual',
        projectType: modelType,
        trainingDataAvailable: prediction.trainingRecords,
        assumptionsCount: assumptions.length,
        trainedReference: {
          modelId: prediction.modelId,
          projectType: prediction.projectType,
          trainingRecords: prediction.trainingRecords,
          dataProvenance: prediction.dataProvenance,
          quantities: Object.fromEntries(['concreteM3', 'steelTon', 'blocksM2', 'hvacTR', 'electricalKVA', 'waterLpd']
            .map(target => [target, Math.round(prediction.predictions[target] * 100) / 100])),
          intervals: prediction.intervals,
          suitableForModelApproval: false
        },
        predictionSource: 'million_project_research_candidate',
        region,
        finishing,
        limitations: [
          'Detailed trade items are withheld because this project type has no approved item-rule library.',
          'Rates and totals require drawings, specifications, measurement rules, and a verified price basis.'
        ]
      }
    };
  }

  /**
   * Get BOQ assumptions for review (before final approval).
   */
  getBOQAssumptions(projectType, area, floors, finishing = 'Standard', region = 'Riyadh', extraParams = {}) {
    const params = {
      type: projectType,
      area: area || 0,
      floors: floors || 1,
      rooms: extraParams.rooms || null,
      bathrooms: extraParams.bathrooms || null,
      hasKitchen: extraParams.hasKitchen || false,
      halls: extraParams.halls || null,
      city: extraParams.city || region,
      description: extraParams.description || '',
      phase: extraParams.phase || null
    };
    return boqRules.getBOQAssumptions(params);
  }

  /**
   * Get calculation explanation for a specific BOQ item code.
   */
  getItemExplanation(code, params) {
    return boqRules.getItemExplanation(code, params);
  }

  /**
   * Record user edit for training feedback.
   */
  recordUserEdit(projectId, itemCode, field, oldValue, newValue, projectParams) {
    return boqRules.recordUserEdit(projectId, itemCode, field, oldValue, newValue, projectParams);
  }

  /**
   * Get knowledge base reference.
   */
  getKnowledgeBase() {
    return boqRules.getKnowledgeBase();
  }

  getUserEdits() {
    return boqRules.engine ? boqRules.engine.userEdits : this.userEdits;
  }
}

module.exports = new QuantityEstimator();
