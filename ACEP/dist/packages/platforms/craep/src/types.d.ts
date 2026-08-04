export declare enum RobotType {
    Construction = "Construction",
    Inspection = "Inspection",
    Welding = "Welding",
    Painting = "Painting",
    Cleaning = "Cleaning",
    Survey = "Survey"
}
export declare enum ConstructionSubtype {
    Bricklaying = "Bricklaying",
    ConcretePrinting = "ConcretePrinting",
    FloorFinishing = "FloorFinishing"
}
export declare enum InspectionSubtype {
    TunnelInspection = "TunnelInspection",
    PipeInspection = "PipeInspection",
    BridgeInspection = "BridgeInspection"
}
export declare enum WeldingSubtype {
    CuttingRobot = "CuttingRobot",
    AssemblyRobot = "AssemblyRobot"
}
export declare enum PaintingSubtype {
    IndustrialPainting = "IndustrialPainting"
}
export declare enum CleaningSubtype {
    FacadeCleaning = "FacadeCleaning",
    SiteCleaning = "SiteCleaning",
    SolarCleaning = "SolarCleaning"
}
export declare enum SurveySubtype {
    SurveyRobot = "SurveyRobot",
    LaserMeasurement = "LaserMeasurement",
    LiDAR = "LiDAR"
}
export type RobotSubtype = ConstructionSubtype | InspectionSubtype | WeldingSubtype | PaintingSubtype | CleaningSubtype | SurveySubtype;
export declare enum AutonomousEquipment {
    Excavator = "Excavator",
    Bulldozer = "Bulldozer",
    Grader = "Grader",
    Loader = "Loader",
    Truck = "Truck",
    Crane = "Crane",
    Forklift = "Forklift",
    ElevatedPlatform = "ElevatedPlatform"
}
export declare enum RobotStatus {
    Idle = "Idle",
    OnMission = "OnMission",
    Charging = "Charging",
    Maintenance = "Maintenance",
    Error = "Error",
    Offline = "Offline"
}
export interface GeoLocation {
    lat: number;
    lng: number;
    altitude?: number;
}
export interface BatteryInfo {
    level: number;
    voltage: number;
    temperature: number;
    estimatedRemainingMinutes: number;
    isCharging: boolean;
}
export interface HealthStatus {
    cpu: number;
    memory: number;
    disk: number;
    sensors: Record<string, number>;
    lastDiagnostic: string;
    errorCodes: string[];
}
export interface RobotLoad {
    current: number;
    maxCapacity: number;
    unit: string;
    items: string[];
}
export interface MaintenanceRecord {
    id: string;
    date: string;
    type: string;
    description: string;
    technician: string;
    parts: string[];
    cost: number;
    nextScheduled: string;
}
export interface Robot {
    id: string;
    name: string;
    model: string;
    manufacturer: string;
    type: RobotType;
    subtype?: RobotSubtype;
    firmware: string;
    currentMission?: string;
    battery: BatteryInfo;
    health: HealthStatus;
    location: GeoLocation;
    load: RobotLoad;
    maintenance: MaintenanceRecord[];
    aiVersion: string;
    status: RobotStatus;
    capabilities: string[];
    projectId: string;
    registeredAt: string;
    lastActive: string;
    equipmentType?: AutonomousEquipment;
}
export interface MissionPath {
    start: GeoLocation;
    waypoints: GeoLocation[];
    end: GeoLocation;
    distance: number;
    estimatedDuration: number;
}
export interface MissionConstraints {
    maxSpeed?: number;
    restrictedZones?: GeoLocation[][];
    weatherLimits?: {
        maxWind: number;
        maxRain: number;
        maxTemp: number;
    };
    timeWindow?: {
        start: string;
        end: string;
    };
    energyBudget?: number;
    loadLimit?: number;
    requireSupervision?: boolean;
    requirePermit?: boolean;
}
export interface Mission {
    id: string;
    name: string;
    robotId: string;
    equipmentId?: string;
    type: RobotType;
    path: MissionPath;
    priority: number;
    time: {
        start: string;
        estimatedEnd: string;
        actualEnd?: string;
    };
    energy: {
        estimated: number;
        actual?: number;
        efficiency?: number;
    };
    constraints: MissionConstraints;
    status: 'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    quality: number;
    errors: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface CoordinationPlan {
    id: string;
    projectId: string;
    robots: string[];
    equipment: string[];
    missions: string[];
    constraints: MissionConstraints[];
    collisionPrevention: CollisionRule[];
    conflictResolution: ConflictResolutionStrategy;
    status: 'active' | 'paused' | 'completed' | 'failed';
    createdAt: string;
    updatedAt: string;
}
export interface CollisionRule {
    id: string;
    robotIds: string[];
    zone: GeoLocation[];
    priority: number;
    action: 'yield' | 'stop' | 'reroute' | 'wait';
    description: string;
}
export interface ConflictResolutionStrategy {
    method: 'priority' | 'fifo' | 'roundRobin' | 'dynamic' | 'manual';
    parameters: Record<string, number>;
    fallback: string;
}
export interface DroneMission {
    id: string;
    droneId: string;
    inspection: {
        targetArea: GeoLocation[];
        requiredSensors: string[];
        detail: string;
    };
    photography: {
        waypoints: GeoLocation[];
        resolution: string;
        overlap: number;
    };
    survey: {
        boundary: GeoLocation[];
        resolution: string;
        accuracy: number;
    };
    progressTracking: {
        interval: number;
        compareWith: string;
        generateReport: boolean;
    };
    thermal: {
        target: string;
        temperatureRange: {
            min: number;
            max: number;
        };
    };
    lidar: {
        density: number;
        classification: string[];
        generateDEM: boolean;
    };
    quantityMeasurement: {
        material: string;
        stockpileLocation: GeoLocation;
        unit: string;
    };
    status: 'pending' | 'inFlight' | 'processing' | 'completed' | 'failed';
    resultUrl?: string;
    startedAt?: string;
    completedAt?: string;
}
export interface SafetyZone {
    id: string;
    name: string;
    boundary: GeoLocation[];
    type: 'restricted' | 'danger' | 'warning' | 'worker' | 'public' | 'equipment';
    allowedRobots: string[];
    allowedEquipment: string[];
    speedLimit: number;
    maxLoad: number;
    requireStop: boolean;
    alertOnEntry: boolean;
    active: boolean;
}
export interface HazardAlert {
    id: string;
    type: 'collision' | 'proximity' | 'overload' | 'speed' | 'zone_violation' | 'system_failure' | 'environmental' | 'weather';
    severity: 'critical' | 'high' | 'medium' | 'low';
    source: string;
    description: string;
    location: GeoLocation;
    timestamp: string;
    affectedRobots: string[];
    affectedEquipment: string[];
    recommendedAction: string;
    acknowledged: boolean;
    resolved: boolean;
    resolvedAt?: string;
}
export interface RoboticsPerformanceIndex {
    overall: number;
    executionQuality: number;
    planAdherence: number;
    energyEfficiency: number;
    failureRate: number;
    precision: number;
    completionRate: number;
    responseTime: number;
    timestamp: string;
}
export interface SwarmConfig {
    id: string;
    name: string;
    robotIds: string[];
    formation: 'line' | 'grid' | 'cluster' | 'flock' | 'custom';
    communicationProtocol: 'mesh' | 'star' | 'broadcast' | 'relay';
    leaderId?: string;
    coordinationMode: 'centralized' | 'decentralized' | 'hybrid';
    taskDistribution: 'load_balanced' | 'round_robin' | 'priority' | 'capability';
    parameters: Record<string, number>;
    active: boolean;
}
export interface HumanRobotCollaboration {
    id: string;
    projectId: string;
    robotId: string;
    workerId: string;
    zone: SafetyZone;
    interactionType: 'supervised' | 'shared' | 'cooperative' | 'independent';
    safetyProtocol: 'visual_warning' | 'audio_alert' | 'auto_stop' | 'geofence' | 'all';
    task: string;
    status: 'active' | 'paused' | 'completed';
    startedAt: string;
    endedAt?: string;
}
export interface DecisionLog {
    id: string;
    type: string;
    agent: string;
    input: unknown;
    output: unknown;
    alternatives: string[];
    reason: string;
    confidence: number;
    timestamp: string;
    projectId: string;
}
export interface KnowledgeGraphNode {
    id: string;
    type: 'robot' | 'equipment' | 'mission' | 'zone' | 'worker' | 'project' | 'area' | 'hazard';
    label: string;
    properties: Record<string, unknown>;
}
export interface KnowledgeGraphEdge {
    source: string;
    target: string;
    relation: string;
    properties: Record<string, unknown>;
}
export interface KnowledgeGraph {
    nodes: KnowledgeGraphNode[];
    edges: KnowledgeGraphEdge[];
}
export interface DigitalTwinRobotics {
    robotId: string;
    virtualModel: Record<string, unknown>;
    realTimeSync: boolean;
    simState: Record<string, unknown>;
    deviation: number;
    lastSync: string;
}
//# sourceMappingURL=types.d.ts.map