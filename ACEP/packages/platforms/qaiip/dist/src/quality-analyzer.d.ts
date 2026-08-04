import { InspectionPoint, NCR, NCRSeverity, QualityAnalysis, QualityPattern, RecurringDefect, SuggestedAction, ActionPriority, QualityTrend, QualityMetrics, DefectType, QualityElement } from './types';
import { IQualityAnalyzer } from './interfaces';
interface PatternSignature {
    defectTypes: DefectType[];
    elements: QualityElement[];
    locations: string[];
    severity: NCRSeverity;
}
interface HistoricalPattern {
    signature: PatternSignature;
    frequency: number;
    projects: string[];
    typicalRootCause: string;
    typicalSolution: string;
}
export declare class QualityAnalyzer implements IQualityAnalyzer {
    private knowledgeGraph;
    private history;
    private learningData;
    constructor(kg: any);
    analyzeProject(projectId: string, from: string, to: string): Promise<QualityAnalysis>;
    detectPatterns(inspections: InspectionPoint[], ncrs: NCR[]): Promise<QualityPattern[]>;
    findRecurringDefects(ncrs: NCR[]): Promise<RecurringDefect[]>;
    estimateReworkProbability(inspections: InspectionPoint[]): Promise<number>;
    suggestCorrectiveActions(ncrs: NCR[]): Promise<SuggestedAction[]>;
    prioritizeActions(defects: RecurringDefect[]): Promise<ActionPriority[]>;
    analyzeTrends(metrics: QualityMetrics[]): Promise<QualityTrend[]>;
    learnFromPast(projectId: string): Promise<void>;
    getRecommendations(projectId: string): Promise<string[]>;
    addToHistory(projectId: string, pattern: HistoricalPattern): void;
    private getInspectionsForProject;
    private getNCRsForProject;
    private getMaxSeverity;
    private mapSeverity;
    private mapSeverityToPriority;
    private inferDefectType;
    private findHistoricalSolution;
    private estimateEffort;
    private calculateDeadline;
    private buildTrend;
    private generateSummary;
    getLearningData(): HistoricalPattern[];
    getProjectHistory(projectId: string): HistoricalPattern[];
    clearHistory(projectId?: string): void;
}
export {};
//# sourceMappingURL=quality-analyzer.d.ts.map