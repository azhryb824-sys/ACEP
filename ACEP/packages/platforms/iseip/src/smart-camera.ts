import { v4 as uuid } from 'uuid';
import {
  ICameraAnalyzer
} from './interfaces';
import {
  CameraConfig, CameraType, AnalysisType, CameraAnalysisResult,
  Detection, BoundingBox, PTZConfig, PTZPreset, ThermalConfig,
  DroneConfig, GeoFencePoint
} from './types';

export class SmartCameraAnalyzer implements ICameraAnalyzer {
  private cameras: Map<string, CameraConfig> = new Map();
  private streams: Set<string> = new Set();
  private analysisCache: Map<string, CameraAnalysisResult[]> = new Map();

  async registerCamera(config: CameraConfig): Promise<string> {
    const id = config.id || `CAM-${config.type}-${Date.now()}`;
    const camera: CameraConfig = {
      ...config,
      id,
      status: 'Online',
      capabilities: config.capabilities || this.defaultCapabilities(config.type)
    };
    this.cameras.set(id, camera);
    this.analysisCache.set(id, []);
    this.log(`Camera registered: ${id} (${config.type})`);
    return id;
  }

  async unregisterCamera(cameraId: string): Promise<void> {
    await this.stopStream(cameraId);
    this.cameras.delete(cameraId);
    this.analysisCache.delete(cameraId);
    this.log(`Camera unregistered: ${cameraId}`);
  }

  getCamera(cameraId: string): CameraConfig | undefined {
    return this.cameras.get(cameraId);
  }

  listCameras(type?: CameraType): CameraConfig[] {
    const all = Array.from(this.cameras.values());
    return type ? all.filter(c => c.type === type) : all;
  }

  async captureFrame(cameraId: string): Promise<string> {
    const camera = this.cameras.get(cameraId);
    if (!camera) throw new Error(`Camera not found: ${cameraId}`);
    const frameId = `FRAME-${cameraId}-${Date.now()}`;
    camera.lastFrame = frameId;
    this.log(`Frame captured: ${frameId} from ${cameraId}`);
    return frameId;
  }

  async analyzeFrame(cameraId: string, analysisType: AnalysisType): Promise<CameraAnalysisResult> {
    const camera = this.cameras.get(cameraId);
    if (!camera) throw new Error(`Camera not found: ${cameraId}`);

    await this.captureFrame(cameraId);

    let result: CameraAnalysisResult;
    switch (analysisType) {
      case AnalysisType.ProgressTracking:
        result = await this.analyzeProgress(cameraId);
        break;
      case AnalysisType.SafetyCompliance:
        result = await this.analyzeSafety(cameraId);
        break;
      case AnalysisType.EquipmentStatus:
        result = await this.analyzeEquipment(cameraId);
        break;
      case AnalysisType.MaterialStorage:
        result = await this.analyzeMaterials(cameraId);
        break;
      case AnalysisType.ObstacleDetection:
        result = await this.detectObstacles(cameraId);
        break;
      case AnalysisType.WorkerTracking:
        result = await this.trackWorkers(cameraId);
        break;
      case AnalysisType.QualityInspection:
        result = await this.runQualityInspection(cameraId);
        break;
      default:
        result = this.defaultResult(cameraId, analysisType);
    }

    const history = this.analysisCache.get(cameraId) || [];
    history.push(result);
    if (history.length > 1000) history.shift();
    this.analysisCache.set(cameraId, history);

    return result;
  }

  async analyzeProgress(cameraId: string): Promise<CameraAnalysisResult> {
    const detections: Detection[] = [
      { label: 'structure_completed', confidence: 0.85, boundingBox: { x: 100, y: 150, width: 300, height: 200 } },
      { label: 'concrete_pouring', confidence: 0.72, boundingBox: { x: 400, y: 200, width: 200, height: 150 } },
      { label: 'steel_erection', confidence: 0.67, boundingBox: { x: 50, y: 300, width: 250, height: 180 } }
    ];

    return {
      cameraId,
      analysisType: AnalysisType.ProgressTracking,
      timestamp: new Date().toISOString(),
      confidence: detections.reduce((a, d) => a + d.confidence, 0) / detections.length,
      detections,
      summary: `Progress analysis: ${detections.length} structural elements detected. Estimated completion: 65%`,
      alertGenerated: false
    };
  }

  async analyzeSafety(cameraId: string): Promise<CameraAnalysisResult> {
    const detections: Detection[] = [
      { label: 'worker_no_helmet', confidence: 0.91, boundingBox: { x: 200, y: 100, width: 80, height: 180 } },
      { label: 'worker_no_vest', confidence: 0.88, boundingBox: { x: 300, y: 120, width: 75, height: 170 } },
      { label: 'safe_zone_violation', confidence: 0.76, boundingBox: { x: 500, y: 250, width: 150, height: 120 } }
    ];

    const hasViolations = detections.some(d => d.confidence > 0.8);

    return {
      cameraId,
      analysisType: AnalysisType.SafetyCompliance,
      timestamp: new Date().toISOString(),
      confidence: 0.85,
      detections,
      summary: hasViolations
        ? `Safety violations detected: ${detections.filter(d => d.confidence > 0.8).length} issues found`
        : 'All safety protocols followed',
      alertGenerated: hasViolations,
      alertId: hasViolations ? uuid() : undefined
    };
  }

  async analyzeEquipment(cameraId: string): Promise<CameraAnalysisResult> {
    const detections: Detection[] = [
      { label: 'crane_operating', confidence: 0.93, boundingBox: { x: 100, y: 50, width: 200, height: 400 } },
      { label: 'excavator_idle', confidence: 0.87, boundingBox: { x: 350, y: 200, width: 180, height: 120 } },
      { label: 'generator_running', confidence: 0.79, boundingBox: { x: 600, y: 300, width: 100, height: 80 } }
    ];

    return {
      cameraId,
      analysisType: AnalysisType.EquipmentStatus,
      timestamp: new Date().toISOString(),
      confidence: 0.86,
      detections,
      summary: 'Equipment status analyzed: 3 units detected (1 operating, 1 idle, 1 running)',
      alertGenerated: false
    };
  }

  async analyzeMaterials(cameraId: string): Promise<CameraAnalysisResult> {
    const detections: Detection[] = [
      { label: 'cement_storage', confidence: 0.89, boundingBox: { x: 50, y: 200, width: 300, height: 200 } },
      { label: 'steel_rebar_stack', confidence: 0.84, boundingBox: { x: 400, y: 150, width: 250, height: 150 } },
      { label: 'aggregate_pile', confidence: 0.78, boundingBox: { x: 200, y: 400, width: 350, height: 150 } },
      { label: 'empty_pallet', confidence: 0.65, boundingBox: { x: 600, y: 350, width: 100, height: 80 } }
    ];

    return {
      cameraId,
      analysisType: AnalysisType.MaterialStorage,
      timestamp: new Date().toISOString(),
      confidence: 0.82,
      detections,
      summary: 'Material storage analysis: adequate stock levels, rebar low (estimated 2 days supply)',
      alertGenerated: true,
      alertId: uuid()
    };
  }

  async detectObstacles(cameraId: string): Promise<CameraAnalysisResult> {
    const detections: Detection[] = [
      { label: 'debris_pile', confidence: 0.92, boundingBox: { x: 150, y: 300, width: 200, height: 150 } },
      { label: 'blocked_pathway', confidence: 0.85, boundingBox: { x: 300, y: 350, width: 180, height: 100 } },
      { label: 'excavation_hazard', confidence: 0.78, boundingBox: { x: 500, y: 250, width: 120, height: 90 } }
    ];

    return {
      cameraId,
      analysisType: AnalysisType.ObstacleDetection,
      timestamp: new Date().toISOString(),
      confidence: 0.87,
      detections,
      summary: 'Obstacle detection: 3 hazards identified, pathway obstruction requires immediate clearing',
      alertGenerated: true,
      alertId: uuid()
    };
  }

  async trackWorkers(cameraId: string): Promise<CameraAnalysisResult> {
    const detections: Detection[] = [
      { label: 'worker', confidence: 0.95, boundingBox: { x: 100, y: 200, width: 50, height: 130 } },
      { label: 'worker', confidence: 0.93, boundingBox: { x: 250, y: 180, width: 45, height: 125 } },
      { label: 'worker', confidence: 0.91, boundingBox: { x: 400, y: 220, width: 55, height: 135 } },
      { label: 'worker', confidence: 0.88, boundingBox: { x: 550, y: 190, width: 48, height: 128 } }
    ];

    const workerCount = detections.length;

    return {
      cameraId,
      analysisType: AnalysisType.WorkerTracking,
      timestamp: new Date().toISOString(),
      confidence: 0.92,
      detections,
      summary: `Worker tracking: ${workerCount} workers detected in frame`,
      alertGenerated: false
    };
  }

  async runQualityInspection(cameraId: string): Promise<CameraAnalysisResult> {
    const detections: Detection[] = [
      { label: 'surface_crack', confidence: 0.81, boundingBox: { x: 200, y: 300, width: 30, height: 5 } },
      { label: 'spalling', confidence: 0.74, boundingBox: { x: 350, y: 280, width: 40, height: 25 } }
    ];

    return {
      cameraId,
      analysisType: AnalysisType.QualityInspection,
      timestamp: new Date().toISOString(),
      confidence: 0.78,
      detections,
      summary: detections.length > 0
        ? 'Quality issues detected: minor surface crack and spalling found'
        : 'No quality issues detected',
      alertGenerated: detections.length > 0,
      alertId: detections.length > 0 ? uuid() : undefined
    };
  }

  async startStream(cameraId: string): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (!camera) throw new Error(`Camera not found: ${cameraId}`);
    this.streams.add(cameraId);
    this.log(`Stream started: ${cameraId}`);
  }

  async stopStream(cameraId: string): Promise<void> {
    this.streams.delete(cameraId);
    this.log(`Stream stopped: ${cameraId}`);
  }

  async movePTZ(cameraId: string, pan: number, tilt: number, zoom: number): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (!camera) throw new Error(`Camera not found: ${cameraId}`);
    if (camera.type !== CameraType.PTZ) throw new Error('Camera does not support PTZ');

    if (camera.ptzConfig) {
      camera.ptzConfig.presetPositions.push({
        id: `PTZ-${Date.now()}`,
        name: `Position ${camera.ptzConfig.presetPositions.length + 1}`,
        pan, tilt, zoom
      });
    }
    this.log(`PTZ move: ${cameraId} -> pan=${pan}, tilt=${tilt}, zoom=${zoom}`);
  }

  async goToPreset(cameraId: string, presetId: string): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (!camera) throw new Error(`Camera not found: ${cameraId}`);
    if (!camera.ptzConfig) throw new Error('No PTZ config');

    const preset = camera.ptzConfig.presetPositions.find(p => p.id === presetId);
    if (!preset) throw new Error(`Preset not found: ${presetId}`);

    this.log(`PTZ goto preset: ${cameraId} -> ${preset.name} (${preset.pan}, ${preset.tilt}, ${preset.zoom})`);
  }

  async getDetections(cameraId: string, analysisType: AnalysisType): Promise<Detection[]> {
    const history = this.analysisCache.get(cameraId) || [];
    const latest = history.filter(r => r.analysisType === analysisType);
    if (latest.length === 0) return [];
    return latest[latest.length - 1].detections;
  }

  private defaultResult(cameraId: string, analysisType: AnalysisType): CameraAnalysisResult {
    return {
      cameraId,
      analysisType,
      timestamp: new Date().toISOString(),
      confidence: 0.5,
      detections: [],
      summary: `Analysis completed: ${analysisType}`,
      alertGenerated: false
    };
  }

  private defaultCapabilities(type: CameraType): AnalysisType[] {
    switch (type) {
      case CameraType.Fixed:
        return [AnalysisType.ProgressTracking, AnalysisType.SafetyCompliance, AnalysisType.MaterialStorage];
      case CameraType.PTZ:
        return [AnalysisType.ProgressTracking, AnalysisType.SafetyCompliance, AnalysisType.EquipmentStatus,
                AnalysisType.MaterialStorage, AnalysisType.ObstacleDetection];
      case CameraType.Thermal:
        return [AnalysisType.EquipmentStatus, AnalysisType.SafetyCompliance, AnalysisType.QualityInspection];
      case CameraType.Drone:
        return [AnalysisType.ProgressTracking, AnalysisType.ObstacleDetection, AnalysisType.MaterialStorage,
                AnalysisType.WorkerTracking];
      default:
        return [AnalysisType.ProgressTracking];
    }
  }

  private log(message: string): void {
    console.log(`[SmartCameraAnalyzer] ${message}`);
  }
}
