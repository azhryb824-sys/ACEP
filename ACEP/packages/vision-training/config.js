const path = require('path');

const ROOT = __dirname;

module.exports = {
  root: ROOT,
  paths: {
    datasets: path.join(ROOT, 'datasets'),
    images: path.join(ROOT, 'datasets', 'images'),
    captions: path.join(ROOT, 'datasets', 'captions'),
    metadata: path.join(ROOT, 'datasets', 'metadata'),
    training: path.join(ROOT, 'training'),
    lora: path.join(ROOT, 'training', 'lora'),
    models: path.join(ROOT, 'training', 'models'),
    registry: path.join(ROOT, 'registry'),
    evaluation: path.join(ROOT, 'evaluation'),
    logs: path.join(ROOT, 'evaluation', 'logs'),
  },

  model: {
    base: 'stabilityai/stable-diffusion-xl-base-1.0',
    type: 'sdxl',
    family: 'sd',
    license: 'Open RAIL-M',
    supportedFineTuning: ['lora', 'textual-inversion'],
    recommended: 'lora',
  },

  lora: {
    rank: 64,
    alpha: 128,
    target_modules: ['to_q', 'to_k', 'to_v', 'to_out.0'],
    optimizer: 'adamw8bit',
    learning_rate: 1e-4,
    scheduler: 'constant_with_warmup',
    warmup_steps: 100,
    resolution: 1024,
    train_batch_size: 1,
    gradient_accumulation_steps: 4,
    max_train_steps: 1000,
    checkpointing_steps: 200,
    validation_steps: 100,
    seed: 42,
    mixed_precision: 'fp16',
    noise_offset: 0.01,
    snr_gamma: 5.0,
    enable_xformers: true,
  },

  dataset: {
    minImages: 10,
    recommendedImages: 100,
    trainSplit: 0.8,
    valSplit: 0.15,
    testSplit: 0.05,
    maxResolution: 1024,
    supportedFormats: ['.png', '.jpg', '.jpeg', '.webp'],
    captionPrefix: 'architecture construction building ',
  },

  deployment: {
    maxVersions: 10,
    autoCleanOldVersions: false,
    defaultModelPath: path.join(ROOT, 'training', 'models', 'active'),
  },
};
