'use strict';
// Run as a separate process on the same governed persistent volume as the queue.
if(process.env.ACEP_PROCESS_ROLE!=='training-worker')throw new Error('Set ACEP_PROCESS_ROLE=training-worker for this isolated worker');
const {UnifiedTrainingSystem}=require('../packages/uets');
const {handlers}=require('../packages/uets/training/worker-handlers');
const uets=new UnifiedTrainingSystem().initialize();let stopping=false;
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{stopping=true;});
async function main(){
 do {
  for(const [kind,handler] of Object.entries(handlers)) {
   if(stopping)break;await uets.trainingManager._process(kind,handler);
  }
  if(process.argv.includes('--once'))break;
  if(!stopping)await new Promise(resolve=>setTimeout(resolve,1000));
 }while(!stopping);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
