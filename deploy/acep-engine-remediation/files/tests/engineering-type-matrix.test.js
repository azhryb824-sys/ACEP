'use strict';

process.env.ACEP_MILLION_MODEL_ENABLED = 'true';
process.env.ACEP_SUPPLIER_DATA_VERIFIED = 'false';

const archetypes = require('../packages/ai-engine/model-training/project-archetypes.json');
const ai = require('../packages/ai-engine');

jest.setTimeout(30000);

describe('35-type engineering matrix', () => {
  beforeAll(async () => ai.initialize());

  test.each(archetypes.projectTypes.map(profile => [profile.key, profile]))('%s has reconciled contextual outputs', (type, profile) => {
    const grossBuiltArea = Math.sqrt(profile.area[0] * profile.area[1]);
    const floors = Math.max(1, Math.round((profile.floors[0] + profile.floors[1]) / 2));
    const footprintArea = ['building', 'industrial', 'existing', 'other'].includes(profile.family)
      ? grossBuiltArea / floors
      : grossBuiltArea;
    const defaultWidth = { linear: 24, utility: 3 }[profile.family] || null;
    const length = defaultWidth ? grossBuiltArea / defaultWidth : null;
    const input = {
      modelType: type,
      grossBuiltArea,
      footprintArea,
      landArea: footprintArea * (['linear', 'site', 'utility'].includes(profile.family) ? 1.3 : 2),
      length,
      width: defaultWidth,
      floors,
      basements: profile.family === 'building' ? 1 : 0,
      buildings: 1,
      capacity: Math.max(1, grossBuiltArea * profile.capacity),
      city: 'Riyadh',
      method: profile.family === 'existing' ? 'rehabilitation' : 'traditional'
    };
    const engineType = profile.aliases[0] || type;
    const area = footprintArea;
    const boq = ai.quantityEstimator.estimateBOQ(engineType, area, floors, 'standard', 'Riyadh', input);
    const cost = ai.costEstimator.estimateCost(boq.items, engineType, area, floors, 'standard', 'Riyadh', input);
    const schedule = ai.scheduleOptimizer.generateSchedule(engineType, grossBuiltArea, floors, 'standard', 'Riyadh', input.method, input);
    const risks = ai.riskAnalyzer.analyzeRisks(engineType, grossBuiltArea, floors, 'Riyadh', 'standard', input);
    const quality = ai.qualityInspector.inspectProject(engineType, grossBuiltArea, floors, 'standard', input);

    expect(boq.summary).toEqual(expect.objectContaining({ projectType: type, family: profile.family }));
    expect(boq.items.length).toBeGreaterThanOrEqual(7);
    expect(boq.items.every(item => item.quantity > 0 && item.unitPrice > 0 && item.totalPrice > 0)).toBe(true);
    expect(Math.abs(boq.items.reduce((sum, item) => sum + item.totalPrice, 0) - boq.summary.totalCost)).toBeLessThanOrEqual(2);
    expect(Math.abs(cost.directCost - boq.summary.totalCost)).toBeLessThanOrEqual(2);
    expect(cost.directCost + cost.indirectCost + cost.contingency + cost.profit + cost.taxes).toBe(cost.totalCost);
    expect(cost.boqReconciliation.modelVariancePercent).toBeLessThanOrEqual(1);
    expect(schedule.activities.length).toBeGreaterThanOrEqual(6);
    expect(schedule.totalDuration).toBeGreaterThanOrEqual(30);
    expect(risks.risks.length).toBeGreaterThanOrEqual(6);
    expect(quality.defects.length).toBeGreaterThanOrEqual(5);
    expect(cost).toEqual(expect.objectContaining({ contractualUse: false, suitableForProcurement: false, requiresHumanReview: true }));
  });
});
