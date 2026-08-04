const fs = require('fs');
const path = require('path');

class RiskAnalyzer {
  constructor() {
    this.trained = false;
    this.risks = [];
    this.byProjectType = {};
    this.byCategory = {};
  }

  async train(csvPath) {
    this.byProjectType = {};
    this.byCategory = {};
    const fp = csvPath || path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv', 'risks.csv');
    this.risks = fs.readFileSync(fp, 'utf8').trim().split('\n').slice(1).map(l => {
      const c = l.split(',');
      return {
        projectId: c[0], category: c[1], description: c[2],
        probability: parseInt(c[3]) || 1, impact: parseInt(c[4]) || 1,
        mitigation: c[5] || '', detectedByAI: c[6] === 'true'
      };
    });

    const projMap = this._loadProjectTypes();
    for (const risk of this.risks) {
      const pt = projMap[risk.projectId] || 'Unknown';
      if (!this.byProjectType[pt]) this.byProjectType[pt] = [];
      this.byProjectType[pt].push(risk);
      if (!this.byCategory[risk.category]) this.byCategory[risk.category] = [];
      this.byCategory[risk.category].push(risk);
    }

    for (const [k, v] of Object.entries(this.byProjectType)) {
      this.byProjectType[k] = this._computeStats(v);
    }
    for (const [k, v] of Object.entries(this.byCategory)) {
      this.byCategory[k] = this._computeStats(v);
    }

    this.trained = true;
    return { total: this.risks.length, categories: Object.keys(this.byCategory).length };
  }

  _loadProjectTypes() {
    try {
      const fp = path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv', 'projects.csv');
      const map = {};
      fs.readFileSync(fp, 'utf8').trim().split('\n').slice(1).forEach(l => {
        const c = l.split(',');
        map[c[0]] = c[3];
      });
      return map;
    } catch (e) { return {}; }
  }

  _computeStats(risks) {
    const probs = risks.map(r => r.probability / 5);
    const impacts = risks.map(r => r.impact / 5);
    probs.sort(); impacts.sort();
    const n = risks.length;
    return {
      count: n,
      probMean: probs.reduce((s, v) => s + v, 0) / n,
      probMedian: probs[Math.floor(n / 2)],
      impactMean: impacts.reduce((s, v) => s + v, 0) / n,
      impactMedian: impacts[Math.floor(n / 2)],
      riskScoreMean: (probs.reduce((s, v) => s + v, 0) / n) * (impacts.reduce((s, v) => s + v, 0) / n),
      mitigations: [...new Set(risks.filter(r => r.mitigation).map(r => r.mitigation))].slice(0, 5),
      descriptions: [...new Set(risks.map(r => r.description))].slice(0, 10)
    };
  }

  analyzeRisks(projectType, totalArea, floors, region, finishing) {
    if (!this.trained) return { error: 'Not trained', risks: [] };

    const ptStats = this.byProjectType[projectType];
    const allCategories = Object.keys(this.byCategory);
    const scaleFactor = Math.max(0.5, Math.min(2, 1 + (totalArea / 10000) * 0.2 + (floors / 10) * 0.15));

    const risks = [];
    for (const cat of allCategories) {
      const catStats = this.byCategory[cat];
      const stats = (ptStats && ptStats.categories && ptStats.categories[cat]) ? ptStats.categories[cat] : catStats;
      if (!stats) continue;

      const baseProb = stats.probMean || 0.4;
      const baseImpact = stats.impactMean || 0.4;
      const prob = Math.min(0.95, baseProb * scaleFactor * (1 + (finishing === 'Luxury' ? 0.15 : finishing === 'Premium' ? 0.1 : 0)));
      const impact = Math.min(0.95, baseImpact * scaleFactor * (1 + (totalArea > 50000 ? 0.15 : 0)));
      const score = prob * impact;
      const desc = stats.descriptions[Math.floor(Math.random() * stats.descriptions.length)] || `${cat} risk`;
      const mitigation = stats.mitigations[Math.floor(Math.random() * stats.mitigations.length)] || 'Regular monitoring';

      risks.push({
        category: cat, risk: desc,
        probability: Math.round(prob * 100) / 100,
        impact: Math.round(impact * 100) / 100,
        score: Math.round(score * 100) / 100,
        mitigation,
        trainingSamples: stats.count
      });
    }

    risks.sort((a, b) => b.score - a.score);
    const overallScore = risks.reduce((s, r) => s + r.score, 0) / risks.length;
    const riskLevel = overallScore > 0.5 ? 'High' : overallScore > 0.25 ? 'Medium' : 'Low';

    return {
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
