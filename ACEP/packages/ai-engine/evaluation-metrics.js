'use strict';

// Pure evaluation of frozen predictions. No model calls, fitting, threshold tuning or deployment.
const finite = n => typeof n === 'number' && Number.isFinite(n);
const isClass = n => n === 0 || n === 1;
function ids(values, name) {
  if (!Array.isArray(values) || values.length === 0 || values.some(v => typeof v !== 'string' || !v.trim()) ||
      new Set(values).size !== values.length) throw new TypeError(name + ' must contain unique nonempty IDs');
  return values;
}
function align(rows, expectedIds, fiveIds) {
  ids(expectedIds, 'expectedIds'); ids(fiveIds, 'fiveIds');
  if (fiveIds.length !== 5 || fiveIds.some(id => !expectedIds.includes(id))) throw new TypeError('Exactly five cohort IDs required');
  if (!Array.isArray(rows)) throw new TypeError('rows must be an array');
  const map = new Map(), expected = new Set(expectedIds);
  for (const r of rows) {
    if (!r || !expected.has(r.id) || map.has(r.id)) throw new TypeError('Duplicate or out-of-cohort prediction ID');
    map.set(r.id, r);
  }
  return { map, n: expectedIds.length };
}
function mean(x) { return x.length ? x.reduce((s, v) => s + v / x.length, 0) : null; }
function quantile(x, p) {
  if (!x.length) return null;
  const a = [...x].sort((u, v) => u - v), k = (a.length - 1) * p, lo = Math.floor(k), hi = Math.ceil(k);
  return a[lo] + (a[hi] - a[lo]) * (k - lo);
}
function regression(rows, expectedIds, fiveIds) {
  const { map, n } = align(rows, expectedIds, fiveIds), errors = [], absolute = [], passes = new Map();
  for (const r of map.values()) {
    if (!finite(r.actual) || r.actual <= 0) throw new TypeError('Relative error needs finite positive actual values');
    if (r.predicted === null) { passes.set(r.id, false); continue; }
    if (!finite(r.predicted) || r.predicted < 0) throw new TypeError('Invalid prediction; use explicit null for abstention');
    const delta = Math.abs(r.predicted - r.actual), ape = delta / r.actual;
    if (!finite(ape) || !finite(delta)) throw new RangeError('Unsafe relative-error arithmetic');
    errors.push(ape); absolute.push(delta); passes.set(r.id, ape <= 0.1);
  }
  const withinCount = [...passes.values()].filter(Boolean).length;
  const five = fiveIds.map(id => ({ id, passed: passes.get(id) === true }));
  const coverage = errors.length / n;
  return { n, scored: errors.length, missing: n - errors.length, coverage, withinCount,
    within10: withinCount / n, MAPE: mean(errors), MAE: mean(absolute),
    P95_APE: quantile(errors, 0.95), max_APE: errors.length ? Math.max(...errors) : null,
    errorMetricDenominator: errors.length, acceptanceDenominator: n, five,
    metricGatePassed: coverage === 1 && withinCount / n >= 0.9 && five.every(p => p.passed) };
}
function binary(rows, expectedIds, fiveIds) {
  const { map, n } = align(rows, expectedIds, fiveIds);
  let positives = 0, negatives = 0, tp = 0, tn = 0, fp = 0, fn = 0, classified = 0;
  const squared = [], passes = new Map();
  for (const r of map.values()) {
    if (!isClass(r.actual)) throw new TypeError('Binary target must be numeric 0 or 1');
    r.actual === 1 ? positives++ : negatives++;
    if (r.probability !== null) {
      if (!finite(r.probability) || r.probability < 0 || r.probability > 1) throw new TypeError('Invalid probability');
      squared.push((r.probability - r.actual) ** 2);
    }
    if (r.predicted === null) { passes.set(r.id, false); continue; }
    if (!isClass(r.predicted)) throw new TypeError('Binary decision must be 0, 1 or null');
    classified++; passes.set(r.id, r.actual === r.predicted);
    if (r.actual === 1) { r.predicted === 1 ? tp++ : fn++; }
    else { r.predicted === 1 ? fp++ : tn++; }
  }
  // Abstentions remain in class denominators, so selective reporting cannot inflate recall.
  const recall = classified && positives ? tp / positives : null;
  const specificity = classified && negatives ? tn / negatives : null;
  const balancedAccuracy = recall !== null && specificity !== null ? (recall + specificity) / 2 : null;
  const five = fiveIds.map(id => ({ id, passed: passes.get(id) === true }));
  return { n, labelsAvailable: map.size, positives, negatives, classified, abstainedOrMissing: n - classified,
    classificationCoverage: classified / n, probabilityCoverage: squared.length / n,
    accuracy: classified ? (tp + tn) / n : null, recall, specificity, balancedAccuracy,
    precision: classified ? (tp + fp ? tp / (tp + fp) : 0) : null,
    Brier: mean(squared), probabilityMetricDenominator: squared.length,
    confusionMatrix: classified ? [[tn, fp], [fn, tp]] : null, five,
    metricGatePassed: classified === n && map.size === n && positives >= 10 && negatives >= 10 &&
      balancedAccuracy >= 0.9 && recall >= 0.9 && five.every(p => p.passed) };
}
module.exports = { regression, binary };
