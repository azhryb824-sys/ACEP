"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyCopilot = exports.SensorFusionEngine = exports.SmartHelmetAnalysis = exports.DroneAnalysisEngine = exports.ComputerVisionEngine = exports.SafetyEngine = void 0;
exports.createSIAPPPlatform = createSIAPPPlatform;
var engine_1 = require("./engine");
Object.defineProperty(exports, "SafetyEngine", { enumerable: true, get: function () { return engine_1.SafetyEngine; } });
var computer_vision_1 = require("./computer-vision");
Object.defineProperty(exports, "ComputerVisionEngine", { enumerable: true, get: function () { return computer_vision_1.ComputerVisionEngine; } });
Object.defineProperty(exports, "DroneAnalysisEngine", { enumerable: true, get: function () { return computer_vision_1.DroneAnalysisEngine; } });
Object.defineProperty(exports, "SmartHelmetAnalysis", { enumerable: true, get: function () { return computer_vision_1.SmartHelmetAnalysis; } });
Object.defineProperty(exports, "SensorFusionEngine", { enumerable: true, get: function () { return computer_vision_1.SensorFusionEngine; } });
var safety_copilot_1 = require("./safety-copilot");
Object.defineProperty(exports, "SafetyCopilot", { enumerable: true, get: function () { return safety_copilot_1.SafetyCopilot; } });
__exportStar(require("./types"), exports);
__exportStar(require("./interfaces"), exports);
const engine_2 = require("./engine");
const computer_vision_2 = require("./computer-vision");
const safety_copilot_2 = require("./safety-copilot");
function createSIAPPPlatform() {
    const engine = new engine_2.SafetyEngine();
    const vision = new computer_vision_2.ComputerVisionEngine();
    const copilot = new safety_copilot_2.SafetyCopilot(engine);
    vision.on("detection", (detection) => {
        engine.addDetection("default", detection);
    });
    vision.on("flagForReview", (detection) => {
        copilot.emit("flagForReview", detection);
    });
    return { engine, vision, copilot };
}
exports.default = createSIAPPPlatform;
//# sourceMappingURL=index.js.map