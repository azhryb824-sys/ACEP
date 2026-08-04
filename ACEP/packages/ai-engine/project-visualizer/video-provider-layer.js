/**
 * Video Provider Layer - Abstract Layer for Video Generation Providers
 * Supports multiple providers: Runway, Pika, Stability AI, etc.
 * Can be easily extended with new providers without changing the rest of the system.
 */

class VideoProviderLayer {
  constructor() {
    this.providers = new Map();
    this.currentProvider = null;
    this.logger = null;
    
    // Register built-in providers
    this.registerProvider('runway', new RunwayProvider());
    this.registerProvider('pika', new PikaProvider());
    this.registerProvider('stability', new StabilityVideoProvider());
    this.registerProvider('mock', new MockVideoProvider());
    
    // Set default provider
    this.setProvider('mock'); // Default to mock for safety
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
      this.logger.info(`Registered video provider: ${name}`);
    }
  }

  setProvider(providerName) {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} not found`);
    }
    this.currentProvider = providerName;
    if (this.logger) {
      this.logger.info(`Set current video provider to: ${providerName}`);
    }
  }

  getCurrentProvider() {
    return this.providers.get(this.currentProvider);
  }

  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  async generateVideo(prompt, options = {}) {
    const provider = this.getCurrentProvider();
    if (!provider) {
      throw new Error('No provider selected');
    }

    const startTime = Date.now();
    const requestId = `VID-${Date.now().toString(36).toUpperCase()}`;

    try {
      if (this.logger) {
        this.logger.info(`[${requestId}] Starting video generation with provider: ${this.currentProvider}`);
        this.logger.debug(`[${requestId}] Prompt: ${prompt.substring(0, 100)}...`);
        this.logger.debug(`[${requestId}] Options:`, options);
      }

      const result = await provider.generateVideo(prompt, options);

      const duration = Date.now() - startTime;
      
      if (this.logger) {
        this.logger.info(`[${requestId}] Video generation completed in ${duration}ms`);
        this.logger.debug(`[${requestId}] Result:`, {
          videoUrl: result.videoUrl ? 'present' : 'missing',
          videoData: result.videoData ? 'present' : 'missing',
          duration: result.duration,
          resolution: result.resolution
        });
      }

      return {
        ...result,
        requestId,
        provider: this.currentProvider,
        generationDuration: duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (this.logger) {
        this.logger.error(`[${requestId}] Video generation failed after ${duration}ms:`, error.message);
        this.logger.error(`[${requestId}] Error stack:`, error.stack);
      }

      throw new VideoGenerationError(
        `Video generation failed: ${error.message}`,
        requestId,
        this.currentProvider,
        duration,
        error
      );
    }
  }

  async generateVideoFromImages(images, options = {}) {
    const provider = this.getCurrentProvider();
    if (!provider) {
      throw new Error('No provider selected');
    }

    const startTime = Date.now();
    const requestId = `VID-IMG-${Date.now().toString(36).toUpperCase()}`;

    try {
      if (this.logger) {
        this.logger.info(`[${requestId}] Starting video generation from ${images.length} images`);
      }

      const result = await provider.generateVideoFromImages(images, options);

      const duration = Date.now() - startTime;
      
      if (this.logger) {
        this.logger.info(`[${requestId}] Video generation from images completed in ${duration}ms`);
      }

      return {
        ...result,
        requestId,
        provider: this.currentProvider,
        generationDuration: duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (this.logger) {
        this.logger.error(`[${requestId}] Video generation from images failed after ${duration}ms:`, error.message);
      }

      throw new VideoGenerationError(
        `Video generation from images failed: ${error.message}`,
        requestId,
        this.currentProvider,
        duration,
        error
      );
    }
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

  estimateRenderingTime(videoType, duration, quality = 'medium') {
    const provider = this.getCurrentProvider();
    if (provider && provider.estimateRenderingTime) {
      return provider.estimateRenderingTime(videoType, duration, quality);
    }
    return { estimatedTime: 0, unit: 'seconds' };
  }
}

// Base Provider Class
class BaseVideoProvider {
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

  async generateVideo(prompt, options) {
    throw new Error('generateVideo must be implemented by subclass');
  }

  async generateVideoFromImages(images, options) {
    throw new Error('generateVideoFromImages must be implemented by subclass');
  }

  validateOptions(options) {
    return { valid: true, errors: [] };
  }

  estimateCost(options) {
    return { estimatedCost: 0, currency: 'USD' };
  }

  estimateRenderingTime(videoType, duration, quality) {
    return { estimatedTime: 0, unit: 'seconds' };
  }
}

// Runway Provider
class RunwayProvider extends BaseVideoProvider {
  constructor() {
    super();
    this.name = 'runway';
    this.apiUrl = process.env.RUNWAY_API_URL || 'https://api.runwayml.com/v1';
    this.apiKey = process.env.RUNWAY_API_KEY;
  }

  async generateVideo(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('RUNWAY_API_KEY not configured');
    }

    const { duration = 5, resolution = '1080p', fps = 24 } = options;

    this.log('info', `Generating video with Runway`, { prompt, duration, resolution });

    try {
      const response = await fetch(`${this.apiUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          prompt_text: prompt,
          model: 'gen3a_turbo',
          duration,
          resolution,
          fps
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Runway API error: ${error.error || response.statusText}`);
      }

      const data = await response.json();
      const taskId = data.id;

      // Poll for result
      let result = data;
      while (result.status !== 'SUCCEEDED' && result.status !== 'FAILED') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const pollResponse = await fetch(`${this.apiUrl}/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        });
        result = await pollResponse.json();
      }

      if (result.status === 'FAILED') {
        throw new Error(`Runway generation failed: ${result.failure_reason}`);
      }

      return {
        videoUrl: result.output,
        videoData: null,
        duration: result.duration || duration,
        resolution,
        fps,
        prompt,
        metadata: {
          model: 'gen3a_turbo',
          provider: this.name,
          generatedAt: new Date().toISOString(),
          taskId
        }
      };
    } catch (error) {
      this.log('error', `Runway generation failed: ${error.message}`);
      
      throw error;
    }
  }

  async generateVideoFromImages(images, options = {}) {
    const { duration = 5, fps = 24 } = options;

    this.log('info', `Generating video from ${images.length} images with Runway`);

    try {
      const response = await fetch(`${this.apiUrl}/generate/image-to-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          image: images[0], // Use first image as reference
          model: 'gen3a_turbo',
          duration,
          fps
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Runway API error: ${error.error || response.statusText}`);
      }

      const data = await response.json();
      
      // Poll for result (similar to above)
      // ... polling logic ...

      return {
        videoUrl: data.output,
        videoData: null,
        duration,
        fps,
        metadata: {
          model: 'gen3a_turbo',
          provider: this.name,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.log('error', `Runway image-to-video failed: ${error.message}`);
      throw error;
    }
  }

  validateOptions(options) {
    const errors = [];
    if (options.duration && (options.duration < 1 || options.duration > 30)) {
      errors.push('Duration must be between 1 and 30 seconds');
    }
    const validResolutions = ['720p', '1080p', '4K'];
    if (options.resolution && !validResolutions.includes(options.resolution)) {
      errors.push(`Resolution must be one of: ${validResolutions.join(', ')}`);
    }
    return { valid: errors.length === 0, errors };
  }

  estimateCost(options) {
    // Runway pricing varies by plan
    const duration = options.duration || 5;
    const costPerSecond = 0.05; // Example pricing
    return { estimatedCost: duration * costPerSecond, currency: 'USD' };
  }

  estimateRenderingTime(videoType, duration, quality) {
    // Runway is fast, typically 1-2x real-time
    const multiplier = quality === 'high' ? 2 : 1;
    return { estimatedTime: duration * multiplier, unit: 'seconds' };
  }
}

// Pika Provider
class PikaProvider extends BaseVideoProvider {
  constructor() {
    super();
    this.name = 'pika';
    this.apiUrl = process.env.PIKA_API_URL || 'https://api.pika.art/v1';
    this.apiKey = process.env.PIKA_API_KEY;
  }

  async generateVideo(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('PIKA_API_KEY not configured');
    }

    const { duration = 3, frame_rate = 24 } = options;

    this.log('info', `Generating video with Pika`, { prompt, duration });

    try {
      const response = await fetch(`${this.apiUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          prompt,
          duration,
          frame_rate,
          model: 'pika-1.0'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Pika API error: ${error.error || response.statusText}`);
      }

      const data = await response.json();
      
      return {
        videoUrl: data.video_url,
        videoData: null,
        duration: data.duration || duration,
        fps: frame_rate,
        prompt,
        metadata: {
          model: 'pika-1.0',
          provider: this.name,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.log('error', `Pika generation failed: ${error.message}`);
      throw error;
    }
  }

  async generateVideoFromImages(images, options = {}) {
    // Pika supports image-to-video
    const { duration = 3 } = options;

    this.log('info', `Generating video from images with Pika`);

    try {
      const response = await fetch(`${this.apiUrl}/generate/image-to-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          image: images[0],
          duration,
          model: 'pika-1.0'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Pika API error: ${error.error || response.statusText}`);
      }

      const data = await response.json();
      
      return {
        videoUrl: data.video_url,
        videoData: null,
        duration,
        metadata: {
          model: 'pika-1.0',
          provider: this.name,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.log('error', `Pika image-to-video failed: ${error.message}`);
      throw error;
    }
  }

  estimateCost(options) {
    // Pika pricing
    const duration = options.duration || 3;
    const costPerSecond = 0.03;
    return { estimatedCost: duration * costPerSecond, currency: 'USD' };
  }
}

// Stability AI Video Provider
class StabilityVideoProvider extends BaseVideoProvider {
  constructor() {
    super();
    this.name = 'stability';
    this.apiUrl = process.env.STABILITY_API_URL || 'https://api.stability.ai/v2beta/video';
    this.apiKey = process.env.STABILITY_API_KEY;
  }

  async generateVideo(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('STABILITY_API_KEY not configured');
    }

    const { width = 1024, height = 576, seed = 0 } = options;

    this.log('info', `Generating video with Stability AI`, { prompt, width, height });

    try {
      const response = await fetch(`${this.apiUrl}/svd/xt2vid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt }],
          cfg_scale: 7,
          motion_bucket_id: 127,
          seed,
          width,
          height
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Stability API error: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      
      return {
        videoUrl: data.video,
        videoData: null,
        duration: 4, // SVD generates 4-second videos
        resolution: `${width}x${height}`,
        fps: 24,
        prompt,
        metadata: {
          model: 'svd-xt',
          provider: this.name,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.log('error', `Stability generation failed: ${error.message}`);
      throw error;
    }
  }

  estimateCost(options) {
    // Stability AI pricing
    return { estimatedCost: 0.05, currency: 'USD', note: 'Per video generation' };
  }
}

// Mock Video Provider
class MockVideoProvider extends BaseVideoProvider {
  constructor() {
    super();
    this.name = 'mock';
  }

  async generateVideo(prompt, options = {}) {
    const { duration = 5, resolution = '1080p' } = options;
    
    this.log('info', `Generating mock video`, { prompt, duration, resolution });

    return {
      videoUrl: 'https://example.com/mock-video.mp4',
      videoData: null,
      duration,
      resolution,
      fps: 24,
      prompt,
      metadata: {
        model: 'mock',
        provider: this.name,
        generatedAt: new Date().toISOString(),
        note: 'This is a mock video for testing'
      }
    };
  }

  async generateVideoFromImages(images, options = {}) {
    const { duration = 5 } = options;
    
    this.log('info', `Generating mock video from ${images.length} images`);

    return {
      videoUrl: 'https://example.com/mock-video-from-images.mp4',
      videoData: null,
      duration,
      fps: 24,
      metadata: {
        model: 'mock',
        provider: this.name,
        generatedAt: new Date().toISOString(),
        note: 'Mock video from images'
      }
    };
  }

  estimateCost(options) {
    return { estimatedCost: 0, currency: 'USD', note: 'Mock provider is free' };
  }

  estimateRenderingTime(videoType, duration, quality) {
    return { estimatedTime: 1, unit: 'seconds', note: 'Mock is instant' };
  }
}

// Custom Error Class
class VideoGenerationError extends Error {
  constructor(message, requestId, provider, duration, originalError) {
    super(message);
    this.name = 'VideoGenerationError';
    this.requestId = requestId;
    this.provider = provider;
    this.duration = duration;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

module.exports = { VideoProviderLayer, BaseVideoProvider, VideoGenerationError };
