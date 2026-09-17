'use strict';

const { MillionProjectModel } = require('../packages/ai-engine/models/million-project-model');
const { buildConceptEstimate } = require('../packages/ai-engine/engineering-concept-estimator');
const { parseProjectBrief } = require('../packages/security/validation');
const cost = require('../packages/ai-engine/models/cost-estimator');
const risk = require('../packages/ai-engine/models/risk-analyzer');
const quality = require('../packages/ai-engine/models/quality-inspector');

const input = { projectType: 'villa', grossBuiltArea: 600, footprintArea: 300, landArea: 500, floors: 2, city: 'Riyadh', finishing: 'standard', method: 'traditional' };
const brief = { name: 'تجربة نطاق العقد', type: 'villa', city: 'Riyadh', area: 600, landArea: 500, floors: 2, stage: 'concept', finishing: 'standard',
  description: 'مشروع فيلا سكنية لاختبار الحدود الهندسية والتحقق من تطبيق نطاق العقد والأعمال المستبعدة دون اعتبار المخرجات اعتمادا هندسيا.',
  inclusions: 'الأعمال الإنشائية والمعمارية وأنظمة الخدمات', systems: [] };
let oldEnabled;
beforeAll(() => { oldEnabled = process.env.ACEP_MILLION_MODEL_ENABLED; process.env.ACEP_MILLION_MODEL_ENABLED = 'true'; });
afterAll(() => { if (oldEnabled === undefined) delete process.env.ACEP_MILLION_MODEL_ENABLED; else process.env.ACEP_MILLION_MODEL_ENABLED = oldEnabled; });

test.each([
  ['floors', { floors: 100 }], ['area', { grossBuiltArea: 1 }], ['land', { landArea: 50 }],
  ['city', { city: 'ينبع' }], ['foreign city', { city: 'Dubai' }], ['finish', { finishing: 'unverified' }],
  ['fractional floors', { floors: 1.5 }], ['basements', { basements: 10 }], ['buildings', { buildings: 100 }]
])('F01/F03/F04: unsupported %s produces no numeric predictions', (name, changes) => {
  const result = new MillionProjectModel().predict({ ...input, ...changes });
  expect(result.available).toBe(false); expect(result.blocked).toBe(true); expect(result.predictions).toBeUndefined();
});

test.each([{ floors: 100 }, { area: 1 }, { landArea: 50 }, { city: 'ينبع' }, { finishing: 'other' }])('invalid brief rejected before persistence: %j', changes => {
  expect(parseProjectBrief({ ...brief, ...changes }).ok).toBe(false);
});

test('F02: removing MEP removes quantities and costs without redistributing excluded money', () => {
  const prediction = new MillionProjectModel().predict(input);
  const full = buildConceptEstimate(prediction);
  const partial = buildConceptEstimate(prediction, { exclusions: 'استبعاد كامل الكهرباء والسباكة والتكييف والتهوية' });
  const removed = full.items.filter(item => ['Electrical', 'Mechanical', 'Plumbing'].includes(item.category));
  expect(removed).toHaveLength(3);
  for (const item of partial.items) expect(item.totalPrice).toBe(full.items.find(line => line.code === item.code).totalPrice);
  expect(partial.summary.directCost).toBeCloseTo(full.summary.directCost - removed.reduce((s, item) => s + item.totalPrice, 0), 1);
  expect(partial.summary.scope.excludedPackages).toHaveLength(3);
  const estimate = cost.estimateCost(partial.items, 'Villa', 300, 2, 'standard', 'Riyadh', input);
  expect(estimate.totalCost).toBeLessThan(prediction.predictions.costSar * 0.85);
  expect(estimate.costRange).toBeNull();
  expect(estimate.boqReconciliation.independentValidation).toBe(false);
});

test('F02: unresolved exclusions block numeric cost rather than silently ignore them', () => {
  const result = buildConceptEstimate(new MillionProjectModel().predict(input), { exclusions: 'رسوم غير معرفة خارج الحساب' });
  expect(result.summary.status).toBe('blocked'); expect(result.summary.totalCost).toBeNull();
});

test('F05: interval endpoints correspond to the stated relative-error metric', () => {
  const model = new MillionProjectModel(), prediction = model.predict(input);
  for (const target of model.artifact.targets.filter(t => t !== 'riskScore')) {
    const p = prediction.predictions[target], d = model.artifact.models[target].calibrationByProjectType.villa.p90Ape;
    expect(prediction.intervals[target].upper).toBeCloseTo(p / (1 - d), 5);
    expect(prediction.intervals[target].lower).toBeCloseTo(p / (1 + d), 5);
  }
});

test('F09: synthetic priors cannot appear as accident probabilities or inspection grades', () => {
  const prediction = new MillionProjectModel().predict(input);
  const r = risk._trainedRisks(prediction), q = quality._trainedInspection(prediction, 600, 2);
  expect(r.overallRiskScore).toBeNull(); expect(r.riskLevel).toBeNull();
  expect(r.risks.every(row => row.probability === null && row.impact === null && row.score === null)).toBe(true);
  expect(q.qualityScore).toBeNull(); expect(q.qualityGrade).toBeNull(); expect(q.estimatedDefects).toBeNull();
  expect(q.defects.every(row => row.expectedCount === null && row.confidence === null)).toBe(true);
});

 test('F09: shared data layer preserves null risk, quality and scoped duration end to end', () => {
 const { EngineeringDataLayer } = require('../packages/ai-engine/engineering-data-layer');
 const layer = new EngineeringDataLayer(); const p = layer.createProject('null-semantics');
 p.setRisks({ risks: [], overallRiskScore: null, riskLevel: null });
 p.setQuality({ defects: [], qualityScore: null, qualityGrade: null });
 p.setSchedule({ status: 'blocked', totalDuration: null, totalMonths: null });
 expect(p.quality.estimatedDefects).toBeNull(); expect(p.risks.riskLevel).toBeNull(); expect(p.quality.qualityScore).toBeNull(); expect(p.schedule.totalDuration).toBeNull();
 });

 test('F02: a recognized exclusion cannot hide an unknown cost exclusion', () => {
 const result = buildConceptEstimate(new MillionProjectModel().predict(input), { exclusions: 'استبعاد الكهرباء والأثاث والرسوم' });
 expect(result.summary.status).toBe('blocked');
 });
