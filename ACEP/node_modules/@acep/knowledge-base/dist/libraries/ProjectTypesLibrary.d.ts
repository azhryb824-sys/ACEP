export interface ProjectTypeDefinition {
    type: string;
    name: string;
    nameAr: string;
    description: string;
    typicalSpaces: string[];
    typicalSystems: string[];
    typicalFloors: number;
    minArea: number;
    maxArea: number;
    typicalFinishingLevel: string;
    codeRequirements: string[];
    version: string;
}
export declare class ProjectTypesLibrary {
    private types;
    register(type: ProjectTypeDefinition): void;
    get(type: string): ProjectTypeDefinition | undefined;
    getAll(): ProjectTypeDefinition[];
    initializeDefaults(): void;
}
//# sourceMappingURL=ProjectTypesLibrary.d.ts.map