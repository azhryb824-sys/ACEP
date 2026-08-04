const { EngineeringPromptGenerator } = require('./prompt-generator');
const { PromptDatabase } = require('./prompt-database');
const { PROJECT_TYPES, CONSTRUCTION_PHASES, FINISHING_LEVELS, ARCHITECTURAL_STYLES, LIGHTING_CONDITIONS, CAMERA_ANGLES, MATERIALS, ARCHITECTURAL_FEATURES } = require('./prompt-variables');

function registerPromptRoutes(app, knowledgeBase) {
  const generator = new EngineeringPromptGenerator(knowledgeBase);
  const promptDB = new PromptDatabase();

  app.get('/api/v1/engineering-prompts/variables', (req, res) => {
    res.json({
      projectTypes: Object.keys(PROJECT_TYPES),
      projectTypeDetails: Object.fromEntries(Object.entries(PROJECT_TYPES).map(([k, v]) => [k, { name: v.name, subtypeCount: v.subtypes.length, styleCount: v.styles.length }])),
      phases: CONSTRUCTION_PHASES.map(p => ({ id: p.id, name: p.name })),
      finishingLevels: FINISHING_LEVELS.map(f => ({ id: f.id, name: f.name })),
      styles: ARCHITECTURAL_STYLES.map(s => ({ id: s.id, name: s.name })),
      lighting: LIGHTING_CONDITIONS.map(l => ({ id: l.id, name: l.name })),
      cameraAngles: CAMERA_ANGLES.map(c => ({ id: c.id, name: c.name })),
      materials: Object.fromEntries(Object.entries(MATERIALS).map(([k, v]) => [k, v.length])),
    });
  });

  app.get('/api/v1/engineering-prompts/combinations', (req, res) => {
    res.json({
      totalPossibleCombinations: generator.getTotalCombinations(),
      note: 'Estimated unique prompt combinations based on all variable permutations',
    });
  });

  app.post('/api/v1/engineering-prompts/generate', (req, res) => {
    const { count = 10, projectType, subtype, phaseId, finishing, style, area, floors, language = 'en' } = req.body || {};

    let results;
    if (projectType) {
      results = generator.generateSpecific({ projectType, subtype, phaseId, finishing, style, area, floors, count, language });
    } else {
      results = generator.generateBatch(count, language);
    }

    if (results.length === 0) {
      return res.status(429).json({ error: 'Deduplication limit reached. Reset generator or increase count.' });
    }

    const saved = promptDB.saveBatch(results);
    res.json({
      generated: results.length,
      saved: saved.length,
      prompts: results,
      totalInDB: promptDB.getStats().total,
    });
  });

  app.get('/api/v1/engineering-prompts/db/stats', (req, res) => {
    res.json(promptDB.getStats());
  });

  app.get('/api/v1/engineering-prompts/db/search', (req, res) => {
    const { q, projectType, phase, limit = 50 } = req.query;
    let results = [];

    if (q) results = promptDB.search(q);
    else if (projectType) results = promptDB.getByProjectType(projectType);
    else if (phase) results = promptDB.getByPhase(phase);
    else results = promptDB.prompts;

    res.json({
      total: results.length,
      returned: Math.min(results.length, parseInt(limit)),
      results: results.slice(0, parseInt(limit)),
    });
  });

  app.get('/api/v1/engineering-prompts/db/prompt/:id', (req, res) => {
    const prompt = promptDB.getById(req.params.id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    const images = promptDB.getImagesForPrompt(prompt.id);
    res.json({ ...prompt, linkedImages: images });
  });

  app.put('/api/v1/engineering-prompts/db/prompt/:id/link-image', (req, res) => {
    const { id } = req.params;
    const prompt = promptDB.getById(id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    promptDB.linkImage(id, req.body);
    res.json({ success: true, linked: true });
  });

  app.post('/api/v1/engineering-prompts/generate-bulk', (req, res) => {
    const { totalCount = 1000, batchSize = 100, language = 'en' } = req.body || {};
    const batches = Math.ceil(totalCount / batchSize);
    let totalGenerated = 0;

    for (let i = 0; i < batches; i++) {
      const remaining = totalCount - totalGenerated;
      const size = Math.min(batchSize, remaining);
      const batch = generator.generateBatch(size, language);
      if (batch.length > 0) {
        promptDB.saveBatch(batch);
        totalGenerated += batch.length;
      }
    }

    res.json({
      requested: totalCount,
      generated: totalGenerated,
      language,
      inDB: promptDB.getStats().total,
    });
  });

  app.post('/api/v1/engineering-prompts/export', (req, res) => {
    const { format = 'jsonl' } = req.body || {};
    let filePath;
    if (format === 'jsonl') {
      filePath = promptDB.exportToJSONL();
    } else {
      filePath = promptDB.exportToJSON();
    }
    res.json({ exported: true, path: filePath, total: promptDB.getStats().total });
  });

  app.get('/api/v1/engineering-prompts/reset', (req, res) => {
    generator.resetDeduplication();
    res.json({ success: true, message: 'Generator deduplication reset. New unique prompts can now be generated.' });
  });
}

module.exports = { registerPromptRoutes };
