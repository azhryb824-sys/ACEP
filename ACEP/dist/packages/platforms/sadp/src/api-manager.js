"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIManager = void 0;
const uuid_1 = require("uuid");
class APIManager {
    endpoints = new Map();
    versions = new Map();
    rateLimits = new Map();
    quotas = new Map();
    usageMetrics = new Map();
    wsChannels = new Map();
    versionPolicy = {
        currentVersion: '1.0.0',
        supportedVersions: [],
        deprecationNoticeDays: 90,
        sunsetPeriodDays: 180,
        defaultVersion: '1.0.0',
        latestStable: '1.0.0',
    };
    async createAPI(type, config) {
        const path = config['path'] || `/${type.toLowerCase()}/${(0, uuid_1.v4)().slice(0, 8)}`;
        if (this.endpoints.has(path)) {
            throw new Error(`API endpoint ${path} already exists`);
        }
        const endpoint = {
            path,
            method: config['method'] || 'GET',
            apiType: type,
            version: config['version'] || this.versionPolicy.currentVersion,
            description: config['description'] || '',
            authentication: config['authentication'] !== false,
            rateLimited: config['rateLimited'] !== false,
            deprecated: false,
            tags: config['tags'] || [],
        };
        this.endpoints.set(path, endpoint);
        return endpoint;
    }
    async getAPI(path) {
        return this.endpoints.get(path);
    }
    async listAPIs(filter) {
        let results = Array.from(this.endpoints.values());
        if (filter) {
            for (const [key, value] of Object.entries(filter)) {
                if (value !== undefined) {
                    results = results.filter(e => e[key] === value);
                }
            }
        }
        return results;
    }
    async deleteAPI(path) {
        if (!this.endpoints.has(path)) {
            throw new Error(`API endpoint ${path} not found`);
        }
        this.endpoints.delete(path);
        this.rateLimits.delete(path);
    }
    async getVersionPolicy() {
        return { ...this.versionPolicy };
    }
    async setVersionPolicy(policy) {
        this.versionPolicy = { ...policy };
        return this.versionPolicy;
    }
    async deprecateVersion(version, sunsetDate, migrationGuide) {
        const existing = this.versions.get(version);
        const apiVersion = existing || {
            version,
            releaseDate: new Date().toISOString(),
            status: 'active',
            changelog: [],
            backwardCompatible: true,
        };
        apiVersion.status = 'deprecated';
        apiVersion.deprecationDate = new Date().toISOString();
        apiVersion.sunsetDate = sunsetDate;
        if (migrationGuide)
            apiVersion.migrationGuide = migrationGuide;
        this.versions.set(version, apiVersion);
        for (const endpoint of this.endpoints.values()) {
            if (endpoint.version === version) {
                endpoint.deprecated = true;
            }
        }
        return apiVersion;
    }
    async getActiveVersions() {
        return Array.from(this.versions.values()).filter(v => v.status === 'active');
    }
    async setRateLimit(endpoint, config) {
        this.rateLimits.set(endpoint, config);
    }
    async getRateLimit(endpoint) {
        return this.rateLimits.get(endpoint);
    }
    async setQuota(apiKey, quota) {
        const existing = this.quotas.get(apiKey) || [];
        const idx = existing.findIndex(q => q.quotaId === quota.quotaId);
        if (idx >= 0) {
            existing[idx] = quota;
        }
        else {
            existing.push(quota);
        }
        this.quotas.set(apiKey, existing);
    }
    async getUsageMetrics(startDate, endDate) {
        const metrics = {};
        for (const [key, data] of this.usageMetrics.entries()) {
            let total = 0;
            for (const [date, count] of data.entries()) {
                if (date >= startDate && date <= endDate) {
                    total += count;
                }
            }
            metrics[key] = total;
        }
        return metrics;
    }
    async generateGraphQLSchema() {
        const typeDefs = [];
        for (const endpoint of this.endpoints.values()) {
            const typeName = endpoint.path.replace(/[^a-zA-Z0-9]/g, '_');
            if (endpoint.method === 'GET') {
                typeDefs.push(`  ${typeName}: JSON`);
            }
            else if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
                typeDefs.push(`  ${typeName}(input: JSON): JSON`);
            }
        }
        return `type Query {\n${typeDefs.filter(() => true).join('\n')}\n}\n\ntype Mutation {\n${typeDefs.filter(() => true).join('\n')}\n}\n\nscalar JSON`;
    }
    async createWebSocketChannel(name, config) {
        const channelId = (0, uuid_1.v4)();
        this.wsChannels.set(channelId, { name, ...config });
        return channelId;
    }
    async generateOpenAPISpec() {
        const paths = {};
        for (const endpoint of this.endpoints.values()) {
            const method = endpoint.method.toLowerCase();
            if (!paths[endpoint.path])
                paths[endpoint.path] = {};
            paths[endpoint.path][method] = {
                summary: endpoint.description,
                tags: endpoint.tags,
                deprecated: endpoint.deprecated,
                parameters: [
                    { name: 'version', in: 'header', schema: { type: 'string', default: endpoint.version } },
                ],
            };
        }
        return JSON.stringify({
            openapi: '3.0.0',
            info: { title: 'ACEP SADP API', version: this.versionPolicy.currentVersion },
            paths,
        }, null, 2);
    }
}
exports.APIManager = APIManager;
//# sourceMappingURL=api-manager.js.map