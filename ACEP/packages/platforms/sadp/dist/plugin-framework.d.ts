import type { IPluginFramework } from './interfaces';
import type { PluginManifest, PluginPermission, PluginStatus, PluginType, PluginLifecycleState, PluginHook, PluginSandbox, MarketplaceListing } from './types';
export declare class PluginFramework implements IPluginFramework {
    private manifests;
    private lifecycleStates;
    private sandboxes;
    private hooks;
    private eventSubscriptions;
    private reviews;
    private installCounts;
    register(manifest: PluginManifest): Promise<PluginManifest>;
    unregister(pluginId: string): Promise<void>;
    getManifest(pluginId: string): Promise<PluginManifest | undefined>;
    listPlugins(type?: PluginType, status?: PluginStatus): Promise<PluginManifest[]>;
    validate(pluginId: string): Promise<boolean>;
    install(pluginId: string, config?: Record<string, unknown>): Promise<PluginLifecycleState>;
    enable(pluginId: string): Promise<PluginLifecycleState>;
    disable(pluginId: string): Promise<PluginLifecycleState>;
    uninstall(pluginId: string): Promise<PluginLifecycleState>;
    getLifecycleState(pluginId: string): Promise<PluginLifecycleState | undefined>;
    getSandbox(pluginId: string): Promise<PluginSandbox>;
    updateSandbox(pluginId: string, config: Partial<PluginSandbox>): Promise<PluginSandbox>;
    getPermissions(pluginId: string): Promise<PluginPermission[]>;
    checkPermission(pluginId: string, resource: string, action: string): Promise<boolean>;
    registerHook(pluginId: string, hook: PluginHook): Promise<void>;
    unregisterHook(pluginId: string, hookId: string): Promise<void>;
    getHooks(target: string, type?: string): Promise<PluginHook[]>;
    executeHooks(target: string, type: string, context: Record<string, unknown>): Promise<Record<string, unknown>>;
    subscribeEvent(pluginId: string, event: string, handler: string): Promise<void>;
    unsubscribeEvent(pluginId: string, event: string): Promise<void>;
    getSubscribedEvents(pluginId: string): Promise<string[]>;
    prepareForMarketplace(pluginId: string): Promise<MarketplaceListing>;
    private validateManifest;
}
//# sourceMappingURL=plugin-framework.d.ts.map