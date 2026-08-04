export interface CADLayer {
    name: string;
    entityCount: number;
    color: string;
    estimatedArea: number;
}
export interface CADEntity {
    id: string;
    type: string;
    layer: string;
    coordinates: number[];
    properties: Record<string, unknown>;
}
export interface VirtualBuilding {
    slabs: Array<{
        level: number;
        area: number;
        thickness: number;
    }>;
    columns: Array<{
        count: number;
        material: string;
        estimatedLoad: number;
    }>;
    walls: Array<{
        length: number;
        height: number;
        type: string;
    }>;
    openings: Array<{
        type: string;
        count: number;
        dimensions: string;
    }>;
}
export declare class CADParserService {
    private initialized;
    initialize(): Promise<void>;
    parseDWG(data: Buffer | string | object): {
        layers: CADLayer[];
        entities: CADEntity[];
    };
    extractElements(cad: {
        layers: CADLayer[];
        entities: CADEntity[];
    }): Record<string, {
        name: string;
        count: number;
        estimatedArea: number;
    }>;
    convertToBuildingModel(cad: {
        layers: CADLayer[];
        entities: CADEntity[];
    }, area?: number, floors?: number): VirtualBuilding;
    isInitialized(): boolean;
    private _fromJson;
    private _dxfParse;
    private _mockCad;
    private ensureInitialized;
}
export declare const cadParser: CADParserService;
//# sourceMappingURL=index.d.ts.map