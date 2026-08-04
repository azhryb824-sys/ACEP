"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmService = exports.LLMService = void 0;
const axios_1 = __importDefault(require("axios"));
class LLMService {
    config = {
        provider: 'mock',
        model: 'gpt-4o-mini',
        maxTokens: 1024,
        temperature: 0.3,
    };
    initialized = false;
    async initialize(config) {
        if (config)
            this.config = { ...this.config, ...config };
        if (!this.config.baseUrl) {
            if (this.config.provider === 'express-bridge') {
                this.config.baseUrl = process.env.ACEP_ANALYSIS_URL || 'http://localhost:3000';
            }
            else if (this.config.provider === 'together') {
                this.config.baseUrl = 'https://api.together.xyz/v1';
            }
            else if (this.config.provider === 'openai') {
                this.config.baseUrl = 'https://api.openai.com/v1';
            }
        }
        if (!this.config.apiKey && (this.config.provider === 'openai' || this.config.provider === 'together')) {
            this.config.apiKey = process.env.OPENAI_API_KEY || process.env.TOGETHER_API_KEY || '';
        }
        this.initialized = true;
    }
    async generate(prompt, system) {
        this.ensureInitialized();
        const t0 = Date.now();
        try {
            const result = await this._call(prompt, system);
            return { ...result, latencyMs: Date.now() - t0 };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (this.config.provider !== 'mock') {
                console.warn(`[LLM] ${this.config.provider} failed (${msg}), falling back to mock`);
            }
            return { text: `[Mock] ${prompt.slice(0, 100)}`, tokens: 0, model: 'mock', latencyMs: Date.now() - t0 };
        }
    }
    async analyze(instruction, context) {
        this.ensureInitialized();
        if (this.config.provider === 'express-bridge') {
            try {
                const r = await axios_1.default.post(`${this.config.baseUrl}/api/v1/analyze`, {
                    description: context ? `${context}: ${instruction}` : instruction,
                }, { timeout: 30000 });
                return { source: 'express-bridge', data: r.data, success: true };
            }
            catch {
                return { source: 'express-bridge', success: false, error: 'Express server unavailable' };
            }
        }
        const resp = await this.generate(`Analyze the following construction engineering text and return key findings:\n\n${instruction}`, 'You are an expert construction engineering analyst.');
        return { source: this.config.provider, analysis: resp.text, tokens: resp.tokens };
    }
    async generateQuestions(context) {
        const resp = await this.generate(`Generate clarifying questions about this project:\n\n${context}`);
        return resp.text.split('\n').map(l => l.trim()).filter(l => l.endsWith('?'));
    }
    async explain(decision) {
        const resp = await this.generate(`Explain the reasoning behind this engineering decision:\n\n${decision}`, 'You are a senior construction engineer providing clear explanations.');
        return resp.text;
    }
    isInitialized() { return this.initialized; }
    getConfig() { return { ...this.config }; }
    ensureInitialized() {
        if (!this.initialized)
            throw new Error('LLMService not initialized. Call initialize() first.');
    }
    async _call(prompt, system) {
        if (this.config.provider === 'mock') {
            return { text: `[Mock] ${prompt.slice(0, 100)}`, tokens: 0, model: 'mock' };
        }
        if (this.config.provider === 'express-bridge') {
            const r = await axios_1.default.post(`${this.config.baseUrl}/api/v1/chat`, {
                message: prompt,
            }, { timeout: 60000 });
            const data = r.data;
            return { text: data.response || data.reply || JSON.stringify(data), tokens: data.tokens || 0, model: 'acep-express' };
        }
        const headers = { 'Content-Type': 'application/json' };
        if (this.config.apiKey)
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        const body = {
            model: this.config.model || 'gpt-4o-mini',
            messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                { role: 'user', content: prompt },
            ],
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
        };
        const r = await axios_1.default.post(`${this.config.baseUrl}/chat/completions`, body, { headers, timeout: 60000 });
        const choice = r.data.choices?.[0];
        return {
            text: choice?.message?.content || '',
            tokens: r.data.usage?.total_tokens || 0,
            model: r.data.model || this.config.model || 'unknown',
        };
    }
}
exports.LLMService = LLMService;
exports.llmService = new LLMService();
//# sourceMappingURL=index.js.map