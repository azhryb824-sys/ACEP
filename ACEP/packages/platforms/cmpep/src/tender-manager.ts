import {
  Tender,
  TenderStatus,
  TenderRequirement,
  Bid,
  BidComparison,
  CompanyProfile,
  SmartRating,
} from './types';

export class TenderManager {
  private tenders: Map<string, Tender> = new Map();
  private bids: Map<string, Bid> = new Map();

  constructor() {}

  async create(
    id: string,
    companyId: string,
    title: string,
    scope: string,
    budget: number,
    currency: string,
    deadline: string,
    requirements: TenderRequirement[],
    documents: string[] = []
  ): Promise<Tender> {
    if (this.tenders.has(id)) {
      throw new Error(`Tender ${id} already exists`);
    }

    const tender: Tender = {
      id,
      companyId,
      title,
      scope,
      budget,
      currency,
      deadline,
      documents,
      requirements,
      status: TenderStatus.Draft,
      invitedPartners: [],
      bids: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tenders.set(id, tender);
    return tender;
  }

  async publish(tenderId: string): Promise<Tender> {
    const tender = this.getTenderOrThrow(tenderId);
    this.assertStatus(tender, TenderStatus.Draft);

    tender.status = TenderStatus.Published;
    tender.updatedAt = new Date().toISOString();
    return tender;
  }

  async invite(tenderId: string, partnerIds: string[], allCompanies: Map<string, CompanyProfile>): Promise<Tender> {
    const tender = this.getTenderOrThrow(tenderId);
    this.assertStatus(tender, [TenderStatus.Published, TenderStatus.Draft]);

    for (const pid of partnerIds) {
      if (!allCompanies.has(pid)) throw new Error(`Partner ${pid} not found`);
      if (!tender.invitedPartners.includes(pid)) {
        tender.invitedPartners.push(pid);
      }
    }

    tender.status = TenderStatus.Inviting;
    tender.updatedAt = new Date().toISOString();
    return tender;
  }

  async receiveBid(bid: Bid): Promise<Bid> {
    const tender = this.getTenderOrThrow(bid.tenderId);
    this.assertStatus(tender, [TenderStatus.Inviting, TenderStatus.Receiving]);

    if (!tender.invitedPartners.includes(bid.partnerId)) {
      throw new Error(`Partner ${bid.partnerId} was not invited to tender ${bid.tenderId}`);
    }

    this.bids.set(bid.id, bid);
    tender.bids.push(bid);
    tender.status = TenderStatus.Receiving;
    tender.updatedAt = new Date().toISOString();
    return bid;
  }

  async evaluate(tenderId: string, ratings: Map<string, SmartRating>): Promise<BidComparison[]> {
    const tender = this.getTenderOrThrow(tenderId);
    this.assertStatus(tender, TenderStatus.Receiving);

    if (tender.bids.length === 0) {
      throw new Error(`No bids to evaluate for tender ${tenderId}`);
    }

    const comparisons: BidComparison[] = tender.bids.map(bid => {
      const rating = ratings.get(bid.partnerId);

      const priceScore = this.scorePrice(bid.price, tender.bids);
      const qualityScore = rating ? rating.product : 5;
      const durationScore = this.scoreDuration(bid.duration, tender.bids);
      const warrantyScore = Math.min(bid.warranty / 12, 10);
      const experienceScore = rating ? rating.execution : 5;
      const capacityScore = rating ? Math.min(rating.financial, 10) : 5;
      const pastPerformance = rating ? rating.satisfaction : 5;

      const composite =
        priceScore * 0.25 +
        qualityScore * 0.20 +
        durationScore * 0.15 +
        warrantyScore * 0.10 +
        experienceScore * 0.10 +
        capacityScore * 0.10 +
        pastPerformance * 0.10;

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
        pastPerformance: Math.round(pastPerformance * 10) / 10,
        compositeScore: Math.round(composite * 100) / 100,
        rank: 0,
      };
    });

    comparisons.sort((a, b) => b.compositeScore - a.compositeScore);
    comparisons.forEach((c, i) => (c.rank = i + 1));

    tender.status = TenderStatus.Evaluating;
    tender.updatedAt = new Date().toISOString();
    return comparisons;
  }

  async award(tenderId: string, bidId: string): Promise<Tender> {
    const tender = this.getTenderOrThrow(tenderId);
    this.assertStatus(tender, TenderStatus.Evaluating);

    const bid = this.bids.get(bidId);
    if (!bid) throw new Error(`Bid ${bidId} not found`);
    if (bid.tenderId !== tenderId) throw new Error(`Bid ${bidId} does not belong to tender ${tenderId}`);

    tender.status = TenderStatus.Awarded;
    tender.awardDate = new Date().toISOString();
    tender.updatedAt = new Date().toISOString();
    return tender;
  }

  async close(tenderId: string): Promise<Tender> {
    const tender = this.getTenderOrThrow(tenderId);
    tender.status = TenderStatus.Closed;
    tender.updatedAt = new Date().toISOString();
    return tender;
  }

  async cancel(tenderId: string): Promise<Tender> {
    const tender = this.getTenderOrThrow(tenderId);
    tender.status = TenderStatus.Cancelled;
    tender.updatedAt = new Date().toISOString();
    return tender;
  }

  getTender(tenderId: string): Tender | null {
    return this.tenders.get(tenderId) ?? null;
  }

  getBid(bidId: string): Bid | null {
    return this.bids.get(bidId) ?? null;
  }

  listTendersByCompany(companyId: string): Tender[] {
    return Array.from(this.tenders.values()).filter(t => t.companyId === companyId);
  }

  listTendersByStatus(status: TenderStatus): Tender[] {
    return Array.from(this.tenders.values()).filter(t => t.status === status);
  }

  private getTenderOrThrow(tenderId: string): Tender {
    const tender = this.tenders.get(tenderId);
    if (!tender) throw new Error(`Tender ${tenderId} not found`);
    return tender;
  }

  private assertStatus(tender: Tender, allowed: TenderStatus | TenderStatus[]): void {
    const allowedArr = Array.isArray(allowed) ? allowed : [allowed];
    if (!allowedArr.includes(tender.status)) {
      throw new Error(
        `Invalid tender status: ${tender.status}. Expected: ${allowedArr.join(' | ')}`
      );
    }
  }

  private scorePrice(price: number, allBids: Bid[]): number {
    const prices = allBids.map(b => b.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (max === min) return 10;
    return 10 - ((price - min) / (max - min)) * 6;
  }

  private scoreDuration(duration: number, allBids: Bid[]): number {
    const durations = allBids.map(b => b.duration);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    if (max === min) return 10;
    return 10 - ((duration - min) / (max - min)) * 6;
  }
}
