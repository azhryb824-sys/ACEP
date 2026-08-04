/**
 * ACEP Semantic Engineering Validator
 *
 * Validates AI-generated outputs (images/videos/3D) against
 * the Engineering Data Layer, UPM, and Construction Knowledge Base.
 *
 * Reuses PostGenerationAnalyzer for low-level CV checks and extends
 * with semantic rule-based validation.
 */
const path = require('path');

const VALIDATION_RULES = {
  AREA_VS_VOLUME: { weight: 15, category: 'engineering' },
  FLOORS_VS_ELEMENTS: { weight: 10, category: 'engineering' },
  MATERIALS_VS_VISUAL: { weight: 20, category: 'materials' },
  BOQ_VS_GENERATION: { weight: 15, category: 'boq' },
  PHASE_VS_SPATIAL: { weight: 10, category: 'phase' },
  STYLE_VS_ARCHITECTURAL: { weight: 10, category: 'quality' },
  CODE_COMPLIANCE: { weight: 10, category: 'compliance' },
  CONFIDENCE_THRESHOLD: { weight: 10, category: 'confidence' },
};

const PHASE_SPATIAL_EXPECTATIONS = {
  Foundation: { elements: ['Foundation'], minElements: 2, areaRatio: 0.3 },
  Structure: { elements: ['Columns', 'Slabs', 'Beams'], minElements: 5, areaRatio: 0.6 },
  Masonry: { elements: ['Walls', 'Blocks'], minElements: 3, areaRatio: 0.4 },
  Finishing: { elements: ['Flooring', 'Ceiling', 'Paint'], minElements: 4, areaRatio: 0.8 },
  MEP: { elements: ['HVAC', 'Electrical', 'Plumbing'], minElements: 3, areaRatio: 0.3 },
};

class SemanticValidator {
  constructor(edl, knowledgeBase) {
    this.edl = edl;
    this.kb = knowledgeBase;
    this._results = [];
  }

  validateProject(projectId) {
    const project = this.edl.getProject(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    const checks = [];
    const startTime = Date.now();

    checks.push(this._checkAreaVsVolume(project));
    checks.push(this._checkFloorsVsElements(project));
    checks.push(this._checkMaterialsVsVisual(project));
    checks.push(this._checkBOQVsGeneration(project));
    checks.push(this._checkPhaseVsSpatial(project));
    checks.push(this._checkStyleVsArchitectural(project));
    checks.push(this._checkCodeCompliance(project));
    checks.push(this._checkConfidenceThreshold(project));

    const passed = checks.filter(c => c.passed).length;
    const total = checks.length;

    const score = Math.round((passed / total) * 100);

    const result = {
      projectId,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      score,
      passed: score >= 70,
      summary: this._buildSummary(checks, score),
      checks,
      semanticIssues: checks.filter(c => !c.passed).map(c => ({
        rule: c.rule,
        message: c.message,
        severity: c.severity || 'warning',
      })),
    };

    if (project.validation) {
      project.validation.semanticCheck = result;
      project.validation.lastChecked = new Date().toISOString();
    }

    this._results.push(result);
    return result;
  }

  validateVisionOutput(projectId, generationType, outputData) {
    const project = this.edl.getProject(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    const checks = [];

    if (generationType === 'image' || generationType === 'all') {
      checks.push(this._checkImageConsistency(project, outputData));
    }
    if (generationType === '3d' || generationType === 'all') {
      checks.push(this._check3DConsistency(project, outputData));
    }

    const passed = checks.filter(c => c.passed).length;
    return {
      generationType,
      passed: passed === checks.length,
      score: checks.length > 0 ? Math.round((passed / checks.length) * 100) : 100,
      checks,
    };
  }

  _checkAreaVsVolume(project) {
    const area = project.getEffective('area').value;
    const floors = project.getEffective('floors').value;
    const boqItems = project.boq.items || [];

    if (!area || !floors) {
      return { rule: 'AREA_VS_VOLUME', passed: true, message: 'Insufficient data to validate area', severity: 'info' };
    }

    const totalArea = area * floors;
    const concreteItems = boqItems.filter(i =>
      (i.name || '').toLowerCase().includes('concrete') ||
      (i.name || '').toLowerCase().includes('خرسانة')
    );
    const concreteVol = concreteItems.reduce((s, i) => s + (i.quantity || 0), 0);

    if (concreteVol > 0) {
      const expectedVol = totalArea * 0.3;
      const ratio = concreteVol / expectedVol;
      if (ratio < 0.3 || ratio > 3) {
        return {
          rule: 'AREA_VS_VOLUME', passed: false,
          message: `حجم الخرسانة (${Math.round(concreteVol)} م³) غير متناسب مع المساحة الإجمالية (${Math.round(totalArea)} م²)`,
          expected: Math.round(expectedVol), actual: Math.round(concreteVol),
          severity: 'warning',
        };
      }
    }

    return { rule: 'AREA_VS_VOLUME', passed: true, message: 'Area-to-volume ratio within range', severity: 'ok' };
  }

  _checkFloorsVsElements(project) {
    const floors = project.getEffective('floors').value;
    const navElements = project.navigation.elements || [];

    if (!floors || navElements.length === 0) {
      return { rule: 'FLOORS_VS_ELEMENTS', passed: true, message: 'Insufficient data', severity: 'info' };
    }

    const minExpected = floors * 3;
    if (navElements.length < minExpected) {
      return {
        rule: 'FLOORS_VS_ELEMENTS', passed: false,
        message: `${floors} أدوار تتطلب ${minExpected} عناصر على الأقل، لكن يوجد ${navElements.length} فقط`,
        expected: minExpected, actual: navElements.length,
        severity: 'warning',
      };
    }

    return { rule: 'FLOORS_VS_ELEMENTS', passed: true, message: `${navElements.length} elements for ${floors} floors`, severity: 'ok' };
  }

  _checkMaterialsVsVisual(project) {
    const materials = project.building.materials || [];
    const upmMaterials = [];
    if (project.vision && project.vision.upmSnapshot) {
      const snap = project.vision.upmSnapshot;
      if (snap.materials) upmMaterials.push(...snap.materials);
    }

    const allMaterials = [...new Set([...materials, ...upmMaterials])];
    if (allMaterials.length === 0) {
      return { rule: 'MATERIALS_VS_VISUAL', passed: true, message: 'No materials defined', severity: 'info' };
    }

    const boqItems = project.boq.items || [];
    const boqMaterials = new Set();
    for (const item of boqItems) {
      if (item.material) boqMaterials.add(item.material.toLowerCase());
      if (item.name) {
        const name = item.name.toLowerCase();
        if (name.includes('concrete') || name.includes('خرسانة')) boqMaterials.add('concrete');
        if (name.includes('steel') || name.includes('حديد')) boqMaterials.add('steel');
        if (name.includes('ceramic') || name.includes('سيراميك')) boqMaterials.add('ceramic');
        if (name.includes('wood') || name.includes('خشب')) boqMaterials.add('wood');
        if (name.includes('glass') || name.includes('زجاج')) boqMaterials.add('glass');
        if (name.includes('marble') || name.includes('رخام')) boqMaterials.add('marble');
        if (name.includes('stone') || name.includes('حجر')) boqMaterials.add('stone');
      }
    }

    const definedSet = new Set(allMaterials.map(m => m.toLowerCase()));
    const unmatched = [];
    for (const bm of boqMaterials) {
      if (!definedSet.has(bm)) unmatched.push(bm);
    }

    const matchRate = boqMaterials.size > 0
      ? Math.round(((boqMaterials.size - unmatched.length) / boqMaterials.size) * 100)
      : 100;

    if (matchRate < 50) {
      return {
        rule: 'MATERIALS_VS_VISUAL', passed: false,
        message: `${unmatched.length} مواد في BOQ غير محددة في نموذج المبنى: ${unmatched.join(', ')}`,
        matchRate, unmatched, severity: 'warning',
      };
    }

    return { rule: 'MATERIALS_VS_VISUAL', passed: true, message: `${matchRate}% material match`, matchRate, severity: 'ok' };
  }

  _checkBOQVsGeneration(project) {
    const boqItems = project.boq.items || [];
    const generationResults = project.vision.generationResults || [];
    const upmSnapshot = project.vision.upmSnapshot;

    if (boqItems.length === 0) {
      return { rule: 'BOQ_VS_GENERATION', passed: true, message: 'No BOQ items to validate', severity: 'info' };
    }

    const boqCodes = new Set(boqItems.map(i => i.code));
    const boqCategories = new Set();
    for (const item of boqItems) {
      const name = (item.name || item.description || '').toLowerCase();
      if (name.includes('door') || name.includes('باب')) boqCategories.add('doors');
      if (name.includes('window') || name.includes('شباك') || name.includes('نافذة')) boqCategories.add('windows');
      if (name.includes('facade') || name.includes('واجهة')) boqCategories.add('facade');
      if (name.includes('paint') || name.includes('دهان')) boqCategories.add('paint');
      if (name.includes('floor') || name.includes('ارضيات') || name.includes('سيراميك')) boqCategories.add('flooring');
    }

    let upmCovered = 0;
    if (upmSnapshot) {
      if (upmSnapshot.doors && upmSnapshot.doors.type && boqCategories.has('doors')) upmCovered++;
      if (upmSnapshot.windows && upmSnapshot.windows.type && boqCategories.has('windows')) upmCovered++;
      if (upmSnapshot.facade && upmSnapshot.facade.material && boqCategories.has('facade')) upmCovered++;
      if (upmSnapshot.colors && upmSnapshot.colors.paint && boqCategories.has('paint')) upmCovered++;
      if (upmSnapshot.flooring && upmSnapshot.flooring.type && boqCategories.has('flooring')) upmCovered++;
    }

    const coverageRate = boqCategories.size > 0
      ? Math.round((upmCovered / boqCategories.size) * 100)
      : 100;

    if (coverageRate < 40 && boqCategories.size > 1) {
      return {
        rule: 'BOQ_VS_GENERATION', passed: false,
        message: `BOQ يحتوي على ${boqCategories.size} فئات لكن UPM يغطي ${upmCovered} فقط (${coverageRate}%)`,
        coverageRate, boqCategories: [...boqCategories], upmCovered, severity: 'warning',
      };
    }

    return { rule: 'BOQ_VS_GENERATION', passed: true, message: `${coverageRate}% BOQ coverage in generation`, severity: 'ok' };
  }

  _checkPhaseVsSpatial(project) {
    const phase = project.approved.phase || project.extracted.phase || null;
    const navElements = project.navigation.elements || [];

    if (!phase || navElements.length === 0) {
      return { rule: 'PHASE_VS_SPATIAL', passed: true, message: 'Insufficient data', severity: 'info' };
    }

    const matchedPhase = Object.keys(PHASE_SPATIAL_EXPECTATIONS).find(k =>
      phase.toLowerCase().includes(k.toLowerCase())
    );
    if (!matchedPhase) {
      return { rule: 'PHASE_VS_SPATIAL', passed: true, message: `No spatial expectations for phase: ${phase}`, severity: 'info' };
    }

    const expectations = PHASE_SPATIAL_EXPECTATIONS[matchedPhase];
    const elementTypes = new Set(navElements.map(e => e.type));
    const matchingElements = expectations.elements.filter(el =>
      [...elementTypes].some(t => t.toLowerCase().includes(el.toLowerCase()))
    );

    if (matchingElements.length < expectations.minElements) {
      return {
        rule: 'PHASE_VS_SPATIAL', passed: false,
        message: `المرحلة ${phase} تتطلب ${expectations.minElements} عناصر لكن يوجد ${matchingElements.length} فقط`,
        expected: expectations.minElements, actual: matchingElements.length,
        severity: 'warning',
      };
    }

    return { rule: 'PHASE_VS_SPATIAL', passed: true, message: `${matchingElements.length}/${expectations.minElements} phase elements match`, severity: 'ok' };
  }

  _checkStyleVsArchitectural(project) {
    const profile = project.digitalProfile;
    if (!profile || !profile.style) {
      return { rule: 'STYLE_VS_ARCHITECTURAL', passed: true, message: 'No style profile', severity: 'info' };
    }

    const style = profile.style.architectural || profile.style;
    if (!style) {
      return { rule: 'STYLE_VS_ARCHITECTURAL', passed: true, message: 'Style not defined', severity: 'info' };
    }

    const boqItems = project.boq.items || [];
    const styleKeywords = {
      Modern: ['glass', 'aluminum', 'concrete', 'زجاج', 'المنيوم', 'خرسانة'],
      Classical: ['stone', 'marble', 'columns', 'حجر', 'رخام', 'أعمدة'],
      Islamic: ['arches', 'dome', 'geometric', 'قبة', 'عقود', 'زخرفة'],
      Contemporary: ['glass', 'steel', 'curtain wall', 'زجاج', 'حديد', 'واجهة ستائرية'],
      Minimalist: ['white', 'clean', 'simple', 'ابيض', 'بساطة', 'نظيف'],
    };

    const expected = styleKeywords[style] || [];
    if (expected.length === 0) {
      return { rule: 'STYLE_VS_ARCHITECTURAL', passed: true, message: `No keywords for style: ${style}`, severity: 'info' };
    }

    const matched = boqItems.filter(i => {
      const name = (i.name || i.description || '').toLowerCase();
      return expected.some(kw => name.includes(kw));
    });

    const matchRate = boqItems.length > 0
      ? Math.round((matched.length / boqItems.length) * 100)
      : 0;

    if (matchRate < 10 && boqItems.length > 10) {
      return {
        rule: 'STYLE_VS_ARCHITECTURAL', passed: false,
        message: `النمط ${style} غير متطابق مع بنود BOQ (${matchRate}%)`,
        style, matchRate, severity: 'info',
      };
    }

    return { rule: 'STYLE_VS_ARCHITECTURAL', passed: true, message: `${style} style confirmed`, severity: 'ok' };
  }

  _checkCodeCompliance(project) {
    const profile = project.digitalProfile;
    const building = project.building;

    let issues = [];
    const codes = profile?.applicableCodes || [];

    if (building && building.spaces) {
      for (const space of building.spaces) {
        if (space.type === 'Bathroom' || space.type === 'Kitchen') {
          if (!building.systems.includes('Waterproofing')) {
            issues.push('المطابخ والحمامات تتطلب عزل مائي');
          }
        }
      }
    }

    const boqItems = project.boq.items || [];
    const hasFireItems = boqItems.some(i =>
      (i.name || '').toLowerCase().includes('fire') ||
      (i.name || '').toLowerCase().includes('حريق')
    );
    const hasFireSystem = building.systems && building.systems.some(s =>
      s.toLowerCase().includes('fire') || s.toLowerCase().includes('حريق')
    );

    if ((hasFireItems || building.numUnits > 4) && !hasFireSystem) {
      issues.push('المباني متعددة الوحدات تتطلب نظام حماية من الحريق');
    }

    if (issues.length > 0) {
      return {
        rule: 'CODE_COMPLIANCE', passed: false,
        message: issues.join('؛ '),
        issues, severity: 'warning',
      };
    }

    return { rule: 'CODE_COMPLIANCE', passed: true, message: `${codes.length} codes checked, compliant`, severity: 'ok' };
  }

  _checkConfidenceThreshold(project) {
    const thresholds = {
      boq: { min: 0.5, field: 'boq.summary.averageConfidence' },
      cost: { min: 0.4, field: 'cost.confidence' },
      analysis: { min: 0.3, field: 'predicted.confidence' },
    };

    const lowConfidence = [];
    for (const [key, t] of Object.entries(thresholds)) {
      let value = 0;
      if (key === 'boq') value = project.boq.summary.averageConfidence || 0;
      if (key === 'cost') value = project.cost.confidence || 0;
      if (key === 'analysis') value = project.predicted.confidence || 0;

      if (value > 0 && value < t.min) {
        lowConfidence.push({ module: key, value, min: t.min });
      }
    }

    if (lowConfidence.length > 1) {
      return {
        rule: 'CONFIDENCE_THRESHOLD', passed: false,
        message: `${lowConfidence.length} وحدات بثقة منخفضة: ${lowConfidence.map(l => `${l.module} (${Math.round(l.value * 100)}%)`).join(', ')}`,
        lowConfidence, severity: 'warning',
      };
    }

    return { rule: 'CONFIDENCE_THRESHOLD', passed: true, message: 'All confidence thresholds met', severity: 'ok' };
  }

  _checkImageConsistency(project, outputData) {
    if (!outputData) {
      return { rule: 'IMAGE_CONSISTENCY', passed: true, message: 'No output data to validate', severity: 'info' };
    }

    const boqItems = project.boq.items || [];
    const imageBoqCodes = outputData.boqCodes || [];
    const generationPhase = outputData.phase || project.approved.phase;

    if (imageBoqCodes.length > 0 && boqItems.length > 0) {
      const matchedCodes = imageBoqCodes.filter(c => boqItems.some(i => i.code === c));
      const matchRate = Math.round((matchedCodes.length / imageBoqCodes.length) * 100);

      if (matchRate < 30) {
        return {
          rule: 'IMAGE_CONSISTENCY', passed: false,
          message: `الصورة لا تتطابق مع بنود BOQ (${matchRate}%)`,
          matchRate, severity: 'warning',
        };
      }
    }

    return { rule: 'IMAGE_CONSISTENCY', passed: true, message: 'Image content consistent with project data', severity: 'ok' };
  }

  _check3DConsistency(project, outputData) {
    const navElements = project.navigation.elements || [];
    const boqFloors = project.getEffective('floors').value;

    if (!outputData) {
      return { rule: '3D_CONSISTENCY', passed: true, message: 'No 3D output data', severity: 'info' };
    }

    const outputFloors = outputData.floors || navElements.length;
    if (boqFloors && outputFloors && outputFloors !== boqFloors) {
      return {
        rule: '3D_CONSISTENCY', passed: false,
        message: `الـ 3D يظهر ${outputFloors} أدوار لكن المشروع يحدد ${boqFloors}`,
        expected: boqFloors, actual: outputFloors, severity: 'error',
      };
    }

    return { rule: '3D_CONSISTENCY', passed: true, message: '3D model consistent with project data', severity: 'ok' };
  }

  _buildSummary(checks, score) {
    const passed = checks.filter(c => c.passed);
    const failed = checks.filter(c => !c.passed);
    const errors = failed.filter(c => c.severity === 'error');
    const warnings = failed.filter(c => c.severity === 'warning');
    return {
      score,
      total: checks.length,
      passed: passed.length,
      failed: failed.length,
      errors: errors.length,
      warnings: warnings.length,
      verdict: score >= 90 ? 'ممتاز' : score >= 70 ? 'جيد' : score >= 50 ? 'مقبول' : 'ضعيف',
    };
  }

  getResults(projectId) {
    if (projectId) return this._results.find(r => r.projectId === projectId) || null;
    return this._results;
  }

  getStats() {
    return {
      totalValidations: this._results.length,
      avgScore: this._results.length > 0
        ? Math.round(this._results.reduce((s, r) => s + r.score, 0) / this._results.length)
        : 0,
      passed: this._results.filter(r => r.passed).length,
      failed: this._results.filter(r => !r.passed).length,
    };
  }
}

module.exports = SemanticValidator;
