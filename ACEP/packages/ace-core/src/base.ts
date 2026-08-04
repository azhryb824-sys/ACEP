import { IEngine, EngineStatus, IAgent, IPlugin, PluginManifest, ILogger } from './interfaces';
import { EngineError, PluginError, AgentError } from './errors';
import { DecisionRecord, ReasoningTrace } from './types';

export abstract class BaseEngine implements IEngine {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  protected status: 'initialized' | 'running' | 'error' | 'idle' = 'idle';
  protected logger: ILogger;
  protected lastRun: string | undefined;
  protected error: string | undefined;
  protected config: Record<string, unknown> = {};

  constructor(name: string, version: string, config?: Record<string, unknown>) {
    this.id = `${name}-${Date.now()}`;
    this.name = name;
    this.version = version;
    this.config = config || {};
    this.logger = {
      info: (msg: string, data?: unknown) => console.log(`[${this.name}] INFO: ${msg}`, data || ''),
      warn: (msg: string, data?: unknown) => console.warn(`[${this.name}] WARN: ${msg}`, data || ''),
      error: (msg: string, data?: unknown) => console.error(`[${this.name}] ERROR: ${msg}`, data || ''),
      debug: (msg: string, data?: unknown) => console.debug(`[${this.name}] DEBUG: ${msg}`, data || ''),
      trace: (msg: string, data?: unknown) => console.trace(`[${this.name}] TRACE: ${msg}`, data || '')
    };
  }

  abstract initialize(): Promise<void>;
  abstract validate(): Promise<boolean>;

  getStatus(): EngineStatus {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      status: this.status,
      lastRun: this.lastRun,
      error: this.error
    };
  }

  protected setStatus(status: 'initialized' | 'running' | 'error' | 'idle'): void {
    this.status = status;
    if (status === 'running') {
      this.lastRun = new Date().toISOString();
    }
  }

  protected setError(error: string): void {
    this.error = error;
    this.status = 'error';
    this.logger.error(error);
  }

  protected getConfig<T>(key: string, defaultValue?: T): T | undefined {
    return (this.config[key] as T) ?? defaultValue;
  }

  protected async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    this.logger.debug(`Starting: ${operation}`);
    try {
      const result = await fn();
      const elapsed = Date.now() - start;
      this.logger.debug(`Completed: ${operation} (${elapsed}ms)`);
      return result;
    } catch (err) {
      const elapsed = Date.now() - start;
      this.logger.error(`Failed: ${operation} (${elapsed}ms) - ${err}`);
      throw err;
    }
  }
}

export abstract class BaseAgent implements IAgent {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  protected logger: ILogger;
  protected config: Record<string, unknown> = {};

  constructor(type: string, name: string, config?: Record<string, unknown>) {
    this.id = `${type}-${Date.now()}`;
    this.type = type;
    this.name = name;
    this.config = config || {};
    this.logger = {
      info: (msg: string, data?: unknown) => console.log(`[Agent:${this.name}] INFO: ${msg}`, data || ''),
      warn: (msg: string, data?: unknown) => console.warn(`[Agent:${this.name}] WARN: ${msg}`, data || ''),
      error: (msg: string, data?: unknown) => console.error(`[Agent:${this.name}] ERROR: ${msg}`, data || ''),
      debug: (msg: string, data?: unknown) => console.debug(`[Agent:${this.name}] DEBUG: ${msg}`, data || ''),
      trace: (msg: string, data?: unknown) => console.trace(`[Agent:${this.name}] TRACE: ${msg}`, data || '')
    };
  }

  abstract process(input: unknown): Promise<unknown>;
  abstract canHandle(input: unknown): boolean;
  abstract getCapabilities(): string[];
}

export abstract class BasePlugin implements IPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: string;
  protected logger: ILogger;
  protected manifest: PluginManifest;
  protected initialized = false;

  constructor(name: string, version: string, type: string, manifest?: Partial<PluginManifest>) {
    this.id = `${name}-${Date.now()}`;
    this.name = name;
    this.version = version;
    this.type = type;
    this.manifest = {
      id: this.id,
      name,
      version,
      type,
      description: manifest?.description || '',
      author: manifest?.author || 'unknown',
      dependencies: manifest?.dependencies || [],
      engineTypes: manifest?.engineTypes || [],
      minCoreVersion: manifest?.minCoreVersion || '1.0.0'
    };
    this.logger = {
      info: (msg: string, data?: unknown) => console.log(`[Plugin:${this.name}] INFO: ${msg}`, data || ''),
      warn: (msg: string, data?: unknown) => console.warn(`[Plugin:${this.name}] WARN: ${msg}`, data || ''),
      error: (msg: string, data?: unknown) => console.error(`[Plugin:${this.name}] ERROR: ${msg}`, data || ''),
      debug: (msg: string, data?: unknown) => console.debug(`[Plugin:${this.name}] DEBUG: ${msg}`, data || ''),
      trace: (msg: string, data?: unknown) => console.trace(`[Plugin:${this.name}] TRACE: ${msg}`, data || '')
    };
  }

  abstract initialize(): Promise<void>;
  abstract execute(input: unknown): Promise<unknown>;
  abstract validate(): Promise<boolean>;

  getManifest(): PluginManifest {
    return { ...this.manifest };
  }

  protected async guardInitialized(): Promise<void> {
    if (!this.initialized) {
      throw new PluginError('Plugin not initialized. Call initialize() first.', this.id);
    }
  }

  protected async guardVersion(coreVersion: string): Promise<void> {
    if (coreVersion < this.manifest.minCoreVersion) {
      throw new PluginError(
        `Core version ${coreVersion} is below minimum required ${this.manifest.minCoreVersion}`,
        this.id
      );
    }
  }
}

export class DecisionTraceRecorder {
  private records: DecisionRecord[] = [];

  record(record: DecisionRecord): void {
    this.records.push(record);
  }

  getRecords(): DecisionRecord[] {
    return [...this.records];
  }

  getTrace(decisionId: string): DecisionRecord | undefined {
    return this.records.find(r => r.id === decisionId);
  }

  clear(): void {
    this.records = [];
  }

  getByProject(projectId: string): DecisionRecord[] {
    return this.records.filter(r => r.projectId === projectId);
  }

  getByAgent(agentId: string): DecisionRecord[] {
    return this.records.filter(r => r.agentId === agentId);
  }
}
