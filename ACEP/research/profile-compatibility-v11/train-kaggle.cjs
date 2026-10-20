'use strict';
const fs=require('node:fs'),path=require('node:path');
if (!process.cwd().startsWith('/kaggle/working/')) throw Error('Fitting is restricted to Kaggle');
const base=path.resolve(__dirname,'../../packages/ai-engine/models'),out=process.argv[2];
if(!out)throw Error('Provide output directory');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const started=Date.now();const summary=await require(path.join(base,'trainer')).trainAllModels();
 fs.writeFileSync(path.join(out,'training-summary.json'),JSON.stringify({...summary,runtime:{node:process.version,platform:process.platform},elapsedSeconds:(Date.now()-started)/1000,boundary:'Descriptive fitting on explicitly synthetic compatibility fixtures; no real-project accuracy measured'},null,2)+'\n');
 if(!summary.ok)throw Error('One or more model fits failed');
 for(const [name,file] of [['project-analyzer','projectAnalyzer'],['schedule-optimizer','scheduleOptimizer']]){
  const m=require(path.join(base,name));fs.writeFileSync(path.join(out,file+'.json'),JSON.stringify(m.exportProfile(),null,2)+'\n');
 }
 // Other five fitted states are evidence snapshots, not a supported production import API.
 for(const name of ['quantity-estimator','cost-estimator','risk-analyzer','quality-inspector','supplier-intelligence']){
  const model=require(path.join(base,name));fs.writeFileSync(path.join(out,name+'-state.json'),JSON.stringify({model:name,state:model,sourceKind:'synthetic',accuracyValidated:false,productionImportSupported:false},null,2)+'\n');
 }
 console.log(JSON.stringify({status:summary.status,successfulModels:summary.successfulModels,failedModels:summary.failedModels,accuracyValidated:false}));
})().catch(e=>{console.error(e);process.exitCode=1;});
