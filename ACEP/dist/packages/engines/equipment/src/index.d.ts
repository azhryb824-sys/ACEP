import { BaseEngine, IEquipmentEngine, BOQDocument, EquipmentRequirement } from '@acep/core';
import { KnowledgeGraph, EquipmentLibrary, BOQItemsLibrary } from '@acep/knowledge-base';
export declare class EquipmentEngine extends BaseEngine implements IEquipmentEngine {
    private knowledgeGraph;
    private equipmentLib;
    private boqItemsLib;
    constructor(kg: KnowledgeGraph, eqLib: EquipmentLibrary, boqLib: BOQItemsLibrary);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    determineEquipment(boq: BOQDocument): Promise<EquipmentRequirement[]>;
    selectEquipment(activity: unknown, constraints: unknown): Promise<unknown>;
    calculateUtilization(equipment: EquipmentRequirement[]): Promise<number>;
    compareOptions(equipmentId: string): Promise<unknown[]>;
    scheduleEquipment(requirements: EquipmentRequirement[]): Promise<EquipmentRequirement[]>;
    private createDefaultRequirement;
}
//# sourceMappingURL=index.d.ts.map