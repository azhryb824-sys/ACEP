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
exports.SustainabilityIndex = exports.ESGAnalyzer = exports.DEFAULT_EMISSION_FACTORS = exports.CarbonCalculator = exports.SustainabilityEngine = void 0;
__exportStar(require("./types"), exports);
__exportStar(require("./interfaces"), exports);
var engine_1 = require("./engine");
Object.defineProperty(exports, "SustainabilityEngine", { enumerable: true, get: function () { return engine_1.SustainabilityEngine; } });
var carbon_calculator_1 = require("./carbon-calculator");
Object.defineProperty(exports, "CarbonCalculator", { enumerable: true, get: function () { return carbon_calculator_1.CarbonCalculator; } });
Object.defineProperty(exports, "DEFAULT_EMISSION_FACTORS", { enumerable: true, get: function () { return carbon_calculator_1.DEFAULT_EMISSION_FACTORS; } });
var esg_analyzer_1 = require("./esg-analyzer");
Object.defineProperty(exports, "ESGAnalyzer", { enumerable: true, get: function () { return esg_analyzer_1.ESGAnalyzer; } });
var sustainability_index_1 = require("./sustainability-index");
Object.defineProperty(exports, "SustainabilityIndex", { enumerable: true, get: function () { return sustainability_index_1.SustainabilityIndex; } });
const engine_2 = require("./engine");
exports.default = engine_2.SustainabilityEngine;
//# sourceMappingURL=index.js.map