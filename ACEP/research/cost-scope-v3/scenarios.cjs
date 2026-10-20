const assert=require('node:assert/strict');
const estimator=require('../../packages/ai-engine/models/cost-estimator');
const kb=require('../../packages/ai-engine/knowledge-base');kb.initialize();
const rates={indirect:.1,contingency:.05,profit:.1,tax:.15};
const m=x=>Math.round((x+Number.EPSILON)*100)/100;
const cases=[];
for(let i=0;i<100;i++){
 const quantity=1+i%17,unitPrice=10+i*.25,labor=20+i,equipment=i%7;
 const items=[{code:'installed',quantity,unitPrice,unit:'m2',priceScope:'installed'},
  {code:'supply',quantity:2,unitPrice:30+i,unit:'m3',priceScope:'supply_only',installation:{labor,equipment}}];
 const direct=m(quantity*unitPrice+2*(30+i)+labor+equipment);
 const indirect=m(direct*.1),contingency=m(direct*.05),profit=m((direct+indirect+contingency)*.1),tax=m((direct+indirect+contingency+profit)*.15);
 const expected=m(direct+indirect+contingency+profit+tax);
 const row={id:'scope-'+(i+1),expectedDirect:direct,expectedTotal:expected,pass:false};
 try{
  const a=estimator.estimateCost(items,'Villa',100,2,'Standard','Riyadh',{markups:rates});
  assert.equal(a.directCost,direct);assert.equal(a.totalCost,expected);
  const b=estimator.estimateCost([...items].reverse(),'Villa',100,2,'Standard','Riyadh',{markups:rates});
  assert.equal(b.totalCost,a.totalCost);
  const split=[{...items[0],quantity:quantity/2},{...items[0],quantity:quantity/2},items[1]];
  assert.equal(estimator.estimateCost(split,'Villa',100,2,'Standard','Riyadh',{markups:rates}).totalCost,a.totalCost);
  assert.equal(a.breakdown.labor.cost,labor);assert.equal(a.breakdown.equipment.cost,equipment);row.pass=true;
 }catch(e){row.error=e.message;}
 cases.push(row);
}
console.log(JSON.stringify({kind:'authored_arithmetic_not_actual_quotes_or_projects',passed:cases.filter(x=>x.pass).length,total:cases.length,cases},null,2));process.exitCode=cases.every(x=>x.pass)?0:1;
