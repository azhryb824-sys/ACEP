import { CompanyProfile, SmartRating, MatchResult, TrustedPartnerIndex } from './types';
import { MatchFilters } from './interfaces';
export interface AIMatchingConfig {
    minConfidenceThreshold: number;
    maxAlternatives: number;
    useSemanticMatching: boolean;
    useHistoricalPerformance: boolean;
    useTPI: boolean;
}
export declare class AIMatchingEngine {
    private config;
    private companies;
    private ratings;
    private tpiIndex;
    constructor(config?: AIMatchingConfig);
    loadData(companies: Map<string, CompanyProfile>, ratings: Map<string, SmartRating>, tpi: Map<string, TrustedPartnerIndex>): void;
    findBestMatch(query: string, filters?: MatchFilters): Promise<MatchResult[]>;
    private scoreCandidate;
    private matchPartnerTypeScore;
    private matchLocationScore;
    private extractLocation;
    private performSemanticMatch;
    private matchProductTerms;
    private buildMatchResult;
}
//# sourceMappingURL=matching-engine.d.ts.map