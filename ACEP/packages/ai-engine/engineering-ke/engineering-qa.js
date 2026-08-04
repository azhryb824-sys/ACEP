/**
 * ACEP Engineering Quality Assurance
 *
 * Stage 12: Engineering QA
 * Analyzes project quality across multiple dimensions.
 */

const STANDARD_PROJECTS = {
  'villa': {
    itemCountRange: [60, 110],
    phaseCount: 5,
    avgConfidence: 0.75,
    unitPriceRange: { min: 15, max: 5000 },
    tradeDistribution: {
      EXC: { min: 2, max: 5 }, FND: { min: 3, max: 8 }, COL: { min: 3, max: 8 },
      SLB: { min: 3, max: 8 }, REB: { min: 2, max: 5 }, BLK: { min: 2, max: 5 },
      WAL: { min: 3, max: 8 }, PLS: { min: 2, max: 5 }, PNT: { min: 3, max: 8 },
      TLF: { min: 3, max: 8 }, DR: { min: 3, max: 10 }, WN: { min: 2, max: 6 },
      GPS: { min: 1, max: 4 }, ELC: { min: 5, max: 15 }, PLB: { min: 3, max: 10 },
    },
  },
  'building': {
    itemCountRange: [90, 160],
    phaseCount: 6,
    avgConfidence: 0.80,
    unitPriceRange: { min: 10, max: 8000 },
  },
  'warehouse': {
    itemCountRange: [30, 60],
    phaseCount: 4,
    avgConfidence: 0.70,
    unitPriceRange: { min: 10, max: 6000 },
  },
};

class EngineeringQA {
  constructor() {
    this.defaultStandards = {
      itemCountRange: [40, 200],
      phaseCount: 4,
      avgConfidence: 0.70,
    };
  }

  _assessProjectQuality(boqResult, projectParams) {
    const items = boqResult.items || [];
    const missingParams = [];

    const requiredParams = ['type', 'area', 'floors'];
    for (const param of requiredParams) {
      if (!projectParams[param] && projectParams[param] !== 0) {
        missingParams.push(param);
      }
    }

    const hasDescription = !!(projectParams.description && projectParams.description.length > 5);
    const hasPhase = !!(projectParams.phase);

    const score = Math.max(0, 100 - missingParams.length * 20 - (hasDescription ? 0 : 10) - (hasPhase ? 0 : 10));

    return {
      score,
      maxScore: 100,
      status: score >= 80 ? 'جيد' : score >= 50 ? 'متوسط' : 'ضعيف',
      details: {
        totalParams: Object.keys(projectParams).length,
        missingParams,
        hasDescription,
        hasPhase,
        completeness: `${Math.round((1 - missingParams.length / requiredParams.length) * 100)}%`,
      },
    };
  }

  _assessQuantitiesQuality(items) {
    if (!items || items.length === 0) {
      return { score: 0, maxScore: 100, status: 'ضعيف', details: { totalItems: 0, issues: ['لا توجد بنود'] } };
    }

    let issues = [];
    let zeroCount = 0;
    let negativeCount = 0;
    let insufficientCount = 0;
    let reasonableCount = 0;

    for (const item of items) {
      if (item.insufficient) {
        insufficientCount++;
        continue;
      }
      const qty = item.quantity;
      if (qty === null || qty === undefined || qty === 0) {
        zeroCount++;
      } else if (qty < 0) {
        negativeCount++;
      } else {
        reasonableCount++;
      }
    }

    if (zeroCount > 0) issues.push(`${zeroCount} بنود بكميات صفرية`);
    if (negativeCount > 0) issues.push(`${negativeCount} بنود بكميات سالبة`);
    if (insufficientCount > 0) issues.push(`${insufficientCount} بنود غير كافية البيانات`);

    const validRatio = items.length > 0 ? reasonableCount / items.length : 0;
    const score = Math.round(validRatio * 100);

    return {
      score,
      maxScore: 100,
      status: score >= 90 ? 'ممتاز' : score >= 70 ? 'جيد' : score >= 50 ? 'متوسط' : 'ضعيف',
      details: {
        totalItems: items.length,
        reasonableQuantities: reasonableCount,
        zeroQuantities: zeroCount,
        negativeQuantities: negativeCount,
        insufficient: insufficientCount,
        issues,
      },
    };
  }

  _assessPricesQuality(items) {
    if (!items || items.length === 0) {
      return { score: 0, maxScore: 100, status: 'ضعيف', details: { totalItems: 0, issues: ['لا توجد بنود'] } };
    }

    const priceRanges = {
      EXC: [10, 100], FND: [200, 800], COL: [300, 900], SLB: [300, 800],
      REB: [2000, 6000], BLK: [15, 100], WAL: [200, 700], PLS: [15, 50],
      PNT: [10, 40], TLF: [40, 120], CRM: [40, 100], DR: [400, 2000],
      WN: [200, 800], GPS: [30, 120], ELC: [50, 300], PLB: [80, 400],
      HVAC: [2000, 10000], FPR: [100, 400], NET: [100, 400], EXT: [20, 150],
      CLN: [5, 20], ELV: [150000, 400000], FCD: [200, 600], MED: [800, 3000],
    };

    let issues = [];
    let inRange = 0;
    let outOfRange = 0;
    let zeroPrice = 0;
    let missingPrice = 0;

    for (const item of items) {
      if (item.insufficient) continue;
      const price = item.unitPrice;
      if (price === null || price === undefined) {
        missingPrice++;
        continue;
      }
      if (price === 0) {
        zeroPrice++;
        continue;
      }
      const trade = item.trade || item.priceCat || '';
      const range = priceRanges[trade];
      if (range && price >= range[0] && price <= range[1]) {
        inRange++;
      } else {
        outOfRange++;
      }
    }

    if (zeroPrice > 0) issues.push(`${zeroPrice} بنود بسعر صفر`);
    if (missingPrice > 0) issues.push(`${missingPrice} بنود بدون سعر`);
    if (outOfRange > 0) issues.push(`${outOfRange} بنود خارج المدى السعري المنطقي`);

    const totalValid = inRange + outOfRange;
    const score = totalValid > 0 ? Math.round((inRange / totalValid) * 100) : 0;

    return {
      score,
      maxScore: 100,
      status: score >= 90 ? 'ممتاز' : score >= 70 ? 'جيد' : score >= 50 ? 'متوسط' : 'ضعيف',
      details: {
        totalItems: items.length,
        inRange,
        outOfRange,
        zeroPrice,
        missingPrice,
        issues,
      },
    };
  }

  _assessOrderingQuality(items) {
    if (!items || items.length === 0) {
      return { score: 0, maxScore: 100, status: 'ضعيف', details: { issues: ['لا توجد بنود'] } };
    }

    const phaseOrder = ['structural', 'architectural', 'electromechanical', 'finishing', 'exterior'];
    let issues = [];
    let sequentialCount = 0;
    let outOfOrderCount = 0;
    const phasesFound = new Set();

    items = items.filter(i => i.phase);
    if (items.length === 0) {
      return { score: 0, maxScore: 100, status: 'ضعيف', details: { issues: ['لا توجد بنود مرتبطة بمراحل'] } };
    }

    for (let i = 1; i < items.length; i++) {
      const prevPhase = items[i - 1].phase;
      const currPhase = items[i].phase;
      phasesFound.add(prevPhase);
      phasesFound.add(currPhase);

      const prevIdx = phaseOrder.indexOf(prevPhase);
      const currIdx = phaseOrder.indexOf(currPhase);

      if (prevIdx !== -1 && currIdx !== -1 && currIdx >= prevIdx) {
        sequentialCount++;
      } else if (prevIdx !== -1 && currIdx !== -1) {
        outOfOrderCount++;
      }
    }

    const phaseCount = phaseOrder.filter(p => phasesFound.has(p)).length;
    const expectedPhases = phaseOrder.length;
    const phaseCoverage = Math.round((phaseCount / expectedPhases) * 100);

    if (outOfOrderCount > 0) {
      issues.push(`${outOfOrderCount} بنود خارج الترتيب المنطقي للمراحل`);
    }
    if (phaseCount < expectedPhases) {
      issues.push(`${expectedPhases - phaseCount} مراحل مفقودة من أصل ${expectedPhases}`);
    }

    const score = Math.round((sequentialCount / Math.max(1, items.length - 1)) * 0.6 + phaseCoverage * 0.4);

    return {
      score,
      maxScore: 100,
      status: score >= 80 ? 'جيد' : score >= 50 ? 'متوسط' : 'ضعيف',
      details: {
        sequentialItems: sequentialCount,
        outOfOrderItems: outOfOrderCount,
        phasesFound: phaseCount,
        expectedPhases,
        phaseCoverage: `${phaseCoverage}%`,
        issues,
      },
    };
  }

  _assessRelationshipsQuality(items) {
    if (!items || items.length === 0) {
      return { score: 0, maxScore: 100, status: 'ضعيف', details: { issues: ['لا توجد بنود'] } };
    }

    const dependencyMap = {
      FND: ['EXC'], COL: ['FND', 'REB'], SLB: ['COL', 'REB'],
      PLS: ['BLK', 'WAL'], PNT: ['PLS'], TLF: ['PLS'],
      CRM: ['PLS'], GPS: ['PLS'], DR: ['WAL'], WN: ['WAL'],
    };

    let issues = [];
    let dependenciesMet = 0;
    let dependenciesMissing = 0;
    const codes = new Set(items.map(i => (i.code || i.itemCode || '').substring(0, 3)).filter(Boolean));

    for (const [itemCode, deps] of Object.entries(dependencyMap)) {
      if (!codes.has(itemCode)) continue;
      for (const dep of deps) {
        if (codes.has(dep)) {
          dependenciesMet++;
        } else {
          dependenciesMissing++;
          issues.push(`${itemCode} يحتاج إلى ${dep} لكنه غير موجود في بنود المشروع`);
        }
      }
    }

    if (dependenciesMet === 0 && dependenciesMissing === 0) {
      return { score: 70, maxScore: 100, status: 'متوسط', details: { issues: ['لا توجد علاقات تبعية محددة لهذه البنود'] } };
    }

    const total = dependenciesMet + dependenciesMissing;
    const score = total > 0 ? Math.round((dependenciesMet / total) * 100) : 70;

    return {
      score,
      maxScore: 100,
      status: score >= 80 ? 'جيد' : score >= 50 ? 'متوسط' : 'ضعيف',
      details: {
        dependenciesMet,
        dependenciesMissing,
        totalDependencies: total,
        issues,
      },
    };
  }

  _assessPhasesQuality(items) {
    if (!items || items.length === 0) {
      return { score: 0, maxScore: 100, status: 'ضعيف', details: { issues: ['لا توجد بنود'] } };
    }

    const phaseGroups = {};
    for (const item of items) {
      const phase = item.phase || 'غير محدد';
      if (!phaseGroups[phase]) phaseGroups[phase] = [];
      phaseGroups[phase].push(item);
    }

    let issues = [];
    let completePhases = 0;
    let incompletePhases = 0;
    const phaseDetails = [];

    for (const [phase, phaseItems] of Object.entries(phaseGroups)) {
      const insufficientCount = phaseItems.filter(i => i.insufficient).length;
      const zeroCount = phaseItems.filter(i => !i.insufficient && !i.quantity).length;
      const completionRatio = 1 - (insufficientCount + zeroCount) / phaseItems.length;

      if (completionRatio >= 0.8) {
        completePhases++;
      } else {
        incompletePhases++;
        issues.push(`المرحلة ${phase}: ${Math.round((1 - completionRatio) * 100)}% من البنود غير مكتملة`);
      }

      phaseDetails.push({
        phase,
        itemCount: phaseItems.length,
        insufficientCount,
        zeroCount,
        completionRatio: Math.round(completionRatio * 100),
      });
    }

    const totalPhases = Object.keys(phaseGroups).length;
    const score = totalPhases > 0 ? Math.round((completePhases / totalPhases) * 100) : 0;

    return {
      score,
      maxScore: 100,
      status: score >= 80 ? 'جيد' : score >= 50 ? 'متوسط' : 'ضعيف',
      details: {
        totalPhases,
        completePhases,
        incompletePhases,
        phaseDetails,
        issues,
      },
    };
  }

  /**
   * Analyze project quality for a BOQ result.
   * @param {object} boqResult - Result from BOQ Engine { items, suggestedItems, summary, ... }
   * @param {object} projectParams - Project parameters { type, area, floors, phase, ... }
   * @returns {object} - Complete QA analysis
   */
  analyzeQA(boqResult, projectParams) {
    const items = boqResult.items || [];
    const allItems = [...items, ...(boqResult.suggestedItems || [])];

    const projectQuality = this._assessProjectQuality(boqResult, projectParams);
    const quantitiesQuality = this._assessQuantitiesQuality(items);
    const pricesQuality = this._assessPricesQuality(items);
    const orderingQuality = this._assessOrderingQuality(items);
    const relationshipsQuality = this._assessRelationshipsQuality(allItems);
    const phasesQuality = this._assessPhasesQuality(items);

    const categories = { projectQuality, quantitiesQuality, pricesQuality, orderingQuality, relationshipsQuality, phasesQuality };
    const scores = Object.values(categories).map(c => c.score);
    const overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const allIssues = [];
    for (const [key, cat] of Object.entries(categories)) {
      if (cat.details && cat.details.issues) {
        for (const issue of cat.details.issues) {
          allIssues.push(issue);
        }
      }
    }

    const recommendations = [];
    if (projectQuality.score < 80) {
      recommendations.push('تأكد من إدخال جميع بيانات المشروع الأساسية (النوع، المساحة، الأدوار)');
    }
    if (quantitiesQuality.score < 70) {
      recommendations.push('راجع البنود ذات الكميات الصفرية أو غير المحددة');
    }
    if (pricesQuality.score < 70) {
      recommendations.push('دقق الأسعار للبنود الخارجة عن المدى المنطقي');
    }
    if (orderingQuality.score < 70) {
      recommendations.push('أعد ترتيب البنود حسب مراحل المشروع');
    }
    if (relationshipsQuality.score < 70) {
      recommendations.push('تأكد من وجود جميع البنود التابعة لكل بند رئيسي');
    }
    if (phasesQuality.score < 70) {
      recommendations.push('أكمل البنود الناقصة في المراحل غير المكتملة');
    }

    const overallRating = overall >= 90 ? 'ممتاز' : overall >= 80 ? 'جيد جداً' : overall >= 70 ? 'جيد' : overall >= 50 ? 'متوسط' : 'ضعيف';

    return {
      overall,
      overallRating,
      categories,
      summary: this._generateSummary(overall, categories, allIssues),
      recommendations,
      issues: allIssues,
      totalIssues: allIssues.length,
    };
  }

  _generateSummary(overall, categories, issues) {
    const strongAreas = [];
    const weakAreas = [];

    for (const [key, cat] of Object.entries(categories)) {
      const names = {
        projectQuality: 'جودة بيانات المشروع',
        quantitiesQuality: 'جودة الكميات',
        pricesQuality: 'جودة الأسعار',
        orderingQuality: 'جودة الترتيب',
        relationshipsQuality: 'جودة العلاقات',
        phasesQuality: 'جودة المراحل',
      };
      if (cat.score >= 80) {
        strongAreas.push(names[key] || key);
      } else if (cat.score < 60) {
        weakAreas.push(names[key] || key);
      }
    }

    if (issues.length === 0) {
      return `جودة المشروع بشكل عام ${overall >= 80 ? 'جيدة' : 'مقبولة'}، ولا توجد مشاكل واضحة`;
    }

    let summary = `تقييم الجودة الإجمالي: ${overall}/100 - `;
    if (strongAreas.length > 0) summary += `نقاط القوة: ${strongAreas.join('، ')}. `;
    if (weakAreas.length > 0) summary += `نقاط الضعف: ${weakAreas.join('، ')}. `;
    summary += `إجمالي المشاكل: ${issues.length}`;
    return summary;
  }

  /**
   * Get a scorecard summarizing all QA dimensions.
   * @param {object} analysis - Result from analyzeQA
   * @returns {object} - Score card
   */
  getQAScoreCard(analysis) {
    if (!analysis) {
      return {
        overall: 0,
        grade: 'F',
        categories: [],
        timestamp: new Date().toISOString(),
      };
    }

    const getGrade = (score) => {
      if (score >= 95) return 'A+';
      if (score >= 90) return 'A';
      if (score >= 85) return 'B+';
      if (score >= 80) return 'B';
      if (score >= 70) return 'C+';
      if (score >= 60) return 'C';
      if (score >= 50) return 'D';
      return 'F';
    };

    const catNames = {
      projectQuality: 'جودة بيانات المشروع',
      quantitiesQuality: 'جودة الكميات',
      pricesQuality: 'جودة الأسعار',
      orderingQuality: 'جودة الترتيب',
      relationshipsQuality: 'جودة العلاقات',
      phasesQuality: 'جودة المراحل',
    };

    const categories = Object.entries(analysis.categories || {}).map(([key, cat]) => ({
      code: key,
      name: catNames[key] || key,
      score: cat.score,
      maxScore: cat.maxScore || 100,
      grade: getGrade(cat.score),
      status: cat.status,
    }));

    return {
      overall: analysis.overall,
      overallGrade: getGrade(analysis.overall),
      grade: getGrade(analysis.overall),
      totalIssues: analysis.totalIssues || analysis.issues?.length || 0,
      categories,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Compare BOQ against standard projects.
   * @param {object} boqResult - Result from BOQ Engine
   * @param {string} projectType - Project type (villa, building, etc.)
   * @returns {object} - Comparison results
   */
  compareToStandard(boqResult, projectType) {
    const items = boqResult.items || [];
    const standard = STANDARD_PROJECTS[projectType] || this.defaultStandards;

    const itemCount = items.length;
    const itemCountRange = standard.itemCountRange || [40, 200];
    const itemCountStatus = itemCount >= itemCountRange[0] && itemCount <= itemCountRange[1]
      ? 'ضمن المعدل الطبيعي' : itemCount < itemCountRange[0] ? 'أقل من المعدل' : 'أعلى من المعدل';

    const totalCost = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
    const avgConfidence = items.length > 0
      ? items.reduce((s, i) => s + (i.confidence || 0), 0) / items.length
      : 0;
    const confidenceStatus = avgConfidence >= (standard.avgConfidence || 0)
      ? 'أعلى من المعدل القياسي' : 'أقل من المعدل القياسي';

    const tradeDistribution = {};
    for (const item of items) {
      const trade = item.trade || 'OTHER';
      if (!tradeDistribution[trade]) tradeDistribution[trade] = 0;
      tradeDistribution[trade]++;
    }

    const phases = new Set(items.map(i => i.phase).filter(Boolean));
    const phaseCount = phases.size;
    const phaseStatus = phaseCount >= (standard.phaseCount || 4)
      ? 'مطابق للمعدل' : 'أقل من المتوقع';

    const details = [];
    details.push({
      metric: 'عدد البنود',
      actual: itemCount,
      expected: `${itemCountRange[0]}-${itemCountRange[1]}`,
      status: itemCountStatus,
    });
    details.push({
      metric: 'عدد المراحل',
      actual: phaseCount,
      expected: `${standard.phaseCount || 4}`,
      status: phaseStatus,
    });
    details.push({
      metric: 'متوسط الثقة',
      actual: Math.round(avgConfidence * 100) / 100,
      expected: standard.avgConfidence || 0.70,
      status: confidenceStatus,
    });

    let overallScore = 0;
    if (itemCount >= itemCountRange[0] && itemCount <= itemCountRange[1]) overallScore += 30;
    else if (itemCount >= itemCountRange[0] * 0.5) overallScore += 15;

    if (phaseCount >= (standard.phaseCount || 4)) overallScore += 30;
    else if (phaseCount >= (standard.phaseCount || 4) * 0.5) overallScore += 15;

    if (avgConfidence >= (standard.avgConfidence || 0)) overallScore += 40;
    else if (avgConfidence >= (standard.avgConfidence || 0) * 0.7) overallScore += 20;

    const compatibilityScore = Math.round(overallScore);

    return {
      projectType,
      standard: standard,
      compatibilityScore,
      compatibilityStatus: compatibilityScore >= 80 ? 'متوافق' : compatibilityScore >= 50 ? 'متوافق جزئياً' : 'غير متوافق',
      details,
      deviations: details.filter(d => d.status !== 'ضمن المعدل الطبيعي' && d.status !== 'مطابق للمعدل' && d.status !== 'أعلى من المعدل القياسي'),
      tradeDistribution,
    };
  }
}

module.exports = EngineeringQA;
