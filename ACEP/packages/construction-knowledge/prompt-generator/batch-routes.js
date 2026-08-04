const { BatchPromptGenerator } = require('./batch-generator');

function registerBatchRoutes(app, knowledgeBase) {
  const batchGen = new BatchPromptGenerator(knowledgeBase, {
    batchSize: 1000,
    intervalMs: 300000,
    language: 'en',
    autoExport: false,
  });

  app.post('/api/v1/engineering-prompts/batch/start', (req, res) => {
    const { batchSize, intervalMs, language, autoExport } = req.body || {};
    if (batchSize) batchGen.configure({ batchSize });
    if (intervalMs) batchGen.configure({ intervalMs });
    if (language) batchGen.configure({ language });
    if (autoExport !== undefined) batchGen.configure({ autoExport });
    batchGen.start();
    res.json({ status: 'started', config: batchGen.getStats() });
  });

  app.post('/api/v1/engineering-prompts/batch/stop', (req, res) => {
    batchGen.stop();
    res.json({ status: 'stopped', stats: batchGen.getStats() });
  });

  app.get('/api/v1/engineering-prompts/batch/status', (req, res) => {
    res.json({
      running: batchGen.running,
      stats: batchGen.getStats(),
    });
  });

  app.post('/api/v1/engineering-prompts/batch/configure', (req, res) => {
    const { batchSize, intervalMs, language, autoExport } = req.body || {};
    batchGen.configure({ batchSize, intervalMs, language, autoExport });
    res.json({ status: 'configured', config: batchGen.getStats() });
  });
}

module.exports = { registerBatchRoutes };
