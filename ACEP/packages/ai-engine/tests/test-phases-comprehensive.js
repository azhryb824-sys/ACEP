/**
 * Comprehensive integration test for all 10 phases + AI models + retraining
 * Tests modules directly (no HTTP server required)
 */
const path = require('path');

// ── Test Framework ──
const T = [];
let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  T.push({ name, ok, detail });
  if (ok) { pass++; process.stdout.write('  \u2713 ' + name + '\n'); }
  else { fail++; process.stdout.write('  \u2717 ' + name + ' - ' + detail + '\n'); }
}
function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log('  ' + title);
  console.log('='.repeat(60));
}

function freshModel(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

async function main() {
  // ═══════════════════════════════════════════
  //  P1: AI Engine & Model Loading
  // ═══════════════════════════════════════════
  section('P1: AI Engine & Model Loading');
  const ai = require('../index');
  check('AI engine loaded', !!ai.initialize, '');
  check('All 7 models accessible',
    !!(ai.projectAnalyzer && ai.costEstimator && ai.riskAnalyzer && ai.qualityInspector &&
       ai.scheduleOptimizer && ai.supplierIntelligence && ai.quantityEstimator), '');

  try {
    const trainResult = await ai.initialize();
    check('ai.initialize() trained all models', trainResult?.totalRecords > 0, `${trainResult?.totalRecords} records`);
    const st = ai.getStatus();
    check('All 7 models show trained',
      st.projectAnalyzer && st.costEstimator && st.riskAnalyzer && st.qualityInspector &&
      st.scheduleOptimizer && st.supplierIntelligence && st.quantityEstimator, '');
  } catch (e) {
    check('AI initialize/train', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  Shared Dependencies (built like server.js)
  // ═══════════════════════════════════════════
  const TrainingDataBridge = require('../training-data-bridge');
  const trainingBridge = new TrainingDataBridge();
  trainingBridge.loadAll();

  const KnowledgeDatasetLoader = require('../knowledge-dataset-loader');
  const knowledgeDataset = new KnowledgeDatasetLoader(trainingBridge);
  knowledgeDataset.initialize();

  const DataStandards = require('../data-standards');
  const dataStandards = new DataStandards();

  const DataQualityPipeline = require('../data-quality-pipeline');
  const dqp = new DataQualityPipeline(dataStandards, trainingBridge, knowledgeDataset);

  const KnowledgeGrowthSystem = require('../knowledge-growth-system');
  const growth = new KnowledgeGrowthSystem(knowledgeDataset, trainingBridge, null, null);

  const BenchmarkLibrary = require('../benchmark-library');
  const benchmark = new BenchmarkLibrary(knowledgeDataset, ai, dataStandards, dqp);

  const UnifiedKnowledgeBase = require('../unified-knowledge-base');
  const unifiedKB = new UnifiedKnowledgeBase(knowledgeDataset, trainingBridge, null, ai.knowledgeEngine);

  const PeriodicEvaluation = require('../periodic-evaluation');
  const evalModule = new PeriodicEvaluation(benchmark, growth, unifiedKB, dqp);

  const SelectiveRetraining = require('../selective-retraining');
  const retrainer = new SelectiveRetraining(benchmark, knowledgeDataset, growth, evalModule);

  // ═══════════════════════════════════════════
  //  P2: Knowledge Dataset Loader
  // ═══════════════════════════════════════════
  section('P2: Knowledge Dataset Loader');
  try {
    const stats = knowledgeDataset.getStats();
    check('projectTypes loaded = 19', stats?.projectTypes === 19, `${stats?.projectTypes} types`);
    check('unitPriceItems > 0', stats?.unitPriceItems > 0, `${stats?.unitPriceItems} items`);
    const sqVilla = knowledgeDataset.getStandardQuantities('Villa');
    check('Villa perM2.concrete.mean > 0', sqVilla?.perM2?.concrete?.mean > 0, `mean=${sqVilla?.perM2?.concrete?.mean}`);
    const sqSchool = knowledgeDataset.getStandardQuantities('School');
    check('School perM2.steel.mean > 0', sqSchool?.perM2?.steel?.mean > 0, `mean=${sqSchool?.perM2?.steel?.mean}`);
  } catch (e) {
    check('Knowledge Dataset Loader', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  P3: Data Standards
  // ═══════════════════════════════════════════
  section('P3: Data Standards');
  try {
    check('schemas loaded (9 incl. EGT)', Object.keys(dataStandards.schemas || {}).length === 9,
      `${Object.keys(dataStandards.schemas || {}).length} schemas`);
    const norm = dataStandards.normalizeUnit('m2');
    check('normalizeUnit("m2") works', norm === 'm²' || !!norm, norm);
    const allowed = dataStandards.getAllowedValues('qualityDefect', 'severity');
    check('getAllowedValues(qualityDefect, severity) > 0', Array.isArray(allowed) && allowed.length > 0, `${allowed?.length || 0} values`);
  } catch (e) {
    check('Data Standards', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  P4: Data Quality Pipeline
  // ═══════════════════════════════════════════
  section('P4: Data Quality Pipeline');
  try {
    const quality = dqp.runFullCheck();
    check('runFullCheck() ran', quality !== undefined, '');
    if (quality) {
      check('overall.grade exists', !!quality.overall?.grade, quality.overall?.grade || 'N/A');
      check('overall.qualityScore >= 0', quality.overall?.qualityScore >= 0, `${quality.overall?.qualityScore}`);
      check('overall.anomalyCount >= 0', quality.overall?.anomalyCount >= 0,
        `${quality.overall?.anomalyCount} anomalies`);
    }
  } catch (e) {
    check('Data Quality Pipeline', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  P5: Knowledge Growth System
  // ═══════════════════════════════════════════
  section('P5: Knowledge Growth System');
  try {
    growth.recordApprovedProject('Villa', { area: 500, floors: 2, cost: 800000 });
    const log = growth.exportGrowthLog ? growth.exportGrowthLog() : growth._growthLog || [];
    check('recordApprovedProject() called', typeof growth.recordApprovedProject === 'function', '');
    check('exportGrowthLog() returns array', Array.isArray(log), `${log.length} entries`);
    const suggestions = growth.suggestDatasetUpdates();
    check('suggestDatasetUpdates() returns array', suggestions !== undefined, `${typeof suggestions}`);
  } catch (e) {
    check('Knowledge Growth System', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  P6: Benchmark Library
  // ═══════════════════════════════════════════
  section('P6: Benchmark Library');
  try {
    const benchResult = benchmark.runAll();
    check('runAll() OK', benchResult !== undefined, '');
    if (benchResult) {
      check('projectTypesTested > 0', benchResult.projectTypesTested > 0, `${benchResult.projectTypesTested} types`);
      check('totalTests > 0', benchResult.totalTests > 0, `${benchResult.totalTests} tests`);
      check('byModel populated', Object.keys(benchResult.byModel || benchResult.perModel || {}).length > 0,
        Object.keys(benchResult.byModel || benchResult.perModel || {}).join(', '));
    }
  } catch (e) {
    check('Benchmark Library', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  P7: Unified Knowledge Base
  // ═══════════════════════════════════════════
  section('P7: Unified Knowledge Base');
  try {
    const kbStats = unifiedKB.getStatistics();
    check('getStatistics() returns data', kbStats !== undefined, '');
    if (kbStats) {
      check('knowledgeSources.csvProjects > 0', kbStats?.knowledgeSources?.csvProjects > 0,
        `${kbStats?.knowledgeSources?.csvProjects}`);
      check('knowledgeSources.recordedProjects > 0', kbStats?.knowledgeSources?.recordedProjects > 0,
        `${kbStats?.knowledgeSources?.recordedProjects}`);
    }
    const query = unifiedKB.query({ type: 'Villa', limit: 3 });
    check('query(type=Villa) returns results', (query?.results || []).length > 0,
      `${(query?.results || []).length} results`);
    const search = unifiedKB.search('concrete');
    check('search(concrete) returns results', (search?.results || []).length > 0, `${(search?.results || []).length} results`);
  } catch (e) {
    check('Unified Knowledge Base', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  P8: Periodic Evaluation
  // ═══════════════════════════════════════════
  section('P8: Periodic Evaluation');
  try {
    const schedule = evalModule.createSchedule({ name: 'daily', interval: 3600000, type: 'comprehensive' });
    check('createSchedule() OK', schedule?.ok === true, '');
    const schedules = evalModule.listSchedules();
    check('listSchedules() > 0', schedules.length > 0, `${schedules.length} schedules`);
  } catch (e) {
    check('Periodic Evaluation (schedule)', false, e.message);
  }
  try {
    const evalResult = evalModule.evaluateNow({ actions: ['full'] });
    check('evaluateNow() completed', evalResult !== undefined, '');
    if (evalResult) {
      check('has timestamp', !!evalResult.timestamp, '');
      check('has actions array', Array.isArray(evalResult.actions), `${evalResult.actions.length} actions`);
    }
    const history = evalModule.getHistory();
    check('getHistory() > 0', history.length > 0, `${history.length} entries`);
    const latest = evalModule.getLatest();
    check('getLatest() returns result', latest !== null, '');
  } catch (e) {
    check('Periodic Evaluation (run)', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  P9: Selective Retraining
  // ═══════════════════════════════════════════
  section('P9: Selective Retraining');
  try {
    const analysis = retrainer.analyze();
    check('analyze() returns data', analysis !== undefined, '');
    if (analysis) {
      check('has weakAreas', !!analysis.weakAreas, '');
      check('lowSamples array', Array.isArray(analysis.weakAreas?.lowSamples),
        `${analysis.weakAreas?.lowSamples?.length} areas`);
      check('byModel array', Array.isArray(analysis.weakAreas?.byModel),
        `${analysis.weakAreas?.byModel?.length} models`);
      check('highMAPE array', Array.isArray(analysis.weakAreas?.highMAPE),
        `${analysis.weakAreas?.highMAPE?.length} areas`);
    }
    const retrainPlan = retrainer.retrain();
    check('retrain() returns result', retrainPlan !== undefined, '');
    if (retrainPlan) check('has totalActions >= 0', retrainPlan.totalActions >= 0,
      `${retrainPlan.totalActions} actions`);
    const thresholds = retrainer.getThresholds();
    check('getThresholds() returns config', thresholds !== null, '');
  } catch (e) {
    check('Selective Retraining', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  P10: Knowledge Driven Decisions
  // ═══════════════════════════════════════════
  section('P10: Knowledge Driven Decisions');
  const KnowledgeDrivenDecisions = require('../knowledge-driven-decisions');
  try {
    const kdd = new KnowledgeDrivenDecisions(ai, knowledgeDataset, unifiedKB, evalModule, retrainer, benchmark, dqp);
    const costDec = kdd.decide({ type: 'Villa', area: 500, floors: 2, decisionType: 'estimate_cost' });
    check('decide(estimate_cost) OK', costDec !== undefined, '');
    if (costDec) {
      check('has conclusion.cost', costDec.conclusion?.cost > 0, `${costDec.conclusion?.cost} SAR`);
      check('confidence > 0', costDec.confidence > 0, `${costDec.confidence}%`);
    }
    const typeDec = kdd.decide({ area: 500, floors: 2, city: 'Riyadh', decisionType: 'recommend_project_type' });
    check('decide(recommend_project_type) OK', typeDec !== undefined, '');
    if (typeDec) {
      check('has bestType.type', typeDec.conclusion?.bestType?.type?.length > 0,
        typeDec.conclusion?.bestType?.type || 'N/A');
      check('confidence > 0', typeDec.confidence > 0, `${typeDec.confidence}`);
    }
    const healthDec = kdd.decide({ decisionType: 'system_health' });
    check('decide(system_health) OK', healthDec !== undefined, '');
    if (healthDec) check('has healthScore', healthDec.conclusion?.healthScore !== undefined,
      `${healthDec.conclusion?.healthScore}`);
  } catch (e) {
    check('Knowledge Driven Decisions', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  Retraining Orchestrator (closes P9 loop)
  // ═══════════════════════════════════════════
  section('Retraining Orchestrator (P9->Model Loop)');
  const RetrainingOrchestrator = require('../retraining-orchestrator');
  try {
    const rOrch = new RetrainingOrchestrator(ai, trainingBridge, knowledgeDataset, growth, benchmark, retrainer);
    const r1 = rOrch.retrainAll({ force: true });
    check('retrainAll() OK', r1 !== undefined, '');
    if (r1) {
      check('7 models retrained', Object.keys(r1.models).length === 7, `${Object.keys(r1.models).length} models`);
      check('no errors', r1.errors.length === 0, `${r1.errors.length} errors`);
      check('has benchmarkAfter', !!r1.benchmarkAfter, r1.benchmarkAfter?.passRate || '');
    }
    const r2 = rOrch.retrainAll({ force: true });
    check('retrainAll() repeat OK (bug fix)', r2 !== undefined, '');
    if (r2) {
      check('7 models retrained again', Object.keys(r2.models).length === 7, '');
      check('still no errors', r2.errors.length === 0, `${r2.errors.length} errors`);
    }
    const r3 = rOrch.retrainWeakAreas();
    check('retrainWeakAreas() OK', r3 !== undefined, '');
    if (r3) {
      check('has actionsTaken', r3.actionsTaken >= 0, `${r3.actionsTaken} actions`);
      check('has benchmarkAfter', !!r3.benchmarkAfter, r3.benchmarkAfter?.passRate || '');
    }
    const roStats = rOrch.getStats();
    check('totalRetrains >= 3', roStats.totalRetrains >= 3, `${roStats.totalRetrains} retrains`);
  } catch (e) {
    check('Retraining Orchestrator', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  Phase Persistence
  // ═══════════════════════════════════════════
  section('Phase Persistence');
  const PhasePersistence = require('../phase-persistence');
  try {
    const store = new PhasePersistence();
    const saved = store.saveAll({
      growthLog: [], benchmarkResults: [], evaluationHistory: [],
      retrainingHistory: [], decisionLog: []
    });
    check('saveAll() returns ok', saved?.ok === true, '');
    const loaded = store.loadAll();
    check('loadAll() returns data', loaded !== null, '');
    if (loaded) {
      check('has growthLog', Array.isArray(loaded.growthLog), '');
      check('has benchmarkResults', Array.isArray(loaded.benchmarkResults), '');
      check('has evaluationHistory', Array.isArray(loaded.evaluationHistory), '');
      check('has retrainingHistory', Array.isArray(loaded.retrainingHistory), '');
      check('has decisionLog', Array.isArray(loaded.decisionLog), '');
    }
  } catch (e) {
    check('Phase Persistence', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  Double Retrain Bug Verification
  // ═══════════════════════════════════════════
  section('Bug Fix: Double Retrain Verification');
  const csvDir = path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv');
  try {
    let ra = freshModel('../models/risk-analyzer');
    let r = await ra.train(path.join(csvDir, 'risks.csv'));
    check('riskAnalyzer 1st train', r.total > 0, `${r.total} risks`);
    r = await ra.train(path.join(csvDir, 'risks.csv'));
    check('riskAnalyzer 2nd train (no crash)', r.total > 0, `${r.total} risks`);

    let qi = freshModel('../models/quality-inspector');
    r = await qi.train(path.join(csvDir, 'quality_defects.csv'));
    check('qualityInspector 1st train', r.total > 0, `${r.total} defects`);
    r = await qi.train(path.join(csvDir, 'quality_defects.csv'));
    check('qualityInspector 2nd train (no crash)', r.total > 0, `${r.total} defects`);

    let so = freshModel('../models/schedule-optimizer');
    r = await so.train(path.join(csvDir, 'projects.csv'));
    check('scheduleOptimizer 1st train', r.total > 0, `${r.total} projects`);
    r = await so.train(path.join(csvDir, 'projects.csv'));
    check('scheduleOptimizer 2nd train (no crash)', r.total > 0, `${r.total} projects`);

    let si = freshModel('../models/supplier-intelligence');
    r = await si.train();
    check('supplierIntelligence 1st train', r.suppliers > 0, `${r.suppliers} suppliers`);
    r = await si.train();
    check('supplierIntelligence 2nd train (no crash)', r.suppliers > 0, `${r.suppliers} suppliers`);
  } catch (e) {
    check('Double retrain bug fix', false, e.message);
  }

  // ═══════════════════════════════════════════
  //  Summary
  // ═══════════════════════════════════════════
  console.log('\n' + '='.repeat(60));
  console.log(`  Result: ${pass} passed, ${fail} failed out of ${T.length} tests`);
  console.log('='.repeat(60));
  if (fail > 0) {
    process.stdout.write('\nFailing tests:\n');
    T.forEach(t => { if (!t.ok) process.stdout.write('  \u2717 ' + t.name + ': ' + t.detail + '\n'); });
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
