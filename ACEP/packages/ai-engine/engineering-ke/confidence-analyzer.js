/**
 * ACEP Engineering Confidence Analyzer
 *
 * Stage 8: Confidence Analysis
 * Calculates confidence for each BOQ item with explanation.
 *
 * المعايير (كل معيار يعطي 0-20 نقطة، المجموع 100):
 * - existsInCode: هل البند موجود في الكود السعودي؟ (0-20)
 * - existsInSimilarProjects: هل البند موجود في مشاريع مشابهة؟ (0-15)
 * - existsInSpecs: هل البند موجود في المواصفات؟ (0-15)
 * - quantityAccuracy: دقة الكمية (0-20)
 * - priceAccuracy: دقة السعر (0-15)
 * - phaseRelevance: علاقة البند بالمرحلة (0-15)
 */

const SAUDI_CODES_BY_TRADE = {
  EXC: { hasCode: true, codeRef: 'SBC 301', name: 'أعمال الحفر والردم' },
  FND: { hasCode: true, codeRef: 'SBC 304', name: 'أعمال الأساسات' },
  COL: { hasCode: true, codeRef: 'SBC 304', name: 'الأعمدة الخرسانية' },
  SLB: { hasCode: true, codeRef: 'SBC 304', name: 'البلاطات الخرسانية' },
  REB: { hasCode: true, codeRef: 'SBC 304', name: 'حديد التسليح' },
  BLK: { hasCode: true, codeRef: 'SBC 302', name: 'البلوك والطوب' },
  WAL: { hasCode: true, codeRef: 'SBC 302', name: 'الجدران والحوائط' },
  PLS: { hasCode: true, codeRef: 'SBC 303', name: 'البياض والمحارات' },
  PNT: { hasCode: true, codeRef: 'SBC 303', name: 'الدهانات' },
  TLF: { hasCode: true, codeRef: 'SBC 303', name: 'أعمال البلاط والسيراميك' },
  CRM: { hasCode: true, codeRef: 'SBC 303', name: 'أعمال السيراميك' },
  DR:  { hasCode: true, codeRef: 'SBC 303', name: 'الأبواب' },
  WN:  { hasCode: true, codeRef: 'SBC 303', name: 'الشبابيك' },
  GPS: { hasCode: true, codeRef: 'SBC 301', name: 'أعمال الجبس' },
  ELC: { hasCode: true, codeRef: 'SBC 401', name: 'الأعمال الكهربائية' },
  PLB: { hasCode: true, codeRef: 'SBC 402', name: 'أعمال السباكة' },
};

const SIMILAR_PROJECT_REFERENCE = {
  'villa': { avgItems: 85, commonCodes: ['EXC','FND','COL','SLB','REB','BLK','WAL','PLS','PNT','TLF','DR','WN','GPS','ELC','PLB'] },
  'building': { avgItems: 120, commonCodes: ['EXC','FND','COL','SLB','REB','BLK','WAL','PLS','PNT','TLF','DR','WN','ELC','PLB','HVAC','ELV'] },
  'warehouse': { avgItems: 45, commonCodes: ['EXC','FND','COL','SLB','REB','WAL','ELC','HVAC','EXT'] },
  'palace': { avgItems: 150, commonCodes: ['EXC','FND','COL','SLB','REB','BLK','WAL','PLS','PNT','TLF','CRM','DR','WN','GPS','ELC','PLB','HVAC','FPR','NET'] },
  'hospital': { avgItems: 200, commonCodes: ['EXC','FND','COL','SLB','REB','BLK','WAL','PLS','PNT','TLF','DR','WN','ELC','PLB','HVAC','FCD','MED','ELV'] },
};

const PHASE_ITEMS_MAP = {
  'structural': ['EXC','FND','COL','SLB','REB','BLK'],
  'architectural': ['WAL','PLS','PNT','TLF','CRM','DR','WN','GPS'],
  'electromechanical': ['ELC','PLB','HVAC','FPR','NET','MED','ELV'],
  'finishing': ['PNT','TLF','CRM','DR','WN','GPS','CLN'],
  'exterior': ['EXT','FPR'],
};

class ConfidenceAnalyzer {
  constructor() {
    this.weights = {
      existsInCode: 20,
      existsInSimilarProjects: 15,
      existsInSpecs: 15,
      quantityAccuracy: 20,
      priceAccuracy: 15,
      phaseRelevance: 15,
    };
  }

  _scoreExistsInCode(item) {
    const trade = item.trade || item.priceCat || '';
    const codeInfo = SAUDI_CODES_BY_TRADE[trade];
    if (!codeInfo || !codeInfo.hasCode) {
      return { score: 0, reason: 'لم يتم العثور على البند في الكود السعودي', positive: false };
    }
    return { score: 20, reason: `موجود في الكود السعودي ${codeInfo.codeRef} - ${codeInfo.name}`, positive: true };
  }

  _scoreExistsInSimilarProjects(item, projectParams) {
    const projectType = projectParams.type || 'villa';
    const ref = SIMILAR_PROJECT_REFERENCE[projectType];
    if (!ref) {
      return { score: 5, reason: 'لا توجد بيانات مرجعية كافية لنوع المشروع', positive: false };
    }
    const code = (item.code || item.itemCode || '').substring(0, 3);
    if (ref.commonCodes.includes(code)) {
      return { score: 15, reason: `بند شائع في مشاريع ${projectType} المماثلة`, positive: true };
    }
    if (ref.commonCodes.some(c => (item.description || '').includes(c))) {
      return { score: 10, reason: 'بند ذو صلة وجد في بعض المشاريع المماثلة', positive: false };
    }
    return { score: 3, reason: 'بند نادر في مشاريع مماثلة', positive: false };
  }

  _scoreExistsInSpecs(item) {
    const desc = (item.description || item.name || '').toLowerCase();
    const standardSpecs = ['خرسانة', 'حديد', 'بلوك', 'دهان', 'بلاط', 'سيراميك', 'جبس', 'كهرباء', 'سباكة', 'تكييف', 'أبواب', 'شبابيك', 'عزل', 'أسمنت', 'رمل', 'صب'];
    const matched = standardSpecs.filter(s => desc.includes(s));
    if (matched.length > 0) {
      return { score: 15, reason: `البند مطابق للمواصفات القياسية (${matched.join('، ')})`, positive: true };
    }
    if (matched.length === 0 && desc.length > 5) {
      return { score: 8, reason: 'البند غير مطابق للمواصفات القياسية المعروفة', positive: false };
    }
    return { score: 5, reason: 'وصف البند غير واضح للمقارنة مع المواصفات', positive: false };
  }

  _scoreQuantityAccuracy(item) {
    if (item.insufficient) {
      return { score: 0, reason: 'الكمية غير محددة (غير كافية البيانات)', positive: false };
    }
    const qty = item.quantity;
    if (qty === null || qty === undefined || qty === 0) {
      return { score: 0, reason: 'الكمية صفر أو فارغة', positive: false };
    }
    const calcMethod = (item.calculationMethod || item.method || '').toLowerCase();
    if (calcMethod.includes('مساحة') || calcMethod.includes('area') || calcMethod.includes('المساحة')) {
      if (qty > 0 && qty < 100000) {
        return { score: 20, reason: 'كمية محسوبة بدقة بناءً على المساحة', positive: true };
      }
    }
    if (calcMethod.includes('عدد') || calcMethod.includes('count') || calcMethod.includes('length')) {
      if (qty > 0 && qty < 10000) {
        return { score: 18, reason: 'كمية محسوبة بدقة بناءً على العدد', positive: true };
      }
    }
    if (qty > 0 && qty === Math.round(qty)) {
      return { score: 15, reason: 'كمية صحيحة (قيمة عددية)', positive: false };
    }
    if (qty > 0 && qty < 0.01) {
      return { score: 5, reason: 'الكمية صغيرة جداً وقد تكون غير دقيقة', positive: false };
    }
    return { score: 10, reason: 'كمية مقبولة لكن بدون طريقة حساب واضحة', positive: false };
  }

  _scorePriceAccuracy(item) {
    if (item.insufficient) {
      return { score: 0, reason: 'السعر غير محدد', positive: false };
    }
    const price = item.unitPrice;
    if (price === null || price === undefined || price === 0) {
      return { score: 0, reason: 'السعر صفر أو فارغ', positive: false };
    }
    const trade = item.trade || item.priceCat || '';
    const priceRanges = {
      EXC: [10, 100], FND: [200, 800], COL: [300, 900], SLB: [300, 800],
      REB: [2000, 6000], BLK: [15, 100], WAL: [200, 700], PLS: [15, 50],
      PNT: [10, 40], TLF: [40, 120], CRM: [40, 100], DR: [400, 2000],
      WN: [200, 800], GPS: [30, 120], ELC: [50, 300], PLB: [80, 400],
      HVAC: [2000, 10000], FPR: [100, 400], NET: [100, 400], EXT: [20, 150],
    };
    const range = priceRanges[trade];
    if (range && price >= range[0] && price <= range[1]) {
      return { score: 15, reason: `السعر ضمن المدى المنطقي للصنف (${range[0]}-${range[1]})`, positive: true };
    }
    if (range && price < range[0]) {
      return { score: 5, reason: `السعر أقل من المدى المنطقي للصنف (أقل من ${range[0]})`, positive: false };
    }
    if (range && price > range[1]) {
      return { score: 3, reason: `السعر أعلى من المدى المنطقي للصنف (أعلى من ${range[1]})`, positive: false };
    }
    return { score: 8, reason: 'لا يوجد مدى سعري مرجعي لهذا الصنف', positive: false };
  }

  _scorePhaseRelevance(item, projectParams) {
    const itemPhase = item.phase || '';
    const projectPhase = projectParams.phase || '';
    const itemCode = (item.code || item.itemCode || '').substring(0, 3);

    let matchedPhase = null;
    for (const [phase, codes] of Object.entries(PHASE_ITEMS_MAP)) {
      if (codes.includes(itemCode)) {
        matchedPhase = phase;
        break;
      }
    }

    if (matchedPhase && matchedPhase === projectPhase) {
      return { score: 15, reason: `البند ينتمي للمرحلة الحالية (${matchedPhase})`, positive: true };
    }
    if (matchedPhase) {
      return { score: 8, reason: `البند ينتمي لمرحلة ${matchedPhase} وليس المرحلة الحالية`, positive: false };
    }
    if (itemPhase && itemPhase === projectPhase) {
      return { score: 10, reason: 'البند مصنف في المرحلة الحالية', positive: false };
    }
    return { score: 3, reason: 'علاقة البند بالمرحلة غير واضحة', positive: false };
  }

  /**
   * Calculate confidence for a single BOQ item.
   * @param {object} item - BOQ item { code, description, unit, quantity, unitPrice, trade, phase, ... }
   * @param {object} projectParams - { type, phase, ... }
   * @returns {object} - { confidence: 0-100, reasons: [{ type, text }], score: { existsInCode, ... } }
   */
  calculateItemConfidence(item, projectParams) {
    const existsInCode = this._scoreExistsInCode(item);
    const existsInSimilarProjects = this._scoreExistsInSimilarProjects(item, projectParams);
    const existsInSpecs = this._scoreExistsInSpecs(item);
    const quantityAccuracy = this._scoreQuantityAccuracy(item);
    const priceAccuracy = this._scorePriceAccuracy(item);
    const phaseRelevance = this._scorePhaseRelevance(item, projectParams);

    const score = {
      existsInCode: existsInCode.score,
      existsInSimilarProjects: existsInSimilarProjects.score,
      existsInSpecs: existsInSpecs.score,
      quantityAccuracy: quantityAccuracy.score,
      priceAccuracy: priceAccuracy.score,
      phaseRelevance: phaseRelevance.score,
    };

    const total = Object.values(score).reduce((a, b) => a + b, 0);
    const confidence = Math.min(100, Math.max(0, total));

    const reasons = [];
    const allScores = [existsInCode, existsInSimilarProjects, existsInSpecs, quantityAccuracy, priceAccuracy, phaseRelevance];
    for (const s of allScores) {
      reasons.push({
        type: s.positive ? 'positive' : 'negative',
        text: s.reason,
      });
    }

    return {
      confidence,
      reasons,
      score,
      maxPossible: 100,
      achieved: total,
      percentage: `${Math.round(total)}%`,
    };
  }

  /**
   * Calculate confidence for an entire BOQ.
   * @param {Array} items - Array of BOQ items
   * @param {object} projectParams - Project parameters
   * @returns {object} - { overall, min, max, avg, items: [{ code, description, confidence, reasons }] }
   */
  calculateBOQConfidence(items, projectParams) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return {
        overall: 0,
        min: 0,
        max: 0,
        avg: 0,
        items: [],
        totalItems: 0,
        highConfidenceCount: 0,
        lowConfidenceCount: 0,
      };
    }

    const itemResults = items.map(item => {
      const result = this.calculateItemConfidence(item, projectParams);
      return {
        code: item.code || item.itemCode || 'unknown',
        description: item.description || item.name || '',
        confidence: result.confidence,
        reasons: result.reasons,
        score: result.score,
      };
    });

    const confidences = itemResults.map(r => r.confidence);
    const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const overall = Math.round(avg);
    const min = Math.min(...confidences);
    const max = Math.max(...confidences);
    const highCount = confidences.filter(c => c >= 70).length;
    const lowCount = confidences.filter(c => c < 50).length;

    return {
      overall,
      min,
      max,
      avg: Math.round(avg * 100) / 100,
      items: itemResults,
      totalItems: items.length,
      highConfidenceCount: highCount,
      lowConfidenceCount: lowCount,
      distribution: {
        critical: confidences.filter(c => c < 30).length,
        low: confidences.filter(c => c >= 30 && c < 50).length,
        medium: confidences.filter(c => c >= 50 && c < 70).length,
        high: confidences.filter(c => c >= 70 && c < 90).length,
        excellent: confidences.filter(c => c >= 90).length,
      },
    };
  }

  /**
   * Get detailed confidence analysis for a specific item.
   * @param {string} code - Item code
   * @param {Array} items - All BOQ items
   * @param {object} projectParams - Project parameters
   * @returns {object|null} - Detailed breakdown
   */
  getConfidenceBreakdown(code, items, projectParams) {
    const item = items.find(i => (i.code || i.itemCode) === code);
    if (!item) return null;

    const result = this.calculateItemConfidence(item, projectParams);

    return {
      code: item.code,
      description: item.description,
      confidence: result.confidence,
      overallRating: result.confidence >= 90 ? 'ممتاز' : result.confidence >= 70 ? 'عالٍ' : result.confidence >= 50 ? 'متوسط' : result.confidence >= 30 ? 'ضعيف' : 'حرج',
      breakdown: [
        { criterion: 'الوجود في الكود السعودي', score: result.score.existsInCode, max: 20, status: result.score.existsInCode >= 15 ? 'جيد' : 'بحاجة تحسين' },
        { criterion: 'الوجود في مشاريع مشابهة', score: result.score.existsInSimilarProjects, max: 15, status: result.score.existsInSimilarProjects >= 10 ? 'جيد' : 'بحاجة تحسين' },
        { criterion: 'الوجود في المواصفات', score: result.score.existsInSpecs, max: 15, status: result.score.existsInSpecs >= 10 ? 'جيد' : 'بحاجة تحسين' },
        { criterion: 'دقة الكمية', score: result.score.quantityAccuracy, max: 20, status: result.score.quantityAccuracy >= 15 ? 'جيد' : 'بحاجة تحسين' },
        { criterion: 'دقة السعر', score: result.score.priceAccuracy, max: 15, status: result.score.priceAccuracy >= 10 ? 'جيد' : 'بحاجة تحسين' },
        { criterion: 'علاقة البند بالمرحلة', score: result.score.phaseRelevance, max: 15, status: result.score.phaseRelevance >= 10 ? 'جيد' : 'بحاجة تحسين' },
      ],
      reasons: result.reasons,
      recommendations: this.suggestImprovements(item).map(r => r.recommendation),
    };
  }

  /**
   * Analyze weak points in the entire BOQ.
   * @param {Array} items - Array of BOQ items
   * @returns {Array} - Weak point analysis results
   */
  analyzeWeakPoints(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [];
    }

    const weakPoints = [];

    const insufficientItems = items.filter(i => i.insufficient);
    if (insufficientItems.length > 0) {
      weakPoints.push({
        type: 'insufficient_data',
        severity: insufficientItems.length > 5 ? 'critical' : insufficientItems.length > 2 ? 'high' : 'medium',
        count: insufficientItems.length,
        description: `${insufficientItems.length} بنود ذات بيانات غير كافية`,
        impact: 'يؤدي إلى ثقة منخفضة جداً في هذه البنود',
        affectedCodes: insufficientItems.map(i => i.code || i.itemCode).filter(Boolean),
      });
    }

    const zeroQuantityItems = items.filter(i => !i.insufficient && (i.quantity === null || i.quantity === undefined || i.quantity === 0));
    if (zeroQuantityItems.length > 0) {
      weakPoints.push({
        type: 'zero_quantity',
        severity: zeroQuantityItems.length > 5 ? 'critical' : 'high',
        count: zeroQuantityItems.length,
        description: `${zeroQuantityItems.length} بنود بكميات صفرية`,
        impact: 'يؤثر على دقة التكلفة الإجمالية ويقلل الثقة',
        affectedCodes: zeroQuantityItems.map(i => i.code || i.itemCode).filter(Boolean),
      });
    }

    const noPriceItems = items.filter(i => !i.insufficient && (i.unitPrice === null || i.unitPrice === undefined || i.unitPrice === 0));
    if (noPriceItems.length > 0) {
      weakPoints.push({
        type: 'missing_price',
        severity: noPriceItems.length > 5 ? 'critical' : 'high',
        count: noPriceItems.length,
        description: `${noPriceItems.length} بنود بدون سعر`,
        impact: 'يؤدي إلى عدم دقة التكلفة والتأثير على الميزانية',
        affectedCodes: noPriceItems.map(i => i.code || i.itemCode).filter(Boolean),
      });
    }

    const noCalcMethod = items.filter(i => !i.calculationMethod && !i.method && !i.insufficient);
    if (noCalcMethod.length > 0) {
      weakPoints.push({
        type: 'missing_calculation_method',
        severity: 'medium',
        count: noCalcMethod.length,
        description: `${noCalcMethod.length} بنود بدون طريقة حساب`,
        impact: 'يقلل الشفافية والقدرة على تدقيق الكميات',
        affectedCodes: noCalcMethod.map(i => i.code || i.itemCode).filter(Boolean),
      });
    }

    return weakPoints;
  }

  /**
   * Suggest improvements to raise an item's confidence.
   * @param {object} item - BOQ item
   * @returns {Array} - Improvement suggestions
   */
  suggestImprovements(item) {
    const suggestions = [];

    if (item.insufficient) {
      suggestions.push({
        type: 'insufficient',
        recommendation: 'توفير البيانات الناقصة للبند (الكمية والسعر والمواصفات)',
        impact: 'high',
        effort: 'medium',
      });
    }

    if (!item.quantity || item.quantity === 0) {
      suggestions.push({
        type: 'quantity',
        recommendation: 'تحديد كمية دقيقة للبند بناءً على المساحة أو العدد',
        impact: 'high',
        effort: 'low',
      });
    }

    if (!item.unitPrice || item.unitPrice === 0) {
      suggestions.push({
        type: 'price',
        recommendation: 'تحديد سعر الوحدة للبند بناءً على أسعار السوق أو الكود السعودي',
        impact: 'high',
        effort: 'low',
      });
    }

    if (!item.trade && !item.priceCat) {
      suggestions.push({
        type: 'classification',
        recommendation: 'تصنيف البند ضمن التصنيفات المعتمدة (حرف، سباكة، كهرباء)',
        impact: 'medium',
        effort: 'low',
      });
    }

    if (!item.phase) {
      suggestions.push({
        type: 'phase',
        recommendation: 'تحديد المرحلة التي ينتمي إليها البند',
        impact: 'medium',
        effort: 'low',
      });
    }

    if (!item.calculationMethod && !item.method) {
      suggestions.push({
        type: 'calculation_method',
        recommendation: 'إضافة طريقة حساب البند لزيادة الشفافية',
        impact: 'medium',
        effort: 'low',
      });
    }

    const desc = (item.description || item.name || '');
    if (!desc || desc.length < 10) {
      suggestions.push({
        type: 'description',
        recommendation: 'تحسين وصف البند بإضافة تفاصيل أكثر (المواد، الأبعاد، المواصفات)',
        impact: 'medium',
        effort: 'low',
      });
    }

    return suggestions;
  }
}

module.exports = ConfidenceAnalyzer;
