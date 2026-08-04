"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaborEngine = void 0;
const core_1 = require("@acep/core");
class LaborEngine extends core_1.BaseEngine {
    knowledgeGraph;
    laborLib;
    boqItemsLib;
    constructor(kg, labLib, boqLib) {
        super('LaborEngine', '1.0.0');
        this.knowledgeGraph = kg;
        this.laborLib = labLib;
        this.boqItemsLib = boqLib;
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('LaborEngine initialized');
    }
    async validate() {
        return true;
    }
    async calculateLabor(boq) {
        this.setStatus('running');
        this.logger.info('Calculating labor requirements');
        const requirements = new Map();
        const tradeItemMap = {};
        for (const item of boq.items) {
            const template = this.boqItemsLib.get(item.code);
            if (!template)
                continue;
            for (const tradeName of template.laborRequired) {
                if (!tradeItemMap[tradeName])
                    tradeItemMap[tradeName] = [];
                tradeItemMap[tradeName].push(item);
            }
        }
        for (const [tradeName, items] of Object.entries(tradeItemMap)) {
            const laborRecords = this.laborLib.findByTrade(tradeName);
            if (laborRecords.length === 0)
                continue;
            const labor = laborRecords[0];
            const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
            const manHours = Math.ceil(totalQuantity / (labor.dailyProductivity || 1)) * 8;
            const manDays = Math.ceil(manHours / 8);
            const count = Math.max(1, Math.ceil(manDays / 30));
            const req = {
                trade: tradeName,
                count,
                manHours,
                manDays,
                skillLevel: 'Medium',
                hourlyRate: labor.hourlyCost,
                totalCost: Math.round(manHours * labor.hourlyCost * 100) / 100,
                activities: items.map(i => i.description)
            };
            requirements.set(tradeName, req);
        }
        this.setStatus('idle');
        return Array.from(requirements.values());
    }
    async buildCrews(requirements) {
        this.logger.info('Building labor crews');
        const crews = [];
        const structureCrew = {
            id: 'crew-structure-1',
            name: 'Structural Crew A',
            type: 'Structure',
            members: [
                { trade: core_1.LaborTrade.ConcreteWorker, count: 4, skillLevel: 'Medium' },
                { trade: core_1.LaborTrade.SteelFixer, count: 3, skillLevel: 'High' },
                { trade: core_1.LaborTrade.Carpenter, count: 3, skillLevel: 'High' },
                { trade: core_1.LaborTrade.Mason, count: 2, skillLevel: 'Medium' }
            ],
            totalCost: 0,
            productivity: 1.0,
            scenario: 'Standard construction'
        };
        structureCrew.totalCost = structureCrew.members.reduce((s, m) => {
            const labor = this.laborLib.findByTrade(m.trade)[0];
            return s + (labor ? labor.dailyCost * m.count : 0);
        }, 0);
        crews.push(structureCrew);
        const finishingCrew = {
            id: 'crew-finish-1',
            name: 'Finishing Crew A',
            type: 'Finishing',
            members: [
                { trade: core_1.LaborTrade.Plasterer, count: 3, skillLevel: 'Medium' },
                { trade: core_1.LaborTrade.Painter, count: 2, skillLevel: 'Medium' },
                { trade: core_1.LaborTrade.Tiler, count: 2, skillLevel: 'High' }
            ],
            totalCost: 0,
            productivity: 1.0,
            scenario: 'Standard finishing'
        };
        finishingCrew.totalCost = finishingCrew.members.reduce((s, m) => {
            const labor = this.laborLib.findByTrade(m.trade)[0];
            return s + (labor ? labor.dailyCost * m.count : 0);
        }, 0);
        crews.push(finishingCrew);
        const mepCrew = {
            id: 'crew-mep-1',
            name: 'MEP Crew A',
            type: 'MEP',
            members: [
                { trade: core_1.LaborTrade.Plumber, count: 2, skillLevel: 'High' },
                { trade: core_1.LaborTrade.Electrician, count: 3, skillLevel: 'High' },
                { trade: core_1.LaborTrade.HVAC, count: 2, skillLevel: 'High' }
            ],
            totalCost: 0,
            productivity: 1.0,
            scenario: 'Standard MEP installation'
        };
        mepCrew.totalCost = mepCrew.members.reduce((s, m) => {
            const labor = this.laborLib.findByTrade(m.trade)[0];
            return s + (labor ? labor.dailyCost * m.count : 0);
        }, 0);
        crews.push(mepCrew);
        return crews;
    }
    async optimizeCrews(crews) {
        this.logger.info('Optimizing crew composition');
        return crews.map(crew => {
            const optimizedMembers = crew.members.map(m => {
                const labor = this.laborLib.findByTrade(m.trade)[0];
                if (!labor)
                    return m;
                const optimalCount = Math.max(1, Math.ceil(labor.dailyProductivity / 10));
                return { ...m, count: Math.min(m.count, optimalCount * 2) };
            });
            const totalCost = optimizedMembers.reduce((s, m) => {
                const labor = this.laborLib.findByTrade(m.trade)[0];
                return s + (labor ? labor.dailyCost * m.count : 0);
            }, 0);
            return { ...crew, members: optimizedMembers, totalCost, productivity: crew.productivity * 1.1 };
        });
    }
    async getProductivity(trade) {
        const labors = this.laborLib.findByTrade(trade);
        if (labors.length === 0) {
            this.logger.warn(`No productivity data for trade: ${trade}`);
            return 10;
        }
        return labors.reduce((s, l) => s + l.dailyProductivity, 0) / labors.length;
    }
    async calculateLaborCost(requirements) {
        return Math.round(requirements.reduce((s, r) => s + r.totalCost, 0) * 100) / 100;
    }
}
exports.LaborEngine = LaborEngine;
//# sourceMappingURL=index.js.map