/**
 * ACEP AI Self Review
 *
 * Post-project root cause analysis across:
 *   - Model performance (all AI models)
 *   - Data quality (UPM, images, navigation, BOQ)
 *   - Training effectiveness
 *   - Prompt quality
 *   - Knowledge base coverage
 *   - Integration points
 *   - Consistency scores
 *   - Confidence distribution
 *
 * Reuses:
 *   - EDL trace log
 *   - LearningFeedbackEngine rejection analysis
 *   - CrossModelValidator results
 *   - SemanticValidator results
 *   - Benchmark comparison
 *   - ValidationEngine reports
 *   - EngineeringMemory decisions
 *   - ExplainableAI explanations
 *   - SelfAuditAgent (TypeScript stub in packages/agents/self-audit)
 */
class AISelfReview {
  constructor(options = {}) {
    this.edl = options.edl || null;
    this.learningFeedback = options.learningFeedback || null;
    this.crossModelValidator = options.crossModelValidator || null;
    this.semanticValidator = options.semanticValidator || null;
    this.validationEngine = options.validationEngine || null;
    this.engineeringMemory = options.engineeringMemory || null;
    this.explainableAI = options.explainableAI || null;
    this.selfAuditAgent = options.selfAuditAgent || null;
    this.benchmark = options.benchmark || null;
    this._reviewHistory = [];
  }

  /**
   * Run a full self-review for a project.
   */
  review(projectId, options = {}) {
    const project = this.edl?.getProject(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    const deep = options.deep || false;

    const sections = {};

    // Section 1: Model Performance
    sections.modelPerformance = this._reviewModels(project);

    // Section 2: Data Quality
    sections.dataQuality = this._reviewDataQuality(project);

    // Section 3: Decision Quality
    sections.decisionQuality = this._reviewDecisions(project);

    // Section 4: Consistency
    sections.consistency = this._reviewConsistency(project);

    // Section 5: Confidence Analysis
    sections.confidence = this._reviewConfidence(project);

    // Section 6: Knowledge Base Coverage
    sections.knowledgeBase = this._reviewKnowledgeBase(project);

    // Section 7: Integration Health
    sections.integration = this._reviewIntegration(project);

    // Section 8: Prompt Quality
    sections.promptQuality = this._reviewPrompts(project);

    // Section 9: Benchmark Comparison (deep only)
    if (deep && this.benchmark) {
      sections.benchmark = this._reviewBenchmark(project);
    }

    // Section 10: Root Cause Analysis
    sections.rootCauses = this._findRootCauses(project);

    // Overall Score
    const scores = [];
    for (const [, section] of Object.entries(sections)) {
      if (section && typeof section.score === 'number') scores.push(section.score);
    }
    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((s, sc) => s + sc, 0) / scores.length)
      : 50;

    const criticalIssues = [];
    const warnings = [];
    const recommendations = [];

    for (const [sectionName, section] of Object.entries(sections)) {
      if (!section) continue;
      if (section.criticalIssues) criticalIssues.push(...section.criticalIssues.map(i => ({ section: sectionName, ...i })));
      if (section.warnings) warnings.push(...section.warnings.map(i => ({ section: sectionName, ...i })));
      if (section.recommendations) recommendations.push(...section.recommendations.map(r => ({ section: sectionName, ...r })));
    }

    const review = {
      projectId,
      timestamp: new Date().toISOString(),
      overallScore,
      overall: this._grade(overallScore),
      sections,
      criticalIssues,
      warnings,
      recommendations,
      deep,
      summary: this._buildReviewSummary(sections, overallScore, criticalIssues),
    };

    // Trace
    if (this.edl) {
      project.traceEvent('self_review_completed', 'AISelfReview', {
        overallScore,
        sectionsReviewed: Object.keys(sections).length,
        criticalIssues: criticalIssues.length,
      });
    }

    this._reviewHistory.push(review);
    return review;
  }

  /**
   * Compare two reviews to see improvement.
   */
  compare(projectIdA, projectIdB) {
    const reviewA = this._reviewHistory.find(r => r.projectId === projectIdA);
    const reviewB = this._reviewHistory.find(r => r.projectId === projectIdB);

    if (!reviewA || !reviewB) {
      return { ok: false, error: 'One or both reviews not found' };
    }

    const deltas = {};
    for (const [key, sectionA] of Object.entries(reviewA.sections)) {
      const sectionB = reviewB.sections[key];
      if (sectionB && typeof sectionA.score === 'number' && typeof sectionB.score === 'number') {
        deltas[key] = sectionB.score - sectionA.score;
      }
    }

    return {
      projectA: projectIdA,
      projectB: projectIdB,
      scoreA: reviewA.overallScore,
      scoreB: reviewB.overallScore,
      delta: reviewB.overallScore - reviewA.overallScore,
      improvement: reviewB.overallScore > reviewA.overallScore,
      sectionDeltas: deltas,
      summary: `النتيجة الإجمالية: ${reviewA.overallScore} ← ${reviewB.overallScore} (${reviewB.overallScore - reviewA.overallScore > 0 ? '+' : ''}${reviewB.overallScore - reviewA.overallScore})`,
    };
  }

  _reviewModels(project) {
    const models = {
      'BOQ Engine': project.boq ? true : false,
      'Vision AI': project.vision ? true : false,
      'Navigation AI': project.navigation ? true : false,
      'Cost AI': project.cost ? true : false,
      'Schedule AI': project.schedule ? true : false,
      'Risk AI': project.risk ? true : false,
    };

    const activeCount = Object.values(models).filter(Boolean).length;
    const totalCount = Object.keys(models).length;

    return {
      score: Math.round((activeCount / totalCount) * 100),
      models,
      activeCount,
      totalCount,
      criticalIssues: activeCount < 3 ? [{ message: `Only ${activeCount}/${totalCount} models active` }] : [],
      recommendations: activeCount < totalCount
        ? [{ message: `Activate inactive models: ${Object.entries(models).filter(([, v]) => !v).map(([k]) => k).join(', ')}` }]
        : [],
    };
  }

  _reviewDataQuality(project) {
    const issues = [];
    let score = 100;

    // Check EDL data completeness
    const trace = this.edl?.listEvents?.(project.id) || [];
    if (trace.length < 10) {
      issues.push({ severity: 'warning', message: `Only ${trace.length} trace events — may indicate data gaps` });
      score -= 10;
    }

    // Check data volume
    const boqItems = project.boq?.items?.length || 0;
    if (boqItems < 5) {
      issues.push({ severity: 'critical', message: `Only ${boqItems} BOQ items — insufficient for reasonable analysis` });
      score -= 25;
    }

    // Check for nulls in key fields
    if (project.boq?.items) {
      const nullCosts = project.boq.items.filter(i => i.unitCost === null || i.unitCost === undefined).length;
      if (nullCosts > boqItems * 0.3) {
        issues.push({ severity: 'warning', message: `${nullCosts}/${boqItems} items missing unit cost` });
        score -= 10;
      }
    }

    return {
      score: Math.max(0, score),
      dataCompleteness: `${trace.length} events, ${boqItems} BOQ items`,
      issues,
      criticalIssues: issues.filter(i => i.severity === 'critical'),
      warnings: issues.filter(i => i.severity === 'warning'),
      recommendations: issues.map(i => ({ message: i.message, severity: i.severity })),
    };
  }

  _reviewDecisions(project) {
    let score = 85;
    const issues = [];
    const recommendations = [];

    // Decision consistency
    if (this.engineeringMemory) {
      const decisions = this.engineeringMemory.getDecisions(project.id);
      if (decisions.length > 0) {
        const approveCount = decisions.filter(d => d.decision === 'approve' || d.type === 'approve').length;
        const rejectCount = decisions.filter(d => d.decision === 'reject' || d.type === 'reject').length;
        const total = decisions.length;

        if (rejectCount > approveCount * 2) {
          issues.push({ severity: 'warning', message: `${rejectCount}/${total} decisions were rejections — possible system conservatism` });
          score -= 10;
          recommendations.push({ message: 'Review rejection criteria — may be too strict' });
        }
        if (decisions.length > 0) {
          const withReason = decisions.filter(d => d.reason).length;
          if (withReason < total * 0.5) {
            issues.push({ severity: 'warning', message: `Only ${withReason}/${total} decisions have reasons` });
            score -= 5;
          }
        }
      }
    }

    // Decision throughput
    if (this.learningFeedback) {
      const log = this.learningFeedback.getLog(project.id) || [];
      if (log.length > 0) {
        const rejections = log.filter(e => e.decisionType === 'reject');
        if (rejections.length > 5) {
          recommendations.push({ message: `${rejections.length} rejections — cluster analysis recommended` });
        }
      }
    }

    return { score, issues, criticalIssues: issues.filter(i => i.severity === 'critical'), warnings: issues.filter(i => i.severity === 'warning'), recommendations };
  }

  _reviewConsistency(project) {
    let score = 80;

    // Use cross-model validator
    if (this.crossModelValidator) {
      const cv = this.crossModelValidator.runAll(project);
      if (cv && !cv.passed) {
        const failCount = cv.rules?.filter(r => !r.passed).length || 0;
        score -= failCount * 10;
      }
    }

    // Use semantic validator
    if (this.semanticValidator) {
      const sv = this.semanticValidator.validateProject(project.id);
      if (sv && !sv.passed) {
        const semanticFails = sv.semanticIssues?.filter(i => i.severity === 'error').length || 0;
        score -= semanticFails * 5;
      }
    }

    return {
      score: Math.max(0, score),
      criticalIssues: score < 50 ? [{ message: `Consistency score ${score}/100 — critical issues found` }] : [],
      recommendations: score < 70 ? [{ message: 'Improve cross-model consistency by aligning model outputs' }] : [],
    };
  }

  _reviewConfidence(project) {
    let score = 75;

    // Check confidence distribution
    if (project.confidence) {
      const overall = project.confidence.overall || 0;
      score = Math.round(overall * 100);
    }

    return {
      score: Math.max(0, score),
      criticalIssues: score < 40 ? [{ message: `Confidence score ${score} — very low` }] : [],
      recommendations: score < 60 ? [{ message: 'Review low-confidence outputs and improve model alignment' }] : [],
    };
  }

  _reviewKnowledgeBase(project) {
    let score = 85;
    const issues = [];

    // Check with SelfAuditAgent if available
    if (this.selfAuditAgent?.reviewKnowledgeBase) {
      try {
        const kbReview = this.selfAuditAgent.reviewKnowledgeBase(project);
        if (kbReview) {
          score = kbReview.score || score;
          if (kbReview.issues) issues.push(...kbReview.issues);
        }
      } catch (e) {
        // Agent not properly initialized
      }
    }

    return {
      score,
      issues,
      criticalIssues: issues.filter(i => i.severity === 'critical'),
      warnings: issues.filter(i => i.severity === 'warning'),
      recommendations: score < 70 ? [{ message: 'Expand knowledge base coverage for missing domains' }] : [],
    };
  }

  _reviewIntegration(project) {
    const integrations = [
      { name: 'UPM → BOQ', connected: !!(project.upm && project.boq) },
      { name: 'BOQ → Cost', connected: !!(project.boq && project.cost) },
      { name: 'Vision → Nav', connected: !!(project.vision && project.navigation) },
      { name: 'Cost → Schedule', connected: !!(project.cost && project.schedule) },
      { name: 'Schedule → Risk', connected: !!(project.schedule && project.risk) },
      { name: 'EDL Trace', connected: !!(this.edl && this.edl.listEvents) },
    ];

    const connected = integrations.filter(i => i.connected).length;
    const total = integrations.length;

    return {
      score: Math.round((connected / total) * 100),
      integrations,
      connectedCount: connected,
      totalCount: total,
      criticalIssues: connected < total * 0.5
        ? [{ message: `Only ${connected}/${total} integrations active` }]
        : [],
      recommendations: connected < total
        ? [{ message: `Connect missing integrations: ${integrations.filter(i => !i.connected).map(i => i.name).join(', ')}` }]
        : [],
    };
  }

  _reviewPrompts(project) {
    // Prompt quality assessment based on outputs
    let score = 80;
    const issues = [];

    const boqItems = project.boq?.items || [];
    if (boqItems.length > 0) {
      // Check if items have Arabic names consistently
      const arabicItems = boqItems.filter(i => /[\u0600-\u06FF]/.test(i.name || ''));
      if (arabicItems.length < boqItems.length * 0.5) {
        issues.push({ severity: 'warning', message: `Only ${arabicItems.length}/${boqItems.length} items have Arabic names` });
        score -= 10;
      }
    }

    return {
      score,
      issues,
      criticalIssues: issues.filter(i => i.severity === 'critical'),
      warnings: issues.filter(i => i.severity === 'warning'),
      recommendations: score < 70 ? [{ message: 'Update AI prompts to enforce Arabic output consistency' }] : [],
    };
  }

  _reviewBenchmark(project) {
    if (!this.benchmark) return null;
    try {
      const benchResult = this.benchmark.runProject(project.id);
      if (!benchResult) return { score: 50, note: 'Benchmark run incomplete' };

      const score = benchResult.score || benchResult.overall || 50;
      return {
        score: Math.round(score),
        benchmark: benchResult,
        recommendations: score < 70 ? [{ message: 'Project below benchmark average — review weak areas' }] : [],
      };
    } catch (e) {
      return { score: 50, error: e.message };
    }
  }

  _findRootCauses(project) {
    const causes = [];
    const trace = this.edl?.listEvents?.(project.id) || [];

    // Find most common error patterns
    const errors = trace.filter(e => e.type === 'error' || (e.details && e.details.error));
    const errorCountByModule = {};
    for (const err of errors) {
      const mod = err.module || 'unknown';
      errorCountByModule[mod] = (errorCountByModule[mod] || 0) + 1;
    }

    for (const [mod, count] of Object.entries(errorCountByModule)) {
      if (count > 2) {
        causes.push({
          module: mod,
          type: 'error_frequency',
          severity: 'high',
          message: `Module "${mod}" has ${count} errors — potential root cause`,
          occurrences: count,
        });
      }
    }

    // Check data gaps
    if (!project.boq?.items?.length) {
      causes.push({ module: 'BOQ', type: 'missing_data', severity: 'critical', message: 'No BOQ items found' });
    }
    if (!project.vision) {
      causes.push({ module: 'Vision AI', type: 'missing_data', severity: 'high', message: 'No vision data' });
    }

    return {
      totalCauses: causes.length,
      causes,
      mostFrequentModule: Object.entries(errorCountByModule).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    };
  }

  _buildReviewSummary(sections, overallScore, criticalIssues) {
    const sectionSummary = Object.entries(sections)
      .filter(([, s]) => s && typeof s.score === 'number')
      .map(([k, s]) => `${k}: ${s.score}`)
      .join(', ');

    let msg = `مراجعة AI: النتيجة الإجمالية ${overallScore}/100`;
    if (criticalIssues.length > 0) {
      msg += ` — ${criticalIssues.length} مشكلة حرجة`;
    } else if (overallScore >= 80) {
      msg += ' — أداء ممتاز';
    } else if (overallScore >= 60) {
      msg += ' — أداء مقبول مع بعض التحسينات';
    } else {
      msg += ' — يحتاج تحسين';
    }
    msg += `\nالتفاصيل: ${sectionSummary}`;
    return msg;
  }

  _grade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  getHistory(projectId) {
    if (projectId) return this._reviewHistory.filter(r => r.projectId === projectId);
    return this._reviewHistory;
  }

  getStats() {
    const all = this._reviewHistory;
    return {
      totalReviews: all.length,
      averageScore: all.length > 0 ? Math.round(all.reduce((s, r) => s + r.overallScore, 0) / all.length) : 0,
      projectsReviewed: new Set(all.map(r => r.projectId)).size,
    };
  }
}

module.exports = AISelfReview;
