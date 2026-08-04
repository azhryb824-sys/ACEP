import { Tender, TenderStatus, TenderRequirement, Bid, BidComparison, CompanyProfile, SmartRating } from './types';
export declare class TenderManager {
    private tenders;
    private bids;
    constructor();
    create(id: string, companyId: string, title: string, scope: string, budget: number, currency: string, deadline: string, requirements: TenderRequirement[], documents?: string[]): Promise<Tender>;
    publish(tenderId: string): Promise<Tender>;
    invite(tenderId: string, partnerIds: string[], allCompanies: Map<string, CompanyProfile>): Promise<Tender>;
    receiveBid(bid: Bid): Promise<Bid>;
    evaluate(tenderId: string, ratings: Map<string, SmartRating>): Promise<BidComparison[]>;
    award(tenderId: string, bidId: string): Promise<Tender>;
    close(tenderId: string): Promise<Tender>;
    cancel(tenderId: string): Promise<Tender>;
    getTender(tenderId: string): Tender | null;
    getBid(bidId: string): Bid | null;
    listTendersByCompany(companyId: string): Tender[];
    listTendersByStatus(status: TenderStatus): Tender[];
    private getTenderOrThrow;
    private assertStatus;
    private scorePrice;
    private scoreDuration;
}
//# sourceMappingURL=tender-manager.d.ts.map