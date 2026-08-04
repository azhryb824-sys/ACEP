const { getLogger } = require('./logger');

let instance = null;

class ModelAbstractionLayer {
  constructor() {
    if (instance) return instance;
    this.providers = new Map();
    this.logger = getLogger({ service: 'VisionAI-ModelLayer' });
    this._registerBuiltinProviders();
    instance = this;
  }

  _registerBuiltinProviders() {
    this.registerProvider('flux', {
      name: 'FLUX Schnell',
      type: 'image',
      priority: 10,
      class: './providers/flux',
    });
    this.registerProvider('together', {
      name: 'Together FLUX',
      type: 'image',
      priority: 9,
      class: './providers/together',
    });
    this.registerProvider('dalle', {
      name: 'DALL-E 3',
      type: 'image',
      priority: 8,
      class: './providers/dalle',
    });
    this.registerProvider('stable-diffusion', {
      name: 'Stable Diffusion',
      type: 'image',
      priority: 5,
      class: './providers/stable-diffusion',
    });
    this.registerProvider('runway', {
      name: 'Runway Gen-3',
      type: 'video',
      priority: 10,
      class: './providers/runway',
    });
  }

  registerProvider(name, config) {
    if (this.providers.has(name)) return;
    this.providers.set(name, config);
    this.logger.info(`Registered provider: ${name} (${config.type})`);
  }

  getProvider(name) {
    return this.providers.get(name) || null;
  }

  getAvailableProviders(type = null) {
    const result = [];
    for (const [name, config] of this.providers) {
      if (!type || config.type === type || config.type === 'both') {
        result.push({ name, type: config.type, priority: config.priority, version: config.version || '1.0.0' });
      }
    }
    return result.sort((a, b) => b.priority - a.priority);
  }

  getDefaultProvider(type) {
    const available = this.getAvailableProviders(type);
    return available.length > 0 ? available[0].name : null;
  }

  async instantiateProvider(name) {
    const config = this.providers.get(name);
    if (!config) throw new Error(`Provider "${name}" not registered`);
    try {
      const ProviderClass = require(config.class);
      const instance = new ProviderClass();
      await instance.initialize();
      return instance;
    } catch (e) {
      throw new Error(`Failed to instantiate provider "${name}": ${e.message}`);
    }
  }

  async generateWithProvider(providerName, prompt, options = {}) {
    const provider = await this.instantiateProvider(providerName);
    if (provider.type === 'video' && typeof provider.generateVideo === 'function') {
      return await provider.generateVideo(prompt, options);
    }
    return await provider.generateImage(prompt, options);
  }

  async generateWithFallback(prompt, options = {}, type = 'image', preferredProvider = null) {
    const providers = this.getAvailableProviders(type);
    if (preferredProvider) {
      const idx = providers.findIndex(p => p.name === preferredProvider);
      if (idx > 0) {
        const item = providers.splice(idx, 1)[0];
        providers.unshift(item);
      }
    }
    const errors = [];
    for (const provider of providers) {
      try {
        this.logger.info(`Trying provider: ${provider.name}`);
        return await this.generateWithProvider(provider.name, prompt, options);
      } catch (e) {
        this.logger.warn(`Provider ${provider.name} failed: ${e.message}`);
        errors.push({ provider: provider.name, error: e.message });
      }
    }
    const detail = errors.map(e => `${e.provider}: ${e.error}`).join(' | ');
    throw new Error(`All providers failed for ${type} generation. Details: ${detail}`);
  }

  estimateCost(providerName, options) {
    const config = this.providers.get(providerName);
    if (!config) return { estimatedCost: -1, currency: 'USD', error: 'Unknown provider' };
    const costs = {
      'stable-diffusion': { estimatedCost: 0, currency: 'USD', note: 'Free (self-hosted)' },
      'dalle': { estimatedCost: 0.04, currency: 'USD', note: 'Per image (standard quality)' },
      'flux': { estimatedCost: 0, currency: 'USD', note: 'Free on Replicate (Schnell)' },
      'together': { estimatedCost: 0, currency: 'USD', note: 'Free tier (rate-limited)' },
      'runway': { estimatedCost: 0.05, currency: 'USD', note: 'Per second of video' },
    };
    return costs[providerName] || { estimatedCost: -1, currency: 'USD' };
  }
}

module.exports = ModelAbstractionLayer;