import { KnowledgeGraph } from './graph/KnowledgeGraph';
import { RulesRegistry } from './rules/RuleDefinition';
import { RuleEngine } from './rules/RuleEngine';
import { MaterialLibrary } from './libraries/MaterialLibrary';
import { LaborLibrary } from './libraries/LaborLibrary';
import { EquipmentLibrary } from './libraries/EquipmentLibrary';
import { ProjectTypesLibrary } from './libraries/ProjectTypesLibrary';
import { SpacesLibrary } from './libraries/SpacesLibrary';
import { BOQItemsLibrary } from './libraries/BOQItemsLibrary';
import { QuantityRulesLibrary } from './libraries/QuantityRulesLibrary';
import { EngineeringEquationsLibrary } from './libraries/EngineeringEquationsLibrary';
export declare class KnowledgeBaseManager {
    readonly graph: KnowledgeGraph;
    readonly ruleEngine: RuleEngine;
    readonly rulesRegistry: RulesRegistry;
    readonly materials: MaterialLibrary;
    readonly labors: LaborLibrary;
    readonly equipment: EquipmentLibrary;
    readonly projectTypes: ProjectTypesLibrary;
    readonly spaces: SpacesLibrary;
    readonly boqItems: BOQItemsLibrary;
    readonly quantityRules: QuantityRulesLibrary;
    readonly equations: EngineeringEquationsLibrary;
    private version;
    private initialized;
    constructor();
    initialize(): void;
    private buildKnowledgeGraph;
    getVersion(): string;
    query(entity: string): unknown;
    getRelations(entity: string): unknown[];
    refresh(): void;
    getStats(): {
        nodes: number;
        edges: number;
        initialized: boolean;
        version: string;
    };
}
//# sourceMappingURL=KnowledgeBaseManager.d.ts.map