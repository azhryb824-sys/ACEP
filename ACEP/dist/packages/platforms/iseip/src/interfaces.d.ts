import { IEngine } from '@acep/core';
import { SensorConfig, SensorReading, SensorType, SensorStatus, EdgeGatewayConfig, CriticalEvent, AlertSeverity, CameraConfig, CameraType, AnalysisType, EquipmentTracking, WorkerTracking, EnergyMonitoring, EdgeDataPoint, EventClassification, NotificationDispatch, InspectionOrder, CameraAnalysisResult, Detection, EnergyType, FirmwareInfo, DataFusionResult, GeoLocation, EnergyAlert, AffectedParty, SensorThresholds } from './types';
export { EventClassification, NotificationDispatch, InspectionOrder } from './types';
export interface IIoTEngine extends IEngine {
    registerSensor(config: SensorConfig): Promise<string>;
    unregisterSensor(sensorId: string): Promise<void>;
    getSensor(sensorId: string): SensorConfig | undefined;
    listSensors(type?: SensorType, status?: SensorStatus): SensorConfig[];
    updateSensorStatus(sensorId: string, status: SensorStatus): Promise<void>;
    getSensorReading(sensorId: string): SensorReading | undefined;
    getSensorHistory(sensorId: string, count?: number): SensorReading[];
    ingestReading(sensorId: string, reading: SensorReading): Promise<void>;
    runDiagnostics(sensorId: string): Promise<DiagnosticResult>;
    getGatewayConfig(): EdgeGatewayConfig[];
    attachSensorToGateway(gatewayId: string, sensorId: string): Promise<void>;
    setThreshold(sensorId: string, thresholds: SensorThresholds): Promise<void>;
    fuseData(sensorIds: string[]): Promise<DataFusionResult>;
    getAnalytics(sensorId: string, from: string, to: string): Promise<SensorAnalytics>;
}
export interface DiagnosticResult {
    sensorId: string;
    status: SensorStatus;
    signalStrength: number;
    batteryLevel: number;
    lastCalibration: string;
    readingsSinceCalibration: number;
    errors: string[];
    warnings: string[];
    recommendation: string;
}
export interface SensorAnalytics {
    sensorId: string;
    sensorType: SensorType;
    period: {
        from: string;
        to: string;
    };
    readings: number;
    avg: number;
    min: number;
    max: number;
    stdDev: number;
    trend: 'Increasing' | 'Stable' | 'Decreasing' | 'Volatile';
    anomalies: SensorReading[];
    percentiles: {
        p25: number;
        p50: number;
        p75: number;
        p95: number;
    };
}
export interface IEdgeGateway {
    readonly id: string;
    readonly config: EdgeGatewayConfig;
    initialize(): Promise<void>;
    connect(): Promise<boolean>;
    disconnect(): Promise<void>;
    receiveData(sensorId: string, reading: SensorReading): Promise<void>;
    processData(data: EdgeDataPoint[]): Promise<ProcessedData>;
    runLocalInference(data: EdgeDataPoint[]): Promise<LocalInferenceResult>;
    cacheOffline(data: EdgeDataPoint[]): Promise<void>;
    syncToCloud(): Promise<void>;
    detectCriticalEvents(readings: SensorReading[]): Promise<CriticalEvent[]>;
    checkFirmwareUpdate(): Promise<FirmwareInfo | null>;
    applyFirmwareUpdate(firmware: FirmwareInfo): Promise<void>;
    getHealth(): GatewayHealth;
    getCacheSize(): number;
    flushCache(): Promise<void>;
    compressData(data: EdgeDataPoint[]): Promise<EdgeDataPoint[]>;
    filterData(data: EdgeDataPoint[]): Promise<EdgeDataPoint[]>;
}
export interface ProcessedData {
    original: EdgeDataPoint[];
    cleaned: EdgeDataPoint[];
    compressed: EdgeDataPoint[];
    outliersRemoved: number;
    anomaliesDetected: number;
    processingTime: number;
    compressionRatio: number;
}
export interface LocalInferenceResult {
    predictions: Prediction[];
    confidence: number;
    modelName: string;
    inferenceTime: number;
    recommendations: string[];
}
export interface Prediction {
    sensorId: string;
    predictedValue: number;
    actualValue?: number;
    confidence: number;
    horizon: string;
    trend: 'Up' | 'Down' | 'Stable';
}
export interface GatewayHealth {
    gatewayId: string;
    status: 'Healthy' | 'Degraded' | 'Offline';
    uptime: number;
    cpu: number;
    memory: number;
    storage: number;
    networkLatency: number;
    signalStrength: number;
    connectedSensors: number;
    cacheUsage: number;
    lastSync: string;
    errors: string[];
}
export interface ISensorManager {
    register(config: SensorConfig): Promise<string>;
    unregister(sensorId: string): Promise<void>;
    get(sensorId: string): SensorConfig | undefined;
    list(type?: SensorType, status?: SensorStatus): SensorConfig[];
    updateStatus(sensorId: string, status: SensorStatus): Promise<void>;
    getReading(sensorId: string): SensorReading | undefined;
    getHistory(sensorId: string, count?: number): SensorReading[];
    ingest(sensorId: string, reading: SensorReading): Promise<void>;
    calibrate(sensorId: string): Promise<void>;
    runDiagnostics(sensorId: string): Promise<DiagnosticResult>;
    setThresholds(sensorId: string, thresholds: SensorThresholds): Promise<void>;
    getAnalytics(sensorId: string, from: string, to: string): Promise<SensorAnalytics>;
}
export interface IEventProcessor {
    processEvents(readings: SensorReading[], sensors: SensorConfig[]): Promise<CriticalEvent[]>;
    detectEvents(readings: SensorReading[], sensors: SensorConfig[]): Promise<CriticalEvent[]>;
    classifyEvent(event: CriticalEvent): Promise<EventClassification>;
    assessSeverity(event: CriticalEvent): Promise<AlertSeverity>;
    determineAffectedParties(event: CriticalEvent): Promise<AffectedParty[]>;
    dispatchNotifications(event: CriticalEvent, parties: AffectedParty[]): Promise<NotificationDispatch[]>;
    triggerAgents(event: CriticalEvent): Promise<string[]>;
    updateDigitalTwin(event: CriticalEvent): Promise<void>;
    createAuditLog(event: CriticalEvent): Promise<void>;
    createInspectionOrder(event: CriticalEvent): Promise<InspectionOrder | null>;
    acknowledgeEvent(eventId: string, userId: string): Promise<void>;
    resolveEvent(eventId: string, resolution: string): Promise<void>;
    getActiveEvents(): CriticalEvent[];
    getEventHistory(limit?: number): CriticalEvent[];
}
export interface ICameraAnalyzer {
    registerCamera(config: CameraConfig): Promise<string>;
    unregisterCamera(cameraId: string): Promise<void>;
    getCamera(cameraId: string): CameraConfig | undefined;
    listCameras(type?: CameraType): CameraConfig[];
    captureFrame(cameraId: string): Promise<string>;
    analyzeFrame(cameraId: string, analysisType: AnalysisType): Promise<CameraAnalysisResult>;
    analyzeProgress(cameraId: string): Promise<CameraAnalysisResult>;
    analyzeSafety(cameraId: string): Promise<CameraAnalysisResult>;
    analyzeEquipment(cameraId: string): Promise<CameraAnalysisResult>;
    analyzeMaterials(cameraId: string): Promise<CameraAnalysisResult>;
    detectObstacles(cameraId: string): Promise<CameraAnalysisResult>;
    trackWorkers(cameraId: string): Promise<CameraAnalysisResult>;
    startStream(cameraId: string): Promise<void>;
    stopStream(cameraId: string): Promise<void>;
    movePTZ(cameraId: string, pan: number, tilt: number, zoom: number): Promise<void>;
    goToPreset(cameraId: string, presetId: string): Promise<void>;
    getDetections(cameraId: string, analysisType: AnalysisType): Promise<Detection[]>;
}
export interface IEquipmentTracker {
    registerEquipment(equipment: EquipmentTracking): Promise<string>;
    unregisterEquipment(equipmentId: string): Promise<void>;
    getEquipment(equipmentId: string): EquipmentTracking | undefined;
    listEquipment(status?: string): EquipmentTracking[];
    updateLocation(equipmentId: string, location: GeoLocation): Promise<void>;
    updateStatus(equipmentId: string, status: string): Promise<void>;
    recordHours(equipmentId: string, hours: number): Promise<void>;
    recordFuel(equipmentId: string, fuel: number): Promise<void>;
    scheduleMaintenance(equipmentId: string, date: string): Promise<void>;
    getUtilization(equipmentId: string, from: string, to: string): Promise<UtilizationReport>;
}
export interface UtilizationReport {
    equipmentId: string;
    totalHours: number;
    idleHours: number;
    operatingHours: number;
    maintenanceHours: number;
    utilizationRate: number;
    fuelConsumed: number;
    efficiency: number;
    period: {
        from: string;
        to: string;
    };
}
export interface IWorkerTracker {
    registerWorker(worker: WorkerTracking): Promise<string>;
    unregisterWorker(workerId: string): Promise<void>;
    getWorker(workerId: string): WorkerTracking | undefined;
    listWorkers(zone?: string): WorkerTracking[];
    updateLocation(workerId: string, location: GeoLocation): Promise<void>;
    checkIn(workerId: string, zone: string): Promise<void>;
    checkOut(workerId: string): Promise<void>;
    getZoneOccupancy(zone: string): number;
    getWorkersAtRisk(): WorkerTracking[];
    enforcePPE(workerId: string, helmet: boolean, vest: boolean): Promise<void>;
    getAttendanceReport(date: string): AttendanceReport;
}
export interface AttendanceReport {
    date: string;
    totalWorkers: number;
    checkedIn: number;
    checkedOut: number;
    absent: number;
    byZone: Record<string, number>;
    byRole: Record<string, number>;
}
export interface IEnergyMonitor {
    registerMeter(monitoring: EnergyMonitoring): Promise<string>;
    unregisterMeter(meterId: string): Promise<void>;
    getMeter(meterId: string): EnergyMonitoring | undefined;
    listMeters(type?: EnergyType): EnergyMonitoring[];
    recordConsumption(meterId: string, consumption: number): Promise<void>;
    getConsumption(meterId: string, from: string, to: string): Promise<EnergyTimeSeries>;
    detectAnomalies(meterId: string): Promise<EnergyAlert[]>;
    optimizeConsumption(meterId: string): Promise<OptimizationSuggestion[]>;
    getCostReport(meterId: string, from: string, to: string): Promise<CostReport>;
    getSustainabilityMetrics(): Promise<SustainabilityMetrics>;
}
export interface EnergyTimeSeries {
    meterId: string;
    type: EnergyType;
    dataPoints: {
        timestamp: string;
        value: number;
    }[];
    total: number;
    average: number;
    peak: number;
    unit: string;
}
export interface OptimizationSuggestion {
    id: string;
    description: string;
    potentialSavings: number;
    implementationCost: number;
    roi: number;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    status: 'Proposed' | 'Approved' | 'Implemented' | 'Rejected';
}
export interface CostReport {
    meterId: string;
    type: EnergyType;
    period: {
        from: string;
        to: string;
    };
    totalCost: number;
    averageCost: number;
    peakCost: number;
    unitCost: number;
    currency: string;
}
export interface SustainabilityMetrics {
    totalEmissions: number;
    emissionsByType: Record<string, number>;
    renewablePercentage: number;
    efficiencyScore: number;
    waterConservation: number;
    wasteReduction: number;
    carbonOffset: number;
    greenCertifications: string[];
}
//# sourceMappingURL=interfaces.d.ts.map