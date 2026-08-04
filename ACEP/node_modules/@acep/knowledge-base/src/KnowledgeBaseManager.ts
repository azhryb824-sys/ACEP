import { KnowledgeGraph } from './graph/KnowledgeGraph';
import { RulesRegistry } from './rules/RuleDefinition';
import { RuleEngine } from './rules/RuleEngine';
import { MaterialLibrary } from './libraries/MaterialLibrary';
import { LaborLibrary } from './libraries/LaborLibrary';
import { EquipmentLibrary } from './libraries/EquipmentLibrary';
import { ProjectTypesLibrary } from './libraries/ProjectTypesLibrary';
import { SpacesLibrary } from './libraries/SpacesLibrary';
import { BOQItemsLibrary } from './libraries/BOQItemsLibrary';
import { QuantityRulesLibrary } from './libraries/QuantityRulesLibrary';
import { EngineeringEquationsLibrary } from './libraries/EngineeringEquationsLibrary';

export class KnowledgeBaseManager {
  public readonly graph: KnowledgeGraph;
  public readonly ruleEngine: RuleEngine;
  public readonly rulesRegistry: RulesRegistry;
  public readonly materials: MaterialLibrary;
  public readonly labors: LaborLibrary;
  public readonly equipment: EquipmentLibrary;
  public readonly projectTypes: ProjectTypesLibrary;
  public readonly spaces: SpacesLibrary;
  public readonly boqItems: BOQItemsLibrary;
  public readonly quantityRules: QuantityRulesLibrary;
  public readonly equations: EngineeringEquationsLibrary;

  private version: string = '1.0.0';
  private initialized: boolean = false;

  constructor() {
    this.graph = new KnowledgeGraph();
    this.rulesRegistry = new RulesRegistry();
    this.ruleEngine = new RuleEngine(this.rulesRegistry, this.graph);
    this.materials = new MaterialLibrary();
    this.labors = new LaborLibrary();
    this.equipment = new EquipmentLibrary();
    this.projectTypes = new ProjectTypesLibrary();
    this.spaces = new SpacesLibrary();
    this.boqItems = new BOQItemsLibrary();
    this.quantityRules = new QuantityRulesLibrary();
    this.equations = new EngineeringEquationsLibrary();
  }

  initialize(): void {
    if (this.initialized) return;

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

  private buildKnowledgeGraph(): void {
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

  getVersion(): string { return this.version; }

  query(entity: string): unknown {
    return this.graph.findNodesByName(entity);
  }

  getRelations(entity: string): unknown[] {
    const nodes = this.graph.findNodesByName(entity);
    if (nodes.length === 0) return [];
    return this.graph.getOutgoingEdges(nodes[0].id);
  }

  refresh(): void {
    this.initialized = false;
    this.graph.clear();
    this.initialize();
  }

  getStats(): { nodes: number; edges: number; initialized: boolean; version: string } {
    return {
      nodes: this.graph.getNodeCount(),
      edges: this.graph.getEdgeCount(),
      initialized: this.initialized,
      version: this.version
    };
  }
}
