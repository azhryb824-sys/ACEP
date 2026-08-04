import { EventEmitter } from 'events';
import { PluginManifest, PluginManifestValidator, HookName } from './manifest';

export { PluginManifest } from './manifest';
export { PluginManifestValidator, createManifest } from './manifest';
export type { PluginType, SettingType, HookName, PluginDependency, PluginSetting } from './manifest';

// ─── Base Plugin Interface ────────────────────────────────────────────────

export interface IPlugin {
  readonly id: string;
  readonly manifest: PluginManifest;
  readonly enabled: boolean;

  init(context: PluginContext): Promise<void>;
  enable(): Promise<void>;
  disable(): Promise<void>;
  destroy(): Promise<void>;
}

// ─── Engine Interface ─────────────────────────────────────────────────────

export interface IEngine {
  readonly engineId: string;
  readonly name: string;
  readonly version: string;

  process(input: EngineInput): Promise<EngineOutput>;
  validate(input: EngineInput): ValidationResult;
  getCapabilities(): EngineCapability[];
}

export interface EngineInput {
  projectId: string;
  data: Record<string, unknown>;
  context: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface EngineOutput {
  engineId: string;
  success: boolean;
  data: Record<string, unknown>;
  trace?: DecisionTrace[];
  errors?: EngineError[];
  warnings?: string[];
  metrics?: Record<string, number>;
}

export interface DecisionTrace {
  step: number;
  action: string;
  input: unknown;
  output: unknown;
  rules?: string[];
  timestamp: Date;
}

export interface EngineError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EngineCapability {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
}

// ─── Hook Types ───────────────────────────────────────────────────────────

export interface HookPayloads {
  onProjectCreated: { projectId: string; name: string; client: string };
  onBOQGenerated: { projectId: string; boqId: string; totalItems: number };
  onBeforeReview: { projectId: string; reviewType: string; data: Record<string, unknown> };
  onAfterApproval: { projectId: string; approvedBy: string; timestamp: Date };
  onQuestionnaireComplete: { projectId: string; answers: Record<string, unknown> };
  onScheduleGenerated: { projectId: string; scheduleId: string; duration: number };
  onRiskIdentified: { projectId: string; riskId: string; severity: string };
  onKnowledgeUpdated: { entityId: string; entityType: string; version: string };
  onEngineComplete: { engineId: string; projectId: string; success: boolean };
  onPluginLoad: { pluginId: string; version: string };
  onPluginUnload: { pluginId: string; reason: string };
}

export type HookHandler<T extends HookName> = (payload: HookPayloads[T]) => Promise<void>;

// ─── Plugin Context ───────────────────────────────────────────────────────

export class PluginContext {
  private _services: Map<string, unknown> = new Map();
  private _storage: Map<string, unknown> = new Map();
  private _hookSystem: HookSystem;
  private _eventBus: EventEmitter;

  constructor(
    public readonly pluginId: string,
    public readonly projectId: string | null,
    public readonly config: Record<string, unknown>,
  ) {
    this._hookSystem = new HookSystem();
    this._eventBus = new EventEmitter();
    this._eventBus.setMaxListeners(100);
  }

  get hookSystem(): HookSystem {
    return this._hookSystem;
  }

  registerService<T>(name: string, service: T): void {
    this._services.set(name, service);
  }

  getService<T>(name: string): T | undefined {
    return this._services.get(name) as T | undefined;
  }

  setData<T>(key: string, value: T): void {
    this._storage.set(key, value);
  }

  getData<T>(key: string): T | undefined {
    return this._storage.get(key) as T | undefined;
  }

  removeData(key: string): void {
    this._storage.delete(key);
  }

  on(event: string, listener: (...args: unknown[]) => void): void {
    this._eventBus.on(event, listener);
  }

  emit(event: string, ...args: unknown[]): void {
    this._eventBus.emit(event, ...args);
  }

  async log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): Promise<void> {
    const entry = {
      timestamp: new Date(),
      pluginId: this.pluginId,
      level,
      message,
      data,
      projectId: this.projectId,
    };
    (console as any)[JSON.stringify(entry)];
  }
}

// ─── Hook System ──────────────────────────────────────────────────────────

export class HookSystem {
  private _hooks: Map<HookName, Set<{ handler: HookHandler<any>; priority: number; pluginId: string }>> = new Map();

  registerHook<T extends HookName>(
    hookName: T,
    handler: HookHandler<T>,
    priority: number = 0,
    pluginId: string = 'unknown'
  ): void {
    if (!this._hooks.has(hookName)) {
      this._hooks.set(hookName, new Set());
    }
    this._hooks.get(hookName)!.add({ handler, priority, pluginId });
  }

  unregisterHook<T extends HookName>(hookName: T, handler: HookHandler<T>): void {
    const hooks = this._hooks.get(hookName);
    if (hooks) {
      for (const entry of hooks) {
        if (entry.handler === handler) {
          hooks.delete(entry);
          break;
        }
      }
    }
  }

  unregisterAllForPlugin(pluginId: string): void {
    for (const [, hooks] of this._hooks) {
      for (const entry of hooks) {
        if (entry.pluginId === pluginId) {
          hooks.delete(entry);
        }
      }
    }
  }

  async executeHook<T extends HookName>(hookName: T, payload: HookPayloads[T]): Promise<void> {
    const hooks = this._hooks.get(hookName);
    if (!hooks || hooks.size === 0) return;

    const sorted = [...hooks].sort((a, b) => b.priority - a.priority);

    for (const entry of sorted) {
      try {
        await entry.handler(payload);
      } catch (error) {
        console.error(`[HookSystem] Error in hook "${hookName}" from plugin "${entry.pluginId}":`, error);
      }
    }
  }

  getRegisteredHooks(): Map<HookName, number> {
    const result = new Map<HookName, number>();
    for (const [name, handlers] of this._hooks) {
      result.set(name, handlers.size);
    }
    return result;
  }

  clear(): void {
    this._hooks.clear();
  }
}

// ─── Plugin API ───────────────────────────────────────────────────────────

export class PluginAPI {
  private _context: PluginContext;
  private _registeredRules: Map<string, RuleDefinition> = new Map();
  private _registeredKnowledge: Map<string, KnowledgeEntity> = new Map();
  private _registeredBOQTemplates: Map<string, BOQTemplateDefinition> = new Map();

  constructor(context: PluginContext) {
    this._context = context;
  }

  // Rule Registration
  registerRule(rule: RuleDefinition): void {
    if (this._registeredRules.has(rule.id)) {
      throw new Error(`Rule "${rule.id}" is already registered`);
    }
    this._registeredRules.set(rule.id, rule);
    this._context.emit('rule:registered', rule);
  }

  unregisterRule(ruleId: string): boolean {
    const removed = this._registeredRules.delete(ruleId);
    if (removed) {
      this._context.emit('rule:unregistered', { ruleId });
    }
    return removed;
  }

  getRegisteredRules(): RuleDefinition[] {
    return Array.from(this._registeredRules.values());
  }

  // Knowledge Registration
  addKnowledge(entity: KnowledgeEntity): void {
    if (this._registeredKnowledge.has(entity.id)) {
      throw new Error(`Knowledge entity "${entity.id}" is already registered`);
    }
    this._registeredKnowledge.set(entity.id, entity);
    this._context.emit('knowledge:added', entity);
  }

  removeKnowledge(entityId: string): boolean {
    const removed = this._registeredKnowledge.delete(entityId);
    if (removed) {
      this._context.emit('knowledge:removed', { entityId });
    }
    return removed;
  }

  getRegisteredKnowledge(): KnowledgeEntity[] {
    return Array.from(this._registeredKnowledge.values());
  }

  // BOQ Template Registration
  registerBOQTemplate(template: BOQTemplateDefinition): void {
    if (this._registeredBOQTemplates.has(template.id)) {
      throw new Error(`BOQ template "${template.id}" is already registered`);
    }
    this._registeredBOQTemplates.set(template.id, template);
    this._context.emit('boq:template:registered', template);
  }

  unregisterBOQTemplate(templateId: string): boolean {
    const removed = this._registeredBOQTemplates.delete(templateId);
    if (removed) {
      this._context.emit('boq:template:unregistered', { templateId });
    }
    return removed;
  }

  getRegisteredBOQTemplates(): BOQTemplateDefinition[] {
    return Array.from(this._registeredBOQTemplates.values());
  }

  clearAll(): void {
    this._registeredRules.clear();
    this._registeredKnowledge.clear();
    this._registeredBOQTemplates.clear();
  }
}

// ─── Type Definitions ─────────────────────────────────────────────────────

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  action: string;
  priority: number;
  source?: string;
}

export interface KnowledgeEntity {
  id: string;
  type: 'material' | 'assembly' | 'element' | 'standard' | 'method' | 'equipment' | 'labor' | 'rule';
  name: string;
  properties: Record<string, unknown>;
  relations: Array<{ type: string; target: string; properties?: Record<string, unknown> }>;
  metadata?: {
    author?: string;
    source?: string;
    version?: string;
    tags?: string[];
    language?: 'ar' | 'en' | 'both';
  };
}

export interface BOQTemplateDefinition {
  id: string;
  name: string;
  classification: 'uniformat' | 'masterformat' | 'custom';
  version: string;
  sections: BOQTemplateSection[];
  format: {
    currency: string;
    language: 'ar' | 'en' | 'both';
    decimalPlaces: number;
  };
}

export interface BOQTemplateSection {
  id: string;
  code: string;
  title: string;
  items: Array<{
    code: string;
    description: string;
    descriptionAr?: string;
    unit: string;
    category: string;
  }>;
}

// ─── Plugin Sandbox ───────────────────────────────────────────────────────

export class PluginSandbox {
  private _timeout: number;
  private _allowedAPIs: Set<string>;
  private _resourceLimit: number;

  constructor(options?: { timeout?: number; allowedAPIs?: string[]; resourceLimit?: number }) {
    this._timeout = options?.timeout ?? 30000;
    this._allowedAPIs = new Set(options?.allowedAPIs ?? [
      'PluginAPI', 'PluginContext', 'HookSystem',
      'console', 'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean',
      'Map', 'Set', 'Promise', 'Error', 'RegExp',
    ]);
    this._resourceLimit = options?.resourceLimit ?? 50 * 1024 * 1024; // 50MB
  }

  async execute<T>(fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Plugin execution timed out after ${this._timeout}ms`)), this._timeout)
    );

    const executionPromise = (async () => {
      const result = await fn();
      return result;
    })();

    return Promise.race([executionPromise, timeoutPromise]);
  }

  validateManifest(manifest: PluginManifest): { valid: boolean; errors: string[] } {
    const validator = new PluginManifestValidator();
    return validator.validate(manifest);
  }

  isAPIAllowed(apiName: string): boolean {
    return this._allowedAPIs.has(apiName);
  }
}

// ─── Plugin Registry ──────────────────────────────────────────────────────

export interface PluginRegistration {
  plugin: IPlugin;
  manifest: PluginManifest;
  status: 'registered' | 'loading' | 'active' | 'error' | 'disabled';
  loadedAt?: Date;
  error?: string;
}

export class PluginRegistry {
  private _plugins: Map<string, PluginRegistration> = new Map();
  private _validator: PluginManifestValidator;

  constructor() {
    this._validator = new PluginManifestValidator();
  }

  async register(plugin: IPlugin): Promise<void> {
    if (this._plugins.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered`);
    }

    const manifestValidation = this._validator.validate(plugin.manifest);
    if (!manifestValidation.valid) {
      throw new Error(
        `Invalid manifest for plugin "${plugin.id}": ${manifestValidation.errors.join(', ')}`
      );
    }

    this._plugins.set(plugin.id, {
      plugin,
      manifest: plugin.manifest,
      status: 'registered',
    });
  }

  async unregister(pluginId: string): Promise<void> {
    const registration = this._plugins.get(pluginId);
    if (!registration) {
      throw new Error(`Plugin "${pluginId}" is not registered`);
    }

    if (registration.status === 'active') {
      await registration.plugin.disable();
      await registration.plugin.destroy();
    }

    this._plugins.delete(pluginId);
  }

  getPlugin(pluginId: string): PluginRegistration | undefined {
    return this._plugins.get(pluginId);
  }

  async loadPlugin(pluginId: string, context: PluginContext): Promise<void> {
    const registration = this._plugins.get(pluginId);
    if (!registration) {
      throw new Error(`Plugin "${pluginId}" is not registered`);
    }

    try {
      registration.status = 'loading';
      await registration.plugin.init(context);
      await registration.plugin.enable();
      registration.status = 'active';
      registration.loadedAt = new Date();
    } catch (error) {
      registration.status = 'error';
      registration.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async disablePlugin(pluginId: string): Promise<void> {
    const registration = this._plugins.get(pluginId);
    if (!registration) return;

    await registration.plugin.disable();
    registration.status = 'disabled';
  }

  async enablePlugin(pluginId: string, context: PluginContext): Promise<void> {
    const registration = this._plugins.get(pluginId);
    if (!registration) return;

    await registration.plugin.init(context);
    await registration.plugin.enable();
    registration.status = 'active';
  }

  listPlugins(status?: PluginRegistration['status']): PluginRegistration[] {
    const all = Array.from(this._plugins.values());
    if (status) {
      return all.filter((p) => p.status === status);
    }
    return all;
  }

  resolveDependencies(pluginId: string): { resolved: string[]; circular: string[] } {
    const resolved: string[] = [];
    const visited = new Set<string>();
    const circular: string[] = [];

    const visit = (id: string, stack: Set<string>) => {
      if (stack.has(id)) {
        circular.push(id);
        return;
      }
      if (visited.has(id)) return;

      visited.add(id);
      stack.add(id);

      const registration = this._plugins.get(id);
      if (registration) {
        for (const dep of registration.manifest.dependencies) {
          if (dep.required) {
            visit(dep.pluginId, stack);
          }
        }
      }

      stack.delete(id);
      resolved.push(id);
    };

    visit(pluginId, new Set());
    return { resolved, circular };
  }

  clear(): void {
    this._plugins.clear();
  }
}

// ─── Plugin Base Class ────────────────────────────────────────────────────

export abstract class PluginBase implements IPlugin {
  readonly id: string;
  readonly manifest: PluginManifest;
  enabled: boolean = false;
  protected context!: PluginContext;
  protected api!: PluginAPI;
  protected sandbox!: PluginSandbox;

  constructor(manifest: PluginManifest) {
    this.manifest = manifest;
    this.id = manifest.id;
    this.sandbox = new PluginSandbox();
  }

  async init(context: PluginContext): Promise<void> {
    this.context = context;
    this.api = new PluginAPI(context);
  }

  async enable(): Promise<void> {
    this.enabled = true;
    this.context.emit('plugin:enabled', { pluginId: this.id });
  }

  async disable(): Promise<void> {
    this.enabled = false;
    this.context.hookSystem.unregisterAllForPlugin(this.id);
    this.context.emit('plugin:disabled', { pluginId: this.id });
  }

  async destroy(): Promise<void> {
    this.api.clearAll();
    this.context.hookSystem.unregisterAllForPlugin(this.id);
    this.enabled = false;
    this.context.emit('plugin:destroyed', { pluginId: this.id });
  }

  protected registerHook<T extends HookName>(
    hookName: T,
    handler: HookHandler<T>,
    priority: number = 0
  ): void {
    this.context.hookSystem.registerHook(hookName, handler, priority, this.id);
  }

  protected registerRule(rule: RuleDefinition): void {
    this.api.registerRule(rule);
  }

  protected addKnowledge(entity: KnowledgeEntity): void {
    this.api.addKnowledge(entity);
  }

  protected registerBOQTemplate(template: BOQTemplateDefinition): void {
    this.api.registerBOQTemplate(template);
  }

  async executeSafely<T>(fn: () => Promise<T>): Promise<T> {
    return this.sandbox.execute(fn, { pluginId: this.id });
  }
}
