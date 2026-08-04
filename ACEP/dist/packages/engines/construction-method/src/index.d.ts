import { BaseEngine, IConstructionMethodEngine } from '@acep/core';
import { KnowledgeGraph, EngineeringEquationsLibrary, MaterialLibrary, LaborLibrary } from '@acep/knowledge-base';
export declare class ConstructionMethodEngine extends BaseEngine implements IConstructionMethodEngine {
    private knowledgeGraph;
    private equationsLib;
    private materialLib;
    private laborLib;
    constructor(kg: KnowledgeGraph, eqLib: EngineeringEquationsLibrary, matLib: MaterialLibrary, labLib: LaborLibrary);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    getMethods(activity: string): Promise<unknown[]>;
    evaluateMethods(methods: unknown[], constraints: unknown): Promise<unknown[]>;
    compareMethods(methods: unknown[]): Promise<unknown>;
    selectMethod(methods: unknown[], preferences: unknown): Promise<unknown>;
}
//# sourceMappingURL=index.d.ts.map