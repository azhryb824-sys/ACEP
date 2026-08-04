"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfAuditAgent = void 0;
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
class SelfAuditAgent {
    id = 'agent-self-audit';
    type = 'self-audit';
    name = 'Self Audit Agent';
    logger = new Logger(this.name);
    async process(input) {
        this.logger.info('Starting self-audit');
        const data = input;
        const report = await this.runFullAudit(data.projectId, data);
        this.logger.info(`Self-audit complete: ${report.summary.overallStatus}, canSendToUser: ${report.summary.canSendToUser}`);
        return report;
    }
    canHandle(input) {
        return input !== null && typeof input === 'object' && 'projectId' in input;
    }
    getCapabilities() {
        return ['full-audit', 'boq-comparison', 'quality-check', 'anomaly-detection', 'completeness-check'];
    }
    async runFullAudit(projectId, data) {
        const checks = [];
        const boqComparison = data.boq && data.recalculatedBOQ
            ? this.compareBOQ(data.boq, data.recalculatedBOQ)
            : this.emptyComparison();
        if (boqComparison.quantityDifferences.length > 0) {
            const anomalies = boqComparison.quantityDifferences.filter(d => d.isAnomaly);
            if (anomalies.length > 0) {
                checks.push({
                    id: (0, uuid_1.v4)(),
                    category: 'quantity',
                    name: 'Quantity Anomaly Detection',
                    status: 'warning',
                    details: `${anomalies.length} quantity anomalies detected`,
                    severity: 'major',
                    affectedItems: anomalies.map(a => a.itemId),
                    recommendation: 'Review the anomalous quantities and verify calculations'
                });
            }
        }
        if (boqComparison.priceDifferences.length > 0) {
            const outliers = boqComparison.priceDifferences.filter(d => d.isOutlier);
            if (outliers.length > 0) {
                checks.push({
                    id: (0, uuid_1.v4)(),
                    category: 'cost',
                    name: 'Price Outlier Detection',
                    status: 'warning',
                    details: `${outliers.length} price outliers detected`,
                    severity: 'major',
                    affectedItems: outliers.map(o => o.itemId),
                    recommendation: 'Review outlier prices and verify with current market rates'
                });
            }
        }
        if (boqComparison.newItems.length > 0) {
            checks.push({
                id: (0, uuid_1.v4)(),
                category: 'completeness',
                name: 'New Items Detected',
                status: 'warning',
                details: `${boqComparison.newItems.length} new items found in recalculated BOQ that were not in original`,
                severity: 'minor',
                affectedItems: boqComparison.newItems.map(i => i.id),
                recommendation: 'Review new items and determine if they should be added to original BOQ'
            });
        }
        if (boqComparison.removedItems.length > 0) {
            checks.push({
                id: (0, uuid_1.v4)(),
                category: 'completeness',
                name: 'Removed Items Detected',
                status: 'warning',
                details: `${boqComparison.removedItems.length} items in original BOQ not found in recalculated version`,
                severity: 'minor',
                affectedItems: boqComparison.removedItems.map(i => i.id),
                recommendation: 'Review removed items to ensure nothing was accidentally omitted'
            });
        }
        const confidenceScore = boqComparison.confidenceScore;
        if (confidenceScore < 0.8) {
            checks.push({
                id: (0, uuid_1.v4)(),
                category: 'confidence',
                name: 'Low Confidence Score',
                status: 'warning',
                details: `BOQ comparison confidence score is ${(confidenceScore * 100).toFixed(1)}%`,
                severity: 'major',
                affectedItems: [],
                recommendation: 'Investigate discrepancies between original and recalculated BOQ'
            });
        }
        if (data.facts && data.building && data.boq) {
            const qualityChecks = this.checkQuality(data.facts, data.building, data.boq);
            for (const qc of qualityChecks) {
                checks.push({
                    id: qc.checkId,
                    category: 'quality',
                    name: qc.name,
                    status: qc.status,
                    details: qc.details,
                    severity: qc.severity,
                    affectedItems: [],
                    recommendation: qc.status === 'pass' ? 'No action needed' : `Fix ${qc.name.toLowerCase()} issues`
                });
            }
        }
        if (data.risks) {
            const unassessedRisks = data.risks.filter(r => r.status === 'unassessed' || !r.mitigation);
            if (unassessedRisks.length > 0) {
                checks.push({
                    id: (0, uuid_1.v4)(),
                    category: 'risk',
                    name: 'Unassessed Risks',
                    status: 'warning',
                    details: `${unassessedRisks.length} risks have not been assessed or have no mitigation plan`,
                    severity: 'major',
                    affectedItems: unassessedRisks.map(r => r.id),
                    recommendation: 'Assess all risks and define mitigation strategies'
                });
            }
        }
        if (data.decisions) {
            const missingQuestions = this.detectMissingQuestions(data.decisions);
            if (missingQuestions.length > 0) {
                checks.push({
                    id: (0, uuid_1.v4)(),
                    category: 'completeness',
                    name: 'Missing Questions',
                    status: 'warning',
                    details: `${missingQuestions.length} important questions may not have been asked`,
                    severity: 'minor',
                    affectedItems: missingQuestions,
                    recommendation: 'Consider asking the identified questions to improve confidence'
                });
            }
        }
        const summary = this.generateAuditSummary(checks);
        return {
            id: (0, uuid_1.v4)(),
            projectId,
            timestamp: new Date().toISOString(),
            checks,
            summary,
            comparison: boqComparison
        };
    }
    emptyComparison() {
        return {
            originalItemCount: 0,
            recalculatedItemCount: 0,
            matchCount: 0,
            newItems: [],
            removedItems: [],
            quantityDifferences: [],
            priceDifferences: [],
            confidenceScore: 1.0
        };
    }
    compareBOQ(original, recalculated) {
        this.logger.info(`Comparing BOQ: ${original.items.length} items vs ${recalculated.items.length} items`);
        const originalMap = new Map(original.items.map(i => [i.id, i]));
        const recalculatedMap = new Map(recalculated.items.map(i => [i.id, i]));
        const originalIds = new Set(original.items.map(i => i.id));
        const recalculatedIds = new Set(recalculated.items.map(i => i.id));
        const newItems = recalculated.items.filter(i => !originalIds.has(i.id));
        const removedItems = original.items.filter(i => !recalculatedIds.has(i.id));
        const commonIds = [...originalIds].filter(id => recalculatedIds.has(id));
        const quantityDifferences = [];
        const priceDifferences = [];
        for (const id of commonIds) {
            const orig = originalMap.get(id);
            const recalc = recalculatedMap.get(id);
            if (orig.quantity !== recalc.quantity) {
                const diff = recalc.quantity - orig.quantity;
                const pctChange = orig.quantity !== 0 ? Math.abs(diff / orig.quantity) : 1;
                quantityDifferences.push({
                    itemId: id,
                    code: orig.code,
                    description: orig.description,
                    originalQuantity: orig.quantity,
                    recalculatedQuantity: recalc.quantity,
                    difference: diff,
                    percentChange: pctChange,
                    unit: orig.unit,
                    isAnomaly: pctChange > 0.15
                });
            }
            if (orig.unitPrice !== recalc.unitPrice) {
                const diff = recalc.unitPrice - orig.unitPrice;
                const pctChange = orig.unitPrice !== 0 ? Math.abs(diff / orig.unitPrice) : 1;
                priceDifferences.push({
                    itemId: id,
                    code: orig.code,
                    description: orig.description,
                    originalPrice: orig.unitPrice,
                    recalculatedPrice: recalc.unitPrice,
                    difference: diff,
                    percentChange: pctChange,
                    isOutlier: pctChange > 0.2
                });
            }
        }
        const matchCount = commonIds.length;
        const totalItems = Math.max(original.items.length, recalculated.items.length);
        const confidenceScore = totalItems > 0
            ? (matchCount - quantityDifferences.filter(d => d.isAnomaly).length * 0.1 - priceDifferences.filter(d => d.isOutlier).length * 0.1) / totalItems
            : 1.0;
        return {
            originalItemCount: original.items.length,
            recalculatedItemCount: recalculated.items.length,
            matchCount,
            newItems,
            removedItems,
            quantityDifferences,
            priceDifferences,
            confidenceScore: Math.max(0, Math.min(1, confidenceScore))
        };
    }
    checkQuality(facts, building, boq) {
        this.logger.info('Running quality checks');
        const results = [];
        const completenessCheck = this.checkCompleteness(facts, building, boq);
        for (const missing of completenessCheck) {
            results.push({
                checkId: (0, uuid_1.v4)(),
                name: `Missing ${missing.itemType}`,
                status: missing.missing.length > 0 ? 'fail' : 'pass',
                details: missing.missing.length > 0
                    ? `Missing items: ${missing.missing.join(', ')}`
                    : `All expected ${missing.itemType} items are present`,
                severity: missing.severity
            });
        }
        if (boq.items.length === 0) {
            results.push({
                checkId: (0, uuid_1.v4)(),
                name: 'Empty BOQ',
                status: 'fail',
                details: 'BOQ has no items',
                severity: 'critical'
            });
        }
        else {
            const zeroQuantityItems = boq.items.filter(i => i.quantity === 0);
            if (zeroQuantityItems.length > 0) {
                results.push({
                    checkId: (0, uuid_1.v4)(),
                    name: 'Zero Quantity Items',
                    status: 'warning',
                    details: `${zeroQuantityItems.length} items have zero quantity`,
                    severity: 'major'
                });
            }
            const zeroPriceItems = boq.items.filter(i => i.unitPrice === 0);
            if (zeroPriceItems.length > 0) {
                results.push({
                    checkId: (0, uuid_1.v4)(),
                    name: 'Zero Price Items',
                    status: 'warning',
                    details: `${zeroPriceItems.length} items have zero unit price`,
                    severity: 'major'
                });
            }
        }
        const totalCost = boq.items.reduce((sum, i) => sum + i.totalPrice, 0);
        if (totalCost === 0 && boq.items.length > 0) {
            results.push({
                checkId: (0, uuid_1.v4)(),
                name: 'Zero Total Cost',
                status: 'fail',
                details: 'Total BOQ cost is zero despite having items',
                severity: 'critical'
            });
        }
        const lowConfidenceItems = boq.items.filter(i => i.confidence < 0.5);
        if (lowConfidenceItems.length > 0) {
            results.push({
                checkId: (0, uuid_1.v4)(),
                name: 'Low Confidence Items',
                status: 'warning',
                details: `${lowConfidenceItems.length} items have low confidence (< 50%)`,
                severity: 'major'
            });
        }
        return results;
    }
    checkCompleteness(facts, building, boq) {
        const results = [];
        const categoryTypes = new Set(boq.items.map(i => i.category));
        const expectedCategories = [
            'EarthWork', 'Concrete', 'Reinforcement', 'Block', 'Plaster',
            'Electrical', 'Plumbing', 'HVAC', 'FireFighting', 'Doors', 'Windows'
        ];
        const missingCategories = expectedCategories.filter(c => !categoryTypes.has(c));
        results.push({
            itemType: 'BOQ Categories',
            expected: expectedCategories,
            found: [...categoryTypes],
            missing: missingCategories,
            severity: missingCategories.length > 0 ? 'major' : 'minor'
        });
        return results;
    }
    detectMissingQuestions(decisions) {
        const missing = [];
        const decisionTypes = new Set(decisions.map(d => d.selectedOption));
        const expectedQuestions = [
            'project-type',
            'floor-count',
            'finishing-level',
            'location',
            'building-area',
            'budget-range'
        ];
        for (const expected of expectedQuestions) {
            if (!decisionTypes.has(expected)) {
                missing.push(expected);
            }
        }
        return missing;
    }
    generateAuditSummary(checks) {
        const totalChecks = checks.length;
        let passed = 0;
        let failed = 0;
        let warnings = 0;
        let notRun = 0;
        let criticalFails = 0;
        for (const check of checks) {
            switch (check.status) {
                case 'pass':
                    passed++;
                    break;
                case 'fail':
                    failed++;
                    break;
                case 'warning':
                    warnings++;
                    break;
                case 'not-run':
                    notRun++;
                    break;
            }
            if (check.status === 'fail' && check.severity === 'critical') {
                criticalFails++;
            }
        }
        const canSendToUser = criticalFails === 0;
        const overallStatus = criticalFails > 0 ? 'fail' :
            failed > 0 ? 'conditional' :
                warnings > 0 ? 'conditional' : 'pass';
        return {
            totalChecks,
            passed,
            failed,
            warnings,
            notRun,
            criticalFails,
            overallStatus,
            canSendToUser
        };
    }
}
exports.SelfAuditAgent = SelfAuditAgent;
//# sourceMappingURL=index.js.map