const { getLogger } = require('../logger');
const { detectMimeType } = require('../shared/format-detection');
const LOGGER = getLogger({ service: 'VisionAI-Together' });

class TogetherProvider {
  constructor() {
    this.name = 'together';
    this.type = 'image';
    this.apiKey = process.env.TOGETHER_API_KEY;
    this.apiUrl = 'https://api.together.xyz/v1/images/generations';
    this.available = false;
  }

  async initialize() {
    if (!this.apiKey) {
      LOGGER.warn('Together AI not available: TOGETHER_API_KEY not set');
      return false;
    }
    this.available = true;
    return true;
  }

  async generateImage(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error(
        'مفتاح Together AI غير موجود. سجل في https://api.together.ai واحصل على مفتاح مجاني.\n' +
        'يوفر Together AI نموذج FLUX.1-schnell مجاناً بدون بطاقة ائتمان.'
      );
    }

    const { width = 1024, height = 768, steps = 4 } = options;

    LOGGER.info(`Generating image via Together FLUX: ${prompt.substring(0, 80)}...`);

    const resp = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell-Free',
        prompt,
        width,
        height,
        steps,
        n: 1,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(
        `Together AI error (${resp.status}): ${err.error?.message || err.error || resp.statusText}`
      );
    }

    const data = await resp.json();
    const imageUrl = data.data[0].url;

    const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
    const imageBuffer = Buffer.from(await imgResp.arrayBuffer());

    const mimeType = detectMimeType(imageBuffer);

    return {
      imageBuffer,
      imageData: imageBuffer.toString('base64'),
      mimeType,
      width,
      height,
      model: 'FLUX.1-schnell-Free',
      prompt,
      providerMetadata: { provider: 'together-ai' },
    };
  }

  estimateCost() {
    return { estimatedCost: 0, currency: 'USD', note: 'Free tier (rate-limited)' };
  }
}

module.exports = TogetherProvider;
