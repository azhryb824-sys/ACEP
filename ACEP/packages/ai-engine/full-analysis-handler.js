const { randomUUID } = require('node:crypto');
const { normalizeGeometry } = require('./engineering-ke/project-geometry');

// Adapt the existing workflow output to the full-analysis UI contract.
// Never substitute demonstration prices, schedules, cities or approval scores.
module.exports = function createFullAnalysisHandler({ store, edl, workflow, validator, parseDescription }) {
  return async function fullAnalysis(req, res) {
    let project;
    try {
      const { description, projectId } = req.body || {};
      if (description != null && typeof description !== 'string') {
        return res.status(400).json({ error: 'description must be a string' });
      }
      const saved = projectId ? await store.findProject(projectId) : null;
      if (projectId && !saved) return res.status(404).json({ error: 'project_not_found' });
      const text = (description || saved?.description || '').trim();
      if (!text) return res.status(400).json({ error: 'description is required' });
      // Use an isolated analysis record so failed runs cannot reuse stale costs.
      const analysisId = 'analysis-' + randomUUID();
      project = edl.createProject(analysisId, { description: text });
      // Use explicit saved dimensions only where the new description is silent.
      // Normalize a saved total-built-up area before feeding the per-floor workflow.
      const savedGeometry = saved ? normalizeGeometry({ area: saved.area ?? null, floors: saved.floors ?? null, areaBasis: saved.areaBasis }) : null;
      const extract = value => {
        const parsed = parseDescription(value);
        return { ...parsed, type: parsed.type || saved?.type || null,
          area: parsed.area ?? savedGeometry?.params.area ?? null,
          floors: parsed.floors ?? savedGeometry?.params.floors ?? null,
          city: parsed.city ?? saved?.region ?? null };
      };
      if (saved?.pricing) project.metadata.costPricing = saved.pricing;
      const result = await workflow.runFullPipeline(project, text, extract);
      if (!result.ok) {
        edl.deleteProject(analysisId);
        return res.status(422).json({
          error: 'insufficient_information',
          message: result.error?.message || 'المعلومات غير كافية للتحليل',
          missing: result.error?.missing || [],
          workflow: result.steps || []
        });
      }
      const ext = project.extracted;
      const cost = project.cost;
      const schedule = project.schedule;
      const validation = validator.validate(project);
      return res.json({
        projectId: projectId || analysisId,
        analysisId,
        facts: { projectType: { value: ext.type, confidence: ext.typeConfidence },
          floors: ext.floors, region: ext.city ?? null, spaces: project.building.spaces },
        extracted: ext,
        building: project.building,
        boq: project.boq,
        cost: { ...cost, currency: 'SAR', totalDirectCost: cost.directCost,
          totalIndirectCost: cost.indirectCost, riskContingency: cost.contingency,
          source: 'workflow:costEstimator' },
        schedule: { ...schedule, source: 'workflow:scheduleOptimizer' },
        risks: project.risks,
        quality: project.quality,
        workflow: result.steps,
        validation,
        digitalProfile: project.digitalProfile,
        traceability: project.trace,
        descriptions: { raw: text },
        scope: 'preliminary_estimate',
        engineeringDeploymentAllowed: false
      });
    } catch (error) {
      if (project) edl.deleteProject(project.id);
      return res.status(500).json({ error: 'analysis_failed',
        message: 'تعذر إكمال التحليل؛ لم يتم إصدار نتائج بديلة.' });
    }
  };
};
