'use strict';

// Descriptive evidence only. Administrative states never count as passed inspections.
const requiredText = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} must be nonempty text`);
  return value.trim();
};
function summarizeInspectionOutcomes(projectId, records) {
  projectId = requiredText(projectId, 'projectId');
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  const seen = new Map(), groups = new Map(), statuses = new Map(), sources = new Set();
  let duplicates = 0, approved = 0, corrections = 0, latestInspectionDate = null;
  for (const record of records) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError('Invalid inspection record');
    const row = Object.fromEntries(['inspectionId','projectId','inspectionType','inspectionDate','result','source'].map(k => [k, requiredText(record[k], k)]));
    if (row.projectId !== projectId) throw new Error('Inspection belongs to a different project');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.inspectionDate)) throw new Error('inspectionDate must be YYYY-MM-DD');
    const time = Date.parse(`${row.inspectionDate}T00:00:00Z`);
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== row.inspectionDate) throw new Error('Invalid inspection date');
    const serialized = JSON.stringify(row);
    if (seen.has(row.inspectionId)) {
      if (seen.get(row.inspectionId) !== serialized) throw new Error('Conflicting records for the same inspectionId');
      duplicates++; continue;
    }
    seen.set(row.inspectionId, serialized); sources.add(row.source);
    latestInspectionDate = latestInspectionDate === null || row.inspectionDate > latestInspectionDate ? row.inspectionDate : latestInspectionDate;
    statuses.set(row.result, (statuses.get(row.result) || 0) + 1);
    if (!groups.has(row.inspectionType)) groups.set(row.inspectionType, { inspectionType: row.inspectionType, approved: 0, correctionsIssued: 0, other: 0 });
    const g = groups.get(row.inspectionType);
    if (row.result === 'Approved') { approved++; g.approved++; }
    else if (row.result === 'Corrections Issued') { corrections++; g.correctionsIssued++; }
    else g.other++;
  }
  const explicitOutcomes = approved + corrections, total = seen.size;
  return {
    projectId, dataBasis: 'supplied_inspection_results', evidenceVerified: false,
    uniqueInspections: total, duplicateRecordsIgnored: duplicates,
    approved, correctionsIssued: corrections, otherOutcomes: total - explicitOutcomes,
    explicitOutcomes, explicitOutcomeCoverage: total ? explicitOutcomes / total : null,
    observedApprovalRate: explicitOutcomes ? approved / explicitOutcomes : null,
    observedCorrectionRate: explicitOutcomes ? corrections / explicitOutcomes : null,
    latestInspectionDate, sources: [...sources].sort(),
    outcomes: [...statuses].sort(([a],[b]) => a.localeCompare(b)).map(([result,count]) => ({ result, count })),
    byInspectionType: [...groups.values()].sort((a,b) => a.inspectionType.localeCompare(b.inspectionType)),
    qualityScore: null, qualityGrade: null, predictedDefects: null, predictiveAccuracy: null,
    estimateStatus: explicitOutcomes ? 'observed_results_only' : 'insufficient_explicit_outcomes',
    requiresQualityReview: true,
    limitations: ['Approval rates describe supplied explicit outcomes, not a whole-project quality grade.', 'Partial, scheduled, cancelled and unrecognized results remain outside the approval denominator.', 'Inspection scope, completeness and source authenticity require independent review.']
  };
}
module.exports = { summarizeInspectionOutcomes };
