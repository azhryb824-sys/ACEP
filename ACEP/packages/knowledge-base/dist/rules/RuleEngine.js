"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEngine = void 0;
class RuleEngine {
    registry;
    knowledgeGraph;
    constructor(registry, knowledgeGraph) {
        this.registry = registry;
        this.knowledgeGraph = knowledgeGraph;
    }
    evaluate(facts) {
        const results = [];
        const rules = this.registry.getAll();
        for (const rule of rules) {
            const result = this.evaluateRule(rule, facts);
            results.push(result);
        }
        return results;
    }
    evaluateRule(rule, facts) {
        const matched = rule.conditions.every(condition => this.evaluateCondition(condition, facts));
        return {
            ruleId: rule.id,
            description: rule.description,
            matched,
            confidence: matched ? rule.confidence : 0,
            actions: matched ? rule.actions : [],
            priority: rule.priority,
            category: rule.category
        };
    }
    evaluateCondition(condition, facts) {
        const factValue = this.getFactValue(condition.fact, facts);
        switch (condition.operator) {
            case 'eq':
                return factValue === condition.value;
            case 'neq':
                return factValue !== condition.value;
            case 'gt':
                return factValue > condition.value;
            case 'gte':
                return factValue >= condition.value;
            case 'lt':
                return factValue < condition.value;
            case 'lte':
                return factValue <= condition.value;
            case 'exists':
                return factValue !== undefined && factValue !== null;
            case 'notExists':
                return factValue === undefined || factValue === null;
            case 'contains':
                return Array.isArray(factValue) && factValue.includes(condition.value);
            default:
                return false;
        }
    }
    getFactValue(path, facts) {
        const parts = path.split('.');
        let current = facts;
        for (const part of parts) {
            if (current === null || current === undefined)
                return undefined;
            if (typeof current === 'object' && part in current) {
                current = current[part];
            }
            else {
                return undefined;
            }
        }
        return current;
    }
    getSuggestions(facts) {
        const results = this.evaluate(facts);
        return results
            .filter(r => r.matched && r.actions.length > 0)
            .flatMap(r => r.actions);
    }
    getErrors(facts) {
        return this.evaluate(facts).filter(r => r.matched && r.category === 'Conflict');
    }
    getWarnings(facts) {
        return this.evaluate(facts).filter(r => r.matched && r.priority === 'medium');
    }
}
exports.RuleEngine = RuleEngine;
//# sourceMappingURL=RuleEngine.js.map