/**
 * ACEP Unified Confidence Engine
 *
 * Combines confidence scores across all AI models into a single
 * project-level confidence metric. Tracks individual model reliability
 * and provides weighted aggregation with uncertainty quantification.
 */
const path = require('path');

const MODEL_WEIGHTS = {
  projectProfiler: { weight: 0.10, category: 'understanding' },
  projectAnalyzer: { weight: 0.10, category: 'analysis' },
  quantityEstimator: { weight: 0.15, category: 'boq' },
  costEstimator: { weight: 0.15, category: 'cost' },
  scheduleOptimizer: { weight: 0.10, category: 'schedule' },
  riskAnalyzer: { weight: 0.08, category: 'risks' },
  qualityInspector: { weight: 0.07, category: 'quality' },
  visionAI: { weight: 0.10, category: 'vision' },
  navigation3D: { weight: 0.08, category: 'navigation' },
  boqEngine: { weight: 0.07, category: 'boq' },
};

const CONFIDENCE_THRESHOLDS = {
  critical: { min: 0.7, label: 'حرج' },
  high: { min: 0.5, label: 'عالي' },
  medium: { min: 0.3, label: 'متوسط' },
  low: { min: 0, label: 'منخفض' },
};

class UnifiedConfidenceEngine {
  constructor() {
    this._history = [];
    this._modelHistory = {};
  }

  evaluate(project) {
    if (!project) return { overall: 0, level: 'unknown', sources: [] };

    const sources = [];

    // BOQ
    sources.push(this._extractConfidence('boq', project.boq?.summary?.averageConfidence, 0));
    sources.push(this._extractConfidence('boq_items', this._avgItemConfidence(project.boq?.items), 0));

    // Cost
    sources.push(this._extractConfidence('cost', project.cost?.confidence, 0));
    sources.push(this._extractConfidence('cost_breakdown', this._costBreakdownConfidence(project.cost), 0));

    // Analysis
    sources.push(this._extractConfidence('analysis', project.predicted?.confidence, 0));

    // Schedule
    sources.push(this._extractConfidence('schedule', this._scheduleConfidence(project.schedule), 0));

    // Risks
    sources.push(this._extractConfidence('risks', this._riskConfidence(project.risks), 0));

    // Quality
    sources.push(this._extractConfidence('quality', project.quality?.qualityScore ? project.quality.qualityScore / 100 : 0, 0));

    // Vision
    sources.push(this._extractConfidence('vision', this._visionConfidence(project.vision), 0));

    // Navigation
    sources.push(this._extractConfidence('navigation', this._navigationConfidence(project.navigation), 0));

    // Profile
    sources.push(this._extractConfidence('profile', project.digitalProfile ? 0.7 : 0, 0));

    // Validation
    sources.push(this._extractConfidence('validation', project.validation?.passed ? 0.9 : 0.3, 0));

    // Active sources (have actual data)
    const active = sources.filter(s => s.value > 0);

    if (active.length === 0) {
      return { overall: 0, level: 'no_data', sources: [] };
    }

    // Weighted average using MODEL_WEIGHTS
    let weightedSum = 0;
    let totalWeight = 0;

    for (const source of active) {
      const weightConfig = MODEL_WEIGHTS[source.name] || { weight: 0.05, category: 'other' };
      const weight = weightConfig.weight;
      weightedSum += source.value * weight;
      totalWeight += weight;
    }

    const overall = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Apply penalty for missing critical modules
    const missingCritical = this._missingCriticalModules(project);
    const penalty = missingCritical * 0.05;

    const adjusted = Math.max(0, Math.min(1, overall - penalty));

    const result = {
      overall: Math.round(adjusted * 1000) / 1000,
      level: this._classify(adjusted),
      sources: active.map(s => ({
        ...s,
        level: this._classify(s.value),
      })),
      missingCriticalModules: missingCritical,
      timestamp: new Date().toISOString(),
      breakdown: {
        weighted: Math.round(overall * 1000) / 1000,
        penalty,
        adjusted,
      },
    };

    this._history.push({
      projectId: project.id,
      timestamp: result.timestamp,
      overall: result.overall,
      level: result.level,
      activeSources: active.length,
    });

    for (const source of active) {
      if (!this._modelHistory[source.name]) this._modelHistory[source.name] = [];
      this._modelHistory[source.name].push({ value: source.value, timestamp: result.timestamp });
    }

    return result;
  }

  combine(project, ...additionalResults) {
    const base = this.evaluate(project);
    if (!additionalResults || additionalResults.length === 0) return base;

    const extraSources = [];
    for (const result of additionalResults) {
      if (result.sources) {
        extraSources.push(...result.sources.map(s => ({
          ...s,
          value: s.value || s.score / 100 || 0,
          name: s.name || 'external',
        })));
      }
    }

    if (extraSources.length === 0) return base;

    const allSources = [...(base.sources || []), ...extraSources];
    let weightedSum = 0;
    let totalWeight = 0;

    for (const source of allSources) {
      const weight = source.weight || 0.05;
      weightedSum += source.value * weight;
      totalWeight += weight;
    }

    const combined = totalWeight > 0 ? weightedSum / totalWeight : base.overall;

    return {
      overall: Math.round(combined * 1000) / 1000,
      level: this._classify(combined),
      sources: allSources,
      baseResult: base,
      combined: true,
    };
  }

  _extractConfidence(name, value, defaultVal = 0) {
    const v = value !== null && value !== undefined && !isNaN(value) ? value : defaultVal;
    const weightConfig = MODEL_WEIGHTS[name] || { weight: 0.05, category: 'other' };
    return {
      name,
      value: Math.max(0, Math.min(1, v)),
      weight: weightConfig.weight,
      category: weightConfig.category,
    };
  }

  _avgItemConfidence(items) {
    if (!items || items.length === 0) return 0;
    return items.reduce((s, i) => s + (i.confidence || 0), 0) / items.length;
  }

  _costBreakdownConfidence(cost) {
    if (!cost) return 0;
    const fields = ['directCost', 'indirectCost', 'contingency', 'profit', 'totalCost'];
    const nonZero = fields.filter(f => cost[f] > 0).length;
    return nonZero / fields.length;
  }

  _scheduleConfidence(schedule) {
    if (!schedule) return 0;
    let score = 0;
    if (schedule.totalDuration > 0) score += 0.3;
    if (schedule.totalMonths > 0) score += 0.2;
    if (schedule.activities && schedule.activities.length > 0) score += 0.3;
    if (schedule.criticalPath && schedule.criticalPath.length > 0) score += 0.2;
    return score;
  }

  _riskConfidence(risks) {
    if (!risks) return 0;
    let score = 0;
    if (risks.risks && risks.risks.length > 0) score += 0.5;
    if (risks.overallRiskScore > 0) score += 0.3;
    if (risks.riskLevel) score += 0.2;
    return score;
  }

  _visionConfidence(vision) {
    if (!vision) return 0;
    let score = 0;
    if (vision.images && vision.images.length > 0) score += 0.25;
    if (vision.features) score += 0.25;
    if (vision.upmSnapshot) score += 0.25;
    if (vision.generationResults && vision.generationResults.length > 0) score += 0.25;
    return score;
  }

  _navigationConfidence(nav) {
    if (!nav) return 0;
    let score = 0;
    if (nav.spatialModel) score += 0.3;
    if (nav.elements && nav.elements.length > 0) score += 0.4;
    if (nav.overlays && nav.overlays.length > 0) score += 0.3;
    return score;
  }

  _missingCriticalModules(project) {
    let missing = 0;
    if (!project.boq || !project.boq.items || project.boq.items.length === 0) missing++;
    if (!project.cost || !project.cost.totalCost) missing++;
    if (!project.predicted || !project.predicted.confidence) missing++;
    if (!project.risks || !project.risks.risks || project.risks.risks.length === 0) missing++;
    return missing;
  }

  _classify(value) {
    for (const [level, threshold] of Object.entries(CONFIDENCE_THRESHOLDS)) {
      if (value >= threshold.min) return level;
    }
    return 'low';
  }

  getHistory(projectId) {
    if (projectId) return this._history.filter(h => h.projectId === projectId);
    return this._history;
  }

  getModelTrend(modelName, limit = 20) {
    const data = this._modelHistory[modelName];
    if (!data || data.length === 0) return { model: modelName, values: [], trend: 'stable' };

    const recent = data.slice(-limit);
    const values = recent.map(r => r.value);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const first = values[0];
    const last = values[values.length - 1];

    let trend = 'stable';
    if (last - first > 0.1) trend = 'improving';
    else if (first - last > 0.1) trend = 'declining';

    return {
      model: modelName,
      count: values.length,
      average: Math.round(avg * 1000) / 1000,
      latest: last,
      trend,
      values: recent,
    };
  }

  getStats() {
    const total = this._history.length;
    const byLevel = {};

    for (const h of this._history) {
      if (!byLevel[h.level]) byLevel[h.level] = 0;
      byLevel[h.level]++;
    }

    const avgOverall = total > 0
      ? this._history.reduce((s, h) => s + h.overall, 0) / total
      : 0;

    return {
      totalEvaluations: total,
      averageOverall: Math.round(avgOverall * 1000) / 1000,
      byLevel,
      modelCount: Object.keys(this._modelHistory).length,
      modelTrends: Object.keys(this._modelHistory).map(m => this.getModelTrend(m, 10)),
    };
  }
}

module.exports = UnifiedConfidenceEngine;
