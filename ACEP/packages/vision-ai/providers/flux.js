const { getLogger } = require('../logger');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { detectMimeType } = require('../shared/format-detection');

const LOGGER = getLogger({ service: 'VisionAI-FLUX' });

class FluxProvider {
  constructor() {
    this.name = 'flux';
    this.type = 'image';
    this.apiKey = process.env.REPLICATE_API_KEY;
    this.apiUrl = 'https://api.replicate.com/v1/predictions';
    this.available = false;
    this.scriptPath = path.join(__dirname, 'flux_local.py');
    this.pythonExe = process.env.PYTHON_PATH || 'C:\\Users\\Abdulrahman\\AppData\\Local\\Python\\bin\\python.exe';
  }

  async initialize() {
    if (!this.apiKey) {
      LOGGER.warn('FLUX not available: REPLICATE_API_KEY not set');
      return false;
    }
    this.available = true;
    return true;
  }

  async generateImage(prompt, options = {}) {
    const { width = 1024, height = 768 } = options;
    if (this.apiKey) {
      try {
        return await this._generateReplicate(prompt, width, height, options);
      } catch (err) {
        if (err.message && err.message.includes('402')) {
          LOGGER.warn('Replicate has insufficient credits, falling back to local inference');
        } else {
          LOGGER.warn(`Replicate failed (${err.message}), falling back to local inference`);
        }
      }
    }
    return await this._generateLocal(prompt, width, height, options);
  }

  async _generateReplicate(prompt, width, height, options = {}) {
    const { numOutputs = 1 } = options;

    LOGGER.info(`Generating image via Replicate FLUX: ${prompt.substring(0, 80)}...`);

    const resp = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'black-forest-labs/flux-schnell',
        input: { prompt, width, height, num_outputs: numOutputs },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(
        `FLUX API error (${resp.status}): ${err.detail || resp.statusText}`
      );
    }

    const prediction = await resp.json();
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await fetch(`${this.apiUrl}/${result.id}`, {
        headers: { 'Authorization': `Token ${this.apiKey}` },
        signal: AbortSignal.timeout(60000),
      });
      result = await poll.json();
    }

    if (result.status === 'failed') {
      throw new Error(`FLUX generation failed: ${result.error}`);
    }

    const imageUrl = result.output[0];
    const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
    const imageBuffer = Buffer.from(await imgResp.arrayBuffer());

    const mimeType = detectMimeType(imageBuffer);

    return {
      imageBuffer,
      imageData: imageBuffer.toString('base64'),
      mimeType,
      width, height,
      model: 'flux-schnell',
      prompt,
      providerMetadata: { predictionId: result.id },
    };
  }

  async _generateLocal(prompt, width, height, options = {}) {
    const steps = options.steps || 4;
    const tempDir = path.join(__dirname, '..', 'storage');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const outputFile = path.join(tempDir, `flux_local_${Date.now()}.png`);
    const configFile = path.join(tempDir, `flux_local_${Date.now()}.json`);

    LOGGER.info(`Generating image via local FLUX: ${prompt.substring(0, 80)}...`);

    const config = {
      prompt,
      output: outputFile,
      width: Math.min(width, 1024),
      height: Math.min(height, 1024),
      steps,
    };
    fs.writeFileSync(configFile, JSON.stringify(config), 'utf-8');

    const result = await new Promise((resolve, reject) => {
      execFile(this.pythonExe, [this.scriptPath, configFile], {
        timeout: 1800000,
        maxBuffer: 5 * 1024 * 1024,
        env: {
          ...process.env,
          HF_HOME: process.env.HF_HOME || 'D:\\huggingface',
          HF_TOKEN: process.env.HF_TOKEN || '',
        },
      }, (error, stdout, stderr) => {
        try { fs.unlinkSync(configFile); } catch (e) {}
        if (error) {
          return reject(new Error(`Local FLUX error: ${error.message}\nSTDERR: ${stderr}\nSTDOUT: ${stdout || ''}`));
        }
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch (e) {
          reject(new Error(`Local FLUX parse error: stdout="${stdout.substring(0, 500)}"\nSTDERR="${stderr}"`));
        }
      });
    });

    if (!result.success) {
      throw new Error(`Local FLUX failed: ${result.error}`);
    }

    const imageBuffer = fs.readFileSync(outputFile);

    const mimeType = detectMimeType(imageBuffer);

    return {
      imageBuffer,
      imageData: imageBuffer.toString('base64'),
      mimeType,
      width: result.width,
      height: result.height,
      model: 'flux-schnell',
      prompt,
      providerMetadata: { local: true, provider: 'hf-inference', timings: result.timings },
    };
  }

  estimateCost() {
    return { estimatedCost: 0, currency: 'USD', note: 'Local inference (SD3.5-medium)' };
  }
}

module.exports = FluxProvider;