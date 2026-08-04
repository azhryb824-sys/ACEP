const EventEmitter = require('events');

class KnowledgeGraph extends EventEmitter {
  constructor() {
    super();
    this.nodes = new Map();
    this.edges = [];
    this.index = { byType: new Map(), byCategory: new Map(), byTag: new Map() };
  }

  addNode(id, data) {
    const node = { id, ...data, createdAt: new Date().toISOString(), version: 1 };
    this.nodes.set(id, node);
    const type = data.type || 'unknown';
    if (!this.index.byType.has(type)) this.index.byType.set(type, []);
    this.index.byType.get(type).push(id);
    if (data.category) {
      if (!this.index.byCategory.has(data.category)) this.index.byCategory.set(data.category, []);
      this.index.byCategory.get(data.category).push(id);
    }
    this.emit('nodeAdded', { id, type });
    return node;
  }

  addEdge(fromId, toId, relationship, metadata = {}) {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) return null;
    const edge = { from: fromId, to: toId, relationship, metadata, createdAt: new Date().toISOString() };
    this.edges.push(edge);
    if (!this.nodes.get(fromId)._out) this.nodes.get(fromId)._out = [];
    if (!this.nodes.get(toId)._in) this.nodes.get(toId)._in = [];
    this.nodes.get(fromId)._out.push(edge);
    this.nodes.get(toId)._in.push(edge);
    return edge;
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  getOutgoing(id) {
    const node = this.nodes.get(id);
    return node?._out || [];
  }

  getIncoming(id) {
    const node = this.nodes.get(id);
    return node?._in || [];
  }

  getNeighbors(id, relationship) {
    const node = this.nodes.get(id);
    if (!node) return [];
    const neighbors = [];
    for (const edge of [...(node._out || []), ...(node._in || [])]) {
      if (!relationship || edge.relationship === relationship) {
        const nid = edge.from === id ? edge.to : edge.from;
        neighbors.push({ node: this.nodes.get(nid), edge });
      }
    }
    return neighbors;
  }

  findPath(fromId, toId, maxDepth = 5) {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) return null;
    const visited = new Set();
    const queue = [[fromId, [fromId]]];
    while (queue.length > 0) {
      const [current, path] = queue.shift();
      if (current === toId) return path;
      if (path.length > maxDepth) continue;
      visited.add(current);
      const node = this.nodes.get(current);
      for (const edge of [...(node._out || []), ...(node._in || [])]) {
        const next = edge.from === current ? edge.to : edge.from;
        if (!visited.has(next)) {
          queue.push([next, [...path, next]]);
        }
      }
    }
    return null;
  }

  query(query) {
    const results = [];
    const q = query.toLowerCase();
    for (const [id, node] of this.nodes) {
      if (id.toLowerCase().includes(q)) { results.push(node); continue; }
      if (node.name?.toLowerCase().includes(q)) { results.push(node); continue; }
      if (node.nameEn?.toLowerCase().includes(q)) { results.push(node); continue; }
      if (node.type?.toLowerCase().includes(q)) { results.push(node); continue; }
      if (node.tags?.some(t => t.toLowerCase().includes(q))) { results.push(node); }
    }
    return results;
  }

  getNodesByType(type) {
    return (this.index.byType.get(type) || []).map(id => this.nodes.get(id)).filter(Boolean);
  }

  getNodesByCategory(category) {
    return (this.index.byCategory.get(category) || []).map(id => this.nodes.get(id)).filter(Boolean);
  }

  buildFromEntities({ projectTypes, phases, elements, materials, codes, relationships }) {
    for (const pt of Object.values(projectTypes)) {
      this.addNode(`project_type:${pt.id}`, { type: 'project_type', name: pt.name, nameEn: pt.nameEn, category: pt.category, complexity: pt.complexity });
    }
    for (const ph of phases) {
      this.addNode(`phase:${ph.id}`, { type: 'phase', name: ph.name, nameEn: ph.nameEn, order: ph.order, color: ph.color });
    }
    for (const el of Object.values(elements)) {
      this.addNode(`element:${el.id}`, { type: 'element', name: el.name, nameEn: el.nameEn, category: el.category, boqCategory: el.boqCategory, unit: el.unit });
      for (const phId of el.phases) {
        if (this.nodes.has(`phase:${phId}`)) {
          this.addEdge(`element:${el.id}`, `phase:${phId}`, 'executed_in');
        }
      }
    }
    for (const mat of Object.values(materials)) {
      this.addNode(`material:${mat.id}`, { type: 'material', name: mat.name, nameEn: mat.nameEn, category: mat.category, unit: mat.unit, avgPrice: mat.avgPrice });
    }
    for (const code of Object.values(codes)) {
      this.addNode(`code:${code.code.replace(/[.\s]/g, '_')}`, { type: 'code', code: code.code, name: code.name, organization: code.organization, category: code.category });
    }
    if (relationships) {
      for (const [elId, rel] of Object.entries(relationships)) {
        const elNodeId = `element:${elId}`;
        if (!this.nodes.has(elNodeId)) continue;
        for (const dep of rel.dependsOn) {
          const depNodeId = `element:${dep}`;
          if (this.nodes.has(depNodeId)) this.addEdge(elNodeId, depNodeId, 'depends_on');
        }
        for (const req of rel.requiredBy) {
          const reqNodeId = `element:${req}`;
          if (this.nodes.has(reqNodeId)) this.addEdge(reqNodeId, elNodeId, 'required_by');
        }
      }
    }
    this.emit('built', { nodes: this.nodes.size, edges: this.edges.length });
    return this;
  }

  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      stats: { nodes: this.nodes.size, edges: this.edges.length },
    };
  }
}

module.exports = { KnowledgeGraph };
