/**
 * ACEP Engineering Decision Engine
 *
 * The thinking layer inside AI Orchestrator.
 * Does NOT generate data — it makes DECISIONS.
 *
 * Before approving any result, answers:
 * 1. Is BOQ logical?     2. Does image represent project?
 * 3. Does nav represent image?  4. Does cost match quantities?
 * 5. Is schedule realistic?  6. Do materials match code?
 * 7. Is any item missing?  8. Any unnecessary element?
 * 9. Any conflict?         10. Overall verdict.
 *
 * Reuses: SemanticValidator, BOQAuditor, CrossModelValidator,
 *         ValidationEngine, UnifiedConfidenceEngine, LearningFeedbackEngine
 */
class EngineeringDecisionEngine {
  constructor(options = {}) {
    this.semanticValidator = options.semanticValidator || null;
    this.boqAuditor = options.boqAuditor || null;
    this.crossModelValidator = options.crossModelValidator || null;
    this.validationEngine = options.validationEngine || null;
    this.confidenceEngine = options.confidenceEngine || null;
    this.learningFeedback = options.learningFeedback || null;
    this.edl = options.edl || null;
    this._decisionLog = [];
  }

  evaluate(projectId) {
    const project = this.edl?.getProject(projectId);
    if (!project) return { ok: false, error: 'Project not found', decisions: [] };

    const answers = {};
    const allIssues = [];

    // Question 1: Is BOQ logical?
    answers.boqIsLogical = this._evaluateBOQ(project, allIssues);

    // Question 2: Does image represent project?
    answers.imageRepresentsProject = this._evaluateImage(project, allIssues);

    // Question 3: Does navigation represent image?
    answers.navRepresentsImage = this._evaluateNav(project, allIssues);

    // Question 4: Does cost match quantities?
    answers.costMatchesQuantities = this._evaluateCost(project, allIssues);

    // Question 5: Is schedule realistic?
    answers.scheduleIsRealistic = this._evaluateSchedule(project, allIssues);

    // Question 6: Do materials match code?
    answers.materialsMatchCode = this._evaluateMaterials(project, allIssues);

    // Question 7: Any item missing?
    answers.missingItems = this._evaluateMissingItems(project, allIssues);

    // Question 8: Any unnecessary element?
    answers.unnecessaryElements = this._evaluateUnnecessary(project, allIssues);

    // Question 9: Any conflict?
    answers.hasConflicts = this._evaluateConflicts(project, allIssues);

    // Overall Decision
    const criticalIssues = allIssues.filter(i => i.severity === 'critical' || i.severity === 'error');
    const warnings = allIssues.filter(i => i.severity === 'warning');
    const overallPassed = criticalIssues.length === 0;

    answers.verdict = overallPassed ? 'approved' : 'rejected';
    answers.canProceed = overallPassed;
    answers.totalIssues = allIssues.length;
    answers.criticalCount = criticalIssues.length;
    answers.warningCount = warnings.length;

    // Run confidence if available
    let confidence = null;
    if (this.confidenceEngine) {
      confidence = this.confidenceEngine.evaluate(project);
    }

    // Run cross-model validation if available
    let crossModel = null;
    if (this.crossModelValidator) {
      crossModel = this.crossModelValidator.runAll(project);
    }

    const decision = {
      projectId,
      timestamp: new Date().toISOString(),
      verdict: answers.verdict,
      canProceed: answers.canProceed,
      questions: answers,
      issues: allIssues,
      criticalIssues,
      warnings,
      confidence,
      crossModelResult: crossModel,
      summary: this._buildSummary(answers, allIssues),
    };

    // Trace to EDL
    if (project) {
      project.traceEvent('decision_engine', 'EngineeringDecisionEngine', {
        verdict: answers.verdict,
        issues: allIssues.length,
        critical: criticalIssues.length,
      });
    }

    // Record feedback
    if (this.learningFeedback && !overallPassed) {
      for (const issue of criticalIssues) {
        this.learningFeedback.recordDecision(projectId, {
          module: 'engineering_decision_engine',
          decisionType: 'reject',
          reason: issue.message,
          context: { question: issue.question, severity: issue.severity },
          source: 'validation_engine',
        });
      }
    }

    this._decisionLog.push(decision);
    return decision;
  }

  _evaluateBOQ(project, issues) {
    const boq = project.boq;
    if (!boq || !boq.items || boq.items.length === 0) {
      issues.push({ question: 'boqIsLogical', severity: 'critical', message: 'BOQ is empty — no items to evaluate', category: 'boq' });
      return false;
    }

    // Run BOQ auditor if available
    if (this.boqAuditor) {
      const audit = this.boqAuditor.audit(project);
      if (audit.criticalIssues && audit.criticalIssues.length > 0) {
        for (const ci of audit.criticalIssues) {
          issues.push({ question: 'boqIsLogical', severity: 'critical', message: `BOQ audit critical: ${ci.message}`, item: ci.item, category: 'boq' });
        }
        return false;
      }
      if (audit.overall < 50) {
        issues.push({ question: 'boqIsLogical', severity: 'error', message: `BOQ audit score ${audit.overall}/100 — below threshold`, category: 'boq' });
        return false;
      }
    }

    // Basic checks
    const zeroItems = boq.items.filter(i => i.quantity === 0 || i.quantity === null);
    if (zeroItems.length > boq.items.length * 0.5) {
      issues.push({ question: 'boqIsLogical', severity: 'error', message: `More than 50% of BOQ items have zero quantity (${zeroItems.length}/${boq.items.length})`, category: 'boq' });
      return false;
    }

    return true;
  }

  _evaluateImage(project, issues) {
    const vision = project.vision;
    if (!vision || (!vision.images?.length && !vision.generationResults?.length)) {
      issues.push({ question: 'imageRepresentsProject', severity: 'info', message: 'No images generated yet — skipping image validation', category: 'vision' });
      return true; // Not a critical failure if no images expected
    }

    // Run semantic validator for vision output
    if (this.semanticValidator) {
      const valid = this.semanticValidator.validateProject(project.id);
      if (valid && !valid.passed) {
        const imageIssues = valid.semanticIssues?.filter(i => i.rule?.includes('IMAGE') || i.rule?.includes('VISION'));
        if (imageIssues?.length > 0) {
          for (const ii of imageIssues) {
            issues.push({ question: 'imageRepresentsProject', severity: ii.severity, message: ii.message, category: 'vision' });
          }
          if (imageIssues.some(i => i.severity === 'error')) return false;
        }
      }
    }

    return true;
  }

  _evaluateNav(project, issues) {
    const nav = project.navigation;
    const vision = project.vision;

    if (!nav || !nav.elements || nav.elements.length === 0) {
      issues.push({ question: 'navRepresentsImage', severity: 'info', message: 'No navigation data — skipping nav validation', category: 'navigation' });
      return true;
    }

    // Cross-validate nav vs vision
    if (vision?.features) {
      const vFloors = vision.features.floors;
      const nFloors = nav.spatialModel?.floors || nav.elements?.length;
      if (vFloors && nFloors && vFloors !== nFloors) {
        issues.push({ question: 'navRepresentsImage', severity: 'error', message: `Navigation shows ${nFloors} floors but Vision AI indicates ${vFloors}`, category: 'navigation', values: { nav: nFloors, vision: vFloors } });
        return false;
      }
    }

    // Check semantic validator nav checks
    if (this.semanticValidator) {
      const valid = this.semanticValidator.validateProject(project.id);
      if (valid) {
        const navIssues = valid.semanticIssues?.filter(i => i.rule?.includes('3D') || i.rule?.includes('FLOORS'));
        if (navIssues?.some(i => i.severity === 'error')) {
          for (const ni of navIssues) issues.push({ question: 'navRepresentsImage', severity: ni.severity, message: ni.message, category: 'navigation' });
          return false;
        }
      }
    }

    return true;
  }

  _evaluateCost(project, issues) {
    const cost = project.cost;
    const boq = project.boq;

    if (!cost || !cost.totalCost) {
      issues.push({ question: 'costMatchesQuantities', severity: 'info', message: 'No cost data — skipping cost validation', category: 'cost' });
      return true;
    }

    if (boq?.items?.length > 0) {
      const boqTotal = boq.items.reduce((s, i) => s + (i.totalCost || i.totalPrice || i.total || 0), 0);
      const costTotal = cost.totalCost || 0;

      if (boqTotal > 0 && costTotal > 0) {
        const ratio = Math.abs(boqTotal - costTotal) / Math.max(boqTotal, costTotal);
        if (ratio > 0.3) {
          issues.push({ question: 'costMatchesQuantities', severity: 'error', message: `BOQ total (${Math.round(boqTotal).toLocaleString()} ر.س) differs from cost total (${Math.round(costTotal).toLocaleString()} ر.س) by ${Math.round(ratio * 100)}%`, category: 'cost', values: { boqTotal: Math.round(boqTotal), costTotal: Math.round(costTotal), ratio: Math.round(ratio * 100) } });
          return false;
        }
      }
    }

    // Check cost vs area
    const area = project.getEffective('area').value;
    if (area && costTotal > 0) {
      const costPerM2 = costTotal / area;
      if (costPerM2 < 500 && costTotal > 100000) {
        issues.push({ question: 'costMatchesQuantities', severity: 'warning', message: `Cost per m² (${Math.round(costPerM2).toLocaleString()} ر.س) seems too low for total cost ${Math.round(costTotal).toLocaleString()} ر.س`, category: 'cost', values: { costPerM2: Math.round(costPerM2) } });
      }
      if (costPerM2 > 50000) {
        issues.push({ question: 'costMatchesQuantities', severity: 'warning', message: `Cost per m² (${Math.round(costPerM2).toLocaleString()} ر.س) seems too high`, category: 'cost' });
      }
    }

    return true;
  }

  _evaluateSchedule(project, issues) {
    const schedule = project.schedule;
    const boq = project.boq;

    if (!schedule || !schedule.totalDuration) {
      issues.push({ question: 'scheduleIsRealistic', severity: 'info', message: 'No schedule data — skipping schedule validation', category: 'schedule' });
      return true;
    }

    const days = schedule.totalDuration || 0;
    const months = schedule.totalMonths || 0;

    // Cross-check with BOQ volume
    if (boq?.items?.length > 0 && days > 0) {
      const itemsPerDay = boq.items.length / days;
      if (itemsPerDay > 10) {
        issues.push({ question: 'scheduleIsRealistic', severity: 'warning', message: `${boq.items.length} BOQ items in ${days} days (${itemsPerDay.toFixed(1)} items/day) — may be unrealistic`, category: 'schedule', values: { itemsPerDay: Math.round(itemsPerDay * 10) / 10 } });
      }
    }

    // Cross-check with area
    const area = project.getEffective('area').value;
    if (area && months > 0) {
      const m2PerMonth = area / months;
      if (m2PerMonth > 500) {
        issues.push({ question: 'scheduleIsRealistic', severity: 'warning', message: `${Math.round(m2PerMonth)} m²/month completion rate seems high for ${area} m² in ${months} months`, category: 'schedule' });
      }
    }

    return true;
  }

  _evaluateMaterials(project, issues) {
    const building = project.building;
    const boq = project.boq;

    if (!building || !boq) {
      return true;
    }

    const boqMaterials = new Set();
    for (const item of boq.items || []) {
      if (item.material) boqMaterials.add(item.material.toLowerCase());
      const name = (item.name || item.description || '').toLowerCase();
      if (name.includes('concrete') || name.includes('خرسانة')) boqMaterials.add('concrete');
      if (name.includes('steel') || name.includes('حديد')) boqMaterials.add('steel');
      if (name.includes('wood') || name.includes('خشب')) boqMaterials.add('wood');
    }

    // Materials should exist in building model
    const buildingMaterials = new Set((building.materials || []).map(m => m.toLowerCase()));
    const missingInBuilding = [...boqMaterials].filter(m => !buildingMaterials.has(m) && m.length > 2);

    if (missingInBuilding.length > 3) {
      issues.push({ question: 'materialsMatchCode', severity: 'warning', message: `${missingInBuilding.length} materials in BOQ not referenced in building model: ${missingInBuilding.slice(0, 3).join(', ')}`, category: 'materials', materials: missingInBuilding });
    }

    return true;
  }

  _evaluateMissingItems(project, issues) {
    if (!project.boq?.items) {
      issues.push({ question: 'missingItems', severity: 'info', message: 'No BOQ items to evaluate for missing items', category: 'boq' });
      return true;
    }

    // Reuse BOQ auditor's missing items check
    if (this.boqAuditor) {
      const audit = this.boqAuditor.audit(project);
      if (audit.categories?.missingItems?.missing?.length > 0) {
        const miss = audit.categories.missingItems;
        if (miss.missing.length > 3) {
          issues.push({ question: 'missingItems', severity: 'warning', message: `${miss.missing.length} required items missing for this project type: ${miss.missing.join(', ')}`, category: 'boq', missing: miss.missing });
        } else if (miss.missing.length > 0) {
          for (const m of miss.missing) {
            issues.push({ question: 'missingItems', severity: 'info', message: `Missing required item: ${m}`, category: 'boq' });
          }
        }
      }
    }

    return true;
  }

  _evaluateUnnecessary(project, issues) {
    const boq = project.boq;
    if (!boq?.items) return true;

    const projectType = project.getEffective('type').value;
    const unnecessary = [];

    for (const item of boq.items) {
      const name = (item.name || item.description || '').toLowerCase();

      // Elevator in 1-floor building
      if ((name.includes('elevator') || name.includes('مصعد') || name.includes('ascenseur')) &&
          (project.getEffective('floors').value <= 1)) {
        unnecessary.push({ item: item.code || item.name, reason: 'مصعد في مبنى من دور واحد غير ضروري' });
      }

      // Fire alarm in small villa
      if ((name.includes('fire alarm') || name.includes('إنذار حريق') || name.includes('fire detection')) &&
          projectType === 'Villa' && project.getEffective('area').value < 300) {
        unnecessary.push({ item: item.code || item.name, reason: 'إنذار حريق في فيلا صغيرة قد لا يكون مطلوباً حسب SBC' });
      }

      // Generator in small project
      if ((name.includes('generator') || name.includes('مولد') || name.includes('generator')) &&
          project.getEffective('area').value < 200) {
        unnecessary.push({ item: item.code || item.name, reason: 'مولد كهرباء لمشروع صغير غير ضروري' });
      }
    }

    if (unnecessary.length > 0) {
      for (const u of unnecessary) {
        issues.push({ question: 'unnecessaryElements', severity: 'info', message: `${u.item}: ${u.reason}`, category: 'optimization' });
      }
    }

    return true;
  }

  _evaluateConflicts(project, issues) {
    // Check orchestration conflicts
    const conflicts = project.orchestration?.conflicts || [];
    if (conflicts.length > 0) {
      const errors = conflicts.filter(c => c.severity === 'error');
      for (const c of errors) {
        issues.push({ question: 'hasConflicts', severity: 'error', message: `Conflict: ${c.message} (between ${c.from} and ${c.to})`, category: 'conflict' });
      }
      for (const c of conflicts.filter(c => c.severity !== 'error')) {
        issues.push({ question: 'hasConflicts', severity: 'warning', message: `Conflict: ${c.message}`, category: 'conflict' });
      }
      return errors.length === 0;
    }

    // Run cross-model validator
    if (this.crossModelValidator) {
      const cv = this.crossModelValidator.runAll(project);
      if (cv && !cv.passed) {
        for (const rule of cv.rules || []) {
          if (!rule.passed) {
            issues.push({ question: 'hasConflicts', severity: rule.severity === 'error' ? 'error' : 'warning', message: `Cross-model: ${rule.message}`, category: 'conflict', rule: rule.name });
          }
        }
        return cv.passed;
      }
    }

    return true;
  }

  _buildSummary(answers, issues) {
    const questions = [
      { key: 'boqIsLogical', ar: 'هل BOQ منطقي؟' },
      { key: 'imageRepresentsProject', ar: 'هل الصورة تمثل المشروع؟' },
      { key: 'navRepresentsImage', ar: 'هل الملاحة تمثل الصورة؟' },
      { key: 'costMatchesQuantities', ar: 'هل التكلفة تتوافق مع الكميات؟' },
      { key: 'scheduleIsRealistic', ar: 'هل الجدول الزمني واقعي؟' },
      { key: 'materialsMatchCode', ar: 'هل المواد تتوافق مع الكود؟' },
      { key: 'missingItems', ar: 'هل يوجد بند مفقود؟' },
      { key: 'unnecessaryElements', ar: 'هل يوجد عنصر غير ضروري؟' },
      { key: 'hasConflicts', ar: 'هل يوجد تعارض؟' },
    ];

    const passed = [];
    const failed = [];
    for (const q of questions) {
      const answer = answers[q.key];
      if (answer === false) failed.push(q);
      else passed.push(q);
    }

    if (failed.length === 0) {
      return `✅ جميع الفحوصات passed — يمكن اعتماد المشروع`;
    }

    let msg = `⚠️ ${failed.length} من ${questions.length} فحوصات فشلت:\n`;
    for (const f of failed) {
      const qIssues = issues.filter(i => i.question === f.key);
      msg += `  ❌ ${f.ar} — ${qIssues.length} مشكلة\n`;
      for (const i of qIssues.slice(0, 2)) {
        msg += `     - ${i.message}\n`;
      }
    }
    return msg;
  }

  getDecisionLog(projectId) {
    if (projectId) return this._decisionLog.filter(d => d.projectId === projectId);
    return this._decisionLog;
  }

  getStats() {
    const total = this._decisionLog.length;
    return {
      totalDecisions: total,
      approved: this._decisionLog.filter(d => d.verdict === 'approved').length,
      rejected: this._decisionLog.filter(d => d.verdict === 'rejected').length,
      approvalRate: total > 0 ? Math.round((this._decisionLog.filter(d => d.verdict === 'approved').length / total) * 100) : 0,
    };
  }
}

module.exports = EngineeringDecisionEngine;
