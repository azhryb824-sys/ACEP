import { Identity, IdentityType, AuthMethod, Role, PermissionModel, PolicyRule, PolicyType, DataClassification, RetentionPolicy, SecurityConfig, AuditLog, AuditEventType, ComplianceFramework, ComplianceRequirement, AIGovernanceEntry, RiskCategory, RiskEntry, EnterpriseTrustIndex, EnterpriseControlCenter, ServiceStatus, SecurityEvent, Alert, PerformanceMetric, IntegrationStatus, GovernanceMetric, MitigationPlan } from './types';
export interface IEngine {
    name: string;
    version: string;
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    getStatus(): string;
}
export interface IAdminEngine extends IEngine {
    getControlCenter(): Promise<EnterpriseControlCenter>;
    getTrustIndex(): Promise<EnterpriseTrustIndex>;
    getServiceStatus(): Promise<ServiceStatus[]>;
    getSecurityEvents(): Promise<SecurityEvent[]>;
    getAlerts(): Promise<Alert[]>;
    getPerformance(): Promise<PerformanceMetric>;
    getIntegrations(): Promise<IntegrationStatus[]>;
    getGovernanceMetrics(): Promise<GovernanceMetric>;
}
export interface IIdentityManager {
    createIdentity(type: IdentityType, username: string, displayName: string, email: string, roles: Role[], createdBy: string): Promise<Identity>;
    updateIdentity(id: string, updates: Partial<Identity>, updatedBy: string): Promise<Identity>;
    deleteIdentity(id: string, deletedBy: string): Promise<void>;
    getIdentity(id: string): Promise<Identity>;
    getIdentityByUsername(username: string): Promise<Identity>;
    listIdentities(type?: IdentityType): Promise<Identity[]>;
    lockIdentity(id: string, lockedBy: string): Promise<Identity>;
    unlockIdentity(id: string, unlockedBy: string): Promise<Identity>;
    assignRole(id: string, role: Role, assignedBy: string): Promise<Identity>;
    revokeRole(id: string, role: Role, revokedBy: string): Promise<Identity>;
    searchIdentities(query: string): Promise<Identity[]>;
}
export interface IAuthManager {
    authenticate(method: AuthMethod, credentials: Record<string, unknown>): Promise<{
        token: string;
        identity: Identity;
    }>;
    validateToken(token: string): Promise<Identity>;
    revokeToken(token: string): Promise<void>;
    configureMFA(identityId: string): Promise<void>;
    validateMFA(identityId: string, code: string): Promise<boolean>;
    initiateSSO(provider: string): Promise<string>;
    handleSSOCallback(provider: string, code: string): Promise<{
        token: string;
        identity: Identity;
    }>;
    registerFIDO2Credential(identityId: string, credential: Record<string, unknown>): Promise<void>;
    authenticateFIDO2(credentialId: string, signature: string): Promise<{
        token: string;
        identity: Identity;
    }>;
    getActiveSessions(): Promise<number>;
}
export interface IPermissionManager {
    checkPermission(identityId: string, resource: string, action: string): Promise<boolean>;
    checkRolePermission(role: Role, resource: string, action: string): boolean;
    evaluateABAC(identityId: string, resource: string, action: string, context: Record<string, unknown>): Promise<boolean>;
    grantPermission(identityId: string, permission: string, grantedBy: string): Promise<void>;
    revokePermission(identityId: string, permission: string, revokedBy: string): Promise<void>;
    getEffectivePermissions(identityId: string): Promise<string[]>;
    setPermissionModel(model: PermissionModel): Promise<void>;
    getPermissionModel(): PermissionModel;
}
export interface IPolicyEngine {
    createPolicy(policy: Omit<PolicyRule, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string): Promise<PolicyRule>;
    updatePolicy(id: string, updates: Partial<PolicyRule>, updatedBy: string): Promise<PolicyRule>;
    deletePolicy(id: string, deletedBy: string): Promise<void>;
    getPolicy(id: string): Promise<PolicyRule>;
    listPolicies(type?: PolicyType): Promise<PolicyRule[]>;
    evaluatePolicy(identityId: string, resource: string, action: string): Promise<PolicyRule[]>;
    enablePolicy(id: string, enabledBy: string): Promise<PolicyRule>;
    disablePolicy(id: string, disabledBy: string): Promise<PolicyRule>;
}
export interface IDataGovernance {
    classifyData(dataId: string, classification: DataClassification, classifiedBy: string): Promise<void>;
    getClassification(dataId: string): Promise<DataClassification>;
    getRetentionPolicy(classification: DataClassification): Promise<RetentionPolicy>;
    setRetentionPolicy(policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>, setBy: string): Promise<RetentionPolicy>;
    scheduleArchive(dataId: string, archiveDate: Date): Promise<void>;
    performArchive(dataId: string): Promise<void>;
    scheduleDeletion(dataId: string, deleteDate: Date): Promise<void>;
    secureDelete(dataId: string, deletedBy: string): Promise<void>;
    backupData(dataId: string, backupBy: string): Promise<string>;
    restoreData(backupId: string, restoreBy: string): Promise<void>;
    listClassifications(): Promise<DataClassification[]>;
}
export interface ISecurityManager {
    getSecurityConfig(): Promise<SecurityConfig>;
    updateSecurityConfig(updates: Partial<SecurityConfig>, updatedBy: string): Promise<SecurityConfig>;
    rotateEncryptionKeys(rotatedBy: string): Promise<void>;
    runIntrusionScan(): Promise<SecurityEvent[]>;
    runMalwareScan(): Promise<SecurityEvent[]>;
    detectAnomalies(): Promise<SecurityEvent[]>;
    getActiveThreats(): Promise<SecurityEvent[]>;
    resolveSecurityEvent(eventId: string, resolvedBy: string): Promise<void>;
    enableFirewallRule(ruleId: string): Promise<void>;
    disableFirewallRule(ruleId: string): Promise<void>;
}
export interface IAuditEngine {
    log(event: Omit<AuditLog, 'id' | 'timestamp' | 'tamperHash' | 'previousHash' | 'signature' | 'nonEditable'>, actor: Identity): Promise<AuditLog>;
    getLog(logId: string): Promise<AuditLog>;
    queryLogs(filters: {
        eventType?: AuditEventType;
        actorId?: string;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<AuditLog[]>;
    verifyIntegrity(logId: string): Promise<boolean>;
    verifyChain(): Promise<boolean>;
    generateReport(startDate: Date, endDate: Date): Promise<string>;
    exportLogs(format: 'json' | 'csv'): Promise<string>;
}
export interface IComplianceEngine {
    registerFramework(framework: ComplianceFramework, registeredBy: string): Promise<void>;
    assessCompliance(framework: ComplianceFramework): Promise<ComplianceRequirement[]>;
    getComplianceStatus(framework?: ComplianceFramework): Promise<Record<string, ComplianceRequirement[]>>;
    getRequirements(framework: ComplianceFramework): Promise<ComplianceRequirement[]>;
    addEvidence(requirementId: string, evidence: string, addedBy: string): Promise<ComplianceRequirement>;
    generateComplianceReport(framework: ComplianceFramework): Promise<string>;
    startContinuousMonitoring(framework: ComplianceFramework): Promise<void>;
    stopContinuousMonitoring(framework: ComplianceFramework): Promise<void>;
    getDeviationAlerts(): Promise<Alert[]>;
}
export interface IAIGovernance {
    registerModel(entry: Omit<AIGovernanceEntry, 'id'>, registeredBy: string): Promise<AIGovernanceEntry>;
    updateModel(id: string, updates: Partial<AIGovernanceEntry>, updatedBy: string): Promise<AIGovernanceEntry>;
    getModel(id: string): Promise<AIGovernanceEntry>;
    listModels(): Promise<AIGovernanceEntry[]>;
    trackPerformance(id: string, metrics: Record<string, number>): Promise<AIGovernanceEntry>;
    logLimitation(id: string, limitation: string): Promise<AIGovernanceEntry>;
    approveModel(id: string, approvedBy: string): Promise<AIGovernanceEntry>;
    retireModel(id: string, retiredBy: string): Promise<void>;
}
export interface IRiskManager {
    registerRisk(entry: Omit<RiskEntry, 'id' | 'riskScore' | 'identifiedAt'>, identifiedBy: string): Promise<RiskEntry>;
    updateRisk(id: string, updates: Partial<RiskEntry>, updatedBy: string): Promise<RiskEntry>;
    getRisk(id: string): Promise<RiskEntry>;
    listRisks(category?: RiskCategory): Promise<RiskEntry[]>;
    assessRisk(id: string): Promise<RiskEntry>;
    addMitigationPlan(riskId: string, plan: Omit<MitigationPlan, 'id'>, addedBy: string): Promise<RiskEntry>;
    updateMitigationPlan(riskId: string, planId: string, updates: Partial<MitigationPlan>): Promise<RiskEntry>;
    acceptRisk(id: string, acceptedBy: string): Promise<RiskEntry>;
    getRiskSummary(): Promise<{
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        mitigated: number;
    }>;
}
//# sourceMappingURL=interfaces.d.ts.map