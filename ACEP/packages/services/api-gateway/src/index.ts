import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';

interface RouteDefinition {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete';
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  auth?: boolean;
}

interface ServiceInstance {
  id: string;
  name: string;
  execute: (action: string, payload: unknown) => Promise<unknown>;
}

class ServiceRegistry {
  private services: Map<string, ServiceInstance> = new Map();

  register(name: string, instance: ServiceInstance): void {
    this.services.set(name, instance);
  }

  get(name: string): ServiceInstance | undefined {
    return this.services.get(name);
  }

  getAll(): Map<string, ServiceInstance> {
    return this.services;
  }
}

class ProjectEngineStub implements ServiceInstance {
  id = 'project-engine';
  name = 'Project Understanding Engine';

  async execute(action: string, payload: unknown): Promise<unknown> {
    switch (action) {
      case 'understand':
        return { projectId: uuidv4(), facts: payload, status: 'understood', confidence: 0.85 };
      case 'describe':
        return { projectId: (payload as Record<string, unknown>).projectId, description: (payload as Record<string, unknown>).text };
      case 'getById':
        return { id: payload, name: 'Sample Project', status: 'Draft', createdAt: new Date().toISOString() };
      case 'answerQuestion':
        return { questionId: uuidv4(), answer: (payload as Record<string, unknown>).answer, processed: true };
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

class AgentEngineStub implements ServiceInstance {
  id = 'agent-engine';
  name = 'Agent Engine';

  async execute(action: string, payload: unknown): Promise<unknown> {
    if (action === 'execute') {
      return { executionId: uuidv4(), agentType: (payload as Record<string, unknown>).agentType, result: {}, status: 'completed' };
    }
    throw new Error(`Unknown action: ${action}`);
  }
}

class PluginEngineStub implements ServiceInstance {
  id = 'plugin-engine';
  name = 'Plugin Engine';

  async execute(action: string, payload: unknown): Promise<unknown> {
    if (action === 'install') {
      return { pluginId: uuidv4(), name: (payload as Record<string, unknown>).name, installed: true };
    }
    if (action === 'list') {
      return { plugins: [] };
    }
    throw new Error(`Unknown action: ${action}`);
  }
}

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing authorization header' });
    return;
  }
  next();
}

function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}

class ApiGateway {
  private app: Express;
  private registry: ServiceRegistry;
  private port: number;

  constructor(port = 8080) {
    this.port = port;
    this.app = express();
    this.registry = new ServiceRegistry();
    this.registerServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandler();
  }

  private registerServices(): void {
    this.registry.register('project', new ProjectEngineStub());
    this.registry.register('agent', new AgentEngineStub());
    this.registry.register('plugin', new PluginEngineStub());
  }

  private setupMiddleware(): void {
    this.app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
    this.app.use(helmet({ contentSecurityPolicy: false }));
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(requestLogger);
  }

  private setupRoutes(): void {
    const routes: RouteDefinition[] = [
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
      const handlers: express.RequestHandler[] = [];
      if (route.auth) {
        handlers.push(authMiddleware);
      }
      handlers.push(route.handler.bind(this));
      (this.app as any)[route.method](route.path, ...handlers);
    }
  }

  private setupErrorHandler(): void {
    this.app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      console.error(`[ERROR] ${err.message}`, err.stack);
      res.status(500).json({
        error: 'InternalServerError',
        message: err.message,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private async healthCheck(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'ok',
      service: 'api-gateway',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }

  private async handleUnderstand(req: Request, res: Response): Promise<void> {
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
    } catch (err) {
      res.status(500).json({ error: 'EngineError', message: (err as Error).message });
    }
  }

  private async handleDescribe(req: Request, res: Response): Promise<void> {
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
    } catch (err) {
      res.status(500).json({ error: 'EngineError', message: (err as Error).message });
    }
  }

  private async handleGetProject(req: Request, res: Response): Promise<void> {
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
    } catch (err) {
      res.status(500).json({ error: 'EngineError', message: (err as Error).message });
    }
  }

  private async handleAnswerQuestion(req: Request, res: Response): Promise<void> {
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
    } catch (err) {
      res.status(500).json({ error: 'EngineError', message: (err as Error).message });
    }
  }

  private async handleGetBOQ(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const projectService = this.registry.get('project');
      if (!projectService) {
        res.status(503).json({ error: 'ServiceUnavailable' });
        return;
      }
      const result = await projectService.execute('getBOQ', id);
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ error: 'EngineError', message: (err as Error).message });
    }
  }

  private async handleGetCost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const projectService = this.registry.get('project');
      if (!projectService) {
        res.status(503).json({ error: 'ServiceUnavailable' });
        return;
      }
      const result = await projectService.execute('getCost', id);
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ error: 'EngineError', message: (err as Error).message });
    }
  }

  private async handleGetSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const projectService = this.registry.get('project');
      if (!projectService) {
        res.status(503).json({ error: 'ServiceUnavailable' });
        return;
      }
      const result = await projectService.execute('getSchedule', id);
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ error: 'EngineError', message: (err as Error).message });
    }
  }

  private async handleGetRisks(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const projectService = this.registry.get('project');
      if (!projectService) {
        res.status(503).json({ error: 'ServiceUnavailable' });
        return;
      }
      const result = await projectService.execute('getRisks', id);
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ error: 'EngineError', message: (err as Error).message });
    }
  }

  private async handleAgentExecute(req: Request, res: Response): Promise<void> {
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
    } catch (err) {
      res.status(500).json({ error: 'EngineError', message: (err as Error).message });
    }
  }

  private async handlePluginInstall(req: Request, res: Response): Promise<void> {
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
    } catch (err) {
      res.status(500).json({ error: 'EngineError', message: (err as Error).message });
    }
  }

  private async handlePluginList(req: Request, res: Response): Promise<void> {
    try {
      const pluginService = this.registry.get('plugin');
      if (!pluginService) {
        res.status(503).json({ error: 'ServiceUnavailable' });
        return;
      }
      const result = await pluginService.execute('list', {});
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ error: 'EngineError', message: (err as Error).message });
    }
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`[API Gateway] Listening on port ${this.port}`);
      console.log(`[API Gateway] Health endpoint: http://localhost:${this.port}/api/v1/health`);
    });
  }
}

function main(): void {
  const gateway = new ApiGateway(8080);
  gateway.start();
}

if (require.main === module) {
  main();
}

export { ApiGateway, ServiceRegistry, ServiceInstance };
