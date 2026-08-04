import type { IEngine } from '@acep/core';
import type {
  APIType,
  APIVersion,
  APIVersionPolicy,
  SDKLanguage,
  SDKConfig,
  PluginType,
  PluginManifest,
  PluginPermission,
  PluginStatus,
  PluginLifecycleState,
  PluginHook,
  PluginSandbox,
  MarketplaceListing,
  EventType,
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
  APIEndpoint,
  SDKGenerationResult,
} from './types';

export interface IDeveloperPlatform extends IEngine {
  getAPIManager(): IAPIManager;
  getPluginFramework(): IPluginFramework;
  getSDKManager(): ISDKManager;
  getWebhookManager(): IWebhookManager;
  getMarketplaceManager(): IMarketplaceManager;
  getDocumentationService(): IDocumentationService;
  getDeveloperPortal(): Promise<DeveloperPortal>;
  updateDeveloperPortal(config: Partial<DeveloperPortal>): Promise<DeveloperPortal>;
  getDeveloperEnvironment(): Promise<DeveloperEnvironment>;
  configureDeveloperEnvironment(config: Partial<DeveloperEnvironment>): Promise<DeveloperEnvironment>;
  getAPISecurity(): Promise<APISecurity>;
  updateAPISecurity(config: Partial<APISecurity>): Promise<APISecurity>;
  getDeveloperTrustIndex(developerId: string): Promise<DeveloperTrustIndex>;
  getDeveloperProfile(developerId: string): Promise<DeveloperProfile>;
  getDeveloperMetrics(developerId: string): Promise<DeveloperMetrics>;
  registerConnector(config: ConnectorConfig): Promise<ConnectorConfig>;
  getConnectors(): Promise<ConnectorConfig[]>;
  removeConnector(connectorId: string): Promise<void>;
  getAPIEndpoints(): Promise<APIEndpoint[]>;
}

export interface IAPIManager {
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

export interface IPluginFramework {
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
}

export interface ISDKManager {
  generate(language: SDKLanguage, apiVersion: string, options?: Record<string, unknown>): Promise<SDKGenerationResult>;
  listGenerated(): Promise<SDKGenerationResult[]>;
  getPackage(language: SDKLanguage, version: string): Promise<SDKGenerationResult | undefined>;
  deletePackage(language: SDKLanguage, version: string): Promise<void>;
  getConfig(): Promise<SDKConfig>;
  updateConfig(config: Partial<SDKConfig>): Promise<SDKConfig>;
  getSupportedLanguages(): Promise<SDKLanguage[]>;
  generateClientCode(endpoint: string, language: SDKLanguage): Promise<string>;
}

export interface IWebhookManager {
  register(config: WebhookConfig): Promise<WebhookConfig>;
  update(webhookId: string, config: Partial<WebhookConfig>): Promise<WebhookConfig>;
  remove(webhookId: string): Promise<void>;
  get(webhookId: string): Promise<WebhookConfig | undefined>;
  list(filters?: Partial<WebhookConfig>): Promise<WebhookConfig[]>;
  trigger(event: EventType, payload: Record<string, unknown>): Promise<void>;
  getDeliveryLogs(webhookId: string, limit?: number): Promise<WebhookDeliveryLog[]>;
  test(webhookId: string): Promise<boolean>;
  getSecret(webhookId: string): Promise<string>;
  rotateSecret(webhookId: string): Promise<string>;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  event: EventType;
  url: string;
  status: number;
  success: boolean;
  durationMs: number;
  attempt: number;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

export interface IMarketplaceManager {
  publish(listing: MarketplaceListing): Promise<MarketplaceListing>;
  update(listingId: string, updates: Partial<MarketplaceListing>): Promise<MarketplaceListing>;
  unpublish(listingId: string): Promise<void>;
  getListing(listingId: string): Promise<MarketplaceListing | undefined>;
  search(query: string, filters?: Record<string, unknown>): Promise<MarketplaceListing[]>;
  getByCategory(category: string): Promise<MarketplaceListing[]>;
  getFeatured(): Promise<MarketplaceListing[]>;
  submitForReview(listingId: string): Promise<MarketplaceListing>;
  approveListing(listingId: string, reviewerId: string, notes?: string): Promise<MarketplaceListing>;
  rejectListing(listingId: string, reviewerId: string, reason: string): Promise<MarketplaceListing>;
  addReview(listingId: string, developerId: string, rating: number, comment: string): Promise<void>;
  getReviews(listingId: string): Promise<MarketplaceReview[]>;
  getInstallCount(listingId: string): Promise<number>;
  incrementInstallCount(listingId: string): Promise<number>;
}

export interface MarketplaceReview {
  id: string;
  listingId: string;
  developerId: string;
  developerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IDocumentationService {
  generateAPIDocs(apiType: APIType, version: string): Promise<string>;
  generateSDKDocs(language: SDKLanguage, version: string): Promise<string>;
  generateGettingStarted(): Promise<string>;
  generateGuides(): Promise<string[]>;
  generateChangelog(version: string): Promise<string>;
  getEndpointDocs(path: string): Promise<string | undefined>;
  searchDocs(query: string): Promise<DocSearchResult[]>;
}

export interface DocSearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  relevance: number;
}
