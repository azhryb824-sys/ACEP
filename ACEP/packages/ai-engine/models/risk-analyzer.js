const path = require('path');
const csv = require('./training-csv');
const input = require('./model-input');

class RiskAnalyzer {
  constructor() {
    this.trained = false;
    this.risks = [];
    this.byProjectType = Object.create(null);
    this.byCategory = Object.create(null);
  }

  async train(csvPath, projectPath) {
    this.trained = false;
    this.byProjectType = Object.create(null);
    this.byCategory = Object.create(null);
    const fp = csvPath || path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv', 'risks.csv');
    const fit = csv.load(fp, ['project_id','risk_category','description','probability','impact'], r => {
      const probability = csv.number(r.probability, 1), impact = csv.number(r.impact, 1);
      if (probability > 5 || impact > 5 || !Number.isInteger(probability) || !Number.isInteger(impact)) throw Error('Invalid risk rating');
      return { projectId: r.project_id, category: r.risk_category, description: r.description,
        probability, impact, mitigation: r.mitigation || '', detectedByAI: r.detected_by_ai === 'true' };
    });
    this.risks = fit.data;
    const projMap = csv.projectTypes(projectPath || path.join(path.dirname(fp), 'projects.csv'));
    this.trainingAudit = { ...fit.audit, unmatchedProjects: this.risks.filter(r => !projMap[r.projectId]).length,
      provenance: 'unverified_csv', accuracyValidated: false };
    for (const risk of this.risks) {
      const pt = projMap[risk.projectId] || 'Unknown';
      if (!this.byProjectType[pt]) this.byProjectType[pt] = [];
      this.byProjectType[pt].push(risk);
      if (!this.byCategory[risk.category]) this.byCategory[risk.category] = [];
      this.byCategory[risk.category].push(risk);
    }

    for (const [k, v] of Object.entries(this.byProjectType)) {
      const categories = Object.create(null);
      for (const risk of v) (categories[risk.category] ||= []).push(risk);
      this.byProjectType[k] = { ...this._computeStats(v),
        categories: Object.fromEntries(Object.entries(categories).map(([cat, rows]) => [cat, this._computeStats(rows)])) };
    }
    for (const [k, v] of Object.entries(this.byCategory)) {
      this.byCategory[k] = this._computeStats(v);
    }

    this.trained = true;
    return { total: this.risks.length, categories: Object.keys(this.byCategory).length, audit: this.trainingAudit };
  }

  _computeStats(risks) {
    const probs = risks.map(r => r.probability / 5);
    const impacts = risks.map(r => r.impact / 5);
    probs.sort((a,b) => a-b); impacts.sort((a,b) => a-b);
    const n = risks.length;
    return {
      count: n,
      probMean: probs.reduce((s, v) => s + v, 0) / n,
      probMedian: probs[Math.floor(n / 2)],
      impactMean: impacts.reduce((s, v) => s + v, 0) / n,
      impactMedian: impacts[Math.floor(n / 2)],
      riskScoreMean: risks.reduce((s,r) => s + r.probability * r.impact / 25, 0) / n,
      mitigations: [...new Set(risks.filter(r => r.mitigation).map(r => r.mitigation))].sort().slice(0, 5),
      descriptions: [...new Set(risks.map(r => r.description))].sort().slice(0, 10)
    };
  }

  analyzeRisks(projectType, totalArea, floors, region, finishing) {
    const missing = input.geometry(projectType, totalArea, floors);
    const empty = { inferenceVersion: 10, risks: [], overallRiskScore: null, riskLevel: null, eventProbability: null,
      confidence: null, confidenceCalibrated: false, requiresRiskReview: true,
      probabilityBasis: 'unavailable_without_event_outcomes_and_exposure',
      dataBasis: 'historical_ordinal_ratings', historicalOrdinalRiskIndex: null };
    if (missing.length) return { ...input.incomplete(missing), ...empty };
    if (!this.trained) return { ...input.incomplete(['trained_risk_profile']), ...empty, estimateStatus: 'not_trained' };
    const stats = Object.hasOwn(this.byProjectType, projectType) ? this.byProjectType[projectType] : null;
    // Never substitute another project type's ratings for the requested type.
    if (!stats || !stats.categories) return { ...input.incomplete(['project_type_risk_history']), ...empty,
      estimateStatus: 'unsupported_project_type', projectType };
    const valid = s => s && Number.isSafeInteger(s.count) && s.count > 0 &&
      [s.probMean, s.impactMean, s.riskScoreMean].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1 + 1e-12) && s.probMean >= 0.2 - 1e-12 && s.impactMean >= 0.2 - 1e-12 && s.riskScoreMean >= 0.04 - 1e-12 &&
      Array.isArray(s.descriptions) && Array.isArray(s.mitigations);
    if (!valid(stats) || Object.values(stats.categories).some(s => !valid(s))) {
      return { ...input.incomplete(['valid_risk_profile']), ...empty, estimateStatus: 'invalid_training_profile' };
    }
    const risks = Object.entries(stats.categories).map(([category, s]) => ({
      category, risk: s.descriptions[0] || category,
      probability: null, eventProbability: null, impact: null, score: null,
      ordinalLikelihoodMean: s.probMean * 5, ordinalImpactMean: s.impactMean * 5,
      ordinalRiskProductMean: s.riskScoreMean * 25,
      historicalPriorityIndex: s.riskScoreMean,
      ratingScale: { likelihood: [1, 5], impact: [1, 5] },
      mitigation: s.mitigations[0] || null, trainingSamples: s.count,
      dataBasis: 'project_type_category_historical_ratings', requiresRiskReview: true
    })).sort((a,b) => b.historicalPriorityIndex-a.historicalPriorityIndex || a.category.localeCompare(b.category));
    if (!risks.length) return { ...input.incomplete(['project_type_risk_history']), ...empty };
    return { ...empty, risks, historicalOrdinalRiskIndex: stats.riskScoreMean,
      estimateStatus: 'historical_risk_profile', projectType,
      missing: ['observed_event_outcomes', 'at_risk_project_denominators', 'event_time_horizon'],
      totalRisksInTraining: this.risks.length, projectSpecificData: stats.count,
      geometryAdjustmentApplied: false, finishingAdjustmentApplied: false,
      message: 'هذه تقييمات مخاطر تاريخية لترتيب المراجعة، وليست احتمالات وقوع أو تصنيف سلامة للمشروع الحالي.' };
  }

  getRiskTrends(projectId) {
    const projRisks = this.risks.filter(r => r.projectId === projectId);
    const byCat = {};
    projRisks.forEach(r => {
      if (!byCat[r.category]) byCat[r.category] = [];
      byCat[r.category].push(r);
    });
    return Object.entries(byCat).map(([cat, items]) => ({
      category: cat,
      count: items.length,
      avgScore: items.reduce((s, r) => s + (r.probability / 5) * (r.impact / 5), 0) / items.length,
      topRisks: items.slice(0, 3).map(r => r.description)
    }));
  }
}

module.exports = new RiskAnalyzer();

