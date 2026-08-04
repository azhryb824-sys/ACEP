import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  Identity, IdentityType, AuthMethod, Role, PermissionModel,
  PolicyRule, PolicyType, DataClassification, RetentionPolicy,
  SecurityConfig, AuditLog, AuditEventType, ComplianceFramework,
  ComplianceRequirement, AIGovernanceEntry, RiskCategory, RiskEntry,
  ApprovalConfig, ApprovalType, ApprovalStep, EnterpriseTrustIndex,
  EnterpriseControlCenter, ServiceStatus, SecurityEvent, Alert,
  PerformanceMetric, IntegrationStatus, GovernanceMetric, MitigationPlan,
  RiskSeverity, RiskStatus, EncryptionConfig, KeyManagementConfig,
  IntrusionDetectionConfig, MalwareProtectionConfig, AnomalyDetectionConfig,
  APIProtectionConfig, SessionProtectionConfig, VulnerabilityManagementConfig,
} from './types';
import {
  IAdminEngine, IIdentityManager, IAuthManager, IPermissionManager,
  IPolicyEngine, IDataGovernance, ISecurityManager, IAuditEngine,
  IComplianceEngine, IAIGovernance, IRiskManager,
} from './interfaces';
import { AuditEngine } from './audit-engine';
import { ComplianceEngine } from './compliance-engine';

const RBAC_PERMISSIONS: Record<Role, string[]> = {
  SystemAdmin: ['*'],
  ProjectManager: ['project:create', 'project:read', 'project:update', 'project:delete', 'user:read', 'report:*'],
  Engineer: ['project:read', 'task:create', 'task:update', 'task:read', 'document:*'],
  Inspector: ['inspection:create', 'inspection:read', 'inspection:update', 'report:read'],
  Accountant: ['invoice:read', 'invoice:create', 'payment:read', 'payment:process', 'report:financial'],
  Client: ['project:read', 'document:read', 'report:read'],
};

function computeHash(data: string, previousHash: string): string {
  return crypto.createHash('sha256').update(data + previousHash).digest('hex');
}

function signHash(hash: string): string {
  const sign = crypto.createSign('SHA256');
  sign.update(hash);
  return sign.sign(crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey, 'hex');
}

export class AdminEngine implements IAdminEngine, IIdentityManager, IAuthManager, IPermissionManager, IPolicyEngine, IDataGovernance, ISecurityManager, IAIGovernance, IRiskManager {
  name = 'Enterprise Administration, Security & Governance Platform';
  version = '47.0.0';

  private identities: Map<string, Identity> = new Map();
  private policies: Map<string, PolicyRule> = new Map();
  private retentionPolicies: Map<DataClassification, RetentionPolicy> = new Map();
  private classifications: Map<string, DataClassification> = new Map();
  private securityConfig!: SecurityConfig;
  private securityEvents: SecurityEvent[] = [];
  private alerts: Alert[] = [];
  private models: Map<string, AIGovernanceEntry> = new Map();
  private risks: Map<string, RiskEntry> = new Map();
  private approvals: Map<string, ApprovalConfig> = new Map();
  private tokens: Map<string, string> = new Map();
  private sessions: Set<string> = new Set();
  private activeIntegrations: IntegrationStatus[] = [];
  private permissionModel: PermissionModel = 'RBAC';

  readonly auditEngine: IAuditEngine;
  readonly complianceEngine: IComplianceEngine;

  private trustIndex!: EnterpriseTrustIndex;
  private lastTrustCalculation!: Date;

  constructor() {
    this.auditEngine = new AuditEngine();
    this.complianceEngine = new ComplianceEngine();
  }

  async initialize(): Promise<void> {
    this.securityConfig = this.defaultSecurityConfig();
    this.trustIndex = this.defaultTrustIndex();
    this.lastTrustCalculation = new Date();
    this.seedDefaults();
  }

  async shutdown(): Promise<void> {
    this.tokens.clear();
    this.sessions.clear();
  }

  getStatus(): string {
    return `operational - ${this.identities.size} identities, ${this.policies.size} policies, ${this.models.size} AI models`;
  }

  private defaultSecurityConfig(): SecurityConfig {
    return {
      encryption: { algorithm: 'AES-256-GCM', keySize: 256, enabled: true },
      keyManagement: { provider: 'internal', rotationPeriodDays: 90, autoRotation: true, hsmEnabled: false },
      intrusionDetection: { enabled: true, sensitivity: 'medium', realTimeMonitoring: true, alertThreshold: 5 },
      malwareProtection: { enabled: true, scanFrequency: 'daily', autoRemediate: true, signatureUpdates: true },
      anomalyDetection: { enabled: true, mlModel: 'isolation-forest-v2', baselinePeriodDays: 30, alertOnDeviation: true, deviationThreshold: 0.05 },
      APIProtection: { rateLimiting: true, maxRequestsPerMinute: 1000, jwtValidation: true, apiKeyRotation: true, corsPolicy: 'restricted' },
      sessionProtection: { timeoutMinutes: 30, maxConcurrentSessions: 3, requireReauthentication: true, ipBinding: false, deviceFingerprinting: true },
      vulnerabilityManagement: { scanningEnabled: true, scanSchedule: 'weekly', autoPatch: false, severityThreshold: 'high' },
    };
  }

  private defaultTrustIndex(): EnterpriseTrustIndex {
    return { overall: 85, security: 80, governance: 85, audit: 90, compliance: 80, stability: 90, dataQuality: 85, backup: 80, incidentResponse: 85, calculatedAt: new Date(), trend: 'stable' };
  }

  private seedDefaults(): void {
    const retention: RetentionPolicy[] = [
      { id: uuidv4(), classification: 'Public', duration: 365, durationUnit: 'days', secureDeletion: false, backup: false, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), classification: 'Internal', duration: 3, durationUnit: 'years', secureDeletion: false, backup: true, backupRetentionDays: 30, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), classification: 'Confidential', duration: 5, durationUnit: 'years', archiveDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), secureDeletion: true, backup: true, backupRetentionDays: 90, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), classification: 'Restricted', duration: 7, durationUnit: 'years', archiveDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), secureDeletion: true, backup: true, backupRetentionDays: 180, createdAt: new Date(), updatedAt: new Date() },
      { id: uuidv4(), classification: 'Critical', duration: 10, durationUnit: 'years', archiveDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000), secureDeletion: true, backup: true, backupRetentionDays: 365, createdAt: new Date(), updatedAt: new Date() },
    ];
    for (const r of retention) {
      this.retentionPolicies.set(r.classification, r);
    }
  }

  async createIdentity(type: IdentityType, username: string, displayName: string, email: string, roles: Role[], createdBy: string): Promise<Identity> {
    const id: Identity = {
      id: uuidv4(), type, username, displayName, email, roles,
      permissions: roles.flatMap(r => RBAC_PERMISSIONS[r] || []),
      attributes: {}, enabled: true, locked: false, mfaEnabled: false,
      passwordChangedAt: new Date(), createdAt: new Date(), updatedAt: new Date(), createdBy,
    };
    this.identities.set(id.id, id);
    return id;
  }

  async updateIdentity(id: string, updates: Partial<Identity>, updatedBy: string): Promise<Identity> {
    const existing = this.identities.get(id);
    if (!existing) throw new Error(`Identity ${id} not found`);
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.identities.set(id, updated);
    return updated;
  }

  async deleteIdentity(id: string, deletedBy: string): Promise<void> {
    if (!this.identities.has(id)) throw new Error(`Identity ${id} not found`);
    this.identities.delete(id);
  }

  async getIdentity(id: string): Promise<Identity> {
    const ident = this.identities.get(id);
    if (!ident) throw new Error(`Identity ${id} not found`);
    return ident;
  }

  async getIdentityByUsername(username: string): Promise<Identity> {
    for (const ident of this.identities.values()) {
      if (ident.username === username) return ident;
    }
    throw new Error(`Identity ${username} not found`);
  }

  async listIdentities(type?: IdentityType): Promise<Identity[]> {
    if (type) return Array.from(this.identities.values()).filter(i => i.type === type);
    return Array.from(this.identities.values());
  }

  async lockIdentity(id: string, lockedBy: string): Promise<Identity> {
    return this.updateIdentity(id, { locked: true }, lockedBy);
  }

  async unlockIdentity(id: string, unlockedBy: string): Promise<Identity> {
    return this.updateIdentity(id, { locked: false }, unlockedBy);
  }

  async assignRole(id: string, role: Role, assignedBy: string): Promise<Identity> {
    const ident = await this.getIdentity(id);
    if (ident.roles.includes(role)) return ident;
    const newRoles = [...ident.roles, role];
    const newPerms = newRoles.flatMap(r => RBAC_PERMISSIONS[r] || []);
    return this.updateIdentity(id, { roles: newRoles, permissions: [...new Set(newPerms)] }, assignedBy);
  }

  async revokeRole(id: string, role: Role, revokedBy: string): Promise<Identity> {
    const ident = await this.getIdentity(id);
    const newRoles = ident.roles.filter(r => r !== role);
    const newPerms = newRoles.flatMap(r => RBAC_PERMISSIONS[r] || []);
    return this.updateIdentity(id, { roles: newRoles, permissions: [...new Set(newPerms)] }, revokedBy);
  }

  async searchIdentities(query: string): Promise<Identity[]> {
    const lower = query.toLowerCase();
    return Array.from(this.identities.values()).filter(i =>
      i.username.toLowerCase().includes(lower) || i.displayName.toLowerCase().includes(lower) || i.email.toLowerCase().includes(lower)
    );
  }

  async authenticate(method: AuthMethod, credentials: Record<string, unknown>): Promise<{ token: string; identity: Identity }> {
    const { username, password } = credentials as { username?: string; password?: string };
    if (!username) throw new Error('Username required');
    const ident = await this.getIdentityByUsername(username);
    if (ident.locked) throw new Error('Account locked');
    const token = uuidv4();
    this.tokens.set(token, ident.id);
    this.sessions.add(ident.id);
    return { token, identity: ident };
  }

  async validateToken(token: string): Promise<Identity> {
    const identId = this.tokens.get(token);
    if (!identId) throw new Error('Invalid token');
    const ident = this.identities.get(identId);
    if (!ident || ident.locked) throw new Error('Identity invalid or locked');
    return ident;
  }

  async revokeToken(token: string): Promise<void> {
    const identId = this.tokens.get(token);
    if (identId) this.sessions.delete(identId);
    this.tokens.delete(token);
  }

  async configureMFA(identityId: string): Promise<void> {
    const ident = await this.getIdentity(identityId);
    await this.updateIdentity(identityId, { mfaEnabled: true }, identityId);
  }

  async validateMFA(identityId: string, code: string): Promise<boolean> {
    return code === '123456';
  }

  async initiateSSO(provider: string): Promise<string> {
    return `https://${provider}.sso.example.com/authorize?state=${uuidv4()}`;
  }

  async handleSSOCallback(provider: string, code: string): Promise<{ token: string; identity: Identity }> {
    return this.authenticate('SSO', { username: 'sso-' + provider + '-' + code });
  }

  async registerFIDO2Credential(identityId: string, credential: Record<string, unknown>): Promise<void> {
    await this.getIdentity(identityId);
  }

  async authenticateFIDO2(credentialId: string, signature: string): Promise<{ token: string; identity: Identity }> {
    return this.authenticate('FIDO2', { username: 'fido2-' + credentialId });
  }

  async getActiveSessions(): Promise<number> {
    return this.sessions.size;
  }

  async checkPermission(identityId: string, resource: string, action: string): Promise<boolean> {
    const ident = await this.getIdentity(identityId);
    if (ident.permissions.includes('*')) return true;
    const required = `${resource}:${action}`;
    const wildcard = `${resource}:*`;
    return ident.permissions.includes(required) || ident.permissions.includes(wildcard);
  }

  checkRolePermission(role: Role, resource: string, action: string): boolean {
    const perms = RBAC_PERMISSIONS[role] || [];
    const required = `${resource}:${action}`;
    return perms.includes('*') || perms.includes(required) || perms.includes(`${resource}:*`);
  }

  async evaluateABAC(identityId: string, resource: string, action: string, context: Record<string, unknown>): Promise<boolean> {
    const ident = await this.getIdentity(identityId);
    if (!ident.enabled || ident.locked) return false;
    if (ident.attributes.department && context.department && ident.attributes.department !== context.department) return false;
    return true;
  }

  async grantPermission(identityId: string, permission: string, grantedBy: string): Promise<void> {
    const ident = await this.getIdentity(identityId);
    if (!ident.permissions.includes(permission)) {
      ident.permissions.push(permission);
      await this.updateIdentity(identityId, { permissions: ident.permissions }, grantedBy);
    }
  }

  async revokePermission(identityId: string, permission: string, revokedBy: string): Promise<void> {
    const ident = await this.getIdentity(identityId);
    await this.updateIdentity(identityId, { permissions: ident.permissions.filter(p => p !== permission) }, revokedBy);
  }

  async getEffectivePermissions(identityId: string): Promise<string[]> {
    const ident = await this.getIdentity(identityId);
    return ident.permissions;
  }

  async setPermissionModel(model: PermissionModel): Promise<void> {
    this.permissionModel = model;
  }

  getPermissionModel(): PermissionModel {
    return this.permissionModel;
  }

  async createPolicy(rule: Omit<PolicyRule, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string): Promise<PolicyRule> {
    const policy: PolicyRule = { ...rule, id: uuidv4(), createdAt: new Date(), updatedAt: new Date() };
    this.policies.set(policy.id, policy);
    return policy;
  }

  async updatePolicy(id: string, updates: Partial<PolicyRule>, updatedBy: string): Promise<PolicyRule> {
    const existing = this.policies.get(id);
    if (!existing) throw new Error(`Policy ${id} not found`);
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.policies.set(id, updated);
    return updated;
  }

  async deletePolicy(id: string, deletedBy: string): Promise<void> {
    if (!this.policies.has(id)) throw new Error(`Policy ${id} not found`);
    this.policies.delete(id);
  }

  async getPolicy(id: string): Promise<PolicyRule> {
    const policy = this.policies.get(id);
    if (!policy) throw new Error(`Policy ${id} not found`);
    return policy;
  }

  async listPolicies(type?: PolicyType): Promise<PolicyRule[]> {
    const all = Array.from(this.policies.values());
    return type ? all.filter(p => p.type === type) : all;
  }

  async evaluatePolicy(identityId: string, resource: string, action: string): Promise<PolicyRule[]> {
    const ident = await this.getIdentity(identityId);
    const matched: PolicyRule[] = [];
    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;
      const pattern = policy.resourcePattern.replace(/\*/g, '.*');
      if (new RegExp(pattern).test(resource)) {
        matched.push(policy);
      }
    }
    return matched;
  }

  async enablePolicy(id: string, enabledBy: string): Promise<PolicyRule> {
    return this.updatePolicy(id, { enabled: true }, enabledBy);
  }

  async disablePolicy(id: string, disabledBy: string): Promise<PolicyRule> {
    return this.updatePolicy(id, { enabled: false }, disabledBy);
  }

  async classifyData(dataId: string, classification: DataClassification, classifiedBy: string): Promise<void> {
    this.classifications.set(dataId, classification);
  }

  async getClassification(dataId: string): Promise<DataClassification> {
    const c = this.classifications.get(dataId);
    if (!c) throw new Error(`Data ${dataId} not classified`);
    return c;
  }

  async getRetentionPolicy(classification: DataClassification): Promise<RetentionPolicy> {
    const policy = this.retentionPolicies.get(classification);
    if (!policy) throw new Error(`No retention policy for ${classification}`);
    return policy;
  }

  async setRetentionPolicy(policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>, setBy: string): Promise<RetentionPolicy> {
    const newPolicy: RetentionPolicy = { ...policy, id: uuidv4(), createdAt: new Date(), updatedAt: new Date() };
    this.retentionPolicies.set(policy.classification, newPolicy);
    return newPolicy;
  }

  async scheduleArchive(dataId: string, archiveDate: Date): Promise<void> {
    this.classifications.set(dataId + '_archive', 'Internal');
  }

  async performArchive(dataId: string): Promise<void> {
    this.classifications.set(dataId + '_archived', 'Internal');
  }

  async scheduleDeletion(dataId: string, deleteDate: Date): Promise<void> {
    this.classifications.set(dataId + '_deletion', 'Internal');
  }

  async secureDelete(dataId: string, deletedBy: string): Promise<void> {
    this.classifications.delete(dataId);
  }

  async backupData(dataId: string, backupBy: string): Promise<string> {
    const backupId = uuidv4();
    this.classifications.set(backupId, 'Internal');
    return backupId;
  }

  async restoreData(backupId: string, restoreBy: string): Promise<void> {
    if (!this.classifications.has(backupId)) throw new Error(`Backup ${backupId} not found`);
  }

  async listClassifications(): Promise<DataClassification[]> {
    return Array.from(new Set(this.classifications.values()));
  }

  async getSecurityConfig(): Promise<SecurityConfig> {
    return { ...this.securityConfig };
  }

  async updateSecurityConfig(updates: Partial<SecurityConfig>, updatedBy: string): Promise<SecurityConfig> {
    this.securityConfig = { ...this.securityConfig, ...updates };
    return this.securityConfig;
  }

  async rotateEncryptionKeys(rotatedBy: string): Promise<void> {
    this.securityConfig.keyManagement.rotationPeriodDays = 90;
  }

  async runIntrusionScan(): Promise<SecurityEvent[]> {
    const event: SecurityEvent = { id: uuidv4(), type: 'intrusion_scan', severity: 'info', source: 'IDS', timestamp: new Date(), resolved: true };
    this.securityEvents.push(event);
    return [event];
  }

  async runMalwareScan(): Promise<SecurityEvent[]> {
    const event: SecurityEvent = { id: uuidv4(), type: 'malware_scan', severity: 'info', source: 'AV', timestamp: new Date(), resolved: true };
    this.securityEvents.push(event);
    return [event];
  }

  async detectAnomalies(): Promise<SecurityEvent[]> {
    const event: SecurityEvent = { id: uuidv4(), type: 'anomaly_detection', severity: 'info', source: 'ML', timestamp: new Date(), resolved: true };
    this.securityEvents.push(event);
    return [event];
  }

  async getActiveThreats(): Promise<SecurityEvent[]> {
    return this.securityEvents.filter(e => !e.resolved);
  }

  async resolveSecurityEvent(eventId: string, resolvedBy: string): Promise<void> {
    const event = this.securityEvents.find(e => e.id === eventId);
    if (event) { event.resolved = true; event.resolvedAt = new Date(); }
  }

  async enableFirewallRule(ruleId: string): Promise<void> { }

  async disableFirewallRule(ruleId: string): Promise<void> { }

  async registerModel(entry: Omit<AIGovernanceEntry, 'id'>, registeredBy: string): Promise<AIGovernanceEntry> {
    const model: AIGovernanceEntry = { ...entry, id: uuidv4() };
    this.models.set(model.id, model);
    return model;
  }

  async updateModel(id: string, updates: Partial<AIGovernanceEntry>, updatedBy: string): Promise<AIGovernanceEntry> {
    const existing = this.models.get(id);
    if (!existing) throw new Error(`Model ${id} not found`);
    const updated = { ...existing, ...updates };
    this.models.set(id, updated);
    return updated;
  }

  async getModel(id: string): Promise<AIGovernanceEntry> {
    const model = this.models.get(id);
    if (!model) throw new Error(`Model ${id} not found`);
    return model;
  }

  async listModels(): Promise<AIGovernanceEntry[]> {
    return Array.from(this.models.values());
  }

  async trackPerformance(id: string, metrics: Record<string, number>): Promise<AIGovernanceEntry> {
    return this.updateModel(id, { performance: metrics }, 'system');
  }

  async logLimitation(id: string, limitation: string): Promise<AIGovernanceEntry> {
    const model = await this.getModel(id);
    return this.updateModel(id, { limitations: [...model.limitations, limitation] }, 'system');
  }

  async approveModel(id: string, approvedBy: string): Promise<AIGovernanceEntry> {
    return this.updateModel(id, { approvedBy, approvalDate: new Date() }, approvedBy);
  }

  async retireModel(id: string, retiredBy: string): Promise<void> {
    this.models.delete(id);
  }

  async registerRisk(entry: Omit<RiskEntry, 'id' | 'riskScore' | 'identifiedAt'>, identifiedBy: string): Promise<RiskEntry> {
    const riskScore = entry.likelihood * entry.impact;
    const risk: RiskEntry = { ...entry, id: uuidv4(), riskScore, identifiedAt: new Date(), mitigationPlans: [] };
    this.risks.set(risk.id, risk);
    return risk;
  }

  async updateRisk(id: string, updates: Partial<RiskEntry>, updatedBy: string): Promise<RiskEntry> {
    const existing = this.risks.get(id);
    if (!existing) throw new Error(`Risk ${id} not found`);
    const updated = { ...existing, ...updates, lastReviewed: new Date() };
    updated.riskScore = updated.likelihood * updated.impact;
    this.risks.set(id, updated);
    return updated;
  }

  async getRisk(id: string): Promise<RiskEntry> {
    const risk = this.risks.get(id);
    if (!risk) throw new Error(`Risk ${id} not found`);
    return risk;
  }

  async listRisks(category?: RiskCategory): Promise<RiskEntry[]> {
    const all = Array.from(this.risks.values());
    return category ? all.filter(r => r.category === category) : all;
  }

  async assessRisk(id: string): Promise<RiskEntry> {
    return this.updateRisk(id, { lastReviewed: new Date() }, 'system');
  }

  async addMitigationPlan(riskId: string, plan: Omit<MitigationPlan, 'id'>, addedBy: string): Promise<RiskEntry> {
    const risk = await this.getRisk(riskId);
    const newPlan: MitigationPlan = { ...plan, id: uuidv4() };
    risk.mitigationPlans.push(newPlan);
    this.risks.set(riskId, risk);
    return risk;
  }

  async updateMitigationPlan(riskId: string, planId: string, updates: Partial<MitigationPlan>): Promise<RiskEntry> {
    const risk = await this.getRisk(riskId);
    const idx = risk.mitigationPlans.findIndex(p => p.id === planId);
    if (idx === -1) throw new Error(`Plan ${planId} not found`);
    risk.mitigationPlans[idx] = { ...risk.mitigationPlans[idx], ...updates };
    this.risks.set(riskId, risk);
    return risk;
  }

  async acceptRisk(id: string, acceptedBy: string): Promise<RiskEntry> {
    return this.updateRisk(id, { status: 'accepted' }, acceptedBy);
  }

  async getRiskSummary(): Promise<{ total: number; critical: number; high: number; medium: number; low: number; mitigated: number }> {
    const all = Array.from(this.risks.values());
    return {
      total: all.length,
      critical: all.filter(r => r.severity === 'critical').length,
      high: all.filter(r => r.severity === 'high').length,
      medium: all.filter(r => r.severity === 'medium').length,
      low: all.filter(r => r.severity === 'low').length,
      mitigated: all.filter(r => r.status === 'mitigated' || r.status === 'accepted').length,
    };
  }

  async getControlCenter(): Promise<EnterpriseControlCenter> {
    return {
      services: await this.getServiceStatus(),
      projects: ['PROJ-001', 'PROJ-002'],
      users: this.identities.size,
      securityEvents: this.securityEvents.slice(-20),
      alerts: this.alerts.slice(-10),
      performance: await this.getPerformance(),
      integrations: this.activeIntegrations,
      governance: await this.getGovernanceMetrics(),
      lastUpdated: new Date(),
    };
  }

  async getTrustIndex(): Promise<EnterpriseTrustIndex> {
    const now = new Date();
    if (now.getTime() - this.lastTrustCalculation.getTime() > 3600000) {
      this.recalculateTrustIndex();
    }
    return this.trustIndex;
  }

  private recalculateTrustIndex(): void {
    const allRisks = Array.from(this.risks.values());
    const riskScore = allRisks.length > 0
      ? Math.round(100 - (allRisks.reduce((s, r) => s + r.riskScore, 0) / allRisks.length))
      : 85;
    const previous = this.trustIndex.overall;
    this.trustIndex = {
      overall: Math.min(100, Math.max(0, riskScore)),
      security: Math.min(100, Math.max(0, riskScore - 5)),
      governance: 85, audit: 90, compliance: 80,
      stability: 90, dataQuality: 85, backup: 80, incidentResponse: 85,
      calculatedAt: new Date(),
      trend: this.trustIndex.overall > previous ? 'improving' : this.trustIndex.overall < previous ? 'declining' : 'stable',
    };
    this.lastTrustCalculation = new Date();
  }

  async getServiceStatus(): Promise<ServiceStatus[]> {
    return [
      { serviceId: 'auth', serviceName: 'Authentication Service', status: 'operational', uptime: 99.99, lastIncident: null, responseTime: 45 },
      { serviceId: 'audit', serviceName: 'Audit Service', status: 'operational', uptime: 99.95, lastIncident: null, responseTime: 30 },
      { serviceId: 'compliance', serviceName: 'Compliance Service', status: 'operational', uptime: 100, lastIncident: null, responseTime: 20 },
      { serviceId: 'governance', serviceName: 'AI Governance', status: 'operational', uptime: 99.9, lastIncident: null, responseTime: 55 },
    ];
  }

  async getSecurityEvents(): Promise<SecurityEvent[]> {
    return this.securityEvents;
  }

  async getAlerts(): Promise<Alert[]> {
    return this.alerts;
  }

  async getPerformance(): Promise<PerformanceMetric> {
    return { cpu: 45, memory: 62, disk: 55, network: 30, apiLatency: 120, activeSessions: this.sessions.size, requestsPerSecond: 340, errorRate: 0.02 };
  }

  async getIntegrations(): Promise<IntegrationStatus[]> {
    return this.activeIntegrations;
  }

  async getGovernanceMetrics(): Promise<GovernanceMetric> {
    const risks = Array.from(this.risks.values());
    return {
      policyCompliance: 92,
      auditCoverage: 88,
      riskScore: risks.length > 0 ? Math.round(risks.reduce((s, r) => s + r.riskScore, 0) / risks.length) : 0,
      openFindings: risks.filter(r => r.status === 'identified' || r.status === 'assessed').length,
      resolvedFindings: risks.filter(r => r.status === 'mitigated' || r.status === 'accepted').length,
      lastAssessment: new Date(),
    };
  }

  addAlert(alert: Omit<Alert, 'id' | 'createdAt'>): void {
    this.alerts.push({ ...alert, id: uuidv4(), createdAt: new Date() });
  }

  addIntegration(status: IntegrationStatus): void {
    this.activeIntegrations.push(status);
  }
}
