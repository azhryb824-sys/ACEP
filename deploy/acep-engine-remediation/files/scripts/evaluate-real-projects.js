'use strict';
const fs = require('fs');
const { sha256, validateSource, signedReview, readFrozenManifest } = require('../packages/governance/evidence-validation');
const { MillionProjectModel } = require('../packages/ai-engine/models/million-project-model');
function wilson(success, total) {
  if (!total) return [0,1]; const p=success/total, z=1.959963984540054, d=1+z*z/total;
  const c=(p+z*z/(2*total))/d, h=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;
  return [c-h,c+h];
}
function evaluate(rows, policy, trainingIds, model) {
  if (!policy.targets || !Object.keys(policy.targets).length || !Number.isInteger(policy.minimumProjects) || policy.minimumProjects < 1 || !(policy.requiredSuccessRate > 0 && policy.requiredSuccessRate <= 1)) throw new Error('Explicit frozen acceptance policy is required');
  const exclusions = Array.isArray(trainingIds) ? { projectIds: trainingIds } : trainingIds;
  const forbidden = new Set(exclusions.projectIds), ids = new Set(), seenHashes = new Set();
  const groups = {}, provenanceFailures = []; let abstained = 0;
  for (const row of rows) {
    if (!row.projectId || ids.has(row.projectId) || forbidden.has(row.projectId)) throw new Error('Duplicate or training-overlapping project identity');
    ids.add(row.projectId);
    if ((exclusions.contractorIds || []).includes(row.contractorId) || (exclusions.periods || []).includes(row.period) || (exclusions.evidenceHashes || []).includes(row.source?.sha256)) throw new Error('Evaluation overlaps training contractor, time period or source evidence');
    if (!validateSource(row.source) || row.provenance !== 'real_completed_project' || !row.contractorId || !row.period || row.areaBasis !== 'gross_floor_area' || row.scope !== 'full_project') provenanceFailures.push(row.projectId);
    if (row.source?.sha256 && seenHashes.has(row.source.sha256)) throw new Error('Source evidence reused between evaluation projects');
    if (row.source?.sha256) seenHashes.add(row.source.sha256);
    const prediction = model.predict(row.inputs);
    if (!prediction.available) abstained++;
    for (const [target, tolerance] of Object.entries(policy.targets || {})) {
      const actual = row.actuals?.[target], unit = row.units?.[target];
      if (!Number.isFinite(actual) || actual < 0 || unit !== tolerance.unit || !Number.isFinite(tolerance.relativeError) || tolerance.relativeError <= 0) throw new Error('Missing actual measurement, unit or approved target tolerance: ' + target);
      const predicted = prediction.predictions?.[target];
      for (const category of ['all', 'type:' + row.inputs.projectType, 'city:' + row.inputs.city, 'period:' + row.period, 'contractor:' + row.contractorId]) {
        const g = groups[category + '/' + target] ||= { total:0, predicted:0, successful:0, covered:0, absoluteError:0, squaredError:0, actualTotal:0, bias:0, ape:[], baselineAbsoluteError:0, baselineCount:0 };
        g.total++; g.actualTotal += Math.abs(actual);
        if (Number.isFinite(predicted)) {
          const e = predicted-actual; g.predicted++; g.absoluteError += Math.abs(e); g.squaredError += e*e; g.bias += e;
          if (actual > 0) g.ape.push(Math.abs(e)/actual);
          const accepted = actual === 0 ? Math.abs(e) <= (tolerance.zeroAbsoluteError ?? 0) : Math.abs(e)/actual <= tolerance.relativeError;
          if (accepted) g.successful++;
          const interval = prediction.intervals?.[target]; if (interval && actual >= interval.lower && actual <= interval.upper) g.covered++;
        }
        if (Number.isFinite(row.independentBaseline?.[target])) { g.baselineAbsoluteError += Math.abs(row.independentBaseline[target]-actual); g.baselineCount++; }
      }
    }
  }
  const metrics = Object.fromEntries(Object.entries(groups).map(([key,g])=>[key,{ projects:g.total, predicted:g.predicted, successRate:g.successful/g.total,
    successWilson95:wilson(g.successful,g.total), intervalCoverage:g.covered/g.total, mae:g.predicted?g.absoluteError/g.predicted:null,
    mape:g.ape.length?g.ape.reduce((a,b)=>a+b,0)/g.ape.length:null, wape:g.actualTotal?g.absoluteError/g.actualTotal:null,
    rmse:g.predicted?Math.sqrt(g.squaredError/g.predicted):null, bias:g.predicted?g.bias/g.predicted:null,
    independentBaselineMae:g.baselineCount?g.baselineAbsoluteError/g.baselineCount:null, independentBaselineCount:g.baselineCount }]));
  const missingTypes = (policy.requiredProjectTypes || []).filter(type=>!rows.some(r=>r.inputs.projectType===type));
  const requiredGroups = ['all', ...(policy.requiredProjectTypes || []).map(t=>'type:'+t), ...(policy.requiredStrata || [])];
  const failedGates = [];
  for (const group of requiredGroups) for (const target of Object.keys(policy.targets)) {
    const key=group+'/'+target, m=metrics[key], minimum=group==='all'?policy.minimumProjects:policy.minimumProjectsPerStratum;
    if (!Number.isInteger(minimum)||minimum<1||!m||m.projects<minimum||m.successWilson95[0]<policy.requiredSuccessRate||m.predicted!==m.projects||m.independentBaselineCount!==m.projects||m.mae>m.independentBaselineMae) failedGates.push(key);
  }
  return { projects:rows.length, abstained, abstentionRate:rows.length?abstained/rows.length:1, provenanceFailures, missingTypes, failedGates, metrics,
    numericalGatePassed:rows.length>0 && !provenanceFailures.length && !missingTypes.length && !failedGates.length,
    engineeringReleaseApproved:false, suitableForModelApproval:false, reason:'Independent signed domain and security review is required; this evaluator cannot activate a model.' };
}
function main() {
  const [manifestFile,dataFile,policyFile,trainingIdsFile,publicKeysFile] = process.argv.slice(2);
  if (!publicKeysFile) throw new Error('Usage: node scripts/evaluate-real-projects.js MANIFEST DATA_JSONL POLICY TRAINING_IDS TRUSTED_PUBLIC_KEYS');
  const manifest=readFrozenManifest(manifestFile), bytes=fs.readFileSync(dataFile), policyBytes=fs.readFileSync(policyFile), idsBytes=fs.readFileSync(trainingIdsFile);
  for (const [key,value] of [['dataSha256',bytes],['policySha256',policyBytes],['trainingProjectIdsSha256',idsBytes]]) if (sha256(value)!==manifest[key]) throw new Error('Frozen input hash mismatch: '+key);
  const { reviews, ...payload }=manifest, keys=JSON.parse(fs.readFileSync(publicKeysFile,'utf8'));
  const validReviews=(reviews||[]).filter(review=>signedReview(payload,review,keys));
  if (new Set(validReviews.map(r=>r.reviewerId)).size<2 || !['domain','security'].every(role=>validReviews.some(r=>r.role===role))) throw new Error('Frozen manifest requires independent domain and security signatures from trusted reviewers');
  process.env.ACEP_MILLION_MODEL_ENABLED='true';
  const model = new MillionProjectModel();
  if (manifest.modelArtifactSha256 !== sha256(fs.readFileSync(model.artifactPath))) throw new Error('Frozen model identity mismatch');
  const trainingExclusions = JSON.parse(idsBytes);
  if (!['projectIds','contractorIds','periods','evidenceHashes'].every(k => Array.isArray(trainingExclusions[k]))) throw new Error('Training project, contractor, period and source exclusion lists are required');
  const report=evaluate(bytes.toString().split(/\r?\n/).filter(Boolean).map(JSON.parse),JSON.parse(policyBytes),trainingExclusions,model);
  console.log(JSON.stringify({...report, inputHashes:{data:manifest.dataSha256, policy:manifest.policySha256}},null,2));
  if (!report.numericalGatePassed) process.exitCode=1;
}
if (require.main===module) main();
module.exports={evaluate,wilson};
