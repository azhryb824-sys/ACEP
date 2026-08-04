"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineeringBrain = void 0;
const uuid_1 = require("uuid");
const knowledge_base_1 = require("@acep/knowledge-base");
const ENGINE_PIPELINE_ORDER = [
    'project-understanding',
    'question',
    'knowledge',
    'reasoning',
    'virtual-building',
    'boq',
    'quantity',
    'cost',
    'labor',
    'equipment',
    'schedule',
    'risk',
    'validation',
    'self-audit'
];
const INPUT_TYPE_TO_AGENT = {
    'project-description': 'project-understanding',
    'question-answer': 'question',
    'knowledge-query': 'knowledge',
    'change-order': 'validation',
    'cost-query': 'cost',
    'schedule-view': 'schedule',
    'risk-check': 'risk',
    'compliance-check': 'compliance',
    'boq-export': 'boq',
    'quantity-check': 'quantity',
    'labor-query': 'labor',
    'equipment-query': 'equipment'
};
class DecisionTraceRecorder {
    records = new Map();
    record(record) {
        const projectRecords = this.records.get(record.projectId) || [];
        projectRecords.push(record);
        this.records.set(record.projectId, projectRecords);
    }
    getProjectRecords(projectId) {
        return this.records.get(projectId) || [];
    }
    getAllRecords() {
        return this.records;
    }
    clearProject(projectId) {
        this.records.delete(projectId);
    }
}
class AgentRegistryEntry {
    agent;
    dependencies;
    constructor(agent, dependencies) {
        this.agent = agent;
        this.dependencies = dependencies;
    }
}
class AgentRegistry {
    agents = new Map();
    dependencyGraph = new Map();
    register(agent, dependencies = []) {
        this.agents.set(agent.type, new AgentRegistryEntry(agent, dependencies));
        this.dependencyGraph.set(agent.type, dependencies);
        for (const dep of dependencies) {
            if (!this.dependencyGraph.has(dep)) {
                this.dependencyGraph.set(dep, []);
            }
        }
    }
    getAgent(type) {
        return this.agents.get(type)?.agent;
    }
    getDependencies(type) {
        return this.agents.get(type)?.dependencies || [];
    }
    getAffectedByChange(changedType) {
        const affected = [changedType];
        for (const [agentType, entry] of this.agents) {
            if (entry.dependencies.includes(changedType) && !affected.includes(agentType)) {
                affected.push(agentType);
            }
        }
        return affected;
    }
    getAllAgents() {
        return Array.from(this.agents.values()).map(e => e.agent);
    }
    getTypes() {
        return Array.from(this.agents.keys());
    }
}
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
class ProjectUnderstandingAgent {
    id = 'agent-project-understanding';
    type = 'project-understanding';
    name = 'Project Understanding Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Processing project description');
        const description = input;
        const facts = {
            projectType: { value: 'Villa', confidence: 0.7, source: 'user-input', factType: 'Derived' },
            spaces: {},
            systems: {},
            materials: {},
            rawDescription: description,
            confidence: 0.7,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
        this.logger.info('Project understanding complete', { confidence: facts.confidence });
        return facts;
    }
    canHandle(input) {
        return typeof input === 'string' && input.length > 0;
    }
    getCapabilities() {
        return ['project-understanding', 'entity-extraction', 'conflict-detection'];
    }
}
class QuestionAgent {
    id = 'agent-question';
    type = 'question';
    name = 'Question Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Generating questions from facts');
        const facts = input;
        const questions = [
            {
                id: (0, uuid_1.v4)(),
                type: 'Confirmation',
                title: 'تأكيد نوع المشروع',
                description: `هل نوع المشروع هو ${facts.projectType.value}؟`,
                impact: 'يؤثر على جميع الحسابات اللاحقة',
                priority: 1,
                informationGain: 0.9,
                affectedItems: [],
                affectedQuantities: [],
                affectedCost: true,
                affectedLabor: true,
                affectedSchedule: true,
                affectedRisk: true,
                options: ['نعم', 'لا']
            }
        ];
        this.logger.info(`Generated ${questions.length} questions`);
        return questions;
    }
    canHandle(input) {
        return input !== null && typeof input === 'object' && 'projectType' in input;
    }
    getCapabilities() {
        return ['question-generation', 'question-ranking', 'answer-processing'];
    }
}
class KnowledgeAgent {
    id = 'agent-knowledge';
    type = 'knowledge';
    name = 'Knowledge Agent';
    logger = new Logger(this.name);
    kb = new knowledge_base_1.KnowledgeBaseManager();
    async process(input) {
        this.logger.info('Querying knowledge base');
        const facts = input;
        const knowledge = await this.kb.query(facts.projectType.value);
        this.logger.info('Knowledge retrieved', { knowledgeType: typeof knowledge });
        return knowledge;
    }
    canHandle(input) {
        return input !== null && typeof input === 'object';
    }
    getCapabilities() {
        return ['knowledge-query', 'relation-discovery', 'knowledge-validation'];
    }
}
class ReasoningAgent {
    id = 'agent-reasoning';
    type = 'reasoning';
    name = 'Reasoning Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Running reasoning engine');
        const { facts } = input;
        const traces = [
            {
                ruleId: 'rule-project-type-defaults',
                facts: ['projectType'],
                conditions: [{ fact: 'projectType', operator: 'equals', value: facts.projectType.value }],
                matched: true,
                actions: [{ type: 'set', target: 'defaultFloorCount', value: 2, confidence: 0.85 }],
                confidence: 0.85,
                timestamp: new Date().toISOString()
            }
        ];
        this.logger.info(`Reasoning complete: ${traces.length} traces`);
        return { traces, facts };
    }
    canHandle(input) {
        return input !== null && typeof input === 'object';
    }
    getCapabilities() {
        return ['reasoning', 'logical-error-detection', 'alternative-suggestion'];
    }
}
class VirtualBuildingAgent {
    id = 'agent-virtual-building';
    type = 'virtual-building';
    name = 'Virtual Building Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Building virtual building model');
        const facts = input;
        const building = {
            id: (0, uuid_1.v4)(),
            projectType: 'Villa',
            skeleton: { numFloors: 2, hasBasement: false, hasRoof: true, hasParking: false, hasGarden: false, totalHeight: 8 },
            floors: [{ id: (0, uuid_1.v4)(), number: 1, name: 'Ground Floor', height: 4, spaces: [], area: 300 }],
            spaces: [],
            structural: { foundation: [], columns: [], beams: [], slabs: [], shearWalls: [], stairs: [], retainingWalls: [], expansionJoints: [] },
            architectural: { walls: [], doors: [], windows: [], ceilings: [], floorFinishes: [], waterproofing: [], paints: [], claddings: [] },
            mep: {
                electrical: { hasMainPanel: true, hasSubPanels: false, totalLoad: 0, lightingPoints: 0, powerPoints: 0, cableLength: 0, conduitLength: 0 },
                plumbing: { waterSupplyPoints: 0, drainagePoints: 0, pipeLength: 0, fixtures: 0 },
                hvac: { type: 'Split', capacity: 0, units: 0, ductLength: 0, pipeLength: 0 },
                fireFighting: { type: 'None', sprinklers: 0, hoseReels: 0, extinguishers: 0, pipeLength: 0, pumpCapacity: 0 },
                fireAlarm: { detectors: 0, manualCallPoints: 0, alarmBells: 0, controlPanel: false, cableLength: 0 },
                gas: { hasGas: false, pipeLength: 0, valves: 0, detectors: 0 },
                cctv: { cameras: 0, cableLength: 0, recordingHours: 0 },
                accessControl: { doors: 0, readers: 0, controller: false },
                dataNetwork: { dataPoints: 0, cableLength: 0, racks: 0, switches: 0 },
                publicAddress: { speakers: 0, amplifier: false, cableLength: 0 },
                bms: { hasBMS: false, points: 0, controller: false },
                solar: { hasSolar: false, panels: 0, capacity: 0, inverterCapacity: 0 },
                drainage: { stormDrainage: false, sanitaryDrainage: false, pipeLength: 0, manholes: 0 },
                elevator: { count: 0, capacity: 0, speed: 0, hasMachineRoom: false, stops: 0 }
            },
            outdoor: { fences: [], gates: [], parking: [], walkways: [], landscape: [], irrigation: { hasIrrigation: false, area: 0, type: '', pipeLength: 0 }, outdoorLighting: { poles: 0, poleHeight: 0, lightType: '', cableLength: 0 }, waterTanks: [], pumpRooms: [] },
            metadata: { version: '1.0.0', created: new Date().toISOString(), updated: new Date().toISOString(), confidence: 0.8, source: 'engineering-brain', faktType: 'Derived' }
        };
        this.logger.info('Virtual building created', { id: building.id });
        return building;
    }
    canHandle(input) {
        return input !== null && typeof input === 'object';
    }
    getCapabilities() {
        return ['building-generation', 'space-generation', 'structure-generation', 'mep-generation'];
    }
}
class BOQAgent {
    id = 'agent-boq';
    type = 'boq';
    name = 'BOQ Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Generating BOQ from building model');
        const building = input;
        const boq = {
            id: (0, uuid_1.v4)(),
            projectId: building.id,
            name: 'Bill of Quantities',
            version: '1.0.0',
            items: [],
            summary: {
                totalItems: 0, confirmedItems: 0, derivedItems: 0, suggestedItems: 0,
                conditionalItems: 0, optionalItems: 0, missingItems: 0,
                totalCost: 0, totalQuantity: 0, confidence: 0.85
            },
            metadata: {
                createdBy: 'engineering-brain', createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(), status: 'Draft',
                version: '1.0.0', knowledgeVersion: '1.0.0'
            }
        };
        this.logger.info('BOQ generated', { totalItems: boq.items.length });
        return boq;
    }
    canHandle(input) {
        return input !== null && typeof input === 'object' && 'skeleton' in input;
    }
    getCapabilities() {
        return ['boq-generation', 'template-matching', 'item-merging', 'missing-item-detection'];
    }
}
class QuantityAgent {
    id = 'agent-quantity';
    type = 'quantity';
    name = 'Quantity Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Calculating quantities');
        const { building, boq } = input;
        this.logger.info('Quantities calculated', { itemCount: boq.items.length });
        return boq;
    }
    canHandle(input) {
        return input !== null && typeof input === 'object' && 'boq' in input;
    }
    getCapabilities() {
        return ['quantity-calculation', 'formula-evaluation', 'outlier-detection', 'quantity-validation'];
    }
}
class CostAgent {
    id = 'agent-cost';
    type = 'cost';
    name = 'Cost Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Calculating costs');
        const boq = input;
        const cost = {
            materials: [],
            labor: [],
            equipment: [],
            indirect: [],
            totalDirectCost: 0,
            totalIndirectCost: 0,
            riskContingency: 0,
            profit: 0,
            taxes: 0,
            totalCost: 0,
            currency: 'SAR',
            confidence: 0.85
        };
        this.logger.info('Cost calculation complete', { totalCost: cost.totalCost });
        return cost;
    }
    canHandle(input) {
        return input !== null && typeof input === 'object' && 'items' in input;
    }
    getCapabilities() {
        return ['cost-calculation', 'price-lookup', 'supplier-comparison', 'sensitivity-analysis'];
    }
}
class LaborAgent {
    id = 'agent-labor';
    type = 'labor';
    name = 'Labor Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Calculating labor requirements');
        const labor = [];
        this.logger.info('Labor calculation complete', { crewCount: labor.length });
        return labor;
    }
    canHandle(input) {
        return input !== null && typeof input === 'object';
    }
    getCapabilities() {
        return ['labor-calculation', 'crew-building', 'crew-optimization', 'productivity-lookup'];
    }
}
class EquipmentAgent {
    id = 'agent-equipment';
    type = 'equipment';
    name = 'Equipment Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Determining equipment requirements');
        const equipment = [];
        this.logger.info('Equipment determination complete', { equipmentCount: equipment.length });
        return equipment;
    }
    canHandle(input) {
        return input !== null && typeof input === 'object';
    }
    getCapabilities() {
        return ['equipment-determination', 'equipment-selection', 'utilization-calculation', 'equipment-scheduling'];
    }
}
class ScheduleAgent {
    id = 'agent-schedule';
    type = 'schedule';
    name = 'Schedule Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Generating schedule');
        const activities = [];
        this.logger.info('Schedule generated', { activityCount: activities.length });
        return activities;
    }
    canHandle(input) {
        return input !== null && typeof input === 'object';
    }
    getCapabilities() {
        return ['schedule-generation', 'duration-calculation', 'network-building', 'conflict-detection'];
    }
}
class RiskAgent {
    id = 'agent-risk';
    type = 'risk';
    name = 'Risk Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Detecting risks');
        const risks = [];
        this.logger.info('Risk detection complete', { riskCount: risks.length });
        return risks;
    }
    canHandle(input) {
        return input !== null && typeof input === 'object';
    }
    getCapabilities() {
        return ['risk-detection', 'risk-analysis', 'risk-scoring', 'mitigation-generation'];
    }
}
class ValidationAgent {
    id = 'agent-validation';
    type = 'validation';
    name = 'Validation Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Validating project outputs');
        const result = { valid: true, issues: [] };
        this.logger.info('Validation complete', { valid: result.valid, issues: result.issues.length });
        return result;
    }
    canHandle(input) {
        return input !== null;
    }
    getCapabilities() {
        return ['output-validation', 'consistency-check', 'completeness-check'];
    }
}
class EngineeringBrain {
    id = 'engineering-brain';
    name = 'Engineering Brain';
    version = '1.0.0';
    registry;
    tracer;
    logger;
    projectResults = new Map();
    constructor() {
        this.registry = new AgentRegistry();
        this.tracer = new DecisionTraceRecorder();
        this.logger = new Logger('EngineeringBrain');
        this.registerDefaultAgents();
    }
    registerDefaultAgents() {
        const agents = [
            [new ProjectUnderstandingAgent(), []],
            [new QuestionAgent(), ['project-understanding']],
            [new KnowledgeAgent(), ['project-understanding']],
            [new ReasoningAgent(), ['project-understanding', 'knowledge']],
            [new VirtualBuildingAgent(), ['reasoning']],
            [new BOQAgent(), ['virtual-building']],
            [new QuantityAgent(), ['boq']],
            [new CostAgent(), ['quantity']],
            [new LaborAgent(), ['quantity']],
            [new EquipmentAgent(), ['quantity']],
            [new ScheduleAgent(), ['labor', 'equipment']],
            [new RiskAgent(), ['virtual-building', 'schedule']],
            [new ValidationAgent(), ['risk', 'schedule', 'cost']]
        ];
        for (const [agent, deps] of agents) {
            this.registry.register(agent, deps);
        }
    }
    registerAgent(agent, dependencies = []) {
        this.registry.register(agent, dependencies);
        this.logger.info(`Agent registered: ${agent.name} (${agent.type})`);
    }
    getRegistry() {
        return this.registry;
    }
    getTracer() {
        return this.tracer;
    }
    async orchestrate(projectId, input) {
        this.logger.info(`Starting orchestration for project ${projectId}`);
        const results = new Map();
        this.projectResults.set(projectId, results);
        for (const step of ENGINE_PIPELINE_ORDER) {
            const agent = this.registry.getAgent(step);
            if (!agent) {
                this.logger.warn(`No agent registered for step: ${step}, skipping`);
                continue;
            }
            try {
                this.logger.info(`Running step: ${step}`);
                let stepInput = input;
                const previousSteps = this.registry.getDependencies(step);
                if (previousSteps.length > 0) {
                    const context = { originalInput: input };
                    for (const dep of previousSteps) {
                        if (results.has(dep)) {
                            context[dep.replace('-', '')] = results.get(dep);
                        }
                    }
                    stepInput = context;
                }
                const agentInput = previousSteps.length > 0 ? stepInput : input;
                const result = await agent.process(agentInput);
                results.set(step, result);
                const record = {
                    id: (0, uuid_1.v4)(),
                    projectId,
                    factsUsed: [],
                    rulesUsed: [],
                    alternatives: [],
                    selectedOption: step,
                    reason: `Pipeline step ${step} completed successfully`,
                    confidence: 0.9,
                    knowledgeVersion: '1.0.0',
                    agentId: agent.id,
                    timestamp: new Date().toISOString(),
                    trace: []
                };
                this.tracer.record(record);
                this.logger.info(`Step ${step} completed`);
            }
            catch (error) {
                this.logger.error(`Step ${step} failed: ${error.message}`);
                const record = {
                    id: (0, uuid_1.v4)(),
                    projectId,
                    factsUsed: [],
                    rulesUsed: [],
                    alternatives: [],
                    selectedOption: 'none',
                    reason: `Pipeline step ${step} failed: ${error.message}`,
                    confidence: 0,
                    knowledgeVersion: '1.0.0',
                    agentId: 'engineering-brain',
                    timestamp: new Date().toISOString(),
                    trace: []
                };
                this.tracer.record(record);
            }
        }
        this.logger.info(`Orchestration complete for project ${projectId}`);
        return Object.fromEntries(results);
    }
    determineAgent(input) {
        if (typeof input === 'string') {
            const agent = this.registry.getAgent(INPUT_TYPE_TO_AGENT['project-description']);
            if (agent)
                return agent;
        }
        if (input !== null && typeof input === 'object') {
            const obj = input;
            if ('answers' in obj || 'question' in obj) {
                const agent = this.registry.getAgent('question');
                if (agent)
                    return agent;
            }
            if ('building' in obj || 'virtualBuilding' in obj) {
                const agent = this.registry.getAgent('boq');
                if (agent)
                    return agent;
            }
            if ('boq' in obj || 'items' in obj) {
                const agent = this.registry.getAgent('quantity');
                if (agent)
                    return agent;
            }
            if ('cost' in obj || 'prices' in obj) {
                const agent = this.registry.getAgent('cost');
                if (agent)
                    return agent;
            }
        }
        const first = this.registry.getAgent(ENGINE_PIPELINE_ORDER[0]);
        if (first)
            return first;
        throw new Error('No suitable agent found for input');
    }
    async runPipeline(projectId, pipeline) {
        this.logger.info(`Running custom pipeline for project ${projectId}: ${pipeline.join(' -> ')}`);
        const results = new Map();
        for (const step of pipeline) {
            const agent = this.registry.getAgent(step);
            if (!agent) {
                this.logger.warn(`Agent not found for step: ${step}`);
                continue;
            }
            try {
                const result = await agent.process(results);
                results.set(step, result);
                this.logger.info(`Pipeline step ${step} completed`);
            }
            catch (error) {
                this.logger.error(`Pipeline step ${step} failed: ${error.message}`);
            }
        }
        return Object.fromEntries(results);
    }
    async handleChange(projectId, changes) {
        this.logger.info(`Handling changes for project ${projectId}`);
        const changeObj = changes;
        const changedType = changeObj?.type || 'project-understanding';
        const affectedAgents = this.registry.getAffectedByChange(changedType);
        this.logger.info(`Affected agents: ${affectedAgents.join(', ')}`);
        const results = this.projectResults.get(projectId) || new Map();
        for (const agentType of affectedAgents) {
            const agent = this.registry.getAgent(agentType);
            if (!agent)
                continue;
            try {
                this.logger.info(`Re-running agent due to change: ${agentType}`);
                const deps = this.registry.getDependencies(agentType);
                const context = {};
                for (const dep of deps) {
                    if (results.has(dep)) {
                        context[dep.replace('-', '')] = results.get(dep);
                    }
                }
                const result = await agent.process(Object.keys(context).length > 0 ? context : changes);
                results.set(agentType, result);
                this.logger.info(`Re-run of ${agentType} completed`);
            }
            catch (error) {
                this.logger.error(`Re-run of ${agentType} failed: ${error.message}`);
            }
        }
        this.logger.info('Change handling complete');
    }
    getProjectResults(projectId) {
        return this.projectResults.get(projectId);
    }
}
exports.EngineeringBrain = EngineeringBrain;
//# sourceMappingURL=index.js.map