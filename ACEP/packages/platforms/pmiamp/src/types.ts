export enum AssetType {
  Elevator = 'Elevator',
  Escalator = 'Escalator',
  Generator = 'Generator',
  Transformer = 'Transformer',
  Pump = 'Pump',
  HVAC = 'HVAC',
  FireFighting = 'FireFighting',
  Alarm = 'Alarm',
  AutomaticDoor = 'AutomaticDoor',
  ElectricalPanel = 'ElectricalPanel',
  SiteEquipment = 'SiteEquipment',
  Crane = 'Crane',
  Compressor = 'Compressor',
  Tank = 'Tank',
  SolarSystem = 'SolarSystem',
  BatterySystem = 'BatterySystem',
  CivilAsset = 'CivilAsset'
}

export enum AssetStatus {
  Registered = 'Registered',
  Installed = 'Installed',
  Commissioned = 'Commissioned',
  Operational = 'Operational',
  UnderMaintenance = 'UnderMaintenance',
  Retired = 'Retired'
}

export enum AssetCriticality {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
  Emergency = 'Emergency'
}

export enum WorkOrderType {
  Emergency = 'Emergency',
  Preventive = 'Preventive',
  Predictive = 'Predictive',
  Inspection = 'Inspection'
}

export enum WorkOrderStatus {
  Draft = 'Draft',
  Assigned = 'Assigned',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  OnHold = 'OnHold'
}

export enum FailureCategory {
  Mechanical = 'Mechanical',
  Electrical = 'Electrical',
  Electronic = 'Electronic',
  Software = 'Software',
  Operational = 'Operational',
  Environmental = 'Environmental',
  Human = 'Human',
  RootCause = 'RootCause'
}

export enum SeverityLevel {
  Negligible = 'Negligible',
  Minor = 'Minor',
  Moderate = 'Moderate',
  Major = 'Major',
  Critical = 'Critical',
  Catastrophic = 'Catastrophic'
}

export enum OperationalImpact {
  None = 'None',
  Degraded = 'Degraded',
  Interrupted = 'Interrupted',
  Shutdown = 'Shutdown',
  SafetyHazard = 'SafetyHazard'
}

export enum MaintenancePlanType {
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  SemiAnnual = 'SemiAnnual',
  Annual = 'Annual',
  Custom = 'Custom'
}

export interface SmartAssetCard {
  id: string;
  assetType: AssetType;
  status: AssetStatus;
  criticality: AssetCriticality;
  qrCode: string;
  barcode: string;
  rfid: string;
  serial: string;
  manufacturer: string;
  model: string;
  supplier: string;
  installDate: string;
  warranty: string;
  designLife: number;
  condition: AssetCondition;
  maintenancePlan: MaintenancePlan;
  spareParts: SparePart[];
  manuals: DocumentLink[];
  drawings: DocumentLink[];
  contracts: ContractLink[];
  digitalTwinLink: string;
  location: AssetLocation;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AssetCondition {
  overall: number;
  mechanical: number;
  electrical: number;
  structural: number;
  cosmetic: number;
  lastInspection: string;
  nextInspection: string;
  notes: string;
}

export interface MaintenancePlan {
  type: MaintenancePlanType;
  interval: number;
  intervalUnit: string;
  tasks: MaintenanceTask[];
  assignedTo: string;
  contractor?: string;
  estimatedDuration: number;
  estimatedCost: number;
  lastPerformed: string;
  nextDue: string;
}

export interface MaintenanceTask {
  id: string;
  name: string;
  description: string;
  estimatedHours: number;
  requiredSkills: string[];
  requiredParts: string[];
  safetyRequirements: string[];
  checklist: string[];
}

export interface SparePart {
  id: string;
  partNumber: string;
  name: string;
  manufacturer: string;
  supplier: string;
  quantity: number;
  minStock: number;
  unitPrice: number;
  leadTime: number;
  location: string;
  compatibleAssets: string[];
}

export interface DocumentLink {
  id: string;
  name: string;
  type: string;
  url: string;
  version: string;
  uploadedAt: string;
}

export interface ContractLink {
  id: string;
  contractNumber: string;
  provider: string;
  type: string;
  startDate: string;
  endDate: string;
  value: number;
  scope: string;
  contactPerson: string;
}

export interface AssetLocation {
  site: string;
  building: string;
  floor: string;
  zone: string;
  coordinates: GeoCoordinates;
}

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface ConditionMonitoringData {
  assetId: string;
  timestamp: string;
  temperature: number | null;
  vibration: number | null;
  noise: number | null;
  pressure: number | null;
  energy: number | null;
  cycles: number | null;
  speed: number | null;
  hours: number | null;
  load: number | null;
  errors: number | null;
  additional: Record<string, number>;
}

export interface PredictiveAnalysis {
  assetId: string;
  timestamp: string;
  failureProbability: number;
  estimatedTimeToFailure: number;
  estimatedTimeUnit: string;
  vulnerableComponents: VulnerableComponent[];
  severity: SeverityLevel;
  operationalImpact: OperationalImpact;
  confidence: number;
  evidence: AnalysisEvidence[];
  recommendedActions: string[];
}

export interface VulnerableComponent {
  name: string;
  failureProbability: number;
  estimatedLifeRemaining: number;
  criticality: AssetCriticality;
  replacementCost: number;
}

export interface AnalysisEvidence {
  source: string;
  indicator: string;
  value: number;
  threshold: number;
  severity: string;
  weight: number;
}

export interface WorkOrder {
  id: string;
  type: WorkOrderType;
  assetId: string;
  assetType: AssetType;
  title: string;
  description: string;
  priority: AssetCriticality;
  status: WorkOrderStatus;
  technician: string;
  contract: string;
  location: AssetLocation;
  inventory: string[];
  estimatedHours: number;
  actualHours: number;
  estimatedCost: number;
  actualCost: number;
  scheduledDate: string;
  completedDate: string;
  findings: string;
  recommendations: string;
  createdAt: string;
  updatedAt: string;
}

export interface FailureAnalysis {
  assetId: string;
  failureDate: string;
  failureDescription: string;
  mechanical: FailureFactor[];
  electrical: FailureFactor[];
  electronic: FailureFactor[];
  software: FailureFactor[];
  operational: FailureFactor[];
  environmental: FailureFactor[];
  human: FailureFactor[];
  rootCause: string;
  recommendations: string[];
  costOfFailure: number;
  downtimeHours: number;
}

export interface FailureFactor {
  factor: string;
  contributor: boolean;
  severity: number;
  description: string;
}

export interface ReliabilityMetrics {
  assetId: string;
  mtbf: number;
  mtbfUnit: string;
  mttr: number;
  mttrUnit: string;
  availability: number;
  reliability: number;
  failureRate: number;
  failureRateUnit: string;
  periodStart: string;
  periodEnd: string;
  totalOperatingHours: number;
  totalFailures: number;
  totalDowntimeHours: number;
  trend: ReliabilityTrend;
}

export interface ReliabilityTrend {
  mtbfTrend: 'Improving' | 'Stable' | 'Degrading';
  mttrTrend: 'Improving' | 'Stable' | 'Degrading';
  availabilityTrend: 'Improving' | 'Stable' | 'Degrading';
  failureRateTrend: 'Improving' | 'Stable' | 'Degrading';
}

export interface AssetHealthIndex {
  assetId: string;
  overallScore: number;
  operationScore: number;
  inspectionScore: number;
  sensorScore: number;
  failureScore: number;
  maintenanceScore: number;
  ageScore: number;
  performanceScore: number;
  priority: MaintenancePriority;
  recommendation: string;
  calculatedAt: string;
  details: HealthScoreDetails;
}

export interface HealthScoreDetails {
  operation: WeightedFactor[];
  inspections: WeightedFactor[];
  sensors: WeightedFactor[];
  failures: WeightedFactor[];
  maintenance: WeightedFactor[];
  age: WeightedFactor[];
  performance: WeightedFactor[];
}

export interface WeightedFactor {
  name: string;
  score: number;
  weight: number;
  contribution: number;
}

export enum MaintenancePriority {
  Routine = 'Routine',
  Scheduled = 'Scheduled',
  Urgent = 'Urgent',
  Immediate = 'Immediate',
  Replacement = 'Replacement'
}

export interface FinancialIntelligence {
  assetId: string;
  annualMaintenanceCost: number;
  downtimeCost: number;
  replacementCost: number;
  lifecycleCost: number;
  remainingLifeValue: number;
  costPerOperatingHour: number;
  maintenanceToReplacementRatio: number;
  roa: number;
  currency: string;
  fiscalYear: string;
}

export interface DigitalTwinLink {
  twinId: string;
  assetId: string;
  modelUrl: string;
  dataStreamUrl: string;
  lastSync: string;
  syncInterval: number;
  status: string;
}

export interface IoTPlatformData {
  platform: string;
  deviceId: string;
  telemetryTopic: string;
  commandTopic: string;
  lastSeen: string;
  online: boolean;
  firmwareVersion: string;
}

export interface KnowledgeGraphLink {
  nodeId: string;
  assetId: string;
  relations: string[];
  linkedAssets: string[];
  linkedWorkOrders: string[];
  linkedDocuments: string[];
}
