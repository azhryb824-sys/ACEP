export type IdentityType = 'User' | 'Employee' | 'Customer' | 'Supplier' | 'Contractor' | 'Robot' | 'IoTDevice' | 'ServiceAccount';
export type AuthMethod = 'Password' | 'MFA' | 'FIDO2' | 'SSO' | 'OAuth2' | 'OIDC' | 'SAML2' | 'LDAP' | 'AD';
export type Role = 'SystemAdmin' | 'ProjectManager' | 'Engineer' | 'Inspector' | 'Accountant' | 'Client';
export type PermissionModel = 'RBAC' | 'ABAC';
export type PolicyType = 'preventDelete' | 'preventModify' | 'restrictExport' | 'requireMultipleApprovals' | 'requireHumanReview';
export interface PolicyRule {
    id: string;
    type: PolicyType;
    name: string;
    description: string;
    enabled: boolean;
    resourcePattern: string;
    conditions?: Record<string, unknown>;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
export type DataClassification = 'Public' | 'Internal' | 'Confidential' | 'Restricted' | 'Critical';
export interface RetentionPolicy {
    id: string;
    classification: DataClassification;
    duration: number;
    durationUnit: 'days' | 'months' | 'years';
    archiveDate?: Date;
    secureDeletion: boolean;
    backup: boolean;
    backupRetentionDays?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface EncryptionConfig {
    algorithm: string;
    keySize: number;
    enabled: boolean;
}
export interface KeyManagementConfig {
    provider: string;
    rotationPeriodDays: number;
    autoRotation: boolean;
    hsmEnabled: boolean;
}
export interface IntrusionDetectionConfig {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    realTimeMonitoring: boolean;
    alertThreshold: number;
}
export interface MalwareProtectionConfig {
    enabled: boolean;
    scanFrequency: 'realtime' | 'hourly' | 'daily';
    autoRemediate: boolean;
    signatureUpdates: boolean;
}
export interface AnomalyDetectionConfig {
    enabled: boolean;
    mlModel: string;
    baselinePeriodDays: number;
    alertOnDeviation: boolean;
    deviationThreshold: number;
}
export interface APIProtectionConfig {
    rateLimiting: boolean;
    maxRequestsPerMinute: number;
    jwtValidation: boolean;
    apiKeyRotation: boolean;
    corsPolicy: string;
}
export interface SessionProtectionConfig {
    timeoutMinutes: number;
    maxConcurrentSessions: number;
    requireReauthentication: boolean;
    ipBinding: boolean;
    deviceFingerprinting: boolean;
}
export interface VulnerabilityManagementConfig {
    scanningEnabled: boolean;
    scanSchedule: 'daily' | 'weekly' | 'monthly';
    autoPatch: boolean;
    severityThreshold: 'low' | 'medium' | 'high' | 'critical';
}
export interface SecurityConfig {
    encryption: EncryptionConfig;
    keyManagement: KeyManagementConfig;
    intrusionDetection: IntrusionDetectionConfig;
    malwareProtection: MalwareProtectionConfig;
    anomalyDetection: AnomalyDetectionConfig;
    APIProtection: APIProtectionConfig;
    sessionProtection: SessionProtectionConfig;
    vulnerabilityManagement: VulnerabilityManagementConfig;
}
export type AuditEventType = 'login' | 'dataModify' | 'dataDelete' | 'approval' | 'AIDecision' | 'APICall' | 'adminChange';
export interface AuditLog {
    id: string;
    eventType: AuditEventType;
    timestamp: Date;
    actorId: string;
    actorType: IdentityType;
    action: string;
    resource: string;
    details: string;
    ipAddress: string;
    userAgent: string;
    tamperHash: string;
    previousHash: string;
    signature: string;
    readonly nonEditable: true;
}
export type ComplianceFramework = 'ISO27001' | 'ISO9001' | 'ISO45001' | 'ISO14001' | 'NIST' | 'Local';
export interface ComplianceRequirement {
    id: string;
    framework: ComplianceFramework;
    clause: string;
    description: string;
    status: 'compliant' | 'noncompliant' | 'partial' | 'notapplicable';
    evidence?: string[];
    lastAssessed: Date;
    nextAssessment: Date;
    owner: string;
}
export interface AIGovernanceEntry {
    id: string;
    modelVersion: string;
    trainingData: string;
    trainingDataSize: number;
    publishDate: Date;
    performance: Record<string, number>;
    limitations: string[];
    confidence: number;
    useCases: string[];
    updateLog: string[];
    biasAssessed: boolean;
    fairnessScore?: number;
    explainability: 'none' | 'basic' | 'detailed' | 'full';
    approvedBy: string;
    approvalDate: Date;
}
export type RiskCategory = 'technical' | 'security' | 'data' | 'AI' | 'operational';
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';
export type RiskStatus = 'identified' | 'assessed' | 'mitigated' | 'accepted' | 'monitoring';
export interface MitigationPlan {
    id: string;
    description: string;
    owner: string;
    dueDate: Date;
    status: 'pending' | 'inprogress' | 'completed';
    effectiveness: number;
}
export interface RiskEntry {
    id: string;
    category: RiskCategory;
    severity: RiskSeverity;
    status: RiskStatus;
    title: string;
    description: string;
    likelihood: number;
    impact: number;
    riskScore: number;
    mitigationPlans: MitigationPlan[];
    identifiedBy: string;
    identifiedAt: Date;
    lastReviewed: Date;
    owner: string;
}
export type ApprovalType = 'single' | 'multiLevel' | 'parallel' | 'sequential' | 'temporaryDelegation' | 'eSignature';
export interface ApprovalStep {
    id: string;
    type: ApprovalType;
    order: number;
    approverIds: string[];
    minApprovers: number;
    status: 'pending' | 'approved' | 'rejected' | 'delegated';
    comments?: string;
    delegatedTo?: string;
    signedAt?: Date;
    expiresAt?: Date;
}
export interface ApprovalConfig {
    id: string;
    workflowName: string;
    type: ApprovalType;
    steps: ApprovalStep[];
    requireSignature: boolean;
    requireEvidence: boolean;
    escalationTimeHours: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface EnterpriseTrustIndex {
    overall: number;
    security: number;
    governance: number;
    audit: number;
    compliance: number;
    stability: number;
    dataQuality: number;
    backup: number;
    incidentResponse: number;
    calculatedAt: Date;
    trend: 'improving' | 'stable' | 'declining';
}
export interface ServiceStatus {
    serviceId: string;
    serviceName: string;
    status: 'operational' | 'degraded' | 'partial' | 'major';
    uptime: number;
    lastIncident: Date | null;
    responseTime: number;
}
export interface SecurityEvent {
    id: string;
    type: string;
    severity: string;
    source: string;
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;
}
export interface Alert {
    id: string;
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    acknowledged: boolean;
    createdAt: Date;
    acknowledgedAt?: Date;
}
export interface PerformanceMetric {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    apiLatency: number;
    activeSessions: number;
    requestsPerSecond: number;
    errorRate: number;
}
export interface IntegrationStatus {
    integrationId: string;
    integrationName: string;
    type: string;
    connected: boolean;
    lastSync: Date | null;
    error?: string;
}
export interface GovernanceMetric {
    policyCompliance: number;
    auditCoverage: number;
    riskScore: number;
    openFindings: number;
    resolvedFindings: number;
    lastAssessment: Date;
}
export interface EnterpriseControlCenter {
    services: ServiceStatus[];
    projects: string[];
    users: number;
    securityEvents: SecurityEvent[];
    alerts: Alert[];
    performance: PerformanceMetric;
    integrations: IntegrationStatus[];
    governance: GovernanceMetric;
    lastUpdated: Date;
}
export interface Identity {
    id: string;
    type: IdentityType;
    username: string;
    displayName: string;
    email: string;
    phone?: string;
    department?: string;
    roles: Role[];
    permissions: string[];
    attributes: Record<string, unknown>;
    enabled: boolean;
    locked: boolean;
    mfaEnabled: boolean;
    lastLogin?: Date;
    passwordChangedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
//# sourceMappingURL=types.d.ts.map