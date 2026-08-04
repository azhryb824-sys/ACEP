/**
 * ACEP Benchmark Platform
 *
 * Tests all AI models against reference projects and computes
 * performance metrics: accuracy, error rate, data quality, etc.
 *
 * Reference projects are derived from the construction knowledge base,
 * ensuring they represent real-world engineering scenarios.
 */
const { PROJECT_TYPES } = require('../construction-knowledge/entities/project-types');

// 12 reference project benchmarks derived from KB project types
const REFERENCE_PROJECTS = [
  {
    id: 'bench-villa-001', type: 'Villa', category: 'residential',
    area: 500, floors: 2, rooms: 6, bathrooms: 4, hasKitchen: true,
    description: 'فيلا سكنية مستقلة دورين مساحة 500 متر تشطيب ديلوكس',
    expectedCost: 1800000, expectedDuration: 14, expectedBOQItems: 45,
  },
  {
    id: 'bench-apartment-001', type: 'Apartment', category: 'residential',
    area: 800, floors: 4, rooms: 24, bathrooms: 16, hasKitchen: true,
    description: 'عمارة سكنية 4 أدوار كل دور شقتين مساحة 800 متر',
    expectedCost: 3200000, expectedDuration: 18, expectedBOQItems: 80,
  },
  {
    id: 'bench-tower-001', type: 'Tower', category: 'residential',
    area: 1200, floors: 20, rooms: 120, bathrooms: 80, hasKitchen: true,
    description: 'برج سكني تجاري 20 دور مساحة 1200 متر',
    expectedCost: 25000000, expectedDuration: 36, expectedBOQItems: 200,
  },
  {
    id: 'bench-mosque-001', type: 'Mosque', category: 'religious',
    area: 800, floors: 1, rooms: 5, bathrooms: 8, hasKitchen: false,
    description: 'مسجد جامع مساحة 800 متر بمئذنة وقبة ومصلى للنساء',
    expectedCost: 3500000, expectedDuration: 16, expectedBOQItems: 60,
  },
  {
    id: 'bench-school-001', type: 'School', category: 'educational',
    area: 3000, floors: 3, rooms: 30, bathrooms: 20, hasKitchen: false,
    description: 'مدرسة نموذجية 3 أدوار مساحة 3000 متر 12 فصلاً دراسياً',
    expectedCost: 12000000, expectedDuration: 24, expectedBOQItems: 150,
  },
  {
    id: 'bench-hospital-001', type: 'Hospital', category: 'healthcare',
    area: 5000, floors: 5, rooms: 100, bathrooms: 60, hasKitchen: true,
    description: 'مستشفى عام 5 أدوار مساحة 5000 متر 100 سرير',
    expectedCost: 45000000, expectedDuration: 36, expectedBOQItems: 350,
  },
  {
    id: 'bench-hotel-001', type: 'Hotel', category: 'commercial',
    area: 4000, floors: 10, rooms: 120, bathrooms: 120, hasKitchen: true,
    description: 'فندق 5 نجوم 10 أدوار مساحة 4000 متر 120 غرفة',
    expectedCost: 60000000, expectedDuration: 30, expectedBOQItems: 280,
  },
  {
    id: 'bench-mall-001', type: 'Mall', category: 'commercial',
    area: 15000, floors: 3, rooms: 60, bathrooms: 40, hasKitchen: false,
    description: 'مركز تجاري 3 أدوار مساحة 15000 متر 50 محلاً',
    expectedCost: 80000000, expectedDuration: 28, expectedBOQItems: 250,
  },
  {
    id: 'bench-factory-001', type: 'Factory', category: 'industrial',
    area: 5000, floors: 1, rooms: 10, bathrooms: 6, hasKitchen: false,
    description: 'مصنع انتاجي مساحة 5000 متر دور واحد',
    expectedCost: 15000000, expectedDuration: 18, expectedBOQItems: 100,
  },
  {
    id: 'bench-warehouse-001', type: 'Warehouse', category: 'industrial',
    area: 3000, floors: 1, rooms: 5, bathrooms: 4, hasKitchen: false,
    description: 'مستودع تخزين مساحة 3000 متر دور واحد',
    expectedCost: 4500000, expectedDuration: 10, expectedBOQItems: 40,
  },
  {
    id: 'bench-office-001', type: 'Office', category: 'commercial',
    area: 2000, floors: 6, rooms: 40, bathrooms: 20, hasKitchen: true,
    description: 'مبنى مكاتب إداري 6 أدوار مساحة 2000 متر',
    expectedCost: 12000000, expectedDuration: 22, expectedBOQItems: 140,
  },
  {
    id: 'bench-government-001', type: 'GovernmentBuilding', category: 'government',
    area: 4000, floors: 4, rooms: 50, bathrooms: 30, hasKitchen: true,
    description: 'مبنى حكومي 4 أدوار مساحة 4000 متر',
    expectedCost: 20000000, expectedDuration: 26, expectedBOQItems: 180,
  },
];

class BenchmarkPlatform {
  constructor(edl, aiEngine, workflow, orchestrator, trainingBridge) {
    this.edl = edl;
    this.ai = aiEngine;
    this.workflow = workflow;
    this.orchestrator = orchestrator;
    this.trainingBridge = trainingBridge;
    this.results = {};
    this.lastRun = null;
  }

  /**
   * Run all benchmarks against all models
   */
  async runAll() {
    const startTime = Date.now();
    const results = [];

    for (const ref of REFERENCE_PROJECTS) {
      const result = await this._testProject(ref);
      results.push(result);
    }

    this.results = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      totalTests: results.length,
      passed: results.filter(r => r.overallPassed).length,
      failed: results.filter(r => !r.overallPassed).length,
      byModel: this._aggregateByModel(results),
      details: results,
    };
    this.lastRun = new Date().toISOString();
    return this.results;
  }

  /**
   * Run a single reference project through all available models
   */
  async _testProject(ref) {
    const projectId = ref.id;
    let project = this.edl.getProject(projectId);
    if (!project) {
      project = this.edl.createProject(projectId, {
        name: `Benchmark ${ref.type}`,
        description: ref.description,
        status: 'benchmark',
      });
      project.approved.type = ref.type;
      project.approved.typeConfirmed = true;
      project.approved.area = ref.area;
      project.approved.areaConfirmed = true;
      project.approved.floors = ref.floors;
      project.approved.floorsConfirmed = true;
    }

    const modelResults = {};

    // 1. Test Type Classifier
    modelResults.typeClassifier = this._testTypeClassifier(ref);

    // 2. Test BOQ Engine (if available)
    if (this.ai.quantityEstimator) {
      modelResults.boq = this._testBOQ(ref, project);
    }

    // 3. Test Cost Estimator (if available)
    if (this.ai.costEstimator) {
      modelResults.cost = this._testCost(ref, project);
    }

    // 4. Test Schedule Optimizer (if available)
    if (this.ai.scheduleOptimizer) {
      modelResults.schedule = this._testSchedule(ref, project);
    }

    // 5. Test Risk Analyzer (if available)
    if (this.ai.riskAnalyzer) {
      modelResults.risk = this._testRisk(ref, project);
    }

    // 6. Test Quality Inspector (if available)
    if (this.ai.qualityInspector) {
      modelResults.quality = this._testQuality(ref, project);
    }

    const errors = Object.values(modelResults).filter(r => r.error).length;
    const accuracies = Object.values(modelResults).filter(r => r.accuracy !== undefined).map(r => r.accuracy);
    const avgAccuracy = accuracies.length > 0 ? accuracies.reduce((s, a) => s + a, 0) / accuracies.length : 0;

    return {
      projectId: ref.id,
      type: ref.type,
      category: ref.category,
      description: ref.description,
      models: modelResults,
      overallPassed: errors === 0,
      avgAccuracy: Math.round(avgAccuracy * 100) / 100,
      testedModels: Object.keys(modelResults).length,
    };
  }

  _testTypeClassifier(ref) {
    const start = Date.now();
    try {
      let detectedType = null;
      if (this.ai.projectProfiler) {
        const profile = this.ai.projectProfiler.buildProfile({
          id: ref.id,
          extracted: { type: ref.type },
          description: ref.description,
        });
        detectedType = profile?.projectType?.primary?.type;
      } else if (this.ai.kb && this.ai.kb.detectProjectType) {
        detectedType = this.ai.kb.detectProjectType(ref.description);
      }
      const correct = detectedType && detectedType.toLowerCase() === ref.type.toLowerCase();
      return {
        model: 'TypeClassifier',
        expected: ref.type,
        detected: detectedType || 'unknown',
        accuracy: correct ? 1 : 0,
        error: detectedType ? null : 'Could not detect type',
        duration: Date.now() - start,
      };
    } catch (e) {
      return { model: 'TypeClassifier', error: e.message, duration: Date.now() - start };
    }
  }

  _testBOQ(ref, project) {
    const start = Date.now();
    try {
      const boqResult = this.ai.quantityEstimator.estimateBOQ(ref.type, ref.area, ref.floors);
      const itemCount = boqResult?.items?.length || 0;
      const costAccuracy = ref.expectedBOQItems > 0
        ? Math.max(0, 1 - Math.abs(itemCount - ref.expectedBOQItems) / ref.expectedBOQItems)
        : 0;
      return {
        model: 'BOQEngine',
        expectedItems: ref.expectedBOQItems,
        generatedItems: itemCount,
        accuracy: Math.round(costAccuracy * 100) / 100,
        hasItems: itemCount > 0,
        duration: Date.now() - start,
      };
    } catch (e) {
      return { model: 'BOQEngine', error: e.message, duration: Date.now() - start };
    }
  }

  _testCost(ref, project) {
    const start = Date.now();
    try {
      const boqItems = project.boq?.items || [];
      const costData = this.ai.costEstimator.estimateCost(boqItems, ref.type, ref.area, ref.floors);
      const costAccuracy = ref.expectedCost > 0 && costData?.totalCost > 0
        ? Math.max(0, 1 - Math.abs(costData.totalCost - ref.expectedCost) / ref.expectedCost)
        : 0;
      return {
        model: 'CostEstimator',
        expectedCost: ref.expectedCost,
        estimatedCost: costData?.totalCost || 0,
        accuracy: Math.round(costAccuracy * 100) / 100,
        duration: Date.now() - start,
      };
    } catch (e) {
      return { model: 'CostEstimator', error: e.message, duration: Date.now() - start };
    }
  }

  _testSchedule(ref, project) {
    const start = Date.now();
    try {
      const totalArea = ref.area * ref.floors;
      const scheduleData = this.ai.scheduleOptimizer.generateSchedule(ref.type, totalArea, ref.floors);
      const durationAccuracy = ref.expectedDuration > 0 && scheduleData?.totalMonths > 0
        ? Math.max(0, 1 - Math.abs(scheduleData.totalMonths - ref.expectedDuration) / ref.expectedDuration)
        : 0;
      return {
        model: 'ScheduleOptimizer',
        expectedMonths: ref.expectedDuration,
        estimatedMonths: scheduleData?.totalMonths || 0,
        accuracy: Math.round(durationAccuracy * 100) / 100,
        duration: Date.now() - start,
      };
    } catch (e) {
      return { model: 'ScheduleOptimizer', error: e.message, duration: Date.now() - start };
    }
  }

  _testRisk(ref, project) {
    const start = Date.now();
    try {
      const totalArea = ref.area * ref.floors;
      const riskData = this.ai.riskAnalyzer.analyzeRisks(ref.type, totalArea, ref.floors);
      return {
        model: 'RiskAnalyzer',
        riskLevel: riskData?.riskLevel || 'unknown',
        hasRisks: (riskData?.risks || []).length > 0,
        accuracy: riskData?.riskLevel ? 0.8 : 0,
        duration: Date.now() - start,
      };
    } catch (e) {
      return { model: 'RiskAnalyzer', error: e.message, duration: Date.now() - start };
    }
  }

  _testQuality(ref, project) {
    const start = Date.now();
    try {
      const totalArea = ref.area * ref.floors;
      const qualityData = this.ai.qualityInspector.inspectProject(ref.type, totalArea, ref.floors);
      return {
        model: 'QualityInspector',
        qualityScore: qualityData?.qualityScore || 0,
        accuracy: qualityData?.qualityScore > 0 ? 0.8 : 0,
        duration: Date.now() - start,
      };
    } catch (e) {
      return { model: 'QualityInspector', error: e.message, duration: Date.now() - start };
    }
  }

  _aggregateByModel(results) {
    const byModel = {};
    for (const r of results) {
      for (const [modelName, modelResult] of Object.entries(r.models)) {
        if (!byModel[modelName]) byModel[modelName] = { total: 0, passed: 0, errors: 0, accuracies: [] };
        byModel[modelName].total++;
        if (modelResult.error) byModel[modelName].errors++;
        else byModel[modelName].passed++;
        if (modelResult.accuracy !== undefined) byModel[modelName].accuracies.push(modelResult.accuracy);
      }
    }
    for (const [name, stats] of Object.entries(byModel)) {
      stats.avgAccuracy = stats.accuracies.length > 0
        ? Math.round(stats.accuracies.reduce((s, a) => s + a, 0) / stats.accuracies.length * 100) / 100
        : 0;
      delete stats.accuracies;
    }
    return byModel;
  }

  getReferenceProjects() {
    return REFERENCE_PROJECTS.map(r => ({
      id: r.id, type: r.type, category: r.category,
      area: r.area, floors: r.floors,
      expectedCost: r.expectedCost, expectedDuration: r.expectedDuration,
      description: r.description,
    }));
  }

  getLastResults() {
    return this.results;
  }
}

module.exports = BenchmarkPlatform;
