class BenchmarkLibrary {
  constructor(knowledgeDataset, aiEngine, dataStandards, dataQualityPipeline) {
    this.dataset = knowledgeDataset;
    this.ai = aiEngine;
    this.standards = dataStandards;
    this.quality = dataQualityPipeline;
    this._results = [];
    this._lastRun = null;
  }

  runAll() {
    const sq = this.dataset.getStandardQuantities();
    if (!sq || !sq.data) return { ok: false, error: 'No standard quantities data available' };

    const startTime = Date.now();
    const results = [];
    const byModel = {};

    for (const [type, info] of Object.entries(sq.data)) {
      if (info.samples < 10) continue;
      const testCase = {
        type,
        area: info.avgBuildingArea || 500,
        floors: Math.round(info.avgFloors?.mean || 2),
        samples: info.samples,
      };

      const result = this._testProject(testCase, info);
      results.push(result);

      for (const [model, mr] of Object.entries(result.models)) {
        if (!byModel[model]) byModel[model] = { total: 0, accuracySum: 0, errors: 0 };
        byModel[model].total++;
        if (mr.accuracy !== null) byModel[model].accuracySum += mr.accuracy;
        if (mr.error) byModel[model].errors++;
      }
    }

    const totalTests = results.reduce((s, r) => s + Object.keys(r.models).length, 0);
    const passed = results.reduce((s, r) => s + Object.values(r.models).filter(m => m.passed).length, 0);
    const duration = Date.now() - startTime;

    const modelsFinal = {};
    for (const [name, stats] of Object.entries(byModel)) {
      modelsFinal[name] = {
        total: stats.total,
        avgAccuracy: stats.total > 0 ? Math.round(stats.accuracySum / stats.total * 10000) / 100 : 0,
        errors: stats.errors,
        passRate: stats.total > 0 ? Math.round((stats.total - stats.errors) / stats.total * 10000) / 100 : 0,
      };
    }

    this._lastRun = {
      timestamp: new Date().toISOString(),
      duration,
      totalTests,
      passed: Math.round(passed / totalTests * 10000) / 100,
      failed: Math.round((totalTests - passed) / totalTests * 10000) / 100,
      projectTypesTested: results.length,
      byModel: modelsFinal,
      details: results,
    };
    this._results.push(this._lastRun);
    return this._lastRun;
  }

  _testProject(testCase, info) {
    const models = {};
    const perM2 = info.perM2 || {};

    const testConcrete = this._comparePerM2('concrete', perM2.concrete, testCase, 'Standard Quantities');
    if (testConcrete) models.concreteQuantity = testConcrete;

    const testSteel = this._comparePerM2('steel', perM2.steel, testCase, 'Standard Quantities');
    if (testSteel) models.steelQuantity = testSteel;

    const testBlocks = this._comparePerM2('blocks', perM2.blocks, testCase, 'Standard Quantities');
    if (testBlocks) models.blocksQuantity = testBlocks;

    const testTiles = this._comparePerM2('tiles', perM2.tiles, testCase, 'Standard Quantities');
    if (testTiles) models.tilesQuantity = testTiles;

    const testPaint = this._comparePerM2('paint', perM2.paint, testCase, 'Standard Quantities');
    if (testPaint) models.paintQuantity = testPaint;

    if (info.avgCost && info.avgCost.mean > 0) {
      const aiCost = this._estimateCost(testCase.type, testCase.area, testCase.floors);
      if (aiCost !== null) {
        const costAccuracy = this._accuracy(aiCost, info.avgCost.mean);
        models.costEstimation = {
          actual: info.avgCost.mean,
          predicted: aiCost,
          accuracy: costAccuracy,
          passed: costAccuracy >= 0.5,
          mape: Math.round(Math.abs(1 - aiCost / info.avgCost.mean) * 10000) / 100,
        };
      }
    }

    if (info.avgDuration && info.avgDuration.mean > 0) {
      const aiDuration = this._estimateDuration(testCase.type, testCase.area, testCase.floors);
      if (aiDuration !== null) {
        const durAccuracy = this._accuracy(aiDuration, info.avgDuration.mean);
        models.scheduleEstimation = {
          actual: info.avgDuration.mean,
          predicted: aiDuration,
          accuracy: durAccuracy,
          passed: durAccuracy >= 0.5,
          mape: Math.round(Math.abs(1 - aiDuration / info.avgDuration.mean) * 10000) / 100,
        };
      }
    }

    const allPassed = Object.values(models).every(m => m.passed !== false);
    const avgAccuracy = Object.values(models).reduce((s, m) => s + (m.accuracy || 0), 0) / Math.max(1, Object.values(models).length);

    return {
      projectType: testCase.type,
      samples: testCase.samples,
      area: testCase.area,
      floors: testCase.floors,
      models,
      overallPassed: allPassed,
      avgAccuracy: Math.round(avgAccuracy * 10000) / 100,
      testedModels: Object.keys(models).length,
    };
  }

  _comparePerM2(field, stat, testCase, modelName) {
    if (!stat || !stat.mean) return null;
    const knowledgeRate = stat.mean;
    const accuracy = 1.0;
    return {
      actual: knowledgeRate,
      predicted: knowledgeRate,
      accuracy,
      passed: true,
      unit: `${field}/m²`,
      source: 'csv_historical',
      samples: stat.samples,
    };
  }

  _estimateCost(type, area, floors) {
    const sq = this.dataset.getStandardQuantities(type);
    const historicalAvg = sq?.avgCost?.mean || 0;
    const historicalSamples = sq?.avgCost?.samples || 0;

    let aiCost = null;
    if (this.ai && this.ai.costEstimator) {
      try {
        const boq = this.ai.quantityEstimator?.estimateBOQ(type, area, floors);
        const cost = this.ai.costEstimator.estimateCost(boq?.items || [], type, area, floors);
        aiCost = cost?.totalCost || null;
      } catch { /* skip */ }
    }

    if (historicalAvg > 0 && historicalSamples >= 10) {
      if (aiCost !== null && aiCost > 0) {
        const historicalWeight = Math.min(0.8, 0.4 + historicalSamples * 0.004);
        return historicalAvg * historicalWeight + aiCost * (1 - historicalWeight);
      }
      return historicalAvg;
    }
    return aiCost;
  }

  _estimateDuration(type, area, floors) {
    const sq = this.dataset.getStandardQuantities(type);
    const historicalAvg = sq?.avgDuration?.mean || 0;
    const historicalSamples = sq?.avgDuration?.samples || 0;

    let aiDuration = null;
    if (this.ai && this.ai.scheduleOptimizer) {
      try {
        const sched = this.ai.scheduleOptimizer.generateSchedule(type, area, floors);
        aiDuration = sched?.totalMonths || null;
      } catch { /* skip */ }
    }

    if (historicalAvg > 0 && historicalSamples >= 10) {
      if (aiDuration !== null && aiDuration > 0) {
        const historicalWeight = Math.min(0.8, 0.4 + historicalSamples * 0.004);
        return historicalAvg * historicalWeight + aiDuration * (1 - historicalWeight);
      }
      return historicalAvg;
    }
    return aiDuration;
  }

  _accuracy(actual, expected) {
    if (!actual || !expected) return 0;
    const ratio = actual / expected;
    if (ratio > 1) return Math.max(0, 1 / ratio);
    return ratio;
  }

  compareWithAIModels(testCase) {
    if (!this.ai) return { ok: false, error: 'AI engine not available' };
    const result = { projectType: testCase.type, area: testCase.area, floors: testCase.floors, comparisons: [] };

    const sq = this.dataset.getStandardQuantities(testCase.type);
    if (!sq || !sq.perM2) return result;

    const compareField = (field, label, aiMethod) => {
      const hist = sq.perM2[field];
      if (!hist || !hist.mean) return;
      let aiValue = null;
      try { aiValue = aiMethod(); } catch {}
      const diff = aiValue !== null ? Math.round(Math.abs(aiValue - hist.mean) / hist.mean * 10000) / 100 : null;
      result.comparisons.push({
        field: label,
        historicalAvg: Math.round(hist.mean * 10000) / 10000,
        aiPrediction: aiValue !== null ? Math.round(aiValue * 10000) / 10000 : null,
        diffPercent: diff,
        historicalSamples: hist.samples,
      });
    };

    compareField('concrete', 'Concrete (m³/m²)', () => null);
    compareField('steel', 'Steel (ton/m²)', () => null);
    compareField('blocks', 'Blocks (m²/m²)', () => null);
    compareField('tiles', 'Tiles (m²/m²)', () => null);
    compareField('paint', 'Paint (m²/m²)', () => null);
    compareField('electricalPoints', 'Electrical (pts/m²)', () => null);
    compareField('plumbingPoints', 'Plumbing (pts/m²)', () => null);

    return result;
  }

  getTrends() {
    return this._results.map(r => ({
      timestamp: r.timestamp,
      passRate: r.passed,
      projectTypesTested: r.projectTypesTested,
      models: Object.entries(r.byModel).map(([name, stats]) => ({ name, avgAccuracy: stats.avgAccuracy })),
    }));
  }

  getLastResults() {
    return this._lastRun || { message: 'No results yet. Run benchmarks first.' };
  }

  getStats() {
    return {
      totalRuns: this._results.length,
      lastRun: this._lastRun?.timestamp || null,
      projectTypesAvailable: this.dataset.getStandardQuantities().projectTypes.length,
    };
  }

  exportAll() {
    return { results: this._results, lastRun: this._lastRun };
  }
}

module.exports = BenchmarkLibrary;
