const { runtimePath } = require('../../runtime/paths');

function registerUETSRoutes(app, uets) {
  if (!app || !uets) return;

  // === UETS Status ===
  app.get('/api/v1/uets/status', (req, res) => {
    res.json(uets.getStatus());
  });

  app.get('/api/v1/uets/stats', (req, res) => {
    res.json(uets.getStats());
  });

  // === EGT Operations ===
  app.get('/api/v1/uets/egt', (req, res) => {
    const { projectType, source, city, minArea, maxArea, minFloors, maxFloors, tag, limit } = req.query;
    const filters = {};
    if (projectType) filters.projectType = projectType;
    if (source) filters.source = source;
    if (city) filters.city = city;
    if (minArea) filters.minArea = parseFloat(minArea);
    if (maxArea) filters.maxArea = parseFloat(maxArea);
    if (minFloors) filters.minFloors = parseInt(minFloors);
    if (maxFloors) filters.maxFloors = parseInt(maxFloors);
    if (tag) filters.tag = tag;
    if (limit) filters.limit = parseInt(limit);
    res.json(uets.queryEGT(filters).map(e => e.toJSON()));
  });

  app.get('/api/v1/uets/egt/:uuid', (req, res) => {
    const egt = uets.getEGT(req.params.uuid);
    if (!egt) return res.status(404).json({ error: 'EGT record not found' });
    res.json(egt.toJSON());
  });

  app.post('/api/v1/uets/egt', (req, res) => {
    try {
      const egt = uets.createEGT(req.body);
      const validation = uets.validateEGT(egt);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Validation failed', validation });
      }
      uets.addEGT(egt);
      uets.save();
      res.status(201).json({ uuid: egt.uuid, validation });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/uets/egt/batch', (req, res) => {
    try {
      const items = Array.isArray(req.body) ? req.body : [req.body];
      const egts = items.map(d => uets.createEGT(d));
      const validation = uets.validateEGTBatch(egts);
      const count = uets.addEGTBatch(egts);
      uets.save();
      res.status(201).json({ added: count, validation });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/v1/uets/egt/:uuid', (req, res) => {
    const removed = uets.core.repository.remove(req.params.uuid);
    if (removed) uets.save();
    res.json({ removed });
  });

  // === Dataset Generation ===
  app.post('/api/v1/uets/generate-csv', (req, res) => {
    try {
      const egts = req.body.uuids ? req.body.uuids.map(id => uets.getEGT(id)).filter(Boolean) : uets.getAllEGT();
      const data = uets.generateCSVTrainingData(egts);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/uets/generate-jsonl', (req, res) => {
    try {
      const egts = req.body.uuids ? req.body.uuids.map(id => uets.getEGT(id)).filter(Boolean) : uets.getAllEGT();
      if (req.body.domain) {
        res.json(uets.generateJSONLTrainingData(egts, req.body.domain));
      } else {
        res.json(uets.generateJSONLForAllDomains(egts));
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/uets/generate-prompts', (req, res) => {
    try {
      const egt = uets.getEGT(req.body.uuid);
      if (!egt) return res.status(404).json({ error: 'EGT not found' });
      res.json(uets.generateImagePrompts(egt));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // === Training Management ===
  app.get('/api/v1/uets/training/status', (req, res) => {
    res.json(uets.getTrainingStats());
  });

  app.get('/api/v1/uets/training/history', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    res.json(uets.getTrainingHistory(limit));
  });

  app.post('/api/v1/uets/training/enqueue', (req, res) => {
    const { models, options } = req.body;
    if (!models) return res.status(400).json({ error: 'models required' });
    try {
      if (options && Object.keys(options).length) return res.status(400).json({ error: 'Training sources and runners are server-owned' });
      const { createSnapshot } = require('../training/snapshot');
      const job = uets.enqueueTraining(models, { snapshotId: createSnapshot(uets) });
      res.status(201).json(job);
    } catch (error) { res.status(422).json({ error: error.message }); }
  });

  app.post('/api/v1/uets/retraining/enqueue', (req, res) => {
    const { reason, options } = req.body;
    try {
      if (options && Object.keys(options).some(k=>k!=='models')) return res.status(400).json({error:'Training sources and runners are server-owned'});
      const { createSnapshot } = require('../training/snapshot');
      const job = uets.enqueueRetraining(reason || 'manual', {models:options?.models, snapshotId:createSnapshot(uets)});
      res.status(201).json(job);
    } catch(error) { res.status(422).json({error:error.message}); }
  });

  app.post('/api/v1/uets/evaluation/enqueue', (req, res) => {
    const { type, options } = req.body;
    const job = uets.enqueueEvaluation(type || 'full', options || {});
    res.status(201).json(job);
  });

  app.post('/api/v1/uets/feedback', (req, res) => {
    const entry = uets.enqueueFeedback(req.body);
    res.status(201).json(entry);
  });

  app.post('/api/v1/uets/auto-retrain/start', (req, res) => {
    const interval = req.body.intervalMs || 86400000;
    uets.startAutoRetrain(interval);
    res.json({ started: true, intervalMs: interval });
  });

  app.post('/api/v1/uets/auto-retrain/stop', (req, res) => {
    uets.stopAutoRetrain();
    res.json({ stopped: true });
  });

  // === Dataset Validation ===
  app.get('/api/v1/uets/versions', (req, res) => {
    res.json(uets.getDatasetVersions());
  });

  app.post('/api/v1/uets/versions', (req, res) => {
    const { label, description } = req.body;
    const version = uets.createDatasetVersion(label || 'Snapshot', description || '');
    res.status(201).json(version);
  });

  app.get('/api/v1/uets/versions/latest', (req, res) => {
    res.json(uets.getLatestVersion());
  });

  app.get('/api/v1/uets/versions/diff', (req, res) => {
    const { v1, v2 } = req.query;
    if (!v1 || !v2) return res.status(400).json({ error: 'v1 and v2 required' });
    res.json(uets.diffVersions(v1, v2));
  });

  app.get('/api/v1/uets/validate/integrity', (req, res) => {
    res.json(uets.checkDatasetIntegrity());
  });

  app.get('/api/v1/uets/validate/consistency', (req, res) => {
    res.json(uets.checkDatasetConsistency());
  });

  app.get('/api/v1/uets/validate/coverage', (req, res) => {
    res.json(uets.checkCoverage());
  });

  app.get('/api/v1/uets/validate/readiness', (req, res) => {
    res.json(uets.getReadinessReport());
  });

  // Cross-model consistency vs EGT ground truth (Step 5.2)
  app.post('/api/v1/uets/validate/ground-truth', (req, res) => {
    try {
      const result = uets.validateAgainstGroundTruth(req.body || {});
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Write UETS JSONL datasets for the Python training pipeline (Step 3.3)
  app.post('/api/v1/uets/jsonl/write', (req, res) => {
    try {
      const outputName = req.body?.outputName || 'current';
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(outputName)) return res.status(400).json({ error: 'Invalid outputName' });
      const outputDir = runtimePath('uets', 'exports', outputName);
      const limit = Math.min(Math.max(req.body?.limit ? parseInt(req.body.limit, 10) : 500, 1), 10000);
      const result = uets.writeJSONLToDisk(outputDir, uets.getAllEGT().slice(0, limit), req.body);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // === Migration ===
  app.post('/api/v1/uets/migrate/csv', (req, res) => {
    try {
      const CSVAdapter = require('../adapters/csv-adapter').CSVAdapter;
      const adapter = new CSVAdapter(uets.core);
      const result = adapter.migrateAllToEGT();
      uets.save();
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/uets/save', (req, res) => {
    uets.save();
    res.json({ saved: true });
  });

  console.log('[UETS] API routes registered');
}

module.exports = { registerUETSRoutes };
