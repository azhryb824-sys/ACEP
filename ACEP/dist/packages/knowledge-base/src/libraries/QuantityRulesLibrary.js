"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuantityRulesLibrary = void 0;
class QuantityRulesLibrary {
    rules = new Map();
    register(rule) {
        this.rules.set(rule.id, rule);
    }
    get(id) {
        return this.rules.get(id);
    }
    getFormula(itemCode) {
        const rule = Array.from(this.rules.values()).find(r => r.itemCode === itemCode);
        return rule?.formula;
    }
    getAll() {
        return Array.from(this.rules.values());
    }
    initializeDefaults() {
        const defaults = [
            { id: 'qty-001', itemCode: 'PNT-001', name: 'Paint Area', nameAr: 'مساحة الدهان', formula: 'wallArea * paintLayers * (1 + wasteFactor)', variables: [{ name: 'wallArea', type: 'derived', source: 'wall_length * wall_height - openings' }, { name: 'paintLayers', type: 'constant', defaultValue: 2, source: 'standard' }, { name: 'wasteFactor', type: 'constant', defaultValue: 0.05, source: 'material_property' }], unit: 'm²', constraints: ['wallArea > 0', 'paintLayers >= 1'], version: '1.0.0' },
            { id: 'qty-002', itemCode: 'CER-001', name: 'Ceramic Floor Area', nameAr: 'مساحة سيراميك أرضيات', formula: 'floorArea * (1 + wasteFactor)', variables: [{ name: 'floorArea', type: 'dimension', source: 'space_area' }, { name: 'wasteFactor', type: 'lookup', source: 'material_waste.ceramic' }], unit: 'm²', constraints: ['floorArea > 0'], version: '1.0.0' },
            { id: 'qty-003', itemCode: 'BLK-001', name: 'Block Wall Area', nameAr: 'مساحة جدار بلوك', formula: '(wallLength * wallHeight - openingsArea) / blockArea', variables: [{ name: 'wallLength', type: 'dimension', source: 'wall_length' }, { name: 'wallHeight', type: 'dimension', source: 'wall_height' }, { name: 'openingsArea', type: 'derived', source: 'sum(door_area + window_area)' }, { name: 'blockArea', type: 'constant', defaultValue: 0.12, source: 'block_dimensions' }], unit: 'm²', constraints: ['wallLength > 0', 'wallHeight > 0'], version: '1.0.0' },
            { id: 'qty-004', itemCode: 'CON-001', name: 'Concrete Volume', nameAr: 'حجم الخرسانة', formula: 'length * width * height', variables: [{ name: 'length', type: 'dimension', source: 'element_length' }, { name: 'width', type: 'dimension', source: 'element_width' }, { name: 'height', type: 'dimension', source: 'element_height' }], unit: 'm³', constraints: ['length > 0', 'width > 0', 'height > 0'], version: '1.0.0' },
            { id: 'qty-005', itemCode: 'CON-002', name: 'Steel Weight', nameAr: 'وزن الحديد', formula: 'concreteVolume * reinforcementRatio', variables: [{ name: 'concreteVolume', type: 'derived', source: 'qty-004' }, { name: 'reinforcementRatio', type: 'constant', defaultValue: 0.1, source: 'structural_code' }], unit: 'ton', constraints: ['concreteVolume > 0'], version: '1.0.0' }
        ];
        for (const rule of defaults) {
            this.register(rule);
        }
    }
}
exports.QuantityRulesLibrary = QuantityRulesLibrary;
//# sourceMappingURL=QuantityRulesLibrary.js.map