export interface QuantityRule {
    id: string;
    itemCode: string;
    name: string;
    nameAr: string;
    formula: string;
    variables: QuantityVariable[];
    unit: string;
    constraints: string[];
    version: string;
}
export interface QuantityVariable {
    name: string;
    type: 'dimension' | 'constant' | 'derived' | 'lookup';
    defaultValue?: number;
    source: string;
}
export declare class QuantityRulesLibrary {
    private rules;
    register(rule: QuantityRule): void;
    get(id: string): QuantityRule | undefined;
    getFormula(itemCode: string): string | undefined;
    getAll(): QuantityRule[];
    initializeDefaults(): void;
}
//# sourceMappingURL=QuantityRulesLibrary.d.ts.map