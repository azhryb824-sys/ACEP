import { Language, TranslationEntry } from './types';

export class LocalizationEngine {
  private translations = new Map<string, TranslationEntry>();
  private glossary = new Map<string, Record<string, string>>();
  private supportedLanguages: Set<Language> = new Set([
    Language.Arabic, Language.English
  ]);

  constructor() {
    this.addDefaultTranslations();
  }

  private addDefaultTranslations() {
    const defaults: Record<string, Record<string, string>> = {
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

  async setLanguage(lang: Language): Promise<void> {
    this.supportedLanguages.add(lang);
  }

  async getString(key: string, lang?: Language): Promise<string> {
    const entry = this.translations.get(key);
    if (!entry) return key;
    const l = lang || Language.English;
    return entry.values[l] || entry.values[Language.English] || key;
  }

  async addTranslation(entry: TranslationEntry): Promise<void> {
    this.translations.set(entry.key, entry);
  }

  async addGlossaryTerm(term: string, translations: Record<string, string>): Promise<void> {
    this.glossary.set(term, translations);
  }

  async translate(text: string, from: Language, to: Language): Promise<string> {
    if (from === to) return text;
    const entry = this.translations.get(text);
    if (entry && entry.values[to]) return entry.values[to];
    for (const [, term] of this.glossary) {
      if (term[from] && term[to]) {
        text = text.replace(new RegExp(term[from], 'gi'), term[to]);
      }
    }
    return `${text} [${to}]`;
  }

  getSupportedLanguages(): Language[] {
    return Array.from(this.supportedLanguages);
  }

  async exportTranslations(lang: Language): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const [key, entry] of this.translations) {
      result[key] = entry.values[lang] || entry.values[Language.English] || key;
    }
    return result;
  }
}
