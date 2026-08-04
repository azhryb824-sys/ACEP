"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialProperty = exports.WasteCategory = exports.EmissionSource = exports.SustainabilityDomain = void 0;
var SustainabilityDomain;
(function (SustainabilityDomain) {
    SustainabilityDomain["GreenBuilding"] = "green_building";
    SustainabilityDomain["SustainableInfrastructure"] = "sustainable_infrastructure";
    SustainabilityDomain["SmartCity"] = "smart_city";
    SustainabilityDomain["RenewableEnergy"] = "renewable_energy";
    SustainabilityDomain["CircularEconomy"] = "circular_economy";
    SustainabilityDomain["Recycling"] = "recycling";
    SustainabilityDomain["WasteReduction"] = "waste_reduction";
    SustainabilityDomain["WaterManagement"] = "water_management";
    SustainabilityDomain["EmissionReduction"] = "emission_reduction";
    SustainabilityDomain["Biodiversity"] = "biodiversity";
})(SustainabilityDomain || (exports.SustainabilityDomain = SustainabilityDomain = {}));
var EmissionSource;
(function (EmissionSource) {
    EmissionSource["Cement"] = "cement";
    EmissionSource["Concrete"] = "concrete";
    EmissionSource["Steel"] = "steel";
    EmissionSource["Aluminum"] = "aluminum";
    EmissionSource["Glass"] = "glass";
    EmissionSource["Brick"] = "brick";
    EmissionSource["Paint"] = "paint";
    EmissionSource["Transportation"] = "transportation";
    EmissionSource["Equipment"] = "equipment";
    EmissionSource["Electricity"] = "electricity";
    EmissionSource["Fuel"] = "fuel";
    EmissionSource["Operations"] = "operations";
    EmissionSource["Maintenance"] = "maintenance";
})(EmissionSource || (exports.EmissionSource = EmissionSource = {}));
var WasteCategory;
(function (WasteCategory) {
    WasteCategory["Concrete"] = "concrete";
    WasteCategory["Steel"] = "steel";
    WasteCategory["Wood"] = "wood";
    WasteCategory["Plastic"] = "plastic";
    WasteCategory["Glass"] = "glass";
    WasteCategory["Paper"] = "paper";
    WasteCategory["Hazardous"] = "hazardous";
    WasteCategory["Electronic"] = "electronic";
})(WasteCategory || (exports.WasteCategory = WasteCategory = {}));
var MaterialProperty;
(function (MaterialProperty) {
    MaterialProperty["Density"] = "density";
    MaterialProperty["ThermalConductivity"] = "thermal_conductivity";
    MaterialProperty["CompressiveStrength"] = "compressive_strength";
    MaterialProperty["TensileStrength"] = "tensile_strength";
    MaterialProperty["Durability"] = "durability";
    MaterialProperty["FireResistance"] = "fire_resistance";
    MaterialProperty["MoistureResistance"] = "moisture_resistance";
})(MaterialProperty || (exports.MaterialProperty = MaterialProperty = {}));
//# sourceMappingURL=types.js.map