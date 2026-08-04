"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleEngine = void 0;
const core_1 = require("@acep/core");
class ScheduleEngine extends core_1.BaseEngine {
    knowledgeGraph;
    equationsLib;
    laborLib;
    constructor(kg, eqLib, labLib) {
        super('ScheduleEngine', '1.0.0');
        this.knowledgeGraph = kg;
        this.equationsLib = eqLib;
        this.laborLib = labLib;
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('ScheduleEngine initialized');
    }
    async validate() {
        return true;
    }
    async generateSchedule(boq, labor, equipment) {
        this.setStatus('running');
        this.logger.info('Generating project schedule');
        const activityDefinitions = this.getActivityDefinitions(boq);
        const activities = [];
        for (const def of activityDefinitions) {
            const duration = await this.calculateDuration(def.totalQty, def.productivity);
            const activity = {
                id: def.id,
                name: def.name,
                description: def.name,
                duration,
                unit: 'days',
                predecessors: def.predecessors,
                successors: [],
                resources: this.allocateResources(def, labor, equipment),
                earlyStart: 0,
                earlyFinish: 0,
                lateStart: 0,
                lateFinish: 0,
                totalFloat: 0,
                freeFloat: 0,
                isCritical: false,
                status: 'NotStarted',
                progress: 0
            };
            activities.push(activity);
        }
        const built = await this.buildNetwork(activities);
        const conflicts = await this.detectConflicts(built);
        if (conflicts.length > 0) {
            this.logger.warn(`Schedule has ${conflicts.length} conflicts to resolve`);
        }
        this.setStatus('idle');
        return built;
    }
    async calculateDuration(quantity, productivity) {
        if (productivity <= 0)
            return 1;
        return Math.max(1, Math.ceil(quantity / (productivity || 10)));
    }
    async buildNetwork(activities) {
        for (const activity of activities) {
            const predNames = activity.predecessors;
            activity.predecessors = [];
            for (const predName of predNames) {
                const pred = activities.find(a => a.name === predName);
                if (pred) {
                    activity.predecessors.push(pred.id);
                    pred.successors.push(activity.id);
                }
            }
        }
        const sorted = this.topologicalSort(activities);
        if (sorted.length === 0)
            return activities;
        sorted[0].earlyStart = 0;
        sorted[0].earlyFinish = sorted[0].duration;
        for (let i = 0; i < sorted.length; i++) {
            const activity = sorted[i];
            for (const succId of activity.successors) {
                const succ = sorted.find(a => a.id === succId);
                if (succ) {
                    succ.earlyStart = Math.max(succ.earlyStart, activity.earlyFinish);
                    succ.earlyFinish = succ.earlyStart + succ.duration;
                }
            }
        }
        const lastActivity = sorted[sorted.length - 1];
        lastActivity.lateStart = lastActivity.earlyStart;
        lastActivity.lateFinish = lastActivity.earlyFinish;
        for (let i = sorted.length - 1; i >= 0; i--) {
            const activity = sorted[i];
            if (activity.successors.length === 0) {
                activity.lateFinish = activity.earlyFinish;
                activity.lateStart = activity.earlyStart;
            }
            else {
                let minLateStart = Infinity;
                for (const succId of activity.successors) {
                    const succ = sorted.find(a => a.id === succId);
                    if (succ && succ.lateStart < minLateStart) {
                        minLateStart = succ.lateStart;
                    }
                }
                activity.lateFinish = minLateStart;
                activity.lateStart = activity.lateFinish - activity.duration;
            }
        }
        for (const activity of sorted) {
            activity.totalFloat = activity.lateStart - activity.earlyStart;
            activity.freeFloat = activity.successors.length > 0
                ? Math.min(...activity.successors.map(s => {
                    const succ = sorted.find(a => a.id === s);
                    return succ ? succ.earlyStart - activity.earlyFinish : 0;
                }))
                : 0;
            activity.isCritical = activity.totalFloat === 0;
        }
        return sorted;
    }
    async detectConflicts(activities) {
        const conflicts = [];
        const resourceMap = new Map();
        for (const activity of activities) {
            for (const resource of activity.resources) {
                if (!resourceMap.has(resource.resourceId)) {
                    resourceMap.set(resource.resourceId, []);
                }
                const usage = resourceMap.get(resource.resourceId);
                for (let d = activity.earlyStart; d < activity.earlyFinish; d++) {
                    usage.push({ day: d, total: resource.quantity });
                }
            }
        }
        for (const [resourceId, usage] of resourceMap) {
            const dayTotals = new Map();
            for (const u of usage) {
                dayTotals.set(u.day, (dayTotals.get(u.day) || 0) + u.total);
            }
            for (const [day, total] of dayTotals) {
                if (total > 8) {
                    conflicts.push({
                        type: 'ResourceConflict',
                        resourceId,
                        day,
                        totalRequired: total,
                        message: `Resource ${resourceId} over-allocated on day ${day}: ${total} units required`
                    });
                }
            }
        }
        for (const activity of activities) {
            if (activity.duration <= 0) {
                conflicts.push({
                    type: 'InvalidDuration',
                    activityId: activity.id,
                    message: `Activity ${activity.name} has invalid duration: ${activity.duration}`
                });
            }
            if (activity.totalFloat < 0) {
                conflicts.push({
                    type: 'NegativeFloat',
                    activityId: activity.id,
                    message: `Activity ${activity.name} has negative float: ${activity.totalFloat}`
                });
            }
        }
        return conflicts;
    }
    async optimizeSchedule(activities, constraints) {
        this.logger.info('Optimizing schedule');
        const cons = constraints || {};
        const maxDuration = cons.maxDuration || 365;
        if (activities.length === 0)
            return activities;
        const totalDuration = Math.max(...activities.map(a => a.earlyFinish));
        if (totalDuration > maxDuration) {
            const compressionRatio = maxDuration / totalDuration;
            for (const activity of activities) {
                activity.duration = Math.max(1, Math.ceil(activity.duration * compressionRatio));
                activity.earlyFinish = activity.earlyStart + activity.duration;
            }
        }
        return this.buildNetwork(activities);
    }
    getActivityDefinitions(boq) {
        const items = boq.items;
        const categoryQty = {};
        for (const item of items) {
            if (!categoryQty[item.category])
                categoryQty[item.category] = 0;
            categoryQty[item.category] += item.quantity;
        }
        return [
            { id: 'act-001', name: 'Site Preparation', totalQty: 1, productivity: 1, predecessors: [] },
            { id: 'act-002', name: 'Earthwork & Excavation', totalQty: categoryQty['EarthWork'] || 0, productivity: 50, predecessors: ['Site Preparation'] },
            { id: 'act-003', name: 'Foundation', totalQty: (categoryQty['Concrete'] || 0) * 0.3, productivity: 10, predecessors: ['Earthwork & Excavation'] },
            { id: 'act-004', name: 'Structural Columns & Beams', totalQty: (categoryQty['Concrete'] || 0) * 0.4, productivity: 8, predecessors: ['Foundation'] },
            { id: 'act-005', name: 'Slab Construction', totalQty: (categoryQty['Concrete'] || 0) * 0.3, productivity: 15, predecessors: ['Structural Columns & Beams'] },
            { id: 'act-006', name: 'Block Work & Partitions', totalQty: categoryQty['Block'] || 0, productivity: 20, predecessors: ['Slab Construction'] },
            { id: 'act-007', name: 'Plastering', totalQty: categoryQty['Plaster'] || 0, productivity: 25, predecessors: ['Block Work & Partitions'] },
            { id: 'act-008', name: 'Electrical Rough-In', totalQty: categoryQty['Electrical'] || 0, productivity: 15, predecessors: ['Block Work & Partitions'] },
            { id: 'act-009', name: 'Plumbing Rough-In', totalQty: categoryQty['Plumbing'] || 0, productivity: 12, predecessors: ['Block Work & Partitions'] },
            { id: 'act-010', name: 'HVAC Installation', totalQty: categoryQty['HVAC'] || 0, productivity: 3, predecessors: ['Electrical Rough-In', 'Plumbing Rough-In'] },
            { id: 'act-011', name: 'Waterproofing', totalQty: categoryQty['Waterproofing'] || 0, productivity: 30, predecessors: ['Block Work & Partitions'] },
            { id: 'act-012', name: 'Tiling & Flooring', totalQty: (categoryQty['Ceramic'] || 0) + (categoryQty['Marble'] || 0), productivity: 12, predecessors: ['Waterproofing', 'Plastering'] },
            { id: 'act-013', name: 'Ceiling Installation', totalQty: categoryQty['Ceiling'] || 0, productivity: 20, predecessors: ['Electrical Rough-In', 'HVAC Installation'] },
            { id: 'act-014', name: 'Painting', totalQty: categoryQty['Paint'] || 0, productivity: 40, predecessors: ['Plastering', 'Ceiling Installation'] },
            { id: 'act-015', name: 'Doors & Windows Installation', totalQty: categoryQty['Doors'] || 0, productivity: 4, predecessors: ['Block Work & Partitions'] },
            { id: 'act-016', name: 'Electrical Finishing', totalQty: (categoryQty['Lighting'] || 0) + (categoryQty['Power'] || 0), productivity: 8, predecessors: ['Painting', 'Ceiling Installation'] },
            { id: 'act-017', name: 'Plumbing Fixtures', totalQty: categoryQty['Plumbing'] || 0, productivity: 6, predecessors: ['Tiling & Flooring'] },
            { id: 'act-018', name: 'Fire Protection System', totalQty: categoryQty['FireFighting'] || 0, productivity: 10, predecessors: ['Electrical Rough-In'] },
            { id: 'act-019', name: 'Outdoor & Landscape', totalQty: categoryQty['Landscape'] || 0, productivity: 15, predecessors: ['Site Preparation'] },
            { id: 'act-020', name: 'Final Cleaning & Handover', totalQty: 1, productivity: 1, predecessors: ['Painting', 'Electrical Finishing', 'Plumbing Fixtures', 'Doors & Windows Installation', 'Fire Protection System'] }
        ];
    }
    allocateResources(def, labor, equipment) {
        const resources = [];
        const name = def.name.toLowerCase();
        if (name.includes('earthwork') || name.includes('excavation') || name.includes('foundation')) {
            const excavators = equipment.find(e => e.equipmentId === 'eq-001');
            if (excavators)
                resources.push({ resourceType: 'Equipment', resourceId: excavators.equipmentId, quantity: excavators.count, unit: 'unit' });
            const workers = labor.find(l => l.trade === 'ConcreteWorker');
            if (workers)
                resources.push({ resourceType: 'Labor', resourceId: workers.trade, quantity: workers.count, unit: 'worker' });
        }
        if (name.includes('structural') || name.includes('column') || name.includes('beam') || name.includes('slab')) {
            const carpenters = labor.find(l => l.trade === 'Carpenter');
            if (carpenters)
                resources.push({ resourceType: 'Labor', resourceId: carpenters.trade, quantity: carpenters.count, unit: 'worker' });
            const steel = labor.find(l => l.trade === 'SteelFixer');
            if (steel)
                resources.push({ resourceType: 'Labor', resourceId: steel.trade, quantity: steel.count, unit: 'worker' });
            const workers = labor.find(l => l.trade === 'ConcreteWorker');
            if (workers)
                resources.push({ resourceType: 'Labor', resourceId: workers.trade, quantity: workers.count, unit: 'worker' });
        }
        if (name.includes('block') || name.includes('partition')) {
            const masons = labor.find(l => l.trade === 'Mason');
            if (masons)
                resources.push({ resourceType: 'Labor', resourceId: masons.trade, quantity: masons.count, unit: 'worker' });
        }
        if (name.includes('plaster')) {
            const plasterers = labor.find(l => l.trade === 'Plasterer');
            if (plasterers)
                resources.push({ resourceType: 'Labor', resourceId: plasterers.trade, quantity: plasterers.count, unit: 'worker' });
        }
        if (name.includes('tiling') || name.includes('floor')) {
            const tilers = labor.find(l => l.trade === 'Tiler');
            if (tilers)
                resources.push({ resourceType: 'Labor', resourceId: tilers.trade, quantity: tilers.count, unit: 'worker' });
        }
        if (name.includes('paint')) {
            const painters = labor.find(l => l.trade === 'Painter');
            if (painters)
                resources.push({ resourceType: 'Labor', resourceId: painters.trade, quantity: painters.count, unit: 'worker' });
        }
        if (name.includes('electric') || name.includes('lighting') || name.includes('power')) {
            const electricians = labor.find(l => l.trade === 'Electrician');
            if (electricians)
                resources.push({ resourceType: 'Labor', resourceId: electricians.trade, quantity: electricians.count, unit: 'worker' });
        }
        if (name.includes('plumb') || name.includes('fixture')) {
            const plumbers = labor.find(l => l.trade === 'Plumber');
            if (plumbers)
                resources.push({ resourceType: 'Labor', resourceId: plumbers.trade, quantity: plumbers.count, unit: 'worker' });
        }
        if (name.includes('hvac')) {
            const hvac = labor.find(l => l.trade === 'HVAC');
            if (hvac)
                resources.push({ resourceType: 'Labor', resourceId: hvac.trade, quantity: hvac.count, unit: 'worker' });
        }
        if (name.includes('door') || name.includes('window')) {
            const carpenters = labor.find(l => l.trade === 'Carpenter');
            if (carpenters)
                resources.push({ resourceType: 'Labor', resourceId: carpenters.trade, quantity: carpenters.count, unit: 'worker' });
        }
        if (name.includes('fire')) {
            const fireTech = labor.find(l => l.trade === 'FireFightingTech');
            if (fireTech)
                resources.push({ resourceType: 'Labor', resourceId: fireTech.trade, quantity: fireTech.count, unit: 'worker' });
        }
        if (resources.length === 0) {
            resources.push({ resourceType: 'Labor', resourceId: 'General Laborer', quantity: 2, unit: 'worker' });
        }
        return resources;
    }
    topologicalSort(activities) {
        const visited = new Set();
        const sorted = [];
        const visiting = new Set();
        const activityMap = new Map(activities.map(a => [a.id, a]));
        const visit = (id) => {
            if (visiting.has(id))
                return false;
            if (visited.has(id))
                return true;
            visiting.add(id);
            const activity = activityMap.get(id);
            if (activity) {
                for (const predId of activity.predecessors) {
                    if (!visit(predId))
                        return false;
                }
                visiting.delete(id);
                visited.add(id);
                sorted.push(activity);
            }
            return true;
        };
        for (const activity of activities) {
            if (!visited.has(activity.id)) {
                if (!visit(activity.id))
                    return [];
            }
        }
        return sorted;
    }
}
exports.ScheduleEngine = ScheduleEngine;
//# sourceMappingURL=index.js.map