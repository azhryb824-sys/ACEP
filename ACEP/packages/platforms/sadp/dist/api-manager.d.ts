import type { IAPIManager } from './interfaces';
import type { APIType, APIEndpoint, APIVersion, APIVersionPolicy, RateLimit, APIQuota } from './types';
export declare class APIManager implements IAPIManager {
    private endpoints;
    private versions;
    private rateLimits;
    private quotas;
    private usageMetrics;
    private wsChannels;
    private versionPolicy;
    createAPI(type: APIType, config: Record<string, unknown>): Promise<APIEndpoint>;
    getAPI(path: string): Promise<APIEndpoint | undefined>;
    listAPIs(filter?: Partial<APIEndpoint>): Promise<APIEndpoint[]>;
    deleteAPI(path: string): Promise<void>;
    getVersionPolicy(): Promise<APIVersionPolicy>;
    setVersionPolicy(policy: APIVersionPolicy): Promise<APIVersionPolicy>;
    deprecateVersion(version: string, sunsetDate: string, migrationGuide?: string): Promise<APIVersion>;
    getActiveVersions(): Promise<APIVersion[]>;
    setRateLimit(endpoint: string, config: RateLimit): Promise<void>;
    getRateLimit(endpoint: string): Promise<RateLimit | undefined>;
    setQuota(apiKey: string, quota: APIQuota): Promise<void>;
    getUsageMetrics(startDate: string, endDate: string): Promise<Record<string, number>>;
    generateGraphQLSchema(): Promise<string>;
    createWebSocketChannel(name: string, config: Record<string, unknown>): Promise<string>;
    generateOpenAPISpec(): Promise<string>;
}
//# sourceMappingURL=api-manager.d.ts.map