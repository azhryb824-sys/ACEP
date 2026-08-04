import { PredictiveAnalysis, ConditionMonitoringData, FailureAnalysis, WorkOrder, SmartAssetCard } from './types';
import { AggregatedPredictiveAnalysis } from './interfaces';
export declare class PredictiveAnalyzer {
    analyzeFailurePatterns(assetId: string, failures: FailureAnalysis[]): Promise<PredictiveAnalysis>;
    analyzeMaintenanceHistory(assetId: string, workOrders: WorkOrder[]): Promise<PredictiveAnalysis>;
    analyzeOperationalBehavior(assetId: string, sensorData: ConditionMonitoringData[]): Promise<PredictiveAnalysis>;
    analyzeManufacturerData(assetId: string, asset: SmartAssetCard): Promise<PredictiveAnalysis>;
    analyzeSensorTrends(assetId: string, sensorData: ConditionMonitoringData[]): Promise<PredictiveAnalysis>;
    analyzeEnvironmentalImpact(assetId: string, asset: SmartAssetCard): Promise<PredictiveAnalysis>;
    comprehensiveAnalysis(assetId: string, asset: SmartAssetCard, sensorData: ConditionMonitoringData[], failures: FailureAnalysis[], workOrders: WorkOrder[]): Promise<AggregatedPredictiveAnalysis>;
    private buildAnalysis;
    private assessManufacturerQuality;
    private generateActions;
}
//# sourceMappingURL=predictive-analyzer.d.ts.map