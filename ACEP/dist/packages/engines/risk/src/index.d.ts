import { BaseEngine, IRiskEngine, ProjectFacts, VirtualBuilding, Risk } from '@acep/core';
import { KnowledgeGraph, RulesRegistry } from '@acep/knowledge-base';
interface RiskCard {
    riskId: string;
    name: string;
    description: string;
    source: string;
    cause: string;
    probability: number;
    impact: number;
    exposure: number;
    confidenceModifier: number;
    riskScore: number;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    priority: number;
    affectedActivities: string[];
    affectedItems: string[];
    responsible: string;
    responsePlan: ResponseStrategy;
    implementationStatus: 'Not Started' | 'In Progress' | 'Completed' | 'Cancelled';
    reviewDate: Date;
}
interface ResponseStrategy {
    avoid?: string;
    mitigate?: string;
    transfer?: string;
    accept?: string;
    selected: 'Avoid' | 'Mitigate' | 'Transfer' | 'Accept';
    advantages: string[];
    disadvantages: string[];
}
interface DecisionLedger {
    decisionId: string;
    decision: string;
    decisionMaker: string;
    timestamp: Date;
    dataUsed: any[];
    alternatives: string[];
    reasonForSelection: string;
    expectedResults: string[];
    actualResults?: string[];
}
interface Scenario {
    scenarioId: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
    impactOnCost: number;
    impactOnSchedule: number;
    impactOnQuality: number;
    impactOnSafety: number;
    confidence: number;
}
export declare class RiskEngine extends BaseEngine implements IRiskEngine {
    private knowledgeGraph;
    private rulesRegistry;
    private ruleEngine;
    private riskCards;
    private decisionLedger;
    private scenarios;
    constructor(kg: KnowledgeGraph, rulesRegistry: RulesRegistry);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    detectRisks(project: ProjectFacts, building: VirtualBuilding): Promise<Risk[]>;
    analyzeRisk(risk: Risk): Promise<RiskCard>;
    calculateRiskScore(risks: Risk[]): Promise<number>;
    generateMitigation(risk: Risk): Promise<ResponseStrategy>;
    monitorRisks(risks: Risk[]): Promise<RiskCard[]>;
    runScenario(parameters: Record<string, any>): Promise<Scenario>;
    predictRisks(project: ProjectFacts): Promise<{
        delayProbability: number;
        costIncreaseProbability: number;
        reworkProbability: number;
        claimsProbability: number;
        equipmentFailureProbability: number;
        materialShortageProbability: number;
        confidence: number;
    }>;
    supportDecision(options: any[]): Promise<{
        recommendation: string;
        analysis: any[];
        comparison: Record<string, any>;
        confidence: number;
    }>;
    recordDecision(decision: DecisionLedger): Promise<void>;
    getDecisionLedger(): Promise<DecisionLedger[]>;
    getRiskDashboard(): Promise<{
        topTenRisks: RiskCard[];
        newRisks: RiskCard[];
        closedRisks: RiskCard[];
        escalatingRisks: RiskCard[];
        risksBySpecialty: Record<string, RiskCard[]>;
        risksByLocation: Record<string, RiskCard[]>;
    }>;
    private calculateExposure;
    private calculateConfidenceModifier;
    private calculateSeverity;
    private calculatePriority;
    private generateResponsePlan;
    private getAvoidStrategy;
    private getMitigateStrategy;
    private getTransferStrategy;
    private getAcceptStrategy;
    private calculateScenarioImpact;
    private calculateDelayProbability;
    private calculateCostIncreaseProbability;
    private calculateReworkProbability;
    private calculateClaimsProbability;
    private calculateEquipmentFailureProbability;
    private calculateMaterialShortageProbability;
    private estimateCostImpact;
    private estimateScheduleImpact;
    private estimateRiskImpact;
    private estimateQualityImpact;
    private generateComparison;
    private groupRisksBySpecialty;
    private groupRisksByLocation;
    private detectStructuralRisks;
    private detectFinancialRisks;
    private detectScheduleRisks;
    private detectSafetyRisks;
    private detectQualityRisks;
    private detectExternalRisks;
    private createRisk;
    private getMitigationStrategies;
    checkEarlyWarnings(project: ProjectFacts): Promise<string[]>;
    private checkMaterialWarnings;
    private checkSupplierWarnings;
    private checkActivityWarnings;
    private checkConsumptionWarnings;
    learnFromProject(expectedRisks: RiskCard[], actualRisks: Risk[]): Promise<{
        lessonsLearned: string[];
        effectiveness: Record<string, number>;
        recommendations: string[];
    }>;
    private calculateMitigationEffectiveness;
}
export {};
//# sourceMappingURL=index.d.ts.map