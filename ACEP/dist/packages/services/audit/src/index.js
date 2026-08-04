"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditApp = exports.AuditService = void 0;
const uuid_1 = require("uuid");
const crypto_1 = require("crypto");
class AuditService {
    entries = [];
    previousHash = '0'.repeat(64);
    maxEntries = 100000;
    log(request) {
        if (!request.userId || !request.action || !request.resource) {
            throw new Error('userId, action, and resource are required');
        }
        const entry = {
            id: (0, uuid_1.v4)(),
            userId: request.userId,
            userName: request.userName,
            action: request.action,
            resource: request.resource,
            resourceId: request.resourceId,
            details: request.details || {},
            previousHash: this.previousHash,
            hash: '',
            timestamp: new Date().toISOString(),
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
        };
        entry.hash = this.computeHash(entry);
        this.previousHash = entry.hash;
        this.entries.push(entry);
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(-this.maxEntries);
        }
        return entry;
    }
    query(query) {
        let results = [...this.entries];
        if (query.userId)
            results = results.filter(e => e.userId === query.userId);
        if (query.action)
            results = results.filter(e => e.action === query.action);
        if (query.resource)
            results = results.filter(e => e.resource === query.resource);
        if (query.resourceId)
            results = results.filter(e => e.resourceId === query.resourceId);
        if (query.startDate)
            results = results.filter(e => new Date(e.timestamp) >= new Date(query.startDate));
        if (query.endDate)
            results = results.filter(e => new Date(e.timestamp) <= new Date(query.endDate));
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const page = query.page || 1;
        const pageSize = query.pageSize || 50;
        const total = results.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const paged = results.slice(start, start + pageSize);
        return { items: paged, total, page, pageSize, totalPages };
    }
    getById(id) {
        return this.entries.find(e => e.id === id) || null;
    }
    verifyChain() {
        let previousHash = '0'.repeat(64);
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            if (entry.previousHash !== previousHash) {
                return {
                    valid: false,
                    brokenAtIndex: i,
                    error: `Hash chain broken at index ${i}: expected previousHash ${previousHash}, got ${entry.previousHash}`,
                };
            }
            const computedHash = this.computeHash({ ...entry, hash: '' });
            if (computedHash !== entry.hash) {
                return {
                    valid: false,
                    brokenAtIndex: i,
                    error: `Entry ${i} hash mismatch: computed ${computedHash}, stored ${entry.hash}`,
                };
            }
            previousHash = entry.hash;
        }
        return { valid: true };
    }
    getStats() {
        const actions = {};
        const resources = {};
        for (const entry of this.entries) {
            actions[entry.action] = (actions[entry.action] || 0) + 1;
            resources[entry.resource] = (resources[entry.resource] || 0) + 1;
        }
        return { totalEntries: this.entries.length, actions, resources };
    }
    computeHash(entry) {
        const data = `${entry.id}:${entry.userId}:${entry.action}:${entry.resource}:${entry.resourceId || ''}:${JSON.stringify(entry.details)}:${entry.previousHash}:${entry.timestamp}`;
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
}
exports.AuditService = AuditService;
class AuditApp {
    service;
    constructor() {
        this.service = new AuditService();
    }
    async handleRequest(action, payload) {
        switch (action) {
            case 'log':
                return this.service.log(payload);
            case 'query':
                return this.service.query(payload);
            case 'getById':
                return this.service.getById(payload);
            case 'verifyChain':
                return this.service.verifyChain();
            case 'stats':
                return this.service.getStats();
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
}
exports.AuditApp = AuditApp;
function main() {
    const app = new AuditApp();
    console.log('[Audit Service] Initialized');
    console.log('[Audit Service] Immutable audit chain with SHA-256 integrity verification');
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map