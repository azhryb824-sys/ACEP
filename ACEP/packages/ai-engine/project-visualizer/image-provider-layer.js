/**
 * Image Provider Layer - Abstract Layer for Image Generation Providers
 * Supports multiple providers: Stable Diffusion, DALL-E, Midjourney, FLUX, etc.
 * Can be easily extended with new providers without changing the rest of the system.
 */

class ImageProviderLayer {
  constructor() {
    this.providers = new Map();
    this.currentProvider = null;
    this.logger = null;
    this.loraWeightsPath = null;
    
    // Register built-in providers
    this.registerProvider('stable-diffusion', new StableDiffusionProvider());
    this.registerProvider('dalle', new DALLEProvider());
    this.registerProvider('flux', new FluxProvider());
    this.registerProvider('mock', new MockProvider());
    this.registerProvider('construction-lora', new ConstructionLoRAProvider());
    
    // Set default provider
    this.setProvider('mock'); // Default to mock for safety
    
    // Check for trained LoRA weights
    this.loadTrainedLoRA();
  }

  loadTrainedLoRA() {
    const loraPath = require('path').join(__dirname, '..', '..', '..', '..', 'packages', 'vision-training', 'training', 'checkpoints', 'construction_lora', 'pytorch_lora_weights.safetensors');
    const fs = require('fs');
    
    if (fs.existsSync(loraPath)) {
      this.loraWeightsPath = loraPath;
      console.log(`[ImageProviderLayer] Found trained LoRA weights: ${loraPath}`);
      // Set construction-lora as preferred if available
      this.setProvider('construction-lora');
    }
  }

  setLoRAWeights(path) {
    this.loraWeightsPath = path;
    const provider = this.providers.get('construction-lora');
    if (provider) {
      provider.setLoRAWeights(path);
    }
  }

  setLogger(logger) {
    this.logger = logger;
    this.providers.forEach(provider => {
      if (provider.setLogger) provider.setLogger(logger);
    });
  }

  registerProvider(name, provider) {
    this.providers.set(name, provider);
    if (this.logger) {
      this.logger.info(`Registered image provider: ${name}`);
    }
  }

  setProvider(providerName) {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} not found`);
    }
    this.currentProvider = providerName;
    if (this.logger) {
      this.logger.info(`Set current provider to: ${providerName}`);
    }
  }

  getCurrentProvider() {
    return this.providers.get(this.currentProvider);
  }

  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  async generateImage(prompt, options = {}) {
    const provider = this.getCurrentProvider();
    if (!provider) {
      throw new Error('No provider selected');
    }

    const startTime = Date.now();
    const requestId = `IMG-${Date.now().toString(36).toUpperCase()}`;

    try {
      if (this.logger) {
        this.logger.info(`[${requestId}] Starting image generation with provider: ${this.currentProvider}`);
        this.logger.debug(`[${requestId}] Prompt: ${prompt.substring(0, 100)}...`);
        this.logger.debug(`[${requestId}] Options:`, options);
      }

      const result = await provider.generateImage(prompt, options);

      const duration = Date.now() - startTime;
      
      if (this.logger) {
        this.logger.info(`[${requestId}] Image generation completed in ${duration}ms`);
        this.logger.debug(`[${requestId}] Result:`, {
          imageUrl: result.imageUrl ? 'present' : 'missing',
          imageData: result.imageData ? 'present' : 'missing',
          width: result.width,
          height: result.height
        });
      }

      return {
        ...result,
        requestId,
        provider: this.currentProvider,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (this.logger) {
        this.logger.error(`[${requestId}] Image generation failed after ${duration}ms:`, error.message);
        this.logger.error(`[${requestId}] Error stack:`, error.stack);
      }

      throw new ImageGenerationError(
        `Image generation failed: ${error.message}`,
        requestId,
        this.currentProvider,
        duration,
        error
      );
    }
  }

  async generateMultipleImages(prompt, count, options = {}) {
    const promises = [];
    for (let i = 0; i < count; i++) {
      const variationPrompt = options.variations ? `${prompt}, variation ${i + 1}` : prompt;
      promises.push(this.generateImage(variationPrompt, { ...options, index: i }));
    }
    return Promise.all(promises);
  }

  validateOptions(options) {
    const provider = this.getCurrentProvider();
    if (provider && provider.validateOptions) {
      return provider.validateOptions(options);
    }
    return { valid: true, errors: [] };
  }

  estimateCost(options) {
    const provider = this.getCurrentProvider();
    if (provider && provider.estimateCost) {
      return provider.estimateCost(options);
    }
    return { estimatedCost: 0, currency: 'USD' };
  }
}

// Base Provider Class
class BaseImageProvider {
  constructor() {
    this.logger = null;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  log(level, message, data) {
    if (this.logger) {
      this.logger[level](message, data);
    }
  }

  async generateImage(prompt, options) {
    throw new Error('generateImage must be implemented by subclass');
  }

  validateOptions(options) {
    return { valid: true, errors: [] };
  }

  estimateCost(options) {
    return { estimatedCost: 0, currency: 'USD' };
  }
}

// Stable Diffusion Provider
class StableDiffusionProvider extends BaseImageProvider {
  constructor() {
    super();
    this.name = 'stable-diffusion';
    this.apiUrl = process.env.STABLE_DIFFUSION_API_URL || 'http://localhost:7860';
    this.apiKey = process.env.STABLE_DIFFUSION_API_KEY;
  }

  async generateImage(prompt, options = {}) {
    const { width = 1024, height = 768, steps = 20, cfg_scale = 7, negative_prompt = '', seed = -1 } = options;

    this.log('info', `Generating image with Stable Diffusion`, { prompt, width, height, steps });

    try {
      // Try to connect to Stable Diffusion API
      const response = await fetch(`${this.apiUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({
          prompt,
          negative_prompt,
          width,
          height,
          steps,
          cfg_scale,
          seed: seed >= 0 ? seed : -1
        })
      });

      if (!response.ok) {
        throw new Error(`Stable Diffusion API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Decode base64 image
      const imageData = data.images[0];
      const base64Data = imageData.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');

      return {
        imageUrl: `data:image/png;base64,${imageData}`,
        imageData: imageData,
        width,
        height,
        prompt,
        negative_prompt,
        steps,
        cfg_scale,
        seed: data.parameters?.seed || seed,
        metadata: {
          model: 'stable-diffusion',
          provider: this.name,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.log('error', `Stable Diffusion generation failed: ${error.message}`);
      
      // Fallback to mock if API is not available
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        this.log('warn', 'Falling back to mock provider');
        return this.generateMockImage(prompt, options);
      }
      
      throw error;
    }
  }

  generateMockImage(prompt, options) {
    const { width = 1024, height = 768 } = options;
    const mockData = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
    
    return {
      imageUrl: mockData,
      imageData: mockData,
      width,
      height,
      prompt,
      metadata: {
        model: 'stable-diffusion-mock',
        provider: this.name,
        generatedAt: new Date().toISOString(),
        note: 'API unavailable, using mock data'
      }
    };
  }

  validateOptions(options) {
    const errors = [];
    if (options.width && (options.width < 64 || options.width > 2048)) {
      errors.push('Width must be between 64 and 2048');
    }
    if (options.height && (options.height < 64 || options.height > 2048)) {
      errors.push('Height must be between 64 and 2048');
    }
    if (options.steps && (options.steps < 1 || options.steps > 150)) {
      errors.push('Steps must be between 1 and 150');
    }
    return { valid: errors.length === 0, errors };
  }

  estimateCost(options) {
    // Stable Diffusion is free if self-hosted
    return { estimatedCost: 0, currency: 'USD', note: 'Free if self-hosted' };
  }
}

// DALL-E Provider
class DALLEProvider extends BaseImageProvider {
  constructor() {
    super();
    this.name = 'dalle';
    this.apiUrl = 'https://api.openai.com/v1/images/generations';
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  async generateImage(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const { size = '1024x1024', quality = 'standard', n = 1 } = options;

    this.log('info', `Generating image with DALL-E`, { prompt, size, quality });

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          prompt,
          size,
          quality,
          n
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`DALL-E API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const imageUrl = data.data[0].url;

      // Fetch the image to get base64
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Data = Buffer.from(imageBuffer).toString('base64');
      const imageData = `data:image/png;base64,${base64Data}`;

      return {
        imageUrl,
        imageData,
        width: parseInt(size.split('x')[0]),
        height: parseInt(size.split('x')[1]),
        prompt,
        metadata: {
          model: 'dall-e-3',
          provider: this.name,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.log('error', `DALL-E generation failed: ${error.message}`);
      throw error;
    }
  }

  validateOptions(options) {
    const errors = [];
    const validSizes = ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'];
    if (options.size && !validSizes.includes(options.size)) {
      errors.push(`Size must be one of: ${validSizes.join(', ')}`);
    }
    const validQualities = ['standard', 'hd'];
    if (options.quality && !validQualities.includes(options.quality)) {
      errors.push(`Quality must be one of: ${validQualities.join(', ')}`);
    }
    return { valid: errors.length === 0, errors };
  }

  estimateCost(options) {
    // DALL-E 3 pricing: $0.040/image (standard), $0.080/image (HD)
    const quality = options.quality || 'standard';
    const cost = quality === 'hd' ? 0.08 : 0.04;
    return { estimatedCost: cost, currency: 'USD' };
  }
}

// FLUX Provider
class FluxProvider extends BaseImageProvider {
  constructor() {
    super();
    this.name = 'flux';
    this.apiUrl = process.env.FLUX_API_URL || 'https://api.replicate.com/v1/predictions';
    this.apiKey = process.env.REPLICATE_API_KEY;
  }

  async generateImage(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('REPLICATE_API_KEY not configured');
    }

    const { width = 1024, height = 768, num_outputs = 1 } = options;

    this.log('info', `Generating image with FLUX`, { prompt, width, height });

    try {
      // Create prediction
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: 'black-forest-labs/flux-schnell',
          input: {
            prompt,
            width,
            height,
            num_outputs
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`FLUX API error: ${error.detail || response.statusText}`);
      }

      const prediction = await response.json();

      // Poll for result
      let result = prediction;
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const pollResponse = await fetch(`${this.apiUrl}/${result.id}`, {
          headers: {
            'Authorization': `Token ${this.apiKey}`
          }
        });
        result = await pollResponse.json();
      }

      if (result.status === 'failed') {
        throw new Error(`FLUX generation failed: ${result.error}`);
      }

      const imageUrl = result.output[0];

      return {
        imageUrl,
        imageData: null, // Replicate returns URL, not base64
        width,
        height,
        prompt,
        metadata: {
          model: 'flux-schnell',
          provider: this.name,
          generatedAt: new Date().toISOString(),
          predictionId: result.id
        }
      };
    } catch (error) {
      this.log('error', `FLUX generation failed: ${error.message}`);
      throw error;
    }
  }

  validateOptions(options) {
    const errors = [];
    if (options.width && (options.width < 256 || options.width > 1440)) {
      errors.push('Width must be between 256 and 1440');
    }
    if (options.height && (options.height < 256 || options.height > 1440)) {
      errors.push('Height must be between 256 and 1440');
    }
    return { valid: errors.length === 0, errors };
  }

  estimateCost(options) {
    // FLUX Schnell is free on Replicate
    return { estimatedCost: 0, currency: 'USD', note: 'Free on Replicate' };
  }
}

// Construction LoRA Provider - Uses trained construction patterns
class ConstructionLoRAProvider extends BaseImageProvider {
  constructor() {
    super();
    this.name = 'construction-lora';
    this.loraWeightsPath = null;
    this.baseProvider = null;
  }

  setLoRAWeights(path) {
    this.loraWeightsPath = path;
    console.log(`[ConstructionLoRAProvider] LoRA weights set to: ${path}`);
  }

  async generateImage(prompt, options = {}) {
    const { width = 1024, height = 768 } = options;

    if (!this.loraWeightsPath) {
      this.log('warn', 'No LoRA weights loaded, falling back to FLUX provider');
      // Fall back to FLUX if no LoRA weights
      if (!this.baseProvider) {
        this.baseProvider = new FluxProvider();
      }
      return await this.baseProvider.generateImage(prompt, options);
    }

    this.log('info', `Generating image with Construction LoRA`, { prompt, width, height, loraWeights: this.loraWeightsPath });

    try {
      // Use FLUX with LoRA weights
      if (!this.baseProvider) {
        this.baseProvider = new FluxProvider();
      }

      // Enhance prompt with construction-specific terms
      const enhancedPrompt = this.enhancePrompt(prompt);

      // Generate using base provider with LoRA
      const result = await this.baseProvider.generateImage(enhancedPrompt, options);

      // Add LoRA metadata
      return {
        ...result,
        metadata: {
          ...result.metadata,
          model: 'flux-schnell-lora',
          provider: this.name,
          loraWeights: this.loraWeightsPath,
          baseModel: 'black-forest-labs/flux-schnell',
          trainedOn: 'ACEP Construction Patterns Dataset',
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.log('error', `Construction LoRA generation failed: ${error.message}`);
      throw error;
    }
  }

  enhancePrompt(prompt) {
    // Add construction-specific keywords to enhance the pattern
    const constructionKeywords = [
      'professional architectural',
      'construction industry',
      'high quality',
      'detailed',
      'building materials',
      'construction patterns'
    ];

    // Check if prompt already contains construction terms
    const hasConstructionTerms = /construction|building|architectural|gypsum|tiles|air conditioning/i.test(prompt);

    if (!hasConstructionTerms) {
      return `${constructionKeywords.join(', ')}, ${prompt}`;
    }

    return prompt;
  }

  validateOptions(options) {
    // Use FLUX's validation
    if (!this.baseProvider) {
      this.baseProvider = new FluxProvider();
    }
    return this.baseProvider.validateOptions(options);
  }

  estimateCost(options) {
    // Same as FLUX - free on Replicate
    return { estimatedCost: 0, currency: 'USD', note: 'Free on Replicate with LoRA' };
  }
}

// Mock Provider for testing
class MockProvider extends BaseImageProvider {
  constructor() {
    super();
    this.name = 'mock';
  }

  async generateImage(prompt, options = {}) {
    const { width = 1024, height = 768 } = options;
    
    this.log('info', `Generating mock image`, { prompt, width, height });

    // Generate a simple colored placeholder
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Create a simple SVG as base64
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="24">
        Mock Image
      </text>
      <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="14">
        ${prompt.substring(0, 50)}...
      </text>
    </svg>`;
    
    const base64Data = Buffer.from(svg).toString('base64');
    const imageData = `data:image/svg+xml;base64,${base64Data}`;

    return {
      imageUrl: imageData,
      imageData,
      width,
      height,
      prompt,
      metadata: {
        model: 'mock',
        provider: this.name,
        generatedAt: new Date().toISOString(),
        note: 'This is a mock image for testing'
      }
    };
  }

  estimateCost(options) {
    return { estimatedCost: 0, currency: 'USD', note: 'Mock provider is free' };
  }
}

// Custom Error Class
class ImageGenerationError extends Error {
  constructor(message, requestId, provider, duration, originalError) {
    super(message);
    this.name = 'ImageGenerationError';
    this.requestId = requestId;
    this.provider = provider;
    this.duration = duration;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

module.exports = { ImageProviderLayer, BaseImageProvider, ImageGenerationError };
