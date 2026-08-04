/**
 * PriceLearner — نظام تعلم الأسعار الذكي
 *
 * يتعلم من تعديلات المستخدم على أسعار الوحدة لتحسين التقديرات المستقبلية.
 * يراعي:
 *   - فئة السعر (priceCat)
 *   - المنطقة الجغرافية (city/region)
 *   - نوع المشروع (projectType)
 *   - أنماط قبول المستخدم
 */

class PriceLearner {
  constructor() {
    this.priceAdjustments = {};
    this.suppliers = {
      الرياض: [
        { name: 'مؤسسة بن لادن للتجارة', rating: 4.5, materials: ['ELC', 'PLB', 'CON'], reliability: 0.92 },
        { name: 'شركة أجا للخرسانة', rating: 4.2, materials: ['CON', 'BLK', 'STM'], reliability: 0.88 },
        { name: 'مصنع الرياض للحديد', rating: 4.7, materials: ['STM', 'IRN', 'CON'], reliability: 0.95 },
        { name: 'الوطنية للدهانات', rating: 4.0, materials: ['PNT', 'FIN'], reliability: 0.82 },
      ],
      جدة: [
        { name: 'مؤسسة الثابت للتجارة', rating: 4.3, materials: ['ELC', 'PLB', 'FNC'], reliability: 0.85 },
        { name: 'شركة جدة للخرسانة', rating: 4.1, materials: ['CON', 'BLK'], reliability: 0.80 },
        { name: 'مؤسسة البحر الأحمر للحديد', rating: 4.0, materials: ['STM', 'IRN'], reliability: 0.75 },
      ],
      الدمام: [
        { name: 'الخليج للخرسانة الجاهزة', rating: 4.6, materials: ['CON', 'BLK'], reliability: 0.93 },
        { name: 'شركة الشرقية للحديد', rating: 4.4, materials: ['STM', 'IRN', 'ELC'], reliability: 0.90 },
        { name: 'مؤسسة الخليج للتكييف', rating: 4.2, materials: ['HVAC', 'PLB'], reliability: 0.87 },
      ],
      مكة: [
        { name: 'مؤسسة مكة للمقاولات', rating: 4.0, materials: ['CON', 'BLK', 'PLB'], reliability: 0.78 },
        { name: 'شركة الحرمين للدهانات', rating: 3.8, materials: ['PNT', 'FIN'], reliability: 0.72 },
      ],
      المدينة: [
        { name: 'مؤسسة طيبة للخرسانة', rating: 4.1, materials: ['CON', 'BLK'], reliability: 0.85 },
        { name: 'شركة المدينة للسباكة', rating: 3.9, materials: ['PLB', 'FNC'], reliability: 0.80 },
      ],
      'المنطقة الشرقية': [
        { name: 'شركة الظهران للخدمات', rating: 4.5, materials: ['HVAC', 'ELC', 'NET'], reliability: 0.91 },
        { name: 'مؤسسة الخليج للمصاعد', rating: 4.3, materials: ['ELV', 'ELC'], reliability: 0.88 },
      ],
    };
    this.regionFactors = {
      الرياض: 1.05, جدة: 1.08, الدمام: 1.02, مكة: 1.10, المدينة: 1.03,
      'المنطقة الشرقية': 1.02, 'المنطقة الغربية': 1.07, 'المنطقة الوسطى': 1.00,
    };
    this.learningData = { adjustments: [], patterns: {} };
    this.adjustmentCount = 0;
  }

  /**
   * سجّل تعديل سعر من المستخدم
   */
  recordEdit(priceCat, oldPrice, newPrice, region, projectType) {
    const adjustment = {
      priceCat,
      oldPrice,
      newPrice,
      delta: newPrice - oldPrice,
      deltaPct: oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) : 0,
      region: region || 'default',
      projectType: projectType || 'Unknown',
      timestamp: new Date().toISOString(),
    };
    this.adjustmentCount++;
    this.learningData.adjustments.push(adjustment);
    if (this.learningData.adjustments.length > 500) this.learningData.adjustments.shift();

    const key = priceCat + ':' + (region || 'default');
    if (!this.learningData.patterns[key]) {
      this.learningData.patterns[key] = { count: 0, totalDelta: 0, avgDelta: 0, adjustments: [] };
    }
    const pattern = this.learningData.patterns[key];
    pattern.count++;
    pattern.totalDelta += adjustment.delta;
    pattern.avgDelta = pattern.totalDelta / pattern.count;
    if (pattern.adjustments.length < 20) pattern.adjustments.push(adjustment.delta);

    this.priceAdjustments[priceCat] = this.priceAdjustments[priceCat] || { regions: {} };
    const catData = this.priceAdjustments[priceCat];
    catData.regions[region || 'default'] = (catData.regions[region || 'default'] || 0) + adjustment.deltaPct;

    return adjustment;
  }

  /**
   * سجّل موافقة/رفض بند مقترح
   */
  recordApproval(itemCode, priceCat, approved, region) {
    const key = itemCode || priceCat;
    this.learningData.patterns['approval:' + key] = this.learningData.patterns['approval:' + key] || { count: 0, approved: 0, rate: 0.5 };
    const p = this.learningData.patterns['approval:' + key];
    p.count++;
    p.approved += approved ? 1 : 0;
    p.rate = p.approved / p.count;
  }

  /**
   * احصل على سعر معدّل للفئة والمنطقة
   */
  estimateUnitPrice(priceCat, basePrice, region) {
    if (!region) return basePrice;

    const regionFactor = this.regionFactors[region] || 1.00;

    // Apply learning from past adjustments
    const key = priceCat + ':' + region;
    const pattern = this.learningData.patterns[key];
    const learningFactor = pattern && pattern.count > 2
      ? (1 + pattern.avgDelta / basePrice)
      : 1.0;

    const adjusted = basePrice * regionFactor * learningFactor;
    return Math.round(adjusted);
  }

  /**
   * احصل على بصائر التعلم
   */
  getInsights() {
    const patterns = (this.learningData && this.learningData.patterns) || {};
    const adjustments = this.priceAdjustments || {};
    const topAdjustments = Object.entries(patterns)
      .filter(([k]) => !k.startsWith('approval:'))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([key, data]) => {
        const [priceCat, region] = key.split(':');
        return { priceCat, region, count: data.count, avgDelta: Math.round(data.avgDelta), rate: Math.round((data.avgDelta / (data.count || 1)) * 100) / 100 };
      });

    const approvalRates = Object.entries(patterns)
      .filter(([k]) => k.startsWith('approval:'))
      .map(([key, data]) => ({
        item: key.replace('approval:', ''),
        count: data.count,
        rate: Math.round(data.rate * 100) + '%',
      }));

    const regionFactors = Object.entries(this.regionFactors || {})
      .map(([region, factor]) => ({ region, factor }));

    return {
      totalAdjustments: this.adjustmentCount || 0,
      topAdjustments,
      approvalRates,
      regionFactors,
      trackedCategories: Object.keys(adjustments).length,
    };
  }

  getSupplierRecommendations(region, priceCat) {
    const regionSuppliers = this.suppliers[region] || this.suppliers[Object.keys(this.suppliers)[0]] || [];
    return regionSuppliers
      .filter(s => s.materials.includes(priceCat))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3)
      .map(s => ({ name: s.name, rating: s.rating, reliability: s.reliability }));
  }

  getPriceHeatmap() {
    const cats = Object.keys(this.priceAdjustments || {});
    const regions = Object.keys(this.regionFactors);
    const defaultCats = ['CON', 'ELC', 'PLB', 'HVAC', 'FIN', 'PNT', 'STM', 'BLK'];
    const allCats = cats.length > 0 ? cats : defaultCats;
    const heatmap = {};
    for (const region of regions) {
      heatmap[region] = {};
      for (const cat of allCats) {
        const base = 100;
        const adj = this.priceAdjustments?.[cat]?.regions?.[region] || 0;
        heatmap[region][cat] = Math.round(base * (this.regionFactors[region] || 1.00) * (1 + adj));
      }
    }
    return { regions, categories: allCats, heatmap, baseIndex: 100 };
  }

  getAllSupplierRegions() {
    return Object.keys(this.suppliers).map(region => ({
      region,
      supplierCount: this.suppliers[region].length,
      avgRating: this.suppliers[region].reduce((s, x) => s + x.rating, 0) / this.suppliers[region].length,
      topSupplier: this.suppliers[region].sort((a, b) => b.rating - a.rating)[0]?.name || '',
    }));
  }

  toJSON() {
    return {
      priceAdjustments: this.priceAdjustments,
      learningData: this.learningData,
      adjustmentCount: this.adjustmentCount,
    };
  }

  static fromJSON(data) {
    const pl = new PriceLearner();
    pl.priceAdjustments = data.priceAdjustments || {};
    pl.learningData = data.learningData || { adjustments: [], patterns: {} };
    pl.adjustmentCount = data.adjustmentCount || 0;
    return pl;
  }
}

module.exports = PriceLearner;
