const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-ProviderAdapter' });

class ProviderAdapter {
  constructor() {
    this.trainedProviders = new Map();
  }

  registerTrainedProvider(name, config) {
    this.trainedProviders.set(name, config);
    LOGGER.info(`Trained provider registered: ${name} (base: ${config.baseModel})`);
  }

  getProvider(name) {
    return this.trainedProviders.get(name) || null;
  }

  listProviders() {
    return Array.from(this.trainedProviders.values()).map(p => ({
      name: p.name,
      baseModel: p.baseModel,
      version: p.version,
      type: p.type,
      isTrained: true,
    }));
  }

  createProviderForModel(registryEntry) {
    const providerName = `trained-flux-${registryEntry.version.replace(/\./g, '_')}`;
    const providerConfig = {
      name: providerName,
      label: `FLUX (${registryEntry.version})`,
      type: 'image',
      baseModel: registryEntry.baseModel,
      loraPath: registryEntry.loraPath,
      version: registryEntry.version,
      priority: 15,
      class: null,
    };

    this.registerTrainedProvider(providerName, providerConfig);
    return providerConfig;
  }
}

module.exports = new ProviderAdapter();
