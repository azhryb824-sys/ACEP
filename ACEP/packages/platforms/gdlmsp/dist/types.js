"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxType = exports.MeasurementSystem = exports.EngineeringCode = exports.Language = void 0;
var Language;
(function (Language) {
    Language["Arabic"] = "ar";
    Language["English"] = "en";
    Language["French"] = "fr";
    Language["Spanish"] = "es";
    Language["German"] = "de";
    Language["Italian"] = "it";
    Language["Turkish"] = "tr";
    Language["Russian"] = "ru";
    Language["Chinese"] = "zh";
    Language["Japanese"] = "ja";
    Language["Korean"] = "ko";
    Language["Portuguese"] = "pt";
    Language["Hindi"] = "hi";
})(Language || (exports.Language = Language = {}));
var EngineeringCode;
(function (EngineeringCode) {
    EngineeringCode["SBC"] = "SBC";
    EngineeringCode["ACI"] = "ACI";
    EngineeringCode["Eurocode"] = "Eurocode";
    EngineeringCode["ASTM"] = "ASTM";
    EngineeringCode["ASCE"] = "ASCE";
    EngineeringCode["BS"] = "BS";
    EngineeringCode["IEC"] = "IEC";
    EngineeringCode["ASME"] = "ASME";
    EngineeringCode["NFPA"] = "NFPA";
    EngineeringCode["ISO"] = "ISO";
})(EngineeringCode || (exports.EngineeringCode = EngineeringCode = {}));
var MeasurementSystem;
(function (MeasurementSystem) {
    MeasurementSystem["Metric"] = "metric";
    MeasurementSystem["Imperial"] = "imperial";
    MeasurementSystem["Both"] = "both";
})(MeasurementSystem || (exports.MeasurementSystem = MeasurementSystem = {}));
var TaxType;
(function (TaxType) {
    TaxType["Percentage"] = "percentage";
    TaxType["Fixed"] = "fixed";
})(TaxType || (exports.TaxType = TaxType = {}));
//# sourceMappingURL=types.js.map