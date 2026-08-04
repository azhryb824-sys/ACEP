"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetHealthIndexCalculator = void 0;
const types_1 = require("./types");
class AssetHealthIndexCalculator {
    weights = {
        operation: 0.20,
        inspections: 0.15,
        sensors: 0.20,
        failures: 0.15,
        maintenance: 0.10,
        age: 0.10,
        performance: 0.10
    };
    calculate(asset, sensorData, failures, workOrders) {
        const operationScore = this.calculateOperationScore(asset.condition);
        const inspectionScore = this.calculateInspectionScore(asset.condition);
        const sensorScore = this.calculateSensorScore(sensorData);
        const failureScore = this.calculateFailureScore(failures);
        const maintenanceScore = this.calculateMaintenanceScore(workOrders);
        const ageScore = this.calculateAgeScore(asset.installDate, asset.designLife);
        const performanceScore = this.calculatePerformanceScore(sensorData, asset);
        const details = {
            operation: this.buildWeightedFactors('Operation', [
                { name: 'Mechanical Condition', score: asset.condition.mechanical, weight: 0.30 },
                { name: 'Electrical Condition', score: asset.condition.electrical, weight: 0.25 },
                { name: 'Structural Condition', score: asset.condition.structural, weight: 0.25 },
                { name: 'Cosmetic Condition', score: asset.condition.cosmetic, weight: 0.20 }
            ]),
            inspections: this.buildWeightedFactors('Inspection', [
                { name: 'Overall Inspection Score', score: inspectionScore, weight: 0.40 },
                { name: 'Inspection Frequency', score: this.calculateInspectionFrequency(asset.condition), weight: 0.30 },
                { name: 'Open Findings', score: this.calculateOpenFindingsScore(workOrders), weight: 0.30 }
            ]),
            sensors: this.buildWeightedFactors('Sensor', [
                { name: 'Temperature', score: this.calculateTemperatureScore(sensorData), weight: 0.25 },
                { name: 'Vibration', score: this.calculateVibrationScore(sensorData), weight: 0.25 },
                { name: 'Pressure', score: this.calculatePressureScore(sensorData), weight: 0.20 },
                { name: 'Energy Consumption', score: this.calculateEnergyScore(sensorData), weight: 0.15 },
                { name: 'Error Rate', score: this.calculateErrorScore(sensorData), weight: 0.15 }
            ]),
            failures: this.buildWeightedFactors('Failure', [
                { name: 'Failure Frequency', score: failureScore, weight: 0.40 },
                { name: 'Failure Severity', score: this.calculateFailureSeverityScore(failures), weight: 0.35 },
                { name: 'Downtime Impact', score: this.calculateDowntimeScore(failures), weight: 0.25 }
            ]),
            maintenance: this.buildWeightedFactors('Maintenance', [
                { name: 'Compliance Rate', score: this.calculateMaintenanceCompliance(workOrders), weight: 0.40 },
                { name: 'Backlog', score: this.calculateBacklogScore(workOrders), weight: 0.30 },
                { name: 'Cost Efficiency', score: this.calculateCostEfficiencyScore(workOrders), weight: 0.30 }
            ]),
            age: this.buildWeightedFactors('Age', [
                { name: 'Age vs Design Life', score: ageScore, weight: 0.50 },
                { name: 'Component Wear', score: this.calculateWearScore(asset), weight: 0.30 },
                { name: 'Obsolescence Risk', score: this.calculateObsolescenceScore(asset), weight: 0.20 }
            ]),
            performance: this.buildWeightedFactors('Performance', [
                { name: 'Efficiency', score: performanceScore, weight: 0.40 },
                { name: 'Availability', score: this.calculateAvailabilityScore(workOrders), weight: 0.30 },
                { name: 'Output Quality', score: this.calculateOutputQualityScore(sensorData), weight: 0.30 }
            ])
        };
        const overallScore = Math.round(operationScore * this.weights.operation +
            inspectionScore * this.weights.inspections +
            sensorScore * this.weights.sensors +
            failureScore * this.weights.failures +
            maintenanceScore * this.weights.maintenance +
            ageScore * this.weights.age +
            performanceScore * this.weights.performance);
        const clampedScore = Math.max(0, Math.min(100, overallScore));
        const priority = this.determinePriority(clampedScore);
        const recommendation = this.generateRecommendation(clampedScore, priority, asset);
        return {
            assetId: asset.id,
            overallScore: clampedScore,
            operationScore: Math.round(operationScore),
            inspectionScore: Math.round(inspectionScore),
            sensorScore: Math.round(sensorScore),
            failureScore: Math.round(failureScore),
            maintenanceScore: Math.round(maintenanceScore),
            ageScore: Math.round(ageScore),
            performanceScore: Math.round(performanceScore),
            priority,
            recommendation,
            calculatedAt: new Date().toISOString(),
            details
        };
    }
    calculateOperationScore(condition) {
        return (condition.mechanical * 0.35 + condition.electrical * 0.30 +
            condition.structural * 0.20 + condition.cosmetic * 0.15);
    }
    calculateInspectionScore(condition) {
        return condition.overall;
    }
    calculateInspectionFrequency(condition) {
        const next = new Date(condition.nextInspection).getTime();
        const last = new Date(condition.lastInspection).getTime();
        const interval = next - last;
        const daysSinceLast = (Date.now() - last) / (1000 * 60 * 60 * 24);
        const expectedInterval = interval / (1000 * 60 * 60 * 24);
        if (expectedInterval <= 0)
            return 50;
        const ratio = daysSinceLast / expectedInterval;
        if (ratio <= 0.5)
            return 100;
        if (ratio <= 0.8)
            return 80;
        if (ratio <= 1.0)
            return 60;
        if (ratio <= 1.5)
            return 40;
        return 20;
    }
    calculateOpenFindingsScore(workOrders) {
        const openCount = workOrders.filter(w => w.status === 'InProgress' || w.status === 'Assigned').length;
        if (openCount === 0)
            return 100;
        if (openCount <= 2)
            return 80;
        if (openCount <= 5)
            return 60;
        if (openCount <= 10)
            return 40;
        return 20;
    }
    calculateSensorScore(data) {
        if (data.length === 0)
            return 50;
        const recent = data.slice(-10);
        const scores = recent.map(d => {
            let score = 100;
            if (d.temperature !== null && d.temperature > 80)
                score -= 20;
            if (d.vibration !== null && d.vibration > 10)
                score -= 25;
            if (d.noise !== null && d.noise > 85)
                score -= 15;
            if (d.pressure !== null && (d.pressure < 50 || d.pressure > 150))
                score -= 15;
            if (d.errors !== null && d.errors > 0)
                score -= d.errors * 5;
            return Math.max(0, score);
        });
        return scores.reduce((a, b) => a + b, 0) / scores.length;
    }
    calculateTemperatureScore(data) {
        if (data.length === 0)
            return 50;
        const recent = data.slice(-10);
        const temps = recent.filter(d => d.temperature !== null).map(d => d.temperature);
        if (temps.length === 0)
            return 50;
        const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
        if (avg <= 40)
            return 100;
        if (avg <= 55)
            return 80;
        if (avg <= 70)
            return 60;
        if (avg <= 85)
            return 40;
        return 20;
    }
    calculateVibrationScore(data) {
        if (data.length === 0)
            return 50;
        const recent = data.slice(-10);
        const vibs = recent.filter(d => d.vibration !== null).map(d => d.vibration);
        if (vibs.length === 0)
            return 50;
        const avg = vibs.reduce((a, b) => a + b, 0) / vibs.length;
        if (avg <= 2)
            return 100;
        if (avg <= 4)
            return 80;
        if (avg <= 7)
            return 60;
        if (avg <= 10)
            return 40;
        return 20;
    }
    calculatePressureScore(data) {
        if (data.length === 0)
            return 50;
        const recent = data.slice(-10);
        const pressures = recent.filter(d => d.pressure !== null).map(d => d.pressure);
        if (pressures.length === 0)
            return 50;
        const avg = pressures.reduce((a, b) => a + b, 0) / pressures.length;
        if (avg >= 90 && avg <= 110)
            return 100;
        if (avg >= 75 && avg <= 125)
            return 80;
        if (avg >= 60 && avg <= 140)
            return 60;
        if (avg >= 40 && avg <= 160)
            return 40;
        return 20;
    }
    calculateEnergyScore(data) {
        if (data.length === 0)
            return 50;
        const recent = data.slice(-10);
        const energies = recent.filter(d => d.energy !== null).map(d => d.energy);
        if (energies.length === 0)
            return 50;
        const trend = energies[energies.length - 1] / (energies[0] || 1);
        if (trend <= 1.05)
            return 100;
        if (trend <= 1.15)
            return 80;
        if (trend <= 1.30)
            return 60;
        if (trend <= 1.50)
            return 40;
        return 20;
    }
    calculateErrorScore(data) {
        if (data.length === 0)
            return 50;
        const recent = data.slice(-10);
        const errors = recent.filter(d => d.errors !== null).map(d => d.errors);
        if (errors.length === 0)
            return 50;
        const total = errors.reduce((a, b) => a + b, 0);
        if (total === 0)
            return 100;
        if (total <= 2)
            return 80;
        if (total <= 5)
            return 60;
        if (total <= 10)
            return 40;
        return 20;
    }
    calculateFailureScore(failures) {
        if (failures.length === 0)
            return 100;
        const recent = failures.filter(f => {
            const age = (Date.now() - new Date(f.failureDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
            return age <= 12;
        });
        if (recent.length === 0)
            return 90;
        if (recent.length <= 1)
            return 70;
        if (recent.length <= 3)
            return 50;
        if (recent.length <= 5)
            return 30;
        return 10;
    }
    calculateFailureSeverityScore(failures) {
        if (failures.length === 0)
            return 100;
        const severities = failures.map(f => {
            const costs = f.costOfFailure || 0;
            if (costs > 100000)
                return 10;
            if (costs > 50000)
                return 30;
            if (costs > 10000)
                return 50;
            if (costs > 1000)
                return 70;
            return 90;
        });
        return severities.reduce((a, b) => a + b, 0) / severities.length;
    }
    calculateDowntimeScore(failures) {
        if (failures.length === 0)
            return 100;
        const totalDowntime = failures.reduce((a, f) => a + f.downtimeHours, 0);
        if (totalDowntime <= 1)
            return 100;
        if (totalDowntime <= 8)
            return 80;
        if (totalDowntime <= 24)
            return 60;
        if (totalDowntime <= 72)
            return 40;
        return 20;
    }
    calculateMaintenanceScore(workOrders) {
        return this.calculateMaintenanceCompliance(workOrders);
    }
    calculateMaintenanceCompliance(workOrders) {
        const scheduled = workOrders.filter(w => w.type === 'Preventive' || w.type === 'Inspection');
        if (scheduled.length === 0)
            return 50;
        const completed = scheduled.filter(w => w.status === 'Completed').length;
        return (completed / scheduled.length) * 100;
    }
    calculateBacklogScore(workOrders) {
        const backlog = workOrders.filter(w => w.status === 'Assigned' || w.status === 'InProgress').length;
        if (backlog === 0)
            return 100;
        if (backlog <= 3)
            return 80;
        if (backlog <= 6)
            return 60;
        if (backlog <= 10)
            return 40;
        return 20;
    }
    calculateCostEfficiencyScore(workOrders) {
        const completed = workOrders.filter(w => w.status === 'Completed');
        if (completed.length === 0)
            return 50;
        const ratios = completed.map(w => {
            if (w.estimatedCost <= 0)
                return 1;
            return w.actualCost / w.estimatedCost;
        });
        const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        if (avg <= 1.0)
            return 100;
        if (avg <= 1.1)
            return 80;
        if (avg <= 1.2)
            return 60;
        if (avg <= 1.5)
            return 40;
        return 20;
    }
    calculateAgeScore(installDate, designLife) {
        const installed = new Date(installDate).getTime();
        const elapsedYears = (Date.now() - installed) / (1000 * 60 * 60 * 24 * 365);
        if (designLife <= 0)
            return 50;
        const lifeRatio = elapsedYears / designLife;
        if (lifeRatio <= 0.2)
            return 100;
        if (lifeRatio <= 0.4)
            return 85;
        if (lifeRatio <= 0.6)
            return 70;
        if (lifeRatio <= 0.8)
            return 55;
        if (lifeRatio <= 1.0)
            return 40;
        return 20;
    }
    calculateWearScore(asset) {
        return asset.condition.mechanical * 0.4 + asset.condition.electrical * 0.3 +
            asset.condition.structural * 0.2 + asset.condition.cosmetic * 0.1;
    }
    calculateObsolescenceScore(asset) {
        const installed = new Date(asset.installDate).getTime();
        const years = (Date.now() - installed) / (1000 * 60 * 60 * 24 * 365);
        if (years <= 3)
            return 100;
        if (years <= 5)
            return 80;
        if (years <= 8)
            return 60;
        if (years <= 12)
            return 40;
        return 20;
    }
    calculatePerformanceScore(data, asset) {
        if (data.length === 0)
            return 50;
        const recent = data.slice(-10);
        const loads = recent.filter(d => d.load !== null).map(d => d.load);
        if (loads.length === 0)
            return 50;
        const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
        if (avgLoad >= 60 && avgLoad <= 90)
            return 100;
        if (avgLoad >= 40 && avgLoad <= 100)
            return 80;
        if (avgLoad >= 20 || avgLoad <= 120)
            return 60;
        return 40;
    }
    calculateAvailabilityScore(workOrders) {
        const completed = workOrders.filter(w => w.status === 'Completed');
        if (completed.length === 0)
            return 100;
        const totalHours = completed.reduce((a, w) => a + w.actualHours, 0);
        const estimatedHours = completed.reduce((a, w) => a + w.estimatedHours, 0);
        if (estimatedHours <= 0)
            return 50;
        const ratio = totalHours / estimatedHours;
        if (ratio <= 1.0)
            return 100;
        if (ratio <= 1.2)
            return 80;
        if (ratio <= 1.5)
            return 60;
        return 40;
    }
    calculateOutputQualityScore(data) {
        if (data.length === 0)
            return 50;
        const recent = data.slice(-10);
        const errors = recent.filter(d => d.errors !== null).map(d => d.errors);
        if (errors.length === 0)
            return 50;
        const avgErrors = errors.reduce((a, b) => a + b, 0) / errors.length;
        if (avgErrors === 0)
            return 100;
        if (avgErrors <= 0.5)
            return 85;
        if (avgErrors <= 1)
            return 70;
        if (avgErrors <= 3)
            return 50;
        return 30;
    }
    buildWeightedFactors(category, items) {
        return items.map(i => ({
            name: i.name,
            score: Math.round(i.score),
            weight: i.weight,
            contribution: Math.round(i.score * i.weight * 100) / 100
        }));
    }
    determinePriority(score) {
        if (score >= 80)
            return types_1.MaintenancePriority.Routine;
        if (score >= 65)
            return types_1.MaintenancePriority.Scheduled;
        if (score >= 45)
            return types_1.MaintenancePriority.Urgent;
        if (score >= 25)
            return types_1.MaintenancePriority.Immediate;
        return types_1.MaintenancePriority.Replacement;
    }
    generateRecommendation(score, priority, asset) {
        if (score >= 80)
            return `Asset ${asset.id} is in excellent condition. Continue routine maintenance.`;
        if (score >= 65)
            return `Asset ${asset.id} is in good condition. Schedule standard preventive maintenance.`;
        if (score >= 45)
            return `Asset ${asset.id} requires attention. Urgent maintenance recommended. Degradation detected in key components.`;
        if (score >= 25)
            return `Asset ${asset.id} is in poor condition. Immediate intervention required. Consider major overhaul.`;
        return `Asset ${asset.id} has reached end of effective life. Replacement recommended immediately.`;
    }
}
exports.AssetHealthIndexCalculator = AssetHealthIndexCalculator;
//# sourceMappingURL=asset-health-index.js.map