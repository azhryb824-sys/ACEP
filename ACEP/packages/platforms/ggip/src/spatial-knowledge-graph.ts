import { KnowledgeGraph } from '@acep/knowledge-base';
import {
  EngineeringKnowledgeGraphNode, EngineeringNodeType, GeoPoint,
  GeoBounds, SpatialRelationship, SpatialRelationType, GeoPolygon, GeoLine
} from './types';

interface SpatialIndexEntry {
  nodeId: string;
  location: GeoPoint;
  bounds?: GeoBounds;
  type: EngineeringNodeType;
}

export class SpatialKnowledgeGraph {
  private graph: KnowledgeGraph;
  private spatialIndex: Map<string, SpatialIndexEntry> = new Map();
  private rTree: RTreeNode[] = [];

  constructor(graph: KnowledgeGraph) {
    this.graph = graph;
  }

  addNode(node: EngineeringKnowledgeGraphNode): void {
    if (!this.graph.getNode(node.id)) {
      this.graph.addNode({
        id: node.id,
        type: node.type as any,
        name: node.name,
        properties: {
          ...node.properties,
          lat: node.location.lat,
          lng: node.location.lng,
          nameAr: node.nameAr,
          confidence: node.confidence,
          source: node.source,
          timestamp: node.timestamp
        },
        metadata: {
          version: '1.0',
          created: node.timestamp,
          updated: node.timestamp,
          status: 'active' as const,
          source: node.source,
          confidence: node.confidence
        }
      });
    }

    this.spatialIndex.set(node.id, {
      nodeId: node.id,
      location: node.location,
      type: node.type
    });

    this.rTree.push({
      id: node.id,
      lat: node.location.lat,
      lng: node.location.lng,
      type: node.type
    });
  }

  addRelationship(
    sourceId: string,
    targetId: string,
    type: SpatialRelationType,
    properties?: Partial<SpatialRelationship>
  ): void {
    const source = this.spatialIndex.get(sourceId);
    const target = this.spatialIndex.get(targetId);

    if (!source || !target) {
      throw new Error(`Cannot create relationship: node not found`);
    }

    const distance = this.haversineDistance(
      source.location.lat, source.location.lng,
      target.location.lat, target.location.lng
    );

    const relTypeMap: Record<string, string> = {
      [SpatialRelationType.WithinDistance]: 'NEAR',
      [SpatialRelationType.Contains]: 'CONTAINS',
      [SpatialRelationType.Intersects]: 'INTERSECTS',
      [SpatialRelationType.Adjacent]: 'ADJACENT_TO',
      [SpatialRelationType.Overlaps]: 'OVERLAPS',
      [SpatialRelationType.NearestNeighbor]: 'NEAR',
      [SpatialRelationType.ConnectedTo]: 'CONNECTED_TO',
      [SpatialRelationType.Above]: 'ABOVE',
      [SpatialRelationType.Below]: 'BELOW',
      [SpatialRelationType.Crosses]: 'CROSSES'
    };

    this.graph.addEdge(sourceId, targetId, (relTypeMap[type] || 'NEAR') as any, {
      confidence: properties?.properties?.confidence as number || 0.8,
      strength: 1 - (distance / 1000),
      reason: `Spatial relationship: ${type} at ${distance.toFixed(2)}m`
    });
  }

  findWithinDistance(center: GeoPoint, distance: number, type?: EngineeringNodeType): EngineeringKnowledgeGraphNode[] {
    const results: EngineeringKnowledgeGraphNode[] = [];

    for (const [, entry] of this.spatialIndex) {
      if (type && entry.type !== type) continue;

      const d = this.haversineDistance(center.lat, center.lng, entry.location.lat, entry.location.lng);
      if (d <= distance) {
        const node = this.graph.getNode(entry.nodeId) as any;
        if (node) {
          results.push(this.toEngineeringNode(node, entry));
        }
      }
    }

    return results.sort((a, b) => {
      const da = this.haversineDistance(center.lat, center.lng, a.location.lat, a.location.lng);
      const db = this.haversineDistance(center.lat, center.lng, b.location.lat, b.location.lng);
      return da - db;
    });
  }

  findConnectedTo(nodeId: string, relationType?: SpatialRelationType, maxDepth: number = 3): EngineeringKnowledgeGraphNode[] {
    const startNode = this.graph.getNode(nodeId);
    if (!startNode) return [];

    const connected: EngineeringKnowledgeGraphNode[] = [];
    const visited = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: nodeId, depth: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;

      const edges = this.graph.getOutgoingEdges(current.id);
      for (const edge of edges) {
        if (!visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          const entry = this.spatialIndex.get(edge.targetId);
          if (entry) {
            const node = this.graph.getNode(edge.targetId) as any;
            if (node) {
              connected.push(this.toEngineeringNode(node, entry));
            }
          }
          queue.push({ id: edge.targetId, depth: current.depth + 1 });
        }
      }

      const incomingEdges = this.graph.getIncomingEdges(current.id);
      for (const edge of incomingEdges) {
        if (!visited.has(edge.sourceId)) {
          visited.add(edge.sourceId);
          const entry = this.spatialIndex.get(edge.sourceId);
          if (entry) {
            const node = this.graph.getNode(edge.sourceId) as any;
            if (node) {
              connected.push(this.toEngineeringNode(node, entry));
            }
          }
          queue.push({ id: edge.sourceId, depth: current.depth + 1 });
        }
      }
    }

    return connected;
  }

  spatialQuery(bounds: GeoBounds, type?: EngineeringNodeType): EngineeringKnowledgeGraphNode[] {
    const results: EngineeringKnowledgeGraphNode[] = [];

    for (const [, entry] of this.spatialIndex) {
      if (type && entry.type !== type) continue;

      if (entry.location.lat >= bounds.minLat &&
          entry.location.lat <= bounds.maxLat &&
          entry.location.lng >= bounds.minLng &&
          entry.location.lng <= bounds.maxLng) {
        const node = this.graph.getNode(entry.nodeId) as any;
        if (node) {
          results.push(this.toEngineeringNode(node, entry));
        }
      }
    }

    return results;
  }

  findNearestNeighbor(point: GeoPoint, type?: EngineeringNodeType): EngineeringKnowledgeGraphNode | null {
    let nearest: EngineeringKnowledgeGraphNode | null = null;
    let minDist = Infinity;

    for (const [, entry] of this.spatialIndex) {
      if (type && entry.type !== type) continue;

      const d = this.haversineDistance(point.lat, point.lng, entry.location.lat, entry.location.lng);
      if (d < minDist) {
        minDist = d;
        const node = this.graph.getNode(entry.nodeId) as any;
        if (node) {
          nearest = this.toEngineeringNode(node, entry);
        }
      }
    }

    return nearest;
  }

  findKNearestNeighbors(point: GeoPoint, k: number, type?: EngineeringNodeType): EngineeringKnowledgeGraphNode[] {
    const withDistance: { node: EngineeringKnowledgeGraphNode; dist: number }[] = [];

    for (const [, entry] of this.spatialIndex) {
      if (type && entry.type !== type) continue;

      const d = this.haversineDistance(point.lat, point.lng, entry.location.lat, entry.location.lng);
      const node = this.graph.getNode(entry.nodeId) as any;
      if (node) {
        withDistance.push({
          node: this.toEngineeringNode(node, entry),
          dist: d
        });
      }
    }

    withDistance.sort((a, b) => a.dist - b.dist);
    return withDistance.slice(0, k).map(w => w.node);
  }

  findPathBetween(startId: string, endId: string): EngineeringKnowledgeGraphNode[] {
    const path = this.graph.getPath(startId, endId);
    return path.map(n => {
      const entry = this.spatialIndex.get(n.id);
      return this.toEngineeringNode(n, entry || {
        nodeId: n.id,
        location: { lat: 0, lng: 0 },
        type: n.type as EngineeringNodeType
      });
    });
  }

  getNodeCount(): number {
    return this.spatialIndex.size;
  }

  getEdgeCount(): number {
    return this.graph.getEdgeCount();
  }

  getStatistics(): SpatialGraphStatistics {
    const typeCounts = new Map<EngineeringNodeType, number>();

    for (const [, entry] of this.spatialIndex) {
      typeCounts.set(entry.type, (typeCounts.get(entry.type) || 0) + 1);
    }

    return {
      totalNodes: this.spatialIndex.size,
      totalEdges: this.graph.getEdgeCount(),
      nodesByType: Object.fromEntries(typeCounts),
      spatialBounds: this.calculateGlobalBounds()
    };
  }

  exportToGeoJSON(): object {
    const features: object[] = [];

    for (const [, entry] of this.spatialIndex) {
      const node = this.graph.getNode(entry.nodeId) as any;
      if (!node) continue;

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [entry.location.lng, entry.location.lat]
        },
        properties: {
          id: entry.nodeId,
          type: entry.type,
          name: node.name,
          ...node.properties
        }
      });
    }

    return {
      type: 'FeatureCollection',
      features
    };
  }

  private toEngineeringNode(node: any, entry: SpatialIndexEntry): EngineeringKnowledgeGraphNode {
    return {
      id: entry.nodeId,
      type: entry.type,
      name: node.name || '',
      location: entry.location,
      properties: { ...node.properties },
      relationships: [],
      confidence: node.properties?.confidence || 0.5,
      source: node.properties?.source || 'SpatialGraph',
      timestamp: node.properties?.timestamp || new Date().toISOString()
    };
  }

  private calculateGlobalBounds(): GeoBounds | null {
    if (this.spatialIndex.size === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    for (const [, entry] of this.spatialIndex) {
      if (entry.location.lat < minLat) minLat = entry.location.lat;
      if (entry.location.lat > maxLat) maxLat = entry.location.lat;
      if (entry.location.lng < minLng) minLng = entry.location.lng;
      if (entry.location.lng > maxLng) maxLng = entry.location.lng;
    }

    return { minLat, maxLat, minLng, maxLng };
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

interface RTreeNode {
  id: string;
  lat: number;
  lng: number;
  type: string;
}

interface SpatialGraphStatistics {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<string, number>;
  spatialBounds: GeoBounds | null;
}
