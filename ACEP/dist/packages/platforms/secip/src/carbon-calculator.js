"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarbonCalculator = exports.SCOPE_CLASSIFICATION = exports.DEFAULT_EMISSION_FACTORS = void 0;
const types_1 = require("./types");
exports.DEFAULT_EMISSION_FACTORS = {
    [types_1.EmissionSource.Cement]: 0.92,
    [types_1.EmissionSource.Concrete]: 0.15,
    [types_1.EmissionSource.Steel]: 1.85,
    [types_1.EmissionSource.Aluminum]: 2.5,
    [types_1.EmissionSource.Glass]: 0.85,
    [types_1.EmissionSource.Brick]: 0.24,
    [types_1.EmissionSource.Paint]: 3.2,
    [types_1.EmissionSource.Transportation]: 0.41,
    [types_1.EmissionSource.Equipment]: 0.35,
    [types_1.EmissionSource.Electricity]: 0.45,
    [types_1.EmissionSource.Fuel]: 2.68,
    [types_1.EmissionSource.Operations]: 0.28,
    [types_1.EmissionSource.Maintenance]: 0.19
};
exports.SCOPE_CLASSIFICATION = {
    [types_1.EmissionSource.Cement]: 1,
    [types_1.EmissionSource.Concrete]: 1,
    [types_1.EmissionSource.Steel]: 1,
    [types_1.EmissionSource.Aluminum]: 1,
    [types_1.EmissionSource.Glass]: 1,
    [types_1.EmissionSource.Brick]: 1,
    [types_1.EmissionSource.Paint]: 3,
    [types_1.EmissionSource.Transportation]: 1,
    [types_1.EmissionSource.Equipment]: 1,
    [types_1.EmissionSource.Electricity]: 2,
    [types_1.EmissionSource.Fuel]: 1,
    [types_1.EmissionSource.Operations]: 3,
    [types_1.EmissionSource.Maintenance]: 3
};
const EMISSION_FACTOR_MAP = {};
for (const source of Object.values(types_1.EmissionSource)) {
    EMISSION_FACTOR_MAP[source] = {
        source,
        co2Factor: exports.DEFAULT_EMISSION_FACTORS[source] * 0.95,
        ch4Factor: exports.DEFAULT_EMISSION_FACTORS[source] * 0.03,
        n2oFactor: exports.DEFAULT_EMISSION_FACTORS[source] * 0.02,
        co2eFactor: exports.DEFAULT_EMISSION_FACTORS[source],
        unit: "kgCO2e/kg",
        confidence: 0.85,
        sourceReference: "IPCC 2021 / DEFRA 2023"
    };
}
class CarbonCalculator {
    factors;
    constructor(customFactors) {
        this.factors = { ...EMISSION_FACTOR_MAP };
        if (customFactors) {
            for (const [source, factor] of Object.entries(customFactors)) {
                if (this.factors[source]) {
                    Object.assign(this.factors[source], factor);
                }
            }
        }
    }
    async calculate(data) {
        const records = [];
        const bySource = {};
        const scope1Sources = [];
        const scope2Sources = [];
        const scope3Sources = [];
        for (const entry of data.sources) {
            const factor = this.factors[entry.source];
            if (!factor)
                continue;
            const co2e = entry.activity * factor.co2eFactor;
            const scope = exports.SCOPE_CLASSIFICATION[entry.source];
            const record = {
                source: entry.source,
                activity: entry.activity,
                unit: entry.unit,
                factors: factor,
                co2e,
                scope,
                category: this.getCategory(entry.source),
                description: `Emissions from ${entry.source} - ${entry.activity} ${entry.unit}`
            };
            records.push(record);
            bySource[entry.source] = (bySource[entry.source] || 0) + co2e;
            if (scope === 1)
                scope1Sources.push(record);
            else if (scope === 2)
                scope2Sources.push(record);
            else
                scope3Sources.push(record);
        }
        const scope1Total = scope1Sources.reduce((s, r) => s + r.co2e, 0);
        const scope2Total = scope2Sources.reduce((s, r) => s + r.co2e, 0);
        const scope3Total = scope3Sources.reduce((s, r) => s + r.co2e, 0);
        const total = scope1Total + scope2Total + scope3Total;
        return {
            total,
            unit: "kgCO2e",
            bySource,
            scope1: { total: scope1Total, sources: scope1Sources, description: "Direct emissions from owned sources" },
            scope2: { total: scope2Total, sources: scope2Sources, methodology: "Location-based (grid average)" },
            scope3: {
                total: scope3Total,
                categories: { "Purchased goods": scope3Total },
                sources: scope3Sources
            },
            methodology: {
                standard: "GHG Protocol",
                version: "Corporate Standard 2023",
                factorsSource: "IPCC AR6 / DEFRA 2023",
                calculationMethod: "Activity data × emission factors",
                assumptions: ["Factors are industry averages", "Scope 2 uses location-based method"]
            },
            intensity: {
                perRevenue: total / 1000000,
                perEmployee: total / 100,
                perArea: total / 5000,
                perUnit: total / records.length
            },
            verification: {
                verified: false,
                verifier: "",
                date: new Date().toISOString(),
                status: "pending"
            }
        };
    }
    async calculateScope1(sources) {
        const scope1Source = sources.filter(s => exports.SCOPE_CLASSIFICATION[s.source] === 1);
        const total = scope1Source.reduce((s, r) => s + r.co2e, 0);
        return { total, sources: scope1Source };
    }
    async calculateScope2(electricityConsumption, gridFactor) {
        const factor = this.factors[types_1.EmissionSource.Electricity];
        const co2e = electricityConsumption * gridFactor;
        const record = {
            source: types_1.EmissionSource.Electricity,
            activity: electricityConsumption,
            unit: "kWh",
            factors: { ...factor, co2eFactor: gridFactor },
            co2e,
            scope: 2,
            category: "Purchased Electricity",
            description: `Scope 2 emissions from ${electricityConsumption} kWh electricity consumption`
        };
        return { total: co2e, sources: [record] };
    }
    async calculateScope3(supplyChainData) {
        const sources = [];
        const categories = {};
        let total = 0;
        for (const [category, amount] of Object.entries(supplyChainData)) {
            const avgFactor = Object.values(exports.DEFAULT_EMISSION_FACTORS).reduce((a, b) => a + b, 0) / Object.keys(exports.DEFAULT_EMISSION_FACTORS).length;
            const co2e = amount * avgFactor * 0.5;
            total += co2e;
            categories[category] = (categories[category] || 0) + co2e;
            sources.push({
                source: types_1.EmissionSource.Operations,
                activity: amount,
                unit: "kg",
                factors: this.factors[types_1.EmissionSource.Operations],
                co2e,
                scope: 3,
                category,
                description: `Scope 3 emissions from ${category}`
            });
        }
        return { total, categories, sources };
    }
    async getEmissionFactor(source) {
        return this.factors[source]?.co2eFactor ?? 0;
    }
    async analyzeReductionScenarios(_data) {
        return [
            {
                id: "scenario_1",
                name: "Material Substitution",
                description: "Replace high-emission materials with low-carbon alternatives",
                measures: [
                    { action: "Replace Portland cement with slag cement", reduction: 0.3, cost: 50000, difficulty: "moderate", timeline: "6 months" },
                    { action: "Use recycled steel rebar", reduction: 0.15, cost: 30000, difficulty: "easy", timeline: "3 months" },
                    { action: "Switch to low-VOC paints", reduction: 0.05, cost: 10000, difficulty: "easy", timeline: "1 month" }
                ],
                totalReduction: 0.5,
                totalCost: 90000,
                netPresentValue: 250000,
                paybackYears: 2.5,
                feasibility: 0.85
            },
            {
                id: "scenario_2",
                name: "Renewable Energy Transition",
                description: "Transition to 100% renewable energy for operations",
                measures: [
                    { action: "Install solar panels on site", reduction: 0.4, cost: 200000, difficulty: "hard", timeline: "12 months" },
                    { action: "Purchase renewable energy certificates", reduction: 0.6, cost: 50000, difficulty: "easy", timeline: "1 month" }
                ],
                totalReduction: 1.0,
                totalCost: 250000,
                netPresentValue: 500000,
                paybackYears: 4,
                feasibility: 0.7
            },
            {
                id: "scenario_3",
                name: "Operational Efficiency",
                description: "Improve operational efficiency to reduce energy and fuel consumption",
                measures: [
                    { action: "Optimize HVAC scheduling", reduction: 0.1, cost: 15000, difficulty: "easy", timeline: "2 months" },
                    { action: "LED lighting retrofit", reduction: 0.15, cost: 40000, difficulty: "moderate", timeline: "4 months" },
                    { action: "Electric vehicle fleet transition", reduction: 0.08, cost: 100000, difficulty: "hard", timeline: "18 months" }
                ],
                totalReduction: 0.33,
                totalCost: 155000,
                netPresentValue: 320000,
                paybackYears: 3,
                feasibility: 0.9
            }
        ];
    }
    async createNetZeroPlan(data) {
        const input = data;
        const currentEmissions = input?.currentEmissions ?? 10000;
        const targetYear = input?.targetYear ?? 2050;
        const baselineYear = input?.baselineYear ?? 2020;
        const now = new Date().getFullYear();
        const totalYears = targetYear - baselineYear;
        const annualReduction = currentEmissions / totalYears;
        const timeline = [];
        for (let y = now; y <= targetYear; y += 5) {
            const reduction = Math.min(annualReduction * (y - baselineYear), currentEmissions);
            timeline.push({
                year: y,
                milestone: `Reduce emissions by ${((reduction / currentEmissions) * 100).toFixed(0)}%`,
                reduction,
                investment: reduction * 50,
                status: y <= now ? "completed" : "planned"
            });
        }
        return {
            targetYear,
            baselineYear,
            baselineEmissions: currentEmissions * 1.2,
            currentEmissions,
            targets: {
                nearTerm: { year: now + 5, reduction: 0.3, description: "30% reduction by near-term target" },
                midTerm: { year: 2040, reduction: 0.65, description: "65% reduction by 2040" },
                longTerm: { year: targetYear, reduction: 0.95, description: "95%+ reduction by net-zero target year" }
            },
            timeline,
            milestones: [
                {
                    id: "ms-1",
                    description: "Complete carbon footprint baseline assessment",
                    targetDate: `${now}-Q2`,
                    achieved: true,
                    achievedDate: `${now}-Q1`,
                    metrics: { baselineEmissions: currentEmissions }
                },
                {
                    id: "ms-2",
                    description: "Implement renewable energy sources (30% target)",
                    targetDate: `${now + 2}-Q4`,
                    achieved: false,
                    metrics: { renewablePercentage: 30 }
                },
                {
                    id: "ms-3",
                    description: "Achieve carbon neutrality in operations",
                    targetDate: `${targetYear - 10}-Q4`,
                    achieved: false,
                    metrics: { reduction: 0.9 }
                }
            ],
            cost: {
                totalInvestment: currentEmissions * 120,
                annualBudget: currentEmissions * 8,
                roi: 3.5,
                paybackPeriod: 7,
                fundingSources: ["Green bonds", "Sustainability-linked loans", "Corporate budget"],
                currency: "USD"
            },
            strategies: [
                {
                    id: "strat-1",
                    name: "Energy Efficiency",
                    description: "Improve energy efficiency across all operations by 40%",
                    reduction: currentEmissions * 0.25,
                    investment: currentEmissions * 30,
                    timeline: `${now} - ${now + 5}`,
                    priority: "high"
                },
                {
                    id: "strat-2",
                    name: "Renewable Energy",
                    description: "Transition to 100% renewable electricity",
                    reduction: currentEmissions * 0.35,
                    investment: currentEmissions * 45,
                    timeline: `${now} - ${now + 8}`,
                    priority: "critical"
                },
                {
                    id: "strat-3",
                    name: "Supply Chain Decarbonization",
                    description: "Engage suppliers to reduce Scope 3 emissions",
                    reduction: currentEmissions * 0.2,
                    investment: currentEmissions * 20,
                    timeline: `${now + 1} - ${now + 10}`,
                    priority: "medium"
                },
                {
                    id: "strat-4",
                    name: "Carbon Removal & Offsets",
                    description: "Invest in verified carbon removal projects for residual emissions",
                    reduction: currentEmissions * 0.05,
                    investment: currentEmissions * 25,
                    timeline: `${now + 5} - ${targetYear}`,
                    priority: "low"
                }
            ]
        };
    }
    async offsetEmissions(amount, type) {
        const costPerTon = {
            reforestation: 15,
            renewable_energy: 10,
            methane_capture: 20,
            direct_air_capture: 200,
            biochar: 50
        };
        const unitCost = costPerTon[type] ?? 25;
        return { cost: amount * unitCost / 1000, verified: type !== "direct_air_capture" };
    }
    validateMethodology(_data) {
        return true;
    }
    getCategory(source) {
        const categories = {
            [types_1.EmissionSource.Cement]: "Materials",
            [types_1.EmissionSource.Concrete]: "Materials",
            [types_1.EmissionSource.Steel]: "Materials",
            [types_1.EmissionSource.Aluminum]: "Materials",
            [types_1.EmissionSource.Glass]: "Materials",
            [types_1.EmissionSource.Brick]: "Materials",
            [types_1.EmissionSource.Paint]: "Materials",
            [types_1.EmissionSource.Transportation]: "Logistics",
            [types_1.EmissionSource.Equipment]: "Equipment",
            [types_1.EmissionSource.Electricity]: "Energy",
            [types_1.EmissionSource.Fuel]: "Energy",
            [types_1.EmissionSource.Operations]: "Operations",
            [types_1.EmissionSource.Maintenance]: "Operations"
        };
        return categories[source] ?? "Other";
    }
}
exports.CarbonCalculator = CarbonCalculator;
//# sourceMappingURL=carbon-calculator.js.map