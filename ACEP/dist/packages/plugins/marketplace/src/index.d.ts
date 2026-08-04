import { EventEmitter } from 'events';
import { PluginManifest, PluginRegistry, PluginBase, PluginContext } from '../../sdk/src/index';
export interface PluginListing {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    type: PluginManifest['type'];
    tags: string[];
    downloads: number;
    rating: number;
    reviews: number;
    publishedAt: Date;
    updatedAt: Date;
    compatibility: {
        minCoreVersion: string;
        maxCoreVersion?: string;
        testedVersions: string[];
    };
    dependencies: Array<{
        pluginId: string;
        version: string;
    }>;
    screenshots?: string[];
    documentation?: string;
    repository?: string;
    license?: string;
}
export interface PluginSearchFilters {
    query?: string;
    type?: PluginManifest['type'];
    tags?: string[];
    minRating?: number;
    author?: string;
    sortBy?: 'downloads' | 'rating' | 'updated' | 'name';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
export interface SearchResult {
    total: number;
    page: number;
    pageSize: number;
    plugins: PluginListing[];
}
export declare enum InstallStatus {
    PENDING = "pending",
    DOWNLOADING = "downloading",
    VALIDATING = "validating",
    RESOLVING_DEPENDENCIES = "resolving_dependencies",
    INSTALLING = "installing",
    COMPLETED = "completed",
    FAILED = "failed",
    ROLLING_BACK = "rolling_back"
}
export interface InstallOperation {
    id: string;
    pluginId: string;
    version: string;
    status: InstallStatus;
    progress: number;
    errors: string[];
    warnings: string[];
    dependenciesInstalled: string[];
    startedAt: Date;
    completedAt?: Date;
}
export interface UninstallOperation {
    id: string;
    pluginId: string;
    status: 'pending' | 'disabling' | 'uninstalling' | 'completed' | 'failed';
    affectedPlugins: string[];
    startedAt: Date;
    completedAt?: Date;
}
export interface PluginVersion {
    pluginId: string;
    version: string;
    manifest: PluginManifest;
    publishedAt: Date;
    changelog: string;
    size: number;
    integrity: string;
    isLatest: boolean;
    isDeprecated: boolean;
    deprecationMessage?: string;
}
export interface VersionUpdateCheck {
    pluginId: string;
    currentVersion: string;
    latestVersion: string | null;
    hasUpdate: boolean;
    updateType: 'major' | 'minor' | 'patch' | null;
    breakingChanges: boolean;
    versionsBehind: number;
}
export declare class DependencyResolver {
    private _registry;
    private _marketplace;
    constructor(registry: PluginRegistry, marketplace: PluginMarketplace);
    resolveDependencies(pluginId: string, version: string): Promise<DependencyGraph>;
    private _resolveNode;
    private _resolveDependencyVersion;
    private _satisfiesVersion;
}
export declare class DependencyGraph {
    nodes: Array<{
        pluginId: string;
        version: string;
        dependencies: Array<{
            pluginId: string;
            version: string;
        }>;
    }>;
    circularDependencies: string[];
    missingDependencies: string[];
    get hasIssues(): boolean;
}
export interface PluginConfigField {
    key: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'file' | 'json';
    label: string;
    labelAr?: string;
    description?: string;
    descriptionAr?: string;
    defaultValue?: unknown;
    options?: Array<{
        value: string;
        label: string;
        labelAr?: string;
    }>;
    required: boolean;
    placeholder?: string;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        maxLength?: number;
        minLength?: number;
    };
    group?: string;
    order?: number;
}
export interface PluginConfigGroup {
    id: string;
    label: string;
    labelAr?: string;
    description?: string;
    order?: number;
}
export interface PluginConfigModel {
    pluginId: string;
    pluginName: string;
    version: string;
    groups: PluginConfigGroup[];
    fields: PluginConfigField[];
}
export declare function generateConfigModel(manifest: PluginManifest): PluginConfigModel;
export declare class PluginMarketplace extends EventEmitter {
    private _plugins;
    private _versions;
    private _installOps;
    private _uninstallOps;
    private _registry;
    private _validator;
    constructor(registry: PluginRegistry);
    search(filters: PluginSearchFilters): Promise<SearchResult>;
    getPlugin(pluginId: string): Promise<PluginListing | undefined>;
    getPluginVersions(pluginId: string): Promise<PluginVersion[]>;
    getPluginVersion(pluginId: string, version: string): Promise<PluginVersion | undefined>;
    publishPlugin(listing: PluginListing, versions: PluginVersion[]): Promise<void>;
    unpublishPlugin(pluginId: string): Promise<void>;
    installPlugin(pluginId: string, version: string, context: PluginContext): Promise<InstallOperation>;
    uninstallPlugin(pluginId: string): Promise<UninstallOperation>;
    checkForUpdates(): Promise<VersionUpdateCheck[]>;
    getInstallOperation(opId: string): Promise<InstallOperation | undefined>;
    getUninstallOperation(opId: string): Promise<UninstallOperation | undefined>;
    getConfigModel(pluginId: string): PluginConfigModel | null;
    private _emitProgress;
    private _updateListingStats;
}
declare class MarketplacePlugin extends PluginBase {
    constructor(manifest: PluginManifest);
}
export { MarketplacePlugin };
export default PluginMarketplace;
//# sourceMappingURL=index.d.ts.map