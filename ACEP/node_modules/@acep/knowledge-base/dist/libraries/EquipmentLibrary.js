"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentLibrary = void 0;
class EquipmentLibrary {
    equipment = new Map();
    register(equip) {
        this.equipment.set(equip.id, equip);
    }
    get(id) {
        return this.equipment.get(id);
    }
    findByCategory(category) {
        return Array.from(this.equipment.values()).filter(e => e.category === category);
    }
    getDailyCost(equipmentId) {
        const equip = this.equipment.get(equipmentId);
        return equip?.dailyCost || 0;
    }
    getAll() {
        return Array.from(this.equipment.values());
    }
    initializeDefaults() {
        const defaults = [
            { id: 'eq-001', name: 'Excavator', nameAr: 'حفار', category: 'Excavation', capacity: '1.2 m³', workingRange: '10m depth', power: '150 HP', fuelType: 'Diesel', hourlyCost: 180, dailyCost: 1400, monthlyCost: 25000, purchaseCost: 450000, rentalCost: 180, operatorRequired: true, operatorCount: 1, maintenanceInterval: 250, transportationMethod: 'Trailer', availability: 0.85, safetyRequirements: ['SafetyHelmet', 'SafetyVest'], manufacturer: 'Caterpillar', model: '320', emissionLevel: 'Stage III', version: '1.0.0' },
            { id: 'eq-002', name: 'Tower Crane', nameAr: 'رافعة برجية', category: 'Lifting', capacity: '8 ton', workingRange: '60m radius', power: '75 HP', fuelType: 'Electric', hourlyCost: 350, dailyCost: 2800, monthlyCost: 50000, purchaseCost: 1200000, rentalCost: 350, operatorRequired: true, operatorCount: 1, maintenanceInterval: 200, transportationMethod: 'Disassembly', availability: 0.9, safetyRequirements: ['CertifiedOperator', 'Signalman', 'SafetyHarness'], manufacturer: 'Liebherr', model: '180HC', emissionLevel: 'Zero', version: '1.0.0' },
            { id: 'eq-003', name: 'Concrete Pump', nameAr: 'مضخة خرسانة', category: 'Concrete', capacity: '40 m³/hr', workingRange: '30m reach', power: '250 HP', fuelType: 'Diesel', hourlyCost: 250, dailyCost: 2000, monthlyCost: 36000, purchaseCost: 600000, rentalCost: 250, operatorRequired: true, operatorCount: 1, maintenanceInterval: 150, transportationMethod: 'Trailer', availability: 0.85, safetyRequirements: ['SafetyHelmet', 'SafetyBoots'], manufacturer: 'Putzmeister', model: 'BSA 14000', emissionLevel: 'Stage III', version: '1.0.0' },
            { id: 'eq-004', name: 'Concrete Mixer', nameAr: 'خلاطة خرسانة', category: 'Concrete', capacity: '1 m³', workingRange: 'N/A', power: '30 HP', fuelType: 'Diesel', hourlyCost: 80, dailyCost: 640, monthlyCost: 12000, purchaseCost: 80000, rentalCost: 80, operatorRequired: true, operatorCount: 1, maintenanceInterval: 100, transportationMethod: 'Tow', availability: 0.9, safetyRequirements: ['SafetyHelmet'], manufacturer: 'Sany', model: 'SM100', emissionLevel: 'Stage II', version: '1.0.0' },
            { id: 'eq-005', name: 'Forklift', nameAr: 'رافعة شوكية', category: 'Lifting', capacity: '3 ton', workingRange: '5m height', power: '80 HP', fuelType: 'Diesel', hourlyCost: 100, dailyCost: 800, monthlyCost: 15000, purchaseCost: 150000, rentalCost: 100, operatorRequired: true, operatorCount: 1, maintenanceInterval: 200, transportationMethod: 'Drive', availability: 0.9, safetyRequirements: ['ForkliftLicense', 'SafetyHelmet'], manufacturer: 'Toyota', model: '8FG30', emissionLevel: 'Stage III', version: '1.0.0' },
            { id: 'eq-006', name: 'Compactor', nameAr: 'رصاصة', category: 'Compaction', capacity: '10 ton', workingRange: 'N/A', power: '120 HP', fuelType: 'Diesel', hourlyCost: 150, dailyCost: 1200, monthlyCost: 22000, purchaseCost: 350000, rentalCost: 150, operatorRequired: true, operatorCount: 1, maintenanceInterval: 200, transportationMethod: 'Trailer', availability: 0.85, safetyRequirements: ['SafetyHelmet', 'SafetyVest'], manufacturer: 'Bomag', model: 'BW211', emissionLevel: 'Stage III', version: '1.0.0' },
            { id: 'eq-007', name: 'Mobile Scaffold', nameAr: 'سقالة متحركة', category: 'Scaffolding', capacity: '500 kg', workingRange: '12m height', power: 'Manual', fuelType: 'None', hourlyCost: 15, dailyCost: 120, monthlyCost: 2500, purchaseCost: 15000, rentalCost: 15, operatorRequired: false, operatorCount: 0, maintenanceInterval: 365, transportationMethod: 'Hand', availability: 0.95, safetyRequirements: ['SafetyHarness', 'SafetyHelmet'], manufacturer: 'Layher', model: 'Allround', emissionLevel: 'Zero', version: '1.0.0' },
            { id: 'eq-008', name: 'Generator', nameAr: 'مولد كهرباء', category: 'Electrical', capacity: '100 kVA', workingRange: 'N/A', power: '100 kVA', fuelType: 'Diesel', hourlyCost: 120, dailyCost: 960, monthlyCost: 18000, purchaseCost: 120000, rentalCost: 120, operatorRequired: true, operatorCount: 1, maintenanceInterval: 150, transportationMethod: 'Trailer', availability: 0.85, safetyRequirements: ['SafetyHelmet', 'EarProtection'], manufacturer: 'Cummins', model: 'C100D5', emissionLevel: 'Stage III', version: '1.0.0' }
        ];
        for (const equip of defaults) {
            this.register(equip);
        }
    }
}
exports.EquipmentLibrary = EquipmentLibrary;
//# sourceMappingURL=EquipmentLibrary.js.map