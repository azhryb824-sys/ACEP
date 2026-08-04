import { KnowledgeNode } from './NodeTypes';
import { Edge, RelationType, EdgeProperties } from './RelationTypes';
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
export declare class KnowledgeGraph {
    private nodes;
    private edges;
    private adjacencyList;
    private reverseAdjacencyList;
    private ontologyClasses;
    private inferenceRules;
    private conflicts;
    private graphVersion;
    addNode(node: KnowledgeNode): void;
    addEdge(sourceId: string, targetId: string, type: RelationType, properties: Partial<EdgeProperties>): Edge;
    getNode(id: string): KnowledgeNode | undefined;
    findNodesByType(type: string): KnowledgeNode[];
    findNodesByName(name: string): KnowledgeNode[];
    getOutgoingEdges(nodeId: string): Edge[];
    getIncomingEdges(nodeId: string): Edge[];
    getRelatedNodes(nodeId: string, relationType?: RelationType): KnowledgeNode[];
    traverse(startId: string, maxDepth?: number): KnowledgeNode[];
    getPath(startId: string, endId: string): KnowledgeNode[];
    getNodeCount(): number;
    getEdgeCount(): number;
    clear(): void;
    toJSON(): object;
    static fromJSON(data: {
        nodes: KnowledgeNode[];
        edges: Edge[];
    }): KnowledgeGraph;
    addOntologyClass(ontologyClass: OntologyClass): void;
    getOntologyClass(classId: string): OntologyClass | undefined;
    validateNodeAgainstOntology(node: KnowledgeNode): {
        valid: boolean;
        errors: string[];
    };
    private validateDataType;
    addInferenceRule(rule: InferenceRule): void;
    runInference(ruleId: string): Promise<any[]>;
    private findNodesMatchingConditions;
    private evaluateCondition;
    private executeAction;
    queryByProperties(properties: Record<string, any>): KnowledgeNode[];
    queryByRelation(relationType: RelationType, direction?: 'outgoing' | 'incoming' | 'both'): Map<string, KnowledgeNode[]>;
    queryByPath(path: RelationType[], maxDepth?: number): Map<string, KnowledgeNode[]>;
    private traversePath;
    detectConflicts(): Conflict[];
    private detectSpatialConflicts;
    private detectLogicalConflicts;
    private detectStructuralConflicts;
    private spacesOverlap;
    private detectCycles;
    getConflicts(): Conflict[];
    resolveConflict(conflictId: string): void;
    linkToBIMElement(nodeId: string, bimElementId: string, bimSoftware: string): void;
    getNodesByBIMElement(bimElementId: string): KnowledgeNode[];
    getDegreeCentrality(nodeId: string): number;
    getBetweennessCentrality(nodeId: string): number;
    getClusteringCoefficient(nodeId: string): number;
    getVersion(): string;
    incrementVersion(): void;
    createSnapshot(): string;
    restoreSnapshot(snapshotJson: string): void;
}
export {};
//# sourceMappingURL=KnowledgeGraph.d.ts.map