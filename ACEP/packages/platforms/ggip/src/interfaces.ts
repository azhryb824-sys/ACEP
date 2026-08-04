import { IEngine } from '@acep/core';
import {
  GISLayer, TerrainAnalysis, SoilAnalysis, ClimateData, TransportIntelligence,
  InfrastructureService, SiteAnalysis, SpatialQuery, QueryResult,
  GeoPoint, GeoPolygon, GeoBounds, AIQuestionInput, AIQuestionResult,
  DigitalTwinIntegration, EngineeringKnowledgeGraphNode,
  GeospatialAnalysisResult, GISLayerType, DataSourceType,
  BearingCapacity, GroundwaterInfo, SettlementAnalysis, SlidingAnalysis,
  ExpansionContractionAnalysis, SoilLayer, GeotechnicalRisk, CompactionRequirement,
  TemperatureData, HumidityData, WindData, RainfallData, SandstormData, SnowData,
  SolarRadiationData, SeasonalPattern, TrafficFlowAnalysis, ShippingTimeAnalysis,
  RouteAnalysis, ConcreteRouteAnalysis, SupplierLeadTime, AlternativeRoute,
  ElectricityService, WaterService, SewageService, InternetService, GasService,
  FiberOpticsService, ProximityService, EmergencyService, SiteAreaAnalysis,
  SiteSlopeAnalysis, SunPathAnalysis, WindExposureAnalysis, ShadowStudy, ZoneAnalysis,
  LogisticsZone, CranePosition, GatePosition, SoilType, GeoLine, BearingCorrectionFactor
} from './types';

export interface IGISEngine extends IEngine {
  loadLayer(source: string, type: GISLayerType, options?: LayerLoadOptions): Promise<GISLayer>;
  loadLayerFromFile(filePath: string, type: GISLayerType): Promise<GISLayer>;
  removeLayer(layerId: string): Promise<void>;
  getLayer(layerId: string): GISLayer | undefined;
  listLayers(type?: GISLayerType): GISLayer[];
  analyzeTerrain(layerId: string, options?: TerrainAnalysisOptions): Promise<TerrainAnalysis>;
  analyzeSoil(layerId: string, options?: SoilAnalysisOptions): Promise<SoilAnalysis>;
  analyzeClimate(location: GeoPoint, options?: ClimateAnalysisOptions): Promise<ClimateData>;
  analyzeTransport(from: GeoPoint, to: GeoPoint, options?: TransportOptions): Promise<TransportIntelligence>;
  analyzeServices(location: GeoPoint, options?: ServicesOptions): Promise<InfrastructureService>;
  analyzeSite(layerId: string, options?: SiteAnalysisOptions): Promise<SiteAnalysis>;
  spatialQuery(layerId: string, query: SpatialQuery): Promise<QueryResult>;
  findWithinDistance(layerId: string, center: GeoPoint, distance: number): Promise<QueryResult>;
  findContains(layerId: string, geometry: GeoPolygon): Promise<QueryResult>;
  findIntersects(layerId: string, geometry: GeoPolygon): Promise<QueryResult>;
  nearestNeighbor(layerId: string, point: GeoPoint, k: number): Promise<QueryResult>;
  askGeospatialAI(input: AIQuestionInput): Promise<AIQuestionResult>;
  integrateDigitalTwin(twinId: string, projectId: string): Promise<DigitalTwinIntegration>;
  syncWithDigitalTwin(integration: DigitalTwinIntegration): Promise<void>;
  validateCRS(layerId: string): Promise<boolean>;
  transformCRS(layerId: string, targetCRS: string): Promise<GISLayer>;
  getLayerCoverage(layerId: string): GeoBounds;
  exportLayer(layerId: string, format: string): Promise<string>;
}

export interface LayerLoadOptions {
  crs?: string;
  projection?: string;
  validateQuality?: boolean;
  simplify?: boolean;
  simplifyTolerance?: number;
  clipToBounds?: GeoBounds;
  attributes?: string[];
}

export interface TerrainAnalysisOptions {
  resolution?: number;
  slope?: boolean;
  aspect?: boolean;
  solarRadiation?: boolean;
  shadowAnalysis?: boolean;
  contourInterval?: number;
  hillshade?: boolean;
  curvature?: boolean;
  twi?: boolean;
}

export interface SoilAnalysisOptions {
  boreholes?: number;
  depth?: number;
  includeLiquefaction?: boolean;
  includeGroundwater?: boolean;
  includeSettlement?: boolean;
  includeExpansion?: boolean;
}

export interface ClimateAnalysisOptions {
  historicalYears?: number;
  includeSeasonal?: boolean;
  includeExtremes?: boolean;
  includeSandstorms?: boolean;
  includeSnow?: boolean;
}

export interface TransportOptions {
  mode?: 'truck' | 'concrete' | 'equipment' | 'all';
  includeAlternatives?: boolean;
  includeTraffic?: boolean;
  timeWindow?: string;
  maxWeight?: number;
}

export interface ServicesOptions {
  includeElectricity?: boolean;
  includeWater?: boolean;
  includeSewage?: boolean;
  includeInternet?: boolean;
  includeGas?: boolean;
  includeEmergency?: boolean;
  searchRadius?: number;
}

export interface SiteAnalysisOptions {
  includeSlopes?: boolean;
  includeSun?: boolean;
  includeWind?: boolean;
  includeShadows?: boolean;
  includeExcavation?: boolean;
  includeCranePlacement?: boolean;
  includeLogistics?: boolean;
  resolution?: number;
}

export interface ITerrainAnalyzer {
  analyzeSlope(dem: number[][], resolution: number): Promise<TerrainAnalysis['slope']>;
  analyzeElevation(dem: number[][]): Promise<TerrainAnalysis['elevation']>;
  analyzeAspect(dem: number[][]): Promise<number[][]>;
  analyzeSolarRadiation(dem: number[][], lat: number, lng: number): Promise<TerrainAnalysis['solarRadiation']>;
  analyzeShadows(dem: number[][], lat: number, lng: number, date: Date): Promise<TerrainAnalysis['shadowAnalysis']>;
  generateContours(dem: number[][], interval: number): Promise<GeoPoint[][]>;
  calculateHillshade(dem: number[][], azimuth: number, altitude: number): Promise<number[][]>;
  calculateCurvature(dem: number[][]): Promise<number[][]>;
  calculateTWI(dem: number[][]): Promise<number[][]>;
  calculateRoughness(dem: number[][]): Promise<number>;
}

export interface ISoilAnalyzer {
  analyzeBearingCapacity(soilProfile: SoilLayer[], depth: number): Promise<BearingCapacity>;
  analyzeGroundwater(location: GeoPoint, depth: number): Promise<GroundwaterInfo>;
  analyzeSettlement(soilProfile: SoilLayer[], foundationLoad: number): Promise<SettlementAnalysis>;
  analyzeSliding(slope: number, soilProperties: SoilProperties): Promise<SlidingAnalysis>;
  analyzeExpansionContraction(soilType: SoilType, moisture: number): Promise<ExpansionContractionAnalysis>;
  assessLiquefaction(soilProfile: SoilLayer[], seismicZone: number): Promise<number>;
  getSoilProfile(location: GeoPoint, depth: number): Promise<SoilLayer[]>;
  calculateBearingCorrection(soilType: SoilType, depth: number, width: number): Promise<BearingCorrectionFactor[]>;
  assessGeotechnicalRisks(soilProfile: SoilLayer[]): Promise<GeotechnicalRisk[]>;
  determineCompactionRequirements(soilType: SoilType): Promise<CompactionRequirement[]>;
}

export interface IClimateAnalyzer {
  analyzeTemperature(location: GeoPoint, historicalYears: number): Promise<TemperatureData>;
  analyzeHumidity(location: GeoPoint): Promise<HumidityData>;
  analyzeWind(location: GeoPoint): Promise<WindData>;
  analyzeRainfall(location: GeoPoint): Promise<RainfallData>;
  analyzeSandstorms(location: GeoPoint): Promise<SandstormData>;
  analyzeSnow(location: GeoPoint): Promise<SnowData>;
  analyzeSolarRadiation(location: GeoPoint): Promise<SolarRadiationData>;
  analyzeSeasonalPatterns(location: GeoPoint): Promise<SeasonalPattern[]>;
  getClimateSummary(location: GeoPoint): Promise<ClimateData>;
}

export interface ITransportAnalyzer {
  analyzeTrafficFlow(from: GeoPoint, to: GeoPoint): Promise<TrafficFlowAnalysis>;
  analyzeShippingTime(from: GeoPoint, to: GeoPoint): Promise<ShippingTimeAnalysis>;
  findEquipmentRoutes(from: GeoPoint, to: GeoPoint, equipment: string): Promise<RouteAnalysis[]>;
  findConcreteRoutes(batchPlants: GeoPoint[], site: GeoPoint): Promise<ConcreteRouteAnalysis[]>;
  analyzeSupplierLeadTime(suppliers: string[], materials: string[]): Promise<SupplierLeadTime[]>;
  findAlternativeRoutes(primary: GeoLine): Promise<AlternativeRoute[]>;
  calculateTravelTime(from: GeoPoint, to: GeoPoint, mode: string): Promise<number>;
}

export interface IServicesAnalyzer {
  analyzeElectricity(location: GeoPoint, radius: number): Promise<ElectricityService>;
  analyzeWater(location: GeoPoint, radius: number): Promise<WaterService>;
  analyzeSewage(location: GeoPoint, radius: number): Promise<SewageService>;
  analyzeInternet(location: GeoPoint, radius: number): Promise<InternetService>;
  analyzeGas(location: GeoPoint, radius: number): Promise<GasService>;
  analyzeFiberOptics(location: GeoPoint, radius: number): Promise<FiberOpticsService>;
  findNearbyFuelStations(location: GeoPoint, radius: number): Promise<ProximityService[]>;
  findNearbyHospitals(location: GeoPoint, radius: number): Promise<EmergencyService[]>;
  findNearbyCivilDefense(location: GeoPoint, radius: number): Promise<EmergencyService[]>;
  findNearbyEmergencyCenters(location: GeoPoint, radius: number): Promise<EmergencyService[]>;
  getInfrastructureSummary(location: GeoPoint, radius: number): Promise<InfrastructureService>;
}

export interface ISiteAnalyzer {
  analyzeArea(bounds: GeoBounds, setbacks: number): Promise<SiteAreaAnalysis>;
  analyzeSlopes(dem: number[][]): Promise<SiteSlopeAnalysis>;
  analyzeSunPath(location: GeoPoint, date: Date): Promise<SunPathAnalysis>;
  analyzeWindExposure(location: GeoPoint, dem: number[][]): Promise<WindExposureAnalysis>;
  analyzeShadows(dem: number[][], location: GeoPoint, date: Date): Promise<ShadowStudy>;
  findExcavationZones(dem: number[][], designLevels: number[][]): Promise<ZoneAnalysis[]>;
  findFillZones(dem: number[][], designLevels: number[][]): Promise<ZoneAnalysis[]>;
  findStorageZones(site: GeoPolygon, constraints: Record<string, unknown>): Promise<LogisticsZone[]>;
  findOptimalCraneLocations(site: GeoPolygon, buildingFootprint: GeoPolygon): Promise<CranePosition[]>;
  findOptimalGateLocations(site: GeoPolygon, roadNetwork: GeoLine[]): Promise<GatePosition[]>;
  analyzeSite(layerId: string, options: SiteAnalysisOptions): Promise<SiteAnalysis>;
}

interface SoilProperties {
  cohesion: number;
  frictionAngle: number;
  unitWeight: number;
  saturatedUnitWeight: number;
  poissonRatio: number;
  modulusOfElasticity: number;
  permeability: number;
}
