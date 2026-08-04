"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservationStatus = exports.ObservationType = exports.TrainingType = exports.SafetyEquipmentType = exports.EmergencyType = exports.InvestigationStatus = exports.InvestigationType = exports.IncidentStatus = exports.OutcomeType = exports.CauseCategory = exports.PermitType = exports.MitigationStatus = exports.ProbabilityLevel = exports.SeverityLevel = exports.DetectionType = exports.HazardSource = exports.HumanSubType = exports.EnvironmentalSubType = exports.ChemicalSubType = exports.MechanicalSubType = exports.ElectricalSubType = exports.FallSubType = exports.RiskType = void 0;
var RiskType;
(function (RiskType) {
    RiskType["Fall"] = "Fall";
    RiskType["Electrical"] = "Electrical";
    RiskType["Mechanical"] = "Mechanical";
    RiskType["Chemical"] = "Chemical";
    RiskType["Environmental"] = "Environmental";
    RiskType["Human"] = "Human";
})(RiskType || (exports.RiskType = RiskType = {}));
var FallSubType;
(function (FallSubType) {
    FallSubType["Heights"] = "heights";
    FallSubType["Scaffolding"] = "scaffolding";
    FallSubType["Openings"] = "openings";
    FallSubType["Edges"] = "edges";
})(FallSubType || (exports.FallSubType = FallSubType = {}));
var ElectricalSubType;
(function (ElectricalSubType) {
    ElectricalSubType["HighVoltage"] = "highVoltage";
    ElectricalSubType["Grounding"] = "grounding";
    ElectricalSubType["Panels"] = "panels";
    ElectricalSubType["Cables"] = "cables";
})(ElectricalSubType || (exports.ElectricalSubType = ElectricalSubType = {}));
var MechanicalSubType;
(function (MechanicalSubType) {
    MechanicalSubType["Equipment"] = "equipment";
    MechanicalSubType["Cranes"] = "cranes";
    MechanicalSubType["Excavators"] = "excavators";
    MechanicalSubType["TempElevators"] = "tempElevators";
})(MechanicalSubType || (exports.MechanicalSubType = MechanicalSubType = {}));
var ChemicalSubType;
(function (ChemicalSubType) {
    ChemicalSubType["Gases"] = "gases";
    ChemicalSubType["Flammables"] = "flammables";
    ChemicalSubType["Toxics"] = "toxics";
})(ChemicalSubType || (exports.ChemicalSubType = ChemicalSubType = {}));
var EnvironmentalSubType;
(function (EnvironmentalSubType) {
    EnvironmentalSubType["Heat"] = "heat";
    EnvironmentalSubType["Wind"] = "wind";
    EnvironmentalSubType["Rain"] = "rain";
    EnvironmentalSubType["Dust"] = "dust";
    EnvironmentalSubType["Noise"] = "noise";
})(EnvironmentalSubType || (exports.EnvironmentalSubType = EnvironmentalSubType = {}));
var HumanSubType;
(function (HumanSubType) {
    HumanSubType["Fatigue"] = "fatigue";
    HumanSubType["Overtime"] = "overtime";
    HumanSubType["Untrained"] = "untrained";
    HumanSubType["ProcedureViolation"] = "procedureViolation";
})(HumanSubType || (exports.HumanSubType = HumanSubType = {}));
var HazardSource;
(function (HazardSource) {
    HazardSource["Cameras"] = "Cameras";
    HazardSource["Drones"] = "Drones";
    HazardSource["Sensors"] = "Sensors";
    HazardSource["SmartHelmets"] = "SmartHelmets";
    HazardSource["Trackers"] = "Trackers";
    HazardSource["HSEReports"] = "HSEReports";
    HazardSource["Inspections"] = "Inspections";
    HazardSource["Weather"] = "Weather";
    HazardSource["AccessControl"] = "AccessControl";
    HazardSource["ContractorReports"] = "ContractorReports";
})(HazardSource || (exports.HazardSource = HazardSource = {}));
var DetectionType;
(function (DetectionType) {
    DetectionType["NoHelmet"] = "noHelmet";
    DetectionType["NoVest"] = "noVest";
    DetectionType["NoHarness"] = "noHarness";
    DetectionType["RestrictedArea"] = "restrictedArea";
    DetectionType["ProximityToEquipment"] = "proximityToEquipment";
    DetectionType["ToolDrop"] = "toolDrop";
    DetectionType["WorkerCrowding"] = "workerCrowding";
    DetectionType["ExitBlocked"] = "exitBlocked";
})(DetectionType || (exports.DetectionType = DetectionType = {}));
var SeverityLevel;
(function (SeverityLevel) {
    SeverityLevel[SeverityLevel["Low"] = 1] = "Low";
    SeverityLevel[SeverityLevel["Medium"] = 2] = "Medium";
    SeverityLevel[SeverityLevel["High"] = 3] = "High";
    SeverityLevel[SeverityLevel["Critical"] = 4] = "Critical";
    SeverityLevel[SeverityLevel["Catastrophic"] = 5] = "Catastrophic";
})(SeverityLevel || (exports.SeverityLevel = SeverityLevel = {}));
var ProbabilityLevel;
(function (ProbabilityLevel) {
    ProbabilityLevel[ProbabilityLevel["Rare"] = 1] = "Rare";
    ProbabilityLevel[ProbabilityLevel["Unlikely"] = 2] = "Unlikely";
    ProbabilityLevel[ProbabilityLevel["Possible"] = 3] = "Possible";
    ProbabilityLevel[ProbabilityLevel["Likely"] = 4] = "Likely";
    ProbabilityLevel[ProbabilityLevel["AlmostCertain"] = 5] = "AlmostCertain";
})(ProbabilityLevel || (exports.ProbabilityLevel = ProbabilityLevel = {}));
var MitigationStatus;
(function (MitigationStatus) {
    MitigationStatus["Pending"] = "Pending";
    MitigationStatus["InProgress"] = "InProgress";
    MitigationStatus["Completed"] = "Completed";
    MitigationStatus["Overdue"] = "Overdue";
    MitigationStatus["Cancelled"] = "Cancelled";
})(MitigationStatus || (exports.MitigationStatus = MitigationStatus = {}));
var PermitType;
(function (PermitType) {
    PermitType["HotWork"] = "HotWork";
    PermitType["ConfinedSpace"] = "ConfinedSpace";
    PermitType["Heights"] = "Heights";
    PermitType["Lifting"] = "Lifting";
    PermitType["LOTO"] = "LOTO";
})(PermitType || (exports.PermitType = PermitType = {}));
var CauseCategory;
(function (CauseCategory) {
    CauseCategory["Direct"] = "Direct";
    CauseCategory["Indirect"] = "Indirect";
    CauseCategory["Root"] = "Root";
    CauseCategory["Contributing"] = "Contributing";
})(CauseCategory || (exports.CauseCategory = CauseCategory = {}));
var OutcomeType;
(function (OutcomeType) {
    OutcomeType["Fatality"] = "Fatality";
    OutcomeType["SeriousInjury"] = "SeriousInjury";
    OutcomeType["MinorInjury"] = "MinorInjury";
    OutcomeType["FirstAid"] = "FirstAid";
    OutcomeType["PropertyDamage"] = "PropertyDamage";
    OutcomeType["EnvironmentalRelease"] = "EnvironmentalRelease";
    OutcomeType["NearMiss"] = "NearMiss";
})(OutcomeType || (exports.OutcomeType = OutcomeType = {}));
var IncidentStatus;
(function (IncidentStatus) {
    IncidentStatus["Open"] = "Open";
    IncidentStatus["UnderInvestigation"] = "UnderInvestigation";
    IncidentStatus["Closed"] = "Closed";
    IncidentStatus["Reviewed"] = "Reviewed";
})(IncidentStatus || (exports.IncidentStatus = IncidentStatus = {}));
var InvestigationType;
(function (InvestigationType) {
    InvestigationType["RCA"] = "RCA";
    InvestigationType["FiveWhys"] = "FiveWhys";
    InvestigationType["Fishbone"] = "Fishbone";
    InvestigationType["BarrierAnalysis"] = "BarrierAnalysis";
    InvestigationType["Timeline"] = "Timeline";
})(InvestigationType || (exports.InvestigationType = InvestigationType = {}));
var InvestigationStatus;
(function (InvestigationStatus) {
    InvestigationStatus["Initiated"] = "Initiated";
    InvestigationStatus["InProgress"] = "InProgress";
    InvestigationStatus["Completed"] = "Completed";
    InvestigationStatus["Reviewed"] = "Reviewed";
})(InvestigationStatus || (exports.InvestigationStatus = InvestigationStatus = {}));
var EmergencyType;
(function (EmergencyType) {
    EmergencyType["Evacuation"] = "Evacuation";
    EmergencyType["Fire"] = "Fire";
    EmergencyType["Collapse"] = "Collapse";
    EmergencyType["Spill"] = "Spill";
    EmergencyType["Injury"] = "Injury";
    EmergencyType["NaturalDisaster"] = "NaturalDisaster";
})(EmergencyType || (exports.EmergencyType = EmergencyType = {}));
var SafetyEquipmentType;
(function (SafetyEquipmentType) {
    SafetyEquipmentType["FireExtinguisher"] = "FireExtinguisher";
    SafetyEquipmentType["FirstAidKit"] = "FirstAidKit";
    SafetyEquipmentType["EyewashStation"] = "EyewashStation";
    SafetyEquipmentType["SafetyShower"] = "SafetyShower";
    SafetyEquipmentType["AED"] = "AED";
    SafetyEquipmentType["SpillKit"] = "SpillKit";
    SafetyEquipmentType["Harness"] = "Harness";
    SafetyEquipmentType["Ladder"] = "Ladder";
    SafetyEquipmentType["Scaffolding"] = "Scaffolding";
})(SafetyEquipmentType || (exports.SafetyEquipmentType = SafetyEquipmentType = {}));
var TrainingType;
(function (TrainingType) {
    TrainingType["Induction"] = "Induction";
    TrainingType["FireSafety"] = "FireSafety";
    TrainingType["FirstAid"] = "FirstAid";
    TrainingType["WorkingAtHeights"] = "WorkingAtHeights";
    TrainingType["ConfinedSpace"] = "ConfinedSpace";
    TrainingType["HotWork"] = "HotWork";
    TrainingType["LOTO"] = "LOTO";
    TrainingType["ElectricalSafety"] = "ElectricalSafety";
    TrainingType["ChemicalHandling"] = "ChemicalHandling";
    TrainingType["EmergencyResponse"] = "EmergencyResponse";
    TrainingType["DefensiveDriving"] = "DefensiveDriving";
})(TrainingType || (exports.TrainingType = TrainingType = {}));
var ObservationType;
(function (ObservationType) {
    ObservationType["SafeAct"] = "SafeAct";
    ObservationType["UnsafeAct"] = "UnsafeAct";
    ObservationType["SafeCondition"] = "SafeCondition";
    ObservationType["UnsafeCondition"] = "UnsafeCondition";
    ObservationType["NearMiss"] = "NearMiss";
})(ObservationType || (exports.ObservationType = ObservationType = {}));
var ObservationStatus;
(function (ObservationStatus) {
    ObservationStatus["Reported"] = "Reported";
    ObservationStatus["Reviewed"] = "Reviewed";
    ObservationStatus["Actioned"] = "Actioned";
    ObservationStatus["Closed"] = "Closed";
})(ObservationStatus || (exports.ObservationStatus = ObservationStatus = {}));
//# sourceMappingURL=types.js.map