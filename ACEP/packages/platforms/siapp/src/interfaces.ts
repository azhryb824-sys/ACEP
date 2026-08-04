import { EventEmitter } from "events";
import {
  ComputerVisionDetection,
  DetectionType,
  EmergencyPlan,
  HazardSource,
  IncidentRecord,
  Investigation,
  InvestigationType,
  Location,
  Permit,
  PermitType,
  RiskAssessment,
  RiskType,
  SafetyAlert,
  SafetyMetrics,
  SafetyObservation,
  SafetyReport,
  TrainingRecord,
  WorkerBehaviorRecord,
  EnterpriseSafetyIndex,
  SafetyKnowledgeEntry,
  SeverityLevel,
} from "./types";

export interface IEngine {
  name: string;
  version: string;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export interface ISafetyEngine extends IEngine {
  assessRisk(projectId: string, zoneId: string): Promise<RiskAssessment[]>;
  getRiskMatrix(projectId: string): Promise<RiskMatrixEntry[]>;
  predictIncidents(projectId: string): Promise<PredictedIncident[]>;
  getSafetyMetrics(projectId: string): Promise<SafetyMetrics>;
  getEnterpriseSafetyIndex(projectId: string): Promise<EnterpriseSafetyIndex>;
  generateReport(projectId: string, start: Date, end: Date): Promise<SafetyReport>;
  getSafetyKnowledgeBase(): Promise<SafetyKnowledgeEntry[]>;
}

export interface IRiskAnalyzer {
  analyzeRisk(
    riskType: RiskType,
    probability: number,
    severity: number,
    affectedPeople: number,
    responseTime: number,
    currentControl: number
  ): number;
  calculateResidualRisk(
    initialRisk: number,
    mitigations: number
  ): number;
  getRiskMatrix(projectId: string): Promise<RiskMatrixEntry[]>;
  getHeatMap(projectId: string): Promise<RiskHeatMap>;
}

export interface IComputerVisionEngine {
  analyzeFrame(imageData: Buffer): Promise<ComputerVisionDetection[]>;
  analyzeVideo(videoUrl: string): Promise<ComputerVisionDetection[]>;
  getLiveFeed(cameraId: string): AsyncIterable<ComputerVisionDetection>;
  getViolationTrends(
    projectId: string,
    start: Date,
    end: Date
  ): Promise<ViolationTrendEntry[]>;
  setDetectionThreshold(type: DetectionType, confidence: number): void;
}

export interface IPermitManager {
  createPermit(permit: Omit<Permit, "id">): Promise<Permit>;
  approvePermit(permitId: string, approver: string): Promise<Permit>;
  closePermit(permitId: string, closer: string): Promise<Permit>;
  verifyRequirements(permitId: string): Promise<PermitRequirementStatus>;
  getActivePermits(projectId: string): Promise<Permit[]>;
  getPermitHistory(projectId: string): Promise<Permit[]>;
  checkPermitCompliance(projectId: string): Promise<number>;
}

export interface IIncidentManager {
  reportIncident(incident: Omit<IncidentRecord, "id">): Promise<IncidentRecord>;
  updateIncident(id: string, update: Partial<IncidentRecord>): Promise<IncidentRecord>;
  getIncident(id: string): Promise<IncidentRecord>;
  getIncidentsByProject(projectId: string): Promise<IncidentRecord[]>;
  getNearMisses(projectId: string): Promise<IncidentRecord[]>;
  getIncidentTrends(
    projectId: string,
    start: Date,
    end: Date
  ): Promise<IncidentTrendEntry[]>;
  getIncidentStatistics(projectId: string): Promise<IncidentStatistics>;
}

export interface IInvestigationSupport {
  createInvestigation(
    incidentId: string,
    type: InvestigationType,
    lead: string
  ): Promise<Investigation>;
  addFinding(
    investigationId: string,
    finding: string
  ): Promise<Investigation>;
  completeInvestigation(
    investigationId: string
  ): Promise<Investigation>;
  performRCA(investigationId: string): Promise<string[]>;
  performFiveWhys(investigationId: string): Promise<FiveWhysResult>;
  performFishbone(investigationId: string): Promise<FishboneDiagram>;
  performBarrierAnalysis(investigationId: string): Promise<BarrierAnalysisResult>;
  generateInvestigationReport(investigationId: string): Promise<string>;
}

export interface IEmergencyManager {
  activateEmergencyPlan(planId: string): Promise<EmergencyActivation>;
  getEmergencyPlans(projectId: string): Promise<EmergencyPlan[]>;
  triggerEvacuation(zoneId: string): Promise<EvacuationStatus>;
  getNearestResponseTeam(location: Location): Promise<EmergencyResponseTeam>;
  getEvacuationRoute(zoneId: string, destination: string): Promise<EvacuationRoute>;
  conductDrill(planId: string): Promise<DrillResult>;
  getEmergencyContacts(projectId: string): Promise<EmergencyContact[]>;
}

export interface RiskMatrixEntry {
  riskType: RiskType;
  probability: number;
  severity: number;
  riskScore: number;
  count: number;
  trend: "increasing" | "decreasing" | "stable";
}

export interface RiskHeatMap {
  zones: ZoneRiskEntry[];
  maxScore: number;
  generatedAt: Date;
}

export interface ZoneRiskEntry {
  zoneId: string;
  zoneName: string;
  riskScore: number;
  topRisks: RiskType[];
}

export interface PredictedIncident {
  id: string;
  riskType: RiskType;
  probability: number;
  potentialSeverity: SeverityLevel;
  location: Location;
  predictedTimeframe: string;
  contributingFactors: string[];
  recommendedActions: string[];
  confidence: number;
}

export interface ViolationTrendEntry {
  date: Date;
  detectionType: DetectionType;
  count: number;
  source: HazardSource;
}

export interface PermitRequirementStatus {
  permitId: string;
  totalRequirements: number;
  checkedRequirements: number;
  compliancePercentage: number;
  missingRequirements: string[];
  isCompliant: boolean;
}

export interface IncidentTrendEntry {
  month: string;
  total: number;
  fatalities: number;
  seriousInjuries: number;
  minorInjuries: number;
  nearMisses: number;
  ltifr: number;
  trir: number;
}

export interface IncidentStatistics {
  total: number;
  open: number;
  underInvestigation: number;
  closed: number;
  fatalities: number;
  seriousInjuries: number;
  totalDaysLost: number;
  totalCost: number;
  averageResponseTime: number;
}

export interface FiveWhysResult {
  problem: string;
  whys: WhyStep[];
  rootCause: string;
  recommendations: string[];
}

export interface WhyStep {
  level: number;
  question: string;
  answer: string;
}

export interface FishboneDiagram {
  problem: string;
  categories: FishboneCategory[];
  rootCauses: string[];
}

export interface FishboneCategory {
  name: string;
  causes: string[];
  subCauses: string[][];
}

export interface BarrierAnalysisResult {
  incident: string;
  barriers: Barrier[];
  failedBarriers: Barrier[];
  recommendations: string[];
}

export interface Barrier {
  name: string;
  type: "physical" | "administrative" | "cultural" | "engineering";
  status: "functioning" | "degraded" | "failed" | "missing";
  description: string;
}

export interface EmergencyActivation {
  planId: string;
  activatedAt: Date;
  activatedBy: string;
  status: ActivationStatus;
  notificationsSent: number;
  evacuatedCount?: number;
}

export enum ActivationStatus {
  Initiated = "Initiated",
  InProgress = "InProgress",
  Completed = "Completed",
  Cancelled = "Cancelled",
}

export interface EvacuationStatus {
  zoneId: string;
  isEvacuated: boolean;
  evacuatedCount: number;
  remainingCount: number;
  assemblyPointsReached: string[];
  duration: number;
  status: "in-progress" | "completed" | "failed";
}

export interface EmergencyResponseTeam {
  teamId: string;
  name: string;
  eta: number;
  members: string[];
  contactNumber: string;
  specialization: string;
}

export interface EvacuationRoute {
  from: Location;
  to: Location;
  waypoints: Location[];
  distance: number;
  estimatedTime: number;
  hazards: string[];
  alternatives: Location[][];
}

export interface DrillResult {
  planId: string;
  drillDate: Date;
  duration: number;
  participationCount: number;
  evacuationTime: number;
  issuesFound: string[];
  score: number;
  passed: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  organization: string;
  isPrimary: boolean;
}

export interface SafetyKnowledgeBaseEntry {
  id: string;
  title: string;
  riskType: RiskType;
  description: string;
  lessonsLearned: string[];
  recommendations: string[];
  incidentCount: number;
  lastUpdated: Date;
  tags: string[];
}
