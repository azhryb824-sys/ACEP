const fs = require('fs');
const path = require('path');
const ModelRegistry = require('./model-registry');
const Config = require('../config');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-ModelLoader' });

class ModelLoader {
  constructor() {
    this.loadedModels = new Map();
  }

  async load(id) {
    const model = ModelRegistry.getVersion(id);
    if (!model) throw new Error(`Model not found in registry: ${id}`);

    if (this.loadedModels.has(id)) {
      LOGGER.debug(`Model already loaded: ${id}`);
      return this.loadedModels.get(id);
    }

    if (!fs.existsSync(model.loraPath)) {
      throw new Error(`LoRA weights not found at: ${model.loraPath}`);
    }

    const loaded = {
      id: model.id,
      version: model.version,
      baseModel: model.baseModel,
      loraPath: model.loraPath,
      type: model.type,
      config: {
        rank: model.metrics?.lora_rank || Config.lora.rank,
        alpha: model.metrics?.lora_alpha || Config.lora.alpha,
      },
      loadedAt: new Date().toISOString(),
    };

    this.loadedModels.set(id, loaded);
    LOGGER.info(`Model loaded: ${id} from ${model.loraPath}`);
    return loaded;
  }

  unload(id) {
    this.loadedModels.delete(id);
    LOGGER.info(`Model unloaded: ${id}`);
  }

  getLoaded(id) {
    return this.loadedModels.get(id) || null;
  }

  listLoaded() {
    return Array.from(this.loadedModels.values());
  }

  async getActiveModel() {
    const active = ModelRegistry.getActiveVersion();
    if (!active) return null;
    try {
      return await this.load(active.id);
    } catch (e) {
      LOGGER.warn(`Active model not loadable: ${e.message}`);
      return null;
    }
  }

  getModelDescription(model) {
    if (!model) return null;
    return {
      id: model.id,
      version: model.version,
      baseModel: model.baseModel,
      loraPath: model.loraPath,
      type: model.type,
    };
  }
}

module.exports = new ModelLoader();
