/**
 * Quality Indicators — Project Quality Metrics
 * Phase 17: Quality Indicators
 *
 * For each project, displays:
 * - Completion percentage
 * - Confidence score
 * - Missing items count
 * - Suggested items count
 * - High-risk items
 * - Code violations
 * - Quality grade
 * - Execution readiness
 */
class QualityIndicators {
  constructor(kb) {
    this.kb = kb;
  }

  assess(project, boqItems, agentResults) {
    const items = boqItems || [];
    const suggested = project.boq?.suggestedItems || [];
    const missingItems = agentResults?.missingItemDetection?.missingItems || [];
    const costResult = agentResults?.costValidation || {};
    const confidence = agentResults?.confidenceEstimation || {};
    const codeResult = agentResults?.codeCompliance || {};
    const profile = project.digitalProfile;

    // 1. Completion percentage
    const presentPhases = [...new Set(items.map(i => i.phase))];
    const allPhases = ['EXCAVATION', 'FOUNDATION', 'STRUCTURE', 'MASONRY', 'PLASTERING', 'FINISHING', 'ELECTRICAL', 'PLUMBING', 'HVAC'];
    const completionPct = Math.round((presentPhases.length / allPhases.length) * 100);

    // 2. High-risk items
    const highRisk = items.filter(i => i.confidence < 0.5 || (i.totalPrice || 0) > 1000000);

    // 3. Code violations
    const codeViolations = codeResult.rules?.filter(r => r.category === 'Seismic' || r.category === 'Fire') || [];

    // 4. Quality grade
    const qualityScore = Math.round((
      (confidence.overall || 0.5) * 0.3 +
      (completionPct / 100) * 0.25 +
      (1 - (highRisk.length / Math.max(1, items.length))) * 0.2 +
      (1 - (missingItems.length / Math.max(1, items.length + missingItems.length))) * 0.15 +
      ((codeResult.complianceScore || 70) / 100) * 0.1
    ) * 100);

    const grade = qualityScore >= 90 ? 'ممتاز' : qualityScore >= 75 ? 'جيد جداً' : qualityScore >= 60 ? 'جيد' : qualityScore >= 40 ? 'مقبول' : 'ضعيف';

    // 5. Execution readiness
    const criticalIssues = [];
    if (missingItems.length > 5) criticalIssues.push('بنود ناقصة كثيرة');
    if (highRisk.length > 3) criticalIssues.push('بنود عالية المخاطر');
    if (completionPct < 40) criticalIssues.push('نسبة اكتمال منخفضة');
    if ((confidence.overall || 0) < 0.4) criticalIssues.push('ثقة منخفضة');
    const readiness = criticalIssues.length === 0 ? 'جاهز للتنفيذ' : criticalIssues.length <= 2 ? 'جاهز مع تحفظات' : 'غير جاهز';

    return {
      qualityScore,
      qualityGrade: grade,
      completionPercentage: completionPct,
      completion: {
        totalPhases: allPhases.length,
        coveredPhases: presentPhases.length,
        missingPhases: allPhases.filter(p => !presentPhases.includes(p)),
        percentage: completionPct
      },
      confidence: {
        overall: confidence.overall || 0.5,
        byAgent: confidence.byAgent || {}
      },
      items: {
        total: items.length,
        suggested: suggested.length,
        missing: missingItems.length,
        highRisk: highRisk.length,
        highRiskItems: highRisk.slice(0, 10).map(i => ({ code: i.code, description: i.description, confidence: i.confidence, totalPrice: i.totalPrice }))
      },
      codeCompliance: {
        score: codeResult.complianceScore || 70,
        violations: codeViolations.length,
        criticalRules: codeResult.criticalRules?.length || 0
      },
      costAccuracy: {
        variance: costResult.variance || 0,
        validated: costResult.validated !== false
      },
      executionReadiness: readiness,
      criticalIssues,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = QualityIndicators;
