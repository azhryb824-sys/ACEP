"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RobotStatus = exports.AutonomousEquipment = exports.SurveySubtype = exports.CleaningSubtype = exports.PaintingSubtype = exports.WeldingSubtype = exports.InspectionSubtype = exports.ConstructionSubtype = exports.RobotType = void 0;
var RobotType;
(function (RobotType) {
    RobotType["Construction"] = "Construction";
    RobotType["Inspection"] = "Inspection";
    RobotType["Welding"] = "Welding";
    RobotType["Painting"] = "Painting";
    RobotType["Cleaning"] = "Cleaning";
    RobotType["Survey"] = "Survey";
})(RobotType || (exports.RobotType = RobotType = {}));
var ConstructionSubtype;
(function (ConstructionSubtype) {
    ConstructionSubtype["Bricklaying"] = "Bricklaying";
    ConstructionSubtype["ConcretePrinting"] = "ConcretePrinting";
    ConstructionSubtype["FloorFinishing"] = "FloorFinishing";
})(ConstructionSubtype || (exports.ConstructionSubtype = ConstructionSubtype = {}));
var InspectionSubtype;
(function (InspectionSubtype) {
    InspectionSubtype["TunnelInspection"] = "TunnelInspection";
    InspectionSubtype["PipeInspection"] = "PipeInspection";
    InspectionSubtype["BridgeInspection"] = "BridgeInspection";
})(InspectionSubtype || (exports.InspectionSubtype = InspectionSubtype = {}));
var WeldingSubtype;
(function (WeldingSubtype) {
    WeldingSubtype["CuttingRobot"] = "CuttingRobot";
    WeldingSubtype["AssemblyRobot"] = "AssemblyRobot";
})(WeldingSubtype || (exports.WeldingSubtype = WeldingSubtype = {}));
var PaintingSubtype;
(function (PaintingSubtype) {
    PaintingSubtype["IndustrialPainting"] = "IndustrialPainting";
})(PaintingSubtype || (exports.PaintingSubtype = PaintingSubtype = {}));
var CleaningSubtype;
(function (CleaningSubtype) {
    CleaningSubtype["FacadeCleaning"] = "FacadeCleaning";
    CleaningSubtype["SiteCleaning"] = "SiteCleaning";
    CleaningSubtype["SolarCleaning"] = "SolarCleaning";
})(CleaningSubtype || (exports.CleaningSubtype = CleaningSubtype = {}));
var SurveySubtype;
(function (SurveySubtype) {
    SurveySubtype["SurveyRobot"] = "SurveyRobot";
    SurveySubtype["LaserMeasurement"] = "LaserMeasurement";
    SurveySubtype["LiDAR"] = "LiDAR";
})(SurveySubtype || (exports.SurveySubtype = SurveySubtype = {}));
var AutonomousEquipment;
(function (AutonomousEquipment) {
    AutonomousEquipment["Excavator"] = "Excavator";
    AutonomousEquipment["Bulldozer"] = "Bulldozer";
    AutonomousEquipment["Grader"] = "Grader";
    AutonomousEquipment["Loader"] = "Loader";
    AutonomousEquipment["Truck"] = "Truck";
    AutonomousEquipment["Crane"] = "Crane";
    AutonomousEquipment["Forklift"] = "Forklift";
    AutonomousEquipment["ElevatedPlatform"] = "ElevatedPlatform";
})(AutonomousEquipment || (exports.AutonomousEquipment = AutonomousEquipment = {}));
var RobotStatus;
(function (RobotStatus) {
    RobotStatus["Idle"] = "Idle";
    RobotStatus["OnMission"] = "OnMission";
    RobotStatus["Charging"] = "Charging";
    RobotStatus["Maintenance"] = "Maintenance";
    RobotStatus["Error"] = "Error";
    RobotStatus["Offline"] = "Offline";
})(RobotStatus || (exports.RobotStatus = RobotStatus = {}));
//# sourceMappingURL=types.js.map