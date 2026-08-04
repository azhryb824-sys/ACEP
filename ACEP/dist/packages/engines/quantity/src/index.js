"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuantityEngine = void 0;
const core_1 = require("@acep/core");
class QuantityEngine extends core_1.BaseEngine {
    knowledgeGraph;
    quantityRulesLib;
    equationsLib;
    constructor(kg, qtyLib, eqLib) {
        super('QuantityEngine', '1.0.0');
        this.knowledgeGraph = kg;
        this.quantityRulesLib = qtyLib;
        this.equationsLib = eqLib;
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('QuantityEngine initialized');
    }
    async validate() {
        return true;
    }
    async calculate(building, boq) {
        this.setStatus('running');
        this.logger.info('Calculating quantities for BOQ items');
        for (const item of boq.items) {
            const calculatedQuantity = await this.calculateByFormula(item, building);
            if (calculatedQuantity > 0) {
                item.quantity = Math.round(calculatedQuantity * 100) / 100;
                item.totalPrice = Math.round(item.quantity * item.unitPrice * 100) / 100;
                item.confidence = Math.min(item.confidence + 0.1, 1.0);
            }
        }
        boq.summary = this.recalculateSummary(boq.items);
        boq.metadata.updatedAt = new Date().toISOString();
        this.setStatus('idle');
        return boq;
    }
    async calculateByFormula(item, building) {
        const formula = this.quantityRulesLib.getFormula(item.code);
        if (!formula) {
            return this.calculateDefault(item, building);
        }
        return this.evaluateFormula(formula, item, building);
    }
    async getCalculationTrace(itemId) {
        return {
            itemId,
            steps: [],
            timestamp: new Date().toISOString()
        };
    }
    async detectOutliers(quantities) {
        const qtyValues = quantities.map(q => q.quantity);
        if (qtyValues.length < 3)
            return [];
        const mean = qtyValues.reduce((s, v) => s + v, 0) / qtyValues.length;
        const variance = qtyValues.reduce((s, v) => s + (v - mean) ** 2, 0) / qtyValues.length;
        const stdDev = Math.sqrt(variance);
        const outliers = [];
        const items = quantities;
        for (const item of items) {
            const zScore = Math.abs((item.quantity - mean) / (stdDev || 1));
            if (zScore > 3) {
                outliers.push({
                    code: item.code,
                    quantity: item.quantity,
                    zScore,
                    reason: `Quantity deviates significantly from mean (${mean.toFixed(2)})`
                });
            }
        }
        return outliers;
    }
    async validateQuantities(boq) {
        const issues = [];
        for (const item of boq.items) {
            if (item.quantity <= 0 && item.level === 'Required') {
                issues.push({
                    code: item.code,
                    issue: 'Required item has zero quantity',
                    severity: 'error'
                });
            }
            const formula = this.quantityRulesLib.getFormula(item.code);
            if (!formula && item.category === 'Concrete') {
                issues.push({
                    code: item.code,
                    issue: 'No quantity formula found for concrete item',
                    severity: 'warning'
                });
            }
            if (item.quantity > 10000 && item.unit === 'm²') {
                issues.push({
                    code: item.code,
                    issue: 'Unusually large quantity detected',
                    severity: 'warning'
                });
            }
        }
        return issues;
    }
    evaluateFormula(formula, item, building) {
        const totalArea = building.skeleton.numFloors * (building.spaces.length > 0
            ? building.spaces.reduce((s, sp) => s + sp.area, 0) / building.spaces.length
            : 100);
        const vars = {
            length: 50,
            width: 20,
            height: 3,
            depth: 2,
            wallLength: 50,
            wallHeight: 3,
            wallArea: totalArea,
            floorArea: totalArea / building.skeleton.numFloors,
            ceilingArea: totalArea / building.skeleton.numFloors,
            surfaceArea: totalArea * 3,
            openings: totalArea * 0.15,
            openingsArea: totalArea * 0.15,
            volume: totalArea * 0.3,
            concreteVolume: totalArea * 0.3,
            reinforcementRatio: 0.1,
            steelDensity: 7850,
            slabArea: totalArea / building.skeleton.numFloors,
            slabThickness: 0.2,
            roomArea: totalArea / building.skeleton.numFloors / Math.max(building.spaces.length, 1),
            layers: 2,
            consumptionRate: 0.1,
            wasteFactor: item.wasteFactor || 0.05,
            wallArea_minus_openings: totalArea * 0.85,
            blockCoverage: 0.12,
            element_length: 5,
            element_width: 0.3,
            element_height: 0.5,
            colWidth: 0.3,
            colDepth: 0.5,
            colHeight: 3,
            columnCount: 20,
            coolingLoadPerMeter: 500,
            flowRate: 0.01,
            velocity: 2,
            lightingLoad: 10,
            powerLoad: 20,
            hvacLoad: 30,
            quantity: totalArea * 0.25,
            dailyProductivity: 10,
            workingHours: 8,
            availableHours: 10,
            materialCost: 100000,
            laborCost: 50000,
            equipmentCost: 25000,
            indirectCost: 20000,
            riskContingency: 10000,
            profit: 30000,
            taxes: 15000,
            paintLayers: 2,
            wallArea_real: totalArea * 3 * 0.8,
            acCapacity: 3,
            excavationVolume: totalArea * 0.5,
            block_area: 0.12
        };
        try {
            const result = this.safeEval(formula, vars);
            return isFinite(result) && result > 0 ? result : 0;
        }
        catch {
            return 0;
        }
    }
    safeEval(formula, vars) {
        const sanitized = formula
            .replace(/pi/g, String(Math.PI))
            .replace(/sqrt\(/g, 'Math.sqrt(')
            .replace(/pow\(/g, 'Math.pow(')
            .replace(/abs\(/g, 'Math.abs(')
            .replace(/ceil\(/g, 'Math.ceil(')
            .replace(/floor\(/g, 'Math.floor(')
            .replace(/round\(/g, 'Math.round(')
            .replace(/min\(/g, 'Math.min(')
            .replace(/max\(/g, 'Math.max(');
        const fn = new Function(...Object.keys(vars), `return ${sanitized};`);
        return fn(...Object.values(vars));
    }
    calculateDefault(item, building) {
        const totalArea = building.skeleton.numFloors * 100;
        switch (item.category) {
            case 'EarthWork': return totalArea * 0.3;
            case 'Concrete': return totalArea * 0.25;
            case 'Reinforcement': return totalArea * 0.025;
            case 'Block': return totalArea * 2.5;
            case 'Plaster': return totalArea * 2;
            case 'Paint': return totalArea * 2 * 2 * 1.05;
            case 'Ceramic': return totalArea * 0.3 * 1.08;
            case 'Marble': return totalArea * 0.1;
            case 'Waterproofing': return totalArea * 0.2;
            case 'Ceiling': return totalArea / building.skeleton.numFloors;
            case 'Electrical': return totalArea * 0.15;
            case 'Lighting': return totalArea * 0.1;
            case 'Power': return totalArea * 0.08;
            case 'Plumbing': return totalArea * 0.12;
            case 'Drainage': return totalArea * 0.1;
            case 'HVAC': return building.spaces.filter(s => s.type === 'Bedroom' || s.type === 'LivingRoom').length;
            case 'FireFighting': return totalArea > 300 ? Math.ceil(totalArea / 50) : 0;
            case 'FireAlarm': return Math.ceil(totalArea / 30);
            case 'Doors': return building.spaces.length + 2;
            case 'Windows': return building.spaces.filter(s => s.type !== 'Bathroom' && s.type !== 'Storage').length;
            default: return item.quantity || 1;
        }
    }
    recalculateSummary(items) {
        return {
            totalItems: items.length,
            confirmedItems: items.filter(i => i.confidence >= 0.9).length,
            derivedItems: items.filter(i => i.confidence >= 0.7 && i.confidence < 0.9).length,
            suggestedItems: items.filter(i => i.level === 'Optional').length,
            conditionalItems: items.filter(i => i.level === 'Conditional').length,
            optionalItems: items.filter(i => i.level === 'Suggested').length,
            missingItems: 0,
            totalCost: items.reduce((s, i) => s + i.totalPrice, 0),
            totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
            confidence: items.length > 0 ? items.reduce((s, i) => s + i.confidence, 0) / items.length : 0
        };
    }
}
exports.QuantityEngine = QuantityEngine;
//# sourceMappingURL=index.js.map