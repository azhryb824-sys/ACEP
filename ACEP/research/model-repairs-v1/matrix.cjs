const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'packages/ai-engine/models');
require(path.join(root,'packages/ai-engine/knowledge-base')).initialize();
const names=['project-analyzer','quantity-estimator','cost-estimator','risk-analyzer','quality-inspector','schedule-optimizer','supplier-intelligence'];
const m=Object.fromEntries(names.map(n=>[n,require(path.join(base,n))]));
const results={boundary:'Direct production model calls, existing internal CSV fitting, authored 100-project matrix and input probes; no independent field accuracy or browser/neural evaluation',fit:{},matrix:[],invalid:[],diagnostics:{},sourceSHA256:{}};
const finite=(v)=>typeof v==='number'?Number.isFinite(v):Array.isArray(v)?v.every(finite):v&&typeof v==='object'?Object.values(v).every(finite):true;
const call=(n,type,area,floors,finishing='Standard')=>({
 'project-analyzer':()=>m[n].analyzeProject('مشروع اختبار',{type,area,floors,finishing,region:'Riyadh'}),
 'quantity-estimator':()=>m[n].estimateBOQ(type,area,floors,finishing,'Riyadh'),
 'cost-estimator':()=>m[n].estimateCost([{quantity:10,unitPrice:100,priceScope:'installed'}],type,area,floors,finishing,'Riyadh',{markups:{indirect:0,contingency:0,profit:0,tax:0}}),
 'risk-analyzer':()=>m[n].analyzeRisks(type,area*floors,floors,'Riyadh',finishing),
 'quality-inspector':()=>m[n].inspectProject(type,area*floors,floors,finishing),
 'schedule-optimizer':()=>m[n].generateSchedule(type,area*floors,floors,finishing,'Riyadh'),
 'supplier-intelligence':()=>m[n].findBestSupplier(type,'Riyadh')
 }[n]());
(async()=>{
 for(const n of names){results.sourceSHA256[n]=crypto.createHash('sha256').update(fs.readFileSync(path.join(base,n+'.js'))).digest('hex');try{results.fit[n]={ok:true,data:await m[n].train()};}catch(e){results.fit[n]={ok:false,error:e.message};}}
 const types=Object.keys(m['project-analyzer'].getTypeStats());
 for(let i=0;i<100;i++){
  const type=types[i%types.length],area=[150,300,1200,5000,10000][i%5],floors=[1,2,5,10,20][Math.floor(i/5)%5],finishing=['Raw','Standard','Premium','Luxury'][i%4];
  const entry={i,type,area,floors,finishing,models:{}};
  for(const n of names.filter(x=>x!=='supplier-intelligence')){
   try{const v=call(n,type,area,floors,finishing);entry.models[n]={ok:!v.error,finite:finite(v),insufficient:!!v.insufficientData,summary:n==='quality-inspector'?{score:v.qualityScore,defects:v.estimatedDefects}:n==='risk-analyzer'?{score:v.overallRiskScore}:n==='schedule-optimizer'?{days:v.totalDuration,networkDays:v.activities.reduce((s,a)=>s+a.duration,0)}:n==='cost-estimator'?{total:v.totalCost}:n==='quantity-estimator'?{items:v.items.length,cost:v.summary.totalCost}:{type:v.projectType,totalArea:v.totalArea,cost:v.estimatedCost}};}catch(e){entry.models[n]={ok:false,error:e.message};}
  }
  results.matrix.push(entry);
 }
 for(const n of names.filter(x=>x!=='supplier-intelligence'))for(const [label,a,f] of [['missing',undefined,undefined],['negative',-100,-2],['zero',0,0],['fractional_floors',300,1.5],['NaN',NaN,2],['Infinity',Infinity,2]]){
  try{const v=call(n,'Villa',a,f);const review=!!(v.insufficientData||v.requiresInputReview||v.error);results.invalid.push({model:n,input:label,rejected:false,review,finite:finite(v),acceptedWithoutReview:!review});}catch(e){results.invalid.push({model:n,input:label,rejected:true,error:e.message});}
 }
 const riskNums=type=>{const r=call('risk-analyzer',type,300,2);return r.risks.map(x=>({category:x.category,probability:x.probability,impact:x.impact,score:x.score}));};
 results.diagnostics.risk_type_sensitivity={types:types.slice(0,6),distinctNumericOutputs:new Set(types.slice(0,6).map(t=>JSON.stringify(riskNums(t)))).size};
 results.diagnostics.quality_type_sensitivity={types:types.slice(0,6),distinctOutputs:new Set(types.slice(0,6).map(t=>JSON.stringify(call('quality-inspector',t,300,2)))).size};
 results.diagnostics.qualityPredictionAbstentions=results.matrix.filter(r=>r.models['quality-inspector'].summary.score===null && r.models['quality-inspector'].summary.defects===null).length;
 results.diagnostics.suppliers=[];
 for(const cat of ['Concrete','Steel','Paint','NOT_A_REAL_CATEGORY']){const r=call('supplier-intelligence',cat);results.diagnostics.suppliers.push({category:cat,candidates:r.allCandidates,marketAvgPrice:r.marketAvgPrice,priceRecords:r.totalPriceRecords});}
 results.summary={matrixProjects:100,modelsFitted:names.filter(n=>results.fit[n].ok).length,matrixModelCalls:600,successfulFiniteCalls:results.matrix.reduce((s,r)=>s+Object.values(r.models).filter(v=>v.ok&&v.finite).length,0),invalidProbes:results.invalid.length,invalidAcceptedWithoutReview:results.invalid.filter(x=>x.acceptedWithoutReview).length};
 fs.writeFileSync(path.join(__dirname,'matrix-results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({summary:results.summary,fit:results.fit,diagnostics:results.diagnostics,invalid:results.invalid},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
