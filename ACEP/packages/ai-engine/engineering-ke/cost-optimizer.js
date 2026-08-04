class CostOptimizer {
  constructor() {
    this.optimizationRules = [
      { strategy: 'bulk_purchase', savingRange: [5, 15], description: 'شراء المواد بكميات كبيرة', applicableTo: ['Concrete', 'Steel', 'Cement'] },
      { strategy: 'alternative_material', savingRange: [10, 25], description: 'استخدام مواد بديلة بمواصفات مشابهة', applicableTo: ['Finishing', 'Tiles', 'Painting'] },
      { strategy: 'local_sourcing', savingRange: [8, 20], description: 'المصادر المحلية بدلاً من المستوردة', applicableTo: ['Finishing', 'Plumbing', 'Electrical'] },
      { strategy: 'labor_optimization', savingRange: [5, 12], description: 'تحسين إنتاجية العمالة', applicableTo: ['All'] },
      { strategy: 'schedule_optimization', savingRange: [3, 8], description: 'تقليل مدة المشروع لتوفير التكاليف غير المباشرة', applicableTo: ['All'] },
      { strategy: 'value_engineering', savingRange: [10, 30], description: 'الهندسة القيمية - مراجعة التصميم لتقليل التكاليف', applicableTo: ['Structure', 'Foundation'] },
    ];
  }

  calculateOptimizations(boqResult, projectParams) {
    const items = boqResult.items || [];
    const totalCost = items.reduce((s, i) => s + (i.totalPrice || i.quantity * (i.unitPrice || 0)), 0);
    const optimizations = [];
    let totalPotentialSaving = 0;

    for (const rule of this.optimizationRules) {
      let applicableItems = 0;
      let applicableCost = 0;

      for (const item of items) {
        const itemPhase = item.phase || 'General';
        const isApplicable = rule.applicableTo.includes('All') || rule.applicableTo.some(a => itemPhase.includes(a) || item.description?.includes(a));
        if (isApplicable) {
          applicableItems++;
          applicableCost += (item.totalPrice || item.quantity * (item.unitPrice || 0));
        }
      }

      if (applicableCost > 0) {
        const savingMin = Math.round(applicableCost * rule.savingRange[0] / 100);
        const savingMax = Math.round(applicableCost * rule.savingRange[1] / 100);
        const expectedSaving = Math.round((savingMin + savingMax) / 2);
        totalPotentialSaving += expectedSaving;

        optimizations.push({
          strategy: rule.strategy,
          description: rule.description,
          applicableItems,
          applicableCost: Math.round(applicableCost),
          savingRange: rule.savingRange,
          savingMin,
          savingMax,
          expectedSaving,
          percentage: Math.round((expectedSaving / totalCost) * 1000) / 10,
          feasibility: applicableItems > 3 ? 'high' : applicableItems > 1 ? 'medium' : 'low',
        });
      }
    }

    optimizations.sort((a, b) => b.expectedSaving - a.expectedSaving);

    return {
      totalCost: Math.round(totalCost),
      totalPotentialSaving,
      savingPercentage: totalCost > 0 ? Math.round((totalPotentialSaving / totalCost) * 1000) / 10 : 0,
      optimizations,
      summary: `إجمالي التوفير المتوقع: ${totalPotentialSaving.toLocaleString()} ريال (${totalCost > 0 ? Math.round(totalPotentialSaving / totalCost * 100) : 0}% من التكلفة الإجمالية)`,
      recommendations: optimizations
        .filter(o => o.feasibility === 'high' && o.expectedSaving > 1000)
        .map(o => `${o.description}: توفير متوقع ${o.expectedSaving.toLocaleString()} ريال`),
    };
  }
}

module.exports = CostOptimizer;