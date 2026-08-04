import { CountryConfig, Language, TaxRule, GlobalReadinessIndex } from './types';
import { IGlobalEngine, ICountryManager, ICurrencyManager, IStandardManager, IComplianceManager } from './interfaces';
export declare class GlobalEngine implements IGlobalEngine {
    readonly id = "gdlmsp";
    readonly name = "Global Deployment & Localization Platform";
    readonly version = "1.0.0";
    private status;
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    getStatus(): {
        id: string;
        name: string;
        version: string;
        status: "error" | "idle" | "initialized" | "running";
        lastRun: string;
    };
    private countries;
    private currencies;
    private standards;
    private compliance;
    private baseCurrency;
    private localization;
    private taxEngine;
    constructor();
    configureCountry(config: CountryConfig): Promise<void>;
    getCountry(countryId: string): Promise<CountryConfig>;
    listCountries(): Promise<CountryConfig[]>;
    translate(text: string, from: Language, to: Language): Promise<string>;
    convertCurrency(amount: number, from: string, to: string): Promise<number>;
    calculateTax(amount: number, countryId: string, entityId: string): Promise<{
        total: number;
        breakdown: TaxRule[];
    }>;
    getGlobalReadiness(): Promise<GlobalReadinessIndex>;
    measure(): Promise<{
        status: string;
        metrics: Record<string, unknown>;
    }>;
    getCountryManager(): ICountryManager;
    getCurrencyManager(): ICurrencyManager;
    getStandardManager(): IStandardManager;
    getComplianceManager(): IComplianceManager;
}
//# sourceMappingURL=engine.d.ts.map