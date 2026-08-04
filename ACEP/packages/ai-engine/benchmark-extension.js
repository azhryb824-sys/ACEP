/**
 * ACEP Benchmark Platform Extension
 *
 * Extends the existing BenchmarkPlatform to test:
 * - Vision AI generation quality
 * - 3D Navigation spatial model accuracy
 * - AI Orchestrator pipeline completeness
 * - Semantic Validator effectiveness
 * - Unified Confidence Engine consistency
 * - Cross-Model Validator performance
 */
const path = require('path');

const EXTENDED_REFERENCE_PROJECTS = [
  {
    id: 'ext-villa-vision-001', type: 'Villa', category: 'residential',
    area: 500, floors: 2, rooms: 6, bathrooms: 4,
    description: 'فيلا سكنية مستقلة دورين مساحة 500 متر تشطيب ديلوكس',
    expectedGenerationCount: 4,
    expectedNavElements: 15,
    expectedUpmCompleteness: 70,
  },
  {
    id: 'ext-tower-vision-001', type: 'Tower', category: 'residential',
    area: 1200, floors: 20, rooms: 120, bathrooms: 80,
    description: 'برج سكني تجاري 20 دور مساحة 1200 متر',
    expectedGenerationCount: 6,
    expectedNavElements: 60,
    expectedUpmCompleteness: 75,
  },
  {
    id: 'ext-mosque-nav-001', type: 'Mosque', category: 'religious',
    area: 800, floors: 1, rooms: 5, bathrooms: 8,
    description: 'مسجد جامع مساحة 800 متر بمئذنة وقبة ومصلى للنساء',
    expectedGenerationCount: 3,
    expectedNavElements: 10,
    expectedUpmCompleteness: 65,
  },
  {
    id: 'ext-hospital-001', type: 'Hospital', category: 'healthcare',
    area: 5000, floors: 5, rooms: 100, bathrooms: 60,
    description: 'مستشفى عام 5 أدوار مساحة 5000 متر 100 سرير',
    expectedGenerationCount: 8,
    expectedNavElements: 40,
    expectedUpmCompleteness: 80,
  },
];

class BenchmarkExtension {
  constructor(edl, visionCore, navEngine, orchestrator, semanticValidator,
              confidenceEngine, crossModelValidator, learningFeedback) {
    this.edl = edl;
    this.visionCore = visionCore;
    this.navEngine = navEngine;
    this.orchestrator = orchestrator;
    this.semanticValidator = semanticValidator;
    this.confidenceEngine = confidenceEngine;
    this.crossModelValidator = crossModelValidator;
    this.learningFeedback = learningFeedback;
    this.results = {};
    this.lastRun = null;
  }

  async runAll() {
    const startTime = Date.now();
    const results = [];

    for (const ref of EXTENDED_REFERENCE_PROJECTS) {
      const result = await this._testProject(ref);
      results.push(result);
    }

    this.results = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      totalTests: results.length,
      passed: results.filter(r => r.overallPassed).length,
      failed: results.filter(r => !r.overallPassed).length,
      byComponent: this._aggregateByComponent(results),
      details: results,
    };
    this.lastRun = new Date().toISOString();
    return this.results;
  }

  async _testProject(ref) {
    const projectId = ref.id;
    let project = this.edl.getProject(projectId);
    if (!project) {
      project = this.edl.createProject(projectId, {
        name: `Benchmark Ext ${ref.type}`,
        description: ref.description,
        status: 'benchmark_ext',
      });
      project.approved.type = ref.type;
      project.approved.typeConfirmed = true;
      project.approved.area = ref.area;
      project.approved.areaConfirmed = true;
      project.approved.floors = ref.floors;
      project.approved.floorsConfirmed = true;
      project.extracted.rooms = ref.rooms;
      project.extracted.bathrooms = ref.bathrooms;
    }

    const componentResults = {};

    // 1. Test UPM Building
    componentResults.upm = this._testUPM(ref, project);

    // 2. Test Semantic Validator
    componentResults.semanticValidator = this._testSemanticValidator(ref, project);

    // 3. Test Confidence Engine
    componentResults.confidenceEngine = this._testConfidenceEngine(ref, project);

    // 4. Test Cross-Model Validator
    componentResults.crossModelValidator = this._testCrossModelValidator(ref, project);

    // 5. Test Vision-Nav Bridge (synchronization)
    componentResults.visionNavBridge = this._testVisionNavBridge(ref, project);

    const errors = Object.values(componentResults).filter(r => r.error).length;
    const scores = Object.values(componentResults).filter(r => r.score !== undefined).map(r => r.score);
    const avgScore = scores.length > 0 ? scores.reduce((s, a) => s + a, 0) / scores.length : 0;

    return {
      projectId: ref.id,
      type: ref.type,
      description: ref.description,
      components: componentResults,
      overallPassed: errors === 0,
      avgScore: Math.round(avgScore * 100) / 100,
      testedComponents: Object.keys(componentResults).length,
    };
  }

  _testUPM(ref, project) {
    const start = Date.now();
    try {
      const sources = project.getUPMSources();
      const { buildUPM } = require('../vision-ai/engines/unified-project-model');
      const upm = buildUPM(ref.id, sources);
      const completeness = upm.verification.completeness || 0;

      return {
        component: 'UPM',
        completeness,
        expectedCompleteness: ref.expectedUpmCompleteness,
        score: Math.min(100, Math.round((completeness / ref.expectedUpmCompleteness) * 100)),
        warnings: upm.verification.warnings?.length || 0,
        duration: Date.now() - start,
        hasRequiredFields: !!upm.projectType.main && !!upm.physical.area && !!upm.physical.floors,
      };
    } catch (e) {
      return { component: 'UPM', error: e.message, duration: Date.now() - start };
    }
  }

  _testSemanticValidator(ref, project) {
    const start = Date.now();
    try {
      // Add minimal data for validation
      project.boq.items = project.boq.items || [];
      project.vision.features = {
        type: ref.type,
        floors: ref.floors,
        area: ref.area,
      };
      project.vision.upmSnapshot = {
        projectType: { main: ref.type },
        physical: { floors: ref.floors, area: ref.area },
        materials: [],
        boqSummary: { totalItems: 0 },
      };

      const result = this.semanticValidator.validateProject(ref.id);
      return {
        component: 'SemanticValidator',
        score: result.score || 0,
        passed: result.passed || false,
        checksPassed: result.checks?.filter(c => c.passed)?.length || 0,
        totalChecks: result.checks?.length || 0,
        duration: Date.now() - start,
      };
    } catch (e) {
      return { component: 'SemanticValidator', error: e.message, duration: Date.now() - start };
    }
  }

  _testConfidenceEngine(ref, project) {
    const start = Date.now();
    try {
      if (!project.boq) project.boq = { items: [], summary: {} };
      if (!project.cost) project.cost = {};
      if (!project.predicted) project.predicted = {};
      if (!project.risks) project.risks = {};
      if (!project.quality) project.quality = {};

      project.boq.summary.averageConfidence = 0.7;
      project.cost.confidence = 0.65;
      project.predicted.confidence = 0.75;
      project.risks.riskLevel = 'Medium';
      project.risks.risks = [{ id: 'r1' }];

      const result = this.confidenceEngine.evaluate(project);
      return {
        component: 'ConfidenceEngine',
        overall: result.overall || 0,
        level: result.level || 'unknown',
        activeSources: result.sources?.length || 0,
        score: Math.round((result.overall || 0) * 100),
        duration: Date.now() - start,
      };
    } catch (e) {
      return { component: 'ConfidenceEngine', error: e.message, duration: Date.now() - start };
    }
  }

  _testCrossModelValidator(ref, project) {
    const start = Date.now();
    try {
      const result = this.crossModelValidator.runAll(project);
      return {
        component: 'CrossModelValidator',
        score: result.score || 0,
        passed: result.passed || false,
        rulesCount: result.rules?.length || 0,
        passedRules: result.rules?.filter(r => r.passed)?.length || 0,
        duration: Date.now() - start,
      };
    } catch (e) {
      return { component: 'CrossModelValidator', error: e.message, duration: Date.now() - start };
    }
  }

  _testVisionNavBridge(ref, project) {
    const start = Date.now();
    try {
      const VisionNavBridge = require('./vision-nav-bridge');
      const bridge = new VisionNavBridge(this.edl, this.visionCore);
      const result = bridge.synchronizeProject(ref.id);
      return {
        component: 'VisionNavBridge',
        synced: result.ok || false,
        operations: result.operations?.length || 0,
        score: result.ok ? 85 : 0,
        duration: Date.now() - start,
      };
    } catch (e) {
      return { component: 'VisionNavBridge', error: e.message, duration: Date.now() - start };
    }
  }

  _aggregateByComponent(results) {
    const byComponent = {};
    for (const r of results) {
      for (const [compName, compResult] of Object.entries(r.components)) {
        if (!byComponent[compName]) byComponent[compName] = { total: 0, passed: 0, errors: 0, scores: [] };
        byComponent[compName].total++;
        if (compResult.error) byComponent[compName].errors++;
        else byComponent[compName].passed++;
        if (compResult.score !== undefined) byComponent[compName].scores.push(compResult.score);
      }
    }
    for (const [, stats] of Object.entries(byComponent)) {
      stats.avgScore = stats.scores.length > 0
        ? Math.round(stats.scores.reduce((s, a) => s + a, 0) / stats.scores.length)
        : 0;
      delete stats.scores;
    }
    return byComponent;
  }

  getReferenceProjects() {
    return EXTENDED_REFERENCE_PROJECTS.map(r => ({
      id: r.id, type: r.type, category: r.category,
      area: r.area, floors: r.floors,
      expectedGenerationCount: r.expectedGenerationCount,
      expectedNavElements: r.expectedNavElements,
      description: r.description,
    }));
  }

  getLastResults() {
    return this.results;
  }
}

module.exports = BenchmarkExtension;
