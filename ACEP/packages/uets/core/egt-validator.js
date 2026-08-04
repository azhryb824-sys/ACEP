const { EngineeringGroundTruth } = require('./engineering-ground-truth');

class EGTValidator {
  constructor() {
    this.MIN_BOQ_ITEMS = 1;
    this.MIN_CONFIDENCE = 0.1;
    this.MAX_COST_PER_M2 = 50000;
    this.MIN_COST_PER_M2 = 200;
    this.MAX_DURATION_MONTHS = 120;
    this.VALID_PROJECT_TYPES = ['Villa', 'Building', 'Tower', 'Hotel', 'Mosque', 'Hospital', 'School', 'Mall', 'Warehouse', 'Bridge', 'Road', 'Factory', 'Farm', 'Infrastructure', 'WaterTreatment', 'Sports', 'Office', 'Residential', 'Commercial', 'Apartment', 'Compound', 'Palace', 'MixedUse'];
    this.VALID_FINISHING = ['Raw', 'Standard', 'Good', 'Premium', 'Luxury', 'UltraLuxury'];
  }

  validate(egt) {
    const errors = [];
    const warnings = [];

    if (!egt.uuid) errors.push('Missing uuid');
    if (!egt.classification || !egt.classification.projectType) {
      errors.push('Missing classification.projectType');
    } else if (!this.VALID_PROJECT_TYPES.includes(egt.classification.projectType)) {
      warnings.push(`Unknown project type: ${egt.classification.projectType}`);
    }

    if (!egt.geometry || !egt.geometry.totalArea) {
      errors.push('Missing geometry.totalArea');
    } else if (egt.geometry.totalArea <= 0) {
      errors.push(`Invalid totalArea: ${egt.geometry.totalArea}`);
    }

    if (egt.geometry.floors === undefined || egt.geometry.floors === null) {
      warnings.push('Missing geometry.floors');
    } else if (egt.geometry.floors <= 0) {
      errors.push(`Invalid floors: ${egt.geometry.floors}`);
    }

    if (egt.geometry.finishing && !this.VALID_FINISHING.includes(egt.geometry.finishing)) {
      warnings.push(`Unknown finishing level: ${egt.geometry.finishing}`);
    }

    if (egt.boq && egt.boq.length > 0) {
      for (let i = 0; i < egt.boq.length; i++) {
        const item = egt.boq[i];
        if (!item.code) warnings.push(`BOQ item ${i} missing code`);
        if (item.quantity < 0) errors.push(`BOQ item ${item.code || i} negative quantity: ${item.quantity}`);
        if (item.unitPrice < 0) errors.push(`BOQ item ${item.code || i} negative unitPrice: ${item.unitPrice}`);
      }
    }

    if (egt.cost && egt.cost.total > 0) {
      if (egt.geometry.totalArea > 0) {
        const perM2 = egt.cost.total / egt.geometry.totalArea;
        if (perM2 > this.MAX_COST_PER_M2) warnings.push(`Cost per m² (${perM2.toFixed(0)} SAR) exceeds max (${this.MAX_COST_PER_M2})`);
        if (perM2 < this.MIN_COST_PER_M2) warnings.push(`Cost per m² (${perM2.toFixed(0)} SAR) below min (${this.MIN_COST_PER_M2})`);
      }
    }

    if (egt.schedule && egt.schedule.totalDurationMonths > this.MAX_DURATION_MONTHS) {
      warnings.push(`Duration (${egt.schedule.totalDurationMonths} months) exceeds max (${this.MAX_DURATION_MONTHS})`);
    }

    if (egt.risks && egt.risks.length > 0) {
      for (let i = 0; i < egt.risks.length; i++) {
        const r = egt.risks[i];
        if (r.probability < 0 || r.probability > 1) errors.push(`Risk ${i} probability out of range: ${r.probability}`);
        if (r.impact < 0 || r.impact > 1) errors.push(`Risk ${i} impact out of range: ${r.impact}`);
      }
    }

    if (egt.confidence < this.MIN_CONFIDENCE) {
      warnings.push(`Low confidence: ${egt.confidence}`);
    }

    return {
      valid: errors.length === 0,
      passed: errors.length === 0 && warnings.length === 0,
      errors,
      warnings,
      score: this._calculateScore(egt, errors, warnings)
    };
  }

  validateBatch(egts) {
    let valid = 0, invalid = 0, totalErrors = 0, totalWarnings = 0;
    for (const egt of egts) {
      const result = this.validate(egt);
      if (result.valid) valid++; else invalid++;
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
    }
    return {
      total: egts.length,
      valid,
      invalid,
      totalErrors,
      totalWarnings,
      validityRate: egts.length > 0 ? (valid / egts.length * 100).toFixed(1) + '%' : '0%'
    };
  }

  checkConsistency(egt) {
    const checks = {};

    if (egt.boq.length > 0 && egt.cost.total > 0) {
      const boqTotal = egt.boq.reduce((s, i) => s + i.totalPrice, 0);
      const ratio = boqTotal > 0 ? Math.min(egt.cost.total, boqTotal * 3) / Math.max(egt.cost.total, boqTotal * 0.3) : 0;
      checks.boqVsCost = Math.min(1, Math.max(0, 1 - Math.abs(1 - ratio) * 0.5));
    } else {
      checks.boqVsCost = 0;
    }

    if (egt.schedule.totalDurationMonths > 0 && egt.cost.total > 0) {
      const monthlyCost = egt.cost.total / egt.schedule.totalDurationMonths;
      const expectedMonthlyCost = egt.geometry.totalArea * 100;
      const costRatio = Math.min(monthlyCost, expectedMonthlyCost * 3) / Math.max(monthlyCost, expectedMonthlyCost * 0.1);
      checks.costVsSchedule = Math.min(1, Math.max(0, 1 - Math.abs(1 - costRatio) * 0.5));
    } else {
      checks.costVsSchedule = 0;
    }

    if (egt.boq.length > 0 && egt.images.generated.length > 0) {
      checks.boqVsImages = 0.7;
    } else {
      checks.boqVsImages = 0;
    }

    const overall = Object.values(checks).reduce((s, v) => s + v, 0) / Math.max(1, Object.keys(checks).length);

    return {
      checks,
      overallScore: Math.round(overall * 100) / 100,
      passed: overall >= 0.5
    };
  }

  checkIntegrity(egt) {
    const issues = [];

    if (egt.boq.length > 0) {
      const boqTotal = egt.boq.reduce((s, i) => s + i.totalPrice, 0);
      const computedTotal = egt.boq.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
      if (Math.abs(boqTotal - computedTotal) > 0.01 && boqTotal > 0) {
        issues.push(`BOQ totalPrice mismatch: sum=${boqTotal}, computed=${computedTotal}`);
      }
    }

    if (egt.cost.total > 0 && egt.cost.breakdown) {
      const bd = egt.cost.breakdown;
      const sumParts = (bd.materials || 0) + (bd.labor || 0) + (bd.equipment || 0) + (bd.subcontractor || 0) + (bd.overhead || 0) + (bd.contingency || 0);
      if (sumParts > 0 && Math.abs(sumParts - egt.cost.total) / egt.cost.total > 0.05) {
        issues.push(`Cost breakdown sum (${sumParts}) differs from total (${egt.cost.total}) by >5%`);
      }
    }

    if (egt.schedule.phases.length > 0) {
      const totalDuration = egt.schedule.phases.reduce((s, p) => s + p.durationMonths, 0);
      if (totalDuration > egt.schedule.totalDurationMonths * 1.1) {
        issues.push(`Phase durations sum (${totalDuration}) exceeds total (${egt.schedule.totalDurationMonths})`);
      }
    }

    return {
      passed: issues.length === 0,
      issues,
      status: issues.length === 0 ? 'pass' : 'warning'
    };
  }

  calculateCompleteness(egt) {
    let score = 0;
    let total = 0;

    if (egt.uuid) { score += 5; } total += 5;
    if (egt.classification && egt.classification.projectType && egt.classification.projectType !== 'Building') { score += 10; } total += 10;
    if (egt.geometry.totalArea > 0) { score += 15; } total += 15;
    if (egt.geometry.floors > 0) { score += 10; } total += 10;
    if (egt.geometry.finishing && egt.geometry.finishing !== 'Standard') { score += 5; } total += 5;
    if (egt.location.city) { score += 5; } total += 5;
    if (egt.boq.length > 0) { score += 15; } total += 15;
    if (egt.cost.total > 0) { score += 10; } total += 10;
    if (egt.schedule.totalDurationMonths > 0) { score += 10; } total += 10;
    if (egt.risks.length > 0) { score += 5; } total += 5;
    if (egt.materials.length > 0) { score += 5; } total += 5;
    if (egt.images.generated.length > 0) { score += 5; } total += 5;

    return total > 0 ? Math.round((score / total) * 10000) / 100 : 0;
  }

  _calculateScore(egt, errors, warnings) {
    let score = 100;
    score -= errors.length * 15;
    score -= warnings.length * 5;
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = { EGTValidator };
