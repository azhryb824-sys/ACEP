const assert=require('node:assert/strict');
const Engine=require('../../packages/ai-engine/engineering-ke/boq-engine');
const engine=new Engine();
const types=['Villa','Luxury_Villa','School','Hospital','Residential_Tower','Factory','Apartment_Building','Mosque','Warehouse','Hotel','Mall','Office_Building','Residential_Compound'];
const results=[];
for(let i=0;i<100;i++) {
 const area=Math.round((120+(i*137.37)%6000)*100)/100;
 const floors=1+(i%15),type=types[i%types.length];
 const p={type,area,floors,rooms:10,bathrooms:6,hasKitchen:true,phase:'Shell'};
 const r={id:'geometry-'+String(i+1).padStart(3,'0'),type,perFloorAreaM2:area,floors,pass:false};
 try {
  const a=engine.generate({...p,areaBasis:'per_floor'},{});
  const b=engine.generate({...p,area:area*floors,areaBasis:'total_built_up'},{});
  const aa=[...a.items,...a.suggestedItems],bb=[...b.items,...b.suggestedItems];
  assert.equal(aa.length,bb.length);
  for(let j=0;j<aa.length;j++){assert.equal(aa[j].code,bb[j].code);assert.ok(Math.abs(aa[j].quantity-bb[j].quantity)<0.011);}
  const excavation=aa.find(x=>x.code==='EXC-001');
  assert.equal(excavation.quantity,Math.round(area*1.5*100)/100);
  const c=engine.generate({...p,floors:floors*2,areaBasis:'per_floor'},{});
  assert.equal(c.items.find(x=>x.code==='EXC-001').quantity,excavation.quantity);
  const slab=aa.find(x=>x.code==='STR-003'),t=type==='Residential_Tower'?.22:type==='Hospital'?.20:.18;
  assert.equal(slab.quantity,Math.round(area*t*floors*100)/100);
  r.expectedExcavationM3=excavation.quantity;r.expectedSlabM3=slab.quantity;r.pass=true;
 }catch(error){r.error=error.message;}
 results.push(r);
}
console.log(JSON.stringify({kind:'authored_arithmetic_and_metamorphic_scenarios_not_actual_projects',passed:results.filter(r=>r.pass).length,total:results.length,results},null,2));
process.exitCode=results.every(r=>r.pass)?0:1;
