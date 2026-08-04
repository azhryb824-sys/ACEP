/**
 * ACEP Consistency Scorer
 *
 * Calculates pair-wise consistency between all AI models:
 *   UPM ↔ BOQ, BOQ ↔ Vision, Vision ↔ Navigation, Navigation ↔ Cost,
 *   Cost ↔ Schedule, Schedule ↔ Risk, and more.
 *
 * If any pair consistency < threshold, the system blocks and requires
 * human review.
 *
 * Reuses: CrossModelValidator results, SemanticValidator results,
 *         ConfidenceEngine scores, ValidationEngine reports.
 */
class ConsistencyScorer {
  constructor(options = {}) {
    this.crossModelValidator = options.crossModelValidator || null;
    this.semanticValidator = options.semanticValidator || null;
    this.confidenceEngine = options.confidenceEngine || null;
    this.validationEngine = options.validationEngine || null;
    this.edl = options.edl || null;
    this.defaultThreshold = options.threshold || 0.6;
    this._scoreHistory = [];
  }

  /**
   * Score all consistency pairs for a project.
   */
  scoreAll(projectId) {
    const project = this.edl?.getProject(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    const pairs = {};
    const allScores = [];

    // UPM ↔ BOQ
    pairs.upm_boq = this._scorePair(
      project, 'UPM', 'BOQ',
      this._checkUPMMatchesBOQ(project)
    );

    // BOQ ↔ Vision
    pairs.boq_vision = this._scorePair(
      project, 'BOQ', 'Vision AI',
      this._checkBOQMatchesVision(project)
    );

    // Vision ↔ Navigation
    pairs.vision_nav = this._scorePair(
      project, 'Vision AI', 'Navigation AI',
      this._checkVisionMatchesNav(project)
    );

    // Navigation ↔ Cost
    pairs.nav_cost = this._scorePair(
      project, 'Navigation AI', 'Cost AI',
      this._checkNavMatchesCost(project)
    );

    // Cost ↔ Schedule
    pairs.cost_schedule = this._scorePair(
      project, 'Cost AI', 'Schedule AI',
      this._checkCostMatchesSchedule(project)
    );

    // Schedule ↔ Risk
    pairs.schedule_risk = this._scorePair(
      project, 'Schedule AI', 'Risk AI',
      this._checkScheduleMatchesRisk(project)
    );

    // BOQ ↔ Cost (direct)
    pairs.boq_cost = this._scorePair(
      project, 'BOQ', 'Cost AI',
      this._checkBOQMatchesCost(project)
    );

    // UPM ↔ Vision
    pairs.upm_vision = this._scorePair(
      project, 'UPM', 'Vision AI',
      this._checkUPMMatchesVision(project)
    );

    for (const [key, result] of Object.entries(pairs)) {
      allScores.push({
        pair: key,
        models: result.models,
        consistency: result.consistency,
        issues: result.issues,
        passed: result.passed,
      });
    }

    // Aggregate
    const totalConsistency = allScores.reduce((s, p) => s + p.consistency, 0) / allScores.length;
    const passedCount = allScores.filter(p => p.passed).length;
    const failedPairs = allScores.filter(p => !p.passed);
    const blocked = failedPairs.length > 0;

    const result = {
      projectId,
      timestamp: new Date().toISOString(),
      totalPairs: allScores.length,
      averageConsistency: Math.round(totalConsistency * 100) / 100,
      passedPairs: passedCount,
      failedPairs: failedPairs.length,
      blocked,
      threshold: this.defaultThreshold,
      pairs: allScores,
      failedDetails: failedPairs.map(f => ({
        pair: f.pair,
        consistency: f.consistency,
        issues: f.issues,
      })),
      verdict: blocked ? 'blocked' : 'consistent',
    };

    // Cross-model validator reuse
    if (this.crossModelValidator && !blocked) {
      const cvResult = this.crossModelValidator.runAll(project);
      if (cvResult && !cvResult.passed) {
        result.blocked = true;
        result.verdict = 'blocked';
        result.crossModelIssues = cvResult.rules?.filter(r => !r.passed).map(r => r.message) || [];
      }
    }

    // EDL trace
    if (this.edl) {
      project.traceEvent('consistency_scored', 'ConsistencyScorer', {
        averageConsistency: result.averageConsistency,
        blocked: result.blocked,
        pairsChecked: allScores.length,
      });
    }

    this._scoreHistory.push(result);
    return result;
  }

  /**
   * Get the minimum consistency score across all pairs.
   */
  minConsistency(projectId) {
    const scores = this._scoreHistory
      .filter(s => projectId ? s.projectId === projectId : true)
      .flatMap(s => s.pairs || []);

    if (scores.length === 0) return 0;
    return Math.min(...scores.map(s => s.consistency));
  }

  /**
   * Check if a specific pair is blocked.
   */
  isBlocked(projectId, pair) {
    const entry = this._scoreHistory
      .filter(s => s.projectId === projectId)
      .pop();
    if (!entry) return false;
    if (pair) {
      const p = entry.pairs?.find(pp => pp.pair === pair);
      return p ? !p.passed : false;
    }
    return entry.blocked;
  }

  /**
   * Get the consistency trend over time (last N scores).
   */
  trend(projectId, count = 10) {
    const relevant = this._scoreHistory
      .filter(s => s.projectId === projectId)
      .slice(-count);

    return relevant.map(s => ({
      timestamp: s.timestamp,
      consistency: s.averageConsistency,
      blocked: s.blocked,
    }));
  }

  _scorePair(project, modelA, modelB, checkResult) {
    const consistency = checkResult.score;
    const passed = consistency >= this.defaultThreshold;

    return {
      models: [modelA, modelB],
      consistency: Math.round(consistency * 100) / 100,
      score: Math.round(consistency * 100) / 100,
      passed,
      threshold: this.defaultThreshold,
      issues: checkResult.issues || [],
      details: checkResult.details || {},
    };
  }

  _checkUPMMatchesBOQ(project) {
    const upm = project.upm || project.masterPlan || project.requirements;
    const boq = project.boq;
    const issues = [];
    let score = 1.0;

    if (!upm || !boq?.items) {
      return { score: 0.5, issues: ['UPM or BOQ data missing'], details: {} };
    }

    // Check project type consistency
    const upmType = upm.projectType || upm.type;
    const boqType = this._inferProjectTypeFromBOQ(boq);
    if (upmType && boqType && upmType !== boqType) {
      issues.push(`UPM says "${upmType}" but BOQ suggests "${boqType}"`);
      score -= 0.2;
    }

    // Check area consistency
    const upmArea = upm.landArea || upm.area || upm.totalArea;
    const boqArea = this._inferAreaFromBOQ(boq);
    if (upmArea && boqArea && Math.abs(upmArea - boqArea) / upmArea > 0.2) {
      issues.push(`UPM area (${upmArea}) differs from BOQ implied area (${boqArea}) by >20%`);
      score -= 0.15;
    }

    // Check floor count consistency
    const upmFloors = upm.floors || upm.floorCount || upm.numberOfFloors;
    const boqFloors = this._inferFloorsFromBOQ(boq);
    if (upmFloors && boqFloors && upmFloors !== boqFloors) {
      issues.push(`UPM floors (${upmFloors}) differs from BOQ (${boqFloors})`);
      score -= 0.15;
    }

    return { score: Math.max(0, score), issues, details: { upmType, boqType, upmArea, boqArea, upmFloors, boqFloors } };
  }

  _checkBOQMatchesVision(project) {
    const boq = project.boq;
    const vision = project.vision;
    const issues = [];
    let score = 1.0;

    if (!boq?.items || !vision) {
      return { score: 0.5, issues: ['BOQ or Vision data missing'], details: {} };
    }

    // If vision detected floors, check BOQ has floor-related items
    const visionFloors = vision.floors || vision.features?.floors;
    if (visionFloors) {
      const floorItems = boq.items.filter(i =>
        (i.name || '').toLowerCase().includes('floor') ||
        (i.description || '').toLowerCase().includes('floor') ||
        (i.category || '').toLowerCase().includes('floor')
      );
      if (floorItems.length === 0) {
        issues.push(`Vision detected ${visionFloors} floors but BOQ has no floor items`);
        score -= 0.15;
      }
    }

    // Semantic validation reuse
    if (this.semanticValidator) {
      const sv = this.semanticValidator.validateProject(project.id);
      if (sv) {
        const visionIssues = sv.semanticIssues?.filter(i => i.rule?.includes('IMAGE') || i.rule?.includes('VISION'));
        if (visionIssues?.length > 0) {
          issues.push(...visionIssues.map(i => i.message));
          score -= 0.1 * visionIssues.length;
        }
      }
    }

    return { score: Math.max(0, score), issues, details: { visionFloors } };
  }

  _checkVisionMatchesNav(project) {
    const vision = project.vision;
    const nav = project.navigation;
    const issues = [];
    let score = 1.0;

    if (!vision || !nav) {
      return { score: 0.5, issues: ['Vision or Navigation data missing'], details: {} };
    }

    const vFloors = vision.floors || vision.features?.floors || vision.analysis?.floors;
    const nFloors = nav.floors || nav.spatialModel?.floors || nav.elements?.length;

    if (vFloors && nFloors && vFloors !== nFloors) {
      issues.push(`Vision ${vFloors} floors ≠ Navigation ${nFloors} floors`);
      score -= 0.3;
    }

    // Check dimensions
    const vArea = vision.area || vision.features?.totalArea;
    const nArea = nav.area || nav.spatialModel?.totalArea;
    if (vArea && nArea && Math.abs(vArea - nArea) / Math.max(vArea, nArea) > 0.15) {
      issues.push(`Vision area (${vArea}) differs from Navigation (${nArea})`);
      score -= 0.2;
    }

    // Vision-nav bridge cross-validation
    const navElements = nav.elements || [];
    const visionFeatures = vision.features || {};

    const nFloorsDetected = new Set(navElements.map(e => e.floor || e.level)).size;
    const vFloorsDetected = Object.keys(visionFeatures).filter(k => k.includes('floor')).length;

    if (nFloorsDetected > 0 && vFloorsDetected > 0 && nFloorsDetected !== vFloorsDetected) {
      issues.push(`Navigation has ${nFloorsDetected} unique floors, Vision has ${vFloorsDetected}`);
      score -= 0.15;
    }

    return { score: Math.max(0, score), issues, details: { vFloors, nFloors, vArea, nArea } };
  }

  _checkNavMatchesCost(project) {
    const nav = project.navigation;
    const cost = project.cost;
    const issues = [];
    let score = 1.0;

    if (!nav || !cost) {
      return { score: 0.5, issues: ['Navigation or Cost data missing'], details: {} };
    }

    // Navigation area vs cost per m²
    const nArea = nav.area || nav.spatialModel?.totalArea || 0;
    const costTotal = cost.totalCost || cost.total || 0;

    if (nArea > 0 && costTotal > 0) {
      const costPerM2 = costTotal / nArea;
      if (costPerM2 < 500) {
        issues.push(`Cost per m² (${Math.round(costPerM2)}) too low for navigation area ${nArea}`);
        score -= 0.1;
      }
      if (costPerM2 > 50000) {
        issues.push(`Cost per m² (${Math.round(costPerM2)}) too high for navigation area ${nArea}`);
        score -= 0.1;
      }
    }

    // Number of nav elements vs cost complexity
    const navCount = (nav.elements || []).length;
    const costItems = (cost.items || cost.breakdown || []).length;
    if (navCount > 0 && costItems > 0 && Math.abs(navCount - costItems) / Math.max(navCount, costItems) > 0.5) {
      issues.push(`${navCount} nav elements vs ${costItems} cost items — mismatch in complexity`);
      score -= 0.1;
    }

    return { score: Math.max(0, score), issues, details: { nArea, costTotal, navCount, costItems } };
  }

  _checkCostMatchesSchedule(project) {
    const cost = project.cost;
    const schedule = project.schedule;
    const issues = [];
    let score = 1.0;

    if (!cost || !schedule) {
      return { score: 0.5, issues: ['Cost or Schedule data missing'], details: {} };
    }

    const totalCost = cost.totalCost || cost.total || 0;
    const totalDays = schedule.totalDuration || schedule.duration || 0;
    const totalMonths = schedule.totalMonths || Math.ceil(totalDays / 30);

    if (totalCost > 0 && totalMonths > 0) {
      const costPerMonth = totalCost / totalMonths;
      if (costPerMonth < 1000 && totalCost > 100000) {
        issues.push(`Cost per month (${Math.round(costPerMonth)}) seems too low`);
        score -= 0.1;
      }
      if (costPerMonth > 10000000) {
        issues.push(`Cost per month (${Math.round(costPerMonth)}) seems too high`);
        score -= 0.1;
      }
    }

    // Phase cost distribution
    const phases = schedule.phases || schedule.milestones || [];
    if (phases.length > 0) {
      const phaseCosts = phases.filter(p => p.cost !== undefined);
      if (phaseCosts.length > 0) {
        const totalPhaseCost = phaseCosts.reduce((s, p) => s + (p.cost || 0), 0);
        if (totalCost > 0 && Math.abs(totalPhaseCost - totalCost) / totalCost > 0.2) {
          issues.push(`Phase costs (${Math.round(totalPhaseCost)}) differ from total cost (${Math.round(totalCost)})`);
          score -= 0.15;
        }
      }
    }

    return { score: Math.max(0, score), issues, details: { totalCost, totalDays, totalMonths } };
  }

  _checkScheduleMatchesRisk(project) {
    const schedule = project.schedule;
    const risk = project.risk;
    const issues = [];
    let score = 1.0;

    if (!schedule || !risk) {
      return { score: 0.5, issues: ['Schedule or Risk data missing'], details: {} };
    }

    const totalDays = schedule.totalDuration || schedule.duration || 0;
    const riskLevel = risk.overallRisk || risk.level || 0;

    // Shorter schedules should have higher risk
    if (totalDays < 60 && riskLevel < 0.3) {
      issues.push(`Schedule is short (${totalDays}d) but risk is low (${riskLevel}) — may be underestimated`);
      score -= 0.1;
    }

    // Long schedules with high risk
    if (totalDays > 730 && riskLevel > 0.7) {
      issues.push(`Long schedule (${totalDays}d) with high risk (${riskLevel}) — consider mitigation`);
      score -= 0.1;
    }

    // Risk items referencing schedule
    const riskItems = risk.risks || risk.items || [];
    if (riskItems.length > 0 && totalDays > 0) {
      const scheduleRisks = riskItems.filter(r =>
        (r.name || '').toLowerCase().includes('schedule') ||
        (r.name || '').toLowerCase().includes('delay') ||
        (r.description || '').toLowerCase().includes('time')
      );
      if (scheduleRisks.length === 0 && totalDays > 365) {
        issues.push(`Long schedule (${totalDays}d) with no schedule-related risks identified`);
        score -= 0.1;
      }
    }

    return { score: Math.max(0, score), issues, details: { totalDays, riskLevel, riskItems: riskItems.length } };
  }

  _checkBOQMatchesCost(project) {
    const boq = project.boq;
    const cost = project.cost;
    const issues = [];
    let score = 1.0;

    if (!boq?.items || !cost) {
      return { score: 0.5, issues: ['BOQ or Cost data missing'], details: {} };
    }

    const boqTotal = boq.items.reduce((s, i) => s + (i.totalCost || i.totalPrice || i.total || 0), 0);
    const costTotal = cost.totalCost || cost.total || 0;

    if (boqTotal > 0 && costTotal > 0) {
      const diff = Math.abs(boqTotal - costTotal) / Math.max(boqTotal, costTotal);
      if (diff > 0.25) {
        issues.push(`BOQ total (${Math.round(boqTotal)}) differs from Cost total (${Math.round(costTotal)}) by ${Math.round(diff * 100)}%`);
        score -= 0.3;
      }
    }

    return { score: Math.max(0, score), issues, details: { boqTotal, costTotal } };
  }

  _checkUPMMatchesVision(project) {
    const upm = project.upm || project.requirements;
    const vision = project.vision;
    const issues = [];
    let score = 1.0;

    if (!upm || !vision) {
      return { score: 0.5, issues: ['UPM or Vision data missing'], details: {} };
    }

    const upmFloors = upm.floors || upm.floorCount;
    const visFloors = vision.floors || vision.features?.floors;
    if (upmFloors && visFloors && upmFloors !== visFloors) {
      issues.push(`UPM requires ${upmFloors} floors but Vision shows ${visFloors}`);
      score -= 0.3;
    }

    const upmStyle = upm.architecturalStyle || upm.buildingType;
    const visStyle = vision.style || vision.features?.style;
    if (upmStyle && visStyle && upmStyle !== visStyle) {
      issues.push(`UPM specifies "${upmStyle}" style but Vision generated "${visStyle}"`);
      score -= 0.15;
    }

    return { score: Math.max(0, score), issues, details: { upmFloors, visFloors, upmStyle, visStyle } };
  }

  _inferProjectTypeFromBOQ(boq) {
    const items = boq.items || [];
    const names = items.map(i => (i.name || i.description || '').toLowerCase()).join(' ');

    if (names.includes('villa') || names.includes('فيلا')) return 'Villa';
    if (names.includes('apartment') || names.includes('شقة') || names.includes('building')) return 'Apartment';
    if (names.includes('mosque') || names.includes('مسجد')) return 'Mosque';
    if (names.includes('school') || names.includes('مدرسة')) return 'School';
    if (names.includes('hospital') || names.includes('مستشفى')) return 'Hospital';
    if (names.includes('commercial') || names.includes('تجاري') || names.includes('mall')) return 'Commercial';
    if (names.includes('warehouse') || names.includes('مستودع')) return 'Warehouse';
    return null;
  }

  _inferAreaFromBOQ(boq) {
    const items = boq.items || [];
    const areaItems = items.filter(i =>
      (i.unit === 'm²' || i.unit === 'sqm' || i.unit === 'م²' || i.unit === 'square meter') &&
      (i.name || '').toLowerCase().includes('area')
    );
    if (areaItems.length > 0) return areaItems.reduce((s, i) => s + (i.quantity || 0), 0);
    return null;
  }

  _inferFloorsFromBOQ(boq) {
    const items = boq.items || [];
    const floorItems = items.filter(i =>
      (i.name || '').toLowerCase().includes('floor') ||
      (i.category || '').toLowerCase().includes('floor')
    );
    if (floorItems.length > 0) return floorItems.length;
    return null;
  }

  getHistory(projectId) {
    if (projectId) return this._scoreHistory.filter(s => s.projectId === projectId);
    return this._scoreHistory;
  }
}

module.exports = ConsistencyScorer;
