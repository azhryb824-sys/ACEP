import { RuleDefinition, RuleActionDefinition, RulesRegistry } from './RuleDefinition';
import { ProjectFacts } from '@acep/core';
import { KnowledgeGraph } from '../graph/KnowledgeGraph';
export declare class RuleEngine {
    private registry;
    private knowledgeGraph;
    constructor(registry: RulesRegistry, knowledgeGraph: KnowledgeGraph);
    evaluate(facts: ProjectFacts): RuleEvaluationResult[];
    evaluateRule(rule: RuleDefinition, facts: ProjectFacts): RuleEvaluationResult;
    private evaluateCondition;
    private getFactValue;
    getSuggestions(facts: ProjectFacts): RuleActionDefinition[];
    getErrors(facts: ProjectFacts): RuleEvaluationResult[];
    getWarnings(facts: ProjectFacts): RuleEvaluationResult[];
}
export interface RuleEvaluationResult {
    ruleId: string;
    description: string;
    matched: boolean;
    confidence: number;
    actions: RuleActionDefinition[];
    priority: string;
    category: string;
}
//# sourceMappingURL=RuleEngine.d.ts.map