import { EventEmitter } from "events";
import { RiskType, SeverityLevel } from "./types";
import { PredictedIncident } from "./interfaces";
import { SafetyEngine } from "./engine";
export declare class SafetyCopilot extends EventEmitter {
    private engine;
    private context;
    constructor(engine: SafetyEngine);
    setContext(ctx: Partial<CopilotContext>): void;
    reviewDailyWorkPlan(projectId: string, workPlan: WorkPlanEntry[]): Promise<DailyHazardReview>;
    ask(question: string): Promise<CopilotAnswer>;
    private answerTopRisks;
    private answerMostDangerousZone;
    private answerIncidentTrends;
    private answerPPECompliance;
    private answerSafetyScore;
    private answerPermitStatus;
    private answerTrainingStatus;
    private answerWeatherImpact;
    private identifyTaskHazards;
    private calculateOverallRisk;
    private generateDailyRecommendations;
    private suggestPrecautions;
}
export interface CopilotContext {
    projectId: string;
    currentZone: string;
    timeOfDay: number;
    weatherConditions: string;
    workerCount: number;
    activePermits: number;
    recentAlerts: number;
}
export interface WorkPlanEntry {
    id: string;
    description: string;
    zone: string;
    assignedWorkers: number;
    startTime: string;
    endTime: string;
    supervisor: string;
}
export interface HazardSuggestion {
    taskId: string;
    riskType: RiskType;
    description: string;
    severity: SeverityLevel;
    suggestion: string;
}
export interface DailyHazardReview {
    date: Date;
    projectId: string;
    totalTasks: number;
    hazardsIdentified: number;
    criticalHazards: number;
    hazards: HazardSuggestion[];
    predictions: PredictedIncident[];
    overallRiskLevel: string;
    recommendations: string[];
    suggestedPrecautions: string[];
}
export interface CopilotAnswer {
    question: string;
    answer: string;
    confidence: number;
    data?: any;
}
//# sourceMappingURL=safety-copilot.d.ts.map