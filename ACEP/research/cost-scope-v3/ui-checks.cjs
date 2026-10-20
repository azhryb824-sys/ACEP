const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('packages/ui/web/src/app.js','utf8');
const cut=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const presentation=cut('  function costPresentation(cost)', '  async function runFullAnalysis');
const loader=cut('  async function loadCostAnalysis()', '  // ─── Schedule:');
const analysis=cut('  async function runFullAnalysis()', '  // ─── BOQ: Refresh');
const nodes=new Map(),toasts=[];
const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',style:{}});return nodes.get(id);};
let reply={};
const context={state:{currentProject:'fixture'},getCurrentProject:()=>({name:'Fixture',description:'فيلا اختبار'}),
 apiCall:async()=>reply,showToast:(text,tone)=>toasts.push({text,tone}),console:{log(){},error(){}},
 document:{getElementById:id=>node(id),querySelector:selector=>node(selector),querySelectorAll:()=>[]}};
vm.createContext(context);vm.runInContext(presentation+loader+analysis,context);
const tests=[];async function test(name,fn){try{await fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.message});}}
async function main(){
 await test('unknown total displays review instead of zero',async()=>{reply={totalCost:null,directCost:null,indirectCost:null,profit:null,status:'incomplete',requiresCostScopeReview:true,breakdown:{}};await context.loadCostAnalysis();assert.equal(node('#page-cost .card-stat:nth-child(1) .card-stat-value').textContent,'تحتاج مراجعة');assert.equal(toasts.at(-1).tone,'warning');});
 await test('legacy zero with pending review is not a completed zero estimate',()=>assert.equal(context.costPresentation({totalCost:0,requiresCostScopeReview:true}).label,'تحتاج مراجعة'));
 await test('explicit completed zero remains a valid zero',()=>assert.equal(context.costPresentation({totalCost:0,status:'priced_estimate',requiresCostScopeReview:false}).label,'0 SAR'));
 await test('breakdown uses actual component names and amounts',async()=>{reply={status:'priced_estimate',totalCost:1454.75,directCost:1000,indirectCost:100,profit:115,breakdown:{materials:{cost:0,percentage:0},installed:{cost:1000,percentage:100},labor:{cost:0,percentage:0},equipment:{cost:0,percentage:0}}};await context.loadCostAnalysis();const html=node('#page-cost .flex.flex-col.gap-3').innerHTML;assert(html.includes('بنود شاملة التركيب'));assert(html.includes('1,000 SAR'));assert(!html.includes('أعمال معمارية'));assert(!html.includes('15%'));});
 await test('full analysis card preserves review and does not invent confidence interval',async()=>{reply={cost:{totalCost:null,status:'incomplete',requiresCostScopeReview:true,confidence:0},facts:{projectType:{value:'Villa',confidence:.5}},boq:{summary:{totalItems:1,averageConfidence:.5}},analysis:[]};await context.runFullAnalysis();assert.equal(node('analysis-cost-value').textContent,'تحتاج مراجعة');assert(!node('analysis-cost-confidence').textContent.includes('±'));assert.equal(toasts.at(-1).tone,'warning');});
 await test('nonfinite or negative totals cannot render as valid costs',()=>{for(const totalCost of [NaN,Infinity,-1])assert.equal(context.costPresentation({totalCost}).label,'تحتاج مراجعة');});
 console.log('RESULT_JSON='+JSON.stringify({boundary:'actual_browser_handler_source_with_DOM_and_API_stubs_not_full_browser',tests,passed:tests.filter(x=>x.pass).length,total:tests.length}));process.exitCode=tests.every(x=>x.pass)?0:1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
