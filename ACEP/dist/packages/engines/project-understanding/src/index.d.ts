import { BaseEngine, IProjectUnderstandingEngine, ProjectFacts } from '@acep/core';
import { KnowledgeGraph, ProjectTypesLibrary, SpacesLibrary } from '@acep/knowledge-base';
export declare class ProjectUnderstandingEngine extends BaseEngine implements IProjectUnderstandingEngine {
    private knowledgeGraph;
    private projectTypesLib;
    private spacesLib;
    constructor(kg: KnowledgeGraph, ptLib: ProjectTypesLibrary, spLib: SpacesLibrary);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    understand(description: string): Promise<ProjectFacts>;
    extractEntities(text: string): Promise<Record<string, unknown>>;
    detectConflicts(facts: ProjectFacts): Promise<void>;
    private normalizeText;
    private extractSpaces;
    private extractSystems;
    private detectConflictsInternal;
    private calculateOverallConfidence;
}
//# sourceMappingURL=index.d.ts.map