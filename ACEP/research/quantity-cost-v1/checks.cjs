const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const cost = require(root+'/packages/ai-engine/models/cost-estimator');
const quantity = require(root+'/packages/ai-engine/models/quantity-estimator');
const kb = require(root+'/packages/ai-engine/knowledge-base');
async function run() {
 kb.initialize();
 const checks=[];
 const check=(name,fn)=>{try{fn(); checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}};
 await cost.train(); await quantity.train();
 check('labor city follows CSV header',()=>assert(cost.getLaborRates('Mason','Riyadh').length>0));
 check('supplier city follows CSV header',()=>assert(cost.getSupplierMatches(null,'Khobar').length>0));
 check('equipment has city and operator flag',()=>{assert.equal(cost.equipmentRates[0].city,'Riyadh');assert.equal(cost.equipmentRates[0].withOperator,true);});
 const estimate=items=>cost.estimateCost(items,'Villa',100,2);
 check('explicit zero paint price is preserved',()=>assert.equal(estimate([{category:'Paint',unit:'m2',quantity:100,unitPrice:0}]).breakdown.materials.cost,0));
 check('explicit paint price does not mix SAR/gal with SAR/m2',()=>assert.equal(estimate([{category:'Paint',unit:'m2',quantity:100,unitPrice:18}]).breakdown.materials.cost,1800));
 check('missing paint coverage returns incomplete total',()=>{const r=estimate([{category:'Paint',unit:'m2',quantity:100}]);assert.equal(r.totalCost,null);assert.equal(r.status,'incomplete');});
 check('insufficient BOQ item prevents complete total',()=>assert.equal(estimate([{quantity:0,unitPrice:18,insufficient:true}]).totalCost,null));
 check('invalid project dimensions rejected',()=>assert.throws(()=>cost.estimateCost([],'Villa',0,2),/area|مساحة/i));
 check('quantity prices grouped by description and unit',()=>assert(quantity.byItemUnit && quantity.byItemUnit['Excavation for foundations|m3']));
 cost.trained=false;
 check('fallback cost per area agrees with total',()=>{const r=estimate([]);assert.equal(r.costPerM2,Math.round(r.totalCost/200));});
 return {checks,passed:checks.filter(x=>x.pass).length,total:checks.length};
}
module.exports=run;
if(require.main===module)run().then(r=>{console.log(JSON.stringify(r,null,2));process.exitCode=r.passed===r.total?0:1;});
