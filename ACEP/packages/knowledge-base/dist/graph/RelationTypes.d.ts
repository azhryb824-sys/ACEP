export type RelationType = 'HAS' | 'REQUIRES' | 'OPTIONALLY_REQUIRES' | 'CONNECTED_TO' | 'ADJACENT_TO' | 'CONTAINS' | 'PART_OF' | 'BEFORE' | 'AFTER' | 'DEPENDS_ON' | 'CONFLICTS_WITH' | 'DERIVED_FROM' | 'INSTALLED_ON' | 'COVERS' | 'PRODUCES' | 'CONSUMES' | 'ATTACHED_TO' | 'NEAR' | 'ALTERNATIVE_TO' | 'SAME_AS' | 'PRECEDES' | 'FOLLOWS';
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
export declare const STANDARD_RELATIONS: {
    readonly APARTMENT_HAS: {
        readonly source: "Apartment";
        readonly type: RelationType;
        readonly targets: readonly ["Bedroom", "Bathroom", "Kitchen", "LivingRoom"];
        readonly strength: 1;
        readonly reason: "Apartment standard composition";
    };
    readonly BATHROOM_REQUIRES: {
        readonly source: "Bathroom";
        readonly type: RelationType;
        readonly targets: readonly ["Waterproofing", "Ceramic", "SanitaryFixtures", "Plumbing", "FloorDrain"];
        readonly strength: 1;
        readonly reason: "Bathroom requires waterproofing and finishes";
    };
    readonly BATHROOM_OPTIONALLY_REQUIRES: {
        readonly source: "Bathroom";
        readonly type: RelationType;
        readonly targets: readonly ["ExhaustFan", "HeatedFloor"];
        readonly strength: 0.5;
        readonly reason: "Optional bathroom enhancements";
    };
    readonly KITCHEN_REQUIRES: {
        readonly source: "Kitchen";
        readonly type: RelationType;
        readonly targets: readonly ["Countertop", "Cabinets", "Plumbing", "Electrical", "ExhaustHood"];
        readonly strength: 1;
        readonly reason: "Kitchen standard requirements";
    };
    readonly KITCHEN_OPTIONALLY_REQUIRES: {
        readonly source: "Kitchen";
        readonly type: RelationType;
        readonly targets: readonly ["GasSystem", "Island", "BreakfastBar"];
        readonly strength: 0.4;
        readonly reason: "Optional kitchen features";
    };
    readonly ROOF_REQUIRES: {
        readonly source: "Roof";
        readonly type: RelationType;
        readonly targets: readonly ["Waterproofing", "Drainage", "Insulation"];
        readonly strength: 1;
        readonly reason: "Roof requires waterproofing and drainage";
    };
};
//# sourceMappingURL=RelationTypes.d.ts.map