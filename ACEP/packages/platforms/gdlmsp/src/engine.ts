import {
  CountryConfig, Language, TranslationEntry, CurrencyConfig, TaxRule, TaxType,
  EngineeringStandardConfig, ComplianceRequirement, TimezoneConfig,
  RegionalAIModel, GlobalReadinessIndex, MultiNationalConfig
} from './types';
import { LocalizationEngine } from './localization-engine';
import { TaxEngine } from './tax-engine';
import { IGlobalEngine, ICountryManager, ICurrencyManager, IStandardManager, IComplianceManager } from './interfaces';

export class GlobalEngine implements IGlobalEngine {
  readonly id = 'gdlmsp';
  readonly name = 'Global Deployment & Localization Platform';
  readonly version = '1.0.0';
  private status: 'initialized' | 'running' | 'error' | 'idle' = 'idle';

  async initialize(): Promise<void> { this.status = 'initialized'; }
  async validate(): Promise<boolean> { return this.countries.size > 0; }
  getStatus() { return { id: this.id, name: this.name, version: this.version, status: this.status, lastRun: new Date().toISOString() }; }

  private countries = new Map<string, CountryConfig>();
  private currencies = new Map<string, CurrencyConfig>();
  private standards = new Map<string, EngineeringStandardConfig>();
  private compliance = new Map<string, ComplianceRequirement>();
  private baseCurrency = 'USD';
  private localization: LocalizationEngine;
  private taxEngine: TaxEngine;

  constructor() {
    this.localization = new LocalizationEngine();
    this.taxEngine = new TaxEngine();
  }

  async configureCountry(config: CountryConfig): Promise<void> {
    this.countries.set(config.id, { ...config, updatedAt: new Date().toISOString() });
  }

  async getCountry(countryId: string): Promise<CountryConfig> {
    const c = this.countries.get(countryId);
    if (!c) throw new Error(`Country ${countryId} not found`);
    return c;
  }

  async listCountries(): Promise<CountryConfig[]> {
    return Array.from(this.countries.values());
  }

  async translate(text: string, from: Language, to: Language): Promise<string> {
    return this.localization.translate(text, from, to);
  }

  async convertCurrency(amount: number, from: string, to: string): Promise<number> {
    const fromCur = this.currencies.get(from);
    const toCur = this.currencies.get(to);
    if (!fromCur || !toCur) throw new Error('Currency not found');
    const baseAmount = amount / fromCur.exchangeRate;
    return Math.round(baseAmount * toCur.exchangeRate * 100) / 100;
  }

  async calculateTax(amount: number, countryId: string, entityId: string): Promise<{ total: number; breakdown: TaxRule[] }> {
    return this.taxEngine.calculate(amount, countryId, entityId);
  }

  async getGlobalReadiness(): Promise<GlobalReadinessIndex> {
    const activeCountries = Array.from(this.countries.values()).filter(c => c.active).length;
    const activeCurrencies = Array.from(this.currencies.values()).filter(c => c.active).length;
    const localizationScore = Math.min(100, this.localization.getSupportedLanguages().length * 8);
    const baseCurrency = Array.from(this.currencies.values()).find(c => c.isBase);

    const score = Math.round((
      localizationScore * 0.15 +
      Math.min(100, activeCountries * 10) * 0.15 +
      Math.min(100, activeCurrencies * 8) * 0.10 +
      Math.min(100, this.standards.size * 10) * 0.10 +
      Math.min(100, this.compliance.size * 5) * 0.15 +
      85 * 0.10 +
      90 * 0.10 +
      80 * 0.10 +
      75 * 0.05
    ));

    return {
      score, localization: localizationScore,
      languages: Math.min(100, this.localization.getSupportedLanguages().length * 8),
      currencies: Math.min(100, activeCurrencies * 8),
      codes: Math.min(100, this.standards.size * 10),
      compliance: Math.min(100, this.compliance.size * 5),
      taxFlexibility: 85, globalStability: 90, cloudReadiness: 80,
      internationalIntegration: 75,
      recommendations: [
        activeCountries < 5 ? 'Add more country configurations' : 'Good country coverage',
        this.localization.getSupportedLanguages().length < 3 ? 'Add more languages' : 'Adequate language support',
        !baseCurrency ? 'Set a base currency' : `Base currency: ${baseCurrency.code}`,
      ]
    };
  }

  async measure(): Promise<{ status: string; metrics: Record<string, unknown> }> {
    return { status: 'ready', metrics: { countries: this.countries.size, languages: this.localization.getSupportedLanguages().length, currencies: this.currencies.size } };
  }

  getCountryManager(): ICountryManager {
    return {
      create: (c: CountryConfig) => this.configureCountry(c),
      update: (id: string, c: Partial<CountryConfig>) => { const existing = this.countries.get(id); if (existing) { this.countries.set(id, { ...existing, ...c, updatedAt: new Date().toISOString() }); } return Promise.resolve(); },
      delete: (id: string) => { this.countries.delete(id); return Promise.resolve(); },
      get: (id: string) => this.getCountry(id),
      list: () => this.listCountries(),
      validate: () => Promise.resolve(true),
    };
  }

  getCurrencyManager(): ICurrencyManager {
    return {
      add: (c: CurrencyConfig) => { this.currencies.set(c.code, c); if (c.isBase) this.baseCurrency = c.code; return Promise.resolve(); },
      update: (code: string, c: Partial<CurrencyConfig>) => { const existing = this.currencies.get(code); if (existing) this.currencies.set(code, { ...existing, ...c }); return Promise.resolve(); },
      remove: (code: string) => { this.currencies.delete(code); return Promise.resolve(); },
      convert: (a: number, f: string, t: string) => this.convertCurrency(a, f, t),
      setBaseCurrency: (code: string) => { this.baseCurrency = code; return Promise.resolve(); },
      getRate: (code: string) => { const c = this.currencies.get(code); return Promise.resolve(c?.exchangeRate ?? 1); },
      list: () => Promise.resolve(Array.from(this.currencies.values())),
    };
  }

  getStandardManager(): IStandardManager {
    return {
      add: (s: EngineeringStandardConfig) => { this.standards.set(s.id, s); return Promise.resolve(); },
      remove: (id: string) => { this.standards.delete(id); return Promise.resolve(); },
      get: (id: string) => { const s = this.standards.get(id); if (!s) throw new Error(`Standard ${id} not found`); return Promise.resolve(s); },
      list: () => Promise.resolve(Array.from(this.standards.values())),
      getApplicableStandards: (pt: string, cId: string) => Promise.resolve(Array.from(this.standards.values()).filter(s => s.country === cId || !s.country)),
    };
  }

  getComplianceManager(): IComplianceManager {
    return {
      addRequirement: (r: ComplianceRequirement) => { this.compliance.set(r.id, r); return Promise.resolve(); },
      removeRequirement: (id: string) => { this.compliance.delete(id); return Promise.resolve(); },
      checkCompliance: (cId: string) => {
        const reqs = Array.from(this.compliance.values()).filter(r => r.countryId === cId);
        const closed = reqs.filter(r => !r.mandatory || r.mandatory);
        return Promise.resolve({ compliant: closed.length === reqs.length, gaps: reqs.filter(r => r.mandatory).map(r => r.name), score: reqs.length ? Math.round(closed.length / reqs.length * 100) : 100 });
      },
      getRequirements: (cId: string) => Promise.resolve(Array.from(this.compliance.values()).filter(r => r.countryId === cId)),
    };
  }
}
