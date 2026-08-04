"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulationService = exports.SimulationService = void 0;
const BASE_RATES = {
    Villa: { costPerM2: 3500, months: 2 },
    Building: { costPerM2: 4200, months: 2.5 },
    Tower: { costPerM2: 5500, months: 3.5 },
    Hotel: { costPerM2: 6000, months: 4 },
    Mosque: { costPerM2: 4500, months: 3 },
    Hospital: { costPerM2: 7000, months: 5 },
    School: { costPerM2: 3800, months: 3 },
    Mall: { costPerM2: 5200, months: 4 },
    Warehouse: { costPerM2: 2800, months: 2 },
    Bridge: { costPerM2: 8000, months: 6 },
    Road: { costPerM2: 1500, months: 1.5 },
    Factory: { costPerM2: 4500, months: 4 },
    Farm: { costPerM2: 1200, months: 1.5 },
    Infrastructure: { costPerM2: 3000, months: 3 },
    'Water Treatment': { costPerM2: 6500, months: 5 },
    Sports: { costPerM2: 5000, months: 3.5 },
    Office: { costPerM2: 4800, months: 3 },
    Residential: { costPerM2: 3800, months: 2.5 },
    Commercial: { costPerM2: 4500, months: 3 },
};
const FINISHING_FACTOR = {
    'Standard': 1.0,
    'Good': 1.15,
    'Premium': 1.35,
    'Luxury': 1.6,
};
class SimulationService {
    initialized = false;
    async initialize() {
        this.initialized = true;
    }
    runSimulation(model, name = 'Baseline') {
        this.ensureInitialized();
        const base = BASE_RATES[model.projectType] || BASE_RATES['Building'];
        const finishFactor = FINISHING_FACTOR[model.finishingLevel] || 1.0;
        const floorFactor = 1 + (model.floors - 1) * 0.08;
        const areaEff = model.area > 0 ? Math.pow(model.area / 500, -0.1) : 1;
        const costPerM2 = base.costPerM2 * finishFactor * floorFactor;
        const durationMonths = base.months * Math.pow(model.area / 300, 0.3) * floorFactor * 0.8;
        const totalCost = costPerM2 * model.area;
        const riskScore = Math.min(1, 0.2 + (model.floors > 10 ? 0.3 : model.floors > 5 ? 0.15 : 0) + (finishFactor > 1.3 ? 0.1 : 0));
        const resourceEfficiency = Math.max(0, 1 - riskScore * areaEff);
        return {
            id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name,
            durationMonths: Math.round(durationMonths * 10) / 10,
            costPerM2: Math.round(costPerM2),
            totalCost: Math.round(totalCost),
            resourceEfficiency: Math.round(resourceEfficiency * 100) / 100,
            riskScore: Math.round(riskScore * 100) / 100,
        };
    }
    compareScenarios(scenarios) {
        return [...scenarios].sort((a, b) => {
            const scoreA = a.resourceEfficiency - a.riskScore;
            const scoreB = b.resourceEfficiency - b.riskScore;
            return scoreB - scoreA;
        });
    }
    generateReport(model, scenarios) {
        const sorted = this.compareScenarios(scenarios);
        const best = sorted[0];
        return {
            scenarios,
            recommended: best?.name || 'None',
            comparison: {
                costRange: `${Math.min(...scenarios.map(s => s.totalCost)).toLocaleString()} – ${Math.max(...scenarios.map(s => s.totalCost)).toLocaleString()} SAR`,
                durationRange: `${Math.min(...scenarios.map(s => s.durationMonths))} – ${Math.max(...scenarios.map(s => s.durationMonths))} months`,
                bestEfficiency: `${Math.round((best?.resourceEfficiency || 0) * 100)}%`,
            },
        };
    }
    isInitialized() { return this.initialized; }
    ensureInitialized() {
        if (!this.initialized)
            throw new Error('SimulationService not initialized. Call initialize() first.');
    }
}
exports.SimulationService = SimulationService;
exports.simulationService = new SimulationService();
//# sourceMappingURL=index.js.map