'use strict';

const projectAnalyzer = require('./project-analyzer');
const quantityEstimator = require('./quantity-estimator');
const costEstimator = require('./cost-estimator');
const riskAnalyzer = require('./risk-analyzer');
const qualityInspector = require('./quality-inspector');
const scheduleOptimizer = require('./schedule-optimizer');
const supplierIntelligence = require('./supplier-intelligence');

const TRAINERS = [
  { name: 'projectAnalyzer', label: 'Project Analyzer', model: projectAnalyzer, count: result => result.projectCount },
  { name: 'quantityEstimator', label: 'Quantity Estimator', model: quantityEstimator, count: result => result.items },
  { name: 'costEstimator', label: 'Cost Estimator', model: costEstimator, count: result => result.materials + result.labor + result.equipment + result.suppliers },
  { name: 'riskAnalyzer', label: 'Risk Analyzer', model: riskAnalyzer, count: result => result.total },
  { name: 'qualityInspector', label: 'Quality Inspector', model: qualityInspector, count: result => result.total },
  { name: 'scheduleOptimizer', label: 'Schedule Optimizer', model: scheduleOptimizer, count: result => result.total },
  { name: 'supplierIntelligence', label: 'Supplier Intelligence', model: supplierIntelligence, count: result => result.suppliers + result.priceRecords }
];

async function trainSelected(selected, context) {
  const results = {};
  const errors = [];
  let totalRecords = 0;

  for (const trainer of TRAINERS.filter(item => selected.includes(item.name))) {
    process.stdout.write(`\nTraining ${trainer.label}...\n`);
    try {
      const result = await trainer.model.train();
      const count = Number(trainer.count(result));
      if (!Number.isFinite(count) || count <= 0) throw new Error('Trainer returned no usable records');
      results[trainer.name] = { ok: true, count, result };
      totalRecords += count;
      process.stdout.write(`  completed with ${count} development records\n`);
    } catch (error) {
      errors.push({ model: trainer.name, message: error.message });
      results[trainer.name] = { ok: false, error: error.message };
      process.stderr.write(`  ${trainer.label} failed: ${error.message}\n`);
    }
  }

  if (errors.length > 0) {
    const failure = new Error(`${context} failed for ${errors.length} model(s): ${errors.map(item => item.model).join(', ')}`);
    failure.results = results;
    failure.failures = errors;
    throw failure;
  }

  return {
    totalRecords,
    models: Object.keys(results).length,
    results,
    executionMode: 'bundled_synthetic_development_data',
    suitableForModelApproval: false
  };
}

async function trainAllModels() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Bundled synthetic/legacy model training is forbidden in production');
  }
  process.stdout.write('\nACEP development training pipeline (synthetic/legacy data; not model approval)\n');
  return trainSelected(TRAINERS.map(item => item.name), 'Development training');
}

const { createSnapshot, loadSnapshot } = require('../../uets/training/snapshot');
const { runtimePath } = require('../../runtime/paths');
const { writeJsonAtomic } = require('../../runtime/atomic-json-store');
const crypto = require('crypto');
const REQUIREMENTS = {
  projectAnalyzer: ['projects'], quantityEstimator: ['boqItems'],
  costEstimator: ['materialPrices', 'laborRates', 'equipmentRates', 'suppliers'],
  riskAnalyzer: ['risks', 'projects'], qualityInspector: ['qualityDefects'],
  scheduleOptimizer: ['projects'], supplierIntelligence: ['suppliers', 'materialPrices']
};
async function runUETSSnapshot(selected, options) {
  if (process.env.NODE_ENV === 'production' && process.env.ACEP_PROCESS_ROLE !== 'training-worker') throw new Error('In-process retraining is forbidden in production');
  const { manifest, paths } = loadSnapshot(options.snapshotId);
  const results = {}; let totalRecords = 0;
  for (const name of selected) {
    const trainer = TRAINERS.find(t => t.name === name);
    if (!trainer) throw new Error('Unknown UETS model: ' + name);
    const missing = REQUIREMENTS[name].filter(table => !paths[table]);
    if (missing.length) throw new Error(name + ': missing UETS source tables: ' + missing.join(', '));
  }
  for (const name of selected) {
    const trainer = TRAINERS.find(t => t.name === name);
    const model = new trainer.model.constructor(); // Candidate only; active singleton remains unchanged.
    const result = await model.train(...REQUIREMENTS[name].map(table => paths[table]));
    const count = trainer.count(result);
    if (!Number.isFinite(count) || count <= 0) throw new Error(name + ': no usable UETS records');
    const artifact = { schemaVersion: 1, model: name, snapshot: manifest, statistics: model,
      suitableForModelApproval: false, activation: 'requires_independent_evaluation_and_review' };
    const hash = crypto.createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
    writeJsonAtomic(runtimePath('uets', 'candidates', hash + '.json'), artifact);
    results[name] = { ok: true, count, artifactSha256: hash, result }; totalRecords += count;
  }
  return { totalRecords, models: selected.length, results, snapshotId: manifest.id,
    executionMode: 'uets_immutable_snapshot', suitableForModelApproval: false, activated: false };
}
async function trainAllModelsFromUETS(uets, options = {}) {
  if (process.env.NODE_ENV === 'production' && process.env.ACEP_PROCESS_ROLE !== 'training-worker') throw new Error('In-process retraining is forbidden in production');
  if (!uets) throw new Error('UETS is not configured');
  const selected = options.models || TRAINERS.map(t => t.name);
  if (!Array.isArray(selected) || !selected.length || selected.some(name => !REQUIREMENTS[name])) throw new Error('Unknown or empty UETS model selection');
  const snapshotId = createSnapshot(uets);
  const job = uets.enqueueTraining(selected, { snapshotId });
  await uets.processTrainingQueue(runUETSSnapshot);
  const finished = uets.getTrainingHistory(200).find(entry => entry.id === job.id) || job;
  if (finished.status === 'failed') throw new Error(finished.error);
  if (finished.status !== 'completed') return { status: 'queued', queueId: job.id, snapshotId };
  return { ...finished.result, uets: true, queueId: job.id };
}
module.exports = { trainAllModels, trainAllModelsFromUETS, runUETSSnapshot };
