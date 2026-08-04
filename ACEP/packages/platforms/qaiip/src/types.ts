export enum InspectionType {
  CivilExcavation = 'CivilExcavation',
  CivilFoundation = 'CivilFoundation',
  CivilColumn = 'CivilColumn',
  CivilBeam = 'CivilBeam',
  CivilSlab = 'CivilSlab',
  CivilWall = 'CivilWall',
  CivilFinishing = 'CivilFinishing',
  ElectricalCable = 'ElectricalCable',
  ElectricalPanel = 'ElectricalPanel',
  ElectricalGrounding = 'ElectricalGrounding',
  ElectricalInsulation = 'ElectricalInsulation',
  ElectricalLoad = 'ElectricalLoad',
  MechanicalPump = 'MechanicalPump',
  MechanicalPipe = 'MechanicalPipe',
  MechanicalHVAC = 'MechanicalHVAC',
  MechanicalFireFighting = 'MechanicalFireFighting',
  MechanicalElevator = 'MechanicalElevator',
  OperationalPerformance = 'OperationalPerformance',
  OperationalReliability = 'OperationalReliability',
  OperationalConsumption = 'OperationalConsumption',
  OperationalVibration = 'OperationalVibration',
  OperationalNoise = 'OperationalNoise'
}

export enum InspectionCategory {
  Civil = 'Civil',
  Electrical = 'Electrical',
  Mechanical = 'Mechanical',
  Operational = 'Operational'
}

export const InspectionCategoryMap: Record<InspectionType, InspectionCategory> = {
  [InspectionType.CivilExcavation]: InspectionCategory.Civil,
  [InspectionType.CivilFoundation]: InspectionCategory.Civil,
  [InspectionType.CivilColumn]: InspectionCategory.Civil,
  [InspectionType.CivilBeam]: InspectionCategory.Civil,
  [InspectionType.CivilSlab]: InspectionCategory.Civil,
  [InspectionType.CivilWall]: InspectionCategory.Civil,
  [InspectionType.CivilFinishing]: InspectionCategory.Civil,
  [InspectionType.ElectricalCable]: InspectionCategory.Electrical,
  [InspectionType.ElectricalPanel]: InspectionCategory.Electrical,
  [InspectionType.ElectricalGrounding]: InspectionCategory.Electrical,
  [InspectionType.ElectricalInsulation]: InspectionCategory.Electrical,
  [InspectionType.ElectricalLoad]: InspectionCategory.Electrical,
  [InspectionType.MechanicalPump]: InspectionCategory.Mechanical,
  [InspectionType.MechanicalPipe]: InspectionCategory.Mechanical,
  [InspectionType.MechanicalHVAC]: InspectionCategory.Mechanical,
  [InspectionType.MechanicalFireFighting]: InspectionCategory.Mechanical,
  [InspectionType.MechanicalElevator]: InspectionCategory.Mechanical,
  [InspectionType.OperationalPerformance]: InspectionCategory.Operational,
  [InspectionType.OperationalReliability]: InspectionCategory.Operational,
  [InspectionType.OperationalConsumption]: InspectionCategory.Operational,
  [InspectionType.OperationalVibration]: InspectionCategory.Operational,
  [InspectionType.OperationalNoise]: InspectionCategory.Operational
};

export enum InspectionStatus {
  Planned = 'Planned',
  Scheduled = 'Scheduled',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
  OnHold = 'OnHold'
}

export enum NCRSeverity {
  Critical = 'Critical',
  Major = 'Major',
  Minor = 'Minor',
  Observation = 'Observation'
}

export enum NCRStatus {
  Open = 'Open',
  UnderReview = 'UnderReview',
  CorrectiveAction = 'CorrectiveAction',
  Verified = 'Verified',
  Closed = 'Closed',
  Rejected = 'Rejected'
}

export enum CAPAStatus {
  Identified = 'Identified',
  Investigation = 'Investigation',
  ActionPlanned = 'ActionPlanned',
  InProgress = 'InProgress',
  Verified = 'Verified',
  Closed = 'Closed'
}

export enum QualityElement {
  Excavation = 'Excavation',
  Foundation = 'Foundation',
  Column = 'Column',
  Beam = 'Beam',
  Slab = 'Slab',
  Wall = 'Wall',
  Finishing = 'Finishing',
  Roofing = 'Roofing',
  Waterproofing = 'Waterproofing',
  ElectricalWiring = 'ElectricalWiring',
  PanelBoard = 'PanelBoard',
  Lighting = 'Lighting',
  CCTV = 'CCTV',
  FireAlarm = 'FireAlarm',
  Plumbing = 'Plumbing',
  Drainage = 'Drainage',
  HVAC = 'HVAC',
  FireFighting = 'FireFighting',
  Elevator = 'Elevator',
  StructuralSteel = 'StructuralSteel',
  Concrete = 'Concrete',
  Masonry = 'Masonry',
  Flooring = 'Flooring',
  Painting = 'Painting',
  Ceiling = 'Ceiling'
}

export enum DefectType {
  Crack = 'Crack',
  Honeycombing = 'Honeycombing',
  Spalling = 'Spalling',
  Rust = 'Rust',
  Leakage = 'Leakage',
  PoorFinish = 'PoorFinish',
  Deviation = 'Deviation',
  Misalignment = 'Misalignment',
  Porosity = 'Porosity',
  Voids = 'Voids',
  Delamination = 'Delamination',
  Efflorescence = 'Efflorescence',
  Corrosion = 'Corrosion',
  Sagging = 'Sagging',
  Peeling = 'Peeling',
  Blistering = 'Blistering',
  Crazing = 'Crazing',
  Scaling = 'Scaling'
}

export enum CertificateType {
  MaterialTest = 'MaterialTest',
  ConcreteTest = 'ConcreteTest',
  SteelTest = 'SteelTest',
  SoilTest = 'SoilTest',
  WeldTest = 'WeldTest',
  HydrostaticTest = 'HydrostaticTest',
  ElectricalTest = 'ElectricalTest',
  CalibrationCert = 'CalibrationCert',
  ComplianceCert = 'ComplianceCert',
  WarrantyCert = 'WarrantyCert'
}

export enum LabTestType {
  ConcreteCompressiveStrength = 'ConcreteCompressiveStrength',
  ConcreteSlump = 'ConcreteSlump',
  SteelTensile = 'SteelTensile',
  SoilDensity = 'SoilDensity',
  SoilProctor = 'SoilProctor',
  AggregateSieve = 'AggregateSieve',
  WaterQuality = 'WaterQuality',
  AsphaltMarshall = 'AsphaltMarshall',
  WeldRadiography = 'WeldRadiography',
  UltrasonicTesting = 'UltrasonicTesting'
}

export enum ReportType {
  Daily = 'Daily',
  Inspector = 'Inspector',
  NCR = 'NCR',
  Lab = 'Lab',
  Handover = 'Handover',
  Monthly = 'Monthly',
  Weekly = 'Weekly',
  PunchList = 'PunchList',
  Snagging = 'Snagging'
}

export interface InspectionPoint {
  id: string;
  projectId: string;
  type: InspectionType;
  category: InspectionCategory;
  title: string;
  description: string;
  location: string;
  element: QualityElement;
  floor?: string;
  zone?: string;
  status: InspectionStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedInspector: string;
  assignedContractor?: string;
  scheduledDate?: string;
  completedDate?: string;
  approvedDate?: string;
  results?: InspectionResult;
  certification?: InspectionCertification;
  documents: InspectionDocument[];
  photos: string[];
  labResults: LabResultReference[];
  inspectorSignature?: SignatureInfo;
  contractorSignature?: SignatureInfo;
  consultantSignature?: SignatureInfo;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionResult {
  verdict: 'Pass' | 'Fail' | 'ConditionalPass' | 'Retest';
  score: number;
  findings: string[];
  observations: string[];
  recommendations: string[];
  measuredValues?: Record<string, number>;
  toleranceLimits?: Record<string, { min: number; max: number }>;
  deviations?: DeviationRecord[];
  imagesAnalyzed?: ImageAnalysisResult;
  conformsToSpecs: boolean;
}

export interface DeviationRecord {
  parameter: string;
  designValue: number;
  actualValue: number;
  tolerance: number;
  deviation: number;
  acceptable: boolean;
}

export interface InspectionCertification {
  certified: boolean;
  certificateType?: CertificateType;
  certificateId?: string;
  certifiedBy?: string;
  certificationDate?: string;
  expiryDate?: string;
  certifyingBody?: string;
  remarks?: string;
}

export interface InspectionDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  version: string;
  uploadedBy: string;
  uploadedAt: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface SignatureInfo {
  signed: boolean;
  signatoryName: string;
  signatoryTitle: string;
  signatureData?: string;
  signedAt?: string;
  ipAddress?: string;
  remarks?: string;
}

export interface LabResultReference {
  labTestId: string;
  testType: LabTestType;
  sampleId: string;
  result: string;
  value: number;
  unit: string;
  specification: string;
  compliant: boolean;
  testedBy: string;
  testedAt: string;
  certificateUrl?: string;
}

export interface NCR {
  id: string;
  projectId: string;
  ncrNumber: string;
  reference: string;
  cause: string;
  description: string;
  severity: NCRSeverity;
  location: string;
  element: QualityElement;
  inspectionId?: string;
  responsibleParty: string;
  responsibleContractor?: string;
  raisedBy: string;
  raisedAt: string;
  correctiveAction: string;
  correctiveActionPlan?: string;
  preventiveAction?: string;
  closeDate?: string;
  closedBy?: string;
  evidence: NCREvidence[];
  status: NCRStatus;
  linkedNCRs?: string[];
  linkedCAPAId?: string;
  metadata?: Record<string, unknown>;
}

export interface NCREvidence {
  id: string;
  type: 'Photo' | 'Document' | 'LabResult' | 'Measurement' | 'Statement' | 'Drawing';
  description: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  verified: boolean;
  verifiedBy?: string;
}

export interface CAPA {
  id: string;
  projectId: string;
  capaNumber: string;
  ncrId?: string;
  title: string;
  description: string;
  rootCause: string;
  rootCauseAnalysis: string;
  personResponsible: string;
  department: string;
  correctiveAction: string;
  preventiveAction: string;
  schedule: CAPASchedule;
  executionStatus: CAPAStatus;
  verificationResults: string;
  verifiedBy?: string;
  verifiedAt?: string;
  effectivenessScore?: number;
  effectivenessEvaluation?: string;
  attachments: string[];
  status: CAPAStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CAPASchedule {
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  milestones: CAPAMilestone[];
}

export interface CAPAMilestone {
  id: string;
  description: string;
  targetDate: string;
  completedDate?: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Overdue';
  assignedTo?: string;
  remarks?: string;
}

export interface QualityAnalysis {
  id: string;
  projectId: string;
  analysisDate: string;
  period: { from: string; to: string };
  patterns: QualityPattern[];
  recurringDefects: RecurringDefect[];
  reworkProbability: number;
  correctiveActions: SuggestedAction[];
  priorities: ActionPriority[];
  trends: QualityTrend[];
  summary: string;
}

export interface QualityPattern {
  id: string;
  type: string;
  description: string;
  frequency: number;
  affectedElements: QualityElement[];
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  probability: number;
  recommendation: string;
}

export interface RecurringDefect {
  defectType: DefectType;
  element: QualityElement;
  location: string;
  occurrenceCount: number;
  firstOccurrence: string;
  lastOccurrence: string;
  trend: 'Increasing' | 'Stable' | 'Decreasing';
  rootCause?: string;
}

export interface SuggestedAction {
  id: string;
  description: string;
  priority: 'Immediate' | 'ShortTerm' | 'MediumTerm' | 'LongTerm';
  estimatedEffort: string;
  assignedTo?: string;
  deadline?: string;
  expectedImpact: string;
  status: 'Proposed' | 'Approved' | 'Implemented' | 'Rejected';
}

export interface ActionPriority {
  defectType: DefectType;
  element: QualityElement;
  urgency: number;
  impact: number;
  priorityScore: number;
  recommendedAction: string;
}

export interface QualityTrend {
  metric: string;
  direction: 'Improving' | 'Stable' | 'Declining';
  changePercent: number;
  period: string;
}

export interface ImageAnalysisResult {
  imageId: string;
  inspectionId: string;
  timestamp: string;
  crackDetection: CrackInfo[];
  honeycombing: HoneycombingInfo[];
  spalling: SpallingInfo[];
  rustDetection: RustInfo[];
  leakageDetection: LeakageInfo[];
  poorFinish: PoorFinishInfo[];
  deviations: DeviationInfo[];
  overallHealthScore: number;
  recommendations: string[];
}

export interface CrackInfo {
  id: string;
  location: string;
  lengthMm: number;
  widthMm: number;
  depthMm?: number;
  orientation: string;
  pattern: 'Hairline' | 'Map' | 'Vertical' | 'Horizontal' | 'Diagonal' | 'Structural' | 'Shrinkage';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  affectedArea: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface HoneycombingInfo {
  id: string;
  location: string;
  areaCm2: number;
  depthMm: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  aggregateExposed: boolean;
  reinforcementExposed: boolean;
  confidence: number;
}

export interface SpallingInfo {
  id: string;
  location: string;
  areaCm2: number;
  depthMm: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  reinforcementExposed: boolean;
  confidence: number;
}

export interface RustInfo {
  id: string;
  location: string;
  areaCm2: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  surfaceType: string;
  depthMm?: number;
  confidence: number;
}

export interface LeakageInfo {
  id: string;
  location: string;
  source: string;
  flowRate?: number;
  areaAffected: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  waterDamage: boolean;
  confidence: number;
}

export interface PoorFinishInfo {
  id: string;
  location: string;
  type: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  areaCm2: number;
  description: string;
  confidence: number;
}

export interface DeviationInfo {
  id: string;
  parameter: string;
  designValue: number;
  actualValue: number;
  deviationMm: number;
  toleranceMm: number;
  acceptable: boolean;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number;
}

export interface BIMComparison {
  id: string;
  projectId: string;
  elementId: string;
  elementType: string;
  elementName: string;
  floor: string;
  matching: BIMElement[];
  nonMatching: BIMElement[];
  missing: BIMElement[];
  deviations: BIMDeviation[];
  comparisonDate: string;
  overallMatchPercent: number;
  summary: string;
}

export interface BIMElement {
  id: string;
  bimId?: string;
  name: string;
  type: string;
  category: string;
  material?: string;
  dimensions?: { width: number; height: number; depth: number };
  location: { x: number; y: number; z: number };
  properties: Record<string, unknown>;
}

export interface BIMDeviation {
  id: string;
  parameter: string;
  designValue: number;
  actualValue: number;
  deviation: number;
  unit: string;
  tolerance: number;
  acceptable: boolean;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendation?: string;
}

export interface CodeComplianceResult {
  id: string;
  projectId: string;
  codeStandard: string;
  codeVersion: string;
  checkDate: string;
  compliant: ComplianceItem[];
  nonCompliant: NonComplianceItem[];
  summary: string;
  overallCompliancePercent: number;
  severity: 'Compliant' | 'Partial' | 'NonCompliant';
  checkedBy: string;
}

export interface ComplianceItem {
  id: string;
  codeRef: string;
  clause: string;
  description: string;
  status: 'Compliant' | 'Exempted' | 'NotApplicable';
  verifiedBy?: string;
  verifiedAt?: string;
  remarks?: string;
}

export interface NonComplianceItem {
  id: string;
  codeRef: string;
  clause: string;
  description: string;
  severity: NCRSeverity;
  deviation: string;
  requiredAction: string;
  deadline?: string;
  status: 'Open' | 'InProgress' | 'Resolved' | 'Waived';
  resolvedBy?: string;
  resolvedAt?: string;
  remarks?: string;
}

export interface QualityMetrics {
  projectId: string;
  calculatedAt: string;
  period: { from: string; to: string };
  firstPassYield: number;
  reworkRate: number;
  ncrCount: number;
  ncrOpenCount: number;
  ncrClosedCount: number;
  passRate: number;
  capaCount: number;
  capaClosureRate: number;
  labComplianceRate: number;
  qualityScore: number;
  inspectionCount: number;
  inspectionsPassed: number;
  inspectionsFailed: number;
  correctiveActionsIssued: number;
  correctiveActionsClosed: number;
}

export interface EnterpriseQualityIndex {
  calculatedAt: string;
  overallScore: number;
  inspectionQuality: number;
  firstPassQuality: number;
  reworkQuality: number;
  ncrClosureQuality: number;
  labComplianceQuality: number;
  codeComplianceQuality: number;
  finishesQuality: number;
  satisfactionQuality: number;
  trend: 'Improving' | 'Stable' | 'Declining';
  benchmarks: EQIBenchmark[];
  recommendations: string[];
}

export interface EQIBenchmark {
  category: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  status: 'Met' | 'Below' | 'Above' | 'Critical';
}

export interface DailyReport {
  id: string;
  projectId: string;
  date: string;
  preparedBy: string;
  weather: string;
  temperature: number;
  workSummary: string;
  inspections: DailyInspectionEntry[];
  ncrEntries: DailyNCREntry[];
  qualityIssues: string[];
  safetyIssues: string[];
  materialsReceived: string[];
  equipmentDeployed: string[];
  manpowerSummary: ManpowerSummary;
  photos: string[];
  remarks: string;
  submitted: boolean;
  submittedAt?: string;
}

export interface DailyInspectionEntry {
  inspectionId: string;
  element: QualityElement;
  type: InspectionType;
  result: string;
  inspector: string;
  status: InspectionStatus;
}

export interface DailyNCREntry {
  ncrId: string;
  ncrNumber: string;
  severity: NCRSeverity;
  status: NCRStatus;
  description: string;
}

export interface ManpowerSummary {
  engineers: number;
  supervisors: number;
  foremen: number;
  skilled: number;
  unskilled: number;
  total: number;
}

export interface InspectorReport {
  id: string;
  projectId: string;
  inspectorId: string;
  inspectorName: string;
  date: string;
  period: { from: string; to: string };
  inspectionsConducted: number;
  inspectionsPassed: number;
  inspectionsFailed: number;
  ncrRaised: number;
  ncrClosed: number;
  findingsSummary: string;
  keyIssues: string[];
  recommendations: string[];
  attachments: string[];
}

export interface NCRReport {
  id: string;
  projectId: string;
  reportDate: string;
  totalNCRs: number;
  openNCRs: number;
  closedNCRs: number;
  bySeverity: Record<NCRSeverity, number>;
  byElement: Record<QualityElement, number>;
  byContractor: Record<string, number>;
  averageClosureDays: number;
  overdueNCRs: NCRSummary[];
  topCauses: { cause: string; count: number }[];
  trend: 'Improving' | 'Stable' | 'Declining';
}

export interface NCRSummary {
  ncrId: string;
  ncrNumber: string;
  severity: NCRSeverity;
  element: QualityElement;
  raisedAt: string;
  daysOpen: number;
  responsibleParty: string;
}

export interface LabReport {
  id: string;
  projectId: string;
  reportDate: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  pendingTests: number;
  complianceRate: number;
  byTestType: Record<string, { total: number; passed: number; failed: number }>;
  failedSamples: FailedSample[];
  recommendations: string[];
}

export interface FailedSample {
  sampleId: string;
  testType: LabTestType;
  element: QualityElement;
  location: string;
  value: number;
  specMin: number;
  specMax: number;
  deviation: number;
  testedAt: string;
  retestRequired: boolean;
  ncrRaised: boolean;
  ncrId?: string;
}

export interface HandoverReport {
  id: string;
  projectId: string;
  projectName: string;
  handoverDate: string;
  preparedBy: string;
  reviewedBy: string;
  approvedBy: string;
  systemType: string;
  scopeOfWork: string;
  inspectionsSummary: string;
  inspectionsPassed: number;
  inspectionsFailed: number;
  ncrSummary: NCRReport;
  certificates: CertificateSummary[];
  outstandingItems: OutstandingItem[];
  complianceStatus: string;
  warrantyPeriod: string;
  operationManuals: string[];
  asBuiltDrawings: string[];
  sparePartsList: string[];
  trainingProvided: boolean;
  trainingDetails?: string;
  finalVerdict: 'Approved' | 'Conditional' | 'Rejected';
  remarks: string;
}

export interface CertificateSummary {
  type: CertificateType;
  certificateId: string;
  issuedBy: string;
  issueDate: string;
  expiryDate?: string;
  status: 'Valid' | 'Expired' | 'Pending';
}

export interface OutstandingItem {
  id: string;
  description: string;
  element: QualityElement;
  severity: 'Low' | 'Medium' | 'High';
  deadline: string;
  responsibleParty: string;
  status: 'Open' | 'InProgress' | 'Resolved';
}

export interface MonthlyReport {
  id: string;
  projectId: string;
  month: number;
  year: number;
  preparedBy: string;
  submittedAt: string;
  executiveSummary: string;
  inspectionsOverview: MonthlyInspectionsOverview;
  qualityMetrics: QualityMetrics;
  ncrAnalysis: NCRReport;
  capaSummary: CAPASummary;
  labSummary: LabReport;
  imageAnalysisSummary: ImageAnalysisSummary;
  bImComparisonSummary: BIMComparisonSummary;
  codeComplianceSummary: CodeComplianceResult;
  enterpriseQualityIndex: EnterpriseQualityIndex;
  keyAchievements: string[];
  challenges: string[];
  recommendations: string[];
  appendix: string[];
}

export interface MonthlyInspectionsOverview {
  totalPlanned: number;
  totalConducted: number;
  totalPassed: number;
  totalFailed: number;
  passRate: number;
  byCategory: Record<InspectionCategory, { planned: number; conducted: number; passed: number; failed: number }>;
  topFindings: string[];
}

export interface CAPASummary {
  total: number;
  open: number;
  closed: number;
  overdue: number;
  closureRate: number;
  averageClosureDays: number;
  byDepartment: Record<string, { total: number; closed: number }>;
}

export interface ImageAnalysisSummary {
  totalImages: number;
  defectsDetected: number;
  byDefectType: Record<DefectType, number>;
  averageHealthScore: number;
  criticalDefects: number;
}

export interface BIMComparisonSummary {
  elementsCompared: number;
  matchingElements: number;
  nonMatchingElements: number;
  missingElements: number;
  matchPercent: number;
  criticalDeviations: number;
}
