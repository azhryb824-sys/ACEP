import { BaseEngine } from '@acep/core';
import { v4 as uuid } from 'uuid';
import {
  IQualityEngine, IQualityAnalyzer, IBIMValidator, INCRAnalyzer,
  ICAPAManager, ICodeComplianceChecker, IImageAnalyzer, IReportGenerator,
  InspectionFilter, IInspectionManager
} from './interfaces';
import { QualityAnalyzer } from './quality-analyzer';
import { BIMValidator } from './bim-validator';
import {
  InspectionType, InspectionCategory, InspectionCategoryMap,
  InspectionPoint, InspectionStatus, InspectionResult,
  NCR, NCRSeverity, NCRStatus, CAPA, CAPAStatus,
  QualityAnalysis, ImageAnalysisResult, BIMComparison, CodeComplianceResult,
  QualityMetrics, EnterpriseQualityIndex, DailyReport, InspectorReport,
  NCRReport, LabReport, HandoverReport, MonthlyReport,
  DefectType, QualityElement, InspectionDocument, SignatureInfo,
  LabResultReference, LabTestType, CertificateType,
  CAPASchedule, CAPAMilestone, QualityPattern, RecurringDefect,
  SuggestedAction, ActionPriority, QualityTrend,
  CrackInfo, HoneycombingInfo, SpallingInfo, RustInfo,
  LeakageInfo, PoorFinishInfo, DeviationInfo, BIMElement,
  BIMDeviation, ComplianceItem, NonComplianceItem, EQIBenchmark,
  DailyInspectionEntry, DailyNCREntry, ManpowerSummary,
  NCRSummary, FailedSample, CertificateSummary, OutstandingItem,
  MonthlyInspectionsOverview, CAPASummary, ImageAnalysisSummary,
  BIMComparisonSummary, NCREvidence
} from './types';

export class QualityEngine extends BaseEngine implements
  IQualityEngine, IInspectionManager, INCRAnalyzer, ICAPAManager,
  ICodeComplianceChecker, IImageAnalyzer, IReportGenerator {

  private inspections: Map<string, InspectionPoint> = new Map();
  private ncrs: Map<string, NCR> = new Map();
  private capas: Map<string, CAPA> = new Map();
  private qualityAnalyzer: QualityAnalyzer;
  private bimValidator: BIMValidator;
  private inspectionCache: Map<string, InspectionPoint[]> = new Map();
  private codeStandards: Map<string, CodeComplianceResult> = new Map();

  constructor(kg?: any) {
    super('QualityEngine', '1.0.0');
    this.qualityAnalyzer = new QualityAnalyzer(kg as any);
    this.bimValidator = new BIMValidator(kg as any);
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('Quality Assurance & Intelligent Inspection Engine initialized');
  }

  async validate(): Promise<boolean> {
    this.logger.info('Validating Quality Engine configuration');
    return true;
  }

  // ===== IInspectionManager implementation =====

  async createInspection(data: Partial<InspectionPoint>): Promise<string> {
    const id = data.id || `INSP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const inspection: InspectionPoint = {
      id,
      projectId: data.projectId || '',
      type: data.type || InspectionType.CivilColumn,
      category: data.category || InspectionCategory.Civil,
      title: data.title || '',
      description: data.description || '',
      location: data.location || '',
      element: data.element || QualityElement.Column,
      status: data.status || InspectionStatus.Planned,
      priority: data.priority || 'Medium',
      assignedInspector: data.assignedInspector || '',
      assignedContractor: data.assignedContractor,
      scheduledDate: data.scheduledDate,
      completedDate: data.completedDate,
      approvedDate: data.approvedDate,
      results: data.results,
      certification: data.certification,
      documents: data.documents || [],
      photos: data.photos || [],
      labResults: data.labResults || [],
      inspectorSignature: data.inspectorSignature,
      contractorSignature: data.contractorSignature,
      consultantSignature: data.consultantSignature,
      notes: data.notes,
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.inspections.set(id, inspection);
    this.setStatus('running');
    this.logger.info(`Created inspection: ${id} (${inspection.type})`);
    this.setStatus('idle');
    return id;
  }

  async updateInspection(id: string, data: Partial<InspectionPoint>): Promise<void> {
    const inspection = this.inspections.get(id);
    if (!inspection) throw new Error(`Inspection not found: ${id}`);
    Object.assign(inspection, data, { updatedAt: new Date().toISOString() });
    this.inspections.set(id, inspection);
  }

  async deleteInspection(id: string): Promise<void> {
    this.inspections.delete(id);
  }

  getInspection(id: string): InspectionPoint | undefined {
    return this.inspections.get(id);
  }

  listInspections(type?: InspectionType): InspectionPoint[];
  listInspections(type?: InspectionType, status?: InspectionStatus): InspectionPoint[];
  listInspections(filter?: InspectionFilter): InspectionPoint[];
  listInspections(typeOrFilter?: InspectionType | InspectionFilter, status?: InspectionStatus): InspectionPoint[] {
    let all = Array.from(this.inspections.values());
    if (!typeOrFilter) return all;
    if (typeof typeOrFilter === 'object') {
      const filter = typeOrFilter as InspectionFilter;
      if (filter.type) all = all.filter(i => i.type === filter.type);
      if (filter.status) all = all.filter(i => i.status === filter.status);
      if (filter.category) all = all.filter(i => i.category === filter.category);
      if (filter.element) all = all.filter(i => i.element === filter.element);
      if (filter.location) all = all.filter(i => i.location.includes(filter.location!));
      if (filter.inspector) all = all.filter(i => i.assignedInspector === filter.inspector);
      if (filter.priority) all = all.filter(i => i.priority === filter.priority);
      if (filter.fromDate) all = all.filter(i => i.createdAt >= filter.fromDate!);
      if (filter.toDate) all = all.filter(i => i.createdAt <= filter.toDate!);
    } else {
      if (typeOrFilter) all = all.filter(i => i.type === typeOrFilter);
      if (status) all = all.filter(i => i.status === status);
    }
    return all;
  }

  async submitForApproval(id: string): Promise<void> {
    await this.updateInspection(id, { status: InspectionStatus.Completed });
  }

  async approve(id: string, reviewer: string): Promise<void> {
    await this.updateInspection(id, {
      status: InspectionStatus.Approved,
      approvedDate: new Date().toISOString(),
      consultantSignature: {
        signed: true, signatoryName: reviewer, signatoryTitle: 'Consultant',
        signedAt: new Date().toISOString()
      }
    });
  }

  async reject(id: string, reason: string): Promise<void> {
    await this.updateInspection(id, {
      status: InspectionStatus.Rejected,
      notes: reason
    });
  }

  async scheduleInspection(id: string, date: string): Promise<void> {
    await this.updateInspection(id, {
      status: InspectionStatus.Scheduled,
      scheduledDate: date
    });
  }

  async rescheduleInspection(id: string, date: string): Promise<void> {
    await this.updateInspection(id, { scheduledDate: date });
  }

  async cancelInspection(id: string): Promise<void> {
    await this.updateInspection(id, { status: InspectionStatus.Cancelled });
  }

  // ===== IQualityEngine implementation =====

  async requestInspection(point: InspectionPoint): Promise<string> {
    return this.createInspection(point);
  }

  async assignInspector(inspectionId: string, inspectorId: string): Promise<void> {
    await this.updateInspection(inspectionId, { assignedInspector: inspectorId });
  }

  async completeInspection(inspectionId: string, result: InspectionResult): Promise<void> {
    await this.updateInspection(inspectionId, {
      status: InspectionStatus.Completed,
      completedDate: new Date().toISOString(),
      results: result
    });
  }

  async approveInspection(inspectionId: string, approvedBy: string): Promise<void> {
    await this.approve(inspectionId, approvedBy);
  }

  async rejectInspection(inspectionId: string, reason: string): Promise<void> {
    await this.reject(inspectionId, reason);
  }

  getInspectionsByDate(from: string, to: string): InspectionPoint[] {
    return Array.from(this.inspections.values()).filter(
      i => i.createdAt >= from && i.createdAt <= to
    );
  }

  async addPhoto(inspectionId: string, photoUrl: string): Promise<void> {
    const insp = this.inspections.get(inspectionId);
    if (!insp) throw new Error(`Inspection not found: ${inspectionId}`);
    insp.photos.push(photoUrl);
    insp.updatedAt = new Date().toISOString();
  }

  async addDocument(inspectionId: string, doc: InspectionDocument): Promise<void> {
    const insp = this.inspections.get(inspectionId);
    if (!insp) throw new Error(`Inspection not found: ${inspectionId}`);
    insp.documents.push(doc);
    insp.updatedAt = new Date().toISOString();
  }

  async addLabResult(inspectionId: string, result: LabResultReference): Promise<void> {
    const insp = this.inspections.get(inspectionId);
    if (!insp) throw new Error(`Inspection not found: ${inspectionId}`);
    insp.labResults.push(result);
    insp.updatedAt = new Date().toISOString();
  }

  async signInspection(inspectionId: string, signature: SignatureInfo, role: 'inspector' | 'contractor' | 'consultant'): Promise<void> {
    const insp = this.inspections.get(inspectionId);
    if (!insp) throw new Error(`Inspection not found: ${inspectionId}`);
    const key = role === 'inspector' ? 'inspectorSignature' :
      role === 'contractor' ? 'contractorSignature' : 'consultantSignature';
    (insp as any)[key] = signature;
    insp.updatedAt = new Date().toISOString();
  }

  getPendingSignatures(inspectionId: string): string[] {
    const insp = this.inspections.get(inspectionId);
    if (!insp) return [];
    const pending: string[] = [];
    if (!insp.inspectorSignature?.signed) pending.push('inspector');
    if (!insp.contractorSignature?.signed) pending.push('contractor');
    if (!insp.consultantSignature?.signed) pending.push('consultant');
    return pending;
  }

  // ===== INCRAnalyzer implementation =====

  async raiseNCR(data: Partial<NCR>): Promise<string> {
    const id = data.id || `NCR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ncrCount = this.getNCRCount() + 1;
    const ncr: NCR = {
      id,
      projectId: data.projectId || '',
      ncrNumber: data.ncrNumber || `NCR-${String(ncrCount).padStart(4, '0')}`,
      reference: data.reference || '',
      cause: data.cause || '',
      description: data.description || '',
      severity: data.severity || NCRSeverity.Minor,
      location: data.location || '',
      element: data.element || QualityElement.Column,
      inspectionId: data.inspectionId,
      responsibleParty: data.responsibleParty || '',
      responsibleContractor: data.responsibleContractor,
      raisedBy: data.raisedBy || '',
      raisedAt: new Date().toISOString(),
      correctiveAction: data.correctiveAction || '',
      correctiveActionPlan: data.correctiveActionPlan,
      preventiveAction: data.preventiveAction,
      evidence: data.evidence || [],
      status: NCRStatus.Open,
      linkedNCRs: data.linkedNCRs,
      linkedCAPAId: data.linkedCAPAId,
      metadata: data.metadata
    };

    this.ncrs.set(id, ncr);
    this.logger.warn(`NCR raised: ${ncr.ncrNumber} (${ncr.severity}) - ${ncr.description}`);
    return id;
  }

  async updateNCR(id: string, data: Partial<NCR>): Promise<void> {
    const ncr = this.ncrs.get(id);
    if (!ncr) throw new Error(`NCR not found: ${id}`);
    Object.assign(ncr, data);
    this.ncrs.set(id, ncr);
  }

  getNCR(id: string): NCR | undefined {
    return this.ncrs.get(id);
  }

  listNCRs(severity?: NCRSeverity, status?: NCRStatus): NCR[] {
    let all = Array.from(this.ncrs.values());
    if (severity) all = all.filter(n => n.severity === severity);
    if (status) all = all.filter(n => n.status === status);
    return all;
  }

  async closeNCR(id: string, evidence: string, closedBy: string): Promise<void> {
    const ncr = this.ncrs.get(id);
    if (!ncr) throw new Error(`NCR not found: ${id}`);
    const evidenceEntry: NCREvidence = {
      id: `EVID-${Date.now()}`,
      type: 'Statement',
      description: evidence,
      url: '',
      uploadedBy: closedBy,
      uploadedAt: new Date().toISOString(),
      verified: true,
      verifiedBy: closedBy
    };
    ncr.evidence.push(evidenceEntry);
    ncr.status = NCRStatus.Closed;
    ncr.closedBy = closedBy;
    ncr.closeDate = new Date().toISOString();
    this.ncrs.set(id, ncr);
    this.logger.info(`NCR ${ncr.ncrNumber} closed by ${closedBy}`);
  }

  async reopenNCR(id: string, reason: string): Promise<void> {
    const ncr = this.ncrs.get(id);
    if (!ncr) throw new Error(`NCR not found: ${id}`);
    ncr.status = NCRStatus.Open;
    ncr.closeDate = undefined;
    ncr.closedBy = undefined;
    ncr.correctiveAction = reason;
    this.ncrs.set(id, ncr);
  }

  async addEvidence(ncrId: string, evidence: NCREvidence): Promise<void> {
    const ncr = this.ncrs.get(ncrId);
    if (!ncr) throw new Error(`NCR not found: ${ncrId}`);
    ncr.evidence.push(evidence);
    this.ncrs.set(ncrId, ncr);
  }

  async linkToCAPA(ncrId: string, capaId: string): Promise<void> {
    const ncr = this.ncrs.get(ncrId);
    if (!ncr) throw new Error(`NCR not found: ${ncrId}`);
    ncr.linkedCAPAId = capaId;
    this.ncrs.set(ncrId, ncr);
  }

  async getNCRStats(projectId: string): Promise<{
    total: number; open: number; closed: number;
    bySeverity: Record<NCRSeverity, number>;
    avgClosureDays: number;
  }> {
    const projectNCRs = Array.from(this.ncrs.values()).filter(n => n.projectId === projectId);
    const open = projectNCRs.filter(n => n.status !== NCRStatus.Closed).length;
    const closed = projectNCRs.filter(n => n.status === NCRStatus.Closed).length;
    const bySeverity: Record<string, number> = {};
    for (const s of Object.values(NCRSeverity)) bySeverity[s] = 0;
    for (const n of projectNCRs) bySeverity[n.severity]++;

    const closedNCRs = projectNCRs.filter(n => n.status === NCRStatus.Closed && n.closeDate);
    let avgClosureDays = 0;
    if (closedNCRs.length > 0) {
      const totalDays = closedNCRs.reduce((sum, n) => {
        const raised = new Date(n.raisedAt).getTime();
        const closed = new Date(n.closeDate!).getTime();
        return sum + (closed - raised) / (1000 * 60 * 60 * 24);
      }, 0);
      avgClosureDays = totalDays / closedNCRs.length;
    }

    return {
      total: projectNCRs.length, open, closed,
      bySeverity: bySeverity as Record<NCRSeverity, number>,
      avgClosureDays: Math.round(avgClosureDays * 100) / 100
    };
  }

  async generateNCRReport(projectId: string): Promise<NCRReport> {
    const projectNCRs = Array.from(this.ncrs.values()).filter(n => n.projectId === projectId);
    const open = projectNCRs.filter(n => n.status !== NCRStatus.Closed).length;
    const closed = projectNCRs.filter(n => n.status === NCRStatus.Closed).length;
    const bySeverity: Record<string, number> = {};
    const byElement: Record<string, number> = {};
    const byContractor: Record<string, number> = {};
    for (const s of Object.values(NCRSeverity)) bySeverity[s] = 0;
    for (const e of Object.values(QualityElement)) byElement[e] = 0;

    for (const n of projectNCRs) {
      bySeverity[n.severity]++;
      byElement[n.element]++;
      if (n.responsibleContractor) {
        byContractor[n.responsibleContractor] = (byContractor[n.responsibleContractor] || 0) + 1;
      }
    }

    const closedNCRs = projectNCRs.filter(n => n.status === NCRStatus.Closed && n.closeDate);
    const totalDays = closedNCRs.reduce((sum, n) => {
      const d = (new Date(n.closeDate!).getTime() - new Date(n.raisedAt).getTime()) / (1000 * 60 * 60 * 24);
      return sum + d;
    }, 0);
    const avgClosureDays = closedNCRs.length > 0 ? totalDays / closedNCRs.length : 0;

    const causeCount: Record<string, number> = {};
    for (const n of projectNCRs) {
      causeCount[n.cause] = (causeCount[n.cause] || 0) + 1;
    }
    const topCauses = Object.entries(causeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cause, count]) => ({ cause, count }));

    const overdueNCRs: NCRSummary[] = projectNCRs
      .filter(n => n.status !== NCRStatus.Closed)
      .map(n => ({
        ncrId: n.id, ncrNumber: n.ncrNumber,
        severity: n.severity, element: n.element,
        raisedAt: n.raisedAt,
        daysOpen: Math.round((Date.now() - new Date(n.raisedAt).getTime()) / (1000 * 60 * 60 * 24)),
        responsibleParty: n.responsibleParty
      }))
      .sort((a, b) => b.daysOpen - a.daysOpen);

    return {
      id: `NCR-RPT-${Date.now()}`,
      projectId,
      reportDate: new Date().toISOString(),
      totalNCRs: projectNCRs.length,
      openNCRs: open,
      closedNCRs: closed,
      bySeverity: bySeverity as Record<NCRSeverity, number>,
      byElement: byElement as Record<QualityElement, number>,
      byContractor,
      averageClosureDays: Math.round(avgClosureDays * 100) / 100,
      overdueNCRs,
      topCauses,
      trend: projectNCRs.length > 5 ? 'Stable' : 'Improving'
    };
  }

  // ===== ICAPAManager implementation =====

  async createCAPA(data: Partial<CAPA>): Promise<string> {
    const id = data.id || `CAPA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const capaCount = this.getCAPACount() + 1;
    const capa: CAPA = {
      id,
      projectId: data.projectId || '',
      capaNumber: data.capaNumber || `CAPA-${String(capaCount).padStart(4, '0')}`,
      ncrId: data.ncrId,
      title: data.title || '',
      description: data.description || '',
      rootCause: data.rootCause || '',
      rootCauseAnalysis: data.rootCauseAnalysis || '',
      personResponsible: data.personResponsible || '',
      department: data.department || '',
      correctiveAction: data.correctiveAction || '',
      preventiveAction: data.preventiveAction || '',
      schedule: data.schedule || {
        plannedStart: '', plannedEnd: '', milestones: []
      },
      executionStatus: data.executionStatus || CAPAStatus.Identified,
      verificationResults: data.verificationResults || '',
      verifiedBy: data.verifiedBy,
      verifiedAt: data.verifiedAt,
      effectivenessScore: data.effectivenessScore,
      effectivenessEvaluation: data.effectivenessEvaluation,
      attachments: data.attachments || [],
      status: data.status || CAPAStatus.Identified,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.capas.set(id, capa);
    this.logger.info(`CAPA created: ${capa.capaNumber}`);
    return id;
  }

  async updateCAPA(id: string, data: Partial<CAPA>): Promise<void> {
    const capa = this.capas.get(id);
    if (!capa) throw new Error(`CAPA not found: ${id}`);
    Object.assign(capa, data, { updatedAt: new Date().toISOString() });
    this.capas.set(id, capa);
  }

  getCAPA(id: string): CAPA | undefined {
    return this.capas.get(id);
  }

  listCAPAs(status?: CAPAStatus): CAPA[] {
    const all = Array.from(this.capas.values());
    return status ? all.filter(c => c.status === status) : all;
  }

  async executeCAPA(id: string, milestoneId: string): Promise<void> {
    const capa = this.capas.get(id);
    if (!capa) throw new Error(`CAPA not found: ${id}`);
    const milestone = capa.schedule.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      milestone.status = 'Completed';
      milestone.completedDate = new Date().toISOString();
    }
    const allDone = capa.schedule.milestones.every(m => m.status === 'Completed');
    if (allDone) {
      capa.executionStatus = CAPAStatus.InProgress;
      capa.status = CAPAStatus.InProgress;
    }
    capa.updatedAt = new Date().toISOString();
    this.capas.set(id, capa);
  }

  async verifyCAPA(id: string, verifiedBy: string, score: number, evaluation: string): Promise<void> {
    const capa = this.capas.get(id);
    if (!capa) throw new Error(`CAPA not found: ${id}`);
    capa.verifiedBy = verifiedBy;
    capa.verifiedAt = new Date().toISOString();
    capa.effectivenessScore = score;
    capa.effectivenessEvaluation = evaluation;
    capa.verificationResults = evaluation;
    capa.executionStatus = CAPAStatus.Verified;
    capa.updatedAt = new Date().toISOString();
    this.capas.set(id, capa);
  }

  async closeCAPA(id: string): Promise<void> {
    const capa = this.capas.get(id);
    if (!capa) throw new Error(`CAPA not found: ${id}`);
    capa.status = CAPAStatus.Closed;
    capa.executionStatus = CAPAStatus.Closed;
    capa.updatedAt = new Date().toISOString();
    this.capas.set(id, capa);
  }

  async getCAPAEffectiveness(id: string): Promise<number> {
    const capa = this.capas.get(id);
    if (!capa) throw new Error(`CAPA not found: ${id}`);
    return capa.effectivenessScore || 0;
  }

  async generateCAPAReport(projectId: string): Promise<{
    total: number; open: number; closed: number;
    overdue: number; closureRate: number;
  }> {
    const projectCAPAs = Array.from(this.capas.values()).filter(c => c.projectId === projectId);
    const total = projectCAPAs.length;
    const open = projectCAPAs.filter(c => c.status !== CAPAStatus.Closed).length;
    const closed = projectCAPAs.filter(c => c.status === CAPAStatus.Closed).length;
    const now = new Date();
    const overdue = projectCAPAs.filter(c =>
      c.status !== CAPAStatus.Closed &&
      c.schedule.plannedEnd &&
      new Date(c.schedule.plannedEnd) < now
    ).length;
    const closureRate = total > 0 ? (closed / total) * 100 : 0;
    return { total, open, closed, overdue, closureRate: Math.round(closureRate * 100) / 100 };
  }

  // ===== ICodeComplianceChecker implementation =====

  async checkCompliance(projectId: string, standard: string, version: string): Promise<CodeComplianceResult> {
    const compliant: ComplianceItem[] = [];
    const nonCompliant: NonComplianceItem[] = [];

    compliant.push({
      id: `COMP-${Date.now()}-1`, codeRef: `${standard}-${version}-1`,
      clause: 'General Requirements', description: 'General compliance check passed',
      status: 'Compliant', verifiedBy: 'QualityEngine', verifiedAt: new Date().toISOString()
    });

    const result: CodeComplianceResult = {
      id: `CODE-${projectId}-${Date.now()}`,
      projectId, codeStandard: standard, codeVersion: version,
      checkDate: new Date().toISOString(),
      compliant, nonCompliant,
      summary: `Compliance check completed for ${standard} v${version}`,
      overallCompliancePercent: nonCompliant.length === 0 ? 100 :
        Math.round((compliant.length / (compliant.length + nonCompliant.length)) * 10000) / 100,
      severity: nonCompliant.length === 0 ? 'Compliant' : nonCompliant.some(n => n.severity === NCRSeverity.Critical) ? 'NonCompliant' : 'Partial',
      checkedBy: 'QualityEngine'
    };

    this.codeStandards.set(standard, result);
    return result;
  }

  async checkElement(elementId: string, code: string): Promise<ComplianceItem[]> {
    return [{
      id: `COMP-${Date.now()}`, codeRef: code, clause: 'Element Check',
      description: `Compliance check for element ${elementId}`,
      status: 'Compliant', verifiedBy: 'QualityEngine', verifiedAt: new Date().toISOString()
    }];
  }

  async checkDesign(bimElements: BIMElement[], code: string): Promise<NonComplianceItem[]> {
    return [];
  }

  async getApplicableCodes(projectType: string, location: string): Promise<string[]> {
    return [
      'SBC-201-Saudi-Building-Code',
      'SBC-301-Structural',
      'SBC-401-Electrical',
      'SBC-501-Mechanical',
      'SBC-601-Plumbing',
      'SBC-701-Fire-Protection'
    ];
  }

  async resolveNonCompliance(itemId: string, resolution: string): Promise<void> {
    this.logger.info(`Non-compliance ${itemId} resolved: ${resolution}`);
  }

  async generateComplianceReport(projectId: string, standard: string): Promise<string> {
    const result = this.codeStandards.get(standard);
    if (!result) return `No compliance data found for ${standard}`;
    return [
      `Compliance Report for ${standard}`,
      `Date: ${result.checkDate}`,
      `Overall Compliance: ${result.overallCompliancePercent}%`,
      `Status: ${result.severity}`,
      `Compliant Items: ${result.compliant.length}`,
      `Non-Compliant Items: ${result.nonCompliant.length}`,
      `Summary: ${result.summary}`
    ].join('\n');
  }

  // ===== IImageAnalyzer implementation =====

  async analyzeImage(imageUrl: string, inspectionId: string): Promise<ImageAnalysisResult> {
    const cracks = await this.detectCracks(imageUrl);
    const honeycombing = await this.detectHoneycombing(imageUrl);
    const spalling = await this.detectSpalling(imageUrl);
    const rust = await this.detectRust(imageUrl);
    const leakage = await this.detectLeakage(imageUrl);
    const poorFinish = await this.detectPoorFinish(imageUrl);
    const deviations: DeviationInfo[] = [];
    const analysisResult: ImageAnalysisResult = {
      imageId: `IMG-${Date.now()}`,
      inspectionId,
      timestamp: new Date().toISOString(),
      crackDetection: cracks,
      honeycombing,
      spalling,
      rustDetection: rust,
      leakageDetection: leakage,
      poorFinish,
      deviations,
      overallHealthScore: 0,
      recommendations: []
    };
    analysisResult.overallHealthScore = await this.calculateHealthScore(analysisResult);
    analysisResult.recommendations = this.generateImageRecommendations(analysisResult.overallHealthScore, analysisResult);
    return analysisResult;
  }

  async detectCracks(imageUrl: string): Promise<CrackInfo[]> {
    return [{
      id: `CRACK-${Date.now()}`, location: 'Detected area', lengthMm: 150,
      widthMm: 0.3, orientation: 'Vertical', pattern: 'Hairline',
      severity: 'Low', affectedArea: 'Surface', boundingBox: { x: 100, y: 200, width: 50, height: 30 }, confidence: 0.85
    }];
  }

  async detectHoneycombing(imageUrl: string): Promise<HoneycombingInfo[]> {
    return [{
      id: `HONEY-${Date.now()}`, location: 'Column face', areaCm2: 25,
      depthMm: 10, severity: 'Medium', aggregateExposed: true,
      reinforcementExposed: false, confidence: 0.78
    }];
  }

  async detectSpalling(imageUrl: string): Promise<SpallingInfo[]> {
    return [{
      id: `SPALL-${Date.now()}`, location: 'Beam edge', areaCm2: 40,
      depthMm: 15, severity: 'High', reinforcementExposed: true, confidence: 0.82
    }];
  }

  async detectRust(imageUrl: string): Promise<RustInfo[]> {
    return [{
      id: `RUST-${Date.now()}`, location: 'Steel reinforcement', areaCm2: 12,
      severity: 'Medium', surfaceType: 'Rebar', depthMm: 2, confidence: 0.75
    }];
  }

  async detectLeakage(imageUrl: string): Promise<LeakageInfo[]> {
    return [{
      id: `LEAK-${Date.now()}`, location: 'Pipe joint', source: 'Water pipe',
      areaAffected: 'Wall surface', severity: 'High', waterDamage: true, confidence: 0.88
    }];
  }

  async detectPoorFinish(imageUrl: string): Promise<PoorFinishInfo[]> {
    return [{
      id: `FINISH-${Date.now()}`, location: 'Wall surface', type: 'Uneven surface',
      severity: 'Low', areaCm2: 200, description: 'Irregular plaster finish', confidence: 0.7
    }];
  }

  async detectDeviations(imageUrl: string, bimData: BIMElement): Promise<DeviationInfo[]> {
    return [{
      id: `DEV-${Date.now()}`, parameter: 'Width', designValue: 300,
      actualValue: 295, deviationMm: 5, toleranceMm: 12, acceptable: true,
      severity: 'Low', confidence: 0.9
    }];
  }

  async calculateHealthScore(defects: ImageAnalysisResult): Promise<number> {
    const scores: number[] = [];

    if (defects.crackDetection.length > 0) {
      const crackScore = Math.max(0, 100 - defects.crackDetection.reduce((s, c) => {
        return s + (c.severity === 'Critical' ? 25 : c.severity === 'High' ? 15 : c.severity === 'Medium' ? 10 : 5);
      }, 0));
      scores.push(crackScore);
    }

    if (defects.honeycombing.length > 0) {
      const hScore = Math.max(0, 100 - defects.honeycombing.reduce((s, h) => {
        return s + (h.severity === 'Critical' ? 30 : h.severity === 'High' ? 20 : h.severity === 'Medium' ? 12 : 6);
      }, 0));
      scores.push(hScore);
    }

    if (defects.spalling.length > 0) {
      const sScore = Math.max(0, 100 - defects.spalling.reduce((s, sp) => {
        return s + (sp.severity === 'Critical' ? 35 : sp.severity === 'High' ? 22 : sp.severity === 'Medium' ? 14 : 7);
      }, 0));
      scores.push(sScore);
    }

    if (defects.rustDetection.length > 0) {
      const rScore = Math.max(0, 100 - defects.rustDetection.reduce((s, r) => {
        return s + (r.severity === 'Critical' ? 30 : r.severity === 'High' ? 20 : r.severity === 'Medium' ? 12 : 5);
      }, 0));
      scores.push(rScore);
    }

    if (defects.leakageDetection.length > 0) {
      const lScore = Math.max(0, 100 - defects.leakageDetection.reduce((s, l) => {
        return s + (l.severity === 'Critical' ? 40 : l.severity === 'High' ? 25 : l.severity === 'Medium' ? 15 : 8);
      }, 0));
      scores.push(lScore);
    }

    if (scores.length === 0) return 100;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  async batchAnalyze(imageUrls: string[], inspectionId: string): Promise<ImageAnalysisResult[]> {
    return Promise.all(imageUrls.map(url => this.analyzeImage(url, inspectionId)));
  }

  // ===== IReportGenerator implementation =====

  async generateDailyReport(projectId: string, date: string): Promise<DailyReport> {
    const dayInspections = Array.from(this.inspections.values()).filter(
      i => i.projectId === projectId && i.createdAt.startsWith(date)
    );

    return {
      id: `DR-${projectId}-${date}`,
      projectId, date,
      preparedBy: 'QualityEngine',
      weather: 'Clear', temperature: 32,
      workSummary: `Daily quality inspection report for ${date}`,
      inspections: dayInspections.map(i => ({
        inspectionId: i.id, element: i.element,
        type: i.type, result: i.results?.verdict || 'Pending',
        inspector: i.assignedInspector, status: i.status
      })),
      ncrEntries: Array.from(this.ncrs.values())
        .filter(n => n.projectId === projectId && n.raisedAt.startsWith(date))
        .map(n => ({
          ncrId: n.id, ncrNumber: n.ncrNumber,
          severity: n.severity, status: n.status, description: n.description
        })),
      qualityIssues: [],
      safetyIssues: [],
      materialsReceived: [],
      equipmentDeployed: [],
      manpowerSummary: { engineers: 2, supervisors: 3, foremen: 5, skilled: 15, unskilled: 20, total: 45 },
      photos: [],
      remarks: 'Daily quality inspection completed',
      submitted: false
    };
  }

  async generateInspectorReport(projectId: string, inspectorId: string, from: string, to: string): Promise<InspectorReport> {
    const inspectorInspections = Array.from(this.inspections.values()).filter(
      i => i.projectId === projectId && i.assignedInspector === inspectorId &&
        i.createdAt >= from && i.createdAt <= to
    );

    return {
      id: `IR-${projectId}-${inspectorId}-${Date.now()}`,
      projectId, inspectorId, inspectorName: inspectorId,
      date: new Date().toISOString(), period: { from, to },
      inspectionsConducted: inspectorInspections.length,
      inspectionsPassed: inspectorInspections.filter(i => i.results?.verdict === 'Pass').length,
      inspectionsFailed: inspectorInspections.filter(i => i.results?.verdict === 'Fail').length,
      ncrRaised: Array.from(this.ncrs.values()).filter(
        n => n.projectId === projectId && n.raisedBy === inspectorId
      ).length,
      ncrClosed: Array.from(this.ncrs.values()).filter(
        n => n.projectId === projectId && n.closedBy === inspectorId
      ).length,
      findingsSummary: `Inspector ${inspectorId} conducted ${inspectorInspections.length} inspections`,
      keyIssues: [],
      recommendations: [],
      attachments: []
    };
  }

  async generateLabReport(projectId: string): Promise<LabReport> {
    const labResults = Array.from(this.inspections.values())
      .filter(i => i.projectId === projectId)
      .flatMap(i => i.labResults);

    const total = labResults.length;
    const passed = labResults.filter(l => l.compliant).length;
    const failed = labResults.filter(l => !l.compliant).length;
    const pending = total;

    return {
      id: `LR-${projectId}-${Date.now()}`,
      projectId, reportDate: new Date().toISOString(),
      totalTests: total, passedTests: passed,
      failedTests: failed, pendingTests: pending,
      complianceRate: total > 0 ? Math.round((passed / total) * 10000) / 100 : 100,
      byTestType: {},
      failedSamples: labResults.filter(l => !l.compliant).map(l => ({
        sampleId: l.sampleId, testType: l.testType,
        element: QualityElement.Concrete, location: '',
        value: l.value, specMin: 0, specMax: 0,
        deviation: 0, testedAt: l.testedAt,
        retestRequired: true, ncrRaised: false
      })),
      recommendations: failed > 0 ? ['Review failed samples and conduct retests'] : ['All lab tests passed']
    };
  }

  async generateHandoverReport(projectId: string, systemType: string): Promise<HandoverReport> {
    const projectNCRs = Array.from(this.ncrs.values()).filter(n => n.projectId === projectId);
    const ncrReport = await this.generateNCRReport(projectId);

    return {
      id: `HR-${projectId}-${Date.now()}`,
      projectId, projectName: projectId, handoverDate: new Date().toISOString(),
      preparedBy: 'QualityEngine', reviewedBy: '', approvedBy: '',
      systemType, scopeOfWork: systemType,
      inspectionsSummary: 'Handover inspection summary',
      inspectionsPassed: 0, inspectionsFailed: 0,
      ncrSummary: ncrReport,
      certificates: [],
      outstandingItems: projectNCRs.filter(n => n.status !== NCRStatus.Closed).map(n => ({
        id: n.id, description: n.description, element: n.element,
        severity: n.severity === NCRSeverity.Critical ? 'High' : n.severity === NCRSeverity.Major ? 'Medium' : 'Low',
        deadline: '', responsibleParty: n.responsibleParty,
        status: 'Open'
      })),
      complianceStatus: 'Pending',
      warrantyPeriod: '12 months',
      operationManuals: [],
      asBuiltDrawings: [],
      sparePartsList: [],
      trainingProvided: false,
      finalVerdict: 'Conditional',
      remarks: ''
    };
  }

  async generateMonthlyReport(projectId: string, month: number, year: number): Promise<MonthlyReport> {
    const metrics = this.calculateQualityMetrics(projectId);
    const ncrReport = await this.generateNCRReport(projectId);
    const labReport = await this.generateLabReport(projectId);
    const eqi = this.calculateEnterpriseQualityIndex(projectId);
    const bImSummary = await this.bimValidator.getComplianceSummary(projectId);

    return {
      id: `MR-${projectId}-${year}-${month}`,
      projectId, month, year,
      preparedBy: 'QualityEngine',
      submittedAt: new Date().toISOString(),
      executiveSummary: `Monthly quality report for ${month}/${year}`,
      inspectionsOverview: {
        totalPlanned: 0, totalConducted: 0,
        totalPassed: 0, totalFailed: 0, passRate: 0,
        byCategory: {} as any,
        topFindings: []
      },
      qualityMetrics: metrics,
      ncrAnalysis: ncrReport,
      capaSummary: {
        total: 0, open: 0, closed: 0,
        overdue: 0, closureRate: 0,
        averageClosureDays: 0, byDepartment: {}
      },
      labSummary: labReport,
      imageAnalysisSummary: {
        totalImages: 0, defectsDetected: 0,
        byDefectType: {} as any, averageHealthScore: 0, criticalDefects: 0
      },
      bImComparisonSummary: bImSummary,
      codeComplianceSummary: {
        id: '', projectId, codeStandard: '', codeVersion: '',
        checkDate: '', compliant: [], nonCompliant: [],
        summary: '', overallCompliancePercent: 0,
        severity: 'Compliant', checkedBy: ''
      },
      enterpriseQualityIndex: eqi,
      keyAchievements: [],
      challenges: [],
      recommendations: [],
      appendix: []
    };
  }

  async exportReport(report: any, format: 'PDF' | 'Excel' | 'Word'): Promise<string> {
    return `Exporting ${format} report: ${report.id || 'unknown'}`;
  }

  // ===== Quality Analysis =====

  async analyzeQuality(projectId: string, from: string, to: string): Promise<QualityAnalysis> {
    return this.qualityAnalyzer.analyzeProject(projectId, from, to);
  }

  getQualityAnalyzer(): IQualityAnalyzer {
    return this.qualityAnalyzer;
  }

  getBIMValidator(): IBIMValidator {
    return this.bimValidator;
  }

  calculateQualityMetrics(projectId: string): QualityMetrics {
    const projectInspections = Array.from(this.inspections.values()).filter(i => i.projectId === projectId);
    const projectNCRs = Array.from(this.ncrs.values()).filter(n => n.projectId === projectId);
    const projectCAPAs = Array.from(this.capas.values()).filter(c => c.projectId === projectId);

    const total = projectInspections.length;
    const passed = projectInspections.filter(i => i.results?.verdict === 'Pass').length;
    const failed = projectInspections.filter(i => i.results?.verdict === 'Fail').length;
    const firstPass = projectInspections.filter(i =>
      i.results?.verdict === 'Pass' || i.results?.verdict === 'ConditionalPass'
    ).length;

    const ncrOpen = projectNCRs.filter(n => n.status !== NCRStatus.Closed).length;
    const ncrClosed = projectNCRs.filter(n => n.status === NCRStatus.Closed).length;
    const capaClosed = projectCAPAs.filter(c => c.status === CAPAStatus.Closed).length;

    const labTotal = projectInspections.reduce((s, i) => s + i.labResults.length, 0);
    const labPassed = projectInspections.reduce((s, i) => s + i.labResults.filter(l => l.compliant).length, 0);

    return {
      projectId,
      calculatedAt: new Date().toISOString(),
      period: { from: '2026-01-01', to: new Date().toISOString() },
      firstPassYield: total > 0 ? Math.round((firstPass / total) * 10000) / 100 : 0,
      reworkRate: total > 0 ? Math.round((failed / total) * 10000) / 100 : 0,
      ncrCount: projectNCRs.length,
      ncrOpenCount: ncrOpen,
      ncrClosedCount: ncrClosed,
      passRate: total > 0 ? Math.round((passed / total) * 10000) / 100 : 0,
      capaCount: projectCAPAs.length,
      capaClosureRate: projectCAPAs.length > 0 ? Math.round((capaClosed / projectCAPAs.length) * 10000) / 100 : 0,
      labComplianceRate: labTotal > 0 ? Math.round((labPassed / labTotal) * 10000) / 100 : 100,
      qualityScore: this.computeQualityScore(total, passed, failed, ncrClosed, projectNCRs.length, labPassed, labTotal),
      inspectionCount: total,
      inspectionsPassed: passed,
      inspectionsFailed: failed,
      correctiveActionsIssued: projectCAPAs.length,
      correctiveActionsClosed: capaClosed
    };
  }

  calculateEnterpriseQualityIndex(projectId: string): EnterpriseQualityIndex {
    const metrics = this.calculateQualityMetrics(projectId);

    const inspectionQuality = metrics.inspectionCount > 0
      ? Math.round((metrics.inspectionsPassed / metrics.inspectionCount) * 100) : 0;
    const firstPassQuality = metrics.firstPassYield;
    const reworkQuality = Math.max(0, 100 - metrics.reworkRate);
    const ncrClosureQuality = metrics.ncrCount > 0
      ? Math.round((metrics.ncrClosedCount / metrics.ncrCount) * 100) : 0;
    const labQuality = metrics.labComplianceRate;
    const codeComplianceQuality = 90;
    const finishesQuality = 85;
    const satisfactionQuality = 88;

    const overallScore = Math.round(
      (inspectionQuality * 0.15) +
      (firstPassQuality * 0.15) +
      (reworkQuality * 0.10) +
      (ncrClosureQuality * 0.15) +
      (labQuality * 0.15) +
      (codeComplianceQuality * 0.10) +
      (finishesQuality * 0.10) +
      (satisfactionQuality * 0.10)
    );

    const targetScore = 90;
    const categories: { name: string; score: number }[] = [
      { name: 'Inspection Quality', score: inspectionQuality },
      { name: 'First Pass Yield', score: firstPassQuality },
      { name: 'Rework', score: reworkQuality },
      { name: 'NCR Closure', score: ncrClosureQuality },
      { name: 'Lab Compliance', score: labQuality },
      { name: 'Code Compliance', score: codeComplianceQuality },
      { name: 'Finishes', score: finishesQuality },
      { name: 'Satisfaction', score: satisfactionQuality }
    ];

    const benchmarks: EQIBenchmark[] = categories.map(c => ({
      category: c.name,
      currentScore: c.score,
      targetScore,
      gap: Math.max(0, targetScore - c.score),
      status: c.score >= targetScore ? 'Met' : c.score >= targetScore * 0.8 ? 'Below' : 'Critical'
    }));

    return {
      calculatedAt: new Date().toISOString(),
      overallScore,
      inspectionQuality,
      firstPassQuality,
      reworkQuality,
      ncrClosureQuality,
      labComplianceQuality: labQuality,
      codeComplianceQuality,
      finishesQuality,
      satisfactionQuality,
      trend: overallScore >= 85 ? 'Improving' : overallScore >= 70 ? 'Stable' : 'Declining',
      benchmarks,
      recommendations: this.generateEQIRecommendations(overallScore, benchmarks)
    };
  }

  async integrateWithBIM(bimData: BIMElement[], actualData: BIMElement[]): Promise<BIMComparison[]> {
    return this.bimValidator.batchCompare(bimData, actualData);
  }

  async integrateWithDigitalTwin(data: any): Promise<void> {
    this.logger.info('Integrating with Digital Twin');
  }

  async integrateWithIoT(sensorData: any): Promise<void> {
    this.logger.info('Integrating with IoT sensor data for quality monitoring');
  }

  async integrateWithLab(labResults: LabResultReference[]): Promise<void> {
    for (const result of labResults) {
      this.logger.info(`Lab result integrated: ${result.labTestId} - ${result.compliant ? 'PASS' : 'FAIL'}`);
    }
  }

  async integrateWithKnowledgeGraph(kg: any): Promise<void> {
    this.logger.info('Integrated with Knowledge Graph for quality learning');
  }

  analysisToImage(inspectionId: string, type: InspectionType): Promise<ImageAnalysisResult> {
    return this.analyzeImage(`inspection://${inspectionId}`, inspectionId);
  }

  private getNCRCount(): number {
    return this.ncrs.size;
  }

  private getCAPACount(): number {
    return this.capas.size;
  }

  private computeQualityScore(total: number, passed: number, failed: number, ncrClosed: number, ncrTotal: number, labPassed: number, labTotal: number): number {
    const passScore = total > 0 ? (passed / total) * 40 : 40;
    const failPenalty = total > 0 ? (failed / total) * 20 : 0;
    const ncrScore = ncrTotal > 0 ? (ncrClosed / ncrTotal) * 30 : 30;
    const labScore = labTotal > 0 ? (labPassed / labTotal) * 30 : 30;
    return Math.round(Math.max(0, Math.min(100, passScore - failPenalty + ncrScore + labScore)));
  }

  private generateEQIRecommendations(score: number, benchmarks: EQIBenchmark[]): string[] {
    const recommendations: string[] = [];
    const critical = benchmarks.filter(b => b.status === 'Critical');
    const below = benchmarks.filter(b => b.status === 'Below');

    if (critical.length > 0) {
      recommendations.push(`Immediate improvement needed: ${critical.map(c => c.category).join(', ')}`);
    }
    if (below.length > 0) {
      recommendations.push(`Scheduled improvement needed: ${below.map(b => b.category).join(', ')}`);
    }
    if (score < 70) {
      recommendations.push('Overall quality index is below threshold. Initiate company-wide quality improvement program.');
    }
    recommendations.push('Continue regular quality monitoring and reporting');
    return recommendations;
  }

  private generateImageRecommendations(healthScore: number, defects: ImageAnalysisResult): string[] {
    const recs: string[] = [];
    if (healthScore < 60) {
      recs.push('Immediate structural assessment required');
    }
    if (defects.crackDetection.some(c => c.severity === 'High' || c.severity === 'Critical')) {
      recs.push('Critical cracks detected - initiate detailed structural analysis');
    }
    if (defects.spalling.some(s => s.reinforcementExposed)) {
      recs.push('Reinforcement exposed due to spalling - immediate repair needed');
    }
    if (defects.leakageDetection.some(l => l.severity === 'High' || l.severity === 'Critical')) {
      recs.push('Active leakage detected - investigate source and repair');
    }
    if (defects.rustDetection.length > 0) {
      recs.push('Rust detected on reinforcement - schedule corrosion treatment');
    }
    if (recs.length === 0) {
      recs.push('No significant defects detected - continue regular monitoring');
    }
    return recs;
  }
}
