const { UETSCore } = require('./core/index');
const { UETSDatasetGenerator } = require('./dataset/generator');
const { UETSTrainingManager } = require('./training/training-manager');
const { UETSDatasetValidator } = require('./validation/dataset-validator');

let instance = null;

class UnifiedTrainingSystem {
  constructor(options = {}) {
    if (instance) return instance;

    this.core = new UETSCore(options);
    this.datasetGenerator = new UETSDatasetGenerator(this.core);
    this.trainingManager = new UETSTrainingManager(this.core, options);
    this.datasetValidator = new UETSDatasetValidator(this.core);

    this.initialized = false;
    instance = this;
  }

  initialize() {
    if (this.initialized) return this;
    this.core.initialize();
    this.trainingManager.initialize();
    this.initialized = true;
    console.log(`[UETS] Unified Training System initialized (v${this.core.getVersion()})`);
    return this;
  }

  // === EGT Core ===

  createEGT(data) { return this.core.createEGT(data); }
  addEGT(egt) { return this.core.add(egt); }
  addEGTBatch(egts) { return this.core.addBatch(egts); }
  getEGT(uuid) { return this.core.get(uuid); }
  getAllEGT() { return this.core.getAll(); }
  queryEGT(filters) { return this.core.query(filters); }
  validateEGT(egt) { return this.core.validate(egt); }
  validateEGTBatch(egts) { return this.core.validateBatch(egts); }
  checkConsistency(egt) { return this.core.checkConsistency(egt); }
  checkIntegrity(egt) { return this.core.checkIntegrity(egt); }
  calculateCompleteness(egt) { return this.core.calculateCompleteness(egt); }

  fromCSV(row) { return this.core.fromCSV(row); }
  fromEDL(project) { return this.core.fromEDL(project); }
  fromKB(project) { return this.core.fromKB(project); }
  fromContinuousLearning(record) { return this.core.fromContinuousLearning(record); }
  fromProfile(profile) { return this.core.fromProfile(profile); }

  // === Dataset Generator ===

  generateCSVTrainingData(egts) { return this.datasetGenerator.generateCSVTrainingData(egts || this.core.getAll()); }
  generateJSONLTrainingData(egts, domain) { return this.datasetGenerator.generateJSONLTrainingData(egts || this.core.getAll(), domain); }
  generateJSONLForAllDomains(egts) { return this.datasetGenerator.generateJSONLForAllDomains(egts || this.core.getAll()); }
  writeJSONLToDisk(outputDir, egts, options) { return this.datasetGenerator.writeJSONLToDisk(outputDir, egts || this.core.getAll(), options); }
  generateImagePrompts(egt) { return this.datasetGenerator.generateImagePrompts(egt); }
  generate3DParams(egt) { return this.datasetGenerator.generate3DParams(egt); }

  // === Training Manager ===

  enqueueTraining(models, options) { return this.trainingManager.enqueueTraining(models, options); }
  enqueueRetraining(reason, options) { return this.trainingManager.enqueueRetraining(reason, options); }
  enqueueEvaluation(type, options) { return this.trainingManager.enqueueEvaluation(type, options); }
  enqueueFeedback(feedback) { return this.trainingManager.enqueueFeedback(feedback); }

  processTrainingQueue(fn) { return this.trainingManager.processTrainingQueue(fn); }
  processRetrainingQueue(fn) { return this.trainingManager.processRetrainingQueue(fn); }
  processEvaluationQueue(fn) { return this.trainingManager.processEvaluationQueue(fn); }
  processFeedbackQueue(fn) { return this.trainingManager.processFeedbackQueue(fn); }

  startAutoRetrain(intervalMs) { return this.trainingManager.startAutoRetrain(intervalMs); }
  stopAutoRetrain() { return this.trainingManager.stopAutoRetrain(); }

  on(event, callback) { return this.trainingManager.on(event, callback); }

  getTrainingStats() { return this.trainingManager.getStats(); }
  getTrainingHistory(limit) { return this.trainingManager.getHistory(limit); }

  // === Dataset Validator ===

  createDatasetVersion(label, desc) { return this.datasetValidator.createVersion(label, desc); }
  getDatasetVersions() { return this.datasetValidator.getVersions(); }
  getLatestVersion() { return this.datasetValidator.getLatestVersion(); }
  diffVersions(v1, v2) { return this.datasetValidator.diffVersions(v1, v2); }

  checkDatasetIntegrity(egts) { return this.datasetValidator.checkIntegrity(egts || this.core.getAll()); }
  checkDatasetConsistency(egts) { return this.datasetValidator.checkConsistency(egts || this.core.getAll()); }
  checkCoverage() { return this.datasetValidator.checkCoverage(); }
  getReadinessReport() { return this.datasetValidator.getReadinessReport(); }

  // === Status ===

  validateAgainstGroundTruth(projectData) {
    return this.core.validateAgainstGroundTruth(projectData);
  }
  getStatus() {
    return {
      version: this.core.getVersion(),
      initialized: this.initialized,
      core: this.core.getStatus(),
      training: this.trainingManager.getStats(),
      records: this.core.repository.records.size,
      coverage: this.datasetValidator.checkCoverage()
    };
  }

  getStats() { return this.core.getStats(); }

  save() { return this.core.save(); }

  static getInstance() { return instance; }
}

module.exports = { UnifiedTrainingSystem };
