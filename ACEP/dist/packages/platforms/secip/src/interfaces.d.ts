import { SustainabilityDomain, MaterialAnalysis, EnergyAnalysis, WaterAnalysis, WasteManagement, ESGScore, CarbonFootprint, EmissionRecord, SustainabilityIntelligenceIndex, NetZeroPlan, ClimateRiskAnalysis, CircularEconomyMetrics, ReductionScenario, SustainabilityPrediction, EmissionSource } from "./types";
export interface IEngine {
    name: string;
    version: string;
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
}
export interface IAnalyzer {
    analyze(data: unknown): Promise<unknown>;
    validate(data: unknown): boolean;
    report(data: unknown): string;
}
export interface ISustainabilityEngine extends IEngine {
    readonly domain: SustainabilityDomain;
    readonly carbonCalculator: ICarbonCalculator;
    readonly energyAnalyzer: IEnergyAnalyzer;
    readonly waterAnalyzer: IWaterAnalyzer;
    readonly wasteManager: IWasteManager;
    readonly esgAnalyzer: IESGAnalyzer;
    readonly materialAnalyzer: IMaterialAnalyzer;
    calculateCarbonFootprint(data: unknown): Promise<CarbonFootprint>;
    analyzeEnergy(data: unknown): Promise<EnergyAnalysis>;
    analyzeWater(data: unknown): Promise<WaterAnalysis>;
    manageWaste(data: unknown): Promise<WasteManagement>;
    calculateESG(data: unknown): Promise<ESGScore>;
    analyzeMaterial(data: unknown): Promise<MaterialAnalysis>;
    getSustainabilityIndex(data: unknown): Promise<SustainabilityIntelligenceIndex>;
    createNetZeroPlan(data: unknown): Promise<NetZeroPlan>;
    analyzeClimateRisk(data: unknown): Promise<ClimateRiskAnalysis>;
    analyzeCircularEconomy(data: unknown): Promise<CircularEconomyMetrics>;
    askQuestion(query: string): Promise<string>;
    predict(type: string, data: unknown): Promise<SustainabilityPrediction>;
    generateReport(data: unknown): Promise<string>;
    integrateBIM(data: unknown): Promise<unknown>;
    integrateGIS(data: unknown): Promise<unknown>;
    integrateIoT(data: unknown): Promise<unknown>;
    integrateProcurement(data: unknown): Promise<unknown>;
    integrateDigitalTwin(data: unknown): Promise<unknown>;
    integrateKnowledgeGraph(data: unknown): Promise<unknown>;
}
export interface ICarbonCalculator {
    calculate(data: {
        sources: Array<{
            source: EmissionSource;
            activity: number;
            unit: string;
        }>;
    }): Promise<CarbonFootprint>;
    calculateScope1(sources: EmissionRecord[]): Promise<{
        total: number;
        sources: EmissionRecord[];
    }>;
    calculateScope2(electricityConsumption: number, gridFactor: number): Promise<{
        total: number;
        sources: EmissionRecord[];
    }>;
    calculateScope3(supplyChainData: Record<string, number>): Promise<{
        total: number;
        categories: Record<string, number>;
        sources: EmissionRecord[];
    }>;
    getEmissionFactor(source: EmissionSource): Promise<number>;
    analyzeReductionScenarios(data: unknown): Promise<ReductionScenario[]>;
    createNetZeroPlan(data: unknown): Promise<NetZeroPlan>;
    offsetEmissions(amount: number, type: string): Promise<{
        cost: number;
        verified: boolean;
    }>;
    validateMethodology(data: unknown): boolean;
}
export interface IEnergyAnalyzer {
    analyzeElectricity(data: unknown): Promise<{
        consumption: number;
        peak: number;
        offPeak: number;
        unit: string;
    }>;
    analyzeFuel(data: unknown): Promise<{
        type: string;
        consumption: number;
        efficiency: number;
    }>;
    analyzeSolar(data: unknown): Promise<{
        capacity: number;
        generation: number;
        efficiency: number;
    }>;
    calculateEfficiency(data: unknown): Promise<{
        overall: number;
        breakdown: Record<string, number>;
        benchmark: number;
    }>;
    optimizeEnergy(data: unknown): Promise<{
        savings: number;
        recommendations: string[];
    }>;
    predictConsumption(history: number[]): Promise<number[]>;
}
export interface IWaterAnalyzer {
    analyzeConsumption(data: unknown): Promise<{
        total: number;
        potable: number;
        nonPotable: number;
        perCapita: number;
    }>;
    analyzeLoss(data: unknown): Promise<{
        leakage: number;
        evaporation: number;
        total: number;
        rate: number;
    }>;
    analyzeReuse(data: unknown): Promise<{
        treated: number;
        recycled: number;
        harvested: number;
        rate: number;
    }>;
    analyzeRainwater(data: unknown): Promise<{
        collection: number;
        storage: number;
        usage: number;
        potential: number;
    }>;
    calculateEfficiency(data: unknown): Promise<{
        overall: number;
        benchmark: number;
        recommendations: string[];
    }>;
    optimizeWater(data: unknown): Promise<{
        savings: number;
        recommendations: string[];
    }>;
}
export interface IWasteManager {
    classifyWaste(data: unknown): Promise<{
        category: string;
        amount: number;
        hazard: boolean;
    }>;
    calculateDiversionRate(data: unknown): Promise<number>;
    optimizeRecycling(data: unknown): Promise<{
        rate: number;
        recommendations: string[];
    }>;
    planWasteReduction(data: unknown): Promise<{
        target: number;
        measures: string[];
        timeline: string;
    }>;
    analyzeCircularEconomy(data: unknown): Promise<{
        materialCircularity: number;
        recommendations: string[];
    }>;
}
export interface IESGAnalyzer {
    calculateEnvironmental(data: unknown): Promise<ESGScore["environmental"]>;
    calculateSocial(data: unknown): Promise<ESGScore["social"]>;
    calculateGovernance(data: unknown): Promise<ESGScore["governance"]>;
    calculateOverall(data: unknown): Promise<ESGScore>;
    generateESGReport(data: unknown): Promise<string>;
    alignWithFramework(framework: string, data: unknown): Promise<{
        aligned: boolean;
        gaps: string[];
    }>;
    benchmarkAgainstPeers(data: unknown): Promise<{
        percentile: number;
        strengths: string[];
        weaknesses: string[];
    }>;
}
export interface IMaterialAnalyzer {
    analyzeMaterial(data: unknown): Promise<MaterialAnalysis>;
    compareMaterials(materials: MaterialAnalysis[]): Promise<{
        best: MaterialAnalysis;
        ranking: MaterialAnalysis[];
    }>;
    findAlternatives(materialId: string): Promise<MaterialAnalysis[]>;
    calculateEmbodiedCarbon(data: unknown): Promise<{
        total: number;
        byPhase: Record<string, number>;
    }>;
    assessLifecycle(data: unknown): Promise<{
        stages: Record<string, number>;
        total: number;
    }>;
    suggestOptimization(data: unknown): Promise<{
        material: string;
        savings: number;
        impact: number;
    }>;
}
//# sourceMappingURL=interfaces.d.ts.map