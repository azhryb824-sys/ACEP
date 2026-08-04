"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReliabilityAnalyzer = void 0;
class ReliabilityAnalyzer {
    calculateMTBF(failures, totalOperatingHours) {
        if (failures.length === 0)
            return totalOperatingHours;
        return totalOperatingHours / failures.length;
    }
    calculateMTTR(failures) {
        if (failures.length === 0)
            return 0;
        const totalDowntime = failures.reduce((sum, f) => sum + f.downtimeHours, 0);
        return totalDowntime / failures.length;
    }
    calculateAvailability(mtbf, mttr) {
        const total = mtbf + mttr;
        if (total <= 0)
            return 0;
        return mtbf / total;
    }
    calculateReliability(mtbf, missionTime) {
        if (mtbf <= 0)
            return 0;
        return Math.exp(-missionTime / mtbf);
    }
    calculateFailureRate(totalFailures, totalOperatingHours) {
        if (totalOperatingHours <= 0)
            return 0;
        return totalFailures / totalOperatingHours;
    }
    getReliabilityMetrics(assetId, failures, workOrders, totalOperatingHours, periodStart, periodEnd) {
        const mtbf = this.calculateMTBF(failures, totalOperatingHours);
        const mttr = this.calculateMTTR(failures);
        const availability = this.calculateAvailability(mtbf, mttr);
        const reliability = this.calculateReliability(mtbf, 8760);
        const failureRate = this.calculateFailureRate(failures.length, totalOperatingHours);
        const trend = this.analyzeTrend(failures, workOrders);
        return {
            assetId,
            mtbf: Math.round(mtbf * 100) / 100,
            mtbfUnit: 'hours',
            mttr: Math.round(mttr * 100) / 100,
            mttrUnit: 'hours',
            availability: Math.round(availability * 10000) / 100,
            reliability: Math.round(reliability * 10000) / 100,
            failureRate: Math.round(failureRate * 1000000 * 100) / 100,
            failureRateUnit: 'failures per million hours',
            periodStart,
            periodEnd,
            totalOperatingHours: Math.round(totalOperatingHours),
            totalFailures: failures.length,
            totalDowntimeHours: Math.round(failures.reduce((s, f) => s + f.downtimeHours, 0)),
            trend
        };
    }
    analyzeTrend(failures, workOrders) {
        if (failures.length < 2) {
            return {
                mtbfTrend: 'Stable',
                mttrTrend: 'Stable',
                availabilityTrend: 'Stable',
                failureRateTrend: 'Stable'
            };
        }
        const sorted = [...failures].sort((a, b) => new Date(a.failureDate).getTime() - new Date(b.failureDate).getTime());
        const half = Math.floor(sorted.length / 2);
        const firstHalf = sorted.slice(0, half);
        const secondHalf = sorted.slice(half);
        const firstCount = firstHalf.length;
        const secondCount = secondHalf.length;
        const firstDowntime = firstHalf.reduce((s, f) => s + f.downtimeHours, 0);
        const secondDowntime = secondHalf.reduce((s, f) => s + f.downtimeHours, 0);
        const firstMttr = firstCount > 0 ? firstDowntime / firstCount : 0;
        const secondMttr = secondCount > 0 ? secondDowntime / secondCount : 0;
        const mtbfTrend = this.calculateTrend(firstCount, secondCount, true);
        const mttrTrend = this.calculateTrend(firstMttr, secondMttr, false);
        const failureRateTrend = this.calculateTrend(firstCount, secondCount, false);
        const firstAvailability = this.calculateAvailability(this.calculateMTBF(firstHalf, 8760 * half), firstMttr);
        const secondAvailability = this.calculateAvailability(this.calculateMTBF(secondHalf, 8760 * half), secondMttr);
        const availabilityTrend = this.calculateTrend(firstAvailability, secondAvailability, true);
        return {
            mtbfTrend,
            mttrTrend,
            availabilityTrend,
            failureRateTrend
        };
    }
    calculateTrend(first, second, higherIsBetter) {
        const threshold = 0.10;
        if (first === 0 && second === 0)
            return 'Stable';
        const ratio = first !== 0 ? (second - first) / Math.abs(first) : (second > 0 ? 1 : 0);
        if (Math.abs(ratio) <= threshold)
            return 'Stable';
        if (higherIsBetter)
            return ratio > 0 ? 'Improving' : 'Degrading';
        return ratio < 0 ? 'Improving' : 'Degrading';
    }
    predictRemainingLife(assetId, failures, designLife, installDate) {
        const installed = new Date(installDate).getTime();
        const elapsedYears = (Date.now() - installed) / (1000 * 60 * 60 * 24 * 365);
        const remainingFromDesign = Math.max(0, designLife - elapsedYears);
        let remainingFromFailures = remainingFromDesign;
        const basedOn = ['Design Life Analysis'];
        if (failures.length > 0) {
            const recentFailures = failures.filter(f => {
                const age = (Date.now() - new Date(f.failureDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
                return age <= 6;
            });
            if (recentFailures.length >= 2) {
                const failureImpact = Math.min(1, recentFailures.length * 0.1);
                remainingFromFailures = remainingFromDesign * (1 - failureImpact);
                basedOn.push('Failure History Analysis');
            }
            const severeFailures = failures.filter(f => f.downtimeHours > 24);
            if (severeFailures.length > 0) {
                const severeImpact = Math.min(0.5, severeFailures.length * 0.15);
                remainingFromFailures *= (1 - severeImpact);
                basedOn.push('Severe Failure Impact');
            }
        }
        if (elapsedYears > designLife * 0.8) {
            remainingFromFailures *= 0.7;
            basedOn.push('End-of-Life Curve');
        }
        const estimatedRemainingYears = Math.max(0, Math.round(remainingFromFailures * 10) / 10);
        const confidence = Math.max(0.2, Math.min(0.95, 1 - (elapsedYears / (designLife || 1)) * 0.5));
        let recommendation;
        if (estimatedRemainingYears <= 0) {
            recommendation = 'Asset has exceeded design life. Immediate replacement recommended.';
        }
        else if (estimatedRemainingYears <= 2) {
            recommendation = 'Asset approaching end of life. Plan for replacement within 2 years.';
        }
        else if (estimatedRemainingYears <= 5) {
            recommendation = 'Monitor closely. Schedule major overhaul within next maintenance window.';
        }
        else {
            recommendation = 'Asset has sufficient remaining life. Continue standard maintenance.';
        }
        return { estimatedRemainingYears, confidence, basedOn, recommendation };
    }
    classifyFailure(failure) {
        const categories = [
            { key: 'Mechanical', factors: failure.mechanical },
            { key: 'Electrical', factors: failure.electrical },
            { key: 'Electronic', factors: failure.electronic },
            { key: 'Software', factors: failure.software },
            { key: 'Operational', factors: failure.operational },
            { key: 'Environmental', factors: failure.environmental },
            { key: 'Human', factors: failure.human }
        ];
        const scored = categories.map(c => ({
            category: c.key,
            score: c.factors.reduce((sum, f) => sum + (f.contributor ? f.severity : 0), 0),
            contributors: c.factors.filter(f => f.contributor).map(f => f.factor)
        }));
        const totalScore = scored.reduce((s, c) => s + c.score, 0);
        const distribution = {};
        for (const s of scored) {
            distribution[s.category] = totalScore > 0 ? Math.round((s.score / totalScore) * 10000) / 100 : 0;
        }
        const primary = scored.reduce((best, c) => c.score > best.score ? c : best, scored[0]);
        const contributingFactors = scored
            .filter(c => c.score > 0 && c.category !== primary.category)
            .flatMap(c => c.contributors);
        return {
            primaryCategory: primary.category,
            contributingFactors,
            probabilityDistribution: distribution
        };
    }
    getFailureStatistics(failures) {
        const totalFailures = failures.length;
        const totalDowntime = failures.reduce((s, f) => s + f.downtimeHours, 0);
        const totalHours = totalFailures * 8760;
        const mtbf = this.calculateMTBF(failures, totalHours);
        const mttr = this.calculateMTTR(failures);
        const byCategory = {};
        for (const f of failures) {
            const classification = this.classifyFailure(f);
            byCategory[classification.primaryCategory] = (byCategory[classification.primaryCategory] || 0) + 1;
        }
        const byMonth = {};
        for (const f of failures) {
            const date = new Date(f.failureDate);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            byMonth[key] = (byMonth[key] || 0) + 1;
        }
        const mostCommon = Object.entries(byCategory)
            .sort(([, a], [, b]) => b - a)
            .map(([k]) => k);
        const months = Object.keys(byMonth).sort();
        let failureRateTrend = 'Stable';
        if (months.length >= 3) {
            const recent = months.slice(-3).reduce((s, m) => s + (byMonth[m] || 0), 0);
            const old = months.slice(0, 3).reduce((s, m) => s + (byMonth[m] || 0), 0);
            if (recent > old * 1.2)
                failureRateTrend = 'Increasing';
            else if (recent < old * 0.8)
                failureRateTrend = 'Decreasing';
        }
        return {
            totalFailures,
            totalDowntime: Math.round(totalDowntime),
            meanTimeBetweenFailures: Math.round(mtbf * 100) / 100,
            meanTimeToRepair: Math.round(mttr * 100) / 100,
            mostCommonCategory: mostCommon[0] || 'Unknown',
            failureRateTrend,
            byCategory,
            byMonth
        };
    }
    calculateTotalCostOfFailures(failures) {
        return failures.reduce((s, f) => s + (f.costOfFailure || 0), 0);
    }
    calculateDowntimeCost(failures, costPerHour) {
        const totalDowntime = failures.reduce((s, f) => s + f.downtimeHours, 0);
        return totalDowntime * costPerHour;
    }
}
exports.ReliabilityAnalyzer = ReliabilityAnalyzer;
//# sourceMappingURL=reliability-analyzer.js.map