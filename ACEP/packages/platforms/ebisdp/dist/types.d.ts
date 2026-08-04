export declare enum DataSourceType {
    Projects = "Projects",
    Contracts = "Contracts",
    Procurement = "Procurement",
    HR = "HR",
    Inventory = "Inventory",
    Accounting = "Accounting",
    Maintenance = "Maintenance",
    Quality = "Quality",
    Safety = "Safety",
    Risk = "Risk",
    BIM = "BIM",
    GIS = "GIS",
    IoT = "IoT",
    DigitalTwin = "DigitalTwin",
    CRM = "CRM",
    Suppliers = "Suppliers",
    Clients = "Clients"
}
export declare enum KPIType {
    KPI = "KPI",
    OKR = "OKR",
    SPI = "SPI",
    CPI = "CPI",
    EarnedValue = "EarnedValue",
    ProfitMargin = "ProfitMargin",
    ROI = "ROI",
    UtilizationRate = "UtilizationRate",
    ProductivityIndex = "ProductivityIndex",
    QualityIndex = "QualityIndex",
    SafetyIndex = "SafetyIndex",
    CustomerSatisfaction = "CustomerSatisfaction"
}
export interface FinancialMetric {
    revenue: number;
    expenses: number;
    profit: number;
    cashFlow: number;
    receivables: number;
    payables: number;
    currency: string;
    period: string;
}
export interface ProjectMetric {
    count: number;
    active: number;
    delayed: number;
    completed: number;
    critical: number;
    completion: number;
    productivity: number;
    quality: number;
    rework: number;
    claims: number;
    changeOrders: number;
}
export interface ResourceMetric {
    workers: number;
    equipment: number;
    assets: number;
    suppliers: number;
    inventory: number;
    utilizationRate: number;
    efficiency: number;
}
export interface ExecutiveDashboard {
    companyHealth: EnterpriseHealthIndex;
    projectPerformance: {
        overall: ProjectMetric;
        byProject: Record<string, ProjectMetric>;
        atRisk: string[];
        topPerformers: string[];
    };
    financials: {
        overall: FinancialMetric;
        profitability: number;
        revenueGrowth: number;
        costTrend: number;
        cashFlowStatus: 'positive' | 'negative' | 'critical';
        budgetVariance: number;
    };
    engineeringMetrics: {
        bimAdoption: number;
        digitalTwinCount: number;
        iotDevicesConnected: number;
        gisCoverage: number;
        automationLevel: number;
        innovationIndex: number;
    };
    resources: {
        workforce: ResourceMetric;
        equipment: ResourceMetric;
        materials: ResourceMetric;
        suppliers: ResourceMetric;
    };
    alerts: AlertNotification[];
    timestamp: string;
}
export interface AlertThreshold {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: number;
    unit?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
}
export interface AlertDefinition {
    id: string;
    name: string;
    description: string;
    source: DataSourceType;
    thresholds: AlertThreshold[];
    enabled: boolean;
    notificationChannels: string[];
    cooldownMinutes: number;
}
export interface AlertNotification {
    id: string;
    alertId: string;
    alertName: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    metric: string;
    currentValue: number;
    thresholdValue: number;
    triggeredAt: string;
    acknowledged: boolean;
    acknowledgedBy?: string;
    resolvedAt?: string;
}
export interface ScenarioAnalysis {
    id: string;
    name: string;
    description: string;
    assumptions: string[];
    scenarioA: ScenarioVariant;
    scenarioB: ScenarioVariant;
    scenarioC: ScenarioVariant;
    recommendedScenario: 'A' | 'B' | 'C';
    confidence: number;
    createdAt: string;
}
export interface ScenarioVariant {
    profit: number;
    cashFlow: number;
    resources: number;
    risk: number;
    capacity: number;
    revenue: number;
    costs: number;
    timeline: number;
    description: string;
}
export interface PredictionResult {
    revenue: PredictionValue;
    profit: PredictionValue;
    cashFlow: PredictionValue;
    demand: PredictionValue;
    hiring: PredictionValue;
    procurement: PredictionValue;
    materialConsumption: PredictionValue;
    projectPerformance: PredictionValue;
}
export interface PredictionValue {
    value: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable' | 'volatile';
    factors: string[];
    unit: string;
}
export type ReportType = 'Executive' | 'Financial' | 'Engineering' | 'Risk' | 'Quality' | 'Safety' | 'Performance' | 'Investor';
export interface ReportConfig {
    type: ReportType;
    format: 'pdf' | 'excel' | 'html' | 'interactive';
    period: string;
    sections: string[];
    recipients: string[];
    schedule?: string;
    filters?: Record<string, unknown>;
}
export interface BenchmarkConfig {
    name: string;
    scope: 'projects' | 'branches' | 'departments' | 'teams' | 'suppliers' | 'contractors' | 'equipment';
    metrics: string[];
    period: string;
    groupBy: string;
    target?: number;
}
export interface BenchmarkResult {
    id: string;
    config: BenchmarkConfig;
    rankings: BenchmarkEntry[];
    topPerformer: string;
    bottomPerformer: string;
    averageScore: number;
    medianScore: number;
    stdDeviation: number;
    insights: string[];
    timestamp: string;
}
export interface BenchmarkEntry {
    entityId: string;
    entityName: string;
    scores: Record<string, number>;
    overallScore: number;
    rank: number;
    changeFromLastPeriod: number;
}
export interface EnterpriseHealthIndex {
    overall: number;
    financial: number;
    projects: number;
    quality: number;
    safety: number;
    customer: number;
    resources: number;
    compliance: number;
    risk: number;
    innovation: number;
    lastUpdated: string;
}
export interface DecisionIntelligenceLedger {
    id: string;
    decision: string;
    owner: string;
    date: string;
    data: Record<string, unknown>;
    alternatives: DecisionAlternative[];
    risks: DecisionRisk[];
    expectedOutcome: string;
    actualOutcome?: string;
    outcomeEvaluation?: 'exceeded' | 'met' | 'below' | 'failed';
    lessonsLearned?: string[];
    createdAt: string;
    updatedAt: string;
}
export interface DecisionAlternative {
    name: string;
    description: string;
    pros: string[];
    cons: string[];
    expectedImpact: number;
    confidence: number;
}
export interface DecisionRisk {
    description: string;
    probability: number;
    impact: number;
    severity: number;
    mitigation: string;
}
export interface ExecutiveQuery {
    question: string;
    context?: Record<string, unknown>;
}
export interface ExecutiveResponse {
    answer: string;
    evidence: string[];
    assumptions: string[];
    confidence: number;
    relatedMetrics: string[];
    visualizations?: string[];
    disclaimer?: string;
    timestamp: string;
}
//# sourceMappingURL=types.d.ts.map