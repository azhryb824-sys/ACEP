import { KnowledgeNode, SpaceNode, ComponentNode, SystemNode, BOQItemNode } from './NodeTypes';
import { Edge, RelationType, EdgeProperties } from './RelationTypes';

// Volume 34: Engineering Knowledge Graph & Construction Ontology (EKGCO)

// Ontology Classes
interface OntologyClass {
  classId: string;
  name: string;
  superClass?: string;
  properties: OntologyProperty[];
  constraints: OntologyConstraint[];
}

interface OntologyProperty {
  propertyId: string;
  name: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'object';
  required: boolean;
  defaultValue?: any;
  enumValues?: string[];
}

interface OntologyConstraint {
  constraintId: string;
  type: 'unique' | 'range' | 'pattern' | 'reference' | 'cardinality';
  description: string;
  parameters: Record<string, any>;
}

// Engineering Reasoning
interface InferenceRule {
  ruleId: string;
  name: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  confidence: number;
  priority: number;
}

interface RuleCondition {
  nodeId: string;
  property: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'exists';
  value: any;
}

interface RuleAction {
  actionType: 'addNode' | 'addEdge' | 'updateNode' | 'deleteEdge' | 'triggerAlert';
  targetId: string;
  parameters: Record<string, any>;
}

// Conflict Detection
interface Conflict {
  conflictId: string;
  type: 'Structural' | 'Spatial' | 'Logical' | 'Temporal' | 'Resource';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  involvedNodes: string[];
  involvedEdges: string[];
  resolution: string;
  autoResolvable: boolean;
}

export class KnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, Edge> = new Map();
  private adjacencyList: Map<string, string[]> = new Map();
  private reverseAdjacencyList: Map<string, string[]> = new Map();
  private ontologyClasses: Map<string, OntologyClass> = new Map();
  private inferenceRules: Map<string, InferenceRule> = new Map();
  private conflicts: Map<string, Conflict> = new Map();
  private graphVersion: string = '1.0.0';

  addNode(node: KnowledgeNode): void {
    this.nodes.set(node.id, node);
    this.adjacencyList.set(node.id, []);
    this.reverseAdjacencyList.set(node.id, []);
  }

  addEdge(sourceId: string, targetId: string, type: RelationType, properties: Partial<EdgeProperties>): Edge {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      throw new Error(`Cannot add edge: node not found (${sourceId} -> ${targetId})`);
    }

    const edge: Edge = {
      id: `${sourceId}->${targetId}-${type}`,
      sourceId,
      targetId,
      type,
      properties: {
        strength: properties.strength || 0.5,
        reason: properties.reason || '',
        version: properties.version || '1.0.0',
        bidirectional: properties.bidirectional || false,
        confidence: properties.confidence || 0.5
      }
    };

    this.edges.set(edge.id, edge);
    this.adjacencyList.get(sourceId)!.push(edge.id);
    
    if (properties.bidirectional) {
      this.reverseAdjacencyList.get(targetId)!.push(edge.id);
    } else {
      this.reverseAdjacencyList.get(targetId)!.push(edge.id);
    }

    return edge;
  }

  getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  findNodesByType(type: string): KnowledgeNode[] {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }

  findNodesByName(name: string): KnowledgeNode[] {
    return Array.from(this.nodes.values()).filter(
      n => n.name.toLowerCase() === name.toLowerCase() || 
           (n.nameAr && n.nameAr === name)
    );
  }

  getOutgoingEdges(nodeId: string): Edge[] {
    const edgeIds = this.adjacencyList.get(nodeId) || [];
    return edgeIds.map(id => this.edges.get(id)!).filter(Boolean);
  }

  getIncomingEdges(nodeId: string): Edge[] {
    const edgeIds = this.reverseAdjacencyList.get(nodeId) || [];
    return edgeIds.map(id => this.edges.get(id)!).filter(Boolean);
  }

  getRelatedNodes(nodeId: string, relationType?: RelationType): KnowledgeNode[] {
    const edges = this.getOutgoingEdges(nodeId);
    const filtered = relationType 
      ? edges.filter(e => e.type === relationType)
      : edges;
    return filtered.map(e => this.nodes.get(e.targetId)!).filter(Boolean);
  }

  traverse(startId: string, maxDepth: number = 5): KnowledgeNode[] {
    const visited = new Set<string>();
    const result: KnowledgeNode[] = [];
    
    const dfs = (nodeId: string, depth: number) => {
      if (depth > maxDepth || visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = this.nodes.get(nodeId);
      if (node) result.push(node);
      
      const edges = this.getOutgoingEdges(nodeId);
      for (const edge of edges) {
        dfs(edge.targetId, depth + 1);
      }
    };
    
    dfs(startId, 0);
    return result;
  }

  getPath(startId: string, endId: string): KnowledgeNode[] {
    const visited = new Set<string>();
    const parent = new Map<string, string>();
    const queue: string[] = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === endId) break;

      const edges = this.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          parent.set(edge.targetId, current);
          queue.push(edge.targetId);
        }
      }
    }

    if (!parent.has(endId)) return [];

    const path: string[] = [endId];
    let current = endId;
    while (current !== startId) {
      current = parent.get(current)!;
      path.unshift(current);
    }

    return path.map(id => this.nodes.get(id)!).filter(Boolean);
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  getEdgeCount(): number {
    return this.edges.size;
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
  }

  toJSON(): object {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values())
    };
  }

  static fromJSON(data: { nodes: KnowledgeNode[]; edges: Edge[] }): KnowledgeGraph {
    const graph = new KnowledgeGraph();
    for (const node of data.nodes) {
      graph.addNode(node);
    }
    for (const edge of data.edges) {
      graph.addEdge(edge.sourceId, edge.targetId, edge.type, edge.properties);
    }
    return graph;
  }

  // Volume 34: Ontology Management
  addOntologyClass(ontologyClass: OntologyClass): void {
    this.ontologyClasses.set(ontologyClass.classId, ontologyClass);
  }

  getOntologyClass(classId: string): OntologyClass | undefined {
    return this.ontologyClasses.get(classId);
  }

  validateNodeAgainstOntology(node: KnowledgeNode): { valid: boolean; errors: string[] } {
    const ontologyClass = this.ontologyClasses.get(node.type);
    if (!ontologyClass) {
      return { valid: true, errors: [] }; // No ontology defined for this type
    }

    const errors: string[] = [];

    for (const property of ontologyClass.properties) {
      if (property.required && !(property.name in node.properties)) {
        errors.push(`Missing required property: ${property.name}`);
      }

      if (property.name in node.properties) {
        const value = node.properties[property.name];
        if (!this.validateDataType(value, property.dataType)) {
          errors.push(`Invalid data type for property ${property.name}: expected ${property.dataType}`);
        }

        if (property.enumValues && !property.enumValues.includes(value)) {
          errors.push(`Invalid enum value for property ${property.name}: ${value}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateDataType(value: any, dataType: string): boolean {
    switch (dataType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number';
      case 'boolean': return typeof value === 'boolean';
      case 'date': return value instanceof Date || !isNaN(Date.parse(value));
      case 'enum': return typeof value === 'string';
      case 'object': return typeof value === 'object' && value !== null;
      default: return true;
    }
  }

  // Volume 34: Engineering Reasoning
  addInferenceRule(rule: InferenceRule): void {
    this.inferenceRules.set(rule.ruleId, rule);
  }

  async runInference(ruleId: string): Promise<any[]> {
    const rule = this.inferenceRules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    const results: any[] = [];

    // Find nodes matching conditions
    const matchingNodes = this.findNodesMatchingConditions(rule.conditions);

    // Execute actions
    for (const node of matchingNodes) {
      for (const action of rule.actions) {
        const result = await this.executeAction(action, node, rule);
        results.push(result);
      }
    }

    return results;
  }

  private findNodesMatchingConditions(conditions: RuleCondition[]): KnowledgeNode[] {
    const matchingNodes: KnowledgeNode[] = [];

    for (const node of this.nodes.values()) {
      let matches = true;

      for (const condition of conditions) {
        if (node.id !== condition.nodeId) {
          matches = false;
          break;
        }

        const value = node.properties[condition.property];
        if (!this.evaluateCondition(value, condition.operator, condition.value)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        matchingNodes.push(node);
      }
    }

    return matchingNodes;
  }

  private evaluateCondition(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals': return value === expected;
      case 'notEquals': return value !== expected;
      case 'greaterThan': return value > expected;
      case 'lessThan': return value < expected;
      case 'contains': return Array.isArray(value) ? value.includes(expected) : String(value).includes(expected);
      case 'exists': return value !== undefined && value !== null;
      default: return false;
    }
  }

  private async executeAction(action: RuleAction, node: KnowledgeNode, rule: InferenceRule): Promise<any> {
    switch (action.actionType) {
      case 'addNode':
        const newNode: KnowledgeNode = {
          id: action.parameters.id || `GEN-${Date.now()}`,
          type: action.parameters.type,
          name: action.parameters.name,
          properties: action.parameters.properties || {}
        };
        this.addNode(newNode);
        return { action: 'addNode', nodeId: newNode.id };

      case 'addEdge':
        const edge = this.addEdge(
          node.id,
          action.parameters.targetId,
          action.parameters.relationType,
          action.parameters.properties || {}
        );
        return { action: 'addEdge', edgeId: edge.id };

      case 'updateNode':
        Object.assign(node.properties, action.parameters.properties);
        return { action: 'updateNode', nodeId: node.id };

      case 'deleteEdge':
        const edgeId = `${node.id}->${action.parameters.targetId}-${action.parameters.relationType}`;
        this.edges.delete(edgeId);
        return { action: 'deleteEdge', edgeId };

      case 'triggerAlert':
        return {
          action: 'triggerAlert',
          message: action.parameters.message,
          nodeId: node.id,
          ruleId: rule.ruleId,
          confidence: rule.confidence
        };

      default:
        return { action: 'unknown', nodeId: node.id };
    }
  }

  // Volume 34: Smart Queries
  queryByProperties(properties: Record<string, any>): KnowledgeNode[] {
    return Array.from(this.nodes.values()).filter(node => {
      for (const [key, value] of Object.entries(properties)) {
        if (node.properties[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  queryByRelation(relationType: RelationType, direction: 'outgoing' | 'incoming' | 'both' = 'both'): Map<string, KnowledgeNode[]> {
    const result = new Map<string, KnowledgeNode[]>();

    for (const [nodeId, node] of this.nodes) {
      const relatedNodes: KnowledgeNode[] = [];

      if (direction === 'outgoing' || direction === 'both') {
        const outgoingEdges = this.getOutgoingEdges(nodeId).filter(e => e.type === relationType);
        relatedNodes.push(...outgoingEdges.map(e => this.nodes.get(e.targetId)!).filter(Boolean));
      }

      if (direction === 'incoming' || direction === 'both') {
        const incomingEdges = this.getIncomingEdges(nodeId).filter(e => e.type === relationType);
        relatedNodes.push(...incomingEdges.map(e => this.nodes.get(e.sourceId)!).filter(Boolean));
      }

      if (relatedNodes.length > 0) {
        result.set(nodeId, relatedNodes);
      }
    }

    return result;
  }

  queryByPath(path: RelationType[], maxDepth: number = 5): Map<string, KnowledgeNode[]> {
    const result = new Map<string, KnowledgeNode[]>();

    for (const [nodeId, node] of this.nodes) {
      const pathNodes = this.traversePath(nodeId, path, maxDepth);
      if (pathNodes.length > 0) {
        result.set(nodeId, pathNodes);
      }
    }

    return result;
  }

  private traversePath(startId: string, path: RelationType[], maxDepth: number): KnowledgeNode[] {
    const result: KnowledgeNode[] = [];
    let currentId = startId;
    let depth = 0;

    for (const relationType of path) {
      if (depth >= maxDepth) break;

      const edges = this.getOutgoingEdges(currentId).filter(e => e.type === relationType);
      if (edges.length === 0) break;

      const nextNode = this.nodes.get(edges[0].targetId);
      if (!nextNode) break;

      result.push(nextNode);
      currentId = nextNode.id;
      depth++;
    }

    return result;
  }

  // Volume 34: Conflict Detection
  detectConflicts(): Conflict[] {
    const conflicts: Conflict[] = [];

    // Detect spatial conflicts
    conflicts.push(...this.detectSpatialConflicts());

    // Detect logical conflicts
    conflicts.push(...this.detectLogicalConflicts());

    // Detect structural conflicts
    conflicts.push(...this.detectStructuralConflicts());

    // Store conflicts
    conflicts.forEach(conflict => {
      this.conflicts.set(conflict.conflictId, conflict);
    });

    return conflicts;
  }

  private detectSpatialConflicts(): Conflict[] {
    const conflicts: Conflict[] = [];
    const spaceNodes = this.findNodesByType('Space');

    // Check for overlapping spaces
    for (let i = 0; i < spaceNodes.length; i++) {
      for (let j = i + 1; j < spaceNodes.length; j++) {
        const space1 = spaceNodes[i] as SpaceNode;
        const space2 = spaceNodes[j] as SpaceNode;

        if (this.spacesOverlap(space1, space2)) {
          conflicts.push({
            conflictId: `SPC-${Date.now()}-${i}-${j}`,
            type: 'Spatial',
            severity: 'Medium',
            description: `Spatial overlap detected between ${space1.name} and ${space2.name}`,
            involvedNodes: [space1.id, space2.id],
            involvedEdges: [],
            resolution: 'Review space definitions and adjust boundaries',
            autoResolvable: false
          });
        }
      }
    }

    return conflicts;
  }

  private detectLogicalConflicts(): Conflict[] {
    const conflicts: Conflict[] = [];

    // Check for circular dependencies
    const cycles = this.detectCycles();
    cycles.forEach(cycle => {
      conflicts.push({
        conflictId: `LOG-${Date.now()}-${cycle.join('-')}`,
        type: 'Logical',
        severity: 'High',
        description: `Circular dependency detected: ${cycle.join(' -> ')}`,
        involvedNodes: cycle,
        involvedEdges: [],
        resolution: 'Break the circular dependency by removing one relationship',
        autoResolvable: false
      });
    });

    return conflicts;
  }

  private detectStructuralConflicts(): Conflict[] {
    const conflicts: Conflict[] = [];

    // Check for unsupported loads
    const componentNodes = this.findNodesByType('Component');
    componentNodes.forEach(component => {
      const supportingEdges = this.getIncomingEdges(component.id).filter(e => e.type === 'supports');
      if (supportingEdges.length === 0 && component.properties.requiresSupport === true) {
        conflicts.push({
          conflictId: `STR-${Date.now()}-${component.id}`,
          type: 'Structural',
          severity: 'Critical',
          description: `Component ${component.name} requires support but has none`,
          involvedNodes: [component.id],
          involvedEdges: [],
          resolution: 'Add supporting elements or adjust component requirements',
          autoResolvable: false
        });
      }
    });

    return conflicts;
  }

  private spacesOverlap(space1: SpaceNode, space2: SpaceNode): boolean {
    // Simplified overlap detection
    if (!space1.properties.volume || !space2.properties.volume) return false;
    return space1.properties.volume === space2.properties.volume;
  }

  private detectCycles(): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const edges = this.getOutgoingEdges(nodeId);
      for (const edge of edges) {
        if (!visited.has(edge.targetId)) {
          dfs(edge.targetId, [...path]);
        } else if (recursionStack.has(edge.targetId)) {
          const cycleStart = path.indexOf(edge.targetId);
          cycles.push([...path.slice(cycleStart), edge.targetId]);
        }
      }

      recursionStack.delete(nodeId);
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return cycles;
  }

  getConflicts(): Conflict[] {
    return Array.from(this.conflicts.values());
  }

  resolveConflict(conflictId: string): void {
    this.conflicts.delete(conflictId);
  }

  // Volume 34: BIM Integration
  linkToBIMElement(nodeId: string, bimElementId: string, bimSoftware: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.properties.bimElementId = bimElementId;
      node.properties.bimSoftware = bimSoftware;
    }
  }

  getNodesByBIMElement(bimElementId: string): KnowledgeNode[] {
    return Array.from(this.nodes.values()).filter(
      node => node.properties.bimElementId === bimElementId
    );
  }

  // Volume 34: Graph Analytics
  getDegreeCentrality(nodeId: string): number {
    const incoming = this.getIncomingEdges(nodeId).length;
    const outgoing = this.getOutgoingEdges(nodeId).length;
    return incoming + outgoing;
  }

  getBetweennessCentrality(nodeId: string): number {
    // Simplified betweenness centrality calculation
    let count = 0;
    const allNodes = Array.from(this.nodes.keys());

    for (const source of allNodes) {
      for (const target of allNodes) {
        if (source !== target && source !== nodeId && target !== nodeId) {
          const path = this.getPath(source, target);
          if (path.some(n => n.id === nodeId)) {
            count++;
          }
        }
      }
    }

    const totalPaths = allNodes.length * (allNodes.length - 1);
    return totalPaths > 0 ? count / totalPaths : 0;
  }

  getClusteringCoefficient(nodeId: string): number {
    const neighbors = this.getRelatedNodes(nodeId);
    if (neighbors.length < 2) return 0;

    let connections = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const edgeExists = this.getOutgoingEdges(neighbors[i].id).some(
          e => e.targetId === neighbors[j].id
        );
        if (edgeExists) connections++;
      }
    }

    const possibleConnections = (neighbors.length * (neighbors.length - 1)) / 2;
    return possibleConnections > 0 ? connections / possibleConnections : 0;
  }

  // Volume 34: Graph Versioning
  getVersion(): string {
    return this.graphVersion;
  }

  incrementVersion(): void {
    const parts = this.graphVersion.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    this.graphVersion = `${parts[0]}.${parts[1]}.${patch}`;
  }

  createSnapshot(): string {
    const snapshotId = `SNAP-${Date.now()}`;
    const snapshot = {
      id: snapshotId,
      version: this.graphVersion,
      timestamp: new Date().toISOString(),
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      ontologyClasses: Array.from(this.ontologyClasses.values()),
      inferenceRules: Array.from(this.inferenceRules.values())
    };
    return JSON.stringify(snapshot);
  }

  restoreSnapshot(snapshotJson: string): void {
    const snapshot = JSON.parse(snapshotJson);
    this.clear();
    
    for (const node of snapshot.nodes) {
      this.addNode(node);
    }
    for (const edge of snapshot.edges) {
      this.addEdge(edge.sourceId, edge.targetId, edge.type, edge.properties);
    }
    for (const ontologyClass of snapshot.ontologyClasses) {
      this.addOntologyClass(ontologyClass);
    }
    for (const rule of snapshot.inferenceRules) {
      this.addInferenceRule(rule);
    }
    
    this.graphVersion = snapshot.version;
  }
}
