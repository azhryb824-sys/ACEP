import { ProjectType, SpaceType, SystemType, FinishingLevel, QualityLevel, FactType, BOQItemCategory, BOQItemLevel, RelationType, RiskCategory, LaborTrade, EquipmentCategory, ExecutionStatus, QuestionType } from './enums';
export interface ProjectFacts {
    projectType: ProjectFactItem;
    landArea?: Measurement;
    builtArea?: Measurement;
    floors?: number;
    hasRoofAnnex?: boolean;
    hasBasement?: boolean;
    spaces: Record<string, SpaceFact>;
    systems: Record<string, SystemFact>;
    materials: Record<string, MaterialFact>;
    location?: LocationInfo;
    budget?: Money;
    qualityLevel?: QualityFact;
    completionStage?: string;
    constructionMethods?: string[];
    constraints?: string[];
    conflicts?: ConflictInfo[];
    rawDescription: string;
    confidence: number;
    timestamp: string;
    version: string;
}
export interface ProjectFactItem {
    value: string;
    confidence: number;
    source: string;
    factType: FactType;
}
export interface SpaceFact {
    type: SpaceType;
    count: number;
    area?: Measurement;
    height?: Measurement;
    confidence: number;
    factType: FactType;
    connections?: ConnectionInfo[];
    finishingLevel?: FinishingLevel;
}
export interface SystemFact {
    exists: boolean;
    type: SystemType;
    description?: string;
    confidence: number;
    factType: FactType;
    details?: Record<string, unknown>;
}
export interface MaterialFact {
    name: string;
    qualityLevel?: QualityLevel;
    quantity?: Measurement;
    confidence: number;
    factType: FactType;
}
export interface Measurement {
    value: number;
    unit: string;
    confidence: number;
}
export interface LocationInfo {
    city?: string;
    country?: string;
    region?: string;
    coordinates?: GeoCoordinates;
}
export interface GeoCoordinates {
    lat: number;
    lng: number;
}
export interface Money {
    amount: number;
    currency: string;
}
export interface QualityFact {
    level: FinishingLevel;
    confidence: number;
    source: string;
}
export interface ConnectionInfo {
    targetSpace: string;
    relationType: RelationType;
    confidence: number;
}
export interface ConflictInfo {
    description: string;
    severity: 'error' | 'warning' | 'info';
    items: string[];
    resolution?: string;
}
export interface VirtualBuilding {
    id: string;
    projectType: ProjectType;
    skeleton: BuildingSkeleton;
    floors: Floor[];
    spaces: VirtualSpace[];
    structural: StructuralModel;
    architectural: ArchitecturalModel;
    mep: MEPModel;
    outdoor: OutdoorModel;
    metadata: BuildingMetadata;
}
export interface BuildingSkeleton {
    numFloors: number;
    hasBasement: boolean;
    hasRoof: boolean;
    hasParking: boolean;
    hasGarden: boolean;
    totalHeight: number;
}
export interface Floor {
    id: string;
    number: number;
    name: string;
    height: number;
    spaces: string[];
    area: number;
}
export interface VirtualSpace {
    id: string;
    type: SpaceType;
    name: string;
    floor: number;
    area: number;
    height: number;
    width?: number;
    length?: number;
    finishingLevel: FinishingLevel;
    connections: SpaceConnection[];
    components: string[];
}
export interface SpaceConnection {
    targetId: string;
    relation: RelationType;
}
export interface StructuralModel {
    foundation: FoundationElement[];
    columns: ColumnElement[];
    beams: BeamElement[];
    slabs: SlabElement[];
    shearWalls: ShearWallElement[];
    stairs: StairElement[];
    retainingWalls: RetainingWallElement[];
    expansionJoints: ExpansionJoint[];
}
export interface FoundationElement {
    id: string;
    type: string;
    material: string;
    dimensions: Dimensions;
    quantity: number;
}
export interface ColumnElement {
    id: string;
    count: number;
    dimensions: Dimensions;
    material: string;
    reinforcementRatio: number;
}
export interface BeamElement {
    id: string;
    count: number;
    dimensions: Dimensions;
    material: string;
    reinforcementRatio: number;
}
export interface SlabElement {
    id: string;
    type: string;
    area: number;
    thickness: number;
    material: string;
    reinforcementRatio: number;
}
export interface ShearWallElement {
    id: string;
    length: number;
    height: number;
    thickness: number;
    material: string;
}
export interface StairElement {
    id: string;
    type: string;
    width: number;
    flightCount: number;
    material: string;
}
export interface RetainingWallElement {
    id: string;
    length: number;
    height: number;
    thickness: number;
    material: string;
}
export interface ExpansionJoint {
    id: string;
    location: string;
    width: number;
    type: string;
}
export interface Dimensions {
    length?: number;
    width?: number;
    height?: number;
    depth?: number;
    thickness?: number;
    diameter?: number;
}
export interface ArchitecturalModel {
    walls: WallElement[];
    doors: DoorElement[];
    windows: WindowElement[];
    ceilings: CeilingElement[];
    floorFinishes: FloorFinishElement[];
    waterproofing: WaterproofingElement[];
    paints: PaintElement[];
    claddings: CladdingElement[];
}
export interface WallElement {
    id: string;
    length: number;
    height: number;
    thickness: number;
    material: string;
    finishType: string;
    paintColor?: string;
    fireRating: number;
    acousticRating: number;
    openings: number;
}
export interface DoorElement {
    id: string;
    count: number;
    width: number;
    height: number;
    material: string;
    type: string;
    fireRating: number;
}
export interface WindowElement {
    id: string;
    count: number;
    width: number;
    height: number;
    material: string;
    glassType: string;
}
export interface CeilingElement {
    id: string;
    type: string;
    area: number;
    material: string;
    suspended: boolean;
}
export interface FloorFinishElement {
    id: string;
    type: string;
    area: number;
    material: string;
    description: string;
}
export interface WaterproofingElement {
    id: string;
    location: string;
    area: number;
    type: string;
    layers: number;
}
export interface PaintElement {
    id: string;
    location: string;
    area: number;
    layers: number;
    paintType: string;
    color: string;
}
export interface CladdingElement {
    id: string;
    location: string;
    area: number;
    material: string;
    thickness: number;
}
export interface MEPModel {
    electrical: ElectricalSystem;
    plumbing: PlumbingSystem;
    hvac: HVACSystem;
    fireFighting: FireFightingSystem;
    fireAlarm: FireAlarmSystem;
    gas: GasSystem;
    cctv: CCTVSystem;
    accessControl: AccessControlSystem;
    dataNetwork: DataNetworkSystem;
    publicAddress: PublicAddressSystem;
    bms: BMSSystem;
    solar: SolarSystem;
    drainage: DrainageSystem;
    elevator: ElevatorSystem;
}
export interface ElectricalSystem {
    hasMainPanel: boolean;
    hasSubPanels: boolean;
    totalLoad: number;
    lightingPoints: number;
    powerPoints: number;
    cableLength: number;
    conduitLength: number;
}
export interface PlumbingSystem {
    waterSupplyPoints: number;
    drainagePoints: number;
    pipeLength: number;
    fixtures: number;
}
export interface HVACSystem {
    type: string;
    capacity: number;
    units: number;
    ductLength: number;
    pipeLength: number;
}
export interface FireFightingSystem {
    type: string;
    sprinklers: number;
    hoseReels: number;
    extinguishers: number;
    pipeLength: number;
    pumpCapacity: number;
}
export interface FireAlarmSystem {
    detectors: number;
    manualCallPoints: number;
    alarmBells: number;
    controlPanel: boolean;
    cableLength: number;
}
export interface GasSystem {
    hasGas: boolean;
    pipeLength: number;
    valves: number;
    detectors: number;
}
export interface CCTVSystem {
    cameras: number;
    cableLength: number;
    recordingHours: number;
}
export interface AccessControlSystem {
    doors: number;
    readers: number;
    controller: boolean;
}
export interface DataNetworkSystem {
    dataPoints: number;
    cableLength: number;
    racks: number;
    switches: number;
}
export interface PublicAddressSystem {
    speakers: number;
    amplifier: boolean;
    cableLength: number;
}
export interface BMSSystem {
    hasBMS: boolean;
    points: number;
    controller: boolean;
}
export interface SolarSystem {
    hasSolar: boolean;
    panels: number;
    capacity: number;
    inverterCapacity: number;
}
export interface DrainageSystem {
    stormDrainage: boolean;
    sanitaryDrainage: boolean;
    pipeLength: number;
    manholes: number;
}
export interface ElevatorSystem {
    count: number;
    capacity: number;
    speed: number;
    hasMachineRoom: boolean;
    stops: number;
}
export interface OutdoorModel {
    fences: FenceElement[];
    gates: GateElement[];
    parking: ParkingElement[];
    walkways: WalkwayElement[];
    landscape: LandscapeElement[];
    irrigation: IrrigationSystem;
    outdoorLighting: OutdoorLighting;
    waterTanks: WaterTank[];
    pumpRooms: PumpRoom[];
}
export interface FenceElement {
    length: number;
    height: number;
    material: string;
}
export interface GateElement {
    count: number;
    width: number;
    height: number;
    type: string;
    automated: boolean;
}
export interface ParkingElement {
    spaces: number;
    area: number;
    type: string;
    covered: boolean;
}
export interface WalkwayElement {
    area: number;
    material: string;
    width: number;
}
export interface LandscapeElement {
    area: number;
    type: string;
    trees: number;
    grassArea: number;
}
export interface IrrigationSystem {
    hasIrrigation: boolean;
    area: number;
    type: string;
    pipeLength: number;
}
export interface OutdoorLighting {
    poles: number;
    poleHeight: number;
    lightType: string;
    cableLength: number;
}
export interface WaterTank {
    capacity: number;
    material: string;
    count: number;
}
export interface PumpRoom {
    area: number;
    pumps: number;
    type: string;
}
export interface BuildingMetadata {
    version: string;
    created: string;
    updated: string;
    confidence: number;
    source: string;
    faktType: FactType;
}
export interface BOQItem {
    id: string;
    code: string;
    description: string;
    category: BOQItemCategory;
    level: BOQItemLevel;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    confidence: number;
    reason: string;
    ruleId: string;
    source: string;
    dependencies: string[];
    relatedSpaces: string[];
    classification: string;
    wasteFactor: number;
    correctionFactors: CorrectionFactor[];
    calculationTrace: CalculationStep[];
}
export interface CalculationStep {
    step: number;
    description: string;
    formula: string;
    input: number;
    output: number;
    unit: string;
    confidence: number;
}
export interface CorrectionFactor {
    name: string;
    value: number;
    reason: string;
}
export interface BOQDocument {
    id: string;
    projectId: string;
    name: string;
    version: string;
    items: BOQItem[];
    summary: BOQSummary;
    metadata: DocumentMetadata;
}
export interface BOQSummary {
    totalItems: number;
    confirmedItems: number;
    derivedItems: number;
    suggestedItems: number;
    conditionalItems: number;
    optionalItems: number;
    missingItems: number;
    totalCost: number;
    totalQuantity: number;
    confidence: number;
}
export interface DocumentMetadata {
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    approvedBy?: string;
    approvedAt?: string;
    status: ExecutionStatus;
    version: string;
    knowledgeVersion: string;
}
export interface Question {
    id: string;
    type: QuestionType;
    title: string;
    description: string;
    impact: string;
    priority: number;
    informationGain: number;
    affectedItems: string[];
    affectedQuantities: string[];
    affectedCost: boolean;
    affectedLabor: boolean;
    affectedSchedule: boolean;
    affectedRisk: boolean;
    options?: string[];
    askedAt?: string;
    answer?: Answer;
}
export interface Answer {
    value: unknown;
    text: string;
    confidence: number;
    factType: FactType;
    timestamp: string;
}
export interface ReasoningRule {
    id: string;
    description: string;
    conditions: RuleCondition[];
    requiredFacts: string[];
    optionalFacts: string[];
    formula?: string;
    actions: RuleAction[];
    confidence: number;
    priority: number;
    reference: string;
    version: string;
    status: string;
}
export interface RuleCondition {
    fact: string;
    operator: string;
    value: unknown;
}
export interface RuleAction {
    type: string;
    target: string;
    value: unknown;
    confidence: number;
}
export interface ReasoningTrace {
    ruleId: string;
    facts: string[];
    conditions: RuleCondition[];
    matched: boolean;
    actions: RuleAction[];
    confidence: number;
    timestamp: string;
}
export interface DecisionRecord {
    id: string;
    projectId: string;
    factsUsed: string[];
    rulesUsed: string[];
    alternatives: string[];
    selectedOption: string;
    reason: string;
    confidence: number;
    knowledgeVersion: string;
    agentId: string;
    timestamp: string;
    trace: ReasoningTrace[];
}
export interface Risk {
    id: string;
    name: string;
    category: RiskCategory;
    description: string;
    cause: string;
    trigger: string;
    probability: number;
    impact: number;
    severity: number;
    priority: number;
    detectionMethod: string;
    mitigation: string;
    contingencyPlan: string;
    responsibleParty: string;
    affectedActivities: string[];
    affectedCost: number;
    affectedSchedule: number;
    confidence: number;
    status: string;
    lifecycle: string;
    version: string;
}
export interface ScheduleActivity {
    id: string;
    name: string;
    description: string;
    duration: number;
    unit: string;
    predecessors: string[];
    successors: string[];
    resources: ResourceAllocation[];
    earlyStart: number;
    earlyFinish: number;
    lateStart: number;
    lateFinish: number;
    totalFloat: number;
    freeFloat: number;
    isCritical: boolean;
    status: string;
    progress: number;
}
export interface ResourceAllocation {
    resourceType: string;
    resourceId: string;
    quantity: number;
    unit: string;
}
export interface LaborRequirement {
    trade: LaborTrade;
    count: number;
    manHours: number;
    manDays: number;
    skillLevel: string;
    hourlyRate: number;
    totalCost: number;
    crewId?: string;
    activities: string[];
}
export interface Crew {
    id: string;
    name: string;
    type: string;
    members: CrewMember[];
    totalCost: number;
    productivity: number;
    scenario: string;
}
export interface CrewMember {
    trade: LaborTrade;
    count: number;
    skillLevel: string;
}
export interface EquipmentRequirement {
    equipmentId: string;
    name: string;
    category: EquipmentCategory;
    count: number;
    hours: number;
    dailyCost: number;
    totalCost: number;
    fuelConsumption: number;
    maintenanceHours: number;
    utilization: number;
    activities: string[];
    schedule: EquipmentSchedule[];
}
export interface EquipmentSchedule {
    activityId: string;
    startDay: number;
    endDay: number;
    dailyHours: number;
}
export interface CostBreakdown {
    materials: CostItem[];
    labor: CostItem[];
    equipment: CostItem[];
    indirect: CostItem[];
    totalDirectCost: number;
    totalIndirectCost: number;
    riskContingency: number;
    profit: number;
    taxes: number;
    totalCost: number;
    currency: string;
    confidence: number;
}
export interface CostItem {
    id: string;
    description: string;
    category: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    source: string;
    confidence: number;
}
export interface DigitalTwin {
    id: string;
    projectId: string;
    building: VirtualBuilding;
    facts: ProjectFacts;
    currentState: TwinState;
    lifecycle: LifecycleStage[];
    performanceMetrics: PerformanceMetrics;
    createdAt: string;
    updatedAt: string;
    version: string;
}
export interface TwinState {
    timestamp: string;
    completionPercentage: number;
    activeActivities: string[];
    completedActivities: string[];
    resourceUtilization: {
        labor: number;
        equipment: number;
        materials: number;
    };
    qualityScore: number;
    safetyScore: number;
    risks: string[];
    issues: string[];
}
export interface LifecycleStage {
    stage: string;
    status: 'Pending' | 'InProgress' | 'Completed' | 'OnHold';
    startDate: string | null;
    endDate: string | null;
}
export interface PerformanceMetrics {
    schedulePerformanceIndex: number;
    costPerformanceIndex: number;
    qualityIndex: number;
    safetyIndex: number;
    productivityIndex: number;
    resourceEfficiency: number;
}
export interface SimulationScenario {
    id: string;
    name: string;
    description: string;
    changes: SimulationChange[];
    parameters: Record<string, unknown>;
}
export interface SimulationChange {
    type: string;
    target: string;
    value: unknown;
}
export interface SimulationResult {
    scenarioId: string;
    scenarioName: string;
    timestamp: string;
    impacts: Record<string, number>;
    predictions: Record<string, unknown>;
    recommendations: string[];
    confidence: number;
}
//# sourceMappingURL=types.d.ts.map