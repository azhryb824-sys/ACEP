export class ACEPCoreError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'ACEP_ERROR',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ACEPCoreError';
  }
}

export class EngineError extends ACEPCoreError {
  constructor(
    message: string,
    public readonly engineName: string,
    code: string = 'ENGINE_ERROR',
    details?: unknown
  ) {
    super(message, code, details);
    this.name = 'EngineError';
  }
}

export class KnowledgeError extends ACEPCoreError {
  constructor(
    message: string,
    public readonly entityId: string,
    code: string = 'KNOWLEDGE_ERROR',
    details?: unknown
  ) {
    super(message, code, details);
    this.name = 'KnowledgeError';
  }
}

export class ValidationError extends ACEPCoreError {
  constructor(
    message: string,
    public readonly errors: string[] = [],
    code: string = 'VALIDATION_ERROR',
    details?: unknown
  ) {
    super(message, code, details);
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends ACEPCoreError {
  constructor(
    message: string,
    public readonly configKey: string = '',
    code: string = 'CONFIG_ERROR',
    details?: unknown
  ) {
    super(message, code, details);
    this.name = 'ConfigurationError';
  }
}

export class PluginError extends ACEPCoreError {
  constructor(
    message: string,
    public readonly pluginId: string = '',
    code: string = 'PLUGIN_ERROR',
    details?: unknown
  ) {
    super(message, code, details);
    this.name = 'PluginError';
  }
}

export class AgentError extends ACEPCoreError {
  constructor(
    message: string,
    public readonly agentType: string = '',
    code: string = 'AGENT_ERROR',
    details?: unknown
  ) {
    super(message, code, details);
    this.name = 'AgentError';
  }
}

export class WorkflowError extends ACEPCoreError {
  constructor(
    message: string,
    public readonly workflowId: string = '',
    public readonly step: string = '',
    code: string = 'WORKFLOW_ERROR',
    details?: unknown
  ) {
    super(message, code, details);
    this.name = 'WorkflowError';
  }
}
