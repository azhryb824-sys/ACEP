"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IoTEngine = void 0;
const core_1 = require("@acep/core");
const edge_gateway_1 = require("./edge-gateway");
const event_processor_1 = require("./event-processor");
const smart_camera_1 = require("./smart-camera");
const types_1 = require("./types");
class IoTEngine extends core_1.BaseEngine {
    sensors = new Map();
    sensorReadings = new Map();
    gateways = new Map();
    eventProcessor;
    cameraAnalyzer;
    equipment = new Map();
    workers = new Map();
    energyMeters = new Map();
    devices = new Map();
    knowledgeGraph;
    constructor(kg) {
        super('IoTEngine', '1.0.0');
        this.knowledgeGraph = kg;
        this.eventProcessor = new event_processor_1.RealTimeEventIntelligence(kg);
        this.cameraAnalyzer = new smart_camera_1.SmartCameraAnalyzer();
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('IoT, Smart Sensors & Edge Intelligence Engine initialized');
    }
    async validate() {
        this.logger.info('Validating IoT Engine configuration');
        return true;
    }
    async registerSensor(config) {
        this.setStatus('running');
        const id = config.id || `SENSOR-${config.type}-${Date.now()}`;
        const sensor = { ...config, id };
        this.sensors.set(id, sensor);
        this.sensorReadings.set(id, []);
        this.knowledgeGraph.addNode({
            id,
            type: 'IoTDevice',
            name: config.name,
            location: config.location,
            properties: {
                sensorType: config.type,
                category: types_1.SensorCategoryMap[config.type],
                status: config.status,
                protocol: config.protocol,
                samplingRate: config.samplingRate
            },
            relationships: [],
            confidence: 1,
            source: 'IoTEngine',
            timestamp: new Date().toISOString()
        });
        this.logger.info(`Registered sensor: ${id} (${config.type})`);
        this.setStatus('idle');
        return id;
    }
    async unregisterSensor(sensorId) {
        this.sensors.delete(sensorId);
        this.sensorReadings.delete(sensorId);
        this.logger.info(`Unregistered sensor: ${sensorId}`);
    }
    getSensor(sensorId) {
        return this.sensors.get(sensorId);
    }
    listSensors(type, status) {
        const all = Array.from(this.sensors.values());
        return all.filter(s => {
            if (type && s.type !== type)
                return false;
            if (status && s.status !== status)
                return false;
            return true;
        });
    }
    async updateSensorStatus(sensorId, status) {
        const sensor = this.sensors.get(sensorId);
        if (!sensor)
            throw new Error(`Sensor not found: ${sensorId}`);
        sensor.status = status;
        this.sensors.set(sensorId, sensor);
        this.logger.info(`Sensor ${sensorId} status updated to ${status}`);
    }
    getSensorReading(sensorId) {
        const history = this.sensorReadings.get(sensorId);
        return history ? history[history.length - 1] : undefined;
    }
    getSensorHistory(sensorId, count = 100) {
        const history = this.sensorReadings.get(sensorId);
        return history ? history.slice(-count) : [];
    }
    async ingestReading(sensorId, reading) {
        const sensor = this.sensors.get(sensorId);
        if (!sensor)
            throw new Error(`Sensor not found: ${sensorId}`);
        sensor.lastReading = reading;
        this.sensors.set(sensorId, sensor);
        const history = this.sensorReadings.get(sensorId) || [];
        history.push(reading);
        if (history.length > 10000)
            history.shift();
        this.sensorReadings.set(sensorId, history);
        const events = await this.eventProcessor.processEvents([reading], [sensor]);
        for (const event of events) {
            this.logger.warn(`Critical event detected: ${event.description}`);
            await this.knowledgeGraph.addNode({
                id: event.id,
                type: 'CriticalEvent',
                name: event.type,
                location: event.location || sensor.location,
                properties: { severity: event.severity, description: event.description },
                relationships: [],
                confidence: event.severity === types_1.AlertSeverity.Critical ? 0.95 : 0.8,
                source: 'IoTEngine',
                timestamp: event.timestamp
            });
        }
    }
    async runDiagnostics(sensorId) {
        const sensor = this.sensors.get(sensorId);
        if (!sensor)
            throw new Error(`Sensor not found: ${sensorId}`);
        const history = this.sensorReadings.get(sensorId) || [];
        const errors = [];
        const warnings = [];
        if (sensor.status === types_1.SensorStatus.Error)
            errors.push('Sensor in error state');
        if (sensor.status === types_1.SensorStatus.Offline)
            errors.push('Sensor is offline');
        if (sensor.batteryLevel !== undefined && sensor.batteryLevel < 10)
            warnings.push('Low battery');
        if (history.length === 0)
            warnings.push('No readings recorded');
        return {
            sensorId,
            status: sensor.status,
            signalStrength: 85 + Math.floor(Math.random() * 15),
            batteryLevel: sensor.batteryLevel ?? 100,
            lastCalibration: '2026-01-15T00:00:00Z',
            readingsSinceCalibration: history.length,
            errors,
            warnings,
            recommendation: errors.length > 0
                ? 'Immediate maintenance required'
                : warnings.length > 0
                    ? 'Schedule preventive maintenance'
                    : 'Sensor operating normally'
        };
    }
    getGatewayConfig() {
        return Array.from(this.gateways.values()).map(g => g.config);
    }
    async attachSensorToGateway(gatewayId, sensorId) {
        const gateway = this.gateways.get(gatewayId);
        if (!gateway)
            throw new Error(`Gateway not found: ${gatewayId}`);
        const sensor = this.sensors.get(sensorId);
        if (!sensor)
            throw new Error(`Sensor not found: ${sensorId}`);
        if (!gateway.config.connectedSensors.includes(sensorId)) {
            gateway.config.connectedSensors.push(sensorId);
        }
        this.logger.info(`Sensor ${sensorId} attached to gateway ${gatewayId}`);
    }
    async setThreshold(sensorId, thresholds) {
        const sensor = this.sensors.get(sensorId);
        if (!sensor)
            throw new Error(`Sensor not found: ${sensorId}`);
        sensor.thresholds = thresholds;
        this.sensors.set(sensorId, sensor);
    }
    async fuseData(sensorIds) {
        const readings = [];
        for (const id of sensorIds) {
            const r = this.getSensorReading(id);
            if (r)
                readings.push(r);
        }
        const values = readings.map(r => r.value);
        const average = values.reduce((a, b) => a + b, 0) / values.length;
        const weights = this.computeWeights(readings);
        const weighted = values.reduce((sum, v, i) => sum + v * weights[i], 0);
        return {
            id: `FUSION-${Date.now()}`,
            sources: sensorIds,
            timestamp: new Date().toISOString(),
            fusedValue: weighted,
            confidence: readings.reduce((a, r) => a + r.confidence, 0) / readings.length,
            method: 'Weighted',
            individualReadings: readings
        };
    }
    async getAnalytics(sensorId, from, to) {
        const sensor = this.sensors.get(sensorId);
        if (!sensor)
            throw new Error(`Sensor not found: ${sensorId}`);
        const all = this.sensorReadings.get(sensorId) || [];
        const filtered = all.filter(r => r.timestamp >= from && r.timestamp <= to);
        const values = filtered.map(r => r.value);
        const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const sorted = [...values].sort((a, b) => a - b);
        let trend;
        if (values.length < 2)
            trend = 'Stable';
        else {
            const firstHalf = values.slice(0, Math.floor(values.length / 2));
            const secondHalf = values.slice(Math.floor(values.length / 2));
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            const diff = Math.abs(secondAvg - firstAvg) / (firstAvg || 1);
            if (diff > 0.5)
                trend = 'Volatile';
            else if (secondAvg > firstAvg * 1.05)
                trend = 'Increasing';
            else if (secondAvg < firstAvg * 0.95)
                trend = 'Decreasing';
            else
                trend = 'Stable';
        }
        const zScoreThreshold = 3;
        const anomalies = filtered.filter(r => {
            const z = Math.abs((r.value - avg) / (stdDev || 1));
            return z > zScoreThreshold;
        });
        return {
            sensorId,
            sensorType: sensor.type,
            period: { from, to },
            readings: filtered.length,
            avg,
            min,
            max,
            stdDev,
            trend,
            anomalies,
            percentiles: {
                p25: sorted[Math.floor(sorted.length * 0.25)] || 0,
                p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
                p75: sorted[Math.floor(sorted.length * 0.75)] || 0,
                p95: sorted[Math.floor(sorted.length * 0.95)] || 0
            }
        };
    }
    computeWeights(readings) {
        const totalConfidence = readings.reduce((sum, r) => sum + r.confidence, 0);
        return readings.map(r => r.confidence / totalConfidence);
    }
    async addGateway(config) {
        const gateway = new edge_gateway_1.EdgeGateway(config);
        await gateway.initialize();
        this.gateways.set(config.id, gateway);
        this.logger.info(`Edge gateway added: ${config.id}`);
        return config.id;
    }
    async removeGateway(gatewayId) {
        await this.gateways.get(gatewayId)?.disconnect();
        this.gateways.delete(gatewayId);
    }
    getGateway(gatewayId) {
        return this.gateways.get(gatewayId);
    }
    async simulateReading(sensorId) {
        const sensor = this.sensors.get(sensorId);
        if (!sensor)
            throw new Error(`Sensor not found: ${sensorId}`);
        const baseValue = this.getBaseValue(sensor.type);
        const noise = (Math.random() - 0.5) * baseValue * 0.1;
        const reading = {
            sensorId,
            timestamp: new Date().toISOString(),
            value: baseValue + noise,
            unit: sensor.unit,
            quality: 0.9 + Math.random() * 0.1,
            confidence: 0.85 + Math.random() * 0.15
        };
        await this.ingestReading(sensorId, reading);
        return reading;
    }
    getBaseValue(type) {
        const baseValues = {
            [types_1.SensorType.Temperature]: 35,
            [types_1.SensorType.Humidity]: 60,
            [types_1.SensorType.Pressure]: 1013,
            [types_1.SensorType.WindSpeed]: 15,
            [types_1.SensorType.AirQuality]: 50,
            [types_1.SensorType.Rain]: 0,
            [types_1.SensorType.SolarRadiation]: 800,
            [types_1.SensorType.Vibration]: 0.5,
            [types_1.SensorType.Tilt]: 0,
            [types_1.SensorType.Crack]: 0.1,
            [types_1.SensorType.Strain]: 100,
            [types_1.SensorType.Load]: 5000,
            [types_1.SensorType.Settlement]: 0,
            [types_1.SensorType.Hours]: 1000,
            [types_1.SensorType.Fuel]: 75,
            [types_1.SensorType.Oil]: 80,
            [types_1.SensorType.Rpm]: 1500,
            [types_1.SensorType.Energy]: 100,
            [types_1.SensorType.Gas]: 0,
            [types_1.SensorType.Smoke]: 0,
            [types_1.SensorType.Fire]: 0,
            [types_1.SensorType.Fall]: 0,
            [types_1.SensorType.ZoneEntry]: 0,
            [types_1.SensorType.Helmet]: 1,
            [types_1.SensorType.Tracker]: 1,
            [types_1.SensorType.Water]: 50,
            [types_1.SensorType.Electricity]: 200,
            [types_1.SensorType.FuelMeter]: 60
        };
        return baseValues[type] || 50;
    }
    getEventProcessor() {
        return this.eventProcessor;
    }
    getCameraAnalyzer() {
        return this.cameraAnalyzer;
    }
    registerEquipment(data) {
        const id = data.equipmentId || `EQ-${Date.now()}`;
        this.equipment.set(id, { ...data, equipmentId: id });
        return Promise.resolve(id);
    }
    unregisterEquipment(equipmentId) {
        this.equipment.delete(equipmentId);
        return Promise.resolve();
    }
    getEquipment(equipmentId) {
        return this.equipment.get(equipmentId);
    }
    listEquipment(status) {
        const all = Array.from(this.equipment.values());
        return status ? all.filter(e => e.status === status) : all;
    }
    async updateLocation(equipmentId, location) {
        const eq = this.equipment.get(equipmentId);
        if (eq) {
            eq.location = location;
            this.equipment.set(equipmentId, eq);
        }
    }
    async updateStatus(id, status) {
        if (this.sensors.has(id)) {
            await this.updateSensorStatus(id, status);
        }
        else {
            const eq = this.equipment.get(id);
            if (eq) {
                eq.status = status;
                this.equipment.set(id, eq);
            }
        }
    }
    async recordHours(equipmentId, hours) {
        const eq = this.equipment.get(equipmentId);
        if (eq) {
            eq.hours = hours;
            this.equipment.set(equipmentId, eq);
        }
    }
    async recordFuel(equipmentId, fuel) {
        const eq = this.equipment.get(equipmentId);
        if (eq) {
            eq.fuel = fuel;
            this.equipment.set(equipmentId, eq);
        }
    }
    async scheduleMaintenance(equipmentId, date) {
        const eq = this.equipment.get(equipmentId);
        if (eq) {
            eq.nextMaintenance = date;
            this.equipment.set(equipmentId, eq);
        }
    }
    async getUtilization(equipmentId, from, to) {
        const eq = this.equipment.get(equipmentId);
        if (!eq)
            throw new Error('Equipment not found');
        return {
            equipmentId, totalHours: eq.hours, idleHours: eq.hours * 0.3,
            operatingHours: eq.hours * 0.6, maintenanceHours: eq.hours * 0.1,
            utilizationRate: 0.6, fuelConsumed: eq.fuel, efficiency: 0.85,
            period: { from, to }
        };
    }
    registerWorker(worker) {
        const id = worker.workerId || `WRK-${Date.now()}`;
        this.workers.set(id, { ...worker, workerId: id });
        return Promise.resolve(id);
    }
    unregisterWorker(workerId) {
        this.workers.delete(workerId);
        return Promise.resolve();
    }
    getWorker(workerId) {
        return this.workers.get(workerId);
    }
    listWorkers(zone) {
        const all = Array.from(this.workers.values());
        return zone ? all.filter(w => w.zone === zone) : all;
    }
    async updateLocationWorker(workerId, location) {
        const w = this.workers.get(workerId);
        if (w) {
            w.location = location;
            this.workers.set(workerId, w);
        }
    }
    async checkIn(workerId, zone) {
        const w = this.workers.get(workerId);
        if (w) {
            w.zone = zone;
            w.lastCheckIn = new Date().toISOString();
            this.workers.set(workerId, w);
        }
    }
    async checkOut(workerId) {
        const w = this.workers.get(workerId);
        if (w) {
            w.zone = 'Offsite';
            w.lastCheckIn = new Date().toISOString();
            this.workers.set(workerId, w);
        }
    }
    getZoneOccupancy(zone) {
        return Array.from(this.workers.values()).filter(w => w.zone === zone).length;
    }
    getWorkersAtRisk() {
        return Array.from(this.workers.values()).filter(w => !w.helmetOn || !w.vestOn);
    }
    async enforcePPE(workerId, helmet, vest) {
        const w = this.workers.get(workerId);
        if (w) {
            w.helmetOn = helmet;
            w.vestOn = vest;
            this.workers.set(workerId, w);
        }
    }
    async getAttendanceReport(date) {
        const all = Array.from(this.workers.values());
        const checkedIn = all.filter(w => w.zone !== 'Offsite');
        const byZone = {};
        const byRole = {};
        for (const w of all) {
            byZone[w.zone] = (byZone[w.zone] || 0) + 1;
            byRole[w.role] = (byRole[w.role] || 0) + 1;
        }
        return {
            date, totalWorkers: all.length, checkedIn: checkedIn.length,
            checkedOut: all.filter(w => w.zone === 'Offsite').length,
            absent: 0, byZone, byRole
        };
    }
    registerMeter(monitoring) {
        const id = `METER-${monitoring.type}-${Date.now()}`;
        this.energyMeters.set(id, monitoring);
        return Promise.resolve(id);
    }
    unregisterMeter(meterId) {
        this.energyMeters.delete(meterId);
        return Promise.resolve();
    }
    getMeter(meterId) {
        return this.energyMeters.get(meterId);
    }
    listMeters(type) {
        const all = Array.from(this.energyMeters.values());
        return type ? all.filter(m => m.type === type) : all;
    }
    async recordConsumption(meterId, consumption) {
        const meter = this.energyMeters.get(meterId);
        if (meter) {
            meter.consumption = consumption;
            meter.timestamp = new Date().toISOString();
            this.energyMeters.set(meterId, meter);
        }
    }
    async getConsumption(meterId, from, to) {
        const meter = this.energyMeters.get(meterId);
        if (!meter)
            throw new Error('Meter not found');
        return {
            meterId, type: meter.type,
            dataPoints: [{ timestamp: meter.timestamp, value: meter.consumption }],
            total: meter.consumption, average: meter.consumption,
            peak: meter.peakDemand, unit: meter.unit
        };
    }
    async detectAnomalies(meterId) {
        return [];
    }
    async optimizeConsumption(meterId) {
        return [];
    }
    async getCostReport(meterId, from, to) {
        const meter = this.energyMeters.get(meterId);
        if (!meter)
            throw new Error('Meter not found');
        return {
            meterId, type: meter.type, period: { from, to },
            totalCost: meter.cost, averageCost: meter.cost,
            peakCost: meter.cost * 1.5, unitCost: meter.cost / (meter.consumption || 1),
            currency: 'SAR'
        };
    }
    async getSustainabilityMetrics() {
        return {
            totalEmissions: 12500,
            emissionsByType: { electricity: 8000, fuel: 3000, gas: 1500 },
            renewablePercentage: 15,
            efficiencyScore: 72,
            waterConservation: 35000,
            wasteReduction: 12000,
            carbonOffset: 5000,
            greenCertifications: ['ISO 14001', 'LEED']
        };
    }
    async register(config) {
        return this.registerSensor(config);
    }
    async unregister(sensorId) {
        return this.unregisterSensor(sensorId);
    }
    get(sensorId) {
        return this.getSensor(sensorId);
    }
    list(type, status) {
        return this.listSensors(type, status);
    }
    getReading(sensorId) {
        return this.getSensorReading(sensorId);
    }
    getHistory(sensorId, count) {
        return this.getSensorHistory(sensorId, count);
    }
    async ingest(sensorId, reading) {
        return this.ingestReading(sensorId, reading);
    }
    async calibrate(sensorId) {
        const sensor = this.sensors.get(sensorId);
        if (!sensor)
            throw new Error(`Sensor not found: ${sensorId}`);
        const prev = sensor.status;
        sensor.status = types_1.SensorStatus.Calibrating;
        this.sensors.set(sensorId, sensor);
        await new Promise(r => setTimeout(r, 100));
        sensor.status = prev;
        this.sensors.set(sensorId, sensor);
        this.logger.info(`Sensor ${sensorId} calibration completed`);
    }
    async setThresholds(sensorId, thresholds) {
        return this.setThreshold(sensorId, thresholds);
    }
}
exports.IoTEngine = IoTEngine;
//# sourceMappingURL=engine.js.map