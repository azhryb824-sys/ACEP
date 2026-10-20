'use strict';
// No fits: reload Kaggle-produced JSON and validate inference and fail-closed behavior.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const directory=process.argv[2];if(!directory)throw Error('Provide Kaggle snapshot directory');
require('../../packages/ai-engine/knowledge-base').initialize();
const fresh=n=>new(require('../../packages/ai-engine/models/'+n).constructor)();
const tests=[];const check=(name,fn)=>{try{fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.stack});}};
for(const [modelName,file] of [['project-analyzer','projectAnalyzer'],['schedule-optimizer','scheduleOptimizer']]){
 const original=JSON.parse(fs.readFileSync(path.join(directory,file+'.json'),'utf8'));
 const model=fresh(modelName);model.loadProfile(original);
 for(const [type,s] of Object.entries(original.profiles)){
  check(modelName+': round trip '+type,()=>{
   const floors=Math.round(s.avgFloors??s.floorsAvg),area=s.avgTotalBuiltUpArea??s.totalBuiltUpAreaMean;
   const predict=m=>modelName==='project-analyzer'?m.analyzeProject('compatibility fixture',{type,area:area/floors,floors}):m.generateSchedule(type,area,floors);
   const before=predict(model),copy=fresh(modelName);copy.loadProfile(JSON.stringify(model.exportProfile()));
   assert.deepEqual(predict(copy),before);assert.equal(before.estimateStatus,'heuristic_estimate');
   assert.equal(before.confidenceCalibrated,false);
  });
  if(modelName==='schedule-optimizer' && 1+(s.floorsMin-s.floorsAvg)*.08<=0)check(modelName+': nonpositive floor factor abstains '+type,()=>{
   const result=model.generateSchedule(type,s.totalBuiltUpAreaMean,s.floorsMin);
   assert.equal(result.estimateStatus,'outside_heuristic_domain');
  });
 }
 const first=Object.keys(original.profiles)[0];
 const invalid={currency:v=>v.units.cost='USD',areaUnit:v=>v.units.area='ft2',durationUnit:v=>v.units.duration='quarter',schema:v=>v.schemaVersion=99,
  legacy:v=>delete v.profiles[first].profileVersion,basis:v=>v.profiles[first].areaBasis='assumed_per_floor',count:v=>v.profiles[first].count=-1,
  range:v=>v.profiles[first].totalAreaMax=0,floors:v=>v.profiles[first].floorsMin=0,
  numeric:v=>v.profiles[first][modelName==='project-analyzer'?'avgCost':'durationMean']=null};
 for(const [label,mutate] of Object.entries(invalid))check(modelName+': reject '+label,()=>{
  const v=structuredClone(original);mutate(v);assert.throws(()=>model.loadProfile(v));assert.equal(model.trained,false);
 });
 check(modelName+': untrusted accuracy flag cannot be imported',()=>{const v=structuredClone(original);v.accuracyValidated=true;v.audit.sourceVerified=true;v.audit.accuracyValidated=true;model.loadProfile(v);assert.equal(model.exportProfile().accuracyValidated,false);assert.equal(model.trainingAudit.sourceVerified,false);assert.equal(model.trainingAudit.accuracyValidated,false);});
 check(modelName+': outside training support abstains',()=>{model.loadProfile(original);const s=original.profiles[first];const result=modelName==='project-analyzer'?model.analyzeProject('fixture',{type:first,area:s.totalAreaMax*2/s.floorsMin,floors:s.floorsMin}):model.generateSchedule(first,s.totalAreaMax*2,s.floorsMin);assert.equal(result.estimateStatus,'outside_training_support');});
}
const kb=require('../../packages/ai-engine/knowledge-base');
check('space templates are deterministic',()=>{assert.deepEqual(kb.estimateSpaces('Villa',500,2),kb.estimateSpaces('Villa',500,2));});
check('space templates disclose drawing verification',()=>{const spaces=kb.estimateSpaces('Villa',500,2);assert.ok(spaces.length>0);assert.ok(spaces.every(s=>s.estimateBasis==='type_template'&&s.requiresDrawingVerification===true));});
check('unsupported space templates do not invent residential rooms',()=>{assert.deepEqual(kb.estimateSpaces('Warehouse',500,1),[]);});
const result={boundary:'Pure snapshot reload and inference; zero fits; not field accuracy',passed:tests.filter(t=>t.pass).length,total:tests.length,tests};
const out=process.argv[3];if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));process.exitCode=result.passed===result.total?0:1;
