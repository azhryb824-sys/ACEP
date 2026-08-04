"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestrator = exports.EngineeringMessageBus = void 0;
const uuid_1 = require("uuid");
class Logger {
    context;
    constructor(context) {
        this.context = context;
    }
    info(message, data) {
        console.log(`[${this.context}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    warn(message, data) {
        console.warn(`[${this.context}] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    error(message, data) {
        console.error(`[${this.context}] ERROR: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    debug(message, data) {
        console.debug(`[${this.context}] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    trace(message, data) {
        console.trace(`[${this.context}] TRACE: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
}
class MessageHistoryStore {
    messages = new Map();
    maxHistoryPerProject;
    constructor(maxHistoryPerProject = 10000) {
        this.maxHistoryPerProject = maxHistoryPerProject;
    }
    add(message) {
        const projectMessages = this.messages.get(message.projectId) || [];
        projectMessages.push(message);
        if (projectMessages.length > this.maxHistoryPerProject) {
            projectMessages.splice(0, projectMessages.length - this.maxHistoryPerProject);
        }
        this.messages.set(message.projectId, projectMessages);
    }
    getByProject(projectId) {
        return this.messages.get(projectId) || [];
    }
    getByAgent(agentId) {
        const result = [];
        for (const msgs of this.messages.values()) {
            for (const msg of msgs) {
                if (msg.fromAgent === agentId || msg.toAgent === agentId) {
                    result.push(msg);
                }
            }
        }
        return result;
    }
    getByType(type) {
        const result = [];
        for (const msgs of this.messages.values()) {
            for (const msg of msgs) {
                if (msg.type === type) {
                    result.push(msg);
                }
            }
        }
        return result;
    }
    getAll() {
        return this.messages;
    }
}
class DeadlockDetector {
    recentMessages = new Map();
    maxChainLength;
    constructor(maxChainLength = 50) {
        this.maxChainLength = maxChainLength;
    }
    getOrCreateTrace(projectId) {
        if (!this.recentMessages.has(projectId)) {
            this.recentMessages.set(projectId, new Set());
        }
        return this.recentMessages.get(projectId);
    }
    isLoopDetected(fromAgent, toAgent, projectId) {
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
    isDeadlockDetected(projectId) {
        const trace = this.getOrCreateTrace(projectId);
        if (trace.size >= this.maxChainLength) {
            return true;
        }
        return false;
    }
    resetProject(projectId) {
        this.recentMessages.delete(projectId);
    }
    reset() {
        this.recentMessages.clear();
    }
}
class SubscriptionManager {
    subscriptions = new Map();
    agentSubscriptions = new Map();
    subscribe(agentId, topic) {
        if (!this.subscriptions.has(topic)) {
            this.subscriptions.set(topic, new Set());
        }
        this.subscriptions.get(topic).add(agentId);
        if (!this.agentSubscriptions.has(agentId)) {
            this.agentSubscriptions.set(agentId, new Set());
        }
        this.agentSubscriptions.get(agentId).add(topic);
    }
    unsubscribe(agentId, topic) {
        this.subscriptions.get(topic)?.delete(agentId);
        this.agentSubscriptions.get(agentId)?.delete(topic);
    }
    getSubscribers(topic) {
        return Array.from(this.subscriptions.get(topic) || []);
    }
    getTopics(agentId) {
        return Array.from(this.agentSubscriptions.get(agentId) || []);
    }
    removeAgent(agentId) {
        const topics = this.agentSubscriptions.get(agentId);
        if (topics) {
            for (const topic of topics) {
                this.subscriptions.get(topic)?.delete(agentId);
            }
        }
        this.agentSubscriptions.delete(agentId);
    }
}
class EngineeringMessageBus {
    messageHistory;
    deadlockDetector;
    subscriptionManager;
    agents = new Map();
    logger;
    messageHandlers = new Map();
    constructor() {
        this.messageHistory = new MessageHistoryStore();
        this.deadlockDetector = new DeadlockDetector();
        this.subscriptionManager = new SubscriptionManager();
        this.logger = new Logger('EngineeringMessageBus');
    }
    registerAgent(agent) {
        this.agents.set(agent.id, agent);
        this.logger.info(`Agent registered on bus: ${agent.name} (${agent.id})`);
    }
    unregisterAgent(agentId) {
        this.agents.delete(agentId);
        this.subscriptionManager.removeAgent(agentId);
        this.logger.info(`Agent unregistered: ${agentId}`);
    }
    async sendMessage(fromAgent, toAgent, message) {
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
        const typedMessage = {
            ...message,
            id: message.id || (0, uuid_1.v4)(),
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
            }
            catch (error) {
                this.logger.error(`Handler error for ${toAgent}: ${error.message}`);
            }
        }
    }
    async broadcast(agentType, message) {
        const broadcastMessage = {
            ...message,
            id: (0, uuid_1.v4)(),
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
    subscribe(agentId, topic) {
        this.subscriptionManager.subscribe(agentId, topic);
        this.logger.info(`Agent ${agentId} subscribed to topic: ${topic}`);
    }
    unsubscribe(agentId, topic) {
        this.subscriptionManager.unsubscribe(agentId, topic);
    }
    onMessage(agentId, handler) {
        if (!this.messageHandlers.has(agentId)) {
            this.messageHandlers.set(agentId, []);
        }
        this.messageHandlers.get(agentId).push(handler);
    }
    getMessageHistory(projectId) {
        return this.messageHistory.getByProject(projectId);
    }
    getAgentMessageHistory(agentId) {
        return this.messageHistory.getByAgent(agentId);
    }
    getMessageHistoryByType(type) {
        return this.messageHistory.getByType(type);
    }
    getFullHistory() {
        return this.messageHistory.getAll();
    }
    resetProject(projectId) {
        this.deadlockDetector.resetProject(projectId);
    }
    resetAll() {
        this.deadlockDetector.reset();
    }
}
exports.EngineeringMessageBus = EngineeringMessageBus;
class AgentOrchestrator {
    id = 'agent-orchestrator';
    type = 'orchestrator';
    name = 'Chief AI Orchestrator';
    messageBus;
    logger;
    agentHealth = new Map();
    registeredAgents = new Map();
    aiWorkforce = new Map();
    tasks = new Map();
    collaborations = new Map();
    agentMemories = new Map();
    healthCheckInterval = null;
    healthCheckPeriodMs;
    constructor(healthCheckPeriodMs = 30000) {
        this.messageBus = new EngineeringMessageBus();
        this.logger = new Logger('ChiefAIOrchestrator');
        this.healthCheckPeriodMs = healthCheckPeriodMs;
        this.initializeAIWorkforce();
    }
    getMessageBus() {
        return this.messageBus;
    }
    registerAgent(agent) {
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
    unregisterAgent(agentId) {
        this.registeredAgents.delete(agentId);
        this.messageBus.unregisterAgent(agentId);
        this.agentHealth.delete(agentId);
        this.logger.info(`Agent unregistered: ${agentId}`);
    }
    async sendMessage(fromAgent, toAgent, payload, options) {
        const message = {
            id: (0, uuid_1.v4)(),
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
    async broadcast(agentType, payload, projectId) {
        const message = {
            id: (0, uuid_1.v4)(),
            fromAgent: this.id,
            toAgent: '',
            type: 'broadcast',
            payload,
            projectId: projectId || 'default',
            timestamp: new Date().toISOString()
        };
        await this.messageBus.broadcast(agentType, message);
    }
    getMessageHistory(projectId) {
        return this.messageBus.getMessageHistory(projectId);
    }
    subscribe(agentId, topic) {
        this.messageBus.subscribe(agentId, topic);
    }
    onMessage(agentId, handler) {
        this.messageBus.onMessage(agentId, handler);
    }
    getAgentHealth(agentId) {
        return this.agentHealth.get(agentId);
    }
    getAllHealthReports() {
        return Array.from(this.agentHealth.values());
    }
    updateHealth(agentId, success) {
        const health = this.agentHealth.get(agentId);
        if (health) {
            health.lastHeartbeat = new Date().toISOString();
            health.messageCount++;
            if (!success) {
                health.errorCount++;
            }
        }
    }
    async checkAgentHealth(agent) {
        try {
            const result = await agent.process({ type: 'health-check' });
            return result !== null;
        }
        catch {
            return false;
        }
    }
    startHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        this.healthCheckInterval = setInterval(async () => {
            for (const [agentId, agent] of this.registeredAgents) {
                const health = this.agentHealth.get(agentId);
                if (!health)
                    continue;
                try {
                    const isHealthy = await this.checkAgentHealth(agent);
                    health.status = isHealthy ? 'healthy' : 'unhealthy';
                    if (!isHealthy) {
                        this.logger.warn(`Agent ${agent.name} (${agentId}) is unhealthy`);
                    }
                }
                catch (error) {
                    health.status = 'unhealthy';
                    health.errorCount++;
                    this.logger.error(`Health check failed for ${agent.name}: ${error.message}`);
                }
            }
        }, this.healthCheckPeriodMs);
        this.logger.info(`Health checks started (interval: ${this.healthCheckPeriodMs}ms)`);
    }
    stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            this.logger.info('Health checks stopped');
        }
    }
    getRegisteredAgents() {
        return Array.from(this.registeredAgents.values());
    }
    async process(input) {
        const request = input;
        if (!request || !request.type) {
            throw new Error('Invalid request: type is required');
        }
        this.logger.info(`Processing request: ${request.type}`);
        return { status: 'processed', type: request.type };
    }
    canHandle(input) {
        return input !== null && typeof input === 'object' && 'type' in input;
    }
    getCapabilities() {
        return ['message-routing', 'broadcast', 'health-monitoring', 'message-history', 'task-orchestration', 'agent-collaboration', 'memory-management', 'performance-tracking'];
    }
    // Volume 31: AI Workforce Management
    initializeAIWorkforce() {
        this.logger.info('Initializing AI Workforce');
        const specializations = [
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
            const agent = {
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
    getPermissionsForSpecialization(spec) {
        const permissionMap = {
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
    getMemoryTypesForSpecialization(spec) {
        const memoryMap = {
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
    getCapabilitiesForSpecialization(spec) {
        const capabilityMap = {
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
    async assignTask(task) {
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
    async checkDependencies(dependencies) {
        for (const depId of dependencies) {
            const depTask = this.tasks.get(depId);
            if (!depTask || depTask.status !== 'Completed') {
                return false;
            }
        }
        return true;
    }
    async executeTask(task) {
        this.logger.info(`Executing task ${task.taskId}`);
        const agent = this.aiWorkforce.get(task.assignedTo);
        if (!agent)
            return;
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
        }
        catch (error) {
            task.status = 'Failed';
            task.completedAt = new Date();
            agent.status = 'Idle';
            agent.currentTask = undefined;
            agent.performance.tasksFailed++;
            this.logger.error(`Task ${task.taskId} failed: ${error.message}`);
        }
    }
    async simulateTaskExecution(task) {
        // Simulate task execution time
        const executionTime = task.estimatedDuration * (0.8 + Math.random() * 0.4);
        await new Promise(resolve => setTimeout(resolve, executionTime));
    }
    // Volume 31: Agent Collaboration
    async initiateCollaboration(collaboration) {
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
    async executeSequentialCollaboration(collaboration) {
        for (const task of collaboration.tasks) {
            await this.executeTask(task);
        }
        collaboration.status = 'Completed';
        collaboration.endTime = new Date();
    }
    async executeParallelCollaboration(collaboration) {
        const promises = collaboration.tasks.map(task => this.executeTask(task));
        await Promise.all(promises);
        collaboration.status = 'Completed';
        collaboration.endTime = new Date();
    }
    async executeHierarchicalCollaboration(collaboration) {
        // Execute tasks in hierarchical order
        const sortedTasks = collaboration.tasks.sort((a, b) => a.priority.localeCompare(b.priority));
        for (const task of sortedTasks) {
            await this.executeTask(task);
        }
        collaboration.status = 'Completed';
        collaboration.endTime = new Date();
    }
    async executePeerToPeerCollaboration(collaboration) {
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
    async storeAgentMemory(agentId, memoryType, content, projectId) {
        const memory = {
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
        this.agentMemories.get(agentId).push(memory);
        this.logger.info(`Stored memory for agent ${agentId}: ${memory.memoryId}`);
    }
    async retrieveAgentMemory(agentId, memoryType, projectId) {
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
    async clearExpiredMemories() {
        const now = new Date();
        for (const [agentId, memories] of this.agentMemories) {
            const validMemories = memories.filter(m => !m.expiresAt || m.expiresAt > now);
            this.agentMemories.set(agentId, validMemories);
        }
        this.logger.info('Cleared expired memories');
    }
    // Volume 31: Performance Tracking
    async getAgentPerformance(agentId) {
        const agent = this.aiWorkforce.get(agentId);
        if (!agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }
        return agent.performance;
    }
    async getAllAgentPerformance() {
        const performance = new Map();
        this.aiWorkforce.forEach((agent, agentId) => {
            performance.set(agentId, agent.performance);
        });
        return performance;
    }
    async evaluateAgent(agentId) {
        const agent = this.aiWorkforce.get(agentId);
        if (!agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }
        const totalTasks = agent.performance.tasksCompleted + agent.performance.tasksFailed;
        const successRate = totalTasks > 0 ? agent.performance.tasksCompleted / totalTasks : 0;
        const evaluation = {
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
    async getWorkforceDashboard() {
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
    async routeTask(taskType, input, projectId) {
        this.logger.info(`Routing task of type ${taskType}`);
        // Find best agent for the task
        const bestAgent = this.findBestAgentForTask(taskType);
        if (!bestAgent) {
            throw new Error(`No suitable agent found for task type: ${taskType}`);
        }
        const task = {
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
    findBestAgentForTask(taskType) {
        const taskAgentMap = {
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
        if (!specialization)
            return null;
        const agent = Array.from(this.aiWorkforce.values()).find(a => a.specialization === specialization);
        return agent || null;
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
//# sourceMappingURL=index.js.map