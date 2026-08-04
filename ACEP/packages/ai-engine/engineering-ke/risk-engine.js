/**
 * ACEP Engineering Risk Engine
 *
 * Stage 13: Risk Engine
 * Analyzes BOQ risks including critical items, missing items,
 * low confidence, incomplete phases, and high-cost items.
 */

const PHASE_NAMES = {
  structural: 'هيكلية',
  architectural: 'معمارية',
  electromechanical: 'كهروميكانيكية',
  finishing: 'تشطيبات',
  exterior: 'خارجية',
};

class RiskEngine {
  constructor() {
    this.riskThresholds = {
      criticalItemCostPct: 10,
      lowConfidenceThreshold: 50,
      incompletePhaseThreshold: 80,
      highRiskScore: 70,
      criticalRiskScore: 85,
    };
  }

  _findCriticalItems(items) {
    if (!items || items.length === 0) return [];
    const totalCost = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
    if (totalCost === 0) return [];

    return items
      .filter(i => {
        const costPct = ((i.totalPrice || 0) / totalCost) * 100;
        const conf = (i.confidence || 0) * 100;
        return costPct >= this.riskThresholds.criticalItemCostPct || conf < this.riskThresholds.lowConfidenceThreshold;
      })
      .map(i => ({
        item: i,
        costPercentage: totalCost > 0 ? Math.round(((i.totalPrice || 0) / totalCost) * 10000) / 100 : 0,
        confidence: (i.confidence || 0) * 100,
        riskReason: (i.totalPrice || 0) > totalCost * 0.1
          ? 'تكلفة عالية نسبياً مقارنة بإجمالي المشروع'
          : 'ثقة منخفضة',
      }));
  }

  _findLowConfidenceItems(items) {
    if (!items || items.length === 0) return [];
    return items.filter(i => {
      const conf = (i.confidence || 0) * 100;
      return conf < this.riskThresholds.lowConfidenceThreshold;
    });
  }

  _findIncompletePhases(items) {
    if (!items || items.length === 0) return [];
    const phaseGroups = {};

    for (const item of items) {
      const phase = item.phase || 'غير محدد';
      if (!phaseGroups[phase]) phaseGroups[phase] = { total: 0, complete: 0, items: [] };
      phaseGroups[phase].total++;
      phaseGroups[phase].items.push(item);
      if (!item.insufficient && item.quantity && item.unitPrice) {
        phaseGroups[phase].complete++;
      }
    }

    return Object.entries(phaseGroups)
      .filter(([_, group]) => {
        const completionPct = group.total > 0 ? (group.complete / group.total) * 100 : 0;
        return completionPct < this.riskThresholds.incompletePhaseThreshold;
      })
      .map(([phase, group]) => ({
        phase,
        phaseName: PHASE_NAMES[phase] || phase,
        totalItems: group.total,
        completeItems: group.complete,
        completionPercentage: Math.round((group.complete / group.total) * 100),
        insufficientItems: group.items.filter(i => i.insufficient).length,
      }));
  }

  _findHighCostItems(items) {
    if (!items || items.length === 0) return [];
    const totalCost = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
    if (totalCost === 0) return [];

    return items
      .filter(i => (i.totalPrice || 0) / totalCost >= this.riskThresholds.criticalItemCostPct / 100)
      .sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0))
      .map(i => ({
        item: i,
        cost: i.totalPrice || 0,
        percentageOfTotal: Math.round(((i.totalPrice || 0) / totalCost) * 10000) / 100,
      }));
  }

  _associateMissingItemsWithPhases(missingItems, items) {
    if (!missingItems || missingItems.length === 0) return [];

    return missingItems.map(mi => {
      const phaseMap = {
        'دهانات': 'finishing', 'بلاط': 'finishing', 'حمام': 'architectural',
        'مطبخ': 'architectural', 'كهرباء': 'electromechanical', 'تكييف': 'electromechanical',
        'خرسانة': 'structural', 'حديد': 'structural', 'شدات': 'structural',
      };
      const phase = phaseMap[mi.category] || 'غير محدد';
      return {
        category: mi.category,
        foundItem: mi.foundItem,
        missingItems: mi.missingItems,
        priority: mi.priority,
        confidence: mi.confidence,
        phase,
        phaseName: PHASE_NAMES[phase] || phase,
      };
    });
  }

  /**
   * Analyze risks for a BOQ.
   * @param {object} boqResult - Result from BOQ Engine { items, suggestedItems, summary, ... }
   * @param {Array} missingItems - Result from MissingItemsAI.findMissingItems()
   * @param {object} qaAnalysis - Result from EngineeringQA.analyzeQA()
   * @returns {object} - { riskLevel, riskScore, findings, totalRisks, criticalCount, summary }
   */
  analyzeRisks(boqResult, missingItems, qaAnalysis) {
    const items = boqResult.items || [];
    const findings = [];

    const criticalItems = this._findCriticalItems(items);
    for (const ci of criticalItems) {
      findings.push({
        type: 'critical_item',
        severity: ci.costPercentage >= 15 ? 'critical' : 'high',
        item: ci.item.code || ci.item.itemCode || 'unknown',
        itemDescription: ci.item.description || '',
        costPercentage: ci.costPercentage,
        confidence: ci.confidence,
        description: `بند حرج: ${ci.item.description || ci.item.code} - تكلفته ${ci.costPercentage}% من إجمالي المشروع`,
        impact: 'تأثير كبير على الميزانية في حالة تغير السعر أو الكمية',
        recommendation: ci.confidence < 50
          ? 'رفع درجة الثقة بتوفير بيانات أدق للبند'
          : 'مراقبة سعر البند أثناء التنفيذ نظراً لتأثيره الكبير',
      });
    }

    const lowConfItems = this._findLowConfidenceItems(items);
    for (const lc of lowConfItems) {
      const conf = (lc.confidence || 0) * 100;
      findings.push({
        type: 'low_confidence',
        severity: conf < 30 ? 'critical' : 'high',
        item: lc.code || lc.itemCode || 'unknown',
        itemDescription: lc.description || '',
        confidence: conf,
        description: `بند ثقة منخفضة: ${lc.description || lc.code} - الثقة ${conf}%`,
        impact: 'احتمالية وجود خطأ في الكمية أو السعر أو المواصفات',
        recommendation: 'توفير بيانات إضافية (مصادر موثوقة، عروض أسعار، كميات دقيقة)',
      });
    }

    const phasesWithMissing = this._associateMissingItemsWithPhases(missingItems || [], items);
    for (const pm of phasesWithMissing) {
      findings.push({
        type: 'missing_items',
        severity: pm.priority === 'critical' ? 'critical' : pm.priority === 'high' ? 'high' : 'medium',
        item: pm.foundItem || pm.category,
        itemDescription: pm.foundItem,
        category: pm.category,
        missingCount: pm.missingItems.length,
        description: `بنود ناقصة في ${pm.phaseName}: ${pm.missingItems.join('، ')}`,
        impact: pm.missingItems.length > 3
          ? 'نقص كبير في العناصر يؤثر على جودة المرحلة'
          : 'نقص في عناصر مكملة للمرحلة',
        recommendation: `إضافة البنود المفقودة: ${pm.missingItems.join('، ')}`,
        phase: pm.phase,
        phaseName: pm.phaseName,
      });
    }

    const incompletePhases = this._findIncompletePhases(items);
    for (const ip of incompletePhases) {
      findings.push({
        type: 'incomplete_phase',
        severity: ip.completionPercentage < 50 ? 'critical' : 'high',
        item: ip.phase,
        itemDescription: ip.phaseName,
        completionPercentage: ip.completionPercentage,
        description: `المرحلة ${ip.phaseName} غير مكتملة (${ip.completionPercentage}%) - ${ip.insufficientItems} بنود غير كافية`,
        impact: 'يؤثر على تسلسل العمل وجدولة المشروع',
        recommendation: `إكمال البنود الناقصة في المرحلة ${ip.phaseName} (${ip.totalItems - ip.completeItems} بند)`,
        phase: ip.phase,
        phaseName: ip.phaseName,
      });
    }

    const highCostItems = this._findHighCostItems(items);
    for (const hc of highCostItems) {
      const alreadyReported = findings.some(f => f.type === 'critical_item' && f.item === (hc.item.code || hc.item.itemCode));
      if (!alreadyReported) {
        findings.push({
          type: 'high_cost',
          severity: hc.percentageOfTotal >= 20 ? 'critical' : 'high',
          item: hc.item.code || hc.item.itemCode || 'unknown',
          itemDescription: hc.item.description || '',
          cost: hc.cost,
          percentageOfTotal: hc.percentageOfTotal,
          description: `بند عالي التكلفة: ${hc.item.description || hc.item.code} - ${hc.percentageOfTotal}% من التكلفة`,
          impact: 'تركيز المخاطر المالية في بند واحد',
          recommendation: 'تقسيم البند إلى بنود فرعية لتوزيع المخاطر المالية',
        });
      }
    }

    if (qaAnalysis && qaAnalysis.overall < 70) {
      findings.push({
        type: 'quality_issue',
        severity: qaAnalysis.overall < 50 ? 'critical' : 'high',
        item: 'general',
        itemDescription: 'جودة المشروع بشكل عام',
        qaScore: qaAnalysis.overall,
        description: `جودة المشروع منخفضة (${qaAnalysis.overall}/100) - وجود ${qaAnalysis.totalIssues || 0} مشكلة`,
        impact: 'يؤثر على دقة التكاليف والجدول الزمني',
        recommendation: 'معالجة مشاكل الجودة المحددة في تقرير EngineeringQA',
      });
    }

    const totalRisks = findings.length;
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    const mediumCount = findings.filter(f => f.severity === 'medium').length;

    const severityWeights = { critical: 100, high: 70, medium: 40, low: 10 };
    let weightedSum = 0;
    for (const f of findings) {
      weightedSum += severityWeights[f.severity] || 10;
    }
    const rawScore = findings.length > 0 ? weightedSum / findings.length : 0;
    const densityFactor = Math.min(1, (items.length > 0 ? findings.length / items.length : 0) * 2);
    const riskScore = Math.round(Math.min(100, rawScore * (0.7 + 0.3 * densityFactor)));

    let riskLevel = 'low';
    if (riskScore >= 85) riskLevel = 'critical';
    else if (riskScore >= 70) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';

    const summary = this._generateRiskSummary(riskLevel, riskScore, findings, totalRisks, criticalCount, highCount, mediumCount, items.length);

    return {
      riskLevel,
      riskScore,
      findings,
      totalRisks,
      criticalCount,
      highCount,
      mediumCount,
      lowCount: findings.length - criticalCount - highCount - mediumCount,
      byType: {
        criticalItems: criticalItems.length,
        lowConfidenceItems: lowConfItems.length,
        missingItemsCategories: phasesWithMissing.length,
        incompletePhases: incompletePhases.length,
        highCostItems: highCostItems.length,
      },
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  _generateRiskSummary(riskLevel, riskScore, findings, total, critical, high, medium, totalItems) {
    const levelMap = {
      low: 'منخفض',
      medium: 'متوسط',
      high: 'عالٍ',
      critical: 'حرج',
    };

    let summary = `مستوى المخاطر: ${levelMap[riskLevel]} (${riskScore}/100). `;
    summary += `إجمالي المخاطر: ${total} (حرج: ${critical}, عالٍ: ${high}, متوسط: ${medium}). `;

    const byType = {};
    for (const f of findings) {
      if (!byType[f.type]) byType[f.type] = 0;
      byType[f.type]++;
    }

    const typeDesc = Object.entries(byType)
      .map(([type, count]) => {
        const names = { critical_item: 'بنود حرجة', low_confidence: 'ثقة منخفضة', missing_items: 'بنود ناقصة', incomplete_phase: 'مراحل غير مكتملة', high_cost: 'تكلفة عالية', quality_issue: 'مشاكل جودة' };
        return `${count} ${names[type] || type}`;
      })
      .join('، ');

    summary += `التوزيع: ${typeDesc}. `;

    if (riskLevel === 'critical') {
      summary += 'يتطلب تدخلاً فورياً لمعالجة المخاطر الحرجة قبل المتابعة.';
    } else if (riskLevel === 'high') {
      summary += 'يوصى بمعالجة المخاطر العالية قبل البدء في التنفيذ.';
    } else if (riskLevel === 'medium') {
      summary += 'مراقبة المخاطر المتوسطة أثناء التنفيذ.';
    } else {
      summary += 'المخاطر ضمن الحدود المقبولة.';
    }

    return summary;
  }

  /**
   * Get risk mitigation suggestions for findings.
   * @param {Array} findings - Findings from analyzeRisks()
   * @returns {Array} - Mitigation strategies
   */
  getRiskMitigation(findings) {
    if (!findings || findings.length === 0) {
      return [];
    }

    const mitigationStrategies = {
      critical_item: [
        { strategy: 'توزيع المخاطر', action: 'تقسيم البند عالي التكلفة إلى بنود فرعية', owner: 'مدير المشروع', timeline: 'قبل الترسية' },
        { strategy: 'تثبيت السعر', action: 'الحصول على عروض أسعار ثابتة من المقاولين', owner: 'مدير المشتريات', timeline: 'قبل التنفيذ' },
        { strategy: 'مراقبة مستمرة', action: 'وضع مؤشر أداء خاص بهذا البند', owner: 'فريق الإشراف', timeline: 'أثناء التنفيذ' },
      ],
      low_confidence: [
        { strategy: 'تحسين البيانات', action: 'توفير مصادر بيانات موثوقة (فواتير سابقة، عروض أسعار)', owner: 'مهندس التكاليف', timeline: 'قبل الاعتماد' },
        { strategy: 'تدقيق الكميات', action: 'إعادة حساب الكميات بطريقة بديلة و مقارنتها', owner: 'مهندس الكميات', timeline: 'قبل الاعتماد' },
        { strategy: 'مراجعة الأسعار', action: 'مقارنة السعر مع مشاريع مماثلة منفذة', owner: 'مدير المشتريات', timeline: 'قبل الاعتماد' },
      ],
      missing_items: [
        { strategy: 'إكمال البنود', action: 'إضافة البنود الناقصة إلى بنود المشروع', owner: 'مهندس التصميم', timeline: 'قبل الطرح' },
        { strategy: 'مراجعة التصميم', action: 'مراجعة التصميم للتأكد من عدم وجود عناصر ناقصة', owner: 'استشاري', timeline: 'قبل الطرح' },
        { strategy: 'تحديث BOQ', action: 'إعادة توليد بنود المشروع بعد إضافة العناصر المفقودة', owner: 'مهندس التكاليف', timeline: 'فوري' },
      ],
      incomplete_phase: [
        { strategy: 'إكمال المرحلة', action: 'تحديد البنود الناقصة في المرحلة وإضافتها', owner: 'مهندس التخطيط', timeline: 'قبل بداية المرحلة' },
        { strategy: 'تعديل الجدول', action: 'تعديل الجدول الزمني لاستيعاب البنود الناقصة', owner: 'مدير المشروع', timeline: 'عند التخطيط' },
        { strategy: 'تأكيد البيانات', action: 'التأكد من اكتمال البيانات لجميع بنود المرحلة', owner: 'فريق الإشراف', timeline: 'قبل التنفيذ' },
      ],
      high_cost: [
        { strategy: 'توزيع المخاطر المالية', action: 'تقسيم البند عالي التكلفة إلى عقود منفصلة', owner: 'مدير المشروع', timeline: 'قبل الترسية' },
        { strategy: 'احتياطي مالي', action: 'تخصيص احتياطي مالي لهذا البند بنسبة 10-15%', owner: 'الإدارة المالية', timeline: 'عند إعداد الميزانية' },
        { strategy: 'بدائل', action: 'دراسة بدائل أقل تكلفة مع الحفاظ على الجودة', owner: 'مهندس القيمة', timeline: 'قبل الشراء' },
      ],
      quality_issue: [
        { strategy: 'تحسين الجودة', action: 'معالجة مشاكل الجودة المحددة في تقرير EngineeringQA', owner: 'فريق الجودة', timeline: 'قبل البدء' },
        { strategy: 'مراجعة البيانات', action: 'التأكد من اكتمال وصحة بيانات المشروع', owner: 'مهندس التكاليف', timeline: 'فوري' },
        { strategy: 'إعادة التقييم', action: 'إعادة تقييم الجودة بعد معالجة المشاكل', owner: 'مدير المشروع', timeline: 'بعد المعالجة' },
      ],
    };

    return findings.map(f => {
      const strategies = mitigationStrategies[f.type] || [
        { strategy: 'مراجعة عامة', action: 'مراجعة البند ومعالجة المشكلة', owner: 'مدير المشروع', timeline: 'حسب الأولوية' },
      ];
      return {
        finding: f,
        mitigationStrategies: strategies,
        priority: f.severity === 'critical' ? 1 : f.severity === 'high' ? 2 : 3,
      };
    });
  }

  /**
   * Generate a risk heatmap grouped by project phase.
   * @param {Array} items - BOQ items
   * @returns {object} - Heatmap data by phase
   */
  getRiskHeatmap(items) {
    if (!items || items.length === 0) {
      return { phases: [], overall: { totalItems: 0, avgRisk: 0 } };
    }

    const phaseGroups = {};
    for (const item of items) {
      const phase = item.phase || 'غير محدد';
      if (!phaseGroups[phase]) phaseGroups[phase] = { items: [], totalCost: 0 };
      phaseGroups[phase].items.push(item);
      phaseGroups[phase].totalCost += item.totalPrice || 0;
    }

    const phases = Object.entries(phaseGroups).map(([phase, group]) => {
      const totalCost = group.totalCost;
      const avgConfidence = group.items.reduce((s, i) => s + (i.confidence || 0), 0) / group.items.length;
      const insufficientCount = group.items.filter(i => i.insufficient).length;
      const zeroCount = group.items.filter(i => !i.insufficient && !i.quantity).length;

      const densityFactor = insufficientCount + zeroCount;
      const confidenceFactor = (1 - avgConfidence) * 50;
      const costFactor = Math.min(30, (insufficientCount + zeroCount) * 5);

      const riskScore = Math.round(Math.min(100, densityFactor * 15 + confidenceFactor + costFactor));

      let riskLabel = 'منخفض';
      if (riskScore >= 75) riskLabel = 'حرج';
      else if (riskScore >= 55) riskLabel = 'عالٍ';
      else if (riskScore >= 35) riskLabel = 'متوسط';

      let color = '#22c55e';
      if (riskScore >= 75) color = '#ef4444';
      else if (riskScore >= 55) color = '#f97316';
      else if (riskScore >= 35) color = '#eab308';

      return {
        phase,
        phaseName: PHASE_NAMES[phase] || phase,
        riskScore,
        riskLabel,
        color,
        totalItems: group.items.length,
        totalCost: Math.round(totalCost * 100) / 100,
        costPercentage: 0,
        avgConfidence: Math.round(avgConfidence * 100),
        insufficientCount,
        zeroCountItems: zeroCount,
        details: {
          highCostItems: group.items.filter(i => (i.totalPrice || 0) > 0).length,
          criticalThreshold: riskScore >= 55,
        },
      };
    });

    const totalCost = phases.reduce((s, p) => s + p.totalCost, 0);
    for (const phase of phases) {
      phase.costPercentage = totalCost > 0 ? Math.round((phase.totalCost / totalCost) * 10000) / 100 : 0;
    }

    phases.sort((a, b) => b.riskScore - a.riskScore);

    const avgRisk = phases.length > 0
      ? Math.round(phases.reduce((s, p) => s + p.riskScore, 0) / phases.length)
      : 0;

    return {
      phases,
      overall: {
        totalItems: items.length,
        totalCost: Math.round(totalCost * 100) / 100,
        avgRisk,
        avgRiskLabel: avgRisk >= 75 ? 'حرج' : avgRisk >= 55 ? 'عالٍ' : avgRisk >= 35 ? 'متوسط' : 'منخفض',
        criticalPhases: phases.filter(p => p.riskScore >= 75).length,
        highPhases: phases.filter(p => p.riskScore >= 55 && p.riskScore < 75).length,
      },
    };
  }
}

module.exports = RiskEngine;
