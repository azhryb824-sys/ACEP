"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowError = exports.AgentError = exports.PluginError = exports.ConfigurationError = exports.ValidationError = exports.KnowledgeError = exports.EngineError = exports.ACEPCoreError = void 0;
class ACEPCoreError extends Error {
    code;
    details;
    constructor(message, code = 'ACEP_ERROR', details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'ACEPCoreError';
    }
}
exports.ACEPCoreError = ACEPCoreError;
class EngineError extends ACEPCoreError {
    engineName;
    constructor(message, engineName, code = 'ENGINE_ERROR', details) {
        super(message, code, details);
        this.engineName = engineName;
        this.name = 'EngineError';
    }
}
exports.EngineError = EngineError;
class KnowledgeError extends ACEPCoreError {
    entityId;
    constructor(message, entityId, code = 'KNOWLEDGE_ERROR', details) {
        super(message, code, details);
        this.entityId = entityId;
        this.name = 'KnowledgeError';
    }
}
exports.KnowledgeError = KnowledgeError;
class ValidationError extends ACEPCoreError {
    errors;
    constructor(message, errors = [], code = 'VALIDATION_ERROR', details) {
        super(message, code, details);
        this.errors = errors;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class ConfigurationError extends ACEPCoreError {
    configKey;
    constructor(message, configKey = '', code = 'CONFIG_ERROR', details) {
        super(message, code, details);
        this.configKey = configKey;
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
class PluginError extends ACEPCoreError {
    pluginId;
    constructor(message, pluginId = '', code = 'PLUGIN_ERROR', details) {
        super(message, code, details);
        this.pluginId = pluginId;
        this.name = 'PluginError';
    }
}
exports.PluginError = PluginError;
class AgentError extends ACEPCoreError {
    agentType;
    constructor(message, agentType = '', code = 'AGENT_ERROR', details) {
        super(message, code, details);
        this.agentType = agentType;
        this.name = 'AgentError';
    }
}
exports.AgentError = AgentError;
class WorkflowError extends ACEPCoreError {
    workflowId;
    step;
    constructor(message, workflowId = '', step = '', code = 'WORKFLOW_ERROR', details) {
        super(message, code, details);
        this.workflowId = workflowId;
        this.step = step;
        this.name = 'WorkflowError';
    }
}
exports.WorkflowError = WorkflowError;
//# sourceMappingURL=errors.js.map