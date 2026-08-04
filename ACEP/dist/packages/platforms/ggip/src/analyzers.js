"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteAnalyzer = exports.ServicesAnalyzer = exports.TransportAnalyzer = exports.ClimateAnalyzer = exports.SoilAnalyzer = exports.TerrainAnalyzer = void 0;
const types_1 = require("./types");
class TerrainAnalyzer {
    async analyzeSlope(dem, resolution) {
        const rows = dem.length;
        const cols = dem[0].length;
        const slopeMap = [];
        const slopeAspectMap = [];
        let totalSlope = 0;
        let minSlope = 90;
        let maxSlope = 0;
        let count = 0;
        const categories = { flat: 0, gentle: 0, moderate: 0, steep: 0, verySteep: 0, extreme: 0 };
        for (let i = 1; i < rows - 1; i++) {
            slopeMap[i] = [];
            slopeAspectMap[i] = [];
            for (let j = 1; j < cols - 1; j++) {
                const dzDx = ((dem[i - 1][j - 1] + 2 * dem[i][j - 1] + dem[i + 1][j - 1]) -
                    (dem[i - 1][j + 1] + 2 * dem[i][j + 1] + dem[i + 1][j + 1])) / (8 * resolution);
                const dzDy = ((dem[i + 1][j - 1] + 2 * dem[i + 1][j] + dem[i + 1][j + 1]) -
                    (dem[i - 1][j - 1] + 2 * dem[i - 1][j] + dem[i - 1][j + 1])) / (8 * resolution);
                const slope = Math.atan(Math.sqrt(dzDx ** 2 + dzDy ** 2)) * (180 / Math.PI);
                const aspect = Math.atan2(dzDy, dzDx) * (180 / Math.PI);
                slopeMap[i][j] = slope;
                slopeAspectMap[i][j] = aspect;
                totalSlope += slope;
                count++;
                if (slope < minSlope)
                    minSlope = slope;
                if (slope > maxSlope)
                    maxSlope = slope;
                if (slope < 2)
                    categories.flat++;
                else if (slope < 8)
                    categories.gentle++;
                else if (slope < 15)
                    categories.moderate++;
                else if (slope < 25)
                    categories.steep++;
                else if (slope < 35)
                    categories.verySteep++;
                else
                    categories.extreme++;
            }
        }
        const total = categories.flat + categories.gentle + categories.moderate +
            categories.steep + categories.verySteep + categories.extreme;
        return {
            average: totalSlope / count,
            min: minSlope,
            max: maxSlope,
            classification: {
                flat: (categories.flat / total) * 100,
                gentle: (categories.gentle / total) * 100,
                moderate: (categories.moderate / total) * 100,
                steep: (categories.steep / total) * 100,
                verySteep: (categories.verySteep / total) * 100,
                extreme: (categories.extreme / total) * 100
            },
            slopeMap,
            slopeAspectMap
        };
    }
    async analyzeElevation(dem) {
        const values = dem.flat();
        const sorted = [...values].sort((a, b) => a - b);
        const n = sorted.length;
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
        const profile = [];
        const midRow = Math.floor(dem.length / 2);
        for (let j = 0; j < dem[midRow].length; j++) {
            profile.push({ distance: j * 10, elevation: dem[midRow][j] });
        }
        return {
            min: sorted[0],
            max: sorted[n - 1],
            average: mean,
            median: n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)],
            stdDev: Math.sqrt(variance),
            dem,
            elevationProfile: profile
        };
    }
    async analyzeAspect(dem) {
        const rows = dem.length;
        const cols = dem[0].length;
        const aspect = [];
        for (let i = 1; i < rows - 1; i++) {
            aspect[i] = [];
            for (let j = 1; j < cols - 1; j++) {
                const dzDx = ((dem[i - 1][j - 1] + 2 * dem[i][j - 1] + dem[i + 1][j - 1]) -
                    (dem[i - 1][j + 1] + 2 * dem[i][j + 1] + dem[i + 1][j + 1])) / 8;
                const dzDy = ((dem[i + 1][j - 1] + 2 * dem[i + 1][j] + dem[i + 1][j + 1]) -
                    (dem[i - 1][j - 1] + 2 * dem[i - 1][j] + dem[i - 1][j + 1])) / 8;
                aspect[i][j] = Math.atan2(dzDy, dzDx) * (180 / Math.PI);
            }
        }
        return aspect;
    }
    async analyzeSolarRadiation(dem, lat, lng) {
        const rows = dem.length;
        const cols = dem[0].length;
        const radiationMap = [];
        let total = 0;
        for (let i = 0; i < rows; i++) {
            radiationMap[i] = [];
            for (let j = 0; j < cols; j++) {
                const slope = dem[i]?.[j] || 0;
                const radiation = 5.5 + Math.sin((lat + i * 0.01) * Math.PI / 180) * 3 +
                    (1 - Math.abs(slope - 500) / 500) * 1.5 + Math.random() * 0.5;
                radiationMap[i][j] = radiation;
                total += radiation;
            }
        }
        return {
            totalRadiation: total,
            directRadiation: total * 0.7,
            diffuseRadiation: total * 0.3,
            radiationMap,
            peakSunHours: 6.5 + Math.random() * 1.5,
            optimalPanelAngle: Math.abs(lat * 0.9) + Math.random() * 2
        };
    }
    async analyzeShadows(dem, lat, lng, date) {
        const rows = dem.length;
        const cols = dem[0].length;
        const shadowMap = [];
        const shadowPolygons = [];
        let shadowHours = 0;
        for (let i = 0; i < rows; i++) {
            shadowMap[i] = [];
            for (let j = 0; j < cols; j++) {
                const height = dem[i]?.[j] || 500;
                const sunAlt = 30 + Math.sin((date.getMonth() / 12) * Math.PI) * 20;
                const shadow = Math.max(0, Math.min(1, (height - 490) / 80));
                shadowMap[i][j] = shadow;
                if (shadow > 0.3)
                    shadowHours++;
                if (shadow > 0.5 && i % 10 === 0 && j % 10 === 0) {
                    shadowPolygons.push({
                        points: [
                            { lat: lat + i * 0.001, lng: lng + j * 0.001 },
                            { lat: lat + i * 0.001, lng: lng + (j + 5) * 0.001 },
                            { lat: lat + (i + 5) * 0.001, lng: lng + (j + 5) * 0.001 },
                            { lat: lat + (i + 5) * 0.001, lng: lng + j * 0.001 },
                            { lat: lat + i * 0.001, lng: lng + j * 0.001 }
                        ]
                    });
                }
            }
        }
        return {
            shadowMap,
            shadowHours: (shadowHours / (rows * cols)) * 12,
            shadowPolygons,
            solarObstruction: shadowHours / (rows * cols)
        };
    }
    async generateContours(dem, interval) {
        const contours = [];
        const min = Math.min(...dem.flat());
        const max = Math.max(...dem.flat());
        for (let elev = Math.ceil(min / interval) * interval; elev <= max; elev += interval) {
            const points = [];
            for (let i = 1; i < dem.length - 1; i++) {
                for (let j = 1; j < dem[i].length - 1; j++) {
                    if (Math.abs(dem[i][j] - elev) < interval * 0.3) {
                        points.push({ lat: 24.5 + i * 0.001, lng: 46.5 + j * 0.001, alt: elev });
                    }
                }
            }
            if (points.length > 5)
                contours.push(points);
        }
        return contours;
    }
    async calculateHillshade(dem, azimuth, altitude) {
        const rows = dem.length;
        const cols = dem[0].length;
        const hillshade = [];
        const azRad = azimuth * Math.PI / 180;
        const altRad = altitude * Math.PI / 180;
        for (let i = 1; i < rows - 1; i++) {
            hillshade[i] = [];
            for (let j = 1; j < cols - 1; j++) {
                const dzDx = (dem[i - 1][j - 1] + 2 * dem[i][j - 1] + dem[i + 1][j - 1] -
                    dem[i - 1][j + 1] - 2 * dem[i][j + 1] - dem[i + 1][j + 1]) / 8;
                const dzDy = (dem[i + 1][j - 1] + 2 * dem[i + 1][j] + dem[i + 1][j + 1] -
                    dem[i - 1][j - 1] - 2 * dem[i - 1][j] - dem[i - 1][j + 1]) / 8;
                const slope = Math.atan(Math.sqrt(dzDx ** 2 + dzDy ** 2));
                const aspect = Math.atan2(-dzDy, dzDx);
                const shade = Math.max(0, Math.cos(altRad) * Math.cos(slope) +
                    Math.sin(altRad) * Math.sin(slope) * Math.cos(azRad - aspect));
                hillshade[i][j] = shade;
            }
        }
        return hillshade;
    }
    async calculateCurvature(dem) {
        const rows = dem.length;
        const cols = dem[0].length;
        const curvature = [];
        for (let i = 2; i < rows - 2; i++) {
            curvature[i] = [];
            for (let j = 2; j < cols - 2; j++) {
                const d2zDx2 = (dem[i][j - 2] - 2 * dem[i][j] + dem[i][j + 2]) / 4;
                const d2zDy2 = (dem[i - 2][j] - 2 * dem[i][j] + dem[i + 2][j]) / 4;
                curvature[i][j] = d2zDx2 + d2zDy2;
            }
        }
        return curvature;
    }
    async calculateTWI(dem) {
        const rows = dem.length;
        const cols = dem[0].length;
        const twi = [];
        for (let i = 1; i < rows - 1; i++) {
            twi[i] = [];
            for (let j = 1; j < cols - 1; j++) {
                const slope = Math.atan(Math.abs(dem[i][j + 1] - dem[i][j - 1]) / 2);
                const upslopeArea = 100 + Math.random() * 900;
                twi[i][j] = Math.log(upslopeArea / Math.tan(Math.max(slope, 0.001)));
            }
        }
        return twi;
    }
    async calculateRoughness(dem) {
        const values = dem.flat();
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
        return Math.sqrt(variance);
    }
}
exports.TerrainAnalyzer = TerrainAnalyzer;
class SoilAnalyzer {
    async analyzeBearingCapacity(soilProfile, depth) {
        const topLayer = soilProfile[0] || { soilType: types_1.SoilType.Sand, nValue: 30 };
        const bearingValues = {
            [types_1.SoilType.Clay]: 150, [types_1.SoilType.Sand]: 250, [types_1.SoilType.Silt]: 120,
            [types_1.SoilType.Gravel]: 400, [types_1.SoilType.Rock]: 1000, [types_1.SoilType.Loam]: 180,
            [types_1.SoilType.Peat]: 50, [types_1.SoilType.Chalk]: 300, [types_1.SoilType.Fill]: 80,
            [types_1.SoilType.Marl]: 350, [types_1.SoilType.Limestone]: 800, [types_1.SoilType.Basalt]: 1200,
            [types_1.SoilType.Granite]: 1500, [types_1.SoilType.Sabkha]: 60
        };
        const baseBearing = bearingValues[topLayer.soilType] || 200;
        const nFactor = Math.min(1 + (topLayer.nValue || 10) / 50, 1.5);
        const depthFactor = 1 + depth / 100;
        const allowable = baseBearing * nFactor * depthFactor;
        return {
            allowable: Math.round(allowable * 100) / 100,
            ultimate: Math.round(allowable * 3 * 100) / 100,
            factorOfSafety: 3,
            soilType: topLayer.soilType,
            depth,
            correctionFactors: [
                { name: 'Depth', value: depthFactor, description: `Depth correction factor for ${depth}m` },
                { name: 'N-Value', value: nFactor, description: `SPT N-value correction factor` }
            ]
        };
    }
    async analyzeGroundwater(location, depth) {
        const gwDepth = 10 + Math.random() * 20;
        return {
            depth: gwDepth,
            seasonalFluctuation: 1.5 + Math.random() * 2,
            aggressivity: gwDepth < 10 ? 'High' : gwDepth < 20 ? 'Medium' : 'Low',
            ph: 6.5 + Math.random() * 1.5,
            sulfate: 200 + Math.random() * 800,
            chloride: 150 + Math.random() * 500,
            dewateringRequired: gwDepth < depth,
            dewateringVolume: gwDepth < depth ? Math.round((depth - gwDepth) * 1000) : undefined
        };
    }
    async analyzeSettlement(soilProfile, foundationLoad) {
        const immediate = foundationLoad * 0.05 + Math.random() * 10;
        const consolidation = foundationLoad * 0.03 + Math.random() * 15;
        const total = immediate + consolidation;
        return {
            totalSettlement: Math.round(total * 100) / 100,
            differentialSettlement: Math.round(total * 0.3 * 100) / 100,
            immediateSettlement: Math.round(immediate * 100) / 100,
            consolidationSettlement: Math.round(consolidation * 100) / 100,
            timeToSettle: Math.round(180 + Math.random() * 365),
            acceptable: total < 50
        };
    }
    async analyzeSliding(slope, soilProperties) {
        const slopeRad = slope * Math.PI / 180;
        const drivingForce = soilProperties.unitWeight * 10 * Math.sin(slopeRad);
        const resistingForce = soilProperties.cohesion * 2 +
            soilProperties.unitWeight * 10 * Math.cos(slopeRad) * Math.tan(soilProperties.frictionAngle * Math.PI / 180);
        const fos = resistingForce / Math.max(drivingForce, 0.001);
        return {
            factorOfSafety: Math.round(fos * 100) / 100,
            criticalSurface: { points: [{ lat: 24.5, lng: 46.5 }, { lat: 24.51, lng: 46.51 }] },
            drivingForce: Math.round(drivingForce * 100) / 100,
            resistingForce: Math.round(resistingForce * 100) / 100,
            stable: fos >= 1.5
        };
    }
    async analyzeExpansionContraction(soilType, moisture) {
        const swellMap = {
            [types_1.SoilType.Clay]: { potential: 'High', pressure: 100 },
            [types_1.SoilType.Sand]: { potential: 'Low', pressure: 10 },
            [types_1.SoilType.Silt]: { potential: 'Medium', pressure: 40 },
            [types_1.SoilType.Gravel]: { potential: 'Low', pressure: 5 },
            [types_1.SoilType.Rock]: { potential: 'Low', pressure: 0 },
            [types_1.SoilType.Loam]: { potential: 'Medium', pressure: 35 },
            [types_1.SoilType.Peat]: { potential: 'VeryHigh', pressure: 150 },
            [types_1.SoilType.Chalk]: { potential: 'Low', pressure: 15 },
            [types_1.SoilType.Fill]: { potential: 'High', pressure: 80 },
            [types_1.SoilType.Marl]: { potential: 'Medium', pressure: 45 },
            [types_1.SoilType.Limestone]: { potential: 'Low', pressure: 10 },
            [types_1.SoilType.Basalt]: { potential: 'Low', pressure: 5 },
            [types_1.SoilType.Granite]: { potential: 'Low', pressure: 0 },
            [types_1.SoilType.Sabkha]: { potential: 'VeryHigh', pressure: 200 }
        };
        const info = swellMap[soilType] || { potential: 'Medium', pressure: 50 };
        return {
            swellPotential: info.potential,
            swellPressure: info.pressure,
            shrinkagePotential: soilType === types_1.SoilType.Clay ? 'High' : 'Low',
            volumetricChange: moisture > 20 ? 5 : 2,
            treatmentRequired: info.potential === 'High' || info.potential === 'VeryHigh',
            treatmentMethod: info.potential === 'VeryHigh' ? 'Soil replacement with engineered fill' : 'Lime stabilization'
        };
    }
    async assessLiquefaction(soilProfile, seismicZone) {
        const liquefiableLayers = soilProfile.filter(l => l.soilType === types_1.SoilType.Sand || l.soilType === types_1.SoilType.Silt);
        if (liquefiableLayers.length === 0)
            return 0;
        const avgNValue = liquefiableLayers.reduce((s, l) => s + (l.nValue || 15), 0) / liquefiableLayers.length;
        const baseProb = seismicZone > 0.2 ? 0.4 : 0.2;
        const nFactor = Math.max(0, 1 - avgNValue / 50);
        return Math.min(baseProb * nFactor * 1.5, 0.9);
    }
    async getSoilProfile(location, depth) {
        const profile = [];
        let currentDepth = 0;
        const soilTypes = [types_1.SoilType.Sand, types_1.SoilType.Clay, types_1.SoilType.Gravel, types_1.SoilType.Rock];
        const descriptions = {
            [types_1.SoilType.Clay]: 'Brown silty clay', [types_1.SoilType.Sand]: 'Fine to medium sand',
            [types_1.SoilType.Silt]: 'Silty sand', [types_1.SoilType.Gravel]: 'Sandy gravel',
            [types_1.SoilType.Rock]: 'Weathered limestone', [types_1.SoilType.Loam]: 'Sandy loam',
            [types_1.SoilType.Peat]: 'Organic peat', [types_1.SoilType.Chalk]: 'White chalk',
            [types_1.SoilType.Fill]: 'Heterogeneous fill', [types_1.SoilType.Marl]: 'Calcareous marl',
            [types_1.SoilType.Limestone]: 'Limestone bedrock', [types_1.SoilType.Basalt]: 'Basalt rock',
            [types_1.SoilType.Granite]: 'Granite bedrock', [types_1.SoilType.Sabkha]: 'Sabkha deposit'
        };
        let layerIdx = 0;
        while (currentDepth < depth) {
            const layerThickness = 2 + Math.random() * 4;
            const soilType = soilTypes[Math.min(layerIdx, soilTypes.length - 1)];
            profile.push({
                depthFrom: currentDepth,
                depthTo: Math.min(currentDepth + layerThickness, depth),
                soilType,
                nValue: Math.round(10 + Math.random() * 40),
                description: descriptions[soilType],
                moisture: Math.round((5 + Math.random() * 25) * 100) / 100,
                density: Math.round((1.6 + Math.random() * 0.6) * 100) / 100
            });
            currentDepth += layerThickness;
            layerIdx++;
        }
        return profile;
    }
    async calculateBearingCorrection(soilType, depth, width) {
        return [
            { name: 'Depth Factor', value: 1 + depth / 30, description: 'Correction for foundation depth' },
            { name: 'Width Factor', value: 1 + width / 50, description: 'Correction for foundation width' },
            { name: 'Shape Factor', value: 1.2, description: 'Rectangular foundation shape factor' }
        ];
    }
    async assessGeotechnicalRisks(soilProfile) {
        const risks = [];
        const hasClay = soilProfile.some(l => l.soilType === types_1.SoilType.Clay);
        const hasSabkha = soilProfile.some(l => l.soilType === types_1.SoilType.Sabkha);
        const hasFill = soilProfile.some(l => l.soilType === types_1.SoilType.Fill);
        if (hasClay) {
            risks.push({ type: 'Expansive Soil', description: 'Clay layers may cause swelling/shrinkage', probability: 0.6, impact: 'High', mitigation: 'Soil stabilization or deep foundation' });
        }
        if (hasSabkha) {
            risks.push({ type: 'Sabkha Deposit', description: 'Sabkha soils prone to collapse when wet', probability: 0.8, impact: 'Critical', mitigation: 'Remove and replace with engineered fill' });
        }
        if (hasFill) {
            risks.push({ type: 'Fill Material', description: 'Fill layers may have uneven settlement', probability: 0.5, impact: 'Medium', mitigation: 'Compaction testing and ground improvement' });
        }
        risks.push({ type: 'Groundwater', description: 'High groundwater may affect excavation', probability: 0.4, impact: 'Medium', mitigation: 'Dewatering system design' });
        return risks;
    }
    async determineCompactionRequirements(soilType) {
        const baseReqs = {
            [types_1.SoilType.Clay]: { density: 95, thickness: 0.2, passes: 6, moisture: 18 },
            [types_1.SoilType.Sand]: { density: 98, thickness: 0.3, passes: 4, moisture: 8 },
            [types_1.SoilType.Silt]: { density: 95, thickness: 0.25, passes: 5, moisture: 12 },
            [types_1.SoilType.Gravel]: { density: 100, thickness: 0.35, passes: 3, moisture: 5 },
            [types_1.SoilType.Rock]: { density: 100, thickness: 0.4, passes: 2, moisture: 3 },
            [types_1.SoilType.Loam]: { density: 95, thickness: 0.25, passes: 5, moisture: 14 },
            [types_1.SoilType.Peat]: { density: 90, thickness: 0.15, passes: 8, moisture: 25 },
            [types_1.SoilType.Chalk]: { density: 95, thickness: 0.3, passes: 4, moisture: 10 },
            [types_1.SoilType.Fill]: { density: 95, thickness: 0.2, passes: 6, moisture: 12 },
            [types_1.SoilType.Marl]: { density: 98, thickness: 0.3, passes: 4, moisture: 10 },
            [types_1.SoilType.Limestone]: { density: 100, thickness: 0.4, passes: 2, moisture: 3 },
            [types_1.SoilType.Basalt]: { density: 100, thickness: 0.4, passes: 2, moisture: 2 },
            [types_1.SoilType.Granite]: { density: 100, thickness: 0.4, passes: 2, moisture: 2 },
            [types_1.SoilType.Sabkha]: { density: 92, thickness: 0.2, passes: 6, moisture: 20 }
        };
        const req = baseReqs[soilType] || { density: 95, thickness: 0.25, passes: 4, moisture: 10 };
        return [
            { layerType: 'Subgrade', requiredDensity: req.density, maxLayerThickness: req.thickness, passesRequired: req.passes, moistureRange: { min: req.moisture - 2, max: req.moisture + 2, average: req.moisture } },
            { layerType: 'Sub-base', requiredDensity: 98, maxLayerThickness: 0.25, passesRequired: 4, moistureRange: { min: 5, max: 10, average: 7 } },
            { layerType: 'Base Course', requiredDensity: 100, maxLayerThickness: 0.2, passesRequired: 4, moistureRange: { min: 4, max: 8, average: 6 } }
        ];
    }
}
exports.SoilAnalyzer = SoilAnalyzer;
class ClimateAnalyzer {
    async analyzeTemperature(location) {
        const baseTemp = 25 + Math.abs(location.lat - 24) * 2;
        const monthlyAverages = [];
        for (let m = 0; m < 12; m++) {
            monthlyAverages[m] = baseTemp + Math.sin((m - 6) * Math.PI / 6) * 15;
        }
        return {
            annualAverage: Math.round(baseTemp * 10) / 10,
            monthlyAverages: monthlyAverages.map(v => Math.round(v * 10) / 10),
            dailyMin: Math.round((baseTemp - 8 + Math.random() * 3) * 10) / 10,
            dailyMax: Math.round((baseTemp + 12 + Math.random() * 3) * 10) / 10,
            recordHigh: Math.round((baseTemp + 20 + Math.random() * 5) * 10) / 10,
            recordLow: Math.round((baseTemp - 15 + Math.random() * 5) * 10) / 10,
            heatwaveDays: Math.round(15 + Math.random() * 20)
        };
    }
    async analyzeHumidity(location) {
        const coastalFactor = Math.abs(location.lng - 50) < 5 ? 1.3 : 0.7;
        const avgHumidity = 40 * coastalFactor;
        const monthlyAverages = [];
        for (let m = 0; m < 12; m++) {
            monthlyAverages[m] = avgHumidity + Math.sin(m * Math.PI / 6) * 15;
        }
        return {
            annualAverage: Math.round(avgHumidity * 10) / 10,
            monthlyAverages: monthlyAverages.map(v => Math.round(Math.max(20, Math.min(95, v)) * 10) / 10),
            morningAverage: Math.round(Math.min(avgHumidity * 1.3, 95) * 10) / 10,
            afternoonAverage: Math.round(Math.max(avgHumidity * 0.6, 20) * 10) / 10,
            comfortIndex: Math.round((100 - avgHumidity) * 10) / 10
        };
    }
    async analyzeWind(location) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const windRose = directions.map(dir => ({
            direction: dir,
            frequency: Math.round((5 + Math.random() * 15) * 10) / 10,
            averageSpeed: Math.round((8 + Math.random() * 12) * 10) / 10
        }));
        return {
            averageSpeed: Math.round((10 + Math.random() * 8) * 10) / 10,
            maxGust: Math.round((40 + Math.random() * 30) * 10) / 10,
            prevailingDirection: 'NW',
            windRose,
            seasonalVariation: [
                { season: 'Winter', averageSpeed: 12 + Math.random() * 3, prevailingDirection: 'NW' },
                { season: 'Spring', averageSpeed: 15 + Math.random() * 3, prevailingDirection: 'N' },
                { season: 'Summer', averageSpeed: 8 + Math.random() * 3, prevailingDirection: 'W' },
                { season: 'Autumn', averageSpeed: 10 + Math.random() * 3, prevailingDirection: 'SE' }
            ]
        };
    }
    async analyzeRainfall(location) {
        const aridFactor = Math.abs(location.lat - 24) > 3 ? 100 : 50;
        const monthlyAverages = [];
        for (let m = 0; m < 12; m++) {
            monthlyAverages[m] = m >= 10 || m <= 2 ? 10 + Math.random() * 20 : 1 + Math.random() * 5;
        }
        return {
            annualTotal: Math.round(monthlyAverages.reduce((a, b) => a + b, 0) * 10) / 10,
            monthlyAverages: monthlyAverages.map(v => Math.round(v * 10) / 10),
            maxDaily: Math.round((20 + Math.random() * 30) * 10) / 10,
            maxHourly: Math.round((10 + Math.random() * 15) * 10) / 10,
            rainyDays: Math.round(15 + Math.random() * 20),
            intensity: aridFactor > 80 ? 'Moderate' : 'Low',
            floodRisk: Math.round((0.1 + Math.random() * 0.3) * 100) / 100
        };
    }
    async analyzeSandstorms(location) {
        return {
            annualFrequency: Math.round(10 + Math.random() * 20),
            peakMonths: [3, 4, 5],
            averageVisibility: Math.round((500 + Math.random() * 1500) * 10) / 10,
            severity: (Math.random() > 0.7 ? 'High' : 'Moderate'),
            affectedPeriods: ['March-May', 'September-October']
        };
    }
    async analyzeSnow(location) {
        const snowRisk = Math.abs(location.lat) > 28 ? 'Moderate' : 'None';
        return {
            annualSnowfall: snowRisk === 'None' ? 0 : Math.round(Math.random() * 20 * 10) / 10,
            snowDays: snowRisk === 'None' ? 0 : Math.round(Math.random() * 5),
            maxDepth: snowRisk === 'None' ? 0 : Math.round(Math.random() * 10 * 10) / 10,
            risk: snowRisk
        };
    }
    async analyzeSolarRadiation(location) {
        const monthlyAverages = [];
        for (let m = 0; m < 12; m++) {
            monthlyAverages[m] = 4 + Math.sin((m - 6) * Math.PI / 6) * 2 + Math.random();
        }
        return {
            annualTotal: Math.round(monthlyAverages.reduce((a, b) => a + b, 0) * 365 / 12 * 10) / 10,
            monthlyAverages: monthlyAverages.map(v => Math.round(v * 10) / 10),
            peakSunHours: Math.round((7 + Math.random() * 2) * 10) / 10,
            uvIndex: Math.round((8 + Math.random() * 4) * 10) / 10,
            clearDays: Math.round(280 + Math.random() * 40)
        };
    }
    async analyzeSeasonalPatterns(location) {
        return [
            { season: 'Winter', startMonth: 12, endMonth: 2, characteristics: 'Cool with occasional rain', impactOnConstruction: 'Slight delays due to rain' },
            { season: 'Spring', startMonth: 3, endMonth: 5, characteristics: 'Mild with sandstorms', impactOnConstruction: 'Sandstorms may halt work' },
            { season: 'Summer', startMonth: 6, endMonth: 8, characteristics: 'Extreme heat, dry', impactOnConstruction: 'Heat stress, reduced productivity' },
            { season: 'Autumn', startMonth: 9, endMonth: 11, characteristics: 'Pleasant with some dust', impactOnConstruction: 'Favorable conditions' }
        ];
    }
    async getClimateSummary(location) {
        const temp = await this.analyzeTemperature(location);
        const humidity = await this.analyzeHumidity(location);
        const wind = await this.analyzeWind(location);
        const rainfall = await this.analyzeRainfall(location);
        const sandstorms = await this.analyzeSandstorms(location);
        const snow = await this.analyzeSnow(location);
        const solarRadiation = await this.analyzeSolarRadiation(location);
        const seasonalPatterns = await this.analyzeSeasonalPatterns(location);
        return { temperature: temp, humidity: humidity, wind, rainfall, sandstorms, snow, solarRadiation, seasonalPatterns };
    }
}
exports.ClimateAnalyzer = ClimateAnalyzer;
class TransportAnalyzer {
    async analyzeTrafficFlow(from, to) {
        const distance = this.haversineDistance(from.lat, from.lng, to.lat, to.lng);
        return {
            averageSpeed: Math.round((40 + Math.random() * 40) * 10) / 10,
            peakHours: ['07:00-09:00', '16:00-19:00'],
            congestionLevel: (distance > 50 ? 'High' : 'Moderate'),
            bottleneckPoints: [{ lat: 24.6, lng: 46.7 }, { lat: 24.7, lng: 46.8 }],
            timeToDestination: Math.round(distance / 50 * 60 + Math.random() * 15),
            trafficZones: [
                { name: 'Zone A', congestionIndex: 0.7, peakPeriod: '07:00-09:00', averageDelay: 15 },
                { name: 'Zone B', congestionIndex: 0.5, peakPeriod: '16:00-18:00', averageDelay: 10 }
            ]
        };
    }
    async analyzeShippingTime(from, to) {
        const distance = this.haversineDistance(from.lat, from.lng, to.lat, to.lng);
        return {
            portToSite: Math.round(distance / 40 * 60 + 120 + Math.random() * 60),
            supplierToSite: Math.round(distance / 50 * 60 + Math.random() * 30),
            averageDelay: Math.round(30 + Math.random() * 60),
            criticalRoutes: [
                { from: 'Port', to: 'Site', duration: Math.round(distance / 40 * 60), risk: 'Medium', alternativeAvailable: true }
            ],
            customsClearance: Math.round(48 + Math.random() * 48)
        };
    }
    async findEquipmentRoutes(from, to, equipment) {
        const distance = this.haversineDistance(from.lat, from.lng, to.lat, to.lng);
        return [
            {
                from: `${from.lat},${from.lng}`, to: `${to.lat},${to.lng}`,
                distance: Math.round(distance * 100) / 100,
                duration: Math.round(distance / 30 * 60 + Math.random() * 30),
                tollCost: distance > 50 ? 50 : 0,
                fuelCost: Math.round(distance * 2 * 100) / 100,
                restrictions: ['Height limit: 4.5m', 'Weight limit: 40t'],
                routeGeometry: { points: [from, to] }
            }
        ];
    }
    async findConcreteRoutes(batchPlants, site) {
        return batchPlants.map(plant => {
            const distance = this.haversineDistance(plant.lat, plant.lng, site.lat, site.lng);
            return {
                batchPlant: `${plant.lat},${plant.lng}`,
                to: `${site.lat},${site.lng}`,
                distance: Math.round(distance * 100) / 100,
                travelTime: Math.round(distance / 30 * 60),
                maxLoad: 8,
                timeWindow: '06:00-12:00',
                slumpLoss: Math.round(distance * 0.5 * 10) / 10
            };
        });
    }
    async analyzeSupplierLeadTime(suppliers, materials) {
        return suppliers.flatMap(supplier => materials.map(material => ({
            supplier,
            material,
            leadTime: Math.round(7 + Math.random() * 21),
            reliability: Math.round((0.7 + Math.random() * 0.3) * 100) / 100,
            distance: Math.round(50 + Math.random() * 200),
            alternativeSupplier: 'Alternative_' + supplier
        })));
    }
    async findAlternativeRoutes(primary) {
        const distance = this.haversineDistance(primary.points[0].lat, primary.points[0].lng, primary.points[1].lat, primary.points[1].lng);
        return [
            {
                primaryRoute: `${primary.points[0].lat},${primary.points[0].lng}`,
                alternative: `${primary.points[0].lat + 0.02},${primary.points[0].lng + 0.02}`,
                distanceDifference: 5 + Math.random() * 10,
                timeDifference: 10 + Math.random() * 20,
                condition: 'Good - Paved road'
            }
        ];
    }
    async calculateTravelTime(from, to, mode) {
        const distance = this.haversineDistance(from.lat, from.lng, to.lat, to.lng);
        const speeds = { truck: 50, concrete: 30, equipment: 25, car: 60 };
        return Math.round(distance / (speeds[mode] || 50) * 60);
    }
    haversineDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
exports.TransportAnalyzer = TransportAnalyzer;
class ServicesAnalyzer {
    async analyzeElectricity(location, radius) {
        return {
            available: true,
            voltage: 220,
            capacity: Math.round((500 + Math.random() * 1500) * 100) / 100,
            distanceToSubstation: Math.round(Math.random() * radius * 0.3 * 100) / 100,
            provider: 'Saudi Electricity Company',
            connectionCost: Math.round((50000 + Math.random() * 100000) * 100) / 100,
            reliability: Math.round((0.95 + Math.random() * 0.04) * 100) / 100,
            backupRequired: radius > 10
        };
    }
    async analyzeWater(location, radius) {
        return {
            available: true,
            pressure: Math.round((3 + Math.random() * 4) * 100) / 100,
            pipeDiameter: 200,
            distanceToMain: Math.round(Math.random() * radius * 0.2 * 100) / 100,
            provider: 'National Water Company',
            connectionCost: Math.round((30000 + Math.random() * 70000) * 100) / 100,
            quality: 'Potable',
            tankerRequired: radius > 15
        };
    }
    async analyzeSewage(location, radius) {
        return {
            available: true,
            type: (Math.random() > 0.5 ? 'Municipal' : 'Septic'),
            distanceToMain: Math.round(Math.random() * radius * 0.25 * 100) / 100,
            connectionCost: Math.round((40000 + Math.random() * 80000) * 100) / 100,
            capacity: Math.round((500 + Math.random() * 1500) * 100) / 100,
            treatmentRequired: false
        };
    }
    async analyzeInternet(location, radius) {
        return {
            available: true,
            type: ['Fiber', 'DSL', '5G', 'Satellite'][Math.floor(Math.random() * 4)],
            speed: Math.round((50 + Math.random() * 450) * 10) / 10,
            provider: 'STC',
            reliability: Math.round((0.9 + Math.random() * 0.09) * 100) / 100,
            monthlyCost: Math.round((200 + Math.random() * 300) * 100) / 100
        };
    }
    async analyzeGas(location, radius) {
        return {
            available: Math.random() > 0.3,
            type: 'Natural',
            pressure: 4,
            distanceToMain: Math.round(Math.random() * radius * 0.4 * 100) / 100,
            connectionCost: Math.round((60000 + Math.random() * 100000) * 100) / 100,
            capacity: Math.round((100 + Math.random() * 400) * 100) / 100
        };
    }
    async analyzeFiberOptics(location, radius) {
        return {
            available: Math.random() > 0.2,
            distanceToPoP: Math.round(Math.random() * radius * 0.3 * 100) / 100,
            maxSpeed: Math.round((100 + Math.random() * 900) * 10) / 10,
            provider: 'STC',
            installationCost: Math.round((1000 + Math.random() * 4000) * 100) / 100,
            monthlyCost: Math.round((300 + Math.random() * 500) * 100) / 100
        };
    }
    async findNearbyFuelStations(location, radius) {
        return [
            { name: 'Station A', type: 'Fuel Station', distance: Math.round(Math.random() * radius), location: { lat: location.lat + 0.01, lng: location.lng + 0.01 }, capacity: 50000, operatingHours: '24/7' },
            { name: 'Station B', type: 'Fuel Station', distance: Math.round(Math.random() * radius), location: { lat: location.lat - 0.01, lng: location.lng + 0.02 }, capacity: 30000, operatingHours: '06:00-22:00' }
        ];
    }
    async findNearbyHospitals(location, radius) {
        return [
            { name: 'General Hospital', type: 'Hospital', distance: Math.round(Math.random() * radius), responseTime: Math.round(10 + Math.random() * 15), location: { lat: location.lat + 0.02, lng: location.lng + 0.01 }, capacity: 200, contact: '+966112345678' },
            { name: 'Specialized Clinic', type: 'Clinic', distance: Math.round(Math.random() * radius), responseTime: Math.round(5 + Math.random() * 10), location: { lat: location.lat + 0.01, lng: location.lng - 0.01 }, capacity: 50, contact: '+966112345679' }
        ];
    }
    async findNearbyCivilDefense(location, radius) {
        return [
            { name: 'Civil Defense Center', type: 'Civil Defense', distance: Math.round(Math.random() * radius), responseTime: Math.round(8 + Math.random() * 12), location: { lat: location.lat + 0.015, lng: location.lng + 0.015 }, capacity: 30, contact: '998' }
        ];
    }
    async findNearbyEmergencyCenters(location, radius) {
        return [
            { name: 'Emergency Response Center', type: 'Emergency', distance: Math.round(Math.random() * radius), responseTime: Math.round(5 + Math.random() * 10), location: { lat: location.lat + 0.01, lng: location.lng + 0.005 }, capacity: 100, contact: '997' }
        ];
    }
    async getInfrastructureSummary(location, radius) {
        return {
            electricity: await this.analyzeElectricity(location, radius),
            water: await this.analyzeWater(location, radius),
            sewage: await this.analyzeSewage(location, radius),
            internet: await this.analyzeInternet(location, radius),
            gas: await this.analyzeGas(location, radius),
            fiberOptics: await this.analyzeFiberOptics(location, radius),
            fuelStations: await this.findNearbyFuelStations(location, radius),
            hospitals: await this.findNearbyHospitals(location, radius),
            civilDefense: await this.findNearbyCivilDefense(location, radius),
            emergencyCenters: await this.findNearbyEmergencyCenters(location, radius)
        };
    }
}
exports.ServicesAnalyzer = ServicesAnalyzer;
class SiteAnalyzer {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    async analyzeArea(bounds, setbacks) {
        const latSpan = bounds.maxLat - bounds.minLat;
        const lngSpan = bounds.maxLng - bounds.minLng;
        const totalArea = latSpan * lngSpan * 111 * 111 * 1000000;
        const setbackArea = (latSpan * 2 * setbacks + lngSpan * 2 * setbacks) * 111 * 111 * 100;
        const buildableArea = totalArea - setbackArea;
        return {
            totalArea: Math.round(totalArea),
            buildableArea: Math.round(buildableArea),
            setbackArea: Math.round(setbackArea),
            greenArea: Math.round(totalArea * 0.15),
            parkingArea: Math.round(totalArea * 0.1),
            circulationArea: Math.round(totalArea * 0.05),
            areaUtilization: Math.round((buildableArea / totalArea) * 1000) / 10
        };
    }
    async analyzeSlopes(dem) {
        const analyzer = new TerrainAnalyzer();
        const slopeResult = await analyzer.analyzeSlope(dem, 10);
        const avgSlope = slopeResult.average;
        const maxSlope = slopeResult.max;
        const direction = avgSlope > 5 ? 'North-East' : 'South-West';
        const totalArea = dem.length * dem[0].length * 100;
        const cutVol = avgSlope * totalArea * 0.3;
        const fillVol = avgSlope * totalArea * 0.25;
        const zones = [
            { id: 'Z1', category: 'Flat', averageSlope: 2, area: slopeResult.classification.flat / 100 * totalArea, recommendation: 'Ideal for construction' },
            { id: 'Z2', category: 'Gentle', averageSlope: 5, area: slopeResult.classification.gentle / 100 * totalArea, recommendation: 'Suitable with minimal grading' },
            { id: 'Z3', category: 'Moderate', averageSlope: 12, area: slopeResult.classification.moderate / 100 * totalArea, recommendation: 'Requires terracing' },
            { id: 'Z4', category: 'Steep', averageSlope: 20, area: slopeResult.classification.steep / 100 * totalArea, recommendation: 'Retaining walls needed' }
        ];
        return {
            averageSlope: Math.round(avgSlope * 100) / 100,
            maxSlope: Math.round(maxSlope * 100) / 100,
            slopeDirection: direction,
            slopeZones: zones,
            cutVolume: Math.round(cutVol * 100) / 100,
            fillVolume: Math.round(fillVol * 100) / 100,
            balanceRatio: Math.round((cutVol / Math.max(fillVol, 0.01)) * 100) / 100
        };
    }
    async analyzeSunPath(location, date) {
        const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
        const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);
        const hourAngle = 0;
        const latRad = location.lat * Math.PI / 180;
        const decRad = declination * Math.PI / 180;
        const altitude = Math.asin(Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle));
        const sunriseHour = 6 - Math.acos(-Math.tan(latRad) * Math.tan(decRad)) * 180 / Math.PI / 15;
        const sunsetHour = 6 + Math.acos(-Math.tan(latRad) * Math.tan(decRad)) * 180 / Math.PI / 15;
        return {
            sunrise: `${Math.floor(sunriseHour)}:${Math.round((sunriseHour % 1) * 60).toString().padStart(2, '0')}`,
            sunset: `${Math.floor(sunsetHour)}:${Math.round((sunsetHour % 1) * 60).toString().padStart(2, '0')}`,
            solarAzimuth: Math.round((180 + Math.random() * 30) * 10) / 10,
            solarAltitude: Math.round(altitude * 180 / Math.PI * 10) / 10,
            dailySunHours: Math.round((sunsetHour - sunriseHour) * 10) / 10,
            optimalOrientation: 'South',
            seasonalVariation: [
                { season: 'Summer', sunrise: '05:00', sunset: '19:00', maxAltitude: 80 },
                { season: 'Winter', sunrise: '07:00', sunset: '17:00', maxAltitude: 40 },
                { season: 'Spring', sunrise: '06:00', sunset: '18:00', maxAltitude: 60 },
                { season: 'Autumn', sunrise: '06:00', sunset: '18:00', maxAltitude: 55 }
            ]
        };
    }
    async analyzeWindExposure(location, dem) {
        const avgElevation = dem.flat().reduce((a, b) => a + b, 0) / dem.flat().length;
        const exposure = avgElevation > 700 ? 'Severe' : avgElevation > 600 ? 'Exposed' : avgElevation > 500 ? 'Moderate' : 'Sheltered';
        return {
            prevailingDirection: 'NW',
            averageSpeed: Math.round((8 + Math.random() * 8) * 10) / 10,
            maxGust: Math.round((30 + Math.random() * 30) * 10) / 10,
            exposure: exposure,
            windLoadZones: [
                { zone: 'Ridge', speed: 35 + Math.random() * 10, pressure: 0.8 + Math.random() * 0.4 },
                { zone: 'Mid-Slope', speed: 25 + Math.random() * 10, pressure: 0.5 + Math.random() * 0.3 },
                { zone: 'Valley', speed: 15 + Math.random() * 8, pressure: 0.3 + Math.random() * 0.2 }
            ]
        };
    }
    async analyzeShadows(dem, location, date) {
        const shadowMap = [];
        for (let h = 6; h <= 18; h += 2) {
            shadowMap.push({
                hour: h,
                shadowPolygons: [{
                        points: [
                            { lat: location.lat + 0.01, lng: location.lng + 0.01 },
                            { lat: location.lat + 0.01, lng: location.lng + 0.03 },
                            { lat: location.lat + 0.03, lng: location.lng + 0.03 },
                            { lat: location.lat + 0.03, lng: location.lng + 0.01 },
                            { lat: location.lat + 0.01, lng: location.lng + 0.01 }
                        ]
                    }],
                coverage: Math.max(0, 1 - Math.abs(h - 12) / 12)
            });
        }
        return {
            shadowDuration: 4 + Math.random() * 4,
            shadowCoverage: Math.round((0.2 + Math.random() * 0.3) * 100) / 100,
            shadowMap,
            solarAccess: [
                { location: { lat: location.lat, lng: location.lng }, dailySolarAccess: 8, obstruction: 'None' }
            ],
            obstructionAnalysis: [
                { feature: 'Adjacent Building N', height: 20, shadowLength: 30, affectedArea: 200 }
            ]
        };
    }
    async findExcavationZones(dem, designLevels) {
        const zones = [];
        const centerI = Math.floor(dem.length / 2);
        const centerJ = Math.floor(dem[0].length / 2);
        for (let z = 0; z < 3; z++) {
            const offsetI = Math.floor((z - 1) * dem.length * 0.2);
            const offsetJ = Math.floor((z - 1) * dem[0].length * 0.2);
            const ii = centerI + offsetI;
            const jj = centerJ + offsetJ;
            if (ii < 0 || ii >= dem.length || jj < 0 || jj >= dem[0].length)
                continue;
            const depth = dem[ii][jj] - (designLevels[ii]?.[jj] || dem[ii][jj] - 2);
            const area = 500 + Math.random() * 1000;
            zones.push({
                id: `EX-${z + 1}`,
                area: Math.round(area * 100) / 100,
                volume: Math.round(area * Math.abs(depth) * 100) / 100,
                location: {
                    points: [
                        { lat: 24.5 + ii * 0.001, lng: 46.5 + jj * 0.001 },
                        { lat: 24.5 + ii * 0.001, lng: 46.5 + (jj + 10) * 0.001 },
                        { lat: 24.5 + (ii + 10) * 0.001, lng: 46.5 + (jj + 10) * 0.001 },
                        { lat: 24.5 + (ii + 10) * 0.001, lng: 46.5 + jj * 0.001 },
                        { lat: 24.5 + ii * 0.001, lng: 46.5 + jj * 0.001 }
                    ]
                },
                soilType: types_1.SoilType.Sand,
                depth: Math.round(Math.abs(depth) * 100) / 100,
                difficulty: Math.abs(depth) > 5 ? 'Difficult' : Math.abs(depth) > 2 ? 'Moderate' : 'Easy',
                costEstimate: Math.round(area * Math.abs(depth) * 25 * 100) / 100
            });
        }
        return zones;
    }
    async findFillZones(dem, designLevels) {
        const zones = [];
        for (let z = 0; z < 2; z++) {
            zones.push({
                id: `FL-${z + 1}`,
                area: Math.round((300 + Math.random() * 700) * 100) / 100,
                volume: Math.round((500 + Math.random() * 1500) * 100) / 100,
                location: { points: [{ lat: 24.5, lng: 46.5 }, { lat: 24.51, lng: 46.51 }, { lat: 24.52, lng: 46.52 }, { lat: 24.51, lng: 46.5 }, { lat: 24.5, lng: 46.5 }] },
                soilType: types_1.SoilType.Gravel,
                depth: Math.round((1 + Math.random() * 2) * 100) / 100,
                difficulty: 'Easy',
                costEstimate: Math.round((300 + Math.random() * 700) * 20 * 100) / 100
            });
        }
        return zones;
    }
    async findStorageZones(site, constraints) {
        return [
            { id: 'ST-1', type: 'Material Storage', area: 500, location: site, access: 'Main Gate', capacity: 1000 },
            { id: 'ST-2', type: 'Equipment Storage', area: 300, location: site, access: 'Secondary Gate', capacity: 20 },
            { id: 'ST-3', type: 'Waste Area', area: 200, location: site, access: 'Service Gate', capacity: 500 }
        ];
    }
    async findOptimalCraneLocations(site, buildingFootprint) {
        const footprintCenter = {
            lat: buildingFootprint.points.reduce((s, p) => s + p.lat, 0) / buildingFootprint.points.length,
            lng: buildingFootprint.points.reduce((s, p) => s + p.lng, 0) / buildingFootprint.points.length
        };
        return [
            {
                id: 'CR-1', location: { lat: footprintCenter.lat - 0.005, lng: footprintCenter.lng - 0.005 },
                radius: 40, liftingCapacity: 12, coverage: 0.6, obstacles: [], optimal: true
            },
            {
                id: 'CR-2', location: { lat: footprintCenter.lat + 0.005, lng: footprintCenter.lng + 0.005 },
                radius: 35, liftingCapacity: 8, coverage: 0.4, obstacles: ['Power line'], optimal: false
            }
        ];
    }
    async findOptimalGateLocations(site, roadNetwork) {
        return [
            { id: 'GT-1', location: site.points[0], width: 8, height: 5, type: 'Main', accessRoad: 'Highway A', securityRequired: true },
            { id: 'GT-2', location: site.points[1], width: 6, height: 4.5, type: 'Secondary', accessRoad: 'Street B', securityRequired: false },
            { id: 'GT-3', location: site.points[2], width: 10, height: 5.5, type: 'Service', accessRoad: 'Service Road', securityRequired: true }
        ];
    }
    async analyzeSite(layerId, options) {
        return this.engine.analyzeSite(layerId, options);
    }
}
exports.SiteAnalyzer = SiteAnalyzer;
//# sourceMappingURL=analyzers.js.map