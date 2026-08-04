export interface SimulationModel {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  constraints: string[];
  createdAt: string;
}

export interface ScenarioResult {
  scenarioId: string;
  name: string;
  metrics: Record<string, number>;
  duration: number;
  resources: Record<string, number>;
  cost: number;
  risks: string[];
}

export interface SimulationReport {
  id: string;
  simulationId: string;
  scenarios: ScenarioResult[];
  recommendations: string[];
  generatedAt: string;
}

export class SimulationService {
  private initialized = false;
  private simulations: Map<string, SimulationModel> = new Map();
  private results: Map<string, ScenarioResult[]> = new Map();

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async runSimulation(model: SimulationModel, scenarios: Array<{ name: string; params: Record<string, unknown> }>): Promise<ScenarioResult[]> {
    const results: ScenarioResult[] = scenarios.map((s, i) => ({
      scenarioId: `${model.id}-scenario-${i}`,
      name: s.name,
      metrics: { duration: Math.random() * 365, costEfficiency: Math.random(), quality: Math.random() },
      duration: Math.random() * 365,
      resources: { labor: Math.floor(Math.random() * 100), equipment: Math.floor(Math.random() * 20) },
      cost: Math.random() * 10000000,
      risks: ['Material delay', 'Labor shortage']
    }));

    this.results.set(model.id, results);
    return results;
  }

  async compareScenarios(results: ScenarioResult[]): Promise<Array<{ scenario: string; rank: number; score: number; pros: string[]; cons: string[] }>> {
    return results.map((r, i) => ({
      scenario: r.name,
      rank: i + 1,
      score: r.metrics.costEfficiency || 0.5,
      pros: ['Lower cost', 'Faster execution'],
      cons: ['Higher risk', 'Resource intensive']
    }));
  }

  async generateReport(simulationId: string): Promise<SimulationReport> {
    const scenarios = this.results.get(simulationId) || [];
    return {
      id: `report-${Date.now()}`,
      simulationId,
      scenarios,
      recommendations: ['Use precast concrete for faster construction', 'Consider steel frame for longer spans'],
      generatedAt: new Date().toISOString()
    };
  }

  isInitialized(): boolean { return this.initialized; }
}
