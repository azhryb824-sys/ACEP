(function (root) {
  'use strict';
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = x => typeof x === 'number' && Number.isFinite(x) ? (x * 100).toFixed(2) + '%' : 'غير متاح';
  function render(report) {
    if (!report || report.ok !== true || report.integrityVerified !== true || !Array.isArray(report.engines)) {
      return '<div class="card"><h2>نتائج اختبار المحركات</h2><p class="warn">تعذر التحقق من نتائج الاختبار. لا توجد نسبة دقة معتمدة للعرض.</p></div>';
    }
    const cards = report.engines.map(engine => {
      const r = engine.research, m = r?.metrics;
      let detail = '<p>لم يُختبر هذا المحرك في هذه الدورة.</p>';
      if (m && r.primaryMetric === 'within10') {
        detail = '<p><b>' + esc(pct(m.within10)) + '</b> ضمن هامش ±10% (' + esc(m.withinCount) + '/' + esc(m.n) + ')</p>' +
          '<p>متوسط الخطأ النسبي: ' + esc(pct(m.MAPE)) + ' · التغطية: ' + esc(pct(m.coverage)) + '</p>';
      } else if (m && r.primaryMetric === 'balancedAccuracy') {
        detail = '<p><b>' + (m.classificationCoverage === 0 ? 'امتناع عن التصنيف' : 'دقة متوازنة: ' + esc(pct(m.balancedAccuracy))) + '</b></p>' +
          '<p>تغطية التصنيف: ' + esc(pct(m.classificationCoverage)) + ' · حالات التجاوز: ' + esc(m.positives) + '</p>';
      }
      const gate = m ? (m.metricGatePassed === true ? 'اجتاز الشرط البحثي المحدود فقط' : 'لم يجتز شرط القبول البحثي') : 'القبول الهندسي غير مثبت';
      return '<article class="card"><h3>' + esc(engine.label) + '</h3>' + detail +
        '<p class="warn">' + gate + '</p>' + (r ? '<p class="sub">' + esc(r.summary) + '</p>' : '') +
        '<p class="sub">البيانات المطلوبة: ' + esc(engine.requiredData) + '</p></article>';
    }).join('');
    return '<h2>نتائج اختبار المحركات</h2><p class="warn">' + esc(report.fullEngineAcceptedCount) + '/' + esc(report.totalEngines) +
      ' محركات ثبت قبولها عند هدف 90% على المشاريع الخمسة.</p><p>' + esc(report.notice) + '</p>' +
      '<p class="timestamp">' + esc(report.cycle) + ' · ' + esc(report.date) + ' · ' + esc(report.testSize) +
      ' عقدًا · عينة الاختبار أصبحت مكشوفة</p><div class="grid">' + cards + '</div>';
  }
  if (typeof module === 'object' && module.exports) module.exports = { render, pct };
  else root.ACEPModelEvidenceView = { render, pct };
})(typeof window === 'object' ? window : this);
