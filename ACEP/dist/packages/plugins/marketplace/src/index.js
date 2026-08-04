"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplacePlugin = exports.PluginMarketplace = exports.DependencyGraph = exports.DependencyResolver = exports.InstallStatus = void 0;
exports.generateConfigModel = generateConfigModel;
const events_1 = require("events");
const index_1 = require("../../sdk/src/index");
// ─── Install/Uninstall Workflow ───────────────────────────────────────────
var InstallStatus;
(function (InstallStatus) {
    InstallStatus["PENDING"] = "pending";
    InstallStatus["DOWNLOADING"] = "downloading";
    InstallStatus["VALIDATING"] = "validating";
    InstallStatus["RESOLVING_DEPENDENCIES"] = "resolving_dependencies";
    InstallStatus["INSTALLING"] = "installing";
    InstallStatus["COMPLETED"] = "completed";
    InstallStatus["FAILED"] = "failed";
    InstallStatus["ROLLING_BACK"] = "rolling_back";
})(InstallStatus || (exports.InstallStatus = InstallStatus = {}));
// ─── Dependency Resolution ────────────────────────────────────────────────
class DependencyResolver {
    _registry;
    _marketplace;
    constructor(registry, marketplace) {
        this._registry = registry;
        this._marketplace = marketplace;
    }
    async resolveDependencies(pluginId, version) {
        const graph = new DependencyGraph();
        const visited = new Set();
        await this._resolveNode(pluginId, version, graph, visited);
        return graph;
    }
    async _resolveNode(pluginId, version, graph, visited) {
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
            }
            else {
                graph.missingDependencies.push(dep.pluginId);
            }
        }
        visited.delete(key);
    }
    async _resolveDependencyVersion(pluginId, versionRange) {
        const versions = await this._marketplace.getPluginVersions(pluginId);
        const sorted = versions.sort((a, b) => compareVersions(b.version, a.version));
        for (const v of sorted) {
            if (this._satisfiesVersion(v.version, versionRange)) {
                return v.version;
            }
        }
        return null;
    }
    _satisfiesVersion(version, range) {
        const v = version.split('.').map(Number);
        const r = range.split('.').map(Number);
        return v[0] >= r[0] && v[1] >= r[1] && v[2] >= r[2];
    }
}
exports.DependencyResolver = DependencyResolver;
class DependencyGraph {
    nodes = [];
    circularDependencies = [];
    missingDependencies = [];
    get hasIssues() {
        return this.circularDependencies.length > 0 || this.missingDependencies.length > 0;
    }
}
exports.DependencyGraph = DependencyGraph;
function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (pa[i] !== pb[i])
            return pa[i] - pb[i];
    }
    return 0;
}
function generateConfigModel(manifest) {
    const fields = manifest.settings.map((setting, index) => ({
        key: setting.key,
        type: setting.type,
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
class PluginMarketplace extends events_1.EventEmitter {
    _plugins = new Map();
    _versions = new Map();
    _installOps = new Map();
    _uninstallOps = new Map();
    _registry;
    _validator;
    constructor(registry) {
        super();
        this._registry = registry;
        this._validator = new index_1.PluginManifestValidator();
    }
    // Plugin Listing
    async search(filters) {
        const page = filters.page ?? 1;
        const pageSize = filters.pageSize ?? 20;
        let results = Array.from(this._plugins.values());
        if (filters.query) {
            const q = filters.query.toLowerCase();
            results = results.filter((p) => p.name.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.tags.some((t) => t.toLowerCase().includes(q)));
        }
        if (filters.type) {
            results = results.filter((p) => p.type === filters.type);
        }
        if (filters.tags && filters.tags.length > 0) {
            results = results.filter((p) => filters.tags.some((t) => p.tags.includes(t)));
        }
        if (filters.minRating) {
            results = results.filter((p) => p.rating >= filters.minRating);
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
    async getPlugin(pluginId) {
        return this._plugins.get(pluginId);
    }
    async getPluginVersions(pluginId) {
        return this._versions.get(pluginId) ?? [];
    }
    async getPluginVersion(pluginId, version) {
        const versions = this._versions.get(pluginId) ?? [];
        return versions.find((v) => v.version === version);
    }
    // Publish
    async publishPlugin(listing, versions) {
        this._plugins.set(listing.id, listing);
        this._versions.set(listing.id, versions);
        this.emit('plugin:published', { pluginId: listing.id, version: listing.version });
    }
    async unpublishPlugin(pluginId) {
        this._plugins.delete(pluginId);
        this._versions.delete(pluginId);
        this.emit('plugin:unpublished', { pluginId });
    }
    // Install
    async installPlugin(pluginId, version, context) {
        const opId = `install-${pluginId}-${Date.now()}`;
        const operation = {
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
                    operation.warnings.push(`Missing dependencies: ${depGraph.missingDependencies.join(', ')}`);
                }
                if (depGraph.circularDependencies.length > 0) {
                    operation.warnings.push(`Circular dependencies detected: ${depGraph.circularDependencies.join(', ')}`);
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
        }
        catch (error) {
            operation.status = InstallStatus.FAILED;
            operation.errors.push(error instanceof Error ? error.message : String(error));
            this.emit('install:failed', operation);
        }
        return operation;
    }
    async uninstallPlugin(pluginId) {
        const opId = `uninstall-${pluginId}-${Date.now()}`;
        const affected = [];
        // Find plugins that depend on this one
        for (const [id, reg] of this._registry.listPlugins().entries()) {
            if (id !== pluginId) {
                const deps = reg.manifest.dependencies;
                if (deps.some((d) => d.pluginId === pluginId && d.required)) {
                    affected.push(id);
                }
            }
        }
        const operation = {
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
        }
        catch (error) {
            operation.status = 'failed';
            this.emit('uninstall:failed', operation);
        }
        return operation;
    }
    async checkForUpdates() {
        const updates = [];
        const installed = this._registry.listPlugins('active');
        for (const reg of installed) {
            const versions = await this.getPluginVersions(reg.plugin.id);
            if (versions.length === 0)
                continue;
            const sorted = versions.sort((a, b) => compareVersions(b.version, a.version));
            const latest = sorted[0];
            if (compareVersions(latest.version, reg.manifest.version) > 0) {
                const currentParts = reg.manifest.version.split('.').map(Number);
                const latestParts = latest.version.split('.').map(Number);
                let updateType = null;
                if (latestParts[0] > currentParts[0])
                    updateType = 'major';
                else if (latestParts[1] > currentParts[1])
                    updateType = 'minor';
                else
                    updateType = 'patch';
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
    async getInstallOperation(opId) {
        return this._installOps.get(opId);
    }
    async getUninstallOperation(opId) {
        return this._uninstallOps.get(opId);
    }
    // Config UI
    getConfigModel(pluginId) {
        const reg = this._registry.getPlugin(pluginId);
        if (!reg)
            return null;
        return generateConfigModel(reg.manifest);
    }
    // Private
    _emitProgress(operation, progress) {
        operation.progress = progress;
        this.emit('install:progress', operation);
    }
    _updateListingStats(pluginId) {
        const listing = this._plugins.get(pluginId);
        if (listing) {
            listing.downloads++;
            this._plugins.set(pluginId, listing);
        }
    }
}
exports.PluginMarketplace = PluginMarketplace;
// ─── Marketplace Plugin Helper ────────────────────────────────────────────
class MarketplacePlugin extends index_1.PluginBase {
    constructor(manifest) {
        super(manifest);
    }
}
exports.MarketplacePlugin = MarketplacePlugin;
exports.default = PluginMarketplace;
//# sourceMappingURL=index.js.map