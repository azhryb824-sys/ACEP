import { AssetHealthIndex, ConditionMonitoringData, SmartAssetCard, FailureAnalysis, WorkOrder } from './types';
export declare class AssetHealthIndexCalculator {
    private readonly weights;
    calculate(asset: SmartAssetCard, sensorData: ConditionMonitoringData[], failures: FailureAnalysis[], workOrders: WorkOrder[]): AssetHealthIndex;
    private calculateOperationScore;
    private calculateInspectionScore;
    private calculateInspectionFrequency;
    private calculateOpenFindingsScore;
    private calculateSensorScore;
    private calculateTemperatureScore;
    private calculateVibrationScore;
    private calculatePressureScore;
    private calculateEnergyScore;
    private calculateErrorScore;
    private calculateFailureScore;
    private calculateFailureSeverityScore;
    private calculateDowntimeScore;
    private calculateMaintenanceScore;
    private calculateMaintenanceCompliance;
    private calculateBacklogScore;
    private calculateCostEfficiencyScore;
    private calculateAgeScore;
    private calculateWearScore;
    private calculateObsolescenceScore;
    private calculatePerformanceScore;
    private calculateAvailabilityScore;
    private calculateOutputQualityScore;
    private buildWeightedFactors;
    private determinePriority;
    private generateRecommendation;
}
//# sourceMappingURL=asset-health-index.d.ts.map