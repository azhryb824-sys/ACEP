"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBaseManager = void 0;
const KnowledgeGraph_1 = require("./graph/KnowledgeGraph");
const RuleDefinition_1 = require("./rules/RuleDefinition");
const RuleEngine_1 = require("./rules/RuleEngine");
const MaterialLibrary_1 = require("./libraries/MaterialLibrary");
const LaborLibrary_1 = require("./libraries/LaborLibrary");
const EquipmentLibrary_1 = require("./libraries/EquipmentLibrary");
const ProjectTypesLibrary_1 = require("./libraries/ProjectTypesLibrary");
const SpacesLibrary_1 = require("./libraries/SpacesLibrary");
const BOQItemsLibrary_1 = require("./libraries/BOQItemsLibrary");
const QuantityRulesLibrary_1 = require("./libraries/QuantityRulesLibrary");
const EngineeringEquationsLibrary_1 = require("./libraries/EngineeringEquationsLibrary");
class KnowledgeBaseManager {
    graph;
    ruleEngine;
    rulesRegistry;
    materials;
    labors;
    equipment;
    projectTypes;
    spaces;
    boqItems;
    quantityRules;
    equations;
    version = '1.0.0';
    initialized = false;
    constructor() {
        this.graph = new KnowledgeGraph_1.KnowledgeGraph();
        this.rulesRegistry = new RuleDefinition_1.RulesRegistry();
        this.ruleEngine = new RuleEngine_1.RuleEngine(this.rulesRegistry, this.graph);
        this.materials = new MaterialLibrary_1.MaterialLibrary();
        this.labors = new LaborLibrary_1.LaborLibrary();
        this.equipment = new EquipmentLibrary_1.EquipmentLibrary();
        this.projectTypes = new ProjectTypesLibrary_1.ProjectTypesLibrary();
        this.spaces = new SpacesLibrary_1.SpacesLibrary();
        this.boqItems = new BOQItemsLibrary_1.BOQItemsLibrary();
        this.quantityRules = new QuantityRulesLibrary_1.QuantityRulesLibrary();
        this.equations = new EngineeringEquationsLibrary_1.EngineeringEquationsLibrary();
    }
    initialize() {
        if (this.initialized)
            return;
        this.materials.initializeDefaults();
        this.labors.initializeDefaults();
        this.equipment.initializeDefaults();
        this.projectTypes.initializeDefaults();
        this.spaces.initializeDefaults();
        this.boqItems.initializeDefaults();
        this.quantityRules.initializeDefaults();
        this.equations.initializeDefaults();
        this.rulesRegistry.initializeDefaults();
        this.buildKnowledgeGraph();
        this.initialized = true;
    }
    buildKnowledgeGraph() {
        for (const pt of this.projectTypes.getAll()) {
            this.graph.addNode({
                id: pt.type,
                type: 'Project',
                name: pt.name,
                nameAr: pt.nameAr,
                properties: { typicalSpaces: pt.typicalSpaces, typicalSystems: pt.typicalSystems },
                metadata: { version: '1.0.0', created: new Date().toISOString(), updated: new Date().toISOString(), status: 'active', confidence: 1.0 }
            });
        }
        for (const space of this.spaces.getAll()) {
            this.graph.addNode({
                id: space.type,
                type: 'Space',
                name: space.name,
                nameAr: space.nameAr,
                properties: { area: space.typicalArea, requiresWaterproofing: space.requiresWaterproofing },
                metadata: { version: '1.0.0', created: new Date().toISOString(), updated: new Date().toISOString(), status: 'active', confidence: 1.0 }
            });
        }
        for (const item of this.boqItems.getAll()) {
            this.graph.addNode({
                id: item.id,
                type: 'BOQItem',
                name: item.description,
                nameAr: item.descriptionAr,
                properties: { category: item.category, unit: item.unit, waste: item.defaultWaste },
                metadata: { version: '1.0.0', created: new Date().toISOString(), updated: new Date().toISOString(), status: 'active', confidence: 1.0 }
            });
        }
        for (const pt of this.projectTypes.getAll()) {
            for (const spaceType of pt.typicalSpaces) {
                this.graph.addEdge(pt.type, spaceType, 'HAS', { strength: 1.0, reason: `${pt.name} standard space`, version: '1.0.0', bidirectional: false, confidence: 1.0 });
            }
        }
        for (const item of this.boqItems.getAll()) {
            for (const spaceType of item.requiredSpaces) {
                this.graph.addEdge(spaceType, item.id, 'REQUIRES', { strength: 1.0, reason: `${spaceType} requires ${item.description}`, version: '1.0.0', bidirectional: false, confidence: 1.0 });
            }
            for (const spaceType of item.optionalSpaces) {
                this.graph.addEdge(spaceType, item.id, 'OPTIONALLY_REQUIRES', { strength: 0.5, reason: `${spaceType} optionally requires ${item.description}`, version: '1.0.0', bidirectional: false, confidence: 0.5 });
            }
        }
    }
    getVersion() { return this.version; }
    query(entity) {
        return this.graph.findNodesByName(entity);
    }
    getRelations(entity) {
        const nodes = this.graph.findNodesByName(entity);
        if (nodes.length === 0)
            return [];
        return this.graph.getOutgoingEdges(nodes[0].id);
    }
    refresh() {
        this.initialized = false;
        this.graph.clear();
        this.initialize();
    }
    getStats() {
        return {
            nodes: this.graph.getNodeCount(),
            edges: this.graph.getEdgeCount(),
            initialized: this.initialized,
            version: this.version
        };
    }
}
exports.KnowledgeBaseManager = KnowledgeBaseManager;
//# sourceMappingURL=KnowledgeBaseManager.js.map