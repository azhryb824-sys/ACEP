"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.embeddingService = exports.EmbeddingService = void 0;
const axios_1 = __importDefault(require("axios"));
const EMBEDDING_DEFAULTS = {
    openai: { model: 'text-embedding-3-small', dimensions: 1536 },
    together: { model: 'togethercomputer/m2-bert-80M-8k-retrieval', dimensions: 768 },
    synthetic: { model: 'synthetic-hash', dimensions: 128 },
};
class EmbeddingService {
    config = { provider: 'synthetic', dimensions: 128 };
    docs = new Map();
    initialized = false;
    async initialize(config) {
        if (config)
            this.config = { ...this.config, ...config };
        const defaults = EMBEDDING_DEFAULTS[this.config.provider];
        this.config.model = this.config.model || defaults.model;
        this.config.dimensions = this.config.dimensions || defaults.dimensions;
        if (!this.config.baseUrl) {
            if (this.config.provider === 'openai')
                this.config.baseUrl = 'https://api.openai.com/v1';
            if (this.config.provider === 'together')
                this.config.baseUrl = 'https://api.together.xyz/v1';
        }
        if (!this.config.apiKey && (this.config.provider === 'openai' || this.config.provider === 'together')) {
            this.config.apiKey = process.env.OPENAI_API_KEY || process.env.TOGETHER_API_KEY || '';
        }
        this.initialized = true;
    }
    async generateEmbedding(text) {
        this.ensureInitialized();
        if (this.config.provider === 'synthetic')
            return this._syntheticEmbedding(text);
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this.config.apiKey)
                headers['Authorization'] = `Bearer ${this.config.apiKey}`;
            const r = await axios_1.default.post(`${this.config.baseUrl}/embeddings`, {
                model: this.config.model,
                input: text,
            }, { headers, timeout: 30000 });
            return r.data.data?.[0]?.embedding || this._syntheticEmbedding(text);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[Embeddings] API call failed (${msg}), using synthetic fallback`);
            return this._syntheticEmbedding(text);
        }
    }
    async indexDocument(content, metadata = {}) {
        this.ensureInitialized();
        const embedding = await this.generateEmbedding(content);
        const doc = {
            id: this._makeId(content),
            content,
            metadata,
            embedding,
            createdAt: new Date().toISOString(),
        };
        this.docs.set(doc.id, doc);
        return doc;
    }
    async searchSimilar(query, topK = 5) {
        this.ensureInitialized();
        if (this.docs.size === 0)
            return [];
        const queryEmb = await this.generateEmbedding(query);
        const results = [];
        for (const doc of this.docs.values()) {
            const score = this._cosineSimilarity(queryEmb, doc.embedding);
            results.push({ doc, score });
        }
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, topK);
    }
    removeDocument(id) { return this.docs.delete(id); }
    getDocumentCount() { return this.docs.size; }
    isInitialized() { return this.initialized; }
    getConfig() { return { ...this.config }; }
    ensureInitialized() {
        if (!this.initialized)
            throw new Error('EmbeddingService not initialized. Call initialize() first.');
    }
    _cosineSimilarity(a, b) {
        if (a.length !== b.length)
            return 0;
        let dot = 0, na = 0, nb = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        const denom = Math.sqrt(na) * Math.sqrt(nb);
        return denom === 0 ? 0 : dot / denom;
    }
    _syntheticEmbedding(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
        }
        const dim = this.config.dimensions || 128;
        const emb = [];
        for (let i = 0; i < dim; i++) {
            emb.push(Math.sin(hash * (i + 1) * 0.01) * 0.5 + 0.5);
        }
        return emb;
    }
    _makeId(content) {
        let h = 0;
        for (let i = 0; i < content.length; i++) {
            h = ((h << 5) - h + content.charCodeAt(i)) | 0;
        }
        return `doc-${Math.abs(h).toString(36)}-${Date.now().toString(36)}`;
    }
}
exports.EmbeddingService = EmbeddingService;
exports.embeddingService = new EmbeddingService();
//# sourceMappingURL=index.js.map