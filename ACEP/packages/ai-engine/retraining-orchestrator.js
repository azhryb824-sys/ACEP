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

  retrainViaUETS(options = {}) {
    if (!this.uets) return { error: 'UETS not configured', fallback: this.retrainAll(options) };

    const modelNames = options.models || ['projectAnalyzer', 'quantityEstimator', 'costEstimator', 'riskAnalyzer', 'qualityInspector', 'scheduleOptimizer', 'supplierIntelligence'];

    this.uets.enqueueTraining(modelNames, options);

    const startTime = Date.now();
    const results = { models: {}, errors: [], duration: 0, timestamp: new Date().toISOString(), uets: true };

    for (const modelName of modelNames) {
      const model = this.ai[modelName];
      if (!model || typeof model.train !== 'function') continue;
      try {
        const result = model.train();
        results.models[modelName] = { ok: true, result };
      } catch (e) {
        results.models[modelName] = { ok: false, error: e.message };
        results.errors.push(`${modelName}: ${e.message}`);
      }
    }

    try { this.dataset.initialize(); } catch {}
    const benchResult = this.benchmark.runAll();
    results.duration = Date.now() - startTime;
    results.benchmarkAfter = benchResult ? { passRate: benchResult.passed, projectTypes: benchResult.projectTypesTested } : null;
    this._retrainLog.push(results);

    this.uets.enqueueEvaluation('benchmark', { results });
    this.uets.enqueueFeedback({ type: 'retraining', models: modelNames, timestamp: results.timestamp, passRate: results.benchmarkAfter?.passRate });

    return results;
  }

  retrainAll(options = {}) {
    const { types, models, force = false } = options;
    const startTime = Date.now();
    const results = { models: {}, errors: [], duration: 0, timestamp: new Date().toISOString() };

    const modelsToRetrain = models || ['projectAnalyzer', 'quantityEstimator', 'costEstimator', 'riskAnalyzer', 'qualityInspector', 'scheduleOptimizer', 'supplierIntelligence'];

    for (const modelName of modelsToRetrain) {
      if (!force && !this._needsRetrain(modelName)) continue;
      const model = this.ai[modelName];
      if (!model || typeof model.train !== 'function') continue;
      try {
        const result = model.train();
        results.models[modelName] = { ok: true, result };
      } catch (e) {
        results.models[modelName] = { ok: false, error: e.message };
        results.errors.push(`${modelName}: ${e.message}`);
      }
    }

    if (types) {
      for (const type of types) {
        const sq = this.dataset.getStandardQuantities(type);
        if (sq) {
          this.growth.recordApprovedProject(type);
          const datasetSuggestions = this.growth.suggestDatasetUpdates();
          const typeSuggestions = datasetSuggestions.filter(s => s.type === type || !s.type);
          if (typeSuggestions.length > 0) results.suggestions = results.suggestions || {};
          results.suggestions[type] = typeSuggestions;
        }
      }
    }

    try { this.dataset.initialize(); } catch {}
    const benchResult = this.benchmark.runAll();

    results.duration = Date.now() - startTime;
    results.benchmarkAfter = benchResult ? { passRate: benchResult.passed, projectTypes: benchResult.projectTypesTested } : null;
    this._retrainLog.push(results);
    return results;
  }

  retrainWeakAreas(options = {}) {
    const analysis = this.retrainer.analyze();
    const actions = [];

    for (const area of analysis.weakAreas.lowSamples) {
      const modelResult = this._retrainForType(area.type);
      actions.push({ type: 'low_samples_fix', target: area.type, samples: area.samples, modelResult });
    }

    for (const area of analysis.weakAreas.byModel) {
      const model = this._resolveModel(area.model);
      if (model && typeof model.train === 'function') {
        try {
          const r = model.train();
          actions.push({ type: 'model_recalibrated', model: area.model, result: r });
        } catch (e) {
          actions.push({ type: 'model_recalibrate_failed', model: area.model, error: e.message });
        }
      }
    }

    for (const area of analysis.weakAreas.highMAPE) {
      const model = this._resolveModel(area.model);
      if (model && typeof model.train === 'function') {
        try {
          const r = model.train();
          actions.push({ type: 'mape_fix', target: area.type, model: area.model, mape: area.mape, result: r });
        } catch (e) {
          actions.push({ type: 'mape_fix_failed', target: area.type, model: area.model, error: e.message });
        }
      }
    }

    try { this.dataset.initialize(); } catch {}
    const benchAfter = this.benchmark.runAll();
    const result = { timestamp: new Date().toISOString(), analysis, actions, actionsTaken: actions.length, benchmarkAfter: benchAfter ? { passRate: benchAfter.passed } : null };
    this._retrainLog.push(result);
    return result;
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
      lastModelsRetrained: last ? Object.keys(last.models || {}).length : 0,
    };
  }
}

module.exports = RetrainingOrchestrator;
