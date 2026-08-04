import { v4 as uuid } from 'uuid';
import { IAgent, ILogger, AgentType } from '@acep/core';

// Volume 31: Autonomous AI Agents Orchestration System (AAAOS)

// AI Workforce - Specialized Agents
interface AIAgent {
  agentId: string;
  name: string;
  specialization: AgentSpecialization;
  permissions: AgentPermission[];
  memoryTypes: MemoryType[];
  capabilities: string[];
  status: 'Active' | 'Idle' | 'Busy' | 'Offline';
  currentTask?: string;
  performance: AgentPerformance;
}

type AgentSpecialization =
  | 'ChiefAIOrchestrator'
  | 'ProjectUnderstandingAgent'
  | 'BOQGenerationAgent'
  | 'QuantityEstimationAgent'
  | 'PricingAgent'
  | 'PlanningAgent'
  | 'RiskAgent'
  | 'ProcurementAgent'
  | 'ContractAgent'
  | 'DocumentAgent'
  | 'QualityAgent'
  | 'SafetyAgent'
  | 'ScheduleAgent'
  | 'CostAgent'
  | 'BIMAgent'
  | 'DigitalTwinAgent'
  | 'KnowledgeGraphAgent'
  | 'ReasoningAgent'
  | 'LearningAgent'
  | 'ComplianceAgent'
  | 'NegotiationAgent'
  | 'ExplanationAgent'
  | 'SelfAuditAgent';

type AgentPermission =
  | 'ReadProject'
  | 'WriteProject'
  | 'ReadBOQ'
  | 'WriteBOQ'
  | 'ReadSchedule'
  | 'WriteSchedule'
  | 'ReadCost'
  | 'WriteCost'
  | 'ReadRisk'
  | 'WriteRisk'
  | 'ReadContract'
  | 'WriteContract'
  | 'ReadDocument'
  | 'WriteDocument'
  | 'ExecuteDecision'
  | 'ApproveChange'
  | 'AccessKnowledgeGraph'
  | 'AccessDigitalTwin'
  | 'AccessBIM'
  | 'OrchestrateAgents'
  | 'FullAccess';

type MemoryType = 'ShortTerm' | 'Project' | 'Enterprise' | 'Engineering';

interface AgentPerformance {
  tasksCompleted: number;
  tasksFailed: number;
  averageResponseTime: number;
  accuracy: number;
  reliability: number;
  lastEvaluation: Date;
}

// Agent Task
interface AgentTask {
  taskId: string;
  projectId: string;
  taskType: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'InProgress' | 'Completed' | 'Failed' | 'Cancelled';
  input: any;
  output?: any;
  dependencies: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number;
  actualDuration?: number;
  retryCount: number;
}

// Agent Collaboration
interface AgentCollaboration {
  collaborationId: string;
  projectId: string;
  participants: string[];
  collaborationType: 'Sequential' | 'Parallel' | 'Hierarchical' | 'PeerToPeer';
  objective: string;
  tasks: AgentTask[];
  status: 'Active' | 'Completed' | 'Failed';
  startTime: Date;
  endTime?: Date;
  results: any[];
}

// Agent Memory
interface AgentMemory {
  memoryId: string;
  agentId: string;
  memoryType: MemoryType;
  projectId?: string;
  content: any;
  timestamp: Date;
  importance: number;
  accessCount: number;
  lastAccessed: Date;
  expiresAt?: Date;
}

interface TypedMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  type: string;
  payload: unknown;
  projectId: string;
  timestamp: string;
  correlationId?: string;
  replyTo?: string;
}

interface AgentHealth {
  agentId: string;
  agentType: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastHeartbeat: string;
  messageCount: number;
  errorCount: number;
}

class Logger implements ILogger {
  constructor(private readonly context: string) {}

  info(message: string, data?: unknown): void {
    console.log(`[${this.context}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  warn(message: string, data?: unknown): void {
    console.warn(`[${this.context}] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  error(message: string, data?: unknown): void {
    console.error(`[${this.context}] ERROR: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  debug(message: string, data?: unknown): void {
    console.debug(`[${this.context}] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  trace(message: string, data?: unknown): void {
    console.trace(`[${this.context}] TRACE: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

class MessageHistoryStore {
  private messages: Map<string, TypedMessage[]> = new Map();
  private maxHistoryPerProject: number;

  constructor(maxHistoryPerProject: number = 10000) {
    this.maxHistoryPerProject = maxHistoryPerProject;
  }

  add(message: TypedMessage): void {
    const projectMessages = this.messages.get(message.projectId) || [];
    projectMessages.push(message);
    if (projectMessages.length > this.maxHistoryPerProject) {
      projectMessages.splice(0, projectMessages.length - this.maxHistoryPerProject);
    }
    this.messages.set(message.projectId, projectMessages);
  }

  getByProject(projectId: string): TypedMessage[] {
    return this.messages.get(projectId) || [];
  }

  getByAgent(agentId: string): TypedMessage[] {
    const result: TypedMessage[] = [];
    for (const msgs of this.messages.values()) {
      for (const msg of msgs) {
        if (msg.fromAgent === agentId || msg.toAgent === agentId) {
          result.push(msg);
        }
      }
    }
    return result;
  }

  getByType(type: string): TypedMessage[] {
    const result: TypedMessage[] = [];
    for (const msgs of this.messages.values()) {
      for (const msg of msgs) {
        if (msg.type === type) {
          result.push(msg);
        }
      }
    }
    return result;
  }

  getAll(): Map<string, TypedMessage[]> {
    return this.messages;
  }
}

class DeadlockDetector {
  private recentMessages: Map<string, Set<string>> = new Map();
  private maxChainLength: number;

  constructor(maxChainLength: number = 50) {
    this.maxChainLength = maxChainLength;
  }

  private getOrCreateTrace(projectId: string): Set<string> {
    if (!this.recentMessages.has(projectId)) {
      this.recentMessages.set(projectId, new Set());
    }
    return this.recentMessages.get(projectId)!;
  }

  isLoopDetected(fromAgent: string, toAgent: string, projectId: string): boolean {
    const trace = this.getOrCreateTrace(projectId);
    const messageKey = `${fromAgent}->${toAgent}`;
    if (trace.has(messageKey)) {
      return true;
    }
    trace.add(messageKey);
    if (trace.size > this.maxChainLength) {
      return true;
    }
    return false;
  }

  isDeadlockDetected(projectId: string): boolean {
    const trace = this.getOrCreateTrace(projectId);
    if (trace.size >= this.maxChainLength) {
      return true;
    }
    return false;
  }

  resetProject(projectId: string): void {
    this.recentMessages.delete(projectId);
  }

  reset(): void {
    this.recentMessages.clear();
  }
}

class SubscriptionManager {
  private subscriptions: Map<string, Set<string>> = new Map();
  private agentSubscriptions: Map<string, Set<string>> = new Map();

  subscribe(agentId: string, topic: string): void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(agentId);

    if (!this.agentSubscriptions.has(agentId)) {
      this.agentSubscriptions.set(agentId, new Set());
    }
    this.agentSubscriptions.get(agentId)!.add(topic);
  }

  unsubscribe(agentId: string, topic: string): void {
    this.subscriptions.get(topic)?.delete(agentId);
    this.agentSubscriptions.get(agentId)?.delete(topic);
  }

  getSubscribers(topic: string): string[] {
    return Array.from(this.subscriptions.get(topic) || []);
  }

  getTopics(agentId: string): string[] {
    return Array.from(this.agentSubscriptions.get(agentId) || []);
  }

  removeAgent(agentId: string): void {
    const topics = this.agentSubscriptions.get(agentId);
    if (topics) {
      for (const topic of topics) {
        this.subscriptions.get(topic)?.delete(agentId);
      }
    }
    this.agentSubscriptions.delete(agentId);
  }
}

export class EngineeringMessageBus {
  private messageHistory: MessageHistoryStore;
  private deadlockDetector: DeadlockDetector;
  private subscriptionManager: SubscriptionManager;
  private agents: Map<string, IAgent> = new Map();
  private logger: ILogger;
  private messageHandlers: Map<string, Array<(message: TypedMessage) => Promise<void>>> = new Map();

  constructor() {
    this.messageHistory = new MessageHistoryStore();
    this.deadlockDetector = new DeadlockDetector();
    this.subscriptionManager = new SubscriptionManager();
    this.logger = new Logger('EngineeringMessageBus');
  }

  registerAgent(agent: IAgent): void {
    this.agents.set(agent.id, agent);
    this.logger.info(`Agent registered on bus: ${agent.name} (${agent.id})`);
  }

  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.subscriptionManager.removeAgent(agentId);
    this.logger.info(`Agent unregistered: ${agentId}`);
  }

  async sendMessage(
    fromAgent: string,
    toAgent: string,
    message: TypedMessage
  ): Promise<void> {
    if (this.deadlockDetector.isLoopDetected(fromAgent, toAgent, message.projectId)) {
      this.logger.warn(`Loop detected: ${fromAgent} -> ${toAgent} for project ${message.projectId}. Discarding message.`);
      return;
    }
    if (this.deadlockDetector.isDeadlockDetected(message.projectId)) {
      this.logger.error(`Deadlock detected for project ${message.projectId}. Resetting trace.`);
      this.deadlockDetector.resetProject(message.projectId);
      return;
    }

    if (!this.agents.has(fromAgent)) {
      this.logger.warn(`Unknown sender: ${fromAgent}, allowing message anyway`);
    }
    if (!this.agents.has(toAgent)) {
      this.logger.warn(`Unknown recipient: ${toAgent}, message will be stored but not delivered`);
    }

    const typedMessage: TypedMessage = {
      ...message,
      id: message.id || uuid(),
      fromAgent,
      toAgent,
      timestamp: message.timestamp || new Date().toISOString()
    };

    this.messageHistory.add(typedMessage);
    this.logger.info(`Message sent: ${fromAgent} -> ${toAgent} (${typedMessage.type})`);

    const handlers = this.messageHandlers.get(toAgent) || [];
    for (const handler of handlers) {
      try {
        await handler(typedMessage);
      } catch (error) {
        this.logger.error(`Handler error for ${toAgent}: ${(error as Error).message}`);
      }
    }
  }

  async broadcast(agentType: string, message: TypedMessage): Promise<void> {
    const broadcastMessage: TypedMessage = {
      ...message,
      id: uuid(),
      type: message.type || 'broadcast',
      timestamp: new Date().toISOString()
    };

    const subscribers = this.subscriptionManager.getSubscribers(agentType);
    this.logger.info(`Broadcasting to ${subscribers.length} subscribers of type ${agentType}`);

    for (const agentId of subscribers) {
      const agent = this.agents.get(agentId);
      if (agent) {
        await this.sendMessage(broadcastMessage.fromAgent, agentId, {
          ...broadcastMessage,
          toAgent: agentId
        });
      }
    }

    for (const [agentId, agent] of this.agents) {
      if (agent.type === agentType && !subscribers.includes(agentId)) {
        await this.sendMessage(broadcastMessage.fromAgent, agentId, {
          ...broadcastMessage,
          toAgent: agentId
        });
      }
    }
  }

  subscribe(agentId: string, topic: string): void {
    this.subscriptionManager.subscribe(agentId, topic);
    this.logger.info(`Agent ${agentId} subscribed to topic: ${topic}`);
  }

  unsubscribe(agentId: string, topic: string): void {
    this.subscriptionManager.unsubscribe(agentId, topic);
  }

  onMessage(agentId: string, handler: (message: TypedMessage) => Promise<void>): void {
    if (!this.messageHandlers.has(agentId)) {
      this.messageHandlers.set(agentId, []);
    }
    this.messageHandlers.get(agentId)!.push(handler);
  }

  getMessageHistory(projectId: string): TypedMessage[] {
    return this.messageHistory.getByProject(projectId);
  }

  getAgentMessageHistory(agentId: string): TypedMessage[] {
    return this.messageHistory.getByAgent(agentId);
  }

  getMessageHistoryByType(type: string): TypedMessage[] {
    return this.messageHistory.getByType(type);
  }

  getFullHistory(): Map<string, TypedMessage[]> {
    return this.messageHistory.getAll();
  }

  resetProject(projectId: string): void {
    this.deadlockDetector.resetProject(projectId);
  }

  resetAll(): void {
    this.deadlockDetector.reset();
  }
}

export class AgentOrchestrator {
  readonly id = 'agent-orchestrator';
  readonly type = 'orchestrator';
  readonly name = 'Chief AI Orchestrator';
  private messageBus: EngineeringMessageBus;
  private logger: ILogger;
  private agentHealth: Map<string, AgentHealth> = new Map();
  private registeredAgents: Map<string, IAgent> = new Map();
  private aiWorkforce: Map<string, AIAgent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private collaborations: Map<string, AgentCollaboration> = new Map();
  private agentMemories: Map<string, AgentMemory[]> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private healthCheckPeriodMs: number;

  constructor(healthCheckPeriodMs: number = 30000) {
    this.messageBus = new EngineeringMessageBus();
    this.logger = new Logger('ChiefAIOrchestrator');
    this.healthCheckPeriodMs = healthCheckPeriodMs;
    this.initializeAIWorkforce();
  }

  getMessageBus(): EngineeringMessageBus {
    return this.messageBus;
  }

  registerAgent(agent: IAgent): void {
    this.registeredAgents.set(agent.id, agent);
    this.messageBus.registerAgent(agent);
    this.agentHealth.set(agent.id, {
      agentId: agent.id,
      agentType: agent.type,
      status: 'unknown',
      lastHeartbeat: new Date().toISOString(),
      messageCount: 0,
      errorCount: 0
    });
    this.logger.info(`Agent registered: ${agent.name} (${agent.id})`);
  }

  unregisterAgent(agentId: string): void {
    this.registeredAgents.delete(agentId);
    this.messageBus.unregisterAgent(agentId);
    this.agentHealth.delete(agentId);
    this.logger.info(`Agent unregistered: ${agentId}`);
  }

  async sendMessage(
    fromAgent: string,
    toAgent: string,
    payload: unknown,
    options?: { type?: string; projectId?: string; correlationId?: string; replyTo?: string }
  ): Promise<void> {
    const message: TypedMessage = {
      id: uuid(),
      fromAgent,
      toAgent,
      type: options?.type || 'default',
      payload,
      projectId: options?.projectId || 'default',
      timestamp: new Date().toISOString(),
      correlationId: options?.correlationId,
      replyTo: options?.replyTo
    };

    this.updateHealth(fromAgent, true);
    await this.messageBus.sendMessage(fromAgent, toAgent, message);
  }

  async broadcast(agentType: string, payload: unknown, projectId?: string): Promise<void> {
    const message: TypedMessage = {
      id: uuid(),
      fromAgent: this.id,
      toAgent: '',
      type: 'broadcast',
      payload,
      projectId: projectId || 'default',
      timestamp: new Date().toISOString()
    };
    await this.messageBus.broadcast(agentType, message);
  }

  getMessageHistory(projectId: string): TypedMessage[] {
    return this.messageBus.getMessageHistory(projectId);
  }

  subscribe(agentId: string, topic: string): void {
    this.messageBus.subscribe(agentId, topic);
  }

  onMessage(agentId: string, handler: (message: TypedMessage) => Promise<void>): void {
    this.messageBus.onMessage(agentId, handler);
  }

  getAgentHealth(agentId: string): AgentHealth | undefined {
    return this.agentHealth.get(agentId);
  }

  getAllHealthReports(): AgentHealth[] {
    return Array.from(this.agentHealth.values());
  }

  private updateHealth(agentId: string, success: boolean): void {
    const health = this.agentHealth.get(agentId);
    if (health) {
      health.lastHeartbeat = new Date().toISOString();
      health.messageCount++;
      if (!success) {
        health.errorCount++;
      }
    }
  }

  private async checkAgentHealth(agent: IAgent): Promise<boolean> {
    try {
      const result = await agent.process({ type: 'health-check' });
      return result !== null;
    } catch {
      return false;
    }
  }

  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      for (const [agentId, agent] of this.registeredAgents) {
        const health = this.agentHealth.get(agentId);
        if (!health) continue;

        try {
          const isHealthy = await this.checkAgentHealth(agent);
          health.status = isHealthy ? 'healthy' : 'unhealthy';
          if (!isHealthy) {
            this.logger.warn(`Agent ${agent.name} (${agentId}) is unhealthy`);
          }
        } catch (error) {
          health.status = 'unhealthy';
          health.errorCount++;
          this.logger.error(`Health check failed for ${agent.name}: ${(error as Error).message}`);
        }
      }
    }, this.healthCheckPeriodMs);

    this.logger.info(`Health checks started (interval: ${this.healthCheckPeriodMs}ms)`);
  }

  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.logger.info('Health checks stopped');
    }
  }

  getRegisteredAgents(): IAgent[] {
    return Array.from(this.registeredAgents.values());
  }

  async process(input: unknown): Promise<unknown> {
    const request = input as { type: string; payload: unknown; projectId?: string };
    if (!request || !request.type) {
      throw new Error('Invalid request: type is required');
    }
    this.logger.info(`Processing request: ${request.type}`);
    return { status: 'processed', type: request.type };
  }

  canHandle(input: unknown): boolean {
    return input !== null && typeof input === 'object' && 'type' in (input as Record<string, unknown>);
  }

  getCapabilities(): string[] {
    return ['message-routing', 'broadcast', 'health-monitoring', 'message-history', 'task-orchestration', 'agent-collaboration', 'memory-management', 'performance-tracking'];
  }

  // Volume 31: AI Workforce Management
  private initializeAIWorkforce(): void {
    this.logger.info('Initializing AI Workforce');

    const specializations: AgentSpecialization[] = [
      'ChiefAIOrchestrator',
      'ProjectUnderstandingAgent',
      'BOQGenerationAgent',
      'QuantityEstimationAgent',
      'PricingAgent',
      'PlanningAgent',
      'RiskAgent',
      'ProcurementAgent',
      'ContractAgent',
      'DocumentAgent',
      'QualityAgent',
      'SafetyAgent',
      'ScheduleAgent',
      'CostAgent',
      'BIMAgent',
      'DigitalTwinAgent',
      'KnowledgeGraphAgent',
      'ReasoningAgent',
      'LearningAgent',
      'ComplianceAgent',
      'NegotiationAgent',
      'ExplanationAgent',
      'SelfAuditAgent'
    ];

    specializations.forEach(spec => {
      const agent: AIAgent = {
        agentId: `AI-${spec}`,
        name: spec,
        specialization: spec,
        permissions: this.getPermissionsForSpecialization(spec),
        memoryTypes: this.getMemoryTypesForSpecialization(spec),
        capabilities: this.getCapabilitiesForSpecialization(spec),
        status: 'Idle',
        performance: {
          tasksCompleted: 0,
          tasksFailed: 0,
          averageResponseTime: 0,
          accuracy: 0.9,
          reliability: 0.9,
          lastEvaluation: new Date()
        }
      };

      this.aiWorkforce.set(agent.agentId, agent);
    });

    this.logger.info(`AI Workforce initialized with ${this.aiWorkforce.size} specialized agents`);
  }

  private getPermissionsForSpecialization(spec: AgentSpecialization): AgentPermission[] {
    const permissionMap: Record<AgentSpecialization, AgentPermission[]> = {
      'ChiefAIOrchestrator': ['FullAccess', 'OrchestrateAgents', 'ExecuteDecision', 'ApproveChange'],
      'ProjectUnderstandingAgent': ['ReadProject', 'AccessKnowledgeGraph', 'AccessBIM'],
      'BOQGenerationAgent': ['ReadProject', 'WriteBOQ', 'AccessKnowledgeGraph'],
      'QuantityEstimationAgent': ['ReadProject', 'ReadBOQ', 'AccessBIM'],
      'PricingAgent': ['ReadProject', 'ReadBOQ', 'WriteCost', 'AccessKnowledgeGraph'],
      'PlanningAgent': ['ReadProject', 'WriteSchedule', 'ReadCost'],
      'RiskAgent': ['ReadProject', 'ReadRisk', 'WriteRisk', 'ReadSchedule'],
      'ProcurementAgent': ['ReadProject', 'ReadBOQ', 'WriteCost', 'ReadContract'],
      'ContractAgent': ['ReadProject', 'ReadContract', 'WriteContract', 'ReadDocument'],
      'DocumentAgent': ['ReadProject', 'ReadDocument', 'WriteDocument'],
      'QualityAgent': ['ReadProject', 'ReadBOQ', 'ReadSchedule'],
      'SafetyAgent': ['ReadProject', 'ReadSchedule', 'ReadRisk'],
      'ScheduleAgent': ['ReadProject', 'ReadSchedule', 'WriteSchedule'],
      'CostAgent': ['ReadProject', 'ReadCost', 'WriteCost', 'ReadBOQ'],
      'BIMAgent': ['ReadProject', 'AccessBIM', 'WriteProject'],
      'DigitalTwinAgent': ['ReadProject', 'AccessDigitalTwin', 'AccessBIM'],
      'KnowledgeGraphAgent': ['AccessKnowledgeGraph', 'ReadProject'],
      'ReasoningAgent': ['ReadProject', 'AccessKnowledgeGraph', 'AccessDigitalTwin'],
      'LearningAgent': ['ReadProject', 'AccessKnowledgeGraph', 'WriteProject'],
      'ComplianceAgent': ['ReadProject', 'ReadContract', 'ReadDocument'],
      'NegotiationAgent': ['ReadProject', 'ReadContract', 'ExecuteDecision'],
      'ExplanationAgent': ['ReadProject', 'AccessKnowledgeGraph'],
      'SelfAuditAgent': ['FullAccess', 'ReadProject', 'ReadContract']
    };

    return permissionMap[spec] || ['ReadProject'];
  }

  private getMemoryTypesForSpecialization(spec: AgentSpecialization): MemoryType[] {
    const memoryMap: Record<AgentSpecialization, MemoryType[]> = {
      'ChiefAIOrchestrator': ['ShortTerm', 'Project', 'Enterprise', 'Engineering'],
      'ProjectUnderstandingAgent': ['Project', 'Engineering'],
      'BOQGenerationAgent': ['Project', 'Engineering'],
      'QuantityEstimationAgent': ['Project', 'Engineering'],
      'PricingAgent': ['Project', 'Enterprise'],
      'PlanningAgent': ['Project', 'Engineering'],
      'RiskAgent': ['Project', 'Enterprise'],
      'ProcurementAgent': ['Project', 'Enterprise'],
      'ContractAgent': ['Project', 'Enterprise'],
      'DocumentAgent': ['Project', 'ShortTerm'],
      'QualityAgent': ['Project', 'Engineering'],
      'SafetyAgent': ['Project', 'Enterprise'],
      'ScheduleAgent': ['Project', 'Engineering'],
      'CostAgent': ['Project', 'Enterprise'],
      'BIMAgent': ['Project', 'Engineering'],
      'DigitalTwinAgent': ['Project', 'Engineering', 'ShortTerm'],
      'KnowledgeGraphAgent': ['Enterprise', 'Engineering'],
      'ReasoningAgent': ['Project', 'Engineering', 'Enterprise'],
      'LearningAgent': ['Enterprise', 'Engineering'],
      'ComplianceAgent': ['Enterprise', 'Engineering'],
      'NegotiationAgent': ['Project', 'ShortTerm'],
      'ExplanationAgent': ['ShortTerm', 'Project'],
      'SelfAuditAgent': ['Enterprise', 'Engineering']
    };

    return memoryMap[spec] || ['ShortTerm'];
  }

  private getCapabilitiesForSpecialization(spec: AgentSpecialization): string[] {
    const capabilityMap: Record<AgentSpecialization, string[]> = {
      'ChiefAIOrchestrator': ['orchestrate', 'coordinate', 'monitor', 'decide'],
      'ProjectUnderstandingAgent': ['analyze', 'understand', 'extract', 'interpret'],
      'BOQGenerationAgent': ['generate', 'calculate', 'estimate', 'optimize'],
      'QuantityEstimationAgent': ['measure', 'calculate', 'extract', 'validate'],
      'PricingAgent': ['price', 'analyze', 'compare', 'forecast'],
      'PlanningAgent': ['plan', 'schedule', 'optimize', 'coordinate'],
      'RiskAgent': ['identify', 'assess', 'mitigate', 'monitor'],
      'ProcurementAgent': ['procure', 'source', 'negotiate', 'track'],
      'ContractAgent': ['analyze', 'manage', 'monitor', 'enforce'],
      'DocumentAgent': ['process', 'extract', 'classify', 'search'],
      'QualityAgent': ['inspect', 'validate', 'monitor', 'report'],
      'SafetyAgent': ['monitor', 'detect', 'prevent', 'report'],
      'ScheduleAgent': ['schedule', 'track', 'optimize', 'report'],
      'CostAgent': ['estimate', 'track', 'analyze', 'forecast'],
      'BIMAgent': ['model', 'coordinate', 'extract', 'validate'],
      'DigitalTwinAgent': ['simulate', 'monitor', 'predict', 'analyze'],
      'KnowledgeGraphAgent': ['query', 'reason', 'link', 'update'],
      'ReasoningAgent': ['reason', 'infer', 'deduce', 'solve'],
      'LearningAgent': ['learn', 'adapt', 'improve', 'update'],
      'ComplianceAgent': ['check', 'validate', 'enforce', 'report'],
      'NegotiationAgent': ['negotiate', 'mediate', 'resolve', 'advise'],
      'ExplanationAgent': ['explain', 'clarify', 'interpret', 'summarize'],
      'SelfAuditAgent': ['audit', 'validate', 'check', 'report']
    };

    return capabilityMap[spec] || ['process'];
  }

  // Volume 31: Task Orchestration
  async assignTask(task: AgentTask): Promise<string> {
    this.logger.info(`Assigning task ${task.taskId} to agent ${task.assignedTo}`);

    const agent = this.aiWorkforce.get(task.assignedTo);
    if (!agent) {
      throw new Error(`Agent not found: ${task.assignedTo}`);
    }

    task.status = 'Pending';
    task.createdAt = new Date();
    this.tasks.set(task.taskId, task);

    // Check dependencies
    const dependenciesMet = await this.checkDependencies(task.dependencies);
    if (dependenciesMet) {
      await this.executeTask(task);
    }

    return task.taskId;
  }

  private async checkDependencies(dependencies: string[]): Promise<boolean> {
    for (const depId of dependencies) {
      const depTask = this.tasks.get(depId);
      if (!depTask || depTask.status !== 'Completed') {
        return false;
      }
    }
    return true;
  }

  private async executeTask(task: AgentTask): Promise<void> {
    this.logger.info(`Executing task ${task.taskId}`);

    const agent = this.aiWorkforce.get(task.assignedTo);
    if (!agent) return;

    agent.status = 'Busy';
    agent.currentTask = task.taskId;
    task.status = 'InProgress';
    task.startedAt = new Date();

    try {
      // Simulate task execution
      await this.simulateTaskExecution(task);

      task.status = 'Completed';
      task.completedAt = new Date();
      task.actualDuration = task.completedAt.getTime() - task.startedAt.getTime();
      task.output = { success: true, result: 'Task completed successfully' };

      agent.status = 'Idle';
      agent.currentTask = undefined;
      agent.performance.tasksCompleted++;

      // Store in agent memory
      await this.storeAgentMemory(agent.agentId, 'ShortTerm', task);

      this.logger.info(`Task ${task.taskId} completed successfully`);
    } catch (error) {
      task.status = 'Failed';
      task.completedAt = new Date();
      agent.status = 'Idle';
      agent.currentTask = undefined;
      agent.performance.tasksFailed++;

      this.logger.error(`Task ${task.taskId} failed: ${(error as Error).message}`);
    }
  }

  private async simulateTaskExecution(task: AgentTask): Promise<void> {
    // Simulate task execution time
    const executionTime = task.estimatedDuration * (0.8 + Math.random() * 0.4);
    await new Promise(resolve => setTimeout(resolve, executionTime));
  }

  // Volume 31: Agent Collaboration
  async initiateCollaboration(collaboration: AgentCollaboration): Promise<string> {
    this.logger.info(`Initiating collaboration ${collaboration.collaborationId}`);

    collaboration.status = 'Active';
    collaboration.startTime = new Date();
    this.collaborations.set(collaboration.collaborationId, collaboration);

    // Execute collaboration based on type
    switch (collaboration.collaborationType) {
      case 'Sequential':
        await this.executeSequentialCollaboration(collaboration);
        break;
      case 'Parallel':
        await this.executeParallelCollaboration(collaboration);
        break;
      case 'Hierarchical':
        await this.executeHierarchicalCollaboration(collaboration);
        break;
      case 'PeerToPeer':
        await this.executePeerToPeerCollaboration(collaboration);
        break;
    }

    return collaboration.collaborationId;
  }

  private async executeSequentialCollaboration(collaboration: AgentCollaboration): Promise<void> {
    for (const task of collaboration.tasks) {
      await this.executeTask(task);
    }
    collaboration.status = 'Completed';
    collaboration.endTime = new Date();
  }

  private async executeParallelCollaboration(collaboration: AgentCollaboration): Promise<void> {
    const promises = collaboration.tasks.map(task => this.executeTask(task));
    await Promise.all(promises);
    collaboration.status = 'Completed';
    collaboration.endTime = new Date();
  }

  private async executeHierarchicalCollaboration(collaboration: AgentCollaboration): Promise<void> {
    // Execute tasks in hierarchical order
    const sortedTasks = collaboration.tasks.sort((a, b) => a.priority.localeCompare(b.priority));
    for (const task of sortedTasks) {
      await this.executeTask(task);
    }
    collaboration.status = 'Completed';
    collaboration.endTime = new Date();
  }

  private async executePeerToPeerCollaboration(collaboration: AgentCollaboration): Promise<void> {
    // Agents communicate and collaborate directly
    for (const task of collaboration.tasks) {
      await this.executeTask(task);
      // Broadcast result to other participants
      await this.broadcast('collaboration', { taskId: task.taskId, result: task.output }, collaboration.projectId);
    }
    collaboration.status = 'Completed';
    collaboration.endTime = new Date();
  }

  // Volume 31: Memory Management
  async storeAgentMemory(agentId: string, memoryType: MemoryType, content: any, projectId?: string): Promise<void> {
    const memory: AgentMemory = {
      memoryId: `MEM-${Date.now()}`,
      agentId,
      memoryType,
      projectId,
      content,
      timestamp: new Date(),
      importance: 0.5 + Math.random() * 0.5,
      accessCount: 0,
      lastAccessed: new Date(),
      expiresAt: memoryType === 'ShortTerm' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined
    };

    if (!this.agentMemories.has(agentId)) {
      this.agentMemories.set(agentId, []);
    }

    this.agentMemories.get(agentId)!.push(memory);
    this.logger.info(`Stored memory for agent ${agentId}: ${memory.memoryId}`);
  }

  async retrieveAgentMemory(agentId: string, memoryType?: MemoryType, projectId?: string): Promise<AgentMemory[]> {
    const memories = this.agentMemories.get(agentId) || [];
    
    let filtered = memories;
    if (memoryType) {
      filtered = filtered.filter(m => m.memoryType === memoryType);
    }
    if (projectId) {
      filtered = filtered.filter(m => m.projectId === projectId);
    }

    // Update access count and last accessed
    filtered.forEach(m => {
      m.accessCount++;
      m.lastAccessed = new Date();
    });

    return filtered;
  }

  async clearExpiredMemories(): Promise<void> {
    const now = new Date();
    for (const [agentId, memories] of this.agentMemories) {
      const validMemories = memories.filter(m => !m.expiresAt || m.expiresAt > now);
      this.agentMemories.set(agentId, validMemories);
    }
    this.logger.info('Cleared expired memories');
  }

  // Volume 31: Performance Tracking
  async getAgentPerformance(agentId: string): Promise<AgentPerformance> {
    const agent = this.aiWorkforce.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    return agent.performance;
  }

  async getAllAgentPerformance(): Promise<Map<string, AgentPerformance>> {
    const performance = new Map<string, AgentPerformance>();
    this.aiWorkforce.forEach((agent, agentId) => {
      performance.set(agentId, agent.performance);
    });
    return performance;
  }

  async evaluateAgent(agentId: string): Promise<EvaluationResult> {
    const agent = this.aiWorkforce.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const totalTasks = agent.performance.tasksCompleted + agent.performance.tasksFailed;
    const successRate = totalTasks > 0 ? agent.performance.tasksCompleted / totalTasks : 0;

    const evaluation: EvaluationResult = {
      agentId,
      successRate,
      accuracy: agent.performance.accuracy,
      reliability: agent.performance.reliability,
      averageResponseTime: agent.performance.averageResponseTime,
      overallScore: (successRate * 0.4 + agent.performance.accuracy * 0.3 + agent.performance.reliability * 0.3),
      recommendation: successRate > 0.8 ? 'Excellent' : successRate > 0.6 ? 'Good' : 'Needs Improvement',
      evaluatedAt: new Date()
    };

    agent.performance.lastEvaluation = new Date();

    return evaluation;
  }

  // Volume 31: AI Workforce Dashboard
  async getWorkforceDashboard(): Promise<WorkforceDashboard> {
    const activeAgents = Array.from(this.aiWorkforce.values()).filter(a => a.status === 'Active' || a.status === 'Busy');
    const idleAgents = Array.from(this.aiWorkforce.values()).filter(a => a.status === 'Idle');
    const offlineAgents = Array.from(this.aiWorkforce.values()).filter(a => a.status === 'Offline');

    const totalTasks = Array.from(this.tasks.values()).length;
    const completedTasks = Array.from(this.tasks.values()).filter(t => t.status === 'Completed').length;
    const failedTasks = Array.from(this.tasks.values()).filter(t => t.status === 'Failed').length;

    return {
      totalAgents: this.aiWorkforce.size,
      activeAgents: activeAgents.length,
      idleAgents: idleAgents.length,
      offlineAgents: offlineAgents.length,
      totalTasks,
      completedTasks,
      failedTasks,
      activeCollaborations: Array.from(this.collaborations.values()).filter(c => c.status === 'Active').length,
      agentStatuses: Array.from(this.aiWorkforce.values()).map(a => ({
        agentId: a.agentId,
        name: a.name,
        status: a.status,
        currentTask: a.currentTask
      })),
      recentTasks: Array.from(this.tasks.values()).slice(-10)
    };
  }

  // Volume 31: Intelligent Task Routing
  async routeTask(taskType: string, input: any, projectId: string): Promise<string> {
    this.logger.info(`Routing task of type ${taskType}`);

    // Find best agent for the task
    const bestAgent = this.findBestAgentForTask(taskType);
    if (!bestAgent) {
      throw new Error(`No suitable agent found for task type: ${taskType}`);
    }

    const task: AgentTask = {
      taskId: `TSK-${Date.now()}`,
      projectId,
      taskType,
      description: `Auto-routed task: ${taskType}`,
      assignedTo: bestAgent.agentId,
      assignedBy: 'ChiefAIOrchestrator',
      priority: 'Medium',
      status: 'Pending',
      input,
      dependencies: [],
      createdAt: new Date(),
      estimatedDuration: 5000,
      retryCount: 0
    };

    return await this.assignTask(task);
  }

  private findBestAgentForTask(taskType: string): AIAgent | null {
    const taskAgentMap: Record<string, AgentSpecialization> = {
      'project-understanding': 'ProjectUnderstandingAgent',
      'boq-generation': 'BOQGenerationAgent',
      'quantity-estimation': 'QuantityEstimationAgent',
      'pricing': 'PricingAgent',
      'planning': 'PlanningAgent',
      'risk-analysis': 'RiskAgent',
      'procurement': 'ProcurementAgent',
      'contract-analysis': 'ContractAgent',
      'document-processing': 'DocumentAgent',
      'quality-check': 'QualityAgent',
      'safety-monitoring': 'SafetyAgent',
      'schedule-optimization': 'ScheduleAgent',
      'cost-estimation': 'CostAgent',
      'bim-analysis': 'BIMAgent',
      'digital-twin': 'DigitalTwinAgent',
      'knowledge-query': 'KnowledgeGraphAgent',
      'reasoning': 'ReasoningAgent',
      'learning': 'LearningAgent',
      'compliance-check': 'ComplianceAgent',
      'negotiation': 'NegotiationAgent',
      'explanation': 'ExplanationAgent',
      'audit': 'SelfAuditAgent'
    };

    const specialization = taskAgentMap[taskType];
    if (!specialization) return null;

    const agent = Array.from(this.aiWorkforce.values()).find(a => a.specialization === specialization);
    return agent || null;
  }
}

// Supporting interfaces
interface EvaluationResult {
  agentId: string;
  successRate: number;
  accuracy: number;
  reliability: number;
  averageResponseTime: number;
  overallScore: number;
  recommendation: string;
  evaluatedAt: Date;
}

interface WorkforceDashboard {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  offlineAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  activeCollaborations: number;
  agentStatuses: any[];
  recentTasks: AgentTask[];
}
