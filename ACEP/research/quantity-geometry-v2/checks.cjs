const assert=require('node:assert/strict');
const Engine=require('../../packages/ai-engine/engineering-ke/boq-engine');
const kb=require('../../packages/ai-engine/engineering-ke/boq-knowledge-base');
const cost=require('../../packages/ai-engine/models/cost-estimator');
const legacyKB=require('../../packages/ai-engine/knowledge-base');
legacyKB.initialize();
const e=new Engine();
const base={type:'Villa',area:300,floors:2,rooms:4,bathrooms:3,hasKitchen:true,phase:'Shell'};
const checks=[];const check=(name,fn)=>{try{fn();checks.push({name,pass:true});}catch(error){checks.push({name,pass:false,error:error.message});}};
const item=(r,code)=>[...r.items,...r.suggestedItems].find(i=>i.code===code);
check('same footprint excavation does not shrink as floors increase',()=>{
 const a=item(e.generate({...base,floors:1},{}),'EXC-001');const b=item(e.generate(base,{}),'EXC-001');assert.equal(a.quantity,450);assert.equal(b.quantity,450);
});
check('transport relates to the same excavation volume',()=>{const r=e.generate(base,{});assert.equal(item(r,'EXC-002').quantity,Math.round(item(r,'EXC-001').quantity*0.7*100)/100);});
check('explicit total built-up area and per-floor input agree for every BOQ item',()=>{
 const a=e.generate({...base,areaBasis:'per_floor'},{}),b=e.generate({...base,area:600,areaBasis:'total_built_up'},{});
 assert.deepEqual(a.items.map(i=>[i.code,i.quantity]),b.items.map(i=>[i.code,i.quantity]));
});
check('cost area basis agrees with quantity input semantics',()=>{
 const a=cost.estimateCost([],'Villa',300,2),b=cost.estimateCost([],'Villa',600,2,'Standard','Riyadh',{areaBasis:'total_built_up'});assert.equal(a.totalCost,b.totalCost);assert.equal(a.costPerM2,b.costPerM2);
});
check('default area basis is visible as an assumption',()=>{const r=e.generate(base,{});assert.equal(r.summary.geometry.inputAreaBasis,'per_floor');assert.equal(r.summary.geometry.areaBasisAssumed,true);assert.equal(r.summary.geometry.totalBuiltUpAreaM2,600);});
check('unsupported area basis is rejected',()=>assert.throws(()=>e.generate({...base,areaBasis:'land_area'},{}),/areaBasis/));
check('total area requires explicit valid floors',()=>assert.throws(()=>e.generate({...base,floors:undefined,areaBasis:'total_built_up'},{}),/floors/));
check('invalid negative or nonfinite area cannot produce a BOQ',()=>{for(const area of [-1,Infinity,NaN,'300'])assert.throws(()=>e.generate({...base,area},{}),/area/);});
check('Arabic shell request is scoped to Shell',()=>assert.equal(kb.detectPhase('Villa','بناء عظم'),'Shell'));
check('finished shell followed by requested finishing stays Finishing',()=>assert.equal(kb.detectPhase('Villa','العظم مكتمل والمطلوب تشطيب الفيلا'),'Finishing'));
const result={checks,passed:checks.filter(c=>c.pass).length,total:checks.length};
console.log('RESULT_JSON='+JSON.stringify(result));process.exitCode=result.passed===result.total?0:1;
