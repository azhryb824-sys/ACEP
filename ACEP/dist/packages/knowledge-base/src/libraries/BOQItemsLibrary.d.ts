export interface BOQItemTemplate {
    id: string;
    code: string;
    description: string;
    descriptionAr: string;
    category: string;
    unit: string;
    defaultWaste: number;
    hasFormula: boolean;
    formula?: string;
    dependsOn: string[];
    requiredSpaces: string[];
    optionalSpaces: string[];
    laborRequired: string[];
    equipmentRequired: string[];
    materialsRequired: string[];
    version: string;
}
export declare class BOQItemsLibrary {
    private items;
    register(item: BOQItemTemplate): void;
    get(id: string): BOQItemTemplate | undefined;
    findByCategory(category: string): BOQItemTemplate[];
    findBySpace(spaceType: string): BOQItemTemplate[];
    getAll(): BOQItemTemplate[];
    initializeDefaults(): void;
}
//# sourceMappingURL=BOQItemsLibrary.d.ts.map