const { PROJECT_TYPES, CATEGORIES, getProjectType, getProjectTypesByCategory, getAllProjectTypes } = require('./entities/project-types');
const { PROJECT_PHASES, getPhase, getPhasesBefore, getPhasesAfter } = require('./entities/phases');
const { ELEMENTS, ELEMENT_RELATIONSHIPS, getElement, getElementsByCategory, getElementsByPhase, getElementRelationships } = require('./entities/elements');
const { MATERIALS, getMaterial, getMaterialsByCategory } = require('./entities/materials');
const { CODES, getCode, getCodesByCategory, getAllCodes } = require('./entities/codes');
const { KnowledgeGraph } = require('./knowledge-graph/graph');
const { BOQDatabase } = require('./data/boq-data');
const { ImageDatabase } = require('./data/image-db');
const { VideoDatabase } = require('./data/video-db');
const { ScheduleDatabase } = require('./data/schedule-data');
const { SearchEngine } = require('./search/search-engine');
const { CacheManager } = require('./cache/cache-manager');
const { ProjectUnderstandingIntegration } = require('./integration/project-understanding');
const { BOQAIIntegration } = require('./integration/boq-ai');
const { VisionAIIntegration } = require('./integration/vision-ai');
const { RiskAIIntegration } = require('./integration/risk-ai');
const { CostAIIntegration } = require('./integration/cost-ai');
const { SchedulingAIIntegration } = require('./integration/scheduling-ai');
const { Navigation3DIntegration } = require('./integration/navigation-3d');
const { ContinuousLearning } = require('./learning/continuous-learning');
const { KnowledgeInternalAPI } = require('./api/internal-api');

// V2 expansion modules
const { KnowledgeBaseV2 } = require('./v2-facade');
const { ValidationEngine } = require('./validation/validation-engine');
const { TrainingReadinessReporter } = require('./validation/training-readiness');

class ConstructionKnowledgeBase {
  constructor() {
    this._version = 1;
    this._lastUpdated = new Date().toISOString();
    this._initialized = false;

    this.graph = new KnowledgeGraph();
    this.boqDB = new BOQDatabase();
    this.imageDB = new ImageDatabase();
    this.videoDB = new VideoDatabase();
    this.scheduleDB = new ScheduleDatabase();
    this.cache = new CacheManager();
    this.learning = new ContinuousLearning(this);

    this.projectUnderstanding = new ProjectUnderstandingIntegration(this);
    this.boqAI = new BOQAIIntegration(this);
    this.visionAI = new VisionAIIntegration(this);
    this.riskAI = new RiskAIIntegration(this);
    this.costAI = new CostAIIntegration(this);
    this.schedulingAI = new SchedulingAIIntegration(this);
    this.nav3D = new Navigation3DIntegration(this);

    this.searchEngine = null;
    this.api = new KnowledgeInternalAPI(this);
  }

  // Data refs for integration modules
  _getDataRefs() {
    return {
      projectTypes: PROJECT_TYPES,
      phases: PROJECT_PHASES,
      elements: ELEMENTS,
      relationships: ELEMENT_RELATIONSHIPS,
      materials: MATERIALS,
      codes: CODES,
      boqData: this.boqDB,
      scheduleData: this.scheduleDB,
      imageData: this.imageDB,
      videoData: this.videoDB,
    };
  }

  initialize() {
    if (this._initialized) return;
    this.graph.buildFromEntities({
      projectTypes: PROJECT_TYPES,
      phases: PROJECT_PHASES,
      elements: ELEMENTS,
      materials: MATERIALS,
      codes: CODES,
      relationships: ELEMENT_RELATIONSHIPS,
    });
    this.searchEngine = new SearchEngine(this);
    this._initialized = true;
    return this;
  }

  /* === Entity Accessors === */
  getProjectType(id) { return getProjectType(id); }
  getAllProjectTypes() { return getAllProjectTypes(); }
  getProjectTypesByCategory(cat) { return getProjectTypesByCategory(cat); }
  getProjectPhases() { return PROJECT_PHASES; }
  getPhase(id) { return getPhase(id); }
  getPhasesBefore(id) { return getPhasesBefore(id); }
  getPhasesAfter(id) { return getPhasesAfter(id); }
  getElement(id) { return getElement(id); }
  getElementsByCategory(cat) { return getElementsByCategory(cat); }
  getElementsByPhase(phaseId) { return getElementsByPhase(phaseId); }
  getElementRelationships(id) { return getElementRelationships(id); }
  getMaterial(id) { return getMaterial(id); }
  getMaterialsByCategory(cat) { return getMaterialsByCategory(cat); }
  getMaterials(style) {
    if (style === 'Modern') { return { concrete: MATERIALS.concrete, rebar: MATERIALS.rebar, block: MATERIALS.block, paint: MATERIALS.paint, ceramic: MATERIALS.ceramic, aluminum: MATERIALS.aluminum, glass: MATERIALS.glass }; }
    if (style === 'Classical') { return { concrete: MATERIALS.concrete, rebar: MATERIALS.rebar, brick: MATERIALS.brick, marble: MATERIALS.marble, wood: MATERIALS.wood }; }
    if (style === 'Islamic') { return { concrete: MATERIALS.concrete, rebar: MATERIALS.rebar, brick: MATERIALS.brick, marble: MATERIALS.marble, ceramic: MATERIALS.ceramic, glass: MATERIALS.glass }; }
    return MATERIALS;
  }
  getCode(code) { return getCode(code); }
  getCodesByCategory(cat) { return getCodesByCategory(cat); }
  getAllCodes() { return getAllCodes(); }

  /* === Data Stores === */
  getBOQData() { return this.boqDB; }
  getScheduleData() { return this.scheduleDB; }
  getImageDB() { return this.imageDB; }
  getVideoDB() { return this.videoDB; }
  getGraph() { return this.graph; }

  /* === AI Integration === */
  analyzeProject(data) { return this.projectUnderstanding.analyze(data); }
  generateBOQ(data) { return this.boqAI.generateBOQ(data); }
  estimateCost(data) { return this.costAI.estimate(data); }
  analyzeRisk(data) { return this.riskAI.analyze(data); }
  generateSchedule(data) { return this.schedulingAI.generateSchedule(data); }
  getVisionPrompt(data, opts) { return this.visionAI.getPromptContext(data, opts); }
  generate3DStructure(data) { return this.nav3D.generateStructure(data); }

  /* === Search === */
  search(query, options) { return this.searchEngine?.search(query, options) || []; }
  smartSearch(query) { return this.searchEngine?.smartSearch(query) || { total: 0, all: [] }; }
  searchByType(query, type) { return this.searchEngine?.searchByType(query, type) || []; }
  rebuildSearchIndex() { this.searchEngine?.rebuildIndex(); }

  /* === Learning === */
  recordProject(data, results) { return this.learning.recordProject(data, results); }
  getLearningStats() { return this.learning.getLearningStats(); }

  /* === Internal API === */
  getAPI() { return this.api; }

  /* === V2 Expansion === */
  initializeV2() {
    if (!this.v2) {
      this.v2 = new KnowledgeBaseV2(this);
      this.v2.initialize();
      this.validationEngine = new ValidationEngine({ strict: true, logResults: true });
      this.validateV2();
    }
    return this.v2;
  }

  getV2() { return this.v2; }

  validateV2() {
    if (!this.v2) return { passed: false, totalErrors: 1, message: 'V2 not initialized' };
    return this.v2.validate();
  }

  getTrainingReadinessReport() {
    if (!this.v2) this.initializeV2();
    return this.v2.getTrainingReadiness();
  }

  getV2Summary() {
    if (!this.v2) return { message: 'V2 not initialized' };
    return this.v2.getSummary();
  }

  /* === V2 Entity Accessors === */
  getElementsV2() { return this.v2?.getElements() || []; }
  getBOQV2() { return this.v2?.getBOQItems() || []; }
  getMaterialsV2() { return this.v2?.getMaterials() || []; }
  getCodesV2() { return this.v2?.getCodes() || []; }
  getElementByIdV2(id) { return this.v2?.getElementById(id); }
  getElementsByCategoryV2(cat) { return this.v2?.getElementsByCategory(cat); }
  getElementsByPhaseV2(phase) { return this.v2?.getElementsByPhase(phase); }
  getBOQByDivisionV2(div) { return this.v2?.getBOQByDivision(div); }
  getBOQByCategoryV2(cat) { return this.v2?.getBOQByCategory(cat); }
  getMaterialByIdV2(id) { return this.v2?.getMaterialById(id); }
  getMaterialsByCategoryV2(cat) { return this.v2?.getMaterialsByCategory(cat); }
  getCodeByCodeV2(code) { return this.v2?.getCodeByCode(code); }
  getCodesByBodyV2(body) { return this.v2?.getCodesByBody(body); }

  getElements(projectData) {
    const type = this.getProjectType(projectData?.type);
    const floors = projectData?.floors || 2;
    const area = projectData?.area || 500;
    const elements = [];
    for (const el of Object.values(ELEMENTS)) {
      elements.push({
        ...el,
        estimatedQty: this._estimateQty(el.id, area, floors),
        type: el.id,
      });
    }
    return elements;
  }

  _estimateQty(elementId, area, floors) {
    const map = {
      column: Math.round(area * 0.04 * floors), beam: Math.round(area * 0.03 * floors),
      slab: Math.round(area * 0.15 * floors), wall: Math.round(Math.sqrt(area) * 3 * floors),
      door: Math.round(Math.sqrt(area) * 0.3 * floors), window: Math.round(Math.sqrt(area) * 0.2 * floors),
      tiles: Math.round(area * 0.7 * floors), ceiling: Math.round(area * 0.8 * floors),
      plaster: Math.round(Math.sqrt(area) * 6 * floors), painting: Math.round(Math.sqrt(area) * 6 * floors),
      hvac: Math.round(area * 0.004 * floors), plumbing_pipe: Math.round(area * 0.1 * floors),
      electrical_cable: Math.round(area * 0.3 * floors), fire_sprinkler: Math.round(area * 0.02 * floors),
    };
    return map[elementId] || 1;
  }
}

module.exports = { ConstructionKnowledgeBase };
