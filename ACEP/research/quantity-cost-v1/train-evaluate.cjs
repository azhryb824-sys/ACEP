/** Reproducible price-statistics fit. Does not validate project quantities or totals. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const csv=require('../../packages/ai-engine/models/training-csv');
const qty=require('../../packages/ai-engine/models/quantity-estimator');
const cost=require('../../packages/ai-engine/models/cost-estimator');
const base=path.resolve(__dirname,'../../packages/databases/training/csv');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const split=s=>parseInt(hash('acep-quantity-cost-v1|'+s).slice(0,8),16)%5===0;
const read=name=>csv.readCSV(path.join(base,name),[]).records.map(r=>r.values);
const key=r=>r.description_ar+'|'+csv.unit(r.unit);
const csvWrite=(file,rows)=>{const h=Object.keys(rows[0]);const quote=x=>'"'+String(x).replaceAll('"','""')+'"';fs.writeFileSync(file,[h,...rows.map(r=>h.map(k=>r[k]))].map(row=>row.map(quote).join(',')).join('\n'));};
const metrics=pairs=>pairs.length?{n:pairs.length,mapePercent:100*pairs.reduce((s,[a,p])=>s+Math.abs(a-p)/a,0)/pairs.length}:null;
async function main(){
 const rows=read('boq_items.csv');const training=rows.filter(r=>!split(r.project_id)),heldout=rows.filter(r=>split(r.project_id));
 const testIds=new Set(heldout.map(r=>r.project_id));
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'acep-price-fit-'));
 let holdout;
 try{
  const file=path.join(tmp,'boq.csv');csvWrite(file,training);await qty.train(file);
  const predictions=heldout.map(r=>({r,s:qty.byItemUnit[key(r)]}));
  const defaults={'Excavation for foundations':35,'Plain concrete (PC)':430,'Reinforced concrete (RC) foundations':430,'RC columns':500,'RC beams':500,'RC slabs':480,'RC shear walls':420,'RC stairs':480};
  const matched=predictions.filter(({r,s})=>s&&defaults[r.description_ar]!==undefined&&csv.unit(r.unit)==='m3'&&Number(r.unit_price_sar)>0);
  holdout={split:'SHA256(project_id), fixed salt; modulo 5 == 0 held out',trainProjects:new Set(training.map(r=>r.project_id)).size,testProjects:new Set(heldout.map(r=>r.project_id)).size,projectOverlap:[...new Set(training.map(r=>r.project_id))].filter(id=>testIds.has(id)).length,trainRows:training.length,testRows:heldout.length,coveredRows:predictions.filter(p=>p.s).length,allDescriptionUnitMean:metrics(predictions.filter(({r,s})=>s&&Number(r.unit_price_sar)>0).map(({r,s})=>[Number(r.unit_price_sar),s.priceMean])),eightMappedDescriptions:{baselineDefaults:metrics(matched.map(({r})=>[Number(r.unit_price_sar),defaults[r.description_ar]])),fittedMean:metrics(matched.map(({r,s})=>[Number(r.unit_price_sar),s.priceMean]))}};
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 const material=read('material_prices.csv'),trainMat=material.filter(r=>!split(r.supplier_name)),testMat=material.filter(r=>split(r.supplier_name));
 const mk=r=>[r.material_name,csv.unit(r.unit),r.city,r.quality_grade].join('|');const groups=new Map();
 for(const r of trainMat){const k=mk(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(Number(r.avg_price_sar));}
 const mp=testMat.filter(r=>groups.has(mk(r))).map(r=>[Number(r.avg_price_sar),groups.get(mk(r)).reduce((a,b)=>a+b,0)/groups.get(mk(r)).length]);
 const quantityFit=await qty.train(),costFit=await cost.train();
 const files={};for(const name of ['boq_items.csv','material_prices.csv','labor_rates.csv','equipment_rates.csv','suppliers.csv'])files[name]={sha256:hash(fs.readFileSync(path.join(base,name))),bytes:fs.statSync(path.join(base,name)).size};
 const repeated=new Map();for(const r of material){const k=mk(r);if(!repeated.has(k))repeated.set(k,[]);repeated.get(k).push(r);}
 const repeatedGroups=[...repeated.values()].filter(v=>v.length>1);
 const result={schemaVersion:1,kind:'descriptive_statistical_fit_not_neural_training',createdAt:new Date().toISOString(),quantityFit,costFit,holdout,materialHoldout:{split:'supplier_name SHA256 fixed salt; same supplier never in both partitions',trainRows:trainMat.length,testRows:testMat.length,coveredRows:mp.length,coveragePercent:testMat.length?100*mp.length/testMat.length:0,metrics:metrics(mp),interpretation:'Not independent: all covered test rows reproduce a training price for the same feature key; do not interpret zero error as predictive accuracy',repeatedFeatureGroups:repeatedGroups.length,allRepeatedFeatureGroupsHaveOnePrice:repeatedGroups.every(v=>new Set(v.map(r=>r.avg_price_sar)).size===1)},provenanceEvidence:{generator:'packages/databases/training/scripts/generate_training_data.js',boq:'generateBOQItems uses category basePrice x city.costIndex x random jitter and random quantities',material:'generateMaterialPrices repeats one jittered material/city price across supplier records',interpretation:'Dataset patterns match the included synthetic generator; no independently verified project or market evidence supplied'},inputs:files,limitations:['CSV provenance and prices are unverified; not current market quotes','Project-ID separation is not independent real-world validation; generator/template leakage has not been excluded','No measured ground-truth quantities or actual final project costs','BOQ quantities and staffing/duration/overheads remain engineering heuristics','Installed BOQ rates may already include labor/equipment: cost scope needs review','Confidence is not empirically calibrated; no production approval']};
 fs.writeFileSync(path.join(__dirname,'fit-report.json'),JSON.stringify(result,null,2)+'\n');
 fs.writeFileSync(path.join(__dirname,'statistics-snapshot.json'),JSON.stringify({kind:result.kind,inputs:files,quantity:{byCategory:qty.byCategory,byItemUnit:qty.byItemUnit},cost:{materialStats:cost.materialStats,laborStats:cost.laborStats,equipStats:cost.equipStats},notValidatedForProduction:true},null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
