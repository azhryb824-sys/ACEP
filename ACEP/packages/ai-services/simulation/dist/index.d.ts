export interface SimulationModel {
    projectType: string;
    area: number;
    floors: number;
    finishingLevel: string;
    location: string;
}
export interface ScenarioResult {
    id: string;
    name: string;
    durationMonths: number;
    costPerM2: number;
    totalCost: number;
    resourceEfficiency: number;
    riskScore: number;
}
export interface SimulationReport {
    scenarios: ScenarioResult[];
    recommended: string;
    comparison: Record<string, string>;
}
export declare class SimulationService {
    private initialized;
    initialize(): Promise<void>;
    runSimulation(model: SimulationModel, name?: string): ScenarioResult;
    compareScenarios(scenarios: ScenarioResult[]): ScenarioResult[];
    generateReport(model: SimulationModel, scenarios: ScenarioResult[]): SimulationReport;
    isInitialized(): boolean;
    private ensureInitialized;
}
export declare const simulationService: SimulationService;
//# sourceMappingURL=index.d.ts.map