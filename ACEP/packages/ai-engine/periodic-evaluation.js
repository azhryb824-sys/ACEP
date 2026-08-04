class PeriodicEvaluation {
  constructor(benchmarkLibrary, knowledgeGrowth, unifiedKB, dataQualityPipeline) {
    this.benchmark = benchmarkLibrary;
    this.growth = knowledgeGrowth;
    this.unifiedKB = unifiedKB;
    this.quality = dataQualityPipeline;
    this._schedule = new Map();
    this._history = [];
    this._timer = null;
  }

  createSchedule(options) {
    const { name, cronExpression, enabled = true, actions = ['benchmark'], notify = false } = options;
    if (!name) return { ok: false, error: 'name required' };

    const schedule = { name, cronExpression, enabled, actions, notify, createdAt: new Date().toISOString(), lastRun: null };
    this._schedule.set(name, schedule);
    return { ok: true, schedule };
  }

  removeSchedule(name) {
    if (this._schedule.delete(name)) return { ok: true };
    return { ok: false, error: `Schedule '${name}' not found` };
  }

  getSchedule(name) {
    return this._schedule.get(name) || null;
  }

  listSchedules() {
    return Array.from(this._schedule.values());
  }

  evaluateNow(options = {}) {
    const { actions = ['benchmark', 'quality', 'growth', 'full'], types, detail = 'summary' } = options;
    const startTime = Date.now();
    const evalResults = { timestamp: new Date().toISOString(), actions: [], duration: 0 };

    if (actions.includes('benchmark') || actions.includes('full')) {
      const bm = this.benchmark.runAll();
      evalResults.actions.push({ action: 'benchmark', ok: bm.passed !== undefined, details: detail === 'full' ? bm : { passRate: bm.passed, models: Object.keys(bm.byModel) } });
    }

    if (actions.includes('quality') || actions.includes('full')) {
      let qr = { ok: false };
      try { qr = this.quality.runFullCheck(); } catch {}
      const overall = qr.overall || {};
      evalResults.actions.push({ action: 'quality', ok: qr.ok !== false, details: detail === 'full' ? qr : { score: overall.qualityScore, grade: overall.grade } });
    }

    if (actions.includes('growth') || actions.includes('full')) {
      let gr = { lowSampleTypes: [], recommendations: [] };
      try {
        const report = this.growth.getKnowledgeGrowthReport();
        gr = { lowSampleTypes: report?.lowSampleTypes || [], recommendations: report?.recommendations || [] };
      } catch {}
      evalResults.actions.push({ action: 'growth', ok: true, details: detail === 'full' ? gr : { lowSampleTypes: gr.lowSampleTypes, recommendations: gr.recommendations?.length } });
    }

    evalResults.duration = Date.now() - startTime;
    this._history.push(evalResults);
    return evalResults;
  }

  startAutoEvaluation(intervalMs = 86400000) {
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => { this.evaluateNow({ actions: ['full'] }); }, intervalMs);
    return { ok: true, intervalMs };
  }

  stopAutoEvaluation() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    return { ok: true };
  }

  getHistory(options = {}) {
    const { limit = 10, action } = options;
    let filtered = this._history;
    if (action) filtered = filtered.filter(e => e.actions.some(a => a.action === action));
    return filtered.slice(-limit);
  }

  getLatest() {
    return this._history[this._history.length - 1] || null;
  }

  getStats() {
    return {
      totalEvaluations: this._history.length,
      schedules: this._schedule.size,
      activeSchedules: Array.from(this._schedule.values()).filter(s => s.enabled).length,
      autoRunning: this._timer !== null,
      lastEvaluation: this.getLatest()?.timestamp || null,
    };
  }
}

module.exports = PeriodicEvaluation;
