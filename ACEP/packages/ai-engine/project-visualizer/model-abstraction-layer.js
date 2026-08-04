// ============================================================
// طبقة التجريد للنماذج - Model Abstraction Layer
// تدعم 4 محركات: GPT Image, Stable Diffusion, FLUX, ComfyUI
// نمط التصميم: Strategy Pattern
// ============================================================

const https = require('https');
const http = require('http');

function httpRequest(url, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = mod.request(url, opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { resolve(Buffer.concat(chunks).toString()); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

// ============================================================
// Base Model (Interface simulated via JSDoc)
// ============================================================

class BaseModel {
  constructor() {
    this.name = '';
    this.capabilities = {};
  }

  async generate(prompt, params) {
    throw new Error('generate() must be implemented by subclass');
  }

  validate(prompt) {
    throw new Error('validate() must be implemented by subclass');
  }

  _mockResponse(prompt, params) {
    const resolution = params.resolution || this.capabilities.maxResolution;
    const imageUrl = `https://via.placeholder.com/${resolution.replace('x', '?text=')}?text=Generated+Image`;
    const imageData = Buffer.from(
      JSON.stringify({ mock: true, prompt, model: this.name, time: Date.now() })
    ).toString('base64');

    return {
      imageUrl,
      imageData,
      metadata: {
        model: this.name,
        prompt,
        params,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  _makeImageData(base64OrUrl) {
    return Buffer.from(JSON.stringify({ source: base64OrUrl, model: this.name, time: Date.now() })).toString('base64');
  }
}

// ============================================================
// GPT Image Model (OpenAI DALL-E)
// ============================================================

class GPTImageModel extends BaseModel {
  constructor() {
    super();
    this.name = 'gpt-image';
    this.capabilities = {
      maxResolution: '1024x1024',
      supportsEdits: true,
      supportsVariations: true,
      costPerImage: 0.04,
      apiRequired: true,
    };
  }

  async generate(prompt, params = {}) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const data = await httpRequest('https://api.openai.com/v1/images/generations', 'POST',
          JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: params.resolution || '1024x1024', quality: params.quality || 'standard' }),
          { Authorization: `Bearer ${apiKey}` }
        );
        if (data.data && data.data[0]) {
          const url = data.data[0].url;
          return {
            imageUrl: url,
            imageData: this._makeImageData(url),
            metadata: { model: this.name, prompt, params, generatedAt: new Date().toISOString(), cost: 0.04 },
          };
        }
      } catch (e) {
        console.warn(`[GPTImage] DALL-E API failed: ${e.message}, falling back to mock`);
      }
    }
    return this._mockResponse(prompt, params);
  }

  validate(prompt) {
    const issues = [];
    if (!prompt || prompt.trim().length === 0) issues.push('Prompt must not be empty');
    if (prompt && prompt.length > 4000) issues.push('GPT Image prompt must not exceed 4000 characters');
    const blocked = ['violence', 'explicit', 'gore'];
    for (const p of blocked) { if (prompt && prompt.toLowerCase().includes(p)) issues.push(`Prompt may violate content policy (contains: ${p})`); }
    return { valid: issues.length === 0, issues };
  }
}

// ============================================================
// Stable Diffusion Model (local / API)
// ============================================================

class StableDiffusionModel extends BaseModel {
  constructor() {
    super();
    this.name = 'stable-diffusion';
    this.capabilities = {
      maxResolution: '1024x1024',
      supportsEdits: true,
      supportsVariations: true,
      costPerImage: 0.0,
      apiRequired: false,
    };
  }

  async generate(prompt, params = {}) {
    const sdUrl = process.env.STABLE_DIFFUSION_URL || 'http://localhost:7860';
    try {
      const data = await httpRequest(`${sdUrl}/sdapi/v1/txt2img`, 'POST',
        JSON.stringify({ prompt, negative_prompt: params.negativePrompt || '', width: 1024, height: 1024, steps: params.steps || 20 })
      );
      if (data.images && data.images[0]) {
        const imgData = data.images[0];
        return {
          imageUrl: `data:image/png;base64,${imgData}`,
          imageData: Buffer.from(imgData, 'base64').toString('base64'),
          metadata: { model: this.name, prompt, params, generatedAt: new Date().toISOString(), cost: 0 },
        };
      }
    } catch (e) {
      console.warn(`[StableDiffusion] API failed: ${e.message}, falling back to mock`);
    }
    return this._mockResponse(prompt, params);
  }

  validate(prompt) {
    const issues = [];
    if (!prompt || prompt.trim().length === 0) issues.push('Prompt must not be empty');
    if (prompt && prompt.length > 5000) issues.push('Stable Diffusion prompt must not exceed 5000 characters');
    return { valid: issues.length === 0, issues };
  }
}

// ============================================================
// FLUX Model (Black Forest Labs)
// ============================================================

class FLUXModel extends BaseModel {
  constructor() {
    super();
    this.name = 'flux';
    this.capabilities = {
      maxResolution: '1024x1024',
      supportsEdits: false,
      supportsVariations: true,
      costPerImage: 0.01,
      apiRequired: true,
    };
  }

  async generate(prompt, params = {}) {
    const togetherKey = process.env.TOGETHER_API_KEY;
    if (togetherKey) {
      try {
        const data = await httpRequest('https://api.together.xyz/v1/images/generations', 'POST',
          JSON.stringify({ model: 'black-forest-labs/FLUX.1-schnell', prompt, n: 1, width: 1024, height: 1024 }),
          { Authorization: `Bearer ${togetherKey}` }
        );
        if (data.data && data.data[0]) {
          const url = data.data[0].url;
          return {
            imageUrl: url,
            imageData: this._makeImageData(url),
            metadata: { model: this.name, prompt, params, generatedAt: new Date().toISOString(), provider: 'together' },
          };
        }
      } catch (e) {
        console.warn(`[FLUX] Together API failed: ${e.message}`);
      }
    }
    const hfToken = process.env.HF_TOKEN;
    if (hfToken) {
      try {
        const data = await httpRequest('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', 'POST',
          JSON.stringify({ inputs: prompt }),
          { Authorization: `Bearer ${hfToken}` }
        );
        if (Buffer.isBuffer(data) || (typeof data === 'string' && data.length > 100)) {
          const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
          return {
            imageUrl: `data:image/png;base64,${buf.toString('base64')}`,
            imageData: buf.toString('base64'),
            metadata: { model: this.name, prompt, params, generatedAt: new Date().toISOString(), provider: 'huggingface' },
          };
        }
      } catch (e) {
        console.warn(`[FLUX] HF Inference failed: ${e.message}, falling back to mock`);
      }
    }
    return this._mockResponse(prompt, params);
  }

  validate(prompt) {
    const issues = [];
    if (!prompt || prompt.trim().length === 0) issues.push('Prompt must not be empty');
    if (prompt && prompt.length > 10000) issues.push('FLUX prompt must not exceed 10000 characters');
    return { valid: issues.length === 0, issues };
  }
}

// ============================================================
// ComfyUI Model (workflow-based)
// ============================================================

class ComfyUIModel extends BaseModel {
  constructor() {
    super();
    this.name = 'comfyui';
    this.capabilities = {
      maxResolution: '8192x8192',
      supportsEdits: true,
      supportsVariations: true,
      costPerImage: 0.0,
      apiRequired: false,
      workflowRequired: true,
    };
  }

  async generate(prompt, params = {}) {
    const comfyUrl = process.env.COMFYUI_URL || 'http://localhost:8188';
    const workflow = params.workflow;
    if (workflow) {
      try {
        const payload = { prompt: workflow };
        if (prompt) payload.prompt = { ...workflow, '3': { inputs: { text: prompt, ...(workflow['3']?.inputs || {}) }, class_type: 'CLIPTextEncode' } };
        const data = await httpRequest(`${comfyUrl}/prompt`, 'POST', JSON.stringify(payload));
        if (data.prompt_id) {
          for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 2000));
            try {
              const history = await httpRequest(`${comfyUrl}/history/${data.prompt_id}`);
              const outputs = history[data.prompt_id]?.outputs;
              if (outputs) {
                const imgNode = Object.values(outputs).find((o) => o.images && o.images.length > 0);
                if (imgNode) {
                  const img = imgNode.images[0];
                  const imgData = await httpRequest(`${comfyUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`);
                  const buf = Buffer.isBuffer(imgData) ? imgData : Buffer.from(JSON.stringify(imgData));
                  return {
                    imageUrl: `data:image/${img.format || 'png'};base64,${buf.toString('base64')}`,
                    imageData: buf.toString('base64'),
                    metadata: { model: this.name, prompt, params, generatedAt: new Date().toISOString(), prompt_id: data.prompt_id },
                  };
                }
              }
            } catch {}
          }
        }
      } catch (e) {
        console.warn(`[ComfyUI] API failed: ${e.message}, falling back to mock`);
      }
    }
    return this._mockResponse(prompt, params);
  }

  validate(prompt) {
    const issues = [];
    if (!prompt || prompt.trim().length === 0) issues.push('Prompt must not be empty');
    if (prompt && prompt.length > 20000) issues.push('ComfyUI prompt must not exceed 20000 characters');
    return { valid: issues.length === 0, issues };
  }
}

// ============================================================
// Model Abstraction Layer - الواجهة الرئيسية
// ============================================================

class ModelAbstractionLayer {
  constructor() {
    // تسجيل جميع النماذج المتاحة
    this._models = {
      'gpt-image': new GPTImageModel(),
      'stable-diffusion': new StableDiffusionModel(),
      'flux': new FLUXModel(),
      'comfyui': new ComfyUIModel(),
    };
  }

  /**
   * توليد صورة باستخدام النموذج المحدد
   * @param {string} modelName - اسم النموذج
   * @param {string} prompt - النص الوصفي
   * @param {object} [params={}] - معاملات إضافية
   * @returns {Promise<{imageUrl: string, imageData: string, metadata: object}>}
   */
  async generateImage(modelName, prompt, params = {}) {
    const model = this._getModel(modelName);
    const validation = model.validate(prompt);
    if (!validation.valid) {
      throw new Error(`Validation failed for model "${modelName}": ${validation.issues.join('; ')}`);
    }
    return model.generate(prompt, params);
  }

  /**
   * يرجع قائمة النماذج المتاحة مع إمكانياتها
   * @returns {Array<{name: string, capabilities: object}>}
   */
  getAvailableModels() {
    return Object.keys(this._models).map((name) => ({
      name,
      capabilities: this._models[name].capabilities,
    }));
  }

  /**
   * يرجع إمكانيات نموذج معين
   * @param {string} modelName
   * @returns {object|null}
   */
  getModelCapabilities(modelName) {
    const model = this._models[modelName];
    return model ? { ...model.capabilities } : null;
  }

  /**
   * التحقق من صحة الـ prompt لنموذج معين
   * @param {string} modelName
   * @param {string} prompt
   * @returns {{valid: boolean, issues: string[]}}
   */
  validatePrompt(modelName, prompt) {
    const model = this._getModel(modelName);
    return model.validate(prompt);
  }

  /**
   * تقدير تكلفة التوليد لنموذج معين
   * @param {string} modelName
   * @param {object} [params={}] - عدد الصور، الدقة، إلخ
   * @returns {{ cost: number, currency: string, breakdown: object }}
   */
  estimateCost(modelName, params = {}) {
    const capabilities = this.getModelCapabilities(modelName);
    if (!capabilities) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const imageCount = params.imageCount || 1;
    const costPerImage = capabilities.costPerImage;
    const totalCost = costPerImage * imageCount;

    return {
      cost: totalCost,
      currency: 'USD',
      breakdown: {
        perImage: costPerImage,
        imageCount,
        total: totalCost,
      },
    };
  }

  /**
   * تقدير الوقت اللازم للتوليد
   * @param {string} modelName
   * @param {object} [params={}]
   * @returns {{ estimatedMs: number, estimatedSeconds: number, details: string }}
   */
  estimateTime(modelName, params = {}) {
    const capabilities = this.getModelCapabilities(modelName);
    if (!capabilities) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    // تقديرات تقريبية بالمللي ثانية بناءً على النموذج
    const baseEstimates = {
      'gpt-image': 5000,
      'stable-diffusion': 15000,
      'flux': 8000,
      'comfyui': 20000,
    };

    const imageCount = params.imageCount || 1;
    const baseTime = baseEstimates[modelName] || 10000;
    const totalMs = baseTime * imageCount;

    return {
      estimatedMs: totalMs,
      estimatedSeconds: Math.round(totalMs / 1000),
      details: `Estimated ${Math.round(totalMs / 1000)}s for ${imageCount} image(s) using ${modelName}`,
    };
  }

  // ============================================================
  // دوال مساعدة داخلية
  // ============================================================

  /**
   * الحصول على كائن النموذج الداخلي
   * @param {string} modelName
   * @returns {BaseModel}
   */
  _getModel(modelName) {
    const model = this._models[modelName];
    if (!model) {
      throw new Error(
        `Unknown model: "${modelName}". Available models: ${Object.keys(this._models).join(', ')}`
      );
    }
    return model;
  }
}

// ============================================================
// التصدير
// ============================================================
module.exports = ModelAbstractionLayer;
