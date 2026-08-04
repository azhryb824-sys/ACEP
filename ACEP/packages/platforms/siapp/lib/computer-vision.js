"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorFusionEngine = exports.SmartHelmetAnalysis = exports.DroneAnalysisEngine = exports.ComputerVisionEngine = void 0;
const events_1 = require("events");
const types_1 = require("./types");
class ComputerVisionEngine extends events_1.EventEmitter {
    thresholds = new Map();
    violationHistory = [];
    flagForReview = true;
    constructor() {
        super();
        this.initializeThresholds();
    }
    initializeThresholds() {
        const defaultThresholds = [
            [types_1.DetectionType.NoHelmet, 0.7],
            [types_1.DetectionType.NoVest, 0.7],
            [types_1.DetectionType.NoHarness, 0.75],
            [types_1.DetectionType.RestrictedArea, 0.8],
            [types_1.DetectionType.ProximityToEquipment, 0.75],
            [types_1.DetectionType.ToolDrop, 0.65],
            [types_1.DetectionType.WorkerCrowding, 0.7],
            [types_1.DetectionType.ExitBlocked, 0.8],
        ];
        for (const [type, threshold] of defaultThresholds) {
            this.thresholds.set(type, threshold);
        }
    }
    async analyzeFrame(imageData) {
        const detections = [];
        const simulatedDetections = [
            { type: types_1.DetectionType.NoHelmet, confidence: 0.82 },
            { type: types_1.DetectionType.NoVest, confidence: 0.76 },
            { type: types_1.DetectionType.NoHarness, confidence: 0.91 },
            { type: types_1.DetectionType.RestrictedArea, confidence: 0.88 },
            { type: types_1.DetectionType.ProximityToEquipment, confidence: 0.79 },
            { type: types_1.DetectionType.ToolDrop, confidence: 0.65 },
            { type: types_1.DetectionType.WorkerCrowding, confidence: 0.73 },
            { type: types_1.DetectionType.ExitBlocked, confidence: 0.85 },
        ];
        for (const sim of simulatedDetections) {
            const threshold = this.thresholds.get(sim.type) || 0.7;
            if (sim.confidence >= threshold) {
                const detection = {
                    type: sim.type,
                    confidence: sim.confidence,
                    boundingBox: {
                        x: Math.random() * 1920,
                        y: Math.random() * 1080,
                        width: Math.random() * 200 + 50,
                        height: Math.random() * 300 + 100,
                    },
                    frameTimestamp: Date.now(),
                    cameraId: "cam-001",
                    source: types_1.HazardSource.Cameras,
                };
                detections.push(detection);
                this.recordViolation(detection);
            }
        }
        if (this.flagForReview) {
            const highConfidence = detections.filter((d) => d.confidence >= 0.9);
            for (const det of highConfidence) {
                this.emit("flagForReview", det);
            }
        }
        this.emit("analysisComplete", {
            detections,
            timestamp: Date.now(),
            totalFrames: 1,
            averageConfidence: detections.reduce((s, d) => s + d.confidence, 0) /
                Math.max(1, detections.length),
        });
        return detections;
    }
    async analyzeVideo(videoUrl) {
        const detections = [];
        const frameCount = Math.floor(Math.random() * 100) + 50;
        for (let i = 0; i < frameCount; i++) {
            const frameDetections = await this.analyzeFrame(Buffer.from(`frame-${i}`));
            detections.push(...frameDetections);
        }
        const uniqueDetections = this.deduplicateDetections(detections);
        this.emit("videoAnalysisComplete", {
            videoUrl,
            totalFrames: frameCount,
            detections: uniqueDetections,
            duration: frameCount * 0.033,
        });
        return uniqueDetections;
    }
    async *getLiveFeed(cameraId) {
        while (true) {
            const detections = await this.analyzeFrame(Buffer.from(`live-feed-${cameraId}-${Date.now()}`));
            for (const detection of detections) {
                yield detection;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    async getViolationTrends(projectId, start, end) {
        return this.violationHistory.filter((v) => v.date >= start && v.date <= end);
    }
    setDetectionThreshold(type, confidence) {
        if (confidence < 0 || confidence > 1) {
            throw new Error(`Invalid confidence threshold: ${confidence}. Must be between 0 and 1.`);
        }
        this.thresholds.set(type, confidence);
        this.emit("thresholdUpdated", { type, confidence });
    }
    setFlagForReview(enabled) {
        this.flagForReview = enabled;
    }
    recordViolation(detection) {
        this.violationHistory.push({
            date: new Date(),
            detectionType: detection.type,
            count: 1,
            source: detection.source,
        });
    }
    deduplicateDetections(detections) {
        const seen = new Set();
        return detections.filter((d) => {
            const key = `${d.type}-${d.cameraId}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    getActiveThresholds() {
        return new Map(this.thresholds);
    }
    getViolationSummary() {
        const byType = new Map();
        for (const v of this.violationHistory) {
            byType.set(v.detectionType, (byType.get(v.detectionType) || 0) + 1);
        }
        const total = this.violationHistory.length;
        const mostCommon = [...byType.entries()].sort((a, b) => b[1] - a[1]);
        return {
            totalViolations: total,
            violationsByType: Object.fromEntries(byType),
            mostCommonViolation: mostCommon[0]?.[0] || null,
            mostCommonCount: mostCommon[0]?.[1] || 0,
            averageConfidence: total > 0
                ? this.violationHistory.reduce((s, v) => s + v.count, 0) / total
                : 0,
        };
    }
}
exports.ComputerVisionEngine = ComputerVisionEngine;
class DroneAnalysisEngine extends ComputerVisionEngine {
    altitude = 0;
    flightPath = [];
    setAltitude(meters) {
        this.altitude = meters;
    }
    async analyzeAerialView(imageData, coordinates) {
        this.flightPath.push({ ...coordinates, alt: this.altitude });
        const detections = await this.analyzeFrame(imageData);
        const aerialDetections = detections.map((d) => ({
            type: d.type,
            confidence: Math.max(0, d.confidence - this.altitude * 0.001),
            boundingBox: d.boundingBox,
            frameTimestamp: d.frameTimestamp,
            cameraId: d.cameraId,
            source: types_1.HazardSource.Drones,
        }));
        return aerialDetections;
    }
    getFlightPath() {
        return [...this.flightPath];
    }
}
exports.DroneAnalysisEngine = DroneAnalysisEngine;
class SmartHelmetAnalysis {
    helmetStreams = new Map();
    processHelmetData(helmetId, data) {
        this.helmetStreams.set(helmetId, data);
    }
    getWorkerStatus(helmetId) {
        return this.helmetStreams.get(helmetId);
    }
    detectWorkerFatigue(helmetId) {
        const data = this.helmetStreams.get(helmetId);
        if (!data)
            return 0;
        const headMovements = data.headMovementVariance;
        const inactivityPeriods = data.inactivityDuration;
        const fatigueScore = Math.min(1, headMovements * 0.3 + inactivityPeriods * 0.7);
        return fatigueScore;
    }
    detectCollisionRisk(helmetId) {
        const data = this.helmetStreams.get(helmetId);
        if (!data)
            return 0;
        const proximity = data.nearbyEquipmentDistance;
        const speed = data.workerSpeed;
        if (proximity < 2 && speed > 1.5)
            return 0.9;
        if (proximity < 3 && speed > 1)
            return 0.7;
        return 0.3;
    }
}
exports.SmartHelmetAnalysis = SmartHelmetAnalysis;
class SensorFusionEngine {
    sensors = new Map();
    ingestSensorData(sensorId, reading) {
        this.sensors.set(sensorId, reading);
    }
    detectGasLeak() {
        for (const [id, reading] of this.sensors) {
            if (reading.type === "gas" &&
                reading.value > reading.threshold) {
                return {
                    sensorId: id,
                    alertType: "GasLeak",
                    severity: types_1.SeverityLevel.Critical,
                    value: reading.value,
                    threshold: reading.threshold,
                    timestamp: new Date(),
                };
            }
        }
        return null;
    }
    monitorStructuralStability() {
        for (const [id, reading] of this.sensors) {
            if (reading.type === "vibration" &&
                reading.value > reading.threshold * 2) {
                return {
                    sensorId: id,
                    alertType: "StructuralInstability",
                    severity: types_1.SeverityLevel.High,
                    value: reading.value,
                    threshold: reading.threshold,
                    timestamp: new Date(),
                };
            }
        }
        return null;
    }
    getSensorReadings() {
        return new Map(this.sensors);
    }
}
exports.SensorFusionEngine = SensorFusionEngine;
//# sourceMappingURL=computer-vision.js.map