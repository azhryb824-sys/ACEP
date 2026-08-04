import { BaseEngine } from '@acep/core';
import { ExecutiveDashboard, EnterpriseHealthIndex, AlertDefinition, AlertNotification, ScenarioAnalysis, PredictionResult, ReportConfig, BenchmarkConfig, BenchmarkResult, ExecutiveQuery, ExecutiveResponse, DataSourceType, KPIType, DecisionIntelligenceLedger } from './types';
import { IBusinessIntelligenceEngine, IDashboardManager, IAnalyticsEngine, IPredictiveEngine, IScenarioManager, IReportGenerator, IBenchmarkEngine } from './interfaces';
export declare class BusinessIntelligenceEngine extends BaseEngine implements IBusinessIntelligenceEngine, IDashboardManager, IAnalyticsEngine, IPredictiveEngine, IScenarioManager, IReportGenerator, IBenchmarkEngine {
    private dataSources;
    private dashboards;
    private alerts;
    private alertDefs;
    private scenarios;
    private reportHistory;
    private benchmarks;
    private benchHistory;
    private decisions;
    private healthHistory;
    private predictionCache;
    constructor(config?: Record<string, unknown>);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    private initializeDataSources;
    private initializeAlertDefinitions;
    collectData(sources?: DataSourceType[]): Promise<void>;
    private collectFromSource;
    generateExecutiveDashboard(): Promise<ExecutiveDashboard>;
    private generateProjectMetrics;
    private generateFinancialMetrics;
    trackKPI(type: KPIType, value: number, target: number): Promise<{
        actual: number;
        target: number;
        variance: number;
        status: 'on_track' | 'at_risk' | 'behind';
    }>;
    getCompanyHealth(): Promise<EnterpriseHealthIndex>;
    getAlerts(): Promise<AlertNotification[]>;
    acknowledgeAlert(alertId: string, userId: string): Promise<void>;
    private evaluateAlerts;
    createDashboard(name: string, sections: string[], filters?: Record<string, unknown>): Promise<ExecutiveDashboard>;
    refreshDashboard(): Promise<ExecutiveDashboard>;
    exportDashboard(format: 'pdf' | 'excel' | 'html'): Promise<string>;
    customizeDashboard(config: Record<string, unknown>): Promise<void>;
    getDashboardHistory(limit?: number): Promise<ExecutiveDashboard[]>;
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
    predictRevenue(months: number): Promise<PredictionResult>;
    predictProfit(months: number): Promise<PredictionResult>;
    predictCashFlow(months: number): Promise<PredictionResult>;
    predictDemand(months: number): Promise<PredictionResult>;
    predictHiringNeeds(months: number): Promise<PredictionResult>;
    predictProcurementNeeds(months: number): Promise<PredictionResult>;
    predictMaterialConsumption(months: number): Promise<PredictionResult>;
    predictProjectPerformance(projectId: string): Promise<PredictionResult>;
    private generatePrediction;
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
    runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult>;
    compareEntities(entityIds: string[], metrics: string[]): Promise<BenchmarkResult>;
    getIndustryAverages(metrics: string[]): Promise<Record<string, number>>;
    trackBenchmarkHistory(configId: string): Promise<BenchmarkResult[]>;
    getInsights(benchmarkId: string): Promise<string[]>;
    answerExecutiveQuery(query: ExecutiveQuery): Promise<ExecutiveResponse>;
    addDecision(decision: Omit<DecisionIntelligenceLedger, 'id' | 'createdAt' | 'updatedAt'>): Promise<DecisionIntelligenceLedger>;
    getDecisions(): Promise<DecisionIntelligenceLedger[]>;
    evaluateDecisionQuality(): Promise<{
        totalDecisions: number;
        exceeded: number;
        met: number;
        below: number;
        failed: number;
        averageAccuracy: number;
    }>;
    getDataSources(): Map<DataSourceType, Record<string, unknown>[]>;
    getAlertDefinitions(): AlertDefinition[];
    getHealthHistory(): EnterpriseHealthIndex[];
}
//# sourceMappingURL=engine.d.ts.map