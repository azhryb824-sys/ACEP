"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentEngine = void 0;
const core_1 = require("@acep/core");
class EquipmentEngine extends core_1.BaseEngine {
    knowledgeGraph;
    equipmentLib;
    boqItemsLib;
    constructor(kg, eqLib, boqLib) {
        super('EquipmentEngine', '1.0.0');
        this.knowledgeGraph = kg;
        this.equipmentLib = eqLib;
        this.boqItemsLib = boqLib;
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('EquipmentEngine initialized');
    }
    async validate() {
        return true;
    }
    async determineEquipment(boq) {
        this.setStatus('running');
        this.logger.info('Determining equipment requirements');
        const requirements = [];
        const categoryTotals = {};
        for (const item of boq.items) {
            const template = this.boqItemsLib.get(item.code);
            if (!template)
                continue;
            for (const equipId of template.equipmentRequired) {
                if (!categoryTotals[equipId])
                    categoryTotals[equipId] = 0;
                categoryTotals[equipId] += item.quantity;
            }
        }
        for (const [equipId, totalQty] of Object.entries(categoryTotals)) {
            const equipRecord = this.equipmentLib.get(equipId);
            if (!equipRecord)
                continue;
            const hours = Math.ceil(totalQty / 2);
            const count = Math.max(1, Math.ceil(hours / 160));
            const req = {
                equipmentId: equipId,
                name: equipRecord.name,
                category: equipRecord.category,
                count,
                hours,
                dailyCost: equipRecord.dailyCost,
                totalCost: Math.round(equipRecord.dailyCost * Math.ceil(hours / 8) * 100) / 100,
                fuelConsumption: equipRecord.category === 'Excavation' || equipRecord.category === 'Concrete' ? hours * 15 : 0,
                maintenanceHours: Math.ceil(hours / equipRecord.maintenanceInterval) * 4,
                utilization: Math.min(hours / (count * 200), 1),
                activities: [],
                schedule: []
            };
            requirements.push(req);
        }
        if (requirements.length === 0) {
            requirements.push(this.createDefaultRequirement());
        }
        this.setStatus('idle');
        return requirements;
    }
    async selectEquipment(activity, constraints) {
        const cons = constraints || {};
        const budget = cons.budget || 100000;
        const duration = cons.duration || 30;
        const options = this.equipmentLib.findByCategory(activity?.category || 'Excavation');
        return options
            .map(o => ({ ...o, totalCost: o.dailyCost * duration, score: (o.availability * 10) - (o.dailyCost * duration / budget) }))
            .sort((a, b) => b.score - a.score);
    }
    async calculateUtilization(equipment) {
        if (equipment.length === 0)
            return 0;
        return Math.round(equipment.reduce((s, e) => s + e.utilization, 0) / equipment.length * 100) / 100;
    }
    async compareOptions(equipmentId) {
        const equipRecord = this.equipmentLib.get(equipmentId);
        if (!equipRecord)
            return [];
        const sameCategory = this.equipmentLib.findByCategory(equipRecord.category);
        return sameCategory.map(e => ({
            id: e.id,
            name: e.name,
            dailyCost: e.dailyCost,
            rentalCost: e.rentalCost,
            purchaseCost: e.purchaseCost,
            availability: e.availability,
            operatorRequired: e.operatorRequired,
            maintenanceInterval: e.maintenanceInterval,
            breakEvenDays: Math.ceil(e.purchaseCost / (e.rentalCost || 1))
        }));
    }
    async scheduleEquipment(requirements) {
        this.logger.info('Scheduling equipment usage');
        for (const req of requirements) {
            const schedule = [];
            const daysNeeded = Math.ceil(req.hours / 8);
            for (let day = 1; day <= daysNeeded; day += 5) {
                for (let d = 0; d < 5 && day + d <= daysNeeded; d++) {
                    schedule.push({
                        activityId: `eq-sched-${req.equipmentId}-${day + d}`,
                        startDay: day + d,
                        endDay: day + d,
                        dailyHours: 8
                    });
                }
            }
            req.schedule = schedule;
        }
        return requirements;
    }
    createDefaultRequirement() {
        return {
            equipmentId: 'eq-default-001',
            name: 'General Construction Equipment',
            category: core_1.EquipmentCategory.Transportation,
            count: 1,
            hours: 40,
            dailyCost: 800,
            totalCost: 4000,
            fuelConsumption: 200,
            maintenanceHours: 4,
            utilization: 0.5,
            activities: ['General construction activities'],
            schedule: []
        };
    }
}
exports.EquipmentEngine = EquipmentEngine;
//# sourceMappingURL=index.js.map