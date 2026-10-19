'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const ROOT = path.resolve(__dirname, '../..');
const Benchmark = require('../../packages/ai-engine/benchmark-library');
const Selective = require('../../packages/ai-engine/selective-retraining');
const Periodic = require('../../packages/ai-engine/periodic-evaluation');
const Decisions = require('../../packages/ai-engine/knowledge-driven-decisions');
const metrics = require('../../packages/ai-engine/evaluation-metrics');
const { readModelEvidence } = require('../../packages/ai-engine/model-evidence');
const view = require('../../packages/ui/web/src/model-evidence-view');
const cases = [];
async function check(name, fn) { await fn(); cases.push(name); }
const clone = x => JSON.parse(JSON.stringify(x));
const five = ['a', 'b', 'c', 'd', 'e'];
const perfect = five.map(id => ({ id, actual: 100, predicted: 100 }));
const info = { samples: 100, avgBuildingArea: 100, avgFloors: { mean: 2 },
  avgCost: { mean: 100, samples: 100 }, avgDuration: { mean: 10, samples: 100 },
  perM2: { concrete: { mean: .4, samples: 100 } } };
function diagnostic(overrides = {}, reference = info) {
  const calls = [];
  const dataset = { getStandardQuantities: type => type ? reference : { data: { Villa: reference } } };
  const ai = {
    quantityEstimator: { estimateBOQ: () => ({ items: [{ quantity: 1 }] }) },
    costEstimator: { estimateCost: () => ({ totalCost: 200 }) },
    scheduleOptimizer: { generateSchedule: (type, area) => { calls.push(area); return { totalMonths: 40 }; } },
    ...overrides
  };
  return { benchmark: new Benchmark(dataset, ai), dataset, calls };
}
function sandboxModule(relative, resolve) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, relative), 'utf8'), { module, require: resolve,
    __dirname: path.dirname(path.join(ROOT, relative)), console, setTimeout, clearTimeout });
  return module.exports;
}
function route(source, marker, context) {
  const start = source.indexOf(marker); assert.ok(start >= 0);
  const end = source.indexOf('\n});', start); assert.ok(end > start);
  let handler;
  vm.runInNewContext(source.slice(start, end + 5), { ...context,
    app: { get: (url, fn) => { handler = fn; }, post: (url, fn) => { handler = fn; } } });
  return handler;
}
function response() {
  return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

(async () => {
  await check('Quantity self-comparison no longer reports 100%', () => {
    const r = diagnostic().benchmark.runAll();
    assert.equal(r.details[0].models.concreteQuantity.predicted, null);
    assert.equal(r.details[0].models.concreteQuantity.accuracy, null);
    assert.equal(r.byModel.concreteQuantity.passRate, null);
    assert.equal(r.passed, null); assert.equal(r.accuracyValidated, false);
  });
  await check('Cost/duration predictions are not mixed with the reference target', () => {
    const t = diagnostic(), r = t.benchmark.runAll();
    assert.equal(r.details[0].models.costEstimation.predicted, 200);
    assert.equal(r.details[0].models.costEstimation.relativeDifferencePercent, 100);
    assert.equal(r.details[0].models.scheduleEstimation.predicted, 40);
    assert.equal(r.scored, 2); assert.equal(r.unavailable, 5);
    assert.equal(t.calls[0], 200);
  });
  await check('Failed cost prediction stays unscored instead of returning historical mean', () => {
    const r = diagnostic({ costEstimator: { estimateCost() { throw Error('model failed'); } } }).benchmark.runAll();
    assert.equal(r.details[0].models.costEstimation.predicted, null);
    assert.equal(r.byModel.costEstimation.errors, 1);
  });
  await check('Missing geometry does not invent 500m²/two floors', () => {
    const r = diagnostic({}, { ...info, avgBuildingArea: null }).benchmark.runAll();
    assert.equal(r.scored, 0); assert.equal(r.details[0].area, null);
  });
  await check('Empty eligible cohort produces no NaN or pass', () => {
    const r = diagnostic({}, { ...info, samples: 1 }).benchmark.runAll();
    assert.equal(r.ok, false); assert.equal(r.passed, null); assert.equal(r.coverage, 0);
  });
  await check('No source data yields a defined failure shape', () => {
    const b = new Benchmark({ getStandardQuantities: () => null }, {});
    const r = b.runAll(); assert.equal(r.ok, false); assert.deepEqual(r.byModel, {});
    assert.equal(new Periodic(b).evaluateNow({ actions: ['benchmark'] }).actions[0].ok, false);
  });
  await check('Legacy persisted aggregate scores never appear as current accuracy', () => {
    const { benchmark: b } = diagnostic(); b._results = [{ passed: 100, byModel: { cost: { avgAccuracy: 100 } } }];
    b._lastRun = b._results[0];
    assert.equal(b.getTrends()[0].passRate, null); assert.equal(b.getTrends()[0].models[0].avgAccuracy, null);
    assert.equal(b.getLastResults().accuracyValidated, false); assert.equal(b.getLastResults().ok, false);
  });
  await check('Null diagnostic accuracy requests evidence, not model recalibration', () => {
    const t = diagnostic(); t.benchmark.runAll();
    const s = new Selective(t.benchmark, t.dataset, null, null), a = s.analyze();
    assert.equal(a.weakAreas.byModel.length, 0); assert.equal(a.evaluationNeeded, true);
    assert.equal(a.evidenceGaps.length, 1);
    const plan = s.retrain({ execute: true }); assert.equal(plan.completed, false); assert.equal(plan.executed, false);
    assert.equal(plan.actions[0].type, 'collect_evaluation_evidence');
  });
  await check('Validated low-accuracy evidence still triggers a targeted plan', () => {
    const t = diagnostic(), b = { getLastResults: () => ({ accuracyValidated: true, independentTest: true,
      byModel: { cost: { avgAccuracy: 50 } }, details: [] }) };
    assert.equal(new Selective(b, t.dataset, null, null).analyze().weakAreas.byModel.length, 1);
  });
  await check('System-health confidence remains unknown without independent acceptance', () => {
    const t = diagnostic(); t.benchmark.runAll();
    const d = new Decisions({}, t.dataset, {}, { getStats: () => ({ totalEvaluations: 100 }) }, {}, t.benchmark,
      { runFullCheck: () => ({ overall: { qualityScore: 100 } }) });
    const r = d.decide({ decisionType: 'system_health' });
    assert.equal(r.confidence, null); assert.equal(r.applied, false); assert.equal(r.conclusion.healthScore, null);
    assert.equal(d.getStats().avgConfidence, null);
  });
  await check('Regression metric gate can pass complete independent numbers', () => {
    const r = metrics.regression(perfect, five, five); assert.equal(r.metricGatePassed, true); assert.equal(r.MAPE, 0);
  });
  await check('Missing rows remain in the acceptance denominator', () => {
    const r = metrics.regression(perfect.slice(0, 4), five, five);
    assert.equal(r.within10, .8); assert.equal(r.coverage, .8); assert.equal(r.metricGatePassed, false);
  });
  await check('Null prediction is abstention, never zero error', () => {
    const rows = clone(perfect); rows[0].predicted = null;
    const r = metrics.regression(rows, five, five); assert.equal(r.scored, 4); assert.equal(r.withinCount, 4);
  });
  await check('Zero-valued prediction is scored as 100% relative error', () => {
    const rows = clone(perfect); rows[0].predicted = 0;
    const r = metrics.regression(rows, five, five); assert.equal(r.MAPE, .2); assert.equal(r.scored, 5);
  });
  for (const bad of [NaN, Infinity, -1, '100', undefined]) await check('Reject invalid numeric prediction: ' + String(bad), () => {
    const rows = clone(perfect); rows[0].predicted = bad;
    assert.throws(() => metrics.regression(rows, five, five));
  });
  await check('Zero actual target cannot silently inflate percentage accuracy', () => {
    assert.throws(() => metrics.regression([{ ...perfect[0], actual: 0 }, ...perfect.slice(1)], five, five));
  });
  await check('Duplicate, unknown and invalid fixed-five identities fail closed', () => {
    assert.throws(() => metrics.regression([...perfect, perfect[0]], five, five));
    assert.throws(() => metrics.regression([{ ...perfect[0], id: 'foreign' }], five, five));
    assert.throws(() => metrics.regression(perfect, five, [...five.slice(0, 4), 'a']));
    assert.throws(() => metrics.regression(perfect, five, five.slice(0, 4)));
  });
  const classIds = Array.from({ length: 100 }, (_, i) => 'p' + i), classFive = ['p0', 'p1', 'p2', 'p3', 'p99'];
  const majority = classIds.map((id, i) => ({ id, actual: i >= 95 ? 1 : 0, predicted: 0, probability: .05 }));
  await check('95% majority raw accuracy cannot pass balanced-accuracy acceptance', () => {
    const r = metrics.binary(majority, classIds, classFive);
    assert.equal(r.accuracy, .95); assert.equal(r.balancedAccuracy, .5); assert.equal(r.recall, 0);
    assert.equal(r.metricGatePassed, false);
  });
  await check('All abstentions retain probability scores but no classification accuracy', () => {
    const r = metrics.binary(majority.map(x => ({ ...x, predicted: null })), classIds, classFive);
    assert.equal(r.accuracy, null); assert.equal(r.balancedAccuracy, null); assert.equal(r.classificationCoverage, 0);
    assert.ok(r.Brier > 0); assert.equal(r.metricGatePassed, false);
  });
  await check('Partial abstention cannot inflate minority recall', () => {
    const r = metrics.binary(majority.map((x, i) => ({ ...x, predicted: i === 95 ? 1 : i > 95 ? null : 0 })), classIds, classFive);
    assert.equal(r.recall, .2); assert.equal(r.metricGatePassed, false);
  });
  await check('Correct classification still requires class-size and fixed-five gates', () => {
    const r = metrics.binary(majority.map(x => ({ ...x, predicted: x.actual })), classIds, classFive);
    assert.equal(r.accuracy, 1); assert.equal(r.metricGatePassed, false);
    const adequate = majority.map((x, i) => ({ ...x, actual: i >= 90 ? 1 : 0, predicted: i >= 90 ? 1 : 0 }));
    assert.equal(metrics.binary(adequate, classIds, classFive).metricGatePassed, true);
  });
  for (const p of [-.01, 1.01, NaN, '0.5']) await check('Reject invalid risk probability: ' + String(p), () => {
    const rows = clone(majority); rows[0].probability = p;
    assert.throws(() => metrics.binary(rows, classIds, classFive));
  });
  let evidence;
  await check('Recompute all 98 real archived predictions without fitting', () => {
    evidence = readModelEvidence(); assert.equal(evidence.ok, true); assert.equal(evidence.testSize, 98);
    const c = evidence.engines.find(e => e.id === 'costEstimator').research;
    const d = evidence.engines.find(e => e.id === 'scheduleOptimizer').research;
    const r = evidence.engines.find(e => e.id === 'riskAnalyzer').research;
    assert.equal(c.metrics.withinCount, 82); assert.ok(Math.abs(c.metrics.MAPE - .05518691226386983) < 1e-12);
    assert.ok(c.metrics.MAE > c.baseline.MAE); assert.equal(c.metrics.five.filter(x => x.passed).length, 3);
    assert.equal(d.metrics.withinCount, 12); assert.equal(r.metrics.positives, 7);
    assert.equal(r.metrics.accuracy, null); assert.equal(r.metrics.classificationCoverage, 0);
    assert.equal(evidence.fullEngineAcceptedCount, 0); assert.equal(evidence.sevenEngineGoalMet, false);
    assert.ok(evidence.engines.every(e => !e.accuracyValidated && !e.productionAccepted));
  });
  await check('Tampered evidence is not rendered as verified', () => {
    const api = sandboxModule('packages/ai-engine/model-evidence.js', id => id === 'fs' ? {
      readFileSync: () => Buffer.from('{"accuracy":1}')
    } : id === './evaluation-metrics' ? metrics : require(id));
    const e = api.readModelEvidence(); assert.equal(e.ok, false); assert.equal(e.integrityVerified, false);
    assert.ok(e.engines.every(x => x.research === null));
  });
  await check('UI displays research scope, abstention and zero acceptance accurately', () => {
    const markup = view.render(evidence);
    for (const text of ['83.67%', '12.24%', 'امتناع عن التصنيف', '0/7', 'نتائج بحثية سابقة']) assert.ok(markup.includes(text));
    assert.ok(!markup.includes('92.86%')); assert.equal(view.pct(null), 'غير متاح');
  });
  await check('UI escapes source labels and clears unavailable evidence', () => {
    const e = clone(evidence); e.engines[0].label = '<img src=x onerror=alert(1)>';
    const markup = view.render(e); assert.ok(!markup.includes('<img')); assert.ok(markup.includes('&lt;img'));
    assert.ok(view.render({ ok: false }).includes('تعذر التحقق'));
  });
  await check('Initialization shares one async operation and preserves partial failure', async () => {
    let calls = 0;
    const names = ['project-analyzer','quantity-estimator','cost-estimator','risk-analyzer','quality-inspector','schedule-optimizer','supplier-intelligence'];
    const models = Object.fromEntries(names.map(n => ['./models/' + n, { trained: n !== 'risk-analyzer' }]));
    const report = { ok: false, status: 'partial_failure', successfulModels: 6, failedModels: 1, requestedModels: 7 };
    const ai = sandboxModule('packages/ai-engine/index.js', id => {
      if (models[id]) return models[id];
      if (id === './models/engineering-assistant') return { trained: false };
      if (id === './models/trainer') return { trainAllModels: async () => { calls++; await Promise.resolve(); return report; } };
      if (id === './knowledge-base') return { initialize() {}, detectProjectType() {}, detectProjectTypeConfidence() {} };
      if (id === './engineering-data-layer') return { EngineeringDataLayer: class {} };
      return class {};
    });
    const [a, b] = await Promise.all([ai.initialize(), ai.initialize()]);
    assert.equal(calls, 1); assert.equal(a.status, 'partial_failure'); assert.equal(b.status, 'partial_failure');
    assert.equal(ai.getStatus().operationalReady, false); assert.equal(ai.getStatus().accuracyValidated, false);
    assert.equal((await ai.initialize()).status, 'partial_failure'); assert.equal(calls, 1);
    models['./models/risk-analyzer'].trained = true;
    assert.equal(ai.getStatus().operationalReady, true); assert.equal(ai.getStatus().accuracyValidated, false);
  });
  const serverSource = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  await check('Actual health handler reports degraded readiness', () => {
    const extras = Object.fromEntries(['orchestrator','decisionEngine','decisionGraph','explainableAI','consistencyScorer','dependencyEngine','autoRecalc','engineeringMemory','selfReview','recommendationEngine','maturityMetrics','finalReport'].map(k => [k, null]));
    const h = route(serverSource, "app.get('/health'", { ...extras, ai: { getStatus: () => ({ riskAnalyzer: false }) }, isAIReady() {}, aiReady: false, process, Date });
    const res = response(); h({}, res); assert.equal(res.body.status, 'degraded'); assert.equal(res.body.accuracyValidated, false);
  });
  await check('Actual waitForAI handler blocks incomplete initialization', async () => {
    const start = serverSource.indexOf('function waitForAI('), end = serverSource.indexOf('\nfunction extractNumber', start);
    const context = { isAIReady: () => false, aiInitializationError: null, ai: { getStatus: () => ({ initializationStatus: 'partial_failure' }) }, console };
    vm.createContext(context); vm.runInContext(serverSource.slice(start, end), context);
    let called = false; const res = response();
    await context.waitForAI(() => { called = true; })({}, res);
    assert.equal(called, false); assert.equal(res.code, 503); assert.equal(res.body.status, 'partial_failure');
  });
  const t = diagnostic();
  const handlers = {
    '/api/v1/model-evidence': route(serverSource, "app.get('/api/v1/model-evidence'", { readModelEvidence }),
    '/api/v1/benchmark-library/run': route(serverSource, "app.post('/api/v1/benchmark-library/run'", { benchmarkLibrary: t.benchmark }),
    '/api/v1/benchmark-library/compare': route(serverSource, "app.post('/api/v1/benchmark-library/compare'", { benchmarkLibrary: t.benchmark })
  };
  await check('Actual evidence endpoint uses HTTP 503 when integrity fails', () => {
    const h = route(serverSource, "app.get('/api/v1/model-evidence'", { readModelEvidence: () => ({ ok: false }) });
    const res = response(); h({}, res); assert.equal(res.code, 503);
  });
  await check('HTTP route integration returns real evidence and rejects fabricated geometry', async () => {
    const server = http.createServer(async (req, res) => {
      let body = ''; for await (const c of req) body += c;
      const out = { code: 200, status(code) { this.code = code; return this; }, json(data) {
        res.writeHead(this.code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data));
      } };
      handlers[req.url]({ body: body ? JSON.parse(body) : {} }, out);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const base = 'http://127.0.0.1:' + server.address().port;
      const r = await fetch(base + '/api/v1/model-evidence'); assert.equal(r.status, 200);
      assert.equal((await r.json()).engines.length, 7);
      const bad = await fetch(base + '/api/v1/benchmark-library/compare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'Villa' }) });
      assert.equal(bad.status, 422);
      const run = await fetch(base + '/api/v1/benchmark-library/run', { method: 'POST' });
      const d = await run.json(); assert.equal(d.passed, null); assert.equal(d.details[0].models.costEstimation.predicted, 200);
    } finally { await new Promise(resolve => server.close(resolve)); }
  });
  await check('Actual admin handlers label diagnostics without an accuracy claim', async () => {
    const page = fs.readFileSync(path.join(ROOT, 'packages/ui/web/phases-admin.html'), 'utf8');
    const script = page.split('<script>')[1].split('</script>')[0];
    const elements = new Map();
    const doc = { getElementById(id) { if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '' }); return elements.get(id); }, querySelectorAll: () => [] };
    const phase = { timestamp: new Date().toISOString(), modelEvidence: evidence };
    const context = { document: doc, ACEPModelEvidenceView: view, setTimeout() {}, console,
      fetch: async url => ({ ok: true, json: async () => url.includes('benchmark-library/run') ? t.benchmark.runAll() : phase }) };
    vm.createContext(context); vm.runInContext(script, context);
    await context.refreshAll(); assert.ok(elements.get('model-evidence').innerHTML.includes('83.67%'));
    await context.runBenchmark(); assert.ok(elements.get('results').textContent.includes('ليست دقة اختبار مستقل'));
    context.fetch = async () => ({ ok: false, json: async () => ({ error: 'service down' }) });
    await context.refreshAll(); assert.ok(elements.get('model-evidence').innerHTML.includes('تعذر التحقق'));
  });
  console.log(JSON.stringify({ scenarios: cases.length, passed: cases.length, realModelFits: 0,
    archivedRealContractsVerified: 98, newIndependentTest: false, cases }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
