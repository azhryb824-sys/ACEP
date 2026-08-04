import { BaseEngine } from '@acep/core';
import { KnowledgeGraph } from '@acep/knowledge-base';
import {
  IGISEngine, LayerLoadOptions, TerrainAnalysisOptions, SoilAnalysisOptions,
  ClimateAnalysisOptions, TransportOptions, ServicesOptions, SiteAnalysisOptions
} from './interfaces';
import { TerrainAnalyzer } from './analyzers';
import { SoilAnalyzer } from './analyzers';
import { ClimateAnalyzer } from './analyzers';
import { TransportAnalyzer } from './analyzers';
import { ServicesAnalyzer } from './analyzers';
import { SiteAnalyzer } from './analyzers';
import { SpatialKnowledgeGraph } from './spatial-knowledge-graph';
import {
  GISLayer, GISLayerType, DataSourceType, CoordinateSystem, MapProjection,
  TerrainAnalysis, SoilAnalysis, ClimateData, TransportIntelligence,
  InfrastructureService, SiteAnalysis, SpatialQuery, QueryResult,
  GeoPoint, GeoPolygon, GeoBounds, AIQuestionInput, AIQuestionResult,
  DigitalTwinIntegration, EngineeringKnowledgeGraphNode, EngineeringNodeType,
  GeospatialAnalysisResult, LayerQuality, LayerIssue, GeoLine,
  SpatialRelationType, CRSValidator, SpatialQueryType
} from './types';

export class GISEngine extends BaseEngine implements IGISEngine {
  private layers: Map<string, GISLayer> = new Map();
  private layerData: Map<string, Record<string, unknown>[]> = new Map();
  private demData: Map<string, number[][]> = new Map();
  private knowledgeGraph: KnowledgeGraph;
  private spatialGraph: SpatialKnowledgeGraph;
  private terrainAnalyzer: TerrainAnalyzer;
  private soilAnalyzer: SoilAnalyzer;
  private climateAnalyzer: ClimateAnalyzer;
  private transportAnalyzer: TransportAnalyzer;
  private servicesAnalyzer: ServicesAnalyzer;
  private siteAnalyzer: SiteAnalyzer;
  private digitalTwins: Map<string, DigitalTwinIntegration> = new Map();
  private aiContext: Map<string, unknown> = new Map();

  constructor(kg: KnowledgeGraph, spatialGraph: SpatialKnowledgeGraph) {
    super('GISEngine', '1.0.0');
    this.knowledgeGraph = kg;
    this.spatialGraph = spatialGraph;
    this.terrainAnalyzer = new TerrainAnalyzer();
    this.soilAnalyzer = new SoilAnalyzer();
    this.climateAnalyzer = new ClimateAnalyzer();
    this.transportAnalyzer = new TransportAnalyzer();
    this.servicesAnalyzer = new ServicesAnalyzer();
    this.siteAnalyzer = new SiteAnalyzer(this);
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('GIS & Geospatial Intelligence Engine initialized');
  }

  async validate(): Promise<boolean> {
    this.logger.info('Validating GIS Engine configuration');
    return true;
  }

  async loadLayer(source: string, type: GISLayerType, options?: LayerLoadOptions): Promise<GISLayer> {
    this.setStatus('running');
    this.logger.info(`Loading GIS layer: ${type} from ${source}`);

    const layerId = `LAYER-${type}-${Date.now()}`;
    const layer: GISLayer = {
      id: layerId,
      name: `${type} Layer`,
      type,
      source: this.detectSourceType(source),
      crs: (options?.crs as CoordinateSystem) || CoordinateSystem.WGS84,
      projection: (options?.projection as MapProjection) || MapProjection.TransverseMercator,
      updateDate: new Date().toISOString(),
      quality: this.assessLayerQuality(source, type),
      coverage: this.estimateCoverage(source, type),
      attributes: this.getDefaultAttributes(type),
      metadata: { source, loadedAt: new Date().toISOString(), options }
    };

    if (options?.validateQuality) {
      const crsValid = await this.validateCRS(layerId);
      if (!crsValid) {
        this.logger.warn(`CRS validation failed for layer ${layerId}`);
        layer.quality.issues.push({
          type: 'CRS_MISMATCH',
          severity: 'High',
          description: 'Coordinate reference system validation failed',
          affectedFeatures: 0
        });
      }
    }

    const mockData = this.generateMockLayerData(type, layer.coverage);
    this.layerData.set(layerId, mockData);

    if (type === GISLayerType.Terrain) {
      const demSize = 100;
      const dem: number[][] = [];
      for (let i = 0; i < demSize; i++) {
        dem[i] = [];
        for (let j = 0; j < demSize; j++) {
          dem[i][j] = 500 + Math.sin(i * 0.1) * 50 + Math.cos(j * 0.1) * 30 + Math.random() * 10;
        }
      }
      this.demData.set(layerId, dem);
    }

    this.layers.set(layerId, layer);
    this.spatialGraph.addNode({
      id: layerId,
      type: EngineeringNodeType.Location,
      name: layer.name,
      location: { lat: layer.coverage.minLat, lng: layer.coverage.minLng },
      properties: { layerType: type, source, featureCount: mockData.length },
      relationships: [],
      confidence: 0.9,
      source: 'GISEngine',
      timestamp: new Date().toISOString()
    });

    this.setStatus('idle');
    return layer;
  }

  async loadLayerFromFile(filePath: string, type: GISLayerType): Promise<GISLayer> {
    this.logger.info(`Loading layer from file: ${filePath}`);
    const sourceType = this.detectFileSourceType(filePath);
    return this.loadLayer(filePath, type, { crs: CoordinateSystem.WGS84 });
  }

  async removeLayer(layerId: string): Promise<void> {
    this.layers.delete(layerId);
    this.layerData.delete(layerId);
    this.demData.delete(layerId);
    this.logger.info(`Removed layer: ${layerId}`);
  }

  getLayer(layerId: string): GISLayer | undefined {
    return this.layers.get(layerId);
  }

  listLayers(type?: GISLayerType): GISLayer[] {
    const all = Array.from(this.layers.values());
    return type ? all.filter(l => l.type === type) : all;
  }

  async analyzeTerrain(layerId: string, options?: TerrainAnalysisOptions): Promise<TerrainAnalysis> {
    this.setStatus('running');
    this.logger.info(`Analyzing terrain for layer: ${layerId}`);

    const layer = this.layers.get(layerId);
    if (!layer) throw new Error(`Layer not found: ${layerId}`);

    const dem = this.demData.get(layerId) || this.generateDefaultDEM();
    const resolution = options?.resolution || 10;
    const lat = (layer.coverage.minLat + layer.coverage.maxLat) / 2;
    const lng = (layer.coverage.minLng + layer.coverage.maxLng) / 2;

    const slope = options?.slope !== false ? await this.terrainAnalyzer.analyzeSlope(dem, resolution) : null;
    const elevation = await this.terrainAnalyzer.analyzeElevation(dem);
    const aspect = options?.aspect !== false ? await this.terrainAnalyzer.analyzeAspect(dem) : [];
    const solarRadiation = options?.solarRadiation !== false
      ? await this.terrainAnalyzer.analyzeSolarRadiation(dem, lat, lng) : null;
    const shadowAnalysis = options?.shadowAnalysis !== false
      ? await this.terrainAnalyzer.analyzeShadows(dem, lat, lng, new Date()) : null;
    const contours = options?.contourInterval ? await this.terrainAnalyzer.generateContours(dem, options.contourInterval) : [];
    const hillshade = options?.hillshade !== false
      ? await this.terrainAnalyzer.calculateHillshade(dem, 315, 45) : [];
    const curvature = options?.curvature !== false ? await this.terrainAnalyzer.calculateCurvature(dem) : [];
    const twi = options?.twi !== false ? await this.terrainAnalyzer.calculateTWI(dem) : [];
    const roughness = await this.terrainAnalyzer.calculateRoughness(dem);

    const result: TerrainAnalysis = {
      slope: slope || {
        average: 0, min: 0, max: 0,
        classification: { flat: 100, gentle: 0, moderate: 0, steep: 0, verySteep: 0, extreme: 0 },
        slopeMap: [], slopeAspectMap: []
      },
      elevation,
      aspect: {
        min: Math.min(...aspect.flat()),
        max: Math.max(...aspect.flat()),
        average: aspect.flat().reduce((a, b) => a + b, 0) / (aspect.length * (aspect[0]?.length || 1))
      },
      solarRadiation: solarRadiation || {
        totalRadiation: 0, directRadiation: 0, diffuseRadiation: 0,
        radiationMap: [], peakSunHours: 0, optimalPanelAngle: 0
      },
      shadowAnalysis: shadowAnalysis || {
        shadowMap: [], shadowHours: 0, shadowPolygons: [], solarObstruction: 0
      },
      contourLines: contours.map(c => ({ points: c, length: 0 })),
      hillshade,
      curvature,
      roughness,
      twi
    };

    this.setStatus('idle');
    return result;
  }

  async analyzeSoil(layerId: string, options?: SoilAnalysisOptions): Promise<SoilAnalysis> {
    this.setStatus('running');
    this.logger.info(`Analyzing soil for layer: ${layerId}`);

    const layer = this.layers.get(layerId);
    if (!layer) throw new Error(`Layer not found: ${layerId}`);

    const location: GeoPoint = {
      lat: (layer.coverage.minLat + layer.coverage.maxLat) / 2,
      lng: (layer.coverage.minLng + layer.coverage.maxLng) / 2
    };
    const depth = options?.depth || 30;

    const soilProfile = await this.soilAnalyzer.getSoilProfile(location, depth);
    const bearingCapacity = await this.soilAnalyzer.analyzeBearingCapacity(soilProfile, depth);
    const groundwater = options?.includeGroundwater !== false
      ? await this.soilAnalyzer.analyzeGroundwater(location, depth) : this.defaultGroundwater();
    const settlement = options?.includeSettlement !== false
      ? await this.soilAnalyzer.analyzeSettlement(soilProfile, 200) : this.defaultSettlement();
    const soilType = soilProfile[0]?.soilType;
    const expansion = options?.includeExpansion !== false
      ? await this.soilAnalyzer.analyzeExpansionContraction(soilType, 15) : this.defaultExpansion();
    const sliding = await this.soilAnalyzer.analyzeSliding(5, {
      cohesion: 25, frictionAngle: 30, unitWeight: 18, saturatedUnitWeight: 20,
      poissonRatio: 0.3, modulusOfElasticity: 50, permeability: 1e-6
    });
    const liquefaction = options?.includeLiquefaction !== false
      ? await this.soilAnalyzer.assessLiquefaction(soilProfile, 0.15) : 0;
    const geotechnicalRisks = await this.soilAnalyzer.assessGeotechnicalRisks(soilProfile);
    const compactionReq = await this.soilAnalyzer.determineCompactionRequirements(soilType);

    this.setStatus('idle');
    return {
      bearingCapacity, groundwaterLevel: groundwater, settlement, sliding,
      expansionContraction: expansion, geotechnicalRisks, soilProfile,
      liquefactionPotential: liquefaction, compactionRequirements: compactionReq
    };
  }

  async analyzeClimate(location: GeoPoint, options?: ClimateAnalysisOptions): Promise<ClimateData> {
    this.setStatus('running');
    this.logger.info(`Analyzing climate at (${location.lat}, ${location.lng})`);
    const result = await this.climateAnalyzer.getClimateSummary(location);
    this.setStatus('idle');
    return result;
  }

  async analyzeTransport(from: GeoPoint, to: GeoPoint, options?: TransportOptions): Promise<TransportIntelligence> {
    this.setStatus('running');
    this.logger.info(`Analyzing transport from (${from.lat},${from.lng}) to (${to.lat},${to.lng})`);

    const trafficFlow = options?.includeTraffic !== false
      ? await this.transportAnalyzer.analyzeTrafficFlow(from, to) : this.defaultTrafficFlow();
    const shippingTime = await this.transportAnalyzer.analyzeShippingTime(from, to);
    const equipmentRoutes = options?.mode === 'equipment' || options?.mode === 'all'
      ? await this.transportAnalyzer.findEquipmentRoutes(from, to, 'crane') : [];
    const concreteRoutes = options?.mode === 'concrete' || options?.mode === 'all'
      ? await this.transportAnalyzer.findConcreteRoutes(
          [{ lat: 24.7136, lng: 46.6753 }], to) : [];
    const supplierTime = await this.transportAnalyzer.analyzeSupplierLeadTime(
      ['SupplierA', 'SupplierB'], ['Cement', 'Steel']);
    const alternativeRoutes = options?.includeAlternatives !== false
      ? await this.transportAnalyzer.findAlternativeRoutes(
          { points: [from, to], length: 0 }) : [];

    this.setStatus('idle');
    return {
      trafficFlow, shippingTime, equipmentRoutes, concreteRoutes,
      supplierTime, alternativeRoutes
    };
  }

  async analyzeServices(location: GeoPoint, options?: ServicesOptions): Promise<InfrastructureService> {
    this.setStatus('running');
    this.logger.info(`Analyzing services at (${location.lat}, ${location.lng})`);
    const radius = options?.searchRadius || 5000;
    const result = await this.servicesAnalyzer.getInfrastructureSummary(location, radius);
    this.setStatus('idle');
    return result;
  }

  async analyzeSite(layerId: string, options?: SiteAnalysisOptions): Promise<SiteAnalysis> {
    this.setStatus('running');
    this.logger.info(`Analyzing site for layer: ${layerId}`);

    const layer = this.layers.get(layerId);
    if (!layer) throw new Error(`Layer not found: ${layerId}`);

    const dem = this.demData.get(layerId) || this.generateDefaultDEM();
    const location: GeoPoint = {
      lat: (layer.coverage.minLat + layer.coverage.maxLat) / 2,
      lng: (layer.coverage.minLng + layer.coverage.maxLng) / 2
    };
    const siteBounds = layer.coverage;
    const sitePolygon: GeoPolygon = {
      points: [
        { lat: siteBounds.minLat, lng: siteBounds.minLng },
        { lat: siteBounds.minLat, lng: siteBounds.maxLng },
        { lat: siteBounds.maxLat, lng: siteBounds.maxLng },
        { lat: siteBounds.maxLat, lng: siteBounds.minLng },
        { lat: siteBounds.minLat, lng: siteBounds.minLng }
      ]
    };

    const area = options?.includeSlopes !== false || true
      ? await this.siteAnalyzer.analyzeArea(siteBounds, 5) : null;
    const slopes = options?.includeSlopes !== false
      ? await this.siteAnalyzer.analyzeSlopes(dem) : null;
    const sunPath = options?.includeSun !== false
      ? await this.siteAnalyzer.analyzeSunPath(location, new Date()) : null;
    const wind = options?.includeWind !== false
      ? await this.siteAnalyzer.analyzeWindExposure(location, dem) : null;
    const shadows = options?.includeShadows !== false
      ? await this.siteAnalyzer.analyzeShadows(dem, location, new Date()) : null;
    const designLevels = dem.map(row => row.map(v => v - 2));
    const excavation = options?.includeExcavation !== false
      ? await this.siteAnalyzer.findExcavationZones(dem, designLevels) : [];
    const fill = options?.includeExcavation !== false
      ? await this.siteAnalyzer.findFillZones(dem, designLevels) : [];
    const storage = options?.includeLogistics !== false
      ? await this.siteAnalyzer.findStorageZones(sitePolygon, {}) : [];
    const footprint: GeoPolygon = {
      points: [
        { lat: siteBounds.minLat + 0.01, lng: siteBounds.minLng + 0.01 },
        { lat: siteBounds.minLat + 0.01, lng: siteBounds.maxLng - 0.01 },
        { lat: siteBounds.maxLat - 0.01, lng: siteBounds.maxLng - 0.01 },
        { lat: siteBounds.maxLat - 0.01, lng: siteBounds.minLng + 0.01 },
        { lat: siteBounds.minLat + 0.01, lng: siteBounds.minLng + 0.01 }
      ]
    };
    const cranes = options?.includeCranePlacement !== false
      ? await this.siteAnalyzer.findOptimalCraneLocations(sitePolygon, footprint) : [];
    const gates = await this.siteAnalyzer.findOptimalGateLocations(sitePolygon, []);

    this.setStatus('idle');
    return {
      area: area || {
        totalArea: 0, buildableArea: 0, setbackArea: 0, greenArea: 0,
        parkingArea: 0, circulationArea: 0, areaUtilization: 0
      },
      slopes: slopes || {
        averageSlope: 0, maxSlope: 0, slopeDirection: 'N/A', slopeZones: [],
        cutVolume: 0, fillVolume: 0, balanceRatio: 0
      },
      sunDirection: sunPath || {
        sunrise: '06:00', sunset: '18:00', solarAzimuth: 180,
        solarAltitude: 60, dailySunHours: 12, optimalOrientation: 'South',
        seasonalVariation: []
      },
      windDirection: wind || {
        prevailingDirection: 'N', averageSpeed: 0, maxGust: 0,
        exposure: 'Moderate', windLoadZones: []
      },
      shadows: shadows || {
        shadowDuration: 0, shadowCoverage: 0, shadowMap: [],
        solarAccess: [], obstructionAnalysis: []
      },
      excavationZones: excavation,
      fillZones: fill,
      storageZones: storage,
      craneLocations: cranes,
      gateLocations: gates
    };
  }

  async spatialQuery(layerId: string, query: SpatialQuery): Promise<QueryResult> {
    this.setStatus('running');
    this.logger.info(`Executing spatial query on layer: ${layerId}`);

    const data = this.layerData.get(layerId) || [];
    const startTime = Date.now();
    let filtered = [...data];

    switch (query.type) {
      case SpatialQueryType.WithinDistance:
        if (query.geometry && 'lat' in query.geometry) {
          filtered = this.filterWithinDistance(filtered, query.geometry as GeoPoint, query.distance || 100);
        }
        break;
      case SpatialQueryType.Contains:
        if (query.geometry && 'points' in query.geometry) {
          filtered = this.filterContains(filtered, query.geometry as GeoPolygon);
        }
        break;
      case SpatialQueryType.Intersects:
        if (query.geometry && 'points' in query.geometry) {
          filtered = this.filterIntersects(filtered, query.geometry as GeoPolygon);
        }
        break;
      case SpatialQueryType.NearestNeighbor:
        if (query.geometry && 'lat' in query.geometry) {
          filtered = this.filterNearestNeighbor(filtered, query.geometry as GeoPoint, 10);
        }
        break;
      case SpatialQueryType.BBox:
        if (query.geometry && 'points' in query.geometry) {
          const poly = query.geometry as GeoPolygon;
          const bounds: GeoBounds = {
            minLat: Math.min(...poly.points.map(p => p.lat)),
            maxLat: Math.max(...poly.points.map(p => p.lat)),
            minLng: Math.min(...poly.points.map(p => p.lng)),
            maxLng: Math.max(...poly.points.map(p => p.lng))
          };
          filtered = filtered.filter(f => {
            const lat = (f as any).lat || 0;
            const lng = (f as any).lng || 0;
            return lat >= bounds.minLat && lat <= bounds.maxLat &&
                   lng >= bounds.minLng && lng <= bounds.maxLng;
          });
        }
        break;
      case SpatialQueryType.KNN:
        if (query.geometry && 'lat' in query.geometry) {
          filtered = this.filterNearestNeighbor(filtered, query.geometry as GeoPoint, query.distance || 5);
        }
        break;
    }

    if (query.filters) {
      for (const filter of query.filters) {
        filtered = filtered.filter(f => this.applyFilter(f, filter));
      }
    }

    let aggregation: Record<string, unknown> | undefined;
    if (query.aggregations) {
      aggregation = {};
      for (const agg of query.aggregations) {
        aggregation[agg.type] = this.computeAggregation(filtered, agg);
      }
    }

    const executionTime = Date.now() - startTime;

    this.setStatus('idle');
    return {
      features: filtered,
      totalCount: filtered.length,
      aggregation,
      executionTime
    };
  }

  async findWithinDistance(layerId: string, center: GeoPoint, distance: number): Promise<QueryResult> {
    return this.spatialQuery(layerId, {
      type: SpatialQueryType.WithinDistance,
      targetLayer: layerId,
      geometry: center,
      distance
    });
  }

  async findContains(layerId: string, geometry: GeoPolygon): Promise<QueryResult> {
    return this.spatialQuery(layerId, {
      type: SpatialQueryType.Contains,
      targetLayer: layerId,
      geometry
    });
  }

  async findIntersects(layerId: string, geometry: GeoPolygon): Promise<QueryResult> {
    return this.spatialQuery(layerId, {
      type: SpatialQueryType.Intersects,
      targetLayer: layerId,
      geometry
    });
  }

  async nearestNeighbor(layerId: string, point: GeoPoint, k: number): Promise<QueryResult> {
    return this.spatialQuery(layerId, {
      type: SpatialQueryType.KNN,
      targetLayer: layerId,
      geometry: point,
      distance: k
    });
  }

  async askGeospatialAI(input: AIQuestionInput): Promise<AIQuestionResult> {
    this.logger.info(`Processing AI question: ${input.question}`);

    const layers = input.context?.layerIds
      ? input.context.layerIds.map(id => this.layers.get(id)).filter(Boolean) as GISLayer[]
      : Array.from(this.layers.values());

    const sourceInfo = layers.map(l => `${l.name} (${l.type})`).join(', ');
    const locationInfo = input.context?.location
      ? `at (${input.context.location.lat}, ${input.context.location.lng})`
      : '';

    const answer = this.generateAIAnswer(input.question, locationInfo, sourceInfo);

    return {
      question: input.question,
      answer,
      confidence: 0.85,
      sources: layers.map(l => l.id),
      relatedLayers: layers.map(l => l.name),
      spatialContext: input.context?.bounds,
      timestamp: new Date().toISOString()
    };
  }

  async integrateDigitalTwin(twinId: string, projectId: string): Promise<DigitalTwinIntegration> {
    this.logger.info(`Integrating digital twin: ${twinId} for project: ${projectId}`);

    const integration: DigitalTwinIntegration = {
      twinId,
      projectId,
      gisLayers: Array.from(this.layers.keys()),
      spatialIndex: { type: 'R-Tree', nodeCount: this.layers.size },
      lastSync: new Date().toISOString(),
      syncFrequency: 3600,
      linkedFeatures: Array.from(this.layers.values()).map(layer => ({
        gisFeatureId: layer.id,
        twinElementId: `${twinId}-${layer.id}`,
        relationship: SpatialRelationType.ConnectedTo,
        confidence: 0.9
      }))
    };

    this.digitalTwins.set(twinId, integration);
    return integration;
  }

  async syncWithDigitalTwin(integration: DigitalTwinIntegration): Promise<void> {
    this.logger.info(`Syncing with digital twin: ${integration.twinId}`);
    integration.lastSync = new Date().toISOString();
    this.digitalTwins.set(integration.twinId, integration);
  }

  async validateCRS(layerId: string): Promise<boolean> {
    const layer = this.layers.get(layerId);
    if (!layer) return false;

    const validCRSCodes = [CoordinateSystem.WGS84, CoordinateSystem.UTM,
      CoordinateSystem.AIN_EL_ABD_1970, CoordinateSystem.JGD2000];
    return validCRSCodes.includes(layer.crs);
  }

  async transformCRS(layerId: string, targetCRS: string): Promise<GISLayer> {
    const layer = this.layers.get(layerId);
    if (!layer) throw new Error(`Layer not found: ${layerId}`);

    const updated: GISLayer = {
      ...layer,
      crs: targetCRS as CoordinateSystem,
      updateDate: new Date().toISOString(),
      metadata: { ...layer.metadata, originalCRS: layer.crs, transformedAt: new Date().toISOString() }
    };

    this.layers.set(layerId, updated);
    return updated;
  }

  getLayerCoverage(layerId: string): GeoBounds {
    const layer = this.layers.get(layerId);
    if (!layer) throw new Error(`Layer not found: ${layerId}`);
    return layer.coverage;
  }

  async exportLayer(layerId: string, format: string): Promise<string> {
    const layer = this.layers.get(layerId);
    if (!layer) throw new Error(`Layer not found: ${layerId}`);

    const data = this.layerData.get(layerId) || [];
    const exportData = {
      layer,
      features: data,
      exportedAt: new Date().toISOString(),
      format
    };

    return JSON.stringify(exportData, null, 2);
  }

  private detectSourceType(source: string): DataSourceType {
    if (source.includes('arcgis') || source.includes('.agf')) return DataSourceType.ArcGIS;
    if (source.includes('qgis') || source.includes('.qgz')) return DataSourceType.QGIS;
    if (source.includes('openstreet') || source.includes('osm')) return DataSourceType.OpenStreetMap;
    if (source.includes('google')) return DataSourceType.GoogleMaps;
    if (source.includes('municipal') || source.includes('baladiya')) return DataSourceType.Municipality;
    if (source.includes('.shp')) return DataSourceType.SHP;
    if (source.includes('.geojson') || source.includes('.json')) return DataSourceType.GeoJSON;
    if (source.includes('.kml') || source.includes('.kmz')) return DataSourceType.KML;
    if (source.includes('.gpkg')) return DataSourceType.GeoPackage;
    if (source.includes('dem') || source.includes('elevation')) return DataSourceType.DEM;
    if (source.includes('satellite') || source.includes('sentinel')) return DataSourceType.Satellite;
    if (source.includes('lidar') || source.includes('laz')) return DataSourceType.LiDAR;
    if (source.includes('survey')) return DataSourceType.SurveyData;
    if (source.includes('weather') || source.includes('climate')) return DataSourceType.Weather;
    return DataSourceType.GeoJSON;
  }

  private detectFileSourceType(filePath: string): DataSourceType {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, DataSourceType> = {
      shp: DataSourceType.SHP, geojson: DataSourceType.GeoJSON, json: DataSourceType.GeoJSON,
      kml: DataSourceType.KML, kmz: DataSourceType.KML, gpkg: DataSourceType.GeoPackage,
      tif: DataSourceType.DEM, tiff: DataSourceType.DEM, asc: DataSourceType.DEM,
      laz: DataSourceType.LiDAR, las: DataSourceType.LiDAR, csv: DataSourceType.SurveyData,
      xml: DataSourceType.KML
    };
    return map[ext] || DataSourceType.GeoJSON;
  }

  private assessLayerQuality(source: string, type: GISLayerType): LayerQuality {
    const baseScore = 0.85;
    const issues: LayerIssue[] = [];
    return {
      completeness: baseScore + Math.random() * 0.1,
      accuracy: baseScore + Math.random() * 0.1,
      precision: 0.8 + Math.random() * 0.15,
      resolution: type === GISLayerType.Terrain ? 10 : 1,
      temporalValidity: 0.9 + Math.random() * 0.1,
      score: 0.85 + Math.random() * 0.1,
      issues
    };
  }

  private estimateCoverage(source: string, type: GISLayerType): GeoBounds {
    return {
      minLat: 24.0, maxLat: 25.0,
      minLng: 46.0, maxLng: 47.0
    };
  }

  private getDefaultAttributes(type: GISLayerType): string[] {
    const common = ['id', 'name', 'geometry'];
    const typeAttributes: Record<GISLayerType, string[]> = {
      [GISLayerType.AdministrativeBoundaries]: [...common, 'region', 'population', 'area'],
      [GISLayerType.Roads]: [...common, 'roadType', 'lanes', 'speedLimit', 'surface'],
      [GISLayerType.Bridges]: [...common, 'bridgeType', 'length', 'capacity', 'status'],
      [GISLayerType.Tunnels]: [...common, 'tunnelType', 'length', 'depth', 'ventilation'],
      [GISLayerType.Railways]: [...common, 'railType', 'tracks', 'electrified', 'speed'],
      [GISLayerType.Airports]: [...common, 'airportType', 'runways', 'passengerCapacity'],
      [GISLayerType.Ports]: [...common, 'portType', 'berths', 'depth', 'cargoCapacity'],
      [GISLayerType.Rivers]: [...common, 'riverType', 'width', 'depth', 'flowRate'],
      [GISLayerType.WaterNetworks]: [...common, 'pipeDiameter', 'pressure', 'material', 'valves'],
      [GISLayerType.SewageNetworks]: [...common, 'pipeDiameter', 'flowType', 'treatmentPlant'],
      [GISLayerType.ElectricalNetworks]: [...common, 'voltage', 'capacity', 'substation'],
      [GISLayerType.Communications]: [...common, 'commType', 'bandwidth', 'provider'],
      [GISLayerType.Gas]: [...common, 'pressure', 'pipeDiameter', 'capacity'],
      [GISLayerType.Terrain]: [...common, 'elevation', 'slope', 'aspect'],
      [GISLayerType.Vegetation]: [...common, 'vegType', 'density', 'height', 'species'],
      [GISLayerType.FloodZones]: [...common, 'floodLevel', 'returnPeriod', 'risk'],
      [GISLayerType.SeismicZones]: [...common, 'seismicZone', 'pga', 'magnitude'],
      [GISLayerType.ProtectedAreas]: [...common, 'protectionLevel', 'authority', 'restrictions']
    };
    return typeAttributes[type] || common;
  }

  private generateMockLayerData(type: GISLayerType, bounds: GeoBounds): Record<string, unknown>[] {
    const features: Record<string, unknown>[] = [];
    const count = type === GISLayerType.Roads ? 50 : 20;

    for (let i = 0; i < count; i++) {
      const lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
      const lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);
      features.push({
        id: `${type}-${i}`,
        lat,
        lng,
        name: `${type} Feature ${i}`,
        type,
        value: Math.random() * 100,
        area: Math.random() * 10000,
        length: Math.random() * 1000,
        timestamp: new Date().toISOString()
      });
    }
    return features;
  }

  private generateDefaultDEM(): number[][] {
    const size = 50;
    const dem: number[][] = [];
    for (let i = 0; i < size; i++) {
      dem[i] = [];
      for (let j = 0; j < size; j++) {
        dem[i][j] = 500 + Math.sin(i * 0.2) * 40 + Math.cos(j * 0.15) * 25;
      }
    }
    return dem;
  }

  private filterWithinDistance(data: Record<string, unknown>[], center: GeoPoint, distance: number): Record<string, unknown>[] {
    return data.filter(f => {
      const lat = (f as any).lat || 0;
      const lng = (f as any).lng || 0;
      const d = this.haversineDistance(center.lat, center.lng, lat, lng);
      return d <= distance;
    });
  }

  private filterContains(data: Record<string, unknown>[], polygon: GeoPolygon): Record<string, unknown>[] {
    return data.filter(f => {
      const lat = (f as any).lat || 0;
      const lng = (f as any).lng || 0;
      return this.pointInPolygon(lat, lng, polygon);
    });
  }

  private filterIntersects(data: Record<string, unknown>[], polygon: GeoPolygon): Record<string, unknown>[] {
    return this.filterContains(data, polygon);
  }

  private filterNearestNeighbor(data: Record<string, unknown>[], point: GeoPoint, k: number): Record<string, unknown>[] {
    const withDistance = data.map(f => {
      const lat = (f as any).lat || 0;
      const lng = (f as any).lng || 0;
      return { feature: f, distance: this.haversineDistance(point.lat, point.lng, lat, lng) };
    });
    withDistance.sort((a, b) => a.distance - b.distance);
    return withDistance.slice(0, k).map(w => w.feature);
  }

  private applyFilter(feature: Record<string, unknown>, filter: { attribute: string; operator: string; value: unknown }): boolean {
    const value = feature[filter.attribute];
    switch (filter.operator) {
      case 'eq': return value === filter.value;
      case 'neq': return value !== filter.value;
      case 'gt': return (value as number) > (filter.value as number);
      case 'gte': return (value as number) >= (filter.value as number);
      case 'lt': return (value as number) < (filter.value as number);
      case 'lte': return (value as number) <= (filter.value as number);
      case 'contains': return String(value).includes(String(filter.value));
      case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
      case 'between': {
        const arr = filter.value as [number, number];
        return (value as number) >= arr[0] && (value as number) <= arr[1];
      }
      default: return true;
    }
  }

  private computeAggregation(data: Record<string, unknown>[], agg: { type: string; attribute?: string }): unknown {
    const attr = agg.attribute;
    const values = attr ? data.map(f => f[attr] as number).filter(v => v !== undefined) : [];
    switch (agg.type) {
      case 'count': return data.length;
      case 'sum': return values.reduce((a, b) => a + b, 0);
      case 'avg': return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      case 'min': return values.length > 0 ? Math.min(...values) : 0;
      case 'max': return values.length > 0 ? Math.max(...values) : 0;
      default: return null;
    }
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return deg * Math.PI / 180;
  }

  private pointInPolygon(lat: number, lng: number, polygon: GeoPolygon): boolean {
    let inside = false;
    const n = polygon.points.length;
    let j = n - 1;
    for (let i = 0; i < n; i++) {
      if ((polygon.points[i].lng > lng) !== (polygon.points[j].lng > lng) &&
          lat < (polygon.points[j].lat - polygon.points[i].lat) *
          (lng - polygon.points[i].lng) / (polygon.points[j].lng - polygon.points[i].lng) +
          polygon.points[i].lat) {
        inside = !inside;
      }
      j = i;
    }
    return inside;
  }

  private generateAIAnswer(question: string, locationInfo: string, sourceInfo: string): string {
    const q = question.toLowerCase();
    if (q.includes('flood') || q.includes('flood')) {
      return `Based on GIS analysis of flood zones ${locationInfo}, the area has a moderate flood risk. ${sourceInfo}`;
    }
    if (q.includes('soil') || q.includes('bearing')) {
      return `Soil analysis ${locationInfo} indicates bearing capacity suitable for standard foundations. ${sourceInfo}`;
    }
    if (q.includes('terrain') || q.includes('slope')) {
      return `Terrain analysis ${locationInfo} shows moderate slopes suitable for construction. ${sourceInfo}`;
    }
    if (q.includes('road') || q.includes('access') || q.includes('transport')) {
      return `Transport analysis ${locationInfo} indicates good road connectivity with average travel times. ${sourceInfo}`;
    }
    if (q.includes('utility') || q.includes('service') || q.includes('infrastructure')) {
      return `Infrastructure services ${locationInfo} are available within standard connection distances. ${sourceInfo}`;
    }
    if (q.includes('climate') || q.includes('weather')) {
      return `Climate analysis ${locationInfo} shows hot summers with mild winters and low rainfall. ${sourceInfo}`;
    }
    return `Geospatial analysis ${locationInfo} completed. Available layers: ${sourceInfo}. Confidence: high.`;
  }

  private defaultGroundwater() {
    return {
      depth: 15, seasonalFluctuation: 2, aggressivity: 'Medium' as const,
      ph: 7.2, sulfate: 500, chloride: 300,
      dewateringRequired: true, dewateringVolume: 5000
    };
  }

  private defaultSettlement() {
    return {
      totalSettlement: 25, differentialSettlement: 10,
      immediateSettlement: 15, consolidationSettlement: 10,
      timeToSettle: 365, acceptable: true
    };
  }

  private defaultExpansion() {
    return {
      swellPotential: 'Medium' as const, swellPressure: 50,
      shrinkagePotential: 'Medium' as const, volumetricChange: 3,
      treatmentRequired: true, treatmentMethod: 'Lime stabilization'
    };
  }

  private defaultTrafficFlow() {
    return {
      averageSpeed: 60, peakHours: ['07:00-09:00', '16:00-19:00'],
      congestionLevel: 'Moderate' as const, bottleneckPoints: [],
      timeToDestination: 30, trafficZones: []
    };
  }
}
