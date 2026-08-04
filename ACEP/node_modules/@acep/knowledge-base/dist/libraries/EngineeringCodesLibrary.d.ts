export interface EngineeringCode {
    id: string;
    code: string;
    name: string;
    nameAr?: string;
    organization: string;
    country: string;
    version: string;
    year: number;
    category: CodeCategory;
    discipline: string[];
    status: 'active' | 'deprecated' | 'draft';
    url?: string;
    description: string;
    requirements: CodeRequirement[];
    references: string[];
    lastReview: string;
    nextReview: string;
}
export type CodeCategory = 'Structural' | 'Architectural' | 'Electrical' | 'Mechanical' | 'Plumbing' | 'Fire' | 'Accessibility' | 'Energy' | 'Environmental' | 'Safety';
export interface CodeRequirement {
    id: string;
    section: string;
    description: string;
    descriptionAr?: string;
    mandatory: boolean;
    applicability: string[];
    parameters: Record<string, unknown>;
    exceptions?: string[];
}
export declare class EngineeringCodesLibrary {
    private codes;
    private countryCodes;
    constructor();
    private initializeCodes;
    get(id: string): EngineeringCode | undefined;
    getByCode(code: string): EngineeringCode | undefined;
    getByCountry(country: string): EngineeringCode[];
    getByCategory(category: CodeCategory): EngineeringCode[];
    getByDiscipline(discipline: string): EngineeringCode[];
    getAll(): EngineeringCode[];
    search(query: string): EngineeringCode[];
    validateReference(reference: string): {
        valid: boolean;
        code?: EngineeringCode;
        message: string;
    };
    detectConflicts(codeId1: string, codeId2: string): {
        hasConflict: boolean;
        conflicts: string[];
    };
    getApplicableCodes(projectType: string, country: string): EngineeringCode[];
}
//# sourceMappingURL=EngineeringCodesLibrary.d.ts.map