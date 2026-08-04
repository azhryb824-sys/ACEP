"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineeringEquationsLibrary = void 0;
class EngineeringEquationsLibrary {
    equations = new Map();
    register(eq) {
        this.equations.set(eq.id, eq);
    }
    get(id) {
        return this.equations.get(id);
    }
    findByCategory(category) {
        return Array.from(this.equations.values()).filter(e => e.category === category);
    }
    getAll() {
        return Array.from(this.equations.values());
    }
    initializeDefaults() {
        const defaults = [
            { id: 'eq-math-001', name: 'Rectangle Area', category: 'Geometry', formula: 'length * width', description: 'Calculate area of a rectangle', variables: ['length', 'width'], unit: 'm²', reference: 'Mathematics', version: '1.0.0' },
            { id: 'eq-math-002', name: 'Circle Area', category: 'Geometry', formula: 'pi * radius^2', description: 'Calculate area of a circle', variables: ['radius'], unit: 'm²', reference: 'Mathematics', version: '1.0.0' },
            { id: 'eq-math-003', name: 'Rectangle Volume', category: 'Geometry', formula: 'length * width * height', description: 'Calculate volume of a rectangular prism', variables: ['length', 'width', 'height'], unit: 'm³', reference: 'Mathematics', version: '1.0.0' },
            { id: 'eq-str-001', name: 'Concrete Volume for Slab', category: 'Structural', formula: 'slabArea * slabThickness', description: 'Calculate concrete volume for a slab', variables: ['slabArea', 'slabThickness'], unit: 'm³', reference: 'ACI 318', version: '1.0.0' },
            { id: 'eq-str-002', name: 'Rebar Weight', category: 'Structural', formula: 'concreteVolume * reinforcementRatio * steelDensity', description: 'Calculate reinforcement steel weight', variables: ['concreteVolume', 'reinforcementRatio', 'steelDensity'], unit: 'kg', reference: 'ACI 318', version: '1.0.0' },
            { id: 'eq-str-003', name: 'Column Concrete Volume', category: 'Structural', formula: 'colWidth * colDepth * colHeight * columnCount', description: 'Calculate concrete volume for columns', variables: ['colWidth', 'colDepth', 'colHeight', 'columnCount'], unit: 'm³', reference: 'ACI 318', version: '1.0.0' },
            { id: 'eq-arc-001', name: 'Paint Quantity', category: 'Architectural', formula: 'surfaceArea * layers * consumptionRate', description: 'Calculate paint quantity needed', variables: ['surfaceArea', 'layers', 'consumptionRate'], unit: 'liter', reference: 'Paint Manufacturer', version: '1.0.0' },
            { id: 'eq-arc-002', name: 'Tile Quantity', category: 'Architectural', formula: 'floorArea * (1 + wasteFactor)', description: 'Calculate tile quantity with waste', variables: ['floorArea', 'wasteFactor'], unit: 'm²', reference: 'Standard Practice', version: '1.0.0' },
            { id: 'eq-arc-003', name: 'Block Wall Quantity', category: 'Architectural', formula: 'wallArea / blockCoverage', description: 'Calculate number of blocks needed', variables: ['wallArea', 'blockCoverage'], unit: 'pieces', reference: 'Manufacturer Data', version: '1.0.0' },
            { id: 'eq-mep-001', name: 'Cooling Load', category: 'MEP', formula: 'roomArea * coolingLoadPerMeter', description: 'Estimate cooling load for a room', variables: ['roomArea', 'coolingLoadPerMeter'], unit: 'BTU/hr', reference: 'ASHRAE', version: '1.0.0' },
            { id: 'eq-mep-002', name: 'Water Supply Pipe Size', category: 'MEP', formula: 'sqrt((4 * flowRate) / (pi * velocity))', description: 'Calculate pipe diameter for water supply', variables: ['flowRate', 'velocity'], unit: 'm', reference: 'Plumbing Code', version: '1.0.0' },
            { id: 'eq-mep-003', name: 'Electrical Load', category: 'MEP', formula: 'lightingLoad + powerLoad + hvacLoad', description: 'Calculate total electrical load', variables: ['lightingLoad', 'powerLoad', 'hvacLoad'], unit: 'kVA', reference: 'Saudi Electrical Code', version: '1.0.0' },
            { id: 'eq-con-001', name: 'Labor Productivity', category: 'Construction', formula: 'quantity / dailyProductivity', description: 'Calculate labor days needed', variables: ['quantity', 'dailyProductivity'], unit: 'days', reference: 'Productivity Manual', version: '1.0.0' },
            { id: 'eq-con-002', name: 'Equipment Utilization', category: 'Construction', formula: 'workingHours / availableHours', description: 'Calculate equipment utilization rate', variables: ['workingHours', 'availableHours'], unit: 'percent', reference: 'Equipment Management', version: '1.0.0' },
            { id: 'eq-fin-001', name: 'Total Cost', category: 'Financial', formula: 'materialCost + laborCost + equipmentCost + indirectCost + riskContingency + profit + taxes', description: 'Calculate total project cost', variables: ['materialCost', 'laborCost', 'equipmentCost', 'indirectCost', 'riskContingency', 'profit', 'taxes'], unit: 'currency', reference: 'Cost Engineering', version: '1.0.0' }
        ];
        for (const eq of defaults) {
            this.register(eq);
        }
    }
}
exports.EngineeringEquationsLibrary = EngineeringEquationsLibrary;
//# sourceMappingURL=EngineeringEquationsLibrary.js.map