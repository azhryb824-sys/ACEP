import { BaseEngine, VirtualBuilding, ProjectFacts, DigitalTwin, TwinState, SimulationScenario, SimulationResult, LifecycleStage, PerformanceMetrics } from '@acep/core';
import { KnowledgeGraph } from '@acep/knowledge-base';

export class DigitalTwinEngine extends BaseEngine {
  private knowledgeGraph: KnowledgeGraph;
  private twin: DigitalTwin | null = null;
  private stateHistory: TwinState[] = [];
  private scenarios: Map<string, SimulationScenario> = new Map();

  constructor(kg: KnowledgeGraph) {
    super('DigitalTwinEngine', '1.0.0');
    this.knowledgeGraph = kg;
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('DigitalTwinEngine initialized');
  }

  async validate(): Promise<boolean> {
    return true;
  }

  async createTwin(building: VirtualBuilding, facts: ProjectFacts): Promise<DigitalTwin> {
    this.setStatus('running');
    this.logger.info('Creating digital twin for project');

    const twin: DigitalTwin = {
      id: `twin-${building.id}`,
      projectId: building.id,
      building,
      facts,
      currentState: this.createInitialState(building, facts),
      lifecycle: this.initializeLifecycle(building),
      performanceMetrics: this.initializeMetrics(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    this.twin = twin;
    this.saveState(twin.currentState);

    this.setStatus('idle');
    return twin;
  }

  async updateTwin(changes: Partial<VirtualBuilding>): Promise<DigitalTwin> {
    if (!this.twin) {
      throw new Error('No twin exists. Call createTwin first.');
    }

    this.setStatus('running');
    this.logger.info('Updating digital twin');

    Object.assign(this.twin.building, changes);
    this.twin.currentState = this.calculateNewState(this.twin);
    this.twin.updatedAt = new Date().toISOString();
    
    this.saveState(this.twin.currentState);

    this.setStatus('idle');
    return this.twin;
  }

  async simulateScenario(scenario: SimulationScenario): Promise<SimulationResult> {
    this.setStatus('running');
    this.logger.info(`Running simulation: ${scenario.name}`);

    if (!this.twin) {
      throw new Error('No twin exists. Call createTwin first.');
    }

    const result: SimulationResult = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      timestamp: new Date().toISOString(),
      impacts: this.calculateImpacts(scenario, this.twin),
      predictions: this.generatePredictions(scenario, this.twin),
      recommendations: this.generateRecommendations(scenario, this.twin),
      confidence: this.calculateScenarioConfidence(scenario)
    };

    this.scenarios.set(scenario.id, scenario);

    this.setStatus('idle');
    return result;
  }

  async predictDelay(activityId: string): Promise<{ probability: number; causes: string[]; mitigation: string[] }> {
    if (!this.twin) {
      throw new Error('No twin exists.');
    }

    const probability = Math.random() * 0.4;
    const causes: string[] = [];
    const mitigation: string[] = [];

    if (probability > 0.2) {
      causes.push('Material shortage risk');
      causes.push('Weather dependency');
      mitigation.push('Pre-order materials');
      mitigation.push('Add buffer time');
    }

    return { probability, causes, mitigation };
  }

  async predictCostOverrun(category: string): Promise<{ probability: number; amount: number; factors: string[] }> {
    if (!this.twin) {
      throw new Error('No twin exists.');
    }

    const probability = Math.random() * 0.3;
    const amount = this.twin.building.skeleton.numFloors * 50000;
    const factors = ['Market inflation', 'Labor availability', 'Supply chain'];

    return { probability, amount, factors };
  }

  async comparePlannedVsActual(): Promise<{ planned: number; actual: number; variance: number; trend: string }> {
    if (!this.twin) {
      throw new Error('No twin exists.');
    }

    const planned = 100;
    const actual = this.twin.currentState.completionPercentage;
    const variance = actual - planned;
    const trend = variance > 0 ? 'Ahead' : variance < 0 ? 'Behind' : 'On Track';

    return { planned, actual, variance, trend };
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    if (!this.twin) {
      throw new Error('No twin exists.');
    }

    return this.twin.performanceMetrics;
  }

  async getLifecycleStatus(): Promise<LifecycleStage[]> {
    if (!this.twin) {
      throw new Error('No twin exists.');
    }

    return this.twin.lifecycle;
  }

  async runMonteCarloSimulation(iterations: number = 1000): Promise<{ meanDuration: number; p50: number; p80: number; p95: number; distribution: number[] }> {
    const durations: number[] = [];
    const baseDuration = 180;

    for (let i = 0; i < iterations; i++) {
      const variance = (Math.random() - 0.5) * 60;
      durations.push(baseDuration + variance);
    }

    durations.sort((a, b) => a - b);

    return {
      meanDuration: durations.reduce((s, d) => s + d, 0) / iterations,
      p50: durations[Math.floor(iterations * 0.5)],
      p80: durations[Math.floor(iterations * 0.8)],
      p95: durations[Math.floor(iterations * 0.95)],
      distribution: durations
    };
  }

  async optimizeResources(): Promise<{ suggestions: string[]; expectedSavings: number }> {
    return {
      suggestions: [
        'Increase labor crew size by 20% for critical activities',
        'Reorder equipment schedule to reduce idle time',
        'Consolidate material deliveries to reduce transport costs'
      ],
      expectedSavings: 0.15
    };
  }

  private createInitialState(building: VirtualBuilding, facts: ProjectFacts): TwinState {
    return {
      timestamp: new Date().toISOString(),
      completionPercentage: 0,
      activeActivities: [],
      completedActivities: [],
      resourceUtilization: {
        labor: 0.7,
        equipment: 0.6,
        materials: 0.8
      },
      qualityScore: 1.0,
      safetyScore: 1.0,
      risks: [],
      issues: []
    };
  }

  private calculateNewState(twin: DigitalTwin): TwinState {
    const previousState = twin.currentState;
    const newState: TwinState = {
      timestamp: new Date().toISOString(),
      completionPercentage: Math.min(previousState.completionPercentage + 0.05, 1),
      activeActivities: previousState.activeActivities,
      completedActivities: previousState.completedActivities,
      resourceUtilization: {
        labor: 0.7 + (Math.random() - 0.5) * 0.2,
        equipment: 0.6 + (Math.random() - 0.5) * 0.2,
        materials: 0.8 + (Math.random() - 0.5) * 0.1
      },
      qualityScore: 0.95 + Math.random() * 0.05,
      safetyScore: 0.98 + Math.random() * 0.02,
      risks: this.detectNewRisks(twin),
      issues: []
    };

    return newState;
  }

  private initializeLifecycle(building: VirtualBuilding): LifecycleStage[] {
    return [
      { stage: 'Concept', status: 'Completed', startDate: new Date().toISOString(), endDate: new Date().toISOString() },
      { stage: 'Design', status: 'Completed', startDate: new Date().toISOString(), endDate: new Date().toISOString() },
      { stage: 'Construction', status: 'InProgress', startDate: new Date().toISOString(), endDate: null },
      { stage: 'Inspection', status: 'Pending', startDate: null, endDate: null },
      { stage: 'Commissioning', status: 'Pending', startDate: null, endDate: null },
      { stage: 'Operation', status: 'Pending', startDate: null, endDate: null }
    ];
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      schedulePerformanceIndex: 1.0,
      costPerformanceIndex: 1.0,
      qualityIndex: 1.0,
      safetyIndex: 1.0,
      productivityIndex: 1.0,
      resourceEfficiency: 0.85
    };
  }

  private calculateImpacts(scenario: SimulationScenario, twin: DigitalTwin): Record<string, number> {
    const impacts: Record<string, number> = {};
    
    for (const change of scenario.changes) {
      if (change.type === 'labor') {
        impacts.duration = (impacts.duration || 0) - (change.value as number) * 0.1;
        impacts.cost = (impacts.cost || 0) + (change.value as number) * 0.05;
      }
      if (change.type === 'material') {
        impacts.cost = (impacts.cost || 0) + (change.value as number) * 0.15;
        impacts.quality = (impacts.quality || 0) + (change.value as number) * 0.05;
      }
    }

    return impacts;
  }

  private generatePredictions(scenario: SimulationScenario, twin: DigitalTwin): Record<string, unknown> {
    return {
      estimatedCompletion: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      finalCost: twin.building.skeleton.numFloors * 500000 * (1 + (scenario.changes.length * 0.1)),
      riskLevel: 'Medium',
      confidence: 0.75
    };
  }

  private generateRecommendations(scenario: SimulationScenario, twin: DigitalTwin): string[] {
    return [
      'Monitor resource utilization closely',
      'Implement quality control checkpoints',
      'Prepare contingency plans for critical path activities'
    ];
  }

  private calculateScenarioConfidence(scenario: SimulationScenario): number {
    return 0.7 + Math.random() * 0.2;
  }

  private detectNewRisks(twin: DigitalTwin): string[] {
    const risks: string[] = [];
    
    if (twin.currentState.resourceUtilization.labor > 0.9) {
      risks.push('High labor utilization - risk of burnout');
    }
    if (twin.currentState.resourceUtilization.materials < 0.5) {
      risks.push('Low material availability - potential delays');
    }

    return risks;
  }

  private saveState(state: TwinState): void {
    this.stateHistory.push({ ...state });
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift();
    }
  }

  getStateHistory(): TwinState[] {
    return [...this.stateHistory];
  }

  getTwin(): DigitalTwin | null {
    return this.twin;
  }
}
