'use strict';
const assert = require('node:assert/strict');
const engine = require('../../packages/ai-engine/models/schedule-optimizer');
const run = activities => engine.analyzeActivityNetwork(activities);
const a = (id, duration, predecessors = []) => ({ id, duration, predecessors });
let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log(`PASS ${name}`); };
check('fork and join, independent path floats, unsorted input, no mutation', () => {
  const input = [a('D', 2, ['B', 'C']), a('C', 3, ['A']), a('A', 2), a('B', 5, ['A']), a('E', 1)];
  const before = JSON.stringify(input), r = run(input), m = Object.fromEntries(r.activities.map(x => [x.id,x]));
  assert.equal(r.totalDuration, 9); assert.deepEqual(r.criticalActivities, ['A','B','D']);
  assert.deepEqual([m.C.earlyStart,m.C.earlyFinish,m.C.lateStart,m.C.lateFinish,m.C.totalFloat,m.C.freeFloat], [2,5,4,7,2,2]);
  assert.equal(m.E.totalFloat,8); assert.equal(JSON.stringify(input),before);
  assert.equal(r.resourceFeasible,null); assert.equal(r.confidence,null);
});
check('all tied critical branches retained as edges, not a false serial path', () => {
  const r = run([a('A', 2),a('B',3,['A']),a('C',3,['A']),a('D',0,['B','C'])]);
  assert.equal(r.totalDuration,5); assert.equal(r.criticalActivities.length,4); assert.equal(r.criticalEdges.length,4);
});
check('finish-to-start lag participates in both passes and zero-duration milestones', () => {
  const r=run([a('A',2),a('B',3,[{id:'A',lag:4,type:'FS'}]),a('C',0,['B'])]);
  assert.equal(r.totalDuration,9); assert.equal(r.activities[1].earlyStart,6); assert.equal(r.activities[0].lateFinish,2);
});
check('free float can be less than total float', () => {
  const r=run([a('A',1),a('B',2,['A']),a('C',10)]);
  assert.equal(r.activities[0].freeFloat,0); assert.equal(r.activities[0].totalFloat,7);
});
for (const [name, input] of [
  ['cycle',[a('A',1,['B']),a('B',1,['A'])]], ['self-cycle',[a('A',1,['A'])]],
  ['missing predecessor',[a('A',1,['Z'])]], ['duplicate id',[a('A',1),a('A',2)]],
  ['duplicate edge',[a('A',1),a('B',1,['A','A'])]], ['missing dependency declaration',[{id:'A',duration:2}]],
  ['unsupported relationship',[a('A',1),a('B',1,[{id:'A',type:'SS'}])]],
  ['negative lag',[a('A',1),a('B',1,[{id:'A',lag:-1}])]],
  ['nonfinite duration',[a('A',Infinity)]], ['negative duration',[a('A',-1)]],
  ['fractional duration',[a('A',1.5)]], ['overflow',[a('A',Number.MAX_SAFE_INTEGER),a('B',1,['A'])]], ['empty',[]]
]) check(`reject ${name}`, () => assert.throws(()=>run(input)));
check('unusual ids are safe',()=>assert.equal(run([a('__proto__',1),a('constructor',2,['__proto__'])]).totalDuration,3));
check('existing generated schedule remains internally consistent',()=>{
  const s=engine.generateTemplateSchedule(1000,2), n=run(s.activities);
  assert.equal(s.totalDuration,n.totalDuration); assert.deepEqual(s.criticalPath,n.criticalActivities);
});
console.log(JSON.stringify({passed:checks,failed:0,scope:'network calculations and input contracts; not field accuracy'}));

