const ModelRegistry = require('../models/model-registry');
const ModelDeployer = require('../models/model-deployer');
const ProviderAdapter = require('./provider-adapter');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-Integration' });

class VisionIntegration {
  constructor() {
    this.connectedToACEP = false;
  }

  async connectToACEP(acepVisionAI) {
    if (this.connectedToACEP) return;

    LOGGER.info('Connecting ACEP Vision Training to ACEP Vision AI...');

    const models = ModelRegistry.listVersions({ status: ['registered', 'deployed', 'active'] });
    for (const model of models) {
      const providerConfig = ProviderAdapter.createProviderForModel(model);
      if (acepVisionAI && acepVisionAI.models && typeof acepVisionAI.models.registerProvider === 'function') {
        acepVisionAI.models.registerProvider(providerConfig.name, {
          name: providerConfig.label,
          type: providerConfig.type,
          priority: providerConfig.priority,
          version: providerConfig.version,
        });
        LOGGER.info(`Registered trained model as provider: ${providerConfig.name}`);
      }
    }

    this.connectedToACEP = true;
    LOGGER.info('ACEP Vision Training connected to ACEP Vision AI');
    return { connected: true, modelsRegistered: models.length };
  }

  async deployToACEP(modelId) {
    const model = ModelRegistry.getVersion(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    const deployment = await ModelDeployer.deploy(modelId);
    LOGGER.info(`Model deployed to ACEP: ${modelId}`);

    const providerConfig = ProviderAdapter.createProviderForModel(model);
    return {
      deployment,
      provider: providerConfig,
      message: `Model ${model.version} deployed. ACEP can now use provider "${providerConfig.name}"`,
    };
  }

  switchACEPProvider(acepVisionAI, version) {
    if (!acepVisionAI || !acepVisionAI.models) {
      throw new Error('ACEP Vision AI not provided');
    }
    const providerName = `trained-flux-${version.replace(/\./g, '_')}`;
    if (acepVisionAI.models.getProvider(providerName)) {
      LOGGER.info(`ACEP switched to trained provider: ${providerName}`);
      return { provider: providerName, version };
    }
    throw new Error(`Provider not found: ${providerName}`);
  }

  getIntegrationStatus() {
    return {
      connected: this.connectedToACEP,
      activeDeployment: ModelDeployer.getActiveModel(),
      registrySummary: ModelRegistry.getSummary(),
      trainedProviders: ProviderAdapter.listProviders(),
    };
  }
}

module.exports = new VisionIntegration();
