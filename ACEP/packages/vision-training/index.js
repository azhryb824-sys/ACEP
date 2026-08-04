const DatasetManager = require('./dataset/dataset-manager');
const ImageProcessor = require('./dataset/image-processor');
const CaptionGenerator = require('./dataset/caption-generator');
const MetadataSchema = require('./dataset/metadata-schema');
const Augmentation = require('./dataset/augmentation');
const TrainingPipeline = require('./training/training-pipeline');
const LoRATrainer = require('./training/lora-trainer');
const TrainingConfig = require('./training/config');
const CheckpointManager = require('./training/checkpoint-manager');
const ModelRegistry = require('./models/model-registry');
const ModelLoader = require('./models/model-loader');
const ModelDeployer = require('./models/model-deployer');
const Evaluator = require('./evaluation/evaluator');
const Metrics = require('./evaluation/metrics');
const VisionIntegration = require('./integration/vision-integration');
const ProviderAdapter = require('./integration/provider-adapter');
const Config = require('./config');
const { getLogger } = require('./logger');

const LOGGER = getLogger({ service: 'VisionTraining' });

class ACEPVisionTraining {
  constructor() {
    this.dataset = DatasetManager;
    this.imageProcessor = ImageProcessor;
    this.captionGenerator = CaptionGenerator;
    this.metadataSchema = MetadataSchema;
    this.augmentation = Augmentation;
    this.pipeline = TrainingPipeline;
    this.loraTrainer = LoRATrainer;
    this.trainingConfig = TrainingConfig;
    this.checkpoints = CheckpointManager;
    this.registry = ModelRegistry;
    this.modelLoader = ModelLoader;
    this.deployer = ModelDeployer;
    this.evaluator = Evaluator;
    this.metrics = Metrics;
    this.integration = VisionIntegration;
    this.providerAdapter = ProviderAdapter;
    this.config = Config;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    await ModelRegistry.initialize();
    await TrainingPipeline.initialize();
    this.initialized = true;
    LOGGER.info('ACEP Vision Training initialized');
  }

  getStatus() {
    return {
      initialized: this.initialized,
      dataset: DatasetManager.getStats(),
      registry: ModelRegistry.getSummary(),
      activeModel: ModelDeployer.getActiveModel(),
    };
  }
}

module.exports = new ACEPVisionTraining();
