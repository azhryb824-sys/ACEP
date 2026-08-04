"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectTypesLibrary = void 0;
class ProjectTypesLibrary {
    types = new Map();
    register(type) {
        this.types.set(type.type, type);
    }
    get(type) {
        return this.types.get(type);
    }
    getAll() {
        return Array.from(this.types.values());
    }
    initializeDefaults() {
        const defaults = [
            { type: 'Apartment', name: 'Apartment', nameAr: 'شقة', description: 'Residential apartment unit', typicalSpaces: ['Bedroom', 'Bathroom', 'Kitchen', 'LivingRoom', 'Balcony'], typicalSystems: ['Electrical', 'Plumbing', 'HVAC', 'FireAlarm'], typicalFloors: 1, minArea: 60, maxArea: 300, typicalFinishingLevel: 'Good', codeRequirements: ['BuildingCode', 'FireSafety'], version: '1.0.0' },
            { type: 'Villa', name: 'Villa', nameAr: 'فيلا', description: 'Single family villa', typicalSpaces: ['Bedroom', 'Bathroom', 'Kitchen', 'LivingRoom', 'Majlis', 'DiningRoom', 'MaidRoom', 'DriverRoom', 'Garden', 'Parking'], typicalSystems: ['Electrical', 'Plumbing', 'HVAC', 'FireAlarm', 'CCTV', 'Gas', 'Solar'], typicalFloors: 2, minArea: 200, maxArea: 2000, typicalFinishingLevel: 'Premium', codeRequirements: ['BuildingCode', 'FireSafety', 'EnergyCode'], version: '1.0.0' },
            { type: 'Hospital', name: 'Hospital', nameAr: 'مستشفى', description: 'Hospital and medical facility', typicalSpaces: ['OperationRoom', 'ICU', 'PatientRoom', 'Laboratory', 'Pharmacy', 'Waiting', 'Office', 'Storage', 'MechanicalRoom', 'ElectricalRoom', 'GeneratorRoom'], typicalSystems: ['Electrical', 'Plumbing', 'HVAC', 'FireFighting', 'FireAlarm', 'CCTV', 'AccessControl', 'MedicalGas', 'BMS', 'Elevator'], typicalFloors: 5, minArea: 5000, maxArea: 100000, typicalFinishingLevel: 'Premium', codeRequirements: ['BuildingCode', 'FireSafety', 'HealthcareCode', 'DisabilityCode'], version: '1.0.0' },
            { type: 'School', name: 'School', nameAr: 'مدرسة', description: 'Educational facility', typicalSpaces: ['Classroom', 'Office', 'Laboratory', 'Library', 'Gym', 'Cafeteria', 'Auditorium', 'Playground', 'Parking'], typicalSystems: ['Electrical', 'Plumbing', 'HVAC', 'FireFighting', 'FireAlarm', 'CCTV', 'PublicAddress'], typicalFloors: 3, minArea: 2000, maxArea: 30000, typicalFinishingLevel: 'Standard', codeRequirements: ['BuildingCode', 'FireSafety', 'EducationCode'], version: '1.0.0' },
            { type: 'Hotel', name: 'Hotel', nameAr: 'فندق', description: 'Hotel and hospitality facility', typicalSpaces: ['Bedroom', 'Bathroom', 'Lobby', 'Restaurant', 'Kitchen', 'Gym', 'Pool', 'Spa', 'MeetingRoom', 'Office', 'Storage', 'Laundry'], typicalSystems: ['Electrical', 'Plumbing', 'HVAC', 'FireFighting', 'FireAlarm', 'CCTV', 'AccessControl', 'BMS', 'Elevator', 'PublicAddress'], typicalFloors: 10, minArea: 3000, maxArea: 80000, typicalFinishingLevel: 'Luxury', codeRequirements: ['BuildingCode', 'FireSafety', 'HotelCode'], version: '1.0.0' },
            { type: 'Warehouse', name: 'Warehouse', nameAr: 'مستودع', description: 'Storage and logistics facility', typicalSpaces: ['Warehouse', 'Office', 'Storage', 'LoadingDock', 'Parking', 'MechanicalRoom'], typicalSystems: ['Electrical', 'Plumbing', 'FireFighting', 'FireAlarm', 'CCTV', 'AccessControl', 'HVAC'], typicalFloors: 1, minArea: 500, maxArea: 50000, typicalFinishingLevel: 'Standard', codeRequirements: ['BuildingCode', 'FireSafety', 'IndustrialCode'], version: '1.0.0' },
            { type: 'Mosque', name: 'Mosque', nameAr: 'مسجد', description: 'Religious facility', typicalSpaces: ['PrayerHall', 'Ablution', 'Office', 'Storage', 'Minaret', 'Courtyard'], typicalSystems: ['Electrical', 'Plumbing', 'HVAC', 'FireAlarm', 'PublicAddress', 'CCTV'], typicalFloors: 2, minArea: 200, maxArea: 10000, typicalFinishingLevel: 'Premium', codeRequirements: ['BuildingCode', 'FireSafety'], version: '1.0.0' },
            { type: 'Mall', name: 'Mall', nameAr: 'مول تجاري', description: 'Shopping mall and retail center', typicalSpaces: ['Shop', 'FoodCourt', 'Restroom', 'Office', 'Storage', 'Parking', 'MechanicalRoom', 'ElectricalRoom', 'ControlRoom'], typicalSystems: ['Electrical', 'Plumbing', 'HVAC', 'FireFighting', 'FireAlarm', 'CCTV', 'AccessControl', 'BMS', 'Elevator', 'Escalator', 'PublicAddress'], typicalFloors: 4, minArea: 10000, maxArea: 200000, typicalFinishingLevel: 'Premium', codeRequirements: ['BuildingCode', 'FireSafety', 'AccessibilityCode'], version: '1.0.0' }
        ];
        for (const type of defaults) {
            this.register(type);
        }
    }
}
exports.ProjectTypesLibrary = ProjectTypesLibrary;
//# sourceMappingURL=ProjectTypesLibrary.js.map