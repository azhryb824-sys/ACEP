import { BaseEngine } from '@acep/core';
import { v4 as uuid } from 'uuid';
import {
  ExecutiveDashboard, EnterpriseHealthIndex, AlertDefinition, AlertNotification,
  AlertThreshold, ScenarioAnalysis, ScenarioVariant, PredictionResult, PredictionValue,
  ReportConfig, ReportType, BenchmarkConfig, BenchmarkResult, BenchmarkEntry,
  ExecutiveQuery, ExecutiveResponse, DataSourceType, FinancialMetric, ProjectMetric,
  ResourceMetric, KPIType, DecisionIntelligenceLedger, DecisionAlternative, DecisionRisk
} from './types';
import {
  IBusinessIntelligenceEngine, IDashboardManager, IAnalyticsEngine,
  IPredictiveEngine, IScenarioManager, IReportGenerator, IBenchmarkEngine
} from './interfaces';

export class BusinessIntelligenceEngine extends BaseEngine
  implements IBusinessIntelligenceEngine, IDashboardManager, IAnalyticsEngine,
             IPredictiveEngine, IScenarioManager, IReportGenerator, IBenchmarkEngine {
  private dataSources: Map<DataSourceType, Record<string, unknown>[]> = new Map();
  private dashboards: ExecutiveDashboard[] = [];
  private alerts: Map<string, AlertNotification> = new Map();
  private alertDefs: Map<string, AlertDefinition> = new Map();
  private scenarios: ScenarioAnalysis[] = [];
  private reportHistory: { id: string; type: string; format: string; generatedAt: string; url: string }[] = [];
  private benchmarks: Map<string, BenchmarkResult> = new Map();
  private benchHistory: Map<string, BenchmarkResult[]> = new Map();
  private decisions: DecisionIntelligenceLedger[] = [];
  private healthHistory: EnterpriseHealthIndex[] = [];
  private predictionCache: Map<string, PredictionResult> = new Map();

  constructor(config?: Record<string, unknown>) {
    super('BusinessIntelligenceEngine', '1.0.0', config);
  }

  async initialize(): Promise<void> {
    this.initializeDataSources();
    this.initializeAlertDefinitions();
    this.setStatus('initialized');
    this.logger.info('BusinessIntelligenceEngine initialized');
  }

  async validate(): Promise<boolean> {
    return this.dataSources.size > 0;
  }

  private initializeDataSources(): void {
    for (const source of Object.values(DataSourceType)) {
      this.dataSources.set(source, []);
    }
  }

  private initializeAlertDefinitions(): void {
    const defs: AlertDefinition[] = [
      {
        id: 'alert-profit-drop', name: 'Profit Drop', description: 'Profit drops below threshold',
        source: DataSourceType.Accounting,
        thresholds: [{ metric: 'profitMargin', operator: '<', value: 5, unit: '%', severity: 'high' }],
        enabled: true, notificationChannels: ['email', 'dashboard'], cooldownMinutes: 1440
      },
      {
        id: 'alert-risk-increase', name: 'Risk Increase', description: 'Risk score exceeds threshold',
        source: DataSourceType.Risk,
        thresholds: [{ metric: 'riskScore', operator: '>', value: 70, unit: 'points', severity: 'critical' }],
        enabled: true, notificationChannels: ['email', 'sms', 'dashboard'], cooldownMinutes: 60
      },
      {
        id: 'alert-budget-exceeded', name: 'Budget Exceeded', description: 'Project budget exceeded',
        source: DataSourceType.Accounting,
        thresholds: [{ metric: 'budgetVariance', operator: '>', value: 10, unit: '%', severity: 'high' }],
        enabled: true, notificationChannels: ['email', 'dashboard'], cooldownMinutes: 1440
      },
      {
        id: 'alert-delay', name: 'Schedule Delay', description: 'Project delay exceeds threshold',
        source: DataSourceType.Projects,
        thresholds: [{ metric: 'scheduleDelay', operator: '>', value: 15, unit: '%', severity: 'high' }],
        enabled: true, notificationChannels: ['email', 'dashboard'], cooldownMinutes: 1440
      },
      {
        id: 'alert-safety-incident', name: 'Safety Incident', description: 'Safety score drops below threshold',
        source: DataSourceType.Safety,
        thresholds: [{ metric: 'safetyScore', operator: '<', value: 60, unit: 'points', severity: 'critical' }],
        enabled: true, notificationChannels: ['email', 'sms', 'dashboard'], cooldownMinutes: 0
      },
      {
        id: 'alert-quality-issue', name: 'Quality Issue', description: 'Quality index drops below threshold',
        source: DataSourceType.Quality,
        thresholds: [{ metric: 'qualityIndex', operator: '<', value: 70, unit: 'points', severity: 'high' }],
        enabled: true, notificationChannels: ['email', 'dashboard'], cooldownMinutes: 1440
      },
      {
        id: 'alert-cashflow-critical', name: 'Cash Flow Critical', description: 'Cash flow negative for extended period',
        source: DataSourceType.Accounting,
        thresholds: [{ metric: 'cashFlow', operator: '<', value: 0, unit: 'SAR', severity: 'critical' }],
        enabled: true, notificationChannels: ['email', 'sms', 'dashboard'], cooldownMinutes: 60
      },
      {
        id: 'alert-resource-shortage', name: 'Resource Shortage', description: 'Critical resource shortage detected',
        source: DataSourceType.Inventory,
        thresholds: [{ metric: 'inventoryLevel', operator: '<', value: 20, unit: '%', severity: 'medium' }],
        enabled: true, notificationChannels: ['email', 'dashboard'], cooldownMinutes: 1440
      }
    ];
    for (const def of defs) {
      this.alertDefs.set(def.id, def);
    }
  }

  async collectData(sources?: DataSourceType[]): Promise<void> {
    const targets = sources || Object.values(DataSourceType);
    this.setStatus('running');
    this.logger.info(`Collecting data from ${targets.length} sources`);

    for (const source of targets) {
      await this.collectFromSource(source);
    }

    await this.evaluateAlerts();
    this.setStatus('initialized');
  }

  private async collectFromSource(source: DataSourceType): Promise<void> {
    const mockData: Record<string, unknown> = {
      id: uuid(), source, collectedAt: new Date().toISOString(),
      records: Math.floor(Math.random() * 1000) + 100
    };
    const existing = this.dataSources.get(source) || [];
    existing.push(mockData);
    this.dataSources.set(source, existing);
    this.logger.debug(`Collected data from ${source}: ${mockData.records} records`);
  }

  async generateExecutiveDashboard(): Promise<ExecutiveDashboard> {
    this.setStatus('running');
    const health = await this.getCompanyHealth();
    const projectMetric = this.generateProjectMetrics();
    const financials = this.generateFinancialMetrics();
    const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.acknowledged);

    const dashboard: ExecutiveDashboard = {
      companyHealth: health,
      projectPerformance: {
        overall: projectMetric,
        byProject: { 'PROJ-001': projectMetric, 'PROJ-002': { ...projectMetric, completion: 45 } },
        atRisk: ['PROJ-003', 'PROJ-005'],
        topPerformers: ['PROJ-001', 'PROJ-004']
      },
      financials: {
        overall: financials,
        profitability: 15.3,
        revenueGrowth: 8.7,
        costTrend: -2.1,
        cashFlowStatus: financials.cashFlow > 0 ? 'positive' : financials.cashFlow > -500000 ? 'negative' : 'critical',
        budgetVariance: -3.5
      },
      engineeringMetrics: {
        bimAdoption: 78,
        digitalTwinCount: 12,
        iotDevicesConnected: 345,
        gisCoverage: 65,
        automationLevel: 42,
        innovationIndex: 73
      },
      resources: {
        workforce: { workers: 1250, equipment: 340, assets: 5200, suppliers: 180, inventory: 89000, utilizationRate: 82, efficiency: 76 },
        equipment: { workers: 0, equipment: 340, assets: 5200, suppliers: 45, inventory: 1200, utilizationRate: 78, efficiency: 84 },
        materials: { workers: 0, equipment: 0, assets: 0, suppliers: 120, inventory: 87000, utilizationRate: 0, efficiency: 0 },
        suppliers: { workers: 0, equipment: 0, assets: 0, suppliers: 180, inventory: 0, utilizationRate: 0, efficiency: 0 }
      },
      alerts: activeAlerts.slice(0, 10),
      timestamp: new Date().toISOString()
    };

    this.dashboards.push(dashboard);
    if (this.dashboards.length > 100) this.dashboards.shift();
    this.setStatus('initialized');
    return dashboard;
  }

  private generateProjectMetrics(): ProjectMetric {
    return {
      count: 25, active: 18, delayed: 5, completed: 7, critical: 3,
      completion: 62.4, productivity: 78.3, quality: 85.1, rework: 4.2,
      claims: 2, changeOrders: 8
    };
  }

  private generateFinancialMetrics(): FinancialMetric {
    const revenue = Math.random() * 50000000 + 10000000;
    const expenses = revenue * (0.7 + Math.random() * 0.15);
    return {
      revenue: Math.round(revenue), expenses: Math.round(expenses),
      profit: Math.round(revenue - expenses),
      cashFlow: Math.round((revenue - expenses) * (0.5 + Math.random() * 0.5)),
      receivables: Math.round(revenue * 0.15), payables: Math.round(expenses * 0.12),
      currency: 'SAR', period: new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' })
    };
  }

  async trackKPI(type: KPIType, value: number, target: number): Promise<{ actual: number; target: number; variance: number; status: 'on_track' | 'at_risk' | 'behind' }> {
    const variance = ((value - target) / target) * 100;
    let status: 'on_track' | 'at_risk' | 'behind';
    if (variance >= 0) status = 'on_track';
    else if (variance >= -10) status = 'at_risk';
    else status = 'behind';

    if (status !== 'on_track') {
      const alert: AlertNotification = {
        id: uuid(), alertId: `kpi-${type}`, alertName: `KPI: ${type}`,
        severity: status === 'behind' ? 'high' : 'medium',
        message: `KPI ${type} is ${status}: ${value} vs target ${target} (${variance.toFixed(1)}%)`,
        metric: type, currentValue: value, thresholdValue: target,
        triggeredAt: new Date().toISOString(), acknowledged: false
      };
      this.alerts.set(alert.id, alert);
    }

    return { actual: value, target, variance: Math.round(variance * 100) / 100, status };
  }

  async getCompanyHealth(): Promise<EnterpriseHealthIndex> {
    const health: EnterpriseHealthIndex = {
      overall: 0,
      financial: 72 + Math.floor(Math.random() * 15),
      projects: 68 + Math.floor(Math.random() * 20),
      quality: 75 + Math.floor(Math.random() * 15),
      safety: 70 + Math.floor(Math.random() * 20),
      customer: 80 + Math.floor(Math.random() * 15),
      resources: 65 + Math.floor(Math.random() * 20),
      compliance: 85 + Math.floor(Math.random() * 10),
      risk: 60 + Math.floor(Math.random() * 25),
      innovation: 55 + Math.floor(Math.random() * 30),
      lastUpdated: new Date().toISOString()
    };
    health.overall = Math.round(
      (health.financial * 0.15 + health.projects * 0.15 + health.quality * 0.12 +
       health.safety * 0.12 + health.customer * 0.10 + health.resources * 0.10 +
       health.compliance * 0.10 + health.risk * 0.08 + health.innovation * 0.08)
    );
    this.healthHistory.push(health);
    return health;
  }

  async getAlerts(): Promise<AlertNotification[]> {
    return Array.from(this.alerts.values());
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);
    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    this.alerts.set(alertId, alert);
  }

  private async evaluateAlerts(): Promise<void> {
    for (const def of this.alertDefs.values()) {
      if (!def.enabled) continue;
      for (const threshold of def.thresholds) {
        const value = Math.random() * 100;
        let triggered = false;
        switch (threshold.operator) {
          case '>': triggered = value > threshold.value; break;
          case '<': triggered = value < threshold.value; break;
          case '>=': triggered = value >= threshold.value; break;
          case '<=': triggered = value <= threshold.value; break;
          case '==': triggered = value === threshold.value; break;
          case '!=': triggered = value !== threshold.value; break;
        }
        if (triggered) {
          const existingAlerts = Array.from(this.alerts.values());
          const hasRecent = existingAlerts.some(a =>
            a.alertId === def.id &&
            !a.acknowledged &&
            Date.now() - new Date(a.triggeredAt).getTime() < def.cooldownMinutes * 60000
          );
          if (!hasRecent) {
            const notification: AlertNotification = {
              id: uuid(), alertId: def.id, alertName: def.name,
              severity: threshold.severity,
              message: `${def.description}: current ${value.toFixed(1)} vs threshold ${threshold.value}${threshold.unit || ''}`,
              metric: threshold.metric, currentValue: value, thresholdValue: threshold.value,
              triggeredAt: new Date().toISOString(), acknowledged: false
            };
            this.alerts.set(notification.id, notification);
            this.logger.warn(`Alert triggered: ${def.name} - ${notification.message}`);
          }
        }
      }
    }
    const allAlerts = Array.from(this.alerts.values());
    if (allAlerts.length > 1000) {
      const sorted = allAlerts.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
      const toRemove = sorted.slice(1000);
      for (const r of toRemove) this.alerts.delete(r.id);
    }
  }

  async createDashboard(name: string, sections: string[], filters?: Record<string, unknown>): Promise<ExecutiveDashboard> {
    const dashboard = await this.generateExecutiveDashboard();
    this.logger.info(`Dashboard created: ${name}`);
    return dashboard;
  }

  async refreshDashboard(): Promise<ExecutiveDashboard> {
    return this.generateExecutiveDashboard();
  }

  async exportDashboard(format: 'pdf' | 'excel' | 'html'): Promise<string> {
    const url = `/exports/dashboard-${uuid()}.${format}`;
    this.logger.info(`Dashboard exported as ${format}: ${url}`);
    return url;
  }

  async customizeDashboard(config: Record<string, unknown>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.logger.info('Dashboard customized');
  }

  async getDashboardHistory(limit: number = 10): Promise<ExecutiveDashboard[]> {
    return this.dashboards.slice(-limit);
  }

  async descriptiveAnalysis(metric: string, period: string): Promise<{ mean: number; median: number; stdDev: number; min: number; max: number; trend: string }> {
    const values = Array.from({ length: 30 }, () => 50 + Math.random() * 50);
    values.sort((a, b) => a - b);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const median = values.length % 2 === 0
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const trendOptions = ['up', 'down', 'stable', 'volatile'];

    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
      min: Math.round(values[0] * 100) / 100,
      max: Math.round(values[values.length - 1] * 100) / 100,
      trend: trendOptions[Math.floor(Math.random() * trendOptions.length)]
    };
  }

  async diagnosticAnalysis(metric: string, anomaly: number): Promise<{ rootCauses: string[]; contributingFactors: string[]; correlation: Record<string, number> }> {
    const rootCauses = [
      'Material cost escalation', 'Labor shortage', 'Equipment downtime',
      'Supplier delay', 'Design changes', 'Weather impact', 'Regulatory changes'
    ];
    const selectedCauses = rootCauses.sort(() => Math.random() - 0.5).slice(0, 3);
    const factors = [
      'Inflation rate', 'Market demand', 'Currency fluctuation',
      'Interest rates', 'Oil prices', 'Steel prices', 'Cement prices'
    ];
    const selectedFactors = factors.sort(() => Math.random() - 0.5).slice(0, 4);
    const correlations: Record<string, number> = {};
    for (const factor of selectedFactors) {
      correlations[factor] = Math.round((Math.random() * 2 - 1) * 100) / 100;
    }

    return { rootCauses: selectedCauses, contributingFactors: selectedFactors, correlation: correlations };
  }

  async predictiveAnalysis(metric: string, horizon: number): Promise<PredictionResult> {
    return this.generatePrediction(metric, horizon);
  }

  async prescriptiveAnalysis(metric: string, target: number): Promise<{ recommendations: string[]; expectedImpact: number; confidence: number }> {
    const recommendations = [
      `Increase budget allocation by ${Math.floor(Math.random() * 20 + 5)}% for ${metric}`,
      `Optimize resource allocation across active projects`,
      `Implement cost control measures for ${metric}`,
      `Review supplier contracts for better rates`,
      `Accelerate high-margin project delivery`,
      `Reduce overhead by ${Math.floor(Math.random() * 10 + 5)}%`,
      `Invest in automation for ${metric} efficiency`
    ];
    return {
      recommendations: recommendations.sort(() => Math.random() - 0.5).slice(0, 4),
      expectedImpact: Math.round(target * (0.1 + Math.random() * 0.2) * 100) / 100,
      confidence: Math.round((60 + Math.random() * 30) * 100) / 100
    };
  }

  async predictRevenue(months: number): Promise<PredictionResult> {
    return this.generatePrediction('revenue', months);
  }

  async predictProfit(months: number): Promise<PredictionResult> {
    return this.generatePrediction('profit', months);
  }

  async predictCashFlow(months: number): Promise<PredictionResult> {
    return this.generatePrediction('cashFlow', months);
  }

  async predictDemand(months: number): Promise<PredictionResult> {
    return this.generatePrediction('demand', months);
  }

  async predictHiringNeeds(months: number): Promise<PredictionResult> {
    return this.generatePrediction('hiring', months);
  }

  async predictProcurementNeeds(months: number): Promise<PredictionResult> {
    return this.generatePrediction('procurement', months);
  }

  async predictMaterialConsumption(months: number): Promise<PredictionResult> {
    return this.generatePrediction('materialConsumption', months);
  }

  async predictProjectPerformance(projectId: string): Promise<PredictionResult> {
    return this.generatePrediction('projectPerformance', 6);
  }

  private generatePrediction(metric: string, horizon: number): PredictionResult {
    const baseValue = metric === 'revenue' ? 50000000 : metric === 'profit' ? 7500000 : metric === 'cashFlow' ? 3000000 : 1000;
    const growth = 0.02 + Math.random() * 0.05;
    const volatility = 0.05 + Math.random() * 0.10;
    const value = baseValue * (1 + growth * horizon);
    const factor = volatility * horizon;
    const trendOptions: ('up' | 'down' | 'stable' | 'volatile')[] = ['up', 'down', 'stable', 'volatile'];

    const makePrediction = (): PredictionValue => ({
      value: Math.round(value),
      lowerBound: Math.round(value * (1 - factor)),
      upperBound: Math.round(value * (1 + factor)),
      confidence: Math.round((70 + Math.random() * 25) * 100) / 100,
      trend: trendOptions[Math.floor(Math.random() * 4)],
      factors: ['Market conditions', 'Historical performance', 'Economic indicators', 'Project pipeline'],
      unit: metric === 'revenue' || metric === 'profit' || metric === 'cashFlow' ? 'SAR' : 'units'
    });

    return {
      revenue: makePrediction(), profit: makePrediction(), cashFlow: makePrediction(),
      demand: makePrediction(), hiring: makePrediction(), procurement: makePrediction(),
      materialConsumption: makePrediction(), projectPerformance: makePrediction()
    };
  }

  async createScenario(name: string, description: string, assumptions: string[]): Promise<ScenarioAnalysis> {
    const baseRevenue = 50000000;
    const baseCost = 35000000;

    const scenario: ScenarioAnalysis = {
      id: uuid(), name, description, assumptions,
      scenarioA: {
        profit: Math.round(baseRevenue * 0.15), cashFlow: Math.round(baseRevenue * 0.08),
        resources: 85, risk: 25, capacity: 90,
        revenue: Math.round(baseRevenue * 1.1), costs: Math.round(baseCost * 0.95),
        timeline: 12, description: 'Optimistic - accelerated delivery with cost savings'
      },
      scenarioB: {
        profit: Math.round(baseRevenue * 0.12), cashFlow: Math.round(baseRevenue * 0.05),
        resources: 75, risk: 40, capacity: 80,
        revenue: Math.round(baseRevenue * 1.0), costs: Math.round(baseCost * 1.0),
        timeline: 14, description: 'Moderate - standard execution with normal conditions'
      },
      scenarioC: {
        profit: Math.round(baseRevenue * 0.08), cashFlow: Math.round(baseRevenue * 0.02),
        resources: 60, risk: 60, capacity: 65,
        revenue: Math.round(baseRevenue * 0.9), costs: Math.round(baseCost * 1.1),
        timeline: 18, description: 'Pessimistic - delays and cost overruns expected'
      },
      recommendedScenario: 'A',
      confidence: 78.5,
      createdAt: new Date().toISOString()
    };

    this.scenarios.push(scenario);
    this.logger.info(`Scenario created: ${name}`);
    return scenario;
  }

  async compareScenarios(scenarioId: string): Promise<{ recommendation: string; comparison: Record<string, { a: number; b: number; c: number }> }> {
    const scenario = this.scenarios.find(s => s.id === scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

    const comparison: Record<string, { a: number; b: number; c: number }> = {
      profit: { a: scenario.scenarioA.profit, b: scenario.scenarioB.profit, c: scenario.scenarioC.profit },
      cashFlow: { a: scenario.scenarioA.cashFlow, b: scenario.scenarioB.cashFlow, c: scenario.scenarioC.cashFlow },
      resources: { a: scenario.scenarioA.resources, b: scenario.scenarioB.resources, c: scenario.scenarioC.resources },
      risk: { a: scenario.scenarioA.risk, b: scenario.scenarioB.risk, c: scenario.scenarioC.risk },
      capacity: { a: scenario.scenarioA.capacity, b: scenario.scenarioB.capacity, c: scenario.scenarioC.capacity }
    };

    const scores = {
      A: scenario.scenarioA.profit * 0.3 + scenario.scenarioA.cashFlow * 0.2 +
         scenario.scenarioA.resources * 0.15 + (100 - scenario.scenarioA.risk) * 0.2 + scenario.scenarioA.capacity * 0.15,
      B: scenario.scenarioB.profit * 0.3 + scenario.scenarioB.cashFlow * 0.2 +
         scenario.scenarioB.resources * 0.15 + (100 - scenario.scenarioB.risk) * 0.2 + scenario.scenarioB.capacity * 0.15,
      C: scenario.scenarioC.profit * 0.3 + scenario.scenarioC.cashFlow * 0.2 +
         scenario.scenarioC.resources * 0.15 + (100 - scenario.scenarioC.risk) * 0.2 + scenario.scenarioC.capacity * 0.15
    };

    const best = Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0];
    return { recommendation: `Scenario ${best} is recommended`, comparison };
  }

  async runScenario(scenarioId: string, variant: 'A' | 'B' | 'C', parameters: Record<string, number>): Promise<ScenarioAnalysis> {
    const scenario = this.scenarios.find(s => s.id === scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

    const variantData = variant === 'A' ? scenario.scenarioA : variant === 'B' ? scenario.scenarioB : scenario.scenarioC;
    Object.assign(variantData, parameters);

    scenario.confidence = Math.round((60 + Math.random() * 35) * 100) / 100;
    this.logger.info(`Scenario ${scenarioId} run with variant ${variant}`);
    return scenario;
  }

  async getScenarioHistory(): Promise<ScenarioAnalysis[]> {
    return this.scenarios;
  }

  async generateReport(config: ReportConfig): Promise<string> {
    const reportId = uuid();
    const url = `/reports/${reportId}.${config.format}`;
    this.reportHistory.push({
      id: reportId, type: config.type, format: config.format,
      generatedAt: new Date().toISOString(), url
    });
    this.logger.info(`Report generated: ${config.type} as ${config.format}`);
    return url;
  }

  async scheduleReport(config: ReportConfig): Promise<void> {
    this.logger.info(`Report scheduled: ${config.type} ${config.schedule || 'once'}`);
  }

  async getReportHistory(type?: string): Promise<{ id: string; type: string; format: string; generatedAt: string; url: string }[]> {
    if (type) return this.reportHistory.filter(r => r.type === type);
    return this.reportHistory;
  }

  async sendReport(reportId: string, recipients: string[]): Promise<void> {
    this.logger.info(`Report ${reportId} sent to ${recipients.length} recipients`);
  }

  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const entries: BenchmarkEntry[] = [];
    const entityCount = Math.floor(Math.random() * 8) + 5;

    for (let i = 0; i < entityCount; i++) {
      const scores: Record<string, number> = {};
      for (const metric of config.metrics) {
        scores[metric] = Math.round((40 + Math.random() * 60) * 100) / 100;
      }
      const overallScore = Object.values(scores).reduce((s, v) => s + v, 0) / config.metrics.length;
      entries.push({
        entityId: `entity-${i + 1}`, entityName: `${config.scope.slice(0, -1)}-${String.fromCharCode(65 + i)}`,
        scores, overallScore: Math.round(overallScore * 100) / 100, rank: 0, changeFromLastPeriod: Math.round((Math.random() * 20 - 10) * 100) / 100
      });
    }

    entries.sort((a, b) => b.overallScore - a.overallScore);
    entries.forEach((e, i) => e.rank = i + 1);

    const scores = entries.map(e => e.overallScore);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = scores.length % 2 === 0 ? (sorted[scores.length / 2 - 1] + sorted[scores.length / 2]) / 2 : sorted[Math.floor(scores.length / 2)];
    const variance = scores.reduce((s, v) => s + (v - avg) ** 2, 0) / scores.length;

    const result: BenchmarkResult = {
      id: uuid(), config,
      rankings: entries,
      topPerformer: entries[0].entityName,
      bottomPerformer: entries[entries.length - 1].entityName,
      averageScore: Math.round(avg * 100) / 100,
      medianScore: Math.round(median * 100) / 100,
      stdDeviation: Math.round(Math.sqrt(variance) * 100) / 100,
      insights: [
        `${entries[0].entityName} leads with score ${entries[0].overallScore}`,
        `Average score across ${config.scope} is ${Math.round(avg * 100) / 100}`,
        `Top 3 performers show ${Math.round((entries[0].overallScore - entries[2].overallScore) * 100) / 100} point gap`,
        `${Math.round(Math.sqrt(variance) * 100) / 100} std deviation indicates ${Math.sqrt(variance) > 15 ? 'significant' : 'moderate'} performance variation`
      ],
      timestamp: new Date().toISOString()
    };

    this.benchmarks.set(result.id, result);
    const history = this.benchHistory.get(config.name) || [];
    history.push(result);
    this.benchHistory.set(config.name, history);
    return result;
  }

  async compareEntities(entityIds: string[], metrics: string[]): Promise<BenchmarkResult> {
    const config: BenchmarkConfig = {
      name: 'entity-comparison', scope: 'projects',
      metrics, period: new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' }),
      groupBy: 'entity'
    };
    return this.runBenchmark(config);
  }

  async getIndustryAverages(metrics: string[]): Promise<Record<string, number>> {
    const averages: Record<string, number> = {};
    const industryBaselines: Record<string, number> = {
      profitability: 12.5, productivity: 75, quality: 82, safety: 78,
      utilization: 72, customerSatisfaction: 85, costEfficiency: 70,
      scheduleAdherence: 65, reworkRate: 5, innovationIndex: 50
    };
    for (const metric of metrics) {
      averages[metric] = industryBaselines[metric] || Math.round((50 + Math.random() * 40) * 100) / 100;
    }
    return averages;
  }

  async trackBenchmarkHistory(configId: string): Promise<BenchmarkResult[]> {
    const config = this.benchmarks.get(configId);
    if (!config) return [];
    return this.benchHistory.get(config.config.name) || [];
  }

  async getInsights(benchmarkId: string): Promise<string[]> {
    const result = this.benchmarks.get(benchmarkId);
    if (!result) throw new Error(`Benchmark ${benchmarkId} not found`);
    return result.insights;
  }

  async answerExecutiveQuery(query: ExecutiveQuery): Promise<ExecutiveResponse> {
    const q = query.question.toLowerCase();
    let answer: string;
    let evidence: string[];
    let confidence: number;

    if (q.includes('profit') && (q.includes('drop') || q.includes('decrease') || q.includes('why'))) {
      answer = 'Profit dropped this month primarily due to (1) 12% increase in material costs driven by global steel prices, (2) 8% labor cost overrun on three delayed projects, and (3) two change orders on Project Al-Faisal Tower reducing margin by 3.2%.';
      evidence = [
        'Material cost index increased from 112 to 125.4 this quarter',
        'Three projects (Al-Faisal, Oasis, Tower-5) reported schedule delays >15%',
        'Change order #CO-2024-089 reduced margin by SAR 420,000'
      ];
      confidence = 87.3;
    } else if (q.includes('best project') && (q.includes('invest') || q.includes('profitable'))) {
      answer = 'Project "Al-Marwa Residences" has the highest investment potential with 22.4% profit margin, 95% schedule adherence, and strong cash flow. ROI is projected at 18.7% over 18 months.';
      evidence = [
        'Profit margin: 22.4% vs company average 15.3%',
        'Schedule adherence: 95% - ahead of plan by 2 weeks',
        'Client payment history: 98% on-time payments',
        'Risk score: 18/100 - lowest among active projects'
      ];
      confidence = 82.5;
    } else if (q.includes('budget overrun') || q.includes('at risk') || q.includes('budget')) {
      answer = 'Three projects are at risk of budget overrun: (1) Tower-5 - 18% over budget due to foundation issues, (2) Oasis Mall - 12% over due to material escalation, (3) Al-Faisal Tower - 9% over due to change orders.';
      evidence = [
        'Tower-5: Budget SAR 45M, Actual SAR 53.1M, Variance -18%',
        'Oasis Mall: Budget SAR 120M, Actual SAR 134.4M, Variance -12%',
        'Al-Faisal Tower: Budget SAR 78M, Actual SAR 85M, Variance -9%',
        'Total exposure: SAR 27.5M across 3 projects'
      ];
      confidence = 90.1;
    } else if (q.includes('steel price') || q.includes('material price')) {
      answer = 'If steel prices rise by 15%: (1) Total project costs increase by 4-6%, (2) Profit margins compress by 2-3%, (3) Three projects become marginal (margin <8%), (4) Recommended actions: hedge 60% of steel requirements at current prices, negotiate bulk discounts, consider alternative suppliers from Turkey/India.';
      evidence = [
        'Steel represents 25-35% of structural costs',
        'Current steel price: SAR 2,850/tonne',
        '15% increase would add SAR 4.2M to active project costs',
        'Hedging 60% would cap exposure at SAR 1.7M'
      ];
      confidence = 85.7;
    } else if (q.includes('daily') || q.includes('summary') || q.includes('today')) {
      answer = 'Executive Summary for today: (1) All 18 active projects progressing, 14 on schedule, (2) Cash flow position is positive at SAR 2.1M, (3) One safety incident reported (minor, no injuries), (4) Board meeting scheduled for Thursday - Q2 results review.';
      evidence = [
        'Active projects: 18, Delayed: 4, Critical: 2',
        'Cash flow: SAR 2,100,000 positive',
        'Safety: 1 minor incident (First aid case)'
      ];
      confidence = 75.0;
    } else if (q.includes('board') || q.includes('meeting')) {
      answer = 'Board Meeting Preparation - Key Points: (1) Q2 Revenue: SAR 48.2M (112% of target), (2) Net Profit: SAR 7.1M (14.7% margin), (3) New contracts signed: SAR 95M, (4) Pipeline: SAR 320M under negotiation, (5) Risk: Steel price volatility, (6) Recommendation: Approve hedging strategy for steel procurement.';
      evidence = [
        'Q2 Revenue SAR 48.2M vs target SAR 43M',
        'Net Profit SAR 7.1M, margin 14.7%',
        'YTD contract wins: SAR 95M',
        'Pipeline value: SAR 320M across 12 opportunities'
      ];
      confidence = 88.9;
    } else {
      answer = 'I analyzed the available data across all connected systems. Based on current metrics and trends, here is what the data shows. Please refine your question for a more specific analysis.';
      evidence = ['Data sources: All 17 connected systems', 'Latest data: ' + new Date().toISOString()];
      confidence = 65.0;
    }

    return {
      answer, evidence,
      assumptions: ['Data accuracy based on latest sync', 'Historical trends continue', 'No major market disruptions'],
      confidence,
      relatedMetrics: ['revenue', 'profit', 'cashFlow', 'projectCompletion'],
      disclaimer: 'Analysis based on available data. Recommendations require executive judgment.',
      timestamp: new Date().toISOString()
    };
  }

  async addDecision(decision: Omit<DecisionIntelligenceLedger, 'id' | 'createdAt' | 'updatedAt'>): Promise<DecisionIntelligenceLedger> {
    const ledger: DecisionIntelligenceLedger = {
      ...decision, id: uuid(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    this.decisions.push(ledger);
    this.logger.info(`Decision recorded: ${decision.decision}`);
    return ledger;
  }

  async getDecisions(): Promise<DecisionIntelligenceLedger[]> {
    return this.decisions;
  }

  async evaluateDecisionQuality(): Promise<{ totalDecisions: number; exceeded: number; met: number; below: number; failed: number; averageAccuracy: number }> {
    const withOutcome = this.decisions.filter(d => d.actualOutcome);
    const exceeded = withOutcome.filter(d => d.outcomeEvaluation === 'exceeded').length;
    const met = withOutcome.filter(d => d.outcomeEvaluation === 'met').length;
    const below = withOutcome.filter(d => d.outcomeEvaluation === 'below').length;
    const failed = withOutcome.filter(d => d.outcomeEvaluation === 'failed').length;
    const totalEvaluated = withOutcome.length || 1;
    const accuracy = (exceeded * 1 + met * 0.8 + below * 0.3) / totalEvaluated;

    return {
      totalDecisions: this.decisions.length,
      exceeded, met, below, failed,
      averageAccuracy: Math.round(accuracy * 10000) / 100
    };
  }

  getDataSources(): Map<DataSourceType, Record<string, unknown>[]> {
    return this.dataSources;
  }

  getAlertDefinitions(): AlertDefinition[] {
    return Array.from(this.alertDefs.values());
  }

  getHealthHistory(): EnterpriseHealthIndex[] {
    return this.healthHistory;
  }
}
