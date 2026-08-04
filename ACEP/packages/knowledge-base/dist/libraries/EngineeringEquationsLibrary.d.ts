export interface EngineeringEquation {
    id: string;
    name: string;
    category: string;
    formula: string;
    description: string;
    variables: string[];
    unit: string;
    reference: string;
    version: string;
}
export declare class EngineeringEquationsLibrary {
    private equations;
    register(eq: EngineeringEquation): void;
    get(id: string): EngineeringEquation | undefined;
    findByCategory(category: string): EngineeringEquation[];
    getAll(): EngineeringEquation[];
    initializeDefaults(): void;
}
//# sourceMappingURL=EngineeringEquationsLibrary.d.ts.map