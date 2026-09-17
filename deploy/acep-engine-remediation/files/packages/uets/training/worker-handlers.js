'use strict';
const crypto=require('crypto');
const {runtimePath}=require('../../runtime/paths');
const {writeJsonAtomic}=require('../../runtime/atomic-json-store');
const {runUETSSnapshot}=require('../../ai-engine/models/trainer');
const {loadSnapshot}=require('./snapshot');
const MODELS=['projectAnalyzer','quantityEstimator','costEstimator','riskAnalyzer','qualityInspector','scheduleOptimizer','supplierIntelligence'];
function retain(kind,payload) {
 const digest=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 writeJsonAtomic(runtimePath('uets','review-inbox',kind+'-'+digest+'.json'),{kind,payload,dataStatus:'unverified',suitableForModelApproval:false});
 return {status:'pending_independent_review',evidenceSha256:digest,suitableForModelApproval:false,activated:false};
}
const handlers={
 training:runUETSSnapshot,
 retraining:(_reason,options)=>runUETSSnapshot(options.models||MODELS,options),
 evaluation:(type,options)=>{
  if(type==='snapshot-integrity') {const {manifest}=loadSnapshot(options.snapshotId);return {status:'integrity_verified',snapshotId:manifest.id,sourceRecords:manifest.sourceRecords,independentAccuracyEvaluated:false,suitableForModelApproval:false};}
  return retain('evaluation',{type,options,reason:'A signed frozen independent evaluation must be run with evaluate-real-projects.js; self-benchmarks cannot approve a model.'});
 },
 feedback:feedback=>retain('feedback',feedback)
};
module.exports={handlers};
