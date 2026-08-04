"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEngine = void 0;
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
function computeHash(data, previousHash) {
    return crypto_1.default.createHash('sha256').update(data + previousHash).digest('hex');
}
function signPayload(payload) {
    const { privateKey } = crypto_1.default.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const sign = crypto_1.default.createSign('SHA256');
    sign.update(payload);
    return sign.sign(privateKey, 'hex');
}
class AuditEngine {
    logs = new Map();
    chain = [];
    lastHash = '0'.repeat(64);
    logOrder = [];
    async log(event, actor) {
        const id = (0, uuid_1.v4)();
        const timestamp = new Date();
        const payload = `${id}|${event.eventType}|${timestamp.toISOString()}|${actor.id}|${event.action}|${event.resource}`;
        const tamperHash = computeHash(payload, this.lastHash);
        const signature = signPayload(tamperHash);
        const log = {
            id,
            eventType: event.eventType,
            timestamp,
            actorId: actor.id,
            actorType: actor.type,
            action: event.action,
            resource: event.resource,
            details: event.details,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            tamperHash,
            previousHash: this.lastHash,
            signature,
            nonEditable: true,
        };
        this.logs.set(id, log);
        this.chain.push(id);
        this.logOrder.push(id);
        this.lastHash = tamperHash;
        return log;
    }
    async getLog(logId) {
        const log = this.logs.get(logId);
        if (!log)
            throw new Error(`Audit log ${logId} not found`);
        return log;
    }
    async queryLogs(filters) {
        let results = Array.from(this.logs.values());
        if (filters.eventType)
            results = results.filter(l => l.eventType === filters.eventType);
        if (filters.actorId)
            results = results.filter(l => l.actorId === filters.actorId);
        if (filters.resource)
            results = results.filter(l => l.resource.includes(filters.resource));
        if (filters.startDate)
            results = results.filter(l => l.timestamp >= filters.startDate);
        if (filters.endDate)
            results = results.filter(l => l.timestamp <= filters.endDate);
        return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    async verifyIntegrity(logId) {
        const log = this.logs.get(logId);
        if (!log)
            return false;
        const payload = `${log.id}|${log.eventType}|${log.timestamp.toISOString()}|${log.actorId}|${log.action}|${log.resource}`;
        const expectedHash = computeHash(payload, log.previousHash);
        return expectedHash === log.tamperHash;
    }
    async verifyChain() {
        let currentHash = '0'.repeat(64);
        for (const id of this.chain) {
            const log = this.logs.get(id);
            if (!log)
                return false;
            if (log.previousHash !== currentHash)
                return false;
            const payload = `${log.id}|${log.eventType}|${log.timestamp.toISOString()}|${log.actorId}|${log.action}|${log.resource}`;
            const expectedHash = computeHash(payload, currentHash);
            if (expectedHash !== log.tamperHash)
                return false;
            currentHash = expectedHash;
        }
        return true;
    }
    async generateReport(startDate, endDate) {
        const logs = await this.queryLogs({ startDate, endDate });
        const byType = {};
        for (const log of logs) {
            byType[log.eventType] = (byType[log.eventType] || 0) + 1;
        }
        return [
            `=== Audit Report ===`,
            `Period: ${startDate.toISOString()} to ${endDate.toISOString()}`,
            `Total Events: ${logs.length}`,
            `Chain Valid: ${await this.verifyChain() ? 'YES' : 'NO'}`,
            ``,
            `Event Breakdown:`,
            ...Object.entries(byType).map(([type, count]) => `  ${type}: ${count}`),
            ``,
            `Recent Events (last 10):`,
            ...logs.slice(0, 10).map(l => `  [${l.eventType}] ${l.timestamp.toISOString()} - ${l.actorId} - ${l.action} on ${l.resource}`),
        ].join('\n');
    }
    async exportLogs(format) {
        const logs = Array.from(this.logs.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        if (format === 'json') {
            return JSON.stringify(logs, null, 2);
        }
        const headers = ['id', 'eventType', 'timestamp', 'actorId', 'actorType', 'action', 'resource', 'details', 'ipAddress'];
        const rows = logs.map(l => [
            l.id, l.eventType, l.timestamp.toISOString(), l.actorId, l.actorType,
            l.action, l.resource, `"${l.details.replace(/"/g, '""')}"`, l.ipAddress,
        ].join(','));
        return [headers.join(','), ...rows].join('\n');
    }
    getLogCount() {
        return this.logs.size;
    }
}
exports.AuditEngine = AuditEngine;
//# sourceMappingURL=audit-engine.js.map