"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineeringReasoningEngine = void 0;
const core_1 = require("@acep/core");
const knowledge_base_1 = require("@acep/knowledge-base");
class EngineeringReasoningEngine extends core_1.BaseEngine {
    knowledgeGraph;
    ruleEngine;
    constructor(kg, rulesRegistry) {
        super('EngineeringReasoningEngine', '1.0.0');
        this.knowledgeGraph = kg;
        this.ruleEngine = new knowledge_base_1.RuleEngine(rulesRegistry, kg);
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('EngineeringReasoningEngine initialized');
    }
    async validate() {
        return true;
    }
    async reason(facts, knowledge) {
        this.setStatus('running');
        this.logger.info('Running reasoning rules on project facts');
        const traces = [];
        const evaluationResults = this.ruleEngine.evaluate(facts);
        for (const result of evaluationResults) {
            if (result.matched) {
                traces.push({
                    ruleId: result.ruleId,
                    facts: [JSON.stringify(facts)],
                    conditions: [],
                    matched: true,
                    actions: result.actions.map(a => ({
                        type: a.type,
                        target: a.target,
                        value: a.value,
                        confidence: result.confidence
                    })),
                    confidence: result.confidence,
                    timestamp: new Date().toISOString()
                });
            }
        }
        this.setStatus('idle');
        return traces;
    }
    async buildReasoningTree(facts) {
        this.logger.info('Building reasoning tree');
        const tree = {
            projectType: facts.projectType.value,
            nodes: []
        };
        if (facts.spaces) {
            for (const [spaceType, space] of Object.entries(facts.spaces)) {
                const node = {
                    type: 'Space',
                    name: spaceType,
                    count: space.count,
                    derivedItems: []
                };
                const relatedNodes = this.knowledgeGraph.getRelatedNodes(spaceType);
                node.derivedItems = relatedNodes.map(n => n.name);
                tree.nodes.push(node);
            }
        }
        return tree;
    }
    async detectLogicalErrors(facts) {
        this.logger.info('Detecting logical errors in project facts');
        const errors = [];
        if (facts.projectType.value === 'Apartment' && (facts.floors || 0) > 6) {
            errors.push({
                type: 'error',
                message: 'APARTMENT with more than 6 floors seems incorrect. Did you mean an Apartment Building?',
                severity: 'high',
                code: 'ERR-001',
                suggestion: 'Consider changing project type to Apartment Building or verify floor count'
            });
        }
        if (facts.landArea && facts.builtArea) {
            if (facts.builtArea.value > facts.landArea.value * 2) {
                errors.push({
                    type: 'warning',
                    message: `Built area (${facts.builtArea.value}m²) is more than double land area (${facts.landArea.value}m²). Verify floor count and areas.`,
                    severity: 'medium',
                    code: 'WARN-001',
                    suggestion: 'Review floor count and built area calculations'
                });
            }
        }
        if (facts.spaces && facts.spaces['Bedroom'] && facts.spaces['Bathroom']) {
            const beds = facts.spaces['Bedroom'].count;
            const baths = facts.spaces['Bathroom'].count;
            if (baths > beds + 2 && facts.projectType.value === 'Villa') {
                errors.push({
                    type: 'warning',
                    message: `Unusually high bathroom count (${baths}) for ${beds} bedrooms`,
                    severity: 'low',
                    code: 'WARN-002',
                    suggestion: 'Verify bathroom count is appropriate for the project type'
                });
            }
        }
        // Check for missing essential spaces based on project type
        if (facts.projectType.value === 'Villa' && facts.spaces) {
            if (!facts.spaces['Kitchen'] || facts.spaces['Kitchen'].count === 0) {
                errors.push({
                    type: 'error',
                    message: 'Villa project missing kitchen space',
                    severity: 'high',
                    code: 'ERR-002',
                    suggestion: 'Add at least one kitchen to the project'
                });
            }
        }
        return errors;
    }
    async suggestAlternatives(context) {
        this.logger.info('Suggesting alternative construction methods and materials');
        const alternatives = [
            {
                for: 'Flooring',
                options: [
                    { name: 'Ceramic Tiles', cost: 'Low', lifespan: '15 years', maintenance: 'Easy', sustainability: 'Medium', thermalConductivity: '1.5 W/mK' },
                    { name: 'Marble', cost: 'High', lifespan: '30 years', maintenance: 'Medium', sustainability: 'Low', thermalConductivity: '2.5 W/mK' },
                    { name: 'Vinyl', cost: 'Very Low', lifespan: '10 years', maintenance: 'Easy', sustainability: 'Medium', thermalConductivity: '0.5 W/mK' },
                    { name: 'Epoxy', cost: 'Medium', lifespan: '20 years', maintenance: 'Easy', sustainability: 'Low', thermalConductivity: '0.8 W/mK' },
                    { name: 'Polished Concrete', cost: 'Low', lifespan: '25 years', maintenance: 'Medium', sustainability: 'High', thermalConductivity: '1.2 W/mK' }
                ]
            },
            {
                for: 'Wall Construction',
                options: [
                    { name: 'Cement Block', cost: 'Low', insulation: 'Medium', speed: 'Medium', sustainability: 'Medium', fireRating: '2 hours' },
                    { name: 'AAC Block', cost: 'Medium', insulation: 'High', speed: 'Fast', sustainability: 'High', fireRating: '4 hours' },
                    { name: 'Precast Concrete', cost: 'High', insulation: 'Medium', speed: 'Very Fast', sustainability: 'Medium', fireRating: '3 hours' },
                    { name: 'ICF', cost: 'Medium-High', insulation: 'Very High', speed: 'Fast', sustainability: 'High', fireRating: '4 hours' }
                ]
            },
            {
                for: 'Ceiling',
                options: [
                    { name: 'Suspended Gypsum', cost: 'Medium', access: 'Easy', finish: 'Excellent', acoustic: 'Good', fireRating: '1 hour' },
                    { name: 'Exposed', cost: 'Low', access: 'Excellent', finish: 'Industrial', acoustic: 'Poor', fireRating: '2 hours' },
                    { name: 'False Ceiling', cost: 'Medium', access: 'Medium', finish: 'Good', acoustic: 'Medium', fireRating: '1 hour' },
                    { name: 'Acoustic Tiles', cost: 'High', access: 'Easy', finish: 'Good', acoustic: 'Excellent', fireRating: '1 hour' }
                ]
            }
        ];
        return alternatives;
    }
    async calculateConfidenceScore(facts) {
        const breakdown = {
            projectType: facts.projectType.confidence,
            spaces: Object.values(facts.spaces || {}).reduce((sum, s) => sum + (s.confidence || 0.5), 0) / (Object.keys(facts.spaces || {}).length || 1),
            completeness: this.calculateCompleteness(facts)
        };
        const overall = (breakdown.projectType * 0.4 + breakdown.spaces * 0.4 + breakdown.completeness * 0.2);
        return { overall, breakdown };
    }
    calculateCompleteness(facts) {
        let score = 0;
        let total = 0;
        if (facts.projectType.value) {
            score += 1;
            total += 1;
        }
        if (facts.floors) {
            score += 1;
            total += 1;
        }
        if (facts.spaces && Object.keys(facts.spaces).length > 0) {
            score += 1;
            total += 1;
        }
        if (facts.landArea) {
            score += 1;
            total += 1;
        }
        if (facts.builtArea) {
            score += 1;
            total += 1;
        }
        if (facts.location) {
            score += 1;
            total += 1;
        }
        return total > 0 ? score / total : 0;
    }
}
exports.EngineeringReasoningEngine = EngineeringReasoningEngine;
//# sourceMappingURL=index.js.map