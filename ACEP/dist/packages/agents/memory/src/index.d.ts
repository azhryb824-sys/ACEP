import { IAgent, ProjectFacts } from '@acep/core';
interface UserDecision {
    id: string;
    userId: string;
    projectId: string;
    type: string;
    field: string;
    value: unknown;
    context: Record<string, unknown>;
    timestamp: string;
    confidence: number;
    weight: number;
}
interface UserPreference {
    userId: string;
    preferredSuppliers: SupplierPreference[];
    preferredMaterials: MaterialPreference[];
    preferredConstructionMethods: MethodPreference[];
    preferredQualityLevel: string;
    preferredFinishingLevel: string;
    preferredBrands: BrandPreference[];
    customPreferences: Record<string, unknown>;
    lastUpdated: string;
    decisionCount: number;
}
interface SupplierPreference {
    supplierId: string;
    supplierName: string;
    materialType: string;
    usageCount: number;
    averagePrice: number;
    averageRating: number;
    lastUsed: string;
    preferred: boolean;
}
interface MaterialPreference {
    materialName: string;
    materialType: string;
    usageCount: number;
    preferredBrand: string;
    qualityLevel: string;
    alternatives: string[];
}
interface MethodPreference {
    methodName: string;
    projectType: string;
    usageCount: number;
    successRate: number;
    lastUsed: string;
}
interface BrandPreference {
    brandName: string;
    category: string;
    usageCount: number;
    averageRating: number;
}
interface SimilarProject {
    projectId: string;
    similarity: number;
    projectType: string;
    area: number;
    floors: number;
    finishingLevel: string;
    features: string[];
}
export declare class MemoryAgent implements IAgent {
    readonly id = "agent-memory";
    readonly type = "memory";
    readonly name = "Memory Agent";
    private logger;
    private decisions;
    private preferences;
    private projects;
    private maxDecisions;
    constructor(maxDecisions?: number);
    process(input: unknown): Promise<unknown>;
    canHandle(input: unknown): boolean;
    getCapabilities(): string[];
    rememberDecision(userId: string, decision: UserDecision): Promise<void>;
    private createEmptyPreferences;
    private updatePreferences;
    private updateSupplierPreference;
    private updateMaterialPreference;
    private updateMethodPreference;
    private updateBrandPreference;
    getUserPreferences(userId: string): Promise<UserPreference | null>;
    applyMemory(project: ProjectFacts, userId: string): Promise<{
        project: ProjectFacts;
        appliedPreferences: string[];
        pendingApproval: string[];
    }>;
    getSimilarProjects(project: ProjectFacts): Promise<SimilarProject[]>;
    private calculateSimilarity;
    storeProject(projectId: string, facts: ProjectFacts): void;
    getProjectCount(): number;
    getTotalDecisions(): number;
    clearUserMemory(userId: string): void;
}
export {};
//# sourceMappingURL=index.d.ts.map