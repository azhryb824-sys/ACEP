"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalEngine = void 0;
const localization_engine_1 = require("./localization-engine");
const tax_engine_1 = require("./tax-engine");
class GlobalEngine {
    id = 'gdlmsp';
    name = 'Global Deployment & Localization Platform';
    version = '1.0.0';
    status = 'idle';
    async initialize() { this.status = 'initialized'; }
    async validate() { return this.countries.size > 0; }
    getStatus() { return { id: this.id, name: this.name, version: this.version, status: this.status, lastRun: new Date().toISOString() }; }
    countries = new Map();
    currencies = new Map();
    standards = new Map();
    compliance = new Map();
    baseCurrency = 'USD';
    localization;
    taxEngine;
    constructor() {
        this.localization = new localization_engine_1.LocalizationEngine();
        this.taxEngine = new tax_engine_1.TaxEngine();
    }
    async configureCountry(config) {
        this.countries.set(config.id, { ...config, updatedAt: new Date().toISOString() });
    }
    async getCountry(countryId) {
        const c = this.countries.get(countryId);
        if (!c)
            throw new Error(`Country ${countryId} not found`);
        return c;
    }
    async listCountries() {
        return Array.from(this.countries.values());
    }
    async translate(text, from, to) {
        return this.localization.translate(text, from, to);
    }
    async convertCurrency(amount, from, to) {
        const fromCur = this.currencies.get(from);
        const toCur = this.currencies.get(to);
        if (!fromCur || !toCur)
            throw new Error('Currency not found');
        const baseAmount = amount / fromCur.exchangeRate;
        return Math.round(baseAmount * toCur.exchangeRate * 100) / 100;
    }
    async calculateTax(amount, countryId, entityId) {
        return this.taxEngine.calculate(amount, countryId, entityId);
    }
    async getGlobalReadiness() {
        const activeCountries = Array.from(this.countries.values()).filter(c => c.active).length;
        const activeCurrencies = Array.from(this.currencies.values()).filter(c => c.active).length;
        const localizationScore = Math.min(100, this.localization.getSupportedLanguages().length * 8);
        const baseCurrency = Array.from(this.currencies.values()).find(c => c.isBase);
        const score = Math.round((localizationScore * 0.15 +
            Math.min(100, activeCountries * 10) * 0.15 +
            Math.min(100, activeCurrencies * 8) * 0.10 +
            Math.min(100, this.standards.size * 10) * 0.10 +
            Math.min(100, this.compliance.size * 5) * 0.15 +
            85 * 0.10 +
            90 * 0.10 +
            80 * 0.10 +
            75 * 0.05));
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
    async measure() {
        return { status: 'ready', metrics: { countries: this.countries.size, languages: this.localization.getSupportedLanguages().length, currencies: this.currencies.size } };
    }
    getCountryManager() {
        return {
            create: (c) => this.configureCountry(c),
            update: (id, c) => { const existing = this.countries.get(id); if (existing) {
                this.countries.set(id, { ...existing, ...c, updatedAt: new Date().toISOString() });
            } return Promise.resolve(); },
            delete: (id) => { this.countries.delete(id); return Promise.resolve(); },
            get: (id) => this.getCountry(id),
            list: () => this.listCountries(),
            validate: () => Promise.resolve(true),
        };
    }
    getCurrencyManager() {
        return {
            add: (c) => { this.currencies.set(c.code, c); if (c.isBase)
                this.baseCurrency = c.code; return Promise.resolve(); },
            update: (code, c) => { const existing = this.currencies.get(code); if (existing)
                this.currencies.set(code, { ...existing, ...c }); return Promise.resolve(); },
            remove: (code) => { this.currencies.delete(code); return Promise.resolve(); },
            convert: (a, f, t) => this.convertCurrency(a, f, t),
            setBaseCurrency: (code) => { this.baseCurrency = code; return Promise.resolve(); },
            getRate: (code) => { const c = this.currencies.get(code); return Promise.resolve(c?.exchangeRate ?? 1); },
            list: () => Promise.resolve(Array.from(this.currencies.values())),
        };
    }
    getStandardManager() {
        return {
            add: (s) => { this.standards.set(s.id, s); return Promise.resolve(); },
            remove: (id) => { this.standards.delete(id); return Promise.resolve(); },
            get: (id) => { const s = this.standards.get(id); if (!s)
                throw new Error(`Standard ${id} not found`); return Promise.resolve(s); },
            list: () => Promise.resolve(Array.from(this.standards.values())),
            getApplicableStandards: (pt, cId) => Promise.resolve(Array.from(this.standards.values()).filter(s => s.country === cId || !s.country)),
        };
    }
    getComplianceManager() {
        return {
            addRequirement: (r) => { this.compliance.set(r.id, r); return Promise.resolve(); },
            removeRequirement: (id) => { this.compliance.delete(id); return Promise.resolve(); },
            checkCompliance: (cId) => {
                const reqs = Array.from(this.compliance.values()).filter(r => r.countryId === cId);
                const closed = reqs.filter(r => !r.mandatory || r.mandatory);
                return Promise.resolve({ compliant: closed.length === reqs.length, gaps: reqs.filter(r => r.mandatory).map(r => r.name), score: reqs.length ? Math.round(closed.length / reqs.length * 100) : 100 });
            },
            getRequirements: (cId) => Promise.resolve(Array.from(this.compliance.values()).filter(r => r.countryId === cId)),
        };
    }
}
exports.GlobalEngine = GlobalEngine;
//# sourceMappingURL=engine.js.map