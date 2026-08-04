"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructionMethodEngine = void 0;
const core_1 = require("@acep/core");
class ConstructionMethodEngine extends core_1.BaseEngine {
    knowledgeGraph;
    equationsLib;
    materialLib;
    laborLib;
    constructor(kg, eqLib, matLib, labLib) {
        super('ConstructionMethodEngine', '1.0.0');
        this.knowledgeGraph = kg;
        this.equationsLib = eqLib;
        this.materialLib = matLib;
        this.laborLib = labLib;
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('ConstructionMethodEngine initialized');
    }
    async validate() {
        return true;
    }
    async getMethods(activity) {
        this.logger.info(`Getting construction methods for: ${activity}`);
        const methodMap = {
            'Foundation': [
                { id: 'method-fdn-1', name: 'Isolated Footing', method: core_1.ConstructionMethod.Traditional, cost: 'Low', speed: 'Medium', quality: 'Good', suitableFor: ['Villa', 'Apartment', 'Small Building'] },
                { id: 'method-fdn-2', name: 'Raft Foundation', method: core_1.ConstructionMethod.Traditional, cost: 'High', speed: 'Slow', quality: 'Excellent', suitableFor: ['Weak Soil', 'Large Building', 'Tower'] },
                { id: 'method-fdn-3', name: 'Pile Foundation', method: core_1.ConstructionMethod.Traditional, cost: 'Very High', speed: 'Slow', quality: 'Excellent', suitableFor: ['Tower', 'Bridge', 'Weak Soil'] }
            ],
            'Wall Construction': [
                { id: 'method-wall-1', name: 'Cement Block', method: core_1.ConstructionMethod.Traditional, cost: 'Low', speed: 'Medium', insulation: 'Medium', suitableFor: ['All Types'] },
                { id: 'method-wall-2', name: 'AAC Block', method: core_1.ConstructionMethod.AAC, cost: 'Medium', speed: 'Fast', insulation: 'High', suitableFor: ['Villa', 'Apartment', 'Hotel'] },
                { id: 'method-wall-3', name: 'Precast Panel', method: core_1.ConstructionMethod.Precast, cost: 'High', speed: 'Very Fast', insulation: 'High', suitableFor: ['Large Project', 'Tower', 'Warehouse'] },
                { id: 'method-wall-4', name: 'ICF', method: core_1.ConstructionMethod.ICF, cost: 'Medium-High', speed: 'Fast', insulation: 'Very High', suitableFor: ['Villa', 'Cold Climate'] }
            ],
            'Slab Construction': [
                { id: 'method-slab-1', name: 'Flat Slab', method: core_1.ConstructionMethod.FlatSlab, cost: 'Medium', speed: 'Fast', span: 'Medium', suitableFor: ['Apartment', 'Office'] },
                { id: 'method-slab-2', name: 'Ribbed Slab', method: core_1.ConstructionMethod.RibbedSlab, cost: 'Medium', speed: 'Medium', span: 'Long', suitableFor: ['Parking', 'Warehouse'] },
                { id: 'method-slab-3', name: 'Post Tension', method: core_1.ConstructionMethod.PostTension, cost: 'High', speed: 'Medium', span: 'Very Long', suitableFor: ['Bridge', 'Parking', 'Large Span'] },
                { id: 'method-slab-4', name: 'Precast Hollow Core', method: core_1.ConstructionMethod.HollowCore, cost: 'Medium', speed: 'Very Fast', span: 'Long', suitableFor: ['Parking', 'Warehouse', 'School'] }
            ],
            'Roof Construction': [
                { id: 'method-roof-1', name: 'Reinforced Concrete Roof', method: core_1.ConstructionMethod.Traditional, cost: 'Medium', speed: 'Slow', waterproofing: 'Required' },
                { id: 'method-roof-2', name: 'Steel Truss Roof', method: core_1.ConstructionMethod.SteelFrame, cost: 'Medium', speed: 'Fast', waterproofing: 'Required', suitableFor: ['Warehouse', 'Factory', 'Large Span'] },
                { id: 'method-roof-3', name: 'Precast Roof Panel', method: core_1.ConstructionMethod.Precast, cost: 'High', speed: 'Very Fast', waterproofing: 'Required' }
            ]
        };
        const key = Object.keys(methodMap).find(k => activity.toLowerCase().includes(k.toLowerCase()));
        return methodMap[key || 'Wall Construction'] || [];
    }
    async evaluateMethods(methods, constraints) {
        this.logger.info('Evaluating construction methods against constraints');
        const cons = constraints || {};
        return methods.map(m => {
            let score = 0;
            if (cons.budget === 'Low' && m.cost === 'Low')
                score += 3;
            if (cons.budget === 'Medium' && (m.cost === 'Low' || m.cost === 'Medium'))
                score += 2;
            if (cons.schedule === 'Fast' && (m.speed === 'Fast' || m.speed === 'Very Fast'))
                score += 3;
            if (cons.schedule === 'Normal' && m.speed !== 'Slow')
                score += 2;
            if (cons.quality === 'High' && (m.quality === 'Excellent' || m.quality === 'Good'))
                score += 3;
            if (cons.insulation === 'Required' && (m.insulation === 'High' || m.insulation === 'Very High'))
                score += 2;
            return { ...m, evaluationScore: score, recommendation: score >= 5 ? 'Recommended' : score >= 3 ? 'Consider' : 'Not Recommended' };
        }).sort((a, b) => b.evaluationScore - a.evaluationScore);
    }
    async compareMethods(methods) {
        const items = methods;
        if (items.length === 0)
            return { comparison: [] };
        const criteria = ['cost', 'speed', 'quality', 'insulation', 'span'];
        const comparison = items.map(m => {
            const scores = {};
            for (const c of criteria) {
                const val = m[c];
                if (val === 'Very Low' || val === 'Very Fast' || val === 'Very Long')
                    scores[c] = 5;
                else if (val === 'Low' || val === 'Fast' || val === 'Long')
                    scores[c] = 4;
                else if (val === 'Medium')
                    scores[c] = 3;
                else if (val === 'High' || val === 'Slow')
                    scores[c] = 2;
                else if (val === 'Very High' || val === 'Very Slow')
                    scores[c] = 1;
                else
                    scores[c] = 0;
            }
            return { name: m.name, scores, totalScore: Object.values(scores).reduce((a, b) => a + b, 0) };
        }).sort((a, b) => b.totalScore - a.totalScore);
        return {
            comparison,
            bestOption: comparison[0]?.name || 'None',
            worstOption: comparison[comparison.length - 1]?.name || 'None'
        };
    }
    async selectMethod(methods, preferences) {
        const pref = preferences || {};
        const evaluated = await this.evaluateMethods(methods, preferences);
        if (evaluated.length === 0)
            return null;
        const topMethods = evaluated;
        const selected = topMethods[0];
        return {
            selected: selected,
            reasoning: `Selected "${selected.name}" based on ${pref.budget || 'medium'} budget, ${pref.schedule || 'normal'} schedule, and ${pref.quality || 'standard'} quality requirements`,
            alternatives: topMethods.slice(1, 3).map(m => m.name),
            confidence: Math.min(0.5 + (selected.evaluationScore || 0) * 0.1, 0.95)
        };
    }
}
exports.ConstructionMethodEngine = ConstructionMethodEngine;
//# sourceMappingURL=index.js.map