/**
 * ACEP Engineering Data Layer (EDL) — Single Source of Truth
 *
 * All modules read from and write to this central store.
 * Every piece of data tracks its origin, confidence, and approval status.
 */
class EngineeringDataLayer {
  constructor() {
    this.projects = new Map(); // projectId -> ProjectModel
  }

  createProject(id, metadata = {}) {
    if (this.projects.has(id)) return this.projects.get(id);
    const pm = new ProjectModel(id, metadata);
    this.projects.set(id, pm);
    return pm;
  }

  getProject(id) {
    return this.projects.get(id) || null;
  }

  deleteProject(id) {
    return this.projects.delete(id);
  }

  getAllProjects() {
    return Array.from(this.projects.values());
  }

  toJSON() {
    const obj = {};
    for (const [id, pm] of this.projects) obj[id] = pm.toJSON();
    return obj;
  }

  fromJSON(json) {
    for (const [id, data] of Object.entries(json)) {
      const pm = new ProjectModel(id);
      pm.fromJSON(data);
      this.projects.set(id, pm);
    }
  }

  persist(filePath) {
    try {
      require('fs').writeFileSync(filePath, JSON.stringify(this.toJSON(), null, 2), 'utf8');
      return true;
    } catch (e) {
      return false;
    }
  }

  load(filePath) {
    try {
      if (require('fs').existsSync(filePath)) {
        const data = JSON.parse(require('fs').readFileSync(filePath, 'utf8'));
        this.fromJSON(data);
        return Object.keys(data).length;
      }
    } catch (e) {
      // File not found or corrupt, start fresh
    }
    return 0;
  }
}

class ProjectModel {
  constructor(id, metadata = {}) {
    this.id = id;
    this.metadata = {
      name: metadata.name || '',
      description: metadata.description || '',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      status: 'initialized',
      workflowStep: 'extraction',
      ...metadata
    };

    // Raw input from user
    this.rawInput = { description: '', files: [] };

    // Extracted data (from parseDescription)
    this.extracted = {
      type: null, typeConfidence: 0,
      area: null, areaExtracted: false,
      floors: null, floorsExtracted: false,
      rooms: null, roomsExtracted: false,
      bathrooms: null, bathroomsExtracted: false,
      hasKitchen: false,
      halls: null,
      city: null,
      phase: null,
      extractionLog: null
    };

    // User-approved data (after extraction review)
    this.approved = {
      type: null, typeConfirmed: false,
      area: null, areaConfirmed: false,
      floors: null, floorsConfirmed: false,
      rooms: null, roomsConfirmed: false,
      bathrooms: null, bathroomsConfirmed: false,
      hasKitchen: false, kitchenConfirmed: false,
      halls: null, hallsConfirmed: false,
      city: null, cityConfirmed: false,
      phase: null, phaseConfirmed: false
    };

    // Predicted data (from AI models, needs approval)
    this.predicted = {
      type: null, typeConfidence: 0,
      area: null, floors: null,
      spaces: [],
      totalArea: null,
      confidence: 0
    };

    // Virtual Building Model
    this.building = {
      spaces: [],
      systems: [], // HVAC, Electrical, Plumbing, Fire, etc.
      materials: [],
      structuralElements: [],
      totalHeight: null,
      hasBasement: null,
      numUnits: null
    };

    // BOQ
    this.boq = {
      items: [],
      suggestedItems: [],
      phase: null,
      summary: { totalItems: 0, suggestedCount: 0, totalCost: 0, averageConfidence: 0 }
    };

    // Cost
    this.cost = {
      directCost: 0, indirectCost: 0, contingency: 0,
      profit: 0, taxes: 0, totalCost: 0,
      costPerM2: 0, confidence: 0,
      breakdown: {},
      dataPoints: 0
    };

    // Schedule
    this.schedule = {
      activities: [],
      totalDuration: 0, totalMonths: 0,
      criticalPath: [],
      optimization: null
    };

    // Risks
    this.risks = {
      risks: [],
      overallRiskScore: 0,
      riskLevel: 'Low',
      riskCount: 0
    };

    // Quality
    this.quality = {
      qualityScore: 0, qualityGrade: '',
      estimatedDefects: 0,
      defects: []
    };

    // Procurement
    this.procurement = {
      suppliers: [],
      materialPrices: [],
      comparisons: []
    };

    // Validation
    this.validation = {
      issues: [],
      warnings: [],
      passed: true,
      lastChecked: null
    };

    // Digital Project Profile (Phase 1 - Project Understanding)
    this.digitalProfile = null;

    // Vision AI Data (images, videos, prompts)
    this.vision = {
      images: [],
      videos: [],
      prompts: [],
      features: null,
      galleryIds: [],
      generationResults: [],
      upmSnapshot: null,
    };

    // 3D Navigation Data
    this.navigation = {
      spatialModel: null,
      elements: [],
      overlays: [],
      currentMode: 'orbit',
      currentFloor: 0,
      phaseProgress: 1,
      layers: { structure: true, architecture: true, finishing: true, mep: false },
    };

    // Orchestration State
    this.orchestration = {
      sequence: [],
      currentStep: null,
      status: 'idle',
      conflicts: [],
      crossValidationPassed: true,
      startedAt: null,
      completedAt: null,
    };

    // Traceability Log
    this.trace = [];
  }

  // ─── Trace ──────────────────────────────
  traceEvent(action, module, details = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      action,
      module,
      details,
      projectId: this.id
    };
    this.trace.push(event);
    return event;
  }

  // ─── Set Extracted Data ─────────────────
  setExtracted(data) {
    Object.assign(this.extracted, data);
    this.metadata.updated = new Date().toISOString();
    this.traceEvent('extraction', 'parseDescription', { data });
  }

  // ─── Set Approved Data ──────────────────
  setApproved(data) {
    for (const [key, value] of Object.entries(data)) {
      if (key in this.approved) {
        this.approved[key] = value;
        const confirmKey = key + 'Confirmed';
        if (confirmKey in this.approved) this.approved[confirmKey] = true;
      }
    }
    this.metadata.updated = new Date().toISOString();
    this.metadata.workflowStep = 'approved';
    this.traceEvent('approve', 'user', { data });
  }

  // ─── Set Predicted/Analysis Data ────────
  setAnalysis(analysis) {
    Object.assign(this.predicted, {
      type: analysis.projectType,
      typeConfidence: analysis.confidence,
      totalArea: analysis.totalArea,
      spaces: analysis.spaces,
      confidence: analysis.confidence
    });
    this.metadata.updated = new Date().toISOString();
    this.metadata.workflowStep = 'analyzed';
    this.traceEvent('analysis', 'projectAnalyzer', { analysis });
  }

  // ─── Set BOQ Data ───────────────────────
  setBOQ(boqResult) {
    this.boq = {
      items: boqResult.items || [],
      suggestedItems: boqResult.suggestedItems || [],
      phase: boqResult.phase || 'Unknown',
      lifecyclePhases: boqResult.lifecyclePhases || [],
      summary: boqResult.summary || { totalItems: 0, suggestedCount: 0, totalCost: 0, averageConfidence: 0 }
    };
    this.metadata.updated = new Date().toISOString();
    this.metadata.workflowStep = 'boq_generated';
    this.traceEvent('boq_generation', 'quantityEstimator', { itemCount: this.boq.items.length, totalCost: this.boq.summary.totalCost });
  }

  // ─── Set Cost Data ──────────────────────
  setCost(costData) {
    this.cost = {
      directCost: costData.directCost || 0,
      indirectCost: costData.indirectCost || 0,
      contingency: costData.contingency || 0,
      profit: costData.profit || 0,
      taxes: costData.taxes || 0,
      totalCost: costData.totalCost || 0,
      costPerM2: costData.costPerM2 || 0,
      confidence: costData.confidence || 0,
      breakdown: costData.breakdown || {},
      dataPoints: costData.dataPoints || 0
    };
    this.metadata.updated = new Date().toISOString();
    this.metadata.workflowStep = 'cost_estimated';
    this.traceEvent('cost_estimation', 'costEstimator', { costData });
  }

  // ─── Set Schedule Data ──────────────────
  setSchedule(scheduleData) {
    this.schedule = {
      activities: scheduleData.activities || [],
      totalDuration: scheduleData.totalDuration || 0,
      totalMonths: scheduleData.totalMonths || 0,
      criticalPath: scheduleData.criticalPath || [],
      optimization: scheduleData.optimization || null
    };
    this.metadata.updated = new Date().toISOString();
    this.metadata.workflowStep = 'scheduled';
    this.traceEvent('schedule', 'scheduleOptimizer', { scheduleData });
  }

  // ─── Set Risk Data ──────────────────────
  setRisks(riskData) {
    this.risks = {
      risks: riskData.risks || [],
      overallRiskScore: riskData.overallRiskScore || 0,
      riskLevel: riskData.riskLevel || 'Low',
      riskCount: (riskData.risks || []).length
    };
    this.metadata.updated = new Date().toISOString();
    this.metadata.workflowStep = 'risks_analyzed';
    this.traceEvent('risk_analysis', 'riskAnalyzer', { riskData });
  }

  // ─── Set Quality Data ───────────────────
  setQuality(qualityData) {
    this.quality = {
      qualityScore: qualityData.qualityScore || 0,
      qualityGrade: qualityData.qualityGrade || '',
      estimatedDefects: qualityData.estimatedDefects || 0,
      defects: qualityData.defects || []
    };
    this.metadata.updated = new Date().toISOString();
    this.traceEvent('quality', 'qualityInspector', { qualityData });
  }

  // ─── Set Digital Profile ────────────────
  setDigitalProfile(profile) {
    this.digitalProfile = profile;
    this.metadata.updated = new Date().toISOString();
    this.traceEvent('profiling', 'projectProfiler', { type: profile?.projectType?.primary, confidence: profile?.projectType?.confidence });
  }

  // ─── Set Vision AI Data ──────────────────
  setVisionData(visionData) {
    if (visionData.images) this.vision.images = visionData.images;
    if (visionData.videos) this.vision.videos = visionData.videos;
    if (visionData.prompts) this.vision.prompts = visionData.prompts;
    if (visionData.features) this.vision.features = visionData.features;
    if (visionData.generationIds) this.vision.galleryIds = visionData.generationIds;
    if (visionData.upmSnapshot) this.vision.upmSnapshot = visionData.upmSnapshot;
    this.metadata.updated = new Date().toISOString();
    this.metadata.workflowStep = 'vision_completed';
    this.traceEvent('vision_ai', 'aiOrchestrator', { images: this.vision.images.length });
  }

  // ─── Set 3D Navigation Data ──────────────
  setNavigationData(navData) {
    if (navData.spatialModel) this.navigation.spatialModel = navData.spatialModel;
    if (navData.elements) this.navigation.elements = navData.elements;
    if (navData.overlays) this.navigation.overlays = navData.overlays;
    if (navData.currentMode) this.navigation.currentMode = navData.currentMode;
    if (navData.currentFloor !== undefined) this.navigation.currentFloor = navData.currentFloor;
    if (navData.phaseProgress !== undefined) this.navigation.phaseProgress = navData.phaseProgress;
    if (navData.layers) this.navigation.layers = { ...this.navigation.layers, ...navData.layers };
    this.metadata.updated = new Date().toISOString();
    this.metadata.workflowStep = 'navigation_completed';
    this.traceEvent('3d_navigation', 'aiOrchestrator', { elements: this.navigation.elements.length });
  }

  // ─── Set Orchestration State ─────────────
  setOrchestrationState(state) {
    Object.assign(this.orchestration, state);
    this.metadata.updated = new Date().toISOString();
    this.traceEvent('orchestration', 'aiOrchestrator', { step: state.currentStep, status: state.status });
  }

  // ─── Record Cross-Validation Conflict ────
  addConflict(from, to, message, severity = 'warning') {
    this.orchestration.conflicts.push({
      timestamp: new Date().toISOString(),
      from,
      to,
      message,
      severity,
    });
    this.orchestration.crossValidationPassed = this.orchestration.conflicts.filter(c => c.severity === 'error').length === 0;
    return this.orchestration.crossValidationPassed;
  }

  // ─── Get data formatted for Vision AI UPM ─
  getUPMSources() {
    const effective = this.getEffective('type');
    return {
      projectParams: {
        type: effective.value,
        area: this.getEffective('area').value,
        floors: this.getEffective('floors').value,
        city: this.approved.city || this.extracted.city || '',
        description: this.rawInput.description || '',
        finishing: this.approved.finishing || this.extracted.finishing || this.approved.typeConfirmed ? 'Standard' : null,
        materials: this.building.materials || [],
        style: this.digitalProfile?.style?.architectural || null,
      },
      boqData: this.boq.items.length > 0 ? {
        items: this.boq.items.map(i => ({
          code: i.code,
          name: i.name || i.description,
          phase: i.phase,
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: i.unitPrice,
          totalCost: i.totalCost || i.total,
          material: i.material,
          confidence: i.confidence,
        })),
      } : null,
      profile: this.digitalProfile || null,
      description: this.rawInput.description || '',
      kbData: null,
    };
  }

  // ─── Get data formatted for 3D Navigation ─
  get3DParams() {
    const effective = {
      type: this.getEffective('type').value,
      area: this.getEffective('area').value,
      floors: this.getEffective('floors').value,
    };
    return {
      type: effective.type || 'Building',
      area: effective.area || 200,
      floors: effective.floors || 3,
      boqItems: this.boq.items || [],
      totalCost: this.cost.totalCost || 0,
      schedule: {
        totalDuration: this.schedule.totalDuration,
        activities: this.schedule.activities,
      },
      risks: {
        riskLevel: this.risks.riskLevel,
        overallRiskScore: this.risks.overallRiskScore,
      },
      quality: {
        qualityScore: this.quality.qualityScore,
        qualityGrade: this.quality.qualityGrade,
      },
      cost: {
        directCost: this.cost.directCost,
        totalCost: this.cost.totalCost,
        costPerM2: this.cost.costPerM2,
      },
    };
  }

  // ─── Set Procurement Data ───────────────
  setProcurement(procurementData) {
    this.procurement = {
      suppliers: procurementData.suppliers || this.procurement.suppliers,
      materialPrices: procurementData.materialPrices || this.procurement.materialPrices,
      comparisons: procurementData.comparisons || this.procurement.comparisons
    };
    this.metadata.updated = new Date().toISOString();
    this.traceEvent('procurement', 'supplierIntelligence', { procurementData });
  }

  // ─── Validation ─────────────────────────
  validate() {
    const issues = [];
    const warnings = [];

    // V1: BOQ total cost ≤ direct cost
    const boqTotal = this.boq.summary.totalCost || 0;
    const directCost = this.cost.directCost || 0;
    if (boqTotal > 0 && directCost > 0 && boqTotal > directCost) {
      issues.push({
        code: 'V001',
        severity: 'error',
        message: `تكلفة BOQ (${boqTotal.toLocaleString()}) أكبر من التكلفة المباشرة (${directCost.toLocaleString()})`,
        source: 'validation',
        between: ['boq.summary.totalCost', 'cost.directCost']
      });
    }

    // V2: Direct cost ≤ total cost
    if (directCost > 0 && this.cost.totalCost > 0 && directCost > this.cost.totalCost) {
      issues.push({
        code: 'V002',
        severity: 'error',
        message: `التكلفة المباشرة (${directCost.toLocaleString()}) أكبر من التكلفة الإجمالية (${this.cost.totalCost.toLocaleString()})`,
        source: 'validation',
        between: ['cost.directCost', 'cost.totalCost']
      });
    }

    // V3: Area consistency
    const extArea = this.approved.area || this.extracted.area;
    const predArea = this.predicted.totalArea;
    if (extArea && predArea && Math.abs(extArea - predArea) > extArea * 0.5) {
      warnings.push({
        code: 'V003',
        severity: 'warning',
        message: `تباين كبير بين المساحة المستخرجة (${extArea}) ومساحة التحليل (${predArea})`,
        source: 'validation',
        between: ['approved.area', 'predicted.totalArea']
      });
    }

    // V4: Schedule duration consistency
    if (this.schedule.totalMonths > 0 && this.schedule.totalDuration > 0) {
      const expectedDays = this.schedule.totalMonths * 30.4;
      if (Math.abs(this.schedule.totalDuration - expectedDays) > expectedDays * 0.3) {
        warnings.push({
          code: 'V004',
          severity: 'warning',
          message: `تباين بين المدة بالأشهر (${this.schedule.totalMonths}) والأيام (${this.schedule.totalDuration})`,
          source: 'validation',
          between: ['schedule.totalMonths', 'schedule.totalDuration']
        });
      }
    }

    // V5: Confirmed data exists
    if (!this.approved.areaConfirmed && this.extracted.area) {
      warnings.push({
        code: 'V005',
        severity: 'info',
        message: 'المساحة المستخرجة لم يتم اعتمادها من المستخدم بعد',
        source: 'validation'
      });
    }

    this.validation = {
      issues,
      warnings,
      passed: issues.length === 0,
      lastChecked: new Date().toISOString()
    };
    return this.validation;
  }

  // ─── Get Effective Value ────────────────
  // Returns the best available value: approved > extracted > predicted
  getEffective(key) {
    if (this.approved[key + 'Confirmed'] && this.approved[key] !== null && this.approved[key] !== undefined) {
      return { value: this.approved[key], source: 'approved', confidence: 1.0 };
    }
    if (this.extracted[key] !== null && this.extracted[key] !== undefined) {
      return { value: this.extracted[key], source: 'extracted', confidence: this.extracted.typeConfidence || 0.7 };
    }
    if (this.predicted[key] !== null && this.predicted[key] !== undefined) {
      return { value: this.predicted[key], source: 'predicted', confidence: this.predicted.confidence || 0.5 };
    }
    return { value: null, source: 'none', confidence: 0 };
  }

  // ─── Serialize ──────────────────────────
  toJSON() {
    return {
      id: this.id,
      metadata: this.metadata,
      extracted: this.extracted,
      approved: this.approved,
      predicted: this.predicted,
      building: this.building,
      boq: this.boq,
      cost: this.cost,
      schedule: this.schedule,
      risks: this.risks,
      quality: this.quality,
      procurement: this.procurement,
      validation: this.validation,
      digitalProfile: this.digitalProfile,
      vision: this.vision,
      navigation: this.navigation,
      orchestration: this.orchestration,
      trace: this.trace.slice(-100) // last 100 events
    };
  }

  fromJSON(data) {
    if (data.metadata) this.metadata = data.metadata;
    if (data.extracted) this.extracted = data.extracted;
    if (data.approved) this.approved = data.approved;
    if (data.predicted) this.predicted = data.predicted;
    if (data.building) this.building = data.building;
    if (data.boq) this.boq = data.boq;
    if (data.cost) this.cost = data.cost;
    if (data.schedule) this.schedule = data.schedule;
    if (data.risks) this.risks = data.risks;
    if (data.quality) this.quality = data.quality;
    if (data.procurement) this.procurement = data.procurement;
    if (data.validation) this.validation = data.validation;
    if (data.digitalProfile) this.digitalProfile = data.digitalProfile;
    if (data.vision) this.vision = data.vision;
    if (data.navigation) this.navigation = data.navigation;
    if (data.orchestration) this.orchestration = data.orchestration;
    if (data.trace) this.trace = data.trace;
  }
}

module.exports = { EngineeringDataLayer, ProjectModel };
