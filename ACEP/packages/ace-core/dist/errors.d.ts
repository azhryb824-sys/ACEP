export declare class ACEPCoreError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code?: string, details?: unknown);
}
export declare class EngineError extends ACEPCoreError {
    readonly engineName: string;
    constructor(message: string, engineName: string, code?: string, details?: unknown);
}
export declare class KnowledgeError extends ACEPCoreError {
    readonly entityId: string;
    constructor(message: string, entityId: string, code?: string, details?: unknown);
}
export declare class ValidationError extends ACEPCoreError {
    readonly errors: string[];
    constructor(message: string, errors?: string[], code?: string, details?: unknown);
}
export declare class ConfigurationError extends ACEPCoreError {
    readonly configKey: string;
    constructor(message: string, configKey?: string, code?: string, details?: unknown);
}
export declare class PluginError extends ACEPCoreError {
    readonly pluginId: string;
    constructor(message: string, pluginId?: string, code?: string, details?: unknown);
}
export declare class AgentError extends ACEPCoreError {
    readonly agentType: string;
    constructor(message: string, agentType?: string, code?: string, details?: unknown);
}
export declare class WorkflowError extends ACEPCoreError {
    readonly workflowId: string;
    readonly step: string;
    constructor(message: string, workflowId?: string, step?: string, code?: string, details?: unknown);
}
//# sourceMappingURL=errors.d.ts.map