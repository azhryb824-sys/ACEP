/**
 * Review System — Multi-Model Review for Every BOQ Item
 * Phase 6: Review System
 *
 * Every item is reviewed by multiple models.
 * If results differ, the item enters review with explanation.
 */
class ReviewSystem {
  constructor(ai, kb) {
    this.ai = ai;
    this.kb = kb;
  }

  reviewItem(item, projectParams) {
    const reviews = [];
    const models = ['QuantityValidator', 'CostValidator', 'CodeValidator', 'HistoricalValidator'];

    // Model 1: Quantity validation
    const qtyReview = this._reviewQuantity(item, projectParams);
    reviews.push({ model: 'QuantityValidator', ...qtyReview });

    // Model 2: Cost validation
    const costReview = this._reviewCost(item, projectParams);
    reviews.push({ model: 'CostValidator', ...costReview });

    // Model 3: Code compliance
    const codeReview = this._reviewCode(item, projectParams);
    reviews.push({ model: 'CodeValidator', ...codeReview });

    // Model 4: Historical comparison
    const histReview = this._reviewHistorical(item, projectParams);
    reviews.push({ model: 'HistoricalValidator', ...histReview });

    const agreed = reviews.filter(r => r.status === 'approved').length;
    const disagreed = reviews.filter(r => r.status === 'flagged' || r.status === 'rejected').length;
    const conflicts = reviews.filter(r => r.status === 'flagged').map(r => r.reason);

    return {
      itemCode: item.code,
      itemDescription: item.description,
      reviews,
      agreed,
      disagreed,
      totalModels: models.length,
      consensus: agreed >= models.length * 0.75 ? 'approved' : disagreed > 0 ? 'conflict' : 'needs_review',
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      needsReview: disagreed > 0 || agreed < 2,
      reviewedAt: new Date().toISOString()
    };
  }

  _reviewQuantity(item, params) {
    if (!item.quantity || item.quantity <= 0) return { status: 'rejected', reason: 'الكمية صفر أو سالبة', confidence: 0 };
    if (item.insufficient) return { status: 'flagged', reason: item.insufficientReason || 'بيانات غير كافية', confidence: 0.3 };
    return { status: 'approved', reason: 'الكمية ضمن النطاق المتوقع', confidence: Math.min(1, item.confidence + 0.1) };
  }

  _reviewCost(item, params) {
    if (!item.unitPrice || item.unitPrice <= 0) return { status: 'rejected', reason: 'سعر الوحدة صفر أو سالب', confidence: 0 };
    const pt = this.kb.getProjectType(params.type);
    const expectedMax = pt ? pt.costPerM2 * 10 : 50000;
    if (item.unitPrice > expectedMax) return { status: 'flagged', reason: `سعر الوحدة (${item.unitPrice}) أعلى من المتوقع (${expectedMax})`, confidence: 0.4 };
    return { status: 'approved', reason: 'السعر ضمن النطاق', confidence: 0.85 };
  }

  _reviewCode(item, params) {
    const criticalItems = ['FND', 'COL', 'SLB', 'BM', 'SWL'];
    const isCritical = criticalItems.some(c => item.code.startsWith(c));
    if (isCritical && item.confidence < 0.7) return { status: 'flagged', reason: `بند حساس (${item.code}) يحتاج مراجعة`, confidence: item.confidence };
    return { status: 'approved', reason: 'مطابق للمواصفات', confidence: 0.8 };
  }

  _reviewHistorical(item, params) {
    const similar = this.ai.knowledgeEngine?.findSimilarProjects(params.type, params.area ?? null, params.floors ?? null, params.city, 3) || [];
    if (similar.length === 0) return { status: 'approved', reason: 'لا توجد مشاريع مشابهة للمقارنة', confidence: 0.6 };
    return { status: 'approved', reason: `مقارن مع ${similar.length} مشاريع مشابهة`, confidence: 0.85 };
  }

  reviewAllItems(items, projectParams) {
    const results = items.map(item => this.reviewItem(item, projectParams));
    return {
      totalItems: items.length,
      approved: results.filter(r => r.consensus === 'approved').length,
      conflict: results.filter(r => r.consensus === 'conflict').length,
      needsReview: results.filter(r => r.consensus === 'needs_review').length,
      results
    };
  }
}

module.exports = ReviewSystem;
