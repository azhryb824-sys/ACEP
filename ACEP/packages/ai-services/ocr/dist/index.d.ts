export interface ExtractedText {
    fullText: string;
    paragraphs: string[];
    confidence: number;
    language: string;
    processedAt: string;
}
export interface BOQEntry {
    code: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    confidence: number;
}
export interface ParsedBOQ {
    projectName: string;
    entries: BOQEntry[];
    totalAmount: number;
    currency: string;
    confidence: number;
}
export interface TableData {
    headers: string[];
    rows: string[][];
    confidence: number;
}
export interface OCRConfig {
    provider: 'tesseract' | 'express-api' | 'mock';
    baseUrl: string;
    tesseractLang: string;
}
export declare class OCRService {
    private config;
    private initialized;
    initialize(config?: Partial<OCRConfig>): Promise<void>;
    extractText(image: Buffer | string): Promise<ExtractedText>;
    parseBOQ(document: Buffer | string): Promise<ParsedBOQ>;
    detectTables(image: Buffer | string): Promise<TableData[]>;
    isInitialized(): boolean;
    private _tesseractOcr;
    private _apiOcr;
    private _fromText;
    private _mockOcr;
    private _detectProjectName;
    private _mockBoqEntry;
    private ensureInitialized;
}
export declare const ocrService: OCRService;
//# sourceMappingURL=index.d.ts.map