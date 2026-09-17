'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { UETSTrainingManager } = require('../packages/uets/training/training-manager');
const { EGTFactory } = require('../packages/uets/core/egt-factory');
const { UETSDatasetGenerator } = require('../packages/uets/dataset/generator');
const { parseRows } = require('../packages/ai-engine/models/csv-rows');
let dir;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uets-remediation-')); });
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
const manager = () => new UETSTrainingManager(null, { statePath: path.join(dir, 'state.json') }).initialize();
test('F15: interrupted persisted work is recovered and outcomes survive restart', async () => {
  const first = manager(); const job = first.enqueueTraining(['projectAnalyzer']);
  first.trainingQueue[0].status = 'processing'; first._saveState();
  const restarted = manager(); await restarted.processTrainingQueue(async () => ({ consumed: 13 }));
  const final = manager(); expect(final.getStats().trainingQueue).toBe(0);
  expect(final.getHistory()[0]).toMatchObject({ id: job.id, status: 'completed', recoveredAfterInterruption: true, result: { consumed: 13 } });
});
test('F15: failure is terminal, queue drains and running flag resets', async () => {
  const q = manager(); q.enqueueTraining(['projectAnalyzer']); q.enqueueTraining(['riskAnalyzer']);
  let count = 0; await q.processTrainingQueue(async () => { if (++count === 1) throw new Error('source checksum failed'); return { ok: true }; });
  expect(q.getHistory().map(j => j.status)).toEqual(['failed', 'completed']); expect(q.isRunning).toBe(false);
});
test('F15: rejects corrupted state rather than clearing work', () => {
  fs.writeFileSync(path.join(dir, 'state.json'), '{truncated'); expect(manager).toThrow();
});
test('F15: rejects arbitrary trainers, path options and duplicate concurrent workers', async () => {
  const q = manager(); expect(() => q.enqueueTraining(['unknown'])).toThrow();
  expect(() => q.enqueueTraining(['projectAnalyzer'], { runner: '/tmp/code' })).toThrow();
  q.enqueueTraining(['projectAnalyzer']); let release; const hold = new Promise(resolve => { release = resolve; });
  const fn = jest.fn(() => hold); const processing = q.processTrainingQueue(fn);
  await q.processTrainingQueue(fn); expect(fn).toHaveBeenCalledTimes(1);
  expect(() => manager().enqueueTraining(['riskAnalyzer'])).toThrow('busy');
  release({ ok: true }); await processing;
});
test('F08: gross-area denominator and source dates survive round-trip', () => {
  const e = new EGTFactory().fromCSVProject({ project_id: 'A', project_type: 'Villa', building_area_m2: 200, floors: 3, estimated_cost_sar: 1200000, year: 2024 });
  expect(e.geometry.totalArea).toBe(600); expect(e.cost.perM2).toBe(2000);
  const g = new UETSDatasetGenerator(); const sample = g.generateJSONLTrainingData([e], 'cost_ai')[0];
  expect(sample.cost.rateSarPerGrossM2).toBe(2000); expect(sample.areaBasis).toBe('gross_floor_area');
  expect(g.generateCSVTrainingData([e]).projects[0].year).toBe(2024);
});
test('F16: quoted commas, escaped quotes and multiline CSV remain one row', () => {
  expect(parseRows('id,text\r\n1,"a,b\n""quote"""\r\n')).toEqual([['id','text'],['1','a,b\n"quote"']]);
  expect(() => parseRows('id,text\n1,"broken')).toThrow();
});
test('F15: UETS training consumes its immutable snapshot without activating a singleton', async () => {
  process.env.ACEP_RUNTIME_DATA_DIR = dir; jest.resetModules();
  const { UnifiedTrainingSystem } = require('../packages/uets');
  const { trainAllModelsFromUETS, runUETSSnapshot } = require('../packages/ai-engine/models/trainer');
  const u = new UnifiedTrainingSystem({ statePath: path.join(dir,'uets-state.json'), repoPath: path.join(dir,'egt.ndjson'), indexPath:path.join(dir,'index.json') }); u.initialize();
  const f = new EGTFactory();
  u.addEGT(f.fromCSVProject({ project_id:'A', project_type:'Villa', building_area_m2:200, floors:2, estimated_cost_sar:800000 }));
  const result = await trainAllModelsFromUETS(u, { models: ['projectAnalyzer'] });
  expect(result.totalRecords).toBe(1); expect(result.activated).toBe(false); expect(result.executionMode).toBe('uets_immutable_snapshot');
  await expect(runUETSSnapshot(['costEstimator'], { snapshotId: result.snapshotId })).rejects.toThrow('missing UETS source tables');
  delete process.env.ACEP_RUNTIME_DATA_DIR;
});

test('F15: worker retains feedback and evaluation for review and rejects unsourced retraining', async () => {
 process.env.ACEP_RUNTIME_DATA_DIR=dir; jest.resetModules();
 const {handlers}=require('../packages/uets/training/worker-handlers');
 const q=manager();
 expect(()=>q.enqueueRetraining()).toThrow('immutable');
 q.enqueueFeedback({projectId:'sample',correction:'needs professional evidence'});
 q.enqueueEvaluation('full',{projectId:'sample'});
 await q.processFeedbackQueue(handlers.feedback); await q.processEvaluationQueue(handlers.evaluation);
 expect(q.getHistory()).toHaveLength(2);
 for(const job of q.getHistory()) {expect(job.status).toBe('completed');expect(job.result.status).toBe('pending_independent_review');expect(job.result.activated).toBe(false);}
 expect(fs.readdirSync(path.join(dir,'uets/review-inbox'))).toHaveLength(2);
 delete process.env.ACEP_RUNTIME_DATA_DIR;
});
