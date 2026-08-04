import {
  CompanyProfile,
  SmartRating,
  PartnerType,
  MatchResult,
  MatchAlternative,
  TrustedPartnerIndex,
} from './types';
import { CompanySearchCriteria, MatchFilters } from './interfaces';

export interface AIMatchingConfig {
  minConfidenceThreshold: number;
  maxAlternatives: number;
  useSemanticMatching: boolean;
  useHistoricalPerformance: boolean;
  useTPI: boolean;
}

export class AIMatchingEngine {
  private companies: Map<string, CompanyProfile> = new Map();
  private ratings: Map<string, SmartRating> = new Map();
  private tpiIndex: Map<string, TrustedPartnerIndex> = new Map();

  constructor(
    private config: AIMatchingConfig = {
      minConfidenceThreshold: 40,
      maxAlternatives: 3,
      useSemanticMatching: true,
      useHistoricalPerformance: true,
      useTPI: true,
    }
  ) {}

  loadData(
    companies: Map<string, CompanyProfile>,
    ratings: Map<string, SmartRating>,
    tpi: Map<string, TrustedPartnerIndex>
  ): void {
    this.companies = companies;
    this.ratings = ratings;
    this.tpiIndex = tpi;
  }

  async findBestMatch(query: string, filters?: MatchFilters): Promise<MatchResult[]> {
    const ql = query.toLowerCase();
    let candidates = Array.from(this.companies.values());

    if (filters) {
      if (filters.minRating) {
        candidates = candidates.filter(c => {
          const r = this.ratings.get(c.companyId);
          return r && r.overall >= filters.minRating!;
        });
      }
      if (filters.city) {
        candidates = candidates.filter(c => c.cities.some(city => city.toLowerCase() === filters.city!.toLowerCase()));
      }
      if (filters.maxBudget) {
        candidates = candidates.filter(c => {
          const r = this.ratings.get(c.companyId);
          return r && r.financial >= 5;
        });
      }
      if (filters.requiredCerts) {
        candidates = candidates.filter(c =>
          filters.requiredCerts!.every(cert => c.certs.includes(cert))
        );
      }
      if (filters.projectType) {
        candidates = candidates.filter(c =>
          c.specializations.some(s => s.toLowerCase().includes(filters.projectType!.toLowerCase()))
        );
      }
    }

    const scored = candidates.map(c => this.scoreCandidate(c, ql));
    scored.sort((a, b) => b.totalScore - a.totalScore);
    const maxScore = scored.length > 0 ? scored[0].totalScore : 1;

    return scored
      .filter(s => (s.totalScore / maxScore) * 100 >= this.config.minConfidenceThreshold)
      .slice(0, 5)
      .map(s => this.buildMatchResult(s, maxScore, scored));
  }

  private scoreCandidate(
    company: CompanyProfile,
    query: string
  ): { company: CompanyProfile; totalScore: number; scores: Record<string, number>; reasons: string[] } {
    const scores: Record<string, number> = {};
    const reasons: string[] = [];
    const rating = this.ratings.get(company.companyId);
    const tpi = this.tpiIndex.get(company.companyId);

    // 1. Partner type match
    scores.partnerType = this.matchPartnerTypeScore(company, query);
    if (scores.partnerType > 0) {
      reasons.push(`Partner type matches query requirements (score: ${scores.partnerType.toFixed(1)})`);
    }

    // 2. Location match
    scores.location = this.matchLocationScore(company, query);
    if (scores.location > 0) {
      const matchedCity = this.extractLocation(query);
      reasons.push(`Located in ${matchedCity}`);
    }

    // 3. Specialization match
    scores.specialization = this.performSemanticMatch(company.specializations.join(' '), query);
    if (scores.specialization > 5) {
      reasons.push(`Specializations highly relevant to query`);
    }

    // 4. Smart rating
    if (rating && this.config.useHistoricalPerformance) {
      scores.rating = rating.overall * 2;
      if (rating.overall >= 8) reasons.push(`Excellent smart rating: ${rating.overall.toFixed(1)}/10`);
      else if (rating.overall >= 6) reasons.push(`Good smart rating: ${rating.overall.toFixed(1)}/10`);

      // Sub-scores
      if (rating.execution >= 7) scores.execution = rating.execution * 0.5;
      if (rating.schedule >= 7) scores.schedule = rating.schedule * 0.5;
      if (rating.financial >= 7) scores.financial = rating.financial * 0.5;
      if (rating.product >= 7) scores.product = rating.product * 0.5;

      // Query-specific score boosts
      if (query.includes('reliable') || query.includes('trusted')) {
        scores.reliability = (rating.execution + rating.contract) * 0.5;
        if (scores.reliability > 5) reasons.push('Highly reliable based on execution and contract adherence');
      }
      if (query.includes('fast') || query.includes('quick') || query.includes('urgent')) {
        scores.speed = (10 - rating.schedule) * -0.5 + rating.schedule * 0.8;
        if (rating.schedule >= 7) reasons.push('Strong schedule performance for urgent projects');
      }
    }

    // 5. TPI
    if (tpi && this.config.useTPI) {
      scores.tpi = tpi.overall * 1.5;
      if (tpi.overall >= 8) reasons.push(`Trusted Partner Index: ${tpi.overall.toFixed(1)}/100`);
    }

    // 6. Experience
    scores.experience = Math.min(company.yearsExp * 0.8, 12);
    if (company.yearsExp >= 15) reasons.push(`${company.yearsExp}+ years proven track record`);
    else if (company.yearsExp >= 10) reasons.push(`${company.yearsExp} years of industry experience`);

    // 7. Project count
    scores.projects = Math.min(company.projects * 0.15, 10);
    if (company.projects >= 50) reasons.push(`Completed ${company.projects} projects`);

    // 8. Size & capacity
    scores.capacity = Math.min(company.employees / 100 * 3, 8);
    if (company.employees >= 200) reasons.push(`Large workforce: ${company.employees}+ employees`);
    scores.equipment = Math.min(company.equipment.length * 0.5, 5);

    // 9. Certifications
    scores.certs = Math.min(company.certs.length * 1.5, 8);
    if (company.certs.length >= 3) reasons.push(`Holds ${company.certs.length} professional certifications`);

    // 10. Query-specific term matching (product/service)
    scores.productMatch = this.matchProductTerms(company, query);

    const totalScore = Object.values(scores).reduce((s, v) => s + v, 0);

    return { company, totalScore, scores, reasons };
  }

  private matchPartnerTypeScore(company: CompanyProfile, query: string): number {
    const typeMap: Record<string, PartnerType[]> = {
      contractor: [PartnerType.Contractor, PartnerType.ContractorMain, PartnerType.ContractorSub, PartnerType.ContractorSpecialized],
      supplier: [PartnerType.Supplier, PartnerType.SupplierMaterials, PartnerType.SupplierSteel, PartnerType.SupplierConcrete, PartnerType.SupplierCables, PartnerType.SupplierPipes, PartnerType.SupplierElevators, PartnerType.SupplierHVAC, PartnerType.SupplierElectrical, PartnerType.SupplierSmartSystems],
      manufacturer: [PartnerType.Manufacturer, PartnerType.ManufacturerSteel, PartnerType.ManufacturerConcrete, PartnerType.ManufacturerElevators, PartnerType.ManufacturerDoors, PartnerType.ManufacturerGlass, PartnerType.ManufacturerAluminum],
      consultant: [PartnerType.Consultant, PartnerType.ConsultantEngineering, PartnerType.ConsultantDesign, PartnerType.ConsultantProjectManagement],
      'service provider': [PartnerType.ServiceProvider, PartnerType.ServiceProviderTesting, PartnerType.ServiceProviderLab, PartnerType.ServiceProviderSurvey, PartnerType.ServiceProviderDrones, PartnerType.ServiceProviderRental, PartnerType.ServiceProviderTransport, PartnerType.ServiceProviderWaste],
    };

    for (const [key, types] of Object.entries(typeMap)) {
      if (query.includes(key) && types.includes(company.partnerType)) {
        return 15;
      }
    }

    // Sub-type matching
    const subKeywords: Record<string, PartnerType[]> = {
      elevator: [PartnerType.SupplierElevators, PartnerType.ManufacturerElevators],
      steel: [PartnerType.SupplierSteel, PartnerType.ManufacturerSteel],
      concrete: [PartnerType.SupplierConcrete, PartnerType.ManufacturerConcrete],
      hVAC: [PartnerType.SupplierHVAC],
      cable: [PartnerType.SupplierCables],
      electrical: [PartnerType.SupplierElectrical],
      'smart system': [PartnerType.SupplierSmartSystems],
      testing: [PartnerType.ServiceProviderTesting],
      drone: [PartnerType.ServiceProviderDrones],
      survey: [PartnerType.ServiceProviderSurvey],
      rental: [PartnerType.ServiceProviderRental],
      design: [PartnerType.ConsultantDesign],
      engineering: [PartnerType.ConsultantEngineering],
    };

    for (const [keyword, matchedTypes] of Object.entries(subKeywords)) {
      if (query.includes(keyword) && matchedTypes.includes(company.partnerType)) {
        return 25;
      }
    }

    return 5;
  }

  private matchLocationScore(company: CompanyProfile, query: string): number {
    const location = this.extractLocation(query);
    if (!location) return 5;
    return company.cities.some(c => c.toLowerCase() === location.toLowerCase()) ? 20 : 2;
  }

  private extractLocation(query: string): string | null {
    const locations: string[] = [
      'riyadh', 'jeddah', 'dammam', 'khobar', 'dhahran', 'makkah', 'medina',
      'tabuk', 'abha', 'buraidah', 'hail', 'jubail', 'yanbu', 'taif', 'khamis mushait',
      'dubai', 'abu dhabi', 'sharjah', 'doha', 'kuwait', 'manama', 'muscat',
    ];
    const found = locations.find(loc => query.includes(loc));
    return found ?? null;
  }

  private performSemanticMatch(text: string, query: string): number {
    const ql = query.toLowerCase();
    const tl = text.toLowerCase();
    let score = 0;

    const keywordMap: Record<string, number> = {
      best: 5,
      top: 5,
      cheapest: 8,
      'lowest price': 10,
      quality: 8,
      reliable: 7,
      experienced: 6,
      certified: 5,
      finishing: 10,
      structure: 8,
      'civil works': 8,
      maintenance: 6,
      operation: 5,
    };

    for (const [keyword, weight] of Object.entries(keywordMap)) {
      if (ql.includes(keyword) && tl.includes(keyword)) {
        score += weight;
      }
    }

    return score;
  }

  private matchProductTerms(company: CompanyProfile, query: string): number {
    const ql = query.toLowerCase();
    const specializations = company.specializations.map(s => s.toLowerCase());
    let score = 0;

    const productTerms = [
      'elevator', 'lift', 'escalator', 'steel', 'concrete', 'cement',
      'cable', 'wire', 'pipeline', 'pipe', 'hVAC', 'air conditioning',
      'electrical panel', 'transformer', 'smart home', 'automation',
      'glass', 'aluminum', 'door', 'window', 'facade',
      'crane', 'excavator', 'loader', 'bulldozer', 'forklift',
      'software', 'bIM', 'cad', 'design', 'blueprint',
    ];

    for (const term of productTerms) {
      if (ql.includes(term)) {
        const hasMatch = specializations.some(s => s.includes(term));
        if (hasMatch) score += 10;
      }
    }

    return score;
  }

  private buildMatchResult(
    scored: { company: CompanyProfile; totalScore: number; scores: Record<string, number>; reasons: string[] },
    maxScore: number,
    allScored: { company: CompanyProfile; totalScore: number; scores: Record<string, number>; reasons: string[] }[]
  ): MatchResult {
    const confidence = Math.round((scored.totalScore / maxScore) * 95);
    const rating = this.ratings.get(scored.company.companyId);

    const risks: string[] = [];
    if (rating) {
      if (rating.financial < 5) risks.push('Weak financial standing');
      if (rating.safety < 5) risks.push('Safety record needs improvement');
      if (rating.schedule < 4) risks.push('History of schedule delays');
      if (rating.complaints > 6) risks.push('Elevated complaint levels');
    }
    if (scored.company.yearsExp < 2) risks.push('Limited operational history');
    if (scored.company.ratings.length < 3) risks.push('Insufficient rating data for accurate assessment');

    const alternatives: MatchAlternative[] = allScored
      .filter(s => s.company.companyId !== scored.company.companyId)
      .slice(0, this.config.maxAlternatives)
      .map(s => ({
        partnerId: s.company.companyId,
        score: Math.round((s.totalScore / maxScore) * 100),
        reason: s.reasons.slice(0, 2).join('. '),
      }));

    return {
      partnerId: scored.company.companyId,
      score: Math.round(confidence * 10) / 10,
      confidence,
      reason: scored.reasons.slice(0, 4).join('. ') || 'Good overall match',
      alternatives,
      risks,
    };
  }
}
