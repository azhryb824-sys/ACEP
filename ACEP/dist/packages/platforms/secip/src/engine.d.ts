import { SustainabilityDomain, MaterialAnalysis, EnergyAnalysis, WaterAnalysis, WasteManagement, ESGScore, CarbonFootprint, SustainabilityIntelligenceIndex, NetZeroPlan, ClimateRiskAnalysis, CircularEconomyMetrics, ReductionScenario, SustainabilityPrediction } from "./types";
import { ISustainabilityEngine, IEnergyAnalyzer, IWaterAnalyzer, IWasteManager, IMaterialAnalyzer } from "./interfaces";
import { CarbonCalculator } from "./carbon-calculator";
import { ESGAnalyzer } from "./esg-analyzer";
import { SustainabilityIndex } from "./sustainability-index";
export declare class SustainabilityEngine implements ISustainabilityEngine {
    readonly name = "ACEP Sustainability, ESG & Carbon Intelligence Platform (SECIP)";
    readonly version = "1.0.0";
    readonly domain: SustainabilityDomain;
    readonly carbonCalculator: CarbonCalculator;
    readonly energyAnalyzer: EnergyAnalyzer;
    readonly waterAnalyzer: WaterAnalyzer;
    readonly wasteManager: WasteManager;
    readonly esgAnalyzer: ESGAnalyzer;
    readonly materialAnalyzer: MaterialAnalyzer;
    readonly sustainabilityIndex: SustainabilityIndex;
    private initialized;
    constructor(domain?: SustainabilityDomain);
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    calculateCarbonFootprint(data: unknown): Promise<CarbonFootprint>;
    analyzeEnergy(data: unknown): Promise<EnergyAnalysis>;
    analyzeWater(data: unknown): Promise<WaterAnalysis>;
    manageWaste(data: unknown): Promise<WasteManagement>;
    calculateESG(data: unknown): Promise<ESGScore>;
    analyzeMaterial(data: unknown): Promise<MaterialAnalysis>;
    getSustainabilityIndex(data: unknown): Promise<SustainabilityIntelligenceIndex>;
    createNetZeroPlan(data: unknown): Promise<NetZeroPlan>;
    analyzeClimateRisk(_data: unknown): Promise<ClimateRiskAnalysis>;
    analyzeCircularEconomy(_data: unknown): Promise<CircularEconomyMetrics>;
    analyzeReductionScenarios(_data: unknown): Promise<ReductionScenario[]>;
    askQuestion(query: string): Promise<string>;
    predict(type: string, _data: unknown): Promise<SustainabilityPrediction>;
    generateReport(data: unknown): Promise<string>;
    integrateBIM(_data: unknown): Promise<unknown>;
    integrateGIS(_data: unknown): Promise<unknown>;
    integrateIoT(_data: unknown): Promise<unknown>;
    integrateProcurement(_data: unknown): Promise<unknown>;
    integrateDigitalTwin(_data: unknown): Promise<unknown>;
    integrateKnowledgeGraph(_data: unknown): Promise<unknown>;
    private getEmissionReductionAdvice;
}
declare class EnergyAnalyzer implements IEnergyAnalyzer {
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
    optimizeEnergy(_data: unknown): Promise<{
        savings: number;
        recommendations: string[];
    }>;
    predictConsumption(history: number[]): Promise<number[]>;
    analyze(_data: unknown): Promise<EnergyAnalysis>;
}
declare class WaterAnalyzer implements IWaterAnalyzer {
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
    optimizeWater(_data: unknown): Promise<{
        savings: number;
        recommendations: string[];
    }>;
    analyze(_data: unknown): Promise<WaterAnalysis>;
}
declare class WasteManager implements IWasteManager {
    classifyWaste(_data: unknown): Promise<{
        category: string;
        amount: number;
        hazard: boolean;
    }>;
    calculateDiversionRate(_data: unknown): Promise<number>;
    optimizeRecycling(_data: unknown): Promise<{
        rate: number;
        recommendations: string[];
    }>;
    planWasteReduction(_data: unknown): Promise<{
        target: number;
        measures: string[];
        timeline: string;
    }>;
    analyzeCircularEconomy(_data: unknown): Promise<{
        materialCircularity: number;
        recommendations: string[];
    }>;
    analyze(_data: unknown): Promise<WasteManagement>;
}
declare class MaterialAnalyzer implements IMaterialAnalyzer {
    analyzeMaterial(_data: unknown): Promise<MaterialAnalysis>;
    compareMaterials(materials: MaterialAnalysis[]): Promise<{
        best: MaterialAnalysis;
        ranking: MaterialAnalysis[];
    }>;
    findAlternatives(_materialId: string): Promise<MaterialAnalysis[]>;
    calculateEmbodiedCarbon(_data: unknown): Promise<{
        total: number;
        byPhase: Record<string, number>;
    }>;
    assessLifecycle(_data: unknown): Promise<{
        stages: Record<string, number>;
        total: number;
    }>;
    suggestOptimization(_data: unknown): Promise<{
        material: string;
        savings: number;
        impact: number;
    }>;
}
export {};
//# sourceMappingURL=engine.d.ts.map