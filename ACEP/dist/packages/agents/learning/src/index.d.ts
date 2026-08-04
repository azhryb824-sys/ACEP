import { IAgent, ProjectFacts, BOQDocument, CostBreakdown, DecisionRecord, Risk, VirtualBuilding } from '@acep/core';
interface LearningSource {
    sourceId: string;
    sourceType: 'ExecutedProject' | 'BOQ' | 'Contract' | 'Price' | 'QualityReport' | 'SafetyReport' | 'Claim' | 'ExpertReview';
    projectId: string;
    data: any;
    timestamp: Date;
    validated: boolean;
    validatedBy?: string;
    validationDate?: Date;
}
interface ModelVersion {
    versionId: string;
    modelType: 'BOQGeneration' | 'QuantityEstimation' | 'Pricing' | 'Planning' | 'RiskAnalysis' | 'Procurement' | 'ContractAnalysis';
    versionNumber: string;
    trainingDataIds: string[];
    performanceMetrics: ModelPerformance;
    status: 'Training' | 'Testing' | 'Validated' | 'Released' | 'Deprecated';
    createdAt: Date;
    releasedAt?: Date;
    releasedBy?: string;
    changelog: string[];
}
interface ModelPerformance {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    confidence: number;
    testSetSize: number;
    validationSetSize: number;
}
interface ExpertReview {
    reviewId: string;
    trainingId: string;
    reviewerId: string;
    reviewerName: string;
    expertise: string[];
    reviewDate: Date;
    approvalStatus: 'Approved' | 'Rejected' | 'NeedsRevision';
    comments: string;
    corrections: Correction[];
    confidence: number;
}
interface Correction {
    field: string;
    originalValue: any;
    correctedValue: any;
    reason: string;
}
interface TrainingExample {
    id: string;
    version: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    metadata: TrainingMetadata;
    features: Record<string, unknown>;
    labels: Record<string, unknown>;
    timestamp: string;
}
interface TrainingMetadata {
    projectType: string;
    location: string;
    floorCount: number;
    area: number;
    itemCount: number;
    totalCost: number;
    confidence: number;
    userId?: string;
    agentVersion: string;
    knowledgeVersion: string;
}
interface ProjectData {
    projectId: string;
    facts: ProjectFacts;
    building?: VirtualBuilding;
    boq: BOQDocument;
    costs?: CostBreakdown;
    decisions: DecisionRecord[];
    risks?: Risk[];
    userId?: string;
    userCorrections: CorrectionEntry[];
    timestamp: string;
    approved: boolean;
}
interface CorrectionEntry {
    itemId: string;
    field: string;
    originalValue: unknown;
    correctedValue: unknown;
    reason: string;
    timestamp: string;
}
interface MetricsSnapshot {
    timestamp: string;
    projectCount: number;
    totalDecisions: number;
    accuracyTrend: number[];
    userCorrectionCount: number;
    mostCommonMissingItems: Map<string, number>;
    averageConfidence: number;
    totalTrainingExamples: number;
    successfulLabTransfers: number;
    failedLabTransfers: number;
}
interface LabPayload {
    experimentId: string;
    trainingExamples: TrainingExample[];
    metrics: MetricsSnapshot;
    timestamp: string;
    source: string;
    version: string;
}
export declare class LearningAgent implements IAgent {
    readonly id = "agent-learning";
    readonly type = "learning";
    readonly name = "AI Training & Continuous Learning Platform";
    private logger;
    private projectDataStore;
    private trainingExamples;
    private learningSources;
    private trainingData;
    private modelVersions;
    private expertReviews;
    private learningPipelines;
    private metricsHistory;
    private accuracyHistory;
    private missingItemsCounter;
    private userCorrectionCount;
    private successfulLabTransfers;
    private failedLabTransfers;
    private maxTrainingExamples;
    constructor(maxTrainingExamples?: number);
    process(input: unknown): Promise<unknown>;
    canHandle(input: unknown): boolean;
    getCapabilities(): string[];
    learnFromExecutedProject(projectData: any): Promise<string>;
    learnFromBOQ(boqData: any): Promise<string>;
    learnFromContract(contractData: any): Promise<string>;
    learnFromPrices(priceData: any): Promise<string>;
    learnFromQualityReport(reportData: any): Promise<string>;
    learnFromSafetyReport(reportData: any): Promise<string>;
    learnFromClaim(claimData: any): Promise<string>;
    submitForExpertReview(trainingId: string, reviewerId: string): Promise<string>;
    completeExpertReview(reviewId: string, reviewData: any): Promise<void>;
    trainModel(modelType: string, trainingDataIds: string[]): Promise<string>;
    validateModel(versionId: string): Promise<ModelPerformance>;
    releaseModel(versionId: string, releasedBy: string): Promise<void>;
    createLearningPipeline(pipelineData: any): Promise<string>;
    executePipeline(pipelineId: string): Promise<void>;
    private extractLearningPoints;
    private extractBOQLearningPoints;
    private extractContractLearningPoints;
    private extractPriceLearningPoints;
    private extractQualityLearningPoints;
    private extractSafetyLearningPoints;
    private extractClaimLearningPoints;
    private createTrainingData;
    private mapSourceTypeToDataType;
    private generateLabels;
    private classifyLearningPoints;
    private extractRegressionTargets;
    private extractClusteringFeatures;
    private simulateModelTraining;
    private simulateModelValidation;
    private getDefaultPipelineStages;
    private executePipelineStage;
    getLearningDashboard(): Promise<LearningDashboard>;
    private calculateLearningTrends;
    collectProjectData(project: ProjectData): Promise<void>;
    prepareTrainingExample(project: ProjectData): Promise<TrainingExample>;
    private extractBOQFeatures;
    private extractBuildingFeatures;
    private extractItemLabels;
    private extractQuantityLabels;
    sendToLab(payload: LabPayload): Promise<{
        status: string;
        experimentId: string;
        timestamp: string;
    }>;
    private prepareLabPayload;
    collectMetrics(): MetricsSnapshot;
    private getTotalDecisionCount;
    private calculateAverageConfidence;
    recordAccuracy(accuracy: number): void;
    getStats(): {
        projectCount: number;
        trainingExampleCount: number;
        userCorrections: number;
        labTransfers: number;
    };
    getMetricsHistory(): MetricsSnapshot[];
    getProjectData(projectId: string): ProjectData | undefined;
    getAllProjects(): ProjectData[];
    getModelPerformance(versionId: string): ModelPerformance | undefined;
    getAllModels(): ModelVersion[];
    getExpertReviews(trainingId?: string): ExpertReview[];
}
interface LearningDashboard {
    totalSources: number;
    totalTrainingData: number;
    approvedTrainingData: number;
    totalModels: number;
    releasedModels: number;
    pendingReviews: number;
    activePipelines: number;
    recentSources: LearningSource[];
    recentModels: ModelVersion[];
    learningTrends: any;
}
export {};
//# sourceMappingURL=index.d.ts.map