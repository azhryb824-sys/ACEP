import { SustainabilityIntelligenceIndex } from "./types";
type CalculateData = {
    emissions?: {
        performance: number;
        trend?: string;
    };
    energy?: {
        efficiency: number;
        trend?: string;
    };
    water?: {
        efficiency: number;
        trend?: string;
    };
    recycling?: {
        rate: number;
        trend?: string;
    };
    compliance?: {
        score: number;
        trend?: string;
    };
    social?: {
        score: number;
        trend?: string;
    };
    governance?: {
        score: number;
        trend?: string;
    };
};
export declare class SustainabilityIndex {
    private defaultWeights;
    calculate(data: CalculateData): Promise<SustainabilityIntelligenceIndex>;
    compare(projects: Array<{
        id: string;
        name: string;
        data: CalculateData;
    }>): Promise<Array<{
        id: string;
        name: string;
        index: SustainabilityIntelligenceIndex;
        rank: number;
    }>>;
    trackTrend(historyData: Array<{
        date: string;
        dimensions: Record<string, number>;
    }>): Promise<Array<{
        date: string;
        overall: number;
        changes: Record<string, number>;
    }>>;
    private clamp;
    private getRating;
    private generateHistory;
}
export {};
//# sourceMappingURL=sustainability-index.d.ts.map