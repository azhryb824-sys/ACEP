const DatasetManager = require('../dataset/dataset-manager');
const ImageProcessor = require('../dataset/image-processor');
const CaptionGenerator = require('../dataset/caption-generator');
const MetadataSchema = require('../dataset/metadata-schema');
const Augmentation = require('../dataset/augmentation');
const LoRATrainer = require('./lora-trainer');
const TrainingConfig = require('./config');
const CheckpointManager = require('./checkpoint-manager');
const ModelRegistry = require('../models/model-registry');
const ModelDeployer = require('../models/model-deployer');
const Evaluator = require('../evaluation/evaluator');
const Config = require('../config');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-Pipeline' });

class TrainingPipeline {
  constructor() {
    this.initialized = false;
    this.currentRun = null;
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    LOGGER.info('Training pipeline initialized');
  }

  async run(options = {}) {
    const runId = `pipeline_${Date.now()}`;
    this.currentRun = { runId, status: 'preparing', startedAt: new Date().toISOString() };

    LOGGER.info(`=== Training Pipeline Run: ${runId} ===`);

    try {
      const dataset = this._prepareDataset(options);
      LOGGER.info(`Dataset ready: ${dataset.length} images`);

      const augmentedDataset = this._augmentDataset(dataset, options);
      LOGGER.info(`Dataset augmented: ${augmentedDataset.length} entries`);

      const trainingResult = await this._train(augmentedDataset, options);
      LOGGER.info(`Training completed: ${trainingResult.status}`);

      const evaluationResult = await this._evaluate(trainingResult, options);
      LOGGER.info(`Evaluation completed`);

      const registeredModel = await this._registerModel(trainingResult, evaluationResult);
      LOGGER.info(`Model registered: ${registeredModel.version}`);

      if (options.deploy !== false) {
        await this._deploy(registeredModel);
        LOGGER.info(`Model deployed`);
      }

      this.currentRun.status = 'completed';
      this.currentRun.completedAt = new Date().toISOString();

      return {
        runId,
        status: 'completed',
        dataset: { size: dataset.length },
        training: trainingResult,
        evaluation: evaluationResult,
        model: registeredModel,
      };
    } catch (e) {
      this.currentRun.status = 'failed';
      this.currentRun.error = e.message;
      LOGGER.error(`Pipeline failed: ${e.message}`);
      throw e;
    }
  }

  _prepareDataset(options) {
    const dataset = DatasetManager.entries;
    if (dataset.length === 0) {
      LOGGER.warn('Dataset is empty. Populate it before training.');
    }
    const minImages = options.minImages || Config.dataset.minImages;
    if (dataset.length < minImages) {
      LOGGER.warn(`Dataset has only ${dataset.length} images. Minimum recommended: ${minImages}`);
    }
    DatasetManager.version = options.datasetVersion || `1.0.${Math.floor(Date.now() / 1000)}`;
    return dataset;
  }

  _augmentDataset(dataset, options) {
    if (options.augment === false || options.augment === 0) return dataset;
    const multiplier = options.augment || 3;
    return Augmentation.augmentDataset(dataset, multiplier);
  }

  async _train(dataset, options) {
    const startTime = Date.now();
    const trainingOptions = {
      maxTrainSteps: options.steps || Config.lora.max_train_steps,
      learningRate: options.learningRate || Config.lora.learning_rate,
      resolution: options.resolution || Config.lora.resolution,
      loraRank: options.loraRank || Config.lora.rank,
      loraAlpha: options.loraAlpha || Config.lora.alpha,
      ...options.training,
    };

    const result = await LoRATrainer.train(dataset, trainingOptions);
    return { ...result, duration: Date.now() - startTime };
  }

  async _evaluate(trainingResult, options) {
    if (options.skipEvaluation) return { skipped: true };
    return await Evaluator.evaluate(trainingResult.outputDir);
  }

  async _registerModel(trainingResult, evaluationResult) {
    const loraPath = trainingResult.loraWeightsPath;
    if (!loraPath) throw new Error('No LoRA weights path from training');

    const modelEntry = await ModelRegistry.registerVersion({
      name: `ACEP FLUX LoRA v${ModelRegistry.getNextVersion()}`,
      baseModel: Config.model.base,
      type: 'lora',
      loraPath,
      datasetVersion: DatasetManager.version,
      metrics: evaluationResult.metrics || {},
      trainingRunId: trainingResult.runId,
    });

    return modelEntry;
  }

  async _deploy(modelEntry) {
    await ModelDeployer.deploy(modelEntry.id, modelEntry.version);
  }

  getStatus() {
    return {
      initialized: this.initialized,
      currentRun: this.currentRun,
      trainer: LoRATrainer.getStatus(),
    };
  }
}

module.exports = new TrainingPipeline();
