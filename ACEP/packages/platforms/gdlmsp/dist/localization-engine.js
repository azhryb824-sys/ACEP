"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalizationEngine = void 0;
const types_1 = require("./types");
class LocalizationEngine {
    translations = new Map();
    glossary = new Map();
    supportedLanguages = new Set([
        types_1.Language.Arabic, types_1.Language.English
    ]);
    constructor() {
        this.addDefaultTranslations();
    }
    addDefaultTranslations() {
        const defaults = {
            'common.welcome': { ar: 'مرحباً', en: 'Welcome' },
            'common.project': { ar: 'مشروع', en: 'Project' },
            'common.contract': { ar: 'عقد', en: 'Contract' },
            'common.invoice': { ar: 'فاتورة', en: 'Invoice' },
            'common.report': { ar: 'تقرير', en: 'Report' },
            'common.analysis': { ar: 'تحليل', en: 'Analysis' },
            'common.quality': { ar: 'جودة', en: 'Quality' },
        };
        for (const [key, values] of Object.entries(defaults)) {
            this.translations.set(key, { key, values, verified: true, lastUpdated: new Date().toISOString() });
        }
    }
    async setLanguage(lang) {
        this.supportedLanguages.add(lang);
    }
    async getString(key, lang) {
        const entry = this.translations.get(key);
        if (!entry)
            return key;
        const l = lang || types_1.Language.English;
        return entry.values[l] || entry.values[types_1.Language.English] || key;
    }
    async addTranslation(entry) {
        this.translations.set(entry.key, entry);
    }
    async addGlossaryTerm(term, translations) {
        this.glossary.set(term, translations);
    }
    async translate(text, from, to) {
        if (from === to)
            return text;
        const entry = this.translations.get(text);
        if (entry && entry.values[to])
            return entry.values[to];
        for (const [, term] of this.glossary) {
            if (term[from] && term[to]) {
                text = text.replace(new RegExp(term[from], 'gi'), term[to]);
            }
        }
        return `${text} [${to}]`;
    }
    getSupportedLanguages() {
        return Array.from(this.supportedLanguages);
    }
    async exportTranslations(lang) {
        const result = {};
        for (const [key, entry] of this.translations) {
            result[key] = entry.values[lang] || entry.values[types_1.Language.English] || key;
        }
        return result;
    }
}
exports.LocalizationEngine = LocalizationEngine;
//# sourceMappingURL=localization-engine.js.map