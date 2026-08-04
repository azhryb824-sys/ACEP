const db = require('./database');
const imageRecords = require('./image-record');
const qa = require('./quality-assessment');
const dups = require('./duplicate-detection');
const splitter = require('./dataset-splitter');
const balancer = require('./dataset-balancer');
const statsDash = require('./stats-dashboard');
const AutoClassifier = require('./auto-classifier');
const versions = require('./version-manager');
const cert = require('./certification');
const readiness = require('./readiness-report');
const background = require('./background-processor');
const { EXPORTERS } = require('./exporters');
const integration = require('./integration');
const path = require('path');
const fs = require('fs');

function registerTrainingPlatformRoutes(app, knowledgeBase) {
  const classifier = new AutoClassifier(knowledgeBase);

  // Images CRUD
  app.post('/api/v1/training-platform/images', async (req, res) => {
    try { const id = await imageRecords.createImageRecord(req.body); res.json({ id, status: 'created' }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/api/v1/training-platform/images', async (req, res) => {
    try {
      const { limit = 50, offset = 0, project_type, phase, q, certification_status, split_type, quality_min } = req.query;
      const result = await imageRecords.searchImages({ project_type, phase, q, certification_status, split_type, quality_min: quality_min ? parseFloat(quality_min) : undefined }, parseInt(limit), parseInt(offset));
      res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/api/v1/training-platform/images/:id', async (req, res) => {
    try { const img = await imageRecords.getImageRecord(req.params.id); if (!img) return res.status(404).json({ error: 'Image not found' }); res.json(img); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.put('/api/v1/training-platform/images/:id', async (req, res) => {
    try { await imageRecords.updateImageRecord(req.params.id, req.body); const updated = await imageRecords.getImageRecord(req.params.id); res.json(updated); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Quality Assessment
  app.post('/api/v1/training-platform/images/:id/assess', async (req, res) => {
    try { const img = await imageRecords.getImageRecord(req.params.id); if (!img) return res.status(404).json({ error: 'Image not found' }); const result = await qa.assessImage(img); res.json(result); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Duplicate Detection
  app.post('/api/v1/training-platform/images/:id/detect-duplicates', async (req, res) => {
    try { const img = await imageRecords.getImageRecord(req.params.id); if (!img) return res.status(404).json({ error: 'Image not found' }); const result = await dups.detectAll(img); res.json(result); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Certification
  app.post('/api/v1/training-platform/images/:id/certify', async (req, res) => {
    try { const img = await imageRecords.getImageRecord(req.params.id); if (!img) return res.status(404).json({ error: 'Image not found' }); const result = await cert.certifyImage(img); res.json(result); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Auto-Classification
  app.post('/api/v1/training-platform/images/:id/classify', async (req, res) => {
    try { const img = await imageRecords.getImageRecord(req.params.id); if (!img) return res.status(404).json({ error: 'Image not found' }); const result = await classifier.classifyImage(img); res.json(result); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Capture generated image
  app.post('/api/v1/training-platform/capture', async (req, res) => {
    try { const { generationResult, projectParams } = req.body; const result = await integration.captureGeneratedImage(generationResult, projectParams); res.json(result); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Import images
  app.post('/api/v1/training-platform/import', async (req, res) => {
    try {
      const { images, projectData } = req.body;
      if (!images || !Array.isArray(images)) return res.status(400).json({ error: 'images array required' });
      const results = []; for (const img of images) { const id = await integration.captureImportedImage(img, projectData); results.push(id); }
      res.json({ imported: results.length, ids: results });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Stats
  app.get('/api/v1/training-platform/stats', async (req, res) => {
    try { const stats = await statsDash.getAllStats(); res.json(stats); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/api/v1/training-platform/stats/timeseries', async (req, res) => {
    try { const data = await statsDash.getTimeSeries(parseInt(req.query.days) || 30); res.json(data); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Version Management
  app.post('/api/v1/training-platform/versions', async (req, res) => {
    try { const { description, creator, notes } = req.body || {}; const version = await versions.createVersion(description, creator, notes); res.json(version); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/api/v1/training-platform/versions', async (req, res) => {
    try { const list = await versions.listVersions(); res.json(list); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.post('/api/v1/training-platform/versions/:id/publish', async (req, res) => {
    try { const result = await versions.publishVersion(req.params.id); res.json(result); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Dataset Split
  app.post('/api/v1/training-platform/split', async (req, res) => {
    try {
      const { versionId, ratios } = req.body || {};
      if (!versionId) return res.status(400).json({ error: 'versionId required' });
      const result = await splitter.split(versionId, ratios || { train: 0.7, validation: 0.15, test: 0.15 }, req.body.options);
      res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Balance Analysis
  app.post('/api/v1/training-platform/balance', async (req, res) => {
    try { const { versionId } = req.body || {}; const result = await balancer.analyze(versionId); res.json(result); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/api/v1/training-platform/balance/:versionId', async (req, res) => {
    try { const result = await balancer.getLatestAnalysis(req.params.versionId); if (!result) return res.status(404).json({ error: 'No analysis found' }); res.json(result); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Readiness Report
  app.post('/api/v1/training-platform/readiness', async (req, res) => {
    try { const { versionId } = req.body || {}; const report = await readiness.generate(versionId); res.json(report); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/api/v1/training-platform/readiness/:versionId', async (req, res) => {
    try { const report = await readiness.getLatest(req.params.versionId); if (!report) return res.status(404).json({ error: 'No report found' }); res.json(report); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Export
  app.post('/api/v1/training-platform/export', async (req, res) => {
    try {
      const { format = 'json', filters = {} } = req.body || {};
      const exporter = EXPORTERS[format];
      if (!exporter) return res.status(400).json({ error: 'Unsupported format: ' + format + '. Supported: ' + Object.keys(EXPORTERS).join(', ') });
      const outputDir = path.join(__dirname, 'data', 'exports');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      const result = await exporter.export(filters, outputDir);
      res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // Background Processing
  app.post('/api/v1/training-platform/batch/process', async (req, res) => {
    try { const { limit = 100 } = req.body || {}; background.enqueueBatch(limit); res.json({ status: 'queued', limit, queueStatus: background.getStatus() }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.post('/api/v1/training-platform/batch/classify', async (req, res) => {
    try { const { limit = 50 } = req.body || {}; background.enqueueClassification(limit); res.json({ status: 'queued', limit, queueStatus: background.getStatus() }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/api/v1/training-platform/batch/status', (req, res) => { res.json(background.getStatus()); });

  app.get('/api/v1/training-platform/duplicates/stats', async (req, res) => {
    try { const stats = await dups.getDuplicateStats(); res.json(stats); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/api/v1/training-platform/project-types', async (req, res) => {
    try { const types = await imageRecords.getProjectTypes(); res.json(types); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/api/v1/training-platform/phases', async (req, res) => {
    try { const phases = await imageRecords.getPhases(); res.json(phases); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.post('/api/v1/training-platform/certify/batch', async (req, res) => {
    try { const { limit = 100 } = req.body || {}; const result = await cert.batchCertify(limit); res.json(result); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
}

module.exports = { registerTrainingPlatformRoutes };
