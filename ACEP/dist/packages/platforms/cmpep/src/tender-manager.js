"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenderManager = void 0;
const types_1 = require("./types");
class TenderManager {
    tenders = new Map();
    bids = new Map();
    constructor() { }
    async create(id, companyId, title, scope, budget, currency, deadline, requirements, documents = []) {
        if (this.tenders.has(id)) {
            throw new Error(`Tender ${id} already exists`);
        }
        const tender = {
            id,
            companyId,
            title,
            scope,
            budget,
            currency,
            deadline,
            documents,
            requirements,
            status: types_1.TenderStatus.Draft,
            invitedPartners: [],
            bids: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.tenders.set(id, tender);
        return tender;
    }
    async publish(tenderId) {
        const tender = this.getTenderOrThrow(tenderId);
        this.assertStatus(tender, types_1.TenderStatus.Draft);
        tender.status = types_1.TenderStatus.Published;
        tender.updatedAt = new Date().toISOString();
        return tender;
    }
    async invite(tenderId, partnerIds, allCompanies) {
        const tender = this.getTenderOrThrow(tenderId);
        this.assertStatus(tender, [types_1.TenderStatus.Published, types_1.TenderStatus.Draft]);
        for (const pid of partnerIds) {
            if (!allCompanies.has(pid))
                throw new Error(`Partner ${pid} not found`);
            if (!tender.invitedPartners.includes(pid)) {
                tender.invitedPartners.push(pid);
            }
        }
        tender.status = types_1.TenderStatus.Inviting;
        tender.updatedAt = new Date().toISOString();
        return tender;
    }
    async receiveBid(bid) {
        const tender = this.getTenderOrThrow(bid.tenderId);
        this.assertStatus(tender, [types_1.TenderStatus.Inviting, types_1.TenderStatus.Receiving]);
        if (!tender.invitedPartners.includes(bid.partnerId)) {
            throw new Error(`Partner ${bid.partnerId} was not invited to tender ${bid.tenderId}`);
        }
        this.bids.set(bid.id, bid);
        tender.bids.push(bid);
        tender.status = types_1.TenderStatus.Receiving;
        tender.updatedAt = new Date().toISOString();
        return bid;
    }
    async evaluate(tenderId, ratings) {
        const tender = this.getTenderOrThrow(tenderId);
        this.assertStatus(tender, types_1.TenderStatus.Receiving);
        if (tender.bids.length === 0) {
            throw new Error(`No bids to evaluate for tender ${tenderId}`);
        }
        const comparisons = tender.bids.map(bid => {
            const rating = ratings.get(bid.partnerId);
            const priceScore = this.scorePrice(bid.price, tender.bids);
            const qualityScore = rating ? rating.product : 5;
            const durationScore = this.scoreDuration(bid.duration, tender.bids);
            const warrantyScore = Math.min(bid.warranty / 12, 10);
            const experienceScore = rating ? rating.execution : 5;
            const capacityScore = rating ? Math.min(rating.financial, 10) : 5;
            const pastPerformance = rating ? rating.satisfaction : 5;
            const composite = priceScore * 0.25 +
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
        tender.status = types_1.TenderStatus.Evaluating;
        tender.updatedAt = new Date().toISOString();
        return comparisons;
    }
    async award(tenderId, bidId) {
        const tender = this.getTenderOrThrow(tenderId);
        this.assertStatus(tender, types_1.TenderStatus.Evaluating);
        const bid = this.bids.get(bidId);
        if (!bid)
            throw new Error(`Bid ${bidId} not found`);
        if (bid.tenderId !== tenderId)
            throw new Error(`Bid ${bidId} does not belong to tender ${tenderId}`);
        tender.status = types_1.TenderStatus.Awarded;
        tender.awardDate = new Date().toISOString();
        tender.updatedAt = new Date().toISOString();
        return tender;
    }
    async close(tenderId) {
        const tender = this.getTenderOrThrow(tenderId);
        tender.status = types_1.TenderStatus.Closed;
        tender.updatedAt = new Date().toISOString();
        return tender;
    }
    async cancel(tenderId) {
        const tender = this.getTenderOrThrow(tenderId);
        tender.status = types_1.TenderStatus.Cancelled;
        tender.updatedAt = new Date().toISOString();
        return tender;
    }
    getTender(tenderId) {
        return this.tenders.get(tenderId) ?? null;
    }
    getBid(bidId) {
        return this.bids.get(bidId) ?? null;
    }
    listTendersByCompany(companyId) {
        return Array.from(this.tenders.values()).filter(t => t.companyId === companyId);
    }
    listTendersByStatus(status) {
        return Array.from(this.tenders.values()).filter(t => t.status === status);
    }
    getTenderOrThrow(tenderId) {
        const tender = this.tenders.get(tenderId);
        if (!tender)
            throw new Error(`Tender ${tenderId} not found`);
        return tender;
    }
    assertStatus(tender, allowed) {
        const allowedArr = Array.isArray(allowed) ? allowed : [allowed];
        if (!allowedArr.includes(tender.status)) {
            throw new Error(`Invalid tender status: ${tender.status}. Expected: ${allowedArr.join(' | ')}`);
        }
    }
    scorePrice(price, allBids) {
        const prices = allBids.map(b => b.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        if (max === min)
            return 10;
        return 10 - ((price - min) / (max - min)) * 6;
    }
    scoreDuration(duration, allBids) {
        const durations = allBids.map(b => b.duration);
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        if (max === min)
            return 10;
        return 10 - ((duration - min) / (max - min)) * 6;
    }
}
exports.TenderManager = TenderManager;
//# sourceMappingURL=tender-manager.js.map