import { EventEmitter } from 'events';
import {
  PluginManifest,
  PluginManifestValidator,
  PluginRegistry,
  PluginBase,
  PluginContext,
  HookPayloads,
  HookName,
} from '../../sdk/src/index';

// ─── Plugin Listing ───────────────────────────────────────────────────────

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
  dependencies: Array<{ pluginId: string; version: string }>;
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

// ─── Install/Uninstall Workflow ───────────────────────────────────────────

export enum InstallStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  VALIDATING = 'validating',
  RESOLVING_DEPENDENCIES = 'resolving_dependencies',
  INSTALLING = 'installing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLING_BACK = 'rolling_back',
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

// ─── Version Management ───────────────────────────────────────────────────

export interface PluginVersion {
  pluginId: string;
  version: string;
  manifest: PluginManifest;
  publishedAt: Date;
  changelog: string;
  size: number;
  integrity: string; // SHA-256 hash
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

// ─── Dependency Resolution ────────────────────────────────────────────────

export class DependencyResolver {
  private _registry: PluginRegistry;
  private _marketplace: PluginMarketplace;

  constructor(registry: PluginRegistry, marketplace: PluginMarketplace) {
    this._registry = registry;
    this._marketplace = marketplace;
  }

  async resolveDependencies(
    pluginId: string,
    version: string
  ): Promise<DependencyGraph> {
    const graph = new DependencyGraph();
    const visited = new Set<string>();

    await this._resolveNode(pluginId, version, graph, visited);

    return graph;
  }

  private async _resolveNode(
    pluginId: string,
    version: string,
    graph: DependencyGraph,
    visited: Set<string>
  ): Promise<void> {
    const key = `${pluginId}@${version}`;
    if (visited.has(key)) {
      graph.circularDependencies.push(key);
      return;
    }

    visited.add(key);
    const listing = await this._marketplace.getPlugin(pluginId);
    if (!listing) {
      graph.missingDependencies.push(pluginId);
      return;
    }

    const pluginVersion = await this._marketplace.getPluginVersion(pluginId, version);
    if (!pluginVersion) {
      graph.missingDependencies.push(pluginId);
      return;
    }

    graph.nodes.push({ pluginId, version, dependencies: [] });

    for (const dep of pluginVersion.manifest.dependencies) {
      const resolvedDep = await this._resolveDependencyVersion(dep.pluginId, dep.version);
      if (resolvedDep) {
        graph.nodes[graph.nodes.length - 1].dependencies.push({
          pluginId: dep.pluginId,
          version: resolvedDep,
        });
        await this._resolveNode(dep.pluginId, resolvedDep, graph, new Set(visited));
      } else {
        graph.missingDependencies.push(dep.pluginId);
      }
    }

    visited.delete(key);
  }

  private async _resolveDependencyVersion(
    pluginId: string,
    versionRange: string
  ): Promise<string | null> {
    const versions = await this._marketplace.getPluginVersions(pluginId);
    const sorted = versions.sort((a, b) => compareVersions(b.version, a.version));

    for (const v of sorted) {
      if (this._satisfiesVersion(v.version, versionRange)) {
        return v.version;
      }
    }
    return null;
  }

  private _satisfiesVersion(version: string, range: string): boolean {
    const v = version.split('.').map(Number);
    const r = range.split('.').map(Number);
    return v[0] >= r[0] && v[1] >= r[1] && v[2] >= r[2];
  }
}

export class DependencyGraph {
  nodes: Array<{ pluginId: string; version: string; dependencies: Array<{ pluginId: string; version: string }> }> = [];
  circularDependencies: string[] = [];
  missingDependencies: string[] = [];

  get hasIssues(): boolean {
    return this.circularDependencies.length > 0 || this.missingDependencies.length > 0;
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

// ─── Plugin Configuration UI Model ────────────────────────────────────────

export interface PluginConfigField {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'file' | 'json';
  label: string;
  labelAr?: string;
  description?: string;
  descriptionAr?: string;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string; labelAr?: string }>;
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

export function generateConfigModel(manifest: PluginManifest): PluginConfigModel {
  const fields: PluginConfigField[] = manifest.settings.map((setting, index) => ({
    key: setting.key,
    type: setting.type as PluginConfigField['type'],
    label: setting.label,
    defaultValue: setting.defaultValue,
    options: setting.options?.map((opt) => ({ value: opt, label: opt })),
    required: setting.required,
    validation: setting.validation,
    order: index,
  }));

  return {
    pluginId: manifest.id,
    pluginName: manifest.name,
    version: manifest.version,
    groups: [
      {
        id: 'general',
        label: 'General Settings',
        order: 0,
      },
    ],
    fields,
  };
}

// ─── Plugin Marketplace ───────────────────────────────────────────────────

export class PluginMarketplace extends EventEmitter {
  private _plugins: Map<string, PluginListing> = new Map();
  private _versions: Map<string, PluginVersion[]> = new Map();
  private _installOps: Map<string, InstallOperation> = new Map();
  private _uninstallOps: Map<string, UninstallOperation> = new Map();
  private _registry: PluginRegistry;
  private _validator: PluginManifestValidator;

  constructor(registry: PluginRegistry) {
    super();
    this._registry = registry;
    this._validator = new PluginManifestValidator();
  }

  // Plugin Listing
  async search(filters: PluginSearchFilters): Promise<SearchResult> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    let results = Array.from(this._plugins.values());

    if (filters.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filters.type) {
      results = results.filter((p) => p.type === filters.type);
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter((p) => filters.tags!.some((t) => p.tags.includes(t)));
    }

    if (filters.minRating) {
      results = results.filter((p) => p.rating >= filters.minRating!);
    }

    if (filters.author) {
      results = results.filter((p) => p.author === filters.author);
    }

    // Sort
    const sortBy = filters.sortBy ?? 'downloads';
    const sortOrder = filters.sortOrder ?? 'desc';
    results.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'downloads':
          cmp = a.downloads - b.downloads;
          break;
        case 'rating':
          cmp = a.rating - b.rating;
          break;
        case 'updated':
          cmp = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    const total = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return { total, page, pageSize, plugins: paged };
  }

  async getPlugin(pluginId: string): Promise<PluginListing | undefined> {
    return this._plugins.get(pluginId);
  }

  async getPluginVersions(pluginId: string): Promise<PluginVersion[]> {
    return this._versions.get(pluginId) ?? [];
  }

  async getPluginVersion(pluginId: string, version: string): Promise<PluginVersion | undefined> {
    const versions = this._versions.get(pluginId) ?? [];
    return versions.find((v) => v.version === version);
  }

  // Publish
  async publishPlugin(
    listing: PluginListing,
    versions: PluginVersion[]
  ): Promise<void> {
    this._plugins.set(listing.id, listing);
    this._versions.set(listing.id, versions);
    this.emit('plugin:published', { pluginId: listing.id, version: listing.version });
  }

  async unpublishPlugin(pluginId: string): Promise<void> {
    this._plugins.delete(pluginId);
    this._versions.delete(pluginId);
    this.emit('plugin:unpublished', { pluginId });
  }

  // Install
  async installPlugin(
    pluginId: string,
    version: string,
    context: PluginContext
  ): Promise<InstallOperation> {
    const opId = `install-${pluginId}-${Date.now()}`;
    const operation: InstallOperation = {
      id: opId,
      pluginId,
      version,
      status: InstallStatus.PENDING,
      progress: 0,
      errors: [],
      warnings: [],
      dependenciesInstalled: [],
      startedAt: new Date(),
    };

    this._installOps.set(opId, operation);
    this.emit('install:started', operation);

    try {
      operation.status = InstallStatus.VALIDATING;
      this._emitProgress(operation, 10);

      const listing = await this.getPlugin(pluginId);
      if (!listing) {
        throw new Error(`Plugin "${pluginId}" not found in marketplace`);
      }

      const pluginVersion = await this.getPluginVersion(pluginId, version);
      if (!pluginVersion) {
        throw new Error(`Version "${version}" not found for plugin "${pluginId}"`);
      }

      const validation = this._validator.validate(pluginVersion.manifest);
      if (!validation.valid) {
        throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
      }

      operation.status = InstallStatus.RESOLVING_DEPENDENCIES;
      this._emitProgress(operation, 30);

      const resolver = new DependencyResolver(this._registry, this);
      const depGraph = await resolver.resolveDependencies(pluginId, version);

      if (depGraph.hasIssues) {
        if (depGraph.missingDependencies.length > 0) {
          operation.warnings.push(
            `Missing dependencies: ${depGraph.missingDependencies.join(', ')}`
          );
        }
        if (depGraph.circularDependencies.length > 0) {
          operation.warnings.push(
            `Circular dependencies detected: ${depGraph.circularDependencies.join(', ')}`
          );
        }
      }

      for (const dep of depGraph.nodes) {
        if (dep.pluginId !== pluginId) {
          operation.dependenciesInstalled.push(dep.pluginId);
        }
      }

      operation.status = InstallStatus.INSTALLING;
      this._emitProgress(operation, 70);

      const pluginInstance = new MarketplacePlugin(pluginVersion.manifest);
      await this._registry.register(pluginInstance);
      await this._registry.loadPlugin(pluginId, context);

      operation.status = InstallStatus.COMPLETED;
      operation.progress = 100;
      operation.completedAt = new Date();

      this.emit('install:completed', operation);
      this._updateListingStats(pluginId);
    } catch (error) {
      operation.status = InstallStatus.FAILED;
      operation.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('install:failed', operation);
    }

    return operation;
  }

  async uninstallPlugin(pluginId: string): Promise<UninstallOperation> {
    const opId = `uninstall-${pluginId}-${Date.now()}`;
    const affected: string[] = [];

    // Find plugins that depend on this one
    for (const [id, reg] of this._registry.listPlugins().entries()) {
      if (id !== pluginId) {
        const deps = reg.manifest.dependencies;
        if (deps.some((d) => d.pluginId === pluginId && d.required)) {
          affected.push(id);
        }
      }
    }

    const operation: UninstallOperation = {
      id: opId,
      pluginId,
      status: 'pending',
      affectedPlugins: affected,
      startedAt: new Date(),
    };

    this._uninstallOps.set(opId, operation);
    this.emit('uninstall:started', operation);

    try {
      operation.status = 'disabling';
      await this._registry.disablePlugin(pluginId);
      await this._registry.unregister(pluginId);

      operation.status = 'completed';
      operation.completedAt = new Date();
      this.emit('uninstall:completed', operation);
    } catch (error) {
      operation.status = 'failed';
      this.emit('uninstall:failed', operation);
    }

    return operation;
  }

  async checkForUpdates(): Promise<VersionUpdateCheck[]> {
    const updates: VersionUpdateCheck[] = [];
    const installed = this._registry.listPlugins('active');

    for (const reg of installed) {
      const versions = await this.getPluginVersions(reg.plugin.id);
      if (versions.length === 0) continue;

      const sorted = versions.sort((a, b) => compareVersions(b.version, a.version));
      const latest = sorted[0];

      if (compareVersions(latest.version, reg.manifest.version) > 0) {
        const currentParts = reg.manifest.version.split('.').map(Number);
        const latestParts = latest.version.split('.').map(Number);
        let updateType: 'major' | 'minor' | 'patch' | null = null;

        if (latestParts[0] > currentParts[0]) updateType = 'major';
        else if (latestParts[1] > currentParts[1]) updateType = 'minor';
        else updateType = 'patch';

        updates.push({
          pluginId: reg.plugin.id,
          currentVersion: reg.manifest.version,
          latestVersion: latest.version,
          hasUpdate: true,
          updateType,
          breakingChanges: updateType === 'major',
          versionsBehind: sorted.indexOf(latest),
        });
      }
    }

    return updates;
  }

  async getInstallOperation(opId: string): Promise<InstallOperation | undefined> {
    return this._installOps.get(opId);
  }

  async getUninstallOperation(opId: string): Promise<UninstallOperation | undefined> {
    return this._uninstallOps.get(opId);
  }

  // Config UI
  getConfigModel(pluginId: string): PluginConfigModel | null {
    const reg = this._registry.getPlugin(pluginId);
    if (!reg) return null;
    return generateConfigModel(reg.manifest);
  }

  // Private
  private _emitProgress(operation: InstallOperation, progress: number): void {
    operation.progress = progress;
    this.emit('install:progress', operation);
  }

  private _updateListingStats(pluginId: string): void {
    const listing = this._plugins.get(pluginId);
    if (listing) {
      listing.downloads++;
      this._plugins.set(pluginId, listing);
    }
  }
}

// ─── Marketplace Plugin Helper ────────────────────────────────────────────

class MarketplacePlugin extends PluginBase {
  constructor(manifest: PluginManifest) {
    super(manifest);
  }
}

// ─── Export ───────────────────────────────────────────────────────────────

export { MarketplacePlugin };
export default PluginMarketplace;
