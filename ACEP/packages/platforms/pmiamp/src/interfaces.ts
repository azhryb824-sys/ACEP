import { IEngine } from '@acep/core';
import {
  AssetType, AssetStatus, AssetCriticality, WorkOrderType, WorkOrderStatus,
  SmartAssetCard, ConditionMonitoringData, PredictiveAnalysis,
  WorkOrder, SparePart, FailureAnalysis, ReliabilityMetrics,
  AssetHealthIndex, FinancialIntelligence, MaintenancePlan,
  FailureFactor, VulnerableComponent, AnalysisEvidence,
  AssetLocation, SeverityLevel, OperationalImpact, MaintenancePriority,
  ReliabilityTrend, HealthScoreDetails, WeightedFactor, IoTPlatformData,
  DigitalTwinLink, KnowledgeGraphLink
} from './types';

export interface IMaintenanceEngine extends IEngine {
  registerAsset(card: Omit<SmartAssetCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<SmartAssetCard>;
  getAsset(assetId: string): Promise<SmartAssetCard | undefined>;
  updateAsset(assetId: string, updates: Partial<SmartAssetCard>): Promise<SmartAssetCard>;
  retireAsset(assetId: string): Promise<void>;
  listAssets(type?: AssetType, status?: AssetStatus): Promise<SmartAssetCard[]>;
  searchAssets(query: string): Promise<SmartAssetCard[]>;
}

export interface IAssetManager {
  createSmartAssetCard(asset: SmartAssetCard): Promise<SmartAssetCard>;
  getSmartAssetCard(assetId: string): Promise<SmartAssetCard | undefined>;
  updateAssetStatus(assetId: string, status: AssetStatus): Promise<SmartAssetCard>;
  updateAssetCondition(assetId: string, condition: SmartAssetCard['condition']): Promise<void>;
  linkDigitalTwin(assetId: string, twinLink: DigitalTwinLink): Promise<void>;
  linkIoTPlatform(assetId: string, iot: IoTPlatformData): Promise<void>;
  linkKnowledgeGraph(assetId: string, kg: KnowledgeGraphLink): Promise<void>;
  getAssetLifecycle(assetId: string): Promise<AssetLifecycleStage[]>;
  calculateFinancialIntelligence(assetId: string): Promise<FinancialIntelligence>;
}

export interface AssetLifecycleStage {
  stage: string;
  date: string;
  description: string;
  performedBy: string;
}

export interface IConditionMonitor {
  ingestSensorData(data: ConditionMonitoringData): Promise<void>;
  ingestBatchSensorData(data: ConditionMonitoringData[]): Promise<void>;
  getLatestReadings(assetId: string): Promise<ConditionMonitoringData | undefined>;
  getReadingHistory(assetId: string, from: string, to: string): Promise<ConditionMonitoringData[]>;
  detectAnomalies(assetId: string): Promise<AnomalyReport[]>;
  getSensorHealth(assetId: string): Promise<SensorHealthStatus>;
}

export interface AnomalyReport {
  parameter: string;
  value: number;
  threshold: number;
  severity: string;
  detectedAt: string;
  recommendation: string;
}

export interface SensorHealthStatus {
  assetId: string;
  activeSensors: number;
  totalSensors: number;
  lastDataReceived: string;
  dataGaps: number;
  overallHealth: 'Good' | 'Fair' | 'Poor';
}

export interface IPredictiveAnalyzer {
  analyzeFailurePatterns(assetId: string): Promise<PredictiveAnalysis>;
  analyzeMaintenanceHistory(assetId: string): Promise<PredictiveAnalysis>;
  analyzeOperationalBehavior(assetId: string): Promise<PredictiveAnalysis>;
  analyzeManufacturerData(assetId: string): Promise<PredictiveAnalysis>;
  analyzeSensorTrends(assetId: string): Promise<PredictiveAnalysis>;
  analyzeEnvironmentalImpact(assetId: string): Promise<PredictiveAnalysis>;
  comprehensiveAnalysis(assetId: string): Promise<AggregatedPredictiveAnalysis>;
}

export interface AggregatedPredictiveAnalysis {
  assetId: string;
  overallFailureProbability: number;
  estimatedTimeToFailure: number;
  estimatedTimeUnit: string;
  analyses: PredictiveAnalysis[];
  consensus: PredictiveAnalysis;
  conflictingIndicators: string[];
  confidence: number;
  timestamp: string;
}

export interface IWorkOrderManager {
  createWorkOrder(order: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkOrder>;
  getWorkOrder(orderId: string): Promise<WorkOrder | undefined>;
  updateWorkOrder(orderId: string, updates: Partial<WorkOrder>): Promise<WorkOrder>;
  assignWorkOrder(orderId: string, technician: string): Promise<WorkOrder>;
  completeWorkOrder(orderId: string, findings: string, actualHours: number, actualCost: number): Promise<WorkOrder>;
  cancelWorkOrder(orderId: string): Promise<void>;
  listWorkOrders(assetId?: string, type?: WorkOrderType, status?: WorkOrderStatus): Promise<WorkOrder[]>;
  getWorkOrdersByTechnician(technician: string): Promise<WorkOrder[]>;
  generateWorkOrderFromAnalysis(analysis: PredictiveAnalysis): Promise<WorkOrder>;
}

export interface ISparePartManager {
  registerPart(part: Omit<SparePart, 'id'>): Promise<SparePart>;
  getPart(partId: string): Promise<SparePart | undefined>;
  updateStock(partId: string, quantity: number): Promise<SparePart>;
  reserveParts(orderId: string, parts: { partId: string; quantity: number }[]): Promise<boolean>;
  releaseParts(orderId: string): Promise<void>;
  checkAvailability(partId: string, quantity: number): Promise<boolean>;
  getLowStockParts(): Promise<SparePart[]>;
  linkPartToAsset(partId: string, assetId: string): Promise<void>;
  findCompatibleParts(assetType: AssetType, model: string): Promise<SparePart[]>;
}

export interface IFailureAnalyzer {
  recordFailure(assetId: string, description: string, downtime: number, cost: number): Promise<FailureAnalysis>;
  analyzeRootCause(assetId: string): Promise<FailureAnalysis>;
  getFailureHistory(assetId: string): Promise<FailureAnalysis[]>;
  classifyFailure(failure: FailureAnalysis): Promise<FailureCategoryResult>;
  getFailureStatistics(assetId: string): Promise<FailureStatistics>;
}

export interface FailureCategoryResult {
  primaryCategory: string;
  contributingFactors: string[];
  probabilityDistribution: Record<string, number>;
}

export interface FailureStatistics {
  assetId: string;
  totalFailures: number;
  totalDowntime: number;
  meanTimeBetweenFailures: number;
  meanTimeToRepair: number;
  mostCommonCategory: string;
  failureRateTrend: string;
  byCategory: Record<string, number>;
  byMonth: Record<string, number>;
}

export interface IReliabilityAnalyzer {
  calculateMTBF(assetId: string, from: string, to: string): Promise<number>;
  calculateMTTR(assetId: string, from: string, to: string): Promise<number>;
  calculateAvailability(assetId: string, from: string, to: string): Promise<number>;
  calculateReliability(assetId: string, missionTime: number): Promise<number>;
  calculateFailureRate(assetId: string, from: string, to: string): Promise<number>;
  getReliabilityMetrics(assetId: string, from: string, to: string): Promise<ReliabilityMetrics>;
  analyzeTrend(assetId: string): Promise<ReliabilityTrend>;
  predictRemainingLife(assetId: string): Promise<RemainingLifePrediction>;
}

export interface RemainingLifePrediction {
  assetId: string;
  estimatedRemainingYears: number;
  confidence: number;
  basedOn: string[];
  recommendation: string;
}
