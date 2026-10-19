// Orchestrator contract tests with fake trainers only. No real fitting or data loads.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../../packages/ai-engine/models/trainer.js'), 'utf8');
const names = ['project-analyzer','quantity-estimator','cost-estimator','risk-analyzer','quality-inspector','schedule-optimizer','supplier-intelligence'];
const values = [{ projectCount: 2 },{ items: 3 },{ materials: 1, labor: 1, equipment: 1, suppliers: 1 },{ total: 5 },{ total: 6 },{ total: 7 },{ suppliers: 1, priceRecords: 2 }];
function load(overrides = {}) {
  const calls = []; const logs = []; const models = {};
  names.forEach((name, i) => { models['./'+name] = { trained: true, train: async () => { calls.push(name); return overrides[name] ? overrides[name]() : values[i]; } }; });
  const module = { exports: {} };
  vm.runInNewContext(source, { require: id => { assert.ok(Object.hasOwn(models,id)); return models[id]; }, module, console: { log: x => logs.push(x), error: x => logs.push(x) } });
  return { api: module.exports, calls, logs, models };
}
let scenarios = 0;
(async () => {
  let t = load(); let r = await t.api.trainAllModels(); assert.equal(r.status,'succeeded'); assert.equal(r.successfulModels,7); assert.equal(r.models,7); assert.equal(r.totalRecords,30); assert.equal(r.accuracyValidated,false); scenarios++;
  t = load({ 'risk-analyzer': () => { throw 'risk failure'; } }); r = await t.api.trainAllModels(); assert.equal(r.status,'partial_failure'); assert.equal(r.successfulModels,6); assert.equal(r.failedModels,1); assert.equal(r.totalRecords,25); assert.equal(t.models['./risk-analyzer'].trained,false); assert.equal(r.modelResults.riskAnalyzer.ok,false); assert.ok(t.logs.every(x=>!x.includes('7/7'))); scenarios++;
  for (const bad of [{total:0},{total:-1},{total:NaN},{total:'5'},{total:1.5},{error:'Rejected'},{ok:false,total:5},null]) {
    t=load({'risk-analyzer':()=>bad}); r=await t.api.trainAllModels(); assert.equal(r.failedModels,1); scenarios++;
  }
  t=load(Object.fromEntries(names.map(n=>[n,()=>{throw Error('failed');}])));r=await t.api.trainAllModels();assert.equal(r.status,'failed');assert.equal(r.totalRecords,0);scenarios++;
  let queued=0; const feedback=[];const u={enqueueTraining:()=>{queued++;return{id:'q'};},enqueueEvaluation:()=>{},enqueueFeedback:x=>feedback.push(x)};
  t=load();r=await t.api.trainAllModelsFromUETS(u,{models:['riskAnalyzer','riskAnalyzer']});assert.equal(t.calls.length,1);assert.equal(r.requestedModels,1);assert.equal(feedback[0].status,'succeeded');scenarios++;
  for (const bad of [[],['unknown'],['__proto__'],'riskAnalyzer']) {t=load();let q=queued;await assert.rejects(t.api.trainAllModelsFromUETS(u,{models:bad}));assert.equal(queued,q);assert.equal(t.calls.length,0);scenarios++;}
  t=load();r=await t.api.trainAllModelsFromUETS({enqueueTraining:()=>{throw Error('queue down');}});assert.equal(r.ok,false);assert.equal(t.calls.length,0);scenarios++;
  t=load({'risk-analyzer':()=>{throw Error('fit failed');}});r=await t.api.trainAllModelsFromUETS(u,{models:['riskAnalyzer','qualityInspector']});assert.equal(r.status,'partial_failure');assert.equal(feedback.at(-1).failedModels,1);scenarios++;
  t=load();r=await t.api.trainAllModelsFromUETS({enqueueTraining:()=>({id:'q'}),enqueueEvaluation:()=>{throw Error('notify failed');}},{models:['riskAnalyzer']});assert.equal(r.status,'succeeded');assert.equal(r.notificationErrors.length,1);scenarios++;
  console.log(JSON.stringify({scenarios,passed:scenarios,realModelFits:0},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
