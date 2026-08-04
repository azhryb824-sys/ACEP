export declare enum SensorType {
    Temperature = "Temperature",
    Humidity = "Humidity",
    Pressure = "Pressure",
    WindSpeed = "WindSpeed",
    AirQuality = "AirQuality",
    Rain = "Rain",
    SolarRadiation = "SolarRadiation",
    Vibration = "Vibration",
    Tilt = "Tilt",
    Crack = "Crack",
    Strain = "Strain",
    Load = "Load",
    Settlement = "Settlement",
    Hours = "Hours",
    Fuel = "Fuel",
    Oil = "Oil",
    Rpm = "Rpm",
    Energy = "Energy",
    Gas = "Gas",
    Smoke = "Smoke",
    Fire = "Fire",
    Fall = "Fall",
    ZoneEntry = "ZoneEntry",
    Helmet = "Helmet",
    Tracker = "Tracker",
    Water = "Water",
    Electricity = "Electricity",
    FuelMeter = "FuelMeter"
}
export declare enum SensorCategory {
    Environmental = "Environmental",
    Structural = "Structural",
    Equipment = "Equipment",
    Safety = "Safety",
    Utility = "Utility"
}
export declare const SensorCategoryMap: Record<SensorType, SensorCategory>;
export declare enum SensorStatus {
    Online = "Online",
    Offline = "Offline",
    Error = "Error",
    Calibrating = "Calibrating",
    Maintenance = "Maintenance"
}
export declare enum CommunicationProtocol {
    MQTT = "MQTT",
    CoAP = "CoAP",
    HTTP = "HTTP",
    WebSocket = "WebSocket",
    LoRaWAN = "LoRaWAN",
    Zigbee = "Zigbee",
    Bluetooth = "Bluetooth",
    Modbus = "Modbus",
    OPCUA = "OPCUA",
    BACnet = "BACnet"
}
export declare enum EventType {
    ThresholdCrossed = "ThresholdCrossed",
    AnomalyDetected = "AnomalyDetected",
    EquipmentFailure = "EquipmentFailure",
    SafetyViolation = "SafetyViolation",
    ZoneBreach = "ZoneBreach",
    EnvironmentalAlert = "EnvironmentalAlert",
    StructuralAlert = "StructuralAlert",
    MaintenanceRequired = "MaintenanceRequired",
    EnergySpike = "EnergySpike",
    CommunicationLost = "CommunicationLost",
    FirmwareUpdateAvailable = "FirmwareUpdateAvailable",
    CalibrationRequired = "CalibrationRequired",
    ManualOverride = "ManualOverride",
    SystemStartup = "SystemStartup",
    SystemShutdown = "SystemShutdown"
}
export declare enum AlertSeverity {
    Critical = "Critical",
    High = "High",
    Medium = "Medium",
    Low = "Low",
    Info = "Info"
}
export declare enum AlertType {
    EquipmentFailure = "EquipmentFailure",
    SafetyHazard = "SafetyHazard",
    StructuralIssue = "StructuralIssue",
    EnvironmentalHazard = "EnvironmentalHazard",
    EnergyAnomaly = "EnergyAnomaly",
    MaintenanceAlert = "MaintenanceAlert",
    SecurityBreach = "SecurityBreach",
    CommunicationFailure = "CommunicationFailure",
    CalibrationAlert = "CalibrationAlert",
    GeneralAlert = "GeneralAlert"
}
export declare enum CameraType {
    Fixed = "Fixed",
    PTZ = "PTZ",
    Thermal = "Thermal",
    Drone = "Drone"
}
export declare enum AnalysisType {
    ProgressTracking = "ProgressTracking",
    SafetyCompliance = "SafetyCompliance",
    EquipmentStatus = "EquipmentStatus",
    MaterialStorage = "MaterialStorage",
    ObstacleDetection = "ObstacleDetection",
    WorkerTracking = "WorkerTracking",
    QualityInspection = "QualityInspection"
}
export declare enum TrackingMethod {
    RFID = "RFID",
    GPS = "GPS",
    BLE = "BLE",
    UWB = "UWB"
}
export declare enum PrivacyLevel {
    Full = "Full",
    Anonymized = "Anonymized",
    Aggregated = "Aggregated",
    LocationOnly = "LocationOnly"
}
export declare enum EnergyType {
    Electricity = "Electricity",
    Water = "Water",
    Fuel = "Fuel",
    Gas = "Gas"
}
export declare enum FirmwareUpdateStatus {
    Pending = "Pending",
    Downloading = "Downloading",
    Ready = "Ready",
    Installing = "Installing",
    Completed = "Completed",
    Failed = "Failed",
    RolledBack = "RolledBack"
}
export interface SensorReading {
    sensorId: string;
    timestamp: string;
    value: number;
    unit: string;
    quality: number;
    confidence: number;
    metadata?: Record<string, unknown>;
}
export interface SensorConfig {
    id: string;
    type: SensorType;
    name: string;
    location: string;
    status: SensorStatus;
    protocol: CommunicationProtocol;
    samplingRate: number;
    unit: string;
    thresholds?: SensorThresholds;
    firmware?: string;
    batteryLevel?: number;
    lastReading?: SensorReading;
    metadata?: Record<string, unknown>;
}
export interface SensorThresholds {
    min?: number;
    max?: number;
    warningMin?: number;
    warningMax?: number;
    criticalMin?: number;
    criticalMax?: number;
    rateOfChange?: number;
}
export interface EdgeGatewayConfig {
    id: string;
    name: string;
    location: string;
    protocol: CommunicationProtocol;
    bufferSize: number;
    syncInterval: number;
    offlineCacheEnabled: boolean;
    localAIEnabled: boolean;
    compressionEnabled: boolean;
    firmwareVersion: string;
    connectedSensors: string[];
    networkConfig?: NetworkConfig;
    lastSync?: string;
    uptime?: number;
}
export interface NetworkConfig {
    ssid?: string;
    ipAddress?: string;
    macAddress?: string;
    signalStrength: number;
    bandwidth: number;
    latency: number;
    backupEnabled: boolean;
}
export interface CriticalEvent {
    id: string;
    type: EventType;
    severity: AlertSeverity;
    sourceId: string;
    sourceType: string;
    description: string;
    descriptionAr?: string;
    timestamp: string;
    value?: number;
    threshold?: number;
    location?: string;
    affectedParties?: AffectedParty[];
    requiresImmediateAction: boolean;
    suggestedAction?: string;
    acknowledged: boolean;
    acknowledgedBy?: string;
    resolved: boolean;
    resolvedAt?: string;
    metadata?: Record<string, unknown>;
}
export interface AffectedParty {
    role: string;
    contact: string;
    notificationMethod: 'Email' | 'SMS' | 'Push' | 'Dashboard' | 'Alarm';
    notified: boolean;
    notifiedAt?: string;
}
export interface Alert {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    description: string;
    source: string;
    timestamp: string;
    acknowledged: boolean;
    acknowledgedBy?: string;
    resolved: boolean;
    resolvedAt?: string;
    relatedEventId?: string;
    actions?: AlertAction[];
    metadata?: Record<string, unknown>;
}
export interface AlertAction {
    id: string;
    description: string;
    assignedTo?: string;
    status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
    dueDate?: string;
    completedAt?: string;
}
export interface CameraConfig {
    id: string;
    type: CameraType;
    name: string;
    location: string;
    rtspUrl?: string;
    ptzConfig?: PTZConfig;
    thermalConfig?: ThermalConfig;
    droneConfig?: DroneConfig;
    resolution: string;
    fps: number;
    enabled: boolean;
    capabilities: AnalysisType[];
    lastFrame?: string;
    status: 'Online' | 'Offline' | 'Error';
}
export interface PTZConfig {
    panRange: [number, number];
    tiltRange: [number, number];
    zoomRange: [number, number];
    presetPositions: PTZPreset[];
}
export interface PTZPreset {
    id: string;
    name: string;
    pan: number;
    tilt: number;
    zoom: number;
}
export interface ThermalConfig {
    minTemp: number;
    maxTemp: number;
    sensitivity: number;
    colorPalette: string;
    spotTemp: number;
    lineTemp?: number[];
}
export interface DroneConfig {
    flightPlan: string;
    altitude: number;
    speed: number;
    batteryThreshold: number;
    returnToHome: boolean;
    geofence: GeoFencePoint[];
}
export interface GeoFencePoint {
    lat: number;
    lng: number;
    alt?: number;
}
export interface EquipmentTracking {
    equipmentId: string;
    name: string;
    type: string;
    location: GeoLocation;
    status: 'Idle' | 'Operating' | 'Maintenance' | 'Offline' | 'Transit';
    hours: number;
    fuel: number;
    lastMaintenance: string;
    nextMaintenance: string;
    operator?: string;
    readings: SensorReading[];
    alerts: Alert[];
}
export interface GeoLocation {
    lat: number;
    lng: number;
    alt?: number;
    accuracy?: number;
}
export interface WorkerTracking {
    workerId: string;
    name: string;
    role: string;
    zone: string;
    location: GeoLocation;
    trackingMethod: TrackingMethod;
    privacyLevel: PrivacyLevel;
    helmetOn: boolean;
    vestOn: boolean;
    lastCheckIn: string;
    heartRate?: number;
    temperature?: number;
    工作时间?: number;
    metadata?: Record<string, unknown>;
}
export interface EnergyMonitoring {
    type: EnergyType;
    consumption: number;
    unit: string;
    efficiency: number;
    cost: number;
    emissions: number;
    peakDemand: number;
    averageDemand: number;
    timestamp: string;
    trend: 'Increasing' | 'Stable' | 'Decreasing';
    alerts: EnergyAlert[];
}
export interface EnergyAlert {
    type: string;
    severity: AlertSeverity;
    description: string;
    timestamp: string;
    value: number;
    threshold: number;
}
export interface DeviceIdentity {
    deviceId: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    firmwareVersion: string;
    hardwareVersion: string;
    certificateId?: string;
    publicKey?: string;
    enrollmentDate: string;
    lastAuthenticated?: string;
    trusted: boolean;
}
export interface FirmwareInfo {
    currentVersion: string;
    availableVersion?: string;
    releaseDate?: string;
    changelog?: string[];
    size?: number;
    checksum?: string;
    updateStatus: FirmwareUpdateStatus;
    lastUpdateCheck?: string;
    updateProgress?: number;
}
export interface CybersecurityConfig {
    encryptionEnabled: boolean;
    encryptionAlgorithm: string;
    authenticationMethod: string;
    certificateRotationDays: number;
    firewallEnabled: boolean;
    intrusionDetection: boolean;
    allowList: string[];
    blockList: string[];
    auditLogging: boolean;
    logRetentionDays: number;
    lastSecurityAudit?: string;
    complianceStandards: string[];
}
export interface EdgeDataPoint {
    sensorId: string;
    timestamp: string;
    value: number;
    unit: string;
    quality: number;
    confidence: number;
    processedLocally: boolean;
    compressed: boolean;
    originalSize?: number;
    compressedSize?: number;
}
export interface EventClassification {
    eventId: string;
    type: EventType;
    subType?: string;
    severity: AlertSeverity;
    confidence: number;
    description: string;
    rootCause?: string;
    affectedAssets: string[];
    requiresEscalation: boolean;
}
export interface NotificationDispatch {
    id: string;
    eventId: string;
    recipients: string[];
    channels: string[];
    message: string;
    sentAt: string;
    delivered: boolean;
    readAt?: string;
}
export interface InspectionOrder {
    id: string;
    eventId: string;
    title: string;
    description: string;
    assignedTo: string;
    priority: AlertSeverity;
    createdAt: string;
    scheduledAt?: string;
    completedAt?: string;
    status: 'Pending' | 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
    findings?: string;
}
export interface CameraAnalysisResult {
    cameraId: string;
    analysisType: AnalysisType;
    timestamp: string;
    confidence: number;
    detections: Detection[];
    summary: string;
    alertGenerated: boolean;
    alertId?: string;
}
export interface Detection {
    label: string;
    confidence: number;
    boundingBox?: BoundingBox;
    temperature?: number;
    distance?: number;
}
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface DataFusionResult {
    id: string;
    sources: string[];
    timestamp: string;
    fusedValue: number;
    confidence: number;
    method: 'Average' | 'Weighted' | 'Kalman' | 'MajorityVote' | 'Bayesian';
    individualReadings: SensorReading[];
}
export interface OfflineCacheEntry {
    id: string;
    data: EdgeDataPoint[];
    cachedAt: string;
    synced: boolean;
    syncedAt?: string;
    retryCount: number;
    size: number;
}
//# sourceMappingURL=types.d.ts.map