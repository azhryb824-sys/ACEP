export interface DocumentSection {
    title: string;
    content: string;
    page: number;
}
export interface Specification {
    code: string;
    title: string;
    description: string;
    unit: string;
}
export interface ContractTerm {
    clause: string;
    description: string;
    risk: 'low' | 'medium' | 'high';
}
export interface DocumentAnalysis {
    title: string;
    pages: number;
    language: string;
    sections: DocumentSection[];
    projectType?: string;
    summary: string;
}
export interface DocumentConfig {
    baseUrl: string;
    timeout: number;
}
export declare class DocumentAnalyzerService {
    private config;
    private initialized;
    initialize(config?: Partial<DocumentConfig>): Promise<void>;
    analyzeDocument(text: string, title?: string): Promise<DocumentAnalysis>;
    extractSpecifications(text: string): Promise<Specification[]>;
    extractContractTerms(text: string): Promise<ContractTerm[]>;
    isInitialized(): boolean;
    private _localAnalysis;
    private ensureInitialized;
}
export declare const documentAnalyzer: DocumentAnalyzerService;
//# sourceMappingURL=index.d.ts.map