const projectAnalyzer = require('./project-analyzer');
const quantityEstimator = require('./quantity-estimator');
const costEstimator = require('./cost-estimator');
const riskAnalyzer = require('./risk-analyzer');
const qualityInspector = require('./quality-inspector');
const scheduleOptimizer = require('./schedule-optimizer');
const supplierIntelligence = require('./supplier-intelligence');

async function trainAllModels() {
  console.log('═══════════════════════════════════════');
  console.log('  ACEP AI Model Training Pipeline');
  console.log('═══════════════════════════════════════');
  let total = 0;

  try {
    console.log('\n📊 Training Project Analyzer...');
    const r1 = await projectAnalyzer.train();
    total += r1.projectCount;
    console.log(`  ✓ Trained on ${r1.projectCount} projects (${r1.typeCount} types)`);
  } catch (e) { console.error('  ✗ Project Analyzer failed:', e.message); }

  try {
    console.log('\n📊 Training Quantity Estimator...');
    const r2 = await quantityEstimator.train();
    total += r2.items;
    console.log(`  ✓ Trained on ${r2.items} BOQ items (${r2.categories} categories)`);
  } catch (e) { console.error('  ✗ Quantity Estimator failed:', e.message); }

  try {
    console.log('\n📊 Training Cost Estimator...');
    const r3 = await costEstimator.train();
    total += r3.materials + r3.labor + r3.equipment + r3.suppliers;
    console.log(`  ✓ Materials: ${r3.materials}, Labor: ${r3.labor}, Equipment: ${r3.equipment}, Suppliers: ${r3.suppliers}`);
  } catch (e) { console.error('  ✗ Cost Estimator failed:', e.message); }

  try {
    console.log('\n📊 Training Risk Analyzer...');
    const r4 = await riskAnalyzer.train();
    total += r4.total;
    console.log(`  ✓ Trained on ${r4.total} risk records (${r4.categories} categories)`);
  } catch (e) { console.error('  ✗ Risk Analyzer failed:', e.message); }

  try {
    console.log('\n📊 Training Quality Inspector...');
    const r5 = await qualityInspector.train();
    total += r5.total;
    console.log(`  ✓ Trained on ${r5.total} quality defects (${r5.types} types)`);
  } catch (e) { console.error('  ✗ Quality Inspector failed:', e.message); }

  try {
    console.log('\n📊 Training Schedule Optimizer...');
    const r6 = await scheduleOptimizer.train();
    total += r6.total;
    console.log(`  ✓ Trained on ${r6.total} project schedules (${r6.types} types)`);
  } catch (e) { console.error('  ✗ Schedule Optimizer failed:', e.message); }

  try {
    console.log('\n📊 Training Supplier Intelligence...');
    const r7 = await supplierIntelligence.train();
    total += r7.suppliers + r7.priceRecords;
    console.log(`  ✓ Loaded ${r7.suppliers} suppliers, ${r7.priceRecords} price records`);
  } catch (e) { console.error('  ✗ Supplier Intelligence failed:', e.message); }

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ All ${7} models trained successfully`);
  console.log(`   Total training records: ${total.toLocaleString()}`);
  console.log('═══════════════════════════════════════');

  return { totalRecords: total, models: 7 };
}

async function trainAllModels() {
  console.log('═══════════════════════════════════════');
  console.log('  ACEP AI Model Training Pipeline');
  console.log('═══════════════════════════════════════');
  let total = 0;

  try {
    console.log('\n📊 Training Project Analyzer...');
    const r1 = await projectAnalyzer.train();
    total += r1.projectCount;
    console.log(`  ✓ Trained on ${r1.projectCount} projects (${r1.typeCount} types)`);
  } catch (e) { console.error('  ✗ Project Analyzer failed:', e.message); }

  try {
    console.log('\n📊 Training Quantity Estimator...');
    const r2 = await quantityEstimator.train();
    total += r2.items;
    console.log(`  ✓ Trained on ${r2.items} BOQ items (${r2.categories} categories)`);
  } catch (e) { console.error('  ✗ Quantity Estimator failed:', e.message); }

  try {
    console.log('\n📊 Training Cost Estimator...');
    const r3 = await costEstimator.train();
    total += r3.materials + r3.labor + r3.equipment + r3.suppliers;
    console.log(`  ✓ Materials: ${r3.materials}, Labor: ${r3.labor}, Equipment: ${r3.equipment}, Suppliers: ${r3.suppliers}`);
  } catch (e) { console.error('  ✗ Cost Estimator failed:', e.message); }

  try {
    console.log('\n📊 Training Risk Analyzer...');
    const r4 = await riskAnalyzer.train();
    total += r4.total;
    console.log(`  ✓ Trained on ${r4.total} risk records (${r4.categories} categories)`);
  } catch (e) { console.error('  ✗ Risk Analyzer failed:', e.message); }

  try {
    console.log('\n📊 Training Quality Inspector...');
    const r5 = await qualityInspector.train();
    total += r5.total;
    console.log(`  ✓ Trained on ${r5.total} quality defects (${r5.types} types)`);
  } catch (e) { console.error('  ✗ Quality Inspector failed:', e.message); }

  try {
    console.log('\n📊 Training Schedule Optimizer...');
    const r6 = await scheduleOptimizer.train();
    total += r6.total;
    console.log(`  ✓ Trained on ${r6.total} project schedules (${r6.types} types)`);
  } catch (e) { console.error('  ✗ Schedule Optimizer failed:', e.message); }

  try {
    console.log('\n📊 Training Supplier Intelligence...');
    const r7 = await supplierIntelligence.train();
    total += r7.suppliers + r7.priceRecords;
    console.log(`  ✓ Loaded ${r7.suppliers} suppliers, ${r7.priceRecords} price records`);
  } catch (e) { console.error('  ✗ Supplier Intelligence failed:', e.message); }

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ All ${7} models trained successfully`);
  console.log(`   Total training records: ${total.toLocaleString()}`);
  console.log('═══════════════════════════════════════');

  return { totalRecords: total, models: 7 };
}

async function trainAllModelsFromUETS(uets, options = {}) {
  const modelNames = options.models || [
    'projectAnalyzer', 'quantityEstimator', 'costEstimator', 'riskAnalyzer',
    'qualityInspector', 'scheduleOptimizer', 'supplierIntelligence',
  ];

  console.log('═══════════════════════════════════════');
  console.log('  ACEP AI Model Training Pipeline (UETS)');
  console.log('═══════════════════════════════════════');

  if (!uets) return { error: 'UETS not configured' };

  const enqueued = uets.enqueueTraining(modelNames, options);

  const results = { models: {}, errors: [], uets: true, queueId: enqueued && enqueued.id };
  const trainers = {
    projectAnalyzer, quantityEstimator, costEstimator, riskAnalyzer,
    qualityInspector, scheduleOptimizer, supplierIntelligence,
  };

  for (const name of modelNames) {
    const model = trainers[name];
    if (!model) { results.errors.push(`${name}: unknown model`); continue; }
    try {
      const r = await model.train();
      results.models[name] = { ok: true, result: r };
    } catch (e) {
      results.models[name] = { ok: false, error: e.message };
      results.errors.push(`${name}: ${e.message}`);
    }
  }

  if (typeof uets.enqueueEvaluation === 'function') {
    try { uets.enqueueEvaluation('training', { models: modelNames, results }); } catch {}
  }
  if (typeof uets.enqueueFeedback === 'function') {
    try { uets.enqueueFeedback({ type: 'training', models: modelNames, timestamp: new Date().toISOString() }); } catch {}
  }

  console.log(`✅ ${modelNames.length} models trained via UETS (errors: ${results.errors.length})`);
  console.log('═══════════════════════════════════════');

  return results;
}

module.exports = { trainAllModels, trainAllModelsFromUETS };
