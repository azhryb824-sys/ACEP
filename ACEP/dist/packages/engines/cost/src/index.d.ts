import { BaseEngine, ICostEngine, BOQDocument, CostBreakdown } from '@acep/core';
import { KnowledgeGraph, MaterialLibrary, LaborLibrary, EquipmentLibrary } from '@acep/knowledge-base';
export declare class CostEngine extends BaseEngine implements ICostEngine {
    private knowledgeGraph;
    private materialLib;
    private laborLib;
    private equipmentLib;
    constructor(kg: KnowledgeGraph, matLib: MaterialLibrary, labLib: LaborLibrary, eqLib: EquipmentLibrary);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    calculateCost(boq: BOQDocument): Promise<CostBreakdown>;
    getPrice(materialId: string, location: string): Promise<number>;
    compareSuppliers(materialId: string): Promise<unknown[]>;
    sensitivityAnalysis(cost: CostBreakdown): Promise<unknown>;
    generateScenarios(boq: BOQDocument): Promise<unknown[]>;
    private calculateMaterialCosts;
    private calculateLaborCosts;
    private calculateEquipmentCosts;
    private calculateIndirectCosts;
    private getLocationMultiplier;
    private calculateConfidence;
}
//# sourceMappingURL=index.d.ts.map