class CriticalItemsAnalyzer {
  constructor() {
    this.criticalityRules = [
      { code: 'FND', threshold: 50000, reason: 'أعمال الأساسات - حرجة للتكلفة' },
      { code: 'STR', threshold: 100000, reason: 'الهيكل الخرساني - حرج للتكلفة والسلامة' },
      { code: 'ELV', threshold: 200000, reason: 'المصاعد - تكلفة عالية' },
      { code: 'HVAC', threshold: 80000, reason: 'التكييف المركزي - تكلفة عالية' },
    ];
  }

  analyzeCriticalItems(items, phases) {
    const phaseCosts = {};
    const results = [];

    items.forEach(item => {
      const phase = item.phase || 'GENERAL';
      if (!phaseCosts[phase]) phaseCosts[phase] = { items: [], totalCost: 0 };
      phaseCosts[phase].items.push(item);
      phaseCosts[phase].totalCost += (item.totalPrice || item.quantity * (item.unitPrice || 0));
    });

    const totalCost = Object.values(phaseCosts).reduce((s, p) => s + p.totalCost, 0);

    for (const [phase, data] of Object.entries(phaseCosts)) {
      const percentage = totalCost > 0 ? (data.totalCost / totalCost) * 100 : 0;
      const hasCritical = this.criticalityRules.some(r => r.code === phase);

      if (percentage > 15 || hasCritical) {
        results.push({
          phase,
          totalCost: Math.round(data.totalCost),
          percentage: Math.round(percentage * 10) / 10,
          itemCount: data.items.length,
          critical: hasCritical || percentage > 25,
          reason: hasCritical
            ? `المرحلة ${phase} من المراحل الحرجة`
            : `المرحلة ${phase} تشكل ${percentage.toFixed(1)}% من التكلفة الإجمالية`,
          recommendation: percentage > 25
            ? `يوصى بمراجعة تكلفة المرحلة ${phase} وإيجاد بدائل لتقليل التكلفة`
            : `تكلفة المرحلة ${phase} ضمن النطاق المقبول`,
        });
      }
    }

    return {
      phaseCosts,
      criticalPhases: results,
      totalCost: Math.round(totalCost),
      criticalCount: results.filter(r => r.critical).length,
      highCostItems: items
        .filter(i => (i.totalPrice || i.quantity * (i.unitPrice || 0)) > totalCost * 0.1)
        .map(i => ({
          code: i.code,
          description: i.description,
          cost: Math.round(i.totalPrice || i.quantity * (i.unitPrice || 0)),
          percentage: totalCost > 0 ? Math.round(((i.totalPrice || i.quantity * (i.unitPrice || 0)) / totalCost) * 1000) / 10 : 0,
        })),
    };
  }
}

module.exports = CriticalItemsAnalyzer;