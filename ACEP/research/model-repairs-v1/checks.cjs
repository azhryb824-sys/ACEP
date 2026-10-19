const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'packages/ai-engine');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'acep-repairs-'));
const load=n=>require(path.join(base,'models',n));
const fresh=n=>new (load(n).constructor)();
const tests=[];
async function test(name,fn){try{await fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.stack});}}
function fixture(file,header,rows){const quote=x=>'"'+String(x).replaceAll('"','""')+'"';const p=path.join(tmp,file);fs.writeFileSync(p,'\uFEFF'+header.join(',')+'\n'+rows.map(r=>r.map(quote).join(',')).join('\n')+'\n');return p;}
const ph=['project_id','project_type'],rh=['project_id','risk_category','description','probability','impact','mitigation','detected_by_ai'];
const qh=['project_id','defect_type','severity','location','element_type','detected_by','confidence','status'];
const sh=['supplier_name','city','speciality','rating','delivery_speed_days','contract_years','compliance_percent','total_deals'];
const mh=['material_name','category','unit','city','supplier_name','avg_price_sar','price_date','quality_grade'];
(async()=>{
 require(path.join(base,'knowledge-base')).initialize();
 const analyzer=load('project-analyzer'),quantity=load('quantity-estimator'),risk=load('risk-analyzer'),quality=load('quality-inspector'),supplier=load('supplier-intelligence');
 for(const m of [analyzer,quantity,risk,quality,supplier])await m.train();
 const calls={analyzer:(a,f,t='Villa')=>analyzer.analyzeProject('fixture',{type:t,area:a,floors:f}),quantity:(a,f,t='Villa')=>quantity.estimateBOQ(t,a,f),risk:(a,f,t='Villa')=>risk.analyzeRisks(t,a,f),quality:(a,f,t='Villa')=>quality.inspectProject(t,a,f)};
 for(const [name,call] of Object.entries(calls)){
  for(const [label,a,f] of [['negative',-1,2],['zero',0,2],['nan',NaN,2],['infinity',Infinity,2],['numeric_string','300',2],['fractional_floors',300,1.5],['zero_floors',300,0],['negative_floors',300,-2],['nan_floors',300,NaN],['infinite_floors',300,Infinity]])
   await test(`${name}: reject ${label}`,()=>assert.throws(()=>call(a,f)));
  await test(`${name}: missing geometry is reviewable`,()=>{const r=call(undefined,undefined);assert.equal(r.requiresInputReview,true);assert.equal(r.insufficientData,true);});
  await test(`${name}: missing type is reviewable`,()=>assert.equal(call(300,2,'Unknown').requiresInputReview,true));
  await test(`${name}: blank type is rejected`,()=>assert.throws(()=>call(300,2,'')));
 }
 await test('analyzer preserves decimal geometry',()=>{const r=calls.analyzer(300.25,2);assert.equal(r.totalArea,600.5);assert.equal(r.areaPerFloor,300.25);assert.equal(r.confidenceCalibrated,false);});
 await test('quantity abstains without dimensions',()=>{const r=calls.quantity(undefined,undefined);assert.deepEqual(r.items,[]);assert.equal(r.summary.totalCost,null);});
 await test('quantity retains explicit assumption review API',()=>assert.doesNotThrow(()=>quantity.getBOQAssumptions('Villa',undefined,undefined)));
 await test('quantity surfaces remaining assumptions',()=>{const r=calls.quantity(300,2);assert.equal(r.requiresInputReview,(r.assumptions||[]).length>0);});
 const pp=fixture('projects.csv',ph,[['A','Villa'],['B','Hospital']]);
 const riskRows=[['A','Safety','Alpha, quoted\nobservation',1,1,'Review, plans','true'],['B','Safety','Beta',5,5,'Inspect','false']];
 const rp=fixture('risks.csv',rh,riskRows),rr=fresh('risk-analyzer');await rr.train(rp,pp);
 await test('risk uses project type and category',()=>{const a=rr.analyzeRisks('Villa',100,1),b=rr.analyzeRisks('Hospital',100,1);assert.equal(a.risks[0].probability,null);assert.equal(b.risks[0].probability,null);assert.equal(a.risks[0].ordinalLikelihoodMean,1);assert.equal(b.risks[0].ordinalLikelihoodMean,5);assert(a.historicalOrdinalRiskIndex<b.historicalOrdinalRiskIndex);assert.equal(a.risks[0].trainingSamples,1);assert.equal(a.risks[0].dataBasis,'project_type_category_historical_ratings');});
 await test('risk CSV preserves commas and newlines',()=>assert.equal(rr.analyzeRisks('Villa',100,1).risks[0].risk,riskRows[0][2]));
 await test('risk repeat invocation is deterministic',()=>assert.deepEqual(rr.analyzeRisks('Villa',100,1),rr.analyzeRisks('Villa',100,1)));
 await test('risk abstains for unseen type',()=>assert.equal(rr.analyzeRisks('Unseen',100,1).estimateStatus,'unsupported_project_type'));
 await test('risk aggregate is mean paired score',()=>{assert.equal(rr.byCategory.Safety.riskScoreMean,.52);});
 await test('risk CSV rejects invalid rating instead of coercing',async()=>{const bad=fixture('bad-risks.csv',rh,[...riskRows,['A','Safety','Bad',9,1,'x','true'],['A','Safety','Bad','1x',1,'x','true']]);const r=await rr.train(bad,pp);assert.equal(r.total,2);assert.equal(r.audit.rejected,2);});
 await test('risk output independent of input row order',async()=>{const before=rr.analyzeRisks('Unseen',100,1);await rr.train(fixture('reverse-risks.csv',rh,[...riskRows].reverse()),pp);assert.deepEqual(rr.analyzeRisks('Unseen',100,1),before);});
 const qr=[['A','Crack','High','Slab, L1','Slab','Inspector',95,'Open'],['B','Leak','Low','Roof','Roof','Inspector',80,'Resolved']];
 const qp=fixture('quality.csv',qh,qr),qq=fresh('quality-inspector');await qq.train(qp,pp);
 await test('quality describes only matching project type',()=>{assert.deepEqual(qq.inspectProject('Villa',100,1).defects.map(d=>d.type),['Crack']);assert.deepEqual(qq.inspectProject('Hospital',100,1).defects.map(d=>d.type),['Leak']);});
 await test('quality does not invent incidence or grade',()=>{const r=qq.inspectProject('Villa',100,1);assert.equal(r.qualityScore,null);assert.equal(r.qualityGrade,null);assert.equal(r.estimatedDefects,null);assert.equal(r.defects[0].expectedCount,null);assert.equal(r.requiresQualityReview,true);});
 await test('duplicating all quality records cannot double predicted defects',async()=>{await qq.train(fixture('double-quality.csv',qh,[...qr,...qr]),pp);const r=qq.inspectProject('Villa',100,1);assert.equal(r.estimatedDefects,null);assert.equal(r.qualityScore,null);assert.equal(r.defects[0].severityScore,2);assert.equal(r.defects[0].trainingSamples,2);});
 await test('quality unseen type has no fabricated profile',()=>{const r=qq.inspectProject('Unseen',100,1);assert.deepEqual(r.defects,[]);assert.equal(r.dataBasis,'no_project_type_history');});
 const ss=fresh('supplier-intelligence');
 const sp=fixture('suppliers.csv',sh,[['A, Concrete','Riyadh','Concrete',4,5,5,90,100],['B','Jeddah','Concrete',5,1,10,100,200],['C','Riyadh','Steel',5,1,10,100,200],['Invalid','Riyadh','Concrete',5.3,1,1,90,10]]);
 const mr=[['Mix C30','Ready Mix Concrete','m3','Riyadh','A, Concrete',300,'2024-01-01','Standard'],['Mix C30','Ready Mix Concrete','m3','Riyadh','X',320,'2024-01-01','Standard'],['Mix C30','Ready Mix Concrete','ton','Riyadh','X',1000,'2024-01-01','Standard'],['Mix C30','Ready Mix Concrete','m3','Jeddah','B',500,'2024-01-01','Standard'],['Mix C30','Ready Mix Concrete','m3','Riyadh','X',400,'2024-02-01','Standard'],['Mix C30','Ready Mix Concrete','m3','Riyadh','X',600,'2024-01-01','Premium'],['Mix C40','Ready Mix Concrete','m3','Riyadh','X',900,'2024-01-01','Standard']];
 const mp=fixture('prices.csv',mh,mr);await ss.train(sp,mp);
 await test('supplier strict specialty AND city',()=>{const r=ss.findBestSupplier('Concrete','Riyadh');assert.equal(r.totalSuppliers,1);assert.equal(r.topSupplier.name,'A, Concrete');assert.equal(r.allCandidates[0].speciality,'Concrete');});
 await test('supplier does not substitute unrelated specialties',()=>{const r=ss.findBestSupplier('NOT_A_CATEGORY','Riyadh');assert.equal(r.topSupplier,null);assert.equal(r.status,'no_match');assert.equal(r.totalSuppliers,0);});
 await test('supplier does not silently substitute another city',()=>assert.equal(ss.findBestSupplier('Concrete','Absent').status,'no_match'));
 await test('supplier missing price stays null',()=>{const r=ss.findBestSupplier('Steel','Riyadh');assert.equal(r.marketAvgPrice,null);assert.equal(r.priceStatus,'missing');});
 await test('supplier categories map to material data',()=>assert.equal(ss.findBestSupplier('Concrete','Riyadh').totalPriceRecords,6));
 await test('supplier incompatible prices remain separate',()=>{const r=ss.findBestSupplier('Concrete','Riyadh');assert.equal(r.marketAvgPrice,null);assert.equal(r.priceGroups.length,5);const g=r.priceGroups.find(g=>g.unit==='m3'&&g.priceDate==='2024-01-01'&&g.qualityGrade==='Standard'&&g.material==='Mix C30');assert.equal(g.avgPrice,310);assert.equal(g.records,2);});
 await test('comparison preserves city, unit, grade, material and date',()=>assert.equal(ss.comparePrices('Concrete').length,6));
 await test('single comparable group has numeric historical mean',()=>{ss.materialPrices=ss.materialPrices.slice(0,2);const r=ss.findBestSupplier('خرسانة','Riyadh');assert.equal(r.marketAvgPrice,310);assert.equal(r.priceStatus,'single_comparable_group');});
 await test('supplier honors numeric requirements',()=>assert.equal(ss.findBestSupplier('Concrete','Riyadh',{minRating:4.5}).totalSuppliers,0));
 await test('supplier honors material requirements',()=>assert.equal(ss.findBestSupplier('Concrete','Riyadh',{material:'Unstocked'}).totalSuppliers,0));
 await test('supplier rejects unsupported requirement',()=>assert.throws(()=>ss.findBestSupplier('Concrete','Riyadh',{unsupported:1})));
 await test('supplier rejects invalid request fields',()=>{for(const args of [[undefined,'Riyadh'],['','Riyadh'],['Concrete',2],['Concrete','Riyadh',{minRating:NaN}],['Concrete','Riyadh',{minRating:'4'}]])assert.throws(()=>ss.findBestSupplier(...args));});
 await test('supplier invalid CSV rating excluded and audited',()=>assert.equal(ss.trainingAudit.suppliers.rejected,1));
 await test('supplier absent price file is explicit',async()=>{await ss.train(sp,path.join(tmp,'missing.csv'));const r=ss.findBestSupplier('Concrete','Riyadh');assert.equal(r.marketAvgPrice,null);assert.equal(ss.trainingAudit.prices.status,'missing_file');});
 const {EngineeringDataLayer}=require(path.join(base,'engineering-data-layer')),Workflow=require(path.join(base,'workflow-engine'));
 const edl=new EngineeringDataLayer(),w=new Workflow({projectAnalyzer:analyzer,riskAnalyzer:risk,qualityInspector:quality,scheduleOptimizer:load('schedule-optimizer'),quantityEstimator:quantity},edl);
 await test('workflow does not invent a missing floor',async()=>{const p=edl.createProject('missing',{description:'x'});p.extracted.type='Villa';p.extracted.area=300;const r=await w.stepAnalysis(p,'x');assert.equal(r.ok,false);assert(r.error.missing.includes('floors'));assert.equal((await w.stepSchedule(p)).totalDuration,null);assert.equal((await w.stepRisks(p)).overallRiskScore,null);assert.equal((await w.stepQuality(p)).qualityScore,null);});
 await test('workflow re-run halts after insufficient analysis',async()=>{const p=edl.createProject('missing-again',{});const r=await w.runFromStep(p,'analysis','x');assert.equal(r.ok,false);assert.equal(p.boq.items.length,0);});
 await test('workflow rejects zero floors without substituting one',async()=>{const p=edl.createProject('zero',{});p.extracted.type='Villa';p.extracted.area=300;p.extracted.floors=0;await assert.rejects(()=>w.stepAnalysis(p,'x'));});
 await test('EDL round trip preserves review, nulls and historical basis',async()=>{const p=edl.createProject('valid',{});p.setExtracted({type:'Villa',area:300,floors:2,finishing:'Luxury'});const r=await w.stepRisks(p);assert.deepEqual(r,risk.analyzeRisks('Villa',600,2,undefined,'Luxury'));await w.stepQuality(p);p.setBOQ(quantity.estimateBOQ('Villa',undefined,undefined));const restored=edl.createProject('restored',{});restored.fromJSON(JSON.parse(JSON.stringify(p.toJSON())));assert.equal(restored.quality.qualityScore,null);assert.equal(restored.quality.estimatedDefects,null);assert.equal(restored.quality.requiresQualityReview,true);assert.equal(restored.risks.confidenceCalibrated,false);assert.equal(restored.boq.requiresInputReview,true);assert.equal(restored.boq.summary.totalCost,null);});
 const result={boundary:'Authored direct model, CSV, workflow and EDL regression tests; no field accuracy measurement',passed:tests.filter(t=>t.pass).length,total:tests.length,tests};
 fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=tests.every(t=>t.pass)?0:1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>fs.rmSync(tmp,{recursive:true,force:true}));

