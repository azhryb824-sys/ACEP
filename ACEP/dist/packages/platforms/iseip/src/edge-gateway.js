"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeGateway = void 0;
const uuid_1 = require("uuid");
const types_1 = require("./types");
class EdgeGateway {
    id;
    config;
    connected = false;
    online = false;
    buffer = [];
    offlineCache = [];
    startTime = Date.now();
    cpuUsage = 0;
    memoryUsage = 0;
    errors = [];
    constructor(config) {
        this.id = config.id;
        this.config = config;
    }
    async initialize() {
        this.cpuUsage = 15 + Math.random() * 10;
        this.memoryUsage = 30 + Math.random() * 20;
        this.connected = false;
        this.online = false;
        this.log('Edge gateway initialized');
    }
    async connect() {
        this.connected = true;
        this.online = true;
        this.startTime = Date.now();
        this.log('Connected to cloud');
        return true;
    }
    async disconnect() {
        this.connected = false;
        this.online = false;
        await this.flushCache();
        this.log('Disconnected from cloud');
    }
    async receiveData(sensorId, reading) {
        const point = {
            sensorId,
            timestamp: reading.timestamp,
            value: reading.value,
            unit: reading.unit,
            quality: reading.quality,
            confidence: reading.confidence,
            processedLocally: false,
            compressed: false
        };
        this.buffer.push(point);
        this.log(`Data received from sensor: ${sensorId} = ${reading.value} ${reading.unit}`);
        if (this.buffer.length >= this.config.bufferSize) {
            await this.processData(this.buffer.splice(0, this.config.bufferSize));
        }
    }
    async processData(data) {
        const start = Date.now();
        const original = [...data];
        const cleaned = await this.filterData(data);
        const compressed = this.config.compressionEnabled
            ? await this.compressData(cleaned)
            : [...cleaned];
        const outliersRemoved = original.length - cleaned.length;
        const anomalyResults = await this.runLocalInference(compressed);
        const anomaliesDetected = anomalyResults.predictions.length;
        const compressionRatio = compressed.length > 0
            ? original.length / compressed.length : 1;
        this.cpuUsage = 25 + Math.random() * 15;
        this.memoryUsage = 40 + Math.random() * 20;
        const result = {
            original, cleaned, compressed,
            outliersRemoved, anomaliesDetected,
            processingTime: Date.now() - start,
            compressionRatio
        };
        if (this.online) {
            await this.syncToCloud();
        }
        else {
            await this.cacheOffline(compressed);
        }
        this.log(`Processed ${data.length} data points: ${outliersRemoved} outliers, ${anomaliesDetected} anomalies`);
        return result;
    }
    async runLocalInference(data) {
        const start = Date.now();
        const predictions = [];
        if (this.config.localAIEnabled && data.length > 0) {
            const groups = this.groupBySensor(data);
            for (const [sensorId, points] of groups) {
                const values = points.map(p => p.value);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const trend = this.detectTrend(values);
                predictions.push({
                    sensorId,
                    predictedValue: this.predictNext(values),
                    actualValue: avg,
                    confidence: 0.75 + Math.random() * 0.2,
                    horizon: '5min',
                    trend
                });
            }
        }
        return {
            predictions,
            confidence: predictions.length > 0
                ? predictions.reduce((a, p) => a + p.confidence, 0) / predictions.length : 0,
            modelName: 'EdgeInference-v1',
            inferenceTime: Date.now() - start,
            recommendations: predictions
                .filter(p => p.trend === 'Up' && p.predictedValue > this.getWarningThreshold(p.sensorId))
                .map(p => `Investigate sensor ${p.sensorId}: rising trend detected`)
        };
    }
    async cacheOffline(data) {
        const entry = {
            id: (0, uuid_1.v4)(),
            data,
            cachedAt: new Date().toISOString(),
            synced: false,
            retryCount: 0,
            size: Buffer.byteLength(JSON.stringify(data))
        };
        this.offlineCache.push(entry);
        this.log(`Cached ${data.length} points offline (cache size: ${this.offlineCache.length})`);
    }
    async syncToCloud() {
        const pending = this.offlineCache.filter(e => !e.synced);
        for (const entry of pending) {
            try {
                entry.synced = true;
                entry.syncedAt = new Date().toISOString();
                this.log(`Synced cache entry ${entry.id} (${entry.data.length} points)`);
            }
            catch (err) {
                entry.retryCount++;
                this.errors.push(`Sync failed for ${entry.id}: ${err}`);
            }
        }
        this.config.lastSync = new Date().toISOString();
    }
    async detectCriticalEvents(readings) {
        const events = [];
        for (const reading of readings) {
            const sensor = this.findSensorConfig(reading.sensorId);
            if (!sensor || !sensor.thresholds)
                continue;
            if (sensor.thresholds.criticalMax && reading.value > sensor.thresholds.criticalMax) {
                events.push(this.createCriticalEvent(reading, 'Critical maximum threshold crossed', types_1.AlertSeverity.Critical));
            }
            if (sensor.thresholds.criticalMin && reading.value < sensor.thresholds.criticalMin) {
                events.push(this.createCriticalEvent(reading, 'Critical minimum threshold crossed', types_1.AlertSeverity.Critical));
            }
            if (sensor.thresholds.max && reading.value > sensor.thresholds.max) {
                events.push(this.createCriticalEvent(reading, 'Maximum threshold crossed', types_1.AlertSeverity.High));
            }
            if (sensor.thresholds.min && reading.value < sensor.thresholds.min) {
                events.push(this.createCriticalEvent(reading, 'Minimum threshold crossed', types_1.AlertSeverity.High));
            }
        }
        return events;
    }
    async checkFirmwareUpdate() {
        const hasUpdate = Math.random() > 0.7;
        if (!hasUpdate)
            return null;
        return {
            currentVersion: this.config.firmwareVersion,
            availableVersion: `${parseFloat(this.config.firmwareVersion) + 0.1}`,
            releaseDate: new Date().toISOString(),
            changelog: ['Bug fixes', 'Performance improvements', 'Security patches'],
            size: 1024 * 1024 * (5 + Math.floor(Math.random() * 10)),
            checksum: `sha256-${(0, uuid_1.v4)().replace(/-/g, '').slice(0, 16)}`,
            updateStatus: types_1.FirmwareUpdateStatus.Pending,
            lastUpdateCheck: new Date().toISOString(),
            updateProgress: 0
        };
    }
    async applyFirmwareUpdate(firmware) {
        this.log(`Applying firmware update: ${firmware.currentVersion} -> ${firmware.availableVersion}`);
        firmware.updateStatus = types_1.FirmwareUpdateStatus.Installing;
        firmware.updateProgress = 0;
        for (let i = 0; i <= 100; i += 10) {
            firmware.updateProgress = i;
            await this.delay(100);
        }
        this.config.firmwareVersion = firmware.availableVersion;
        firmware.updateStatus = types_1.FirmwareUpdateStatus.Completed;
        this.log('Firmware update completed');
    }
    getHealth() {
        const cacheUsage = this.offlineCache.reduce((sum, e) => sum + e.size, 0);
        let status;
        if (!this.connected)
            status = 'Offline';
        else if (this.errors.length > 3 || this.memoryUsage > 80)
            status = 'Degraded';
        else
            status = 'Healthy';
        return {
            gatewayId: this.id,
            status,
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            cpu: this.cpuUsage,
            memory: this.memoryUsage,
            storage: 45 + Math.random() * 20,
            networkLatency: this.online ? 15 + Math.random() * 20 : 0,
            signalStrength: this.connected ? Math.floor(70 + Math.random() * 30) : 0,
            connectedSensors: this.config.connectedSensors.length,
            cacheUsage,
            lastSync: this.config.lastSync || 'Never',
            errors: [...this.errors]
        };
    }
    getCacheSize() {
        return this.offlineCache.reduce((sum, e) => sum + e.data.length, 0);
    }
    async flushCache() {
        if (this.online)
            await this.syncToCloud();
        this.offlineCache = this.offlineCache.filter(e => !e.synced);
        this.buffer = [];
        this.log('Cache flushed');
    }
    async compressData(data) {
        if (!this.config.compressionEnabled)
            return data;
        const compressed = [];
        const groups = this.groupBySensor(data);
        for (const [, points] of groups) {
            if (points.length <= 2) {
                compressed.push(...points);
                continue;
            }
            const sorted = points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            const sampled = this.deadbandFilter(sorted, 0.02);
            compressed.push(...sampled);
        }
        this.log(`Compressed ${data.length} -> ${compressed.length} points`);
        return compressed;
    }
    async filterData(data) {
        return data.filter(p => {
            if (p.quality < 0.3)
                return false;
            if (p.confidence < 0.2)
                return false;
            if (!isFinite(p.value))
                return false;
            return true;
        });
    }
    deadbandFilter(data, epsilon) {
        if (data.length <= 2)
            return data;
        const result = [data[0]];
        let reference = data[0];
        for (let i = 1; i < data.length - 1; i++) {
            const relativeChange = Math.abs((data[i].value - reference.value) / (reference.value || 1));
            if (relativeChange > epsilon) {
                result.push(data[i]);
                reference = data[i];
            }
        }
        result.push(data[data.length - 1]);
        return result;
    }
    groupBySensor(data) {
        const groups = new Map();
        for (const point of data) {
            const existing = groups.get(point.sensorId) || [];
            existing.push(point);
            groups.set(point.sensorId, existing);
        }
        return groups;
    }
    detectTrend(values) {
        if (values.length < 3)
            return 'Stable';
        const first = values.slice(0, Math.floor(values.length / 2));
        const last = values.slice(Math.floor(values.length / 2));
        const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
        const lastAvg = last.reduce((a, b) => a + b, 0) / last.length;
        const diff = (lastAvg - firstAvg) / (firstAvg || 1);
        if (diff > 0.05)
            return 'Up';
        if (diff < -0.05)
            return 'Down';
        return 'Stable';
    }
    predictNext(values) {
        if (values.length < 2)
            return values[0] || 0;
        const n = values.length;
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
            num += (i - xMean) * (values[i] - yMean);
            den += (i - xMean) ** 2;
        }
        const slope = den !== 0 ? num / den : 0;
        return yMean + slope * n;
    }
    getWarningThreshold(sensorId) {
        return 80;
    }
    findSensorConfig(sensorId) {
        return undefined;
    }
    createCriticalEvent(reading, description, severity) {
        return {
            id: (0, uuid_1.v4)(),
            type: 'ThresholdCrossed',
            severity,
            sourceId: reading.sensorId,
            sourceType: 'Sensor',
            description,
            timestamp: new Date().toISOString(),
            value: reading.value,
            requiresImmediateAction: severity === types_1.AlertSeverity.Critical,
            acknowledged: false,
            resolved: false,
            metadata: { unit: reading.unit, thresholdType: description }
        };
    }
    log(message) {
        console.log(`[EdgeGateway:${this.id}] ${message}`);
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.EdgeGateway = EdgeGateway;
//# sourceMappingURL=edge-gateway.js.map