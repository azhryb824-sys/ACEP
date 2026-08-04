/**
 * ACEP Maturity Metrics
 *
 * Scores the ACEP system maturity across 10 dimensions:
 *   1. Architecture (modularity, decoupling, extensibility)
 *   2. Collaboration (cross-model integration quality)
 *   3. Decision Quality (reasonableness, traceability)
 *   4. Consistency (cross-model agreement)
 *   5. Data Integrity (completeness, accuracy)
 *   6. Knowledge Utilization (KB usage rate)
 *   7. Model Reuse (component reuse rate)
 *   8. Performance (latency, throughput)
 *   9. Maintainability (code quality, test coverage)
 *   10. Scalability (horizontal scaling readiness)
 */
class MaturityMetrics {
  constructor(options = {}) {
    this.edl = options.edl || null;
    this.consistencyScorer = options.consistencyScorer || null;
    this.decisionEngine = options.decisionEngine || null;
    this.recommendationEngine = options.recommendationEngine || null;
    this.engineeringMemory = options.engineeringMemory || null;
    this.selfReview = options.selfReview || null;
    this.validationEngine = options.validationEngine || null;
    this._metricHistory = [];
  }

  /**
   * Calculate all 10 maturity dimensions for a project.
   */
  calculate(projectId) {
    const project = this.edl?.getProject(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    const dimensions = {};

    dimensions.architecture = this._scoreArchitecture(project);
    dimensions.collaboration = this._scoreCollaboration(project);
    dimensions.decisionQuality = this._scoreDecisionQuality(project);
    dimensions.consistency = this._scoreConsistency(project);
    dimensions.dataIntegrity = this._scoreDataIntegrity(project);
    dimensions.knowledgeUtilization = this._scoreKnowledgeUtilization(project);
    dimensions.modelReuse = this._scoreModelReuse(project);
    dimensions.performance = this._scorePerformance(project);
    dimensions.maintainability = this._scoreMaintainability(project);
    dimensions.scalability = this._scoreScalability(project);

    // Aggregate
    const scores = Object.values(dimensions).map(d => d.score);
    const totalScore = Math.round(scores.reduce((s, sc) => s + sc, 0) / scores.length);

    const result = {
      projectId,
      timestamp: new Date().toISOString(),
      totalScore,
      level: this._level(totalScore),
      dimensions,
      strengths: Object.entries(dimensions)
        .filter(([, d]) => d.score >= 80)
        .map(([k, d]) => ({ dimension: k, score: d.score, label: d.label })),
      weaknesses: Object.entries(dimensions)
        .filter(([, d]) => d.score < 60)
        .map(([k, d]) => ({ dimension: k, score: d.score, label: d.label, recommendations: d.recommendations })),
      summary: this._buildSummary(dimensions, totalScore),
    };

    if (this.edl) {
      project.traceEvent('maturity_calculated', 'MaturityMetrics', {
        totalScore,
        level: result.level,
      });
    }

    this._metricHistory.push(result);
    return result;
  }

  /**
   * Track maturity trend over multiple projects.
   */
  trend(limit = 10) {
    const recent = this._metricHistory.slice(-limit);
    return {
      totalMeasurements: recent.length,
      scores: recent.map(r => ({
        projectId: r.projectId,
        timestamp: r.timestamp,
        totalScore: r.totalScore,
        level: r.level,
      })),
      average: recent.length > 0
        ? Math.round(recent.reduce((s, r) => s + r.totalScore, 0) / recent.length)
        : 0,
      trend: recent.length >= 2
        ? (recent[recent.length - 1].totalScore - recent[0].totalScore)
        : 0,
    };
  }

  /**
   * Compare maturity across projects.
   */
  compare(projectIds) {
    const results = projectIds.map(id => {
      const m = this._metricHistory.filter(r => r.projectId === id).pop();
      return m || null;
    }).filter(Boolean);

    if (results.length === 0) return { ok: false, error: 'No maturity data for given projects' };

    const max = Math.max(...results.map(r => r.totalScore));
    const min = Math.min(...results.map(r => r.totalScore));

    return {
      projects: results.map(r => ({
        projectId: r.projectId,
        score: r.totalScore,
        level: r.level,
        timestamp: r.timestamp,
      })),
      average: Math.round(results.reduce((s, r) => s + r.totalScore, 0) / results.length),
      best: results.find(r => r.totalScore === max),
      worst: results.find(r => r.totalScore === min),
      gap: max - min,
    };
  }

  _scoreArchitecture(project) {
    let score = 50;

    // Check modularity: presence of key independent modules
    const modules = ['boq', 'vision', 'navigation', 'cost', 'schedule', 'risk', 'orchestrator'];
    const present = modules.filter(m => project[m] || (project[m] !== undefined)).length;
    score += (present / modules.length) * 30;

    // Check integration via EDL
    if (this.edl) score += 10;

    // Check graph usage
    if (project.engineeringGraph || project.knowledgeGraph) score += 10;

    return {
      score: Math.round(score),
      label: 'النظام المعماري',
      details: { modulesPresent: present, totalModules: modules.length },
      recommendations: score < 70 ? ['زيادة الفصل بين المكونات', 'توحيد واجهات API'] : [],
    };
  }

  _scoreCollaboration(project) {
    let score = 40;
    const pairs = [
      ['upm', 'boq'], ['boq', 'vision'], ['vision', 'nav'],
      ['nav', 'cost'], ['cost', 'schedule'], ['schedule', 'risk'],
    ];

    const connectedPairs = pairs.filter(([a, b]) => project[a] && project[b]).length;
    score += (connectedPairs / pairs.length) * 40;

    // Use consistency scorer for collaboration quality
    if (this.consistencyScorer) {
      const minCons = this.consistencyScorer.minConsistency(project.id);
      score += minCons * 20;
    }

    return {
      score: Math.round(score),
      label: 'التعاون بين النماذج',
      details: { connectedPairs, totalPairs: pairs.length },
      recommendations: score < 60 ? ['تحسين الربط بين النماذج المختلفة', 'تفعيل Consistency Scorer'] : [],
    };
  }

  _scoreDecisionQuality(project) {
    let score = 40;

    if (this.decisionEngine) {
      const stats = this.decisionEngine.getStats();
      if (stats.totalDecisions > 0) {
        score += 20;
        const approvalRate = stats.approvalRate;
        // Too high or too low approval rate may indicate issues
        if (approvalRate > 30 && approvalRate < 95) score += 15;
      }
    }

    if (this.engineeringMemory) {
      const memStats = this.engineeringMemory.getStats();
      if (memStats.totalDecisions > 5) score += 15;
      if (memStats.totalReferences > 0) score += 10;
    }

    return {
      score: Math.round(Math.min(100, score)),
      label: 'جودة القرارات',
      details: { hasDecisionEngine: !!this.decisionEngine, hasMemory: !!this.engineeringMemory },
      recommendations: score < 60 ? ['تفعيل Engineering Decision Engine', 'تسجيل جميع القرارات مع الأسباب'] : [],
    };
  }

  _scoreConsistency(project) {
    let score = 50;

    if (this.consistencyScorer) {
      const history = this.consistencyScorer.getHistory(project.id);
      if (history.length > 0) {
        const last = history[history.length - 1];
        score = Math.round(last.averageConsistency * 100);
      }
    } else if (project.consistency) {
      score = Math.round((project.consistency.score || project.consistency || 0.5) * 100);
    }

    // Cross-model validation bonus
    if (project.crossModelValidator) score += 10;

    return {
      score: Math.min(100, score),
      label: 'الاتساق',
      details: { consistencyScore: score },
      recommendations: score < 70 ? ['تشغيل Consistency Scorer على كل مشروع', 'مراجعة الفروقات بين النماذج'] : [],
    };
  }

  _scoreDataIntegrity(project) {
    let score = 50;
    const checks = [];

    // BOQ completeness
    if (project.boq?.items?.length > 0) {
      const withCost = project.boq.items.filter(i => i.unitCost > 0 || i.totalCost > 0).length;
      const costPct = withCost / project.boq.items.length;
      if (costPct > 0.8) score += 15;
      checks.push(`BOQ cost completeness: ${Math.round(costPct * 100)}%`);
    }

    // Vision data
    if (project.vision?.images?.length > 0 || project.vision?.generationResults?.length > 0) {
      score += 10;
      checks.push('Vision data present');
    }

    // Navigation data
    if (project.navigation?.elements?.length > 0) {
      score += 10;
      checks.push('Navigation data present');
    }

    // Cost data
    if (project.cost?.totalCost > 0) {
      score += 10;
      checks.push('Cost data present');
    }

    // EDL trace
    const traceCount = this.edl?.listEvents?.(project.id)?.length || 0;
    if (traceCount > 20) {
      score += 10;
      checks.push(`Trace events: ${traceCount}`);
    }

    return {
      score: Math.min(100, score),
      label: 'تكامل البيانات',
      details: { checks },
      recommendations: score < 70 ? ['تأكيد اكتمال جميع بيانات الإدخال', 'تفعيل EDL للتتبع'] : [],
    };
  }

  _scoreKnowledgeUtilization(project) {
    let score = 30;

    // Check knowledge base usage
    if (project.knowledgeBase || project.engineeringKnowledgeBase) score += 20;

    // Check if recommendations use KB
    if (this.recommendationEngine) {
      const history = this.recommendationEngine.getHistory(project.id);
      if (history.length > 0) {
        const kbSourced = history.flatMap(h => h.recommendations || [])
          .filter(r => r.source === 'engineering_kb' || r.source === 'knowledge_base').length;
        if (kbSourced > 0) score += Math.min(20, kbSourced * 5);
      }
    }

    // EngineeringGraph usage
    if (project.engineeringGraph) score += 15;

    // KnowledgeGraph usage
    if (project.knowledgeGraph) score += 15;

    return {
      score: Math.min(100, score),
      label: 'استخدام المعرفة',
      details: { hasKB: !!(project.knowledgeBase || project.engineeringKnowledgeBase) },
      recommendations: score < 60 ? ['تفعيل قاعدة المعرفة الهندسية', 'ربط التوصيات بقاعدة المعرفة'] : [],
    };
  }

  _scoreModelReuse(project) {
    let score = 40;

    // Count unique components reused
    const components = [
      'orchestrator', 'engineeringGraph', 'knowledgeGraph',
      'semanticValidator', 'crossModelValidator', 'confidenceEngine',
      'boqAuditor', 'learningFeedback', 'digitalTwin', 'performanceLayer',
    ];
    const reused = components.filter(c => project[c] || (c !== undefined && project[c] !== null)).length;
    score += (reused / components.length) * 40;

    // Check if orchestrator reuses sub-modules
    if (this.edl) score += 10;

    return {
      score: Math.round(score),
      label: 'إعادة استخدام المكونات',
      details: { componentsReused: reused, totalComponents: components.length },
      recommendations: score < 60 ? ['تغليف المكونات كوحدات مستقلة', 'إنشاء مكتبة مكونات قابلة لإعادة الاستخدام'] : [],
    };
  }

  _scorePerformance(project) {
    let score = 50;

    // Check if performance layer is active
    if (project.performanceLayer || project.performance) score += 20;

    // Cache usage
    if (project.cache) score += 10;

    // Queue system
    if (project.queue || project.backgroundQueue) score += 10;

    // Stream processing
    if (project.stream) score += 10;

    return {
      score: Math.round(score),
      label: 'الأداء',
      details: { hasPerformanceLayer: !!(project.performanceLayer || project.performance) },
      recommendations: score < 60 ? ['تفعيل Performance Layer', 'إضافة طبقة تخزين مؤقت (Cache)'] : [],
    };
  }

  _scoreMaintainability(project) {
    let score = 50;

    // Code organization: check for modular file structure
    const hasConstants = project.sharedConstants || project.constants;
    const hasConfig = project.config || project.settings;

    if (hasConstants) score += 15;
    if (hasConfig) score += 10;
    if (this.edl) score += 10; // EDL provides traceability

    // Check for knowledge separation
    if (project.knowledgeBase || project.engineeringKnowledgeBase) score += 15;

    return {
      score: Math.round(score),
      label: 'قابلية الصيانة',
      details: { hasConstants: !!hasConstants, hasConfig: !!hasConfig },
      recommendations: score < 60 ? ['فصل المعرفة عن المنطق', 'توثيق الواجهات', 'إضافة shared-constants.js'] : [],
    };
  }

  _scoreScalability(project) {
    let score = 40;

    // Check microservice readiness
    if (project.queue || project.backgroundQueue) score += 20;
    if (project.cache || project.modelCache) score += 15;
    if (project.stream || project.streamManager) score += 15;

    // EDL supports async processing
    if (this.edl) score += 10;

    return {
      score: Math.round(score),
      label: 'قابلية التوسع',
      details: { hasQueue: !!(project.queue || project.backgroundQueue), hasCache: !!(project.cache || project.modelCache) },
      recommendations: score < 60 ? ['تفعيل Background Queue', 'إضافة Model Cache', 'تفعيل Stream Manager'] : [],
    };
  }

  _level(score) {
    if (score >= 90) return 'Optimizing';
    if (score >= 75) return 'Managed';
    if (score >= 60) return 'Defined';
    if (score >= 40) return 'Repeatable';
    return 'Initial';
  }

  _buildSummary(dimensions, totalScore) {
    const labels = Object.entries(dimensions).map(([k, d]) => `  ${d.label}: ${d.score}/100`).join('\n');
    return `ACEP Maturity Level: ${this._level(totalScore)} (${totalScore}/100)\n${labels}`;
  }

  getHistory(projectId) {
    if (projectId) return this._metricHistory.filter(r => r.projectId === projectId);
    return this._metricHistory;
  }

  getStats() {
    return {
      totalMeasurements: this._metricHistory.length,
      projectsMeasured: new Set(this._metricHistory.map(r => r.projectId)).size,
      averageScore: this._metricHistory.length > 0
        ? Math.round(this._metricHistory.reduce((s, r) => s + r.totalScore, 0) / this._metricHistory.length)
        : 0,
      currentLevel: this._metricHistory.length > 0
        ? this._level(this._metricHistory[this._metricHistory.length - 1].totalScore)
        : 'Not measured',
    };
  }
}

module.exports = MaturityMetrics;
