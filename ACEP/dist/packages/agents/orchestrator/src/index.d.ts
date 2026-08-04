import { IAgent } from '@acep/core';
type MemoryType = 'ShortTerm' | 'Project' | 'Enterprise' | 'Engineering';
interface AgentPerformance {
    tasksCompleted: number;
    tasksFailed: number;
    averageResponseTime: number;
    accuracy: number;
    reliability: number;
    lastEvaluation: Date;
}
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
export declare class EngineeringMessageBus {
    private messageHistory;
    private deadlockDetector;
    private subscriptionManager;
    private agents;
    private logger;
    private messageHandlers;
    constructor();
    registerAgent(agent: IAgent): void;
    unregisterAgent(agentId: string): void;
    sendMessage(fromAgent: string, toAgent: string, message: TypedMessage): Promise<void>;
    broadcast(agentType: string, message: TypedMessage): Promise<void>;
    subscribe(agentId: string, topic: string): void;
    unsubscribe(agentId: string, topic: string): void;
    onMessage(agentId: string, handler: (message: TypedMessage) => Promise<void>): void;
    getMessageHistory(projectId: string): TypedMessage[];
    getAgentMessageHistory(agentId: string): TypedMessage[];
    getMessageHistoryByType(type: string): TypedMessage[];
    getFullHistory(): Map<string, TypedMessage[]>;
    resetProject(projectId: string): void;
    resetAll(): void;
}
export declare class AgentOrchestrator {
    readonly id = "agent-orchestrator";
    readonly type = "orchestrator";
    readonly name = "Chief AI Orchestrator";
    private messageBus;
    private logger;
    private agentHealth;
    private registeredAgents;
    private aiWorkforce;
    private tasks;
    private collaborations;
    private agentMemories;
    private healthCheckInterval;
    private healthCheckPeriodMs;
    constructor(healthCheckPeriodMs?: number);
    getMessageBus(): EngineeringMessageBus;
    registerAgent(agent: IAgent): void;
    unregisterAgent(agentId: string): void;
    sendMessage(fromAgent: string, toAgent: string, payload: unknown, options?: {
        type?: string;
        projectId?: string;
        correlationId?: string;
        replyTo?: string;
    }): Promise<void>;
    broadcast(agentType: string, payload: unknown, projectId?: string): Promise<void>;
    getMessageHistory(projectId: string): TypedMessage[];
    subscribe(agentId: string, topic: string): void;
    onMessage(agentId: string, handler: (message: TypedMessage) => Promise<void>): void;
    getAgentHealth(agentId: string): AgentHealth | undefined;
    getAllHealthReports(): AgentHealth[];
    private updateHealth;
    private checkAgentHealth;
    startHealthChecks(): void;
    stopHealthChecks(): void;
    getRegisteredAgents(): IAgent[];
    process(input: unknown): Promise<unknown>;
    canHandle(input: unknown): boolean;
    getCapabilities(): string[];
    private initializeAIWorkforce;
    private getPermissionsForSpecialization;
    private getMemoryTypesForSpecialization;
    private getCapabilitiesForSpecialization;
    assignTask(task: AgentTask): Promise<string>;
    private checkDependencies;
    private executeTask;
    private simulateTaskExecution;
    initiateCollaboration(collaboration: AgentCollaboration): Promise<string>;
    private executeSequentialCollaboration;
    private executeParallelCollaboration;
    private executeHierarchicalCollaboration;
    private executePeerToPeerCollaboration;
    storeAgentMemory(agentId: string, memoryType: MemoryType, content: any, projectId?: string): Promise<void>;
    retrieveAgentMemory(agentId: string, memoryType?: MemoryType, projectId?: string): Promise<AgentMemory[]>;
    clearExpiredMemories(): Promise<void>;
    getAgentPerformance(agentId: string): Promise<AgentPerformance>;
    getAllAgentPerformance(): Promise<Map<string, AgentPerformance>>;
    evaluateAgent(agentId: string): Promise<EvaluationResult>;
    getWorkforceDashboard(): Promise<WorkforceDashboard>;
    routeTask(taskType: string, input: any, projectId: string): Promise<string>;
    private findBestAgentForTask;
}
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
export {};
//# sourceMappingURL=index.d.ts.map