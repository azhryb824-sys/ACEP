export type RelationType = 
  | 'HAS'
  | 'REQUIRES'
  | 'OPTIONALLY_REQUIRES'
  | 'CONNECTED_TO'
  | 'ADJACENT_TO'
  | 'CONTAINS'
  | 'PART_OF'
  | 'BEFORE'
  | 'AFTER'
  | 'DEPENDS_ON'
  | 'CONFLICTS_WITH'
  | 'DERIVED_FROM'
  | 'INSTALLED_ON'
  | 'COVERS'
  | 'PRODUCES'
  | 'CONSUMES'
  | 'ATTACHED_TO'
  | 'NEAR'
  | 'ALTERNATIVE_TO'
  | 'SAME_AS'
  | 'PRECEDES'
  | 'FOLLOWS';

export interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  properties: EdgeProperties;
}

export interface EdgeProperties {
  strength: number;
  reason: string;
  conditions?: string[];
  reference?: string;
  version: string;
  bidirectional: boolean;
  confidence: number;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

export const STANDARD_RELATIONS = {
  APARTMENT_HAS: {
    source: 'Apartment',
    type: 'HAS' as RelationType,
    targets: ['Bedroom', 'Bathroom', 'Kitchen', 'LivingRoom'],
    strength: 1.0,
    reason: 'Apartment standard composition'
  },
  BATHROOM_REQUIRES: {
    source: 'Bathroom',
    type: 'REQUIRES' as RelationType,
    targets: ['Waterproofing', 'Ceramic', 'SanitaryFixtures', 'Plumbing', 'FloorDrain'],
    strength: 1.0,
    reason: 'Bathroom requires waterproofing and finishes'
  },
  BATHROOM_OPTIONALLY_REQUIRES: {
    source: 'Bathroom',
    type: 'OPTIONALLY_REQUIRES' as RelationType,
    targets: ['ExhaustFan', 'HeatedFloor'],
    strength: 0.5,
    reason: 'Optional bathroom enhancements'
  },
  KITCHEN_REQUIRES: {
    source: 'Kitchen',
    type: 'REQUIRES' as RelationType,
    targets: ['Countertop', 'Cabinets', 'Plumbing', 'Electrical', 'ExhaustHood'],
    strength: 1.0,
    reason: 'Kitchen standard requirements'
  },
  KITCHEN_OPTIONALLY_REQUIRES: {
    source: 'Kitchen',
    type: 'OPTIONALLY_REQUIRES' as RelationType,
    targets: ['GasSystem', 'Island', 'BreakfastBar'],
    strength: 0.4,
    reason: 'Optional kitchen features'
  },
  ROOF_REQUIRES: {
    source: 'Roof',
    type: 'REQUIRES' as RelationType,
    targets: ['Waterproofing', 'Drainage', 'Insulation'],
    strength: 1.0,
    reason: 'Roof requires waterproofing and drainage'
  }
} as const;
