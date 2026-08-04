/**
 * Evidence Validator — Pipeline Gatekeeper
 * Blocks progression to BOQ / Visual AI / Simulation / Schedule stages
 * when critical project data is missing or unconfirmed.
 *
 * Critical fields: projectType, area, floors
 * Non-blocking warnings: city, finishing, description
 */
class EvidenceValidator {
  constructor(kb) {
    this.kb = kb;
  }

  /**
   * Validate a project profile before allowing pipeline progression.
   * @param {Object} profile - The project profile from ProjectProfiler
   * @param {string} stage - The target stage: 'boq' | 'visual' | 'simulation' | 'schedule'
   * @returns {{ valid: boolean, stage, decisions: Object, warnings: string[], blocks: string[], canProceed: boolean }}
   */
  validate(profile, stage) {
    if (!profile) {
      return this._deny(stage, 'ملف المشروع فارغ', ['لا توجد بيانات مشروع']);
    }

    const decisions = {};
    const warnings = [];
    const blocks = [];
    const stageGate = this._stageGate(stage);

    // ── Project Type ──
    const type = profile.projectType;
    if (!type || !type.value) {
      decisions.projectType = { valid: false, required: true, detail: 'نوع المشروع غير محدد', confidence: 0 };
      blocks.push('نوع المشروع غير محدد — يرجى إدخال نوع المشروع');
    } else if (type.confidence < stageGate.minTypeConfidence) {
      decisions.projectType = { valid: false, required: true, detail: `نوع المشروع: ${type.value} (ثقة ${type.confidence}%) — دون الحد الأدنى ${stageGate.minTypeConfidence}%`, confidence: type.confidence };
      blocks.push(`ثقة نوع المشروع (${type.confidence}%) أقل من الحد المطلوب (${stageGate.minTypeConfidence}%)`);
    } else {
      decisions.projectType = { valid: true, required: true, detail: type.value, confidence: type.confidence };
    }

    // ── Area ──
    const area = profile.physical?.area;
    if (!area || area.value === null || area.value === undefined) {
      decisions.area = { valid: false, required: stageGate.areaRequired, detail: 'المساحة غير محددة', confidence: 0 };
      if (stageGate.areaRequired) blocks.push('المساحة غير محددة — يرجى إدخال المساحة');
      else warnings.push('المساحة غير محددة — بعض التقديرات قد تكون غير دقيقة');
    } else if (area.value <= 0) {
      decisions.area = { valid: false, required: stageGate.areaRequired, detail: 'المساحة يجب أن تكون أكبر من صفر', confidence: area.confidence };
      blocks.push('المساحة المدخلة غير صالحة');
    } else {
      decisions.area = { valid: true, required: stageGate.areaRequired, detail: `${area.value} م²`, confidence: area.confidence };
    }

    // ── Floors ──
    const floors = profile.physical?.floors;
    if (!floors || floors.value === null || floors.value === undefined) {
      decisions.floors = { valid: false, required: stageGate.floorsRequired, detail: 'عدد الأدوار غير محدد', confidence: 0 };
      if (stageGate.floorsRequired) blocks.push('عدد الأدوار غير محدد — يرجى إدخال عدد الأدوار');
      else warnings.push('عدد الأدوار غير محدد — بعض التقديرات قد تكون غير دقيقة');
    } else if (floors.value <= 0) {
      decisions.floors = { valid: false, required: stageGate.floorsRequired, detail: 'عدد الأدوار يجب أن يكون أكبر من صفر', confidence: floors.confidence };
      blocks.push('عدد الأدوار المدخل غير صالح');
    } else {
      decisions.floors = { valid: true, required: stageGate.floorsRequired, detail: `${floors.value} أدوار`, confidence: floors.confidence };
    }

    // ── City (non-blocking) ──
    const city = profile.physical?.city || profile.projectType?.city;
    if (!city || city.value === null) {
      decisions.city = { valid: false, required: false, detail: 'المدينة غير محددة', confidence: 0 };
      warnings.push('المدينة غير محددة — أسعار المواد قد لا تكون دقيقة');
    } else {
      decisions.city = { valid: true, required: false, detail: city.value, confidence: city.confidence };
    }

    // ── Description ──
    if (profile.dataSources && !profile.dataSources.some(s => s.name === 'description')) {
      warnings.push('لا يوجد وصف للمشروع — يرجى إضافة وصف للحصول على تحليل أفضل');
    }

    // ── Finishing (recommendation only) ──
    const finishing = profile.finishing;
    if (!finishing || !finishing.value) {
      warnings.push('مستوى التشطيب غير محدد — سيتم استخدام تشطيب قياسي');
    }

    const canProceed = blocks.length === 0;
    const severity = canProceed ? 'passed' : 'blocked';

    return {
      valid: canProceed,
      stage,
      severity,
      decisions,
      warnings,
      blocks,
      canProceed,
      summary: canProceed
        ? `✓ جميع البيانات الأساسية متوفرة — يمكن المتابعة إلى ${stage}`
        : `✗ البيانات غير كافية — تم منع المتابعة إلى ${stage}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gate configuration per stage — defines minimum requirements.
   * Each stage defines what data is mandatory (required) vs optional.
   */
  _stageGate(stage) {
    const gates = {
      boq:        { minTypeConfidence: 30, areaRequired: true,  floorsRequired: true  },
      visual:     { minTypeConfidence: 20, areaRequired: false, floorsRequired: false },
      simulation: { minTypeConfidence: 40, areaRequired: true,  floorsRequired: true  },
      schedule:   { minTypeConfidence: 30, areaRequired: true,  floorsRequired: true  },
    };
    return gates[stage] || gates.boq;
  }

  /**
   * Quick check for BOQ readiness.
   * Used by the pipeline to make early decisions.
   */
  canGenerateBOQ(profile) {
    const result = this.validate(profile, 'boq');
    return result.canProceed;
  }

  _deny(stage, reason, blocks = []) {
    return {
      valid: false,
      stage,
      severity: 'blocked',
      decisions: {},
      warnings: [],
      blocks: [reason, ...blocks],
      canProceed: false,
      summary: `✗ ${reason}`,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = EvidenceValidator;
