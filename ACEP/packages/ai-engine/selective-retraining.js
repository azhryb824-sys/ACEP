class SelectiveRetraining {
  constructor(benchmarkLibrary, knowledgeDataset, knowledgeGrowth, periodicEvaluation) {
    this.benchmark = benchmarkLibrary;
    this.dataset = knowledgeDataset;
    this.growth = knowledgeGrowth;
    this.evaluator = periodicEvaluation;
    this._retrainingHistory = [];
    this._triggers = {
      lowAccuracyThreshold: 0.7,
      lowSampleThreshold: 20,
      highMAPEThreshold: 30,
      daysSinceLastRun: 30,
    };
    this.uets = null;
  }

  setUETS(uets) {
    this.uets = uets;
  }

  setThresholds(thresholds = {}) {
    Object.assign(this._triggers, thresholds);
    return this._triggers;
  }

  getThresholds() {
    return { ...this._triggers };
  }

  analyze() {
    const benchmark = this.benchmark.getLastResults();
    let growth = null;
    try { growth = this.growth ? this.growth.getKnowledgeGrowthReport() : null; } catch {}
    const sq = this.dataset.getStandardQuantities();
    const startTime = Date.now();

    const weakAreas = { byModel: [], byProjectType: [], lowSamples: [], highMAPE: [] };

    if (benchmark && benchmark.byModel) {
      for (const [name, stats] of Object.entries(benchmark.byModel)) {
        if (stats.avgAccuracy < this._triggers.lowAccuracyThreshold * 100) {
          weakAreas.byModel.push({ model: name, accuracy: stats.avgAccuracy, threshold: this._triggers.lowAccuracyThreshold * 100 });
        }
      }
    }

    if (sq && sq.data) {
      for (const [type, info] of Object.entries(sq.data)) {
        if (info.samples < this._triggers.lowSampleThreshold) {
          weakAreas.lowSamples.push({ type, samples: info.samples, threshold: this._triggers.lowSampleThreshold });
        }
      }
    }

    if (growth && growth.lowSampleTypes) {
      for (const item of growth.lowSampleTypes) {
        if (!weakAreas.lowSamples.find(w => w.type === item.type)) {
          weakAreas.lowSamples.push({ type: item.type, samples: item.samples || 0, threshold: this._triggers.lowSampleThreshold });
        }
      }
    }

    if (benchmark && benchmark.details) {
      for (const detail of benchmark.details) {
        for (const [modelName, modelResult] of Object.entries(detail.models)) {
          if (modelResult.mape && modelResult.mape > this._triggers.highMAPEThreshold) {
            weakAreas.highMAPE.push({ type: detail.projectType, model: modelName, mape: modelResult.mape, threshold: this._triggers.highMAPEThreshold });
          }
        }
      }
    }

    const totalWeakAreas = weakAreas.byModel.length + weakAreas.byProjectType.length + weakAreas.lowSamples.length + weakAreas.highMAPE.length;

    const retrainingNeeded = totalWeakAreas > 0;
    const priority = retrainingNeeded ? (weakAreas.byModel.length > 0 || weakAreas.highMAPE.length > 0 ? 'high' : 'medium') : 'none';

    const analysis = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      retrainingNeeded,
      priority,
      totalWeakAreas,
      weakAreas,
      triggers: { ...this._triggers },
    };

    this._retrainingHistory.push(analysis);

    if (this.uets && typeof this.uets.enqueueEvaluation === 'function') {
      try {
        this.uets.enqueueEvaluation('weak-area-analysis', { analysis });
      } catch (e) { /* non-fatal */ }
    }

    return analysis;
  }

  retrain(options = {}) {
    const analysis = options.analysis || this.analyze();
    const actions = [];
    const startTime = Date.now();

    for (const area of analysis.weakAreas.lowSamples) {
      let suggestion = [];
      try { suggestion = this.growth ? this.growth.suggestDatasetUpdates(area.type) : []; } catch {}
      actions.push({
        type: 'collect_samples',
        targetType: area.type,
        currentSamples: area.samples,
        targetSamples: this._triggers.lowSampleThreshold,
        suggestions: (suggestion || []).slice(0, 3),
      });
    }

    for (const area of analysis.weakAreas.byModel) {
      actions.push({
        type: 'recalibrate_model',
        modelName: area.model,
        reason: `Accuracy ${area.accuracy}% below threshold ${area.threshold}%`,
      });
    }

    for (const area of analysis.weakAreas.highMAPE) {
      actions.push({
        type: 'refine_estimates',
        targetType: area.type,
        modelName: area.model,
        mape: area.mape,
      });
    }

    const retrainingSession = {
      id: `rt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      analysis,
      actions,
      totalActions: actions.length,
      completed: false,
    };

    this._retrainingHistory.push(retrainingSession);

    if (options.execute) {
      retrainingSession.completed = true;
    }

    return retrainingSession;
  }

  getHistory(limit = 10) {
    return this._retrainingHistory.slice(-limit);
  }

  getStats() {
    const last = this._retrainingHistory[this._retrainingHistory.length - 1];
    const retrainNeeded = last ? (last.retrainingNeeded || last.analysis?.retrainingNeeded) : false;
    return {
      totalAnalyses: this._retrainingHistory.length,
      retrainingNeeded: !!retrainNeeded,
      lastAnalysis: last?.timestamp || null,
      thresholds: { ...this._triggers },
      uetsEvaluationQueued: this.uets ? this.uets.getTrainingStats().evaluationQueue : 0,
    };
  }

  getUETSEvaluations(limit = 50) {
    if (!this.uets) return { error: 'UETS not configured' };
    return this.uets.getTrainingHistory ? this.uets.getTrainingHistory(limit).filter(h => h.type === 'evaluation') : [];
  }
}

module.exports = SelectiveRetraining;
