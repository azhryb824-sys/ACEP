"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeGraph = void 0;
class KnowledgeGraph {
    nodes = new Map();
    edges = new Map();
    adjacencyList = new Map();
    reverseAdjacencyList = new Map();
    ontologyClasses = new Map();
    inferenceRules = new Map();
    conflicts = new Map();
    graphVersion = '1.0.0';
    addNode(node) {
        this.nodes.set(node.id, node);
        this.adjacencyList.set(node.id, []);
        this.reverseAdjacencyList.set(node.id, []);
    }
    addEdge(sourceId, targetId, type, properties) {
        if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
            throw new Error(`Cannot add edge: node not found (${sourceId} -> ${targetId})`);
        }
        const edge = {
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
        this.adjacencyList.get(sourceId).push(edge.id);
        if (properties.bidirectional) {
            this.reverseAdjacencyList.get(targetId).push(edge.id);
        }
        else {
            this.reverseAdjacencyList.get(targetId).push(edge.id);
        }
        return edge;
    }
    getNode(id) {
        return this.nodes.get(id);
    }
    findNodesByType(type) {
        return Array.from(this.nodes.values()).filter(n => n.type === type);
    }
    findNodesByName(name) {
        return Array.from(this.nodes.values()).filter(n => n.name.toLowerCase() === name.toLowerCase() ||
            (n.nameAr && n.nameAr === name));
    }
    getOutgoingEdges(nodeId) {
        const edgeIds = this.adjacencyList.get(nodeId) || [];
        return edgeIds.map(id => this.edges.get(id)).filter(Boolean);
    }
    getIncomingEdges(nodeId) {
        const edgeIds = this.reverseAdjacencyList.get(nodeId) || [];
        return edgeIds.map(id => this.edges.get(id)).filter(Boolean);
    }
    getRelatedNodes(nodeId, relationType) {
        const edges = this.getOutgoingEdges(nodeId);
        const filtered = relationType
            ? edges.filter(e => e.type === relationType)
            : edges;
        return filtered.map(e => this.nodes.get(e.targetId)).filter(Boolean);
    }
    traverse(startId, maxDepth = 5) {
        const visited = new Set();
        const result = [];
        const dfs = (nodeId, depth) => {
            if (depth > maxDepth || visited.has(nodeId))
                return;
            visited.add(nodeId);
            const node = this.nodes.get(nodeId);
            if (node)
                result.push(node);
            const edges = this.getOutgoingEdges(nodeId);
            for (const edge of edges) {
                dfs(edge.targetId, depth + 1);
            }
        };
        dfs(startId, 0);
        return result;
    }
    getPath(startId, endId) {
        const visited = new Set();
        const parent = new Map();
        const queue = [startId];
        visited.add(startId);
        while (queue.length > 0) {
            const current = queue.shift();
            if (current === endId)
                break;
            const edges = this.getOutgoingEdges(current);
            for (const edge of edges) {
                if (!visited.has(edge.targetId)) {
                    visited.add(edge.targetId);
                    parent.set(edge.targetId, current);
                    queue.push(edge.targetId);
                }
            }
        }
        if (!parent.has(endId))
            return [];
        const path = [endId];
        let current = endId;
        while (current !== startId) {
            current = parent.get(current);
            path.unshift(current);
        }
        return path.map(id => this.nodes.get(id)).filter(Boolean);
    }
    getNodeCount() {
        return this.nodes.size;
    }
    getEdgeCount() {
        return this.edges.size;
    }
    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.adjacencyList.clear();
        this.reverseAdjacencyList.clear();
    }
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values())
        };
    }
    static fromJSON(data) {
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
    addOntologyClass(ontologyClass) {
        this.ontologyClasses.set(ontologyClass.classId, ontologyClass);
    }
    getOntologyClass(classId) {
        return this.ontologyClasses.get(classId);
    }
    validateNodeAgainstOntology(node) {
        const ontologyClass = this.ontologyClasses.get(node.type);
        if (!ontologyClass) {
            return { valid: true, errors: [] }; // No ontology defined for this type
        }
        const errors = [];
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
    validateDataType(value, dataType) {
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
    addInferenceRule(rule) {
        this.inferenceRules.set(rule.ruleId, rule);
    }
    async runInference(ruleId) {
        const rule = this.inferenceRules.get(ruleId);
        if (!rule) {
            throw new Error(`Rule not found: ${ruleId}`);
        }
        const results = [];
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
    findNodesMatchingConditions(conditions) {
        const matchingNodes = [];
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
    evaluateCondition(value, operator, expected) {
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
    async executeAction(action, node, rule) {
        switch (action.actionType) {
            case 'addNode':
                const newNode = {
                    id: action.parameters.id || `GEN-${Date.now()}`,
                    type: action.parameters.type,
                    name: action.parameters.name,
                    properties: action.parameters.properties || {}
                };
                this.addNode(newNode);
                return { action: 'addNode', nodeId: newNode.id };
            case 'addEdge':
                const edge = this.addEdge(node.id, action.parameters.targetId, action.parameters.relationType, action.parameters.properties || {});
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
    queryByProperties(properties) {
        return Array.from(this.nodes.values()).filter(node => {
            for (const [key, value] of Object.entries(properties)) {
                if (node.properties[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }
    queryByRelation(relationType, direction = 'both') {
        const result = new Map();
        for (const [nodeId, node] of this.nodes) {
            const relatedNodes = [];
            if (direction === 'outgoing' || direction === 'both') {
                const outgoingEdges = this.getOutgoingEdges(nodeId).filter(e => e.type === relationType);
                relatedNodes.push(...outgoingEdges.map(e => this.nodes.get(e.targetId)).filter(Boolean));
            }
            if (direction === 'incoming' || direction === 'both') {
                const incomingEdges = this.getIncomingEdges(nodeId).filter(e => e.type === relationType);
                relatedNodes.push(...incomingEdges.map(e => this.nodes.get(e.sourceId)).filter(Boolean));
            }
            if (relatedNodes.length > 0) {
                result.set(nodeId, relatedNodes);
            }
        }
        return result;
    }
    queryByPath(path, maxDepth = 5) {
        const result = new Map();
        for (const [nodeId, node] of this.nodes) {
            const pathNodes = this.traversePath(nodeId, path, maxDepth);
            if (pathNodes.length > 0) {
                result.set(nodeId, pathNodes);
            }
        }
        return result;
    }
    traversePath(startId, path, maxDepth) {
        const result = [];
        let currentId = startId;
        let depth = 0;
        for (const relationType of path) {
            if (depth >= maxDepth)
                break;
            const edges = this.getOutgoingEdges(currentId).filter(e => e.type === relationType);
            if (edges.length === 0)
                break;
            const nextNode = this.nodes.get(edges[0].targetId);
            if (!nextNode)
                break;
            result.push(nextNode);
            currentId = nextNode.id;
            depth++;
        }
        return result;
    }
    // Volume 34: Conflict Detection
    detectConflicts() {
        const conflicts = [];
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
    detectSpatialConflicts() {
        const conflicts = [];
        const spaceNodes = this.findNodesByType('Space');
        // Check for overlapping spaces
        for (let i = 0; i < spaceNodes.length; i++) {
            for (let j = i + 1; j < spaceNodes.length; j++) {
                const space1 = spaceNodes[i];
                const space2 = spaceNodes[j];
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
    detectLogicalConflicts() {
        const conflicts = [];
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
    detectStructuralConflicts() {
        const conflicts = [];
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
    spacesOverlap(space1, space2) {
        // Simplified overlap detection
        if (!space1.properties.volume || !space2.properties.volume)
            return false;
        return space1.properties.volume === space2.properties.volume;
    }
    detectCycles() {
        const visited = new Set();
        const recursionStack = new Set();
        const cycles = [];
        const dfs = (nodeId, path) => {
            visited.add(nodeId);
            recursionStack.add(nodeId);
            path.push(nodeId);
            const edges = this.getOutgoingEdges(nodeId);
            for (const edge of edges) {
                if (!visited.has(edge.targetId)) {
                    dfs(edge.targetId, [...path]);
                }
                else if (recursionStack.has(edge.targetId)) {
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
    getConflicts() {
        return Array.from(this.conflicts.values());
    }
    resolveConflict(conflictId) {
        this.conflicts.delete(conflictId);
    }
    // Volume 34: BIM Integration
    linkToBIMElement(nodeId, bimElementId, bimSoftware) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.properties.bimElementId = bimElementId;
            node.properties.bimSoftware = bimSoftware;
        }
    }
    getNodesByBIMElement(bimElementId) {
        return Array.from(this.nodes.values()).filter(node => node.properties.bimElementId === bimElementId);
    }
    // Volume 34: Graph Analytics
    getDegreeCentrality(nodeId) {
        const incoming = this.getIncomingEdges(nodeId).length;
        const outgoing = this.getOutgoingEdges(nodeId).length;
        return incoming + outgoing;
    }
    getBetweennessCentrality(nodeId) {
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
    getClusteringCoefficient(nodeId) {
        const neighbors = this.getRelatedNodes(nodeId);
        if (neighbors.length < 2)
            return 0;
        let connections = 0;
        for (let i = 0; i < neighbors.length; i++) {
            for (let j = i + 1; j < neighbors.length; j++) {
                const edgeExists = this.getOutgoingEdges(neighbors[i].id).some(e => e.targetId === neighbors[j].id);
                if (edgeExists)
                    connections++;
            }
        }
        const possibleConnections = (neighbors.length * (neighbors.length - 1)) / 2;
        return possibleConnections > 0 ? connections / possibleConnections : 0;
    }
    // Volume 34: Graph Versioning
    getVersion() {
        return this.graphVersion;
    }
    incrementVersion() {
        const parts = this.graphVersion.split('.');
        const patch = parseInt(parts[2] || '0') + 1;
        this.graphVersion = `${parts[0]}.${parts[1]}.${patch}`;
    }
    createSnapshot() {
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
    restoreSnapshot(snapshotJson) {
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
exports.KnowledgeGraph = KnowledgeGraph;
//# sourceMappingURL=KnowledgeGraph.js.map