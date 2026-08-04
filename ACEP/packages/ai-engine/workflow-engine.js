/**
 * ACEP Workflow Engine — Engineering Pipeline
 *
 * Defines the unified project pipeline:
 * 1. Extraction → 2. Analysis → 3. User Approval → 4. Virtual Building
 * 5. BOQ → 6. Cost → 7. Schedule → 8. Risk → 9. Quality → 10. Reports
 *
 * Each step depends on the previous. No step re-does work from scratch.
 */
class WorkflowEngine {
  constructor(ai, edl) {
    this.ai = ai;
    this.edl = edl;
  }

  /**
   * Step 0: Profile — Build Digital Project Profile (Phase 1)
   * Runs before extraction to understand the project holistically
   */
  async stepProfiling(project) {
    if (!this.ai.projectProfiler) {
      project.traceEvent('profiling_skipped', 'workflowEngine', { reason: 'profiler not available' });
      return { skipped: true };
    }
    const profile = this.ai.projectProfiler.buildProfile(project);
    project.setDigitalProfile(profile);
    return { ok: true, profile };
  }

  /**
   * Step 1: Extract — Parse description to extract project data
   */
  async stepExtraction(project, description, parseDescriptionFn) {
    project.rawInput.description = description;
    const params = parseDescriptionFn(description);
    project.setExtracted({
      type: params.type,
      typeConfidence: params.typeConfidence || 0.7,
      area: params.area,
      areaExtracted: params.area !== null,
      floors: params.floors,
      floorsExtracted: params.floors !== null,
      rooms: params.rooms || null,
      roomsExtracted: params.rooms !== null,
      bathrooms: params.bathrooms || null,
      bathroomsExtracted: params.bathrooms !== null,
      hasKitchen: params.hasKitchen || false,
      halls: params.halls || null,
      city: params.city || null,
      phase: params.phase || null,
      extractionLog: params.extractionLog || null
    });
    return params;
  }

  /**
   * Step 2: Analyze — Run AI project analysis
   */
  async stepAnalysis(project, description) {
    const effective = this._getEffectiveParams(project);
    const analysis = this.ai.projectAnalyzer.analyzeProject(description, {
      type: effective.type,
      area: effective.area,
      floors: effective.floors,
      typeConfidence: project.extracted.typeConfidence || 0.7
    });
    if (analysis.insufficientData) {
      project.metadata.workflowStep = 'analysis_failed';
      return { ok: false, error: analysis };
    }
    project.setAnalysis(analysis);
    return { ok: true, analysis };
  }

  /**
   * Step 3: Generate Virtual Building Model
   */
  async stepVirtualBuilding(project) {
    const effective = this._getEffectiveParams(project);
    const spaces = this.ai.kb.estimateSpaces(effective.type, effective.area, effective.floors);
    const totalHeight = effective.floors * 3.2;
    project.building = {
      spaces: spaces || [],
      systems: this._estimateSystems(effective.type),
      materials: [],
      structuralElements: this._estimateStructuralElements(effective.type, effective.area, effective.floors),
      totalHeight,
      hasBasement: effective.floors > 3,
      numUnits: effective.type === 'Apartment_Finishing' || effective.type === 'Apartment_Building' ? Math.round(effective.area / 80) : 1
    };
    project.metadata.workflowStep = 'building_modeled';
    project.traceEvent('virtual_building', 'workflowEngine', { spaces: spaces?.length });
    return project.building;
  }

  /**
   * Step 4: Generate BOQ
   */
  async stepBOQ(project, description) {
    const effective = this._getEffectiveParams(project);
    const extra = {
      rooms: project.approved.rooms || project.extracted.rooms,
      bathrooms: project.approved.bathrooms || project.extracted.bathrooms,
      hasKitchen: project.approved.hasKitchen || project.extracted.hasKitchen,
      halls: project.approved.halls || project.extracted.halls,
      city: project.approved.city || project.extracted.city,
      description
    };
    const boqResult = this.ai.quantityEstimator.estimateBOQ(
      effective.type, effective.area, effective.floors,
      'Standard', 'Riyadh', extra
    );
    project.setBOQ(boqResult);
    return boqResult;
  }

  /**
   * Step 5: Estimate Cost (uses BOQ data)
   */
  async stepCost(project) {
    const effective = this._getEffectiveParams(project);
    const boqItems = project.boq.items;
    const costData = this.ai.costEstimator.estimateCost(
      boqItems, effective.type, effective.area, effective.floors
    );
    project.setCost(costData);
    return costData;
  }

  /**
   * Step 6: Generate Schedule (uses analysis data)
   */
  async stepSchedule(project) {
    const effective = this._getEffectiveParams(project);
    const totalArea = project.predicted.totalArea || effective.area * effective.floors;
    const floors = project.predicted.floors || effective.floors;
    const scheduleData = this.ai.scheduleOptimizer.generateSchedule(
      effective.type, totalArea, floors
    );
    project.setSchedule(scheduleData);
    return scheduleData;
  }

  /**
   * Step 7: Analyze Risks (uses analysis data)
   */
  async stepRisks(project) {
    const effective = this._getEffectiveParams(project);
    const totalArea = project.predicted.totalArea || effective.area * effective.floors;
    const floors = project.predicted.floors || effective.floors;
    const riskData = this.ai.riskAnalyzer.analyzeRisks(
      effective.type, totalArea, floors
    );
    project.setRisks(riskData);
    return riskData;
  }

  /**
   * Step 8: Inspect Quality (uses analysis data)
   */
  async stepQuality(project) {
    const effective = this._getEffectiveParams(project);
    const totalArea = project.predicted.totalArea || effective.area * effective.floors;
    const floors = project.predicted.floors || effective.floors;
    const qualityData = this.ai.qualityInspector.inspectProject(
      effective.type, totalArea, floors
    );
    project.setQuality(qualityData);
    return qualityData;
  }

  /**
   * Run the FULL pipeline (all steps from extraction through quality)
   */
  async runFullPipeline(project, description, parseDescriptionFn) {
    const steps = [];

    // Step 0: Profile — Digital Project Understanding
    const profilingResult = await this.stepProfiling(project);
    steps.push({ name: 'profiling', status: profilingResult.ok ? 'completed' : 'skipped', data: profilingResult.profile || {} });

    // Step 1: Extract
    const params = await this.stepExtraction(project, description, parseDescriptionFn);
    steps.push({ name: 'extraction', status: 'completed', data: params });

    // Step 2: Analyze
    const analysisResult = await this.stepAnalysis(project, description);
    if (!analysisResult.ok) {
      return { ok: false, error: analysisResult.error, steps };
    }
    steps.push({ name: 'analysis', status: 'completed', data: analysisResult.analysis });

    // Step 3: Virtual Building
    const building = await this.stepVirtualBuilding(project);
    steps.push({ name: 'virtual_building', status: 'completed', data: building });

    // Step 4: BOQ
    const boq = await this.stepBOQ(project, description);
    steps.push({ name: 'boq', status: 'completed', data: boq.summary });

    // Step 5: Cost
    const cost = await this.stepCost(project);
    steps.push({ name: 'cost', status: 'completed', data: { totalCost: cost.totalCost } });

    // Step 6: Schedule
    const schedule = await this.stepSchedule(project);
    steps.push({ name: 'schedule', status: 'completed', data: { totalDays: schedule.totalDuration } });

    // Step 7: Risks
    const risks = await this.stepRisks(project);
    steps.push({ name: 'risks', status: 'completed', data: { level: risks.riskLevel } });

    // Step 8: Quality
    const quality = await this.stepQuality(project);
    steps.push({ name: 'quality', status: 'completed', data: { score: quality.qualityScore } });

    // Validate
    project.validate();
    project.metadata.status = 'completed';
    project.metadata.workflowStep = 'completed';

    return { ok: true, steps };
  }

  /**
   * Run specific steps only (skip already-completed steps)
   */
  async runFromStep(project, fromStep, description, parseDescriptionFn) {
    const stepOrder = ['profiling', 'extraction', 'analysis', 'virtual_building', 'boq', 'cost', 'schedule', 'risks', 'quality'];
    const startIdx = stepOrder.indexOf(fromStep);
    if (startIdx === -1) return { ok: false, error: `Unknown step: ${fromStep}` };

    for (let i = startIdx; i < stepOrder.length; i++) {
      const step = stepOrder[i];
      switch (step) {
        case 'profiling':
          await this.stepProfiling(project);
          break;
        case 'extraction':
          await this.stepExtraction(project, description, parseDescriptionFn);
          break;
        case 'analysis':
          await this.stepAnalysis(project, description);
          break;
        case 'virtual_building':
          await this.stepVirtualBuilding(project);
          break;
        case 'boq':
          await this.stepBOQ(project, description);
          break;
        case 'cost':
          await this.stepCost(project);
          break;
        case 'schedule':
          await this.stepSchedule(project);
          break;
        case 'risks':
          await this.stepRisks(project);
          break;
        case 'quality':
          await this.stepQuality(project);
          break;
      }
    }
    project.validate();
    return { ok: true };
  }

  /**
   * Get effective parameters (approved > extracted > null)
   */
  _getEffectiveParams(project) {
    return {
      type: project.approved.typeConfirmed ? project.approved.type : (project.extracted.type || 'Unknown'),
      area: project.approved.areaConfirmed ? project.approved.area : (project.extracted.area || 0),
      floors: project.approved.floorsConfirmed ? project.approved.floors : (project.extracted.floors || 1),
      rooms: project.approved.roomsConfirmed ? project.approved.rooms : (project.extracted.rooms || null),
      bathrooms: project.approved.bathroomsConfirmed ? project.approved.bathrooms : (project.extracted.bathrooms || null),
      hasKitchen: project.approved.kitchenConfirmed ? project.approved.hasKitchen : (project.extracted.hasKitchen || false),
    };
  }

  /**
   * Estimate building systems based on project type
   */
  _estimateSystems(type) {
    const baseSystems = ['Electrical', 'Plumbing'];
    const typeSystems = {
      Hospital: ['HVAC', 'FireProtection', 'MedicalGases', 'NurseCall', 'EmergencyPower'],
      School: ['HVAC', 'FireProtection', 'EmergencyPower'],
      Residential_Tower: ['HVAC', 'FireProtection', 'Elevator', 'EmergencyPower', 'Security'],
      Apartment_Building: ['HVAC', 'FireProtection', 'Elevator'],
      Apartment_Finishing: ['HVAC', 'FireProtection'],
      Villa: ['HVAC', 'FireProtection', 'Security'],
      Luxury_Villa: ['HVAC', 'FireProtection', 'Security', 'SmartHome'],
      Office_Building: ['HVAC', 'FireProtection', 'Elevator', 'Security'],
      Mall: ['HVAC', 'FireProtection', 'Elevator', 'Security', 'Escalator'],
      Hotel: ['HVAC', 'FireProtection', 'Elevator', 'Security', 'SmartRoom']
    };
    return [...new Set([...baseSystems, ...(typeSystems[type] || [])])];
  }

  /**
   * Estimate structural elements based on project type
   */
  _estimateStructuralElements(type, area, floors) {
    const elements = [];
    elements.push({ type: 'Foundation', material: 'ReinforcedConcrete', estimatedVolume: area * 0.3 });
    elements.push({ type: 'Columns', material: 'ReinforcedConcrete', estimatedVolume: area * 0.08 * floors });
    elements.push({ type: 'Slabs', material: 'ReinforcedConcrete', estimatedVolume: area * 0.2 * floors });
    if (type === 'Residential_Tower' || type === 'Apartment_Building') {
      elements.push({ type: 'ShearWall', material: 'ReinforcedConcrete', estimatedVolume: area * 0.05 * floors });
    }
    return elements;
  }
}

module.exports = WorkflowEngine;
