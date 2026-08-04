"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginBase = exports.PluginRegistry = exports.PluginSandbox = exports.PluginAPI = exports.HookSystem = exports.PluginContext = exports.createManifest = exports.PluginManifestValidator = void 0;
const events_1 = require("events");
const manifest_1 = require("./manifest");
var manifest_2 = require("./manifest");
Object.defineProperty(exports, "PluginManifestValidator", { enumerable: true, get: function () { return manifest_2.PluginManifestValidator; } });
Object.defineProperty(exports, "createManifest", { enumerable: true, get: function () { return manifest_2.createManifest; } });
// ─── Plugin Context ───────────────────────────────────────────────────────
class PluginContext {
    pluginId;
    projectId;
    config;
    _services = new Map();
    _storage = new Map();
    _hookSystem;
    _eventBus;
    constructor(pluginId, projectId, config) {
        this.pluginId = pluginId;
        this.projectId = projectId;
        this.config = config;
        this._hookSystem = new HookSystem();
        this._eventBus = new events_1.EventEmitter();
        this._eventBus.setMaxListeners(100);
    }
    get hookSystem() {
        return this._hookSystem;
    }
    registerService(name, service) {
        this._services.set(name, service);
    }
    getService(name) {
        return this._services.get(name);
    }
    setData(key, value) {
        this._storage.set(key, value);
    }
    getData(key) {
        return this._storage.get(key);
    }
    removeData(key) {
        this._storage.delete(key);
    }
    on(event, listener) {
        this._eventBus.on(event, listener);
    }
    emit(event, ...args) {
        this._eventBus.emit(event, ...args);
    }
    async log(level, message, data) {
        const entry = {
            timestamp: new Date(),
            pluginId: this.pluginId,
            level,
            message,
            data,
            projectId: this.projectId,
        };
        console[JSON.stringify(entry)];
    }
}
exports.PluginContext = PluginContext;
// ─── Hook System ──────────────────────────────────────────────────────────
class HookSystem {
    _hooks = new Map();
    registerHook(hookName, handler, priority = 0, pluginId = 'unknown') {
        if (!this._hooks.has(hookName)) {
            this._hooks.set(hookName, new Set());
        }
        this._hooks.get(hookName).add({ handler, priority, pluginId });
    }
    unregisterHook(hookName, handler) {
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
    unregisterAllForPlugin(pluginId) {
        for (const [, hooks] of this._hooks) {
            for (const entry of hooks) {
                if (entry.pluginId === pluginId) {
                    hooks.delete(entry);
                }
            }
        }
    }
    async executeHook(hookName, payload) {
        const hooks = this._hooks.get(hookName);
        if (!hooks || hooks.size === 0)
            return;
        const sorted = [...hooks].sort((a, b) => b.priority - a.priority);
        for (const entry of sorted) {
            try {
                await entry.handler(payload);
            }
            catch (error) {
                console.error(`[HookSystem] Error in hook "${hookName}" from plugin "${entry.pluginId}":`, error);
            }
        }
    }
    getRegisteredHooks() {
        const result = new Map();
        for (const [name, handlers] of this._hooks) {
            result.set(name, handlers.size);
        }
        return result;
    }
    clear() {
        this._hooks.clear();
    }
}
exports.HookSystem = HookSystem;
// ─── Plugin API ───────────────────────────────────────────────────────────
class PluginAPI {
    _context;
    _registeredRules = new Map();
    _registeredKnowledge = new Map();
    _registeredBOQTemplates = new Map();
    constructor(context) {
        this._context = context;
    }
    // Rule Registration
    registerRule(rule) {
        if (this._registeredRules.has(rule.id)) {
            throw new Error(`Rule "${rule.id}" is already registered`);
        }
        this._registeredRules.set(rule.id, rule);
        this._context.emit('rule:registered', rule);
    }
    unregisterRule(ruleId) {
        const removed = this._registeredRules.delete(ruleId);
        if (removed) {
            this._context.emit('rule:unregistered', { ruleId });
        }
        return removed;
    }
    getRegisteredRules() {
        return Array.from(this._registeredRules.values());
    }
    // Knowledge Registration
    addKnowledge(entity) {
        if (this._registeredKnowledge.has(entity.id)) {
            throw new Error(`Knowledge entity "${entity.id}" is already registered`);
        }
        this._registeredKnowledge.set(entity.id, entity);
        this._context.emit('knowledge:added', entity);
    }
    removeKnowledge(entityId) {
        const removed = this._registeredKnowledge.delete(entityId);
        if (removed) {
            this._context.emit('knowledge:removed', { entityId });
        }
        return removed;
    }
    getRegisteredKnowledge() {
        return Array.from(this._registeredKnowledge.values());
    }
    // BOQ Template Registration
    registerBOQTemplate(template) {
        if (this._registeredBOQTemplates.has(template.id)) {
            throw new Error(`BOQ template "${template.id}" is already registered`);
        }
        this._registeredBOQTemplates.set(template.id, template);
        this._context.emit('boq:template:registered', template);
    }
    unregisterBOQTemplate(templateId) {
        const removed = this._registeredBOQTemplates.delete(templateId);
        if (removed) {
            this._context.emit('boq:template:unregistered', { templateId });
        }
        return removed;
    }
    getRegisteredBOQTemplates() {
        return Array.from(this._registeredBOQTemplates.values());
    }
    clearAll() {
        this._registeredRules.clear();
        this._registeredKnowledge.clear();
        this._registeredBOQTemplates.clear();
    }
}
exports.PluginAPI = PluginAPI;
// ─── Plugin Sandbox ───────────────────────────────────────────────────────
class PluginSandbox {
    _timeout;
    _allowedAPIs;
    _resourceLimit;
    constructor(options) {
        this._timeout = options?.timeout ?? 30000;
        this._allowedAPIs = new Set(options?.allowedAPIs ?? [
            'PluginAPI', 'PluginContext', 'HookSystem',
            'console', 'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean',
            'Map', 'Set', 'Promise', 'Error', 'RegExp',
        ]);
        this._resourceLimit = options?.resourceLimit ?? 50 * 1024 * 1024; // 50MB
    }
    async execute(fn, context) {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Plugin execution timed out after ${this._timeout}ms`)), this._timeout));
        const executionPromise = (async () => {
            const result = await fn();
            return result;
        })();
        return Promise.race([executionPromise, timeoutPromise]);
    }
    validateManifest(manifest) {
        const validator = new manifest_1.PluginManifestValidator();
        return validator.validate(manifest);
    }
    isAPIAllowed(apiName) {
        return this._allowedAPIs.has(apiName);
    }
}
exports.PluginSandbox = PluginSandbox;
class PluginRegistry {
    _plugins = new Map();
    _validator;
    constructor() {
        this._validator = new manifest_1.PluginManifestValidator();
    }
    async register(plugin) {
        if (this._plugins.has(plugin.id)) {
            throw new Error(`Plugin "${plugin.id}" is already registered`);
        }
        const manifestValidation = this._validator.validate(plugin.manifest);
        if (!manifestValidation.valid) {
            throw new Error(`Invalid manifest for plugin "${plugin.id}": ${manifestValidation.errors.join(', ')}`);
        }
        this._plugins.set(plugin.id, {
            plugin,
            manifest: plugin.manifest,
            status: 'registered',
        });
    }
    async unregister(pluginId) {
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
    getPlugin(pluginId) {
        return this._plugins.get(pluginId);
    }
    async loadPlugin(pluginId, context) {
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
        }
        catch (error) {
            registration.status = 'error';
            registration.error = error instanceof Error ? error.message : String(error);
            throw error;
        }
    }
    async disablePlugin(pluginId) {
        const registration = this._plugins.get(pluginId);
        if (!registration)
            return;
        await registration.plugin.disable();
        registration.status = 'disabled';
    }
    async enablePlugin(pluginId, context) {
        const registration = this._plugins.get(pluginId);
        if (!registration)
            return;
        await registration.plugin.init(context);
        await registration.plugin.enable();
        registration.status = 'active';
    }
    listPlugins(status) {
        const all = Array.from(this._plugins.values());
        if (status) {
            return all.filter((p) => p.status === status);
        }
        return all;
    }
    resolveDependencies(pluginId) {
        const resolved = [];
        const visited = new Set();
        const circular = [];
        const visit = (id, stack) => {
            if (stack.has(id)) {
                circular.push(id);
                return;
            }
            if (visited.has(id))
                return;
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
    clear() {
        this._plugins.clear();
    }
}
exports.PluginRegistry = PluginRegistry;
// ─── Plugin Base Class ────────────────────────────────────────────────────
class PluginBase {
    id;
    manifest;
    enabled = false;
    context;
    api;
    sandbox;
    constructor(manifest) {
        this.manifest = manifest;
        this.id = manifest.id;
        this.sandbox = new PluginSandbox();
    }
    async init(context) {
        this.context = context;
        this.api = new PluginAPI(context);
    }
    async enable() {
        this.enabled = true;
        this.context.emit('plugin:enabled', { pluginId: this.id });
    }
    async disable() {
        this.enabled = false;
        this.context.hookSystem.unregisterAllForPlugin(this.id);
        this.context.emit('plugin:disabled', { pluginId: this.id });
    }
    async destroy() {
        this.api.clearAll();
        this.context.hookSystem.unregisterAllForPlugin(this.id);
        this.enabled = false;
        this.context.emit('plugin:destroyed', { pluginId: this.id });
    }
    registerHook(hookName, handler, priority = 0) {
        this.context.hookSystem.registerHook(hookName, handler, priority, this.id);
    }
    registerRule(rule) {
        this.api.registerRule(rule);
    }
    addKnowledge(entity) {
        this.api.addKnowledge(entity);
    }
    registerBOQTemplate(template) {
        this.api.registerBOQTemplate(template);
    }
    async executeSafely(fn) {
        return this.sandbox.execute(fn, { pluginId: this.id });
    }
}
exports.PluginBase = PluginBase;
//# sourceMappingURL=index.js.map