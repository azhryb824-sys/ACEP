const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'packages/ai-engine');
const {EngineeringDataLayer}=require(path.join(base,'engineering-data-layer')),Workflow=require(path.join(base,'workflow-engine')),Validation=require(path.join(base,'validation-engine'));
const {normalizeGeometry}=require(path.join(base,'engineering-ke/project-geometry'));
const tests=[];async function test(name,fn){try{await fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.stack});}}
const response=()=>({code:200,status(n){this.code=n;return this;},json(x){this.body=x;return this;}});
(async()=>{
 const ai={kb:require(path.join(base,'knowledge-base'))};ai.kb.initialize();
 for(const [key,n] of Object.entries({projectAnalyzer:'project-analyzer',quantityEstimator:'quantity-estimator',costEstimator:'cost-estimator',riskAnalyzer:'risk-analyzer',qualityInspector:'quality-inspector',scheduleOptimizer:'schedule-optimizer',supplierIntelligence:'supplier-intelligence'})){ai[key]=require(path.join(base,'models',n));await ai[key].train();}
 const edl=new EngineeringDataLayer(),workflow=new Workflow(ai,edl),validator=new Validation(edl),routes={};
 const projects=[{id:'valid',type:'Villa',area:300,floors:2,description:'fixture',finishing:'Standard',region:'Riyadh'}, {id:'incomplete',type:'Villa',area:300,floors:null,description:'missing'}];
 const ctx={ai,projects,edl,workflow,validator,normalizeGeometry,store:{findProject:id=>projects.find(p=>p.id===id)},
  parseDescription:text=>({type:'Villa',area:300,floors:text==='missing'?null:2}),
  require:n=>require(path.resolve(root,n)),waitForAI:f=>f,app:{post:(url,fn)=>routes[url]=fn},console};
 vm.createContext(ctx);const src=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const block=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
 vm.runInContext(block('function getProjectParams(p) {','function hasSufficientInfo')+
  block('// ─── Supplier Match','// ─── Supplier Market Analysis')+
  block('// ─── Quality Inspection (EDL-aware)','// ─── Supplier Match')+
  block('// ─── Platform: QAIIP','// ─── Platform: SIAPP')+
  block('// ─── Digital Twin','// ─── Simulation')+
  block('// ─── Full Analysis Endpoint','// ─── Knowledge Base (Phase 8)'),ctx);
 const call=async(url,body,params={})=>{const r=response();await routes[url]({body,params},r);return r;};
 await test('actual supplier route reports no_match',async()=>{const r=await call('/api/v1/cmpep/match-supplier',{category:'Missing',city:'Riyadh'});assert.equal(r.code,200);assert.equal(r.body.status,'no_match');assert.equal(r.body.marketAvgPrice,null);});
 await test('actual supplier route passes requirements',async()=>{const r=await call('/api/v1/cmpep/match-supplier',{category:'Concrete',city:'Riyadh',requirements:{minRating:5}});assert.equal(r.body.totalSuppliers,0);});
 await test('actual supplier route rejects unsupported requirements',async()=>{const r=await call('/api/v1/cmpep/match-supplier',{category:'Concrete',requirements:{unknown:1}});assert.equal(r.code,400);});
 await test('actual supplier route requires category',async()=>assert.equal((await call('/api/v1/cmpep/match-supplier',{})).code,400));
 await test('actual comparison route returns groups with review',async()=>{const r=await call('/api/v1/cmpep/compare-prices',{category:'Concrete',city:'Riyadh'});assert.equal(r.code,200);assert.equal(r.body.requiresPriceReview,true);assert(r.body.comparison.every(g=>g.city==='Riyadh'&&g.priceDate&&g.unit));});
 await test('quality route returns unknown score and counts',async()=>{const r=await call('/api/v1/projects/:id/quality/inspect',{}, {id:'valid'});assert.equal(r.body.qualityScore,null);assert.equal(r.body.estimatedDefects,null);assert.equal(r.body.requiresQualityReview,true);assert(r.body.defects.length>0);});
 await test('quality route preserves incomplete geometry review',async()=>{const r=await call('/api/v1/projects/:id/quality/inspect',{}, {id:'incomplete'});assert.equal(r.body.requiresInputReview,true);assert.equal(r.body.qualityScore,null);});
 await test('inspection route avoids passing or failing uninspected project',async()=>{const r=await call('/api/v1/qaiip/inspection',{projectId:'valid'});assert.equal(r.body.qualityIndex,null);assert.equal(r.body.passRate,null);assert.equal(r.body.status,'requires_review');assert(r.body.inspections.every(i=>i.status==='RequiresInspection'&&i.expectedCount===null));});
 await test('inspection route rejects absent project',async()=>assert.equal((await call('/api/v1/qaiip/inspection',{projectId:'absent'})).code,404));
 await test('digital twin preserves unknown quality',async()=>{const r=await call('/api/v1/digital-twin',{projectId:'valid'});assert.equal(r.body.currentState.qualityScore,null);assert.equal(r.body.performanceMetrics.qualityIndex,null);});
 await test('full-analysis actual registration runs real model pipeline',async()=>{const r=await call('/api/v1/full-analysis',{projectId:'valid'});assert.equal(r.code,200);assert.equal(r.body.quality.qualityScore,null);assert.equal(r.body.quality.requiresQualityReview,true);assert.equal(r.body.workflow.find(s=>s.name==='quality').status,'requires_review');assert.equal(r.body.cost.totalCost,null);assert.equal(r.body.engineeringDeploymentAllowed,false);assert.equal(r.body.risks.risks[0].dataBasis,'project_type_category');});
 await test('full-analysis uses explicit saved dimensions when description is silent',async()=>{const parse=ctx.parseDescription;ctx.parseDescription=()=>({type:null,area:null,floors:null}); /* the registered factory captured its original parser, so use the same production factory with this parser */ const handler=require(path.join(base,'full-analysis-handler'))({store:ctx.store,edl,workflow,validator,parseDescription:ctx.parseDescription});const r=response();await handler({body:{projectId:'valid'}},r);assert.equal(r.code,200);assert.equal(r.body.extracted.area,300);assert.equal(r.body.extracted.floors,2);assert.equal(r.body.extracted.type,'Villa');ctx.parseDescription=parse;});
 await test('full-analysis actual registration fails on missing floor',async()=>{const r=await call('/api/v1/full-analysis',{description:'missing'});assert.equal(r.code,422);assert(r.body.missing.includes('floors'));assert.equal(r.body.quality,undefined);});
 const ui=fs.readFileSync(path.join(root,'packages/ui/web/src/app.js'),'utf8');
 const slice=(a,b)=>ui.slice(ui.indexOf(a),ui.indexOf(b,ui.indexOf(a)));
 const nodes=new Map(),toasts=[];const node=k=>{if(!nodes.has(k))nodes.set(k,{textContent:'',innerHTML:'',style:{}});return nodes.get(k);};let reply={};
 const ux={state:{currentProject:'valid'},getCurrentProject:()=>({name:'fixture',description:'fixture'}),apiCall:async()=>reply,showToast:(text,tone)=>toasts.push({text,tone}),console,
  document:{getElementById:node,querySelector:node,querySelectorAll:()=>[]}};vm.createContext(ux);
 vm.runInContext(slice('  function costPresentation(cost)','  // ─── BOQ: Refresh')+slice('  async function matchSuppliers()','  // ─── Schedule: Compare Methods'),ux);
 await test('actual UI quality message does not claim a percentage',async()=>{reply={qualityScore:null,estimatedDefects:null,requiresQualityReview:true,message:'يلزم فحص المشروع'};await ux.inspectQuality();assert.equal(toasts.at(-1).tone,'warning');assert(!toasts.at(-1).text.includes('%'));});
 await test('actual UI renders missing quality as review',async()=>{reply={facts:{projectType:{value:'Villa',confidence:0}},quality:{qualityScore:null,requiresQualityReview:true},cost:{totalCost:null},analysis:[]};await ux.runFullAnalysis();assert.equal(node('#page-analysis .card-stat-value').textContent,'تحتاج فحصاً');});
 await test('actual UI supplier no_match is explicit',async()=>{reply={status:'no_match',totalSuppliers:0};await ux.matchSuppliers();assert.equal(toasts.at(-1).tone,'warning');assert(!toasts.at(-1).text.includes('undefined'));});
 const result={boundary:'Actual route/DOM handler source with real models, workflow and EDL; in-memory storage and DOM/API stubs; no full HTTP server or browser',passed:tests.filter(t=>t.pass).length,total:tests.length,tests};fs.writeFileSync(path.join(__dirname,'integration-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=tests.every(t=>t.pass)?0:1;
})().catch(e=>{console.error(e);process.exitCode=1;});
