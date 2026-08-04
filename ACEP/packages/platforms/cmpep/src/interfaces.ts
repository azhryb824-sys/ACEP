import {
  CompanyProfile,
  SmartRating,
  Tender,
  Bid,
  BidComparison,
  MarketplaceItem,
  SmartPricing,
  PaymentEngine,
  TrustedPartnerIndex,
  MatchResult,
  PartnerRelationship,
  PartnerType,
} from './types';

export interface IEngine {
  name: string;
  version: string;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface IMarketplaceEngine extends IEngine {
  // Company management
  registerCompany(profile: CompanyProfile): Promise<CompanyProfile>;
  updateCompany(profile: CompanyProfile): Promise<CompanyProfile>;
  getCompany(companyId: string): Promise<CompanyProfile | null>;
  searchCompanies(criteria: CompanySearchCriteria): Promise<CompanyProfile[]>;

  // Smart rating
  calculateSmartRating(companyId: string): Promise<SmartRating>;
  getSmartRating(companyId: string): Promise<SmartRating | null>;

  // AI matching
  findBestPartner(query: string, filters?: MatchFilters): Promise<MatchResult[]>;
  matchForProject(projectId: string, partnerType: PartnerType): Promise<MatchResult[]>;

  // Tender management
  createTender(tender: Tender): Promise<Tender>;
  invitePartners(tenderId: string, partnerIds: string[]): Promise<void>;
  submitBid(bid: Bid): Promise<Bid>;
  analyzeBids(tenderId: string): Promise<BidComparison[]>;
  awardTender(tenderId: string, bidId: string): Promise<Tender>;

  // Marketplace
  listItem(item: MarketplaceItem): Promise<MarketplaceItem>;
  searchItems(filters: ItemSearchFilters): Promise<MarketplaceItem[]>;
  purchaseItem(itemId: string, buyerId: string, quantity: number): Promise<void>;

  // Smart pricing
  getSmartPricing(itemId: string): Promise<SmartPricing>;
  suggestPrice(itemId: string): Promise<{ min: number; max: number; recommended: number }>;

  // Payment
  getPaymentEngine(companyId: string): Promise<PaymentEngine>;
  processPayment(orderId: string): Promise<void>;

  // Trusted partner index
  calculateTPI(companyId: string): Promise<TrustedPartnerIndex>;
  getTPI(companyId: string): Promise<TrustedPartnerIndex | null>;

  // Network
  getNetwork(companyId: string): Promise<PartnerRelationship[]>;
  addRelationship(rel: PartnerRelationship): Promise<void>;
}

export interface CompanySearchCriteria {
  partnerType?: PartnerType;
  country?: string;
  city?: string;
  specialization?: string;
  minRating?: number;
  minYearsExp?: number;
  certs?: string[];
  page?: number;
  limit?: number;
}

export interface MatchFilters {
  minRating?: number;
  maxBudget?: number;
  city?: string;
  requiredCerts?: string[];
  projectType?: string;
}

export interface ItemSearchFilters {
  category?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  companyId?: string;
  page?: number;
  limit?: number;
}
