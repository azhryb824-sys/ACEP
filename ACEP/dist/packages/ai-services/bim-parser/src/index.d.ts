export interface IFCEntity {
    id: string;
    type: string;
    properties: Record<string, unknown>;
    children: IFCEntity[];
}
export interface IFCSpace {
    id: string;
    name: string;
    area: number;
    volume: number;
    floor: number;
}
export interface IFCRelationship {
    from: string;
    to: string;
    type: string;
}
export interface IFCFile {
    entities: IFCEntity[];
    relationships: IFCRelationship[];
    spaces: IFCSpace[];
    projectName: string;
}
export declare class BIMParserService {
    private initialized;
    initialize(): Promise<void>;
    parseIFC(data: string | object): IFCFile;
    extractSpaces(ifc: IFCFile): IFCSpace[];
    convertToBOQ(ifc: IFCFile, projectType?: string, area?: number, floors?: number): Array<{
        code: string;
        description: string;
        unit: string;
        quantity: number;
    }>;
    isInitialized(): boolean;
    private _fromJson;
    private _ifcTextParse;
    private _generateSpaces;
    private ensureInitialized;
}
export declare const bimParser: BIMParserService;
//# sourceMappingURL=index.d.ts.map