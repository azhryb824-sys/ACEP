"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpacesLibrary = void 0;
class SpacesLibrary {
    spaces = new Map();
    register(space) {
        this.spaces.set(space.type, space);
    }
    get(type) {
        return this.spaces.get(type);
    }
    getAll() {
        return Array.from(this.spaces.values());
    }
    initializeDefaults() {
        const defaults = [
            { type: 'Bedroom', name: 'Bedroom', nameAr: 'غرفة نوم', typicalArea: 18, minArea: 12, maxArea: 40, typicalHeight: 3, requiresWindow: true, requiresVentilation: true, requiresWaterproofing: false, finishingLevel: 'Good', typicalComponents: ['Wall', 'Door', 'Window', 'Ceiling', 'FloorFinish', 'Paint', 'Electrical'], systems: ['Electrical', 'HVAC'], version: '1.0.0' },
            { type: 'Bathroom', name: 'Bathroom', nameAr: 'حمام', typicalArea: 5, minArea: 3.5, maxArea: 15, typicalHeight: 3, requiresWindow: false, requiresVentilation: true, requiresWaterproofing: true, finishingLevel: 'Good', typicalComponents: ['Wall', 'Door', 'Ceiling', 'FloorFinish', 'Waterproofing', 'Ceramic', 'Paint', 'Plumbing', 'SanitaryWare'], systems: ['Electrical', 'Plumbing', 'HVAC'], version: '1.0.0' },
            { type: 'Kitchen', name: 'Kitchen', nameAr: 'مطبخ', typicalArea: 12, minArea: 8, maxArea: 30, typicalHeight: 3, requiresWindow: true, requiresVentilation: true, requiresWaterproofing: false, finishingLevel: 'Good', typicalComponents: ['Wall', 'Door', 'Window', 'Ceiling', 'FloorFinish', 'Cabinets', 'Countertop', 'Plumbing', 'Electrical'], systems: ['Electrical', 'Plumbing', 'HVAC', 'Gas'], version: '1.0.0' },
            { type: 'LivingRoom', name: 'Living Room', nameAr: 'صالة', typicalArea: 28, minArea: 20, maxArea: 60, typicalHeight: 3, requiresWindow: true, requiresVentilation: true, requiresWaterproofing: false, finishingLevel: 'Good', typicalComponents: ['Wall', 'Door', 'Window', 'Ceiling', 'FloorFinish', 'Paint', 'Electrical'], systems: ['Electrical', 'HVAC'], version: '1.0.0' },
            { type: 'Majlis', name: 'Majlis', nameAr: 'مجلس', typicalArea: 30, minArea: 20, maxArea: 80, typicalHeight: 3.2, requiresWindow: true, requiresVentilation: true, requiresWaterproofing: false, finishingLevel: 'Premium', typicalComponents: ['Wall', 'Door', 'Window', 'Ceiling', 'FloorFinish', 'Paint', 'Electrical'], systems: ['Electrical', 'HVAC', 'CCTV'], version: '1.0.0' },
            { type: 'MaidRoom', name: 'Maid Room', nameAr: 'غرفة خادمة', typicalArea: 8, minArea: 6, maxArea: 15, typicalHeight: 3, requiresWindow: true, requiresVentilation: true, requiresWaterproofing: false, finishingLevel: 'Standard', typicalComponents: ['Wall', 'Door', 'Window', 'Ceiling', 'FloorFinish', 'Paint'], systems: ['Electrical', 'HVAC'], version: '1.0.0' },
            { type: 'Roof', name: 'Roof', nameAr: 'سطح', typicalArea: 100, minArea: 50, maxArea: 1000, typicalHeight: 0, requiresWindow: false, requiresVentilation: false, requiresWaterproofing: true, finishingLevel: 'Raw', typicalComponents: ['Waterproofing', 'Drainage', 'Insulation', 'Parapet'], systems: ['Drainage'], version: '1.0.0' },
            { type: 'Parking', name: 'Parking', nameAr: 'موقف سيارات', typicalArea: 25, minArea: 12.5, maxArea: 50, typicalHeight: 2.5, requiresWindow: false, requiresVentilation: true, requiresWaterproofing: false, finishingLevel: 'Standard', typicalComponents: ['FloorFinish', 'Paint', 'Drainage'], systems: ['Electrical', 'FireFighting', 'Drainage', 'HVAC'], version: '1.0.0' },
            { type: 'Office', name: 'Office', nameAr: 'مكتب', typicalArea: 15, minArea: 10, maxArea: 50, typicalHeight: 3, requiresWindow: true, requiresVentilation: true, requiresWaterproofing: false, finishingLevel: 'Good', typicalComponents: ['Wall', 'Door', 'Window', 'Ceiling', 'FloorFinish', 'Paint', 'Electrical', 'DataNetwork'], systems: ['Electrical', 'HVAC', 'DataNetwork', 'CCTV'], version: '1.0.0' },
            { type: 'Storage', name: 'Storage', nameAr: 'مخزن', typicalArea: 10, minArea: 5, maxArea: 50, typicalHeight: 3, requiresWindow: false, requiresVentilation: true, requiresWaterproofing: false, finishingLevel: 'Raw', typicalComponents: ['Wall', 'FloorFinish', 'Paint'], systems: ['Electrical'], version: '1.0.0' },
            { type: 'MechanicalRoom', name: 'Mechanical Room', nameAr: 'غرفة ميكانيكا', typicalArea: 30, minArea: 15, maxArea: 100, typicalHeight: 4, requiresWindow: false, requiresVentilation: true, requiresWaterproofing: false, finishingLevel: 'Raw', typicalComponents: ['Wall', 'FloorFinish', 'Paint'], systems: ['Electrical', 'HVAC', 'Plumbing', 'FireFighting'], version: '1.0.0' },
            { type: 'ElectricalRoom', name: 'Electrical Room', nameAr: 'غرفة كهرباء', typicalArea: 20, minArea: 10, maxArea: 60, typicalHeight: 3.5, requiresWindow: false, requiresVentilation: true, requiresWaterproofing: false, finishingLevel: 'Raw', typicalComponents: ['Wall', 'FloorFinish', 'Paint'], systems: ['Electrical', 'FireFighting', 'HVAC'], version: '1.0.0' },
            { type: 'GeneratorRoom', name: 'Generator Room', nameAr: 'غرفة مولد', typicalArea: 25, minArea: 15, maxArea: 80, typicalHeight: 4, requiresWindow: false, requiresVentilation: true, requiresWaterproofing: false, finishingLevel: 'Raw', typicalComponents: ['Wall', 'FloorFinish', 'Paint', 'SoundInsulation'], systems: ['Electrical', 'FireFighting', 'Drainage'], version: '1.0.0' }
        ];
        for (const space of defaults) {
            this.register(space);
        }
    }
}
exports.SpacesLibrary = SpacesLibrary;
//# sourceMappingURL=SpacesLibrary.js.map