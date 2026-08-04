import { VirtualBuilding, ProjectFacts, BOQDocument, ScheduleActivity, CostBreakdown, DigitalTwin, ReasoningTrace } from './types';
import { KnowledgeGraph } from '@acep/knowledge-base';
export interface EngineIntegrationConfig {
    enableReasoning: boolean;
    enableBOQGeneration: boolean;
    enableQuantityCalculation: boolean;
    enableCostEstimation: boolean;
    enableScheduleGeneration: boolean;
    enableDigitalTwin: boolean;
    selectedCountry: string;
    selectedCodes: string[];
}
export interface ProjectAnalysisResult {
    projectId: string;
    facts: ProjectFacts;
    building: VirtualBuilding;
    boq: BOQDocument;
    cost: CostBreakdown;
    schedule: ScheduleActivity[];
    twin?: DigitalTwin;
    reasoning: ReasoningTrace[];
    metadata: {
        timestamp: string;
        duration: number;
        enginesUsed: string[];
        confidence: number;
    };
}
export declare class IntegrationLayer {
    private knowledgeGraph;
    private config;
    private engines;
    constructor(knowledgeGraph: KnowledgeGraph, config?: Partial<EngineIntegrationConfig>);
    registerEngine(name: string, engine: any): void;
    getEngine(name: string): any;
    analyzeProject(description: string, additionalFacts?: Partial<ProjectFacts>): Promise<ProjectAnalysisResult>;
    generateVirtualBuilding(facts: ProjectFacts): Promise<VirtualBuilding>;
    runReasoning(facts: ProjectFacts): Promise<ReasoningTrace[]>;
    generateBOQ(building: VirtualBuilding): Promise<BOQDocument>;
    calculateQuantities(building: VirtualBuilding, boq: BOQDocument): Promise<BOQDocument>;
    calculateCost(boq: BOQDocument): Promise<CostBreakdown>;
    generateSchedule(boq: BOQDocument): Promise<ScheduleActivity[]>;
    createDigitalTwin(building: VirtualBuilding, facts: ProjectFacts): Promise<DigitalTwin>;
    updateProject(projectId: string, changes: Partial<ProjectFacts>): Promise<ProjectAnalysisResult>;
    analyzeProjectFromState(facts: ProjectFacts, building: VirtualBuilding): Promise<ProjectAnalysisResult>;
    runSimulation(scenario: any): Promise<any>;
    validateProject(projectId: string): Promise<{
        valid: boolean;
        issues: string[];
        warnings: string[];
    }>;
    private calculateOverallConfidence;
    updateConfig(config: Partial<EngineIntegrationConfig>): void;
    getConfig(): EngineIntegrationConfig;
    getEngineStatus(): Record<string, {
        registered: boolean;
        status: string;
    }>;
}
//# sourceMappingURL=IntegrationLayer.d.ts.map