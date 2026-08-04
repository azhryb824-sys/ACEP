/**
 * ACEP Validation Engine
 *
 * Cross-module validation rules that ensure consistency between all project modules.
 * Every rule checks data between two or more modules and reports issues.
 */
class ValidationEngine {
  constructor(edl) {
    this.edl = edl;
    this.rules = [
      this.v001_boqVsDirectCost,
      this.v002_directVsTotalCost,
      this.v003_boqVsCostBreakdown,
      this.v004_scheduleVsBOQ,
      this.v005_areaVsBOQ,
      this.v006_floorsVsSchedule,
      this.v007_riskVsCost,
      this.v008_approvedVsExtracted,
    ];
  }

  /**
   * Run all validation rules on a project
   */
  validate(project) {
    if (!project) return { passed: true, issues: [] };

    const allIssues = [];

    for (const rule of this.rules) {
      try {
        const issues = rule(project);
        if (issues && issues.length > 0) allIssues.push(...issues);
      } catch (err) {
        allIssues.push({
          code: 'V999',
          severity: 'error',
          message: `خطأ في التحقق: ${err.message}`,
          source: 'validation-engine'
        });
      }
    }

    // Deduplicate by code
    const unique = [];
    const seen = new Set();
    for (const issue of allIssues) {
      const key = issue.code + '|' + JSON.stringify(issue.between || []);
      if (!seen.has(key)) { seen.add(key); unique.push(issue); }
    }

    project.validation = {
      issues: unique.filter(i => i.severity === 'error'),
      warnings: unique.filter(i => i.severity !== 'error'),
      passed: unique.filter(i => i.severity === 'error').length === 0,
      lastChecked: new Date().toISOString()
    };

    return project.validation;
  }

  // ─── V001: BOQ total cost must not exceed direct cost ───
  v001_boqVsDirectCost(project) {
    const issues = [];
    const boqTotal = project.boq?.summary?.totalCost || 0;
    const directCost = project.cost?.directCost || 0;
    if (boqTotal > 0 && directCost > 0) {
      if (boqTotal > directCost * 1.05) {
        issues.push({
          code: 'V001',
          severity: 'error',
          message: `تكلفة BOQ (${boqTotal.toLocaleString()} ر.س) تتجاوز التكلفة المباشرة (${directCost.toLocaleString()} ر.س)`,
          source: 'validation-engine',
          between: ['boq.summary.totalCost', 'cost.directCost'],
          values: { boqTotal, directCost },
          recommendation: `يجب أن تكون التكلفة المباشرة ≥ ${boqTotal.toLocaleString()} ر.س`
        });
      }
    } else if (boqTotal > 0 && directCost === 0) {
      issues.push({
        code: 'V001',
        severity: 'warning',
        message: `تكلفة BOQ (${boqTotal.toLocaleString()} ر.س) موجودة لكن التكلفة المباشرة = 0`,
        source: 'validation-engine',
        between: ['boq.summary.totalCost', 'cost.directCost'],
        values: { boqTotal, directCost: 0 },
        recommendation: 'يرجى تشغيل تحليل التكاليف'
      });
    }
    return issues;
  }

  // ─── V002: Direct cost must be ≤ total cost ───
  v002_directVsTotalCost(project) {
    const issues = [];
    const direct = project.cost?.directCost || 0;
    const total = project.cost?.totalCost || 0;
    if (direct > 0 && total > 0 && direct > total * 1.05) {
      issues.push({
        code: 'V002',
        severity: 'error',
        message: `التكلفة المباشرة (${direct.toLocaleString()} ر.س) أكبر من التكلفة الإجمالية (${total.toLocaleString()} ر.س)`,
        source: 'validation-engine',
        between: ['cost.directCost', 'cost.totalCost'],
        recommendation: 'يجب أن تكون التكلفة الإجمالية ≥ التكلفة المباشرة'
      });
    }
    if (direct > 0 && total === 0) {
      issues.push({
        code: 'V002',
        severity: 'warning',
        message: `التكلفة المباشرة (${direct.toLocaleString()} ر.س) موجودة لكن التكلفة الإجمالية = 0`,
        source: 'validation-engine',
        between: ['cost.directCost', 'cost.totalCost'],
        recommendation: 'يرجى حساب التكلفة الإجمالية'
      });
    }
    return issues;
  }

  // ─── V003: BOQ items should sum approximately to BOQ total ───
  v003_boqVsCostBreakdown(project) {
    const issues = [];
    const items = project.boq?.items || [];
    const itemTotal = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
    const boqSummaryTotal = project.boq?.summary?.totalCost || 0;
    if (itemTotal > 0 && boqSummaryTotal > 0) {
      const diff = Math.abs(itemTotal - boqSummaryTotal);
      if (diff / boqSummaryTotal > 0.1) {
        issues.push({
          code: 'V003',
          severity: 'warning',
          message: `مجموع بنود BOQ (${itemTotal.toLocaleString()} ر.س) يختلف عن إجمالي BOQ (${boqSummaryTotal.toLocaleString()} ر.س)`,
          source: 'validation-engine',
          between: ['boq.items[].totalPrice', 'boq.summary.totalCost'],
          values: { itemTotal, boqSummaryTotal, diff: Math.round(diff) }
        });
      }
    }
    return issues;
  }

  // ─── V004: Schedule duration vs BOQ volume ───
  v004_scheduleVsBOQ(project) {
    const issues = [];
    const boqItems = project.boq?.items?.length || 0;
    const scheduleDays = project.schedule?.totalDuration || 0;
    if (boqItems > 0 && scheduleDays > 0) {
      const itemsPerDay = boqItems / scheduleDays;
      if (itemsPerDay > 5) {
        issues.push({
          code: 'V004',
          severity: 'info',
          message: `${boqItems} بند في ${scheduleDays} يوم (${itemsPerDay.toFixed(1)} بند/يوم) — نسبة إنجاز عالية`,
          source: 'validation-engine',
          between: ['boq.items.length', 'schedule.totalDuration'],
          values: { boqItems, scheduleDays, itemsPerDay: Math.round(itemsPerDay * 10) / 10 }
        });
      }
    }
    return issues;
  }

  // ─── V005: Area vs BOQ quantities ───
  v005_areaVsBOQ(project) {
    const issues = [];
    const area = project.approved.area || project.extracted.area || 0;
    const boqPaint = project.boq?.items?.filter(i => /دهان/i.test(i.description || ''));
    const boqTotalPaint = boqPaint ? boqPaint.reduce((s, i) => s + (i.quantity || 0), 0) : 0;
    if (area > 0 && boqTotalPaint > 0 && boqTotalPaint < area * 0.3) {
      issues.push({
        code: 'V005',
        severity: 'info',
        message: `كمية الدهانات (${boqTotalPaint.toFixed(0)} م²) قليلة نسبياً مقارنة بالمساحة (${area} م²)`,
        source: 'validation-engine',
        between: ['area', 'boq items (paint)'],
        values: { area, boqTotalPaint }
      });
    }
    return issues;
  }

  // ─── V006: Floors vs Schedule activities ───
  v006_floorsVsSchedule(project) {
    const issues = [];
    const floors = project.approved.floors || project.extracted.floors || 1;
    const scheduleActivities = project.schedule?.activities?.length || 0;
    if (floors > 1 && scheduleActivities > 0 && scheduleActivities < floors * 2) {
      issues.push({
        code: 'V006',
        severity: 'info',
        message: `عدد أنشطة الجدول (${scheduleActivities}) قليل لـ ${floors} أدوار`,
        source: 'validation-engine',
        between: ['floors', 'schedule.activities.length']
      });
    }
    return issues;
  }

  // ─── V007: High risk should reflect in cost contingency ───
  v007_riskVsCost(project) {
    const issues = [];
    const riskLevel = project.risks?.riskLevel || 'Low';
    const contingency = project.cost?.contingency || 0;
    const totalCost = project.cost?.totalCost || 0;
    if (riskLevel === 'High' && totalCost > 0) {
      const contingencyPct = (contingency / totalCost) * 100;
      if (contingencyPct < 5) {
        issues.push({
          code: 'V007',
          severity: 'warning',
          message: `مستوى المخاطر مرتفع لكن احتياطي المخاطر (${contingencyPct.toFixed(1)}%) منخفض`,
          source: 'validation-engine',
          between: ['risks.riskLevel', 'cost.contingency'],
          recommendation: 'يوصى بزيادة احتياطي المخاطر إلى 10-15%'
        });
      }
    }
    return issues;
  }

  // ─── V008: Approved vs Extracted consistency ───
  v008_approvedVsExtracted(project) {
    const issues = [];
    const fields = ['area', 'floors', 'rooms', 'bathrooms'];
    for (const field of fields) {
      const approved = project.approved?.[field];
      const extracted = project.extracted?.[field];
      const confirmed = project.approved?.[field + 'Confirmed'];
      if (confirmed && approved !== null && extracted !== null && approved !== extracted) {
        issues.push({
          code: 'V008',
          severity: 'info',
          message: `المستخدم عدل ${field} من ${extracted} إلى ${approved}`,
          source: 'validation-engine',
          between: [`approved.${field}`, `extracted.${field}`],
          values: { extracted, approved }
        });
      }
    }
    return issues;
  }

  /**
   * Generate a complete validation report for a project
   */
  generateReport(project) {
    const v = this.validate(project);
    return {
      projectId: project.id,
      summary: {
        errors: v.issues.length,
        warnings: v.warnings.length,
        passed: v.passed,
        timestamp: v.lastChecked
      },
      errors: v.issues,
      warnings: v.warnings,
      moduleStatus: {
        extraction: project.extracted?.area !== null ? 'completed' : 'pending',
        analysis: project.predicted?.confidence > 0 ? 'completed' : 'pending',
        boq: project.boq?.items?.length > 0 ? 'completed' : 'pending',
        cost: project.cost?.totalCost > 0 ? 'completed' : 'pending',
        schedule: project.schedule?.totalDuration > 0 ? 'completed' : 'pending',
        risks: project.risks?.risks?.length > 0 ? 'completed' : 'pending',
        quality: project.quality?.qualityScore > 0 ? 'completed' : 'pending'
      },
      dataFlow: project.trace?.slice(-20).map(t => ({
        time: t.timestamp,
        action: t.action,
        module: t.module
      }))
    };
  }
}

module.exports = ValidationEngine;
