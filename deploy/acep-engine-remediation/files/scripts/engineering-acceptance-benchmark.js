'use strict';

process.env.ACEP_MILLION_MODEL_ENABLED = 'true';
process.env.ACEP_SUPPLIER_DATA_VERIFIED = 'false';

const ai = require('../packages/ai-engine');
const { toEngineParams } = require('../packages/ai-engine/project-brief');

const CASES = [
  {
    id: 'villa', type: 'villa', area: 820, landArea: 650, floors: 2, city: 'الرياض', finishing: 'premium',
    expected: ['Structure', 'Architecture', 'Mechanical', 'Electrical', 'Plumbing'],
    schedule: /structural frame|finishes/i, risk: /schedule|cost/i, quality: /concrete|waterproofing|fire stopping/i,
    forbidden: /ballast|rail weld|asphalt density/i
  },
  {
    id: 'apartments', type: 'apartment_building', area: 12000, landArea: 4800, floors: 8, basements: 1, city: 'جدة', finishing: 'good',
    expected: ['Substructure', 'Structure', 'Envelope', 'FireLifeSafety'],
    schedule: /structural frame|MEP first fix/i, risk: /schedule|cost/i, quality: /concrete|MEP coordination/i,
    forbidden: /track geometry|pipeline or process train/i
  },
  {
    id: 'hospital', type: 'hospital', area: 58000, landArea: 42000, floors: 6, basements: 2, buildings: 3, capacity: 200, city: 'الرياض', finishing: 'specialized',
    expected: ['ClinicalSystems', 'Mechanical', 'Electrical', 'FireLifeSafety'],
    schedule: /commissioning|MEP/i, risk: /clinical systems|medical equipment/i, quality: /medical-gas|infection-control/i,
    forbidden: /ballast|rail weld/i
  },
  {
    id: 'hotel', type: 'hotel', area: 26000, landArea: 9000, floors: 12, basements: 1, capacity: 220, city: 'مكة', finishing: 'luxury',
    expected: ['HospitalitySystems', 'Envelope', 'Mechanical', 'Commissioning'],
    schedule: /finishes|commissioning/i, risk: /schedule|procurement/i, quality: /finish tolerance|MEP coordination/i,
    forbidden: /track geometry|subgrade compaction/i
  },
  {
    id: 'warehouse', type: 'warehouse', area: 24000, landArea: 38000, floors: 1, city: 'الدمام', finishing: 'standard',
    expected: ['Foundations', 'IndustrialFloor', 'FireLifeSafety', 'Utilities'],
    schedule: /industrial|process|structural frame/i, risk: /operational layout/i, quality: /industrial floor|structural connection/i,
    forbidden: /clinical|patient/i
  },
  {
    id: 'data_center', type: 'data_center', area: 30000, landArea: 22000, floors: 3, capacity: 24, city: 'الرياض', finishing: 'specialized',
    expected: ['MissionCritical', 'Electrical', 'Commissioning', 'FireLifeSafety'],
    schedule: /integrated testing|power and controls/i, risk: /resilience/i, quality: /power-path|cooling containment/i,
    forbidden: /patient room|ballast/i
  },
  {
    id: 'road', type: 'road', length: 12000, width: 30, area: 360000, landArea: 420000, floors: 1, city: 'مكة', finishing: 'standard',
    expected: ['Earthworks', 'Subgrade', 'Subbase', 'Roadbase', 'Asphalt', 'Drainage', 'RoadMarking'],
    schedule: /asphalt paving|traffic staging/i, risk: /traffic interface|pavement performance/i, quality: /asphalt density|pavement layer/i,
    forbidden: /ceiling|patient|partition/i
  },
  {
    id: 'bridge', type: 'bridge', length: 1200, width: 24, area: 28800, landArea: 52000, floors: 1, city: 'جدة', finishing: 'standard',
    expected: ['Substructure', 'Superstructure', 'StructuralSteel', 'BearingsJoints', 'ApproachWorks'],
    schedule: /superstructure erection|load testing/i, risk: /temporary works/i, quality: /bearing|prestress|pile/i,
    forbidden: /ceiling|patient room/i
  },
  {
    id: 'water_pipeline', type: 'water', length: 25000, width: 2.5, area: 62500, landArea: 75000, floors: 1, capacity: 50000, city: 'المدينة', finishing: 'standard',
    expected: ['Trenching', 'Bedding', 'Pipeline', 'ValvesChambers', 'TestingCommissioning'],
    schedule: /pipeline|flushing|disinfection/i, risk: /hydraulic performance|water quality/i, quality: /pipe bedding|joint integrity/i,
    forbidden: /ceiling|asphalt density|patient/i
  },
  {
    id: 'solar', type: 'renewable_energy', area: 1000000, landArea: 1000000, floors: 1, capacity: 100, city: 'تبوك', finishing: 'standard',
    expected: ['GenerationEquipment', 'MountingSystems', 'DCCollection', 'GridConnection', 'Controls'],
    schedule: /generation equipment|grid connection|energization/i, risk: /grid connection|generation yield/i, quality: /module|DC insulation|performance ratio/i,
    forbidden: /ceiling|patient|rail weld/i
  },
  {
    id: 'substation', type: 'power', area: 20000, landArea: 26000, floors: 1, capacity: 132, city: 'الرياض', finishing: 'standard',
    expected: ['PrimaryEquipment', 'Switchgear', 'Cabling', 'Earthing', 'Controls'],
    schedule: /primary equipment|energization/i, risk: /energization|long-lead equipment/i, quality: /earthing|protection settings|primary equipment/i,
    forbidden: /ceiling|patient|asphalt density/i
  },
  {
    id: 'renovation', type: 'renovation', area: 10000, landArea: 4200, floors: 5, city: 'جدة', finishing: 'good',
    expected: ['Investigations', 'Demolition', 'StructuralRepairs', 'Mechanical', 'Electrical'],
    schedule: /opening-up|selective demolition|phased handover/i, risk: /existing conditions/i, quality: /existing-condition|structural repair/i,
    forbidden: /ballast|asphalt density|patient room/i
  }
];

function briefFor(testCase, scale = 1) {
  const scaledArea = testCase.area * scale;
  const scaledLength = testCase.length ? testCase.length * scale : undefined;
  return {
    name: `Engineering acceptance: ${testCase.id}`,
    type: testCase.type,
    typeLabel: testCase.type,
    country: 'المملكة العربية السعودية',
    city: testCase.city,
    stage: 'concept',
    delivery: 'design_build',
    constructionMethod: ['renovation', 'heritage', 'fitout'].includes(testCase.type) ? 'rehabilitation' : 'traditional',
    area: scaledArea,
    landArea: (testCase.landArea || scaledArea * 1.2) * scale,
    length: scaledLength,
    width: testCase.width,
    floors: testCase.floors,
    basements: testCase.basements || 0,
    buildings: testCase.buildings || 1,
    capacity: testCase.capacity ? testCase.capacity * scale : undefined,
    finishing: testCase.finishing,
    description: `مشروع اختبار هندسي متكامل من نوع ${testCase.type} يشمل الأعمال المدنية والأنظمة والتشغيل، مع بيانات كمية صريحة لاختبار ترابط التحليل وقابلية المراجعة.`,
    inclusions: 'يشمل التصميم والتنفيذ والأعمال المدنية والأنظمة والاختبارات والتشغيل والتسليم.',
    exclusions: 'لا يشمل ثمن الأرض أو التمويل.',
    siteCondition: 'موقع قائم داخل المملكة مع ضرورة التحقق المساحي والجيوتقني قبل التصميم التفصيلي.',
    constraints: 'استمرار الوصول للموقع ومتطلبات الجهات المختصة والخدمات القائمة.',
    standards: 'Saudi Building Code and applicable authority requirements',
    systems: ['structural', 'architecture', 'mechanical', 'electrical', 'plumbing', 'fire', 'infrastructure', 'landscape', 'ict', 'specialist'],
    documents: ['survey', 'specifications'],
    priceBasis: 'Parametric September 2026 research basis; not a supplier quotation',
    sustainability: 'خفض استهلاك الطاقة بنسبة 20%'
  };
}

function runEngines(testCase, scale = 1) {
  const brief = briefFor(testCase, scale);
  const params = toEngineParams(brief);
  const extra = {
    ...params,
    city: brief.city,
    description: brief.description
  };
  const boq = ai.quantityEstimator.estimateBOQ(
    params.type, params.area, params.floors, params.finishing, params.city, extra
  );
  const cost = ai.costEstimator.estimateCost(
    boq.items, params.type, params.area, params.floors, params.finishing, params.city, extra
  );
  const schedule = ai.scheduleOptimizer.generateSchedule(
    params.type, params.grossBuiltArea, params.floors, params.finishing, params.city, params.method, extra
  );
  const risks = ai.riskAnalyzer.analyzeRisks(
    params.type, params.grossBuiltArea, params.floors, params.city, params.finishing, extra
  );
  const quality = ai.qualityInspector.inspectProject(
    params.type, params.grossBuiltArea, params.floors, params.finishing, extra
  );
  return { brief, params, boq, cost, schedule, risks, quality };
}

function near(left, right, tolerance = 1) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function scoreCase(testCase, result, scaled) {
  const checks = [];
  const add = (name, passed, evidence) => checks.push({ name, passed: Boolean(passed), evidence });
  const { params, boq, cost, schedule, risks, quality } = result;
  const items = boq.items || [];
  const categories = new Set(items.map(current => current.category));
  const description = items.map(current => current.description).join(' ');
  const itemTotal = items.reduce((sum, current) => sum + Number(current.totalPrice || 0), 0);
  const componentTotal = Number(cost.directCost || 0) + Number(cost.indirectCost || 0) + Number(cost.contingency || 0)
    + Number(cost.profit || 0) + Number(cost.taxes || 0);
  const scheduleNames = (schedule.activities || []).map(activity => activity.name).join(' ');
  const riskText = (risks.risks || []).map(risk => `${risk.category} ${risk.risk}`).join(' ');
  const qualityText = (quality.defects || []).map(defect => `${defect.type} ${(defect.typicalLocations || []).join(' ')}`).join(' ');
  const durationSum = (schedule.activities || []).reduce((sum, activity) => sum + Number(activity.duration || 0), 0);

  add('correct_project_type', boq.summary?.projectType === testCase.type, boq.summary?.projectType);
  add('professional_item_coverage', items.length >= 8, items.length);
  add('unique_item_codes', new Set(items.map(current => current.code)).size === items.length, items.length);
  add('positive_quantities', items.every(current => Number.isFinite(current.quantity) && current.quantity > 0), null);
  add('positive_parametric_rates', items.every(current => Number.isFinite(current.unitPrice) && current.unitPrice > 0), null);
  add('line_arithmetic', items.every(current => near(current.totalPrice, current.quantity * current.unitPrice, 1.5)), null);
  add('boq_summary_reconciles', near(itemTotal, boq.summary?.totalCost, 1.5), { itemTotal, summary: boq.summary?.totalCost });
  add('mandatory_categories', testCase.expected.every(category => categories.has(category)), [...categories]);
  add('no_incompatible_scope', !testCase.forbidden.test(description), description);
  add('cost_uses_boq', near(cost.directCost, boq.summary?.totalCost, 1.5), { direct: cost.directCost, boq: boq.summary?.totalCost });
  add('cost_components_reconcile', near(componentTotal, cost.totalCost, 1), { componentTotal, total: cost.totalCost });
  add('explicit_zero_arithmetic_variance', cost.boqReconciliation?.arithmeticVariance === 0, cost.boqReconciliation);
  add('model_cost_reconciliation', Number(cost.boqReconciliation?.modelVariancePercent) <= 1, cost.boqReconciliation?.modelVariancePercent);
  add('plausible_cost_density', cost.costPerM2 >= 250 && cost.costPerM2 <= 35000, cost.costPerM2);
  add('breakdown_percentages_reconcile', Object.values(cost.breakdown || {}).reduce((sum, entry) => sum + Number(entry.percentage || 0), 0) === 100, cost.breakdown);
  add('schedule_has_network', (schedule.activities || []).length >= 6, (schedule.activities || []).length);
  add('schedule_is_type_specific', testCase.schedule.test(scheduleNames), scheduleNames);
  add('schedule_network_reconciles', durationSum >= schedule.totalDuration * 0.95 && durationSum <= schedule.totalDuration * 1.05, { durationSum, total: schedule.totalDuration });
  add('risk_register_depth', (risks.risks || []).length >= 6, (risks.risks || []).length);
  add('risk_is_type_specific', testCase.risk.test(riskText), riskText);
  add('quality_plan_depth', (quality.defects || []).length >= 5, (quality.defects || []).length);
  add('quality_is_type_specific', testCase.quality.test(qualityText), qualityText);
  add('non_building_locations_are_contextual', !['linear', 'site', 'utility'].includes(boq.summary?.family) || !/Floor \d/i.test(qualityText), qualityText);
  add('uncertainty_is_disclosed', cost.requiresHumanReview === true && cost.contractualUse === false, { review: cost.requiresHumanReview, contractual: cost.contractualUse });
  add('procurement_is_gated', boq.summary?.suitableForProcurement === false && cost.suitableForProcurement === false, null);
  add('scale_changes_quantities', scaled.boq.summary?.totalCost > boq.summary?.totalCost * 1.15, { base: boq.summary?.totalCost, scaled: scaled.boq.summary?.totalCost });
  add('scale_changes_cost', scaled.cost.totalCost > cost.totalCost * 1.15, { base: cost.totalCost, scaled: scaled.cost.totalCost });
  add('scale_changes_duration', scaled.schedule.totalDuration >= schedule.totalDuration, { base: schedule.totalDuration, scaled: scaled.schedule.totalDuration });
  add('structured_geometry_preserved', params.grossBuiltArea === testCase.area && (!testCase.length || params.length === testCase.length), params);
  return checks;
}

async function runBenchmark() {
  await ai.initialize();
  const cases = [];
  let passed = 0;
  let total = 0;
  for (const testCase of CASES) {
    const result = runEngines(testCase, 1);
    const scaled = runEngines(testCase, 1.5);
    const checks = scoreCase(testCase, result, scaled);
    const casePassed = checks.filter(check => check.passed).length;
    passed += casePassed;
    total += checks.length;
    cases.push({
      id: testCase.id,
      passed: casePassed,
      total: checks.length,
      score: Math.round(casePassed / checks.length * 10000) / 100,
      failures: checks.filter(check => !check.passed)
    });
  }
  return {
    benchmark: 'ACEP engineering concept-analysis acceptance v1',
    scope: 'Deterministic engineering coverage, arithmetic consistency, contextuality, uncertainty gating, and sensitivity; not empirical real-project accuracy.',
    projectCases: CASES.length,
    checks: total,
    passed,
    failed: total - passed,
    score: Math.round(passed / total * 10000) / 100,
    threshold: 98,
    accepted: passed / total >= 0.98,
    cases
  };
}

if (require.main === module) {
  runBenchmark().then(report => {
    process.stdout.write(`ACEP_ENGINEERING_BENCHMARK ${JSON.stringify(report)}\n`);
    if (!report.accepted && !process.argv.includes('--report-only')) process.exitCode = 1;
  }).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { CASES, briefFor, runBenchmark, runEngines, scoreCase };
