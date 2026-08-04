import { ESGScore } from "./types";
import { IESGAnalyzer } from "./interfaces";
export declare class ESGAnalyzer implements IESGAnalyzer {
    private weights;
    private subWeights;
    setWeights(env: number, soc: number, gov: number): void;
    calculateEnvironmental(data: unknown): Promise<ESGScore["environmental"]>;
    calculateSocial(data: unknown): Promise<ESGScore["social"]>;
    calculateGovernance(data: unknown): Promise<ESGScore["governance"]>;
    calculateOverall(data: unknown): Promise<ESGScore>;
    generateESGReport(data: unknown): Promise<string>;
    alignWithFramework(framework: string, _data: unknown): Promise<{
        aligned: boolean;
        gaps: string[];
    }>;
    benchmarkAgainstPeers(_data: unknown): Promise<{
        percentile: number;
        strengths: string[];
        weaknesses: string[];
    }>;
    private calculateBiodiversityScore;
    private normalize;
    private normalizeInv;
    private getRating;
    private generateRecommendations;
}
//# sourceMappingURL=esg-analyzer.d.ts.map