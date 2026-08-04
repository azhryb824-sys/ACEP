const PhasesEngine = require('./phases-engine');
const MissingItemsAI = require('./missing-items-ai');
const EngineeringGraph = require('./engineering-graph');
const QuantityValidator = require('./quantity-validator');
const ConfidenceAnalyzer = require('./confidence-analyzer');
const EngineeringQA = require('./engineering-qa');
const RiskEngine = require('./risk-engine');
const SupplierAI = require('./supplier-ai');
const CriticalItemsAnalyzer = require('./critical-items-analyzer');
const CostOptimizer = require('./cost-optimizer');

class EngineeringOrchestrator {
  constructor() {
    this.phases = new PhasesEngine();
    this.missingItemsAI = new MissingItemsAI();
    this.graph = new EngineeringGraph();
    this.validator = new QuantityValidator();
    this.confidence = new ConfidenceAnalyzer();
    this.qa = new EngineeringQA();
    this.risk = new RiskEngine();
    this.supplierAI = new SupplierAI();
    this.criticalItems = new CriticalItemsAnalyzer();
    this.costOptimizer = new CostOptimizer();
  }

  runFullAnalysis(boqResult, projectParams) {
    const result = {};

    // Stage 1: Project Understanding
    result.projectUnderstanding = this._analyzeProject(projectParams);

    // Stage 2: Phase Generation
    result.phases = this.phases.getPhasesByProjectType(projectParams.type);
    result.phaseTimeline = this.phases.getPhaseTimeline(projectParams.type, projectParams.area, projectParams.floors);
    result.missingPhases = this.phases.detectMissingPhases(projectParams.type, (result.phases || []).map(p => p.id));

    // Stage 3: Build Graph from items
    if (boqResult && boqResult.items) {
      this.graph.buildGraph(boqResult.items);
      result.graph = {
        dependencies: boqResult.items.map(i => ({ code: i.code, deps: this.graph.getDependencies(i.code) })),
        missingDeps: this.graph.getMissingDependencies(boqResult.items),
        executionOrder: this.graph.getExecutionOrder(boqResult.items),
        sequenceValid: this.graph.validateSequence(boqResult.items),
        suggestedItems: this.graph.suggestAdditionalItems(boqResult.items),
      };

      // Stage 5: Missing Items Detection
      result.missingItems = this.missingItemsAI.findMissingItems(boqResult.items, projectParams.type);
      result.missingItemsReport = this.missingItemsAI.getMissingItemsReport(result.missingItems);

      // Stage 7: Quantity Validation
      result.quantityValidation = this.validator.validate(boqResult.items, projectParams);
      result.quantityReport = this.validator.getValidationReport(boqResult.items, projectParams);

      // Stage 8: Confidence Analysis
      result.confidence = this.confidence.calculateBOQConfidence(boqResult.items, projectParams);
      result.weakPoints = this.confidence.analyzeWeakPoints(boqResult.items);

      // Stage 10: Critical Items Analysis
      result.criticalItems = this.criticalItems.analyzeCriticalItems(boqResult.items, result.phases);

      // Stage 11: Cost Optimization
      result.costOptimization = this.costOptimizer.calculateOptimizations(boqResult, projectParams);

      // Stage 12: Engineering QA
      result.qa = this.qa.analyzeQA(boqResult, projectParams);
      result.qaScoreCard = this.qa.getQAScoreCard(result.qa);

      // Stage 13: Risk Analysis
      result.risks = this.risk.analyzeRisks(boqResult, result.missingItems, result.qa);
      result.riskMitigation = this.risk.getRiskMitigation(result.risks.findings);
    }

    return result;
  }

  getSupplierRecommendations(material, region) {
    const materialMap = { EXC: 'Concrete', ELC: 'Electrical', PLB: 'Plumbing', HVAC: 'HVAC', STR: 'Steel', FIN: 'Finishing' };
    const mapped = materialMap[material] || material;
    return this.supplierAI.findSuppliers(mapped, region);
  }

  compareSuppliers(ids) {
    return this.supplierAI.compareSuppliers(ids);
  }

  _analyzeProject(params) {
    const type = params.type || 'Unknown';
    const area = params.area || 0;
    const floors = params.floors || 1;
    const rooms = params.rooms || 0;
    const bathrooms = params.bathrooms || 0;
    const city = params.city || '';

    const complexity =
      area > 5000 ? 'high' : area > 1000 ? 'medium' : 'low';
    const estimatedDuration = Math.round((60 + area * 0.15 + floors * 30) / 30) * 30;

    return {
      projectType: type,
      totalArea: area * floors,
      complexity,
      estimatedDurationDays: estimatedDuration,
      estimatedDurationMonths: Math.ceil(estimatedDuration / 30),
      floors,
      rooms,
      bathrooms,
      city,
      analysisDate: new Date().toISOString(),
      // Detect project category
      category: ['Villa', 'Luxury_Villa', 'Apartment_Finishing', 'Apartment_Building', 'Residential_Tower', 'Residential_Compound'].includes(type)
        ? 'residential' : ['School', 'Hospital', 'Mosque', 'Mall'].includes(type) ? 'public' : 'commercial',
    };
  }
}

module.exports = EngineeringOrchestrator;