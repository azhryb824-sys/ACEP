const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionAI-DALLE' });

class DALLEProvider {
  constructor() {
    this.name = 'dalle';
    this.type = 'image';
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1/images/generations';
    this.available = false;
  }

  async initialize() {
    if (!this.apiKey) {
      LOGGER.warn('DALL-E not available: OPENAI_API_KEY not set');
      return false;
    }
    this.available = true;
    return true;
  }

  async generateImage(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error(
        'مفتاح OpenAI API غير موجود. يرجى ضبط المتغير OPENAI_API_KEY.\n' +
        'يمكنك الحصول على مفتاح من: https://platform.openai.com/api-keys'
      );
    }

    const { size = '1024x1024', quality = 'standard', n = 1 } = options;

    LOGGER.info(`Generating image via DALL-E: ${prompt.substring(0, 80)}...`);

    const resp = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ prompt, size, quality, n }),
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(
        `DALL-E API error (${resp.status}): ${err.error?.message || resp.statusText}\n` +
        `راجع: https://platform.openai.com/account/usage`
      );
    }

    const data = await resp.json();
    const imageUrl = data.data[0].url;

    const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
    const imageBuffer = Buffer.from(await imgResp.arrayBuffer());

    return {
      imageBuffer,
      imageData: imageBuffer.toString('base64'),
      mimeType: 'image/png',
      width: parseInt(size.split('x')[0]),
      height: parseInt(size.split('x')[1]),
      model: 'dall-e-3',
      prompt,
      revisedPrompt: data.data[0].revised_prompt || prompt,
      providerMetadata: { quality, size },
    };
  }

  estimateCost(options = {}) {
    const quality = options.quality || 'standard';
    const cost = quality === 'hd' ? 0.08 : 0.04;
    return { estimatedCost: cost, currency: 'USD', note: `DALL-E 3 ${quality}` };
  }
}

module.exports = DALLEProvider;