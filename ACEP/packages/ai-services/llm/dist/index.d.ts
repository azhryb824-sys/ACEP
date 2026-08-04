export type LLMProviderType = 'openai' | 'together' | 'express-bridge' | 'mock';
export interface LLMConfig {
    provider: LLMProviderType;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
}
export interface LLMResponse {
    text: string;
    tokens: number;
    model: string;
    latencyMs: number;
}
export declare class LLMService {
    private config;
    private initialized;
    initialize(config?: Partial<LLMConfig>): Promise<void>;
    generate(prompt: string, system?: string): Promise<LLMResponse>;
    analyze(instruction: string, context?: string): Promise<Record<string, unknown>>;
    generateQuestions(context: string): Promise<string[]>;
    explain(decision: string): Promise<string>;
    isInitialized(): boolean;
    getConfig(): LLMConfig;
    private ensureInitialized;
    private _call;
}
export declare const llmService: LLMService;
//# sourceMappingURL=index.d.ts.map