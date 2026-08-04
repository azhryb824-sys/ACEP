import { BaseEngine } from '@acep/core';
import { DecisionIntelligenceLedger, DecisionAlternative, DecisionRisk, ExecutiveResponse } from './types';
export declare class DecisionIntelligenceLedgerEngine extends BaseEngine {
    private decisions;
    constructor(config?: Record<string, unknown>);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    recordDecision(decision: string, owner: string, data: Record<string, unknown>, alternatives: DecisionAlternative[], risks: DecisionRisk[], expectedOutcome: string): Promise<DecisionIntelligenceLedger>;
    updateOutcome(decisionId: string, actualOutcome: string, evaluation: 'exceeded' | 'met' | 'below' | 'failed', lessonsLearned: string[]): Promise<DecisionIntelligenceLedger>;
    getDecision(id: string): Promise<DecisionIntelligenceLedger | null>;
    getAllDecisions(): Promise<DecisionIntelligenceLedger[]>;
    getDecisionsByOwner(owner: string): Promise<DecisionIntelligenceLedger[]>;
    getDecisionsByDateRange(start: string, end: string): Promise<DecisionIntelligenceLedger[]>;
    evaluateDecisionQuality(): Promise<{
        totalDecisions: number;
        evaluated: number;
        exceeded: number;
        met: number;
        below: number;
        failed: number;
        accuracyRate: number;
        averageConfidence: number;
        topPerformers: {
            owner: string;
            accuracy: number;
            count: number;
        }[];
        improvementTrend: string;
    }>;
    getLessonsLearned(): Promise<{
        decision: string;
        owner: string;
        lessons: string[];
    }[]>;
    getDecisionByOutcome(evaluation: 'exceeded' | 'met' | 'below' | 'failed'): Promise<DecisionIntelligenceLedger[]>;
    getDecisionQualityReport(): Promise<ExecutiveResponse>;
    addAlternativeToDecision(decisionId: string, alternative: DecisionAlternative): Promise<DecisionIntelligenceLedger>;
    addRiskToDecision(decisionId: string, risk: DecisionRisk): Promise<DecisionIntelligenceLedger>;
    getDecisionsByRiskLevel(minSeverity: number): Promise<DecisionIntelligenceLedger[]>;
    count(): number;
    clear(): void;
}
//# sourceMappingURL=decision-intelligence.d.ts.map