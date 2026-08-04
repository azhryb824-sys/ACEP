import { v4 as uuid } from 'uuid';
import type { IPluginFramework, MarketplaceReview } from './interfaces';
import type {
  PluginManifest,
  PluginPermission,
  PluginStatus,
  PluginType,
  PluginLifecycleState,
  PluginHook,
  PluginSandbox,
  SandboxResources,
  MarketplaceListing,
  MarketplacePricing,
} from './types';

export class PluginFramework implements IPluginFramework {
  private manifests: Map<string, PluginManifest> = new Map();
  private lifecycleStates: Map<string, PluginLifecycleState> = new Map();
  private sandboxes: Map<string, PluginSandbox> = new Map();
  private hooks: Map<string, PluginHook[]> = new Map();
  private eventSubscriptions: Map<string, Set<string>> = new Map();
  private reviews: Map<string, MarketplaceReview[]> = new Map();
  private installCounts: Map<string, number> = new Map();

  async register(manifest: PluginManifest): Promise<PluginManifest> {
    if (this.manifests.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already registered`);
    }
    this.validateManifest(manifest);
    this.manifests.set(manifest.id, { ...manifest });
    this.eventSubscriptions.set(manifest.id, new Set());

    const defaultSandbox: PluginSandbox = {
      sandboxId: uuid(),
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

  async unregister(pluginId: string): Promise<void> {
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

  async getManifest(pluginId: string): Promise<PluginManifest | undefined> {
    return this.manifests.get(pluginId);
  }

  async listPlugins(type?: PluginType, status?: PluginStatus): Promise<PluginManifest[]> {
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

  async validate(pluginId: string): Promise<boolean> {
    const manifest = this.manifests.get(pluginId);
    if (!manifest) return false;
    try {
      this.validateManifest(manifest);
      return true;
    } catch {
      return false;
    }
  }

  async install(pluginId: string, config?: Record<string, unknown>): Promise<PluginLifecycleState> {
    const manifest = this.manifests.get(pluginId);
    if (!manifest) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    const existing = this.lifecycleStates.get(pluginId);
    if (existing) {
      throw new Error(`Plugin ${pluginId} is already installed (status: ${existing.status})`);
    }
    const state: PluginLifecycleState = {
      pluginId,
      status: 'installed',
      installedAt: new Date().toISOString(),
      version: manifest.version,
      config: config ?? {},
    };
    this.lifecycleStates.set(pluginId, state);
    return state;
  }

  async enable(pluginId: string): Promise<PluginLifecycleState> {
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

  async disable(pluginId: string): Promise<PluginLifecycleState> {
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

  async uninstall(pluginId: string): Promise<PluginLifecycleState> {
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

  async getLifecycleState(pluginId: string): Promise<PluginLifecycleState | undefined> {
    return this.lifecycleStates.get(pluginId);
  }

  async getSandbox(pluginId: string): Promise<PluginSandbox> {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox) {
      throw new Error(`No sandbox found for plugin ${pluginId}`);
    }
    return sandbox;
  }

  async updateSandbox(pluginId: string, config: Partial<PluginSandbox>): Promise<PluginSandbox> {
    const existing = await this.getSandbox(pluginId);
    const updated: PluginSandbox = { ...existing, ...config };
    this.sandboxes.set(pluginId, updated);
    return updated;
  }

  async getPermissions(pluginId: string): Promise<PluginPermission[]> {
    const manifest = this.manifests.get(pluginId);
    if (!manifest) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    return manifest.permissions;
  }

  async checkPermission(pluginId: string, resource: string, action: string): Promise<boolean> {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox || !sandbox.enabled) return false;
    return sandbox.permissions.some(
      p => p.resource === resource && p.actions.includes(action as any)
    );
  }

  async registerHook(pluginId: string, hook: PluginHook): Promise<void> {
    const manifest = this.manifests.get(pluginId);
    if (!manifest) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    const key = `${hook.target}:${hook.type}`;
    const existing = this.hooks.get(key) || [];
    existing.push(hook);
    this.hooks.set(key, existing);
  }

  async unregisterHook(pluginId: string, hookId: string): Promise<void> {
    for (const [key, hooks] of this.hooks.entries()) {
      const filtered = hooks.filter(h => h.hookId !== hookId);
      if (filtered.length !== hooks.length) {
        this.hooks.set(key, filtered);
        return;
      }
    }
  }

  async getHooks(target: string, type?: string): Promise<PluginHook[]> {
    const results: PluginHook[] = [];
    for (const [key, hooks] of this.hooks.entries()) {
      const [hookTarget, hookType] = key.split(':');
      if (hookTarget === target && (!type || hookType === type)) {
        results.push(...hooks);
      }
    }
    return results.sort((a, b) => a.priority - b.priority);
  }

  async executeHooks(target: string, type: string, context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const hooks = await this.getHooks(target, type);
    let result = { ...context };
    for (const hook of hooks) {
      const state = this.lifecycleStates.get(hook.target.split('.')[0]);
      if (!state || state.status !== 'enabled') continue;
      if (hook.type === 'before' || hook.type === 'around') {
        result = { ...result, [`hook_${hook.hookId}`]: 'executed' };
      }
    }
    return result;
  }

  async subscribeEvent(pluginId: string, event: string, handler: string): Promise<void> {
    const manifest = this.manifests.get(pluginId);
    if (!manifest) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    const subscriptions = this.eventSubscriptions.get(pluginId)!;
    subscriptions.add(`${event}:${handler}`);
  }

  async unsubscribeEvent(pluginId: string, event: string): Promise<void> {
    const subscriptions = this.eventSubscriptions.get(pluginId);
    if (!subscriptions) return;
    for (const sub of subscriptions) {
      if (sub.startsWith(`${event}:`)) {
        subscriptions.delete(sub);
      }
    }
  }

  async getSubscribedEvents(pluginId: string): Promise<string[]> {
    const subscriptions = this.eventSubscriptions.get(pluginId);
    if (!subscriptions) return [];
    return Array.from(subscriptions).map(s => s.split(':')[0]);
  }

  async prepareForMarketplace(pluginId: string): Promise<MarketplaceListing> {
    const manifest = this.manifests.get(pluginId);
    if (!manifest) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    const state = this.lifecycleStates.get(pluginId);
    if (!state || state.status === 'uninstalled') {
      throw new Error(`Plugin ${pluginId} must be installed before marketplace preparation`);
    }

    const listing: MarketplaceListing = {
      id: uuid(),
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

  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id) throw new Error('Plugin manifest must have an id');
    if (!manifest.name) throw new Error('Plugin manifest must have a name');
    if (!manifest.version) throw new Error('Plugin manifest must have a version');
    if (!manifest.type) throw new Error('Plugin manifest must have a type');
    if (!manifest.author) throw new Error('Plugin manifest must have an author');
    if (!manifest.minCoreVersion) throw new Error('Plugin manifest must specify minCoreVersion');
    if (!Array.isArray(manifest.permissions)) {
      throw new Error('Plugin manifest permissions must be an array');
    }
    if (!Array.isArray(manifest.engineTypes) || manifest.engineTypes.length === 0) {
      throw new Error('Plugin manifest must specify at least one engineTypes');
    }
  }
}
