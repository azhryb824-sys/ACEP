/** Executes the actual POST/GET route handlers with real quantity/cost/analyzer modules.
 * Storage is an in-memory test double; schedule/risk/quality are stubs. No full UI test. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
const quantity=require(path.join(root,'packages/ai-engine/models/quantity-estimator'));
const cost=require(path.join(root,'packages/ai-engine/models/cost-estimator'));
const analyzer=require(path.join(root,'packages/ai-engine/models/project-analyzer'));
const kb=require(path.join(root,'packages/ai-engine/knowledge-base'));
const {normalizeGeometry}=require(path.join(root,'packages/ai-engine/engineering-ke/project-geometry'));
const {validatePricingOptions}=require('../../packages/ai-engine/models/boq-cost-ledger');
const block=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
async function main(){
 kb.initialize();await quantity.train();await cost.train();await analyzer.train();
 let records=[],id=0;const routes={};
 const context={normalizeGeometry,validatePricingOptions,RangeError,console:{log(){},error(){}},aiReady:true,projects:[],
  app:{post:(url,handler)=>routes['POST '+url]=handler,get:(url,handler)=>routes['GET '+url]=handler},
  store:{createProject:data=>{const p={id:'test-'+(++id),...data};records.push(p);return p;},getProjects:()=>records,findProject:id=>records.find(p=>p.id===id)},
  parseDescription:()=>({type:'Villa',area:null,floors:null}),
  ai:{quantityEstimator:quantity,costEstimator:cost,projectAnalyzer:analyzer,
   scheduleOptimizer:{generateSchedule:()=>({totalDuration:100,totalMonths:4})},
   riskAnalyzer:{analyzeRisks:()=>({riskLevel:'test',overallRiskScore:0})},
   qualityInspector:{inspectProject:()=>({qualityScore:0,qualityGrade:'test'})}}
 };
 vm.createContext(context);
 vm.runInContext(block('function getProjectParams(p) {','function hasSufficientInfo')+'\n'+
  block("app.post('/api/v1/projects',","app.get('/api/v1/projects/:id'")+'\n'+
  block("app.get('/api/v1/projects/:id'","app.put('/api/v1/projects/:id'"),context);
 const call=(method,req)=>{const res={statusCode:200,status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};routes[method](req,res);return res;};
 const post=body=>call('POST /api/v1/projects',{body});const get=id=>call('GET /api/v1/projects/:id',{params:{id}});
 const tests=[];const test=(name,fn)=>{try{fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 const body={name:'Arithmetic fixture',description:'بناء فيلا كامل',type:'Villa',area:300,floors:2,pricing:{defaultPriceScope:'installed',markups:{indirect:0,contingency:0,profit:0,tax:0}}};
 test('explicit project type is respected by analyzer',()=>{const r=post({...body,type:'Hospital'});assert.equal(r.body.project.aiAnalysis.projectType,'Hospital');});
 test('POST stores per-floor area and GET preserves cost',()=>{const r=post(body);assert.equal(r.statusCode,201);assert.equal(r.body.project.area,300);assert.equal(get(r.body.project.id).body.cost.totalCost,r.body.project.cost.totalCost);});
 test('POST total-built-up input is normalized once',()=>{const r=post({...body,area:600,areaBasis:'total_built_up'});assert.equal(r.body.project.area,300);assert.equal(r.body.project.areaBasis,'per_floor');assert.equal(r.body.project.boq.items.find(i=>i.code==='EXC-001').quantity,450);assert.equal(get(r.body.project.id).body.cost.totalCost,r.body.project.cost.totalCost);});
 test('explicit decimal area is not rounded through analyzer output',()=>{const r=post({...body,area:237.53});assert.equal(r.body.project.area,237.53);assert.equal(r.body.project.cost.geometry.perFloorAreaM2,237.53);});
 test('stored finishing and region survive GET recomputation',()=>{const r=post({...body,finishing:'Luxury',region:'Jeddah'});assert.equal(r.statusCode,201);const b=quantity.estimateBOQ('Villa',300,2,'Luxury','Jeddah');const expected=cost.estimateCost(b.items,'Villa',300,2,'Luxury','Jeddah',body.pricing);assert.ok(Number.isFinite(expected.knownDirectSubtotal) && expected.knownDirectSubtotal>0);assert.equal(r.body.project.cost.knownDirectSubtotal,expected.knownDirectSubtotal);assert.equal(get(r.body.project.id).body.cost.knownDirectSubtotal,expected.knownDirectSubtotal);assert.equal(r.body.project.cost.totalCost,expected.totalCost);assert.equal(get(r.body.project.id).body.cost.totalCost,r.body.project.cost.totalCost);});
 test('invalid explicit area and unsupported basis return 400 without persistence',()=>{for(const patch of [{area:-1},{area:0},{area:'300'},{areaBasis:'land_area'}]){const before=records.length;assert.equal(post({...body,...patch}).statusCode,400);assert.equal(records.length,before);}});
 test('offline create still normalizes explicit total area',()=>{context.aiReady=false;try{const r=post({...body,area:600,areaBasis:'total_built_up'});assert.equal(r.statusCode,201);assert.equal(r.body.project.area,300);assert.equal(r.body.project.areaBasis,'per_floor');}finally{context.aiReady=true;}});
 test('online missing dimensions do not produce assumed BOQ or price',()=>{const r=post({name:'Incomplete project'});assert.equal(r.statusCode,201);assert.equal(r.body.project.boq,null);assert.equal(r.body.project.cost,null);assert.equal(r.body.project.analysisStatus,'insufficient_data');assert.ok(r.body.project.missingFields.includes('area'));assert.equal(get(r.body.project.id).body.boq,null);assert.equal(get(r.body.project.id).body.cost,null);});
 test('partial geometry keeps missing floors unknown through create and read',()=>{const r=post({name:'Partial project',type:'Villa',area:300});assert.equal(r.statusCode,201);assert.equal(r.body.project.floors,null);assert.equal(r.body.project.boq,null);assert.equal(get(r.body.project.id).body.cost,null);});
 test('name-only creation remains available without AI data',()=>{context.aiReady=false;try{const r=post({name:'Unanalysed project'});assert.equal(r.statusCode,201);assert.equal(r.body.project.cost,null);}finally{context.aiReady=true;}});
 test('GET handles explicitly marked legacy total area without changing stored record',()=>{records.push({id:'marked-total',...body,area:600,areaBasis:'total_built_up'});const r=get('marked-total');assert.equal(r.body.cost.geometry.perFloorAreaM2,300);assert.equal(records.find(p=>p.id==='marked-total').area,600);});
 test('unlabelled legacy area retains its previous per-floor interpretation',()=>{records.push({id:'unlabelled',...body});const r=get('unlabelled');assert.equal(r.body.cost.geometry.perFloorAreaM2,300);assert.equal(records.find(p=>p.id==='unlabelled').areaBasis,undefined);});
 console.log('RESULT_JSON='+JSON.stringify({testBoundary:'actual_route_handlers_real_three_models_stub_other_services_and_store',tests,passed:tests.filter(t=>t.pass).length,total:tests.length}));process.exitCode=tests.every(t=>t.pass)?0:1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
