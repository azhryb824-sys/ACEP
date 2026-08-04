"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginFramework = void 0;
const uuid_1 = require("uuid");
class PluginFramework {
    manifests = new Map();
    lifecycleStates = new Map();
    sandboxes = new Map();
    hooks = new Map();
    eventSubscriptions = new Map();
    reviews = new Map();
    installCounts = new Map();
    async register(manifest) {
        if (this.manifests.has(manifest.id)) {
            throw new Error(`Plugin ${manifest.id} is already registered`);
        }
        this.validateManifest(manifest);
        this.manifests.set(manifest.id, { ...manifest });
        this.eventSubscriptions.set(manifest.id, new Set());
        const defaultSandbox = {
            sandboxId: (0, uuid_1.v4)(),
            pluginId: manifest.id,
            enabled: true,
            permissions: manifest.permissions,
            resourceLimits: { cpu: '0.5', memory: '256Mi', storage: '1Gi', maxRequestsPerMin: 100, maxConcurrentRequests: 10 },
            allowedHosts: [],
            allowedAPIs: [],
            fileSystemAccess: false,
            networkAccess: false,
            envVariables: {},
            timeout: 30000,
            maxMemory: '256Mi',
            maxCPU: '0.5',
        };
        this.sandboxes.set(manifest.id, defaultSandbox);
        return manifest;
    }
    async unregister(pluginId) {
        if (!this.manifests.has(pluginId)) {
            throw new Error(`Plugin ${pluginId} is not registered`);
        }
        const state = this.lifecycleStates.get(pluginId);
        if (state && state.status !== 'uninstalled') {
            throw new Error(`Cannot unregister plugin ${pluginId} in status ${state.status}. Uninstall first.`);
        }
        this.manifests.delete(pluginId);
        this.lifecycleStates.delete(pluginId);
        this.sandboxes.delete(pluginId);
        this.hooks.delete(pluginId);
        this.eventSubscriptions.delete(pluginId);
    }
    async getManifest(pluginId) {
        return this.manifests.get(pluginId);
    }
    async listPlugins(type, status) {
        let results = Array.from(this.manifests.values());
        if (type) {
            results = results.filter(p => p.type === type);
        }
        if (status) {
            results = results.filter(p => {
                const state = this.lifecycleStates.get(p.id);
                return state?.status === status;
            });
        }
        return results;
    }
    async validate(pluginId) {
        const manifest = this.manifests.get(pluginId);
        if (!manifest)
            return false;
        try {
            this.validateManifest(manifest);
            return true;
        }
        catch {
            return false;
        }
    }
    async install(pluginId, config) {
        const manifest = this.manifests.get(pluginId);
        if (!manifest) {
            throw new Error(`Plugin ${pluginId} is not registered`);
        }
        const existing = this.lifecycleStates.get(pluginId);
        if (existing) {
            throw new Error(`Plugin ${pluginId} is already installed (status: ${existing.status})`);
        }
        const state = {
            pluginId,
            status: 'installed',
            installedAt: new Date().toISOString(),
            version: manifest.version,
            config: config ?? {},
        };
        this.lifecycleStates.set(pluginId, state);
        return state;
    }
    async enable(pluginId) {
        const state = this.lifecycleStates.get(pluginId);
        if (!state) {
            throw new Error(`Plugin ${pluginId} is not installed`);
        }
        if (state.status === 'enabled') {
            return state;
        }
        if (state.status !== 'installed' && state.status !== 'disabled') {
            throw new Error(`Cannot enable plugin ${pluginId} from status ${state.status}`);
        }
        state.status = 'enabled';
        state.enabledAt = new Date().toISOString();
        return state;
    }
    async disable(pluginId) {
        const state = this.lifecycleStates.get(pluginId);
        if (!state) {
            throw new Error(`Plugin ${pluginId} is not installed`);
        }
        if (state.status !== 'enabled') {
            throw new Error(`Cannot disable plugin ${pluginId} in status ${state.status}`);
        }
        state.status = 'disabled';
        state.disabledAt = new Date().toISOString();
        return state;
    }
    async uninstall(pluginId) {
        const state = this.lifecycleStates.get(pluginId);
        if (!state) {
            throw new Error(`Plugin ${pluginId} is not installed`);
        }
        if (state.status !== 'disabled' && state.status !== 'installed') {
            throw new Error(`Disable plugin ${pluginId} before uninstalling`);
        }
        state.status = 'uninstalled';
        state.uninstalledAt = new Date().toISOString();
        return state;
    }
    async getLifecycleState(pluginId) {
        return this.lifecycleStates.get(pluginId);
    }
    async getSandbox(pluginId) {
        const sandbox = this.sandboxes.get(pluginId);
        if (!sandbox) {
            throw new Error(`No sandbox found for plugin ${pluginId}`);
        }
        return sandbox;
    }
    async updateSandbox(pluginId, config) {
        const existing = await this.getSandbox(pluginId);
        const updated = { ...existing, ...config };
        this.sandboxes.set(pluginId, updated);
        return updated;
    }
    async getPermissions(pluginId) {
        const manifest = this.manifests.get(pluginId);
        if (!manifest) {
            throw new Error(`Plugin ${pluginId} is not registered`);
        }
        return manifest.permissions;
    }
    async checkPermission(pluginId, resource, action) {
        const sandbox = this.sandboxes.get(pluginId);
        if (!sandbox || !sandbox.enabled)
            return false;
        return sandbox.permissions.some(p => p.resource === resource && p.actions.includes(action));
    }
    async registerHook(pluginId, hook) {
        const manifest = this.manifests.get(pluginId);
        if (!manifest) {
            throw new Error(`Plugin ${pluginId} is not registered`);
        }
        const key = `${hook.target}:${hook.type}`;
        const existing = this.hooks.get(key) || [];
        existing.push(hook);
        this.hooks.set(key, existing);
    }
    async unregisterHook(pluginId, hookId) {
        for (const [key, hooks] of this.hooks.entries()) {
            const filtered = hooks.filter(h => h.hookId !== hookId);
            if (filtered.length !== hooks.length) {
                this.hooks.set(key, filtered);
                return;
            }
        }
    }
    async getHooks(target, type) {
        const results = [];
        for (const [key, hooks] of this.hooks.entries()) {
            const [hookTarget, hookType] = key.split(':');
            if (hookTarget === target && (!type || hookType === type)) {
                results.push(...hooks);
            }
        }
        return results.sort((a, b) => a.priority - b.priority);
    }
    async executeHooks(target, type, context) {
        const hooks = await this.getHooks(target, type);
        let result = { ...context };
        for (const hook of hooks) {
            const state = this.lifecycleStates.get(hook.target.split('.')[0]);
            if (!state || state.status !== 'enabled')
                continue;
            if (hook.type === 'before' || hook.type === 'around') {
                result = { ...result, [`hook_${hook.hookId}`]: 'executed' };
            }
        }
        return result;
    }
    async subscribeEvent(pluginId, event, handler) {
        const manifest = this.manifests.get(pluginId);
        if (!manifest) {
            throw new Error(`Plugin ${pluginId} is not registered`);
        }
        const subscriptions = this.eventSubscriptions.get(pluginId);
        subscriptions.add(`${event}:${handler}`);
    }
    async unsubscribeEvent(pluginId, event) {
        const subscriptions = this.eventSubscriptions.get(pluginId);
        if (!subscriptions)
            return;
        for (const sub of subscriptions) {
            if (sub.startsWith(`${event}:`)) {
                subscriptions.delete(sub);
            }
        }
    }
    async getSubscribedEvents(pluginId) {
        const subscriptions = this.eventSubscriptions.get(pluginId);
        if (!subscriptions)
            return [];
        return Array.from(subscriptions).map(s => s.split(':')[0]);
    }
    async prepareForMarketplace(pluginId) {
        const manifest = this.manifests.get(pluginId);
        if (!manifest) {
            throw new Error(`Plugin ${pluginId} is not registered`);
        }
        const state = this.lifecycleStates.get(pluginId);
        if (!state || state.status === 'uninstalled') {
            throw new Error(`Plugin ${pluginId} must be installed before marketplace preparation`);
        }
        const listing = {
            id: (0, uuid_1.v4)(),
            pluginId: manifest.id,
            manifest: { ...manifest },
            publisher: manifest.author,
            publisherVerified: false,
            category: manifest.type,
            tags: [manifest.type],
            shortDescription: manifest.description.substring(0, 100),
            fullDescription: manifest.description,
            pricing: { model: 'free' },
            rating: 0,
            reviewCount: 0,
            downloadCount: 0,
            installCount: 0,
            compatibility: manifest.engineTypes,
            languages: [],
            screenshots: manifest.screenshots || [],
            documentationUrl: manifest.website,
            submittedAt: new Date().toISOString(),
            status: 'pending',
            featured: false,
            verified: false,
        };
        return listing;
    }
    validateManifest(manifest) {
        if (!manifest.id)
            throw new Error('Plugin manifest must have an id');
        if (!manifest.name)
            throw new Error('Plugin manifest must have a name');
        if (!manifest.version)
            throw new Error('Plugin manifest must have a version');
        if (!manifest.type)
            throw new Error('Plugin manifest must have a type');
        if (!manifest.author)
            throw new Error('Plugin manifest must have an author');
        if (!manifest.minCoreVersion)
            throw new Error('Plugin manifest must specify minCoreVersion');
        if (!Array.isArray(manifest.permissions)) {
            throw new Error('Plugin manifest permissions must be an array');
        }
        if (!Array.isArray(manifest.engineTypes) || manifest.engineTypes.length === 0) {
            throw new Error('Plugin manifest must specify at least one engineTypes');
        }
    }
}
exports.PluginFramework = PluginFramework;
//# sourceMappingURL=plugin-framework.js.map