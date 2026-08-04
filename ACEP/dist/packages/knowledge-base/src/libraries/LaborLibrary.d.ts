export interface LaborRecord {
    id: string;
    name: string;
    nameAr: string;
    trade: string;
    skills: string[];
    dailyProductivity: number;
    productivityUnit: string;
    tasks: string[];
    tools: string[];
    teamSize: number;
    experience: string;
    hourlyCost: number;
    dailyCost: number;
    currency: string;
    certifications: string[];
    safetyLevel: string;
    version: string;
}
export declare class LaborLibrary {
    private labors;
    register(labor: LaborRecord): void;
    get(id: string): LaborRecord | undefined;
    findByTrade(trade: string): LaborRecord[];
    getDailyCost(trade: string): number;
    getAll(): LaborRecord[];
    initializeDefaults(): void;
}
//# sourceMappingURL=LaborLibrary.d.ts.map