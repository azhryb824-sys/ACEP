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
    if (missing.length) return { ...input.incomplete(missing), risks: [], overallRiskScore: null, riskLevel: null };
    if (!this.trained) return { error: 'Not trained', risks: [] };

    const ptStats = this.byProjectType[projectType];
    const allCategories = Object.keys(this.byCategory);
    const scaleFactor = Math.max(0.5, Math.min(2, 1 + (totalArea / 10000) * 0.2 + (floors / 10) * 0.15));

    const risks = [];
    for (const cat of allCategories) {
      const catStats = this.byCategory[cat];
      const stats = (ptStats && ptStats.categories && ptStats.categories[cat]) ? ptStats.categories[cat] : catStats;
      if (!stats) continue;

      const baseProb = stats.probMean;
      const baseImpact = stats.impactMean;
      const prob = Math.min(0.95, baseProb * scaleFactor * (1 + (finishing === 'Luxury' ? 0.15 : finishing === 'Premium' ? 0.1 : 0)));
      const impact = Math.min(0.95, baseImpact * scaleFactor * (1 + (totalArea > 50000 ? 0.15 : 0)));
      const score = prob * impact;
      const desc = stats.descriptions[0] || `${cat} risk`;
      const mitigation = stats.mitigations[0] || 'Regular monitoring';

      risks.push({
        category: cat, risk: desc,
        probability: Math.round(prob * 100) / 100,
        impact: Math.round(impact * 100) / 100,
        score: Math.round(score * 100) / 100,
        mitigation,
        trainingSamples: stats.count,
        dataBasis: ptStats?.categories?.[cat] ? 'project_type_category' : 'global_category_fallback'
      });
    }

    risks.sort((a, b) => b.score - a.score || a.category.localeCompare(b.category));
    if (!risks.length) return { ...input.incomplete(['risk_history']), risks: [], overallRiskScore: null, riskLevel: null };
    const overallScore = risks.reduce((s, r) => s + r.score, 0) / risks.length;
    const riskLevel = overallScore > 0.5 ? 'High' : overallScore > 0.25 ? 'Medium' : 'Low';

    return {
      estimateStatus: 'heuristic_estimate', requiresRiskReview: true,
      probabilityBasis: 'normalized_ordinal_rating_not_calibrated_event_probability',
      confidence: 0, confidenceCalibrated: false,
      risks: risks.slice(0, 10),
      overallRiskScore: Math.round(overallScore * 100) / 100,
      riskLevel,
      totalRisksInTraining: this.risks.length,
      projectSpecificData: ptStats ? ptStats.count : 0
    };
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
