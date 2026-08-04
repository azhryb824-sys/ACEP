import { VirtualBuilding, ProjectFacts, BOQDocument, ScheduleActivity, CostBreakdown, DigitalTwin, ReasoningTrace } from './types';
import { KnowledgeGraph } from '@acep/knowledge-base';

export interface EngineIntegrationConfig {
  enableReasoning: boolean;
  enableBOQGeneration: boolean;
  enableQuantityCalculation: boolean;
  enableCostEstimation: boolean;
  enableScheduleGeneration: boolean;
  enableDigitalTwin: boolean;
  selectedCountry: string;
  selectedCodes: string[];
}

export interface ProjectAnalysisResult {
  projectId: string;
  facts: ProjectFacts;
  building: VirtualBuilding;
  boq: BOQDocument;
  cost: CostBreakdown;
  schedule: ScheduleActivity[];
  twin?: DigitalTwin;
  reasoning: ReasoningTrace[];
  metadata: {
    timestamp: string;
    duration: number;
    enginesUsed: string[];
    confidence: number;
  };
}

export class IntegrationLayer {
  private knowledgeGraph: KnowledgeGraph;
  private config: EngineIntegrationConfig;
  private engines: Map<string, any> = new Map();

  constructor(knowledgeGraph: KnowledgeGraph, config?: Partial<EngineIntegrationConfig>) {
    this.knowledgeGraph = knowledgeGraph;
    this.config = {
      enableReasoning: true,
      enableBOQGeneration: true,
      enableQuantityCalculation: true,
      enableCostEstimation: true,
      enableScheduleGeneration: true,
      enableDigitalTwin: true,
      selectedCountry: 'Saudi Arabia',
      selectedCodes: [],
      ...config
    };
  }

  registerEngine(name: string, engine: any): void {
    this.engines.set(name, engine);
  }

  getEngine(name: string): any {
    return this.engines.get(name);
  }

  async analyzeProject(description: string, additionalFacts?: Partial<ProjectFacts>): Promise<ProjectAnalysisResult> {
    const startTime = Date.now();
    const enginesUsed: string[] = [];

    try {
      const projectUnderstanding = this.getEngine('ProjectUnderstandingEngine');
      if (!projectUnderstanding) {
        throw new Error('ProjectUnderstandingEngine not registered');
      }

      const facts = await projectUnderstanding.understand(description, additionalFacts);
      enginesUsed.push('ProjectUnderstandingEngine');

      const building = await this.generateVirtualBuilding(facts);
      enginesUsed.push('VirtualBuildingEngine');

      const reasoning = await this.runReasoning(facts);
      if (this.config.enableReasoning) {
        enginesUsed.push('ReasoningEngine');
      }

      const boq = await this.generateBOQ(building);
      if (this.config.enableBOQGeneration) {
        enginesUsed.push('BOQEngine');
      }

      const updatedBOQ = await this.calculateQuantities(building, boq);
      if (this.config.enableQuantityCalculation) {
        enginesUsed.push('QuantityEngine');
      }

      const cost = await this.calculateCost(updatedBOQ);
      if (this.config.enableCostEstimation) {
        enginesUsed.push('CostEngine');
      }

      const schedule = await this.generateSchedule(updatedBOQ);
      if (this.config.enableScheduleGeneration) {
        enginesUsed.push('ScheduleEngine');
      }

      let twin: DigitalTwin | undefined;
      if (this.config.enableDigitalTwin) {
        twin = await this.createDigitalTwin(building, facts);
        enginesUsed.push('DigitalTwinEngine');
      }

      const duration = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(updatedBOQ, cost, schedule);

      return {
        projectId: building.id,
        facts,
        building,
        boq: updatedBOQ,
        cost,
        schedule,
        twin,
        reasoning,
        metadata: {
          timestamp: new Date().toISOString(),
          duration,
          enginesUsed,
          confidence
        }
      };
    } catch (error) {
      throw new Error(`Project analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateVirtualBuilding(facts: ProjectFacts): Promise<VirtualBuilding> {
    const engine = this.getEngine('VirtualBuildingEngine');
    if (!engine) {
      throw new Error('VirtualBuildingEngine not registered');
    }
    return await engine.build(facts);
  }

  async runReasoning(facts: ProjectFacts): Promise<ReasoningTrace[]> {
    if (!this.config.enableReasoning) return [];
    
    const engine = this.getEngine('ReasoningEngine');
    if (!engine) {
      throw new Error('ReasoningEngine not registered');
    }
    return await engine.reason(facts, this.knowledgeGraph);
  }

  async generateBOQ(building: VirtualBuilding): Promise<BOQDocument> {
    if (!this.config.enableBOQGeneration) {
      throw new Error('BOQ generation is disabled');
    }

    const engine = this.getEngine('BOQEngine');
    if (!engine) {
      throw new Error('BOQEngine not registered');
    }
    return await engine.generateBOQ(building);
  }

  async calculateQuantities(building: VirtualBuilding, boq: BOQDocument): Promise<BOQDocument> {
    if (!this.config.enableQuantityCalculation) return boq;

    const engine = this.getEngine('QuantityEngine');
    if (!engine) {
      throw new Error('QuantityEngine not registered');
    }
    return await engine.calculate(building, boq);
  }

  async calculateCost(boq: BOQDocument): Promise<CostBreakdown> {
    if (!this.config.enableCostEstimation) {
      throw new Error('Cost estimation is disabled');
    }

    const engine = this.getEngine('CostEngine');
    if (!engine) {
      throw new Error('CostEngine not registered');
    }
    return await engine.calculateCost(boq);
  }

  async generateSchedule(boq: BOQDocument): Promise<ScheduleActivity[]> {
    if (!this.config.enableScheduleGeneration) {
      throw new Error('Schedule generation is disabled');
    }

    const engine = this.getEngine('ScheduleEngine');
    if (!engine) {
      throw new Error('ScheduleEngine not registered');
    }

    const laborEngine = this.getEngine('LaborEngine');
    const equipmentEngine = this.getEngine('EquipmentEngine');

    const labor = laborEngine ? await laborEngine.estimate(boq) : [];
    const equipment = equipmentEngine ? await equipmentEngine.estimate(boq) : [];

    return await engine.generateSchedule(boq, labor, equipment);
  }

  async createDigitalTwin(building: VirtualBuilding, facts: ProjectFacts): Promise<DigitalTwin> {
    if (!this.config.enableDigitalTwin) {
      throw new Error('Digital twin is disabled');
    }

    const engine = this.getEngine('DigitalTwinEngine');
    if (!engine) {
      throw new Error('DigitalTwinEngine not registered');
    }
    return await engine.createTwin(building, facts);
  }

  async updateProject(projectId: string, changes: Partial<ProjectFacts>): Promise<ProjectAnalysisResult> {
    const twinEngine = this.getEngine('DigitalTwinEngine');
    if (!twinEngine) {
      throw new Error('DigitalTwinEngine not registered');
    }

    const twin = twinEngine.getTwin();
    if (!twin || twin.projectId !== projectId) {
      throw new Error('Project twin not found');
    }

    const updatedFacts = { ...twin.facts, ...changes };
    const updatedBuilding = await twinEngine.updateTwin(changes);

    return await this.analyzeProjectFromState(updatedFacts, updatedBuilding);
  }

  async analyzeProjectFromState(facts: ProjectFacts, building: VirtualBuilding): Promise<ProjectAnalysisResult> {
    const startTime = Date.now();
    const enginesUsed: string[] = [];

    const reasoning = await this.runReasoning(facts);
    if (this.config.enableReasoning) enginesUsed.push('ReasoningEngine');

    const boq = await this.generateBOQ(building);
    if (this.config.enableBOQGeneration) enginesUsed.push('BOQEngine');

    const updatedBOQ = await this.calculateQuantities(building, boq);
    if (this.config.enableQuantityCalculation) enginesUsed.push('QuantityEngine');

    const cost = await this.calculateCost(updatedBOQ);
    if (this.config.enableCostEstimation) enginesUsed.push('CostEngine');

    const schedule = await this.generateSchedule(updatedBOQ);
    if (this.config.enableScheduleGeneration) enginesUsed.push('ScheduleEngine');

    const duration = Date.now() - startTime;
    const confidence = this.calculateOverallConfidence(updatedBOQ, cost, schedule);

    return {
      projectId: building.id,
      facts,
      building,
      boq: updatedBOQ,
      cost,
      schedule,
      twin: this.getEngine('DigitalTwinEngine')?.getTwin(),
      reasoning,
      metadata: {
        timestamp: new Date().toISOString(),
        duration,
        enginesUsed,
        confidence
      }
    };
  }

  async runSimulation(scenario: any): Promise<any> {
    const twinEngine = this.getEngine('DigitalTwinEngine');
    if (!twinEngine) {
      throw new Error('DigitalTwinEngine not registered');
    }
    return await twinEngine.simulateScenario(scenario);
  }

  async validateProject(projectId: string): Promise<{ valid: boolean; issues: string[]; warnings: string[] }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    const reasoningEngine = this.getEngine('ReasoningEngine');
    if (reasoningEngine) {
      const twinEngine = this.getEngine('DigitalTwinEngine');
      const twin = twinEngine?.getTwin();
      if (twin && twin.projectId === projectId) {
        const errors = await reasoningEngine.detectLogicalErrors(twin.facts);
        for (const error of errors as any[]) {
          if (error.severity === 'high') {
            issues.push(error.message);
          } else {
            warnings.push(error.message);
          }
        }
      }
    }

    return { valid: issues.length === 0, issues, warnings };
  }

  private calculateOverallConfidence(boq: BOQDocument, cost: CostBreakdown, schedule: ScheduleActivity[]): number {
    const boqConfidence = boq.summary.confidence;
    const costConfidence = cost.confidence;
    const scheduleConfidence = schedule.length > 0 ? 0.85 : 0.5;

    return (boqConfidence * 0.4 + costConfidence * 0.3 + scheduleConfidence * 0.3);
  }

  updateConfig(config: Partial<EngineIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): EngineIntegrationConfig {
    return { ...this.config };
  }

  getEngineStatus(): Record<string, { registered: boolean; status: string }> {
    const status: Record<string, { registered: boolean; status: string }> = {};
    
    const engineNames = [
      'ProjectUnderstandingEngine',
      'VirtualBuildingEngine',
      'ReasoningEngine',
      'BOQEngine',
      'QuantityEngine',
      'CostEngine',
      'ScheduleEngine',
      'DigitalTwinEngine',
      'LaborEngine',
      'EquipmentEngine'
    ];

    for (const name of engineNames) {
      const engine = this.engines.get(name);
      status[name] = {
        registered: !!engine,
        status: engine ? engine.getStatus?.() || 'unknown' : 'not registered'
      };
    }

    return status;
  }
}
