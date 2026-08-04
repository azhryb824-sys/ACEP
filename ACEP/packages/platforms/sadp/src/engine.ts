import { BaseEngine } from '@acep/core';
import { v4 as uuid } from 'uuid';
import type { IDeveloperPlatform, IAPIManager, IPluginFramework, ISDKManager, IWebhookManager, IMarketplaceManager, IDocumentationService, WebhookDeliveryLog } from './interfaces';
import type {
  APIType,
  APIEndpoint,
  APIVersion,
  APIVersionPolicy,
  SDKLanguage,
  SDKConfig,
  SDKGenerationResult,
  PluginType,
  PluginManifest,
  PluginStatus,
  PluginLifecycleState,
  PluginHook,
  PluginSandbox,
  MarketplaceListing,
  WebhookConfig,
  APISecurity,
  RateLimit,
  APIQuota,
  DeveloperEnvironment,
  DeveloperPortal,
  DeveloperTrustIndex,
  DeveloperProfile,
  DeveloperMetrics,
  ConnectorConfig,
} from './types';
import { EventType } from './types';
import type { MarketplaceReview } from './interfaces';
import { APIManager } from './api-manager';
import { PluginFramework } from './plugin-framework';

export class DeveloperPlatform extends BaseEngine implements IDeveloperPlatform {
  private apiManager: APIManager;
  private pluginFramework: PluginFramework;
  private sdkResults: Map<string, SDKGenerationResult> = new Map();
  private webhooks: Map<string, WebhookConfig> = new Map();
  private deliveryLogs: Map<string, WebhookDeliveryLog[]> = new Map();
  private marketplaceListings: Map<string, MarketplaceListing> = new Map();
  private marketplaceReviews: Map<string, MarketplaceReview[]> = new Map();
  private profiles: Map<string, DeveloperProfile> = new Map();
  private connectors: Map<string, ConnectorConfig> = new Map();
  private developerPortal: DeveloperPortal;
  private developerEnvironment: DeveloperEnvironment;
  private apiSecurity: APISecurity;
  private eventListeners: Map<EventType, Set<(payload: Record<string, unknown>) => Promise<void>>> = new Map();

  constructor(config?: Record<string, unknown>) {
    super('DeveloperPlatform', '1.0.0', config);
    this.apiManager = new APIManager();
    this.pluginFramework = new PluginFramework();

    this.developerPortal = {
      enabled: true,
      authentication: {
        methods: ['email', 'google', 'github'],
        sessionTimeoutMinutes: 60,
        mfaRequired: false,
        apiKeyGeneration: true,
      },
      theme: {
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        logo: '/logo.png',
        favicon: '/favicon.ico',
      },
      pages: [],
      apiReferences: true,
      forums: true,
      blog: false,
      announcements: true,
      support: {
        email: 'developers@acep.com',
        documentationUrl: '/docs',
        faqEnabled: true,
        ticketSystem: true,
        liveChat: false,
        communityForum: true,
      },
    };

    this.developerEnvironment = {
      sandbox: { enabled: true, maxEnvironments: 5, maxDurationHours: 24, autoCleanup: true, allowedAPIs: ['REST', 'GraphQL', 'WebSocket'], dataIsolation: true, networkAccess: false, resourceLimits: { cpu: '1', memory: '512Mi', storage: '5Gi', maxRequestsPerMin: 60, maxConcurrentRequests: 5 } },
      testData: { enabled: true, datasets: ['sample_projects', 'sample_boqs'], maxRecords: 1000, seedData: true, anonymize: true, refreshInterval: '24h' },
      mockServices: { enabled: true, endpoints: ['/api/v1/*'], latencySimulation: true, minLatencyMs: 50, maxLatencyMs: 500, errorSimulation: true, errorRate: 0.05 },
      apiExplorer: { enabled: true, tryItEnabled: true, codeGeneration: true, showSchemas: true, authenticationPreset: true },
      postmanCollections: { enabled: true, autoGenerate: true, includeExamples: true, includeTests: false, environmentPresets: ['development', 'production'] },
      cli: { enabled: true, commands: ['init', 'deploy', 'logs', 'config', 'plugins'], autoComplete: true, outputFormat: 'json', interactiveMode: true },
      codeGeneration: { enabled: true, languages: ['TypeScript', 'Python', 'Java', 'Go'], includeTypes: true, includeDocs: true, includeExamples: true, styleGuide: 'default' },
    };

    this.apiSecurity = {
      rateLimit: { windowMs: 60000, maxRequests: 100 },
      throttling: { enabled: true, strategy: 'tokenBucket', tokensPerSecond: 10, burstSize: 20, maxQueueSize: 100 },
      quotas: [],
      ipAllowList: { enabled: false, allowedIPs: [], allowedCIDRs: [], deniedIPs: [], deniedCIDRs: [], mode: 'whitelist' },
      usageMonitoring: { enabled: true, metrics: ['requests', 'latency', 'errors', 'bandwidth', 'endpoints', 'users'], retentionDays: 90, samplingRate: 1.0, aggregationInterval: '1m' },
      errorLogging: { enabled: true, logLevel: 'error', captureRequestBody: false, captureResponseBody: false, sensitiveFields: ['password', 'secret', 'token', 'authorization'], retentionDays: 30, destination: 'console' },
      performanceMonitoring: { enabled: true, metrics: ['latency', 'throughput', 'errorRate', 'cpu', 'memory', 'concurrentConnections'], alertThresholds: { latency: 1000, errorRate: 0.05, cpu: 80 }, tracingEnabled: true, samplingRate: 0.1 },
    };

    for (const event of Object.values(EventType)) {
      this.eventListeners.set(event, new Set());
    }
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
  }

  async validate(): Promise<boolean> {
    return this.apiManager !== undefined && this.pluginFramework !== undefined;
  }

  getAPIManager(): IAPIManager { return this.apiManager; }
  getPluginFramework(): IPluginFramework { return this.pluginFramework; }

  getSDKManager(): ISDKManager {
    return {
      generate: (lang, ver, opts) => this.generateSDK(lang, ver, opts),
      listGenerated: () => this.listGeneratedSDKs(),
      getPackage: (lang, ver) => this.getSDKPackage(lang, ver),
      deletePackage: (lang, ver) => this.deleteSDKPackage(lang, ver),
      getConfig: async () => this.getSDKConfig(),
      updateConfig: (cfg) => this.updateSDKConfig(cfg),
      getSupportedLanguages: async () => ['Python', 'TypeScript', 'CSharp', 'Java', 'Kotlin', 'Swift', 'Dart', 'Go'],
      generateClientCode: (ep, lang) => this.generateClientCode(ep, lang),
    };
  }

  getWebhookManager(): IWebhookManager {
    return {
      register: (cfg) => this.registerWebhook(cfg),
      update: (id, cfg) => this.updateWebhook(id, cfg),
      remove: (id) => this.removeWebhook(id),
      get: (id) => this.getWebhook(id),
      list: (f) => this.listWebhooks(f),
      trigger: (ev, payload) => this.triggerEvent(ev, payload),
      getDeliveryLogs: (id, limit) => this.getDeliveryLogs(id, limit),
      test: (id) => this.testWebhook(id),
      getSecret: (id) => this.getWebhookSecret(id),
      rotateSecret: (id) => this.rotateWebhookSecret(id),
    };
  }

  getMarketplaceManager(): IMarketplaceManager {
    return {
      publish: (l) => this.publishListing(l),
      update: (id, u) => this.updateListing(id, u),
      unpublish: (id) => this.unpublishListing(id),
      getListing: (id) => this.getMarketplaceListing(id),
      search: (q, f) => this.searchMarketplace(q, f),
      getByCategory: (c) => this.getByCategory(c),
      getFeatured: () => this.getFeaturedListings(),
      submitForReview: (id) => this.submitForReview(id),
      approveListing: (id, r, n) => this.approveMarketplaceListing(id, r, n),
      rejectListing: (id, r, reason) => this.rejectMarketplaceListing(id, r, reason),
      addReview: (id, d, r, c) => this.addMarketplaceReview(id, d, r, c),
      getReviews: (id) => this.getMarketplaceReviews(id),
      getInstallCount: (id) => this.getMarketplaceInstallCount(id),
      incrementInstallCount: (id) => this.incrementMarketplaceInstallCount(id),
    };
  }

  getDocumentationService(): IDocumentationService {
    return {
      generateAPIDocs: (t, v) => this.generateAPIDocs(t, v),
      generateSDKDocs: (l, v) => this.generateSDKDocs(l, v),
      generateGettingStarted: async () => '# Getting Started with ACEP SADP\n\nWelcome to the ACEP SDK & Developer Platform.',
      generateGuides: async () => ['# Authentication Guide', '# Plugin Development Guide', '# API Usage Guide'],
      generateChangelog: (v) => this.generateChangelog(v),
      getEndpointDocs: (p) => this.getEndpointDocs(p),
      searchDocs: (q) => this.searchDocumentation(q),
    };
  }

  async getDeveloperPortal(): Promise<DeveloperPortal> {
    return { ...this.developerPortal };
  }

  async updateDeveloperPortal(config: Partial<DeveloperPortal>): Promise<DeveloperPortal> {
    this.developerPortal = { ...this.developerPortal, ...config };
    return this.developerPortal;
  }

  async getDeveloperEnvironment(): Promise<DeveloperEnvironment> {
    return { ...this.developerEnvironment };
  }

  async configureDeveloperEnvironment(config: Partial<DeveloperEnvironment>): Promise<DeveloperEnvironment> {
    this.developerEnvironment = { ...this.developerEnvironment, ...config };
    return this.developerEnvironment;
  }

  async getAPISecurity(): Promise<APISecurity> {
    return { ...this.apiSecurity };
  }

  async updateAPISecurity(config: Partial<APISecurity>): Promise<APISecurity> {
    this.apiSecurity = { ...this.apiSecurity, ...config };
    return this.apiSecurity;
  }

  async getDeveloperTrustIndex(developerId: string): Promise<DeveloperTrustIndex> {
    const profile = this.profiles.get(developerId);
    if (!profile) {
      return {
        overall: 50, codeQuality: 50, testResults: 50, failures: 0,
        issueResponse: 50, security: 50, userRating: 50, compatibility: 50,
        lastUpdated: new Date().toISOString(), trend: 'stable',
      };
    }
    return profile.trustIndex;
  }

  async getDeveloperProfile(developerId: string): Promise<DeveloperProfile> {
    const existing = this.profiles.get(developerId);
    if (!existing) {
      throw new Error(`Developer ${developerId} not found`);
    }
    return existing;
  }

  async getDeveloperMetrics(developerId: string): Promise<DeveloperMetrics> {
    return {
      totalApps: 0, activeApps: 0, totalAPIKeys: 0, totalRequests: 0,
      avgLatency: 0, errorRate: 0, uptime: 100, lastActivity: new Date().toISOString(),
    };
  }

  async registerConnector(config: ConnectorConfig): Promise<ConnectorConfig> {
    if (this.connectors.has(config.id)) {
      throw new Error(`Connector ${config.id} already exists`);
    }
    this.connectors.set(config.id, { ...config });
    return config;
  }

  async getConnectors(): Promise<ConnectorConfig[]> {
    return Array.from(this.connectors.values());
  }

  async removeConnector(connectorId: string): Promise<void> {
    if (!this.connectors.has(connectorId)) {
      throw new Error(`Connector ${connectorId} not found`);
    }
    this.connectors.delete(connectorId);
  }

  async getAPIEndpoints(): Promise<APIEndpoint[]> {
    return this.apiManager.listAPIs();
  }

  async publishEvent(event: EventType, payload: Record<string, unknown>): Promise<void> {
    await this.triggerEvent(event, payload);
  }

  async subscribeToEvent(event: EventType, handler: (payload: Record<string, unknown>) => Promise<void>): Promise<void> {
    const listeners = this.eventListeners.get(event);
    if (!listeners) throw new Error(`Unknown event type: ${event}`);
    listeners.add(handler);
  }

  private async generateSDK(language: SDKLanguage, apiVersion: string, options?: Record<string, unknown>): Promise<SDKGenerationResult> {
    const key = `${language}:${apiVersion}`;
    const result: SDKGenerationResult = {
      language,
      version: apiVersion,
      packageUrl: `https://packages.acep.com/sdk/${language.toLowerCase()}/${apiVersion}`,
      files: 0,
      linesOfCode: 0,
      sizeBytes: 0,
      generatedAt: new Date().toISOString(),
    };
    this.sdkResults.set(key, result);
    return result;
  }

  private async listGeneratedSDKs(): Promise<SDKGenerationResult[]> {
    return Array.from(this.sdkResults.values());
  }

  private async getSDKPackage(language: SDKLanguage, version: string): Promise<SDKGenerationResult | undefined> {
    return this.sdkResults.get(`${language}:${version}`);
  }

  private async deleteSDKPackage(language: SDKLanguage, version: string): Promise<void> {
    this.sdkResults.delete(`${language}:${version}`);
  }

  private async getSDKConfig(): Promise<SDKConfig> {
    return {
      language: 'TypeScript',
      version: '1.0.0',
      packageName: '@acep/sdk',
      namespace: 'ACEP.SDK',
      apiVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      features: ['rest', 'graphql', 'websocket'],
      authentication: ['APIKey', 'OAuth2'],
    };
  }

  private async updateSDKConfig(config: Partial<SDKConfig>): Promise<SDKConfig> {
    const current = await this.getSDKConfig();
    return { ...current, ...config };
  }

  private async generateClientCode(endpoint: string, language: SDKLanguage): Promise<string> {
    return `// Auto-generated ${language} client for ${endpoint}\n// Generated by ACEP SADP\n`;
  }

  private async registerWebhook(config: WebhookConfig): Promise<WebhookConfig> {
    const webhook: WebhookConfig = {
      ...config,
      id: config.id || uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failureCount: 0,
    };
    this.webhooks.set(webhook.id, webhook);
    this.deliveryLogs.set(webhook.id, []);
    return webhook;
  }

  private async updateWebhook(webhookId: string, config: Partial<WebhookConfig>): Promise<WebhookConfig> {
    const existing = this.webhooks.get(webhookId);
    if (!existing) throw new Error(`Webhook ${webhookId} not found`);
    const updated: WebhookConfig = { ...existing, ...config, updatedAt: new Date().toISOString() };
    this.webhooks.set(webhookId, updated);
    return updated;
  }

  private async removeWebhook(webhookId: string): Promise<void> {
    if (!this.webhooks.has(webhookId)) throw new Error(`Webhook ${webhookId} not found`);
    this.webhooks.delete(webhookId);
    this.deliveryLogs.delete(webhookId);
  }

  private async getWebhook(webhookId: string): Promise<WebhookConfig | undefined> {
    return this.webhooks.get(webhookId);
  }

  private async listWebhooks(filters?: Partial<WebhookConfig>): Promise<WebhookConfig[]> {
    let results = Array.from(this.webhooks.values());
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) {
          results = results.filter(w => (w as any)[key] === value);
        }
      }
    }
    return results;
  }

  private async triggerEvent(event: EventType, payload: Record<string, unknown>): Promise<void> {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const handler of listeners) {
        try { await handler(payload); } catch { /* ignore handler errors */ }
      }
    }

    const matchingWebhooks = Array.from(this.webhooks.values())
      .filter(w => w.active && w.events.includes(event));

    for (const webhook of matchingWebhooks) {
      const log: WebhookDeliveryLog = {
        id: uuid(),
        webhookId: webhook.id,
        event,
        url: webhook.url,
        status: 200,
        success: true,
        durationMs: 0,
        attempt: 1,
        request: { event, payload },
        response: {},
        timestamp: new Date().toISOString(),
      };
      const logs = this.deliveryLogs.get(webhook.id) || [];
      logs.push(log);
      this.deliveryLogs.set(webhook.id, logs);
    }
  }

  private async getDeliveryLogs(webhookId: string, limit?: number): Promise<WebhookDeliveryLog[]> {
    const logs = this.deliveryLogs.get(webhookId) || [];
    return limit ? logs.slice(-limit) : logs;
  }

  private async testWebhook(webhookId: string): Promise<boolean> {
    const webhook = this.webhooks.get(webhookId);
    return webhook !== undefined && webhook.active;
  }

  private async getWebhookSecret(webhookId: string): Promise<string> {
    return `whs_${uuid().replace(/-/g, '')}`;
  }

  private async rotateWebhookSecret(webhookId: string): Promise<string> {
    return `whs_${uuid().replace(/-/g, '')}`;
  }

  private async publishListing(listing: MarketplaceListing): Promise<MarketplaceListing> {
    const full: MarketplaceListing = {
      ...listing,
      id: listing.id || uuid(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };
    this.marketplaceListings.set(full.id, full);
    this.marketplaceReviews.set(full.id, []);
    return full;
  }

  private async updateListing(listingId: string, updates: Partial<MarketplaceListing>): Promise<MarketplaceListing> {
    const existing = this.marketplaceListings.get(listingId);
    if (!existing) throw new Error(`Listing ${listingId} not found`);
    const updated = { ...existing, ...updates };
    this.marketplaceListings.set(listingId, updated);
    return updated;
  }

  private async unpublishListing(listingId: string): Promise<void> {
    if (!this.marketplaceListings.has(listingId)) throw new Error(`Listing ${listingId} not found`);
    this.marketplaceListings.delete(listingId);
    this.marketplaceReviews.delete(listingId);
  }

  private async getMarketplaceListing(listingId: string): Promise<MarketplaceListing | undefined> {
    return this.marketplaceListings.get(listingId);
  }

  private async searchMarketplace(query: string, filters?: Record<string, unknown>): Promise<MarketplaceListing[]> {
    let results = Array.from(this.marketplaceListings.values());
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(l =>
        l.manifest.name.toLowerCase().includes(q) ||
        l.manifest.description.toLowerCase().includes(q) ||
        l.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return results;
  }

  private async getByCategory(category: string): Promise<MarketplaceListing[]> {
    return Array.from(this.marketplaceListings.values())
      .filter(l => l.category === category);
  }

  private async getFeaturedListings(): Promise<MarketplaceListing[]> {
    return Array.from(this.marketplaceListings.values())
      .filter(l => l.featured && l.status === 'published');
  }

  private async submitForReview(listingId: string): Promise<MarketplaceListing> {
    const listing = this.marketplaceListings.get(listingId);
    if (!listing) throw new Error(`Listing ${listingId} not found`);
    listing.status = 'pending';
    return listing;
  }

  private async approveMarketplaceListing(listingId: string, reviewerId: string, notes?: string): Promise<MarketplaceListing> {
    const listing = this.marketplaceListings.get(listingId);
    if (!listing) throw new Error(`Listing ${listingId} not found`);
    listing.status = 'approved';
    listing.reviewerId = reviewerId;
    listing.reviewNotes = notes;
    listing.reviewedAt = new Date().toISOString();
    listing.approvedAt = new Date().toISOString();
    return listing;
  }

  private async rejectMarketplaceListing(listingId: string, reviewerId: string, reason: string): Promise<MarketplaceListing> {
    const listing = this.marketplaceListings.get(listingId);
    if (!listing) throw new Error(`Listing ${listingId} not found`);
    listing.status = 'rejected';
    listing.reviewerId = reviewerId;
    listing.reviewNotes = reason;
    listing.reviewedAt = new Date().toISOString();
    return listing;
  }

  private async addMarketplaceReview(listingId: string, developerId: string, rating: number, comment: string): Promise<void> {
    const reviews = this.marketplaceReviews.get(listingId) || [];
    const review: MarketplaceReview = {
      id: uuid(),
      listingId,
      developerId,
      developerName: developerId,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };
    reviews.push(review);
    this.marketplaceReviews.set(listingId, reviews);

    const listing = this.marketplaceListings.get(listingId);
    if (listing) {
      const totalRating = reviews.reduce((s, r) => s + r.rating, 0);
      listing.rating = totalRating / reviews.length;
      listing.reviewCount = reviews.length;
    }
  }

  private async getMarketplaceReviews(listingId: string): Promise<MarketplaceReview[]> {
    return this.marketplaceReviews.get(listingId) || [];
  }

  private async getMarketplaceInstallCount(listingId: string): Promise<number> {
    const listing = this.marketplaceListings.get(listingId);
    return listing?.installCount || 0;
  }

  private async incrementMarketplaceInstallCount(listingId: string): Promise<number> {
    const listing = this.marketplaceListings.get(listingId);
    if (!listing) throw new Error(`Listing ${listingId} not found`);
    listing.installCount++;
    return listing.installCount;
  }

  private async generateAPIDocs(apiType: APIType, version: string): Promise<string> {
    return `# ${apiType} API Documentation v${version}\n\nAuto-generated API documentation for ACEP SADP.`;
  }

  private async generateSDKDocs(language: SDKLanguage, version: string): Promise<string> {
    return `# ${language} SDK Documentation v${version}\n\nAuto-generated SDK documentation for ACEP SADP.`;
  }

  private async generateChangelog(version: string): Promise<string> {
    return `# Changelog v${version}\n\n- Initial release of ACEP SADP`;
  }

  private async getEndpointDocs(path: string): Promise<string | undefined> {
    const endpoint = await this.apiManager.getAPI(path);
    if (!endpoint) return undefined;
    return `## ${endpoint.method} ${endpoint.path}\n\n${endpoint.description}`;
  }

  private async searchDocumentation(query: string): Promise<{ id: string; title: string; description: string; url: string; category: string; relevance: number }[]> {
    return [];
  }

  registerDeveloper(profile: DeveloperProfile): void {
    this.profiles.set(profile.developerId, profile);
  }

  async updateDeveloperTrustIndex(developerId: string, updates: Partial<DeveloperTrustIndex>): Promise<DeveloperTrustIndex> {
    const current = await this.getDeveloperTrustIndex(developerId);
    const updated: DeveloperTrustIndex = { ...current, ...updates, lastUpdated: new Date().toISOString() };
    const profile = this.profiles.get(developerId);
    if (profile) {
      profile.trustIndex = updated;
    }
    return updated;
  }
}
