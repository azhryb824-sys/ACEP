export enum Language {
  Arabic = 'ar', English = 'en', French = 'fr', Spanish = 'es',
  German = 'de', Italian = 'it', Turkish = 'tr', Russian = 'ru',
  Chinese = 'zh', Japanese = 'ja', Korean = 'ko', Portuguese = 'pt', Hindi = 'hi'
}

export enum EngineeringCode {
  SBC = 'SBC', ACI = 'ACI', Eurocode = 'Eurocode', ASTM = 'ASTM',
  ASCE = 'ASCE', BS = 'BS', IEC = 'IEC', ASME = 'ASME', NFPA = 'NFPA', ISO = 'ISO'
}

export enum MeasurementSystem {
  Metric = 'metric', Imperial = 'imperial', Both = 'both'
}

export enum TaxType {
  Percentage = 'percentage', Fixed = 'fixed'
}

export interface CountryConfig {
  id: string;
  name: string;
  code: string;
  currency: string;
  timezone: string;
  language: Language;
  additionalLanguages: Language[];
  measurementSystem: MeasurementSystem;
  engineeringCode: EngineeringCode;
  taxSystem: string;
  governmentEntities: string[];
  complianceReqs: string[];
  holidays: string[];
  workDays: number[];
  workWeekStart: number;
  workWeekEnd: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationEntry {
  key: string;
  values: Record<string, string>;
  context?: string;
  notes?: string;
  lastUpdated: string;
  verified: boolean;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
  exchangeRate: number;
  rateSource: string;
  rateDate: string;
  isBase: boolean;
  active: boolean;
}

export interface TaxRule {
  id: string;
  name: string;
  rate: number;
  type: TaxType;
  startDate: string;
  endDate?: string;
  region?: string;
  exemptCountries: string[];
  exemptEntities: string[];
  calculationRule: string;
  priority: number;
  active: boolean;
  createdBy: string;
  createdAt: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  modificationReason?: string;
}

export interface EngineeringStandardConfig {
  id: string;
  code: EngineeringCode;
  name: string;
  country: string;
  version: string;
  description: string;
  sections: string[];
  isCustom: boolean;
  active: boolean;
}

export interface ComplianceRequirement {
  id: string;
  countryId: string;
  type: 'license' | 'permit' | 'government' | 'dataRetention' | 'report' | 'safety' | 'quality' | 'environmental';
  name: string;
  description: string;
  mandatory: boolean;
  documents: string[];
  validityPeriod?: number;
  responsibleParty: string;
}

export interface TimezoneConfig {
  id: string;
  name: string;
  offset: string;
  dstEnabled: boolean;
  dstStart?: string;
  dstEnd?: string;
}

export interface RegionalAIModel {
  id: string;
  region: string;
  language: Language;
  supportedCodes: EngineeringCode[];
  contractPatterns: string[];
  reportFormats: string[];
  localRegulations: string[];
}

export interface GlobalReadinessIndex {
  score: number;
  localization: number;
  languages: number;
  currencies: number;
  codes: number;
  compliance: number;
  taxFlexibility: number;
  globalStability: number;
  cloudReadiness: number;
  internationalIntegration: number;
  recommendations: string[];
}

export interface MultiNationalConfig {
  countries: string[];
  baseCurrency: string;
  reportingCurrency: string;
  consolidatedReports: boolean;
  interCompany: boolean;
  globalStandards: EngineeringCode[];
}
