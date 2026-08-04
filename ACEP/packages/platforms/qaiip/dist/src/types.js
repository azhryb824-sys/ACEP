"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportType = exports.LabTestType = exports.CertificateType = exports.DefectType = exports.QualityElement = exports.CAPAStatus = exports.NCRStatus = exports.NCRSeverity = exports.InspectionStatus = exports.InspectionCategoryMap = exports.InspectionCategory = exports.InspectionType = void 0;
var InspectionType;
(function (InspectionType) {
    InspectionType["CivilExcavation"] = "CivilExcavation";
    InspectionType["CivilFoundation"] = "CivilFoundation";
    InspectionType["CivilColumn"] = "CivilColumn";
    InspectionType["CivilBeam"] = "CivilBeam";
    InspectionType["CivilSlab"] = "CivilSlab";
    InspectionType["CivilWall"] = "CivilWall";
    InspectionType["CivilFinishing"] = "CivilFinishing";
    InspectionType["ElectricalCable"] = "ElectricalCable";
    InspectionType["ElectricalPanel"] = "ElectricalPanel";
    InspectionType["ElectricalGrounding"] = "ElectricalGrounding";
    InspectionType["ElectricalInsulation"] = "ElectricalInsulation";
    InspectionType["ElectricalLoad"] = "ElectricalLoad";
    InspectionType["MechanicalPump"] = "MechanicalPump";
    InspectionType["MechanicalPipe"] = "MechanicalPipe";
    InspectionType["MechanicalHVAC"] = "MechanicalHVAC";
    InspectionType["MechanicalFireFighting"] = "MechanicalFireFighting";
    InspectionType["MechanicalElevator"] = "MechanicalElevator";
    InspectionType["OperationalPerformance"] = "OperationalPerformance";
    InspectionType["OperationalReliability"] = "OperationalReliability";
    InspectionType["OperationalConsumption"] = "OperationalConsumption";
    InspectionType["OperationalVibration"] = "OperationalVibration";
    InspectionType["OperationalNoise"] = "OperationalNoise";
})(InspectionType || (exports.InspectionType = InspectionType = {}));
var InspectionCategory;
(function (InspectionCategory) {
    InspectionCategory["Civil"] = "Civil";
    InspectionCategory["Electrical"] = "Electrical";
    InspectionCategory["Mechanical"] = "Mechanical";
    InspectionCategory["Operational"] = "Operational";
})(InspectionCategory || (exports.InspectionCategory = InspectionCategory = {}));
exports.InspectionCategoryMap = {
    [InspectionType.CivilExcavation]: InspectionCategory.Civil,
    [InspectionType.CivilFoundation]: InspectionCategory.Civil,
    [InspectionType.CivilColumn]: InspectionCategory.Civil,
    [InspectionType.CivilBeam]: InspectionCategory.Civil,
    [InspectionType.CivilSlab]: InspectionCategory.Civil,
    [InspectionType.CivilWall]: InspectionCategory.Civil,
    [InspectionType.CivilFinishing]: InspectionCategory.Civil,
    [InspectionType.ElectricalCable]: InspectionCategory.Electrical,
    [InspectionType.ElectricalPanel]: InspectionCategory.Electrical,
    [InspectionType.ElectricalGrounding]: InspectionCategory.Electrical,
    [InspectionType.ElectricalInsulation]: InspectionCategory.Electrical,
    [InspectionType.ElectricalLoad]: InspectionCategory.Electrical,
    [InspectionType.MechanicalPump]: InspectionCategory.Mechanical,
    [InspectionType.MechanicalPipe]: InspectionCategory.Mechanical,
    [InspectionType.MechanicalHVAC]: InspectionCategory.Mechanical,
    [InspectionType.MechanicalFireFighting]: InspectionCategory.Mechanical,
    [InspectionType.MechanicalElevator]: InspectionCategory.Mechanical,
    [InspectionType.OperationalPerformance]: InspectionCategory.Operational,
    [InspectionType.OperationalReliability]: InspectionCategory.Operational,
    [InspectionType.OperationalConsumption]: InspectionCategory.Operational,
    [InspectionType.OperationalVibration]: InspectionCategory.Operational,
    [InspectionType.OperationalNoise]: InspectionCategory.Operational
};
var InspectionStatus;
(function (InspectionStatus) {
    InspectionStatus["Planned"] = "Planned";
    InspectionStatus["Scheduled"] = "Scheduled";
    InspectionStatus["InProgress"] = "InProgress";
    InspectionStatus["Completed"] = "Completed";
    InspectionStatus["Approved"] = "Approved";
    InspectionStatus["Rejected"] = "Rejected";
    InspectionStatus["Cancelled"] = "Cancelled";
    InspectionStatus["OnHold"] = "OnHold";
})(InspectionStatus || (exports.InspectionStatus = InspectionStatus = {}));
var NCRSeverity;
(function (NCRSeverity) {
    NCRSeverity["Critical"] = "Critical";
    NCRSeverity["Major"] = "Major";
    NCRSeverity["Minor"] = "Minor";
    NCRSeverity["Observation"] = "Observation";
})(NCRSeverity || (exports.NCRSeverity = NCRSeverity = {}));
var NCRStatus;
(function (NCRStatus) {
    NCRStatus["Open"] = "Open";
    NCRStatus["UnderReview"] = "UnderReview";
    NCRStatus["CorrectiveAction"] = "CorrectiveAction";
    NCRStatus["Verified"] = "Verified";
    NCRStatus["Closed"] = "Closed";
    NCRStatus["Rejected"] = "Rejected";
})(NCRStatus || (exports.NCRStatus = NCRStatus = {}));
var CAPAStatus;
(function (CAPAStatus) {
    CAPAStatus["Identified"] = "Identified";
    CAPAStatus["Investigation"] = "Investigation";
    CAPAStatus["ActionPlanned"] = "ActionPlanned";
    CAPAStatus["InProgress"] = "InProgress";
    CAPAStatus["Verified"] = "Verified";
    CAPAStatus["Closed"] = "Closed";
})(CAPAStatus || (exports.CAPAStatus = CAPAStatus = {}));
var QualityElement;
(function (QualityElement) {
    QualityElement["Excavation"] = "Excavation";
    QualityElement["Foundation"] = "Foundation";
    QualityElement["Column"] = "Column";
    QualityElement["Beam"] = "Beam";
    QualityElement["Slab"] = "Slab";
    QualityElement["Wall"] = "Wall";
    QualityElement["Finishing"] = "Finishing";
    QualityElement["Roofing"] = "Roofing";
    QualityElement["Waterproofing"] = "Waterproofing";
    QualityElement["ElectricalWiring"] = "ElectricalWiring";
    QualityElement["PanelBoard"] = "PanelBoard";
    QualityElement["Lighting"] = "Lighting";
    QualityElement["CCTV"] = "CCTV";
    QualityElement["FireAlarm"] = "FireAlarm";
    QualityElement["Plumbing"] = "Plumbing";
    QualityElement["Drainage"] = "Drainage";
    QualityElement["HVAC"] = "HVAC";
    QualityElement["FireFighting"] = "FireFighting";
    QualityElement["Elevator"] = "Elevator";
    QualityElement["StructuralSteel"] = "StructuralSteel";
    QualityElement["Concrete"] = "Concrete";
    QualityElement["Masonry"] = "Masonry";
    QualityElement["Flooring"] = "Flooring";
    QualityElement["Painting"] = "Painting";
    QualityElement["Ceiling"] = "Ceiling";
})(QualityElement || (exports.QualityElement = QualityElement = {}));
var DefectType;
(function (DefectType) {
    DefectType["Crack"] = "Crack";
    DefectType["Honeycombing"] = "Honeycombing";
    DefectType["Spalling"] = "Spalling";
    DefectType["Rust"] = "Rust";
    DefectType["Leakage"] = "Leakage";
    DefectType["PoorFinish"] = "PoorFinish";
    DefectType["Deviation"] = "Deviation";
    DefectType["Misalignment"] = "Misalignment";
    DefectType["Porosity"] = "Porosity";
    DefectType["Voids"] = "Voids";
    DefectType["Delamination"] = "Delamination";
    DefectType["Efflorescence"] = "Efflorescence";
    DefectType["Corrosion"] = "Corrosion";
    DefectType["Sagging"] = "Sagging";
    DefectType["Peeling"] = "Peeling";
    DefectType["Blistering"] = "Blistering";
    DefectType["Crazing"] = "Crazing";
    DefectType["Scaling"] = "Scaling";
})(DefectType || (exports.DefectType = DefectType = {}));
var CertificateType;
(function (CertificateType) {
    CertificateType["MaterialTest"] = "MaterialTest";
    CertificateType["ConcreteTest"] = "ConcreteTest";
    CertificateType["SteelTest"] = "SteelTest";
    CertificateType["SoilTest"] = "SoilTest";
    CertificateType["WeldTest"] = "WeldTest";
    CertificateType["HydrostaticTest"] = "HydrostaticTest";
    CertificateType["ElectricalTest"] = "ElectricalTest";
    CertificateType["CalibrationCert"] = "CalibrationCert";
    CertificateType["ComplianceCert"] = "ComplianceCert";
    CertificateType["WarrantyCert"] = "WarrantyCert";
})(CertificateType || (exports.CertificateType = CertificateType = {}));
var LabTestType;
(function (LabTestType) {
    LabTestType["ConcreteCompressiveStrength"] = "ConcreteCompressiveStrength";
    LabTestType["ConcreteSlump"] = "ConcreteSlump";
    LabTestType["SteelTensile"] = "SteelTensile";
    LabTestType["SoilDensity"] = "SoilDensity";
    LabTestType["SoilProctor"] = "SoilProctor";
    LabTestType["AggregateSieve"] = "AggregateSieve";
    LabTestType["WaterQuality"] = "WaterQuality";
    LabTestType["AsphaltMarshall"] = "AsphaltMarshall";
    LabTestType["WeldRadiography"] = "WeldRadiography";
    LabTestType["UltrasonicTesting"] = "UltrasonicTesting";
})(LabTestType || (exports.LabTestType = LabTestType = {}));
var ReportType;
(function (ReportType) {
    ReportType["Daily"] = "Daily";
    ReportType["Inspector"] = "Inspector";
    ReportType["NCR"] = "NCR";
    ReportType["Lab"] = "Lab";
    ReportType["Handover"] = "Handover";
    ReportType["Monthly"] = "Monthly";
    ReportType["Weekly"] = "Weekly";
    ReportType["PunchList"] = "PunchList";
    ReportType["Snagging"] = "Snagging";
})(ReportType || (exports.ReportType = ReportType = {}));
//# sourceMappingURL=types.js.map