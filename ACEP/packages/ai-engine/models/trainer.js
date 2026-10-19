const projectAnalyzer = require('./project-analyzer');
const quantityEstimator = require('./quantity-estimator');
const costEstimator = require('./cost-estimator');
const riskAnalyzer = require('./risk-analyzer');
const qualityInspector = require('./quality-inspector');
const scheduleOptimizer = require('./schedule-optimizer');
const supplierIntelligence = require('./supplier-intelligence');

const trainers = Object.freeze({
  projectAnalyzer, quantityEstimator, costEstimator, riskAnalyzer,
  qualityInspector, scheduleOptimizer, supplierIntelligence,
});
const countFields = Object.freeze({
  projectAnalyzer: ['projectCount'], quantityEstimator: ['items'],
  costEstimator: ['materials', 'labor', 'equipment', 'suppliers'],
  riskAnalyzer: ['total'], qualityInspector: ['total'], scheduleOptimizer: ['total'],
  supplierIntelligence: ['suppliers', 'priceRecords'],
});

function requestedModels(value) {
  const names = value === undefined ? Object.keys(trainers) : value;
  if (!Array.isArray(names) || names.length === 0) throw new TypeError('models must be a non-empty array');
  for (const name of names) {
    if (typeof name !== 'string' || !Object.hasOwn(trainers, name)) throw new TypeError(`Unknown model: ${String(name)}`);
  }
  return [...new Set(names)];
}

async function runModels(names) {
  const results = { models: {}, errors: [], totalRecords: 0, successfulModels: 0, failedModels: 0,
    requestedModels: names.length, accuracyValidated: false };
  for (const name of names) {
    const model = trainers[name];
    try {
      const result = await model.train();
      if (!result || result.error || result.ok === false) throw new Error(result?.error || 'Training did not return a successful result');
      const counts = countFields[name].map(field => result[field]);
      if (counts.some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error('Training returned invalid record counts');
      const records = counts.reduce((sum, n) => sum + n, 0);
      if (!Number.isSafeInteger(records) || records === 0 || !Number.isSafeInteger(results.totalRecords + records)) {
        throw new Error('Training returned empty or unsafe record counts');
      }
      results.models[name] = { ok: true, result, records, accuracyValidated: false };
      results.totalRecords += records;
      results.successfulModels++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (Object.hasOwn(model, 'trained')) model.trained = false;
      results.models[name] = { ok: false, error: message, accuracyValidated: false };
      results.errors.push(`${name}: ${message}`);
      results.failedModels++;
    }
  }
  results.status = results.failedModels === 0 ? 'succeeded' : results.successfulModels === 0 ? 'failed' : 'partial_failure';
  results.ok = results.status === 'succeeded';
  return results;
}

function logSummary(results) {
  const message = `Model training: ${results.successfulModels}/${results.requestedModels} succeeded; ${results.failedModels} failed. Predictive accuracy is not validated by this run.`;
  if (results.ok) console.log(message);
  else console.error(message);
}

async function trainAllModels() {
  const results = await runModels(requestedModels());
  logSummary(results);
  // Preserve the old numeric `models` field as the requested count; expose outcomes separately.
  const { models: modelResults, ...summary } = results;
  return { ...summary, models: results.requestedModels, modelResults };
}

async function trainAllModelsFromUETS(uets, options = {}) {
  if (!uets || typeof uets.enqueueTraining !== 'function') {
    return { error: 'UETS not configured', ok: false, status: 'failed', accuracyValidated: false };
  }
  const names = requestedModels(options.models);
  let enqueued;
  try { enqueued = uets.enqueueTraining(names, options); }
  catch (error) { return { error: error instanceof Error ? error.message : String(error), ok: false, status: 'failed', accuracyValidated: false }; }
  const results = { ...(await runModels(names)), uets: true, queueId: enqueued && enqueued.id, notificationErrors: [] };
  if (typeof uets.enqueueEvaluation === 'function') {
    try { uets.enqueueEvaluation('training', { models: names, results }); }
    catch (error) { results.notificationErrors.push(`evaluation: ${error instanceof Error ? error.message : String(error)}`); }
  }
  if (typeof uets.enqueueFeedback === 'function') {
    try { uets.enqueueFeedback({ type: 'training', models: names, status: results.status,
      successfulModels: results.successfulModels, failedModels: results.failedModels, timestamp: new Date().toISOString() }); }
    catch (error) { results.notificationErrors.push(`feedback: ${error instanceof Error ? error.message : String(error)}`); }
  }
  logSummary(results);
  return results;
}

module.exports = { trainAllModels, trainAllModelsFromUETS };

