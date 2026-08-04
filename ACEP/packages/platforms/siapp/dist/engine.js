"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyEngine = void 0;
const events_1 = require("events");
const types_1 = require("./types");
class SafetyEngine extends events_1.EventEmitter {
    name = "SIAPP Safety Engine";
    version = "45.0.0";
    riskAnalyzer;
    permitManager;
    incidentManager;
    investigationSupport;
    emergencyManager;
    knowledgeBase = new Map();
    workerBehaviors = new Map();
    trainingRecords = new Map();
    safetyObservations = [];
    safetyAlerts = [];
    riskAssessments = [];
    incidentRecords = [];
    permits = [];
    emergencyPlans = [];
    cameraStreams = new Map();
    constructor() {
        super();
        this.riskAnalyzer = new RiskAnalyzer();
        this.permitManager = new PermitManager();
        this.incidentManager = new IncidentManager();
        this.investigationSupport = new InvestigationSupport();
        this.emergencyManager = new EmergencyManager();
    }
    async initialize() {
        this.emit("initialized", { name: this.name, version: this.version });
    }
    async shutdown() {
        this.emit("shutdown", { name: this.name });
    }
    async healthCheck() {
        return true;
    }
    async assessRisk(projectId, zoneId) {
        const assessments = [];
        const projectAssessments = this.riskAssessments.filter((r) => r.projectId === projectId && r.zoneId === zoneId);
        for (const assessment of projectAssessments) {
            const riskScore = this.riskAnalyzer.analyzeRisk(assessment.riskType, assessment.probability, assessment.severity, assessment.affectedPeople, assessment.responseTime, 1);
            assessment.riskScore = riskScore;
            assessment.residualRisk = this.riskAnalyzer.calculateResidualRisk(riskScore, assessment.mitigations.filter((m) => m.status === types_1.MitigationStatus.Completed).length);
            assessments.push(assessment);
        }
        return assessments;
    }
    async getRiskMatrix(projectId) {
        return this.riskAnalyzer.getRiskMatrix(projectId);
    }
    async predictIncidents(projectId) {
        const predictions = [];
        const projectAssessments = this.riskAssessments.filter((r) => r.projectId === projectId);
        const highRiskAssessments = projectAssessments.filter((r) => r.riskScore >= 12);
        for (const assessment of highRiskAssessments) {
            const nearMisses = this.incidentRecords.filter((inc) => inc.projectId === projectId &&
                inc.outcomes.some((o) => o.type === "NearMiss") &&
                inc.causes.some((c) => c.category === "Root")).length;
            const probability = Math.min(1, (assessment.probability / 5) * (1 + nearMisses * 0.1));
            predictions.push({
                id: `pred-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                riskType: assessment.riskType,
                probability,
                potentialSeverity: assessment.severity,
                location: { zoneId: assessment.zoneId, latitude: 0, longitude: 0 },
                predictedTimeframe: "next-7-days",
                contributingFactors: [
                    `Current risk score: ${assessment.riskScore}`,
                    `Control: ${assessment.currentControl}`,
                ],
                recommendedActions: assessment.mitigations.map((m) => m.description),
                confidence: Math.min(0.95, 0.5 + nearMisses * 0.1),
            });
        }
        return predictions;
    }
    async getSafetyMetrics(projectId) {
        const projectIncidents = this.incidentRecords.filter((i) => i.projectId === projectId);
        const totalHours = 500000;
        const totalIncidents = projectIncidents.length;
        const lostDays = projectIncidents.reduce((sum, i) => sum +
            i.outcomes
                .filter((o) => o.daysLost)
                .reduce((s, o) => s + (o.daysLost || 0), 0), 0);
        const nearMissCount = projectIncidents.filter((i) => i.outcomes.some((o) => o.type === "NearMiss")).length;
        const fatalities = projectIncidents.filter((i) => i.outcomes.some((o) => o.type === "Fatality")).length;
        return {
            projectId,
            date: new Date(),
            TRIR: (totalIncidents * 200000) / totalHours,
            LTIFR: (lostDays > 0 ? (lostDays * 200000) / totalHours : 0),
            NearMissCount: nearMissCount,
            ObservationCount: this.safetyObservations.length,
            PermitCompliance: await this.permitManager.checkPermitCompliance(projectId),
            ResponseTime: 5,
            PPECompliance: this.calculatePPECompliance(),
            SafetyScore: this.calculateSafetyScore(projectId),
        };
    }
    async getEnterpriseSafetyIndex(projectId) {
        const metrics = await this.getSafetyMetrics(projectId);
        const inspections = this.safetyObservations.filter((o) => o.projectId === projectId).length;
        const index = {
            score: 0,
            incidentRate: Math.max(0, 100 - metrics.TRIR * 10),
            inspections: Math.min(100, inspections * 2),
            ppeCompliance: metrics.PPECompliance * 100,
            responseTime: Math.max(0, 100 - metrics.ResponseTime * 5),
            observations: Math.min(100, inspections),
            training: this.calculateTrainingScore(projectId),
            nearMiss: Math.max(0, 100 - metrics.NearMissCount * 2),
            compliance: metrics.PermitCompliance * 100,
        };
        index.score = Math.round((index.incidentRate * 0.25 +
            index.inspections * 0.1 +
            index.ppeCompliance * 0.15 +
            index.responseTime * 0.1 +
            index.observations * 0.05 +
            index.training * 0.1 +
            index.nearMiss * 0.1 +
            index.compliance * 0.15) /
            100);
        return index;
    }
    async generateReport(projectId, start, end) {
        const metrics = await this.getSafetyMetrics(projectId);
        const index = await this.getEnterpriseSafetyIndex(projectId);
        const incidents = this.incidentRecords.filter((i) => i.projectId === projectId && i.date >= start && i.date <= end);
        const observations = this.safetyObservations.filter((o) => o.projectId === projectId && o.date >= start && o.date <= end);
        const alerts = this.safetyAlerts.filter((a) => a.projectId === projectId && a.detectedAt >= start && a.detectedAt <= end);
        const assessments = this.riskAssessments.filter((r) => r.projectId === projectId);
        return {
            id: `report-${Date.now()}`,
            projectId,
            period: { start, end },
            metrics,
            index,
            topRisks: assessments.sort((a, b) => b.riskScore - a.riskScore).slice(0, 10),
            incidents,
            observations,
            alerts,
            recommendations: await this.generateRecommendations(projectId),
            generatedBy: this.name,
            generatedAt: new Date(),
        };
    }
    async getSafetyKnowledgeBase() {
        return Array.from(this.knowledgeBase.values());
    }
    addKnowledgeEntry(entry) {
        this.knowledgeBase.set(entry.id, entry);
    }
    addDetection(projectId, detection) {
        const alert = {
            id: `alert-${Date.now()}`,
            projectId,
            title: `Detection: ${detection.type}`,
            description: `${detection.type} detected with ${(detection.confidence * 100).toFixed(0)}% confidence`,
            severity: detection.confidence > 0.8
                ? types_1.SeverityLevel.High
                : detection.confidence > 0.5
                    ? types_1.SeverityLevel.Medium
                    : types_1.SeverityLevel.Low,
            source: detection.source,
            location: { zoneId: "unknown", latitude: 0, longitude: 0 },
            detectedAt: new Date(),
            recommendations: [`Review ${detection.type} footage`, "Assign safety officer"],
        };
        this.safetyAlerts.push(alert);
        this.emit("detection", alert);
    }
    calculatePPECompliance() {
        const ppeDetections = this.safetyAlerts.filter((a) => a.title.includes("NoHelmet") ||
            a.title.includes("NoVest") ||
            a.title.includes("NoHarness"));
        const total = ppeDetections.length;
        if (total === 0)
            return 1;
        const violations = ppeDetections.filter((a) => (a.title.includes("NoHelmet") && a.severity >= types_1.SeverityLevel.High) ||
            (a.title.includes("NoVest") && a.severity >= types_1.SeverityLevel.High) ||
            (a.title.includes("NoHarness") && a.severity >= types_1.SeverityLevel.High)).length;
        return 1 - violations / total;
    }
    calculateSafetyScore(projectId) {
        const incidents = this.incidentRecords.filter((i) => i.projectId === projectId);
        const base = 100;
        const deductions = incidents.length * 5 +
            incidents.filter((i) => i.outcomes.some((o) => o.type === "Fatality")).length *
                20;
        return Math.max(0, base - deductions);
    }
    calculateTrainingScore(projectId) {
        const workers = this.trainingRecords.size;
        if (workers === 0)
            return 0;
        let completed = 0;
        for (const records of this.trainingRecords.values()) {
            if (records.some((r) => r.isPassed))
                completed++;
        }
        return (completed / workers) * 100;
    }
    async generateRecommendations(projectId) {
        const recs = [];
        const metrics = await this.getSafetyMetrics(projectId);
        if (metrics.TRIR > 5)
            recs.push("High TRIR - review safety protocols and increase training");
        if (metrics.PPECompliance < 0.8)
            recs.push("Low PPE compliance - enforce mandatory PPE policy");
        if (metrics.NearMissCount > 10)
            recs.push("High near-miss count - investigate patterns");
        return recs;
    }
    getRiskAnalyzer() {
        return this.riskAnalyzer;
    }
    getPermitManager() {
        return this.permitManager;
    }
    getIncidentManager() {
        return this.incidentManager;
    }
    getInvestigationSupport() {
        return this.investigationSupport;
    }
    getEmergencyManager() {
        return this.emergencyManager;
    }
}
exports.SafetyEngine = SafetyEngine;
class RiskAnalyzer {
    riskMatrices = new Map();
    analyzeRisk(riskType, probability, severity, affectedPeople, responseTime, currentControl) {
        const p = probability / 5;
        const s = severity / 5;
        const a = affectedPeople / 100;
        const r = responseTime / 60;
        const c = currentControl;
        return Math.round(p * s * (1 + a) * (1 + r) * (1 - c) * 100) / 100;
    }
    calculateResidualRisk(initialRisk, mitigations) {
        const reduction = Math.min(0.9, mitigations * 0.15);
        return Math.round(initialRisk * (1 - reduction) * 100) / 100;
    }
    async getRiskMatrix(projectId) {
        return this.riskMatrices.get(projectId) || [];
    }
    async getHeatMap(projectId) {
        return {
            zones: [],
            maxScore: 0,
            generatedAt: new Date(),
        };
    }
}
class PermitManager {
    permits = [];
    async createPermit(permit) {
        const newPermit = {
            ...permit,
            id: `permit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
        this.permits.push(newPermit);
        return newPermit;
    }
    async approvePermit(permitId, approver) {
        const permit = this.permits.find((p) => p.id === permitId);
        if (!permit)
            throw new Error(`Permit ${permitId} not found`);
        permit.isApproved = true;
        permit.approvedBy = approver;
        permit.approvedAt = new Date();
        return permit;
    }
    async closePermit(permitId, closer) {
        const permit = this.permits.find((p) => p.id === permitId);
        if (!permit)
            throw new Error(`Permit ${permitId} not found`);
        permit.isClosed = true;
        permit.closedBy = closer;
        permit.closedAt = new Date();
        return permit;
    }
    async verifyRequirements(permitId) {
        const permit = this.permits.find((p) => p.id === permitId);
        if (!permit)
            throw new Error(`Permit ${permitId} not found`);
        const total = permit.requirements.length;
        const checked = permit.requirements.filter((r) => r.isChecked).length;
        return {
            permitId,
            totalRequirements: total,
            checkedRequirements: checked,
            compliancePercentage: total > 0 ? (checked / total) * 100 : 0,
            missingRequirements: permit.requirements
                .filter((r) => !r.isChecked)
                .map((r) => r.description),
            isCompliant: checked === total,
        };
    }
    async getActivePermits(projectId) {
        return this.permits.filter((p) => p.projectId === projectId && p.isApproved && !p.isClosed);
    }
    async getPermitHistory(projectId) {
        return this.permits.filter((p) => p.projectId === projectId);
    }
    async checkPermitCompliance(projectId) {
        const projectPermits = this.permits.filter((p) => p.projectId === projectId);
        if (projectPermits.length === 0)
            return 1;
        const compliant = projectPermits.filter((p) => {
            const checked = p.requirements.filter((r) => r.isChecked).length;
            return checked === p.requirements.length;
        }).length;
        return compliant / projectPermits.length;
    }
}
class IncidentManager {
    incidents = [];
    async reportIncident(incident) {
        const newIncident = {
            ...incident,
            id: `incident-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
        this.incidents.push(newIncident);
        return newIncident;
    }
    async updateIncident(id, update) {
        const index = this.incidents.findIndex((i) => i.id === id);
        if (index === -1)
            throw new Error(`Incident ${id} not found`);
        this.incidents[index] = { ...this.incidents[index], ...update };
        return this.incidents[index];
    }
    async getIncident(id) {
        const incident = this.incidents.find((i) => i.id === id);
        if (!incident)
            throw new Error(`Incident ${id} not found`);
        return incident;
    }
    async getIncidentsByProject(projectId) {
        return this.incidents.filter((i) => i.projectId === projectId);
    }
    async getNearMisses(projectId) {
        return this.incidents.filter((i) => i.projectId === projectId &&
            i.outcomes.some((o) => o.type === "NearMiss"));
    }
    async getIncidentTrends(projectId, start, end) {
        return [];
    }
    async getIncidentStatistics(projectId) {
        const projectIncidents = this.incidents.filter((i) => i.projectId === projectId);
        return {
            total: projectIncidents.length,
            open: projectIncidents.filter((i) => i.status === types_1.IncidentStatus.Open).length,
            underInvestigation: projectIncidents.filter((i) => i.status === types_1.IncidentStatus.UnderInvestigation).length,
            closed: projectIncidents.filter((i) => i.status === types_1.IncidentStatus.Closed).length,
            fatalities: projectIncidents.filter((i) => i.outcomes.some((o) => o.type === "Fatality")).length,
            seriousInjuries: projectIncidents.filter((i) => i.outcomes.some((o) => o.type === "SeriousInjury")).length,
            totalDaysLost: projectIncidents.reduce((sum, i) => sum +
                i.outcomes
                    .filter((o) => o.daysLost)
                    .reduce((s, o) => s + (o.daysLost || 0), 0), 0),
            totalCost: projectIncidents.reduce((sum, i) => sum +
                i.outcomes
                    .filter((o) => o.cost)
                    .reduce((s, o) => s + (o.cost || 0), 0), 0),
            averageResponseTime: 5,
        };
    }
}
class InvestigationSupport {
    investigations = [];
    async createInvestigation(incidentId, type, lead) {
        const investigation = {
            id: `investigation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            incidentId,
            type,
            leadInvestigator: lead,
            team: [lead],
            startedAt: new Date(),
            steps: [],
            findings: [],
            rootCauses: [],
            recommendations: [],
            status: types_1.InvestigationStatus.Initiated,
        };
        this.investigations.push(investigation);
        return investigation;
    }
    async addFinding(investigationId, finding) {
        const inv = this.investigations.find((i) => i.id === investigationId);
        if (!inv)
            throw new Error(`Investigation ${investigationId} not found`);
        inv.findings.push(finding);
        return inv;
    }
    async completeInvestigation(investigationId) {
        const inv = this.investigations.find((i) => i.id === investigationId);
        if (!inv)
            throw new Error(`Investigation ${investigationId} not found`);
        inv.status = types_1.InvestigationStatus.Completed;
        inv.completedAt = new Date();
        return inv;
    }
    async performRCA(investigationId) {
        const inv = this.investigations.find((i) => i.id === investigationId);
        if (!inv)
            throw new Error(`Investigation ${investigationId} not found`);
        const rootCauses = [];
        for (const finding of inv.findings) {
            const whys = finding.split(" because ");
            if (whys.length > 1) {
                rootCauses.push(whys[whys.length - 1].trim());
            }
        }
        inv.rootCauses = rootCauses;
        return rootCauses;
    }
    async performFiveWhys(investigationId) {
        const inv = this.investigations.find((i) => i.id === investigationId);
        if (!inv)
            throw new Error(`Investigation ${investigationId} not found`);
        return {
            problem: inv.findings[0] || "Unknown problem",
            whys: [
                { level: 1, question: "Why did this happen?", answer: inv.findings[0] || "Unknown" },
                { level: 2, question: "Why was that the case?", answer: inv.findings[1] || "Unknown" },
                { level: 3, question: "Why did that occur?", answer: inv.findings[2] || "Unknown" },
                { level: 4, question: "Why was that allowed?", answer: inv.findings[3] || "Unknown" },
                { level: 5, question: "Why did the system fail?", answer: inv.rootCauses[0] || "Unknown" },
            ],
            rootCause: inv.rootCauses[0] || "Not determined",
            recommendations: inv.recommendations,
        };
    }
    async performFishbone(investigationId) {
        const inv = this.investigations.find((i) => i.id === investigationId);
        if (!inv)
            throw new Error(`Investigation ${investigationId} not found`);
        return {
            problem: inv.findings[0] || "Unknown problem",
            categories: [
                {
                    name: "People",
                    causes: inv.findings.slice(0, 2),
                    subCauses: [],
                },
                {
                    name: "Process",
                    causes: inv.findings.slice(2, 4),
                    subCauses: [],
                },
                {
                    name: "Equipment",
                    causes: inv.findings.slice(4, 6),
                    subCauses: [],
                },
            ],
            rootCauses: inv.rootCauses,
        };
    }
    async performBarrierAnalysis(investigationId) {
        const inv = this.investigations.find((i) => i.id === investigationId);
        if (!inv)
            throw new Error(`Investigation ${investigationId} not found`);
        return {
            incident: inv.findings[0] || "Unknown incident",
            barriers: [
                { name: "Training", type: "administrative", status: "functioning", description: "Worker training program" },
                { name: "PPE", type: "physical", status: "functioning", description: "Personal protective equipment" },
                { name: "Supervision", type: "cultural", status: "functioning", description: "Site supervision" },
            ],
            failedBarriers: [],
            recommendations: inv.recommendations,
        };
    }
    async generateInvestigationReport(investigationId) {
        const inv = this.investigations.find((i) => i.id === investigationId);
        if (!inv)
            throw new Error(`Investigation ${investigationId} not found`);
        return [
            `Investigation Report: ${inv.type}`,
            `Incident ID: ${inv.incidentId}`,
            `Lead: ${inv.leadInvestigator}`,
            `Started: ${inv.startedAt.toISOString()}`,
            `Status: ${inv.status}`,
            "",
            "Findings:",
            ...inv.findings.map((f) => `  - ${f}`),
            "",
            "Root Causes:",
            ...inv.rootCauses.map((rc) => `  - ${rc}`),
            "",
            "Recommendations:",
            ...inv.recommendations.map((r) => `  - ${r}`),
        ].join("\n");
    }
}
class EmergencyManager {
    plans = [];
    contacts = [];
    async activateEmergencyPlan(planId) {
        const plan = this.plans.find((p) => p.id === planId);
        if (!plan)
            throw new Error(`Plan ${planId} not found`);
        return {
            planId,
            activatedAt: new Date(),
            activatedBy: "system",
            status: "Initiated",
            notificationsSent: plan.nearestResponseTeams.length,
        };
    }
    async getEmergencyPlans(projectId) {
        return this.plans.filter((p) => p.projectId === projectId);
    }
    async triggerEvacuation(zoneId) {
        return {
            zoneId,
            isEvacuated: true,
            evacuatedCount: 0,
            remainingCount: 0,
            assemblyPointsReached: [],
            duration: 0,
            status: "in-progress",
        };
    }
    async getNearestResponseTeam(location) {
        return {
            teamId: "team-1",
            name: "Primary Response Team",
            eta: 5,
            members: [],
            contactNumber: "911",
            specialization: "General",
        };
    }
    async getEvacuationRoute(zoneId, destination) {
        return {
            from: { latitude: 0, longitude: 0 },
            to: { latitude: 0, longitude: 0 },
            waypoints: [],
            distance: 0,
            estimatedTime: 0,
            hazards: [],
            alternatives: [],
        };
    }
    async conductDrill(planId) {
        return {
            planId,
            drillDate: new Date(),
            duration: 300,
            participationCount: 50,
            evacuationTime: 180,
            issuesFound: [],
            score: 85,
            passed: true,
        };
    }
    async getEmergencyContacts(projectId) {
        return this.contacts;
    }
}
//# sourceMappingURL=engine.js.map