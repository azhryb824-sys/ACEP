"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRegistry = exports.ApiGateway = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const uuid_1 = require("uuid");
class ServiceRegistry {
    services = new Map();
    register(name, instance) {
        this.services.set(name, instance);
    }
    get(name) {
        return this.services.get(name);
    }
    getAll() {
        return this.services;
    }
}
exports.ServiceRegistry = ServiceRegistry;
class ProjectEngineStub {
    id = 'project-engine';
    name = 'Project Understanding Engine';
    async execute(action, payload) {
        switch (action) {
            case 'understand':
                return { projectId: (0, uuid_1.v4)(), facts: payload, status: 'understood', confidence: 0.85 };
            case 'describe':
                return { projectId: payload.projectId, description: payload.text };
            case 'getById':
                return { id: payload, name: 'Sample Project', status: 'Draft', createdAt: new Date().toISOString() };
            case 'answerQuestion':
                return { questionId: (0, uuid_1.v4)(), answer: payload.answer, processed: true };
            case 'getBOQ':
                return { projectId: payload, items: [], summary: { totalItems: 0, totalCost: 0, confidence: 0 } };
            case 'getCost':
                return { projectId: payload, totalCost: 0, breakdown: {} };
            case 'getSchedule':
                return { projectId: payload, activities: [], criticalPath: [] };
            case 'getRisks':
                return { projectId: payload, risks: [], riskScore: 0 };
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
}
class AgentEngineStub {
    id = 'agent-engine';
    name = 'Agent Engine';
    async execute(action, payload) {
        if (action === 'execute') {
            return { executionId: (0, uuid_1.v4)(), agentType: payload.agentType, result: {}, status: 'completed' };
        }
        throw new Error(`Unknown action: ${action}`);
    }
}
class PluginEngineStub {
    id = 'plugin-engine';
    name = 'Plugin Engine';
    async execute(action, payload) {
        if (action === 'install') {
            return { pluginId: (0, uuid_1.v4)(), name: payload.name, installed: true };
        }
        if (action === 'list') {
            return { plugins: [] };
        }
        throw new Error(`Unknown action: ${action}`);
    }
}
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ error: 'Unauthorized', message: 'Missing authorization header' });
        return;
    }
    next();
}
function requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
}
class ApiGateway {
    app;
    registry;
    port;
    constructor(port = 8080) {
        this.port = port;
        this.app = (0, express_1.default)();
        this.registry = new ServiceRegistry();
        this.registerServices();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandler();
    }
    registerServices() {
        this.registry.register('project', new ProjectEngineStub());
        this.registry.register('agent', new AgentEngineStub());
        this.registry.register('plugin', new PluginEngineStub());
    }
    setupMiddleware() {
        this.app.use((0, cors_1.default)({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
        this.app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
        this.app.use((0, compression_1.default)());
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.app.use(requestLogger);
    }
    setupRoutes() {
        const routes = [
            { path: '/api/v1/health', method: 'get', handler: this.healthCheck, auth: false },
            { path: '/api/v1/projects/understand', method: 'post', handler: this.handleUnderstand, auth: true },
            { path: '/api/v1/projects/describe', method: 'post', handler: this.handleDescribe, auth: true },
            { path: '/api/v1/projects/:id', method: 'get', handler: this.handleGetProject, auth: true },
            { path: '/api/v1/projects/:id/questions/answer', method: 'post', handler: this.handleAnswerQuestion, auth: true },
            { path: '/api/v1/projects/:id/boq', method: 'get', handler: this.handleGetBOQ, auth: true },
            { path: '/api/v1/projects/:id/cost', method: 'get', handler: this.handleGetCost, auth: true },
            { path: '/api/v1/projects/:id/schedule', method: 'get', handler: this.handleGetSchedule, auth: true },
            { path: '/api/v1/projects/:id/risks', method: 'get', handler: this.handleGetRisks, auth: true },
            { path: '/api/v1/agents/execute', method: 'post', handler: this.handleAgentExecute, auth: true },
            { path: '/api/v1/plugins/install', method: 'post', handler: this.handlePluginInstall, auth: true },
            { path: '/api/v1/plugins/list', method: 'get', handler: this.handlePluginList, auth: true },
        ];
        for (const route of routes) {
            const handlers = [];
            if (route.auth) {
                handlers.push(authMiddleware);
            }
            handlers.push(route.handler.bind(this));
            this.app[route.method](route.path, ...handlers);
        }
    }
    setupErrorHandler() {
        this.app.use((err, req, res, _next) => {
            console.error(`[ERROR] ${err.message}`, err.stack);
            res.status(500).json({
                error: 'InternalServerError',
                message: err.message,
                timestamp: new Date().toISOString(),
            });
        });
    }
    async healthCheck(req, res) {
        res.json({
            status: 'ok',
            service: 'api-gateway',
            version: '1.0.0',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    }
    async handleUnderstand(req, res) {
        try {
            const { description } = req.body;
            if (!description) {
                res.status(400).json({ error: 'ValidationError', message: 'description is required' });
                return;
            }
            const projectService = this.registry.get('project');
            if (!projectService) {
                res.status(503).json({ error: 'ServiceUnavailable', message: 'Project service not available' });
                return;
            }
            const result = await projectService.execute('understand', { description });
            res.status(200).json(result);
        }
        catch (err) {
            res.status(500).json({ error: 'EngineError', message: err.message });
        }
    }
    async handleDescribe(req, res) {
        try {
            const { projectId, text } = req.body;
            if (!projectId || !text) {
                res.status(400).json({ error: 'ValidationError', message: 'projectId and text are required' });
                return;
            }
            const projectService = this.registry.get('project');
            if (!projectService) {
                res.status(503).json({ error: 'ServiceUnavailable', message: 'Project service not available' });
                return;
            }
            const result = await projectService.execute('describe', { projectId, text });
            res.status(200).json(result);
        }
        catch (err) {
            res.status(500).json({ error: 'EngineError', message: err.message });
        }
    }
    async handleGetProject(req, res) {
        try {
            const { id } = req.params;
            const projectService = this.registry.get('project');
            if (!projectService) {
                res.status(503).json({ error: 'ServiceUnavailable', message: 'Project service not available' });
                return;
            }
            const result = await projectService.execute('getById', id);
            if (!result) {
                res.status(404).json({ error: 'NotFound', message: `Project ${id} not found` });
                return;
            }
            res.status(200).json(result);
        }
        catch (err) {
            res.status(500).json({ error: 'EngineError', message: err.message });
        }
    }
    async handleAnswerQuestion(req, res) {
        try {
            const { id } = req.params;
            const { questionId, answer } = req.body;
            if (!questionId || !answer) {
                res.status(400).json({ error: 'ValidationError', message: 'questionId and answer are required' });
                return;
            }
            const projectService = this.registry.get('project');
            if (!projectService) {
                res.status(503).json({ error: 'ServiceUnavailable' });
                return;
            }
            const result = await projectService.execute('answerQuestion', { projectId: id, questionId, answer });
            res.status(200).json(result);
        }
        catch (err) {
            res.status(500).json({ error: 'EngineError', message: err.message });
        }
    }
    async handleGetBOQ(req, res) {
        try {
            const { id } = req.params;
            const projectService = this.registry.get('project');
            if (!projectService) {
                res.status(503).json({ error: 'ServiceUnavailable' });
                return;
            }
            const result = await projectService.execute('getBOQ', id);
            res.status(200).json(result);
        }
        catch (err) {
            res.status(500).json({ error: 'EngineError', message: err.message });
        }
    }
    async handleGetCost(req, res) {
        try {
            const { id } = req.params;
            const projectService = this.registry.get('project');
            if (!projectService) {
                res.status(503).json({ error: 'ServiceUnavailable' });
                return;
            }
            const result = await projectService.execute('getCost', id);
            res.status(200).json(result);
        }
        catch (err) {
            res.status(500).json({ error: 'EngineError', message: err.message });
        }
    }
    async handleGetSchedule(req, res) {
        try {
            const { id } = req.params;
            const projectService = this.registry.get('project');
            if (!projectService) {
                res.status(503).json({ error: 'ServiceUnavailable' });
                return;
            }
            const result = await projectService.execute('getSchedule', id);
            res.status(200).json(result);
        }
        catch (err) {
            res.status(500).json({ error: 'EngineError', message: err.message });
        }
    }
    async handleGetRisks(req, res) {
        try {
            const { id } = req.params;
            const projectService = this.registry.get('project');
            if (!projectService) {
                res.status(503).json({ error: 'ServiceUnavailable' });
                return;
            }
            const result = await projectService.execute('getRisks', id);
            res.status(200).json(result);
        }
        catch (err) {
            res.status(500).json({ error: 'EngineError', message: err.message });
        }
    }
    async handleAgentExecute(req, res) {
        try {
            const { agentType, input } = req.body;
            if (!agentType) {
                res.status(400).json({ error: 'ValidationError', message: 'agentType is required' });
                return;
            }
            const agentService = this.registry.get('agent');
            if (!agentService) {
                res.status(503).json({ error: 'ServiceUnavailable' });
                return;
            }
            const result = await agentService.execute('execute', { agentType, input });
            res.status(200).json(result);
        }
        catch (err) {
            res.status(500).json({ error: 'EngineError', message: err.message });
        }
    }
    async handlePluginInstall(req, res) {
        try {
            const { name, source } = req.body;
            if (!name) {
                res.status(400).json({ error: 'ValidationError', message: 'name is required' });
                return;
            }
            const pluginService = this.registry.get('plugin');
            if (!pluginService) {
                res.status(503).json({ error: 'ServiceUnavailable' });
                return;
            }
            const result = await pluginService.execute('install', { name, source });
            res.status(200).json(result);
        }
        catch (err) {
            res.status(500).json({ error: 'EngineError', message: err.message });
        }
    }
    async handlePluginList(req, res) {
        try {
            const pluginService = this.registry.get('plugin');
            if (!pluginService) {
                res.status(503).json({ error: 'ServiceUnavailable' });
                return;
            }
            const result = await pluginService.execute('list', {});
            res.status(200).json(result);
        }
        catch (err) {
            res.status(500).json({ error: 'EngineError', message: err.message });
        }
    }
    start() {
        this.app.listen(this.port, () => {
            console.log(`[API Gateway] Listening on port ${this.port}`);
            console.log(`[API Gateway] Health endpoint: http://localhost:${this.port}/api/v1/health`);
        });
    }
}
exports.ApiGateway = ApiGateway;
function main() {
    const gateway = new ApiGateway(8080);
    gateway.start();
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map