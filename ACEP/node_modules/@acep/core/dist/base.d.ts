import { IEngine, EngineStatus, IAgent, IPlugin, PluginManifest, ILogger } from './interfaces';
import { DecisionRecord } from './types';
export declare abstract class BaseEngine implements IEngine {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    protected status: 'initialized' | 'running' | 'error' | 'idle';
    protected logger: ILogger;
    protected lastRun: string | undefined;
    protected error: string | undefined;
    protected config: Record<string, unknown>;
    constructor(name: string, version: string, config?: Record<string, unknown>);
    abstract initialize(): Promise<void>;
    abstract validate(): Promise<boolean>;
    getStatus(): EngineStatus;
    protected setStatus(status: 'initialized' | 'running' | 'error' | 'idle'): void;
    protected setError(error: string): void;
    protected getConfig<T>(key: string, defaultValue?: T): T | undefined;
    protected measure<T>(operation: string, fn: () => Promise<T>): Promise<T>;
}
export declare abstract class BaseAgent implements IAgent {
    readonly id: string;
    readonly type: string;
    readonly name: string;
    protected logger: ILogger;
    protected config: Record<string, unknown>;
    constructor(type: string, name: string, config?: Record<string, unknown>);
    abstract process(input: unknown): Promise<unknown>;
    abstract canHandle(input: unknown): boolean;
    abstract getCapabilities(): string[];
}
export declare abstract class BasePlugin implements IPlugin {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly type: string;
    protected logger: ILogger;
    protected manifest: PluginManifest;
    protected initialized: boolean;
    constructor(name: string, version: string, type: string, manifest?: Partial<PluginManifest>);
    abstract initialize(): Promise<void>;
    abstract execute(input: unknown): Promise<unknown>;
    abstract validate(): Promise<boolean>;
    getManifest(): PluginManifest;
    protected guardInitialized(): Promise<void>;
    protected guardVersion(coreVersion: string): Promise<void>;
}
export declare class DecisionTraceRecorder {
    private records;
    record(record: DecisionRecord): void;
    getRecords(): DecisionRecord[];
    getTrace(decisionId: string): DecisionRecord | undefined;
    clear(): void;
    getByProject(projectId: string): DecisionRecord[];
    getByAgent(agentId: string): DecisionRecord[];
}
//# sourceMappingURL=base.d.ts.map