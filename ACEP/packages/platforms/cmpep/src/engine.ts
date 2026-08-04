import {
  CompanyProfile,
  SmartRating,
  Tender,
  TenderStatus,
  Bid,
  BidComparison,
  MarketplaceItem,
  MarketplaceCategory,
  ListingType,
  SmartPricing,
  PaymentEngine,
  PaymentOrder,
  Invoice,
  PaymentClaim,
  ProgressPayment,
  Guarantee,
  LetterOfCredit,
  Collection,
  TrustedPartnerIndex,
  PartnerRelationship,
  PartnerType,
  MatchResult,
  MatchAlternative,
} from './types';

import {
  IMarketplaceEngine,
  CompanySearchCriteria,
  MatchFilters,
  ItemSearchFilters,
} from './interfaces';

export class MarketplaceEngine implements IMarketplaceEngine {
  name = 'MarketplaceEngine';
  version = '1.0.0';

  private companies: Map<string, CompanyProfile> = new Map();
  private smartRatings: Map<string, SmartRating> = new Map();
  private tenders: Map<string, Tender> = new Map();
  private bids: Map<string, Bid> = new Map();
  private marketplaceItems: Map<string, MarketplaceItem> = new Map();
  private smartPricings: Map<string, SmartPricing> = new Map();
  private paymentEngines: Map<string, PaymentEngine> = new Map();
  private tpiIndex: Map<string, TrustedPartnerIndex> = new Map();
  private relationships: PartnerRelationship[] = [];
  private equipmentCatalog: Map<string, string[]> = new Map();

  constructor() {
    this.initializeEquipmentCatalog();
  }

  private initializeEquipmentCatalog(): void {
    this.equipmentCatalog.set('excavators', ['caterpillar', 'komatsu', 'hitachi', 'volvo']);
    this.equipmentCatalog.set('cranes', ['liebherr', 'tadano', 'grove', 'demag']);
    this.equipmentCatalog.set('concrete_pumps', ['putzmeister', 'schwing', 'zoomlion']);
    this.equipmentCatalog.set('elevators', ['otis', 'schindler', 'kone', 'thyssenkrupp', 'mitsubishi', 'fujitec']);
    this.equipmentCatalog.set('hvac', ['carrier', 'trane', 'daikin', 'lg', 'mitsubishi_electric']);
    this.equipmentCatalog.set('steel', ['sabic', 'arcelormittal', 'nucor', 'posco']);
    this.equipmentCatalog.set('cables', ['nexans', 'prysmian', 'sumitomo', 'southwire']);
    this.equipmentCatalog.set('smart_systems', ['siemens', 'honeywell', 'schneider', 'bosch', 'abb']);
  }

  async initialize(): Promise<void> {
    console.log(`[${this.name}] Initializing CMPEP Marketplace Engine v${this.version}`);
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.name}] Shutting down`);
  }

  // ── Company Registration & Smart Profile Management ──────────────────────

  async registerCompany(profile: CompanyProfile): Promise<CompanyProfile> {
    if (this.companies.has(profile.companyId)) {
      throw new Error(`Company ${profile.companyId} already registered`);
    }
    this.companies.set(profile.companyId, profile);
    await this.calculateSmartRating(profile.companyId);
    await this.calculateTPI(profile.companyId);
    this.paymentEngines.set(profile.companyId, {
      paymentOrders: [],
      invoices: [],
      claims: [],
      progressPayments: [],
      guarantees: [],
      lettersOfCredit: [],
      collections: [],
    });
    return profile;
  }

  async updateCompany(profile: CompanyProfile): Promise<CompanyProfile> {
    if (!this.companies.has(profile.companyId)) {
      throw new Error(`Company ${profile.companyId} not found`);
    }
    this.companies.set(profile.companyId, profile);
    return profile;
  }

  async getCompany(companyId: string): Promise<CompanyProfile | null> {
    return this.companies.get(companyId) ?? null;
  }

  async searchCompanies(criteria: CompanySearchCriteria): Promise<CompanyProfile[]> {
    let results = Array.from(this.companies.values());

    if (criteria.partnerType) {
      results = results.filter(c => c.partnerType === criteria.partnerType || this.matchesPartnerType(c.partnerType, criteria.partnerType!));
    }
    if (criteria.country) {
      results = results.filter(c => c.country === criteria.country);
    }
    if (criteria.city) {
      results = results.filter(c => c.cities.includes(criteria.city!));
    }
    if (criteria.specialization) {
      results = results.filter(c => c.specializations.some(s => s.toLowerCase().includes(criteria.specialization!.toLowerCase())));
    }
    if (criteria.minRating) {
      results = results.filter(c => {
        const rating = this.smartRatings.get(c.companyId);
        return rating && rating.overall >= criteria.minRating!;
      });
    }
    if (criteria.minYearsExp) {
      results = results.filter(c => c.yearsExp >= criteria.minYearsExp!);
    }
    if (criteria.certs && criteria.certs.length > 0) {
      results = results.filter(c => criteria.certs!.some(cert => c.certs.includes(cert)));
    }

    const page = criteria.page ?? 1;
    const limit = criteria.limit ?? 20;
    const start = (page - 1) * limit;
    return results.slice(start, start + limit);
  }

  private matchesPartnerType(actual: PartnerType, requested: PartnerType): boolean {
    const actualStr = actual;
    const requestedStr = requested;
    if (actualStr === requestedStr) return true;
    if (actualStr.startsWith(requestedStr)) return true;
    if (requestedStr === PartnerType.Contractor && (actualStr === PartnerType.ContractorMain || actualStr === PartnerType.ContractorSub || actualStr === PartnerType.ContractorSpecialized)) return true;
    if (requestedStr === PartnerType.Supplier && actualStr.startsWith('supplier_')) return true;
    if (requestedStr === PartnerType.Manufacturer && actualStr.startsWith('manufacturer_')) return true;
    if (requestedStr === PartnerType.ServiceProvider && actualStr.startsWith('service_provider_')) return true;
    if (requestedStr === PartnerType.Consultant && actualStr.startsWith('consultant_')) return true;
    return false;
  }

  // ── Smart Rating Calculation ─────────────────────────────────────────────

  async calculateSmartRating(companyId: string): Promise<SmartRating> {
    const company = this.companies.get(companyId);
    if (!company) throw new Error(`Company ${companyId} not found`);

    const avgRating = company.ratings.length > 0
      ? company.ratings.reduce((s, r) => s + r.score, 0) / company.ratings.length
      : 0;

    const expFactor = Math.min(company.yearsExp / 30, 1) * 10;
    const projectFactor = Math.min(company.projects / 100, 1) * 10;
    const complaintPenalty = avgRating > 0 ? Math.max(0, 10 - (company.ratings.filter(r => r.score < 3).length * 2)) : 5;

    const execution = this.weightedScore([
      { value: avgRating, weight: 0.5 },
      { value: projectFactor, weight: 0.3 },
      { value: expFactor, weight: 0.2 },
    ]);
    const schedule = this.weightedScore([
      { value: avgRating * 0.9, weight: 0.4 },
      { value: expFactor, weight: 0.3 },
      { value: this.companies.size > 0 ? 8 : 5, weight: 0.3 },
    ]);
    const contract = this.weightedScore([
      { value: avgRating, weight: 0.6 },
      { value: company.licenses.length * 2, weight: 0.2 },
      { value: expFactor, weight: 0.2 },
    ]);
    const product = this.weightedScore([
      { value: avgRating, weight: 0.5 },
      { value: projectFactor, weight: 0.3 },
      { value: company.certs.length > 0 ? 8 : 4, weight: 0.2 },
    ]);
    const response = this.weightedScore([
      { value: complaintPenalty, weight: 0.5 },
      { value: company.contacts.email ? 8 : 4, weight: 0.25 },
      { value: company.website ? 7 : 5, weight: 0.25 },
    ]);
    const satisfaction = this.weightedScore([
      { value: avgRating, weight: 0.6 },
      { value: company.ratings.filter(r => r.score >= 4).length * 2, weight: 0.2 },
      { value: 10 - complaintPenalty, weight: 0.2 },
    ]);
    const complaints = Math.max(0, 10 - complaintPenalty);
    const rework = this.weightedScore([
      { value: 10 - complaintPenalty * 0.5, weight: 0.5 },
      { value: expFactor, weight: 0.3 },
      { value: 7, weight: 0.2 },
    ]);
    const financial = this.weightedScore([
      { value: company.payment.maxCredit > 0 ? 8 : 4, weight: 0.4 },
      { value: avgRating, weight: 0.3 },
      { value: company.branches > 1 ? 8 : 5, weight: 0.3 },
    ]);
    const safety = this.weightedScore([
      { value: company.licenses.length > 0 ? 8 : 3, weight: 0.5 },
      { value: expFactor, weight: 0.3 },
      { value: company.size !== 'micro' ? 7 : 4, weight: 0.2 },
    ]);

    const overall = this.weightedScore([
      { value: execution, weight: 0.15 },
      { value: schedule, weight: 0.10 },
      { value: contract, weight: 0.10 },
      { value: product, weight: 0.10 },
      { value: response, weight: 0.10 },
      { value: satisfaction, weight: 0.10 },
      { value: complaints, weight: 0.05 },
      { value: rework, weight: 0.05 },
      { value: financial, weight: 0.15 },
      { value: safety, weight: 0.10 },
    ]);

    const rating: SmartRating = {
      companyId,
      execution: Math.round(execution * 10) / 10,
      schedule: Math.round(schedule * 10) / 10,
      contract: Math.round(contract * 10) / 10,
      product: Math.round(product * 10) / 10,
      response: Math.round(response * 10) / 10,
      satisfaction: Math.round(satisfaction * 10) / 10,
      complaints: Math.round(complaints * 10) / 10,
      rework: Math.round(rework * 10) / 10,
      financial: Math.round(financial * 10) / 10,
      safety: Math.round(safety * 10) / 10,
      overall: Math.round(overall * 10) / 10,
      lastUpdated: new Date().toISOString(),
    };

    this.smartRatings.set(companyId, rating);
    return rating;
  }

  private weightedScore(items: { value: number; weight: number }[]): number {
    const totalWeight = items.reduce((s, i) => s + i.weight, 0);
    if (totalWeight === 0) return 0;
    return Math.min(10, Math.max(0, items.reduce((s, i) => s + i.value * i.weight, 0) / totalWeight));
  }

  async getSmartRating(companyId: string): Promise<SmartRating | null> {
    return this.smartRatings.get(companyId) ?? null;
  }

  // ── AI Matching ──────────────────────────────────────────────────────────

  async findBestPartner(query: string, filters?: MatchFilters): Promise<MatchResult[]> {
    const ql = query.toLowerCase();
    let candidates = Array.from(this.companies.values());

    if (filters?.minRating) {
      candidates = candidates.filter(c => {
        const r = this.smartRatings.get(c.companyId);
        return r && r.overall >= filters.minRating!;
      });
    }
    if (filters?.city) {
      candidates = candidates.filter(c => c.cities.includes(filters.city!));
    }
    if (filters?.requiredCerts) {
      candidates = candidates.filter(c => filters.requiredCerts!.some(cert => c.certs.includes(cert)));
    }

    const scored = candidates.map(c => {
      let score = 0;
      let reasons: string[] = [];

      // Parse query for keywords
      if (ql.includes('elevator') || ql.includes('elevators') || ql.includes('lift')) {
        if (c.specializations.some(s => /elevator|lift|vertical/i.test(s))) {
          score += 30;
          reasons.push('Specializes in elevators/lifts');
        }
        if (c.partnerType === PartnerType.SupplierElevators || c.partnerType === PartnerType.ManufacturerElevators) {
          score += 20;
          reasons.push('Elevator supplier/manufacturer');
        }
      }
      if (ql.includes('best') || ql.includes('top') || ql.includes('highest')) {
        const rating = this.smartRatings.get(c.companyId);
        if (rating && rating.overall >= 8) {
          score += 15;
          reasons.push(`High smart rating: ${rating.overall.toFixed(1)}/10`);
        }
      }
      if (ql.includes('cheap') || ql.includes('lowest price') || ql.includes('budget')) {
        score += 5;
        reasons.push('Competitive pricing');
      }
      if (ql.includes('quality')) {
        const rating = this.smartRatings.get(c.companyId);
        if (rating && rating.product >= 7) {
          score += 15;
          reasons.push(`High product quality rating: ${rating.product.toFixed(1)}/10`);
        }
      }
      if (ql.includes('finishing') || ql.includes('fit out') || ql.includes('interior')) {
        if (c.specializations.some(s => /finish|interior|fit.?out/i.test(s))) {
          score += 25;
          reasons.push('Specializes in finishing works');
        }
      }
      if (ql.includes('residential') || ql.includes('villa') || ql.includes('apartment')) {
        if (c.specializations.some(s => /residential|villa|apartment|housing/i.test(s))) {
          score += 20;
          reasons.push('Residential project experience');
        }
      }
      if (ql.includes('riyadh')) {
        if (c.cities.some(city => /riyadh/i.test(city))) {
          score += 20;
          reasons.push('Located in Riyadh');
        }
      }
      if (ql.includes('jeddah')) {
        if (c.cities.some(city => /jeddah/i.test(city))) {
          score += 20;
          reasons.push('Located in Jeddah');
        }
      }
      if (ql.includes('dammam') || ql.includes('khobar') || ql.includes('eastern')) {
        if (c.cities.some(city => /dammam|khobar|eastern|dhahran/i.test(city))) {
          score += 20;
          reasons.push('Located in Eastern Province');
        }
      }
      if (ql.includes('steel')) {
        if (c.specializations.some(s => /steel|metal/i.test(s)) ||
            c.partnerType === PartnerType.SupplierSteel ||
            c.partnerType === PartnerType.ManufacturerSteel) {
          score += 25;
          reasons.push('Steel specialist');
        }
      }
      if (ql.includes('concrete')) {
        if (c.specializations.some(s => /concrete/i.test(s)) ||
            c.partnerType === PartnerType.SupplierConcrete ||
            c.partnerType === PartnerType.ManufacturerConcrete) {
          score += 25;
          reasons.push('Concrete specialist');
        }
      }

      // General score boost from smart rating
      const rating = this.smartRatings.get(c.companyId);
      if (rating) {
        score += rating.overall * 1.5;
        reasons.push(`Smart rating contributes ${(rating.overall * 1.5).toFixed(1)} points`);
      }

      // Experience boost
      score += Math.min(c.yearsExp * 0.5, 10);
      if (c.yearsExp >= 10) reasons.push(`${c.yearsExp}+ years experience`);
      score += Math.min(c.projects * 0.1, 10);
      if (c.projects >= 20) reasons.push(`${c.projects}+ completed projects`);

      return { company: c, score, reasons };
    });

    scored.sort((a, b) => b.score - a.score);
    const topScore = scored.length > 0 ? scored[0].score : 1;

    return scored.slice(0, 5).map(s => {
      const confidence = Math.min(95, Math.round((s.score / (topScore || 1)) * 100));
      const riskItems: string[] = [];
      const rating = this.smartRatings.get(s.company.companyId);
      if (rating && rating.financial < 6) riskItems.push('Below-average financial rating');
      if (rating && rating.schedule < 6) riskItems.push('Schedule performance concerns');
      if (s.company.yearsExp < 3) riskItems.push('Limited industry experience');
      if (s.company.ratings.length < 2) riskItems.push('Insufficient rating data');

      const alternatives = scored
        .filter(a => a.company.companyId !== s.company.companyId)
        .slice(0, 3)
        .map(a => ({
          partnerId: a.company.companyId,
          score: Math.round((a.score / (topScore || 1)) * 100),
          reason: a.reasons.slice(0, 2).join('; '),
        }));

      return {
        partnerId: s.company.companyId,
        score: Math.round(confidence * 10) / 10,
        confidence,
        reason: s.reasons.slice(0, 3).join('. ') || 'Suitable match based on profile',
        alternatives,
        risks: riskItems,
      };
    });
  }

  async matchForProject(projectId: string, partnerType: PartnerType): Promise<MatchResult[]> {
    return this.findBestPartner(`partner for project ${projectId}`, {});
  }

  // ── Tender Management ────────────────────────────────────────────────────

  async createTender(tender: Tender): Promise<Tender> {
    if (this.tenders.has(tender.id)) {
      throw new Error(`Tender ${tender.id} already exists`);
    }
    if (!tender.status) tender.status = TenderStatus.Draft;
    if (!tender.createdAt) tender.createdAt = new Date().toISOString();
    if (!tender.updatedAt) tender.updatedAt = new Date().toISOString();
    tender.bids = [];
    tender.invitedPartners = [];
    this.tenders.set(tender.id, tender);
    return tender;
  }

  async invitePartners(tenderId: string, partnerIds: string[]): Promise<void> {
    const tender = this.tenders.get(tenderId);
    if (!tender) throw new Error(`Tender ${tenderId} not found`);

    for (const pid of partnerIds) {
      if (!this.companies.has(pid)) throw new Error(`Partner ${pid} not found`);
      if (!tender.invitedPartners.includes(pid)) {
        tender.invitedPartners.push(pid);
      }
    }
    tender.status = TenderStatus.Inviting;
    tender.updatedAt = new Date().toISOString();
  }

  async submitBid(bid: Bid): Promise<Bid> {
    const tender = this.tenders.get(bid.tenderId);
    if (!tender) throw new Error(`Tender ${bid.tenderId} not found`);
    if (tender.status !== TenderStatus.Receiving && tender.status !== TenderStatus.Inviting) {
      throw new Error(`Tender ${bid.tenderId} is not accepting bids`);
    }

    this.bids.set(bid.id, bid);
    tender.bids.push(bid);
    tender.status = TenderStatus.Receiving;
    tender.updatedAt = new Date().toISOString();
    return bid;
  }

  async analyzeBids(tenderId: string): Promise<BidComparison[]> {
    const tender = this.tenders.get(tenderId);
    if (!tender) throw new Error(`Tender ${tenderId} not found`);
    if (tender.bids.length === 0) throw new Error(`No bids for tender ${tenderId}`);

    const comparisons: BidComparison[] = tender.bids.map(bid => {
      const company = this.companies.get(bid.partnerId);
      const rating = this.smartRatings.get(bid.partnerId);

      const priceScore = this.normalizePrice(bid.price, tender.bids);
      const qualityScore = rating ? rating.product : 5;
      const durationScore = this.normalizeDuration(bid.duration, tender.bids);
      const warrantyScore = Math.min(bid.warranty / 12 * 2, 10);
      const experienceScore = company ? Math.min(company.yearsExp / 3, 10) : 5;
      const capacityScore = company ? Math.min(company.employees / 50 * 5, 10) : 5;
      const pastPerformanceScore = rating ? rating.execution : 5;

      const compositeScore =
        priceScore * 0.30 +
        qualityScore * 0.20 +
        durationScore * 0.15 +
        warrantyScore * 0.10 +
        experienceScore * 0.10 +
        capacityScore * 0.05 +
        pastPerformanceScore * 0.10;

      return {
        bidId: bid.id,
        tenderId: bid.tenderId,
        partnerId: bid.partnerId,
        price: bid.price,
        quality: Math.round(qualityScore * 10) / 10,
        duration: bid.duration,
        warranty: bid.warranty,
        experience: Math.round(experienceScore * 10) / 10,
        capacity: Math.round(capacityScore * 10) / 10,
        pastPerformance: Math.round(pastPerformanceScore * 10) / 10,
        compositeScore: Math.round(compositeScore * 100) / 100,
        rank: 0,
      };
    });

    comparisons.sort((a, b) => b.compositeScore - a.compositeScore);
    comparisons.forEach((c, i) => (c.rank = i + 1));

    tender.status = TenderStatus.Evaluating;
    tender.updatedAt = new Date().toISOString();
    return comparisons;
  }

  private normalizePrice(price: number, allBids: Bid[]): number {
    const prices = allBids.map(b => b.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (max === min) return 10;
    return 10 - ((price - min) / (max - min)) * 5;
  }

  private normalizeDuration(duration: number, allBids: Bid[]): number {
    const durations = allBids.map(b => b.duration);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    if (max === min) return 10;
    return 10 - ((duration - min) / (max - min)) * 5;
  }

  async awardTender(tenderId: string, bidId: string): Promise<Tender> {
    const tender = this.tenders.get(tenderId);
    if (!tender) throw new Error(`Tender ${tenderId} not found`);

    const bid = this.bids.get(bidId);
    if (!bid) throw new Error(`Bid ${bidId} not found`);

    tender.status = TenderStatus.Awarded;
    tender.awardDate = new Date().toISOString();
    tender.updatedAt = new Date().toISOString();
    return tender;
  }

  // ── Marketplace E-Commerce ───────────────────────────────────────────────

  async listItem(item: MarketplaceItem): Promise<MarketplaceItem> {
    if (this.marketplaceItems.has(item.id)) {
      throw new Error(`Item ${item.id} already listed`);
    }
    item.createdAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    this.marketplaceItems.set(item.id, item);
    return item;
  }

  async searchItems(filters: ItemSearchFilters): Promise<MarketplaceItem[]> {
    let results = Array.from(this.marketplaceItems.values());

    if (filters.category) {
      results = results.filter(i => i.category === filters.category);
    }
    if (filters.listingType) {
      results = results.filter(i => i.listingType === filters.listingType);
    }
    if (filters.minPrice !== undefined) {
      results = results.filter(i => i.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      results = results.filter(i => i.price <= filters.maxPrice!);
    }
    if (filters.location) {
      results = results.filter(i => i.location.toLowerCase().includes(filters.location!.toLowerCase()));
    }
    if (filters.companyId) {
      results = results.filter(i => i.companyId === filters.companyId);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const start = (page - 1) * limit;
    return results.slice(start, start + limit);
  }

  async purchaseItem(itemId: string, buyerId: string, quantity: number): Promise<void> {
    const item = this.marketplaceItems.get(itemId);
    if (!item) throw new Error(`Item ${itemId} not found`);
    if (!item.available) throw new Error(`Item ${itemId} is not available`);
    if (item.quantity < quantity) throw new Error(`Insufficient quantity for ${itemId}`);

    item.quantity -= quantity;
    item.updatedAt = new Date().toISOString();

    const order: PaymentOrder = {
      id: `order_${Date.now()}`,
      fromCompanyId: buyerId,
      toCompanyId: item.companyId,
      amount: item.price * quantity,
      currency: item.currency,
      status: 'pending',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      reference: `PO_${itemId}_${buyerId}`,
    };

    const engine = this.paymentEngines.get(buyerId);
    if (engine) {
      engine.paymentOrders.push(order);
    }

    if (item.quantity === 0) item.available = false;
  }

  // ── Smart Pricing ────────────────────────────────────────────────────────

  async getSmartPricing(itemId: string): Promise<SmartPricing> {
    const existing = this.smartPricings.get(itemId);
    if (existing) return existing;

    const item = this.marketplaceItems.get(itemId);
    const basePrice = item ? item.price : 100;

    const pricing: SmartPricing = {
      itemId,
      marketPrice: basePrice,
      historicalPrices: [
        { date: new Date(Date.now() - 365 * 86400000).toISOString(), price: basePrice * 0.9 },
        { date: new Date(Date.now() - 180 * 86400000).toISOString(), price: basePrice * 0.95 },
        { date: new Date().toISOString(), price: basePrice },
      ],
      seasonalChanges: [
        { season: 'winter', multiplier: 0.95 },
        { season: 'spring', multiplier: 1.0 },
        { season: 'summer', multiplier: 1.08 },
        { season: 'fall', multiplier: 1.02 },
      ],
      supplierPrices: [],
      pastProjectPrices: [],
      suggestedRange: {
        min: Math.round(basePrice * 0.85 * 100) / 100,
        max: Math.round(basePrice * 1.15 * 100) / 100,
        recommended: Math.round(basePrice * 1.0 * 100) / 100,
      },
      volatility: 0.12,
      trend: 'stable',
    };

    this.smartPricings.set(itemId, pricing);
    return pricing;
  }

  async suggestPrice(itemId: string): Promise<{ min: number; max: number; recommended: number }> {
    const pricing = await this.getSmartPricing(itemId);
    return pricing.suggestedRange;
  }

  // ── Payment Management ───────────────────────────────────────────────────

  async getPaymentEngine(companyId: string): Promise<PaymentEngine> {
    if (!this.paymentEngines.has(companyId)) {
      this.paymentEngines.set(companyId, {
        paymentOrders: [],
        invoices: [],
        claims: [],
        progressPayments: [],
        guarantees: [],
        lettersOfCredit: [],
        collections: [],
      });
    }
    return this.paymentEngines.get(companyId)!;
  }

  async processPayment(orderId: string): Promise<void> {
    for (const [_, engine] of this.paymentEngines) {
      const order = engine.paymentOrders.find(o => o.id === orderId);
      if (order) {
        if (order.status !== 'pending') throw new Error(`Order ${orderId} is not pending`);
        order.status = 'executed';

        const invoice: Invoice = {
          id: `inv_${Date.now()}`,
          orderId: order.id,
          number: `INV-${order.id.substring(order.id.length - 8).toUpperCase()}`,
          items: [{ description: `Payment for order ${order.id}`, amount: order.amount, quantity: 1, total: order.amount }],
          subtotal: order.amount,
          tax: order.amount * 0.15,
          total: order.amount * 1.15,
          issuedDate: new Date().toISOString(),
          dueDate: order.dueDate,
          status: 'sent',
        };
        engine.invoices.push(invoice);
        return;
      }
    }
    throw new Error(`Order ${orderId} not found`);
  }

  // ── Trusted Partner Index ────────────────────────────────────────────────

  async calculateTPI(companyId: string): Promise<TrustedPartnerIndex> {
    const company = this.companies.get(companyId);
    if (!company) throw new Error(`Company ${companyId} not found`);

    const rating = this.smartRatings.get(companyId);
    const baseRating = rating ? rating.overall : 5;

    const quality = rating ? rating.product : 5;
    const schedule = rating ? rating.schedule : 5;
    const financial = rating ? rating.financial : 5;
    const safety = rating ? rating.safety : 5;
    const contracts = rating ? rating.contract : 5;
    const satisfaction = rating ? rating.satisfaction : 5;
    const response = rating ? rating.response : 5;
    const priceStability = rating ? (10 - Math.abs(baseRating - rating.overall)) : 5;

    const overall = this.weightedScore([
      { value: quality, weight: 0.20 },
      { value: schedule, weight: 0.15 },
      { value: financial, weight: 0.15 },
      { value: safety, weight: 0.10 },
      { value: contracts, weight: 0.10 },
      { value: satisfaction, weight: 0.10 },
      { value: response, weight: 0.10 },
      { value: priceStability, weight: 0.10 },
    ]);

    const tpi: TrustedPartnerIndex = {
      companyId,
      quality: Math.round(quality * 10) / 10,
      schedule: Math.round(schedule * 10) / 10,
      financial: Math.round(financial * 10) / 10,
      safety: Math.round(safety * 10) / 10,
      contracts: Math.round(contracts * 10) / 10,
      satisfaction: Math.round(satisfaction * 10) / 10,
      response: Math.round(response * 10) / 10,
      priceStability: Math.round(priceStability * 10) / 10,
      overall: Math.round(overall * 10) / 10,
      lastCalculated: new Date().toISOString(),
    };

    this.tpiIndex.set(companyId, tpi);
    return tpi;
  }

  async getTPI(companyId: string): Promise<TrustedPartnerIndex | null> {
    return this.tpiIndex.get(companyId) ?? null;
  }

  // ── Engineering Business Network ─────────────────────────────────────────

  async getNetwork(companyId: string): Promise<PartnerRelationship[]> {
    return this.relationships.filter(
      r => r.fromCompanyId === companyId || r.toCompanyId === companyId
    );
  }

  async addRelationship(rel: PartnerRelationship): Promise<void> {
    const existing = this.relationships.find(
      r => r.fromCompanyId === rel.fromCompanyId && r.toCompanyId === rel.toCompanyId && r.relationshipType === rel.relationshipType
    );
    if (existing) {
      Object.assign(existing, rel);
    } else {
      this.relationships.push(rel);
    }
  }

  // ── Integration Stubs ────────────────────────────────────────────────────

  async syncWithCRM(companyId: string): Promise<void> {
    console.log(`[CRM Sync] Syncing company ${companyId}`);
  }

  async syncWithERP(companyId: string): Promise<void> {
    console.log(`[ERP Sync] Syncing financial data for ${companyId}`);
  }

  async syncWithFinancialIntelligence(companyId: string): Promise<void> {
    console.log(`[Financial Intelligence] Analyzing ${companyId}`);
  }

  async syncWithKnowledgeGraph(companyId: string): Promise<void> {
    console.log(`[Knowledge Graph] Updating relationships for ${companyId}`);
  }
}
