const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {EngineeringDataLayer}=require('../../packages/ai-engine/engineering-data-layer');
const Workflow=require('../../packages/ai-engine/workflow-engine');
const Validation=require('../../packages/ai-engine/validation-engine');
const cost=require('../../packages/ai-engine/models/cost-estimator');
const {validatePricingOptions}=require('../../packages/ai-engine/models/boq-cost-ledger');
const kb=require('../../packages/ai-engine/knowledge-base');kb.initialize();
const tests=[];async function test(name,fn){try{await fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.stack});}}
const installed={defaultPriceScope:'installed',markups:{indirect:0,contingency:0,profit:0,tax:0}};
async function main(){
 const edl=new EngineeringDataLayer(),p=edl.createProject('review',{});
 p.extracted.type='Villa';p.extracted.area=100;p.extracted.floors=2;
 p.boq.items=[{code:'wall',quantity:10,unitPrice:100,unit:'m2',priceScope:'unknown'}];
 const workflow=new Workflow({costEstimator:cost},edl);
 await test('new EDL project has unknown cost rather than a zero estimate',()=>{assert.equal(p.cost.totalCost,null);assert.equal(p.cost.status,'not_estimated');assert.equal(p.get3DParams().totalCost,null);});
 await test('tiny areas cannot produce infinite per-area cost',()=>{assert.throws(()=>cost.estimateCost([{quantity:1,unitPrice:1000,priceScope:'installed'}],'Villa',1e-320,2,'Standard','Riyadh',installed),/unsafe cost per m2/);});
 await test('workflow keeps unknown scope unresolved in EDL',async()=>{await workflow.stepCost(p);assert.equal(p.cost.totalCost,null);assert.equal(p.metadata.workflowStep,'cost_requires_review');assert.equal(p.cost.pricedBOQSubtotal,1000);});
 await test('validator explains review without a false zero-cost warning',()=>{const r=new Validation(edl).validate(p);assert(r.warnings.some(w=>w.code==='V000_SCOPE'));assert(!r.warnings.some(w=>/التكلفة.*= 0/.test(w.message)));});
 await test('workflow records explicit scope and does not add installation again',async()=>{await workflow.stepCost(p,installed);assert.equal(p.cost.totalCost,1000);assert.equal(p.cost.breakdown.labor.cost,0);assert.equal(p.cost.breakdown.equipment.cost,0);});
 await test('re-estimation preserves reviewed pricing options',async()=>{await workflow.stepCost(p);assert.equal(p.cost.totalCost,1000);assert.equal(p.metadata.costPricing.defaultPriceScope,'installed');});
 await test('EDL JSON round-trip preserves missing cost and review details',async()=>{const q=edl.createProject('roundtrip',{});q.setCost({totalCost:null,status:'incomplete',pricingIssues:[{reason:'price_scope_required'}]});const restored=edl.createProject('restored',{});restored.fromJSON(JSON.parse(JSON.stringify(q.toJSON())));assert.equal(restored.cost.totalCost,null);assert.equal(restored.cost.pricingIssues[0].reason,'price_scope_required');});
 const src=fs.readFileSync('server.js','utf8');const start=src.indexOf("app.post('/api/v1/projects/:id/cost/estimate'");const end=src.indexOf('// ─── Schedule Generation',start);
 let handler;const context={projects:[{id:p.id,description:'Test'}],edl,workflow,validator:new Validation(edl),validatePricingOptions,waitForAI:f=>f,app:{post:(url,f)=>{handler=f;}}};
 vm.createContext(context);vm.runInContext(src.slice(start,end),context);
 const request=async body=>{const r={statusCode:200,status(n){this.statusCode=n;return this;},json(value){this.body=value;return this;}};await handler({params:{id:p.id},body},r);return r;};
 await test('actual cost route returns scope evidence and reviewed totals',async()=>{const r=await request({pricing:installed});assert.equal(r.statusCode,200);assert.equal(r.body.totalCost,1000);assert.equal(r.body.scopeSummary.installedItems,1);});
 await test('cost route rejects invalid pricing before changing review settings',async()=>{const before=JSON.stringify(p.metadata.costPricing);const r=await request({pricing:{defaultPriceScope:'all_in'}});assert.equal(r.statusCode,400);assert.equal(JSON.stringify(p.metadata.costPricing),before);});
 await test('cost route without options reuses prior explicit settings',async()=>{const r=await request({});assert.equal(r.body.totalCost,1000);});
 console.log('RESULT_JSON='+JSON.stringify({boundary:'real_workflow_EDL_validator_cost_and_route_handler; no full server or browser',tests,passed:tests.filter(x=>x.pass).length,total:tests.length}));process.exitCode=tests.every(x=>x.pass)?0:1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
