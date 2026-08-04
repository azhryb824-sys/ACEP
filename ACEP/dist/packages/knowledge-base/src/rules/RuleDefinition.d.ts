export interface RuleDefinition {
    id: string;
    description: string;
    descriptionAr: string;
    category: string;
    conditions: RuleCondition[];
    actions: RuleActionDefinition[];
    priority: 'critical' | 'high' | 'medium' | 'low';
    confidence: number;
    reference: string;
    version: string;
    type: 'inference' | 'validation' | 'suggestion' | 'requirement';
}
export interface RuleCondition {
    fact: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'exists' | 'notExists' | 'contains';
    value: unknown;
}
export interface RuleActionDefinition {
    type: 'suggestItem' | 'addItem' | 'removeItem' | 'setValue' | 'raiseWarning' | 'raiseError' | 'askQuestion' | 'modifyQuantity';
    target: string;
    value?: unknown;
    reason?: string;
}
export declare const STANDARD_RULES: RuleDefinition[];
export declare class RulesRegistry {
    private rules;
    constructor();
    register(rule: RuleDefinition): void;
    get(id: string): RuleDefinition | undefined;
    findByCategory(category: string): RuleDefinition[];
    findByType(type: string): RuleDefinition[];
    getAll(): RuleDefinition[];
    initializeDefaults(): void;
}
//# sourceMappingURL=RuleDefinition.d.ts.map