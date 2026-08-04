import { IEngine } from '@acep/core';
import { ExecutiveDashboard, EnterpriseHealthIndex, AlertNotification, ScenarioAnalysis, PredictionResult, ReportConfig, BenchmarkConfig, BenchmarkResult, DataSourceType, KPIType } from './types';
export interface IBusinessIntelligenceEngine extends IEngine {
    collectData(sources?: DataSourceType[]): Promise<void>;
    generateExecutiveDashboard(): Promise<ExecutiveDashboard>;
    trackKPI(type: KPIType, value: number, target: number): Promise<{
        actual: number;
        target: number;
        variance: number;
        status: 'on_track' | 'at_risk' | 'behind';
    }>;
    getCompanyHealth(): Promise<EnterpriseHealthIndex>;
    getAlerts(): Promise<AlertNotification[]>;
    acknowledgeAlert(alertId: string, userId: string): Promise<void>;
}
export interface IDashboardManager {
    createDashboard(name: string, sections: string[], filters?: Record<string, unknown>): Promise<ExecutiveDashboard>;
    refreshDashboard(): Promise<ExecutiveDashboard>;
    exportDashboard(format: 'pdf' | 'excel' | 'html'): Promise<string>;
    customizeDashboard(config: Record<string, unknown>): Promise<void>;
    getDashboardHistory(limit?: number): Promise<ExecutiveDashboard[]>;
}
export interface IAnalyticsEngine {
    descriptiveAnalysis(metric: string, period: string): Promise<{
        mean: number;
        median: number;
        stdDev: number;
        min: number;
        max: number;
        trend: string;
    }>;
    diagnosticAnalysis(metric: string, anomaly: number): Promise<{
        rootCauses: string[];
        contributingFactors: string[];
        correlation: Record<string, number>;
    }>;
    predictiveAnalysis(metric: string, horizon: number): Promise<PredictionResult>;
    prescriptiveAnalysis(metric: string, target: number): Promise<{
        recommendations: string[];
        expectedImpact: number;
        confidence: number;
    }>;
}
export interface IPredictiveEngine {
    predictRevenue(months: number): Promise<PredictionResult>;
    predictProfit(months: number): Promise<PredictionResult>;
    predictCashFlow(months: number): Promise<PredictionResult>;
    predictDemand(months: number): Promise<PredictionResult>;
    predictHiringNeeds(months: number): Promise<PredictionResult>;
    predictProcurementNeeds(months: number): Promise<PredictionResult>;
    predictMaterialConsumption(months: number): Promise<PredictionResult>;
    predictProjectPerformance(projectId: string): Promise<PredictionResult>;
}
export interface IScenarioManager {
    createScenario(name: string, description: string, assumptions: string[]): Promise<ScenarioAnalysis>;
    compareScenarios(scenarioId: string): Promise<{
        recommendation: string;
        comparison: Record<string, {
            a: number;
            b: number;
            c: number;
        }>;
    }>;
    runScenario(scenarioId: string, variant: 'A' | 'B' | 'C', parameters: Record<string, number>): Promise<ScenarioAnalysis>;
    getScenarioHistory(): Promise<ScenarioAnalysis[]>;
}
export interface IReportGenerator {
    generateReport(config: ReportConfig): Promise<string>;
    scheduleReport(config: ReportConfig): Promise<void>;
    getReportHistory(type?: string): Promise<{
        id: string;
        type: string;
        format: string;
        generatedAt: string;
        url: string;
    }[]>;
    sendReport(reportId: string, recipients: string[]): Promise<void>;
}
export interface IBenchmarkEngine {
    runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult>;
    compareEntities(entityIds: string[], metrics: string[]): Promise<BenchmarkResult>;
    getIndustryAverages(metrics: string[]): Promise<Record<string, number>>;
    trackBenchmarkHistory(configId: string): Promise<BenchmarkResult[]>;
    getInsights(benchmarkId: string): Promise<string[]>;
}
//# sourceMappingURL=interfaces.d.ts.map