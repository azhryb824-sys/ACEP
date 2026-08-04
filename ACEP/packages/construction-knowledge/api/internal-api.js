class KnowledgeInternalAPI {
  constructor(kb) {
    this.kb = kb;
  }

  /* ---- Project Type ---- */
  getProjectTypes() { return this.kb.getAllProjectTypes(); }
  getProjectType(id) { return this.kb.getProjectType(id); }
  getProjectTypesByCategory(cat) { return this.kb.getProjectTypesByCategory(cat); }

  /* ---- Phases ---- */
  getPhases() { return this.kb.getProjectPhases(); }
  getPhase(id) { return this.kb.getPhase(id); }
  getPhasesBefore(id) { return this.kb.getPhasesBefore(id); }
  getPhasesAfter(id) { return this.kb.getPhasesAfter(id); }

  /* ---- Elements ---- */
  getElements() { return Object.values(this.kb._getDataRefs().elements); }
  getElement(id) { return this.kb.getElement(id); }
  getElementsByCategory(cat) { return this.kb.getElementsByCategory(cat); }
  getElementsByPhase(phaseId) { return this.kb.getElementsByPhase(phaseId); }
  getElementRelationships(id) { return this.kb.getElementRelationships(id); }

  /* ---- Materials ---- */
  getMaterials() { return Object.values(this.kb._getDataRefs().materials); }
  getMaterial(id) { return this.kb.getMaterial(id); }
  getMaterialsByCategory(cat) { return this.kb.getMaterialsByCategory(cat); }

  /* ---- Codes ---- */
  getCodes() { return this.kb.getAllCodes(); }
  getCode(code) { return this.kb.getCode(code); }
  getCodesByCategory(cat) { return this.kb.getCodesByCategory(cat); }

  /* ---- BOQ ---- */
  getBOQItems() { return this.kb.getBOQData()?.items || []; }
  getBOQByCode(code) { return this.kb.getBOQData()?.getByCode(code); }
  getBOQByElementType(el) { return this.kb.getBOQData()?.getByElementType(el) || []; }
  calculateBOQ(elementType, params) { return this.kb.getBOQData()?.calculateQuantity(elementType, params) || []; }

  /* ---- Schedule ---- */
  getScheduleTasks() { return this.kb.getScheduleData()?.tasks || []; }
  getScheduleTask(id) { return this.kb.getScheduleData()?.getTask(id); }
  getCriticalPath() { return this.kb.getScheduleData()?.getCriticalPath() || []; }
  getTasksByElementType(el) { return this.kb.getScheduleData()?.getTasksByElementType(el) || []; }

  /* ---- Search ---- */
  search(query, options) { return this.kb.search(query, options); }
  smartSearch(query) { return this.kb.smartSearch(query); }

  /* ---- Knowledge Graph ---- */
  getGraphStats() { return this.kb.getGraph().toJSON().stats; }
  getGraphNeighbors(id, rel) { return this.kb.getGraph().getNeighbors(id, rel); }
  findGraphPath(from, to) { return this.kb.getGraph().findPath(from, to); }

  /* ---- AI Integration ---- */
  analyzeProject(data) { return this.kb.analyzeProject(data); }
  estimateBOQ(data) { return this.kb.generateBOQ(data); }
  estimateCost(data) { return this.kb.estimateCost(data); }
  analyzeRisk(data) { return this.kb.analyzeRisk(data); }
  generateSchedule(data) { return this.kb.generateSchedule(data); }
  getVisionPrompt(data, opts) { return this.kb.getVisionPrompt(data, opts); }
  generate3DStructure(data) { return this.kb.generate3DStructure(data); }

  /* ---- Learning ---- */
  recordProject(data, results) { return this.kb.recordProject(data, results); }
  getLearningStats() { return this.kb.getLearningStats(); }

  /* ---- Images & Videos ---- */
  addImage(entry) { return this.kb.getImageDB()?.addImage(entry); }
  searchImages(query) { return this.kb.getImageDB()?.search(query) || []; }
  addVideo(entry) { return this.kb.getVideoDB()?.addVideo(entry); }
  searchVideos(query) { return this.kb.getVideoDB()?.search(query) || []; }

  /* ---- System ---- */
  getStats() {
    return {
      nodeCount: this.kb.getGraph().nodes.size,
      edgeCount: this.kb.getGraph().edges.length,
      boqItems: this.getBOQItems().length,
      scheduleTasks: this.getScheduleTasks().length,
      materials: this.getMaterials().length,
      elements: this.getElements().length,
      codes: this.getCodes().length,
      projectTypes: this.getProjectTypes().length,
      phases: this.getPhases().length,
      cache: this.kb.cache.getStats(),
      learning: this.getLearningStats(),
      version: this.kb._version,
      lastUpdated: this.kb._lastUpdated,
    };
  }

  rebuildIndex() { return this.kb.rebuildSearchIndex(); }
}

module.exports = { KnowledgeInternalAPI };
