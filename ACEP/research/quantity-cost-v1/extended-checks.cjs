const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const csv=require('../../packages/ai-engine/models/training-csv');
const qty=require('../../packages/ai-engine/models/quantity-estimator');
const cost=require('../../packages/ai-engine/models/cost-estimator');
const Engine=require('../../packages/ai-engine/engineering-ke/boq-engine');
const kb=require('../../packages/ai-engine/knowledge-base');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'acep-stat-tests-'));
const tests=[];async function test(name,fn){try{await fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.stack});}}
async function main(){kb.initialize();
const file=(name,text)=>{const p=path.join(tmp,name);fs.writeFileSync(p,text);return p;};
await test('CSV supports BOM, reordered headers, quoted commas, escaped quotes and newlines',()=>{
 const p=file('quoted.csv','\uFEFFb,a\r\n"line1\nline2","one, ""two"""\r\n');
 assert.deepEqual(csv.readCSV(p,['a','b']).records[0].values,{b:'line1\nline2',a:'one, "two"'});
});
await test('CSV rejects truncated quotes and duplicate/missing headers',()=>{
 for(const text of ['a,b\n"x,y','a,a\n1,2','a,c\n1,2'])assert.throws(()=>csv.readCSV(file('bad.csv',text),['a','b']));
});
await test('numeric parser rejects blanks, suffixes, infinity and negatives; retains zero',()=>{
 for(const v of ['', ' ', '12sar', 'Infinity', '-1', '0x10'])assert.throws(()=>csv.number(v));assert.equal(csv.number('0'),0);
});
const header='project_id,item_code,description_ar,category,unit,quantity,unit_price_sar,confidence,waste_factor\n';
await test('quantity fit rejects malformed rows and retains audit counts',async()=>{
 const r=await qty.train(file('qty.csv',header+'P1,01EA,Excavation for foundations,EarthWork,m3,10,25,80,0.05\nP2,02EA,Excavation for foundations,EarthWork,m3,10,bad,80,0.05\nshort,row\n'));
 assert.equal(r.items,1);assert.equal(r.audit.rejected,2);
});
await test('quantity fit resets old groups and preserves zero prices',async()=>{
 await qty.train(file('qty2.csv',header+'P2,02C,RC columns,Concrete,m3,1,0,80,0.05\n'));
 assert.equal(qty.byItemUnit['Excavation for foundations|m3'],undefined);assert.equal(qty.byItemUnit['RC columns|m3'].priceMean,0);
});
await test('failed quantity fit preserves previous valid state',async()=>{const old=qty.byItemUnit;await assert.rejects(qty.train(file('empty.csv',header)));assert.equal(qty.byItemUnit,old);});
await test('BOQ lookup requires matching item and unit, never reused price category',()=>{
 const e=new Engine(),s={suppressRegionalAdjustment:true,byItemUnit:{'RC columns|m3':{priceMean:321}}};
 assert.equal(e._estimateUnitPrice('COL',s,'الرياض','م³','STR-001'),321);
 assert.equal(e._estimateUnitPrice('COL',s,'الرياض','وحدة','HTL-006'),500);
 assert.equal(e._estimateUnitPrice('COL',s,'الرياض','no','STR-001'),500);
});
await test('finishing and region applied once; summaries reconcile for primary/suggested items',async()=>{
 await qty.train();
 const result=qty.estimateBOQ('Villa',300,2,'Luxury','Jeddah',{phase:'Full_Construction',rooms:4,bathrooms:3});
 assert.equal(result.summary.totalCost,Math.round(result.items.reduce((s,i)=>s+i.totalPrice,0)*100)/100);
 assert.equal(result.summary.totalSuggestedCost,Math.round(result.suggestedItems.reduce((s,i)=>s+i.totalPrice,0)*100)/100);
 const x=result.items.find(i=>i.code==='EXC-001');
 assert.equal(x.unitPrice,Math.round(qty.byItemUnit['Excavation for foundations|m3'].priceMean*kb.getMaterialPriceMultiplier('Luxury')*kb.getRegionIndex('Jeddah')*100)/100);
});
await test('cost fit clears old groups on successful refit',async()=>{await cost.train();cost.materialStats.STALE={avg:1};cost.laborStats.STALE={avg:1};cost.equipStats.STALE={avg:1};await cost.train();for(const x of [cost.materialStats,cost.laborStats,cost.equipStats])assert.equal(x.STALE,undefined);});
await test('failed cost fit preserves valid snapshot',async()=>{const old=cost.materialPrices;await assert.rejects(cost.train('/nonexistent/acep.csv'));assert.equal(cost.materialPrices,old);assert.equal(cost.trained,true);});
await test('material lookup requires same name, unit, city and grade',()=>{
 const m=cost.materialPrices[0];const item={quantity:3,materialName:m.name,unit:m.unit,grade:m.grade,priceScope:'supply_only',installation:{labor:0,equipment:0}};
 const r=cost.estimateCost([item],'Villa',100,2,'Standard',m.city);
 const match=cost.materialPrices.filter(x=>x.name===m.name&&x.unit===m.unit&&x.grade===m.grade&&x.city===m.city);
 assert.equal(r.breakdown.materials.cost,Math.round(3*match.reduce((s,m)=>s+m.price,0)/match.length*100)/100);
 for(const patch of [{unit:'m2'},{grade:'unknown'},{materialName:'unknown'}])assert.equal(cost.estimateCost([{...item,...patch}],'Villa',100,2,'Standard',m.city).totalCost,null);
});
await test('negative, NaN, textual price and quantity cannot form complete estimates',()=>{
 for(const item of [{quantity:-1,unitPrice:2},{quantity:NaN,unitPrice:2},{quantity:1,unitPrice:-2},{quantity:1,unitPrice:'18'}])assert.equal(cost.estimateCost([item],'Villa',100,2).totalCost,null);
});
console.log(JSON.stringify({tests,passed:tests.filter(x=>x.pass).length,total:tests.length},null,2));process.exitCode=tests.some(x=>!x.pass)?1:0;
}
main().finally(()=>fs.rmSync(tmp,{recursive:true,force:true}));
