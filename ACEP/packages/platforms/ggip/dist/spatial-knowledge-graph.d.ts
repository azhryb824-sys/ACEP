import { KnowledgeGraph } from '@acep/knowledge-base';
import { EngineeringKnowledgeGraphNode, EngineeringNodeType, GeoPoint, GeoBounds, SpatialRelationship, SpatialRelationType } from './types';
export declare class SpatialKnowledgeGraph {
    private graph;
    private spatialIndex;
    private rTree;
    constructor(graph: KnowledgeGraph);
    addNode(node: EngineeringKnowledgeGraphNode): void;
    addRelationship(sourceId: string, targetId: string, type: SpatialRelationType, properties?: Partial<SpatialRelationship>): void;
    findWithinDistance(center: GeoPoint, distance: number, type?: EngineeringNodeType): EngineeringKnowledgeGraphNode[];
    findConnectedTo(nodeId: string, relationType?: SpatialRelationType, maxDepth?: number): EngineeringKnowledgeGraphNode[];
    spatialQuery(bounds: GeoBounds, type?: EngineeringNodeType): EngineeringKnowledgeGraphNode[];
    findNearestNeighbor(point: GeoPoint, type?: EngineeringNodeType): EngineeringKnowledgeGraphNode | null;
    findKNearestNeighbors(point: GeoPoint, k: number, type?: EngineeringNodeType): EngineeringKnowledgeGraphNode[];
    findPathBetween(startId: string, endId: string): EngineeringKnowledgeGraphNode[];
    getNodeCount(): number;
    getEdgeCount(): number;
    getStatistics(): SpatialGraphStatistics;
    exportToGeoJSON(): object;
    private toEngineeringNode;
    private calculateGlobalBounds;
    private haversineDistance;
}
interface SpatialGraphStatistics {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<string, number>;
    spatialBounds: GeoBounds | null;
}
export {};
//# sourceMappingURL=spatial-knowledge-graph.d.ts.map