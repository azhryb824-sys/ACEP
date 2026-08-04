import { BaseEngine, IQuantityEngine, VirtualBuilding, BOQDocument, BOQItem } from '@acep/core';
import { KnowledgeGraph, QuantityRulesLibrary, EngineeringEquationsLibrary } from '@acep/knowledge-base';
export declare class QuantityEngine extends BaseEngine implements IQuantityEngine {
    private knowledgeGraph;
    private quantityRulesLib;
    private equationsLib;
    constructor(kg: KnowledgeGraph, qtyLib: QuantityRulesLibrary, eqLib: EngineeringEquationsLibrary);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    calculate(building: VirtualBuilding, boq: BOQDocument): Promise<BOQDocument>;
    calculateByFormula(item: BOQItem, building: VirtualBuilding): Promise<number>;
    getCalculationTrace(itemId: string): Promise<unknown>;
    detectOutliers(quantities: unknown[]): Promise<unknown[]>;
    validateQuantities(boq: BOQDocument): Promise<unknown[]>;
    private evaluateFormula;
    private safeEval;
    private calculateDefault;
    private recalculateSummary;
}
//# sourceMappingURL=index.d.ts.map