import { v4 as uuidv4 } from 'uuid';
import {
  ComplianceFramework, ComplianceRequirement, Alert,
} from './types';
import { IComplianceEngine } from './interfaces';

const FRAMEWORK_CLAUSES: Record<ComplianceFramework, string[]> = {
  ISO27001: ['A.5.1', 'A.6.1', 'A.7.1', 'A.8.1', 'A.9.1', 'A.10.1', 'A.11.1', 'A.12.1', 'A.13.1', 'A.14.1', 'A.15.1', 'A.16.1', 'A.17.1', 'A.18.1'],
  ISO9001: ['4.1', '4.2', '5.1', '5.2', '6.1', '7.1', '7.2', '8.1', '8.2', '8.3', '8.4', '8.5', '9.1', '9.2', '9.3', '10.1', '10.2'],
  ISO45001: ['4.1', '4.2', '5.1', '5.2', '5.3', '6.1', '6.2', '7.1', '7.2', '7.3', '7.4', '8.1', '8.2', '9.1', '9.2', '9.3', '10.1', '10.2'],
  ISO14001: ['4.1', '4.2', '5.1', '5.2', '6.1', '6.2', '7.1', '7.2', '7.3', '7.4', '7.5', '8.1', '8.2', '9.1', '9.2', '9.3', '10.1', '10.2'],
  NIST: ['AC-1', 'AC-2', 'AU-1', 'AU-2', 'AT-1', 'AT-2', 'CA-1', 'CA-2', 'CM-1', 'CM-2', 'CP-1', 'CP-2', 'IA-1', 'IA-2', 'IR-1', 'IR-2', 'MA-1', 'MA-2', 'MP-1', 'MP-2', 'PE-1', 'PE-2', 'PL-1', 'PL-2', 'PS-1', 'PS-2', 'RA-1', 'RA-2', 'SA-1', 'SA-2', 'SC-1', 'SC-2', 'SI-1', 'SI-2'],
  Local: ['REG-1', 'REG-2', 'REG-3', 'REG-4', 'REG-5'],
};

const CLAUSE_DESCRIPTIONS: Record<string, string> = {
  'A.5.1': 'Information security policy',
  'A.9.1': 'Access control policy',
  'A.12.1': 'Operational security',
  'A.16.1': 'Incident management',
  'A.18.1': 'Compliance with legal requirements',
  '4.1': 'Understanding the organization and its context',
  '5.1': 'Leadership and commitment',
  '6.1': 'Actions to address risks and opportunities',
  '7.1': 'Resources',
  '8.1': 'Operational planning and control',
  '9.1': 'Monitoring, measurement, analysis and evaluation',
  '10.1': 'Nonconformity and corrective action',
  'AC-1': 'Access Control Policy and Procedures',
  'AU-1': 'Audit and Accountability Policy and Procedures',
  'IR-1': 'Incident Response Policy and Procedures',
  'SI-1': 'System and Information Integrity Policy and Procedures',
  'REG-1': 'Local regulatory compliance',
};

const DEFAULT_MAPPINGS: Partial<Record<ComplianceFramework, string[]>> = {
  ISO27001: ['preventDelete', 'preventModify', 'requireMultipleApprovals'],
  ISO9001: ['requireHumanReview'],
  NIST: ['preventDelete', 'restrictExport', 'requireMultipleApprovals'],
};

export class ComplianceEngine implements IComplianceEngine {
  private frameworks: Set<ComplianceFramework> = new Set();
  private requirements: Map<string, ComplianceRequirement> = new Map();
  private monitoring: Set<ComplianceFramework> = new Set();
  private deviationAlerts: Alert[] = [];
  private evidenceStore: Map<string, string[]> = new Map();

  async registerFramework(framework: ComplianceFramework, registeredBy: string): Promise<void> {
    this.frameworks.add(framework);
    const clauses = FRAMEWORK_CLAUSES[framework];
    for (const clause of clauses) {
      const req: ComplianceRequirement = {
        id: uuidv4(),
        framework,
        clause,
        description: CLAUSE_DESCRIPTIONS[clause] || `Requirement ${clause} for ${framework}`,
        status: 'notapplicable',
        lastAssessed: new Date(),
        nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        owner: registeredBy,
      };
      this.requirements.set(req.id, req);
    }
  }

  async assessCompliance(framework: ComplianceFramework): Promise<ComplianceRequirement[]> {
    const reqs = Array.from(this.requirements.values()).filter(r => r.framework === framework);
    for (const req of reqs) {
      req.status = Math.random() > 0.2 ? 'compliant' : 'partial';
      req.lastAssessed = new Date();
      req.nextAssessment = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      this.requirements.set(req.id, req);
    }
    return reqs;
  }

  async getComplianceStatus(framework?: ComplianceFramework): Promise<Record<string, ComplianceRequirement[]>> {
    const result: Record<string, ComplianceRequirement[]> = {};
    const frameworks = framework ? [framework] : Array.from(this.frameworks);
    for (const fw of frameworks) {
      result[fw] = Array.from(this.requirements.values()).filter(r => r.framework === fw);
    }
    return result;
  }

  async getRequirements(framework: ComplianceFramework): Promise<ComplianceRequirement[]> {
    return Array.from(this.requirements.values()).filter(r => r.framework === framework);
  }

  async addEvidence(requirementId: string, evidence: string, addedBy: string): Promise<ComplianceRequirement> {
    const req = this.requirements.get(requirementId);
    if (!req) throw new Error(`Requirement ${requirementId} not found`);
    const ev = this.evidenceStore.get(requirementId) || [];
    ev.push(evidence);
    this.evidenceStore.set(requirementId, ev);
    req.evidence = ev;
    this.requirements.set(requirementId, req);
    return req;
  }

  async generateComplianceReport(framework: ComplianceFramework): Promise<string> {
    const reqs = await this.getRequirements(framework);
    const compliant = reqs.filter(r => r.status === 'compliant').length;
    const noncompliant = reqs.filter(r => r.status === 'noncompliant').length;
    const partial = reqs.filter(r => r.status === 'partial').length;
    const na = reqs.filter(r => r.status === 'notapplicable').length;
    const total = reqs.length;
    const score = total > 0 ? Math.round((compliant / total) * 100) : 0;
    const mappings = DEFAULT_MAPPINGS[framework] || [];

    return [
      `=== Compliance Report: ${framework} ===`,
      `Generated: ${new Date().toISOString()}`,
      `Framework: ${framework}`,
      `Total Requirements: ${total}`,
      `Compliant: ${compliant}`,
      `Non-Compliant: ${noncompliant}`,
      `Partial: ${partial}`,
      `Not Applicable: ${na}`,
      `Compliance Score: ${score}%`,
      ``,
      `Policy Mappings:`,
      ...mappings.map(m => `  - ${m}`),
      ``,
      `Requirement Details:`,
      ...reqs.map(r => `  [${r.status.toUpperCase()}] ${r.clause}: ${r.description} (Owner: ${r.owner})`),
      ``,
      `Evidence Count: ${Array.from(this.evidenceStore.keys()).length} requirements have evidence`,
    ].join('\n');
  }

  async startContinuousMonitoring(framework: ComplianceFramework): Promise<void> {
    this.monitoring.add(framework);
  }

  async stopContinuousMonitoring(framework: ComplianceFramework): Promise<void> {
    this.monitoring.delete(framework);
  }

  async getDeviationAlerts(): Promise<Alert[]> {
    for (const fw of this.monitoring) {
      const reqs = Array.from(this.requirements.values()).filter(r => r.framework === fw);
      for (const req of reqs) {
        if (req.status === 'noncompliant' || req.status === 'partial') {
          const existing = this.deviationAlerts.find(a => a.message.includes(req.clause));
          if (!existing) {
            this.deviationAlerts.push({
              id: uuidv4(),
              type: 'compliance_deviation',
              message: `Deviation detected: ${fw} clause ${req.clause} - ${req.description}`,
              severity: 'warning',
              acknowledged: false,
              createdAt: new Date(),
            });
          }
        }
      }
    }
    return this.deviationAlerts;
  }

  getMonitoredFrameworks(): ComplianceFramework[] {
    return Array.from(this.monitoring);
  }
}
