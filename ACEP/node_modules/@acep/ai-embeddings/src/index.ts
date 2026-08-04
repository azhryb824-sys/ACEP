export interface IndexedDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
  createdAt: string;
}

export class EmbeddingService {
  private documents: Map<string, IndexedDocument> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const hash = this.simpleHash(text);
    return Array.from({ length: 128 }, (_, i) => Math.sin(hash * (i + 1)) * 0.5 + 0.5);
  }

  async searchSimilar(query: string, limit: number = 10): Promise<IndexedDocument[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const scored: Array<{ doc: IndexedDocument; score: number }> = [];

    for (const doc of this.documents.values()) {
      const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
      scored.push({ doc, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.doc);
  }

  async indexDocument(doc: Omit<IndexedDocument, 'createdAt'>): Promise<IndexedDocument> {
    const fullDoc: IndexedDocument = { ...doc, createdAt: new Date().toISOString() };
    this.documents.set(fullDoc.id, fullDoc);
    return fullDoc;
  }

  async removeDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  getDocumentCount(): number { return this.documents.size; }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
    return magA && magB ? dot / (magA * magB) : 0;
  }

  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
