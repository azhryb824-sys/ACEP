const assert = require('node:assert/strict');
const makeHandler = require('../full-analysis-handler');
const { EngineeringDataLayer } = require('../engineering-data-layer');

function response() {
  return { code: 200, status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; } };
}
async function run() {
  const edl = new EngineeringDataLayer();
  let mode = 'success';
  const handler = makeHandler({ edl,
    store: { async findProject(id) { return id === 'saved' ?
      { description: 'وصف محفوظ', cost: 45000000 } : null; } },
    parseDescription: () => ({}),
    validator: { validate: () => ({ passed: false, issues: ['unverified'] }) },
    workflow: { async runFullPipeline(p) {
      if (mode === 'throw') throw Error('engine unavailable');
      if (mode === 'missing') return { ok: false, error: { missing: ['area'] }, steps: [] };
      p.setExtracted({ type: 'Villa', typeConfidence: 0.8, area: 100, floors: 2, city: null });
      p.setCost({ totalCost: 700000, directCost: 476000, costPerM2: 3500 });
      p.setSchedule({ totalMonths: 8, totalDuration: 176 });
      return { ok: true, steps: [{ name: 'cost', status: 'completed' }] };
    } }
  });
  let res = response();
  await handler({ body: { projectId: 'saved' } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.cost.totalCost, 700000, 'use fresh workflow cost, not saved demo price');
  assert.equal(res.body.schedule.totalMonths, 8);
  assert.equal(res.body.facts.region, null, 'do not invent Riyadh');
  assert.equal(res.body.validation.passed, false, 'preserve validator rejection');
  assert.equal(res.body.projectId, 'saved');
  mode = 'missing'; res = response();
  await handler({ body: { description: 'وصف ناقص' } }, res);
  assert.equal(res.code, 422); assert.deepEqual(res.body.missing, ['area']);
  assert.equal(res.body.cost, undefined);
  mode = 'throw'; res = response();
  await handler({ body: { description: 'وصف' } }, res);
  assert.equal(res.code, 500); assert.equal(res.body.cost, undefined);
  res = response(); await handler({ body: { projectId: 'absent' } }, res);
  assert.equal(res.code, 404);
  res = response(); await handler({ body: { description: {} } }, res);
  assert.equal(res.code, 400);
  console.log('PASS: full-analysis returns workflow evidence and fails without fabricated results');
}
run().catch(e => { console.error(e); process.exitCode = 1; });
