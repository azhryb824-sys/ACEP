import { ComplianceFramework, ComplianceRequirement, Alert } from './types';
import { IComplianceEngine } from './interfaces';
export declare class ComplianceEngine implements IComplianceEngine {
    private frameworks;
    private requirements;
    private monitoring;
    private deviationAlerts;
    private evidenceStore;
    registerFramework(framework: ComplianceFramework, registeredBy: string): Promise<void>;
    assessCompliance(framework: ComplianceFramework): Promise<ComplianceRequirement[]>;
    getComplianceStatus(framework?: ComplianceFramework): Promise<Record<string, ComplianceRequirement[]>>;
    getRequirements(framework: ComplianceFramework): Promise<ComplianceRequirement[]>;
    addEvidence(requirementId: string, evidence: string, addedBy: string): Promise<ComplianceRequirement>;
    generateComplianceReport(framework: ComplianceFramework): Promise<string>;
    startContinuousMonitoring(framework: ComplianceFramework): Promise<void>;
    stopContinuousMonitoring(framework: ComplianceFramework): Promise<void>;
    getDeviationAlerts(): Promise<Alert[]>;
    getMonitoredFrameworks(): ComplianceFramework[];
}
//# sourceMappingURL=compliance-engine.d.ts.map