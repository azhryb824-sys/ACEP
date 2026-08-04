import axios from 'axios';

export interface IndexedDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
  createdAt: string;
}

export type EmbeddingProvider = 'openai' | 'together' | 'synthetic';

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  dimensions?: number;
}

const EMBEDDING_DEFAULTS: Record<EmbeddingProvider, { model: string; dimensions: number }> = {
  openai: { model: 'text-embedding-3-small', dimensions: 1536 },
  together: { model: 'togethercomputer/m2-bert-80M-8k-retrieval', dimensions: 768 },
  synthetic: { model: 'synthetic-hash', dimensions: 128 },
};

export class EmbeddingService {
  private config: EmbeddingConfig = { provider: 'synthetic', dimensions: 128 };
  private docs: Map<string, IndexedDocument> = new Map();
  private initialized = false;

  async initialize(config?: Partial<EmbeddingConfig>): Promise<void> {
    if (config) this.config = { ...this.config, ...config };
    const defaults = EMBEDDING_DEFAULTS[this.config.provider];
    this.config.model = this.config.model || defaults.model;
    this.config.dimensions = this.config.dimensions || defaults.dimensions;
    if (!this.config.baseUrl) {
      if (this.config.provider === 'openai') this.config.baseUrl = 'https://api.openai.com/v1';
      if (this.config.provider === 'together') this.config.baseUrl = 'https://api.together.xyz/v1';
    }
    if (!this.config.apiKey && (this.config.provider === 'openai' || this.config.provider === 'together')) {
      this.config.apiKey = process.env.OPENAI_API_KEY || process.env.TOGETHER_API_KEY || '';
    }
    this.initialized = true;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.ensureInitialized();
    if (this.config.provider === 'synthetic') return this._syntheticEmbedding(text);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      const r = await axios.post(`${this.config.baseUrl}/embeddings`, {
        model: this.config.model,
        input: text,
      }, { headers, timeout: 30000 });
      return r.data.data?.[0]?.embedding || this._syntheticEmbedding(text);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[Embeddings] API call failed (${msg}), using synthetic fallback`);
      return this._syntheticEmbedding(text);
    }
  }

  async indexDocument(content: string, metadata: Record<string, unknown> = {}): Promise<IndexedDocument> {
    this.ensureInitialized();
    const embedding = await this.generateEmbedding(content);
    const doc: IndexedDocument = {
      id: this._makeId(content),
      content,
      metadata,
      embedding,
      createdAt: new Date().toISOString(),
    };
    this.docs.set(doc.id, doc);
    return doc;
  }

  async searchSimilar(query: string, topK: number = 5): Promise<Array<{ doc: IndexedDocument; score: number }>> {
    this.ensureInitialized();
    if (this.docs.size === 0) return [];
    const queryEmb = await this.generateEmbedding(query);
    const results: Array<{ doc: IndexedDocument; score: number }> = [];
    for (const doc of this.docs.values()) {
      const score = this._cosineSimilarity(queryEmb, doc.embedding);
      results.push({ doc, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  removeDocument(id: string): boolean { return this.docs.delete(id); }
  getDocumentCount(): number { return this.docs.size; }
  isInitialized(): boolean { return this.initialized; }
  getConfig(): EmbeddingConfig { return { ...this.config }; }

  private ensureInitialized(): void {
    if (!this.initialized) throw new Error('EmbeddingService not initialized. Call initialize() first.');
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
  }

  private _syntheticEmbedding(text: string): number[] {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    const dim = this.config.dimensions || 128;
    const emb: number[] = [];
    for (let i = 0; i < dim; i++) {
      emb.push(Math.sin(hash * (i + 1) * 0.01) * 0.5 + 0.5);
    }
    return emb;
  }

  private _makeId(content: string): string {
    let h = 0;
    for (let i = 0; i < content.length; i++) {
      h = ((h << 5) - h + content.charCodeAt(i)) | 0;
    }
    return `doc-${Math.abs(h).toString(36)}-${Date.now().toString(36)}`;
  }
}

export const embeddingService = new EmbeddingService();
