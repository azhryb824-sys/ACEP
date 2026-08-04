import { BaseEngine, IReasoningEngine, ProjectFacts, ReasoningTrace } from '@acep/core';
import { KnowledgeGraph, RulesRegistry } from '@acep/knowledge-base';
export declare class EngineeringReasoningEngine extends BaseEngine implements IReasoningEngine {
    private knowledgeGraph;
    private ruleEngine;
    constructor(kg: KnowledgeGraph, rulesRegistry: RulesRegistry);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    reason(facts: ProjectFacts, knowledge: unknown): Promise<ReasoningTrace[]>;
    buildReasoningTree(facts: ProjectFacts): Promise<unknown>;
    detectLogicalErrors(facts: ProjectFacts): Promise<unknown[]>;
    suggestAlternatives(context: unknown): Promise<unknown[]>;
    calculateConfidenceScore(facts: ProjectFacts): Promise<{
        overall: number;
        breakdown: Record<string, number>;
    }>;
    private calculateCompleteness;
}
//# sourceMappingURL=index.d.ts.map