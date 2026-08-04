/**
 * ACEP Decision Graph
 *
 * A DAG (directed acyclic graph) that replaces the old linear MANDATORY_SEQUENCE.
 * Each step is a node with:
 *   - inputs: what data it needs
 *   - outputs: what data it produces
 *   - dependencies: array of node IDs that must complete first
 *   - impactWeight: how much this step influences the final result
 *
 * Uses: existing EngineeringGraph (BOQ dependency chains),
 *       existing KnowledgeGraph (element relationships),
 *       existing EDL (trace/project state)
 */
class DecisionGraph {
  constructor(options = {}) {
    this.engineeringGraph = options.engineeringGraph || null;
    this.knowledgeGraph = options.knowledgeGraph || null;
    this.edl = options.edl || null;
    this.nodes = new Map();
    this._executionLog = [];
  }

  addNode(nodeDef) {
    if (this.nodes.has(nodeDef.id)) {
      throw new Error(`Node ${nodeDef.id} already exists`);
    }
    const node = {
      id: nodeDef.id,
      name: nodeDef.name || nodeDef.id,
      handler: nodeDef.handler || null,
      inputs: nodeDef.inputs || [],
      outputs: nodeDef.outputs || [],
      dependencies: nodeDef.dependencies || [],
      impactWeight: nodeDef.impactWeight || 1.0,
      status: 'idle',
      result: null,
      error: null,
      startedAt: null,
      completedAt: null,
      metadata: nodeDef.metadata || {},
    };
    this.nodes.set(node.id, node);
    return this;
  }

  addNodeIfAbsent(nodeDef) {
    if (!this.nodes.has(nodeDef.id)) this.addNode(nodeDef);
    return this;
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  /**
   * Execute the graph from a given start node, respecting the DAG topology.
   * Returns execution results in topological order.
   */
  execute(startFrom = null, context = {}) {
    const order = this._topologicalSort();
    if (!order || order.length === 0) return { ok: false, error: 'No nodes to execute' };

    const startIdx = startFrom
      ? order.findIndex(n => n.id === startFrom)
      : 0;

    if (startFrom && startIdx === -1) {
      return { ok: false, error: `Start node ${startFrom} not found` };
    }

    const subset = startFrom ? order.slice(startIdx) : order;
    const results = [];

    for (const node of subset) {
      node.status = 'running';
      node.startedAt = new Date().toISOString();

      const depsMet = node.dependencies.every(depId => {
        const dep = this.nodes.get(depId);
        return dep && dep.status === 'completed';
      });

      if (!depsMet) {
        const missing = node.dependencies.filter(depId => {
          const dep = this.nodes.get(depId);
          return !dep || dep.status !== 'completed';
        });
        node.status = 'blocked';
        node.error = `Dependencies not met: ${missing.join(', ')}`;
        results.push({ node: node.id, status: 'blocked', error: node.error });
        continue;
      }

      try {
        const inputData = {};
        for (const input of node.inputs) {
          inputData[input] = context[input] || this._resolveInput(input, node);
        }

        let result = null;
        if (typeof node.handler === 'function') {
          result = node.handler(inputData, context);
        } else if (typeof node.handler === 'string' && context[node.handler]) {
          result = context[node.handler](inputData);
        }

        node.result = result;
        node.status = 'completed';
        node.completedAt = new Date().toISOString();

        // Publish outputs to context
        if (result && node.outputs.length > 0) {
          for (const output of node.outputs) {
            context[output] = result[output] !== undefined ? result[output] : result;
          }
        }

        results.push({ node: node.id, status: 'completed', result });
      } catch (err) {
        node.status = 'error';
        node.error = err.message;
        node.completedAt = new Date().toISOString();
        results.push({ node: node.id, status: 'error', error: err.message });
      }
    }

    // EDL trace
    if (this.edl) {
      const projectId = context.projectId || 'unknown';
      this.edl.logEvent(projectId, 'decision_graph_executed', {
        nodesExecuted: subset.length,
        completed: results.filter(r => r.status === 'completed').length,
        failed: results.filter(r => r.status === 'error').length,
        blocked: results.filter(r => r.status === 'blocked').length,
      });
    }

    this._executionLog.push({ timestamp: new Date().toISOString(), results, startFrom });
    return { ok: true, results, context };
  }

  /**
   * Re-run from a specific node, resetting downstream nodes.
   */
  runFromStep(nodeId, context = {}) {
    // Reset downstream nodes
    const order = this._topologicalSort();
    const startIdx = order.findIndex(n => n.id === nodeId);
    if (startIdx === -1) return { ok: false, error: `Node ${nodeId} not found` };

    for (let i = startIdx; i < order.length; i++) {
      order[i].status = 'idle';
      order[i].result = null;
      order[i].error = null;
      order[i].startedAt = null;
      order[i].completedAt = null;
    }

    // Also reset upstream inputs in context if needed
    for (let i = startIdx; i < order.length; i++) {
      for (const output of order[i].outputs) {
        delete context[output];
      }
    }

    return this.execute(nodeId, context);
  }

  /**
   * Get the critical path (highest cumulative impact weight).
   */
  criticalPath() {
    const order = this._topologicalSort();
    const dist = new Map();
    const prev = new Map();

    for (const node of order) {
      dist.set(node.id, node.impactWeight);
      prev.set(node.id, null);
    }

    for (const node of order) {
      for (const node2 of order) {
        if (node.dependencies.includes(node2.id)) {
          // node2 -> node
          const newDist = (dist.get(node2.id) || 0) + node.impactWeight;
          if (newDist > (dist.get(node.id) || 0)) {
            dist.set(node.id, newDist);
            prev.set(node.id, node2.id);
          }
        }
      }
    }

    // Find the node with max distance
    let maxDist = -1;
    let maxNode = null;
    for (const [id, d] of dist) {
      if (d > maxDist) { maxDist = d; maxNode = id; }
    }

    // Trace back
    const path = [];
    let current = maxNode;
    while (current) {
      path.unshift(current);
      current = prev.get(current);
    }

    const totalWeight = path.reduce((s, id) => s + (this.nodes.get(id)?.impactWeight || 0), 0);
    return { path, totalWeight, nodes: path.map(id => this.nodes.get(id)) };
  }

  /**
   * Validate the graph for cycles and missing dependencies.
   */
  validate() {
    const issues = [];

    // Cycle detection via DFS
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map();
    for (const id of this.nodes.keys()) color.set(id, WHITE);

    const dfs = (nodeId, stack) => {
      color.set(nodeId, GRAY);
      const node = this.nodes.get(nodeId);
      for (const depId of node.dependencies) {
        if (!this.nodes.has(depId)) {
          issues.push({ type: 'missing_dependency', node: nodeId, dependency: depId, message: `Node "${nodeId}" depends on "${depId}" which does not exist` });
          continue;
        }
        if (color.get(depId) === GRAY) {
          issues.push({ type: 'cycle', node: nodeId, dependency: depId, message: `Cycle detected between "${nodeId}" and "${depId}"`, stack: [...stack, depId] });
          return true;
        }
        if (color.get(depId) === WHITE) {
          if (dfs(depId, [...stack, depId])) return true;
        }
      }
      color.set(nodeId, BLACK);
      return false;
    };

    for (const id of this.nodes.keys()) {
      if (color.get(id) === WHITE) {
        dfs(id, [id]);
      }
    }

    return {
      valid: issues.length === 0,
      nodeCount: this.nodes.size,
      issues,
    };
  }

  /**
   * Build dependency graph from existing EngineeringGraph BOQ chains.
   */
  buildFromEngineeringGraph(project) {
    if (!this.engineeringGraph || !project?.boq?.items) return;

    const chains = this.engineeringGraph.dependencyChains || {};
    for (const [itemCode, chain] of Object.entries(chains)) {
      const deps = (chain.dependsOn || []).map(d => `boq_${d}`);
      this.addNodeIfAbsent({
        id: `boq_${itemCode}`,
        name: `BOQ Item ${itemCode} — ${chain.name || ''}`,
        dependencies: deps,
        impactWeight: chain.impactWeight || 1.0,
        metadata: { itemCode, chainType: 'engineering_graph' },
      });
    }
    return this;
  }

  /**
   * Build decision graph from KnowledgeGraph element relationships.
   */
  buildFromKnowledgeGraph(project) {
    if (!this.knowledgeGraph) return this;

    const elements = this.knowledgeGraph.elements || [];
    const relationships = this.knowledgeGraph.relationships || [];

    for (const rel of relationships) {
      const fromId = `element_${rel.from}`;
      const toId = `element_${rel.to}`;

      if (!this.nodes.has(fromId)) {
        const fromEl = elements.find(e => e.id === rel.from);
        this.addNodeIfAbsent({
          id: fromId,
          name: fromEl?.name || rel.from,
          dependencies: [],
          impactWeight: fromEl?.weight || 1.0,
          metadata: { elementId: rel.from, source: 'knowledge_graph' },
        });
      }

      if (!this.nodes.has(toId)) {
        const toEl = elements.find(e => e.id === rel.to);
        this.addNodeIfAbsent({
          id: toId,
          name: toEl?.name || rel.to,
          dependencies: [fromId],
          impactWeight: toEl?.weight || 1.0,
          metadata: { elementId: rel.to, source: 'knowledge_graph' },
        });
      } else {
        // Ensure dependency is tracked
        const node = this.nodes.get(toId);
        if (!node.dependencies.includes(fromId)) {
          node.dependencies.push(fromId);
        }
      }
    }
    return this;
  }

  _topologicalSort() {
    const all = [...this.nodes.values()];
    const visited = new Set();
    const result = [];

    const visit = (node) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      for (const depId of node.dependencies) {
        const dep = this.nodes.get(depId);
        if (dep) visit(dep);
      }
      result.push(node);
    };

    for (const node of all) visit(node);
    return result;
  }

  _resolveInput(input, node) {
    // Try to find the input from completed nodes' outputs
    for (const [id, n] of this.nodes) {
      if (n.status === 'completed' && n.outputs.includes(input)) {
        return n.result;
      }
    }
    return undefined;
  }

  getStats() {
    const all = [...this.nodes.values()];
    return {
      totalNodes: this.nodes.size,
      completed: all.filter(n => n.status === 'completed').length,
      running: all.filter(n => n.status === 'running').length,
      blocked: all.filter(n => n.status === 'blocked').length,
      error: all.filter(n => n.status === 'error').length,
      idle: all.filter(n => n.status === 'idle').length,
      executions: this._executionLog.length,
    };
  }
}

module.exports = DecisionGraph;
