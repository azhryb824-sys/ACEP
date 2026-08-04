export interface SpaceDefinition {
    type: string;
    name: string;
    nameAr: string;
    typicalArea: number;
    minArea: number;
    maxArea: number;
    typicalHeight: number;
    requiresWindow: boolean;
    requiresVentilation: boolean;
    requiresWaterproofing: boolean;
    finishingLevel: string;
    typicalComponents: string[];
    systems: string[];
    version: string;
}
export declare class SpacesLibrary {
    private spaces;
    register(space: SpaceDefinition): void;
    get(type: string): SpaceDefinition | undefined;
    getAll(): SpaceDefinition[];
    initializeDefaults(): void;
}
//# sourceMappingURL=SpacesLibrary.d.ts.map