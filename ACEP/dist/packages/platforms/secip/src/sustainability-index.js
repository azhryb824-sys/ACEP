"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SustainabilityIndex = void 0;
class SustainabilityIndex {
    defaultWeights = {
        emissions: 0.2,
        energy: 0.15,
        water: 0.15,
        recycling: 0.1,
        compliance: 0.1,
        social: 0.15,
        governance: 0.15
    };
    async calculate(data) {
        const dimensions = {
            emissions: {
                score: this.clamp(data.emissions?.performance ?? 70),
                weight: this.defaultWeights.emissions,
                trend: data.emissions?.trend ?? "stable"
            },
            energy: {
                score: this.clamp(data.energy?.efficiency ?? 65),
                weight: this.defaultWeights.energy,
                trend: data.energy?.trend ?? "stable"
            },
            water: {
                score: this.clamp(data.water?.efficiency ?? 75),
                weight: this.defaultWeights.water,
                trend: data.water?.trend ?? "stable"
            },
            recycling: {
                score: this.clamp(data.recycling?.rate ?? 60),
                weight: this.defaultWeights.recycling,
                trend: data.recycling?.trend ?? "stable"
            },
            compliance: {
                score: this.clamp(data.compliance?.score ?? 80),
                weight: this.defaultWeights.compliance,
                trend: data.compliance?.trend ?? "stable"
            },
            social: {
                score: this.clamp(data.social?.score ?? 70),
                weight: this.defaultWeights.social,
                trend: data.social?.trend ?? "stable"
            },
            governance: {
                score: this.clamp(data.governance?.score ?? 75),
                weight: this.defaultWeights.governance,
                trend: data.governance?.trend ?? "stable"
            }
        };
        const overall = Object.values(dimensions).reduce((sum, d) => sum + d.score * d.weight, 0);
        const now = new Date();
        return {
            overall: Math.round(overall),
            dimensions,
            maxScore: 100,
            rating: this.getRating(Math.round(overall)),
            timestamp: now.toISOString(),
            comparables: {
                industryAverage: 62,
                bestInClass: 92,
                percentile: Math.round((overall / 100) * 70 + 15)
            },
            history: this.generateHistory(Math.round(overall))
        };
    }
    async compare(projects) {
        const results = await Promise.all(projects.map(async (p) => ({
            id: p.id,
            name: p.name,
            index: await this.calculate(p.data),
            rank: 0
        })));
        results.sort((a, b) => b.index.overall - a.index.overall);
        results.forEach((r, i) => { r.rank = i + 1; });
        return results;
    }
    async trackTrend(historyData) {
        const trends = [];
        let previous = null;
        for (const entry of historyData) {
            const overall = Object.values(entry.dimensions).reduce((s, v) => s + v, 0) /
                Object.keys(entry.dimensions).length;
            const changes = {};
            if (previous) {
                for (const key of Object.keys(entry.dimensions)) {
                    changes[key] = entry.dimensions[key] - (previous[key] ?? entry.dimensions[key]);
                }
            }
            trends.push({ date: entry.date, overall: Math.round(overall), changes });
            previous = entry.dimensions;
        }
        return trends;
    }
    clamp(value) {
        return Math.max(0, Math.min(100, value));
    }
    getRating(score) {
        if (score >= 85)
            return "Excellent";
        if (score >= 70)
            return "Good";
        if (score >= 55)
            return "Moderate";
        if (score >= 40)
            return "Below Average";
        return "Poor";
    }
    generateHistory(currentScore) {
        const history = [];
        const now = new Date();
        for (let i = 4; i >= 0; i--) {
            const d = new Date(now);
            d.setMonth(d.getMonth() - i * 3);
            const variance = Math.round((Math.random() - 0.5) * 12);
            const score = i === 0 ? currentScore : Math.max(0, Math.min(100, currentScore - variance));
            const change = i === 0 ? score - (history[history.length - 1]?.score ?? score) : 0;
            history.push({
                score,
                date: d.toISOString().split("T")[0],
                change
            });
        }
        return history;
    }
}
exports.SustainabilityIndex = SustainabilityIndex;
//# sourceMappingURL=sustainability-index.js.map