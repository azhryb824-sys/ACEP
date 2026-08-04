import { ICameraAnalyzer } from './interfaces';
import { CameraConfig, CameraType, AnalysisType, CameraAnalysisResult, Detection } from './types';
export declare class SmartCameraAnalyzer implements ICameraAnalyzer {
    private cameras;
    private streams;
    private analysisCache;
    registerCamera(config: CameraConfig): Promise<string>;
    unregisterCamera(cameraId: string): Promise<void>;
    getCamera(cameraId: string): CameraConfig | undefined;
    listCameras(type?: CameraType): CameraConfig[];
    captureFrame(cameraId: string): Promise<string>;
    analyzeFrame(cameraId: string, analysisType: AnalysisType): Promise<CameraAnalysisResult>;
    analyzeProgress(cameraId: string): Promise<CameraAnalysisResult>;
    analyzeSafety(cameraId: string): Promise<CameraAnalysisResult>;
    analyzeEquipment(cameraId: string): Promise<CameraAnalysisResult>;
    analyzeMaterials(cameraId: string): Promise<CameraAnalysisResult>;
    detectObstacles(cameraId: string): Promise<CameraAnalysisResult>;
    trackWorkers(cameraId: string): Promise<CameraAnalysisResult>;
    runQualityInspection(cameraId: string): Promise<CameraAnalysisResult>;
    startStream(cameraId: string): Promise<void>;
    stopStream(cameraId: string): Promise<void>;
    movePTZ(cameraId: string, pan: number, tilt: number, zoom: number): Promise<void>;
    goToPreset(cameraId: string, presetId: string): Promise<void>;
    getDetections(cameraId: string, analysisType: AnalysisType): Promise<Detection[]>;
    private defaultResult;
    private defaultCapabilities;
    private log;
}
//# sourceMappingURL=smart-camera.d.ts.map