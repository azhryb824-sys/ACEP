export type KnowledgeNodeType = 'Project' | 'Building' | 'Floor' | 'Space' | 'Component' | 'System' | 'Material' | 'BOQItem' | 'Labor' | 'Equipment' | 'Rule' | 'Standard' | 'Code' | 'Method' | 'Risk';
export interface KnowledgeNode {
    id: string;
    type: KnowledgeNodeType;
    name: string;
    nameAr?: string;
    description?: string;
    properties: Record<string, unknown>;
    metadata: {
        version: string;
        created: string;
        updated: string;
        status: 'active' | 'deprecated' | 'experimental';
        source?: string;
        confidence: number;
    };
}
export interface ProjectNode extends KnowledgeNode {
    type: 'Project';
    properties: {
        projectType: string;
        applicableFloors?: number;
        typicalSpaces?: string[];
        typicalSystems?: string[];
    };
}
export interface SpaceNode extends KnowledgeNode {
    type: 'Space';
    properties: {
        area: string;
        minArea?: number;
        maxArea?: number;
        height?: number;
        finishingLevel?: string;
        requiresWaterproofing: boolean;
        requiresVentilation: boolean;
        occupancy?: number;
    };
}
export interface ComponentNode extends KnowledgeNode {
    type: 'Component';
    properties: {
        category: string;
        unit: string;
        defaultMaterial?: string;
        calculationMethod?: string;
        typicalDimensions?: Record<string, number>;
    };
}
export interface SystemNode extends KnowledgeNode {
    type: 'System';
    properties: {
        category: string;
        requiresSpecialist: boolean;
        typicalComponents?: string[];
        standards?: string[];
    };
}
export interface BOQItemNode extends KnowledgeNode {
    type: 'BOQItem';
    properties: {
        category: string;
        unit: string;
        defaultWaste: number;
        laborProductivity?: number;
        equipmentRequired?: string[];
        materialsRequired?: string[];
        calculationFormula?: string;
        typicalPrice?: number;
    };
}
//# sourceMappingURL=NodeTypes.d.ts.map