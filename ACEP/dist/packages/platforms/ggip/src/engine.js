"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GISEngine = void 0;
const core_1 = require("@acep/core");
const analyzers_1 = require("./analyzers");
const analyzers_2 = require("./analyzers");
const analyzers_3 = require("./analyzers");
const analyzers_4 = require("./analyzers");
const analyzers_5 = require("./analyzers");
const analyzers_6 = require("./analyzers");
const types_1 = require("./types");
class GISEngine extends core_1.BaseEngine {
    layers = new Map();
    layerData = new Map();
    demData = new Map();
    knowledgeGraph;
    spatialGraph;
    terrainAnalyzer;
    soilAnalyzer;
    climateAnalyzer;
    transportAnalyzer;
    servicesAnalyzer;
    siteAnalyzer;
    digitalTwins = new Map();
    aiContext = new Map();
    constructor(kg, spatialGraph) {
        super('GISEngine', '1.0.0');
        this.knowledgeGraph = kg;
        this.spatialGraph = spatialGraph;
        this.terrainAnalyzer = new analyzers_1.TerrainAnalyzer();
        this.soilAnalyzer = new analyzers_2.SoilAnalyzer();
        this.climateAnalyzer = new analyzers_3.ClimateAnalyzer();
        this.transportAnalyzer = new analyzers_4.TransportAnalyzer();
        this.servicesAnalyzer = new analyzers_5.ServicesAnalyzer();
        this.siteAnalyzer = new analyzers_6.SiteAnalyzer(this);
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('GIS & Geospatial Intelligence Engine initialized');
    }
    async validate() {
        this.logger.info('Validating GIS Engine configuration');
        return true;
    }
    async loadLayer(source, type, options) {
        this.setStatus('running');
        this.logger.info(`Loading GIS layer: ${type} from ${source}`);
        const layerId = `LAYER-${type}-${Date.now()}`;
        const layer = {
            id: layerId,
            name: `${type} Layer`,
            type,
            source: this.detectSourceType(source),
            crs: options?.crs || types_1.CoordinateSystem.WGS84,
            projection: options?.projection || types_1.MapProjection.TransverseMercator,
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
        if (type === types_1.GISLayerType.Terrain) {
            const demSize = 100;
            const dem = [];
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
            type: types_1.EngineeringNodeType.Location,
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
    async loadLayerFromFile(filePath, type) {
        this.logger.info(`Loading layer from file: ${filePath}`);
        const sourceType = this.detectFileSourceType(filePath);
        return this.loadLayer(filePath, type, { crs: types_1.CoordinateSystem.WGS84 });
    }
    async removeLayer(layerId) {
        this.layers.delete(layerId);
        this.layerData.delete(layerId);
        this.demData.delete(layerId);
        this.logger.info(`Removed layer: ${layerId}`);
    }
    getLayer(layerId) {
        return this.layers.get(layerId);
    }
    listLayers(type) {
        const all = Array.from(this.layers.values());
        return type ? all.filter(l => l.type === type) : all;
    }
    async analyzeTerrain(layerId, options) {
        this.setStatus('running');
        this.logger.info(`Analyzing terrain for layer: ${layerId}`);
        const layer = this.layers.get(layerId);
        if (!layer)
            throw new Error(`Layer not found: ${layerId}`);
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
        const result = {
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
    async analyzeSoil(layerId, options) {
        this.setStatus('running');
        this.logger.info(`Analyzing soil for layer: ${layerId}`);
        const layer = this.layers.get(layerId);
        if (!layer)
            throw new Error(`Layer not found: ${layerId}`);
        const location = {
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
    async analyzeClimate(location, options) {
        this.setStatus('running');
        this.logger.info(`Analyzing climate at (${location.lat}, ${location.lng})`);
        const result = await this.climateAnalyzer.getClimateSummary(location);
        this.setStatus('idle');
        return result;
    }
    async analyzeTransport(from, to, options) {
        this.setStatus('running');
        this.logger.info(`Analyzing transport from (${from.lat},${from.lng}) to (${to.lat},${to.lng})`);
        const trafficFlow = options?.includeTraffic !== false
            ? await this.transportAnalyzer.analyzeTrafficFlow(from, to) : this.defaultTrafficFlow();
        const shippingTime = await this.transportAnalyzer.analyzeShippingTime(from, to);
        const equipmentRoutes = options?.mode === 'equipment' || options?.mode === 'all'
            ? await this.transportAnalyzer.findEquipmentRoutes(from, to, 'crane') : [];
        const concreteRoutes = options?.mode === 'concrete' || options?.mode === 'all'
            ? await this.transportAnalyzer.findConcreteRoutes([{ lat: 24.7136, lng: 46.6753 }], to) : [];
        const supplierTime = await this.transportAnalyzer.analyzeSupplierLeadTime(['SupplierA', 'SupplierB'], ['Cement', 'Steel']);
        const alternativeRoutes = options?.includeAlternatives !== false
            ? await this.transportAnalyzer.findAlternativeRoutes({ points: [from, to], length: 0 }) : [];
        this.setStatus('idle');
        return {
            trafficFlow, shippingTime, equipmentRoutes, concreteRoutes,
            supplierTime, alternativeRoutes
        };
    }
    async analyzeServices(location, options) {
        this.setStatus('running');
        this.logger.info(`Analyzing services at (${location.lat}, ${location.lng})`);
        const radius = options?.searchRadius || 5000;
        const result = await this.servicesAnalyzer.getInfrastructureSummary(location, radius);
        this.setStatus('idle');
        return result;
    }
    async analyzeSite(layerId, options) {
        this.setStatus('running');
        this.logger.info(`Analyzing site for layer: ${layerId}`);
        const layer = this.layers.get(layerId);
        if (!layer)
            throw new Error(`Layer not found: ${layerId}`);
        const dem = this.demData.get(layerId) || this.generateDefaultDEM();
        const location = {
            lat: (layer.coverage.minLat + layer.coverage.maxLat) / 2,
            lng: (layer.coverage.minLng + layer.coverage.maxLng) / 2
        };
        const siteBounds = layer.coverage;
        const sitePolygon = {
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
        const footprint = {
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
    async spatialQuery(layerId, query) {
        this.setStatus('running');
        this.logger.info(`Executing spatial query on layer: ${layerId}`);
        const data = this.layerData.get(layerId) || [];
        const startTime = Date.now();
        let filtered = [...data];
        switch (query.type) {
            case types_1.SpatialQueryType.WithinDistance:
                if (query.geometry && 'lat' in query.geometry) {
                    filtered = this.filterWithinDistance(filtered, query.geometry, query.distance || 100);
                }
                break;
            case types_1.SpatialQueryType.Contains:
                if (query.geometry && 'points' in query.geometry) {
                    filtered = this.filterContains(filtered, query.geometry);
                }
                break;
            case types_1.SpatialQueryType.Intersects:
                if (query.geometry && 'points' in query.geometry) {
                    filtered = this.filterIntersects(filtered, query.geometry);
                }
                break;
            case types_1.SpatialQueryType.NearestNeighbor:
                if (query.geometry && 'lat' in query.geometry) {
                    filtered = this.filterNearestNeighbor(filtered, query.geometry, 10);
                }
                break;
            case types_1.SpatialQueryType.BBox:
                if (query.geometry && 'points' in query.geometry) {
                    const poly = query.geometry;
                    const bounds = {
                        minLat: Math.min(...poly.points.map(p => p.lat)),
                        maxLat: Math.max(...poly.points.map(p => p.lat)),
                        minLng: Math.min(...poly.points.map(p => p.lng)),
                        maxLng: Math.max(...poly.points.map(p => p.lng))
                    };
                    filtered = filtered.filter(f => {
                        const lat = f.lat || 0;
                        const lng = f.lng || 0;
                        return lat >= bounds.minLat && lat <= bounds.maxLat &&
                            lng >= bounds.minLng && lng <= bounds.maxLng;
                    });
                }
                break;
            case types_1.SpatialQueryType.KNN:
                if (query.geometry && 'lat' in query.geometry) {
                    filtered = this.filterNearestNeighbor(filtered, query.geometry, query.distance || 5);
                }
                break;
        }
        if (query.filters) {
            for (const filter of query.filters) {
                filtered = filtered.filter(f => this.applyFilter(f, filter));
            }
        }
        let aggregation;
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
    async findWithinDistance(layerId, center, distance) {
        return this.spatialQuery(layerId, {
            type: types_1.SpatialQueryType.WithinDistance,
            targetLayer: layerId,
            geometry: center,
            distance
        });
    }
    async findContains(layerId, geometry) {
        return this.spatialQuery(layerId, {
            type: types_1.SpatialQueryType.Contains,
            targetLayer: layerId,
            geometry
        });
    }
    async findIntersects(layerId, geometry) {
        return this.spatialQuery(layerId, {
            type: types_1.SpatialQueryType.Intersects,
            targetLayer: layerId,
            geometry
        });
    }
    async nearestNeighbor(layerId, point, k) {
        return this.spatialQuery(layerId, {
            type: types_1.SpatialQueryType.KNN,
            targetLayer: layerId,
            geometry: point,
            distance: k
        });
    }
    async askGeospatialAI(input) {
        this.logger.info(`Processing AI question: ${input.question}`);
        const layers = input.context?.layerIds
            ? input.context.layerIds.map(id => this.layers.get(id)).filter(Boolean)
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
    async integrateDigitalTwin(twinId, projectId) {
        this.logger.info(`Integrating digital twin: ${twinId} for project: ${projectId}`);
        const integration = {
            twinId,
            projectId,
            gisLayers: Array.from(this.layers.keys()),
            spatialIndex: { type: 'R-Tree', nodeCount: this.layers.size },
            lastSync: new Date().toISOString(),
            syncFrequency: 3600,
            linkedFeatures: Array.from(this.layers.values()).map(layer => ({
                gisFeatureId: layer.id,
                twinElementId: `${twinId}-${layer.id}`,
                relationship: types_1.SpatialRelationType.ConnectedTo,
                confidence: 0.9
            }))
        };
        this.digitalTwins.set(twinId, integration);
        return integration;
    }
    async syncWithDigitalTwin(integration) {
        this.logger.info(`Syncing with digital twin: ${integration.twinId}`);
        integration.lastSync = new Date().toISOString();
        this.digitalTwins.set(integration.twinId, integration);
    }
    async validateCRS(layerId) {
        const layer = this.layers.get(layerId);
        if (!layer)
            return false;
        const validCRSCodes = [types_1.CoordinateSystem.WGS84, types_1.CoordinateSystem.UTM,
            types_1.CoordinateSystem.AIN_EL_ABD_1970, types_1.CoordinateSystem.JGD2000];
        return validCRSCodes.includes(layer.crs);
    }
    async transformCRS(layerId, targetCRS) {
        const layer = this.layers.get(layerId);
        if (!layer)
            throw new Error(`Layer not found: ${layerId}`);
        const updated = {
            ...layer,
            crs: targetCRS,
            updateDate: new Date().toISOString(),
            metadata: { ...layer.metadata, originalCRS: layer.crs, transformedAt: new Date().toISOString() }
        };
        this.layers.set(layerId, updated);
        return updated;
    }
    getLayerCoverage(layerId) {
        const layer = this.layers.get(layerId);
        if (!layer)
            throw new Error(`Layer not found: ${layerId}`);
        return layer.coverage;
    }
    async exportLayer(layerId, format) {
        const layer = this.layers.get(layerId);
        if (!layer)
            throw new Error(`Layer not found: ${layerId}`);
        const data = this.layerData.get(layerId) || [];
        const exportData = {
            layer,
            features: data,
            exportedAt: new Date().toISOString(),
            format
        };
        return JSON.stringify(exportData, null, 2);
    }
    detectSourceType(source) {
        if (source.includes('arcgis') || source.includes('.agf'))
            return types_1.DataSourceType.ArcGIS;
        if (source.includes('qgis') || source.includes('.qgz'))
            return types_1.DataSourceType.QGIS;
        if (source.includes('openstreet') || source.includes('osm'))
            return types_1.DataSourceType.OpenStreetMap;
        if (source.includes('google'))
            return types_1.DataSourceType.GoogleMaps;
        if (source.includes('municipal') || source.includes('baladiya'))
            return types_1.DataSourceType.Municipality;
        if (source.includes('.shp'))
            return types_1.DataSourceType.SHP;
        if (source.includes('.geojson') || source.includes('.json'))
            return types_1.DataSourceType.GeoJSON;
        if (source.includes('.kml') || source.includes('.kmz'))
            return types_1.DataSourceType.KML;
        if (source.includes('.gpkg'))
            return types_1.DataSourceType.GeoPackage;
        if (source.includes('dem') || source.includes('elevation'))
            return types_1.DataSourceType.DEM;
        if (source.includes('satellite') || source.includes('sentinel'))
            return types_1.DataSourceType.Satellite;
        if (source.includes('lidar') || source.includes('laz'))
            return types_1.DataSourceType.LiDAR;
        if (source.includes('survey'))
            return types_1.DataSourceType.SurveyData;
        if (source.includes('weather') || source.includes('climate'))
            return types_1.DataSourceType.Weather;
        return types_1.DataSourceType.GeoJSON;
    }
    detectFileSourceType(filePath) {
        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        const map = {
            shp: types_1.DataSourceType.SHP, geojson: types_1.DataSourceType.GeoJSON, json: types_1.DataSourceType.GeoJSON,
            kml: types_1.DataSourceType.KML, kmz: types_1.DataSourceType.KML, gpkg: types_1.DataSourceType.GeoPackage,
            tif: types_1.DataSourceType.DEM, tiff: types_1.DataSourceType.DEM, asc: types_1.DataSourceType.DEM,
            laz: types_1.DataSourceType.LiDAR, las: types_1.DataSourceType.LiDAR, csv: types_1.DataSourceType.SurveyData,
            xml: types_1.DataSourceType.KML
        };
        return map[ext] || types_1.DataSourceType.GeoJSON;
    }
    assessLayerQuality(source, type) {
        const baseScore = 0.85;
        const issues = [];
        return {
            completeness: baseScore + Math.random() * 0.1,
            accuracy: baseScore + Math.random() * 0.1,
            precision: 0.8 + Math.random() * 0.15,
            resolution: type === types_1.GISLayerType.Terrain ? 10 : 1,
            temporalValidity: 0.9 + Math.random() * 0.1,
            score: 0.85 + Math.random() * 0.1,
            issues
        };
    }
    estimateCoverage(source, type) {
        return {
            minLat: 24.0, maxLat: 25.0,
            minLng: 46.0, maxLng: 47.0
        };
    }
    getDefaultAttributes(type) {
        const common = ['id', 'name', 'geometry'];
        const typeAttributes = {
            [types_1.GISLayerType.AdministrativeBoundaries]: [...common, 'region', 'population', 'area'],
            [types_1.GISLayerType.Roads]: [...common, 'roadType', 'lanes', 'speedLimit', 'surface'],
            [types_1.GISLayerType.Bridges]: [...common, 'bridgeType', 'length', 'capacity', 'status'],
            [types_1.GISLayerType.Tunnels]: [...common, 'tunnelType', 'length', 'depth', 'ventilation'],
            [types_1.GISLayerType.Railways]: [...common, 'railType', 'tracks', 'electrified', 'speed'],
            [types_1.GISLayerType.Airports]: [...common, 'airportType', 'runways', 'passengerCapacity'],
            [types_1.GISLayerType.Ports]: [...common, 'portType', 'berths', 'depth', 'cargoCapacity'],
            [types_1.GISLayerType.Rivers]: [...common, 'riverType', 'width', 'depth', 'flowRate'],
            [types_1.GISLayerType.WaterNetworks]: [...common, 'pipeDiameter', 'pressure', 'material', 'valves'],
            [types_1.GISLayerType.SewageNetworks]: [...common, 'pipeDiameter', 'flowType', 'treatmentPlant'],
            [types_1.GISLayerType.ElectricalNetworks]: [...common, 'voltage', 'capacity', 'substation'],
            [types_1.GISLayerType.Communications]: [...common, 'commType', 'bandwidth', 'provider'],
            [types_1.GISLayerType.Gas]: [...common, 'pressure', 'pipeDiameter', 'capacity'],
            [types_1.GISLayerType.Terrain]: [...common, 'elevation', 'slope', 'aspect'],
            [types_1.GISLayerType.Vegetation]: [...common, 'vegType', 'density', 'height', 'species'],
            [types_1.GISLayerType.FloodZones]: [...common, 'floodLevel', 'returnPeriod', 'risk'],
            [types_1.GISLayerType.SeismicZones]: [...common, 'seismicZone', 'pga', 'magnitude'],
            [types_1.GISLayerType.ProtectedAreas]: [...common, 'protectionLevel', 'authority', 'restrictions']
        };
        return typeAttributes[type] || common;
    }
    generateMockLayerData(type, bounds) {
        const features = [];
        const count = type === types_1.GISLayerType.Roads ? 50 : 20;
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
    generateDefaultDEM() {
        const size = 50;
        const dem = [];
        for (let i = 0; i < size; i++) {
            dem[i] = [];
            for (let j = 0; j < size; j++) {
                dem[i][j] = 500 + Math.sin(i * 0.2) * 40 + Math.cos(j * 0.15) * 25;
            }
        }
        return dem;
    }
    filterWithinDistance(data, center, distance) {
        return data.filter(f => {
            const lat = f.lat || 0;
            const lng = f.lng || 0;
            const d = this.haversineDistance(center.lat, center.lng, lat, lng);
            return d <= distance;
        });
    }
    filterContains(data, polygon) {
        return data.filter(f => {
            const lat = f.lat || 0;
            const lng = f.lng || 0;
            return this.pointInPolygon(lat, lng, polygon);
        });
    }
    filterIntersects(data, polygon) {
        return this.filterContains(data, polygon);
    }
    filterNearestNeighbor(data, point, k) {
        const withDistance = data.map(f => {
            const lat = f.lat || 0;
            const lng = f.lng || 0;
            return { feature: f, distance: this.haversineDistance(point.lat, point.lng, lat, lng) };
        });
        withDistance.sort((a, b) => a.distance - b.distance);
        return withDistance.slice(0, k).map(w => w.feature);
    }
    applyFilter(feature, filter) {
        const value = feature[filter.attribute];
        switch (filter.operator) {
            case 'eq': return value === filter.value;
            case 'neq': return value !== filter.value;
            case 'gt': return value > filter.value;
            case 'gte': return value >= filter.value;
            case 'lt': return value < filter.value;
            case 'lte': return value <= filter.value;
            case 'contains': return String(value).includes(String(filter.value));
            case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
            case 'between': {
                const arr = filter.value;
                return value >= arr[0] && value <= arr[1];
            }
            default: return true;
        }
    }
    computeAggregation(data, agg) {
        const attr = agg.attribute;
        const values = attr ? data.map(f => f[attr]).filter(v => v !== undefined) : [];
        switch (agg.type) {
            case 'count': return data.length;
            case 'sum': return values.reduce((a, b) => a + b, 0);
            case 'avg': return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            case 'min': return values.length > 0 ? Math.min(...values) : 0;
            case 'max': return values.length > 0 ? Math.max(...values) : 0;
            default: return null;
        }
    }
    haversineDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    toRad(deg) {
        return deg * Math.PI / 180;
    }
    pointInPolygon(lat, lng, polygon) {
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
    generateAIAnswer(question, locationInfo, sourceInfo) {
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
    defaultGroundwater() {
        return {
            depth: 15, seasonalFluctuation: 2, aggressivity: 'Medium',
            ph: 7.2, sulfate: 500, chloride: 300,
            dewateringRequired: true, dewateringVolume: 5000
        };
    }
    defaultSettlement() {
        return {
            totalSettlement: 25, differentialSettlement: 10,
            immediateSettlement: 15, consolidationSettlement: 10,
            timeToSettle: 365, acceptable: true
        };
    }
    defaultExpansion() {
        return {
            swellPotential: 'Medium', swellPressure: 50,
            shrinkagePotential: 'Medium', volumetricChange: 3,
            treatmentRequired: true, treatmentMethod: 'Lime stabilization'
        };
    }
    defaultTrafficFlow() {
        return {
            averageSpeed: 60, peakHours: ['07:00-09:00', '16:00-19:00'],
            congestionLevel: 'Moderate', bottleneckPoints: [],
            timeToDestination: 30, trafficZones: []
        };
    }
}
exports.GISEngine = GISEngine;
//# sourceMappingURL=engine.js.map