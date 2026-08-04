import { v4 as uuid } from 'uuid';
import type { IAPIManager } from './interfaces';
import type {
  APIType,
  APIEndpoint,
  APIVersion,
  APIVersionPolicy,
  RateLimit,
  APIQuota,
} from './types';

export class APIManager implements IAPIManager {
  private endpoints: Map<string, APIEndpoint> = new Map();
  private versions: Map<string, APIVersion> = new Map();
  private rateLimits: Map<string, RateLimit> = new Map();
  private quotas: Map<string, APIQuota[]> = new Map();
  private usageMetrics: Map<string, Map<string, number>> = new Map();
  private wsChannels: Map<string, Record<string, unknown>> = new Map();

  private versionPolicy: APIVersionPolicy = {
    currentVersion: '1.0.0',
    supportedVersions: [],
    deprecationNoticeDays: 90,
    sunsetPeriodDays: 180,
    defaultVersion: '1.0.0',
    latestStable: '1.0.0',
  };

  async createAPI(type: APIType, config: Record<string, unknown>): Promise<APIEndpoint> {
    const path = config['path'] as string || `/${type.toLowerCase()}/${uuid().slice(0, 8)}`;
    if (this.endpoints.has(path)) {
      throw new Error(`API endpoint ${path} already exists`);
    }
    const endpoint: APIEndpoint = {
      path,
      method: (config['method'] as APIEndpoint['method']) || 'GET',
      apiType: type,
      version: config['version'] as string || this.versionPolicy.currentVersion,
      description: config['description'] as string || '',
      authentication: config['authentication'] !== false,
      rateLimited: config['rateLimited'] !== false,
      deprecated: false,
      tags: (config['tags'] as string[]) || [],
    };
    this.endpoints.set(path, endpoint);
    return endpoint;
  }

  async getAPI(path: string): Promise<APIEndpoint | undefined> {
    return this.endpoints.get(path);
  }

  async listAPIs(filter?: Partial<APIEndpoint>): Promise<APIEndpoint[]> {
    let results = Array.from(this.endpoints.values());
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined) {
          results = results.filter(e => (e as any)[key] === value);
        }
      }
    }
    return results;
  }

  async deleteAPI(path: string): Promise<void> {
    if (!this.endpoints.has(path)) {
      throw new Error(`API endpoint ${path} not found`);
    }
    this.endpoints.delete(path);
    this.rateLimits.delete(path);
  }

  async getVersionPolicy(): Promise<APIVersionPolicy> {
    return { ...this.versionPolicy };
  }

  async setVersionPolicy(policy: APIVersionPolicy): Promise<APIVersionPolicy> {
    this.versionPolicy = { ...policy };
    return this.versionPolicy;
  }

  async deprecateVersion(version: string, sunsetDate: string, migrationGuide?: string): Promise<APIVersion> {
    const existing = this.versions.get(version);
    const apiVersion: APIVersion = existing || {
      version,
      releaseDate: new Date().toISOString(),
      status: 'active',
      changelog: [],
      backwardCompatible: true,
    };
    apiVersion.status = 'deprecated';
    apiVersion.deprecationDate = new Date().toISOString();
    apiVersion.sunsetDate = sunsetDate;
    if (migrationGuide) apiVersion.migrationGuide = migrationGuide;
    this.versions.set(version, apiVersion);

    for (const endpoint of this.endpoints.values()) {
      if (endpoint.version === version) {
        endpoint.deprecated = true;
      }
    }
    return apiVersion;
  }

  async getActiveVersions(): Promise<APIVersion[]> {
    return Array.from(this.versions.values()).filter(v => v.status === 'active');
  }

  async setRateLimit(endpoint: string, config: RateLimit): Promise<void> {
    this.rateLimits.set(endpoint, config);
  }

  async getRateLimit(endpoint: string): Promise<RateLimit | undefined> {
    return this.rateLimits.get(endpoint);
  }

  async setQuota(apiKey: string, quota: APIQuota): Promise<void> {
    const existing = this.quotas.get(apiKey) || [];
    const idx = existing.findIndex(q => q.quotaId === quota.quotaId);
    if (idx >= 0) {
      existing[idx] = quota;
    } else {
      existing.push(quota);
    }
    this.quotas.set(apiKey, existing);
  }

  async getUsageMetrics(startDate: string, endDate: string): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};
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

  async generateGraphQLSchema(): Promise<string> {
    const typeDefs: string[] = [];
    for (const endpoint of this.endpoints.values()) {
      const typeName = endpoint.path.replace(/[^a-zA-Z0-9]/g, '_');
      if (endpoint.method === 'GET') {
        typeDefs.push(`  ${typeName}: JSON`);

      } else if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        typeDefs.push(`  ${typeName}(input: JSON): JSON`);
      }
    }
    return `type Query {\n${typeDefs.filter(() => true).join('\n')}\n}\n\ntype Mutation {\n${typeDefs.filter(() => true).join('\n')}\n}\n\nscalar JSON`;
  }

  async createWebSocketChannel(name: string, config: Record<string, unknown>): Promise<string> {
    const channelId = uuid();
    this.wsChannels.set(channelId, { name, ...config });
    return channelId;
  }

  async generateOpenAPISpec(): Promise<string> {
    const paths: Record<string, unknown> = {};
    for (const endpoint of this.endpoints.values()) {
      const method = endpoint.method.toLowerCase();
      if (!paths[endpoint.path]) paths[endpoint.path] = {};
      (paths[endpoint.path] as Record<string, unknown>)[method] = {
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
