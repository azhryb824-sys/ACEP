import { BaseEngine } from '@acep/core';
import {
  IMaintenanceEngine, IAssetManager, IConditionMonitor, IWorkOrderManager,
  ISparePartManager, IFailureAnalyzer, IReliabilityAnalyzer, IPredictiveAnalyzer,
  AssetLifecycleStage, AnomalyReport, SensorHealthStatus,
  AggregatedPredictiveAnalysis, FailureCategoryResult, FailureStatistics,
  RemainingLifePrediction
} from './interfaces';
import {
  AssetType, AssetStatus, AssetCriticality, WorkOrderType, WorkOrderStatus,
  SmartAssetCard, ConditionMonitoringData, PredictiveAnalysis,
  WorkOrder, SparePart, FailureAnalysis, ReliabilityMetrics,
  AssetHealthIndex, FinancialIntelligence, MaintenancePlan,
  SeverityLevel, OperationalImpact, MaintenancePriority, IoTPlatformData,
  DigitalTwinLink, KnowledgeGraphLink, AssetLocation, FailureFactor,
  GeoCoordinates, AssetCondition, VulnerableComponent, AnalysisEvidence
} from './types';
import { PredictiveAnalyzer } from './predictive-analyzer';
import { AssetHealthIndexCalculator } from './asset-health-index';
import { ReliabilityAnalyzer } from './reliability-analyzer';

export class MaintenanceEngine extends BaseEngine implements IMaintenanceEngine {
  private assets: Map<string, SmartAssetCard> = new Map();
  private sensorData: Map<string, ConditionMonitoringData[]> = new Map();
  private workOrders: Map<string, WorkOrder> = new Map();
  private failures: Map<string, FailureAnalysis[]> = new Map();
  private spareParts: Map<string, SparePart> = new Map();
  private assetLifecycles: Map<string, AssetLifecycleStage[]> = new Map();
  private digitalTwins: Map<string, DigitalTwinLink> = new Map();
  private iotPlatforms: Map<string, IoTPlatformData> = new Map();
  private knowledgeGraphs: Map<string, KnowledgeGraphLink> = new Map();

  private predictiveAnalyzer: PredictiveAnalyzer;
  private healthIndexCalculator: AssetHealthIndexCalculator;
  private reliabilityAnalyzer: ReliabilityAnalyzer;

  constructor() {
    super('MaintenanceEngine', '1.0.0');
    this.predictiveAnalyzer = new PredictiveAnalyzer();
    this.healthIndexCalculator = new AssetHealthIndexCalculator();
    this.reliabilityAnalyzer = new ReliabilityAnalyzer();
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('Predictive Maintenance & Intelligent Asset Management Engine initialized');
  }

  async validate(): Promise<boolean> {
    this.logger.info('Validating PMIAMP Engine configuration');
    return true;
  }

  async registerAsset(card: Omit<SmartAssetCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<SmartAssetCard> {
    this.setStatus('running');
    const id = `ASSET-${card.assetType}-${Date.now()}`;
    const now = new Date().toISOString();
    const asset: SmartAssetCard = {
      ...card,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.assets.set(id, asset);
    this.assetLifecycles.set(id, [{
      stage: 'Registered',
      date: now,
      description: `Asset registered as ${card.assetType}`,
      performedBy: 'System'
    }]);
    this.logger.info(`Asset registered: ${id} (${card.assetType})`);
    this.setStatus('idle');
    return asset;
  }

  async getAsset(assetId: string): Promise<SmartAssetCard | undefined> {
    return this.assets.get(assetId);
  }

  async updateAsset(assetId: string, updates: Partial<SmartAssetCard>): Promise<SmartAssetCard> {
    const existing = this.assets.get(assetId);
    if (!existing) throw new Error(`Asset not found: ${assetId}`);
    const updated: SmartAssetCard = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };
    this.assets.set(assetId, updated);
    return updated;
  }

  async retireAsset(assetId: string): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);
    asset.status = AssetStatus.Retired;
    asset.updatedAt = new Date().toISOString();
    this.assets.set(assetId, asset);
    this.addLifecycleStage(assetId, {
      stage: 'Retired',
      date: new Date().toISOString(),
      description: 'Asset retired from service',
      performedBy: 'System'
    });
    this.logger.info(`Asset retired: ${assetId}`);
  }

  async listAssets(type?: AssetType, status?: AssetStatus): Promise<SmartAssetCard[]> {
    let result = Array.from(this.assets.values());
    if (type) result = result.filter(a => a.assetType === type);
    if (status) result = result.filter(a => a.status === status);
    return result;
  }

  async searchAssets(query: string): Promise<SmartAssetCard[]> {
    const q = query.toLowerCase();
    return Array.from(this.assets.values()).filter(a =>
      a.id.toLowerCase().includes(q) ||
      a.serial.toLowerCase().includes(q) ||
      a.manufacturer.toLowerCase().includes(q) ||
      a.model.toLowerCase().includes(q) ||
      a.supplier.toLowerCase().includes(q) ||
      a.qrCode.toLowerCase().includes(q) ||
      a.barcode.toLowerCase().includes(q) ||
      a.rfid.toLowerCase().includes(q)
    );
  }

  async createSmartAssetCard(asset: SmartAssetCard): Promise<SmartAssetCard> {
    this.assets.set(asset.id, asset);
    return asset;
  }

  async getSmartAssetCard(assetId: string): Promise<SmartAssetCard | undefined> {
    return this.assets.get(assetId);
  }

  async updateAssetStatus(assetId: string, status: AssetStatus): Promise<SmartAssetCard> {
    const asset = await this.updateAsset(assetId, { status });
    this.addLifecycleStage(assetId, {
      stage: `Status: ${status}`,
      date: new Date().toISOString(),
      description: `Asset status changed to ${status}`,
      performedBy: 'System'
    });
    return asset;
  }

  async updateAssetCondition(assetId: string, condition: AssetCondition): Promise<void> {
    await this.updateAsset(assetId, { condition });
  }

  async linkDigitalTwin(assetId: string, twinLink: DigitalTwinLink): Promise<void> {
    this.digitalTwins.set(assetId, twinLink);
    await this.updateAsset(assetId, { digitalTwinLink: twinLink.modelUrl });
  }

  async linkIoTPlatform(assetId: string, iot: IoTPlatformData): Promise<void> {
    this.iotPlatforms.set(assetId, iot);
  }

  async linkKnowledgeGraph(assetId: string, kg: KnowledgeGraphLink): Promise<void> {
    this.knowledgeGraphs.set(assetId, kg);
  }

  async getAssetLifecycle(assetId: string): Promise<AssetLifecycleStage[]> {
    return this.assetLifecycles.get(assetId) || [];
  }

  async calculateFinancialIntelligence(assetId: string): Promise<FinancialIntelligence> {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);

    const assetWorkOrders = Array.from(this.workOrders.values())
      .filter(w => w.assetId === assetId);
    const assetFailures = this.failures.get(assetId) || [];

    const annualMaintenanceCost = assetWorkOrders
      .filter(w => {
        const d = new Date(w.createdAt);
        const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
        return d.getTime() > yearAgo && w.status === 'Completed';
      })
      .reduce((s, w) => s + (w.actualCost || w.estimatedCost || 0), 0);

    const totalDowntime = assetFailures.reduce((s, f) => s + f.downtimeHours, 0);
    const avgHourlyCost = annualMaintenanceCost / 8760 || 100;
    const downtimeCost = totalDowntime * avgHourlyCost * 2;

    const replacementCost = 50000;
    const installed = new Date(asset.installDate).getTime();
    const ageYears = (Date.now() - installed) / (1000 * 60 * 60 * 24 * 365);
    const remainingYears = Math.max(0, (asset.designLife || 20) - ageYears);
    const lifecycleCost = annualMaintenanceCost * Math.min(ageYears, asset.designLife || 20) +
      (assetFailures.length * 5000) + replacementCost;
    const remainingLifeValue = replacementCost * (remainingYears / (asset.designLife || 20));

    const totalOperatingHours = assetFailures.reduce((s, f) => s + f.downtimeHours, 0) + 8760;
    const costPerOperatingHour = totalOperatingHours > 0 ? lifecycleCost / totalOperatingHours : 0;
    const maintenanceToReplacementRatio = replacementCost > 0 ? annualMaintenanceCost / replacementCost : 0;
    const roa = replacementCost > 0 ? ((remainingLifeValue - lifecycleCost) / replacementCost) * 100 : 0;

    return {
      assetId,
      annualMaintenanceCost: Math.round(annualMaintenanceCost),
      downtimeCost: Math.round(downtimeCost),
      replacementCost,
      lifecycleCost: Math.round(lifecycleCost),
      remainingLifeValue: Math.round(remainingLifeValue),
      costPerOperatingHour: Math.round(costPerOperatingHour * 100) / 100,
      maintenanceToReplacementRatio: Math.round(maintenanceToReplacementRatio * 100) / 100,
      roa: Math.round(roa * 100) / 100,
      currency: 'SAR',
      fiscalYear: new Date().getFullYear().toString()
    };
  }

  async ingestSensorData(data: ConditionMonitoringData): Promise<void> {
    const existing = this.sensorData.get(data.assetId) || [];
    existing.push(data);
    this.sensorData.set(data.assetId, existing);
    this.logger.debug(`Sensor data ingested for asset ${data.assetId}`);
  }

  async ingestBatchSensorData(data: ConditionMonitoringData[]): Promise<void> {
    for (const d of data) {
      await this.ingestSensorData(d);
    }
    this.logger.info(`Batch sensor data ingested: ${data.length} records`);
  }

  async getLatestReadings(assetId: string): Promise<ConditionMonitoringData | undefined> {
    const data = this.sensorData.get(assetId);
    if (!data || data.length === 0) return undefined;
    return data[data.length - 1];
  }

  async getReadingHistory(assetId: string, from: string, to: string): Promise<ConditionMonitoringData[]> {
    const data = this.sensorData.get(assetId) || [];
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();
    return data.filter(d => {
      const t = new Date(d.timestamp).getTime();
      return t >= fromTime && t <= toTime;
    });
  }

  async detectAnomalies(assetId: string): Promise<AnomalyReport[]> {
    const data = this.sensorData.get(assetId);
    if (!data || data.length < 3) return [];

    const recent = data.slice(-10);
    const anomalies: AnomalyReport[] = [];

    const temps = recent.filter(d => d.temperature !== null).map(d => d.temperature!);
    if (temps.length >= 3) {
      const avgTemp = temps.reduce((s, v) => s + v, 0) / temps.length;
      const maxTemp = Math.max(...temps);
      if (maxTemp > avgTemp * 1.3 && maxTemp > 75) {
        anomalies.push({
          parameter: 'Temperature', value: maxTemp,
          threshold: Math.round(avgTemp * 1.3),
          severity: 'High', detectedAt: new Date().toISOString(),
          recommendation: 'Check cooling system and reduce load immediately'
        });
      }
    }

    const vibs = recent.filter(d => d.vibration !== null).map(d => d.vibration!);
    if (vibs.length >= 3) {
      const avgVib = vibs.reduce((s, v) => s + v, 0) / vibs.length;
      const maxVib = Math.max(...vibs);
      if (maxVib > avgVib * 1.5 && maxVib > 8) {
        anomalies.push({
          parameter: 'Vibration', value: maxVib,
          threshold: Math.round(avgVib * 1.5),
          severity: 'Critical', detectedAt: new Date().toISOString(),
          recommendation: 'Immediate bearing inspection required. Possible misalignment or wear.'
        });
      }
    }

    const pressures = recent.filter(d => d.pressure !== null).map(d => d.pressure!);
    if (pressures.length >= 3) {
      const minP = Math.min(...pressures);
      const maxP = Math.max(...pressures);
      if (minP < 50) {
        anomalies.push({
          parameter: 'Pressure', value: minP,
          threshold: 50, severity: 'High',
          detectedAt: new Date().toISOString(),
          recommendation: 'Check for leaks or pump failure. Pressure critically low.'
        });
      }
      if (maxP > 160) {
        anomalies.push({
          parameter: 'Pressure', value: maxP,
          threshold: 160, severity: 'High',
          detectedAt: new Date().toISOString(),
          recommendation: 'Check for blockages or valve malfunction. Pressure critically high.'
        });
      }
    }

    return anomalies;
  }

  async getSensorHealth(assetId: string): Promise<SensorHealthStatus> {
    const data = this.sensorData.get(assetId) || [];
    const totalSensors = 6;
    const activeSensors = data.length > 0
      ? ['temperature', 'vibration', 'noise', 'pressure', 'energy', 'cycles']
          .filter(p => data.some(d => (d as any)[p] !== null)).length
      : 0;
    const lastData = data.length > 0 ? data[data.length - 1].timestamp : 'N/A';
    const dataGaps = data.length > 0
      ? Math.max(0, Math.floor((Date.now() - new Date(data[data.length - 1].timestamp).getTime()) / (1000 * 60 * 60)))
      : 999;
    const overallHealth: 'Good' | 'Fair' | 'Poor' =
      dataGaps > 48 ? 'Poor' : dataGaps > 12 ? 'Fair' : 'Good';

    return { assetId, activeSensors, totalSensors, lastDataReceived: lastData, dataGaps, overallHealth };
  }

  async analyzeFailurePatterns(assetId: string): Promise<PredictiveAnalysis> {
    const failures = this.failures.get(assetId) || [];
    return this.predictiveAnalyzer.analyzeFailurePatterns(assetId, failures);
  }

  async analyzeMaintenanceHistory(assetId: string): Promise<PredictiveAnalysis> {
    const orders = Array.from(this.workOrders.values()).filter(w => w.assetId === assetId);
    return this.predictiveAnalyzer.analyzeMaintenanceHistory(assetId, orders);
  }

  async analyzeOperationalBehavior(assetId: string): Promise<PredictiveAnalysis> {
    const data = this.sensorData.get(assetId) || [];
    return this.predictiveAnalyzer.analyzeOperationalBehavior(assetId, data);
  }

  async analyzeManufacturerData(assetId: string): Promise<PredictiveAnalysis> {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);
    return this.predictiveAnalyzer.analyzeManufacturerData(assetId, asset);
  }

  async analyzeSensorTrends(assetId: string): Promise<PredictiveAnalysis> {
    const data = this.sensorData.get(assetId) || [];
    return this.predictiveAnalyzer.analyzeSensorTrends(assetId, data);
  }

  async analyzeEnvironmentalImpact(assetId: string): Promise<PredictiveAnalysis> {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);
    return this.predictiveAnalyzer.analyzeEnvironmentalImpact(assetId, asset);
  }

  async comprehensiveAnalysis(assetId: string): Promise<AggregatedPredictiveAnalysis> {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);
    const sensorData = this.sensorData.get(assetId) || [];
    const failures = this.failures.get(assetId) || [];
    const workOrders = Array.from(this.workOrders.values()).filter(w => w.assetId === assetId);
    return this.predictiveAnalyzer.comprehensiveAnalysis(assetId, asset, sensorData, failures, workOrders);
  }

  async createWorkOrder(order: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkOrder> {
    const id = `WO-${order.type}-${Date.now()}`;
    const now = new Date().toISOString();
    const workOrder: WorkOrder = { ...order, id, createdAt: now, updatedAt: now };
    this.workOrders.set(id, workOrder);
    this.logger.info(`Work order created: ${id} (${order.type}) for asset ${order.assetId}`);

    if (order.type === 'Emergency') {
      const asset = this.assets.get(order.assetId);
      if (asset) {
        asset.status = AssetStatus.UnderMaintenance;
        this.assets.set(asset.id, asset);
      }
    }

    return workOrder;
  }

  async getWorkOrder(orderId: string): Promise<WorkOrder | undefined> {
    return this.workOrders.get(orderId);
  }

  async updateWorkOrder(orderId: string, updates: Partial<WorkOrder>): Promise<WorkOrder> {
    const existing = this.workOrders.get(orderId);
    if (!existing) throw new Error(`Work order not found: ${orderId}`);
    const updated: WorkOrder = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };
    this.workOrders.set(orderId, updated);
    return updated;
  }

  async assignWorkOrder(orderId: string, technician: string): Promise<WorkOrder> {
    return this.updateWorkOrder(orderId, { technician, status: WorkOrderStatus.Assigned });
  }

  async completeWorkOrder(orderId: string, findings: string, actualHours: number, actualCost: number): Promise<WorkOrder> {
    const wo = await this.updateWorkOrder(orderId, {
      status: WorkOrderStatus.Completed,
      findings,
      actualHours,
      actualCost,
      completedDate: new Date().toISOString()
    });

    const asset = this.assets.get(wo.assetId);
    if (asset && asset.status === AssetStatus.UnderMaintenance) {
      asset.status = AssetStatus.Operational;
      this.assets.set(asset.id, asset);
    }

    return wo;
  }

  async cancelWorkOrder(orderId: string): Promise<void> {
    await this.updateWorkOrder(orderId, { status: WorkOrderStatus.Cancelled });
  }

  async listWorkOrders(assetId?: string, type?: WorkOrderType, status?: WorkOrderStatus): Promise<WorkOrder[]> {
    let result = Array.from(this.workOrders.values());
    if (assetId) result = result.filter(w => w.assetId === assetId);
    if (type) result = result.filter(w => w.type === type);
    if (status) result = result.filter(w => w.status === status);
    return result;
  }

  async getWorkOrdersByTechnician(technician: string): Promise<WorkOrder[]> {
    return Array.from(this.workOrders.values()).filter(w => w.technician === technician);
  }

  async generateWorkOrderFromAnalysis(analysis: PredictiveAnalysis): Promise<WorkOrder> {
    const type = analysis.severity === SeverityLevel.Critical || analysis.severity === SeverityLevel.Catastrophic
      ? WorkOrderType.Emergency
      : analysis.failureProbability > 0.5 ? WorkOrderType.Predictive : WorkOrderType.Inspection;

    const asset = this.assets.get(analysis.assetId);
    const title = `${type === WorkOrderType.Emergency ? 'EMERGENCY' : type === WorkOrderType.Predictive ? 'Predictive' : 'Inspection'}: ${asset?.assetType || 'Asset'} Maintenance - ${analysis.severity}`;

    return this.createWorkOrder({
      type,
      assetId: analysis.assetId,
      assetType: asset?.assetType || AssetType.HVAC,
      title,
      description: `Auto-generated from predictive analysis. Failure probability: ${(analysis.failureProbability * 100).toFixed(1)}%. Severity: ${analysis.severity}. ${analysis.recommendedActions.join('. ')}`,
      priority: analysis.severity === SeverityLevel.Critical || analysis.severity === SeverityLevel.Catastrophic
        ? AssetCriticality.Critical : AssetCriticality.High,
      status: WorkOrderStatus.Draft,
      technician: '',
      contract: '',
      location: asset?.location || { site: '', building: '', floor: '', zone: '', coordinates: { lat: 0, lng: 0 } },
      inventory: [],
      estimatedHours: type === WorkOrderType.Emergency ? 8 : 4,
      actualHours: 0,
      estimatedCost: type === WorkOrderType.Emergency ? 5000 : 2000,
      actualCost: 0,
      scheduledDate: new Date().toISOString(),
      completedDate: '',
      findings: '',
      recommendations: analysis.recommendedActions.join('; ')
    });
  }

  async registerPart(part: Omit<SparePart, 'id'>): Promise<SparePart> {
    const id = `PART-${Date.now()}`;
    const newPart: SparePart = { ...part, id };
    this.spareParts.set(id, newPart);
    return newPart;
  }

  async getPart(partId: string): Promise<SparePart | undefined> {
    return this.spareParts.get(partId);
  }

  async updateStock(partId: string, quantity: number): Promise<SparePart> {
    const part = this.spareParts.get(partId);
    if (!part) throw new Error(`Part not found: ${partId}`);
    part.quantity = quantity;
    this.spareParts.set(partId, part);
    return part;
  }

  async reserveParts(orderId: string, parts: { partId: string; quantity: number }[]): Promise<boolean> {
    for (const req of parts) {
      const part = this.spareParts.get(req.partId);
      if (!part || part.quantity < req.quantity) return false;
    }
    for (const req of parts) {
      const part = this.spareParts.get(req.partId)!;
      part.quantity -= req.quantity;
      this.spareParts.set(req.partId, part);
    }
    return true;
  }

  async releaseParts(orderId: string): Promise<void> {
    this.logger.info(`Parts released for order: ${orderId}`);
  }

  async checkAvailability(partId: string, quantity: number): Promise<boolean> {
    const part = this.spareParts.get(partId);
    return part ? part.quantity >= quantity : false;
  }

  async getLowStockParts(): Promise<SparePart[]> {
    return Array.from(this.spareParts.values()).filter(p => p.quantity <= p.minStock);
  }

  async linkPartToAsset(partId: string, assetId: string): Promise<void> {
    const part = this.spareParts.get(partId);
    if (!part) throw new Error(`Part not found: ${partId}`);
    if (!part.compatibleAssets.includes(assetId)) {
      part.compatibleAssets.push(assetId);
      this.spareParts.set(partId, part);
    }
  }

  async findCompatibleParts(assetType: AssetType, model: string): Promise<SparePart[]> {
    return Array.from(this.spareParts.values()).filter(p =>
      p.compatibleAssets.some(a => a.includes(assetType) || a.includes(model))
    );
  }

  async recordFailure(assetId: string, description: string, downtime: number, cost: number): Promise<FailureAnalysis> {
    const analysis: FailureAnalysis = {
      assetId,
      failureDate: new Date().toISOString(),
      failureDescription: description,
      mechanical: [],
      electrical: [],
      electronic: [],
      software: [],
      operational: [{ factor: 'Operational Stress', contributor: true, severity: 5, description: 'Operational failure' }],
      environmental: [],
      human: [],
      rootCause: 'Operational',
      recommendations: ['Investigate root cause', 'Update maintenance schedule'],
      costOfFailure: cost,
      downtimeHours: downtime
    };

    const existing = this.failures.get(assetId) || [];
    existing.push(analysis);
    this.failures.set(assetId, existing);

    const asset = this.assets.get(assetId);
    if (asset) {
      asset.status = AssetStatus.UnderMaintenance;
      this.assets.set(assetId, asset);
    }

    return analysis;
  }

  async analyzeRootCause(assetId: string): Promise<FailureAnalysis> {
    const failures = this.failures.get(assetId) || [];
    if (failures.length === 0) throw new Error(`No failures recorded for asset ${assetId}`);
    return failures[failures.length - 1];
  }

  async getFailureHistory(assetId: string): Promise<FailureAnalysis[]> {
    return this.failures.get(assetId) || [];
  }

  async classifyFailure(failure: FailureAnalysis): Promise<FailureCategoryResult> {
    return this.reliabilityAnalyzer.classifyFailure(failure);
  }

  async getFailureStatistics(assetId: string): Promise<FailureStatistics> {
    const failures = this.failures.get(assetId) || [];
    const stats = this.reliabilityAnalyzer.getFailureStatistics(failures);
    return { ...stats, assetId };
  }

  async calculateMTBF(assetId: string, from: string, to: string): Promise<number> {
    const failures = this.getFailuresInRange(assetId, from, to);
    const hours = this.getOperatingHours(from, to);
    return this.reliabilityAnalyzer.calculateMTBF(failures, hours);
  }

  async calculateMTTR(assetId: string, from: string, to: string): Promise<number> {
    const failures = this.getFailuresInRange(assetId, from, to);
    return this.reliabilityAnalyzer.calculateMTTR(failures);
  }

  async calculateAvailability(assetId: string, from: string, to: string): Promise<number> {
    const mtbf = await this.calculateMTBF(assetId, from, to);
    const mttr = await this.calculateMTTR(assetId, from, to);
    return this.reliabilityAnalyzer.calculateAvailability(mtbf, mttr);
  }

  async calculateReliability(assetId: string, missionTime: number): Promise<number> {
    const failures = this.failures.get(assetId) || [];
    const hours = 8760;
    const mtbf = this.reliabilityAnalyzer.calculateMTBF(failures, hours);
    return this.reliabilityAnalyzer.calculateReliability(mtbf, missionTime);
  }

  async calculateFailureRate(assetId: string, from: string, to: string): Promise<number> {
    const failures = this.getFailuresInRange(assetId, from, to);
    const hours = this.getOperatingHours(from, to);
    return this.reliabilityAnalyzer.calculateFailureRate(failures.length, hours);
  }

  async getReliabilityMetrics(assetId: string, from: string, to: string): Promise<ReliabilityMetrics> {
    const failures = this.getFailuresInRange(assetId, from, to);
    const workOrders = Array.from(this.workOrders.values()).filter(w => w.assetId === assetId);
    const hours = this.getOperatingHours(from, to);
    return this.reliabilityAnalyzer.getReliabilityMetrics(assetId, failures, workOrders, hours, from, to);
  }

  async analyzeTrend(assetId: string): Promise<import('./types').ReliabilityTrend> {
    const failures = this.failures.get(assetId) || [];
    const workOrders = Array.from(this.workOrders.values()).filter(w => w.assetId === assetId);
    return this.reliabilityAnalyzer.analyzeTrend(failures, workOrders);
  }

  async predictRemainingLife(assetId: string): Promise<RemainingLifePrediction> {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);
    const failures = this.failures.get(assetId) || [];
    const result = this.reliabilityAnalyzer.predictRemainingLife(
      assetId, failures, asset.designLife, asset.installDate);
    return {
      assetId,
      estimatedRemainingYears: result.estimatedRemainingYears,
      confidence: result.confidence,
      basedOn: result.basedOn,
      recommendation: result.recommendation
    };
  }

  calculateAssetHealthIndex(assetId: string): AssetHealthIndex {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);
    const sensorData = this.sensorData.get(assetId) || [];
    const failures = this.failures.get(assetId) || [];
    const workOrders = Array.from(this.workOrders.values()).filter(w => w.assetId === assetId);
    return this.healthIndexCalculator.calculate(asset, sensorData, failures, workOrders);
  }

  private addLifecycleStage(assetId: string, stage: AssetLifecycleStage): void {
    const stages = this.assetLifecycles.get(assetId) || [];
    stages.push(stage);
    this.assetLifecycles.set(assetId, stages);
  }

  private getFailuresInRange(assetId: string, from: string, to: string): FailureAnalysis[] {
    const failures = this.failures.get(assetId) || [];
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();
    return failures.filter(f => {
      const t = new Date(f.failureDate).getTime();
      return t >= fromTime && t <= toTime;
    });
  }

  private getOperatingHours(from: string, to: string): number {
    return (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60);
  }
}
