export enum RiskType {
  Fall = "Fall",
  Electrical = "Electrical",
  Mechanical = "Mechanical",
  Chemical = "Chemical",
  Environmental = "Environmental",
  Human = "Human",
}

export enum FallSubType {
  Heights = "heights",
  Scaffolding = "scaffolding",
  Openings = "openings",
  Edges = "edges",
}

export enum ElectricalSubType {
  HighVoltage = "highVoltage",
  Grounding = "grounding",
  Panels = "panels",
  Cables = "cables",
}

export enum MechanicalSubType {
  Equipment = "equipment",
  Cranes = "cranes",
  Excavators = "excavators",
  TempElevators = "tempElevators",
}

export enum ChemicalSubType {
  Gases = "gases",
  Flammables = "flammables",
  Toxics = "toxics",
}

export enum EnvironmentalSubType {
  Heat = "heat",
  Wind = "wind",
  Rain = "rain",
  Dust = "dust",
  Noise = "noise",
}

export enum HumanSubType {
  Fatigue = "fatigue",
  Overtime = "overtime",
  Untrained = "untrained",
  ProcedureViolation = "procedureViolation",
}

export type RiskSubType =
  | FallSubType
  | ElectricalSubType
  | MechanicalSubType
  | ChemicalSubType
  | EnvironmentalSubType
  | HumanSubType;

export enum HazardSource {
  Cameras = "Cameras",
  Drones = "Drones",
  Sensors = "Sensors",
  SmartHelmets = "SmartHelmets",
  Trackers = "Trackers",
  HSEReports = "HSEReports",
  Inspections = "Inspections",
  Weather = "Weather",
  AccessControl = "AccessControl",
  ContractorReports = "ContractorReports",
}

export enum DetectionType {
  NoHelmet = "noHelmet",
  NoVest = "noVest",
  NoHarness = "noHarness",
  RestrictedArea = "restrictedArea",
  ProximityToEquipment = "proximityToEquipment",
  ToolDrop = "toolDrop",
  WorkerCrowding = "workerCrowding",
  ExitBlocked = "exitBlocked",
}

export enum SeverityLevel {
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
  Catastrophic = 5,
}

export enum ProbabilityLevel {
  Rare = 1,
  Unlikely = 2,
  Possible = 3,
  Likely = 4,
  AlmostCertain = 5,
}

export interface ComputerVisionDetection {
  type: DetectionType;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  frameTimestamp: number;
  cameraId: string;
  source: HazardSource.Cameras | HazardSource.Drones;
}

export interface RiskAssessment {
  id: string;
  projectId: string;
  zoneId: string;
  riskType: RiskType;
  riskSubType: RiskSubType;
  hazardSource: HazardSource;
  probability: ProbabilityLevel;
  severity: SeverityLevel;
  affectedPeople: number;
  responseTime: number;
  currentControl: string;
  riskScore: number;
  assessedBy: string;
  assessedAt: Date;
  mitigations: MitigationAction[];
  residualRisk: number;
}

export interface MitigationAction {
  id: string;
  description: string;
  assignedTo: string;
  deadline: Date;
  status: MitigationStatus;
  completedAt?: Date;
  completedBy?: string;
}

export enum MitigationStatus {
  Pending = "Pending",
  InProgress = "InProgress",
  Completed = "Completed",
  Overdue = "Overdue",
  Cancelled = "Cancelled",
}

export enum PermitType {
  HotWork = "HotWork",
  ConfinedSpace = "ConfinedSpace",
  Heights = "Heights",
  Lifting = "Lifting",
  LOTO = "LOTO",
}

export interface PermitRequirement {
  id: string;
  description: string;
  isChecked: boolean;
  checkedBy?: string;
  checkedAt?: Date;
  notes?: string;
}

export interface Permit {
  id: string;
  permitType: PermitType;
  projectId: string;
  zoneId: string;
  issuedTo: string;
  issuedBy: string;
  issuedAt: Date;
  expiresAt: Date;
  location: string;
  description: string;
  requirements: PermitRequirement[];
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  isClosed: boolean;
  closedAt?: Date;
  closedBy?: string;
  emergencyContact: string;
  gasTestResult?: GasTestResult;
}

export interface GasTestResult {
  oxygen: number;
  lel: number;
  co: number;
  h2s: number;
  testedBy: string;
  testedAt: Date;
  isPass: boolean;
}

export interface Location {
  latitude: number;
  longitude: number;
  altitude?: number;
  zoneId?: string;
  floor?: number;
  area?: string;
}

export interface PersonInvolved {
  id: string;
  name: string;
  role: string;
  company: string;
  employeeId: string;
  experience: number;
  trainingRecords: string[];
}

export interface EquipmentInvolved {
  id: string;
  type: string;
  model: string;
  lastInspection: Date;
  operator?: string;
}

export interface PhotoEvidence {
  id: string;
  url: string;
  caption: string;
  takenAt: Date;
  takenBy: string;
}

export interface VideoEvidence {
  id: string;
  url: string;
  duration: number;
  caption: string;
  takenAt: Date;
  takenBy: string;
}

export interface WitnessStatement {
  id: string;
  witnessId: string;
  witnessName: string;
  statement: string;
  recordedAt: Date;
  recordedBy: string;
}

export interface IncidentCause {
  id: string;
  description: string;
  category: CauseCategory;
  isRoot: boolean;
  contributingFactors: string[];
}

export enum CauseCategory {
  Direct = "Direct",
  Indirect = "Indirect",
  Root = "Root",
  Contributing = "Contributing",
}

export interface IncidentOutcome {
  id: string;
  description: string;
  type: OutcomeType;
  cost?: number;
  daysLost?: number;
}

export enum OutcomeType {
  Fatality = "Fatality",
  SeriousInjury = "SeriousInjury",
  MinorInjury = "MinorInjury",
  FirstAid = "FirstAid",
  PropertyDamage = "PropertyDamage",
  EnvironmentalRelease = "EnvironmentalRelease",
  NearMiss = "NearMiss",
}

export interface IncidentRecord {
  id: string;
  projectId: string;
  location: Location;
  date: Date;
  time: string;
  people: PersonInvolved[];
  equipment: EquipmentInvolved[];
  photos: PhotoEvidence[];
  video: VideoEvidence[];
  witnesses: WitnessStatement[];
  causes: IncidentCause[];
  actions: MitigationAction[];
  outcomes: IncidentOutcome[];
  lessons: LessonLearned[];
  description: string;
  reportedBy: string;
  reportedAt: Date;
  status: IncidentStatus;
  severity: SeverityLevel;
}

export enum IncidentStatus {
  Open = "Open",
  UnderInvestigation = "UnderInvestigation",
  Closed = "Closed",
  Reviewed = "Reviewed",
}

export interface LessonLearned {
  id: string;
  description: string;
  category: string;
  recommendations: string[];
  sharedWith: string[];
  sharedAt: Date;
  isImplemented: boolean;
}

export enum InvestigationType {
  RCA = "RCA",
  FiveWhys = "FiveWhys",
  Fishbone = "Fishbone",
  BarrierAnalysis = "BarrierAnalysis",
  Timeline = "Timeline",
}

export interface InvestigationStep {
  id: string;
  order: number;
  description: string;
  findings: string[];
  evidence: string[];
}

export interface Investigation {
  id: string;
  incidentId: string;
  type: InvestigationType;
  leadInvestigator: string;
  team: string[];
  startedAt: Date;
  completedAt?: Date;
  steps: InvestigationStep[];
  findings: string[];
  rootCauses: string[];
  recommendations: string[];
  reportUrl?: string;
  status: InvestigationStatus;
}

export enum InvestigationStatus {
  Initiated = "Initiated",
  InProgress = "InProgress",
  Completed = "Completed",
  Reviewed = "Reviewed",
}

export interface EmergencyPlan {
  id: string;
  projectId: string;
  type: EmergencyType;
  routes: EmergencyRoute[];
  assemblyPoints: AssemblyPoint[];
  nearestSafetyEquipment: SafetyEquipment[];
  nearestResponseTeams: ResponseTeam[];
  lastDrillDate?: Date;
  nextDrillDate?: Date;
}

export enum EmergencyType {
  Evacuation = "Evacuation",
  Fire = "Fire",
  Collapse = "Collapse",
  Spill = "Spill",
  Injury = "Injury",
  NaturalDisaster = "NaturalDisaster",
}

export interface EmergencyRoute {
  id: string;
  name: string;
  waypoints: Location[];
  exitPoints: string[];
  isAccessible: boolean;
  lastChecked: Date;
}

export interface AssemblyPoint {
  id: string;
  name: string;
  location: Location;
  capacity: number;
  hasFirstAid: boolean;
  hasCommunication: boolean;
}

export interface SafetyEquipment {
  id: string;
  type: SafetyEquipmentType;
  location: Location;
  quantity: number;
  lastInspection: Date;
  expiryDate: Date;
}

export enum SafetyEquipmentType {
  FireExtinguisher = "FireExtinguisher",
  FirstAidKit = "FirstAidKit",
  EyewashStation = "EyewashStation",
  SafetyShower = "SafetyShower",
  AED = "AED",
  SpillKit = "SpillKit",
  Harness = "Harness",
  Ladder = "Ladder",
  Scaffolding = "Scaffolding",
}

export interface ResponseTeam {
  id: string;
  name: string;
  members: string[];
  leader: string;
  contactNumber: string;
  specialization: EmergencyType[];
  responseTime: number;
  available: boolean;
}

export interface SafetyMetrics {
  projectId: string;
  date: Date;
  TRIR: number;
  LTIFR: number;
  NearMissCount: number;
  ObservationCount: number;
  PermitCompliance: number;
  ResponseTime: number;
  PPECompliance: number;
  SafetyScore: number;
}

export interface EnterpriseSafetyIndex {
  score: number;
  incidentRate: number;
  inspections: number;
  ppeCompliance: number;
  responseTime: number;
  observations: number;
  training: number;
  nearMiss: number;
  compliance: number;
}

export interface TrainingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  courseName: string;
  courseType: TrainingType;
  provider: string;
  dateCompleted: Date;
  expiryDate?: Date;
  score: number;
  isPassed: boolean;
  certificateUrl?: string;
}

export enum TrainingType {
  Induction = "Induction",
  FireSafety = "FireSafety",
  FirstAid = "FirstAid",
  WorkingAtHeights = "WorkingAtHeights",
  ConfinedSpace = "ConfinedSpace",
  HotWork = "HotWork",
  LOTO = "LOTO",
  ElectricalSafety = "ElectricalSafety",
  ChemicalHandling = "ChemicalHandling",
  EmergencyResponse = "EmergencyResponse",
  DefensiveDriving = "DefensiveDriving",
}

export interface SafetyObservation {
  id: string;
  projectId: string;
  observer: string;
  date: Date;
  location: Location;
  observationType: ObservationType;
  description: string;
  riskLevel: SeverityLevel;
  imageUrl?: string;
  actionTaken: string;
  status: ObservationStatus;
  assignedTo?: string;
}

export enum ObservationType {
  SafeAct = "SafeAct",
  UnsafeAct = "UnsafeAct",
  SafeCondition = "SafeCondition",
  UnsafeCondition = "UnsafeCondition",
  NearMiss = "NearMiss",
}

export enum ObservationStatus {
  Reported = "Reported",
  Reviewed = "Reviewed",
  Actioned = "Actioned",
  Closed = "Closed",
}

export interface SafetyAlert {
  id: string;
  projectId: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  source: HazardSource;
  location: Location;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  relatedIncidentId?: string;
  recommendations: string[];
}

export interface WorkerBehaviorRecord {
  workerId: string;
  workerName: string;
  fatigueScore: number;
  focusScore: number;
  ppeCompliance: number;
  nearMissInvolved: number;
  violations: number;
  lastAssessment: Date;
}

export interface SafetyKnowledgeEntry {
  id: string;
  title: string;
  category: string;
  description: string;
  riskType: RiskType;
  lessons: LessonLearned[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface SafetyReport {
  id: string;
  projectId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: SafetyMetrics;
  index: EnterpriseSafetyIndex;
  topRisks: RiskAssessment[];
  incidents: IncidentRecord[];
  observations: SafetyObservation[];
  alerts: SafetyAlert[];
  recommendations: string[];
  generatedBy: string;
  generatedAt: Date;
}
