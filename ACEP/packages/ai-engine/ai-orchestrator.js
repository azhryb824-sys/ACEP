/**
 * ACEP AI Orchestrator — Unified Pipeline Controller
 *
 * Enforces the mandatory model execution sequence:
 * 1. Project Understanding → 2. Construction Knowledge Base
 * 3. BOQ AI → 4. Quantity AI → 5. Cost AI → 6. Schedule AI
 * 7. Vision AI → 8. Video AI → 9. 3D Navigation AI → 10. Risk AI
 * 11. Continuous Learning
 *
 * Extends WorkflowEngine with Vision AI, 3D Navigation, and
 * cross-validation between every consecutive step pair.
 */
const WorkflowEngine = require('./workflow-engine');
const ValidationEngine = require('./validation-engine');
const EvidenceValidator = require('./evidence-validator');

const MANDATORY_SEQUENCE = [
  'profiling',
  'extraction',
  'analysis',
  'virtual_building',
  'boq',
  'cost',
  'schedule',
  'risks',
  'quality',
  'vision_ai',
  'navigation',
  'learning',
];

class AIOrchestrator extends WorkflowEngine {
  constructor(ai, edl, visionAICore, navEngine, trainingBridge) {
    super(ai, edl);
    this.visionAICore = visionAICore;
    this.navEngine = navEngine;
    this.trainingBridge = trainingBridge;
    this.validationEngine = new ValidationEngine(edl);
    this.evidenceValidator = new EvidenceValidator(ai);
    this._crossValidationRules = [
      this._cvBOQvsVision.bind(this),
      this._cvBOQvsNavigation.bind(this),
      this._cvVisionVsNavigation.bind(this),
      this._cvCostVsRisk.bind(this),
      this._cvScheduleVsBOQ.bind(this),
    ];
    this._pipelineLog = [];
  }

  /**
   * Run the complete orchestrated pipeline from profiling through to learning.
   * Every step reads from / writes to EngineeringDataLayer (SSOT).
   * Each consecutive step pair is cross-validated.
   */
  async runFullPipeline(project, description, parseDescriptionFn) {
    const startTime = Date.now();
    project.setOrchestrationState({
      sequence: MANDATORY_SEQUENCE,
      status: 'running',
      startedAt: new Date().toISOString(),
      conflicts: [],
      crossValidationPassed: true,
    });

    const steps = [];

    for (const stepName of MANDATORY_SEQUENCE) {
      project.setOrchestrationState({ currentStep: stepName });
      const stepResult = await this._executeStep(project, stepName, description, parseDescriptionFn);
      steps.push(stepResult);

      if (stepResult.status === 'failed') {
        project.setOrchestrationState({ status: 'failed' });
        return { ok: false, failedStep: stepName, error: stepResult.error, steps };
      }

      // Cross-validate current step vs all previous completed steps
      const completedSteps = steps.filter(s => s.status === 'completed');
      if (completedSteps.length > 1) {
        const conflicts = this._runCrossValidation(project, stepName, completedSteps);
        if (conflicts.length > 0) {
          project.setOrchestrationState({
            conflicts: [...project.orchestration.conflicts, ...conflicts],
            crossValidationPassed: conflicts.filter(c => c.severity === 'error').length === 0,
          });
        }
      }
    }

    // Run the ValidationEngine across all modules
    const validationResult = this.validationEngine.validate(project);
    project.metadata.status = validationResult.passed ? 'completed' : 'completed_with_warnings';
    project.metadata.workflowStep = 'completed';
    project.setOrchestrationState({
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    this._pipelineLog.push({
      projectId: project.id,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      steps: steps.length,
      passed: validationResult.passed,
    });

    return { ok: true, steps, validation: validationResult, duration: Date.now() - startTime };
  }

  /**
   * Execute a single step in the pipeline
   */
  async _executeStep(project, stepName, description, parseDescriptionFn) {
    try {
      const profile = project.getLatestProfile?.() || project._latestProfile;
      if (profile && this.evidenceValidator) {
        const stageMap = { boq: 'boq', cost: 'boq', schedule: 'schedule', risks: 'boq', quality: 'boq', vision_ai: 'visual', navigation: 'visual' };
        const evStage = stageMap[stepName];
        if (evStage) {
          const ev = this.evidenceValidator.validate(profile, evStage);
          if (!ev.canProceed) {
            project.setOrchestrationState({ status: 'blocked', evidenceBlocks: ev.blocks });
            return { name: stepName, status: 'blocked', error: ev.blocks.join('; '), evidence: ev };
          }
        }
      }
      switch (stepName) {
        case 'profiling': {
          const result = await this.stepProfiling(project);
          return { name: stepName, status: result.ok ? 'completed' : 'skipped', data: result.profile || {} };
        }
        case 'extraction': {
          const params = await this.stepExtraction(project, description, parseDescriptionFn);
          return { name: stepName, status: 'completed', data: params };
        }
        case 'analysis': {
          const result = await this.stepAnalysis(project, description);
          if (!result.ok) return { name: stepName, status: 'failed', error: result.error };
          return { name: stepName, status: 'completed', data: result.analysis };
        }
        case 'virtual_building': {
          const building = await this.stepVirtualBuilding(project);
          return { name: stepName, status: 'completed', data: building };
        }
        case 'boq': {
          const boq = await this.stepBOQ(project, description);
          return { name: stepName, status: 'completed', data: boq.summary };
        }
        case 'cost': {
          const cost = await this.stepCost(project);
          return { name: stepName, status: 'completed', data: { totalCost: cost.totalCost } };
        }
        case 'schedule': {
          const schedule = await this.stepSchedule(project);
          return { name: stepName, status: 'completed', data: { totalDays: schedule.totalDuration } };
        }
        case 'risks': {
          const risks = await this.stepRisks(project);
          return { name: stepName, status: 'completed', data: { level: risks.riskLevel } };
        }
        case 'quality': {
          const quality = await this.stepQuality(project);
          return { name: stepName, status: 'completed', data: { score: quality.qualityScore } };
        }
        case 'vision_ai': {
          const visionResult = await this._stepVisionAI(project);
          return { name: stepName, status: visionResult.ok ? 'completed' : 'skipped', data: visionResult.summary || {} };
        }
        case 'navigation': {
          const navResult = await this._step3DNavigation(project);
          return { name: stepName, status: navResult.ok ? 'completed' : 'skipped', data: navResult.summary || {} };
        }
        case 'learning': {
          const learningResult = await this._stepContinuousLearning(project);
          return { name: stepName, status: 'completed', data: learningResult };
        }
        default:
          return { name: stepName, status: 'failed', error: `Unknown step: ${stepName}` };
      }
    } catch (err) {
      return { name: stepName, status: 'failed', error: err.message };
    }
  }

  /**
   * Step 9 (Vision AI): Generate images/videos using data from EDL (SSOT)
   */
  async _stepVisionAI(project) {
    if (!this.visionAICore) {
      project.traceEvent('vision_ai_skipped', 'aiOrchestrator', { reason: 'visionAICore not available' });
      return { ok: false, summary: { skipped: true, reason: 'Vision AI not available' } };
    }

    const upmSources = project.getUPMSources();
    const { buildUPM } = require('../vision-ai/engines/unified-project-model');

    const upm = buildUPM(project.id, upmSources);
    project.vision.upmSnapshot = upm.toJSON();

    // Cross-validate UPM with BOQ: the building features must match BOQ items
    if (project.boq.items.length > 0 && upm.boqSummary.totalItems === 0) {
      project.addConflict('boq', 'vision_ai', 'BOQ items exist but UPM has no BOQ summary', 'error');
    }

    const features = upm.summarize();
    project.vision.features = features;
    project.traceEvent('vision_ai_upm_built', 'aiOrchestrator', {
      type: features.type,
      completeness: upm.verification.completeness,
    });

    return {
      ok: true,
      summary: {
        type: features.type,
        completeness: upm.verification.completeness,
        warnings: upm.verification.warnings,
      },
    };
  }

  /**
   * Step 10 (3D Navigation): Build spatial model from EDL (SSOT)
   */
  async _step3DNavigation(project) {
    const navParams = project.get3DParams();
    const boqItems = project.boq.items || [];

    // Cross-validate: 3D floors must match extracted/approved floors
    const approvedFloors = project.getEffective('floors');
    if (approvedFloors.value !== null && approvedFloors.value !== navParams.floors) {
      project.addConflict('analysis', 'navigation',
        `Floor count mismatch: analysis says ${approvedFloors.value}, navigation built ${navParams.floors}`,
        'error');
    }

    let elements = [];
    let spatialModel = { type: navParams.type, area: navParams.area, floors: navParams.floors, boqItemCount: boqItems.length };

    if (this.navEngine) {
      try {
        const aiData = {
          boqItems,
          totalCost: project.cost.totalCost || 0,
          schedule: project.schedule || {},
          risks: { riskLevel: project.risks.riskLevel, overallRiskScore: project.risks.overallRiskScore },
          quality: { qualityScore: project.quality.qualityScore, qualityGrade: project.quality.qualityGrade },
          cost: { directCost: project.cost.directCost, totalCost: project.cost.totalCost, costPerM2: project.cost.costPerM2 },
        };
        const structureResult = await this.navEngine.generateStructure(project.id, navParams, aiData);
        elements = structureResult.elements || [];
        spatialModel = {
          ...spatialModel,
          elementCount: elements.length,
          dimensions: structureResult.dimensions,
          metadata: structureResult.metadata,
        };
        project.traceEvent('3d_structure_generated', 'aiOrchestrator', {
          elements: elements.length,
          boqItems: boqItems.length,
        });
      } catch (e) {
        project.traceEvent('3d_generation_failed', 'aiOrchestrator', { error: e.message });
      }
    }

    // Build overlay data from project modules
    const overlayData = {
      cost: boqItems.slice(0, 20).map(i => ({
        name: i.name || i.material || `Item ${i.code}`,
        cost: i.totalCost || i.unitPrice || 0,
        phase: i.phase || 'Unknown',
      })),
      risk: project.risks.riskLevel || 'Low',
      phases: (project.schedule.activities || []).map(a => ({
        name: a.name || a.activity,
        duration: a.duration || 0,
        progress: a.progress || 0,
      })),
    };

    project.setNavigationData({
      spatialModel,
      elements,
      overlays: [overlayData],
    });

    project.traceEvent('3d_navigation_built', 'aiOrchestrator', {
      floors: navParams.floors,
      type: navParams.type,
      elements: elements.length,
      boqItems: boqItems.length,
      riskLevel: overlayData.risk,
    });

    return {
      ok: true,
      summary: {
        type: navParams.type,
        floors: navParams.floors,
        elements: elements.length,
        boqItemCount: boqItems.length,
      },
    };
  }

  /**
   * Step 11 (Continuous Learning): Record pipeline results for learning
   */
  async _stepContinuousLearning(project) {
    const learningData = {
      projectId: project.id,
      type: project.getEffective('type').value,
      area: project.getEffective('area').value,
      floors: project.getEffective('floors').value,
      boqItems: project.boq.items.length,
      boqTotalCost: project.boq.summary.totalCost,
      costTotal: project.cost.totalCost,
      scheduleDuration: project.schedule.totalDuration,
      riskLevel: project.risks.riskLevel,
      qualityScore: project.quality.qualityScore,
      conflicts: project.orchestration.conflicts.length,
      crossValidationPassed: project.orchestration.crossValidationPassed,
      completedAt: new Date().toISOString(),
    };

    // Record in TrainingDataBridge (EDA-based learning)
    if (this.trainingBridge) {
      this.trainingBridge.addEDLRecord(project);
    }

    // Record in ContinuousLearner (price/assumption learning)
    const learner = this.ai.getContinuousLearner ? this.ai.getContinuousLearner() : null;
    if (learner) {
      project.traceEvent('learning_recorded', 'aiOrchestrator', learningData);
    } else {
      project.traceEvent('learning_skipped', 'aiOrchestrator', { reason: 'continuousLearner not available' });
    }

    return learningData;
  }

  // ─── Cross-Validation Rules ──────────────────────────

  /**
   * Run all cross-validation rules between the latest step and all previous steps
   */
  _runCrossValidation(project, currentStep, completedSteps) {
    const conflicts = [];
    for (const rule of this._crossValidationRules) {
      try {
        const result = rule(project, currentStep, completedSteps);
        if (result) conflicts.push(result);
      } catch (err) {
        conflicts.push({
          timestamp: new Date().toISOString(),
          from: 'cross-validation',
          to: currentStep,
          message: `Validation error: ${err.message}`,
          severity: 'warning',
        });
      }
    }
    return conflicts;
  }

  /**
   * CV1: BOQ items must match Vision AI features
   */
  _cvBOQvsVision(project, currentStep) {
    if (currentStep !== 'vision_ai') return null;
    const boqItems = project.boq.items || [];
    const visionFeatures = project.vision.features;
    if (!visionFeatures || boqItems.length === 0) return null;

    if (visionFeatures.items !== boqItems.length) {
      project.addConflict('boq', 'vision_ai',
        `BOQ has ${boqItems.length} items but Vision AI features show ${visionFeatures.items}`,
        'info');
    }
    return null;
  }

  /**
   * CV2: BOQ items must match 3D Navigation elements
   */
  _cvBOQvsNavigation(project, currentStep) {
    if (currentStep !== 'navigation') return null;
    const boqItems = project.boq.items || [];
    const navElements = project.navigation.elements || [];

    if (boqItems.length > 0 && navElements.length > 0) {
      const boqMaterialCount = boqItems.filter(i => i.material).length;
      const hasMaterials = navElements.some(e => e.material);
      if (boqMaterialCount > 0 && !hasMaterials) {
        project.addConflict('boq', 'navigation',
          `BOQ has ${boqMaterialCount} items with materials but 3D model has no material data`,
          'warning');
      }
    }
    return null;
  }

  /**
   * CV3: Vision features must be consistent with 3D Navigation building params
   */
  _cvVisionVsNavigation(project, currentStep) {
    if (currentStep !== 'navigation') return null;
    const visionFeat = project.vision.features;
    const navParams = project.navigation.spatialModel;
    if (!visionFeat || !navParams) return null;

    if (visionFeat.floors && navParams.floors && visionFeat.floors !== navParams.floors) {
      project.addConflict('vision_ai', 'navigation',
        `Floor mismatch: Vision AI says ${visionFeat.floors}, 3D Navigation says ${navParams.floors}`,
        'error');
    }
    if (visionFeat.area && navParams.area && Math.abs(visionFeat.area - navParams.area) > visionFeat.area * 0.3) {
      project.addConflict('vision_ai', 'navigation',
        `Area mismatch: Vision AI says ${visionFeat.area}m², 3D Navigation says ${navParams.area}m²`,
        'warning');
    }
    return null;
  }

  /**
   * CV4: Cost contingency must reflect risk level
   */
  _cvCostVsRisk(project, currentStep) {
    if (currentStep !== 'risks' && currentStep !== 'quality') return null;
    const riskLevel = project.risks.riskLevel || 'Low';
    const contingency = project.cost.contingency || 0;
    const totalCost = project.cost.totalCost || 0;

    if (riskLevel === 'High' && totalCost > 0) {
      const pct = (contingency / totalCost) * 100;
      if (pct < 5) {
        project.addConflict('cost', 'risks',
          `Risk level is High but cost contingency is only ${pct.toFixed(1)}% (recommended 10-15%)`,
          'warning');
      }
    }
    return null;
  }

  /**
   * CV5: Schedule duration must be proportional to BOQ volume
   */
  _cvScheduleVsBOQ(project, currentStep) {
    if (currentStep !== 'schedule' && currentStep !== 'risks') return null;
    const boqItems = project.boq.items || [];
    const scheduleDays = project.schedule.totalDuration || 0;

    if (boqItems.length > 0 && scheduleDays > 0) {
      const rate = boqItems.length / scheduleDays;
      if (rate > 10) {
        project.addConflict('schedule', 'boq',
          `Schedule has ${scheduleDays} days for ${boqItems.length} BOQ items (${rate.toFixed(1)} items/day) — may be unrealistic`,
          'info');
      }
    }
    return null;
  }

  // ─── Cost Overlay Builder ────────────────────────────

  _buildCostOverlay(boqItems) {
    if (!boqItems || boqItems.length === 0) return {};
    const phases = {};
    for (const item of boqItems) {
      const phase = item.phase || 'General';
      if (!phases[phase]) phases[phase] = { totalCost: 0, items: 0, avgConfidence: 0 };
      phases[phase].totalCost += item.totalCost || item.total || 0;
      phases[phase].items += 1;
      phases[phase].avgConfidence += item.confidence || 0.5;
    }
    for (const phase of Object.keys(phases)) {
      phases[phase].avgConfidence = +(phases[phase].avgConfidence / phases[phase].items).toFixed(2);
    }
    return { phases, totalCost: boqItems.reduce((s, i) => s + (i.totalCost || i.total || 0), 0) };
  }

  // ─── Query Methods ───────────────────────────────────

  getPipelineLog() {
    return this._pipelineLog;
  }

  getSequence() {
    return [...MANDATORY_SEQUENCE];
  }

  getStepDependencies(stepName) {
    const idx = MANDATORY_SEQUENCE.indexOf(stepName);
    if (idx === -1) return [];
    return MANDATORY_SEQUENCE.slice(0, idx);
  }
}

module.exports = AIOrchestrator;
