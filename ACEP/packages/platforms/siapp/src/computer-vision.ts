import { EventEmitter } from "events";
import {
  ComputerVisionDetection,
  DetectionType,
  HazardSource,
  SeverityLevel,
} from "./types";
import {
  IComputerVisionEngine,
  ViolationTrendEntry,
} from "./interfaces";

export class ComputerVisionEngine
  extends EventEmitter
  implements IComputerVisionEngine
{
  private thresholds: Map<DetectionType, number> = new Map();
  private violationHistory: ViolationTrendEntry[] = [];
  private flagForReview: boolean = true;

  constructor() {
    super();
    this.initializeThresholds();
  }

  private initializeThresholds(): void {
    const defaultThresholds: [DetectionType, number][] = [
      [DetectionType.NoHelmet, 0.7],
      [DetectionType.NoVest, 0.7],
      [DetectionType.NoHarness, 0.75],
      [DetectionType.RestrictedArea, 0.8],
      [DetectionType.ProximityToEquipment, 0.75],
      [DetectionType.ToolDrop, 0.65],
      [DetectionType.WorkerCrowding, 0.7],
      [DetectionType.ExitBlocked, 0.8],
    ];
    for (const [type, threshold] of defaultThresholds) {
      this.thresholds.set(type, threshold);
    }
  }

  async analyzeFrame(imageData: Buffer): Promise<ComputerVisionDetection[]> {
    const detections: ComputerVisionDetection[] = [];
    const simulatedDetections: Array<{
      type: DetectionType;
      confidence: number;
    }> = [
      { type: DetectionType.NoHelmet, confidence: 0.82 },
      { type: DetectionType.NoVest, confidence: 0.76 },
      { type: DetectionType.NoHarness, confidence: 0.91 },
      { type: DetectionType.RestrictedArea, confidence: 0.88 },
      { type: DetectionType.ProximityToEquipment, confidence: 0.79 },
      { type: DetectionType.ToolDrop, confidence: 0.65 },
      { type: DetectionType.WorkerCrowding, confidence: 0.73 },
      { type: DetectionType.ExitBlocked, confidence: 0.85 },
    ];

    for (const sim of simulatedDetections) {
      const threshold = this.thresholds.get(sim.type) || 0.7;
      if (sim.confidence >= threshold) {
        const detection: ComputerVisionDetection = {
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
          source: HazardSource.Cameras,
        };
        detections.push(detection);
        this.recordViolation(detection);
      }
    }

    if (this.flagForReview) {
      const highConfidence = detections.filter(
        (d) => d.confidence >= 0.9
      );
      for (const det of highConfidence) {
        this.emit("flagForReview", det);
      }
    }

    this.emit("analysisComplete", {
      detections,
      timestamp: Date.now(),
      totalFrames: 1,
      averageConfidence:
        detections.reduce((s, d) => s + d.confidence, 0) /
        Math.max(1, detections.length),
    });

    return detections;
  }

  async analyzeVideo(videoUrl: string): Promise<ComputerVisionDetection[]> {
    const detections: ComputerVisionDetection[] = [];
    const frameCount = Math.floor(Math.random() * 100) + 50;

    for (let i = 0; i < frameCount; i++) {
      const frameDetections = await this.analyzeFrame(
        Buffer.from(`frame-${i}`)
      );
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

  async *getLiveFeed(
    cameraId: string
  ): AsyncIterable<ComputerVisionDetection> {
    while (true) {
      const detections = await this.analyzeFrame(
        Buffer.from(`live-feed-${cameraId}-${Date.now()}`)
      );
      for (const detection of detections) {
        yield detection;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  async getViolationTrends(
    projectId: string,
    start: Date,
    end: Date
  ): Promise<ViolationTrendEntry[]> {
    return this.violationHistory.filter(
      (v) => v.date >= start && v.date <= end
    );
  }

  setDetectionThreshold(type: DetectionType, confidence: number): void {
    if (confidence < 0 || confidence > 1) {
      throw new Error(
        `Invalid confidence threshold: ${confidence}. Must be between 0 and 1.`
      );
    }
    this.thresholds.set(type, confidence);
    this.emit("thresholdUpdated", { type, confidence });
  }

  setFlagForReview(enabled: boolean): void {
    this.flagForReview = enabled;
  }

  private recordViolation(detection: ComputerVisionDetection): void {
    this.violationHistory.push({
      date: new Date(),
      detectionType: detection.type,
      count: 1,
      source: detection.source,
    });
  }

  private deduplicateDetections(
    detections: ComputerVisionDetection[]
  ): ComputerVisionDetection[] {
    const seen = new Set<string>();
    return detections.filter((d) => {
      const key = `${d.type}-${d.cameraId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  getActiveThresholds(): Map<DetectionType, number> {
    return new Map(this.thresholds);
  }

  getViolationSummary(): ViolationSummary {
    const byType = new Map<DetectionType, number>();
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
      averageConfidence:
        total > 0
          ? this.violationHistory.reduce((s, v) => s + v.count, 0) / total
          : 0,
    };
  }
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

export class DroneAnalysisEngine extends ComputerVisionEngine {
  private altitude: number = 0;
  private flightPath: Array<{ lat: number; lng: number; alt: number }> = [];

  setAltitude(meters: number): void {
    this.altitude = meters;
  }

  async analyzeAerialView(
    imageData: Buffer,
    coordinates: { lat: number; lng: number }
  ): Promise<ComputerVisionDetection[]> {
    this.flightPath.push({ ...coordinates, alt: this.altitude });
    const detections = await this.analyzeFrame(imageData);
    const aerialDetections: ComputerVisionDetection[] = detections.map((d) => ({
      type: d.type,
      confidence: Math.max(0, d.confidence - this.altitude * 0.001),
      boundingBox: d.boundingBox,
      frameTimestamp: d.frameTimestamp,
      cameraId: d.cameraId,
      source: HazardSource.Drones,
    }));
    return aerialDetections;
  }

  getFlightPath() {
    return [...this.flightPath];
  }
}

export class SmartHelmetAnalysis {
  private helmetStreams: Map<string, SmartHelmetData> = new Map();

  processHelmetData(helmetId: string, data: SmartHelmetData): void {
    this.helmetStreams.set(helmetId, data);
  }

  getWorkerStatus(helmetId: string): SmartHelmetData | undefined {
    return this.helmetStreams.get(helmetId);
  }

  detectWorkerFatigue(helmetId: string): number {
    const data = this.helmetStreams.get(helmetId);
    if (!data) return 0;
    const headMovements = data.headMovementVariance;
    const inactivityPeriods = data.inactivityDuration;
    const fatigueScore = Math.min(
      1,
      headMovements * 0.3 + inactivityPeriods * 0.7
    );
    return fatigueScore;
  }

  detectCollisionRisk(helmetId: string): number {
    const data = this.helmetStreams.get(helmetId);
    if (!data) return 0;
    const proximity = data.nearbyEquipmentDistance;
    const speed = data.workerSpeed;
    if (proximity < 2 && speed > 1.5) return 0.9;
    if (proximity < 3 && speed > 1) return 0.7;
    return 0.3;
  }
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
  gps: { lat: number; lng: number };
  timestamp: Date;
  impactDetected: boolean;
}

export class SensorFusionEngine {
  private sensors: Map<string, SensorReading> = new Map();

  ingestSensorData(sensorId: string, reading: SensorReading): void {
    this.sensors.set(sensorId, reading);
  }

  detectGasLeak(): SensorAlert | null {
    for (const [id, reading] of this.sensors) {
      if (
        reading.type === "gas" &&
        reading.value > reading.threshold
      ) {
        return {
          sensorId: id,
          alertType: "GasLeak",
          severity: SeverityLevel.Critical,
          value: reading.value,
          threshold: reading.threshold,
          timestamp: new Date(),
        };
      }
    }
    return null;
  }

  monitorStructuralStability(): SensorAlert | null {
    for (const [id, reading] of this.sensors) {
      if (
        reading.type === "vibration" &&
        reading.value > reading.threshold * 2
      ) {
        return {
          sensorId: id,
          alertType: "StructuralInstability",
          severity: SeverityLevel.High,
          value: reading.value,
          threshold: reading.threshold,
          timestamp: new Date(),
        };
      }
    }
    return null;
  }

  getSensorReadings(): Map<string, SensorReading> {
    return new Map(this.sensors);
  }
}

export interface SensorReading {
  type: "gas" | "vibration" | "temperature" | "noise" | "wind" | "humidity";
  value: number;
  threshold: number;
  unit: string;
  location: { zoneId: string; x: number; y: number; z: number };
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
