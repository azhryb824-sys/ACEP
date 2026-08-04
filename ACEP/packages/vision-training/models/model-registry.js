const fs = require('fs');
const path = require('path');
const Config = require('../config');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-Registry' });

class ModelRegistry {
  constructor() {
    this.registryPath = Config.paths.registry;
    this.registryFile = path.join(this.registryPath, 'registry.json');
    this.models = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    if (!fs.existsSync(this.registryPath)) {
      fs.mkdirSync(this.registryPath, { recursive: true });
    }
    if (fs.existsSync(this.registryFile)) {
      try {
        this.models = JSON.parse(fs.readFileSync(this.registryFile, 'utf-8'));
        LOGGER.info(`Loaded ${this.models.length} model versions from registry`);
      } catch (e) {
        LOGGER.warn(`Failed to load registry, starting fresh: ${e.message}`);
        this.models = [];
      }
    }
    this.initialized = true;
  }

  async _save() {
    fs.writeFileSync(this.registryFile, JSON.stringify(this.models, null, 2), 'utf-8');
  }

  getNextVersion() {
    const versions = this.models.map(m => {
      const parts = m.version.split('.');
      return parseInt(parts[parts.length - 1], 10) || 0;
    });
    const next = versions.length > 0 ? Math.max(...versions) + 1 : 1;
    return `1.0.${next}`;
  }

  async registerVersion(entry) {
    const version = entry.version || this.getNextVersion();
    const modelEntry = {
      id: `acep-flux-v${version.replace(/\./g, '_')}`,
      name: entry.name || `ACEP FLUX LoRA ${version}`,
      version,
      baseModel: entry.baseModel,
      type: entry.type || 'lora',
      loraPath: entry.loraPath,
      datasetVersion: entry.datasetVersion || '1.0.0',
      metrics: entry.metrics || {},
      trainingRunId: entry.trainingRunId,
      trainedAt: new Date().toISOString(),
      status: 'registered',
      deployments: 0,
      isActive: false,
    };

    this.models.push(modelEntry);
    await this._save();
    LOGGER.info(`Model registered: ${modelEntry.id} (v${version})`);
    return modelEntry;
  }

  listVersions(options = {}) {
    let result = [...this.models];
    if (options.status) result = result.filter(m => m.status === options.status);
    if (options.type) result = result.filter(m => m.type === options.type);
    return result.sort((a, b) => new Date(b.trainedAt) - new Date(a.trainedAt));
  }

  getVersion(id) {
    return this.models.find(m => m.id === id) || null;
  }

  getActiveVersion() {
    return this.models.find(m => m.isActive) || null;
  }

  async setActive(id) {
    for (const model of this.models) {
      model.isActive = model.id === id;
    }
    await this._save();
    const activated = this.models.find(m => m.id === id);
    LOGGER.info(`Active model set to: ${id} (v${activated?.version})`);
    return activated;
  }

  async updateStatus(id, status) {
    const model = this.models.find(m => m.id === id);
    if (!model) throw new Error(`Model not found: ${id}`);
    model.status = status;
    await this._save();
    return model;
  }

  async incrementDeployment(id) {
    const model = this.models.find(m => m.id === id);
    if (!model) throw new Error(`Model not found: ${id}`);
    model.deployments = (model.deployments || 0) + 1;
    await this._save();
    return model;
  }

  getSummary() {
    return {
      total: this.models.length,
      active: this.models.filter(m => m.isActive).length,
      byStatus: this.models.reduce((acc, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      }, {}),
      latestVersion: this.models.length > 0 ? this.models.sort((a, b) => new Date(b.trainedAt) - new Date(a.trainedAt))[0] : null,
    };
  }

  getStats() {
    const versions = this.listVersions();
    const avgMetrics = {};

    if (versions.length > 0) {
      const metricKeys = Object.keys(versions[0].metrics || {});
      for (const key of metricKeys) {
        const vals = versions.filter(v => v.metrics && v.metrics[key] !== undefined).map(v => v.metrics[key]);
        avgMetrics[key] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      }
    }

    return {
      totalVersions: versions.length,
      activeVersion: this.getActiveVersion()?.version || null,
      averageMetrics: avgMetrics,
      lastTraining: versions[0]?.trainedAt || null,
    };
  }
}

module.exports = new ModelRegistry();
