import { PluginManifest, HookName } from './manifest';
export { PluginManifest } from './manifest';
export { PluginManifestValidator, createManifest } from './manifest';
export type { PluginType, SettingType, HookName, PluginDependency, PluginSetting } from './manifest';
export interface IPlugin {
    readonly id: string;
    readonly manifest: PluginManifest;
    readonly enabled: boolean;
    init(context: PluginContext): Promise<void>;
    enable(): Promise<void>;
    disable(): Promise<void>;
    destroy(): Promise<void>;
}
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
export interface HookPayloads {
    onProjectCreated: {
        projectId: string;
        name: string;
        client: string;
    };
    onBOQGenerated: {
        projectId: string;
        boqId: string;
        totalItems: number;
    };
    onBeforeReview: {
        projectId: string;
        reviewType: string;
        data: Record<string, unknown>;
    };
    onAfterApproval: {
        projectId: string;
        approvedBy: string;
        timestamp: Date;
    };
    onQuestionnaireComplete: {
        projectId: string;
        answers: Record<string, unknown>;
    };
    onScheduleGenerated: {
        projectId: string;
        scheduleId: string;
        duration: number;
    };
    onRiskIdentified: {
        projectId: string;
        riskId: string;
        severity: string;
    };
    onKnowledgeUpdated: {
        entityId: string;
        entityType: string;
        version: string;
    };
    onEngineComplete: {
        engineId: string;
        projectId: string;
        success: boolean;
    };
    onPluginLoad: {
        pluginId: string;
        version: string;
    };
    onPluginUnload: {
        pluginId: string;
        reason: string;
    };
}
export type HookHandler<T extends HookName> = (payload: HookPayloads[T]) => Promise<void>;
export declare class PluginContext {
    readonly pluginId: string;
    readonly projectId: string | null;
    readonly config: Record<string, unknown>;
    private _services;
    private _storage;
    private _hookSystem;
    private _eventBus;
    constructor(pluginId: string, projectId: string | null, config: Record<string, unknown>);
    get hookSystem(): HookSystem;
    registerService<T>(name: string, service: T): void;
    getService<T>(name: string): T | undefined;
    setData<T>(key: string, value: T): void;
    getData<T>(key: string): T | undefined;
    removeData(key: string): void;
    on(event: string, listener: (...args: unknown[]) => void): void;
    emit(event: string, ...args: unknown[]): void;
    log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): Promise<void>;
}
export declare class HookSystem {
    private _hooks;
    registerHook<T extends HookName>(hookName: T, handler: HookHandler<T>, priority?: number, pluginId?: string): void;
    unregisterHook<T extends HookName>(hookName: T, handler: HookHandler<T>): void;
    unregisterAllForPlugin(pluginId: string): void;
    executeHook<T extends HookName>(hookName: T, payload: HookPayloads[T]): Promise<void>;
    getRegisteredHooks(): Map<HookName, number>;
    clear(): void;
}
export declare class PluginAPI {
    private _context;
    private _registeredRules;
    private _registeredKnowledge;
    private _registeredBOQTemplates;
    constructor(context: PluginContext);
    registerRule(rule: RuleDefinition): void;
    unregisterRule(ruleId: string): boolean;
    getRegisteredRules(): RuleDefinition[];
    addKnowledge(entity: KnowledgeEntity): void;
    removeKnowledge(entityId: string): boolean;
    getRegisteredKnowledge(): KnowledgeEntity[];
    registerBOQTemplate(template: BOQTemplateDefinition): void;
    unregisterBOQTemplate(templateId: string): boolean;
    getRegisteredBOQTemplates(): BOQTemplateDefinition[];
    clearAll(): void;
}
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
    relations: Array<{
        type: string;
        target: string;
        properties?: Record<string, unknown>;
    }>;
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
export declare class PluginSandbox {
    private _timeout;
    private _allowedAPIs;
    private _resourceLimit;
    constructor(options?: {
        timeout?: number;
        allowedAPIs?: string[];
        resourceLimit?: number;
    });
    execute<T>(fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T>;
    validateManifest(manifest: PluginManifest): {
        valid: boolean;
        errors: string[];
    };
    isAPIAllowed(apiName: string): boolean;
}
export interface PluginRegistration {
    plugin: IPlugin;
    manifest: PluginManifest;
    status: 'registered' | 'loading' | 'active' | 'error' | 'disabled';
    loadedAt?: Date;
    error?: string;
}
export declare class PluginRegistry {
    private _plugins;
    private _validator;
    constructor();
    register(plugin: IPlugin): Promise<void>;
    unregister(pluginId: string): Promise<void>;
    getPlugin(pluginId: string): PluginRegistration | undefined;
    loadPlugin(pluginId: string, context: PluginContext): Promise<void>;
    disablePlugin(pluginId: string): Promise<void>;
    enablePlugin(pluginId: string, context: PluginContext): Promise<void>;
    listPlugins(status?: PluginRegistration['status']): PluginRegistration[];
    resolveDependencies(pluginId: string): {
        resolved: string[];
        circular: string[];
    };
    clear(): void;
}
export declare abstract class PluginBase implements IPlugin {
    readonly id: string;
    readonly manifest: PluginManifest;
    enabled: boolean;
    protected context: PluginContext;
    protected api: PluginAPI;
    protected sandbox: PluginSandbox;
    constructor(manifest: PluginManifest);
    init(context: PluginContext): Promise<void>;
    enable(): Promise<void>;
    disable(): Promise<void>;
    destroy(): Promise<void>;
    protected registerHook<T extends HookName>(hookName: T, handler: HookHandler<T>, priority?: number): void;
    protected registerRule(rule: RuleDefinition): void;
    protected addKnowledge(entity: KnowledgeEntity): void;
    protected registerBOQTemplate(template: BOQTemplateDefinition): void;
    executeSafely<T>(fn: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=index.d.ts.map