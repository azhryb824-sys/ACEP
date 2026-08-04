import { ITerrainAnalyzer, ISoilAnalyzer, IClimateAnalyzer, ITransportAnalyzer, IServicesAnalyzer, ISiteAnalyzer, SiteAnalysisOptions } from './interfaces';
import { SlopeAnalysis, ElevationAnalysis, SolarRadiationAnalysis, ShadowAnalysis, BearingCapacity, GroundwaterInfo, SettlementAnalysis, SlidingAnalysis, ExpansionContractionAnalysis, SoilLayer, GeotechnicalRisk, CompactionRequirement, BearingCorrectionFactor, TemperatureData, HumidityData, WindData, RainfallData, SandstormData, SnowData, SolarRadiationData, SeasonalPattern, TrafficFlowAnalysis, ShippingTimeAnalysis, RouteAnalysis, ConcreteRouteAnalysis, SupplierLeadTime, AlternativeRoute, ElectricityService, WaterService, SewageService, InternetService, GasService, FiberOpticsService, ProximityService, EmergencyService, InfrastructureService, SiteAnalysis, SiteAreaAnalysis, SiteSlopeAnalysis, SunPathAnalysis, WindExposureAnalysis, ShadowStudy, ZoneAnalysis, LogisticsZone, CranePosition, GatePosition, GeoPoint, GeoPolygon, GeoLine, GeoBounds, SoilType } from './types';
import { GISEngine } from './engine';
export declare class TerrainAnalyzer implements ITerrainAnalyzer {
    analyzeSlope(dem: number[][], resolution: number): Promise<SlopeAnalysis>;
    analyzeElevation(dem: number[][]): Promise<ElevationAnalysis>;
    analyzeAspect(dem: number[][]): Promise<number[][]>;
    analyzeSolarRadiation(dem: number[][], lat: number, lng: number): Promise<SolarRadiationAnalysis>;
    analyzeShadows(dem: number[][], lat: number, lng: number, date: Date): Promise<ShadowAnalysis>;
    generateContours(dem: number[][], interval: number): Promise<GeoPoint[][]>;
    calculateHillshade(dem: number[][], azimuth: number, altitude: number): Promise<number[][]>;
    calculateCurvature(dem: number[][]): Promise<number[][]>;
    calculateTWI(dem: number[][]): Promise<number[][]>;
    calculateRoughness(dem: number[][]): Promise<number>;
}
export declare class SoilAnalyzer implements ISoilAnalyzer {
    analyzeBearingCapacity(soilProfile: SoilLayer[], depth: number): Promise<BearingCapacity>;
    analyzeGroundwater(location: GeoPoint, depth: number): Promise<GroundwaterInfo>;
    analyzeSettlement(soilProfile: SoilLayer[], foundationLoad: number): Promise<SettlementAnalysis>;
    analyzeSliding(slope: number, soilProperties: {
        cohesion: number;
        frictionAngle: number;
        unitWeight: number;
        saturatedUnitWeight: number;
        poissonRatio: number;
        modulusOfElasticity: number;
        permeability: number;
    }): Promise<SlidingAnalysis>;
    analyzeExpansionContraction(soilType: SoilType, moisture: number): Promise<ExpansionContractionAnalysis>;
    assessLiquefaction(soilProfile: SoilLayer[], seismicZone: number): Promise<number>;
    getSoilProfile(location: GeoPoint, depth: number): Promise<SoilLayer[]>;
    calculateBearingCorrection(soilType: SoilType, depth: number, width: number): Promise<BearingCorrectionFactor[]>;
    assessGeotechnicalRisks(soilProfile: SoilLayer[]): Promise<GeotechnicalRisk[]>;
    determineCompactionRequirements(soilType: SoilType): Promise<CompactionRequirement[]>;
}
export declare class ClimateAnalyzer implements IClimateAnalyzer {
    analyzeTemperature(location: GeoPoint): Promise<TemperatureData>;
    analyzeHumidity(location: GeoPoint): Promise<HumidityData>;
    analyzeWind(location: GeoPoint): Promise<WindData>;
    analyzeRainfall(location: GeoPoint): Promise<RainfallData>;
    analyzeSandstorms(location: GeoPoint): Promise<SandstormData>;
    analyzeSnow(location: GeoPoint): Promise<SnowData>;
    analyzeSolarRadiation(location: GeoPoint): Promise<SolarRadiationData>;
    analyzeSeasonalPatterns(location: GeoPoint): Promise<SeasonalPattern[]>;
    getClimateSummary(location: GeoPoint): Promise<import('./types').ClimateData>;
}
export declare class TransportAnalyzer implements ITransportAnalyzer {
    analyzeTrafficFlow(from: GeoPoint, to: GeoPoint): Promise<TrafficFlowAnalysis>;
    analyzeShippingTime(from: GeoPoint, to: GeoPoint): Promise<ShippingTimeAnalysis>;
    findEquipmentRoutes(from: GeoPoint, to: GeoPoint, equipment: string): Promise<RouteAnalysis[]>;
    findConcreteRoutes(batchPlants: GeoPoint[], site: GeoPoint): Promise<ConcreteRouteAnalysis[]>;
    analyzeSupplierLeadTime(suppliers: string[], materials: string[]): Promise<SupplierLeadTime[]>;
    findAlternativeRoutes(primary: GeoLine): Promise<AlternativeRoute[]>;
    calculateTravelTime(from: GeoPoint, to: GeoPoint, mode: string): Promise<number>;
    private haversineDistance;
}
export declare class ServicesAnalyzer implements IServicesAnalyzer {
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
export declare class SiteAnalyzer implements ISiteAnalyzer {
    private engine;
    constructor(engine: GISEngine);
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
//# sourceMappingURL=analyzers.d.ts.map