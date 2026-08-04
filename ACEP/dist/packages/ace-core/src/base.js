"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionTraceRecorder = exports.BasePlugin = exports.BaseAgent = exports.BaseEngine = void 0;
const errors_1 = require("./errors");
class BaseEngine {
    id;
    name;
    version;
    status = 'idle';
    logger;
    lastRun;
    error;
    config = {};
    constructor(name, version, config) {
        this.id = `${name}-${Date.now()}`;
        this.name = name;
        this.version = version;
        this.config = config || {};
        this.logger = {
            info: (msg, data) => console.log(`[${this.name}] INFO: ${msg}`, data || ''),
            warn: (msg, data) => console.warn(`[${this.name}] WARN: ${msg}`, data || ''),
            error: (msg, data) => console.error(`[${this.name}] ERROR: ${msg}`, data || ''),
            debug: (msg, data) => console.debug(`[${this.name}] DEBUG: ${msg}`, data || ''),
            trace: (msg, data) => console.trace(`[${this.name}] TRACE: ${msg}`, data || '')
        };
    }
    getStatus() {
        return {
            id: this.id,
            name: this.name,
            version: this.version,
            status: this.status,
            lastRun: this.lastRun,
            error: this.error
        };
    }
    setStatus(status) {
        this.status = status;
        if (status === 'running') {
            this.lastRun = new Date().toISOString();
        }
    }
    setError(error) {
        this.error = error;
        this.status = 'error';
        this.logger.error(error);
    }
    getConfig(key, defaultValue) {
        return this.config[key] ?? defaultValue;
    }
    async measure(operation, fn) {
        const start = Date.now();
        this.logger.debug(`Starting: ${operation}`);
        try {
            const result = await fn();
            const elapsed = Date.now() - start;
            this.logger.debug(`Completed: ${operation} (${elapsed}ms)`);
            return result;
        }
        catch (err) {
            const elapsed = Date.now() - start;
            this.logger.error(`Failed: ${operation} (${elapsed}ms) - ${err}`);
            throw err;
        }
    }
}
exports.BaseEngine = BaseEngine;
class BaseAgent {
    id;
    type;
    name;
    logger;
    config = {};
    constructor(type, name, config) {
        this.id = `${type}-${Date.now()}`;
        this.type = type;
        this.name = name;
        this.config = config || {};
        this.logger = {
            info: (msg, data) => console.log(`[Agent:${this.name}] INFO: ${msg}`, data || ''),
            warn: (msg, data) => console.warn(`[Agent:${this.name}] WARN: ${msg}`, data || ''),
            error: (msg, data) => console.error(`[Agent:${this.name}] ERROR: ${msg}`, data || ''),
            debug: (msg, data) => console.debug(`[Agent:${this.name}] DEBUG: ${msg}`, data || ''),
            trace: (msg, data) => console.trace(`[Agent:${this.name}] TRACE: ${msg}`, data || '')
        };
    }
}
exports.BaseAgent = BaseAgent;
class BasePlugin {
    id;
    name;
    version;
    type;
    logger;
    manifest;
    initialized = false;
    constructor(name, version, type, manifest) {
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
            info: (msg, data) => console.log(`[Plugin:${this.name}] INFO: ${msg}`, data || ''),
            warn: (msg, data) => console.warn(`[Plugin:${this.name}] WARN: ${msg}`, data || ''),
            error: (msg, data) => console.error(`[Plugin:${this.name}] ERROR: ${msg}`, data || ''),
            debug: (msg, data) => console.debug(`[Plugin:${this.name}] DEBUG: ${msg}`, data || ''),
            trace: (msg, data) => console.trace(`[Plugin:${this.name}] TRACE: ${msg}`, data || '')
        };
    }
    getManifest() {
        return { ...this.manifest };
    }
    async guardInitialized() {
        if (!this.initialized) {
            throw new errors_1.PluginError('Plugin not initialized. Call initialize() first.', this.id);
        }
    }
    async guardVersion(coreVersion) {
        if (coreVersion < this.manifest.minCoreVersion) {
            throw new errors_1.PluginError(`Core version ${coreVersion} is below minimum required ${this.manifest.minCoreVersion}`, this.id);
        }
    }
}
exports.BasePlugin = BasePlugin;
class DecisionTraceRecorder {
    records = [];
    record(record) {
        this.records.push(record);
    }
    getRecords() {
        return [...this.records];
    }
    getTrace(decisionId) {
        return this.records.find(r => r.id === decisionId);
    }
    clear() {
        this.records = [];
    }
    getByProject(projectId) {
        return this.records.filter(r => r.projectId === projectId);
    }
    getByAgent(agentId) {
        return this.records.filter(r => r.agentId === agentId);
    }
}
exports.DecisionTraceRecorder = DecisionTraceRecorder;
//# sourceMappingURL=base.js.map