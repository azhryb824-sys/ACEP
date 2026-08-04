"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenancePriority = exports.MaintenancePlanType = exports.OperationalImpact = exports.SeverityLevel = exports.FailureCategory = exports.WorkOrderStatus = exports.WorkOrderType = exports.AssetCriticality = exports.AssetStatus = exports.AssetType = void 0;
var AssetType;
(function (AssetType) {
    AssetType["Elevator"] = "Elevator";
    AssetType["Escalator"] = "Escalator";
    AssetType["Generator"] = "Generator";
    AssetType["Transformer"] = "Transformer";
    AssetType["Pump"] = "Pump";
    AssetType["HVAC"] = "HVAC";
    AssetType["FireFighting"] = "FireFighting";
    AssetType["Alarm"] = "Alarm";
    AssetType["AutomaticDoor"] = "AutomaticDoor";
    AssetType["ElectricalPanel"] = "ElectricalPanel";
    AssetType["SiteEquipment"] = "SiteEquipment";
    AssetType["Crane"] = "Crane";
    AssetType["Compressor"] = "Compressor";
    AssetType["Tank"] = "Tank";
    AssetType["SolarSystem"] = "SolarSystem";
    AssetType["BatterySystem"] = "BatterySystem";
    AssetType["CivilAsset"] = "CivilAsset";
})(AssetType || (exports.AssetType = AssetType = {}));
var AssetStatus;
(function (AssetStatus) {
    AssetStatus["Registered"] = "Registered";
    AssetStatus["Installed"] = "Installed";
    AssetStatus["Commissioned"] = "Commissioned";
    AssetStatus["Operational"] = "Operational";
    AssetStatus["UnderMaintenance"] = "UnderMaintenance";
    AssetStatus["Retired"] = "Retired";
})(AssetStatus || (exports.AssetStatus = AssetStatus = {}));
var AssetCriticality;
(function (AssetCriticality) {
    AssetCriticality["Low"] = "Low";
    AssetCriticality["Medium"] = "Medium";
    AssetCriticality["High"] = "High";
    AssetCriticality["Critical"] = "Critical";
    AssetCriticality["Emergency"] = "Emergency";
})(AssetCriticality || (exports.AssetCriticality = AssetCriticality = {}));
var WorkOrderType;
(function (WorkOrderType) {
    WorkOrderType["Emergency"] = "Emergency";
    WorkOrderType["Preventive"] = "Preventive";
    WorkOrderType["Predictive"] = "Predictive";
    WorkOrderType["Inspection"] = "Inspection";
})(WorkOrderType || (exports.WorkOrderType = WorkOrderType = {}));
var WorkOrderStatus;
(function (WorkOrderStatus) {
    WorkOrderStatus["Draft"] = "Draft";
    WorkOrderStatus["Assigned"] = "Assigned";
    WorkOrderStatus["InProgress"] = "InProgress";
    WorkOrderStatus["Completed"] = "Completed";
    WorkOrderStatus["Cancelled"] = "Cancelled";
    WorkOrderStatus["OnHold"] = "OnHold";
})(WorkOrderStatus || (exports.WorkOrderStatus = WorkOrderStatus = {}));
var FailureCategory;
(function (FailureCategory) {
    FailureCategory["Mechanical"] = "Mechanical";
    FailureCategory["Electrical"] = "Electrical";
    FailureCategory["Electronic"] = "Electronic";
    FailureCategory["Software"] = "Software";
    FailureCategory["Operational"] = "Operational";
    FailureCategory["Environmental"] = "Environmental";
    FailureCategory["Human"] = "Human";
    FailureCategory["RootCause"] = "RootCause";
})(FailureCategory || (exports.FailureCategory = FailureCategory = {}));
var SeverityLevel;
(function (SeverityLevel) {
    SeverityLevel["Negligible"] = "Negligible";
    SeverityLevel["Minor"] = "Minor";
    SeverityLevel["Moderate"] = "Moderate";
    SeverityLevel["Major"] = "Major";
    SeverityLevel["Critical"] = "Critical";
    SeverityLevel["Catastrophic"] = "Catastrophic";
})(SeverityLevel || (exports.SeverityLevel = SeverityLevel = {}));
var OperationalImpact;
(function (OperationalImpact) {
    OperationalImpact["None"] = "None";
    OperationalImpact["Degraded"] = "Degraded";
    OperationalImpact["Interrupted"] = "Interrupted";
    OperationalImpact["Shutdown"] = "Shutdown";
    OperationalImpact["SafetyHazard"] = "SafetyHazard";
})(OperationalImpact || (exports.OperationalImpact = OperationalImpact = {}));
var MaintenancePlanType;
(function (MaintenancePlanType) {
    MaintenancePlanType["Daily"] = "Daily";
    MaintenancePlanType["Weekly"] = "Weekly";
    MaintenancePlanType["Monthly"] = "Monthly";
    MaintenancePlanType["Quarterly"] = "Quarterly";
    MaintenancePlanType["SemiAnnual"] = "SemiAnnual";
    MaintenancePlanType["Annual"] = "Annual";
    MaintenancePlanType["Custom"] = "Custom";
})(MaintenancePlanType || (exports.MaintenancePlanType = MaintenancePlanType = {}));
var MaintenancePriority;
(function (MaintenancePriority) {
    MaintenancePriority["Routine"] = "Routine";
    MaintenancePriority["Scheduled"] = "Scheduled";
    MaintenancePriority["Urgent"] = "Urgent";
    MaintenancePriority["Immediate"] = "Immediate";
    MaintenancePriority["Replacement"] = "Replacement";
})(MaintenancePriority || (exports.MaintenancePriority = MaintenancePriority = {}));
//# sourceMappingURL=types.js.map