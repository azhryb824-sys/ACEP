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
export declare class EmbeddingService {
    private config;
    private docs;
    private initialized;
    initialize(config?: Partial<EmbeddingConfig>): Promise<void>;
    generateEmbedding(text: string): Promise<number[]>;
    indexDocument(content: string, metadata?: Record<string, unknown>): Promise<IndexedDocument>;
    searchSimilar(query: string, topK?: number): Promise<Array<{
        doc: IndexedDocument;
        score: number;
    }>>;
    removeDocument(id: string): boolean;
    getDocumentCount(): number;
    isInitialized(): boolean;
    getConfig(): EmbeddingConfig;
    private ensureInitialized;
    private _cosineSimilarity;
    private _syntheticEmbedding;
    private _makeId;
}
export declare const embeddingService: EmbeddingService;
//# sourceMappingURL=index.d.ts.map