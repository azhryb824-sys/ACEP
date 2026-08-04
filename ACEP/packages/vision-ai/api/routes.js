const VisionAICore = require('../core');
const BackgroundQueue = require('../queue/background-queue');
const { getLogger } = require('../logger');
const { buildUPM } = require('../engines/unified-project-model');

const LOGGER = getLogger({ service: 'VisionAI-API' });

let aiEngineRefs = null;
let edlRef = null;

function createRouter(app, engineRefs = null, engineeringDataLayer = null) {
  if (engineRefs) {
    aiEngineRefs = engineRefs;
    LOGGER.info('AI Engine references attached for UPM building');
  }
  if (engineeringDataLayer) {
    edlRef = engineeringDataLayer;
    LOGGER.info('EngineeringDataLayer attached for SSOT-based UPM building');
  }
app.use((req, res, next) => {
      if (req.path.startsWith('/vision-ai/storage/')) {
        const p = require('path');
        const storageRoot = p.resolve(p.join(__dirname, '..', 'storage'));
        const relative = req.path.replace('/vision-ai/storage/', '').replace(/\\/g, '/');
        const sanitized = p.normalize('/' + relative).replace(/^[/\\]+/, '');
        if (sanitized.includes('..') || sanitized.includes('~')) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        const fullPath = p.join(storageRoot, sanitized);
        if (fullPath.startsWith(storageRoot) && require('fs').existsSync(fullPath) && require('fs').statSync(fullPath).isFile()) {
          return res.sendFile(fullPath);
        }
        return res.status(404).json({ error: 'File not found' });
      }
      next();
    });

  app.post('/api/v1/vision-ai/project', async (req, res) => {
    try {
      const result = await VisionAICore.createProject(req.body);
      res.json({ status: 'completed', project: result });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/v1/vision-ai/generate', async (req, res) => {
    try {
      let { projectId, projectParams, options = {} } = req.body;
      if (!projectId || !projectParams) return res.status(400).json({ error: 'projectId and projectParams required' });

      if (edlRef) {
        try {
          const project = edlRef.getProject(projectId);
          if (project) {
            const upmSources = project.getUPMSources();
            const upm = buildUPM(projectId, upmSources);
            options = { ...options, upm: upm.toJSON() };
            LOGGER.info(`UPM built from EDL for project ${projectId}: ${upm.projectType.main} (${upm.verification.completeness}% complete)`);
          } else {
            throw new Error(`Project ${projectId} not found in EDL`);
          }
        } catch (upmErr) {
          LOGGER.warn(`EDL UPM failed, falling back: ${upmErr.message}`);
          try {
            const boqData = await fetchBOQData(projectId);
            const profile = await fetchProjectProfile(projectId);
            const upm = buildUPM(projectId, {
              projectParams,
              boqData,
              profile,
              description: projectParams.description || '',
            });
            options = { ...options, upm: upm.toJSON() };
            LOGGER.info(`UPM built from API fallback for project ${projectId}: ${upm.projectType.main}`);
          } catch (upmErr2) {
            LOGGER.warn(`UPM building failed, falling back to text prompt: ${upmErr2.message}`);
          }
        }
      } else if (aiEngineRefs) {
        try {
          const boqData = await fetchBOQData(projectId);
          const profile = await fetchProjectProfile(projectId);
          const upm = buildUPM(projectId, {
            projectParams,
            boqData,
            profile,
            description: projectParams.description || '',
          });
          options = { ...options, upm: upm.toJSON() };
          LOGGER.info(`UPM built for project ${projectId}: ${upm.projectType.main} (${upm.verification.completeness}% complete)`);
        } catch (upmErr) {
          LOGGER.warn(`UPM building failed, falling back to text prompt: ${upmErr.message}`);
        }
      }

      const result = await VisionAICore.generateImage(projectId, projectParams, options);
      res.json({ status: 'queued', generationId: result.generationId, jobId: result.jobId, message: result.message });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/vision-ai/interior', async (req, res) => {
    try {
      const { projectId, projectParams, roomType, options = {} } = req.body;
      if (!projectId || !projectParams || !roomType) return res.status(400).json({ error: 'projectId, projectParams, and roomType required' });
      const result = await VisionAICore.generateImage(projectId, projectParams, { ...options, roomType, phase: 'Finishes' });
      res.json({ status: 'queued', generationId: result.generationId, jobId: result.jobId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/vision-ai/exterior', async (req, res) => {
    try {
      const { projectId, projectParams, viewType, options = {} } = req.body;
      if (!projectId || !projectParams) return res.status(400).json({ error: 'projectId and projectParams required' });
      const result = await VisionAICore.generateImage(projectId, projectParams, { ...options, viewType: viewType || 'front', phase: 'Completed' });
      res.json({ status: 'queued', generationId: result.generationId, jobId: result.jobId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/vision-ai/drone', async (req, res) => {
    try {
      const { projectId, projectParams, altitude, options = {} } = req.body;
      if (!projectId || !projectParams) return res.status(400).json({ error: 'projectId and projectParams required' });
      const result = await VisionAICore.generateImage(projectId, projectParams, { ...options, altitude: altitude || 50, viewType: 'drone' });
      res.json({ status: 'queued', generationId: result.generationId, jobId: result.jobId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/vision-ai/concepts', async (req, res) => {
    try {
      const { projectId, projectParams, count = 5, options = {} } = req.body;
      if (!projectId || !projectParams) return res.status(400).json({ error: 'projectId and projectParams required' });
      const concepts = await VisionAICore.generateConcepts(projectId, projectParams, count, options);
      res.json({ status: 'completed', count: concepts.length, concepts });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/vision-ai/video', async (req, res) => {
    try {
      const { projectId, projectParams, videoType, options = {} } = req.body;
      if (!projectId || !projectParams || !videoType) return res.status(400).json({ error: 'projectId, projectParams, and videoType required' });
      const result = await VisionAICore.generateVideo(projectId, projectParams, videoType, options);
      res.json({ status: 'queued', generationId: result.generationId, jobId: result.jobId, videoType, message: result.message });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/vision-ai/before-after', async (req, res) => {
    try {
      const { projectId, projectParams, options = {} } = req.body;
      if (!projectId || !projectParams) return res.status(400).json({ error: 'projectId and projectParams required' });
      const result = await VisionAICore.generateBeforeAfter(projectId, projectParams, options);
      res.json({ status: 'completed', before: result.before, after: result.after });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/vision-ai/phase-sequence', async (req, res) => {
    try {
      const { projectId, projectParams, phases } = req.body;
      if (!projectId || !projectParams) return res.status(400).json({ error: 'projectId and projectParams required' });
      const results = await VisionAICore.generatePhaseSequence(projectId, projectParams, phases);
      res.json({ status: 'completed', phases: results });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/v1/vision-ai/status/:generationId', async (req, res) => {
    try {
      const result = await VisionAICore.getGenerationStatus(req.params.generationId);
      res.json(result);
    } catch (e) {
      res.status(404).json({ error: e.message });
    }
  });

  app.get('/api/v1/vision-ai/providers', (req, res) => {
    res.json({ providers: VisionAICore.getProviders() });
  });

  app.get('/api/v1/vision-ai/gallery/:projectId', async (req, res) => {
    try {
      const type = req.query.type || null;
      const items = await VisionAICore.getGallery(req.params.projectId, type);
      res.json({ projectId: req.params.projectId, count: items.length, items });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/vision-ai/approve', async (req, res) => {
    try {
      const { galleryId } = req.body;
      if (!galleryId) return res.status(400).json({ error: 'galleryId required' });
      const result = await VisionAICore.approveGeneration(galleryId);
      res.json({ status: 'completed', ...result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/v1/vision-ai/stats', async (req, res) => {
    try {
      const stats = await VisionAICore.getStats();
      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/v1/vision-ai/queue', (req, res) => {
    res.json(BackgroundQueue.getQueueStatus());
  });

  app.get('/api/v1/vision-ai/jobs', (req, res) => {
    res.json({ jobs: BackgroundQueue.getRecentJobs(50) });
  });

  app.get('/api/v1/vision-ai/health', (req, res) => {
    res.json({
      status: 'healthy',
      module: 'ACEP Vision AI',
      version: '1.0.0',
      initialized: VisionAICore.initialized,
      providers: VisionAICore.getProviders().length,
    });
  });

  /* ---- 3D Engine Routes ---- */
  let Server3DEngine = null;
  try {
    Server3DEngine = require('../engines/3d-engine');
    LOGGER.info('3D Engine module loaded');
  } catch (e) {
    LOGGER.warn('3D Engine module not available: ' + e.message);
  }

  app.post('/api/v1/vision-ai/3d/structure', async (req, res) => {
    try {
      if (!Server3DEngine) return res.status(503).json({ error: '3D Engine not loaded' });
      const { projectId, projectParams } = req.body;
      if (!projectId || !projectParams) return res.status(400).json({ error: 'projectId and projectParams required' });
      LOGGER.info('3D structure generation for ' + projectId);
      const result = await Server3DEngine.generateStructure(projectId, projectParams);
      res.json({ status: 'completed', ...result });
    } catch (e) {
      LOGGER.error('3D structure error: ' + e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/v1/vision-ai/3d/elements', async (req, res) => {
    try {
      if (!Server3DEngine) return res.status(503).json({ error: '3D Engine not loaded' });
      const { projectId } = req.query;
      if (!projectId) return res.status(400).json({ error: 'projectId required' });
      const data = await Server3DEngine.generateStructure(projectId, { type: req.query.type, area: parseInt(req.query.area) || 500, floors: parseInt(req.query.floors) || 2, style: req.query.style || 'Modern' });
      res.json({ status: 'completed', elements: data.elements, dimensions: data.dimensions });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/v1/vision-ai/3d/analyze', async (req, res) => {
    try {
      const { projectId, projectDescription, aiResults } = req.body;
      const analysis = {
        projectId,
        description: projectDescription || '',
        aiAnalysis: aiResults || {},
        recommendations: {
          structureType: 'Reinforced Concrete Frame',
          foundationType: 'Mat Foundation',
          floorSystem: 'Flat Slab',
          wallSystem: 'Concrete Block',
          estimatedElements: 150,
        },
      };
      res.json({ status: 'completed', analysis });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* ---- Knowledge Base Routes ---- */
  function getKB(req) { return req.app?.locals?.knowledgeBase; }

  app.get('/api/v1/knowledge/status', (req, res) => {
    const KB = getKB(req);
    if (!KB) return res.status(503).json({ error: 'Knowledge Base not loaded' });
    res.json({ status: 'ready', stats: KB.getAPI().getStats() });
  });

  app.post('/api/v1/knowledge/search', (req, res) => {
    try {
      const KB = getKB(req); if (!KB) return res.status(503).json({ error: 'Knowledge Base not loaded' });
      const { query, type, options } = req.body;
      const results = type ? KB.searchByType(query, type) : KB.smartSearch(query);
      res.json({ status: 'completed', query, total: results.total || results.length, results });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/v1/knowledge/analyze', (req, res) => {
    try {
      const KB = getKB(req); if (!KB) return res.status(503).json({ error: 'Knowledge Base not loaded' });
      const { projectData } = req.body;
      const analysis = KB.analyzeProject(projectData);
      const boq = KB.generateBOQ(projectData);
      const cost = KB.estimateCost(projectData);
      const risk = KB.analyzeRisk(projectData);
      const schedule = KB.generateSchedule(projectData);
      res.json({ status: 'completed', analysis, boq, cost, risk, schedule });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/v1/knowledge/elements', (req, res) => {
    const KB = getKB(req); if (!KB) return res.status(503).json({ error: 'Knowledge Base not loaded' });
    const { category, phase, id } = req.query;
    let elements;
    if (id) elements = [KB.getElement(id)].filter(Boolean);
    else if (category) elements = KB.getElementsByCategory(category);
    else if (phase) elements = KB.getElementsByPhase(phase);
    else elements = KB.getAPI().getElements();
    res.json({ status: 'completed', count: elements.length, elements });
  });

  app.get('/api/v1/knowledge/materials', (req, res) => {
    const KB = getKB(req); if (!KB) return res.status(503).json({ error: 'Knowledge Base not loaded' });
    const { category } = req.query;
    const materials = category ? KB.getMaterialsByCategory(category) : KB.getAPI().getMaterials();
    res.json({ status: 'completed', count: materials.length, materials });
  });

  app.get('/api/v1/knowledge/codes', (req, res) => {
    const KB = getKB(req); if (!KB) return res.status(503).json({ error: 'Knowledge Base not loaded' });
    const { category, code } = req.query;
    let codes;
    if (code) codes = [KB.getCode(code)].filter(Boolean);
    else if (category) codes = KB.getCodesByCategory(category);
    else codes = KB.getAllCodes();
    res.json({ status: 'completed', count: codes.length, codes });
  });

  app.get('/api/v1/knowledge/project-types', (req, res) => {
    const KB = getKB(req); if (!KB) return res.status(503).json({ error: 'Knowledge Base not loaded' });
    const { category } = req.query;
    const types = category ? KB.getProjectTypesByCategory(category) : KB.getAllProjectTypes();
    res.json({ status: 'completed', count: types.length, types });
  });

  app.get('/api/v1/knowledge/phases', (req, res) => {
    const KB = getKB(req); if (!KB) return res.status(503).json({ error: 'Knowledge Base not loaded' });
    const { id, before, after } = req.query;
    let phases;
    if (id) phases = [KB.getPhase(id)].filter(Boolean);
    else if (before) phases = KB.getPhasesBefore(before);
    else if (after) phases = KB.getPhasesAfter(after);
    else phases = KB.getProjectPhases();
    res.json({ status: 'completed', count: phases.length, phases });
  });

  app.get('/api/v1/knowledge/graph', (req, res) => {
    const KB = getKB(req); if (!KB) return res.status(503).json({ error: 'Knowledge Base not loaded' });
    const { node, neighbor, from, to } = req.query;
    let result;
    if (node) { result = { node: KB.getGraph().getNode(node), neighbors: KB.getGraph().getNeighbors(node) }; }
    else if (neighbor) { result = { neighbors: KB.getGraph().getNeighbors(neighbor) }; }
    else if (from && to) { result = { path: KB.getGraph().findPath(from, to) }; }
    else { result = KB.getGraph().toJSON(); }
    res.json({ status: 'completed', ...result });
  });

  app.post('/api/v1/knowledge/learn', (req, res) => {
    try {
      const KB = getKB(req); if (!KB) return res.status(503).json({ error: 'Knowledge Base not loaded' });
      const { projectData, results } = req.body;
      const record = KB.recordProject(projectData, results);
      res.json({ status: 'completed', recordId: record.projectId, learningStats: KB.getLearningStats() });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/v1/knowledge/boq', (req, res) => {
    const KB = getKB(req); if (!KB) return res.status(503).json({ error: 'Knowledge Base not loaded' });
    const { elementType, code } = req.query;
    let items;
    if (code) items = [KB.getAPI().getBOQByCode(code)].filter(Boolean);
    else if (elementType) items = KB.getAPI().getBOQByElementType(elementType);
    else items = KB.getAPI().getBOQItems();
    res.json({ status: 'completed', count: items.length, items });
  });

  app.get('/api/v1/knowledge/schedule', (req, res) => {
    const KB = getKB(req); if (!KB) return res.status(503).json({ error: 'Knowledge Base not loaded' });
    const { elementType, critical } = req.query;
    let tasks;
    if (critical) tasks = KB.getAPI().getCriticalPath();
    else if (elementType) tasks = KB.getAPI().getTasksByElementType(elementType);
    else tasks = KB.getAPI().getScheduleTasks();
    res.json({ status: 'completed', count: tasks.length, tasks });
  });

  LOGGER.info('ACEP Vision AI API routes registered');
}

async function fetchBOQData(projectId) {
  if (!aiEngineRefs || !aiEngineRefs.boqEngine) return null;
  try {
    const boq = aiEngineRefs.boqEngine.generateBOQ(projectId);
    if (!boq || !boq.items) return null;
    return {
      items: boq.items.map(i => ({
        code: i.code || '',
        name: i.name || i.description || '',
        phase: i.phase || '',
        quantity: i.quantity || 0,
        unit: i.unit || '',
        unitPrice: i.unitPrice || 0,
        totalCost: i.totalCost || i.total || 0,
        material: i.material || '',
        specification: i.specification || '',
        confidence: i.confidence || 0.5,
        isSuggested: i.isSuggested || false,
      })),
    };
  } catch (e) {
    LOGGER.warn(`Failed to fetch BOQ data for ${projectId}: ${e.message}`);
    return null;
  }
}

async function fetchProjectProfile(projectId) {
  if (!aiEngineRefs) return null;
  try {
    const profile = aiEngineRefs.projectProfiler
      ? aiEngineRefs.projectProfiler.buildProfile({ id: projectId })
      : null;
    return profile || null;
  } catch (e) {
    LOGGER.warn(`Failed to fetch project profile for ${projectId}: ${e.message}`);
    return null;
  }
}

module.exports = { createRouter };