import { BaseEngine, IRiskEngine, ProjectFacts, VirtualBuilding, Risk, RiskCategory, BOQDocument } from '@acep/core';
import { KnowledgeGraph, RulesRegistry, RuleEngine } from '@acep/knowledge-base';

// Extended Risk Card based on Volume 27 specifications
interface RiskCard {
  riskId: string;
  name: string;
  description: string;
  source: string;
  cause: string;
  probability: number;
  impact: number;
  exposure: number;
  confidenceModifier: number;
  riskScore: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  priority: number;
  affectedActivities: string[];
  affectedItems: string[];
  responsible: string;
  responsePlan: ResponseStrategy;
  implementationStatus: 'Not Started' | 'In Progress' | 'Completed' | 'Cancelled';
  reviewDate: Date;
}

interface ResponseStrategy {
  avoid?: string;
  mitigate?: string;
  transfer?: string;
  accept?: string;
  selected: 'Avoid' | 'Mitigate' | 'Transfer' | 'Accept';
  advantages: string[];
  disadvantages: string[];
}

interface DecisionLedger {
  decisionId: string;
  decision: string;
  decisionMaker: string;
  timestamp: Date;
  dataUsed: any[];
  alternatives: string[];
  reasonForSelection: string;
  expectedResults: string[];
  actualResults?: string[];
}

interface Scenario {
  scenarioId: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  impactOnCost: number;
  impactOnSchedule: number;
  impactOnQuality: number;
  impactOnSafety: number;
  confidence: number;
}

export class RiskEngine extends BaseEngine implements IRiskEngine {
  private knowledgeGraph: KnowledgeGraph;
  private rulesRegistry: RulesRegistry;
  private ruleEngine: RuleEngine;
  private riskCards: Map<string, RiskCard> = new Map();
  private decisionLedger: DecisionLedger[] = [];
  private scenarios: Scenario[] = [];

  constructor(kg: KnowledgeGraph, rulesRegistry: RulesRegistry) {
    super('RiskEngine', '2.0.0'); // Updated version for Volume 27
    this.knowledgeGraph = kg;
    this.rulesRegistry = rulesRegistry;
    this.ruleEngine = new RuleEngine(rulesRegistry, kg);
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('RiskEngine v2.0.0 initialized - Volume 27: IRDIE');
  }

  async validate(): Promise<boolean> {
    return true;
  }

  async detectRisks(project: ProjectFacts, building: VirtualBuilding): Promise<Risk[]> {
    this.setStatus('running');
    this.logger.info('Detecting project risks');

    const risks: Risk[] = [];

    risks.push(...this.detectStructuralRisks(project, building));
    risks.push(...this.detectFinancialRisks(project, building));
    risks.push(...this.detectScheduleRisks(project, building));
    risks.push(...this.detectSafetyRisks(project, building));
    risks.push(...this.detectQualityRisks(project, building));
    risks.push(...this.detectExternalRisks(project));

    this.setStatus('idle');
    return risks;
  }

  async analyzeRisk(risk: Risk): Promise<RiskCard> {
    this.logger.info(`Analyzing risk: ${risk.name}`);
    
    // Calculate risk score based on Volume 27 formula
    const exposure = this.calculateExposure(risk);
    const confidenceModifier = this.calculateConfidenceModifier(risk);
    const riskScore = risk.probability * risk.impact * exposure * confidenceModifier;
    
    const riskCard: RiskCard = {
      riskId: risk.id,
      name: risk.name,
      description: risk.description,
      source: risk.detectionMethod,
      cause: risk.cause,
      probability: risk.probability,
      impact: risk.impact,
      exposure,
      confidenceModifier,
      riskScore,
      severity: this.calculateSeverity(riskScore),
      priority: this.calculatePriority(risk, riskScore),
      affectedActivities: risk.affectedActivities,
      affectedItems: [],
      responsible: risk.responsibleParty,
      responsePlan: this.generateResponsePlan(risk),
      implementationStatus: 'Not Started',
      reviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };
    
    this.riskCards.set(risk.id, riskCard);
    return riskCard;
  }

  async calculateRiskScore(risks: Risk[]): Promise<number> {
    if (risks.length === 0) return 0;
    const totalScore = risks.reduce((s, r) => {
      const exposure = this.calculateExposure(r);
      const confidenceModifier = this.calculateConfidenceModifier(r);
      return s + (r.probability * r.impact * exposure * confidenceModifier);
    }, 0);
    const maxPossible = risks.length * 10000; // Max score per risk
    const rawScore = (totalScore / maxPossible) * 100;
    return Math.round(rawScore * 100) / 100;
  }

  async generateMitigation(risk: Risk): Promise<ResponseStrategy> {
    this.logger.info(`Generating comprehensive mitigation for risk: ${risk.name}`);
    return this.generateResponsePlan(risk);
  }

  async monitorRisks(risks: Risk[]): Promise<RiskCard[]> {
    this.logger.info('Monitoring risks for status changes and early warnings');
    
    const monitoredRisks: RiskCard[] = [];
    const earlyWarnings: string[] = [];

    for (const risk of risks) {
      const riskCard = this.riskCards.get(risk.id) || await this.analyzeRisk(risk);
      
      if (riskCard.implementationStatus === 'Not Started') {
        if (riskCard.severity === 'Critical' && Math.random() > 0.4) {
          earlyWarnings.push(`CRITICAL: ${riskCard.name} requires immediate attention`);
        } else if (riskCard.severity === 'High' && Math.random() > 0.6) {
          earlyWarnings.push(`WARNING: ${riskCard.name} is escalating`);
        }
      }
      
      if (risk.status === 'Open' && Math.random() > 0.9) {
        riskCard.implementationStatus = 'Completed';
      }
      
      monitoredRisks.push(riskCard);
    }
    
    if (earlyWarnings.length > 0) {
      this.logger.warn(`Early warnings generated: ${earlyWarnings.join(', ')}`);
    }

    return monitoredRisks;
  }

  // Volume 27: Scenario Simulation Engine
  async runScenario(parameters: Record<string, any>): Promise<Scenario> {
    this.logger.info('Running scenario simulation');
    
    const scenario: Scenario = {
      scenarioId: `SCN-${Date.now()}`,
      name: parameters.name || 'Custom Scenario',
      description: parameters.description || '',
      parameters,
      impactOnCost: this.calculateScenarioImpact(parameters, 'cost'),
      impactOnSchedule: this.calculateScenarioImpact(parameters, 'schedule'),
      impactOnQuality: this.calculateScenarioImpact(parameters, 'quality'),
      impactOnSafety: this.calculateScenarioImpact(parameters, 'safety'),
      confidence: 0.75 + Math.random() * 0.2
    };
    
    this.scenarios.push(scenario);
    return scenario;
  }

  // Volume 27: Predictive Intelligence
  async predictRisks(project: ProjectFacts): Promise<{
    delayProbability: number;
    costIncreaseProbability: number;
    reworkProbability: number;
    claimsProbability: number;
    equipmentFailureProbability: number;
    materialShortageProbability: number;
    confidence: number;
  }> {
    this.logger.info('Running predictive risk analysis');
    
    return {
      delayProbability: this.calculateDelayProbability(project),
      costIncreaseProbability: this.calculateCostIncreaseProbability(project),
      reworkProbability: this.calculateReworkProbability(project),
      claimsProbability: this.calculateClaimsProbability(project),
      equipmentFailureProbability: this.calculateEquipmentFailureProbability(project),
      materialShortageProbability: this.calculateMaterialShortageProbability(project),
      confidence: 0.7 + Math.random() * 0.25
    };
  }

  // Volume 27: Decision Support
  async supportDecision(options: any[]): Promise<{
    recommendation: string;
    analysis: any[];
    comparison: Record<string, any>;
    confidence: number;
  }> {
    this.logger.info('Providing decision support');
    
    const analysis = options.map(opt => ({
      ...opt,
      costImpact: this.estimateCostImpact(opt),
      scheduleImpact: this.estimateScheduleImpact(opt),
      riskImpact: this.estimateRiskImpact(opt),
      qualityImpact: this.estimateQualityImpact(opt)
    }));
    
    const recommendation = analysis.sort((a, b) => {
      const scoreA = a.costImpact + a.scheduleImpact + a.qualityImpact - a.riskImpact;
      const scoreB = b.costImpact + b.scheduleImpact + b.qualityImpact - b.riskImpact;
      return scoreB - scoreA;
    })[0];
    
    return {
      recommendation: recommendation.name || 'Option 1',
      analysis,
      comparison: this.generateComparison(analysis),
      confidence: 0.8
    };
  }

  // Volume 27: Decision Ledger
  async recordDecision(decision: DecisionLedger): Promise<void> {
    this.logger.info(`Recording decision: ${decision.decision}`);
    this.decisionLedger.push(decision);
  }

  async getDecisionLedger(): Promise<DecisionLedger[]> {
    return this.decisionLedger;
  }

  // Volume 27: Risk Dashboard
  async getRiskDashboard(): Promise<{
    topTenRisks: RiskCard[];
    newRisks: RiskCard[];
    closedRisks: RiskCard[];
    escalatingRisks: RiskCard[];
    risksBySpecialty: Record<string, RiskCard[]>;
    risksByLocation: Record<string, RiskCard[]>;
  }> {
    const allRisks = Array.from(this.riskCards.values());
    
    return {
      topTenRisks: allRisks.sort((a, b) => b.riskScore - a.riskScore).slice(0, 10),
      newRisks: allRisks.filter(r => r.implementationStatus === 'Not Started'),
      closedRisks: allRisks.filter(r => r.implementationStatus === 'Completed'),
      escalatingRisks: allRisks.filter(r => r.severity === 'Critical' || r.severity === 'High'),
      risksBySpecialty: this.groupRisksBySpecialty(allRisks),
      risksByLocation: this.groupRisksByLocation(allRisks)
    };
  }

  // Helper methods for Volume 27 specifications
  private calculateExposure(risk: Risk): number {
    // Exposure based on affected activities and cost
    const activityCount = risk.affectedActivities.length || 1;
    const costExposure = (risk.affectedCost || 0) / 100000; // Normalized
    return Math.min(1 + (activityCount * 0.1) + (costExposure * 0.2), 2);
  }

  private calculateConfidenceModifier(risk: Risk): number {
    // Confidence modifier based on data quality and detection method
    const baseConfidence = risk.confidence || 0.7;
    return 0.8 + (baseConfidence * 0.4); // Range 0.8-1.2
  }

  private calculateSeverity(riskScore: number): 'Low' | 'Medium' | 'High' | 'Critical' {
    if (riskScore < 2500) return 'Low';
    if (riskScore < 5000) return 'Medium';
    if (riskScore < 7500) return 'High';
    return 'Critical';
  }

  private calculatePriority(risk: Risk, riskScore: number): number {
    // Priority based on multiple factors per Volume 27
    const impactOnCost = risk.affectedCost || 0;
    const impactOnSchedule = risk.affectedSchedule || 0;
    const preventability = 0.8; // Could be calculated based on mitigation options
    const treatmentCost = impactOnCost * 0.3;
    
    const priorityScore = (
      (impactOnCost / 10000) * 0.3 +
      (impactOnSchedule / 100) * 0.25 +
      preventability * 0.2 +
      (1 - treatmentCost / impactOnCost) * 0.25
    );
    
    return Math.ceil(priorityScore * 10);
  }

  private generateResponsePlan(risk: Risk): ResponseStrategy {
    return {
      avoid: this.getAvoidStrategy(risk),
      mitigate: this.getMitigateStrategy(risk),
      transfer: this.getTransferStrategy(risk),
      accept: this.getAcceptStrategy(risk),
      selected: 'Mitigate',
      advantages: ['Reduces impact', 'Maintains control', 'Cost-effective'],
      disadvantages: ['Requires resources', 'May not eliminate risk', 'Needs monitoring']
    };
  }

  private getAvoidStrategy(risk: Risk): string {
    return `Eliminate the source of ${risk.name} by changing project scope or approach`;
  }

  private getMitigateStrategy(risk: Risk): string {
    return risk.mitigation || 'Implement risk reduction measures and monitoring';
  }

  private getTransferStrategy(risk: Risk): string {
    return `Transfer ${risk.name} to third party through insurance or subcontracting`;
  }

  private getAcceptStrategy(risk: Risk): string {
    return `Accept ${risk.name} as is with contingency plan and monitoring`;
  }

  private calculateScenarioImpact(parameters: Record<string, any>, type: string): number {
    // Simplified scenario impact calculation
    const baseImpact = parameters.baseImpact || 50;
    const multiplier = parameters[type + 'Multiplier'] || 1;
    return baseImpact * multiplier;
  }

  private calculateDelayProbability(project: ProjectFacts): number {
    let probability = 0.3;
    if (project.floors && project.floors > 5) probability += 0.2;
    if (project.hasBasement) probability += 0.15;
    return Math.min(probability, 0.9);
  }

  private calculateCostIncreaseProbability(project: ProjectFacts): number {
    let probability = 0.4;
    if (project.qualityLevel?.level === 'Luxury') probability += 0.25;
    if (project.qualityLevel?.level === 'UltraLuxury') probability += 0.35;
    return Math.min(probability, 0.95);
  }

  private calculateReworkProbability(project: ProjectFacts): number {
    return 0.2 + Math.random() * 0.3;
  }

  private calculateClaimsProbability(project: ProjectFacts): number {
    return 0.15 + Math.random() * 0.25;
  }

  private calculateEquipmentFailureProbability(project: ProjectFacts): number {
    return 0.1 + Math.random() * 0.2;
  }

  private calculateMaterialShortageProbability(project: ProjectFacts): number {
    return 0.2 + Math.random() * 0.3;
  }

  private estimateCostImpact(option: any): number {
    return option.estimatedCost || 50;
  }

  private estimateScheduleImpact(option: any): number {
    return option.estimatedDuration || 30;
  }

  private estimateRiskImpact(option: any): number {
    return option.riskLevel || 20;
  }

  private estimateQualityImpact(option: any): number {
    return option.qualityScore || 70;
  }

  private generateComparison(analysis: any[]): Record<string, any> {
    return {
      costComparison: analysis.map(a => ({ name: a.name, cost: a.costImpact })),
      scheduleComparison: analysis.map(a => ({ name: a.name, schedule: a.scheduleImpact })),
      riskComparison: analysis.map(a => ({ name: a.name, risk: a.riskImpact })),
      qualityComparison: analysis.map(a => ({ name: a.name, quality: a.qualityImpact }))
    };
  }

  private groupRisksBySpecialty(risks: RiskCard[]): Record<string, RiskCard[]> {
    const grouped: Record<string, RiskCard[]> = {};
    risks.forEach(risk => {
      const specialty = risk.name.split(' ')[0] || 'General';
      if (!grouped[specialty]) grouped[specialty] = [];
      grouped[specialty].push(risk);
    });
    return grouped;
  }

  private groupRisksByLocation(risks: RiskCard[]): Record<string, RiskCard[]> {
    const grouped: Record<string, RiskCard[]> = {};
    risks.forEach(risk => {
      const location = risk.affectedActivities[0] || 'Site-wide';
      if (!grouped[location]) grouped[location] = [];
      grouped[location].push(risk);
    });
    return grouped;
  }

  private detectStructuralRisks(project: ProjectFacts, building: VirtualBuilding): Risk[] {
    const risks: Risk[] = [];

    if (project.floors && project.floors > 5) {
      risks.push(this.createRisk(
        'RSK-STR-001', 'High-Rise Structural Risk', RiskCategory.Structural,
        'Buildings over 5 floors require specialized structural design and wind load analysis',
        'Insufficient structural capacity for building height',
        'Design review by structural engineer',
        40, 70, 'Open', 'All structural activities'
      ));
    }

    if (project.hasBasement) {
      risks.push(this.createRisk(
        'RSK-STR-002', 'Basement Water Ingress', RiskCategory.Structural,
        'Basement construction carries risk of water ingress and soil pressure issues',
        'High groundwater table or inadequate waterproofing',
        'Groundwater monitoring and dewatering plan',
        35, 60, 'Open', 'Basement construction'
      ));
    }

    if (project.landArea && project.builtArea) {
      const ratio = project.builtArea.value / project.landArea.value;
      if (ratio > 0.7) {
        risks.push(this.createRisk(
          'RSK-STR-003', 'High Density Construction', RiskCategory.Structural,
          'High land utilization ratio may cause construction access and logistics issues',
          'Limited site area for material storage and equipment movement',
          'Detailed logistics planning and just-in-time delivery',
          30, 40, 'Open', 'All construction activities'
        ));
      }
    }

    return risks;
  }

  private detectFinancialRisks(project: ProjectFacts, building: VirtualBuilding): Risk[] {
    const risks: Risk[] = [];

    if (project.qualityLevel && (project.qualityLevel.level === 'Luxury' || project.qualityLevel.level === 'UltraLuxury')) {
      risks.push(this.createRisk(
        'RSK-FIN-001', 'Budget Overrun for Luxury Finishes', RiskCategory.Financial,
        'Luxury finishes significantly increase material costs and require specialized labor',
        'Underestimated cost of imported materials and skilled labor',
        'Obtain firm quotes from suppliers before committing',
        50, 65, 'Open', 'Finishing activities'
      ));
    }

    risks.push(this.createRisk(
      'RSK-FIN-002', 'Material Price Escalation', RiskCategory.Financial,
      'Construction material prices are subject to market fluctuations',
      'Global supply chain disruptions or local demand spikes',
      'Include price escalation clause in contracts and bulk purchase agreements',
      55, 50, 'Open', 'Procurement'
    ));

    risks.push(this.createRisk(
      'RSK-FIN-003', 'Cash Flow Constraints', RiskCategory.CashFlow,
      'Project may face cash flow issues if payment milestones are not aligned with expenses',
      'Delayed client payments or unexpected cost overruns',
      'Staged payment milestones with clear deliverables',
      45, 55, 'Open', 'All activities'
    ));

    return risks;
  }

  private detectScheduleRisks(project: ProjectFacts, building: VirtualBuilding): Risk[] {
    const risks: Risk[] = [];

    if (project.floors && project.floors > 3) {
      risks.push(this.createRisk(
        'RSK-SCH-001', 'Vertical Construction Delays', RiskCategory.Schedule,
        'Multi-floor construction increases schedule risk due to vertical logistics',
        'Crane availability, concrete curing time, and sequential dependencies',
        'Use climbing formwork and optimize floor cycle times',
        40, 50, 'Open', 'Structural activities'
      ));
    }

    risks.push(this.createRisk(
      'RSK-SCH-002', 'Permit and Approval Delays', RiskCategory.Permit,
      'Government permits and approvals may take longer than anticipated',
      'Incomplete documentation or regulatory changes',
      'Start permit process early and use expediting services',
      35, 45, 'Open', 'Pre-construction'
    ));

    risks.push(this.createRisk(
      'RSK-SCH-003', 'Weather-Related Delays', RiskCategory.Schedule,
      'Adverse weather conditions can halt construction activities',
      'Extreme heat, rain, or sandstorms depending on location',
      'Include weather contingency days in schedule',
      30, 40, 'Open', 'All outdoor activities'
    ));

    return risks;
  }

  private detectSafetyRisks(project: ProjectFacts, building: VirtualBuilding): Risk[] {
    const risks: Risk[] = [];

    if (project.floors && project.floors > 3) {
      risks.push(this.createRisk(
        'RSK-SAF-001', 'Fall from Height', RiskCategory.Safety,
        'Work at height on multi-story buildings presents fall hazards',
        'Inadequate scaffolding, guardrails, or safety harness use',
        'Comprehensive fall protection plan and regular safety inspections',
        60, 80, 'Open', 'All elevated work'
      ));
    }

    risks.push(this.createRisk(
      'RSK-SAF-002', 'Heavy Equipment Operation', RiskCategory.Safety,
        'Operation of cranes, excavators, and other heavy equipment poses accident risks',
        'Operator error, equipment failure, or poor communication',
        'Certified operators only, clear signaling protocols, and equipment maintenance',
        40, 65, 'Open', 'Equipment operation activities'
    ));

    return risks;
  }

  private detectQualityRisks(project: ProjectFacts, building: VirtualBuilding): Risk[] {
    const risks: Risk[] = [];

    if (project.qualityLevel && (project.qualityLevel.level === 'Luxury' || project.qualityLevel.level === 'Premium')) {
      risks.push(this.createRisk(
        'RSK-QTY-001', 'High Quality Standards Risk', RiskCategory.Quality,
        'High finishing standards require strict quality control and skilled workmanship',
        'Inadequate skilled labor or insufficient quality checks',
        'Dedicated quality inspector and sample approvals before mass work',
        45, 55, 'Open', 'Finishing activities'
      ));
    }

    risks.push(this.createRisk(
      'RSK-QTY-002', 'Material Quality Variance', RiskCategory.Quality,
        'Construction materials may not meet specified quality standards',
        'Substandard materials from suppliers or storage damage',
        'Material testing and inspection at delivery',
        35, 45, 'Open', 'Procurement and delivery'
    ));

    return risks;
  }

  private detectExternalRisks(project: ProjectFacts): Risk[] {
    const risks: Risk[] = [];

    risks.push(this.createRisk(
      'RSK-EXT-001', 'Regulatory Changes', RiskCategory.Legal,
      'Building codes and regulations may change during project execution',
      'Government policy changes or new environmental requirements',
      'Monitor regulatory updates and include compliance contingency',
      20, 50, 'Open', 'Design and construction'
    ));

    risks.push(this.createRisk(
      'RSK-EXT-002', 'Supply Chain Disruption', RiskCategory.Material,
      'Material availability may be affected by global or local supply chain issues',
      'Manufacturing delays, transport disruptions, or market shortages',
      'Identify alternative suppliers and maintain safety stock',
      30, 55, 'Open', 'Procurement'
    ));

    return risks;
  }

  private createRisk(
    id: string, name: string, category: RiskCategory, description: string,
    cause: string, mitigation: string, probability: number, impact: number,
    status: string, affected: string
  ): Risk {
    const severity = probability * impact / 100;
    return {
      id, name, category, description, cause,
      trigger: '',
      probability, impact, severity,
      priority: severity > 50 ? 1 : severity > 25 ? 2 : 3,
      detectionMethod: 'Expert analysis and historical data',
      mitigation,
      contingencyPlan: `Execute "${mitigation}" immediately upon risk occurrence`,
      responsibleParty: 'Project Manager',
      affectedActivities: affected ? [affected] : [],
      affectedCost: impact * 1000,
      affectedSchedule: Math.ceil(impact / 10),
      confidence: 0.7,
      status,
      lifecycle: 'Construction',
      version: '1.0.0'
    };
  }

  private getMitigationStrategies(category: RiskCategory): string[] {
    const strategies: Record<string, string[]> = {
      [RiskCategory.Structural]: ['Engage structural engineering consultant for peer review', 'Implement additional structural monitoring', 'Use higher factor of safety in design'],
      [RiskCategory.Financial]: ['Maintain 15% contingency fund', 'Secure fixed-price contracts with suppliers', 'Implement monthly cost tracking and forecasting'],
      [RiskCategory.CashFlow]: ['Negotiate progressive payment terms', 'Establish credit line with bank', 'Accelerate billing cycles'],
      [RiskCategory.Schedule]: ['Add 10% schedule contingency', 'Identify and monitor critical path activities', 'Use fast-tracking for parallel activities'],
      [RiskCategory.Safety]: ['Conduct daily safety briefings', 'Provide full PPE and enforce usage', 'Assign dedicated safety officer'],
      [RiskCategory.Quality]: ['Implement quality control checklist', 'Conduct regular inspections and testing', 'Use approved material samples'],
      [RiskCategory.Material]: ['Identify alternative suppliers for all key materials', 'Order long-lead items early', 'Maintain buffer stock'],
      [RiskCategory.Legal]: ['Regular legal compliance review', 'Maintain updated permit documentation', 'Engage legal counsel for contract review'],
      [RiskCategory.Environmental]: ['Implement environmental management plan', 'Conduct environmental impact assessment', 'Prepare spill response procedures'],
      [RiskCategory.Labor]: ['Cross-train workers for critical skills', 'Maintain relationships with multiple labor suppliers', 'Offer retention bonuses']
    };

    return strategies[category] || ['Monitor and review regularly', 'Document and report immediately', 'Escalate to project sponsor if threshold exceeded'];
  }

  // Volume 27: Early Warning System
  async checkEarlyWarnings(project: ProjectFacts): Promise<string[]> {
    const warnings: string[] = [];
    
    // Check for material shortage risks
    warnings.push(...await this.checkMaterialWarnings());
    
    // Check for supplier delay risks
    warnings.push(...await this.checkSupplierWarnings());
    
    // Check for critical activity delays
    warnings.push(...await this.checkActivityWarnings(project));
    
    // Check for abnormal material consumption
    warnings.push(...await this.checkConsumptionWarnings());
    
    return warnings;
  }

  private async checkMaterialWarnings(): Promise<string[]> {
    const warnings: string[] = [];
    // Simulated material checks
    if (Math.random() > 0.8) {
      warnings.push('Concrete stock may run out within 3 days');
    }
    if (Math.random() > 0.85) {
      warnings.push('Steel reinforcement shortage expected in 5 days');
    }
    return warnings;
  }

  private async checkSupplierWarnings(): Promise<string[]> {
    const warnings: string[] = [];
    if (Math.random() > 0.9) {
      warnings.push('Main supplier delay probability increased to 60%');
    }
    return warnings;
  }

  private async checkActivityWarnings(project: ProjectFacts): Promise<string[]> {
    const warnings: string[] = [];
    if (project.floors && project.floors > 3 && Math.random() > 0.85) {
      warnings.push('Critical structural activity threatened by delay');
    }
    return warnings;
  }

  private async checkConsumptionWarnings(): Promise<string[]> {
    const warnings: string[] = [];
    if (Math.random() > 0.9) {
      warnings.push('Abnormal increase in cement consumption detected');
    }
    return warnings;
  }

  // Volume 27: Learning from Project Completion
  async learnFromProject(expectedRisks: RiskCard[], actualRisks: Risk[]): Promise<{
    lessonsLearned: string[];
    effectiveness: Record<string, number>;
    recommendations: string[];
  }> {
    this.logger.info('Analyzing project risk performance for learning');
    
    const lessonsLearned: string[] = [];
    const effectiveness: Record<string, number> = {};
    const recommendations: string[] = [];
    
    // Compare expected vs actual
    expectedRisks.forEach(expected => {
      const actual = actualRisks.find(r => r.id === expected.riskId);
      if (actual) {
        const effectivenessScore = this.calculateMitigationEffectiveness(expected, actual);
        effectiveness[expected.riskId] = effectivenessScore;
        
        if (effectivenessScore > 0.8) {
          lessonsLearned.push(`Mitigation for ${expected.name} was highly effective`);
        } else if (effectivenessScore < 0.5) {
          lessonsLearned.push(`Mitigation for ${expected.name} needs improvement`);
          recommendations.push(`Review and update mitigation strategy for ${expected.name}`);
        }
      }
    });
    
    return { lessonsLearned, effectiveness, recommendations };
  }

  private calculateMitigationEffectiveness(expected: RiskCard, actual: Risk): number {
    // Simplified effectiveness calculation
    const expectedSeverity = expected.riskScore;
    const actualSeverity = actual.severity;
    return 1 - (actualSeverity / expectedSeverity);
  }
}
