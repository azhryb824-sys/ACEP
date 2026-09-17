class RetrainingOrchestrator {
  constructor(aiEngine, trainingBridge, knowledgeDataset, knowledgeGrowth, benchmarkLibrary, selectiveRetraining) {
    this.ai = aiEngine;
    this.bridge = trainingBridge;
    this.dataset = knowledgeDataset;
    this.growth = knowledgeGrowth;
    this.benchmark = benchmarkLibrary;
    this.retrainer = selectiveRetraining;
    this._retrainLog = [];
    this.uets = null;
  }

  setUETS(uets) {
    this.uets = uets;
  }

  async retrainViaUETS(options = {}) {
    if (!this.uets) throw new Error('UETS is required; bundled-data fallback is disabled');
    const { trainAllModelsFromUETS } = require('./models/trainer');
    const result = await trainAllModelsFromUETS(this.uets, { models: options.models });
    const record = { ...result, timestamp: new Date().toISOString(), activated:false };
    this._retrainLog.push(record);
    return record;
  }

  async retrainAll(options = {}) { return this.retrainViaUETS(options); }

  async retrainWeakAreas(options = {}) {
    const analysis = this.retrainer.analyze();
    const result = await this.retrainViaUETS(options);
    return { ...result, analysis, weakAreasResolved:false,
      note:'A candidate was trained from an immutable snapshot; resolution requires independent validation.' };
  }

  _needsRetrain(modelName) {
    const lastRun = this._retrainLog[this._retrainLog.length - 1];
    if (!lastRun || !lastRun.models) return true;
    return !lastRun.models[modelName] || lastRun.models[modelName].ok === false;
  }

  _retrainForType(type) {
    const model = this.ai.projectAnalyzer;
    if (!model || typeof model.train !== 'function') return { ok: false, error: 'projectAnalyzer not available' };
    try { return { ok: true, result: model.train() }; } catch (e) { return { ok: false, error: e.message }; }
  }

  _resolveModel(name) {
    const map = {
      concreteQuantity: 'projectAnalyzer', steelQuantity: 'projectAnalyzer', blocksQuantity: 'projectAnalyzer',
      tilesQuantity: 'projectAnalyzer', paintQuantity: 'projectAnalyzer',
      costEstimation: 'costEstimator', scheduleEstimation: 'scheduleOptimizer',
    };
    const key = map[name] || name;
    return this.ai[key] || null;
  }

  getLog(limit = 10) {
    return this._retrainLog.slice(-limit);
  }

  getStats() {
    const last = this._retrainLog[this._retrainLog.length - 1];
    return {
      totalRetrains: this._retrainLog.length,
      lastRetrain: last?.timestamp || null,
      lastModelsRetrained: last ? (Number.isInteger(last.models) ? last.models : Object.keys(last.models || {}).length) : 0,
    };
  }
}

module.exports = RetrainingOrchestrator;
