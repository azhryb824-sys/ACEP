import { Language, TranslationEntry } from './types';
export declare class LocalizationEngine {
    private translations;
    private glossary;
    private supportedLanguages;
    constructor();
    private addDefaultTranslations;
    setLanguage(lang: Language): Promise<void>;
    getString(key: string, lang?: Language): Promise<string>;
    addTranslation(entry: TranslationEntry): Promise<void>;
    addGlossaryTerm(term: string, translations: Record<string, string>): Promise<void>;
    translate(text: string, from: Language, to: Language): Promise<string>;
    getSupportedLanguages(): Language[];
    exportTranslations(lang: Language): Promise<Record<string, string>>;
}
//# sourceMappingURL=localization-engine.d.ts.map