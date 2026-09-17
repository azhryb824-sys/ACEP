'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.ACEP_MILLION_MODEL_ENABLED = 'true';
process.env.ACEP_SUPPLIER_DATA_VERIFIED = 'false';

const ai = require('../packages/ai-engine');
const { MillionProjectModel } = require('../packages/ai-engine/models/million-project-model');
const { toEngineParams } = require('../packages/ai-engine/project-brief');

const artifactPath = path.join(__dirname, '..', 'models', 'registry', 'candidates', 'acep-million-synthetic-v2.json');
const configPath = path.join(__dirname, '..', 'packages', 'ai-engine', 'model-training', 'project-archetypes.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function hospitalBrief(overrides = {}) {
  return {
    type: 'hospital', area: 58000, landArea: 42000, floors: 6, basements: 2,
    buildings: 3, capacity: 200, city: 'الرياض', finishing: 'specialized',
    delivery: 'design_build', ...overrides
  };
}

describe('million-project research candidate', () => {
  beforeAll(async () => {
    await ai.initialize();
  });

  test('loads only the exact governed million-record candidate', () => {
    const status = ai.millionProjectModel.getStatus();
    expect(status).toEqual(expect.objectContaining({
      loaded: true,
      enabled: true,
      trainingRecords: 1000000,
      holdoutRecords: 70000,
      projectTypes: 35,
      provenance: 'synthetic_engineering_prior',
      productionEnabled: false,
      integrityVerified: true,
      error: null
    }));
    expect(artifact.evaluation.allSyntheticGatesPassed).toBe(true);
    expect(artifact.evaluation.perProjectTypeFailures).toHaveLength(0);
    expect(artifact.governance.suitableForModelApproval).toBe(false);
  });

  test('rejects a candidate whose signed artifact bytes were changed', () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'acep-model-integrity-'));
    const copiedArtifact = path.join(temporary, 'candidate.json');
    fs.copyFileSync(artifactPath, copiedArtifact);
    fs.copyFileSync(`${artifactPath}.sha256`, `${copiedArtifact}.sha256`);
    fs.appendFileSync(copiedArtifact, ' ');
    const tampered = new MillionProjectModel({ configPath, artifactPath: copiedArtifact });
    expect(tampered.getStatus()).toEqual(expect.objectContaining({
      loaded: false,
      integrityVerified: false,
      error: 'artifact checksum verification failed'
    }));
    fs.rmSync(temporary, { recursive: true, force: true });
  });

  test('produces finite, type-sensitive predictions for all 35 project types', () => {
    const costs = new Set();
    for (const profile of config.projectTypes) {
      const grossBuiltArea = Math.sqrt(profile.area[0] * profile.area[1]);
      const floors = Math.max(1, Math.round((profile.floors[0] + profile.floors[1]) / 2));
      const footprintArea = ['building', 'industrial', 'existing', 'other'].includes(profile.family)
        ? grossBuiltArea / floors
        : grossBuiltArea;
      const result = ai.millionProjectModel.predict({
        projectType: profile.key,
        grossBuiltArea,
        footprintArea,
        landArea: footprintArea * 1.8,
        floors,
        basements: profile.family === 'building' ? 1 : 0,
        buildings: 1,
        city: 'جدة',
        finishing: 'standard',
        method: profile.family === 'existing' ? 'rehabilitation' : 'traditional'
      });
      expect(result.available).toBe(true);
      expect(result.inputs.city).toBe('Jeddah');
      for (const target of artifact.targets) {
        expect(Number.isFinite(result.predictions[target])).toBe(true);
        expect(result.predictions[target]).toBeGreaterThanOrEqual(0);
      }
      if (profile.blocks === 0) expect(result.predictions.blocksM2).toBe(0);
      if (profile.hvac === 0) expect(result.predictions.hvacTR).toBe(0);
      costs.add(Math.round(result.predictions.costSar));
    }
    expect(costs.size).toBeGreaterThan(30);
  });

  test('keeps the hospital gross area once and generates a clinical program', () => {
    const brief = hospitalBrief();
    const params = toEngineParams(brief);
    expect(params.grossBuiltArea).toBe(58000);
    expect(params.area).toBeCloseTo(58000 / 6, 5);

    const analysis = ai.projectAnalyzer.analyzeProject('مستشفى عام متكامل بسعة مئتي سرير', {
      ...params,
      city: brief.city,
      finishing: brief.finishing,
      method: 'traditional'
    });
    expect(analysis.totalArea).toBe(58000);
    expect(analysis.predictionSource).toBe('million_project_research_candidate');
    expect(analysis.spaces.some(space => space.type === 'PatientRoom')).toBe(true);
    expect(analysis.spaces.some(space => space.type === 'OperatingRoom')).toBe(true);
    expect(analysis.spaces.some(space => space.type === 'ICUBedBay')).toBe(true);
    expect(analysis.spaces.some(space => space.type === 'Bedroom')).toBe(false);
    expect(analysis.spaces.filter(space => space.type === 'PatientRoom')).toHaveLength(144);
  });

  test('changes detailed BOQ quantities with project scale and withholds building finishes from roads', () => {
    const large = ai.quantityEstimator.estimateBOQ('Hospital', 58000 / 6, 6, 'specialized', 'Riyadh', {
      modelType: 'hospital', grossBuiltArea: 58000, footprintArea: 58000 / 6,
      landArea: 42000, basements: 2, buildings: 3, capacity: 200, method: 'traditional'
    });
    const small = ai.quantityEstimator.estimateBOQ('Hospital', 3000, 3, 'standard', 'Riyadh', {
      modelType: 'hospital', grossBuiltArea: 9000, footprintArea: 3000,
      landArea: 8000, basements: 0, buildings: 1, capacity: 40, method: 'traditional'
    });
    const excavation = result => result.items.find(item => item.code === 'EXC-001').quantity;
    expect(excavation(large)).toBeCloseTo((58000 / 6) * 1.5, 1);
    expect(excavation(large)).toBeGreaterThan(excavation(small) * 3);
    expect(large.summary.trainedReference.quantities.concreteM3)
      .toBeGreaterThan(small.summary.trainedReference.quantities.concreteM3 * 5);

    const road = ai.quantityEstimator.estimateBOQ('Road', 120000, 1, 'standard', 'Riyadh', {
      modelType: 'road', grossBuiltArea: 120000, footprintArea: 120000,
      landArea: 140000, method: 'traditional'
    });
    expect(road.summary.status).toBe('experimental_concept_cost_plan');
    expect(road.summary.totalCost).toBeGreaterThan(0);
    expect(road.items.map(item => item.code)).toEqual(expect.arrayContaining([
      'RD-EWK-001', 'RD-SUB-001', 'RD-SBB-001', 'RD-BAS-001', 'RD-ASB-001', 'RD-ASW-001', 'RD-DRN-001'
    ]));
    expect(road.items.every(item => item.unitPrice > 0 && item.totalPrice > 0)).toBe(true);
    expect(road.items.some(item => /لياسة|دهانات جدران|بلاط داخلي/.test(item.description))).toBe(false);
  });

  test('connects the candidate to cost, schedule, risk, and quality without false certainty', () => {
    const input = {
      modelType: 'hospital', footprintArea: 58000 / 6, landArea: 42000,
      basements: 2, buildings: 3, capacity: 200, method: 'traditional', city: 'الرياض'
    };
    const cost = ai.costEstimator.estimateCost([], 'Hospital', 58000 / 6, 6, 'specialized', 'الرياض', {
      ...input, grossBuiltArea: 58000
    });
    const schedule = ai.scheduleOptimizer.generateSchedule('Hospital', 58000, 6, 'specialized', 'الرياض', input.method, input);
    const risks = ai.riskAnalyzer.analyzeRisks('Hospital', 58000, 6, 'الرياض', 'specialized', input);
    const quality = ai.qualityInspector.inspectProject('Hospital', 58000, 6, 'specialized', input);

    expect(Object.values(cost.breakdown).reduce((sum, item) => sum + item.percentage, 0)).toBe(100);
    expect(cost.status).toBe('experimental');
    expect(schedule.modelId).toBe(artifact.modelId);
    expect(schedule.totalDuration).toBeGreaterThan(500);
    expect(schedule.totalDuration).toBeLessThan(1800);
    expect(risks.risks.every(risk => risk.probability === null && risk.impact === null)).toBe(true);
    expect(risks.researchIndicator.fieldCalibrated).toBe(false);
    expect(quality.qualityScore).toBeNull();
    expect(quality.estimatedDefects).toBeNull();
    expect(quality.syntheticDefectCount).toBeGreaterThan(0);
    for (const defect of quality.defects) {
      const floor = Number((defect.typicalLocations[0].match(/Floor (\d+)/) || [])[1]);
      expect(floor).toBeLessThanOrEqual(6);
    }
    expect(quality.requiresInspectionEvidence).toBe(true);
  });

  test('fails closed instead of naming an unverified supplier', () => {
    const result = ai.supplierIntelligence.findBestSupplier('Concrete', 'Riyadh');
    expect(result.status).toBe('not_evaluated');
    expect(result.insufficientData).toBe(true);
    expect(result.topSupplier).toBeNull();
    expect(result.alternatives).toHaveLength(0);
  });
});
