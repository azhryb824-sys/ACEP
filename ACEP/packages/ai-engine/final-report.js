/**
 * ACEP Final Report Generator
 *
 * Generates a comprehensive project report covering:
 *   - Reuse analysis (which components were reused, how many times)
 *   - Unused components (suggestions for activation)
 *   - Future integration suggestions
 *   - ACEP completion percentage
 *   - Lessons learned
 *   - Risk summary
 *   - Cost summary
 *   - Quality metrics
 *   - Recommendation impact
 *
 * Reuses: ALL previous layers — MaturityMetrics, AISelfReview,
 *         RecommendationEngine, ConsistencyScorer, EngineeringMemory,
 *         DecisionEngine, ExplainableAI, LearningFeedbackEngine.
 */
class FinalReport {
  constructor(options = {}) {
    this.maturityMetrics = options.maturityMetrics || null;
    this.selfReview = options.selfReview || null;
    this.recommendationEngine = options.recommendationEngine || null;
    this.consistencyScorer = options.consistencyScorer || null;
    this.engineeringMemory = options.engineeringMemory || null;
    this.decisionEngine = options.decisionEngine || null;
    this.explainableAI = options.explainableAI || null;
    this.learningFeedback = options.learningFeedback || null;
    this.edl = options.edl || null;
    this._reportHistory = [];
  }

  /**
   * Generate complete final report.
   */
  generate(projectId, options = {}) {
    const project = this.edl?.getProject(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    const sections = {};

    // Section 1: Executive Summary
    sections.executiveSummary = this._executiveSummary(project);

    // Section 2: Reuse Analysis
    sections.reuseAnalysis = this._reuseAnalysis(project);

    // Section 3: Unused Components
    sections.unusedComponents = this._findUnused(project);

    // Section 4: Maturity Assessment
    sections.maturity = this._runMaturity(project);

    // Section 5: Self Review Summary
    sections.selfReview = this._runSelfReview(project);

    // Section 6: Consistency Report
    sections.consistency = this._runConsistency(project);

    // Section 7: Recommendations Impact
    sections.recommendations = this._runRecommendations(project);

    // Section 8: Decision Summary
    sections.decisions = this._decisionSummary(project);

    // Section 9: Risk & Cost Summary
    sections.riskCost = this._riskCostSummary(project);

    // Section 10: Integration Suggestions
    sections.integrationSuggestions = this._integrationSuggestions(project);

    // Section 11: ACEP Completion
    sections.acepCompletion = this._acepCompletion(project);

    // Section 12: Lessons Learned
    sections.lessonsLearned = this._lessonsLearned(project);

    const report = {
      projectId,
      projectName: project.name || projectId,
      generatedAt: new Date().toISOString(),
      version: '2.0',
      sections: Object.keys(sections).map(k => ({
        id: k,
        title: this._sectionTitle(k),
        summary: sections[k].summary || '',
      })),
      fullSections: sections,
      scores: this._collectScores(sections),
      overallScore: this._overallScore(sections),
    };

    if (this.edl) {
      project.traceEvent('final_report_generated', 'FinalReport', {
        sections: Object.keys(sections).length,
        overallScore: report.overallScore,
      });
    }

    this._reportHistory.push(report);
    return report;
  }

  /**
   * Compare two project reports.
   */
  compare(projectIdA, projectIdB) {
    const reportA = this._reportHistory.find(r => r.projectId === projectIdA);
    const reportB = this._reportHistory.find(r => r.projectId === projectIdB);

    if (!reportA || !reportB) {
      return { ok: false, error: 'One or both reports not found' };
    }

    const differences = {
      scores: {},
      sections: {},
    };

    for (const [key, scoreA] of Object.entries(reportA.scores || {})) {
      const scoreB = reportB.scores?.[key];
      if (typeof scoreA === 'number' && typeof scoreB === 'number') {
        differences.scores[key] = {
          A: scoreA,
          B: scoreB,
          delta: scoreB - scoreA,
        };
      }
    }

    return {
      projectA: projectIdA,
      projectB: projectIdB,
      overallA: reportA.overallScore,
      overallB: reportB.overallScore,
      delta: reportB.overallScore - reportA.overallScore,
      differences,
      summary: `الفرق الإجمالي: ${reportA.overallScore} → ${reportB.overallScore} (${reportB.overallScore - reportA.overallScore > 0 ? '+' : ''}${reportB.overallScore - reportA.overallScore})`,
    };
  }

  _executiveSummary(project) {
    const models = ['BOQ', 'Vision', 'Navigation', 'Cost', 'Schedule', 'Risk'];
    const active = models.filter(m => {
      const key = m.toLowerCase();
      return project[key] || project[key.replace(' ', '_')];
    });

    return {
      summary: `تم تحليل المشروع "${project.name || project.id}" باستخدام ${active.length}/${models.length} نماذج AI`,
      activeModels: active,
      totalModels: models.length,
      projectType: project.getEffective?.('type').value || project.type || 'Unknown',
      totalCost: project.cost?.totalCost || 0,
      duration: project.schedule?.totalDuration || 0,
    };
  }

  _reuseAnalysis(project) {
    const reused = [];
    let totalReuses = 0;

    const checks = [
      { name: 'EDL', check: !!this.edl, count: 1 },
      { name: 'EngineeringDecisionEngine', check: !!this.decisionEngine, count: 1 },
      { name: 'ConsistencyScorer', check: !!this.consistencyScorer, count: 1 },
      { name: 'RecommendationEngine', check: !!this.recommendationEngine, count: 1 },
      { name: 'EngineeringMemory', check: !!this.engineeringMemory, count: 1 },
      { name: 'AISelfReview', check: !!this.selfReview, count: 1 },
      { name: 'MaturityMetrics', check: !!this.maturityMetrics, count: 1 },
      { name: 'ExplainableAI', check: !!this.explainableAI, count: 1 },
      { name: 'LearningFeedbackEngine', check: !!this.learningFeedback, count: 1 },
    ];

    for (const c of checks) {
      if (c.check) {
        reused.push(c);
        totalReuses += c.count;
      }
    }

    const reuseRate = totalReuses > 0
      ? Math.round((reused.length / checks.length) * 100)
      : 0;

    return {
      summary: `إعادة استخدام ${reused.length}/${checks.length} مكون (${
        reuseRate >= 80 ? 'ممتازة' : reuseRate >= 50 ? 'جيدة' : 'تحتاج تحسين'
      })`,
      reuseRate,
      reusedComponents: reused.map(r => r.name),
      totalComponents: checks.length,
      componentsNotReused: checks.filter(c => !c.check).map(c => c.name),
    };
  }

  _findUnused(project) {
    const unused = [];

    const checks = [
      { name: 'DigitalTwin', check: !!(project.digitalTwin || this.digitalTwin), suggestion: 'استخدام DigitalTwin لمزامنة UPM مع جميع النماذج' },
      { name: 'PerformanceLayer', check: !!(project.performanceLayer || project.performance), suggestion: 'تفعيل Performance Layer لتحسين سرعة الاستجابة' },
      { name: 'CrossModelValidator (extended rules)', check: !!project.crossModelValidator, suggestion: 'تفعيل القواعد الموسعة CV6-CV10 للتحقق المتقاطع' },
      { name: 'SemanticValidator', check: !!(project.semanticValidator || project.semantic), suggestion: 'تفعيل SemanticValidator للتحقق من الصور والنماذج ثلاثية الأبعاد' },
      { name: 'BenchmarkExtension', check: !!(project.benchmark || project.benchmarkExtension), suggestion: 'تشغيل Benchmark لمقارنة الأداء مع المشاريع المرجعية' },
    ];

    for (const c of checks) {
      if (!c.check) {
        unused.push({
          component: c.name,
          suggestion: c.suggestion,
          priority: c.name.includes('CrossModel') || c.name.includes('Digital') ? 'high' : 'medium',
        });
      }
    }

    return {
      summary: `${unused.length} مكونات غير مستخدمة`,
      unused,
      totalUnused: unused.length,
    };
  }

  _runMaturity(project) {
    if (!this.maturityMetrics) {
      return { summary: 'MaturityMetrics not available', score: null };
    }
    const result = this.maturityMetrics.calculate(project.id);
    return {
      summary: `مستوى النضج: ${result.level} (${result.totalScore}/100)`,
      score: result.totalScore,
      level: result.level,
      dimensions: result.dimensions,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
    };
  }

  _runSelfReview(project) {
    if (!this.selfReview) {
      return { summary: 'AISelfReview not available', score: null };
    }
    const result = this.selfReview.review(project.id);
    return {
      summary: result.summary,
      score: result.overallScore,
      grade: result.overall,
      criticalIssues: result.criticalIssues,
      recommendations: result.recommendations,
    };
  }

  _runConsistency(project) {
    if (!this.consistencyScorer) {
      return { summary: 'ConsistencyScorer not available' };
    }
    const result = this.consistencyScorer.scoreAll(project.id);
    return {
      summary: `الاتساق الإجمالي: ${result.averageConsistency}/1.0${
        result.blocked ? ' — محظور' : ' — مقبول'
      }`,
      averageConsistency: result.averageConsistency,
      blocked: result.blocked,
      pairs: result.pairs,
      failedPairs: result.failedDetails,
    };
  }

  _runRecommendations(project) {
    if (!this.recommendationEngine) {
      return { summary: 'RecommendationEngine not available' };
    }
    const result = this.recommendationEngine.generateAll(project.id);
    return {
      summary: `${result.totalRecommendations} توصية — توفير مقدر ${result.savings?.toLocaleString()} ر.س`,
      totalRecommendations: result.totalRecommendations,
      highPriority: result.highPriority?.length || 0,
      mediumPriority: result.mediumPriority?.length || 0,
      lowPriority: result.lowPriority?.length || 0,
      estimatedSavings: result.savings,
      categories: result.sections,
    };
  }

  _decisionSummary(project) {
    if (!this.decisionEngine) {
      return { summary: 'DecisionEngine not available' };
    }
    const stats = this.decisionEngine.getStats();
    const log = this.decisionEngine.getDecisionLog(project.id);

    return {
      summary: `${stats.totalDecisions} قرار — ${stats.approvalRate}% قبول`,
      totalDecisions: stats.totalDecisions,
      approved: stats.approved,
      rejected: stats.rejected,
      approvalRate: stats.approvalRate,
      latestDecisions: (log || []).slice(-5).map(d => ({
        verdict: d.verdict,
        criticalIssues: d.criticalIssues?.length || 0,
        timestamp: d.timestamp,
      })),
    };
  }

  _riskCostSummary(project) {
    const cost = project.cost || {};
    const risk = project.risk || {};

    const totalCost = cost.totalCost || 0;
    const riskLevel = risk.overallRisk || risk.level || 0;
    const contingency = totalCost * riskLevel;

    return {
      summary: `التكلفة: ${totalCost.toLocaleString()} ر.س — المخاطر: ${Math.round(riskLevel * 100)}% — احتياطي: ${Math.round(contingency).toLocaleString()} ر.س`,
      totalCost,
      costBreakdown: cost.breakdown || cost.categories || [],
      riskLevel,
      recommendedContingency: Math.round(contingency),
      riskDistribution: risk.risks || risk.items || [],
    };
  }

  _integrationSuggestions(project) {
    const suggestions = [
      {
        component: 'Digital Twin',
        benefit: 'مزامنة فورية بين UPM وجميع المخرجات',
        effort: 'medium',
        priority: 'high',
      },
      {
        component: 'Real-time Sync',
        benefit: 'تحديث مباشر عند تغيير أي عنصر',
        effort: 'high',
        priority: 'medium',
      },
      {
        component: 'External API Gateway',
        benefit: 'ربط مع أنظمة خارجية (ERP, BIM)',
        effort: 'high',
        priority: 'low',
      },
      {
        component: 'Automated Testing Pipeline',
        benefit: 'اختبار تلقائي لجميع المكونات',
        effort: 'medium',
        priority: 'high',
      },
      {
        component: 'Multi-language Support',
        benefit: 'دعم الإنجليزية والعربية بطلاقة',
        effort: 'low',
        priority: 'medium',
      },
    ];

    return {
      summary: `${suggestions.length} اقتراح تكامل مستقبلي`,
      suggestions: suggestions.sort((a, b) => {
        const pri = { high: 3, medium: 2, low: 1 };
        return pri[b.priority] - pri[a.priority];
      }),
    };
  }

  _acepCompletion(project) {
    // Calculate ACEP completion percentage
    const categories = {
      'AI Core': ['BOQ Engine', 'Vision AI', 'Navigation AI', 'Cost AI', 'Schedule AI', 'Risk AI'],
      'Validation': ['SemanticValidator', 'BOQAuditor', 'CrossModelValidator', 'UnifiedConfidenceEngine'],
      'Knowledge': ['EngineeringKnowledgeBase', 'KnowledgeGraph', 'EngineeringGraph'],
      'Integration': ['Orchestrator', 'EDL', 'DigitalTwin', 'PerformanceLayer'],
      'Advanced': ['EngineeringDecisionEngine', 'DecisionGraph', 'ExplainableAI', 'ConsistencyScorer',
                   'DependencyEngine', 'AutomaticRecalculation', 'EngineeringMemory',
                   'AISelfReview', 'RecommendationEngine', 'MaturityMetrics', 'FinalReport'],
    };

    const categoryScores = {};
    let totalImplemented = 0;
    let totalComponents = 0;

    for (const [cat, components] of Object.entries(categories)) {
      let implemented = 0;
      for (const comp of components) {
        const key = comp.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
        const checkKey = comp === 'BOQ Engine' ? 'boq'
          : comp === 'Vision AI' ? 'vision'
          : comp === 'Navigation AI' ? 'navigation'
          : comp === 'Cost AI' ? 'cost'
          : comp === 'Schedule AI' ? 'schedule'
          : comp === 'Risk AI' ? 'risk'
          : key;

        if (project[checkKey] || this[checkKey] || project[comp] || this[comp]) {
          implemented++;
        }
      }
      const pct = Math.round((implemented / components.length) * 100);
      categoryScores[cat] = { implemented, total: components.length, percentage: pct };
      totalImplemented += implemented;
      totalComponents += components.length;
    }

    const overall = Math.round((totalImplemented / totalComponents) * 100);

    return {
      summary: `ACEP اكتمال: ${overall}% (${totalImplemented}/${totalComponents} مكون)`,
      overall,
      implemented: totalImplemented,
      total: totalComponents,
      categories: categoryScores,
    };
  }

  _lessonsLearned(project) {
    const lessons = [];

    // From learning feedback
    if (this.learningFeedback) {
      const log = this.learningFeedback.getLog(project.id) || [];
      if (log.length > 0) {
        const rejectReasons = log.filter(e => e.decisionType === 'reject').map(e => e.reason);
        if (rejectReasons.length > 0) {
          lessons.push({
            type: 'rejection_pattern',
            message: `${rejectReasons.length} رفض — أكثر سبب متكرر: "${rejectReasons[0]}"`,
            count: rejectReasons.length,
          });
        }
      }
    }

    // From engineering memory similar projects
    if (this.engineeringMemory) {
      const similar = this.engineeringMemory.findSimilarProjects({ type: project.getEffective?.('type').value });
      for (const s of similar) {
        for (const lesson of s.lessons || []) {
          lessons.push({
            type: 'previous_experience',
            message: `من مشروع ${s.name}: ${lesson}`,
            project: s.name,
          });
        }
      }
    }

    return {
      summary: `${lessons.length} درس مستفاد`,
      lessons,
    };
  }

  _sectionTitle(key) {
    const titles = {
      executiveSummary: 'الملخص التنفيذي',
      reuseAnalysis: 'تحليل إعادة الاستخدام',
      unusedComponents: 'المكونات غير المستخدمة',
      maturity: 'تقييم النضج',
      selfReview: 'المراجعة الذاتية',
      consistency: 'تقرير الاتساق',
      recommendations: 'تأثير التوصيات',
      decisions: 'ملخص القرارات',
      riskCost: 'ملخص المخاطر والتكلفة',
      integrationSuggestions: 'اقتراحات التكامل',
      acepCompletion: 'اكتمال ACEP',
      lessonsLearned: 'الدروس المستفادة',
    };
    return titles[key] || key;
  }

  _collectScores(sections) {
    const scores = {};
    for (const [key, section] of Object.entries(sections)) {
      if (section && typeof section.score === 'number') {
        scores[key] = section.score;
      } else if (section?.overallScore !== undefined) {
        scores[key] = section.overallScore;
      } else if (section?.averageConsistency !== undefined) {
        scores[key] = Math.round(section.averageConsistency * 100);
      }
    }
    return scores;
  }

  _overallScore(sections) {
    const scores = Object.values(this._collectScores(sections)).filter(s => typeof s === 'number' && s > 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((s, sc) => s + sc, 0) / scores.length);
  }

  getHistory(projectId) {
    if (projectId) return this._reportHistory.filter(r => r.projectId === projectId);
    return this._reportHistory;
  }

  getStats() {
    const all = this._reportHistory;
    return {
      totalReports: all.length,
      averageScore: all.length > 0
        ? Math.round(all.reduce((s, r) => s + r.overallScore, 0) / all.length)
        : 0,
      highestScore: all.length > 0 ? Math.max(...all.map(r => r.overallScore)) : 0,
      lowestScore: all.length > 0 ? Math.min(...all.map(r => r.overallScore)) : 0,
    };
  }
}

module.exports = FinalReport;
