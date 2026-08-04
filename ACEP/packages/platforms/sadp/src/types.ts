export type APIType = 'REST' | 'GraphQL' | 'WebSocket' | 'Webhook' | 'SSE' | 'Bulk';

export interface APIVersion {
  version: string;
  releaseDate: string;
  deprecationDate?: string;
  sunsetDate?: string;
  status: 'active' | 'deprecated' | 'sunset';
  migrationGuide?: string;
  changelog: string[];
  backwardCompatible: boolean;
}

export interface APIVersionPolicy {
  currentVersion: string;
  supportedVersions: APIVersion[];
  deprecationNoticeDays: number;
  sunsetPeriodDays: number;
  defaultVersion: string;
  latestStable: string;
  latestBeta?: string;
}

export type SDKLanguage = 'Python' | 'TypeScript' | 'CSharp' | 'Java' | 'Kotlin' | 'Swift' | 'Dart' | 'Go';

export interface SDKConfig {
  language: SDKLanguage;
  version: string;
  packageName: string;
  namespace: string;
  apiVersion: string;
  generatedAt: string;
  features: string[];
  authentication: SDKAuthMethod[];
}

export type SDKAuthMethod = 'APIKey' | 'OAuth2' | 'JWT' | 'Basic' | 'MutualTLS';

export type PluginType = 'Reports' | 'AI' | 'Dashboard' | 'Workflow' | 'Integration' | 'Analytics' | 'UI';

export type PluginStatus = 'draft' | 'submitted' | 'inReview' | 'approved' | 'rejected' | 'published' | 'disabled';

export interface PluginPermission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete' | 'execute')[];
  scope: 'global' | 'project' | 'organization';
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  description: string;
  author: string;
  company?: string;
  website?: string;
  repository?: string;
  license: string;
  icon?: string;
  permissions: PluginPermission[];
  dependencies: string[];
  engineTypes: string[];
  minCoreVersion: string;
  maxCoreVersion?: string;
  hooks?: string[];
  events?: string[];
  configSchema?: Record<string, unknown>;
  uiComponents?: string[];
  screenshots?: string[];
}

export interface MarketplaceListing {
  id: string;
  pluginId: string;
  manifest: PluginManifest;
  publisher: string;
  publisherVerified: boolean;
  category: string;
  tags: string[];
  shortDescription: string;
  fullDescription: string;
  pricing: MarketplacePricing;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  installCount: number;
  compatibility: string[];
  languages: SDKLanguage[];
  screenshots: string[];
  demoUrl?: string;
  documentationUrl?: string;
  supportUrl?: string;
  sourceUrl?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewNotes?: string;
  approvedAt?: string;
  publishedAt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'published' | 'archived';
  featured: boolean;
  verified: boolean;
}

export interface MarketplacePricing {
  model: 'free' | 'oneTime' | 'subscription' | 'usageBased' | 'enterprise';
  price?: number;
  currency?: string;
  trialDays?: number;
  subscriptionInterval?: 'monthly' | 'yearly';
  usageUnit?: string;
  usagePrice?: number;
  enterpriseContact?: string;
}

export enum EventType {
  ProjectCreated = 'ProjectCreated',
  ContractSigned = 'ContractSigned',
  InvoiceApproved = 'InvoiceApproved',
  InspectionCompleted = 'InspectionCompleted',
  SensorAlert = 'SensorAlert',
  WorkOrderClosed = 'WorkOrderClosed',
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: EventType[];
  apiVersion: string;
  active: boolean;
  retryPolicy: WebhookRetryPolicy;
  headers?: Record<string, string>;
  filter?: WebhookFilter;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  lastSuccess?: string;
  lastFailure?: string;
  failureCount: number;
}

export interface WebhookRetryPolicy {
  maxRetries: number;
  retryIntervalMs: number;
  exponentialBackoff: boolean;
  maxRetryIntervalMs?: number;
}

export interface WebhookFilter {
  projectIds?: string[];
  minSeverity?: string;
  customFilter?: string;
}

export interface RateLimit {
  windowMs: number;
  maxRequests: number;
  burstMultiplier?: number;
  message?: string;
}

export interface ThrottlingConfig {
  enabled: boolean;
  strategy: 'tokenBucket' | 'leakyBucket' | 'slidingWindow' | 'fixedWindow';
  tokensPerSecond: number;
  burstSize: number;
  maxQueueSize: number;
}

export interface APIQuota {
  quotaId: string;
  name: string;
  limit: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  unit: 'requests' | 'data' | 'tokens';
  overagePolicy: 'block' | 'throttle' | 'bill';
}

export interface IPAllowList {
  enabled: boolean;
  allowedIPs: string[];
  allowedCIDRs: string[];
  deniedIPs: string[];
  deniedCIDRs: string[];
  mode: 'whitelist' | 'blacklist' | 'hybrid';
}

export interface UsageMonitoring {
  enabled: boolean;
  metrics: ('requests' | 'latency' | 'errors' | 'bandwidth' | 'endpoints' | 'users')[];
  retentionDays: number;
  samplingRate: number;
  aggregationInterval: string;
}

export interface ErrorLogging {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  captureRequestBody: boolean;
  captureResponseBody: boolean;
  sensitiveFields: string[];
  retentionDays: number;
  destination: 'console' | 'file' | 'external' | 'all';
}

export interface PerformanceMonitoring {
  enabled: boolean;
  metrics: ('latency' | 'throughput' | 'errorRate' | 'cpu' | 'memory' | 'concurrentConnections')[];
  alertThresholds: Record<string, number>;
  tracingEnabled: boolean;
  samplingRate: number;
}

export interface APISecurity {
  rateLimit: RateLimit;
  throttling: ThrottlingConfig;
  quotas: APIQuota[];
  ipAllowList: IPAllowList;
  usageMonitoring: UsageMonitoring;
  errorLogging: ErrorLogging;
  performanceMonitoring: PerformanceMonitoring;
}

export interface SandboxConfig {
  enabled: boolean;
  maxEnvironments: number;
  maxDurationHours: number;
  autoCleanup: boolean;
  allowedAPIs: APIType[];
  dataIsolation: boolean;
  networkAccess: boolean;
  resourceLimits: SandboxResources;
}

export interface SandboxResources {
  cpu: string;
  memory: string;
  storage: string;
  maxRequestsPerMin: number;
  maxConcurrentRequests: number;
}

export interface TestDataConfig {
  enabled: boolean;
  datasets: string[];
  maxRecords: number;
  seedData: boolean;
  anonymize: boolean;
  refreshInterval: string;
}

export interface MockServiceConfig {
  enabled: boolean;
  endpoints: string[];
  latencySimulation: boolean;
  minLatencyMs: number;
  maxLatencyMs: number;
  errorSimulation: boolean;
  errorRate: number;
}

export interface APIExplorerConfig {
  enabled: boolean;
  tryItEnabled: boolean;
  codeGeneration: boolean;
  showSchemas: boolean;
  authenticationPreset: boolean;
}

export interface PostmanCollectionConfig {
  enabled: boolean;
  autoGenerate: boolean;
  includeExamples: boolean;
  includeTests: boolean;
  environmentPresets: string[];
}

export interface CLIConfig {
  enabled: boolean;
  commands: string[];
  autoComplete: boolean;
  outputFormat: 'json' | 'table' | 'yaml' | 'text';
  interactiveMode: boolean;
}

export interface CodeGenerationConfig {
  enabled: boolean;
  languages: SDKLanguage[];
  includeTypes: boolean;
  includeDocs: boolean;
  includeExamples: boolean;
  styleGuide: string;
}

export interface DeveloperEnvironment {
  sandbox: SandboxConfig;
  testData: TestDataConfig;
  mockServices: MockServiceConfig;
  apiExplorer: APIExplorerConfig;
  postmanCollections: PostmanCollectionConfig;
  cli: CLIConfig;
  codeGeneration: CodeGenerationConfig;
}

export interface PluginSandbox {
  sandboxId: string;
  pluginId: string;
  enabled: boolean;
  permissions: PluginPermission[];
  resourceLimits: SandboxResources;
  allowedHosts: string[];
  allowedAPIs: APIType[];
  fileSystemAccess: boolean;
  networkAccess: boolean;
  envVariables: Record<string, string>;
  timeout: number;
  maxMemory: string;
  maxCPU: string;
}

export interface DeveloperPortal {
  enabled: boolean;
  customDomain?: string;
  authentication: PortalAuthConfig;
  theme: PortalTheme;
  pages: PortalPage[];
  apiReferences: boolean;
  forums: boolean;
  blog: boolean;
  announcements: boolean;
  support: PortalSupport;
}

export interface PortalAuthConfig {
  methods: ('email' | 'google' | 'github' | 'microsoft' | 'saml')[];
  sessionTimeoutMinutes: number;
  mfaRequired: boolean;
  apiKeyGeneration: boolean;
}

export interface PortalTheme {
  primaryColor: string;
  secondaryColor: string;
  logo: string;
  favicon: string;
  customCSS?: string;
}

export interface PortalPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  order: number;
}

export interface PortalSupport {
  email: string;
  documentationUrl: string;
  faqEnabled: boolean;
  ticketSystem: boolean;
  liveChat: boolean;
  communityForum: boolean;
}

export interface DeveloperTrustIndex {
  overall: number;
  codeQuality: number;
  testResults: number;
  failures: number;
  issueResponse: number;
  security: number;
  userRating: number;
  compatibility: number;
  lastUpdated: string;
  trend: 'up' | 'down' | 'stable';
}

export interface ConnectorConfig {
  id: string;
  name: string;
  type: string;
  version: string;
  enabled: boolean;
  endpoint: string;
  auth: ConnectorAuth;
  options: Record<string, unknown>;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
}

export interface ConnectorAuth {
  type: 'basic' | 'apiKey' | 'oauth2' | 'jwt' | 'mutualTLS';
  credentials?: Record<string, string>;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scopes?: string[];
}

export interface PluginHook {
  hookId: string;
  name: string;
  description: string;
  type: 'before' | 'after' | 'around' | 'onError';
  target: string;
  priority: number;
  async: boolean;
}

export interface PluginLifecycleState {
  pluginId: string;
  status: 'installed' | 'enabled' | 'disabled' | 'uninstalled';
  installedAt: string;
  enabledAt?: string;
  disabledAt?: string;
  uninstalledAt?: string;
  version: string;
  config: Record<string, unknown>;
}

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  apiType: APIType;
  version: string;
  description: string;
  authentication: boolean;
  rateLimited: boolean;
  deprecated: boolean;
  tags: string[];
}

export interface SDKGenerationResult {
  language: SDKLanguage;
  version: string;
  packageUrl: string;
  files: number;
  linesOfCode: number;
  sizeBytes: number;
  generatedAt: string;
}

export interface DeveloperMetrics {
  totalApps: number;
  activeApps: number;
  totalAPIKeys: number;
  totalRequests: number;
  avgLatency: number;
  errorRate: number;
  uptime: number;
  lastActivity: string;
}

export interface DeveloperProfile {
  developerId: string;
  name: string;
  email: string;
  company?: string;
  website?: string;
  apiKeys: string[];
  apps: string[];
  trustIndex: DeveloperTrustIndex;
  joinedAt: string;
  lastActive: string;
}
