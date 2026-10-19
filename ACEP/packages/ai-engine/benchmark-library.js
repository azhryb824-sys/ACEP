// Historical aggregate diagnostics are not independent model accuracy.
const positive = n => typeof n === 'number' && Number.isFinite(n) && n > 0;
const META = Object.freeze({ schemaVersion: 2, evaluationKind: 'historical_aggregate_diagnostic',
  accuracyValidated: false, independentTest: false, acceptanceEligible: false });
class BenchmarkLibrary {
  constructor(dataset, ai, standards, quality) {
    Object.assign(this, { dataset, ai, standards, quality, _results: [], _lastRun: null });
  }
  runAll() {
    const start = Date.now();
    let sq;
    try { sq = this.dataset.getStandardQuantities(); } catch (e) {
      return { ...META, ok: false, error: e.message, passed: null, failed: null, byModel: {}, details: [] };
    }
    if (!sq?.data) return { ...META, ok: false, error: 'Historical references unavailable',
      passed: null, failed: null, byModel: {}, details: [] };
    const details = [];
    for (const [type, info] of Object.entries(sq.data)) {
      if (!info || !Number.isSafeInteger(info.samples) || info.samples < 10) continue;
      const area = positive(info.avgBuildingArea) ? info.avgBuildingArea : null;
      const f = info.avgFloors?.mean;
      const floors = positive(f) && Number.isSafeInteger(Math.round(f)) && Math.round(f) >= 1 ? Math.round(f) : null;
      details.push(this._testProject({ type, area, floors, samples: info.samples }, info));
    }
    const byModel = {};
    for (const d of details) for (const [name, v] of Object.entries(d.models)) {
      const m = byModel[name] ||= { total: 0, scored: 0, unavailable: 0, errors: 0,
        avgAccuracy: null, passRate: null, accuracyValidated: false };
      m.total++;
      if (Number.isFinite(v.relativeDifferencePercent)) m.scored++; else m.unavailable++;
      if (v.error) m.errors++;
    }
    const totalTests = Object.values(byModel).reduce((n, s) => n + s.total, 0);
    const scored = Object.values(byModel).reduce((n, s) => n + s.scored, 0);
    this._lastRun = { ...META, ok: details.length > 0, timestamp: new Date().toISOString(),
      duration: Date.now() - start, totalTests, scored, unavailable: totalTests - scored,
      coverage: totalTests ? scored / totalTests : 0, passed: null, failed: null,
      projectTypesTested: details.length, byModel, details,
      limitations: ['Historical aggregates may overlap training and have unverified provenance.',
        'Differences from a type mean are diagnostics, not errors on executed projects.',
        'Historical mean building area is provisionally treated as per-floor area; its source basis is unverified.',
        'Quantity comparisons need matched item scope, units and area basis.'] };
    this._results.push(this._lastRun);
    return this._lastRun;
  }
  _testProject(testCase, info) {
    const models = {};
    for (const field of ['concrete', 'steel', 'blocks', 'tiles', 'paint']) {
      models[field + 'Quantity'] = this._diagnostic(info.perM2?.[field]?.mean, null,
        'matched_item_scope_units_and_area_basis_required');
    }
    const geometryOK = positive(testCase.area) && Number.isSafeInteger(testCase.floors) && testCase.floors > 0;
    const predict = (method, reference) => {
      if (!geometryOK) return this._diagnostic(reference, null, 'historical_geometry_missing');
      try { return this._diagnostic(reference, method()); }
      catch (e) { return { ...this._diagnostic(reference, null, 'model_prediction_failed'), error: e.message }; }
    };
    models.costEstimation = predict(() => this._estimateCost(testCase.type, testCase.area, testCase.floors), info.avgCost?.mean);
    models.scheduleEstimation = predict(() => this._estimateDuration(testCase.type, testCase.area, testCase.floors), info.avgDuration?.mean);
    return { projectType: testCase.type, samples: testCase.samples, area: testCase.area, floors: testCase.floors,
      geometrySource: 'historical_type_mean', areaBasis: 'assumed_per_floor', models, overallPassed: null, avgAccuracy: null,
      testedModels: Object.keys(models).length, accuracyValidated: false };
  }
  _diagnostic(reference, predicted, reason) {
    const refOK = positive(reference), predOK = positive(predicted);
    const diff = refOK && predOK ? Math.abs(predicted / reference - 1) * 100 : null;
    const available = Number.isFinite(diff);
    return { referenceMean: refOK ? reference : null, predicted: predOK ? predicted : null,
      relativeDifferencePercent: available ? diff : null, accuracy: null, passed: null, mape: null,
      accuracyValidated: false, status: available ? 'diagnostic_only' : 'unscorable',
      reason: reason || (!refOK ? 'reference_missing' : !predOK ? 'prediction_missing' : !available ? 'unsafe_arithmetic' : 'not_independent_ground_truth') };
  }
  _estimateCost(type, area, floors) {
    if (!this.ai?.quantityEstimator || !this.ai?.costEstimator) return null;
    const boq = this.ai.quantityEstimator.estimateBOQ(type, area, floors);
    if (!Array.isArray(boq?.items) || !boq.items.length) return null;
    const cost = this.ai.costEstimator.estimateCost(boq.items, type, area, floors);
    if (cost?.complete === false || cost?.status === 'incomplete') return null;
    return cost?.totalCost ?? null;
  }
  _estimateDuration(type, area, floors) {
    if (!this.ai?.scheduleOptimizer) return null;
    const totalArea = area * floors;
    if (!Number.isFinite(totalArea) || totalArea > Number.MAX_SAFE_INTEGER) return null;
    return this.ai.scheduleOptimizer.generateSchedule(type, totalArea, floors)?.totalMonths ?? null;
  }
  compareWithAIModels(testCase) {
    if (!testCase || typeof testCase.type !== 'string' || !positive(testCase.area) ||
        !Number.isSafeInteger(testCase.floors) || testCase.floors < 1) {
      return { ...META, ok: false, error: 'Explicit type, positive per-floor area and integer floors required' };
    }
    const info = this.dataset.getStandardQuantities(testCase.type);
    if (!info) return { ...META, ok: false, error: 'Historical reference unavailable', comparisons: [] };
    const d = this._testProject(testCase, info);
    return { ...META, ok: true, ...d, comparisons: Object.entries(d.models).map(([field, m]) => ({
      field, historicalAvg: m.referenceMean, aiPrediction: m.predicted, diffPercent: m.relativeDifferencePercent,
      status: m.status, reason: m.reason })) };
  }
  getTrends() {
    return this._results.map(r => ({ timestamp: r.timestamp, ...META, passRate: null,
      legacy: r.schemaVersion !== 2, projectTypesTested: r.projectTypesTested || 0,
      coverage: r.schemaVersion === 2 ? r.coverage : null,
      models: Object.keys(r.byModel || {}).map(name => ({ name, avgAccuracy: null })) }));
  }
  getLastResults() {
    return this._lastRun?.schemaVersion === 2 ? this._lastRun : {
      ...META, ok: false, passed: null, byModel: {}, details: [], message: 'Run current diagnostics first.' };
  }
  getStats() {
    const sq = this.dataset.getStandardQuantities();
    return { ...META, totalRuns: this._results.length, lastRun: this._lastRun?.timestamp || null,
      projectTypesAvailable: Object.keys(sq?.data || {}).length };
  }
  exportAll() { return { ...META, results: this.getTrends(), lastRun: this.getLastResults() }; }
}
module.exports = BenchmarkLibrary;
