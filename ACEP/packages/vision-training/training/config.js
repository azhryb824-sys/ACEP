const path = require('path');
const MainConfig = require('../config');

class TrainingConfig {
  constructor(options = {}) {
    this.baseModel = options.baseModel || MainConfig.model.base;
    this.outputDir = options.outputDir || path.join(MainConfig.paths.lora, `run_${Date.now()}`);
    this.loraRank = options.loraRank || MainConfig.lora.rank;
    this.loraAlpha = options.loraAlpha || MainConfig.lora.alpha;
    this.learningRate = options.learningRate || MainConfig.lora.learning_rate;
    this.trainBatchSize = options.trainBatchSize || MainConfig.lora.train_batch_size;
    this.gradientAccumulation = options.gradientAccumulation || MainConfig.lora.gradient_accumulation_steps;
    this.maxTrainSteps = options.maxTrainSteps || MainConfig.lora.max_train_steps;
    this.resolution = options.resolution || MainConfig.lora.resolution;
    this.mixedPrecision = options.mixedPrecision || MainConfig.lora.mixed_precision;
    this.checkpointingSteps = options.checkpointingSteps || MainConfig.lora.checkpointing_steps;
    this.validationSteps = options.validationSteps || MainConfig.lora.validation_steps;
    this.seed = options.seed || MainConfig.lora.seed;
    this.warmupSteps = options.warmupSteps || MainConfig.lora.warmup_steps;
    this.noiseOffset = options.noiseOffset || MainConfig.lora.noise_offset;
    this.snrGamma = options.snrGamma || MainConfig.lora.snr_gamma;
    this.datasetDir = options.datasetDir || MainConfig.paths.datasets;
    this.imagesDir = options.imagesDir || MainConfig.paths.images;
    this.captionsDir = options.captionsDir || MainConfig.paths.captions;
    this.metadataDir = options.metadataDir || MainConfig.paths.metadata;
    this.registryDir = MainConfig.paths.registry;
  }

  get loraConfig() {
    return {
      rank: this.loraRank,
      alpha: this.loraAlpha,
      target_modules: MainConfig.lora.target_modules,
    };
  }

  get trainingArgs() {
    return {
      base_model: this.baseModel,
      output_dir: this.outputDir,
      learning_rate: this.learningRate,
      train_batch_size: this.trainBatchSize,
      gradient_accumulation_steps: this.gradientAccumulation,
      max_train_steps: this.maxTrainSteps,
      resolution: this.resolution,
      mixed_precision: this.mixedPrecision,
      checkpointing_steps: this.checkpointingSteps,
      validation_steps: this.validationSteps,
      seed: this.seed,
      warmup_steps: this.warmupSteps,
      noise_offset: this.noiseOffset,
      snr_gamma: this.snrGamma,
    };
  }

  toJSON() {
    return { ...this.trainingArgs, lora: this.loraConfig };
  }
}

module.exports = TrainingConfig;
