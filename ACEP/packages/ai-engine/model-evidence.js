'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { regression, binary } = require('./evaluation-metrics');
const SNAPSHOT_SHA256 = '1357031971d376d959644dff028e4ebc31b60e6a26230d9661e3f61724058196';
const ENGINES = Object.freeze([
  ['projectAnalyzer', 'تحليل المشاريع', 'رسومات ومواصفات وحقول مرجعية يراجعها مهندس للمشاريع الخمسة نفسها'],
  ['quantityEstimator', 'تقدير الكميات', 'كميات منفذة مع وحدات ونطاق بند ورسومات وإصدارات مؤرخة'],
  ['costEstimator', 'تقدير التكلفة', 'تكاليف فعلية مع عملة وتاريخ ونطاق وتسعير ابتدائي موثق'],
  ['scheduleOptimizer', 'تحسين الجدولة', 'مدد ابتدائية وفعلية وعلاقات أنشطة وموارد وتقويم عمل'],
  ['riskAnalyzer', 'تحليل المخاطر', 'حالات تجاوز وعدم تجاوز موثقة وخصائص متاحة قبل القرار'],
  ['qualityInspector', 'فحص الجودة', 'سجلات جميع الفحوصات ونتائجها وعدد فرص الفحص لكل مشروع'],
  ['supplierIntelligence', 'ذكاء الموردين', 'عروض وأسعار وتسليمات وتقييمات فعلية مرتبطة بالمشاريع']
]);
function emptyEngines() {
  return ENGINES.map(([id, label, requiredData]) => ({ id, label, requiredData,
    accuracyValidated: false, productionAccepted: false, researchStatus: 'not_evaluated_in_this_cycle',
    research: null }));
}
function readModelEvidence() {
  const engines = emptyEngines();
  const base = { schemaVersion: 1, reportKind: 'archived_research_evidence',
    accuracyValidated: false, fullEngineAcceptedCount: 0, totalEngines: 7,
    sevenEngineGoalMet: false, target: 0.9, deployedModelValidated: false, engines };
  try {
    const bytes = fs.readFileSync(path.join(__dirname, 'evidence', 'fdot-v8.json'));
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    if (digest !== SNAPSHOT_SHA256) throw new Error('snapshot_hash_mismatch');
    const s = JSON.parse(bytes.toString('utf8'));
    if (s.schemaVersion !== 1 || s.cycle !== 'FDOT-v8' || s.expectedIds.length !== 98) throw new Error('snapshot_schema_invalid');
    const series = task => s.rows.map(r => ({ id: r.id, ...r[task] }));
    const cost = regression(series('cost'), s.expectedIds, s.fiveIds);
    const duration = regression(series('duration'), s.expectedIds, s.fiveIds);
    const risk = binary(series('risk'), s.expectedIds, s.fiveIds);
    const baseline = task => regression(series(task).map(r => ({ ...r, predicted: r.baseline })), s.expectedIds, s.fiveIds);
    const research = {
      costEstimator: { task: 'contract_expenditure', label: 'إنفاق عقد نقل — دولار', selected: s.selected.cost,
        metrics: cost, baseline: baseline('cost'), primaryMetric: 'within10',
        summary: 'تحسن الخطأ النسبي؛ لم تتحسن نسبة ±10% وازداد الخطأ بالدولار.' },
      scheduleOptimizer: { task: 'days_used', label: 'الأيام المستخدمة في العقد', selected: s.selected.duration,
        metrics: duration, baseline: baseline('duration'), primaryMetric: 'within10',
        summary: 'المدة الأصلية هي المرجع المختار؛ لم يتأهل متنبئ متعلم.' },
      riskAnalyzer: { task: 'cost_overrun', label: 'تجاوز تكلفة العقد', selected: s.selected.risk,
        metrics: risk, primaryMetric: 'balancedAccuracy',
        summary: 'امتناع عن التصنيف؛ احتمال انتشار بحثي فقط، مع 7 حالات تجاوز.' }
    };
    for (const engine of engines) if (research[engine.id]) {
      engine.research = research[engine.id];
      engine.researchStatus = engine.research.metrics.metricGatePassed ? 'scoped_metric_gate_passed' : 'scoped_metric_gate_failed';
      // Even a scoped metric pass cannot establish full-engine or deployed-weight acceptance.
    }
    return { ...base, ok: true, integrityVerified: true, snapshotSha256: digest,
      cycle: s.cycle, date: s.date, runUrl: s.runUrl, researchCommit: s.researchCommit,
      trainingLocation: s.trainingLocation, testSize: s.expectedIds.length,
      currentTestState: s.currentTestState, fiveIds: s.fiveIds, policy: s.policy,
      limitations: s.limitations, sourceHashes: s.sourceHashes,
      notice: 'نتائج بحثية سابقة، وليست دقة النماذج المنشورة. لا تثبت قبول المحركات السبعة.' };
  } catch (error) {
    return { ...base, ok: false, integrityVerified: false, status: 'evidence_unavailable',
      error: 'تعذر التحقق من ملف نتائج الاختبار؛ لا توجد نسبة دقة معتمدة للعرض.' };
  }
}
module.exports = { readModelEvidence };
