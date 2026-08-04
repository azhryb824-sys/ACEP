"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialLibrary = void 0;
class MaterialLibrary {
    materials = new Map();
    register(material) {
        this.materials.set(material.id, material);
    }
    get(id) {
        return this.materials.get(id);
    }
    findByName(name) {
        return Array.from(this.materials.values()).filter(m => m.name.toLowerCase().includes(name.toLowerCase()) ||
            m.nameAr.includes(name));
    }
    getWasteFactor(materialId) {
        const material = this.materials.get(materialId);
        return material?.wasteFactor || 0.05;
    }
    getAll() {
        return Array.from(this.materials.values());
    }
    getReferencePrice(materialId, currency) {
        const material = this.materials.get(materialId);
        if (!material)
            return undefined;
        if (currency && material.currency !== currency) {
            return material.referencePrice;
        }
        return material.referencePrice;
    }
    initializeDefaults() {
        const defaults = [
            { id: 'conc-001', name: 'Ready Mix Concrete', nameAr: 'خرسانة جاهزة', unit: 'm³', density: 2400, uses: ['Foundations', 'Columns', 'Beams', 'Slabs'], lifespan: 50, installationMethods: ['Pumping', 'Manual'], compatibleMaterials: ['Steel', 'Water'], incompatibleMaterials: ['Oil', 'Acids'], wasteFactor: 0.02, referencePrice: 280, currency: 'SAR', laborRequired: ['ConcreteWorker', 'Carpenter'], toolsRequired: ['ConcretePump', 'Vibrator'], version: '1.0.0' },
            { id: 'stl-001', name: 'Steel Reinforcement', nameAr: 'حديد تسليح', unit: 'ton', density: 7850, uses: ['ReinforcedConcrete'], lifespan: 50, installationMethods: ['Tying', 'Welding'], compatibleMaterials: ['Concrete'], incompatibleMaterials: ['SaltWater'], wasteFactor: 0.03, referencePrice: 2800, currency: 'SAR', laborRequired: ['SteelFixer'], toolsRequired: ['Cutter', 'Bender'], version: '1.0.0' },
            { id: 'blk-001', name: 'Cement Block', nameAr: 'بلوك إسمنتي', unit: 'm²', density: 1800, uses: ['Walls', 'Partitions'], lifespan: 40, installationMethods: ['MortarLaying'], compatibleMaterials: ['CementMortar', 'Plaster'], incompatibleMaterials: [], wasteFactor: 0.05, referencePrice: 28, currency: 'SAR', laborRequired: ['Mason'], toolsRequired: ['Trowel', 'Level'], version: '1.0.0' },
            { id: 'aac-001', name: 'AAC Block', nameAr: 'بلوك AAC خفيف', unit: 'm²', density: 600, uses: ['Walls', 'Partitions'], lifespan: 50, installationMethods: ['AdhesiveLaying'], compatibleMaterials: ['AACAdhesive', 'Plaster'], incompatibleMaterials: ['CementMortar'], wasteFactor: 0.03, referencePrice: 45, currency: 'SAR', laborRequired: ['Mason'], toolsRequired: ['Saw', 'Trowel'], version: '1.0.0' },
            { id: 'gyp-001', name: 'Gypsum Board', nameAr: 'جبس بورد', unit: 'm²', density: 800, uses: ['Ceilings', 'Partitions'], lifespan: 20, installationMethods: ['Screwing', 'Framing'], compatibleMaterials: ['SteelFrame', 'JointCompound'], incompatibleMaterials: ['Water'], wasteFactor: 0.05, referencePrice: 35, currency: 'SAR', laborRequired: ['Carpenter', 'GypsumInstaller'], toolsRequired: ['Screwdriver', 'Saw'], version: '1.0.0' },
            { id: 'pnt-001', name: 'Water Based Paint', nameAr: 'دهان مائي', unit: 'liter', density: 1.3, uses: ['Walls', 'Ceilings'], lifespan: 5, installationMethods: ['Roller', 'Brush', 'Spray'], compatibleMaterials: ['Primer', 'Putty'], incompatibleMaterials: ['Oil'], wasteFactor: 0.05, referencePrice: 35, currency: 'SAR', laborRequired: ['Painter'], toolsRequired: ['Roller', 'Brush'], version: '1.0.0' },
            { id: 'cer-001', name: 'Ceramic Floor Tile', nameAr: 'سيراميك أرضيات', unit: 'm²', density: 2000, uses: ['Floors', 'Walls'], lifespan: 15, installationMethods: ['AdhesiveLaying', 'MortarLaying'], compatibleMaterials: ['TileAdhesive', 'Grout'], incompatibleMaterials: [], wasteFactor: 0.08, referencePrice: 42, currency: 'SAR', laborRequired: ['Tiler'], toolsRequired: ['TileCutter', 'Trowel'], version: '1.0.0' },
            { id: 'mrb-001', name: 'Marble', nameAr: 'رخام', unit: 'm²', density: 2700, uses: ['Floors', 'Walls', 'Countertops'], lifespan: 30, installationMethods: ['AdhesiveLaying', 'MortarLaying'], compatibleMaterials: ['MarbleAdhesive', 'Grout'], incompatibleMaterials: ['Acids'], wasteFactor: 0.08, referencePrice: 150, currency: 'SAR', laborRequired: ['MarbleInstaller'], toolsRequired: ['MarbleCutter', 'Polisher'], version: '1.0.0' },
            { id: 'wat-001', name: 'Waterproofing Membrane', nameAr: 'غشاء عزل مائي', unit: 'm²', density: 1.5, uses: ['Roofs', 'Bathrooms', 'Basements'], lifespan: 20, installationMethods: ['Rolling', 'Torching', 'LiquidApplication'], compatibleMaterials: ['Primer', 'ProtectionBoard'], incompatibleMaterials: ['Solvents'], wasteFactor: 0.05, referencePrice: 55, currency: 'SAR', laborRequired: ['Waterproofer'], toolsRequired: ['Roller', 'Torch'], version: '1.0.0' },
            { id: 'ins-001', name: 'Thermal Insulation', nameAr: 'عزل حراري', unit: 'm²', density: 40, uses: ['Walls', 'Roofs', 'Ceilings'], lifespan: 25, installationMethods: ['Fixing', 'Spraying'], compatibleMaterials: ['Gypsum', 'Concrete'], incompatibleMaterials: ['Water'], wasteFactor: 0.05, referencePrice: 65, currency: 'SAR', laborRequired: ['InsulationInstaller'], toolsRequired: ['Knife', 'Adhesive'], version: '1.0.0' }
        ];
        for (const material of defaults) {
            this.register(material);
        }
    }
}
exports.MaterialLibrary = MaterialLibrary;
//# sourceMappingURL=MaterialLibrary.js.map