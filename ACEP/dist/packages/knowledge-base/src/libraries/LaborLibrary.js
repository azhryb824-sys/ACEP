"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaborLibrary = void 0;
class LaborLibrary {
    labors = new Map();
    register(labor) {
        this.labors.set(labor.id, labor);
    }
    get(id) {
        return this.labors.get(id);
    }
    findByTrade(trade) {
        return Array.from(this.labors.values()).filter(l => l.trade === trade);
    }
    getDailyCost(trade) {
        const labors = this.findByTrade(trade);
        if (labors.length === 0)
            return 0;
        return labors[0].dailyCost;
    }
    getAll() {
        return Array.from(this.labors.values());
    }
    initializeDefaults() {
        const defaults = [
            { id: 'lab-001', name: 'Mason', nameAr: 'بناء', trade: 'Mason', skills: ['BlockLaying', 'MortarMixing'], dailyProductivity: 12, productivityUnit: 'm²/day', tasks: ['BlockWork', 'BrickWork'], tools: ['Trowel', 'Level', 'Hammer'], teamSize: 1, experience: '3-5 years', hourlyCost: 25, dailyCost: 200, currency: 'SAR', certifications: [], safetyLevel: 'Medium', version: '1.0.0' },
            { id: 'lab-002', name: 'Steel Fixer', nameAr: 'حداد تسليح', trade: 'SteelFixer', skills: ['SteelCutting', 'SteelBending', 'SteelTying'], dailyProductivity: 0.5, productivityUnit: 'ton/day', tasks: ['Reinforcement'], tools: ['Cutter', 'Bender', 'TyingTool'], teamSize: 1, experience: '3-5 years', hourlyCost: 28, dailyCost: 220, currency: 'SAR', certifications: [], safetyLevel: 'Medium', version: '1.0.0' },
            { id: 'lab-003', name: 'Carpenter', nameAr: 'نجار', trade: 'Carpenter', skills: ['Formwork', 'Framing', 'Cutting'], dailyProductivity: 15, productivityUnit: 'm²/day', tasks: ['Formwork', 'Framing', 'GypsumBoard'], tools: ['Saw', 'Hammer', 'MeasuringTape'], teamSize: 1, experience: '3-5 years', hourlyCost: 25, dailyCost: 200, currency: 'SAR', certifications: [], safetyLevel: 'Medium', version: '1.0.0' },
            { id: 'lab-004', name: 'Plasterer', nameAr: 'مبيض محارة', trade: 'Plasterer', skills: ['Plastering', 'Smoothing'], dailyProductivity: 20, productivityUnit: 'm²/day', tasks: ['InternalPlaster', 'ExternalPlaster'], tools: ['Trowel', 'Float', 'Level'], teamSize: 1, experience: '3-5 years', hourlyCost: 23, dailyCost: 180, currency: 'SAR', certifications: [], safetyLevel: 'Low', version: '1.0.0' },
            { id: 'lab-005', name: 'Painter', nameAr: 'دهان', trade: 'Painter', skills: ['Painting', 'SurfacePrep', 'ColorMixing'], dailyProductivity: 30, productivityUnit: 'm²/day', tasks: ['WallPainting', 'CeilingPainting', 'WoodPainting'], tools: ['Roller', 'Brush', 'Sprayer'], teamSize: 1, experience: '2-4 years', hourlyCost: 20, dailyCost: 160, currency: 'SAR', certifications: [], safetyLevel: 'Low', version: '1.0.0' },
            { id: 'lab-006', name: 'Tiler', nameAr: 'فني سيراميك', trade: 'Tiler', skills: ['TileCutting', 'TileLaying', 'Grouting'], dailyProductivity: 10, productivityUnit: 'm²/day', tasks: ['CeramicFloor', 'CeramicWall', 'Grouting'], tools: ['TileCutter', 'Trowel', 'Level'], teamSize: 1, experience: '3-5 years', hourlyCost: 28, dailyCost: 220, currency: 'SAR', certifications: [], safetyLevel: 'Low', version: '1.0.0' },
            { id: 'lab-007', name: 'Plumber', nameAr: 'سباك', trade: 'Plumber', skills: ['PipeInstallation', 'FixtureInstallation', 'Drainage'], dailyProductivity: 6, productivityUnit: 'points/day', tasks: ['WaterSupply', 'Drainage', 'FixtureInstallation'], tools: ['PipeWrench', 'Cutter', 'Welder'], teamSize: 1, experience: '3-5 years', hourlyCost: 30, dailyCost: 240, currency: 'SAR', certifications: [], safetyLevel: 'Low', version: '1.0.0' },
            { id: 'lab-008', name: 'Electrician', nameAr: 'كهربائي', trade: 'Electrician', skills: ['Wiring', 'PanelInstallation', 'FixtureInstallation'], dailyProductivity: 8, productivityUnit: 'points/day', tasks: ['ConduitInstallation', 'CableLaying', 'PanelInstallation'], tools: ['Multimeter', 'Cutter', 'Drill'], teamSize: 1, experience: '3-5 years', hourlyCost: 30, dailyCost: 240, currency: 'SAR', certifications: ['SaudiElectricianLicense'], safetyLevel: 'Medium', version: '1.0.0' },
            { id: 'lab-009', name: 'HVAC Technician', nameAr: 'فني تكييف', trade: 'HVAC', skills: ['ACInstallation', 'DuctWork', 'Refrigeration'], dailyProductivity: 3, productivityUnit: 'units/day', tasks: ['ACInstallation', 'DuctInstallation'], tools: ['Gauges', 'Cutter', 'Welder'], teamSize: 2, experience: '3-5 years', hourlyCost: 35, dailyCost: 280, currency: 'SAR', certifications: ['HVACCertification'], safetyLevel: 'Medium', version: '1.0.0' },
            { id: 'lab-010', name: 'Concrete Worker', nameAr: 'عامل خرسانة', trade: 'ConcreteWorker', skills: ['ConcretePouring', 'Finishing', 'Curing'], dailyProductivity: 10, productivityUnit: 'm³/day', tasks: ['ConcretePouring', 'ConcreteFinishing'], tools: ['Shovel', 'Float', 'Vibrator'], teamSize: 1, experience: '1-3 years', hourlyCost: 18, dailyCost: 140, currency: 'SAR', certifications: [], safetyLevel: 'Medium', version: '1.0.0' },
            { id: 'lab-011', name: 'Crane Operator', nameAr: 'مشغل رافعة', trade: 'CraneOperator', skills: ['CraneOperation', 'LoadCalculation'], dailyProductivity: 8, productivityUnit: 'hours/day', tasks: ['Lifting', 'MaterialHandling'], tools: ['Crane', 'Radio'], teamSize: 1, experience: '5-10 years', hourlyCost: 45, dailyCost: 360, currency: 'SAR', certifications: ['CraneLicense'], safetyLevel: 'High', version: '1.0.0' },
            { id: 'lab-012', name: 'Site Engineer', nameAr: 'مهندس موقع', trade: 'SiteEngineer', skills: ['ProjectManagement', 'QualityControl', 'Planning'], dailyProductivity: 1, productivityUnit: 'project/day', tasks: ['Supervision', 'QualityControl', 'Coordination'], tools: ['Computer', 'MeasuringTools'], teamSize: 1, experience: '5-10 years', hourlyCost: 60, dailyCost: 480, currency: 'SAR', certifications: ['EngineeringLicense'], safetyLevel: 'Low', version: '1.0.0' }
        ];
        for (const labor of defaults) {
            this.register(labor);
        }
    }
}
exports.LaborLibrary = LaborLibrary;
//# sourceMappingURL=LaborLibrary.js.map