export declare enum GISLayerType {
    AdministrativeBoundaries = "AdministrativeBoundaries",
    Roads = "Roads",
    Bridges = "Bridges",
    Tunnels = "Tunnels",
    Railways = "Railways",
    Airports = "Airports",
    Ports = "Ports",
    Rivers = "Rivers",
    WaterNetworks = "WaterNetworks",
    SewageNetworks = "SewageNetworks",
    ElectricalNetworks = "ElectricalNetworks",
    Communications = "Communications",
    Gas = "Gas",
    Terrain = "Terrain",
    Vegetation = "Vegetation",
    FloodZones = "FloodZones",
    SeismicZones = "SeismicZones",
    ProtectedAreas = "ProtectedAreas"
}
export declare enum DataSourceType {
    ArcGIS = "ArcGIS",
    QGIS = "QGIS",
    OpenStreetMap = "OpenStreetMap",
    GoogleMaps = "GoogleMaps",
    Municipality = "Municipality",
    Weather = "Weather",
    DEM = "DEM",
    Satellite = "Satellite",
    LiDAR = "LiDAR",
    SurveyData = "SurveyData",
    SHP = "SHP",
    GeoJSON = "GeoJSON",
    KML = "KML",
    GeoPackage = "GeoPackage"
}
export declare enum SoilType {
    Clay = "Clay",
    Sand = "Sand",
    Silt = "Silt",
    Gravel = "Gravel",
    Rock = "Rock",
    Loam = "Loam",
    Peat = "Peat",
    Chalk = "Chalk",
    Fill = "Fill",
    Marl = "Marl",
    Limestone = "Limestone",
    Basalt = "Basalt",
    Granite = "Granite",
    Sabkha = "Sabkha"
}
export declare enum CoordinateSystem {
    WGS84 = "WGS84",
    UTM = "UTM",
    AIN_EL_ABD_1970 = "AIN_EL_ABD_1970",
    AIN_EL_ABD_2020 = "AIN_EL_ABD_2020",
    JGD2000 = "JGD2000",
    ED50 = "ED50",
    NAD83 = "NAD83",
    GDA2020 = "GDA2020",
    OSGB36 = "OSGB36"
}
export declare enum MapProjection {
    Mercator = "Mercator",
    TransverseMercator = "TransverseMercator",
    LambertConformalConic = "LambertConformalConic",
    AlbersEqualArea = "AlbersEqualArea",
    AzimuthalEquidistant = "AzimuthalEquidistant",
    Stereographic = "Stereographic",
    Orthographic = "Orthographic",
    Robinson = "Robinson"
}
export declare enum TerrainTerrainAnalysis {
    Slope = "Slope",
    Elevation = "Elevation",
    Aspect = "Aspect",
    SolarRadiation = "SolarRadiation",
    ShadowAnalysis = "ShadowAnalysis",
    ContourGeneration = "ContourGeneration",
    Hillshade = "Hillshade",
    Curvature = "Curvature",
    Roughness = "Roughness",
    TWI = "TWI"
}
export interface GeoPoint {
    lat: number;
    lng: number;
    alt?: number;
}
export interface GeoPolygon {
    points: GeoPoint[];
    holes?: GeoPoint[][];
}
export interface GeoLine {
    points: GeoPoint[];
    length?: number;
}
export interface GeoBounds {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}
export interface TerrainAnalysis {
    slope: SlopeAnalysis;
    elevation: ElevationAnalysis;
    aspect: NumberRange;
    solarRadiation: SolarRadiationAnalysis;
    shadowAnalysis: ShadowAnalysis;
    contourLines: GeoLine[];
    hillshade: number[][];
    curvature: number[][];
    roughness: number;
    twi: number[][];
}
export interface SlopeAnalysis {
    average: number;
    min: number;
    max: number;
    classification: SlopeCategory;
    slopeMap: number[][];
    slopeAspectMap: number[][];
}
export interface SlopeCategory {
    flat: number;
    gentle: number;
    moderate: number;
    steep: number;
    verySteep: number;
    extreme: number;
}
export interface ElevationAnalysis {
    min: number;
    max: number;
    average: number;
    median: number;
    stdDev: number;
    dem: number[][];
    elevationProfile: ElevationProfilePoint[];
}
export interface ElevationProfilePoint {
    distance: number;
    elevation: number;
}
export interface NumberRange {
    min: number;
    max: number;
    average: number;
}
export interface SolarRadiationAnalysis {
    totalRadiation: number;
    directRadiation: number;
    diffuseRadiation: number;
    radiationMap: number[][];
    peakSunHours: number;
    optimalPanelAngle: number;
}
export interface ShadowAnalysis {
    shadowMap: number[][];
    shadowHours: number;
    shadowPolygons: GeoPolygon[];
    solarObstruction: number;
}
export interface SoilAnalysis {
    bearingCapacity: BearingCapacity;
    groundwaterLevel: GroundwaterInfo;
    settlement: SettlementAnalysis;
    sliding: SlidingAnalysis;
    expansionContraction: ExpansionContractionAnalysis;
    geotechnicalRisks: GeotechnicalRisk[];
    soilProfile: SoilLayer[];
    liquefactionPotential: number;
    compactionRequirements: CompactionRequirement[];
}
export interface BearingCapacity {
    allowable: number;
    ultimate: number;
    factorOfSafety: number;
    soilType: SoilType;
    depth: number;
    correctionFactors: BearingCorrectionFactor[];
}
export interface BearingCorrectionFactor {
    name: string;
    value: number;
    description: string;
}
export interface GroundwaterInfo {
    depth: number;
    seasonalFluctuation: number;
    aggressivity: 'Low' | 'Medium' | 'High' | 'VeryHigh';
    ph: number;
    sulfate: number;
    chloride: number;
    dewateringRequired: boolean;
    dewateringVolume?: number;
}
export interface SettlementAnalysis {
    totalSettlement: number;
    differentialSettlement: number;
    immediateSettlement: number;
    consolidationSettlement: number;
    timeToSettle: number;
    acceptable: boolean;
}
export interface SlidingAnalysis {
    factorOfSafety: number;
    criticalSurface: GeoLine;
    drivingForce: number;
    resistingForce: number;
    stable: boolean;
}
export interface ExpansionContractionAnalysis {
    swellPotential: 'Low' | 'Medium' | 'High' | 'VeryHigh';
    swellPressure: number;
    shrinkagePotential: 'Low' | 'Medium' | 'High';
    volumetricChange: number;
    treatmentRequired: boolean;
    treatmentMethod?: string;
}
export interface GeotechnicalRisk {
    type: string;
    description: string;
    probability: number;
    impact: 'Low' | 'Medium' | 'High' | 'Critical';
    mitigation: string;
}
export interface SoilLayer {
    depthFrom: number;
    depthTo: number;
    soilType: SoilType;
    nValue: number;
    description: string;
    moisture: number;
    density: number;
}
export interface CompactionRequirement {
    layerType: string;
    requiredDensity: number;
    maxLayerThickness: number;
    passesRequired: number;
    moistureRange: NumberRange;
}
export interface ClimateData {
    temperature: TemperatureData;
    humidity: HumidityData;
    wind: WindData;
    rainfall: RainfallData;
    sandstorms: SandstormData;
    snow: SnowData;
    solarRadiation: SolarRadiationData;
    seasonalPatterns: SeasonalPattern[];
}
export interface TemperatureData {
    annualAverage: number;
    monthlyAverages: number[];
    dailyMin: number;
    dailyMax: number;
    recordHigh: number;
    recordLow: number;
    heatwaveDays: number;
}
export interface HumidityData {
    annualAverage: number;
    monthlyAverages: number[];
    morningAverage: number;
    afternoonAverage: number;
    comfortIndex: number;
}
export interface WindData {
    averageSpeed: number;
    maxGust: number;
    prevailingDirection: string;
    windRose: WindRoseDirection[];
    seasonalVariation: SeasonalWind[];
}
export interface WindRoseDirection {
    direction: string;
    frequency: number;
    averageSpeed: number;
}
export interface SeasonalWind {
    season: string;
    averageSpeed: number;
    prevailingDirection: string;
}
export interface RainfallData {
    annualTotal: number;
    monthlyAverages: number[];
    maxDaily: number;
    maxHourly: number;
    rainyDays: number;
    intensity: 'Low' | 'Moderate' | 'High' | 'Extreme';
    floodRisk: number;
}
export interface SandstormData {
    annualFrequency: number;
    peakMonths: number[];
    averageVisibility: number;
    severity: 'Low' | 'Moderate' | 'High' | 'Extreme';
    affectedPeriods: string[];
}
export interface SnowData {
    annualSnowfall: number;
    snowDays: number;
    maxDepth: number;
    risk: 'None' | 'Low' | 'Moderate' | 'High';
}
export interface SolarRadiationData {
    annualTotal: number;
    monthlyAverages: number[];
    peakSunHours: number;
    uvIndex: number;
    clearDays: number;
}
export interface SeasonalPattern {
    season: string;
    startMonth: number;
    endMonth: number;
    characteristics: string;
    impactOnConstruction: string;
}
export interface TransportIntelligence {
    trafficFlow: TrafficFlowAnalysis;
    shippingTime: ShippingTimeAnalysis;
    equipmentRoutes: RouteAnalysis[];
    concreteRoutes: ConcreteRouteAnalysis[];
    supplierTime: SupplierLeadTime[];
    alternativeRoutes: AlternativeRoute[];
}
export interface TrafficFlowAnalysis {
    averageSpeed: number;
    peakHours: string[];
    congestionLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
    bottleneckPoints: GeoPoint[];
    timeToDestination: number;
    trafficZones: TrafficZone[];
}
export interface TrafficZone {
    name: string;
    congestionIndex: number;
    peakPeriod: string;
    averageDelay: number;
}
export interface ShippingTimeAnalysis {
    portToSite: number;
    supplierToSite: number;
    averageDelay: number;
    criticalRoutes: CriticalRoute[];
    customsClearance: number;
}
export interface CriticalRoute {
    from: string;
    to: string;
    duration: number;
    risk: 'Low' | 'Medium' | 'High';
    alternativeAvailable: boolean;
}
export interface RouteAnalysis {
    from: string;
    to: string;
    distance: number;
    duration: number;
    tollCost: number;
    fuelCost: number;
    restrictions: string[];
    routeGeometry: GeoLine;
}
export interface ConcreteRouteAnalysis {
    batchPlant: string;
    to: string;
    distance: number;
    travelTime: number;
    maxLoad: number;
    timeWindow: string;
    slumpLoss: number;
}
export interface SupplierLeadTime {
    supplier: string;
    material: string;
    leadTime: number;
    reliability: number;
    distance: number;
    alternativeSupplier: string;
}
export interface AlternativeRoute {
    primaryRoute: string;
    alternative: string;
    distanceDifference: number;
    timeDifference: number;
    condition: string;
}
export interface InfrastructureService {
    electricity: ElectricityService;
    water: WaterService;
    sewage: SewageService;
    internet: InternetService;
    gas: GasService;
    fiberOptics: FiberOpticsService;
    fuelStations: ProximityService[];
    hospitals: EmergencyService[];
    civilDefense: EmergencyService[];
    emergencyCenters: EmergencyService[];
}
export interface ElectricityService {
    available: boolean;
    voltage: number;
    capacity: number;
    distanceToSubstation: number;
    provider: string;
    connectionCost: number;
    reliability: number;
    backupRequired: boolean;
}
export interface WaterService {
    available: boolean;
    pressure: number;
    pipeDiameter: number;
    distanceToMain: number;
    provider: string;
    connectionCost: number;
    quality: 'Potable' | 'NonPotable' | 'Treated';
    tankerRequired: boolean;
}
export interface SewageService {
    available: boolean;
    type: 'Municipal' | 'Septic' | 'TreatmentPlant';
    distanceToMain: number;
    connectionCost: number;
    capacity: number;
    treatmentRequired: boolean;
}
export interface InternetService {
    available: boolean;
    type: 'Fiber' | 'DSL' | 'Satellite' | '5G' | '4G';
    speed: number;
    provider: string;
    reliability: number;
    monthlyCost: number;
}
export interface GasService {
    available: boolean;
    type: 'Natural' | 'LPG' | 'None';
    pressure: number;
    distanceToMain: number;
    connectionCost: number;
    capacity: number;
}
export interface FiberOpticsService {
    available: boolean;
    distanceToPoP: number;
    maxSpeed: number;
    provider: string;
    installationCost: number;
    monthlyCost: number;
}
export interface ProximityService {
    name: string;
    type: string;
    distance: number;
    location: GeoPoint;
    capacity: number;
    operatingHours: string;
}
export interface EmergencyService {
    name: string;
    type: string;
    distance: number;
    responseTime: number;
    location: GeoPoint;
    capacity: number;
    contact: string;
}
export interface SiteAnalysis {
    area: SiteAreaAnalysis;
    slopes: SiteSlopeAnalysis;
    sunDirection: SunPathAnalysis;
    windDirection: WindExposureAnalysis;
    shadows: ShadowStudy;
    excavationZones: ZoneAnalysis[];
    fillZones: ZoneAnalysis[];
    storageZones: LogisticsZone[];
    craneLocations: CranePosition[];
    gateLocations: GatePosition[];
}
export interface SiteAreaAnalysis {
    totalArea: number;
    buildableArea: number;
    setbackArea: number;
    greenArea: number;
    parkingArea: number;
    circulationArea: number;
    areaUtilization: number;
}
export interface SiteSlopeAnalysis {
    averageSlope: number;
    maxSlope: number;
    slopeDirection: string;
    slopeZones: SlopeZone[];
    cutVolume: number;
    fillVolume: number;
    balanceRatio: number;
}
export interface SlopeZone {
    id: string;
    category: string;
    averageSlope: number;
    area: number;
    recommendation: string;
}
export interface SunPathAnalysis {
    sunrise: string;
    sunset: string;
    solarAzimuth: number;
    solarAltitude: number;
    dailySunHours: number;
    optimalOrientation: string;
    seasonalVariation: SeasonalSunPath[];
}
export interface SeasonalSunPath {
    season: string;
    sunrise: string;
    sunset: string;
    maxAltitude: number;
}
export interface WindExposureAnalysis {
    prevailingDirection: string;
    averageSpeed: number;
    maxGust: number;
    exposure: 'Sheltered' | 'Moderate' | 'Exposed' | 'Severe';
    windLoadZones: WindLoadZone[];
}
export interface WindLoadZone {
    zone: string;
    speed: number;
    pressure: number;
}
export interface ShadowStudy {
    shadowDuration: number;
    shadowCoverage: number;
    shadowMap: ShadowMapEntry[];
    solarAccess: SolarAccessEntry[];
    obstructionAnalysis: ObstructionAnalysis[];
}
export interface ShadowMapEntry {
    hour: number;
    shadowPolygons: GeoPolygon[];
    coverage: number;
}
export interface SolarAccessEntry {
    location: GeoPoint;
    dailySolarAccess: number;
    obstruction: string;
}
export interface ObstructionAnalysis {
    feature: string;
    height: number;
    shadowLength: number;
    affectedArea: number;
}
export interface ZoneAnalysis {
    id: string;
    area: number;
    volume: number;
    location: GeoPolygon;
    soilType: SoilType;
    depth: number;
    difficulty: 'Easy' | 'Moderate' | 'Difficult' | 'Extreme';
    costEstimate: number;
}
export interface LogisticsZone {
    id: string;
    type: string;
    area: number;
    location: GeoPolygon;
    access: string;
    capacity: number;
}
export interface CranePosition {
    id: string;
    location: GeoPoint;
    radius: number;
    liftingCapacity: number;
    coverage: number;
    obstacles: string[];
    optimal: boolean;
}
export interface GatePosition {
    id: string;
    location: GeoPoint;
    width: number;
    height: number;
    type: string;
    accessRoad: string;
    securityRequired: boolean;
}
export interface SpatialRelationship {
    relationshipType: SpatialRelationType;
    sourceId: string;
    targetId: string;
    distance: number;
    direction: string;
    properties: Record<string, unknown>;
}
export declare enum SpatialRelationType {
    WithinDistance = "WithinDistance",
    Contains = "Contains",
    Intersects = "Intersects",
    Adjacent = "Adjacent",
    Overlaps = "Overlaps",
    NearestNeighbor = "NearestNeighbor",
    ConnectedTo = "ConnectedTo",
    Above = "Above",
    Below = "Below",
    Crosses = "Crosses"
}
export interface GeospatialAnalysisResult {
    id: string;
    type: string;
    description: string;
    inputs: string[];
    outputs: Record<string, unknown>;
    confidence: number;
    timestamp: string;
    metadata: Record<string, unknown>;
}
export interface GISLayer {
    id: string;
    name: string;
    nameAr?: string;
    type: GISLayerType;
    source: DataSourceType;
    crs: CoordinateSystem;
    projection: MapProjection;
    updateDate: string;
    quality: LayerQuality;
    coverage: GeoBounds;
    featureCount?: number;
    attributes: string[];
    style?: LayerStyle;
    metadata: Record<string, unknown>;
}
export interface LayerQuality {
    completeness: number;
    accuracy: number;
    precision: number;
    resolution: number;
    temporalValidity: number;
    score: number;
    issues: LayerIssue[];
}
export interface LayerIssue {
    type: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    description: string;
    affectedFeatures: number;
}
export interface LayerStyle {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    opacity?: number;
    markerSymbol?: string;
    classification?: string;
    labels?: boolean;
}
export interface EngineeringKnowledgeGraphNode {
    id: string;
    type: EngineeringNodeType;
    name: string;
    nameAr?: string;
    location: GeoPoint;
    geometry?: GeoPolygon | GeoLine;
    properties: Record<string, unknown>;
    relationships: SpatialRelationship[];
    confidence: number;
    source: string;
    timestamp: string;
}
export declare enum EngineeringNodeType {
    Location = "Location",
    Building = "Building",
    Road = "Road",
    Utility = "Utility",
    Bridge = "Bridge",
    Tunnel = "Tunnel",
    BIMElement = "BIMElement",
    Contract = "Contract",
    Supplier = "Supplier",
    Activity = "Activity",
    Equipment = "Equipment",
    Material = "Material",
    Labor = "Labor",
    WeatherStation = "WeatherStation",
    SurveyPoint = "SurveyPoint",
    BatchPlant = "BatchPlant",
    LandParcel = "LandParcel",
    Zone = "Zone"
}
export interface DigitalTwinIntegration {
    twinId: string;
    projectId: string;
    gisLayers: string[];
    spatialIndex: Record<string, unknown>;
    lastSync: string;
    syncFrequency: number;
    linkedFeatures: TwinFeatureLink[];
}
export interface TwinFeatureLink {
    gisFeatureId: string;
    twinElementId: string;
    relationship: string;
    confidence: number;
}
export interface AIQuestionInput {
    question: string;
    context?: {
        location?: GeoPoint;
        layerIds?: string[];
        bounds?: GeoBounds;
    };
}
export interface AIQuestionResult {
    question: string;
    answer: string;
    confidence: number;
    sources: string[];
    relatedLayers: string[];
    spatialContext?: GeoBounds;
    timestamp: string;
}
export interface SpatialQuery {
    type: SpatialQueryType;
    targetLayer: string;
    geometry?: GeoPolygon | GeoLine | GeoPoint;
    distance?: number;
    filters?: QueryFilter[];
    aggregations?: QueryAggregation[];
}
export declare enum SpatialQueryType {
    WithinDistance = "WithinDistance",
    Contains = "Contains",
    Intersects = "Intersects",
    NearestNeighbor = "NearestNeighbor",
    BBox = "BBox",
    KNN = "KNN"
}
export interface QueryFilter {
    attribute: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
    value: unknown;
}
export interface QueryAggregation {
    type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'histogram';
    attribute?: string;
    groupBy?: string;
}
export interface QueryResult {
    features: Record<string, unknown>[];
    totalCount: number;
    aggregation?: Record<string, unknown>;
    spatialBounds?: GeoBounds;
    executionTime: number;
}
export interface CRSValidator {
    code: string;
    name: string;
    wkt: string;
    datum: string;
    unit: string;
    valid: boolean;
    errors: string[];
}
//# sourceMappingURL=types.d.ts.map