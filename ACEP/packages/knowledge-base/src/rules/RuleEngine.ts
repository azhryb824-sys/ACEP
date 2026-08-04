import { RuleDefinition, RuleCondition, RuleActionDefinition, RulesRegistry } from './RuleDefinition';
import { ProjectFacts } from '@acep/core';
import { KnowledgeGraph } from '../graph/KnowledgeGraph';

export class RuleEngine {
  private registry: RulesRegistry;
  private knowledgeGraph: KnowledgeGraph;

  constructor(registry: RulesRegistry, knowledgeGraph: KnowledgeGraph) {
    this.registry = registry;
    this.knowledgeGraph = knowledgeGraph;
  }

  evaluate(facts: ProjectFacts): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    const rules = this.registry.getAll();

    for (const rule of rules) {
      const result = this.evaluateRule(rule, facts);
      results.push(result);
    }

    return results;
  }

  evaluateRule(rule: RuleDefinition, facts: ProjectFacts): RuleEvaluationResult {
    const matched = rule.conditions.every(condition => 
      this.evaluateCondition(condition, facts)
    );

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

  private evaluateCondition(condition: RuleCondition, facts: ProjectFacts): boolean {
    const factValue = this.getFactValue(condition.fact, facts);
    
    switch (condition.operator) {
      case 'eq':
        return factValue === condition.value;
      case 'neq':
        return factValue !== condition.value;
      case 'gt':
        return (factValue as number) > (condition.value as number);
      case 'gte':
        return (factValue as number) >= (condition.value as number);
      case 'lt':
        return (factValue as number) < (condition.value as number);
      case 'lte':
        return (factValue as number) <= (condition.value as number);
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

  private getFactValue(path: string, facts: ProjectFacts): unknown {
    const parts = path.split('.');
    let current: unknown = facts;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  getSuggestions(facts: ProjectFacts): RuleActionDefinition[] {
    const results = this.evaluate(facts);
    return results
      .filter(r => r.matched && r.actions.length > 0)
      .flatMap(r => r.actions);
  }

  getErrors(facts: ProjectFacts): RuleEvaluationResult[] {
    return this.evaluate(facts).filter(r => 
      r.matched && r.category === 'Conflict'
    );
  }

  getWarnings(facts: ProjectFacts): RuleEvaluationResult[] {
    return this.evaluate(facts).filter(r => 
      r.matched && r.priority === 'medium'
    );
  }
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
