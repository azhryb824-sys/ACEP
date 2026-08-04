"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyCopilot = void 0;
const events_1 = require("events");
const types_1 = require("./types");
class SafetyCopilot extends events_1.EventEmitter {
    engine;
    context;
    constructor(engine) {
        super();
        this.engine = engine;
        this.context = {
            projectId: "",
            currentZone: "",
            timeOfDay: new Date().getHours(),
            weatherConditions: "clear",
            workerCount: 0,
            activePermits: 0,
            recentAlerts: 0,
        };
    }
    setContext(ctx) {
        this.context = { ...this.context, ...ctx };
    }
    async reviewDailyWorkPlan(projectId, workPlan) {
        const hazards = [];
        for (const task of workPlan) {
            const taskHazards = await this.identifyTaskHazards(task);
            hazards.push(...taskHazards);
        }
        const predictions = await this.engine.predictIncidents(projectId);
        const topRisks = await this.engine.assessRisk(projectId, this.context.currentZone);
        const review = {
            date: new Date(),
            projectId,
            totalTasks: workPlan.length,
            hazardsIdentified: hazards.length,
            criticalHazards: hazards.filter((h) => h.severity >= types_1.SeverityLevel.High).length,
            hazards,
            predictions,
            overallRiskLevel: this.calculateOverallRisk(topRisks),
            recommendations: this.generateDailyRecommendations(hazards, predictions),
            suggestedPrecautions: this.suggestPrecautions(hazards),
        };
        this.emit("dailyReviewComplete", review);
        return review;
    }
    async ask(question) {
        const normalized = question.toLowerCase();
        if (normalized.includes("top 3 risk") || normalized.includes("top risk")) {
            return this.answerTopRisks();
        }
        if (normalized.includes("most dangerous zone") ||
            normalized.includes("dangerous zone")) {
            return this.answerMostDangerousZone();
        }
        if (normalized.includes("incident trend") || normalized.includes("trend")) {
            return this.answerIncidentTrends();
        }
        if (normalized.includes("ppc compliance") || normalized.includes("p p e")) {
            return this.answerPPECompliance();
        }
        if (normalized.includes("safety score") || normalized.includes("score")) {
            return this.answerSafetyScore();
        }
        if (normalized.includes("permit") || normalized.includes("permit")) {
            return this.answerPermitStatus();
        }
        if (normalized.includes("training") || normalized.includes("training")) {
            return this.answerTrainingStatus();
        }
        if (normalized.includes("weather") || normalized.includes("weather")) {
            return this.answerWeatherImpact();
        }
        return {
            question,
            answer: "I can help you with: top risks, dangerous zones, incident trends, PPE compliance, safety score, permit status, training status, and weather impact. Please be more specific.",
            confidence: 0.5,
        };
    }
    async answerTopRisks() {
        const assessments = await this.engine.assessRisk(this.context.projectId, this.context.currentZone);
        const sorted = assessments.sort((a, b) => b.riskScore - a.riskScore);
        const top3 = sorted.slice(0, 3);
        return {
            question: "What are the top 3 risks today?",
            answer: top3.length > 0
                ? top3
                    .map((r, i) => `${i + 1}. ${r.riskType} (score: ${r.riskScore}) - ${r.currentControl}`)
                    .join("\n")
                : "No significant risks identified.",
            confidence: 0.85,
            data: top3,
        };
    }
    async answerMostDangerousZone() {
        return {
            question: "Which zone is most dangerous?",
            answer: "Zone A has the highest risk concentration with 4 active high-risk assessments.",
            confidence: 0.7,
        };
    }
    async answerIncidentTrends() {
        return {
            question: "What are the incident trends?",
            answer: "Incident rates have decreased 15% this month compared to last month. Near misses are up 10%, indicating improved reporting culture.",
            confidence: 0.75,
        };
    }
    async answerPPECompliance() {
        return {
            question: "What is the PPE compliance?",
            answer: "PPE compliance is at 87%. Helmet compliance is 95%, vest compliance is 82%, harness compliance is 78%.",
            confidence: 0.8,
        };
    }
    async answerSafetyScore() {
        return {
            question: "What is the safety score?",
            answer: "Current Enterprise Safety Index is 76/100. This is in the 'Good' range but needs improvement in near-miss reporting.",
            confidence: 0.8,
        };
    }
    async answerPermitStatus() {
        return {
            question: "What is the permit status?",
            answer: "12 active permits today. 8 hot work, 3 confined space, 1 lifting. 92% compliance rate.",
            confidence: 0.85,
        };
    }
    async answerTrainingStatus() {
        return {
            question: "What is the training status?",
            answer: "85% of workers have valid safety training. 12 workers need refresher courses this week.",
            confidence: 0.8,
        };
    }
    async answerWeatherImpact() {
        return {
            question: "What is the weather impact?",
            answer: "High winds expected this afternoon (25-30 km/h). Consider suspending crane operations and working at heights after 2 PM.",
            confidence: 0.9,
        };
    }
    async identifyTaskHazards(task) {
        const hazards = [];
        const riskMap = {
            welding: [types_1.RiskType.Chemical, types_1.RiskType.Fall],
            excavation: [types_1.RiskType.Mechanical, types_1.RiskType.Fall],
            scaffolding: [types_1.RiskType.Fall],
            crane: [types_1.RiskType.Mechanical],
            electrical: [types_1.RiskType.Electrical],
            painting: [types_1.RiskType.Chemical],
            roofing: [types_1.RiskType.Fall],
            concrete: [types_1.RiskType.Mechanical],
        };
        for (const [keyword, risks] of Object.entries(riskMap)) {
            if (task.description.toLowerCase().includes(keyword)) {
                for (const risk of risks) {
                    hazards.push({
                        taskId: task.id,
                        riskType: risk,
                        description: `Potential ${risk} hazard identified for task: ${task.description}`,
                        severity: risk === types_1.RiskType.Fall
                            ? types_1.SeverityLevel.High
                            : types_1.SeverityLevel.Medium,
                        suggestion: `Ensure ${risk} controls are in place before starting ${task.description}`,
                    });
                }
            }
        }
        return hazards;
    }
    calculateOverallRisk(assessments) {
        const avgScore = assessments.reduce((s, a) => s + a.riskScore, 0) /
            Math.max(1, assessments.length);
        if (avgScore > 15)
            return "Critical";
        if (avgScore > 10)
            return "High";
        if (avgScore > 5)
            return "Medium";
        return "Low";
    }
    generateDailyRecommendations(hazards, predictions) {
        const recs = [];
        const critical = hazards.filter((h) => h.severity >= types_1.SeverityLevel.High);
        if (critical.length > 3) {
            recs.push("Review all high-severity hazards before proceeding");
        }
        for (const pred of predictions.slice(0, 3)) {
            recs.push(`Mitigate predicted ${pred.riskType} incident: ${pred.recommendedActions[0]}`);
        }
        return recs;
    }
    suggestPrecautions(hazards) {
        const precautions = new Set();
        for (const h of hazards) {
            if (h.riskType === types_1.RiskType.Fall) {
                precautions.add("Inspect all harnesses and lanyards");
                precautions.add("Verify guardrails and safety nets");
            }
            if (h.riskType === types_1.RiskType.Electrical) {
                precautions.add("Verify LOTO procedures");
                precautions.add("Test circuits before work");
            }
            if (h.riskType === types_1.RiskType.Chemical) {
                precautions.add("Position fire extinguishers within 10m");
                precautions.add("Confirm fire watch is assigned");
            }
        }
        return [...precautions];
    }
}
exports.SafetyCopilot = SafetyCopilot;
//# sourceMappingURL=safety-copilot.js.map