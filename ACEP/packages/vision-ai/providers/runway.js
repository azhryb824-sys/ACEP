const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionAI-Runway' });

class RunwayProvider {
  constructor() {
    this.name = 'runway';
    this.type = 'video';
    this.apiKey = process.env.RUNWAY_API_KEY;
    this.apiUrl = process.env.RUNWAY_API_URL || 'https://api.runwayml.com/v1';
    this.available = false;
  }

  async initialize() {
    if (!this.apiKey) {
      LOGGER.warn('Runway not available: RUNWAY_API_KEY not set');
      return false;
    }
    this.available = true;
    return true;
  }

  async generateVideo(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error(
        'مفتاح Runway API غير موجود. يرجى ضبط المتغير RUNWAY_API_KEY.\n' +
        'يمكنك الحصول على مفتاح من: https://runwayml.com/api'
      );
    }

    const { duration = 5, resolution = '1080p', fps = 24 } = options;

    LOGGER.info(`Generating video via Runway: ${prompt.substring(0, 80)}...`);

    const resp = await fetch(`${this.apiUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        prompt_text: prompt,
        model: 'gen3a_turbo',
        duration,
        resolution,
        fps,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`Runway API error (${resp.status}): ${err.error || resp.statusText}`);
    }

    const data = await resp.json();
    const taskId = data.id;

    let result = data;
    while (result.status !== 'SUCCEEDED' && result.status !== 'FAILED') {
      await new Promise(r => setTimeout(r, 3000));
      const poll = await fetch(`${this.apiUrl}/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(120000),
      });
      result = await poll.json();
    }

    if (result.status === 'FAILED') {
      throw new Error(`Runway generation failed: ${result.failure_reason}`);
    }

    const videoUrl = result.output;
    const videoResp = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) });
    const videoBuffer = Buffer.from(await videoResp.arrayBuffer());

    return {
      videoBuffer,
      videoData: videoBuffer.toString('base64'),
      mimeType: 'video/mp4',
      duration: result.duration || duration,
      resolution,
      fps,
      prompt,
      model: 'gen3a_turbo',
      providerMetadata: { taskId },
    };
  }

  estimateCost(options = {}) {
    const duration = options.duration || 5;
    return { estimatedCost: duration * 0.05, currency: 'USD' };
  }
}

module.exports = RunwayProvider;