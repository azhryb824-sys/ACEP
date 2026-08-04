"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryAgent = void 0;
const uuid_1 = require("uuid");
class Logger {
    context;
    constructor(context) {
        this.context = context;
    }
    info(message, data) {
        console.log(`[${this.context}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    warn(message, data) {
        console.warn(`[${this.context}] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    error(message, data) {
        console.error(`[${this.context}] ERROR: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    debug(message, data) {
        console.debug(`[${this.context}] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    trace(message, data) {
        console.trace(`[${this.context}] TRACE: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
}
class MemoryAgent {
    id = 'agent-memory';
    type = 'memory';
    name = 'Memory Agent';
    logger = new Logger(this.name);
    decisions = [];
    preferences = new Map();
    projects = new Map();
    maxDecisions;
    constructor(maxDecisions = 10000) {
        this.maxDecisions = maxDecisions;
    }
    async process(input) {
        this.logger.info('Processing memory request');
        const request = input;
        switch (request.action) {
            case 'remember':
                if (request.userId && request.decision) {
                    return this.rememberDecision(request.userId, request.decision);
                }
                throw new Error('remember action requires userId and decision');
            case 'getPreferences':
                if (request.userId) {
                    return this.getUserPreferences(request.userId);
                }
                throw new Error('getPreferences action requires userId');
            case 'applyMemory':
                if (request.userId && request.project) {
                    return this.applyMemory(request.project, request.userId);
                }
                throw new Error('applyMemory action requires userId and project');
            case 'similarProjects':
                if (request.project) {
                    return this.getSimilarProjects(request.project);
                }
                throw new Error('similarProjects action requires project');
            default:
                return { status: 'unknown-action', available: ['remember', 'getPreferences', 'applyMemory', 'similarProjects'] };
        }
    }
    canHandle(input) {
        return input !== null && typeof input === 'object' && 'action' in input;
    }
    getCapabilities() {
        return ['decision-memory', 'preference-learning', 'similar-project-search', 'memory-application'];
    }
    async rememberDecision(userId, decision) {
        this.logger.info(`Remembering decision for user ${userId}: ${decision.type}.${decision.field}`);
        const fullDecision = {
            ...decision,
            id: decision.id || (0, uuid_1.v4)(),
            userId,
            timestamp: decision.timestamp || new Date().toISOString(),
            weight: decision.weight || 1
        };
        this.decisions.push(fullDecision);
        if (this.decisions.length > this.maxDecisions) {
            this.decisions.shift();
        }
        let prefs = this.preferences.get(userId);
        if (!prefs) {
            prefs = this.createEmptyPreferences(userId);
            this.preferences.set(userId, prefs);
        }
        this.updatePreferences(prefs, fullDecision);
        prefs.lastUpdated = new Date().toISOString();
        prefs.decisionCount++;
        this.logger.info(`Decision remembered. Total decisions for user ${userId}: ${prefs.decisionCount}`);
    }
    createEmptyPreferences(userId) {
        return {
            userId,
            preferredSuppliers: [],
            preferredMaterials: [],
            preferredConstructionMethods: [],
            preferredQualityLevel: 'Standard',
            preferredFinishingLevel: 'Standard',
            preferredBrands: [],
            customPreferences: {},
            lastUpdated: new Date().toISOString(),
            decisionCount: 0
        };
    }
    updatePreferences(prefs, decision) {
        switch (decision.type) {
            case 'supplier':
                this.updateSupplierPreference(prefs, decision);
                break;
            case 'material':
                this.updateMaterialPreference(prefs, decision);
                break;
            case 'construction-method':
                this.updateMethodPreference(prefs, decision);
                break;
            case 'quality':
                prefs.preferredQualityLevel = String(decision.value);
                break;
            case 'finishing':
                prefs.preferredFinishingLevel = String(decision.value);
                break;
            case 'brand':
                this.updateBrandPreference(prefs, decision);
                break;
            default:
                prefs.customPreferences[`${decision.type}.${decision.field}`] = decision.value;
                break;
        }
    }
    updateSupplierPreference(prefs, decision) {
        const supplierName = String(decision.value);
        const existing = prefs.preferredSuppliers.find(s => s.supplierName === supplierName);
        if (existing) {
            existing.usageCount++;
            existing.lastUsed = new Date().toISOString();
        }
        else {
            prefs.preferredSuppliers.push({
                supplierId: (0, uuid_1.v4)(),
                supplierName,
                materialType: String(decision.context?.materialType || 'General'),
                usageCount: 1,
                averagePrice: Number(decision.context?.price || 0),
                averageRating: Number(decision.context?.rating || 3),
                lastUsed: new Date().toISOString(),
                preferred: true
            });
        }
    }
    updateMaterialPreference(prefs, decision) {
        const materialName = String(decision.value);
        const existing = prefs.preferredMaterials.find(m => m.materialName === materialName);
        if (existing) {
            existing.usageCount++;
        }
        else {
            prefs.preferredMaterials.push({
                materialName,
                materialType: String(decision.context?.materialType || 'General'),
                usageCount: 1,
                preferredBrand: String(decision.context?.brand || ''),
                qualityLevel: String(decision.context?.quality || 'Standard'),
                alternatives: decision.context?.alternatives || []
            });
        }
    }
    updateMethodPreference(prefs, decision) {
        const methodName = String(decision.value);
        const existing = prefs.preferredConstructionMethods.find(m => m.methodName === methodName);
        if (existing) {
            existing.usageCount++;
            existing.lastUsed = new Date().toISOString();
        }
        else {
            prefs.preferredConstructionMethods.push({
                methodName,
                projectType: String(decision.context?.projectType || 'General'),
                usageCount: 1,
                successRate: Number(decision.context?.successRate || 0.9),
                lastUsed: new Date().toISOString()
            });
        }
    }
    updateBrandPreference(prefs, decision) {
        const brandName = String(decision.value);
        const existing = prefs.preferredBrands.find(b => b.brandName === brandName);
        if (existing) {
            existing.usageCount++;
        }
        else {
            prefs.preferredBrands.push({
                brandName,
                category: String(decision.context?.category || 'General'),
                usageCount: 1,
                averageRating: Number(decision.context?.rating || 3)
            });
        }
    }
    async getUserPreferences(userId) {
        this.logger.info(`Getting preferences for user ${userId}`);
        return this.preferences.get(userId) || null;
    }
    async applyMemory(project, userId) {
        this.logger.info(`Applying memory for user ${userId} to project`);
        const prefs = this.preferences.get(userId);
        const appliedPreferences = [];
        const pendingApproval = [];
        if (!prefs) {
            this.logger.info(`No preferences found for user ${userId}`);
            return { project, appliedPreferences, pendingApproval };
        }
        if (prefs.preferredFinishingLevel) {
            appliedPreferences.push(`finishing-level: ${prefs.preferredFinishingLevel}`);
        }
        if (prefs.preferredQualityLevel) {
            appliedPreferences.push(`quality-level: ${prefs.preferredQualityLevel}`);
        }
        if (prefs.preferredSuppliers.length > 0) {
            const topSuppliers = prefs.preferredSuppliers
                .filter(s => s.preferred)
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 3)
                .map(s => s.supplierName);
            pendingApproval.push(`preferred-suppliers: ${topSuppliers.join(', ')}`);
        }
        if (prefs.preferredMaterials.length > 0) {
            const topMaterials = prefs.preferredMaterials
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 5)
                .map(m => `${m.materialName} (${m.preferredBrand})`);
            pendingApproval.push(`preferred-materials: ${topMaterials.join(', ')}`);
        }
        if (prefs.preferredConstructionMethods.length > 0) {
            const topMethods = prefs.preferredConstructionMethods
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 3)
                .map(m => m.methodName);
            pendingApproval.push(`construction-methods: ${topMethods.join(', ')}`);
        }
        this.logger.info(`Applied ${appliedPreferences.length} preferences, ${pendingApproval.length} pending approval`);
        return { project, appliedPreferences, pendingApproval };
    }
    async getSimilarProjects(project) {
        this.logger.info('Finding similar projects');
        const similar = [];
        for (const [existingId, existingProject] of this.projects) {
            const similarity = this.calculateSimilarity(project, existingProject);
            if (similarity > 0.5) {
                similar.push({
                    projectId: existingId,
                    similarity: Math.round(similarity * 100) / 100,
                    projectType: existingProject.projectType?.value || 'Unknown',
                    area: existingProject.builtArea?.value || existingProject.landArea?.value || 0,
                    floors: existingProject.floors || 1,
                    finishingLevel: existingProject.qualityLevel?.level || 'Standard',
                    features: Object.keys(existingProject.systems || {})
                });
            }
        }
        similar.sort((a, b) => b.similarity - a.similarity);
        this.logger.info(`Found ${similar.length} similar projects`);
        return similar.slice(0, 10);
    }
    calculateSimilarity(a, b) {
        let score = 0;
        let totalWeight = 0;
        if (a.projectType?.value === b.projectType?.value) {
            score += 30;
        }
        totalWeight += 30;
        if (a.floors === b.floors) {
            score += 15;
        }
        totalWeight += 15;
        const aArea = a.builtArea?.value || a.landArea?.value || 0;
        const bArea = b.builtArea?.value || b.landArea?.value || 0;
        if (aArea > 0 && bArea > 0) {
            const areaRatio = Math.min(aArea, bArea) / Math.max(aArea, bArea);
            score += 20 * areaRatio;
        }
        totalWeight += 20;
        if (a.qualityLevel?.level === b.qualityLevel?.level) {
            score += 10;
        }
        totalWeight += 10;
        const aSystemKeys = Object.keys(a.systems || {});
        const bSystemKeys = Object.keys(b.systems || {});
        if (aSystemKeys.length > 0 && bSystemKeys.length > 0) {
            const common = aSystemKeys.filter(k => bSystemKeys.includes(k)).length;
            const max = Math.max(aSystemKeys.length, bSystemKeys.length);
            score += 15 * (common / max);
        }
        totalWeight += 15;
        const locationScore = a.location?.city === b.location?.city ? 10 : 0;
        score += locationScore;
        totalWeight += 10;
        return totalWeight > 0 ? score / totalWeight : 0;
    }
    storeProject(projectId, facts) {
        this.projects.set(projectId, facts);
        this.logger.info(`Project ${projectId} stored in memory`);
    }
    getProjectCount() {
        return this.projects.size;
    }
    getTotalDecisions() {
        return this.decisions.length;
    }
    clearUserMemory(userId) {
        this.decisions = this.decisions.filter(d => d.userId !== userId);
        this.preferences.delete(userId);
        this.logger.info(`Memory cleared for user ${userId}`);
    }
}
exports.MemoryAgent = MemoryAgent;
//# sourceMappingURL=index.js.map