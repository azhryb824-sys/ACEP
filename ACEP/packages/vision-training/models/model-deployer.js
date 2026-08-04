const fs = require('fs');
const path = require('path');
const ModelRegistry = require('./model-registry');
const ModelLoader = require('./model-loader');
const Config = require('../config');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-Deployer' });

class ModelDeployer {
  constructor() {
    this.activeDeployment = null;
    this.deploymentHistory = [];
  }

  getActiveModel() {
    return this.activeDeployment ? { ...this.activeDeployment } : null;
  }

  async deploy(modelId, version) {
    const model = modelId ? ModelRegistry.getVersion(modelId) : ModelRegistry.getVersion(version);
    if (!model) throw new Error(`Model not found: ${modelId || version}`);

    LOGGER.info(`Deploying model: ${model.id} (v${model.version})`);

    const loadedModel = await ModelLoader.load(model.id);

    const deployPath = Config.deployment.defaultModelPath;
    if (!fs.existsSync(path.dirname(deployPath))) {
      fs.mkdirSync(path.dirname(deployPath), { recursive: true });
    }

    const symlinkPath = deployPath;
    if (fs.existsSync(symlinkPath)) {
      fs.rmSync(symlinkPath, { recursive: true, force: true });
    }

    fs.mkdirSync(symlinkPath, { recursive: true });

    if (fs.existsSync(model.loraPath)) {
      const destPath = path.join(symlinkPath, path.basename(model.loraPath));
      fs.copyFileSync(model.loraPath, destPath);
    }

    const metaPath = path.join(symlinkPath, 'deployment.json');
    fs.writeFileSync(metaPath, JSON.stringify({
      modelId: model.id,
      version: model.version,
      baseModel: model.baseModel,
      deployedAt: new Date().toISOString(),
      loraPath: model.loraPath,
    }, null, 2), 'utf-8');

    await ModelRegistry.setActive(model.id);
    await ModelRegistry.incrementDeployment(model.id);

    this.activeDeployment = {
      modelId: model.id,
      version: model.version,
      deployedAt: new Date().toISOString(),
      path: symlinkPath,
    };

    this.deploymentHistory.push(this.activeDeployment);

    LOGGER.info(`Model deployed successfully: ${model.id} -> ${symlinkPath}`);
    return this.activeDeployment;
  }

  async rollback() {
    if (this.deploymentHistory.length <= 1) {
      throw new Error('No previous deployment to rollback to');
    }

    this.deploymentHistory.pop();
    const previous = this.deploymentHistory[this.deploymentHistory.length - 1];
    LOGGER.info(`Rolling back to previous deployment: ${previous.modelId}`);
    return await this.deploy(previous.modelId);
  }

  getDeploymentHistory() {
    return [...this.deploymentHistory];
  }

  getDeployInfo() {
    const active = this.getActiveModel();
    if (!active) return null;
    return {
      ...active,
      modelDetails: ModelRegistry.getVersion(active.modelId),
      loaderInfo: ModelLoader.getLoaded(active.modelId),
    };
  }
}

module.exports = new ModelDeployer();
