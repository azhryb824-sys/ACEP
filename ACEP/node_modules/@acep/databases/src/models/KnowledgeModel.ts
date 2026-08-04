export interface KnowledgeNodeModel {
  id: string;
  type: string;
  name: string;
  nameAr?: string;
  properties: Record<string, unknown>;
  version: string;
  status: 'active' | 'deprecated' | 'experimental';
}

export interface KnowledgeEdgeModel {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, unknown>;
  version: string;
}

export interface RuleModel {
  id: string;
  description: string;
  conditions: unknown[];
  actions: unknown[];
  priority: string;
  confidence: number;
  version: string;
  status: string;
}
