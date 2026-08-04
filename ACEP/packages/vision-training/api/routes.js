const ACEPVisionTraining = require('../index');
const DatasetManager = require('../dataset/dataset-manager');
const ImageProcessor = require('../dataset/image-processor');
const CaptionGenerator = require('../dataset/caption-generator');
const MetadataSchema = require('../dataset/metadata-schema');
const TrainingPipeline = require('../training/training-pipeline');
const LoRATrainer = require('../training/lora-trainer');
const ModelRegistry = require('../models/model-registry');
const ModelDeployer = require('../models/model-deployer');
const ModelLoader = require('../models/model-loader');
const Evaluator = require('../evaluation/evaluator');
const VisionIntegration = require('../integration/vision-integration');
const ProviderAdapter = require('../integration/provider-adapter');
const Config = require('../config');
const path = require('path');
const fs = require('fs');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-API' });

function createRouter(app) {
  if (!fs.existsSync(Config.paths.datasets)) {
    fs.mkdirSync(Config.paths.datasets, { recursive: true });
  }

  let initialized = false;
  async function ensureInit(req, res, next) {
    if (!initialized) {
      await ACEPVisionTraining.initialize();
      initialized = true;
    }
    next();
  }
  app.use('/api/v1/vision-training', ensureInit);

  // === STATUS ===
  app.get('/api/v1/vision-training/status', (req, res) => {
    res.json({
      status: 'healthy',
      module: 'ACEP Vision Training',
      version: '1.0.0',
      ...ACEPVisionTraining.getStatus(),
      trainer: LoRATrainer.getStatus(),
    });
  });

  // === DATASET ===
  app.get('/api/v1/vision-training/dataset', (req, res) => {
    const stats = DatasetManager.getStats();
    const entries = DatasetManager.entries.map(e => ({
      id: e._id,
      image: e.image,
      projectType: e.projectType,
      discipline: e.discipline,
      stage: e.stage,
      style: e.style,
      country: e.country,
      materials: e.materials,
      resolution: e.resolution,
      version: e.version,
      addedAt: e._addedAt,
    }));
    res.json({ stats, entries, count: entries.length });
  });

  app.post('/api/v1/vision-training/dataset/import', async (req, res) => {
    try {
      const { images, metadata = {} } = req.body;
      if (!images || !Array.isArray(images)) return res.status(400).json({ error: 'images array required' });
      const results = { added: [], skipped: [] };

      for (const img of images) {
        if (!img.path || !img.name) { results.skipped.push({ file: img.name || 'unknown', error: 'path and name required' }); continue; }
        try {
          if (!fs.existsSync(img.path)) { results.skipped.push({ file: img.name, error: 'file not found' }); continue; }
          const entry = await DatasetManager.addImage(img.path, {
            ...metadata,
            image: img.name,
            caption: metadata.caption || img.name,
          });
          results.added.push(entry);
        } catch (e) {
          results.skipped.push({ file: img.name, error: e.message });
        }
      }
      res.json({ status: 'completed', ...results });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/v1/vision-training/dataset/import-directory', async (req, res) => {
    try {
      const { directory } = req.body;
      if (!directory) return res.status(400).json({ error: 'directory required' });
      const results = await DatasetManager.importDirectory(directory);
      res.json({ status: 'completed', ...results });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/v1/vision-training/dataset/stats', (req, res) => {
    const stats = DatasetManager.getStats();
    const split = DatasetManager.splitDataset();
    res.json({ stats, split: { train: split.train.length, val: split.val.length, test: split.test.length } });
  });

  app.post('/api/v1/vision-training/dataset/export', async (req, res) => {
    try {
      const { format = 'diffusers' } = req.body;
      const exportPath = DatasetManager.exportDataset(format);
      res.json({ status: 'completed', path: exportPath, format, count: DatasetManager.entries.length });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // === TRAINING ===
  app.post('/api/v1/vision-training/train', async (req, res) => {
    try {
      if (LoRATrainer.isTraining) {
        return res.status(409).json({ error: 'Training already in progress', status: LoRATrainer.getStatus() });
      }
      const options = req.body || {};
      const result = await TrainingPipeline.run(options);
      res.json({ status: 'started', ...result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/v1/vision-training/train/status', (req, res) => {
    res.json(LoRATrainer.getStatus());
  });

  app.post('/api/v1/vision-training/train/cancel', (req, res) => {
    if (LoRATrainer.isTraining) {
      LoRATrainer.isTraining = false;
      LoRATrainer.currentRun.status = 'cancelled';
      res.json({ status: 'cancelled' });
    } else {
      res.json({ status: 'no_training_in_progress' });
    }
  });

  app.get('/api/v1/vision-training/train/config', (req, res) => {
    res.json({ lora: Config.lora, dataset: Config.dataset, model: Config.model });
  });

  // === MODELS ===
  app.get('/api/v1/vision-training/models', (req, res) => {
    const models = ModelRegistry.listVersions(req.query);
    res.json({ models, count: models.length, active: ModelRegistry.getActiveVersion() });
  });

  app.get('/api/v1/vision-training/models/active', (req, res) => {
    const active = ModelRegistry.getActiveVersion();
    const deployInfo = ModelDeployer.getDeployInfo();
    const loaded = ModelLoader.getActiveModel();
    res.json({ active, deployInfo, loaded, loadedDescription: ModelLoader.getModelDescription(loaded) });
  });

  app.post('/api/v1/vision-training/models/activate', async (req, res) => {
    try {
      const { modelId } = req.body;
      if (!modelId) return res.status(400).json({ error: 'modelId required' });
      const result = await ModelRegistry.setActive(modelId);
      res.json({ status: 'completed', model: result });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/v1/vision-training/models/deploy', async (req, res) => {
    try {
      const { modelId, toACEP = true } = req.body;
      if (!modelId) return res.status(400).json({ error: 'modelId required' });
      const deployment = await ModelDeployer.deploy(modelId);
      if (toACEP) {
        const targetApp = req.app;
        await VisionIntegration.connectToACEP(targetApp.acepVisionAI || null);
      }
      res.json({ status: 'completed', deployment });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // === EVALUATION ===
  app.post('/api/v1/vision-training/evaluate', async (req, res) => {
    try {
      const { modelId } = req.body;
      const result = await Evaluator.evaluate(modelId);
      res.json({ status: 'completed', ...result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // === INTEGRATION ===
  app.post('/api/v1/vision-training/integrate', async (req, res) => {
    try {
      const result = await VisionIntegration.connectToACEP(req.app.acepVisionAI || null);
      res.json({ status: 'completed', ...result });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/v1/vision-training/integration/status', (req, res) => {
    res.json(VisionIntegration.getIntegrationStatus());
  });

  // === PROVIDERS (trained) ===
  app.get('/api/v1/vision-training/providers', (req, res) => {
    res.json({ providers: ProviderAdapter.listProviders() });
  });

  // === CONFIG ===
  app.get('/api/v1/vision-training/config', (req, res) => {
    res.json({ lora: Config.lora, dataset: Config.dataset, model: Config.model, paths: Config.paths });
  });

  LOGGER.info('ACEP Vision Training API routes registered');
}

module.exports = { createRouter };
