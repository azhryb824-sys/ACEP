import { BaseEngine, IScheduleEngine, BOQDocument, LaborRequirement, EquipmentRequirement, ScheduleActivity } from '@acep/core';
import { KnowledgeGraph, EngineeringEquationsLibrary, LaborLibrary } from '@acep/knowledge-base';
export declare class ScheduleEngine extends BaseEngine implements IScheduleEngine {
    private knowledgeGraph;
    private equationsLib;
    private laborLib;
    constructor(kg: KnowledgeGraph, eqLib: EngineeringEquationsLibrary, labLib: LaborLibrary);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    generateSchedule(boq: BOQDocument, labor: LaborRequirement[], equipment: EquipmentRequirement[]): Promise<ScheduleActivity[]>;
    calculateDuration(quantity: number, productivity: number): Promise<number>;
    buildNetwork(activities: ScheduleActivity[]): Promise<ScheduleActivity[]>;
    detectConflicts(activities: ScheduleActivity[]): Promise<unknown[]>;
    optimizeSchedule(activities: ScheduleActivity[], constraints: unknown): Promise<ScheduleActivity[]>;
    private getActivityDefinitions;
    private allocateResources;
    private topologicalSort;
}
//# sourceMappingURL=index.d.ts.map