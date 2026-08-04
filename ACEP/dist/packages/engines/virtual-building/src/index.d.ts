import { BaseEngine, IVirtualBuildingEngine, ProjectFacts, VirtualBuilding } from '@acep/core';
import { KnowledgeGraph, SpacesLibrary, ProjectTypesLibrary } from '@acep/knowledge-base';
export declare class VirtualBuildingEngine extends BaseEngine implements IVirtualBuildingEngine {
    private knowledgeGraph;
    private spacesLib;
    private projectTypesLib;
    constructor(kg: KnowledgeGraph, spLib: SpacesLibrary, ptLib: ProjectTypesLibrary);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    build(facts: ProjectFacts): Promise<VirtualBuilding>;
    updateBuilding(building: VirtualBuilding, changes: Partial<ProjectFacts>): Promise<VirtualBuilding>;
    generateSpaces(facts: ProjectFacts): Promise<unknown>;
    generateStructure(building: VirtualBuilding): Promise<unknown>;
    generateArchitecture(building: VirtualBuilding): Promise<unknown>;
    generateMEP(building: VirtualBuilding): Promise<unknown>;
    generateOutdoor(building: VirtualBuilding): Promise<unknown>;
    private generateFloors;
    private generateSpacesList;
    private generateStructureModel;
    private generateArchitectureModel;
    private generateMEPModel;
    private generateOutdoorModel;
}
//# sourceMappingURL=index.d.ts.map