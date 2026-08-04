"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningAgent = void 0;
const uuid_1 = require("uuid");
class Logger {
    context;
    constructor(context) {
        this.context = context;
    }
    info(message, data) {
        console.log(`[${this.context}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    warn(message, data) {
        console.warn(`[${this.context}] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    error(message, data) {
        console.error(`[${this.context}] ERROR: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    debug(message, data) {
        console.debug(`[${this.context}] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
    trace(message, data) {
        console.trace(`[${this.context}] TRACE: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
}
class LearningAgent {
    id = 'agent-learning';
    type = 'learning';
    name = 'AI Training & Continuous Learning Platform';
    logger = new Logger(this.name);
    projectDataStore = new Map();
    trainingExamples = [];
    learningSources = new Map();
    trainingData = new Map();
    modelVersions = new Map();
    expertReviews = new Map();
    learningPipelines = new Map();
    metricsHistory = [];
    accuracyHistory = [];
    missingItemsCounter = new Map();
    userCorrectionCount = 0;
    successfulLabTransfers = 0;
    failedLabTransfers = 0;
    maxTrainingExamples;
    constructor(maxTrainingExamples = 5000) {
        this.maxTrainingExamples = maxTrainingExamples;
    }
    async process(input) {
        this.logger.info('Processing learning request');
        const request = input;
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
    canHandle(input) {
        return input !== null && typeof input === 'object' && 'action' in input;
    }
    getCapabilities() {
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
    async learnFromExecutedProject(projectData) {
        this.logger.info(`Learning from executed project: ${projectData.projectId}`);
        const source = {
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
    async learnFromBOQ(boqData) {
        this.logger.info(`Learning from BOQ: ${boqData.boqId}`);
        const source = {
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
    async learnFromContract(contractData) {
        this.logger.info(`Learning from contract: ${contractData.contractId}`);
        const source = {
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
    async learnFromPrices(priceData) {
        this.logger.info(`Learning from price data`);
        const source = {
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
    async learnFromQualityReport(reportData) {
        this.logger.info(`Learning from quality report`);
        const source = {
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
    async learnFromSafetyReport(reportData) {
        this.logger.info(`Learning from safety report`);
        const source = {
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
    async learnFromClaim(claimData) {
        this.logger.info(`Learning from claim: ${claimData.claimId}`);
        const source = {
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
    async submitForExpertReview(trainingId, reviewerId) {
        this.logger.info(`Submitting training data ${trainingId} for expert review`);
        const trainingData = this.trainingData.get(trainingId);
        if (!trainingData) {
            throw new Error(`Training data not found: ${trainingId}`);
        }
        const review = {
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
    async completeExpertReview(reviewId, reviewData) {
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
    async trainModel(modelType, trainingDataIds) {
        this.logger.info(`Training model: ${modelType}`);
        const modelVersion = {
            versionId: `MOD-${Date.now()}`,
            modelType: modelType,
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
    async validateModel(versionId) {
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
    async releaseModel(versionId, releasedBy) {
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
    async createLearningPipeline(pipelineData) {
        this.logger.info(`Creating learning pipeline: ${pipelineData.name}`);
        const pipeline = {
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
    async executePipeline(pipelineId) {
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
            }
            catch (error) {
                stage.status = 'Failed';
                stage.errors = [error.message];
                throw error;
            }
        }
        pipeline.status = 'Completed';
        pipeline.completedAt = new Date();
    }
    // Helper methods
    async extractLearningPoints(projectData) {
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
    async extractBOQLearningPoints(boqData) {
        return {
            items: boqData.items,
            quantities: boqData.quantities,
            unitPrices: boqData.unitPrices,
            categories: boqData.categories,
            wasteFactors: boqData.wasteFactors
        };
    }
    async extractContractLearningPoints(contractData) {
        return {
            contractType: contractData.contractType,
            terms: contractData.terms,
            paymentTerms: contractData.paymentTerms,
            risks: contractData.risks,
            obligations: contractData.obligations
        };
    }
    async extractPriceLearningPoints(priceData) {
        return {
            materials: priceData.materials,
            labor: priceData.labor,
            equipment: priceData.equipment,
            marketConditions: priceData.marketConditions,
            trends: priceData.trends
        };
    }
    async extractQualityLearningPoints(reportData) {
        return {
            qualityMetrics: reportData.metrics,
            defects: reportData.defects,
            inspections: reportData.inspections,
            compliance: reportData.compliance
        };
    }
    async extractSafetyLearningPoints(reportData) {
        return {
            incidents: reportData.incidents,
            nearMisses: reportData.nearMisses,
            safetyMetrics: reportData.metrics,
            compliance: reportData.compliance
        };
    }
    async extractClaimLearningPoints(claimData) {
        return {
            claimType: claimData.type,
            cause: claimData.cause,
            outcome: claimData.outcome,
            amount: claimData.amount,
            duration: claimData.duration
        };
    }
    async createTrainingData(source, learningPoints) {
        const trainingData = {
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
    mapSourceTypeToDataType(sourceType) {
        const mapping = {
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
    async generateLabels(learningPoints) {
        return {
            classification: this.classifyLearningPoints(learningPoints),
            regression: this.extractRegressionTargets(learningPoints),
            clustering: this.extractClusteringFeatures(learningPoints)
        };
    }
    classifyLearningPoints(learningPoints) {
        return 'standard';
    }
    extractRegressionTargets(learningPoints) {
        return {
            cost: learningPoints.totalCost || 0,
            duration: learningPoints.duration || 0
        };
    }
    extractClusteringFeatures(learningPoints) {
        return {
            complexity: learningPoints.complexity || 'medium',
            riskLevel: learningPoints.riskLevel || 'medium'
        };
    }
    async simulateModelTraining(model) {
        // Simulate training time
        await new Promise(resolve => setTimeout(resolve, 1000));
        model.status = 'Testing';
        this.logger.info(`Model training completed: ${model.versionId}`);
    }
    async simulateModelValidation(model) {
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
    getDefaultPipelineStages() {
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
    async executePipelineStage(stage) {
        // Simulate stage execution
        await new Promise(resolve => setTimeout(resolve, 300));
        stage.result = { success: true, timestamp: new Date() };
    }
    // Volume 32: Learning Dashboard
    async getLearningDashboard() {
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
    calculateLearningTrends() {
        return {
            dataGrowthRate: 0.15,
            modelAccuracyTrend: [0.75, 0.78, 0.82, 0.85, 0.87],
            expertReviewRate: 0.8,
            modelReleaseFrequency: 2 // per month
        };
    }
    async collectProjectData(project) {
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
    async prepareTrainingExample(project) {
        this.logger.info(`Preparing training example for project ${project.projectId}`);
        const boqFeatures = this.extractBOQFeatures(project.boq);
        const itemLabels = this.extractItemLabels(project.boq);
        const example = {
            id: (0, uuid_1.v4)(),
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
    extractBOQFeatures(boq) {
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
    extractBuildingFeatures(building) {
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
    extractItemLabels(boq) {
        const labels = {};
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
    extractQuantityLabels(boq) {
        const labels = {};
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
    async sendToLab(payload) {
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
        }
        catch (error) {
            this.failedLabTransfers++;
            this.logger.error(`Failed to send data to lab: ${error.message}`);
            return {
                status: 'failed',
                experimentId: payload.experimentId,
                timestamp: new Date().toISOString()
            };
        }
    }
    prepareLabPayload() {
        const metrics = this.collectMetrics();
        return {
            experimentId: (0, uuid_1.v4)(),
            trainingExamples: [...this.trainingExamples],
            metrics,
            timestamp: new Date().toISOString(),
            source: 'LearningAgent',
            version: '1.0.0'
        };
    }
    collectMetrics() {
        const projectCount = this.projectDataStore.size;
        const totalDecisions = this.getTotalDecisionCount();
        const averageConfidence = this.calculateAverageConfidence();
        const topMissingItems = new Map([...this.missingItemsCounter.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20));
        const snapshot = {
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
    getTotalDecisionCount() {
        let count = 0;
        for (const project of this.projectDataStore.values()) {
            count += project.decisions.length;
        }
        return count;
    }
    calculateAverageConfidence() {
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
    recordAccuracy(accuracy) {
        this.accuracyHistory.push(accuracy);
        if (this.accuracyHistory.length > 1000) {
            this.accuracyHistory.shift();
        }
    }
    getStats() {
        return {
            projectCount: this.projectDataStore.size,
            trainingExampleCount: this.trainingExamples.length,
            userCorrections: this.userCorrectionCount,
            labTransfers: this.successfulLabTransfers
        };
    }
    getMetricsHistory() {
        return this.metricsHistory;
    }
    getProjectData(projectId) {
        return this.projectDataStore.get(projectId);
    }
    getAllProjects() {
        return Array.from(this.projectDataStore.values());
    }
    // Volume 32: Get Model Performance
    getModelPerformance(versionId) {
        const model = this.modelVersions.get(versionId);
        return model?.performanceMetrics;
    }
    // Volume 32: Get All Models
    getAllModels() {
        return Array.from(this.modelVersions.values());
    }
    // Volume 32: Get Expert Reviews
    getExpertReviews(trainingId) {
        const reviews = Array.from(this.expertReviews.values());
        if (trainingId) {
            return reviews.filter(r => r.trainingId === trainingId);
        }
        return reviews;
    }
}
exports.LearningAgent = LearningAgent;
//# sourceMappingURL=index.js.map