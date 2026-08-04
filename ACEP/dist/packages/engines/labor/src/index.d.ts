import { BaseEngine, ILaborEngine, BOQDocument, LaborRequirement, Crew } from '@acep/core';
import { KnowledgeGraph, LaborLibrary, BOQItemsLibrary } from '@acep/knowledge-base';
export declare class LaborEngine extends BaseEngine implements ILaborEngine {
    private knowledgeGraph;
    private laborLib;
    private boqItemsLib;
    constructor(kg: KnowledgeGraph, labLib: LaborLibrary, boqLib: BOQItemsLibrary);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    calculateLabor(boq: BOQDocument): Promise<LaborRequirement[]>;
    buildCrews(requirements: LaborRequirement[]): Promise<Crew[]>;
    optimizeCrews(crews: Crew[]): Promise<Crew[]>;
    getProductivity(trade: string): Promise<number>;
    calculateLaborCost(requirements: LaborRequirement[]): Promise<number>;
}
//# sourceMappingURL=index.d.ts.map