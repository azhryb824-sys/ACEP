export interface MaterialRecord {
    id: string;
    name: string;
    nameAr: string;
    scientificName?: string;
    tradeName?: string;
    unit: string;
    density?: number;
    uses: string[];
    lifespan: number;
    installationMethods: string[];
    compatibleMaterials: string[];
    incompatibleMaterials: string[];
    wasteFactor: number;
    referencePrice: number;
    currency: string;
    laborRequired: string[];
    toolsRequired: string[];
    storageRequirements?: string;
    environmentalImpact?: string;
    fireRating?: string;
    version: string;
}
export declare class MaterialLibrary {
    private materials;
    register(material: MaterialRecord): void;
    get(id: string): MaterialRecord | undefined;
    findByName(name: string): MaterialRecord[];
    getWasteFactor(materialId: string): number;
    getAll(): MaterialRecord[];
    getReferencePrice(materialId: string, currency?: string): number | undefined;
    initializeDefaults(): void;
}
//# sourceMappingURL=MaterialLibrary.d.ts.map