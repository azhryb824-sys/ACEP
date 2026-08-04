const { getLogger } = require('../logger');
const { FORBIDDEN_NEGATIVE } = require('../shared/forbidden-content');

const LOGGER = getLogger({ service: 'VisionAI-StableDiffusion' });

class StableDiffusionProvider {
  constructor() {
    this.name = 'stable-diffusion';
    this.type = 'image';
    this.apiUrl = process.env.STABLE_DIFFUSION_URL || 'http://localhost:7860';
    this.apiKey = process.env.STABLE_DIFFUSION_KEY || null;
    this.available = false;
    this.modelInfo = null;
  }

  async initialize() {
    try {
      const resp = await fetch(`${this.apiUrl}/sdapi/v1/options`, {
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        this.available = true;
        LOGGER.info(`Stable Diffusion available at ${this.apiUrl}`);
        return true;
      }
    } catch (e) {
      LOGGER.warn(`Stable Diffusion NOT available at ${this.apiUrl}: ${e.message}`);
    }
    this.available = false;
    return false;
  }

  async generateImage(prompt, options = {}) {
    if (!this.available) {
      const initOk = await this.initialize();
      if (!initOk) {
        throw new Error(
          `محرك Stable Diffusion غير متصل. يرجى تشغيل Stable Diffusion على ${this.apiUrl}\n` +
          `أو استخدام مزود آخر (DALL-E / FLUX) عبر ضبط متغيرات البيئة.\n` +
          `للتثبيت: https://github.com/AUTOMATIC1111/stable-diffusion-webui`
        );
      }
    }

    const {
      width = 1024, height = 768, steps = 3,
      cfgScale = 7, seed = -1, negativePrompt = '',
      sampler = 'DPM++ 2M Karras',
    } = options;

    LOGGER.info(`Generating image via SD: ${prompt.substring(0, 80)}...`);

    const resp = await fetch(`${this.apiUrl}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: [negativePrompt, FORBIDDEN_NEGATIVE].filter(Boolean).join(', '),
        width, height, steps,
        cfg_scale: cfgScale,
        seed: seed >= 0 ? seed : -1,
        sampler_name: sampler,
        save_images: false,
        send_images: true,
      }),
      signal: AbortSignal.timeout(1200000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => resp.statusText);
      throw new Error(`Stable Diffusion API error (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    if (!data.images || data.images.length === 0) {
      throw new Error('Stable Diffusion returned no images');
    }

    const base64Data = data.images[0];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const info = data.info ? JSON.parse(data.info) : {};

    return {
      imageBuffer,
      imageData: base64Data,
      mimeType: 'image/png',
      width: info.width || width,
      height: info.height || height,
      seed: info.seed || seed,
      model: info.sd_model_name || 'unknown',
      prompt,
      providerMetadata: { sampler, steps, cfgScale },
    };
  }

  async generateImageFromImage(initImage, prompt, options = {}) {
    if (!this.available) await this.initialize();
    const { width = 1024, height = 768, denoisingStrength = 0.75 } = options;

    const resp = await fetch(`${this.apiUrl}/sdapi/v1/img2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        init_images: [initImage.toString('base64')],
        prompt,
        width, height,
        denoising_strength: denoisingStrength,
      }),
      signal: AbortSignal.timeout(1200000),
    });

    if (!resp.ok) throw new Error(`SD img2img error: ${resp.status}`);
    const data = await resp.json();
    return {
      imageBuffer: Buffer.from(data.images[0], 'base64'),
      imageData: data.images[0],
      mimeType: 'image/png',
    };
  }

  estimateCost() {
    return { estimatedCost: 0, currency: 'USD', note: 'Free (self-hosted)' };
  }
}

module.exports = StableDiffusionProvider;