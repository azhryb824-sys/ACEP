const { inspectSafetensors } = require('./safetensors-format');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ModelRegistry = require('./model-registry');
const Config = require('../config');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-ModelLoader' });

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

class ModelLoader {
  constructor() {
    this.loadedModels = new Map();
  }

  async load(id) {
    await ModelRegistry.initialize();
    const model = ModelRegistry.getVersion(id);
    if (!model) throw new Error(`Model not found in registry: ${id}`);
    ModelRegistry.assertReleaseReady(model);
    if (!fs.existsSync(model.loraPath) || fs.lstatSync(model.loraPath).isSymbolicLink() || !fs.statSync(model.loraPath).isFile()) {
      throw new Error('Approved LoRA artifact is missing');
    }
    const artifactRoot = fs.realpathSync(Config.paths.lora);
    const artifactPath = fs.realpathSync(model.loraPath);
    const relative = path.relative(artifactRoot, artifactPath);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Approved LoRA artifact escapes the runtime root');
    }
    inspectSafetensors(model.loraPath);
    const actualHash = await sha256File(model.loraPath);
    if (actualHash !== model.artifactSha256) throw new Error('Approved LoRA artifact hash mismatch');

    const descriptor = {
      id: model.id,
      version: model.version,
      baseModel: model.baseModel,
      baseModelRevision: model.baseModelRevision,
      loraPath: model.loraPath,
      artifactSha256: actualHash,
      datasetManifestSha256: model.datasetManifestSha256,
      trainingConfigSha256: model.trainingConfigSha256,
      type: model.type,
      config: {
        rank: model.metrics?.lora_rank || Config.lora.rank,
        alpha: model.metrics?.lora_alpha || Config.lora.alpha,
      },
      status: 'artifact_verified',
      inferenceLoaded: false,
      note: 'The Node service verifies the artifact; an approved inference runtime must load the tensors separately.',
      verifiedAt: new Date().toISOString(),
    };

    this.loadedModels.set(id, descriptor);
    LOGGER.info(`Model artifact verified: ${id}`);
    return { ...descriptor };
  }

  unload(id) {
    this.loadedModels.delete(id);
    LOGGER.info(`Model descriptor unloaded: ${id}`);
  }

  getLoaded(id) {
    return this.loadedModels.get(id) || null;
  }

  listLoaded() {
    return Array.from(this.loadedModels.values()).map(model => ({ ...model }));
  }

  async getActiveModel() {
    const active = ModelRegistry.getActiveVersion();
    if (!active) return null;
    try {
      return await this.load(active.id);
    } catch (error) {
      LOGGER.warn(`Active model artifact is not loadable: ${error.message}`);
      return null;
    }
  }

  getModelDescription(model) {
    if (!model) return null;
    return {
      id: model.id,
      version: model.version,
      baseModel: model.baseModel,
      baseModelRevision: model.baseModelRevision,
      artifactSha256: model.artifactSha256,
      type: model.type,
      status: model.status,
      inferenceLoaded: model.inferenceLoaded === true,
    };
  }
}

module.exports = new ModelLoader();
