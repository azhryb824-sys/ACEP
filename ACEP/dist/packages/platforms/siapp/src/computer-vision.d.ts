import { EventEmitter } from "events";
import { ComputerVisionDetection, DetectionType, SeverityLevel } from "./types";
import { IComputerVisionEngine, ViolationTrendEntry } from "./interfaces";
export declare class ComputerVisionEngine extends EventEmitter implements IComputerVisionEngine {
    private thresholds;
    private violationHistory;
    private flagForReview;
    constructor();
    private initializeThresholds;
    analyzeFrame(imageData: Buffer): Promise<ComputerVisionDetection[]>;
    analyzeVideo(videoUrl: string): Promise<ComputerVisionDetection[]>;
    getLiveFeed(cameraId: string): AsyncIterable<ComputerVisionDetection>;
    getViolationTrends(projectId: string, start: Date, end: Date): Promise<ViolationTrendEntry[]>;
    setDetectionThreshold(type: DetectionType, confidence: number): void;
    setFlagForReview(enabled: boolean): void;
    private recordViolation;
    private deduplicateDetections;
    getActiveThresholds(): Map<DetectionType, number>;
    getViolationSummary(): ViolationSummary;
}
export interface ViolationSummary {
    totalViolations: number;
    violationsByType: Record<string, number>;
    mostCommonViolation: DetectionType | null;
    mostCommonCount: number;
    averageConfidence: number;
}
export interface VideoAnalysisResult {
    videoUrl: string;
    totalFrames: number;
    detections: ComputerVisionDetection[];
    duration: number;
    flaggedForReview: ComputerVisionDetection[];
}
export declare class DroneAnalysisEngine extends ComputerVisionEngine {
    private altitude;
    private flightPath;
    setAltitude(meters: number): void;
    analyzeAerialView(imageData: Buffer, coordinates: {
        lat: number;
        lng: number;
    }): Promise<ComputerVisionDetection[]>;
    getFlightPath(): {
        lat: number;
        lng: number;
        alt: number;
    }[];
}
export declare class SmartHelmetAnalysis {
    private helmetStreams;
    processHelmetData(helmetId: string, data: SmartHelmetData): void;
    getWorkerStatus(helmetId: string): SmartHelmetData | undefined;
    detectWorkerFatigue(helmetId: string): number;
    detectCollisionRisk(helmetId: string): number;
}
export interface SmartHelmetData {
    helmetId: string;
    workerId: string;
    headMovementVariance: number;
    inactivityDuration: number;
    nearbyEquipmentDistance: number;
    workerSpeed: number;
    temperature: number;
    heartRate: number;
    gps: {
        lat: number;
        lng: number;
    };
    timestamp: Date;
    impactDetected: boolean;
}
export declare class SensorFusionEngine {
    private sensors;
    ingestSensorData(sensorId: string, reading: SensorReading): void;
    detectGasLeak(): SensorAlert | null;
    monitorStructuralStability(): SensorAlert | null;
    getSensorReadings(): Map<string, SensorReading>;
}
export interface SensorReading {
    type: "gas" | "vibration" | "temperature" | "noise" | "wind" | "humidity";
    value: number;
    threshold: number;
    unit: string;
    location: {
        zoneId: string;
        x: number;
        y: number;
        z: number;
    };
    timestamp: Date;
}
export interface SensorAlert {
    sensorId: string;
    alertType: string;
    severity: SeverityLevel;
    value: number;
    threshold: number;
    timestamp: Date;
}
//# sourceMappingURL=computer-vision.d.ts.map