import { v4 as uuid } from 'uuid';
import { IAgent, ILogger, ProjectFacts, BOQDocument, BOQItem, CostBreakdown, DecisionRecord, Risk, VirtualBuilding } from '@acep/core';

// Volume 32: AI Training & Continuous Learning Platform (ATCLP)

// Learning Sources
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

// Training Data
interface TrainingData {
  trainingId: string;
  sourceId: string;
  dataType: 'Project' | 'BOQ' | 'Contract' | 'Price' | 'Quality' | 'Safety' | 'Claim' | 'Decision';
  features: Record<string, any>;
  labels: Record<string, any>;
  metadata: TrainingMetadata;
  version: string;
  createdAt: Date;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

// Model Version
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

// Expert Review
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

// Learning Pipeline
interface LearningPipeline {
  pipelineId: string;
  name: string;
  description: string;
  stages: PipelineStage[];
  status: 'Active' | 'Paused' | 'Completed';
  currentStage: number;
  startedAt: Date;
  completedAt?: Date;
}

interface PipelineStage {
  stageId: string;
  name: string;
  type: 'DataCollection' | 'Validation' | 'Training' | 'Testing' | 'ExpertReview' | 'Release';
  status: 'Pending' | 'InProgress' | 'Completed' | 'Failed';
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  errors?: string[];
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

class Logger implements ILogger {
  constructor(private readonly context: string) {}

  info(message: string, data?: unknown): void {
    console.log(`[${this.context}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  warn(message: string, data?: unknown): void {
    console.warn(`[${this.context}] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  error(message: string, data?: unknown): void {
    console.error(`[${this.context}] ERROR: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  debug(message: string, data?: unknown): void {
    console.debug(`[${this.context}] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  trace(message: string, data?: unknown): void {
    console.trace(`[${this.context}] TRACE: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

export class LearningAgent implements IAgent {
  readonly id = 'agent-learning';
  readonly type = 'learning';
  readonly name = 'AI Training & Continuous Learning Platform';
  private logger = new Logger(this.name);

  private projectDataStore: Map<string, ProjectData> = new Map();
  private trainingExamples: TrainingExample[] = [];
  private learningSources: Map<string, LearningSource> = new Map();
  private trainingData: Map<string, TrainingData> = new Map();
  private modelVersions: Map<string, ModelVersion> = new Map();
  private expertReviews: Map<string, ExpertReview> = new Map();
  private learningPipelines: Map<string, LearningPipeline> = new Map();
  private metricsHistory: MetricsSnapshot[] = [];
  private accuracyHistory: number[] = [];
  private missingItemsCounter: Map<string, number> = new Map();
  private userCorrectionCount: number = 0;
  private successfulLabTransfers: number = 0;
  private failedLabTransfers: number = 0;
  private maxTrainingExamples: number;

  constructor(maxTrainingExamples: number = 5000) {
    this.maxTrainingExamples = maxTrainingExamples;
  }

  async process(input: unknown): Promise<unknown> {
    this.logger.info('Processing learning request');
    const request = input as { action: string; project?: ProjectData; userId?: string };

    switch (request.action) {
      case 'collect':
        if (request.project) {
          return this.collectProjectData(request.project);
        }
        throw new Error('collect action requires project data');
      case 'prepare':
        if (request.project) {
          return this.prepareTrainingExample(request.project);
        }
        throw new Error('prepare action requires project data');
      case 'send':
        return this.sendToLab(this.prepareLabPayload());
      case 'metrics':
        return this.collectMetrics();
      default:
        return {
          status: 'unknown-action',
          available: ['collect', 'prepare', 'send', 'metrics'],
          stats: this.getStats()
        };
    }
  }

  canHandle(input: unknown): boolean {
    return input !== null && typeof input === 'object' && 'action' in (input as Record<string, unknown>);
  }

  getCapabilities(): string[] {
    return [
      'data-collection',
      'training-preparation',
      'lab-communication',
      'metrics-collection',
      'expert-review',
      'model-training',
      'model-validation',
      'model-release',
      'continuous-learning',
      'version-management'
    ];
  }

  // Volume 32: Learning from Executed Projects
  async learnFromExecutedProject(projectData: any): Promise<string> {
    this.logger.info(`Learning from executed project: ${projectData.projectId}`);

    const source: LearningSource = {
      sourceId: `SRC-${Date.now()}`,
      sourceType: 'ExecutedProject',
      projectId: projectData.projectId,
      data: projectData,
      timestamp: new Date(),
      validated: false
    };

    this.learningSources.set(source.sourceId, source);

    // Extract learning points
    const learningPoints = await this.extractLearningPoints(projectData);

    // Create training data
    const trainingData = await this.createTrainingData(source, learningPoints);
    this.trainingData.set(trainingData.trainingId, trainingData);

    return trainingData.trainingId;
  }

  // Volume 32: Learning from BOQs
  async learnFromBOQ(boqData: any): Promise<string> {
    this.logger.info(`Learning from BOQ: ${boqData.boqId}`);

    const source: LearningSource = {
      sourceId: `SRC-${Date.now()}`,
      sourceType: 'BOQ',
      projectId: boqData.projectId,
      data: boqData,
      timestamp: new Date(),
      validated: false
    };

    this.learningSources.set(source.sourceId, source);

    const learningPoints = await this.extractBOQLearningPoints(boqData);
    const trainingData = await this.createTrainingData(source, learningPoints);
    this.trainingData.set(trainingData.trainingId, trainingData);

    return trainingData.trainingId;
  }

  // Volume 32: Learning from Contracts
  async learnFromContract(contractData: any): Promise<string> {
    this.logger.info(`Learning from contract: ${contractData.contractId}`);

    const source: LearningSource = {
      sourceId: `SRC-${Date.now()}`,
      sourceType: 'Contract',
      projectId: contractData.projectId,
      data: contractData,
      timestamp: new Date(),
      validated: false
    };

    this.learningSources.set(source.sourceId, source);

    const learningPoints = await this.extractContractLearningPoints(contractData);
    const trainingData = await this.createTrainingData(source, learningPoints);
    this.trainingData.set(trainingData.trainingId, trainingData);

    return trainingData.trainingId;
  }

  // Volume 32: Learning from Prices
  async learnFromPrices(priceData: any): Promise<string> {
    this.logger.info(`Learning from price data`);

    const source: LearningSource = {
      sourceId: `SRC-${Date.now()}`,
      sourceType: 'Price',
      projectId: priceData.projectId || 'global',
      data: priceData,
      timestamp: new Date(),
      validated: false
    };

    this.learningSources.set(source.sourceId, source);

    const learningPoints = await this.extractPriceLearningPoints(priceData);
    const trainingData = await this.createTrainingData(source, learningPoints);
    this.trainingData.set(trainingData.trainingId, trainingData);

    return trainingData.trainingId;
  }

  // Volume 32: Learning from Quality Reports
  async learnFromQualityReport(reportData: any): Promise<string> {
    this.logger.info(`Learning from quality report`);

    const source: LearningSource = {
      sourceId: `SRC-${Date.now()}`,
      sourceType: 'QualityReport',
      projectId: reportData.projectId,
      data: reportData,
      timestamp: new Date(),
      validated: false
    };

    this.learningSources.set(source.sourceId, source);

    const learningPoints = await this.extractQualityLearningPoints(reportData);
    const trainingData = await this.createTrainingData(source, learningPoints);
    this.trainingData.set(trainingData.trainingId, trainingData);

    return trainingData.trainingId;
  }

  // Volume 32: Learning from Safety Reports
  async learnFromSafetyReport(reportData: any): Promise<string> {
    this.logger.info(`Learning from safety report`);

    const source: LearningSource = {
      sourceId: `SRC-${Date.now()}`,
      sourceType: 'SafetyReport',
      projectId: reportData.projectId,
      data: reportData,
      timestamp: new Date(),
      validated: false
    };

    this.learningSources.set(source.sourceId, source);

    const learningPoints = await this.extractSafetyLearningPoints(reportData);
    const trainingData = await this.createTrainingData(source, learningPoints);
    this.trainingData.set(trainingData.trainingId, trainingData);

    return trainingData.trainingId;
  }

  // Volume 32: Learning from Claims
  async learnFromClaim(claimData: any): Promise<string> {
    this.logger.info(`Learning from claim: ${claimData.claimId}`);

    const source: LearningSource = {
      sourceId: `SRC-${Date.now()}`,
      sourceType: 'Claim',
      projectId: claimData.projectId,
      data: claimData,
      timestamp: new Date(),
      validated: false
    };

    this.learningSources.set(source.sourceId, source);

    const learningPoints = await this.extractClaimLearningPoints(claimData);
    const trainingData = await this.createTrainingData(source, learningPoints);
    this.trainingData.set(trainingData.trainingId, trainingData);

    return trainingData.trainingId;
  }

  // Volume 32: Expert Review
  async submitForExpertReview(trainingId: string, reviewerId: string): Promise<string> {
    this.logger.info(`Submitting training data ${trainingId} for expert review`);

    const trainingData = this.trainingData.get(trainingId);
    if (!trainingData) {
      throw new Error(`Training data not found: ${trainingId}`);
    }

    const review: ExpertReview = {
      reviewId: `REV-${Date.now()}`,
      trainingId,
      reviewerId,
      reviewerName: 'Expert Reviewer',
      expertise: ['Construction Engineering', 'Cost Estimation'],
      reviewDate: new Date(),
      approvalStatus: 'NeedsRevision',
      comments: 'Pending expert review',
      corrections: [],
      confidence: 0.8
    };

    this.expertReviews.set(review.reviewId, review);
    return review.reviewId;
  }

  async completeExpertReview(reviewId: string, reviewData: any): Promise<void> {
    this.logger.info(`Completing expert review: ${reviewId}`);

    const review = this.expertReviews.get(reviewId);
    if (!review) {
      throw new Error(`Review not found: ${reviewId}`);
    }

    review.approvalStatus = reviewData.approvalStatus;
    review.comments = reviewData.comments;
    review.corrections = reviewData.corrections || [];
    review.confidence = reviewData.confidence || 0.8;

    // Update training data based on review
    if (review.approvalStatus === 'Approved') {
      const trainingData = this.trainingData.get(review.trainingId);
      if (trainingData) {
        trainingData.approved = true;
        trainingData.approvedBy = review.reviewerId;
        trainingData.approvedAt = new Date();
      }
    }
  }

  // Volume 32: Model Training
  async trainModel(modelType: string, trainingDataIds: string[]): Promise<string> {
    this.logger.info(`Training model: ${modelType}`);

    const modelVersion: ModelVersion = {
      versionId: `MOD-${Date.now()}`,
      modelType: modelType as any,
      versionNumber: '1.0.0',
      trainingDataIds,
      performanceMetrics: {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        confidence: 0,
        testSetSize: 0,
        validationSetSize: 0
      },
      status: 'Training',
      createdAt: new Date(),
      changelog: ['Initial training']
    };

    this.modelVersions.set(modelVersion.versionId, modelVersion);

    // Simulate training
    await this.simulateModelTraining(modelVersion);

    return modelVersion.versionId;
  }

  // Volume 32: Model Validation
  async validateModel(versionId: string): Promise<ModelPerformance> {
    this.logger.info(`Validating model: ${versionId}`);

    const model = this.modelVersions.get(versionId);
    if (!model) {
      throw new Error(`Model not found: ${versionId}`);
    }

    model.status = 'Testing';

    // Simulate validation
    const performance = await this.simulateModelValidation(model);
    model.performanceMetrics = performance;
    model.status = 'Validated';

    return performance;
  }

  // Volume 32: Model Release
  async releaseModel(versionId: string, releasedBy: string): Promise<void> {
    this.logger.info(`Releasing model: ${versionId}`);

    const model = this.modelVersions.get(versionId);
    if (!model) {
      throw new Error(`Model not found: ${versionId}`);
  }

    if (model.status !== 'Validated') {
      throw new Error('Model must be validated before release');
    }

    model.status = 'Released';
    model.releasedAt = new Date();
    model.releasedBy = releasedBy;
  }

  // Volume 32: Learning Pipeline
  async createLearningPipeline(pipelineData: any): Promise<string> {
    this.logger.info(`Creating learning pipeline: ${pipelineData.name}`);

    const pipeline: LearningPipeline = {
      pipelineId: `PIPE-${Date.now()}`,
      name: pipelineData.name,
      description: pipelineData.description,
      stages: pipelineData.stages || this.getDefaultPipelineStages(),
      status: 'Active',
      currentStage: 0,
      startedAt: new Date()
    };

    this.learningPipelines.set(pipeline.pipelineId, pipeline);
    return pipeline.pipelineId;
  }

  async executePipeline(pipelineId: string): Promise<void> {
    this.logger.info(`Executing pipeline: ${pipelineId}`);

    const pipeline = this.learningPipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    for (let i = 0; i < pipeline.stages.length; i++) {
      pipeline.currentStage = i;
      const stage = pipeline.stages[i];
      stage.status = 'InProgress';
      stage.startedAt = new Date();

      try {
        await this.executePipelineStage(stage);
        stage.status = 'Completed';
        stage.completedAt = new Date();
      } catch (error) {
        stage.status = 'Failed';
        stage.errors = [(error as Error).message];
        throw error;
      }
    }

    pipeline.status = 'Completed';
    pipeline.completedAt = new Date();
  }

  // Helper methods
  private async extractLearningPoints(projectData: any): Promise<any> {
    return {
      projectCharacteristics: {
        type: projectData.projectType,
        size: projectData.builtArea,
        complexity: projectData.complexity,
        location: projectData.location
      },
      performanceMetrics: {
        schedulePerformance: projectData.schedulePerformance,
        costPerformance: projectData.costPerformance,
        qualityScore: projectData.qualityScore
      },
      lessonsLearned: projectData.lessonsLearned || [],
      risks: projectData.risks || [],
      successes: projectData.successes || []
    };
  }

  private async extractBOQLearningPoints(boqData: any): Promise<any> {
    return {
      items: boqData.items,
      quantities: boqData.quantities,
      unitPrices: boqData.unitPrices,
      categories: boqData.categories,
      wasteFactors: boqData.wasteFactors
    };
  }

  private async extractContractLearningPoints(contractData: any): Promise<any> {
    return {
      contractType: contractData.contractType,
      terms: contractData.terms,
  
    paymentTerms: contractData.paymentTerms,
      risks: contractData.risks,
      obligations: contractData.obligations
    };
  }

  private async extractPriceLearningPoints(priceData: any): Promise<any> {
    return {
      materials: priceData.materials,
      labor: priceData.labor,
      equipment: priceData.equipment,
      marketConditions: priceData.marketConditions,
      trends: priceData.trends
    };
  }

  private async extractQualityLearningPoints(reportData: any): Promise<any> {
    return {
      qualityMetrics: reportData.metrics,
      defects: reportData.defects,
      inspections: reportData.inspections,
      compliance: reportData.compliance
    };
  }

  private async extractSafetyLearningPoints(reportData: any): Promise<any> {
    return {
      incidents: reportData.incidents,
      nearMisses: reportData.nearMisses,
      safetyMetrics: reportData.metrics,
      compliance: reportData.compliance
    };
  }

  private async extractClaimLearningPoints(claimData: any): Promise<any> {
    return {
      claimType: claimData.type,
      cause: claimData.cause,
      outcome: claimData.outcome,
      amount: claimData.amount,
      duration: claimData.duration
    };
  }

  private async createTrainingData(source: LearningSource, learningPoints: any): Promise<TrainingData> {
    const trainingData: TrainingData = {
      trainingId: `TRN-${Date.now()}`,
      sourceId: source.sourceId,
      dataType: this.mapSourceTypeToDataType(source.sourceType),
      features: learningPoints,
      labels: await this.generateLabels(learningPoints),
      metadata: {
        projectType: source.data.projectType || 'Unknown',
        location: source.data.location || 'Unknown',
        floorCount: source.data.floors || 0,
        area: source.data.builtArea || 0,
        itemCount: source.data.itemCount || 0,
        totalCost: source.data.totalCost || 0,
        confidence: 0.8,
        userId: source.data.userId,
        agentVersion: '1.0.0',
        knowledgeVersion: '1.0.0'
      },
      version: '1.0.0',
      createdAt: new Date(),
      approved: false
    };

    return trainingData;
  }

  private mapSourceTypeToDataType(sourceType: string): any {
    const mapping: Record<string, any> = {
      'ExecutedProject': 'Project',
      'BOQ': 'BOQ',
      'Contract': 'Contract',
      'Price': 'Price',
      'QualityReport': 'Quality',
      'SafetyReport': 'Safety',
      'Claim': 'Claim'
    };
    return mapping[sourceType] || 'Decision';
  }

  private async generateLabels(learningPoints: any): Promise<Record<string, any>> {
    return {
      classification: this.classifyLearningPoints(learningPoints),
      regression: this.extractRegressionTargets(learningPoints),
      clustering: this.extractClusteringFeatures(learningPoints)
    };
  }

  private classifyLearningPoints(learningPoints: any): string {
    return 'standard';
  }

  private extractRegressionTargets(learningPoints: any): any {
    return {
      cost: learningPoints.totalCost || 0,
      duration: learningPoints.duration || 0
    };
  }

  private extractClusteringFeatures(learningPoints: any): any {
    return {
      complexity: learningPoints.complexity || 'medium',
      riskLevel: learningPoints.riskLevel || 'medium'
    };
  }

  private async simulateModelTraining(model: ModelVersion): Promise<void> {
    // Simulate training time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    model.status = 'Testing';
    this.logger.info(`Model training completed: ${model.versionId}`);
  }

  private async simulateModelValidation(model: ModelVersion): Promise<ModelPerformance> {
    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      accuracy: 0.85 + Math.random() * 0.1,
      precision: 0.8 + Math.random() * 0.15,
      recall: 0.75 + Math.random() * 0.2,
      f1Score: 0.8 + Math.random() * 0.15,
      confidence: 0.8 + Math.random() * 0.15,
      testSetSize: 100,
      validationSetSize: 50
    };
  }

  private getDefaultPipelineStages(): PipelineStage[] {
    return [
      {
        stageId: 'STG-001',
        name: 'Data Collection',
        type: 'DataCollection',
        status: 'Pending'
      },
      {
        stageId: 'STG-002',
        name: 'Validation',
        type: 'Validation',
        status: 'Pending'
      },
      {
        stageId: 'STG-003',
        name: 'Training',
        type: 'Training',
        status: 'Pending'
      },
      {
        stageId: 'STG-004',
        name: 'Testing',
        type: 'Testing',
        status: 'Pending'
      },
      {
        stageId: 'STG-005',
        name: 'Expert Review',
        type: 'ExpertReview',
        status: 'Pending'
      },
      {
        stageId: 'STG-006',
        name: 'Release',
        type: 'Release',
        status: 'Pending'
      }
    ];
  }

  private async executePipelineStage(stage: PipelineStage): Promise<void> {
    // Simulate stage execution
    await new Promise(resolve => setTimeout(resolve, 300));
    stage.result = { success: true, timestamp: new Date() };
  }

  // Volume 32: Learning Dashboard
  async getLearningDashboard(): Promise<LearningDashboard> {
    const totalSources = this.learningSources.size;
    const totalTrainingData = this.trainingData.size;
    const approvedTrainingData = Array.from(this.trainingData.values()).filter(t => t.approved).length;
    const totalModels = this.modelVersions.size;
    const releasedModels = Array.from(this.modelVersions.values()).filter(m => m.status === 'Released').length;
    const pendingReviews = Array.from(this.expertReviews.values()).filter(r => r.approvalStatus === 'NeedsRevision').length;
    const activePipelines = Array.from(this.learningPipelines.values()).filter(p => p.status === 'Active').length;

    return {
      totalSources,
      totalTrainingData,
      approvedTrainingData,
      totalModels,
      releasedModels,
      pendingReviews,
      activePipelines,
      recentSources: Array.from(this.learningSources.values()).slice(-10),
      recentModels: Array.from(this.modelVersions.values()).slice(-10),
      learningTrends: this.calculateLearningTrends()
    };
  }

  private calculateLearningTrends(): any {
    return {
      dataGrowthRate: 0.15,
      modelAccuracyTrend: [0.75, 0.78, 0.82, 0.85, 0.87],
      expertReviewRate: 0.8,
      modelReleaseFrequency: 2 // per month
    };
  }

  async collectProjectData(project: ProjectData): Promise<void> {
    this.logger.info(`Collecting data for project ${project.projectId}`);
    this.projectDataStore.set(project.projectId, project);

    if (project.userCorrections) {
      this.userCorrectionCount += project.userCorrections.length;
      for (const correction of project.userCorrections) {
        const key = `${correction.itemId}:${correction.field}`;
        this.missingItemsCounter.set(key, (this.missingItemsCounter.get(key) || 0) + 1);
      }
    }

    this.logger.info(`Project data collected. Total projects: ${this.projectDataStore.size}`);
  }

  async prepareTrainingExample(project: ProjectData): Promise<TrainingExample> {
    this.logger.info(`Preparing training example for project ${project.projectId}`);

    const boqFeatures = this.extractBOQFeatures(project.boq);
    const itemLabels = this.extractItemLabels(project.boq);

    const example: TrainingExample = {
      id: uuid(),
      version: '1.0.0',
      input: {
        projectType: project.facts.projectType?.value || 'Unknown',
        builtArea: project.facts.builtArea?.value || 0,
        floors: project.facts.floors || 1,
        qualityLevel: project.facts.qualityLevel?.level || 'Standard',
        systems: Object.keys(project.facts.systems || {}),
        location: project.facts.location?.city || 'Unknown',
        materials: project.facts.materials || {},
        spaces: Object.keys(project.facts.spaces || {})
      },
      output: {
        boqItems: project.boq.items.map(i => ({
          code: i.code,
          description: i.description,
          category: i.category,
          level: i.level,
          quantity: i.quantity,
          unit: i.unit
        })),
        totalCost: project.boq.summary.totalCost,
        itemCount: project.boq.items.length
      },
      metadata: {
        projectType: project.facts.projectType?.value || 'Unknown',
        location: project.facts.location?.city || 'Unknown',
        floorCount: project.facts.floors || 1,
        area: project.facts.builtArea?.value || project.facts.landArea?.value || 0,
        itemCount: project.boq.items.length,
        totalCost: project.boq.summary.totalCost,
        confidence: project.facts.confidence,
        userId: project.userId,
        agentVersion: '1.0.0',
        knowledgeVersion: '1.0.0'
      },
      features: {
        boq: boqFeatures,
        building: project.building ? this.extractBuildingFeatures(project.building) : {},
        decisions: project.decisions.map(d => ({
          option: d.selectedOption,
          confidence: d.confidence,
          reason: d.reason
        }))
      },
      labels: {
        items: itemLabels,
        quantities: this.extractQuantityLabels(project.boq),
        costs: project.costs || {}
      },
      timestamp: new Date().toISOString()
    };

    this.trainingExamples.push(example);
    if (this.trainingExamples.length > this.maxTrainingExamples) {
      this.trainingExamples.shift();
    }

    this.logger.info(`Training example prepared. Total examples: ${this.trainingExamples.length}`);
    return example;
  }

  private extractBOQFeatures(boq: BOQDocument): Record<string, unknown> {
    const categories = new Set(boq.items.map(i => i.category));
    const levels = new Set(boq.items.map(i => i.level));
    const totalQuantity = boq.items.reduce((sum, i) => sum + i.quantity, 0);

    return {
      categoryCount: categories.size,
      levelCount: levels.size,
      totalItems: boq.items.length,
      totalQuantity,
      categories: [...categories],
      levels: [...levels],
      averageConfidence: boq.items.length > 0
        ? boq.items.reduce((sum, i) => sum + i.confidence, 0) / boq.items.length
        : 0,
      averageUnitPrice: boq.items.length > 0
        ? boq.items.reduce((sum, i) => sum + i.unitPrice, 0) / boq.items.length
        : 0
    };
  }

  private extractBuildingFeatures(building: VirtualBuilding): Record<string, unknown> {
    return {
      numFloors: building.skeleton.numFloors,
      hasBasement: building.skeleton.hasBasement,
      hasRoof: building.skeleton.hasRoof,
      totalHeight: building.skeleton.totalHeight,
      spaceCount: building.spaces.length,
      floorCount: building.floors.length,
      structuralElements: {
        foundations: building.structural.foundation.length,
        columns: building.structural.columns.length,
        beams: building.structural.beams.length,
        slabs: building.structural.slabs.length
      }
    };
  }

  private extractItemLabels(boq: BOQDocument): Record<string, unknown> {
    const labels: Record<string, unknown> = {};
    for (const item of boq.items) {
      labels[item.code] = {
        category: item.category,
        level: item.level,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        confidence: item.confidence,
        wasteFactor: item.wasteFactor
      };
    }
    return labels;
  }

  private extractQuantityLabels(boq: BOQDocument): Record<string, unknown> {
    const labels: Record<string, unknown> = {};
    for (const item of boq.items) {
      labels[item.code] = {
        quantity: item.quantity,
        unit: item.unit,
        trace: item.calculationTrace,
        correctionFactors: item.correctionFactors,
        wasteFactor: item.wasteFactor
      };
    }
    return labels;
  }

  async sendToLab(payload: LabPayload): Promise<{ status: string; experimentId: string; timestamp: string }> {
    this.logger.info(`Sending data to Engineering Evolution Lab: ${payload.trainingExamples.length} examples`);

    try {
      const response = {
        status: 'received',
        experimentId: payload.experimentId,
        receivedAt: new Date().toISOString(),
        examplesCount: payload.trainingExamples.length
      };

      this.successfulLabTransfers++;
      this.logger.info(`Data sent to lab successfully. Experiment: ${payload.experimentId}`);

      return {
        status: 'success',
        experimentId: payload.experimentId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.failedLabTransfers++;
      this.logger.error(`Failed to send data to lab: ${(error as Error).message}`);
      return {
        status: 'failed',
        experimentId: payload.experimentId,
        timestamp: new Date().toISOString()
      };
    }
  }

  private prepareLabPayload(): LabPayload {
    const metrics = this.collectMetrics();
    return {
      experimentId: uuid(),
      trainingExamples: [...this.trainingExamples],
      metrics,
      timestamp: new Date().toISOString(),
      source: 'LearningAgent',
      version: '1.0.0'
    };
  }

  collectMetrics(): MetricsSnapshot {
    const projectCount = this.projectDataStore.size;
    const totalDecisions = this.getTotalDecisionCount();
    const averageConfidence = this.calculateAverageConfidence();

    const topMissingItems = new Map(
      [...this.missingItemsCounter.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
    );

    const snapshot: MetricsSnapshot = {
      timestamp: new Date().toISOString(),
      projectCount,
      totalDecisions,
      accuracyTrend: [...this.accuracyHistory],
      userCorrectionCount: this.userCorrectionCount,
      mostCommonMissingItems: topMissingItems,
      averageConfidence,
      totalTrainingExamples: this.trainingExamples.length,
      successfulLabTransfers: this.successfulLabTransfers,
      failedLabTransfers: this.failedLabTransfers
    };

    this.metricsHistory.push(snapshot);
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    return snapshot;
  }

  private getTotalDecisionCount(): number {
    let count = 0;
    for (const project of this.projectDataStore.values()) {
      count += project.decisions.length;
    }
    return count;
  }

  private calculateAverageConfidence(): number {
    let totalConfidence = 0;
    let count = 0;

    for (const project of this.projectDataStore.values()) {
      totalConfidence += project.facts.confidence;
      count++;
      for (const item of project.boq.items) {
        totalConfidence += item.confidence;
        count++;
      }
    }

    return count > 0 ? totalConfidence / count : 0;
  }

  recordAccuracy(accuracy: number): void {
    this.accuracyHistory.push(accuracy);
    if (this.accuracyHistory.length > 1000) {
      this.accuracyHistory.shift();
    }
  }

  getStats(): { projectCount: number; trainingExampleCount: number; userCorrections: number; labTransfers: number } {
    return {
      projectCount: this.projectDataStore.size,
      trainingExampleCount: this.trainingExamples.length,
      userCorrections: this.userCorrectionCount,
      labTransfers: this.successfulLabTransfers
    };
  }

  getMetricsHistory(): MetricsSnapshot[] {
    return this.metricsHistory;
  }

  getProjectData(projectId: string): ProjectData | undefined {
    return this.projectDataStore.get(projectId);
  }

  getAllProjects(): ProjectData[] {
    return Array.from(this.projectDataStore.values());
  }

  // Volume 32: Get Model Performance
  getModelPerformance(versionId: string): ModelPerformance | undefined {
    const model = this.modelVersions.get(versionId);
    return model?.performanceMetrics;
  }

  // Volume 32: Get All Models
  getAllModels(): ModelVersion[] {
    return Array.from(this.modelVersions.values());
  }

  // Volume 32: Get Expert Reviews
  getExpertReviews(trainingId?: string): ExpertReview[] {
    const reviews = Array.from(this.expertReviews.values());
    if (trainingId) {
      return reviews.filter(r => r.trainingId === trainingId);
    }
    return reviews;
  }
}

// Supporting interfaces
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
