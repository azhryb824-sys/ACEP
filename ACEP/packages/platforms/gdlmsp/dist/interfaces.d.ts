import { IEngine } from '@acep/core';
import { CountryConfig, Language, TranslationEntry, CurrencyConfig, TaxRule, EngineeringStandardConfig, ComplianceRequirement, GlobalReadinessIndex } from './types';
export interface IGlobalEngine extends IEngine {
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
}
export interface ICountryManager {
    create(config: CountryConfig): Promise<void>;
    update(id: string, config: Partial<CountryConfig>): Promise<void>;
    delete(id: string): Promise<void>;
    get(id: string): Promise<CountryConfig>;
    list(): Promise<CountryConfig[]>;
    validate(config: CountryConfig): Promise<boolean>;
}
export interface ILocalizationEngine {
    setLanguage(lang: Language): Promise<void>;
    getString(key: string, lang?: Language): Promise<string>;
    addTranslation(entry: TranslationEntry): Promise<void>;
    addGlossaryTerm(term: string, translations: Record<string, string>): Promise<void>;
    getSupportedLanguages(): Promise<Language[]>;
    exportTranslations(lang: Language): Promise<Record<string, string>>;
}
export interface ICurrencyManager {
    add(config: CurrencyConfig): Promise<void>;
    update(code: string, config: Partial<CurrencyConfig>): Promise<void>;
    remove(code: string): Promise<void>;
    convert(amount: number, from: string, to: string, date?: string): Promise<number>;
    setBaseCurrency(code: string): Promise<void>;
    getRate(code: string): Promise<number>;
    list(): Promise<CurrencyConfig[]>;
}
export interface ITaxEngine {
    addRule(rule: TaxRule): Promise<void>;
    updateRule(id: string, rule: Partial<TaxRule>): Promise<void>;
    removeRule(id: string): Promise<void>;
    calculate(amount: number, countryId: string, entityId: string): Promise<{
        total: number;
        taxAmount: number;
        breakdown: TaxRule[];
    }>;
    getRules(countryId?: string): Promise<TaxRule[]>;
    generateEInvoice(data: unknown): Promise<unknown>;
}
export interface IStandardManager {
    add(code: EngineeringStandardConfig): Promise<void>;
    remove(id: string): Promise<void>;
    get(id: string): Promise<EngineeringStandardConfig>;
    list(country?: string): Promise<EngineeringStandardConfig[]>;
    getApplicableStandards(projectType: string, countryId: string): Promise<EngineeringStandardConfig[]>;
}
export interface IComplianceManager {
    addRequirement(req: ComplianceRequirement): Promise<void>;
    removeRequirement(id: string): Promise<void>;
    checkCompliance(countryId: string, projectId: string): Promise<{
        compliant: boolean;
        gaps: string[];
        score: number;
    }>;
    getRequirements(countryId: string): Promise<ComplianceRequirement[]>;
}
//# sourceMappingURL=interfaces.d.ts.map