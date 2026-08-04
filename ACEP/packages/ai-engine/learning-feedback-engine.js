/**
 * ACEP Learning Feedback Engine
 *
 * Records WHY decisions were made, not just the results.
 * Tracks reasons for accept/reject/modify on all AI outputs
 * and feeds structured feedback back into ContinuousLearner.
 */
const path = require('path');

const DECISION_TYPES = {
  APPROVE: 'approve',
  REJECT: 'reject',
  MODIFY: 'modify',
  SKIP: 'skip',
  OVERRIDE: 'override',
};

const FEEDBACK_SOURCES = {
  USER: 'user',
  VALIDATION_ENGINE: 'validation_engine',
  SEMANTIC_VALIDATOR: 'semantic_validator',
  BOQ_AUDITOR: 'boq_auditor',
  CONFIDENCE_ENGINE: 'confidence_engine',
  ORCHESTRATOR: 'orchestrator',
  BENCHMARK: 'benchmark',
};

class LearningFeedbackEngine {
  constructor(edl, trainingBridge) {
    this.edl = edl;
    this.trainingBridge = trainingBridge;
    this._feedbackLog = [];
    this._decisionStore = [];
    this.uets = null;
  }

  setUETS(uets) {
    this.uets = uets;
  }

  recordDecision(projectId, options) {
    const { module, decisionType, reason, context, confidence, userAction } = options;

    const entry = {
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      projectId,
      timestamp: new Date().toISOString(),
      module: module || 'unknown',
      decisionType: decisionType || DECISION_TYPES.SKIP,
      reason: reason || '',
      context: context || {},
      confidence: confidence || 0,
      userAction: userAction || null,
      source: options.source || FEEDBACK_SOURCES.USER,
    };

    this._decisionStore.push(entry);

    if (this.uets && typeof this.uets.enqueueFeedback === 'function') {
      try {
        this.uets.enqueueFeedback({
          type: 'decision',
          projectId,
          module,
          decisionType,
          reason,
          confidence,
          source: entry.source,
          timestamp: entry.timestamp,
        });
      } catch (e) { /* non-fatal */ }
    }

    const project = this.edl.getProject(projectId);
    if (project) {
      project.traceEvent('learning_feedback', module, {
        decision: decisionType,
        reason,
        contextKeys: Object.keys(context),
      });
    }

    return entry;
  }

  recordApproval(projectId, module, itemId, options = {}) {
    return this.recordDecision(projectId, {
      module,
      decisionType: DECISION_TYPES.APPROVE,
      reason: options.reason || 'Approved by default',
      context: { itemId, ...options.context },
      confidence: options.confidence || 0.8,
      source: options.source || FEEDBACK_SOURCES.USER,
    });
  }

  recordRejection(projectId, module, itemId, reason, options = {}) {
    return this.recordDecision(projectId, {
      module,
      decisionType: DECISION_TYPES.REJECT,
      reason,
      context: { itemId, ...options.context },
      confidence: options.confidence || 0,
      source: options.source || FEEDBACK_SOURCES.USER,
    });
  }

  recordModification(projectId, module, itemId, changes, reason, options = {}) {
    return this.recordDecision(projectId, {
      module,
      decisionType: DECISION_TYPES.MODIFY,
      reason,
      context: { itemId, original: changes.original, modified: changes.modified, ...options.context },
      confidence: options.confidence || 0.5,
      source: options.source || FEEDBACK_SOURCES.USER,
    });
  }

  recordSkip(projectId, module, itemId, reason, options = {}) {
    return this.recordDecision(projectId, {
      module,
      decisionType: DECISION_TYPES.SKIP,
      reason,
      context: { itemId, ...options.context },
      confidence: 0,
      source: options.source || FEEDBACK_SOURCES.ORCHESTRATOR,
    });
  }

  processValidationResult(projectId, validationResult) {
    const project = this.edl.getProject(projectId);
    if (!project) return [];

    const decisions = [];

    if (validationResult && validationResult.semanticIssues) {
      for (const issue of validationResult.semanticIssues) {
        if (issue.severity === 'error') {
          const dec = this.recordDecision(projectId, {
            module: 'semantic_validator',
            decisionType: DECISION_TYPES.REJECT,
            reason: issue.message,
            context: { rule: issue.rule, severity: issue.severity },
            source: FEEDBACK_SOURCES.SEMANTIC_VALIDATOR,
          });
          decisions.push(dec);
        } else if (issue.severity === 'warning') {
          const dec = this.recordDecision(projectId, {
            module: 'semantic_validator',
            decisionType: DECISION_TYPES.MODIFY,
            reason: issue.message,
            context: { rule: issue.rule, severity: issue.severity },
            source: FEEDBACK_SOURCES.SEMANTIC_VALIDATOR,
          });
          decisions.push(dec);
        }
      }
    }

    return decisions;
  }

  processBenchmarkResult(projectId, benchmarkResult) {
    if (!benchmarkResult) return [];

    const decisions = [];

    if (benchmarkResult.models) {
      for (const [modelName, modelResult] of Object.entries(benchmarkResult.models)) {
        if (modelResult.error) {
          decisions.push(this.recordDecision(projectId, {
            module: modelName,
            decisionType: DECISION_TYPES.REJECT,
            reason: modelResult.error,
            context: { benchmarkProjectId: benchmarkResult.projectId },
            source: FEEDBACK_SOURCES.BENCHMARK,
          }));
        } else if (modelResult.accuracy !== undefined && modelResult.accuracy < 0.5) {
          decisions.push(this.recordDecision(projectId, {
            module: modelName,
            decisionType: DECISION_TYPES.MODIFY,
            reason: `Low accuracy: ${Math.round(modelResult.accuracy * 100)}%`,
            context: { accuracy: modelResult.accuracy, expected: modelResult.expected, actual: modelResult.detected || modelResult.estimatedCost },
            source: FEEDBACK_SOURCES.BENCHMARK,
          }));
        }
      }
    }

    return decisions;
  }

  getDecisions(projectId, module) {
    let filtered = this._decisionStore;
    if (projectId) filtered = filtered.filter(d => d.projectId === projectId);
    if (module) filtered = filtered.filter(d => d.module === module);
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getFeedbackSummary(projectId) {
    const decisions = projectId
      ? this._decisionStore.filter(d => d.projectId === projectId)
      : this._decisionStore;

    const byModule = {};
    const byDecision = {};

    for (const d of decisions) {
      if (!byModule[d.module]) byModule[d.module] = { total: 0, approves: 0, rejects: 0, modifies: 0, skips: 0 };
      byModule[d.module].total++;
      if (d.decisionType === DECISION_TYPES.APPROVE) byModule[d.module].approves++;
      if (d.decisionType === DECISION_TYPES.REJECT) byModule[d.module].rejects++;
      if (d.decisionType === DECISION_TYPES.MODIFY) byModule[d.module].modifies++;
      if (d.decisionType === DECISION_TYPES.SKIP) byModule[d.module].skips++;

      if (!byDecision[d.decisionType]) byDecision[d.decisionType] = 0;
      byDecision[d.decisionType]++;
    }

    const totalDecisions = decisions.length;
    const rejectRate = totalDecisions > 0
      ? Math.round(((byDecision[DECISION_TYPES.REJECT] || 0) / totalDecisions) * 100)
      : 0;

    return {
      projectId,
      totalDecisions,
      byModule,
      byDecision,
      rejectRate,
      topRejectedModules: Object.entries(byModule)
        .filter(([, s]) => s.rejects > 0)
        .sort(([, a], [, b]) => b.rejects - a.rejects)
        .slice(0, 5)
        .map(([mod, s]) => ({ module: mod, rejects: s.rejects, rate: Math.round((s.rejects / s.total) * 100) })),
    };
  }

  getTopRejectionReasons(projectId, limit = 10) {
    const decisions = projectId
      ? this._decisionStore.filter(d => d.projectId === projectId && d.decisionType === DECISION_TYPES.REJECT)
      : this._decisionStore.filter(d => d.decisionType === DECISION_TYPES.REJECT);

    const reasons = {};
    for (const d of decisions) {
      const key = d.reason.substring(0, 80);
      if (!reasons[key]) reasons[key] = { count: 0, modules: new Set() };
      reasons[key].count++;
      reasons[key].modules.add(d.module);
    }

    return Object.entries(reasons)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, limit)
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        modules: [...data.modules],
      }));
  }

  getStats() {
    const totalDecisions = this._decisionStore.length;
    const approves = this._decisionStore.filter(d => d.decisionType === DECISION_TYPES.APPROVE).length;
    const rejects = this._decisionStore.filter(d => d.decisionType === DECISION_TYPES.REJECT).length;
    const modifies = this._decisionStore.filter(d => d.decisionType === DECISION_TYPES.MODIFY).length;

    return {
      totalDecisions,
      approves,
      rejects,
      modifies,
      approvalRate: totalDecisions > 0 ? Math.round((approves / totalDecisions) * 100) : 0,
      rejectRate: totalDecisions > 0 ? Math.round((rejects / totalDecisions) * 100) : 0,
      uniqueModules: [...new Set(this._decisionStore.map(d => d.module))].length,
      topReasons: this.getTopRejectionReasons(null, 5),
      uetsFeedbackQueued: this.uets ? this.uets.getTrainingStats().feedbackQueue : 0,
    };
  }

  getUETSFeedback(limit = 50) {
    if (!this.uets) return { error: 'UETS not configured' };
    return this.uets.getTrainingHistory ? this.uets.getTrainingHistory(limit).filter(h => h.type === 'feedback') : [];
  }

  clear() {
    this._decisionStore = [];
    this._feedbackLog = [];
  }
}

module.exports = LearningFeedbackEngine;
