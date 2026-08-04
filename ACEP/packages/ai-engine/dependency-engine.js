/**
 * ACEP Dependency Engine
 *
 * A comprehensive element dependency graph that extends EngineeringGraph
 * and KnowledgeGraph to cover ALL building elements:
 *   - Structure (foundations, columns, beams, slabs)
 *   - MEP (mechanical, electrical, plumbing)
 *   - Finishing (flooring, painting, ceilings)
 *   - Non-BOQ items (images, navigation, cost inputs)
 *
 * Uses:
 *   - EngineeringGraph: existing BOQ dependency chains
 *   - KnowledgeGraph: existing element relationship network
 *   - EDL: for traceability
 */
class DependencyEngine {
  constructor(options = {}) {
    this.engineeringGraph = options.engineeringGraph || null;
    this.knowledgeGraph = options.knowledgeGraph || null;
    this.edl = options.edl || null;
    this._dependencyGraph = new Map();
    this._initializeDefaultDependencies();
  }

  /**
   * Register a dependency: parent must complete before child starts.
   */
  register(parentId, childId, metadata = {}) {
    if (!this._dependencyGraph.has(childId)) {
      this._dependencyGraph.set(childId, { id: childId, dependencies: [], dependents: [], metadata: {} });
    }
    if (!this._dependencyGraph.has(parentId)) {
      this._dependencyGraph.set(parentId, { id: parentId, dependencies: [], dependents: [], metadata: {} });
    }

    const child = this._dependencyGraph.get(childId);
    if (!child.dependencies.includes(parentId)) {
      child.dependencies.push(parentId);
    }

    const parent = this._dependencyGraph.get(parentId);
    if (!parent.dependents.includes(childId)) {
      parent.dependents.push(childId);
    }

    return this;
  }

  /**
   * Get all dependencies for an element (things it depends on).
   */
  getDependencies(elementId) {
    return this._dependencyGraph.get(elementId)?.dependencies || [];
  }

  /**
   * Get all dependents (things that depend on this element).
   */
  getDependents(elementId) {
    return this._dependencyGraph.get(elementId)?.dependents || [];
  }

  /**
   * Get the full transitive dependency chain (in order).
   */
  getChain(elementId) {
    const visited = new Set();
    const chain = [];

    const traverse = (id) => {
      if (visited.has(id)) return;
      visited.add(id);
      const node = this._dependencyGraph.get(id);
      if (node) {
        for (const depId of node.dependencies) {
          traverse(depId);
        }
        chain.push(id);
      }
    };

    traverse(elementId);
    return chain;
  }

  /**
   * Get the transitive closure of dependents (all elements affected if this changes).
   */
  getAffected(elementId) {
    const visited = new Set();
    const affected = [];

    const traverse = (id) => {
      if (visited.has(id)) return;
      visited.add(id);
      const node = this._dependencyGraph.get(id);
      if (node) {
        for (const depId of node.dependents) {
          affected.push(depId);
          traverse(depId);
        }
      }
    };

    traverse(elementId);
    return affected;
  }

  /**
   * Build complete dependency graph from project data.
   */
  buildFromProject(project) {
    if (!project) return this;

    // 1. Import EngineeringGraph chains
    if (this.engineeringGraph && project.boq?.items) {
      this._importEngineeringGraph(project);
    }

    // 2. Import KnowledgeGraph relationships
    if (this.knowledgeGraph) {
      this._importKnowledgeGraph(project);
    }

    // 3. Build from BOQ items (structural logic)
    this._buildStructuralDependencies(project);

    // 4. Build MEP dependencies
    this._buildMEPDependencies(project);

    // 5. Build finishing dependencies
    this._buildFinishingDependencies(project);

    // 6. Build cross-model dependencies (non-BOQ)
    this._buildCrossModelDependencies(project);

    return this;
  }

  /**
   * Detect cycles in the dependency graph.
   */
  detectCycles() {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map();
    const cycles = [];

    for (const id of this._dependencyGraph.keys()) color.set(id, WHITE);

    const dfs = (nodeId, stack) => {
      color.set(nodeId, GRAY);
      const node = this._dependencyGraph.get(nodeId);
      for (const depId of node.dependencies) {
        if (color.get(depId) === GRAY) {
          const cyclePath = [...stack.slice(stack.indexOf(depId)), depId];
          cycles.push(cyclePath);
          continue;
        }
        if (color.get(depId) === WHITE) {
          dfs(depId, [...stack, depId]);
        }
      }
      color.set(nodeId, BLACK);
    };

    for (const id of this._dependencyGraph.keys()) {
      if (color.get(id) === WHITE) dfs(id, [id]);
    }

    return cycles;
  }

  /**
   * Topological sort of all registered elements.
   */
  topologicalSort() {
    const visited = new Set();
    const order = [];

    const visit = (id) => {
      if (visited.has(id)) return;
      visited.add(id);
      const node = this._dependencyGraph.get(id);
      if (node) {
        for (const depId of node.dependencies) {
          visit(depId);
        }
        order.push(id);
      }
    };

    for (const id of this._dependencyGraph.keys()) visit(id);
    return order;
  }

  /**
   * Find elements that have no dependencies (roots).
   */
  getRootElements() {
    const roots = [];
    for (const [id, node] of this._dependencyGraph) {
      if (node.dependencies.length === 0) roots.push(id);
    }
    return roots;
  }

  /**
   * Find elements that nothing depends on (leaves).
   */
  getLeafElements() {
    const leaves = [];
    for (const [id, node] of this._dependencyGraph) {
      if (node.dependents.length === 0) leaves.push(id);
    }
    return leaves;
  }

  /**
   * Report the full dependency structure as a human-readable tree.
   */
  report() {
    const roots = this.getRootElements();
    const lines = [];
    lines.push(`Dependency Engine Report — ${this._dependencyGraph.size} elements`);

    const printTree = (id, depth) => {
      const node = this._dependencyGraph.get(id);
      const prefix = '  '.repeat(depth);
      const deps = node.dependencies.length > 0 ? ` ← ${node.dependencies.join(', ')}` : '';
      lines.push(`${prefix}${id}${deps}`);
      for (const depId of node.dependents) {
        printTree(depId, depth + 1);
      }
    };

    for (const root of roots) {
      printTree(root, 0);
    }

    // Stats
    const cycles = this.detectCycles();
    lines.push('');
    lines.push(`Total elements: ${this._dependencyGraph.size}`);
    lines.push(`Root elements: ${roots.length}`);
    lines.push(`Leaf elements: ${this.getLeafElements().length}`);
    lines.push(`Cycles: ${cycles.length > 0 ? cycles.length + ' detected' : 'None'}`);

    return lines.join('\n');
  }

  _initializeDefaultDependencies() {
    // Standard construction dependencies (Arabic-friendly)
    const defaultDeps = [
      // Site → Foundation
      ['site_preparation', 'foundation'],
      ['site_preparation', 'excavation'],
      ['excavation', 'foundation'],
      // Foundation → Structure
      ['foundation', 'columns'],
      ['foundation', 'retaining_walls'],
      ['columns', 'beams'],
      ['beams', 'slabs'],
      ['slabs', 'roof'],
      // Structure → MEP
      ['columns', 'electrical_conduits'],
      ['slabs', 'plumbing_pipes'],
      ['walls', 'electrical_wiring'],
      ['walls', 'plumbing_pipes'],
      // Structure → Finishing
      ['walls', 'plastering'],
      ['walls', 'painting'],
      ['slabs', 'flooring'],
      ['ceiling', 'ceiling_finishing'],
      // MEP → Finishing
      ['electrical_wiring', 'painting'],
      ['plumbing_pipes', 'flooring'],
      ['electrical_conduits', 'ceiling_finishing'],
      // Inspections
      ['foundation', 'foundation_inspection'],
      ['columns', 'structure_inspection'],
      ['electrical_wiring', 'electrical_inspection'],
      ['plumbing_pipes', 'plumbing_inspection'],
    ];

    for (const [parent, child] of defaultDeps) {
      this.register(parent, child, { source: 'default', type: 'construction' });
    }
  }

  _importEngineeringGraph(project) {
    const chains = this.engineeringGraph.dependencyChains || {};
    for (const [itemCode, chain] of Object.entries(chains)) {
      const deps = chain.dependsOn || [];
      if (deps.length === 0) continue;
      for (const depCode of deps) {
        this.register(`boq:${depCode}`, `boq:${itemCode}`, {
          source: 'engineering_graph',
          chainType: chain.type || 'boq',
          name: chain.name || itemCode,
        });
      }
    }
  }

  _importKnowledgeGraph(project) {
    const relationships = this.knowledgeGraph?.relationships || [];
    for (const rel of relationships) {
      const weight = rel.weight || rel.strength || 1;
      if (weight > 0.3) {
        this.register(
          `element:${rel.from}`,
          `element:${rel.to}`,
          { source: 'knowledge_graph', weight, type: rel.type || 'relationship' }
        );
      }
    }
  }

  _buildStructuralDependencies(project) {
    const boqItems = project.boq?.items || [];
    const phase = project.getEffective?.('phase').value || project.phase;

    // Foundation items before column items
    const foundationItems = boqItems.filter(i =>
      (i.category || '').toLowerCase().includes('foundation') ||
      (i.name || '').toLowerCase().includes('footing') ||
      (i.name || '').toLowerCase().includes('قواعد')
    );
    const columnItems = boqItems.filter(i =>
      (i.category || '').toLowerCase().includes('column') ||
      (i.name || '').toLowerCase().includes('column') ||
      (i.name || '').toLowerCase().includes('أعمدة')
    );
    const slabItems = boqItems.filter(i =>
      (i.category || '').toLowerCase().includes('slab') ||
      (i.name || '').toLowerCase().includes('slab') ||
      (i.name || '').toLowerCase().includes('بلاطة')
    );

    for (const fi of foundationItems) {
      for (const ci of columnItems) {
        this.register(`boq:${fi.code || fi.id || fi.name}`, `boq:${ci.code || ci.id || ci.name}`, { source: 'structural', type: 'foundation_to_column' });
      }
    }
    for (const ci of columnItems) {
      for (const si of slabItems) {
        this.register(`boq:${ci.code || ci.id || ci.name}`, `boq:${si.code || si.id || si.name}`, { source: 'structural', type: 'column_to_slab' });
      }
    }
  }

  _buildMEPDependencies(project) {
    const boqItems = project.boq?.items || [];

    const electricalItems = boqItems.filter(i =>
      (i.category || '').toLowerCase().includes('electrical') ||
      (i.name || '').toLowerCase().includes('كهرباء')
    );
    const plumbingItems = boqItems.filter(i =>
      (i.category || '').toLowerCase().includes('plumbing') ||
      (i.name || '').toLowerCase().includes('سباكة') ||
      (i.name || '').toLowerCase().includes('plumbing')
    );
    const hvacItems = boqItems.filter(i =>
      (i.category || '').toLowerCase().includes('hvac') ||
      (i.name || '').toLowerCase().includes('تكييف') ||
      (i.name || '').toLowerCase().includes('ac')
    );

    // Structure → Electrical
    for (const item of [...electricalItems, ...plumbingItems, ...hvacItems]) {
      for (const structItem of boqItems.filter(i =>
        ['slab', 'wall', 'column', 'ceiling'].some(s =>
          (i.category || '').toLowerCase().includes(s) ||
          (i.name || '').toLowerCase().includes(s)
        )
      )) {
        this.register(
          `boq:${structItem.code || structItem.id || structItem.name}`,
          `boq:${item.code || item.id || item.name}`,
          { source: 'mep', type: 'structure_to_mep' }
        );
      }
    }
  }

  _buildFinishingDependencies(project) {
    const boqItems = project.boq?.items || [];

    const paintingItems = boqItems.filter(i =>
      (i.category || '').toLowerCase().includes('painting') ||
      (i.name || '').toLowerCase().includes('دهان') ||
      (i.name || '').toLowerCase().includes('paint')
    );
    const flooringItems = boqItems.filter(i =>
      (i.category || '').toLowerCase().includes('flooring') ||
      (i.name || '').toLowerCase().includes('floor') ||
      (i.name || '').toLowerCase().includes('أرضيات')
    );

    // MEP → Finishing (finishing after MEP)
    for (const fi of [...paintingItems, ...flooringItems]) {
      for (const mepItem of [...boqItems.filter(i =>
        (i.category || '').toLowerCase().includes('electrical') ||
        (i.category || '').toLowerCase().includes('plumbing') ||
        (i.name || '').toLowerCase().includes('كهرباء') ||
        (i.name || '').toLowerCase().includes('سباكة')
      )]) {
        this.register(
          `boq:${mepItem.code || mepItem.id || mepItem.name}`,
          `boq:${fi.code || fi.id || fi.name}`,
          { source: 'finishing', type: 'mep_to_finishing' }
        );
      }
    }
  }

  _buildCrossModelDependencies(project) {
    // Images → Navigation
    if (project.vision && project.navigation) {
      this.register('vision:generated_images', 'nav:spatial_model', { source: 'cross_model', type: 'vision_to_nav' });
    }

    // UPM → All
    if (project.upm) {
      if (project.boq) this.register('upm:requirements', 'boq:generated', { source: 'cross_model', type: 'upm_to_boq' });
      if (project.vision) this.register('upm:requirements', 'vision:generated', { source: 'cross_model', type: 'upm_to_vision' });
      if (project.cost) this.register('upm:requirements', 'cost:calculated', { source: 'cross_model', type: 'upm_to_cost' });
    }

    // BOQ → Cost, Schedule, Risk
    if (project.boq) {
      if (project.cost) {
        for (const item of project.boq.items || []) {
          this.register(`boq:${item.code || item.id || item.name}`, 'cost:calculated', { source: 'cross_model', type: 'boq_to_cost' });
        }
      }
      if (project.schedule) {
        this.register('boq:generated', 'schedule:created', { source: 'cross_model', type: 'boq_to_schedule' });
      }
      if (project.risk) {
        this.register('boq:generated', 'risk:assessed', { source: 'cross_model', type: 'boq_to_risk' });
      }
    }

    // Cost → Schedule
    if (project.cost && project.schedule) {
      this.register('cost:calculated', 'schedule:created', { source: 'cross_model', type: 'cost_to_schedule' });
    }
  }

  getStats() {
    let totalDeps = 0;
    for (const [, node] of this._dependencyGraph) {
      totalDeps += node.dependencies.length;
    }
    const cycles = this.detectCycles();
    return {
      totalElements: this._dependencyGraph.size,
      totalDependencies: totalDeps,
      avgDependenciesPerElement: this._dependencyGraph.size > 0 ? (totalDeps / this._dependencyGraph.size).toFixed(2) : 0,
      rootElements: this.getRootElements().length,
      leafElements: this.getLeafElements().length,
      cycles: cycles.length,
      hasCycles: cycles.length > 0,
    };
  }
}

module.exports = DependencyEngine;
