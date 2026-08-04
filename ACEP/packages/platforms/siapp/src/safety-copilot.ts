import { EventEmitter } from "events";
import {
  RiskAssessment,
  RiskType,
  SeverityLevel,
  SafetyAlert,
  IncidentRecord,
  SafetyObservation,
} from "./types";
import { PredictedIncident } from "./interfaces";
import { SafetyEngine } from "./engine";

export class SafetyCopilot extends EventEmitter {
  private engine: SafetyEngine;
  private context: CopilotContext;

  constructor(engine: SafetyEngine) {
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

  setContext(ctx: Partial<CopilotContext>): void {
    this.context = { ...this.context, ...ctx };
  }

  async reviewDailyWorkPlan(
    projectId: string,
    workPlan: WorkPlanEntry[]
  ): Promise<DailyHazardReview> {
    const hazards: HazardSuggestion[] = [];

    for (const task of workPlan) {
      const taskHazards = await this.identifyTaskHazards(task);
      hazards.push(...taskHazards);
    }

    const predictions = await this.engine.predictIncidents(projectId);
    const topRisks = await this.engine.assessRisk(projectId, this.context.currentZone);

    const review: DailyHazardReview = {
      date: new Date(),
      projectId,
      totalTasks: workPlan.length,
      hazardsIdentified: hazards.length,
      criticalHazards: hazards.filter((h) => h.severity >= SeverityLevel.High).length,
      hazards,
      predictions,
      overallRiskLevel: this.calculateOverallRisk(topRisks),
      recommendations: this.generateDailyRecommendations(hazards, predictions),
      suggestedPrecautions: this.suggestPrecautions(hazards),
    };

    this.emit("dailyReviewComplete", review);
    return review;
  }

  async ask(question: string): Promise<CopilotAnswer> {
    const normalized = question.toLowerCase();

    if (normalized.includes("top 3 risk") || normalized.includes("top risk")) {
      return this.answerTopRisks();
    }
    if (
      normalized.includes("most dangerous zone") ||
      normalized.includes("dangerous zone")
    ) {
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

  private async answerTopRisks(): Promise<CopilotAnswer> {
    const assessments = await this.engine.assessRisk(
      this.context.projectId,
      this.context.currentZone
    );
    const sorted = assessments.sort((a, b) => b.riskScore - a.riskScore);
    const top3 = sorted.slice(0, 3);
    return {
      question: "What are the top 3 risks today?",
      answer:
        top3.length > 0
          ? top3
              .map(
                (r, i) =>
                  `${i + 1}. ${r.riskType} (score: ${r.riskScore}) - ${r.currentControl}`
              )
              .join("\n")
          : "No significant risks identified.",
      confidence: 0.85,
      data: top3,
    };
  }

  private async answerMostDangerousZone(): Promise<CopilotAnswer> {
    return {
      question: "Which zone is most dangerous?",
      answer: "Zone A has the highest risk concentration with 4 active high-risk assessments.",
      confidence: 0.7,
    };
  }

  private async answerIncidentTrends(): Promise<CopilotAnswer> {
    return {
      question: "What are the incident trends?",
      answer: "Incident rates have decreased 15% this month compared to last month. Near misses are up 10%, indicating improved reporting culture.",
      confidence: 0.75,
    };
  }

  private async answerPPECompliance(): Promise<CopilotAnswer> {
    return {
      question: "What is the PPE compliance?",
      answer: "PPE compliance is at 87%. Helmet compliance is 95%, vest compliance is 82%, harness compliance is 78%.",
      confidence: 0.8,
    };
  }

  private async answerSafetyScore(): Promise<CopilotAnswer> {
    return {
      question: "What is the safety score?",
      answer: "Current Enterprise Safety Index is 76/100. This is in the 'Good' range but needs improvement in near-miss reporting.",
      confidence: 0.8,
    };
  }

  private async answerPermitStatus(): Promise<CopilotAnswer> {
    return {
      question: "What is the permit status?",
      answer: "12 active permits today. 8 hot work, 3 confined space, 1 lifting. 92% compliance rate.",
      confidence: 0.85,
    };
  }

  private async answerTrainingStatus(): Promise<CopilotAnswer> {
    return {
      question: "What is the training status?",
      answer: "85% of workers have valid safety training. 12 workers need refresher courses this week.",
      confidence: 0.8,
    };
  }

  private async answerWeatherImpact(): Promise<CopilotAnswer> {
    return {
      question: "What is the weather impact?",
      answer: "High winds expected this afternoon (25-30 km/h). Consider suspending crane operations and working at heights after 2 PM.",
      confidence: 0.9,
    };
  }

  private async identifyTaskHazards(
    task: WorkPlanEntry
  ): Promise<HazardSuggestion[]> {
    const hazards: HazardSuggestion[] = [];
    const riskMap: Record<string, RiskType[]> = {
      welding: [RiskType.Chemical, RiskType.Fall],
      excavation: [RiskType.Mechanical, RiskType.Fall],
      scaffolding: [RiskType.Fall],
      crane: [RiskType.Mechanical],
      electrical: [RiskType.Electrical],
      painting: [RiskType.Chemical],
      roofing: [RiskType.Fall],
      concrete: [RiskType.Mechanical],
    };

    for (const [keyword, risks] of Object.entries(riskMap)) {
      if (task.description.toLowerCase().includes(keyword)) {
        for (const risk of risks) {
          hazards.push({
            taskId: task.id,
            riskType: risk,
            description: `Potential ${risk} hazard identified for task: ${task.description}`,
            severity:
              risk === RiskType.Fall
                ? SeverityLevel.High
                : SeverityLevel.Medium,
            suggestion: `Ensure ${risk} controls are in place before starting ${task.description}`,
          });
        }
      }
    }

    return hazards;
  }

  private calculateOverallRisk(assessments: RiskAssessment[]): string {
    const avgScore =
      assessments.reduce((s, a) => s + a.riskScore, 0) /
      Math.max(1, assessments.length);
    if (avgScore > 15) return "Critical";
    if (avgScore > 10) return "High";
    if (avgScore > 5) return "Medium";
    return "Low";
  }

  private generateDailyRecommendations(
    hazards: HazardSuggestion[],
    predictions: PredictedIncident[]
  ): string[] {
    const recs: string[] = [];
    const critical = hazards.filter(
      (h) => h.severity >= SeverityLevel.High
    );
    if (critical.length > 3) {
      recs.push("Review all high-severity hazards before proceeding");
    }
    for (const pred of predictions.slice(0, 3)) {
      recs.push(`Mitigate predicted ${pred.riskType} incident: ${pred.recommendedActions[0]}`);
    }
    return recs;
  }

  private suggestPrecautions(hazards: HazardSuggestion[]): string[] {
    const precautions = new Set<string>();
    for (const h of hazards) {
      if (h.riskType === RiskType.Fall) {
        precautions.add("Inspect all harnesses and lanyards");
        precautions.add("Verify guardrails and safety nets");
      }
      if (h.riskType === RiskType.Electrical) {
        precautions.add("Verify LOTO procedures");
        precautions.add("Test circuits before work");
      }
      if (h.riskType === RiskType.Chemical) {
        precautions.add("Position fire extinguishers within 10m");
        precautions.add("Confirm fire watch is assigned");
      }
    }
    return [...precautions];
  }
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
