/**
 * ACEP Cross-Model Validation Enhancement
 *
 * Extends the AI Orchestrator's 5 basic cross-validation rules with:
 * - CV6: Vision quality vs BOQ complexity
 * - CV7: Cost vs Schedule coherence
 * - CV8: Risk vs Quality correlation
 * - CV9: Material consistency across modules
 * - CV10: Spatial vs Analytical data alignment
 *
 * Each rule runs between consecutive and non-consecutive pipeline steps.
 */
const path = require('path');

class CrossModelValidator {
  constructor(edl, semanticValidator, confidenceEngine) {
    this.edl = edl;
    this.semanticValidator = semanticValidator;
    this.confidenceEngine = confidenceEngine;
    this._validationLog = [];
  }

  runAll(project) {
    if (!project) return { ok: false, error: 'No project' };

    const startTime = Date.now();
    const rules = [
      this._cv6_visionQualityVsBOQ.bind(this),
      this._cv7_costVsScheduleCoherence.bind(this),
      this._cv8_riskVsQuality.bind(this),
      this._cv9_materialConsistency.bind(this),
      this._cv10_spatialVsAnalytical.bind(this),
    ];

    const results = [];

    for (const rule of rules) {
      try {
        const result = rule(project);
        if (result) {
          results.push(result);
          if (!result.passed && result.severity === 'error') {
            project.addConflict(result.from, result.to, result.message, 'error');
          } else if (!result.passed && result.severity === 'warning') {
            project.addConflict(result.from, result.to, result.message, 'warning');
          }
        }
      } catch (err) {
        results.push({
          rule: rule.name || 'unknown',
          passed: false,
          severity: 'warning',
          message: `Validation error: ${err.message}`,
        });
      }
    }

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    const output = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      score: total > 0 ? Math.round((passed / total) * 100) : 100,
      passed: passed === total,
      rules: results.map(r => ({
        name: r.rule || r.name,
        passed: r.passed,
        severity: r.severity || 'ok',
        message: r.message,
      })),
      details: results,
    };

    this._validationLog.push({
      projectId: project.id,
      timestamp: output.timestamp,
      passed: output.passed,
      score: output.score,
    });

    return output;
  }

  _cv6_visionQualityVsBOQ(project) {
    const boqItems = project.boq?.items || [];
    const visionResults = project.vision?.generationResults || [];
    const upmSnapshot = project.vision?.upmSnapshot;

    if (boqItems.length === 0 || visionResults.length === 0) {
      return { rule: 'CV6', passed: true, severity: 'info', message: 'Insufficient data for CV6', from: 'boq', to: 'vision_ai' };
    }

    const boqComplexity = boqItems.length;
    const visionComplexity = upmSnapshot?.boqSummary?.totalItems || 0;

    if (boqComplexity > 0 && visionComplexity > 0) {
      const ratio = Math.abs(boqComplexity - visionComplexity) / boqComplexity;
      if (ratio > 0.5) {
        return {
          rule: 'CV6', passed: false, severity: 'warning',
          message: `Vision AI generated ${visionResults.length} results but BOQ has ${boqComplexity} items (${Math.round(ratio * 100)}% mismatch)`,
          from: 'boq', to: 'vision_ai',
          values: { boqItems: boqComplexity, visionResults: visionResults.length, mismatch: Math.round(ratio * 100) },
        };
      }
    }

    return { rule: 'CV6', passed: true, severity: 'ok', message: 'Vision quality consistent with BOQ complexity', from: 'boq', to: 'vision_ai' };
  }

  _cv7_costVsScheduleCoherence(project) {
    const cost = project.cost;
    const schedule = project.schedule;

    if (!cost || !schedule) {
      return { rule: 'CV7', passed: true, severity: 'info', message: 'Insufficient data for CV7', from: 'cost', to: 'schedule' };
    }

    const totalCost = cost.totalCost || 0;
    const durationMonths = schedule.totalMonths || 0;
    const durationDays = schedule.totalDuration || 0;

    if (totalCost > 0 && durationMonths > 0) {
      const costPerMonth = totalCost / durationMonths;

      if (costPerMonth < 50000 && totalCost > 500000) {
        return {
          rule: 'CV7', passed: false, severity: 'warning',
          message: `تكلفة الشهر (${Math.round(costPerMonth).toLocaleString()} ر.س) منخفضة جداً لكلفة المشروع (${Math.round(totalCost).toLocaleString()} ر.س)`,
          from: 'cost', to: 'schedule',
          values: { costPerMonth: Math.round(costPerMonth), totalCost: Math.round(totalCost), durationMonths },
        };
      }

      if (costPerMonth > 5000000 && totalCost < 10000000) {
        return {
          rule: 'CV7', passed: false, severity: 'warning',
          message: `تكلفة الشهر (${Math.round(costPerMonth).toLocaleString()} ر.س) مرتفعة جداً للمشاريع الصغيرة`,
          from: 'cost', to: 'schedule',
          values: { costPerMonth: Math.round(costPerMonth), durationMonths },
        };
      }
    }

    if (durationMonths > 0 && durationDays > 0) {
      const expectedDays = durationMonths * 30.4;
      const diff = Math.abs(durationDays - expectedDays);
      if (diff / expectedDays > 0.4) {
        return {
          rule: 'CV7', passed: false, severity: 'warning',
          message: `المدة بالأيام (${durationDays}) لا تتوافق مع المدة بالأشهر (${durationMonths} × 30.4 = ${Math.round(expectedDays)})`,
          from: 'schedule', to: 'schedule',
          values: { durationDays, durationMonths, expectedDays: Math.round(expectedDays), diff: Math.round(diff) },
        };
      }
    }

    return { rule: 'CV7', passed: true, severity: 'ok', message: 'Cost and schedule coherent', from: 'cost', to: 'schedule' };
  }

  _cv8_riskVsQuality(project) {
    const risks = project.risks;
    const quality = project.quality;

    if (!risks || !quality) {
      return { rule: 'CV8', passed: true, severity: 'info', message: 'Insufficient data for CV8', from: 'risks', to: 'quality' };
    }

    const riskScore = risks.overallRiskScore || 0;
    const qualityScore = quality.qualityScore || 0;

    if (riskScore > 0 && qualityScore > 0) {
      // High risk should correlate with lower quality expectation
      if (riskScore > 70 && qualityScore > 85) {
        return {
          rule: 'CV8', passed: false, severity: 'warning',
          message: `مخاطر عالية (${riskScore}) لكن توقعات الجودة مرتفعة (${qualityScore}) — غير متسق`,
          from: 'risks', to: 'quality',
          values: { riskScore, qualityScore },
        };
      }

      // Low risk with very low quality is suspicious
      if (riskScore < 30 && qualityScore < 40) {
        return {
          rule: 'CV8', passed: false, severity: 'info',
          message: `مخاطر منخفضة (${riskScore}) لكن الجودة منخفضة أيضاً (${qualityScore})`,
          from: 'risks', to: 'quality',
          values: { riskScore, qualityScore },
        };
      }
    }

    // Risk count vs quality defects correlation
    const riskCount = risks.risks?.length || 0;
    const defectCount = quality.defects?.length || 0;

    if (riskCount > 5 && defectCount === 0) {
      return {
        rule: 'CV8', passed: false, severity: 'info',
        message: `${riskCount} مخاطر محددة لكن لا توجد عيوب جودة — قد تحتاج مراجعة`,
        from: 'risks', to: 'quality',
        values: { riskCount, defectCount },
      };
    }

    return { rule: 'CV8', passed: true, severity: 'ok', message: 'Risk and quality correlated appropriately', from: 'risks', to: 'quality' };
  }

  _cv9_materialConsistency(project) {
    const building = project.building;
    const boqItems = project.boq?.items || [];
    const upmSnapshot = project.vision?.upmSnapshot;
    const profile = project.digitalProfile;

    const materialSets = [];

    // Materials from building model
    if (building && building.materials) {
      materialSets.push({ source: 'building', materials: new Set(building.materials.map(m => m.toLowerCase())) });
    }

    // Materials from BOQ
    const boqMaterials = new Set();
    for (const item of boqItems) {
      if (item.material) boqMaterials.add(item.material.toLowerCase());
      const name = (item.name || '').toLowerCase();
      if (name.includes('concrete') || name.includes('خرسانة')) boqMaterials.add('concrete');
      if (name.includes('steel') || name.includes('حديد')) boqMaterials.add('steel');
      if (name.includes('wood') || name.includes('خشب')) boqMaterials.add('wood');
      if (name.includes('glass') || name.includes('زجاج')) boqMaterials.add('glass');
      if (name.includes('ceramic') || name.includes('سيراميك')) boqMaterials.add('ceramic');
      if (name.includes('stone') || name.includes('حجر')) boqMaterials.add('stone');
      if (name.includes('marble') || name.includes('رخام')) boqMaterials.add('marble');
      if (name.includes('alumini') || name.includes('المنيوم') || name.includes('الومنيوم')) boqMaterials.add('aluminum');
    }
    if (boqMaterials.size > 0) {
      materialSets.push({ source: 'boq', materials: boqMaterials });
    }

    // Materials from UPM
    if (upmSnapshot && upmSnapshot.materials) {
      materialSets.push({ source: 'upm', materials: new Set(upmSnapshot.materials.map(m => m.toLowerCase())) });
    }

    // Materials from Profile
    if (profile && profile.materials) {
      materialSets.push({ source: 'profile', materials: new Set(profile.materials.map(m => m.toLowerCase())) });
    }

    if (materialSets.length < 2) {
      return { rule: 'CV9', passed: true, severity: 'info', message: 'Insufficient material data sources for cross-validation', from: 'building', to: 'boq' };
    }

    const reference = materialSets[materialSets.length - 1];
    const others = materialSets.slice(0, -1);
    const missing = [];

    for (const set of others) {
      for (const mat of set.materials) {
        if (!reference.materials.has(mat)) {
          if (!missing.find(m => m.material === mat)) {
            missing.push({ material: mat, source: set.source });
          }
        }
      }
    }

    if (missing.length > 2) {
      return {
        rule: 'CV9', passed: false, severity: 'warning',
        message: `${missing.length} مواد في بعض المصادر غير موجودة في ${reference.source}: ${missing.map(m => m.material).join(', ')}`,
        from: 'building', to: 'boq',
        values: { missing: missing.slice(0, 5), referenceSource: reference.source },
      };
    }

    return { rule: 'CV9', passed: true, severity: 'ok', message: `Materials consistent across ${materialSets.length} sources`, from: 'building', to: 'boq' };
  }

  _cv10_spatialVsAnalytical(project) {
    const predicted = project.predicted;
    const approved = project.approved;
    const effective = project.getEffective;

    if (!predicted || !approved) {
      return { rule: 'CV10', passed: true, severity: 'info', message: 'Insufficient data for CV10', from: 'analysis', to: 'navigation' };
    }

    const issues = [];

    // Floor count alignment
    const predFloors = predicted.floors;
    const extractedFloors = approved.floors || (effective ? effective('floors').value : null);
    if (predFloors && extractedFloors && predFloors !== extractedFloors) {
      issues.push({ field: 'floors', predicted: predFloors, extracted: extractedFloors });
    }

    // Area alignment  
    const predArea = predicted.totalArea;
    const extractedArea = approved.area || (effective ? effective('area').value : null);
    if (predArea && extractedArea) {
      const areaDiff = Math.abs(predArea - extractedArea);
      if (areaDiff / extractedArea > 0.5) {
        issues.push({ field: 'area', predicted: predArea, extracted: extractedArea, diff: Math.round(areaDiff) });
      }
    }

    if (issues.length > 0) {
      return {
        rule: 'CV10', passed: false, severity: 'warning',
        message: `تباين بين التحليل والبيانات المعتمدة: ${issues.map(i => `${i.field} (تحليل: ${i.predicted}, معتمد: ${i.extracted})`).join('; ')}`,
        from: 'analysis', to: 'approved',
        values: { issues },
      };
    }

    return { rule: 'CV10', passed: true, severity: 'ok', message: 'Spatial data matches analytical predictions', from: 'analysis', to: 'navigation' };
  }

  getLog(projectId) {
    if (projectId) return this._validationLog.filter(l => l.projectId === projectId);
    return this._validationLog;
  }

  getStats() {
    const total = this._validationLog.length;
    return {
      totalValidations: total,
      passed: this._validationLog.filter(l => l.passed).length,
      failed: this._validationLog.filter(l => !l.passed).length,
      avgScore: total > 0
        ? Math.round(this._validationLog.reduce((s, l) => s + l.score, 0) / total)
        : 0,
    };
  }
}

module.exports = CrossModelValidator;
