'use strict';
// FIT-CONTAINING checks: run on Kaggle only. Fixtures measure software behavior, not accuracy.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
if (!process.cwd().startsWith('/kaggle/working/')) throw new Error('All fitting checks must run on Kaggle');
const root=path.resolve(__dirname,'../..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'acep-v11-'));
const fresh=name=>new (require(path.join(root,'packages/ai-engine/models',name)).constructor)();
const {loadProjects}=require('../../packages/ai-engine/models/project-training');
const header=['project_id','project_type','building_area_m2','floors','duration_months','area_basis','estimated_cost_sar','concrete_m3','steel_ton','source_kind'];
const rows=Array.from({length:6},(_,i)=>['P'+i,'Villa',(i%3+1)*100,i%3+1,5+i,'per_floor',100000+i*10000,100+i,10+i,'synthetic']);
const quote=x=>'"'+String(x).replaceAll('"','""')+'"';let index=0;
function fixture(data=rows,cols=header) {const fp=path.join(tmp,'fixture-'+index+++'.csv');fs.writeFileSync(fp,'\uFEFF'+cols.join(',')+'\r\n'+data.map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n');return fp;}
const tests=[];async function test(name,fn){try{await fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.stack});}}
(async()=>{
 require('../../packages/ai-engine/knowledge-base').initialize();
 for (const name of ['project-analyzer','schedule-optimizer']) {
  const model=fresh(name),file=fixture();await model.train(file);
  const profile=()=>name==='project-analyzer'?model.trainingStats.projectTypeStats.Villa:model.byType.Villa;
  const area=()=>profile()[name==='project-analyzer'?'avgTotalBuiltUpArea':'totalBuiltUpAreaMean'];
  await test(name+': mean of products preserves covariance',()=>assert(Math.abs(area()-1400/3)<1e-10));
  await test(name+': declares synthetic provenance without accuracy claim',()=>{assert.equal(model.trainingAudit.provenance,'declared_synthetic');assert.equal(model.trainingAudit.sourceVerified,false);assert.equal(model.trainingAudit.accuracyValidated,false);});
  await test(name+': mixed explicit area bases normalize equally',async()=>{const mixed=rows.map((r,i)=>{r=[...r];if(i%2){r[2]*=r[3];r[5]='total_built_up';}return r;});await model.train(fixture(mixed));assert(Math.abs(area()-1400/3)<1e-10);});
  await test(name+': reordered quoted CSV is supported',async()=>{const indexes=[9,8,7,6,5,4,3,2,1,0];await model.train(fixture(rows.map(r=>indexes.map(i=>r[i])),indexes.map(i=>header[i])));assert(Math.abs(area()-1400/3)<1e-10);});
  await test(name+': missing area basis remains ineligible',async()=>{const missing=rows.map(r=>r.map((v,i)=>i===5?'':v));const result=await model.train(fixture(missing));assert.equal(result.readyForInference,false);assert.equal(result.audit.areaBasisMissing,6);assert.throws(()=>model.exportProfile());});
  await test(name+': explicit caller declaration is accepted',async()=>{const missing=rows.map(r=>r.map((v,i)=>i===5?'':v));const r=await model.train(fixture(missing),{areaBasis:'per_floor'});assert.equal(r.readyForInference,true);});
  await test(name+': malformed dimensions excluded with reasons',async()=>{const bad=[...rows,...[0,'',1.5,'2x'].map((v,i)=>{const r=[...rows[0]];r[0]='BAD'+i;r[3]=v;return r;})];const r=await model.train(fixture(bad));assert.equal(r.audit.accepted,6);assert.equal(r.audit.rejected,4);assert.equal(r.audit.rejectedExamples.length,4);assert.equal(Object.values(r.audit.rejectionReasons).reduce((a,b)=>a+b),4);});
  await test(name+': duplicate IDs reject entire fit and clear readiness',async()=>{await assert.rejects(()=>model.train(fixture([...rows,rows[0]])),/Duplicate training project/);assert.equal(model.trained,false);});
  await test(name+': unknown training option rejected',()=>assert.rejects(()=>model.train(file,{areaBais:'per_floor'}),/Unknown training option/));
  await test(name+': conflicting basis rejected and audited',async()=>{const conflict=rows.map(r=>[...r]);conflict[0][5]='total_built_up';const r=await model.train(fixture(conflict),{areaBasis:'per_floor'});assert.equal(r.audit.rejected,1);assert.equal(r.audit.rejectionReasons['Conflicting area basis'],1);});
  await test(name+': identical geometry remains exactly within support',async()=>{const same=rows.map(r=>{r=[...r];r[2]=100;r[3]=1;return r;});await model.train(fixture(same));const s=profile();assert.equal(s.floorsMin,1);assert.equal(s[name==='project-analyzer'?'avgFloors':'floorsAvg'],1);assert.equal(model.exportProfile().accuracyValidated,false);});
 }
 await test('Analyzer rejects absent quantities instead of inserting zero',async()=>{const bad=rows.map(r=>[...r]);bad[0][7]='';bad[1][6]='NaN';const m=fresh('project-analyzer');const r=await m.train(fixture(bad));assert.equal(r.projectCount,4);assert.equal(r.readyForInference,false);assert.equal(r.audit.rejected,2);});
 await test('CSV preserves comma and newline in type field',()=>{const data=rows.map(r=>[...r]);data[0][1]='Example, two\nlines';assert.equal(loadProjects(fixture(data)).data[0].type,data[0][1]);});
 await test('Duplicate ID remains an error when one duplicate row is invalid',()=>{const bad=[...rows[0]];bad[3]='';assert.throws(()=>loadProjects(fixture([...rows,bad])),/Duplicate training project/);});
 const result={boundary:'Kaggle-only fitting on authored fixtures; not field accuracy',passed:tests.filter(t=>t.pass).length,total:tests.length,tests};
 fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));process.exitCode=result.passed===result.total?0:1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>fs.rmSync(tmp,{recursive:true,force:true}));
