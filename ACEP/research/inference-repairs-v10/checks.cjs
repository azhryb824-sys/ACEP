'use strict';
// Authored software fixtures only. No fitting and no predictive-accuracy claims.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http');
const root=path.resolve(__dirname,'../..');
const schedule=require('../../packages/ai-engine/models/schedule-optimizer');
const risk=require('../../packages/ai-engine/models/risk-analyzer');
const quality=require('../../packages/ai-engine/models/quality-inspector');
const analyzer=require('../../packages/ai-engine/models/project-analyzer');
const supplier=require('../../packages/ai-engine/models/supplier-intelligence');
const Workflow=require('../../packages/ai-engine/workflow-engine');
const {EngineeringDataLayer}=require('../../packages/ai-engine/engineering-data-layer');
for(const m of [schedule,risk,quality,analyzer,supplier]) m.train=()=>{throw Error('Fitting is forbidden in this test suite');};
const checks=[]; const check=async(name,fn)=>{await fn();checks.push(name);};
const clone=x=>JSON.parse(JSON.stringify(x));
const activity=(id,duration,predecessors=[])=>({id,duration,predecessors});
const network=[activity('A',2),activity('B',3,['A']),activity('C',5,['A']),activity('D',1,['B','C'])];
const profile={profileVersion:2,count:10,durationMean:5,areaBasis:'total_built_up',totalBuiltUpAreaMean:1000,
  areaMean:500,floorsAvg:2,totalAreaMin:500,totalAreaMax:2000,floorsMin:1,floorsMax:4};
const rating={count:2,probMean:.6,impactMean:.6,riskScoreMean:.2,descriptions:['Historical risk'],mitigations:['Review site']};
const edl=new EngineeringDataLayer(),workflow=new Workflow({scheduleOptimizer:schedule,riskAnalyzer:risk,qualityInspector:quality},edl);
let server;
(async()=>{
  await check('Untrained schedule abstains; no invented fallback',()=>{const s=schedule.generateSchedule('Villa',1000,2);assert.equal(s.totalDuration,null);assert.equal(s.estimateStatus,'not_trained');});
  await check('Missing geometry produces an explicit incomplete result',()=>{assert.equal(schedule.generateSchedule(null,null,null).totalDuration,null);});
  for(const bad of [0,-1,NaN,Infinity,'1000']) await check('Invalid area rejected: '+String(bad),()=>assert.throws(()=>schedule.generateSchedule('Villa',bad,2)));
  await check('Unsafe/fractional floors rejected',()=>{for(const f of [0,1.5,Infinity,'2'])assert.throws(()=>schedule.generateSchedule('Villa',1000,f));});
  schedule.trained=true;schedule.byType={Villa:clone(profile)};
  await check('Unknown project type never borrows a generic eight-month project',()=>assert.equal(schedule.generateSchedule('Unknown-type',1000,2).estimateStatus,'unsupported_project_type'));
  await check('Prototype names never resolve as history or factors',()=>{assert.equal(schedule.generateSchedule('constructor',1000,2).totalDuration,null);assert.equal(schedule.generateSchedule('Villa',1000,2,'constructor').totalDuration,null);});
  await check('Legacy ambiguous-area profile requires replacement',()=>{schedule.byType.Villa={count:10,durationMean:5,areaMean:500,floorsAvg:2};assert.equal(schedule.generateSchedule('Villa',1000,2).estimateStatus,'incompatible_training_profile');schedule.byType.Villa=clone(profile);});
  await check('Reference area is total built-up area',()=>{const s=schedule.generateSchedule('Villa',1000,2);assert.equal(s.parameters.areaFactor,1);assert.equal(s.parameters.referenceTotalBuiltUpArea,1000);assert.equal(s.totalDuration,110);});
  await check('Activities exactly allocate duration without double floor/method scaling',()=>{for(const [area,floors] of [[500,1],[1000,2],[1500,3],[2000,4]]){const s=schedule.generateSchedule('Villa',area,floors,'Premium','Riyadh','Precast');assert.equal(s.totalDuration,Math.max(s.minimumTemplateDuration,s.heuristicDurationEstimate));assert.equal(s.totalDuration,s.activities.reduce((n,a)=>n+a.duration,0));assert.equal(s.totalDuration,schedule.analyzeActivityNetwork(s.activities).totalDuration);}});
  await check('Template minimum is disclosed, not hidden inflation',()=>{const s=schedule.generateTemplateSchedule(100,1,'Raw');assert.equal(s.totalDuration,85);assert.equal(s.minimumDurationAdjustment,s.totalDuration-s.heuristicDurationEstimate);assert.equal(s.dataBasis,'explicit_template_scenario');});
  await check('Out-of-support area/floors abstain',()=>{for(const [area,floors] of [[499,2],[2001,2],[1000,5]])assert.equal(schedule.generateSchedule('Villa',area,floors).estimateStatus,'outside_training_support');});
  await check('Nonpositive legacy floor adjustment never collapses to a 30-day answer',()=>{schedule.byType.Villa={...profile,floorsAvg:20,floorsMax:30};assert.equal(schedule.generateSchedule('Villa',1000,1).estimateStatus,'outside_heuristic_domain');schedule.byType.Villa=clone(profile);});
  await check('Invalid numeric profile abstains',()=>{schedule.byType.Villa={...profile,durationMean:NaN};assert.equal(schedule.generateSchedule('Villa',1000,2).estimateStatus,'invalid_training_profile');schedule.byType.Villa=clone(profile);});
  await check('Unsupported finishing/method are not silently Standard/Traditional',()=>{assert.equal(schedule.generateSchedule('Villa',1000,2,'typo').totalDuration,null);assert.equal(schedule.generateSchedule('Villa',1000,2,'Standard','Riyadh','typo').totalDuration,null);});
  await check('Method factors never authorize a construction recommendation',()=>{assert(schedule.compareMethods('Villa',1000,2).every(s=>s.recommendationEligible===false&&s.requiresScheduleReview));});
  await check('Explicit network preserves parallel critical path and does not invent months',()=>{const s=schedule.scheduleFromActivities(network,'working_day');assert.equal(s.totalDuration,8);assert.deepEqual(s.criticalPath,['A','C','D']);assert.equal(s.totalMonths,null);assert.equal(s.resourceFeasible,null);});
  await check('Explicit time unit is mandatory',()=>assert.throws(()=>schedule.scheduleFromActivities(network)));
  await check('Explicit activities work without project geometry or trained model',async()=>{schedule.trained=false;const p=edl.createProject('explicit',{});const s=await workflow.stepSchedule(p,{activities:network,timeUnit:'calendar_day'});assert.equal(s.totalDuration,8);assert.equal(p.metadata.workflowStep,'schedule_requires_review');schedule.trained=true;});
  await check('Untrained risk retains nulls and review flags',()=>{const r=risk.analyzeRisks('Villa',1000,2);assert.equal(r.riskLevel,null);assert.equal(r.estimateStatus,'not_trained');assert.equal(r.requiresRiskReview,true);});
  risk.trained=true;risk.byProjectType={Villa:{...rating,categories:{Safety:clone(rating)}}};risk.byCategory={Safety:clone(rating),ForeignOnly:clone(rating)};
  await check('Ordinal rating is never a probability, impact fraction or project risk class',()=>{const r=risk.analyzeRisks('Villa',1000,2);assert.equal(r.risks[0].probability,null);assert.equal(r.risks[0].score,null);assert.equal(r.riskLevel,null);assert.equal(r.overallRiskScore,null);assert.equal(r.risks[0].ordinalLikelihoodMean,3);});
  await check('Joint mean rating product is preserved instead of multiplying marginal means',()=>{const r=risk.analyzeRisks('Villa',1000,2);assert.equal(r.risks[0].ordinalRiskProductMean,5);assert.equal(r.historicalOrdinalRiskIndex,.2);});
  await check('No invented area/floor/finishing inflation of historical risk',()=>{assert.deepEqual(risk.analyzeRisks('Villa',1000,2),risk.analyzeRisks('Villa',90000,50,'Jeddah','Luxury'));});
  await check('Foreign project categories are excluded',()=>assert.deepEqual(risk.analyzeRisks('Villa',1000,2).risks.map(r=>r.category),['Safety']));
  await check('Unknown project type never inherits global risks',()=>assert.equal(risk.analyzeRisks('Hospital',1000,2).risks.length,0));
  await check('Invalid risk profile fails closed',()=>{risk.byProjectType.Villa.categories.Safety.probMean=Infinity;assert.equal(risk.analyzeRisks('Villa',1000,2).estimateStatus,'invalid_training_profile');risk.byProjectType.Villa.categories.Safety=clone(rating);});
  await check('Risk needs outcome denominator and time horizon',()=>{const r=risk.analyzeRisks('Villa',1000,2);assert(r.missing.includes('event_time_horizon'));assert(r.missing.includes('at_risk_project_denominators'));});
  const project=edl.createProject('P1',{});project.setExtracted({type:'Villa',area:500,floors:2,finishing:'Standard'});project.predicted.totalArea=1000;
  await check('Workflow/EDL risk review flags and nulls survive persistence',async()=>{await workflow.stepRisks(project);assert.equal(project.metadata.workflowStep,'risks_require_review');await workflow.stepSchedule(project);const p=edl.createProject('copy',{});p.fromJSON(clone(project.toJSON()));assert.deepEqual(p.schedule,project.schedule);assert.deepEqual(p.risks,project.risks);});
  await check('Persisted legacy risk and schedule scores are invalidated',()=>{const p=edl.createProject('legacy',{});p.fromJSON({risks:{riskLevel:'Low',overallRiskScore:.1,risks:[{probability:.95}]},schedule:{totalDuration:42,totalMonths:2,activities:network}});assert.equal(p.risks.riskLevel,null);assert.equal(p.risks.risks.length,0);assert.equal(p.schedule.totalDuration,null);assert.equal(p.schedule.activities.length,4);});
  await check('Project area scaling uses mean of per-project products',()=>{
    analyzer.trained=true;
    analyzer.trainingStats.projectTypeStats={Villa:{count:6,avgArea:500,avgFloors:2,avgTotalBuiltUpArea:800,
      avgCost:100000,avgConcrete:100,avgSteel:10,avgDuration:10,areaBasis:'assumed_per_floor'}};
    const r=analyzer.analyzeProject('fixture',{type:'Villa',area:400,floors:2});
    assert.equal(r.estimatedCost,100000);assert.equal(r.historicalReference.totalBuiltUpArea,800);assert.equal(r.historicalReference.sourceVerified,false);
  });
  await check('Apartment finishing never borrows whole-building structural history',()=>{
    analyzer.trainingStats.projectTypeStats.Apartment_Building=analyzer.trainingStats.projectTypeStats.Villa;
    const r=analyzer.analyzeProject('fixture',{type:'Apartment_Finishing',area:400,floors:1});
    assert.equal(r.insufficientData,true);assert.equal(r.projectType,'Apartment_Finishing');assert.equal(r.estimatedCost,undefined);
  });
  await check('Legacy project profile cannot silently multiply independent area/floor means',()=>{
    delete analyzer.trainingStats.projectTypeStats.Villa.avgTotalBuiltUpArea;
    assert.equal(analyzer.analyzeProject('fixture',{type:'Villa',area:400,floors:2}).insufficientData,true);
  });
  await check('Empty supplier market is unknown, not zero performance',()=>{
    const s=supplier.getMarketAnalysis('Unseen');assert.equal(s.averageRating,null);assert.equal(s.averageCompliance,null);assert.equal(s.averageDelivery,null);assert.equal(s.totalSuppliers,0);
  });
  const source=fs.readFileSync(path.join(root,'server.js'),'utf8'),routes=new Map();
  const projects=[{id:'P1',type:'Villa',area:500,floors:2,finishing:'Standard'},{id:'P2',type:'Villa'}];
  const {normalizeGeometry}=require('../../packages/ai-engine/engineering-ke/project-geometry');
  const context={app:{post:(url,handler)=>routes.set(url,handler)},waitForAI:fn=>fn,projects,edl,workflow,
    ai:{scheduleOptimizer:schedule,riskAnalyzer:risk,qualityInspector:quality},normalizeGeometry};
  const gp=source.slice(source.indexOf('function getProjectParams('),source.indexOf('\nfunction hasSufficientInfo('));
  vm.createContext(context);vm.runInContext(gp,context);
  const urls=['/api/v1/projects/:id/schedule/generate','/api/v1/projects/:id/schedule/compare-methods','/api/v1/projects/:id/risks/analyze','/api/v1/siapp/risk-assessment','/api/v1/digital-twin','/api/v1/simulation'];
  for(const url of urls){const start=source.indexOf("app.post('"+url+"'");assert(start>=0);const end=source.indexOf('\n}));',start);vm.runInContext(source.slice(start,end+6),context);}
  server=http.createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;const url=new URL(req.url,'http://localhost'),entry=urls[Number(url.pathname.slice(1))];
    const response={status(n){res.statusCode=n;return this;},json(body){res.setHeader('content-type','application/json');res.end(JSON.stringify(body));}};
    try{await routes.get(entry)({body:raw?JSON.parse(raw):{},params:{id:url.searchParams.get('id')||'P1'}},response);}catch(e){response.status(500).json({error:e.message});}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const request=async(i,body={},id='P1')=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/'+i+'?id='+id,{method:'POST',body:JSON.stringify(body)});return{status:r.status,body:await r.json()};};
  await check('HTTP activity schedule accepts explicit network without geometry',async()=>{const r=await request(0,{activities:network,timeUnit:'working_day'},'P2');assert.equal(r.status,200);assert.equal(r.body.totalDuration,8);});
  await check('HTTP activity schedule rejects cycle and preserves last good schedule',async()=>{const r=await request(0,{activities:[activity('X',1,['X'])],timeUnit:'working_day'},'P2');assert.equal(r.status,400);assert.equal(edl.getProject('P2').schedule.totalDuration,8);});
  await check('HTTP schedule requires time unit',async()=>assert.equal((await request(0,{activities:network})).status,400));
  await check('HTTP schedule rejects misspelled activity field',async()=>assert.equal((await request(0,{activity:network})).status,400));
  await check('HTTP time unit without activities is rejected',async()=>assert.equal((await request(0,{timeUnit:'calendar_day'})).status,400));
  await check('HTTP method comparison never recommends first/null row',async()=>assert.equal((await request(1)).body.recommended,null));
  await check('HTTP risk preserves rating/probability distinction',async()=>{const r=(await request(2)).body;assert.equal(r.risks[0].probability,null);assert.equal(r.estimateStatus,'historical_risk_profile');});
  await check('HTTP safety no longer generates random PPE/safety/alerts',async()=>{const r=(await request(3,{projectId:'P1'})).body;assert.equal(r.ppeCompliance,null);assert.equal(r.safetyIndex,null);assert.equal(r.alerts,null);assert.equal(r.status,'requires_review');assert.deepEqual(r,(await request(3,{projectId:'P1'})).body);});
  await check('HTTP safety rejects missing project',async()=>assert.equal((await request(3,{})).status,404));
  await check('Digital twin does not turn unknown duration into completion today',async()=>{const r=(await request(4,{projectId:'P1'})).body;assert.equal(r.predictedCompletion,null);assert.equal(r.currentState.safetyScore,null);assert.equal(r.performanceMetrics.schedulePerformanceIndex,null);});
  await check('Named simulation flags alone yield no fabricated improvements',async()=>{const r=(await request(5,{scenario:{acceleration:true}})).body;assert.equal(r.predictions.durationDays,null);assert.equal(r.impacts.cost,null);assert.equal(r.predictions.riskLevel,null);assert.equal(r.status,'insufficient_scenario_data');});
  await check('Simulation compares actual supplied network changes',async()=>{const revised=[activity('A',2),activity('B',3,['A'])];const r=(await request(5,{scenario:{baselineActivities:network,activities:revised,timeUnit:'working_day'}})).body;assert.equal(r.impacts.durationDays,-3);assert.equal(r.impacts.duration,-37.5);assert.equal(r.predictions.durationDays,5);assert.equal(r.predictions.finalCost,null);});
  await check('Zero-duration baseline does not divide by zero',async()=>{const r=(await request(5,{scenario:{baselineActivities:[activity('A',0)],activities:[activity('A',1)],timeUnit:'calendar_day'}})).body;assert.equal(r.impacts.duration,null);assert.equal(r.impacts.durationDays,1);});
  await check('Simulation rejects malformed network',async()=>assert.equal((await request(5,{scenario:{activities:[],timeUnit:'working_day'}})).status,400));
  const appSource=fs.readFileSync(path.join(root,'packages/ui/web/src/app.js'),'utf8');
  const notices=[],ui={state:{currentProject:'P1'},showToast:(message,kind)=>notices.push({message,kind}),apiCall:async()=>({totalDuration:null})};
  vm.createContext(ui);
  for(const name of ['generateSchedule','analyzeRisks']){
    const start=appSource.indexOf('  async function '+name+'()');const end=appSource.indexOf('\n  //',start+1);
    vm.runInContext(appSource.slice(start,end),ui);
  }
  await check('UI missing schedule never says null days or success',async()=>{
    await ui.generateSchedule();assert.equal(notices.at(-1).kind,'warning');assert(!notices.at(-1).message.includes('null'));
  });
  await check('UI risk describes review instead of a fabricated low class',async()=>{
    ui.apiCall=async()=>({risks:[],riskLevel:null,message:'يلزم تقييم الموقع'});await ui.analyzeRisks();assert.equal(notices.at(-1).message,'يلزم تقييم الموقع');assert.equal(notices.at(-1).kind,'warning');
  });
  await check('UI inference failure remains an error',async()=>{
    ui.apiCall=async()=>{throw Error('unavailable');};await ui.generateSchedule();assert.equal(notices.at(-1).kind,'error');
  });
  const safetyStart=appSource.indexOf("    document.querySelector('#page-safety .btn-primary')");
  const safetyEnd=appSource.indexOf('\n    //',safetyStart+1);let safetyHandler;
  ui.document={querySelector:()=>({addEventListener:(event,fn)=>{safetyHandler=fn;}})};
  vm.runInContext(appSource.slice(safetyStart,safetyEnd),ui);
  await check('UI safety sends the selected project and handles failed request honestly',async()=>{
    let body;ui.apiCall=async(url,method,data)=>{body=data;throw Error('failed');};safetyHandler();await new Promise(r=>setImmediate(r));assert.equal(body.projectId,'P1');assert.equal(notices.at(-1).kind,'error');
  });
  await check('Orchestrator keeps review status after successful validation',async()=>{
    const module={exports:{}};
    class Validator { validate(){return {passed:true};} }
    vm.runInNewContext(fs.readFileSync(path.join(root,'packages/ai-engine/ai-orchestrator.js'),'utf8'),{
      module,require:n=>n==='./workflow-engine'?Workflow:Validator,console
    });
    const orchestrator=new module.exports({scheduleOptimizer:schedule,riskAnalyzer:risk},edl);
    const execute=orchestrator._executeStep.bind(orchestrator);
    orchestrator._executeStep=async(p,name,...args)=>['schedule','risks'].includes(name)?execute(p,name,...args):{name,status:'completed'};
    orchestrator._runCrossValidation=()=>[];
    const r=await orchestrator.runFullPipeline(project,'fixture',()=>({}));
    assert.equal(r.ok,true);assert.equal(project.metadata.status,'requires_review');assert.equal(project.orchestration.status,'requires_review');
  });
  await check('Untrained quality is reviewable, not successful empty inspection',()=>{
    const q=quality.inspectProject('Villa',1000,2);assert.equal(q.estimateStatus,'not_trained');assert.equal(q.requiresQualityReview,true);assert.equal(q.qualityScore,null);
  });
  await check('Untrained quantity never returns zero project cost',()=>{
    const module={exports:{}};
    const modelDir=path.join(root,'packages/ai-engine/models');
    vm.runInNewContext(fs.readFileSync(path.join(modelDir,'quantity-estimator.js'),'utf8'),{module,__dirname:modelDir,
      require:n=>n==='./model-input'?require(path.join(modelDir,'model-input')):n==='path'?path:n==='./training-csv'?require(path.join(modelDir,'training-csv')):{} });
    const q=module.exports.estimateBOQ('Villa',500,2);assert.equal(q.summary.totalCost,null);assert.equal(q.requiresInputReview,true);assert.equal(q.estimateStatus,'not_trained');
  });
  const result={passed:checks.length,failed:0,checks,localFittingCalls:0,scope:'Authored inference fixtures, workflow/EDL/orchestrator, extracted UI callbacks and actual route handlers over local HTTP with stubbed service context. Not full-server/browser E2E or predictive accuracy.'};
  if(process.env.ACEP_CHECK_OUTPUT)fs.writeFileSync(process.env.ACEP_CHECK_OUTPUT,JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server?.close());
