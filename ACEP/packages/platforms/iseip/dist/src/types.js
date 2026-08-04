"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirmwareUpdateStatus = exports.EnergyType = exports.PrivacyLevel = exports.TrackingMethod = exports.AnalysisType = exports.CameraType = exports.AlertType = exports.AlertSeverity = exports.EventType = exports.CommunicationProtocol = exports.SensorStatus = exports.SensorCategoryMap = exports.SensorCategory = exports.SensorType = void 0;
var SensorType;
(function (SensorType) {
    SensorType["Temperature"] = "Temperature";
    SensorType["Humidity"] = "Humidity";
    SensorType["Pressure"] = "Pressure";
    SensorType["WindSpeed"] = "WindSpeed";
    SensorType["AirQuality"] = "AirQuality";
    SensorType["Rain"] = "Rain";
    SensorType["SolarRadiation"] = "SolarRadiation";
    SensorType["Vibration"] = "Vibration";
    SensorType["Tilt"] = "Tilt";
    SensorType["Crack"] = "Crack";
    SensorType["Strain"] = "Strain";
    SensorType["Load"] = "Load";
    SensorType["Settlement"] = "Settlement";
    SensorType["Hours"] = "Hours";
    SensorType["Fuel"] = "Fuel";
    SensorType["Oil"] = "Oil";
    SensorType["Rpm"] = "Rpm";
    SensorType["Energy"] = "Energy";
    SensorType["Gas"] = "Gas";
    SensorType["Smoke"] = "Smoke";
    SensorType["Fire"] = "Fire";
    SensorType["Fall"] = "Fall";
    SensorType["ZoneEntry"] = "ZoneEntry";
    SensorType["Helmet"] = "Helmet";
    SensorType["Tracker"] = "Tracker";
    SensorType["Water"] = "Water";
    SensorType["Electricity"] = "Electricity";
    SensorType["FuelMeter"] = "FuelMeter";
})(SensorType || (exports.SensorType = SensorType = {}));
var SensorCategory;
(function (SensorCategory) {
    SensorCategory["Environmental"] = "Environmental";
    SensorCategory["Structural"] = "Structural";
    SensorCategory["Equipment"] = "Equipment";
    SensorCategory["Safety"] = "Safety";
    SensorCategory["Utility"] = "Utility";
})(SensorCategory || (exports.SensorCategory = SensorCategory = {}));
exports.SensorCategoryMap = {
    [SensorType.Temperature]: SensorCategory.Environmental,
    [SensorType.Humidity]: SensorCategory.Environmental,
    [SensorType.Pressure]: SensorCategory.Environmental,
    [SensorType.WindSpeed]: SensorCategory.Environmental,
    [SensorType.AirQuality]: SensorCategory.Environmental,
    [SensorType.Rain]: SensorCategory.Environmental,
    [SensorType.SolarRadiation]: SensorCategory.Environmental,
    [SensorType.Vibration]: SensorCategory.Structural,
    [SensorType.Tilt]: SensorCategory.Structural,
    [SensorType.Crack]: SensorCategory.Structural,
    [SensorType.Strain]: SensorCategory.Structural,
    [SensorType.Load]: SensorCategory.Structural,
    [SensorType.Settlement]: SensorCategory.Structural,
    [SensorType.Hours]: SensorCategory.Equipment,
    [SensorType.Fuel]: SensorCategory.Equipment,
    [SensorType.Oil]: SensorCategory.Equipment,
    [SensorType.Rpm]: SensorCategory.Equipment,
    [SensorType.Energy]: SensorCategory.Equipment,
    [SensorType.Gas]: SensorCategory.Safety,
    [SensorType.Smoke]: SensorCategory.Safety,
    [SensorType.Fire]: SensorCategory.Safety,
    [SensorType.Fall]: SensorCategory.Safety,
    [SensorType.ZoneEntry]: SensorCategory.Safety,
    [SensorType.Helmet]: SensorCategory.Safety,
    [SensorType.Tracker]: SensorCategory.Safety,
    [SensorType.Water]: SensorCategory.Utility,
    [SensorType.Electricity]: SensorCategory.Utility,
    [SensorType.FuelMeter]: SensorCategory.Utility
};
var SensorStatus;
(function (SensorStatus) {
    SensorStatus["Online"] = "Online";
    SensorStatus["Offline"] = "Offline";
    SensorStatus["Error"] = "Error";
    SensorStatus["Calibrating"] = "Calibrating";
    SensorStatus["Maintenance"] = "Maintenance";
})(SensorStatus || (exports.SensorStatus = SensorStatus = {}));
var CommunicationProtocol;
(function (CommunicationProtocol) {
    CommunicationProtocol["MQTT"] = "MQTT";
    CommunicationProtocol["CoAP"] = "CoAP";
    CommunicationProtocol["HTTP"] = "HTTP";
    CommunicationProtocol["WebSocket"] = "WebSocket";
    CommunicationProtocol["LoRaWAN"] = "LoRaWAN";
    CommunicationProtocol["Zigbee"] = "Zigbee";
    CommunicationProtocol["Bluetooth"] = "Bluetooth";
    CommunicationProtocol["Modbus"] = "Modbus";
    CommunicationProtocol["OPCUA"] = "OPCUA";
    CommunicationProtocol["BACnet"] = "BACnet";
})(CommunicationProtocol || (exports.CommunicationProtocol = CommunicationProtocol = {}));
var EventType;
(function (EventType) {
    EventType["ThresholdCrossed"] = "ThresholdCrossed";
    EventType["AnomalyDetected"] = "AnomalyDetected";
    EventType["EquipmentFailure"] = "EquipmentFailure";
    EventType["SafetyViolation"] = "SafetyViolation";
    EventType["ZoneBreach"] = "ZoneBreach";
    EventType["EnvironmentalAlert"] = "EnvironmentalAlert";
    EventType["StructuralAlert"] = "StructuralAlert";
    EventType["MaintenanceRequired"] = "MaintenanceRequired";
    EventType["EnergySpike"] = "EnergySpike";
    EventType["CommunicationLost"] = "CommunicationLost";
    EventType["FirmwareUpdateAvailable"] = "FirmwareUpdateAvailable";
    EventType["CalibrationRequired"] = "CalibrationRequired";
    EventType["ManualOverride"] = "ManualOverride";
    EventType["SystemStartup"] = "SystemStartup";
    EventType["SystemShutdown"] = "SystemShutdown";
})(EventType || (exports.EventType = EventType = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["Critical"] = "Critical";
    AlertSeverity["High"] = "High";
    AlertSeverity["Medium"] = "Medium";
    AlertSeverity["Low"] = "Low";
    AlertSeverity["Info"] = "Info";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertType;
(function (AlertType) {
    AlertType["EquipmentFailure"] = "EquipmentFailure";
    AlertType["SafetyHazard"] = "SafetyHazard";
    AlertType["StructuralIssue"] = "StructuralIssue";
    AlertType["EnvironmentalHazard"] = "EnvironmentalHazard";
    AlertType["EnergyAnomaly"] = "EnergyAnomaly";
    AlertType["MaintenanceAlert"] = "MaintenanceAlert";
    AlertType["SecurityBreach"] = "SecurityBreach";
    AlertType["CommunicationFailure"] = "CommunicationFailure";
    AlertType["CalibrationAlert"] = "CalibrationAlert";
    AlertType["GeneralAlert"] = "GeneralAlert";
})(AlertType || (exports.AlertType = AlertType = {}));
var CameraType;
(function (CameraType) {
    CameraType["Fixed"] = "Fixed";
    CameraType["PTZ"] = "PTZ";
    CameraType["Thermal"] = "Thermal";
    CameraType["Drone"] = "Drone";
})(CameraType || (exports.CameraType = CameraType = {}));
var AnalysisType;
(function (AnalysisType) {
    AnalysisType["ProgressTracking"] = "ProgressTracking";
    AnalysisType["SafetyCompliance"] = "SafetyCompliance";
    AnalysisType["EquipmentStatus"] = "EquipmentStatus";
    AnalysisType["MaterialStorage"] = "MaterialStorage";
    AnalysisType["ObstacleDetection"] = "ObstacleDetection";
    AnalysisType["WorkerTracking"] = "WorkerTracking";
    AnalysisType["QualityInspection"] = "QualityInspection";
})(AnalysisType || (exports.AnalysisType = AnalysisType = {}));
var TrackingMethod;
(function (TrackingMethod) {
    TrackingMethod["RFID"] = "RFID";
    TrackingMethod["GPS"] = "GPS";
    TrackingMethod["BLE"] = "BLE";
    TrackingMethod["UWB"] = "UWB";
})(TrackingMethod || (exports.TrackingMethod = TrackingMethod = {}));
var PrivacyLevel;
(function (PrivacyLevel) {
    PrivacyLevel["Full"] = "Full";
    PrivacyLevel["Anonymized"] = "Anonymized";
    PrivacyLevel["Aggregated"] = "Aggregated";
    PrivacyLevel["LocationOnly"] = "LocationOnly";
})(PrivacyLevel || (exports.PrivacyLevel = PrivacyLevel = {}));
var EnergyType;
(function (EnergyType) {
    EnergyType["Electricity"] = "Electricity";
    EnergyType["Water"] = "Water";
    EnergyType["Fuel"] = "Fuel";
    EnergyType["Gas"] = "Gas";
})(EnergyType || (exports.EnergyType = EnergyType = {}));
var FirmwareUpdateStatus;
(function (FirmwareUpdateStatus) {
    FirmwareUpdateStatus["Pending"] = "Pending";
    FirmwareUpdateStatus["Downloading"] = "Downloading";
    FirmwareUpdateStatus["Ready"] = "Ready";
    FirmwareUpdateStatus["Installing"] = "Installing";
    FirmwareUpdateStatus["Completed"] = "Completed";
    FirmwareUpdateStatus["Failed"] = "Failed";
    FirmwareUpdateStatus["RolledBack"] = "RolledBack";
})(FirmwareUpdateStatus || (exports.FirmwareUpdateStatus = FirmwareUpdateStatus = {}));
//# sourceMappingURL=types.js.map