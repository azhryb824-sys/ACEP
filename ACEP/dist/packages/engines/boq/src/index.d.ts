import { BaseEngine, IBOQEngine, VirtualBuilding, BOQDocument } from '@acep/core';
import { KnowledgeGraph, BOQItemsLibrary, SpacesLibrary, MaterialLibrary } from '@acep/knowledge-base';
export declare class BOQEngine extends BaseEngine implements IBOQEngine {
    private knowledgeGraph;
    private boqItemsLib;
    private spacesLib;
    private materialLib;
    constructor(kg: KnowledgeGraph, boqLib: BOQItemsLibrary, spLib: SpacesLibrary, matLib: MaterialLibrary);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    generateBOQ(building: VirtualBuilding): Promise<BOQDocument>;
    getTemplateForSpace(spaceType: string): Promise<unknown>;
    mergeSimilarItems(items: unknown[]): Promise<unknown[]>;
    validateDependencies(items: unknown[]): Promise<unknown[]>;
    detectMissingItems(items: unknown[]): Promise<unknown[]>;
    private estimateQuantity;
    private estimateDefaultQuantity;
    private getDefaultUnitPrice;
    private calculateItemConfidence;
    private calculateCorrectionFactors;
    private getCategoryFormula;
}
//# sourceMappingURL=index.d.ts.map