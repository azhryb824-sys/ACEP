import { ReliabilityMetrics, ReliabilityTrend, FailureAnalysis, WorkOrder } from './types';
export declare class ReliabilityAnalyzer {
    calculateMTBF(failures: FailureAnalysis[], totalOperatingHours: number): number;
    calculateMTTR(failures: FailureAnalysis[]): number;
    calculateAvailability(mtbf: number, mttr: number): number;
    calculateReliability(mtbf: number, missionTime: number): number;
    calculateFailureRate(totalFailures: number, totalOperatingHours: number): number;
    getReliabilityMetrics(assetId: string, failures: FailureAnalysis[], workOrders: WorkOrder[], totalOperatingHours: number, periodStart: string, periodEnd: string): ReliabilityMetrics;
    analyzeTrend(failures: FailureAnalysis[], workOrders: WorkOrder[]): ReliabilityTrend;
    private calculateTrend;
    predictRemainingLife(assetId: string, failures: FailureAnalysis[], designLife: number, installDate: string): {
        estimatedRemainingYears: number;
        confidence: number;
        basedOn: string[];
        recommendation: string;
    };
    classifyFailure(failure: FailureAnalysis): {
        primaryCategory: string;
        contributingFactors: string[];
        probabilityDistribution: Record<string, number>;
    };
    getFailureStatistics(failures: FailureAnalysis[]): {
        totalFailures: number;
        totalDowntime: number;
        meanTimeBetweenFailures: number;
        meanTimeToRepair: number;
        mostCommonCategory: string;
        failureRateTrend: string;
        byCategory: Record<string, number>;
        byMonth: Record<string, number>;
    };
    calculateTotalCostOfFailures(failures: FailureAnalysis[]): number;
    calculateDowntimeCost(failures: FailureAnalysis[], costPerHour: number): number;
}
//# sourceMappingURL=reliability-analyzer.d.ts.map