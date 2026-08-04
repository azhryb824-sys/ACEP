import { BaseEngine, VirtualBuilding, ProjectFacts, DigitalTwin, TwinState, SimulationScenario, SimulationResult, LifecycleStage, PerformanceMetrics } from '@acep/core';
import { KnowledgeGraph } from '@acep/knowledge-base';
export declare class DigitalTwinEngine extends BaseEngine {
    private knowledgeGraph;
    private twin;
    private stateHistory;
    private scenarios;
    constructor(kg: KnowledgeGraph);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    createTwin(building: VirtualBuilding, facts: ProjectFacts): Promise<DigitalTwin>;
    updateTwin(changes: Partial<VirtualBuilding>): Promise<DigitalTwin>;
    simulateScenario(scenario: SimulationScenario): Promise<SimulationResult>;
    predictDelay(activityId: string): Promise<{
        probability: number;
        causes: string[];
        mitigation: string[];
    }>;
    predictCostOverrun(category: string): Promise<{
        probability: number;
        amount: number;
        factors: string[];
    }>;
    comparePlannedVsActual(): Promise<{
        planned: number;
        actual: number;
        variance: number;
        trend: string;
    }>;
    getPerformanceMetrics(): Promise<PerformanceMetrics>;
    getLifecycleStatus(): Promise<LifecycleStage[]>;
    runMonteCarloSimulation(iterations?: number): Promise<{
        meanDuration: number;
        p50: number;
        p80: number;
        p95: number;
        distribution: number[];
    }>;
    optimizeResources(): Promise<{
        suggestions: string[];
        expectedSavings: number;
    }>;
    private createInitialState;
    private calculateNewState;
    private initializeLifecycle;
    private initializeMetrics;
    private calculateImpacts;
    private generatePredictions;
    private generateRecommendations;
    private calculateScenarioConfidence;
    private detectNewRisks;
    private saveState;
    getStateHistory(): TwinState[];
    getTwin(): DigitalTwin | null;
}
//# sourceMappingURL=index.d.ts.map