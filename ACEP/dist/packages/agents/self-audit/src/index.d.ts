import { IAgent, BOQDocument, BOQItem, ProjectFacts, VirtualBuilding, Risk, DecisionRecord } from '@acep/core';
interface AuditCheck {
    id: string;
    category: string;
    name: string;
    status: 'pass' | 'fail' | 'warning' | 'not-run';
    details: string;
    severity: 'critical' | 'major' | 'minor' | 'info';
    affectedItems: string[];
    recommendation: string;
}
interface AuditReport {
    id: string;
    projectId: string;
    timestamp: string;
    checks: AuditCheck[];
    summary: {
        totalChecks: number;
        passed: number;
        failed: number;
        warnings: number;
        notRun: number;
        criticalFails: number;
        overallStatus: 'pass' | 'fail' | 'conditional' | 'incomplete';
        canSendToUser: boolean;
    };
    comparison: BOQComparisonReport;
}
interface BOQComparisonReport {
    originalItemCount: number;
    recalculatedItemCount: number;
    matchCount: number;
    newItems: BOQItem[];
    removedItems: BOQItem[];
    quantityDifferences: QuantityDifference[];
    priceDifferences: PriceDifference[];
    confidenceScore: number;
}
interface QuantityDifference {
    itemId: string;
    code: string;
    description: string;
    originalQuantity: number;
    recalculatedQuantity: number;
    difference: number;
    percentChange: number;
    unit: string;
    isAnomaly: boolean;
}
interface PriceDifference {
    itemId: string;
    code: string;
    description: string;
    originalPrice: number;
    recalculatedPrice: number;
    difference: number;
    percentChange: number;
    isOutlier: boolean;
}
interface QualityCheckResult {
    checkId: string;
    name: string;
    status: 'pass' | 'fail' | 'warning';
    details: string;
    severity: 'critical' | 'major' | 'minor';
}
export declare class SelfAuditAgent implements IAgent {
    readonly id = "agent-self-audit";
    readonly type = "self-audit";
    readonly name = "Self Audit Agent";
    private logger;
    process(input: unknown): Promise<AuditReport>;
    canHandle(input: unknown): boolean;
    getCapabilities(): string[];
    runFullAudit(projectId: string, data: {
        facts?: ProjectFacts;
        building?: VirtualBuilding;
        boq?: BOQDocument;
        recalculatedBOQ?: BOQDocument;
        risks?: Risk[];
        decisions?: DecisionRecord[];
    }): Promise<AuditReport>;
    private emptyComparison;
    compareBOQ(original: BOQDocument, recalculated: BOQDocument): BOQComparisonReport;
    checkQuality(facts: ProjectFacts, building: VirtualBuilding, boq: BOQDocument): QualityCheckResult[];
    private checkCompleteness;
    private detectMissingQuestions;
    private generateAuditSummary;
}
export {};
//# sourceMappingURL=index.d.ts.map