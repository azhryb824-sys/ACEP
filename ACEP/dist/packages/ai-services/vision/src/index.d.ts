export interface ImageAnalysis {
    labels: string[];
    confidence: number;
    dimensions: {
        width: number;
        height: number;
    };
    dominantColors: string[];
    format: string;
    valid: boolean;
}
export interface ProgressAssessment {
    completionPercent: number;
    stage: string;
    evidence: string[];
}
export interface MaterialIdentification {
    materials: Array<{
        name: string;
        confidence: number;
        category: string;
    }>;
}
export interface VisionConfig {
    baseUrl: string;
    timeout: number;
}
export declare class VisionService {
    private config;
    private initialized;
    initialize(config?: Partial<VisionConfig>): Promise<void>;
    analyzeImage(imageBuffer: Buffer, fileName?: string): Promise<ImageAnalysis>;
    detectProgress(imageBuffer: Buffer): Promise<ProgressAssessment>;
    identifyMaterials(imageBuffer: Buffer): Promise<MaterialIdentification>;
    isInitialized(): boolean;
    private ensureInitialized;
}
export declare const visionService: VisionService;
//# sourceMappingURL=index.d.ts.map