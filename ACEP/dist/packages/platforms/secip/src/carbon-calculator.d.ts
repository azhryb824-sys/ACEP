import { EmissionSource, EmissionFactors, EmissionRecord, CarbonFootprint, ReductionScenario, NetZeroPlan } from "./types";
import { ICarbonCalculator } from "./interfaces";
export declare const DEFAULT_EMISSION_FACTORS: Record<EmissionSource, number>;
export declare const SCOPE_CLASSIFICATION: Record<EmissionSource, 1 | 2 | 3>;
export declare class CarbonCalculator implements ICarbonCalculator {
    private factors;
    constructor(customFactors?: Partial<Record<EmissionSource, Partial<EmissionFactors>>>);
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
    analyzeReductionScenarios(_data: unknown): Promise<ReductionScenario[]>;
    createNetZeroPlan(data: unknown): Promise<NetZeroPlan>;
    offsetEmissions(amount: number, type: string): Promise<{
        cost: number;
        verified: boolean;
    }>;
    validateMethodology(_data: unknown): boolean;
    private getCategory;
}
//# sourceMappingURL=carbon-calculator.d.ts.map