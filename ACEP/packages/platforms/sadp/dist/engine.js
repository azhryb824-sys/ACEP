import { BaseEngine } from '@acep/core';
import { v4 as uuid } from 'uuid';
import { EventType } from './types';
import { APIManager } from './api-manager';
import { PluginFramework } from './plugin-framework';
export class DeveloperPlatform extends BaseEngine {
    apiManager;
    pluginFramework;
    sdkResults = new Map();
    webhooks = new Map();
    deliveryLogs = new Map();
    marketplaceListings = new Map();
    marketplaceReviews = new Map();
    profiles = new Map();
    connectors = new Map();
    developerPortal;
    developerEnvironment;
    apiSecurity;
    eventListeners = new Map();
    constructor(config) {
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
    async initialize() {
        this.setStatus('initialized');
    }
    async validate() {
        return this.apiManager !== undefined && this.pluginFramework !== undefined;
    }
    getAPIManager() { return this.apiManager; }
    getPluginFramework() { return this.pluginFramework; }
    getSDKManager() {
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
    getWebhookManager() {
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
    getMarketplaceManager() {
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
    getDocumentationService() {
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
    async getDeveloperPortal() {
        return { ...this.developerPortal };
    }
    async updateDeveloperPortal(config) {
        this.developerPortal = { ...this.developerPortal, ...config };
        return this.developerPortal;
    }
    async getDeveloperEnvironment() {
        return { ...this.developerEnvironment };
    }
    async configureDeveloperEnvironment(config) {
        this.developerEnvironment = { ...this.developerEnvironment, ...config };
        return this.developerEnvironment;
    }
    async getAPISecurity() {
        return { ...this.apiSecurity };
    }
    async updateAPISecurity(config) {
        this.apiSecurity = { ...this.apiSecurity, ...config };
        return this.apiSecurity;
    }
    async getDeveloperTrustIndex(developerId) {
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
    async getDeveloperProfile(developerId) {
        const existing = this.profiles.get(developerId);
        if (!existing) {
            throw new Error(`Developer ${developerId} not found`);
        }
        return existing;
    }
    async getDeveloperMetrics(developerId) {
        return {
            totalApps: 0, activeApps: 0, totalAPIKeys: 0, totalRequests: 0,
            avgLatency: 0, errorRate: 0, uptime: 100, lastActivity: new Date().toISOString(),
        };
    }
    async registerConnector(config) {
        if (this.connectors.has(config.id)) {
            throw new Error(`Connector ${config.id} already exists`);
        }
        this.connectors.set(config.id, { ...config });
        return config;
    }
    async getConnectors() {
        return Array.from(this.connectors.values());
    }
    async removeConnector(connectorId) {
        if (!this.connectors.has(connectorId)) {
            throw new Error(`Connector ${connectorId} not found`);
        }
        this.connectors.delete(connectorId);
    }
    async getAPIEndpoints() {
        return this.apiManager.listAPIs();
    }
    async publishEvent(event, payload) {
        await this.triggerEvent(event, payload);
    }
    async subscribeToEvent(event, handler) {
        const listeners = this.eventListeners.get(event);
        if (!listeners)
            throw new Error(`Unknown event type: ${event}`);
        listeners.add(handler);
    }
    async generateSDK(language, apiVersion, options) {
        const key = `${language}:${apiVersion}`;
        const result = {
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
    async listGeneratedSDKs() {
        return Array.from(this.sdkResults.values());
    }
    async getSDKPackage(language, version) {
        return this.sdkResults.get(`${language}:${version}`);
    }
    async deleteSDKPackage(language, version) {
        this.sdkResults.delete(`${language}:${version}`);
    }
    async getSDKConfig() {
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
    async updateSDKConfig(config) {
        const current = await this.getSDKConfig();
        return { ...current, ...config };
    }
    async generateClientCode(endpoint, language) {
        return `// Auto-generated ${language} client for ${endpoint}\n// Generated by ACEP SADP\n`;
    }
    async registerWebhook(config) {
        const webhook = {
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
    async updateWebhook(webhookId, config) {
        const existing = this.webhooks.get(webhookId);
        if (!existing)
            throw new Error(`Webhook ${webhookId} not found`);
        const updated = { ...existing, ...config, updatedAt: new Date().toISOString() };
        this.webhooks.set(webhookId, updated);
        return updated;
    }
    async removeWebhook(webhookId) {
        if (!this.webhooks.has(webhookId))
            throw new Error(`Webhook ${webhookId} not found`);
        this.webhooks.delete(webhookId);
        this.deliveryLogs.delete(webhookId);
    }
    async getWebhook(webhookId) {
        return this.webhooks.get(webhookId);
    }
    async listWebhooks(filters) {
        let results = Array.from(this.webhooks.values());
        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined) {
                    results = results.filter(w => w[key] === value);
                }
            }
        }
        return results;
    }
    async triggerEvent(event, payload) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const handler of listeners) {
                try {
                    await handler(payload);
                }
                catch { /* ignore handler errors */ }
            }
        }
        const matchingWebhooks = Array.from(this.webhooks.values())
            .filter(w => w.active && w.events.includes(event));
        for (const webhook of matchingWebhooks) {
            const log = {
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
    async getDeliveryLogs(webhookId, limit) {
        const logs = this.deliveryLogs.get(webhookId) || [];
        return limit ? logs.slice(-limit) : logs;
    }
    async testWebhook(webhookId) {
        const webhook = this.webhooks.get(webhookId);
        return webhook !== undefined && webhook.active;
    }
    async getWebhookSecret(webhookId) {
        return `whs_${uuid().replace(/-/g, '')}`;
    }
    async rotateWebhookSecret(webhookId) {
        return `whs_${uuid().replace(/-/g, '')}`;
    }
    async publishListing(listing) {
        const full = {
            ...listing,
            id: listing.id || uuid(),
            submittedAt: new Date().toISOString(),
            status: 'pending',
        };
        this.marketplaceListings.set(full.id, full);
        this.marketplaceReviews.set(full.id, []);
        return full;
    }
    async updateListing(listingId, updates) {
        const existing = this.marketplaceListings.get(listingId);
        if (!existing)
            throw new Error(`Listing ${listingId} not found`);
        const updated = { ...existing, ...updates };
        this.marketplaceListings.set(listingId, updated);
        return updated;
    }
    async unpublishListing(listingId) {
        if (!this.marketplaceListings.has(listingId))
            throw new Error(`Listing ${listingId} not found`);
        this.marketplaceListings.delete(listingId);
        this.marketplaceReviews.delete(listingId);
    }
    async getMarketplaceListing(listingId) {
        return this.marketplaceListings.get(listingId);
    }
    async searchMarketplace(query, filters) {
        let results = Array.from(this.marketplaceListings.values());
        if (query) {
            const q = query.toLowerCase();
            results = results.filter(l => l.manifest.name.toLowerCase().includes(q) ||
                l.manifest.description.toLowerCase().includes(q) ||
                l.tags.some(t => t.toLowerCase().includes(q)));
        }
        return results;
    }
    async getByCategory(category) {
        return Array.from(this.marketplaceListings.values())
            .filter(l => l.category === category);
    }
    async getFeaturedListings() {
        return Array.from(this.marketplaceListings.values())
            .filter(l => l.featured && l.status === 'published');
    }
    async submitForReview(listingId) {
        const listing = this.marketplaceListings.get(listingId);
        if (!listing)
            throw new Error(`Listing ${listingId} not found`);
        listing.status = 'pending';
        return listing;
    }
    async approveMarketplaceListing(listingId, reviewerId, notes) {
        const listing = this.marketplaceListings.get(listingId);
        if (!listing)
            throw new Error(`Listing ${listingId} not found`);
        listing.status = 'approved';
        listing.reviewerId = reviewerId;
        listing.reviewNotes = notes;
        listing.reviewedAt = new Date().toISOString();
        listing.approvedAt = new Date().toISOString();
        return listing;
    }
    async rejectMarketplaceListing(listingId, reviewerId, reason) {
        const listing = this.marketplaceListings.get(listingId);
        if (!listing)
            throw new Error(`Listing ${listingId} not found`);
        listing.status = 'rejected';
        listing.reviewerId = reviewerId;
        listing.reviewNotes = reason;
        listing.reviewedAt = new Date().toISOString();
        return listing;
    }
    async addMarketplaceReview(listingId, developerId, rating, comment) {
        const reviews = this.marketplaceReviews.get(listingId) || [];
        const review = {
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
    async getMarketplaceReviews(listingId) {
        return this.marketplaceReviews.get(listingId) || [];
    }
    async getMarketplaceInstallCount(listingId) {
        const listing = this.marketplaceListings.get(listingId);
        return listing?.installCount || 0;
    }
    async incrementMarketplaceInstallCount(listingId) {
        const listing = this.marketplaceListings.get(listingId);
        if (!listing)
            throw new Error(`Listing ${listingId} not found`);
        listing.installCount++;
        return listing.installCount;
    }
    async generateAPIDocs(apiType, version) {
        return `# ${apiType} API Documentation v${version}\n\nAuto-generated API documentation for ACEP SADP.`;
    }
    async generateSDKDocs(language, version) {
        return `# ${language} SDK Documentation v${version}\n\nAuto-generated SDK documentation for ACEP SADP.`;
    }
    async generateChangelog(version) {
        return `# Changelog v${version}\n\n- Initial release of ACEP SADP`;
    }
    async getEndpointDocs(path) {
        const endpoint = await this.apiManager.getAPI(path);
        if (!endpoint)
            return undefined;
        return `## ${endpoint.method} ${endpoint.path}\n\n${endpoint.description}`;
    }
    async searchDocumentation(query) {
        return [];
    }
    registerDeveloper(profile) {
        this.profiles.set(profile.developerId, profile);
    }
    async updateDeveloperTrustIndex(developerId, updates) {
        const current = await this.getDeveloperTrustIndex(developerId);
        const updated = { ...current, ...updates, lastUpdated: new Date().toISOString() };
        const profile = this.profiles.get(developerId);
        if (profile) {
            profile.trustIndex = updated;
        }
        return updated;
    }
}
//# sourceMappingURL=engine.js.map