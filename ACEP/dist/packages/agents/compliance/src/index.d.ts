import { IAgent, ProjectFacts, BOQItem } from '@acep/core';
interface ComplianceCode {
    id: string;
    name: string;
    authority: string;
    version: string;
    description: string;
    requirements: ComplianceRequirement[];
    applicableProjectTypes: string[];
    applicableLocations: string[];
}
interface ComplianceRequirement {
    id: string;
    section: string;
    description: string;
    checkType: 'numeric' | 'boolean' | 'enum' | 'range';
    field: string;
    operator?: 'gte' | 'lte' | 'eq' | 'neq' | 'in' | 'between';
    value?: unknown;
    minValue?: number;
    maxValue?: number;
    allowedValues?: unknown[];
    severity: 'critical' | 'major' | 'minor' | 'info';
    message: string;
    reference: string;
}
interface ComplianceCheckResult {
    requirementId: string;
    status: 'pass' | 'fail' | 'warning' | 'not-applicable';
    message: string;
    actualValue?: unknown;
    expectedValue?: unknown;
    severity: 'critical' | 'major' | 'minor' | 'info';
    reference: string;
}
interface ComplianceReport {
    id: string;
    projectId: string;
    projectType: string;
    location?: string;
    timestamp: string;
    codesChecked: string[];
    results: ComplianceCheckResult[];
    summary: {
        total: number;
        passed: number;
        failed: number;
        warnings: number;
        notApplicable: number;
        criticalIssues: number;
        majorIssues: number;
        minorIssues: number;
        overallStatus: 'pass' | 'fail' | 'conditional';
    };
}
export declare class ComplianceAgent implements IAgent {
    readonly id = "agent-compliance";
    readonly type = "compliance";
    readonly name = "Compliance Agent";
    private logger;
    process(input: unknown): Promise<ComplianceReport>;
    canHandle(input: unknown): boolean;
    getCapabilities(): string[];
    getApplicableCodes(projectType: string, location?: string): ComplianceCode[];
    checkProject(facts: ProjectFacts): Promise<ComplianceReport>;
    private evaluateRequirement;
    private extractFieldValue;
    validateItem(item: BOQItem, codeId: string): Promise<ComplianceCheckResult[]>;
    private generateSummary;
}
export {};
//# sourceMappingURL=index.d.ts.map