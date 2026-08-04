export {
  SafetyEngine,
} from "./engine";

export {
  ComputerVisionEngine,
  DroneAnalysisEngine,
  SmartHelmetAnalysis,
  SensorFusionEngine,
} from "./computer-vision";

export {
  SafetyCopilot,
} from "./safety-copilot";

export * from "./types";
export * from "./interfaces";

import { SafetyEngine } from "./engine";
import { ComputerVisionEngine } from "./computer-vision";
import { SafetyCopilot } from "./safety-copilot";

export interface SIAPPPlatform {
  engine: SafetyEngine;
  vision: ComputerVisionEngine;
  copilot: SafetyCopilot;
}

export function createSIAPPPlatform(): SIAPPPlatform {
  const engine = new SafetyEngine();
  const vision = new ComputerVisionEngine();
  const copilot = new SafetyCopilot(engine);

  vision.on("detection", (detection) => {
    engine.addDetection("default", detection);
  });

  vision.on("flagForReview", (detection) => {
    copilot.emit("flagForReview", detection);
  });

  return { engine, vision, copilot };
}

export default createSIAPPPlatform;
