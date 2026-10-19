const assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const model=require(path.join(root,'packages/ai-engine/models/schedule-optimizer'));
const Workflow=require(path.join(root,'packages/ai-engine/workflow-engine'));
const {EngineeringDataLayer}=require(path.join(root,'packages/ai-engine/engineering-data-layer'));
let checks=0;
function verify(s){let finish=0;for(const [i,a] of s.activities.entries()){assert.deepEqual(a.predecessors,i?[s.activities[i-1].id]:[]);assert.equal(a.startDay,finish);finish+=a.duration;assert.equal(a.finishDay,finish);}assert.equal(s.totalDuration,finish);assert.equal(s.totalMonths,Math.round(finish/22*10)/10);assert.equal(s.optimization.parallelExecution,0);assert.equal(s.requiresScheduleReview,true);assert.equal(s.confidenceCalibrated,false);checks++;}
(async()=>{
 for(const a of [300,3000,20000])verify(model.generateSchedule('Villa',a,2));
 await model.train(path.join(root,'packages/databases/training/csv/projects.csv'));
 for(const c of [['Villa',300,2],['Building',3000,5],['Tower',20000,20]])verify(model.generateSchedule(...c));
 for(const args of [['',300,2],['Villa',0,2],['Villa',-1,2],['Villa',Infinity,2],['Villa',NaN,2],['Villa',undefined,2],['Villa','300',2],['Villa',300,0],['Villa',300,-1],['Villa',300,1.5],['Villa',300,Infinity],['Villa',300,undefined],['Villa',300,Number.MAX_SAFE_INTEGER]]){assert.throws(()=>model.generateSchedule(...args));checks++;}
 const edl=new EngineeringDataLayer(),p=edl.createProject('schedule',{});
 p.extracted.type='Villa';p.extracted.area=150;p.extracted.floors=2;p.extracted.finishing='Premium';
 const workflow=new Workflow({scheduleOptimizer:model},edl);
 const s=await workflow.stepSchedule(p);assert.equal(s.parameters.finishingFactor,1.3);assert.equal(p.schedule.heuristicDurationEstimate,s.heuristicDurationEstimate);assert.equal(p.schedule.confidenceCalibrated,false);verify(s);
 const restored=edl.createProject('restored',{});restored.fromJSON(JSON.parse(JSON.stringify(p.toJSON())));assert.deepEqual(restored.schedule,p.schedule);checks++;
 const q=edl.createProject('missing',{});q.extracted.type='Villa';q.extracted.area=null;q.extracted.floors=null;
 // Explicitly bypass existing effective-parameter defaults to test the missing-input boundary.
 workflow._getEffectiveParams=()=>({type:'Villa',area:null,floors:null});
 const missing=await workflow.stepSchedule(q);assert.equal(missing.totalDuration,null);assert.equal(q.schedule.totalDuration,null);assert.equal(q.metadata.workflowStep,'schedule_requires_review');checks++;
 console.log(JSON.stringify({passed:checks,total:checks,boundary:'authored unit and actual workflow/EDL tests; no browser or field accuracy claim'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
