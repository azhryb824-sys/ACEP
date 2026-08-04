/**
 * Continuous Learner — Learn from Every Completed Project
 * Phase 7: Continuous Learning
 *
 * After project approval: save items, quantities, prices, errors, notes.
 * After execution: compare expected vs actual, update models.
 */
const fs = require('fs');
const path = require('path');

class ContinuousLearner {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(__dirname, '..', '..', '..', 'data');
    this.learningFile = path.join(this.dataDir, 'continuous-learning.json');
    this.store = this._load();
  }

  _load() {
    try { if (fs.existsSync(this.learningFile)) return JSON.parse(fs.readFileSync(this.learningFile, 'utf8')); }
    catch (_) {}
    return { projects: [], priceAdjustments: {}, quantityAdjustments: {}, modelFeedback: [] };
  }

  _save() {
    try {
      const dir = path.dirname(this.learningFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.learningFile, JSON.stringify(this.store, null, 2), 'utf8');
    } catch (_) {}
  }

  recordApprovedProject(project, profile, boq, cost) {
    const entry = {
      id: project.id,
      type: profile?.projectType?.primary || project.extracted?.type || 'Unknown',
      name: project.metadata?.name || '',
      recordedAt: new Date().toISOString(),
      params: { area: project.extracted?.area, floors: project.extracted?.floors, city: project.extracted?.city },
      boqSummary: { totalItems: boq?.items?.length, totalCost: boq?.summary?.totalCost, items: (boq?.items || []).map(i => ({ code: i.code, qty: i.quantity, price: i.unitPrice, total: i.totalPrice })) },
      cost: { total: cost?.totalCost, perM2: cost?.costPerM2 },
      profile: profile ? { type: profile.projectType?.primary, systems: profile.structural, mep: profile.mep } : null,
    };
    this.store.projects.push(entry);
    // Update price adjustments
    for (const item of (boq?.items || [])) {
      if (item.unitPrice && item.priceCat) {
        if (!this.store.priceAdjustments[item.priceCat]) this.store.priceAdjustments[item.priceCat] = [];
        this.store.priceAdjustments[item.priceCat].push({ price: item.unitPrice, project: project.id, date: new Date().toISOString() });
      }
    }
    this._save();
    return entry;
  }

  recordExecutionFeedback(projectId, expectedBOQ, actualBOQ) {
    const feedback = {
      projectId,
      recordedAt: new Date().toISOString(),
      comparisons: [],
      accuracy: 0
    };
    let totalVariance = 0;
    let count = 0;
    for (const exp of expectedBOQ) {
      const act = actualBOQ.find(a => a.code === exp.code);
      if (act) {
        const variance = exp.quantity > 0 ? Math.abs(act.quantity - exp.quantity) / exp.quantity : 0;
        feedback.comparisons.push({ code: exp.code, expected: exp.quantity, actual: act.quantity, variance: Math.round(variance * 100) / 100 });
        totalVariance += variance;
        count++;
      }
    }
    feedback.accuracy = count > 0 ? Math.round((1 - totalVariance / count) * 100) / 100 : 0;
    feedback.totalItems = count;
    this.store.modelFeedback.push(feedback);
    this._save();
    return feedback;
  }

  getStatistics() {
    return {
      recordedProjects: this.store.projects.length,
      priceCategories: Object.keys(this.store.priceAdjustments).length,
      feedbackEntries: this.store.modelFeedback.length,
      averageAccuracy: this.store.modelFeedback.length > 0
        ? Math.round(this.store.modelFeedback.reduce((s, f) => s + f.accuracy, 0) / this.store.modelFeedback.length * 100) / 100
        : 0
    };
  }

  getPriceTrends() {
    const trends = {};
    for (const [cat, prices] of Object.entries(this.store.priceAdjustments)) {
      if (prices.length >= 3) {
        const recent = prices.slice(-5);
        const avg = recent.reduce((s, p) => s + p.price, 0) / recent.length;
        const old = prices.slice(0, 5).reduce((s, p) => s + p.price, 0) / Math.min(5, prices.length);
        trends[cat] = { average: Math.round(avg * 100) / 100, trend: old > 0 ? Math.round((avg - old) / old * 10000) / 100 : 0, dataPoints: prices.length };
      }
    }
    return trends;
  }
}

module.exports = ContinuousLearner;
