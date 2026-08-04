import { EventEmitter } from "events";
import {
  ComputerVisionDetection,
  DetectionType,
  EmergencyPlan,
  EmergencyType,
  EnterpriseSafetyIndex,
  HazardSource,
  IncidentRecord,
  IncidentStatus,
  Investigation,
  InvestigationStatus,
  InvestigationType,
  Location,
  MitigationStatus,
  Permit,
  PermitType,
  ProbabilityLevel,
  RiskAssessment,
  RiskType,
  SafetyAlert,
  SafetyEquipmentType,
  SafetyMetrics,
  SafetyObservation,
  SafetyKnowledgeEntry,
  SeverityLevel,
  TrainingRecord,
  WorkerBehaviorRecord,
} from "./types";
import {
  ISafetyEngine,
  IRiskAnalyzer,
  IPermitManager,
  IIncidentManager,
  IInvestigationSupport,
  IEmergencyManager,
  RiskMatrixEntry,
  RiskHeatMap,
  PredictedIncident,
  PermitRequirementStatus,
  IncidentTrendEntry,
  IncidentStatistics,
  FiveWhysResult,
  FishboneDiagram,
  BarrierAnalysisResult,
  EmergencyActivation,
  EvacuationStatus,
  EvacuationRoute,
  EmergencyResponseTeam,
  DrillResult,
  EmergencyContact,
} from "./interfaces";

export class SafetyEngine extends EventEmitter implements ISafetyEngine {
  name = "SIAPP Safety Engine";
  version = "45.0.0";

  private riskAnalyzer: RiskAnalyzer;
  private permitManager: PermitManager;
  private incidentManager: IncidentManager;
  private investigationSupport: InvestigationSupport;
  private emergencyManager: EmergencyManager;
  private knowledgeBase: Map<string, SafetyKnowledgeEntry> = new Map();
  private workerBehaviors: Map<string, WorkerBehaviorRecord> = new Map();
  private trainingRecords: Map<string, TrainingRecord[]> = new Map();
  private safetyObservations: SafetyObservation[] = [];
  private safetyAlerts: SafetyAlert[] = [];
  private riskAssessments: RiskAssessment[] = [];
  private incidentRecords: IncidentRecord[] = [];
  private permits: Permit[] = [];
  private emergencyPlans: EmergencyPlan[] = [];
  private cameraStreams: Map<string, ComputerVisionDetection[]> = new Map();

  constructor() {
    super();
    this.riskAnalyzer = new RiskAnalyzer();
    this.permitManager = new PermitManager();
    this.incidentManager = new IncidentManager();
    this.investigationSupport = new InvestigationSupport();
    this.emergencyManager = new EmergencyManager();
  }

  async initialize(): Promise<void> {
    this.emit("initialized", { name: this.name, version: this.version });
  }

  async shutdown(): Promise<void> {
    this.emit("shutdown", { name: this.name });
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async assessRisk(projectId: string, zoneId: string): Promise<RiskAssessment[]> {
    const assessments: RiskAssessment[] = [];
    const projectAssessments = this.riskAssessments.filter(
      (r) => r.projectId === projectId && r.zoneId === zoneId
    );
    for (const assessment of projectAssessments) {
      const riskScore = this.riskAnalyzer.analyzeRisk(
        assessment.riskType,
        assessment.probability,
        assessment.severity,
        assessment.affectedPeople,
        assessment.responseTime,
        1
      );
      assessment.riskScore = riskScore;
      assessment.residualRisk = this.riskAnalyzer.calculateResidualRisk(
        riskScore,
        assessment.mitigations.filter((m) => m.status === MitigationStatus.Completed).length
      );
      assessments.push(assessment);
    }
    return assessments;
  }

  async getRiskMatrix(projectId: string): Promise<RiskMatrixEntry[]> {
    return this.riskAnalyzer.getRiskMatrix(projectId);
  }

  async predictIncidents(projectId: string): Promise<PredictedIncident[]> {
    const predictions: PredictedIncident[] = [];
    const projectAssessments = this.riskAssessments.filter(
      (r) => r.projectId === projectId
    );
    const highRiskAssessments = projectAssessments.filter(
      (r) => r.riskScore >= 12
    );
    for (const assessment of highRiskAssessments) {
      const nearMisses = this.incidentRecords.filter(
        (inc) =>
          inc.projectId === projectId &&
          inc.outcomes.some((o) => o.type === "NearMiss") &&
          inc.causes.some((c) => c.category === "Root")
      ).length;
      const probability = Math.min(
        1,
        (assessment.probability / 5) * (1 + nearMisses * 0.1)
      );
      predictions.push({
        id: `pred-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        riskType: assessment.riskType,
        probability,
        potentialSeverity: assessment.severity,
        location: { zoneId: assessment.zoneId, latitude: 0, longitude: 0 },
        predictedTimeframe: "next-7-days",
        contributingFactors: [
          `Current risk score: ${assessment.riskScore}`,
          `Control: ${assessment.currentControl}`,
        ],
        recommendedActions: assessment.mitigations.map((m) => m.description),
        confidence: Math.min(0.95, 0.5 + nearMisses * 0.1),
      });
    }
    return predictions;
  }

  async getSafetyMetrics(projectId: string): Promise<SafetyMetrics> {
    const projectIncidents = this.incidentRecords.filter(
      (i) => i.projectId === projectId
    );
    const totalHours = 500000;
    const totalIncidents = projectIncidents.length;
    const lostDays = projectIncidents.reduce(
      (sum, i) =>
        sum +
        i.outcomes
          .filter((o) => o.daysLost)
          .reduce((s, o) => s + (o.daysLost || 0), 0),
      0
    );
    const nearMissCount = projectIncidents.filter((i) =>
      i.outcomes.some((o) => o.type === "NearMiss")
    ).length;
    const fatalities = projectIncidents.filter((i) =>
      i.outcomes.some((o) => o.type === "Fatality")
    ).length;
    return {
      projectId,
      date: new Date(),
      TRIR: (totalIncidents * 200000) / totalHours,
      LTIFR: (lostDays > 0 ? (lostDays * 200000) / totalHours : 0),
      NearMissCount: nearMissCount,
      ObservationCount: this.safetyObservations.length,
      PermitCompliance: await this.permitManager.checkPermitCompliance(projectId),
      ResponseTime: 5,
      PPECompliance: this.calculatePPECompliance(),
      SafetyScore: this.calculateSafetyScore(projectId),
    };
  }

  async getEnterpriseSafetyIndex(projectId: string): Promise<EnterpriseSafetyIndex> {
    const metrics = await this.getSafetyMetrics(projectId);
    const inspections = this.safetyObservations.filter(
      (o) => o.projectId === projectId
    ).length;
    const index: EnterpriseSafetyIndex = {
      score: 0,
      incidentRate: Math.max(0, 100 - metrics.TRIR * 10),
      inspections: Math.min(100, inspections * 2),
      ppeCompliance: metrics.PPECompliance * 100,
      responseTime: Math.max(0, 100 - metrics.ResponseTime * 5),
      observations: Math.min(100, inspections),
      training: this.calculateTrainingScore(projectId),
      nearMiss: Math.max(0, 100 - metrics.NearMissCount * 2),
      compliance: metrics.PermitCompliance * 100,
    };
    index.score = Math.round(
      (index.incidentRate * 0.25 +
        index.inspections * 0.1 +
        index.ppeCompliance * 0.15 +
        index.responseTime * 0.1 +
        index.observations * 0.05 +
        index.training * 0.1 +
        index.nearMiss * 0.1 +
        index.compliance * 0.15) /
        100
    );
    return index;
  }

  async generateReport(
    projectId: string,
    start: Date,
    end: Date
  ): Promise<any> {
    const metrics = await this.getSafetyMetrics(projectId);
    const index = await this.getEnterpriseSafetyIndex(projectId);
    const incidents = this.incidentRecords.filter(
      (i) => i.projectId === projectId && i.date >= start && i.date <= end
    );
    const observations = this.safetyObservations.filter(
      (o) => o.projectId === projectId && o.date >= start && o.date <= end
    );
    const alerts = this.safetyAlerts.filter(
      (a) => a.projectId === projectId && a.detectedAt >= start && a.detectedAt <= end
    );
    const assessments = this.riskAssessments.filter(
      (r) => r.projectId === projectId
    );
    return {
      id: `report-${Date.now()}`,
      projectId,
      period: { start, end },
      metrics,
      index,
      topRisks: assessments.sort((a, b) => b.riskScore - a.riskScore).slice(0, 10),
      incidents,
      observations,
      alerts,
      recommendations: await this.generateRecommendations(projectId),
      generatedBy: this.name,
      generatedAt: new Date(),
    };
  }

  async getSafetyKnowledgeBase(): Promise<SafetyKnowledgeEntry[]> {
    return Array.from(this.knowledgeBase.values());
  }

  addKnowledgeEntry(entry: SafetyKnowledgeEntry): void {
    this.knowledgeBase.set(entry.id, entry);
  }

  addDetection(projectId: string, detection: ComputerVisionDetection): void {
    const alert: SafetyAlert = {
      id: `alert-${Date.now()}`,
      projectId,
      title: `Detection: ${detection.type}`,
      description: `${detection.type} detected with ${(detection.confidence * 100).toFixed(0)}% confidence`,
      severity:
        detection.confidence > 0.8
          ? SeverityLevel.High
          : detection.confidence > 0.5
            ? SeverityLevel.Medium
            : SeverityLevel.Low,
      source: detection.source,
      location: { zoneId: "unknown", latitude: 0, longitude: 0 },
      detectedAt: new Date(),
      recommendations: [`Review ${detection.type} footage`, "Assign safety officer"],
    };
    this.safetyAlerts.push(alert);
    this.emit("detection", alert);
  }

  private calculatePPECompliance(): number {
    const ppeDetections = this.safetyAlerts.filter(
      (a) =>
        a.title.includes("NoHelmet") ||
        a.title.includes("NoVest") ||
        a.title.includes("NoHarness")
    );
    const total = ppeDetections.length;
    if (total === 0) return 1;
    const violations = ppeDetections.filter(
      (a) =>
        (a.title.includes("NoHelmet") && a.severity >= SeverityLevel.High) ||
        (a.title.includes("NoVest") && a.severity >= SeverityLevel.High) ||
        (a.title.includes("NoHarness") && a.severity >= SeverityLevel.High)
    ).length;
    return 1 - violations / total;
  }

  private calculateSafetyScore(projectId: string): number {
    const incidents = this.incidentRecords.filter(
      (i) => i.projectId === projectId
    );
    const base = 100;
    const deductions =
      incidents.length * 5 +
      incidents.filter((i) =>
        i.outcomes.some((o) => o.type === "Fatality")
      ).length *
        20;
    return Math.max(0, base - deductions);
  }

  private calculateTrainingScore(projectId: string): number {
    const workers = this.trainingRecords.size;
    if (workers === 0) return 0;
    let completed = 0;
    for (const records of this.trainingRecords.values()) {
      if (records.some((r) => r.isPassed)) completed++;
    }
    return (completed / workers) * 100;
  }

  private async generateRecommendations(projectId: string): Promise<string[]> {
    const recs: string[] = [];
    const metrics = await this.getSafetyMetrics(projectId);
    if (metrics.TRIR > 5) recs.push("High TRIR - review safety protocols and increase training");
    if (metrics.PPECompliance < 0.8) recs.push("Low PPE compliance - enforce mandatory PPE policy");
    if (metrics.NearMissCount > 10) recs.push("High near-miss count - investigate patterns");
    return recs;
  }

  getRiskAnalyzer(): IRiskAnalyzer {
    return this.riskAnalyzer;
  }

  getPermitManager(): IPermitManager {
    return this.permitManager;
  }

  getIncidentManager(): IIncidentManager {
    return this.incidentManager;
  }

  getInvestigationSupport(): IInvestigationSupport {
    return this.investigationSupport;
  }

  getEmergencyManager(): IEmergencyManager {
    return this.emergencyManager;
  }
}

class RiskAnalyzer implements IRiskAnalyzer {
  private riskMatrices: Map<string, RiskMatrixEntry[]> = new Map();

  analyzeRisk(
    riskType: RiskType,
    probability: number,
    severity: number,
    affectedPeople: number,
    responseTime: number,
    currentControl: number
  ): number {
    const p = probability / 5;
    const s = severity / 5;
    const a = affectedPeople / 100;
    const r = responseTime / 60;
    const c = currentControl;
    return Math.round(p * s * (1 + a) * (1 + r) * (1 - c) * 100) / 100;
  }

  calculateResidualRisk(initialRisk: number, mitigations: number): number {
    const reduction = Math.min(0.9, mitigations * 0.15);
    return Math.round(initialRisk * (1 - reduction) * 100) / 100;
  }

  async getRiskMatrix(projectId: string): Promise<RiskMatrixEntry[]> {
    return this.riskMatrices.get(projectId) || [];
  }

  async getHeatMap(projectId: string): Promise<RiskHeatMap> {
    return {
      zones: [],
      maxScore: 0,
      generatedAt: new Date(),
    };
  }
}

class PermitManager implements IPermitManager {
  private permits: Permit[] = [];

  async createPermit(permit: Omit<Permit, "id">): Promise<Permit> {
    const newPermit: Permit = {
      ...permit,
      id: `permit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    this.permits.push(newPermit);
    return newPermit;
  }

  async approvePermit(permitId: string, approver: string): Promise<Permit> {
    const permit = this.permits.find((p) => p.id === permitId);
    if (!permit) throw new Error(`Permit ${permitId} not found`);
    permit.isApproved = true;
    permit.approvedBy = approver;
    permit.approvedAt = new Date();
    return permit;
  }

  async closePermit(permitId: string, closer: string): Promise<Permit> {
    const permit = this.permits.find((p) => p.id === permitId);
    if (!permit) throw new Error(`Permit ${permitId} not found`);
    permit.isClosed = true;
    permit.closedBy = closer;
    permit.closedAt = new Date();
    return permit;
  }

  async verifyRequirements(permitId: string): Promise<PermitRequirementStatus> {
    const permit = this.permits.find((p) => p.id === permitId);
    if (!permit) throw new Error(`Permit ${permitId} not found`);
    const total = permit.requirements.length;
    const checked = permit.requirements.filter((r) => r.isChecked).length;
    return {
      permitId,
      totalRequirements: total,
      checkedRequirements: checked,
      compliancePercentage: total > 0 ? (checked / total) * 100 : 0,
      missingRequirements: permit.requirements
        .filter((r) => !r.isChecked)
        .map((r) => r.description),
      isCompliant: checked === total,
    };
  }

  async getActivePermits(projectId: string): Promise<Permit[]> {
    return this.permits.filter(
      (p) => p.projectId === projectId && p.isApproved && !p.isClosed
    );
  }

  async getPermitHistory(projectId: string): Promise<Permit[]> {
    return this.permits.filter((p) => p.projectId === projectId);
  }

  async checkPermitCompliance(projectId: string): Promise<number> {
    const projectPermits = this.permits.filter((p) => p.projectId === projectId);
    if (projectPermits.length === 0) return 1;
    const compliant = projectPermits.filter((p) => {
      const checked = p.requirements.filter((r) => r.isChecked).length;
      return checked === p.requirements.length;
    }).length;
    return compliant / projectPermits.length;
  }
}

class IncidentManager implements IIncidentManager {
  private incidents: IncidentRecord[] = [];

  async reportIncident(
    incident: Omit<IncidentRecord, "id">
  ): Promise<IncidentRecord> {
    const newIncident: IncidentRecord = {
      ...incident,
      id: `incident-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    this.incidents.push(newIncident);
    return newIncident;
  }

  async updateIncident(
    id: string,
    update: Partial<IncidentRecord>
  ): Promise<IncidentRecord> {
    const index = this.incidents.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`Incident ${id} not found`);
    this.incidents[index] = { ...this.incidents[index], ...update };
    return this.incidents[index];
  }

  async getIncident(id: string): Promise<IncidentRecord> {
    const incident = this.incidents.find((i) => i.id === id);
    if (!incident) throw new Error(`Incident ${id} not found`);
    return incident;
  }

  async getIncidentsByProject(projectId: string): Promise<IncidentRecord[]> {
    return this.incidents.filter((i) => i.projectId === projectId);
  }

  async getNearMisses(projectId: string): Promise<IncidentRecord[]> {
    return this.incidents.filter(
      (i) =>
        i.projectId === projectId &&
        i.outcomes.some((o) => o.type === "NearMiss")
    );
  }

  async getIncidentTrends(
    projectId: string,
    start: Date,
    end: Date
  ): Promise<IncidentTrendEntry[]> {
    return [];
  }

  async getIncidentStatistics(
    projectId: string
  ): Promise<IncidentStatistics> {
    const projectIncidents = this.incidents.filter(
      (i) => i.projectId === projectId
    );
    return {
      total: projectIncidents.length,
      open: projectIncidents.filter((i) => i.status === IncidentStatus.Open).length,
      underInvestigation: projectIncidents.filter(
        (i) => i.status === IncidentStatus.UnderInvestigation
      ).length,
      closed: projectIncidents.filter((i) => i.status === IncidentStatus.Closed).length,
      fatalities: projectIncidents.filter((i) =>
        i.outcomes.some((o) => o.type === "Fatality")
      ).length,
      seriousInjuries: projectIncidents.filter((i) =>
        i.outcomes.some((o) => o.type === "SeriousInjury")
      ).length,
      totalDaysLost: projectIncidents.reduce(
        (sum, i) =>
          sum +
          i.outcomes
            .filter((o) => o.daysLost)
            .reduce((s, o) => s + (o.daysLost || 0), 0),
        0
      ),
      totalCost: projectIncidents.reduce(
        (sum, i) =>
          sum +
          i.outcomes
            .filter((o) => o.cost)
            .reduce((s, o) => s + (o.cost || 0), 0),
        0
      ),
      averageResponseTime: 5,
    };
  }
}

class InvestigationSupport implements IInvestigationSupport {
  private investigations: Investigation[] = [];

  async createInvestigation(
    incidentId: string,
    type: InvestigationType,
    lead: string
  ): Promise<Investigation> {
    const investigation: Investigation = {
      id: `investigation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      incidentId,
      type,
      leadInvestigator: lead,
      team: [lead],
      startedAt: new Date(),
      steps: [],
      findings: [],
      rootCauses: [],
      recommendations: [],
      status: InvestigationStatus.Initiated,
    };
    this.investigations.push(investigation);
    return investigation;
  }

  async addFinding(
    investigationId: string,
    finding: string
  ): Promise<Investigation> {
    const inv = this.investigations.find((i) => i.id === investigationId);
    if (!inv) throw new Error(`Investigation ${investigationId} not found`);
    inv.findings.push(finding);
    return inv;
  }

  async completeInvestigation(
    investigationId: string
  ): Promise<Investigation> {
    const inv = this.investigations.find((i) => i.id === investigationId);
    if (!inv) throw new Error(`Investigation ${investigationId} not found`);
    inv.status = InvestigationStatus.Completed;
    inv.completedAt = new Date();
    return inv;
  }

  async performRCA(investigationId: string): Promise<string[]> {
    const inv = this.investigations.find((i) => i.id === investigationId);
    if (!inv) throw new Error(`Investigation ${investigationId} not found`);
    const rootCauses: string[] = [];
    for (const finding of inv.findings) {
      const whys = finding.split(" because ");
      if (whys.length > 1) {
        rootCauses.push(whys[whys.length - 1].trim());
      }
    }
    inv.rootCauses = rootCauses;
    return rootCauses;
  }

  async performFiveWhys(investigationId: string): Promise<FiveWhysResult> {
    const inv = this.investigations.find((i) => i.id === investigationId);
    if (!inv) throw new Error(`Investigation ${investigationId} not found`);
    return {
      problem: inv.findings[0] || "Unknown problem",
      whys: [
        { level: 1, question: "Why did this happen?", answer: inv.findings[0] || "Unknown" },
        { level: 2, question: "Why was that the case?", answer: inv.findings[1] || "Unknown" },
        { level: 3, question: "Why did that occur?", answer: inv.findings[2] || "Unknown" },
        { level: 4, question: "Why was that allowed?", answer: inv.findings[3] || "Unknown" },
        { level: 5, question: "Why did the system fail?", answer: inv.rootCauses[0] || "Unknown" },
      ],
      rootCause: inv.rootCauses[0] || "Not determined",
      recommendations: inv.recommendations,
    };
  }

  async performFishbone(investigationId: string): Promise<FishboneDiagram> {
    const inv = this.investigations.find((i) => i.id === investigationId);
    if (!inv) throw new Error(`Investigation ${investigationId} not found`);
    return {
      problem: inv.findings[0] || "Unknown problem",
      categories: [
        {
          name: "People",
          causes: inv.findings.slice(0, 2),
          subCauses: [],
        },
        {
          name: "Process",
          causes: inv.findings.slice(2, 4),
          subCauses: [],
        },
        {
          name: "Equipment",
          causes: inv.findings.slice(4, 6),
          subCauses: [],
        },
      ],
      rootCauses: inv.rootCauses,
    };
  }

  async performBarrierAnalysis(
    investigationId: string
  ): Promise<BarrierAnalysisResult> {
    const inv = this.investigations.find((i) => i.id === investigationId);
    if (!inv) throw new Error(`Investigation ${investigationId} not found`);
    return {
      incident: inv.findings[0] || "Unknown incident",
      barriers: [
        { name: "Training", type: "administrative", status: "functioning", description: "Worker training program" },
        { name: "PPE", type: "physical", status: "functioning", description: "Personal protective equipment" },
        { name: "Supervision", type: "cultural", status: "functioning", description: "Site supervision" },
      ],
      failedBarriers: [],
      recommendations: inv.recommendations,
    };
  }

  async generateInvestigationReport(
    investigationId: string
  ): Promise<string> {
    const inv = this.investigations.find((i) => i.id === investigationId);
    if (!inv) throw new Error(`Investigation ${investigationId} not found`);
    return [
      `Investigation Report: ${inv.type}`,
      `Incident ID: ${inv.incidentId}`,
      `Lead: ${inv.leadInvestigator}`,
      `Started: ${inv.startedAt.toISOString()}`,
      `Status: ${inv.status}`,
      "",
      "Findings:",
      ...inv.findings.map((f) => `  - ${f}`),
      "",
      "Root Causes:",
      ...inv.rootCauses.map((rc) => `  - ${rc}`),
      "",
      "Recommendations:",
      ...inv.recommendations.map((r) => `  - ${r}`),
    ].join("\n");
  }
}

class EmergencyManager implements IEmergencyManager {
  private plans: EmergencyPlan[] = [];
  private contacts: EmergencyContact[] = [];

  async activateEmergencyPlan(planId: string): Promise<EmergencyActivation> {
    const plan = this.plans.find((p) => p.id === planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    return {
      planId,
      activatedAt: new Date(),
      activatedBy: "system",
      status: "Initiated" as any,
      notificationsSent: plan.nearestResponseTeams.length,
    };
  }

  async getEmergencyPlans(projectId: string): Promise<EmergencyPlan[]> {
    return this.plans.filter((p) => p.projectId === projectId);
  }

  async triggerEvacuation(zoneId: string): Promise<EvacuationStatus> {
    return {
      zoneId,
      isEvacuated: true,
      evacuatedCount: 0,
      remainingCount: 0,
      assemblyPointsReached: [],
      duration: 0,
      status: "in-progress",
    };
  }

  async getNearestResponseTeam(
    location: Location
  ): Promise<EmergencyResponseTeam> {
    return {
      teamId: "team-1",
      name: "Primary Response Team",
      eta: 5,
      members: [],
      contactNumber: "911",
      specialization: "General",
    };
  }

  async getEvacuationRoute(
    zoneId: string,
    destination: string
  ): Promise<EvacuationRoute> {
    return {
      from: { latitude: 0, longitude: 0 },
      to: { latitude: 0, longitude: 0 },
      waypoints: [],
      distance: 0,
      estimatedTime: 0,
      hazards: [],
      alternatives: [],
    };
  }

  async conductDrill(planId: string): Promise<DrillResult> {
    return {
      planId,
      drillDate: new Date(),
      duration: 300,
      participationCount: 50,
      evacuationTime: 180,
      issuesFound: [],
      score: 85,
      passed: true,
    };
  }

  async getEmergencyContacts(projectId: string): Promise<EmergencyContact[]> {
    return this.contacts;
  }
}
