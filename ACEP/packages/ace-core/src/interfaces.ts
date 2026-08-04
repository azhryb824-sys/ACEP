import {
  ProjectFacts, VirtualBuilding, BOQDocument, Question,
  DecisionRecord, Risk, ScheduleActivity, LaborRequirement,
  Crew, EquipmentRequirement, CostBreakdown, ReasoningTrace
} from './types';

export interface IEngine {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  initialize(): Promise<void>;
  validate(): Promise<boolean>;
  getStatus(): EngineStatus;
}

export interface EngineStatus {
  id: string;
  name: string;
  version: string;
  status: 'initialized' | 'running' | 'error' | 'idle';
  lastRun?: string;
  error?: string;
}

export interface IProjectUnderstandingEngine extends IEngine {
  understand(description: string): Promise<ProjectFacts>;
  extractEntities(text: string): Promise<Record<string, unknown>>;
  detectConflicts(facts: ProjectFacts): Promise<void>;
}

export interface IQuestionEngine extends IEngine {
  generateQuestions(facts: ProjectFacts): Promise<Question[]>;
  rankQuestions(questions: Question[]): Question[];
  selectBestQuestion(questions: Question[]): Question | null;
  processAnswer(question: Question, answer: string): Promise<void>;
}

export interface IReasoningEngine extends IEngine {
  reason(facts: ProjectFacts, knowledge: unknown): Promise<ReasoningTrace[]>;
  buildReasoningTree(facts: ProjectFacts): Promise<unknown>;
  detectLogicalErrors(facts: ProjectFacts): Promise<unknown[]>;
  suggestAlternatives(context: unknown): Promise<unknown[]>;
}

export interface IVirtualBuildingEngine extends IEngine {
  build(facts: ProjectFacts): Promise<VirtualBuilding>;
  updateBuilding(building: VirtualBuilding, changes: Partial<ProjectFacts>): Promise<VirtualBuilding>;
  generateSpaces(facts: ProjectFacts): Promise<unknown>;
  generateStructure(building: VirtualBuilding): Promise<unknown>;
  generateArchitecture(building: VirtualBuilding): Promise<unknown>;
  generateMEP(building: VirtualBuilding): Promise<unknown>;
  generateOutdoor(building: VirtualBuilding): Promise<unknown>;
}

export interface IBOQEngine extends IEngine {
  generateBOQ(building: VirtualBuilding): Promise<BOQDocument>;
  getTemplateForSpace(spaceType: string): Promise<unknown>;
  mergeSimilarItems(items: unknown[]): Promise<unknown[]>;
  validateDependencies(items: unknown[]): Promise<unknown[]>;
  detectMissingItems(items: unknown[]): Promise<unknown[]>;
}

export interface IQuantityEngine extends IEngine {
  calculate(building: VirtualBuilding, boq: BOQDocument): Promise<BOQDocument>;
  calculateByFormula(item: unknown, building: VirtualBuilding): Promise<number>;
  getCalculationTrace(itemId: string): Promise<unknown>;
  detectOutliers(quantities: unknown[]): Promise<unknown[]>;
  validateQuantities(boq: BOQDocument): Promise<unknown[]>;
}

export interface ICostEngine extends IEngine {
  calculateCost(boq: BOQDocument): Promise<CostBreakdown>;
  getPrice(materialId: string, location: string): Promise<number>;
  compareSuppliers(materialId: string): Promise<unknown[]>;
  sensitivityAnalysis(cost: CostBreakdown): Promise<unknown>;
  generateScenarios(boq: BOQDocument): Promise<unknown[]>;
}

export interface ILaborEngine extends IEngine {
  calculateLabor(boq: BOQDocument): Promise<LaborRequirement[]>;
  buildCrews(requirements: LaborRequirement[]): Promise<Crew[]>;
  optimizeCrews(crews: Crew[]): Promise<Crew[]>;
  getProductivity(trade: string): Promise<number>;
  calculateLaborCost(requirements: LaborRequirement[]): Promise<number>;
}

export interface IEquipmentEngine extends IEngine {
  determineEquipment(boq: BOQDocument): Promise<EquipmentRequirement[]>;
  selectEquipment(activity: unknown, constraints: unknown): Promise<unknown>;
  calculateUtilization(equipment: EquipmentRequirement[]): Promise<number>;
  compareOptions(equipmentId: string): Promise<unknown[]>;
  scheduleEquipment(requirements: EquipmentRequirement[]): Promise<EquipmentRequirement[]>;
}

export interface IConstructionMethodEngine extends IEngine {
  getMethods(activity: string): Promise<unknown[]>;
  evaluateMethods(methods: unknown[], constraints: unknown): Promise<unknown[]>;
  compareMethods(methods: unknown[]): Promise<unknown>;
  selectMethod(methods: unknown[], preferences: unknown): Promise<unknown>;
}

export interface IScheduleEngine extends IEngine {
  generateSchedule(boq: BOQDocument, labor: LaborRequirement[], equipment: EquipmentRequirement[]): Promise<ScheduleActivity[]>;
  calculateDuration(quantity: number, productivity: number): Promise<number>;
  buildNetwork(activities: ScheduleActivity[]): Promise<ScheduleActivity[]>;
  detectConflicts(activities: ScheduleActivity[]): Promise<unknown[]>;
  optimizeSchedule(activities: ScheduleActivity[], constraints: unknown): Promise<ScheduleActivity[]>;
}

export interface IRiskEngine extends IEngine {
  detectRisks(project: ProjectFacts, building: VirtualBuilding): Promise<Risk[]>;
  analyzeRisk(risk: Risk): Promise<Risk>;
  calculateRiskScore(risks: Risk[]): Promise<number>;
  generateMitigation(risk: Risk): Promise<string[]>;
  monitorRisks(risks: Risk[]): Promise<Risk[]>;
}

export interface IKnowledgeEngine {
  query(entity: string): Promise<unknown>;
  getRelations(entity: string): Promise<unknown[]>;
  addKnowledge(data: unknown): Promise<void>;
  validateKnowledge(data: unknown): Promise<boolean>;
  getVersion(): Promise<string>;
}

export interface IAgent {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  process(input: unknown): Promise<unknown>;
  canHandle(input: unknown): boolean;
  getCapabilities(): string[];
}

export interface IEngineeringBrain {
  orchestrate(projectId: string, input: unknown): Promise<unknown>;
  determineAgent(input: unknown): IAgent;
  runPipeline(projectId: string, pipeline: string[]): Promise<unknown>;
  handleChange(projectId: string, changes: unknown): Promise<void>;
}

export interface IPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: string;
  initialize(): Promise<void>;
  execute(input: unknown): Promise<unknown>;
  validate(): Promise<boolean>;
  getManifest(): PluginManifest;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  type: string;
  description: string;
  author: string;
  dependencies: string[];
  engineTypes: string[];
  minCoreVersion: string;
}

export interface IEngineContext {
  projectId: string;
  facts: ProjectFacts;
  building: VirtualBuilding;
  knowledge: unknown;
  logger: ILogger;
  config: Record<string, unknown>;
}

export interface ILogger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
  trace(message: string, data?: unknown): void;
}

export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: unknown): Promise<T[]>;
  create(data: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

export interface IMessageBus {
  publish(topic: string, message: unknown): Promise<void>;
  subscribe(topic: string, handler: (message: unknown) => void): Promise<void>;
  unsubscribe(topic: string, handler: (message: unknown) => void): Promise<void>;
}

export interface IWorkflowEngine {
  createWorkflow(projectId: string, type: string): Promise<unknown>;
  executeStep(workflowId: string, step: string): Promise<unknown>;
  getWorkflowStatus(workflowId: string): Promise<unknown>;
  cancelWorkflow(workflowId: string): Promise<void>;
}
