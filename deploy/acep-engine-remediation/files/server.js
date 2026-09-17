const { releaseIdentity } = require('./packages/runtime/release-identity');
const express = require('express');
const path = require('path');
const fs = require('fs');
const packageMetadata = require('./package.json');
const { createSecurityLayer } = require('./packages/security');
const validation = require('./packages/security/validation');
const {
  ENGINE_LABELS,
  resolveProjectType,
  buildCanonicalDescription,
  toEngineParams,
  inputCompleteness,
  engineRequirements
} = require('./packages/ai-engine/project-brief');
const { sustainabilityPercentage } = require('./packages/ai-engine/engineering-input-guards');
const { TenantRegistry } = require('./packages/runtime/tenant-registry');
const { runtimePath } = require('./packages/runtime/paths');
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const APP_VERSION = packageMetadata.version;
const legacyUiEnabled = process.env.NODE_ENV !== 'production' && process.env.ACEP_ENABLE_LEGACY_UI !== 'false';
const serviceMode = process.env.ACEP_SERVICE_MODE || (process.env.NODE_ENV === 'production' ? 'governance' : 'engineering');
if (!['governance', 'engineering'].includes(serviceMode)) throw new Error('ACEP_SERVICE_MODE must be governance or engineering');
const tenantRegistry = new TenantRegistry();
const security = createSecurityLayer();
const requestedBodyLimit = Number(process.env.ACEP_MAX_BODY_BYTES) || 10 * 1024 * 1024;
const bodyLimit = Math.min(Math.max(requestedBodyLimit, 64 * 1024), 25 * 1024 * 1024);

app.disable('x-powered-by');
if (process.env.ACEP_TRUST_PROXY === 'true') app.set('trust proxy', 1);
app.use(security.requestContext);
app.use(security.cors);
// Reject abusive or unauthenticated API traffic before allocating memory to
// parse request bodies. Authorization remains after parsing because tenant
// project identifiers can be carried in the JSON body.
app.use(security.applyRateLimit);
app.use(security.authenticate);
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
app.use(security.handleParserError);
app.use(security.validateBody);
app.use(security.authorize);
app.use(security.gateEngineeringExecution);

if (legacyUiEnabled) {
  app.use(express.static(path.join(__dirname, 'packages', 'ui', 'web')));
  app.use('/3d-nav', express.static(path.join(__dirname, 'packages', '3d-navigation')));
  app.use('/vision-ai', express.static(path.join(__dirname, 'packages', 'vision-ai', 'frontend')));
}

app.get('/api/v1/auth/config', security.authConfig);
app.get('/metrics', security.metricsHandler);

const ai = require('./packages/ai-engine/index');
const { EngineeringDataLayer } = require('./packages/ai-engine/engineering-data-layer');
const WorkflowEngine = require('./packages/ai-engine/workflow-engine');
const ValidationEngine = require('./packages/ai-engine/validation-engine');
const AIOrchestrator = require('./packages/ai-engine/ai-orchestrator');
const ACEPConstants = require('./packages/ai-engine/shared-constants');
const TrainingDataBridge = require('./packages/ai-engine/training-data-bridge');
const BenchmarkPlatform = require('./packages/ai-engine/benchmark');
const BenchmarkExtension = require('./packages/ai-engine/benchmark-extension');
const SemanticValidator = require('./packages/ai-engine/semantic-validator');
const VisionNavBridge = require('./packages/ai-engine/vision-nav-bridge');
const BOQAuditor = require('./packages/ai-engine/boq-auditor');
const LearningFeedbackEngine = require('./packages/ai-engine/learning-feedback-engine');
const UnifiedConfidenceEngine = require('./packages/ai-engine/unified-confidence-engine');
const CrossModelValidator = require('./packages/ai-engine/cross-model-validator');
const DigitalTwin = require('./packages/ai-engine/digital-twin');
const performanceLayer = require('./packages/ai-engine/performance-layer');
const EngineeringDecisionEngine = require('./packages/ai-engine/engineering-decision-engine');
const DecisionGraph = require('./packages/ai-engine/decision-graph');
const ExplainableAI = require('./packages/ai-engine/explainable-ai');
const ConsistencyScorer = require('./packages/ai-engine/consistency-scorer');
const DependencyEngine = require('./packages/ai-engine/dependency-engine');
const AutomaticRecalculation = require('./packages/ai-engine/automatic-recalculation');
const EngineeringMemory = require('./packages/ai-engine/engineering-memory');
const AISelfReview = require('./packages/ai-engine/ai-self-review');
const RecommendationEngine = require('./packages/ai-engine/recommendation-engine');
const MaturityMetrics = require('./packages/ai-engine/maturity-metrics');
const FinalReport = require('./packages/ai-engine/final-report');
const BOQEngine = require('./packages/ai-engine/engineering-ke/boq-engine');
const PriceLearner = require('./packages/ai-engine/engineering-ke/price-learner');
const EngineeringOrchestrator = require('./packages/ai-engine/engineering-ke/engineering-orchestrator');
const AIProjectVisualizer = require('./packages/ai-engine/project-visualizer/ai-project-visualizer');
const ConstructionSimulationEngine = require('./packages/ai-engine/construction-simulation/construction-simulation-engine');
const { ConstructionKnowledgeBase } = require('./packages/construction-knowledge');
const ACEPKnowledgeBase = new ConstructionKnowledgeBase().initialize();

// Initialize V2 Knowledge Base expansion at startup
(async () => {
  try {
    const v2 = ACEPKnowledgeBase.initializeV2();
    const v2Summary = ACEPKnowledgeBase.getV2Summary();
    console.log(`[ACEP] KB V2 loaded: ${v2Summary.elements.count} elements, ${v2Summary.boqItems.count} BOQ items, ${v2Summary.materials.count} materials, ${v2Summary.codes.count} codes`);
  } catch (e) {
    console.warn('[ACEP] KB V2 initialization deferred:', e.message);
  }
})();

// Engineering Prompt Generator
const { registerPromptRoutes, registerBatchRoutes, PromptVisionBridge } = require('./packages/construction-knowledge/prompt-generator');
registerPromptRoutes(app, ACEPKnowledgeBase);
registerBatchRoutes(app, ACEPKnowledgeBase);
const promptBridge = new PromptVisionBridge(ACEPKnowledgeBase).initialize();
app.get('/engineering-prompts-admin', (req, res) => {
  if (!legacyUiEnabled) return res.status(404).json({ error: 'legacy_ui_disabled' });
  const adminPageDir = path.resolve(__dirname, 'packages', 'construction-knowledge', 'prompt-generator');
  res.sendFile('admin-page.html', { root: adminPageDir }, err => {
    if (err) { console.error('[AdminPage] Error:', err.message); res.status(500).json({ error: err.message }); }
  });
});
console.log('[ACEP] Engineering Prompt Generator ready');

// ─── Training Data Platform ──
const { registerTrainingPlatformRoutes } = require('./packages/training-platform');
const trainingDB = require('./packages/training-platform/database');
trainingDB.initialize();
registerTrainingPlatformRoutes(app, ACEPKnowledgeBase);
const trainingIntegration = require('./packages/training-platform/integration');

// Training Platform Admin Dashboard
app.get('/training-admin', (req, res) => {
  if (!legacyUiEnabled) return res.status(404).json({ error: 'legacy_ui_disabled' });
  const adminDir = path.resolve(__dirname, 'packages', 'training-platform');
  res.sendFile('admin.html', { root: adminDir }, err => {
    if (err) { console.error('[TrainingAdmin] Error:', err.message); res.status(500).json({ error: err.message }); }
  });
});
console.log('[ACEP] Training Data Platform ready');

// ─── Chain Analysis Pipeline (runs all models in sequence) ──
app.post('/api/v1/chain/analyze', async (req, res) => {
  const { projectId } = req.body || {};
  if (!projectId) return res.status(400).json({ error: 'projectId required' });
  const results = {};
  const steps = [];
  const callInternal = async (endpoint, init = {}) => {
    const response = await fetch(`http://127.0.0.1:${PORT}${endpoint}`, {
      ...init,
      headers: { ...security.internalHeaders(req), ...(init.headers || {}) }
    });
    let payload;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) {
      const error = new Error(payload?.message || payload?.error || `Internal request failed with HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  };
  try {
    // 1. Full Analysis
    steps.push({ step: 1, name: 'تحليل المشروع', status: 'running' });
    const analysis = await callInternal('/api/v1/full-analysis', {
      method: 'POST',
      body: JSON.stringify({ projectId })
    });
    results.analysis = analysis;
    steps[steps.length - 1].status = 'done';

    // 2. BOQ Generation
    steps.push({ step: 2, name: 'إنشاء BOQ', status: 'running' });
    const boq = await callInternal(`/api/v1/projects/${projectId}/boq/generate`, { method: 'POST' });
    results.boq = boq;
    steps[steps.length - 1].status = 'done';

    // 3. Cost Estimate
    steps.push({ step: 3, name: 'تقدير التكلفة', status: 'running' });
    const cost = await callInternal(`/api/v1/projects/${projectId}/cost/estimate`, { method: 'POST' });
    results.cost = cost;
    steps[steps.length - 1].status = 'done';

    // 4. Schedule
    steps.push({ step: 4, name: 'الجدول الزمني', status: 'running' });
    const schedule = await callInternal(`/api/v1/projects/${projectId}/schedule/generate`, { method: 'POST' });
    results.schedule = schedule;
    steps[steps.length - 1].status = 'done';

    // 5. Risks
    steps.push({ step: 5, name: 'تحليل المخاطر', status: 'running' });
    const risks = await callInternal(`/api/v1/projects/${projectId}/risks/analyze`, { method: 'POST' });
    results.risks = risks;
    steps[steps.length - 1].status = 'done';

    // 6. Quality
    steps.push({ step: 6, name: 'فحص الجودة', status: 'running' });
    const quality = await callInternal(`/api/v1/projects/${projectId}/quality/inspect`, { method: 'POST' });
    results.quality = quality;
    steps[steps.length - 1].status = 'done';

    // 7. Save to Knowledge Base
    steps.push({ step: 7, name: 'حفظ في قاعدة المعرفة', status: 'running' });
    await callInternal('/api/v1/knowledge-base/record-project', {
      method: 'POST', body: JSON.stringify({ projectId })
    });
    steps[steps.length - 1].status = 'done';

    res.json({ projectId, status: 'complete', steps, results });
  } catch (e) {
    const running = steps.find(step => step.status === 'running');
    if (running) { running.status = 'error'; running.error = e.message; }
    res.status(502).json({ projectId, status: 'error', steps, results, error: 'chain_step_failed', message: e.message });
  }
});

const edl = new EngineeringDataLayer();
const EDL_STATE_PATH = runtimePath('core', 'edl-state.json');
const edlLoaded = edl.load(EDL_STATE_PATH);
if (edlLoaded > 0) console.log(`[EDL] Loaded ${edlLoaded} persisted projects from runtime storage`);

const workflow = new WorkflowEngine(ai, edl);
const validator = new ValidationEngine(edl);
const boqEngine = new BOQEngine();
const engineeringOrchestrator = new EngineeringOrchestrator();
const projectVisualizer = new AIProjectVisualizer();
const constructionSimulation = new ConstructionSimulationEngine();
let orchestrator = null; // Will be initialized after VisionAICore is loaded

// Make boqEngine and KB available to route handlers
app.locals.boqEngine = boqEngine;
app.locals.knowledgeBase = ACEPKnowledgeBase;

let aiReady = false;
if (serviceMode === 'engineering') {
  ai.initialize().then(r => {
    aiReady = true;
    console.log(`[ACEP] Development AI engine loaded: ${r.totalRecords} synthetic/legacy records across ${r.models} models; not approved for production engineering use`);
  }).catch(e => console.error('[ACEP] AI init blocked:', e.message));
} else {
  console.log('[ACEP] Governance service mode: bundled synthetic model training is disabled');
}
security.setAiReadyResolver(() => aiReady);

const store = require('./data/store');
let projects = store.getProjects();
security.setProjectTenantResolver(projectId => tenantRegistry.getTenant(projectId) || store.findProject(projectId)?.tenantId || null);

function canAccessProject(project, auth) {
  if (!project || !auth) return false;
  return auth.tenantId === '*' || project.tenantId === auth.tenantId;
}

// Complement EDL from legacy store for any projects not yet persisted
try {
  if (projects && projects.length > 0) {
    for (const p of projects) {
      if (p.tenantId && !tenantRegistry.getTenant(p.id)) tenantRegistry.assign(p.id, p.tenantId);
      if (edl.getProject(p.id)) continue;
      const pm = edl.createProject(p.id, { name: p.name, description: p.description, status: p.status || 'loaded', tenantId: p.tenantId || null });
      if (p.type) pm.extracted.type = p.type;
      if (p.area) pm.extracted.area = p.area;
      if (p.floors) pm.extracted.floors = p.floors;
      if (p.region) pm.extracted.city = p.region;
      if (p.finishing) pm.extracted.phase = p.finishing;
      if (p.aiAnalysis) {
        try { pm.fromJSON(p.aiAnalysis); } catch(e) {}
      }
    }
  }
} catch (e) { console.error('[EDL] Load error:', e.message); }

// Persist EDL state every 60s and on shutdown
const persistInterval = setInterval(() => edl.persist(EDL_STATE_PATH), 60000);

function waitForAI(fn) {
  return async (req, res) => {
    if (!aiReady) return res.status(503).json({ error: 'AI Engine initializing', status: 'loading' });
    try { await fn(req, res); } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
  };
}

function extractNumber(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseInt(m[1] || m[2] || m[3] || '0');
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return null;
}

function parseDescription(desc) {
  const log = { input: desc, extracted: {}, failed: [] };

  // ─── 1. Project Type ────────────────────────────────
  const type = ai.kb.detectProjectType(desc);
  log.extracted.type = type;
  if (type === 'Unknown') log.failed.push('type');

  // ─── 2. Area ────────────────────────────────────────
  // Patterns: "100 م²", "100 متر مربع", "100 م", "مساحة 100", "100 متر", "100sqm"
  const area = extractNumber(desc, [
    /(\d+[,]?\d*)\s*(م[2²]|m2|sqm|متر مربع|متر\s*مربع|م|meter)/i,
    /مساحة\s*(\d+[,]?\d*)/i,
    /(\d+[,]?\d*)\s*(sqm|SQM)/i,
    /(\d+[,]?\d*)\s*م\s*$/i
  ]);
  if (area !== null) { log.extracted.area = area; } else { log.failed.push('area'); }

  // ─── 3. Floors ──────────────────────────────────────
  // Patterns: "دور 1", "1 دور", "الدور الأول", "دور واحد", "دورين"
  // NOTE: For Apartment_Finishing, "الدور الثالث" means 3rd floor of building, not 3-floor unit.
  // Apartment units are always single-floor; the floor count is handled below.
  let floors = extractNumber(desc, [
    /(\d+)\s*(دور|طابق|ادوار|أدوار|طوابق|floor|story)/i,   // "1 دور"
    /(دور|طابق)\s*(\d+)/i,                                   // "دور 1"
  ]);
  if (floors === null) {
    const wordMap = { 'دور واحد': 1, 'طابق واحد': 1, 'دورين': 2, 'طابقين': 2, 'ثلاثة ادوار': 3, 'ثلاث طوابق': 3, 'اربعة ادوار': 4, 'اربع طوابق': 4, 'خمسة ادوار': 5, 'خمس طوابق': 5, 'دور ارضي': 0, 'طابق ارضي': 0 };
    for (const [word, count] of Object.entries(wordMap)) {
      if (desc.includes(word)) { floors = count; break; }
    }
  }
  if (floors !== null) { log.extracted.floors = floors; } else { log.failed.push('floors'); }

  // ─── 4. Rooms ───────────────────────────────────────
  // Patterns: "غرفتين"=2, "X غرف"=X, "غرفة"=1, "خمس غرف"=5
  // IMPORTANT: check word-based patterns before digit-based to avoid
  // matching "3" from "دور 3 غرفتين" as rooms (غرفتين explicitly = 2)
  let rooms = null;
  if (/غرفتين/i.test(desc)) rooms = 2;
  if (rooms === null) {
    const wordNum = { 'خمس': 5, 'خمسة': 5, 'اربع': 4, 'اربعة': 4, 'ثلاث': 3, 'ثلاثة': 3, 'عشر': 10 };
    const roomWordMatch = desc.match(/(خمس|خمسة|اربع|اربعة|ثلاث|ثلاثة|عشر)\s*غرف/i);
    if (roomWordMatch && wordNum[roomWordMatch[1]]) rooms = wordNum[roomWordMatch[1]];
  }
  // Digit-based patterns: use negative lookahead to avoid matching غرفتين
  if (rooms === null) rooms = extractNumber(desc, [/(\d+)\s*غرف(?!تين)/i, /(\d+)\s*غرفة/i]);
  if (rooms === null) {
    if (/غرفة/i.test(desc)) rooms = 1;
  }
  if (rooms !== null) { log.extracted.rooms = rooms; } else { log.failed.push('rooms'); }

  // ─── 5. Bathrooms ───────────────────────────────────
  // Patterns: "حمامين"=2, "X حمامات"=X, "حمام"=1, "اربع حمامات"=4
  let bathrooms = null;
  const bathWordNum = { 'خمس': 5, 'خمسة': 5, 'اربع': 4, 'اربعة': 4, 'ثلاث': 3, 'ثلاثة': 3 };
  const bathWordMatch = desc.match(/(خمس|خمسة|اربع|اربعة|ثلاث|ثلاثة)\s*حمام/i);
  if (bathWordMatch && bathWordNum[bathWordMatch[1]]) bathrooms = bathWordNum[bathWordMatch[1]];
  if (bathrooms === null) bathrooms = extractNumber(desc, [/(\d+)\s*(حمامات|حمام)/i]);
  if (bathrooms === null) {
    if (/حمامين/i.test(desc)) bathrooms = 2;
    else if (/حمامات/i.test(desc)) bathrooms = 3;
    else if (/حمام/i.test(desc)) bathrooms = 1;
  }
  if (bathrooms !== null) { log.extracted.bathrooms = bathrooms; } else { log.failed.push('bathrooms'); }

  // ─── 6. Kitchen ─────────────────────────────────────
  const hasKitchen = /مطبخ/i.test(desc);
  if (hasKitchen) log.extracted.kitchen = true;

  // ─── 7. Halls / Living Rooms ────────────────────────
  let halls = null;
  if (/صالتين/i.test(desc)) halls = 2;
  else if (/صالة|صال/i.test(desc)) halls = 1;
  halls = extractNumber(desc, [/(\d+)\s*صالات/i]) || halls;
  if (halls !== null) log.extracted.halls = halls;

  // ─── 8. City / Region ───────────────────────────────
  const cityPatterns = [
    /(في|ب|مدينة)\s*(الرياض|جدة|مكة|المدينة|الدمام|الخبر|الظهران|تبوك|حائل|ابها|خميس مشيط|نجران|بريدة|عنيزة|الطائف|ينبع|عرعر)/i,
  ];
  let city = null;
  for (const p of cityPatterns) {
    const m = desc.match(p);
    if (m) { city = m[2]; break; }
  }
  if (city) log.extracted.city = city;

  // Apartment finishing always has 1 floor (a unit within a building)
  if (type === 'Apartment_Finishing') {
    floors = 1;
    const idx = log.failed.indexOf('floors');
    if (idx >= 0) log.failed.splice(idx, 1);
    log.extracted.floors = 1;
  }

  // ─── Logging ────────────────────────────────────────
  if (log.failed.length > 0) {
    console.log('[ACEP Parse] Extraction log:', JSON.stringify(log, null, 2));
  }

  return {
    type,
    typeConfidence: ai.kb.detectProjectTypeConfidence ? ai.kb.detectProjectTypeConfidence(desc) : 0.7,
    area, floors, rooms, bathrooms, hasKitchen, halls, city,
    areaExtracted: area !== null,
    floorsExtracted: floors !== null,
    roomsExtracted: rooms !== null,
    bathroomsExtracted: bathrooms !== null,
    extractionLog: log,
    extractedFrom: {
      type: true,
      area: area !== null,
      floors: floors !== null,
      rooms: rooms !== null,
      bathrooms: bathrooms !== null
    }
  };
}

function getProjectParams(p) {
  if (!p) return { type: null, area: null, floors: null, totalArea: null, finishing: null, region: null };
  return {
    type: p.type || null, area: p.area || null, floors: p.floors || null,
    totalArea: (p.area && p.floors) ? p.area * p.floors : null,
    finishing: p.finishing || null, region: p.region || null
  };
}

function hasSufficientInfo(params) {
  const missing = [];
  if (!params.areaExtracted || params.area === null) missing.push('area');
  // Apartment finishing implies a single floor unit
  const isApartmentFinishing = params.type === 'Apartment_Finishing';
  if (isApartmentFinishing && !params.floorsExtracted) {
    params.floors = 1;
    params.floorsExtracted = true;
  }
  if (!params.floorsExtracted || params.floors === null) missing.push('floors');
  const result = { sufficient: missing.length === 0, missing, explicit: { area: params.areaExtracted, floors: params.floorsExtracted } };
  return result;
}

function insufficientResponse(res, missing) {
  const msgs = { area: 'المساحة', floors: 'عدد الأدوار' };
  const details = missing.map(m => msgs[m] || m).join('، ');
  return res.status(422).json({
    error: 'insufficient_information',
    message: 'المعلومات غير كافية للتحليل. يرجى توضيح: ' + details,
    missing,
    hint: 'مثال: "فيلا مساحتها 400 م² دورين في الرياض"'
  });
}

app.get('/', (req, res) => {
  if (legacyUiEnabled && req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'packages', 'ui', 'web', 'index.html'));
  } else {
    res.json({
      name: 'ACEP Engineering OS', version: APP_VERSION, status: serviceMode === 'governance' || aiReady ? 'ready' : 'starting', serviceMode, aiReady,
      description: 'AI Construction Engineering Platform - Internal AI Engine',
      models: ai.getStatus(),
      endpoints: {
        health: 'GET /health', analyze: 'POST /api/v1/analyze', 'full-analysis': 'POST /api/v1/full-analysis',
        simulation: 'POST /api/v1/simulation', codes: 'GET /api/v1/codes',
        projects: 'GET /api/v1/projects', 'create-project': 'POST /api/v1/projects',
        chat: 'POST /api/v1/chat', 'supplier-match': 'POST /api/v1/cmpep/match-supplier',
        'quality-inspect': 'POST /api/v1/projects/:id/quality/inspect',
        'method-compare': 'POST /api/v1/projects/:id/schedule/compare-methods',
        'market-analysis': 'POST /api/v1/supplier/market-analysis'
      }
    });
  }
});

app.get('/live', (req, res) => {
  res.json({ status: 'alive', version: APP_VERSION, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  const securityStatus = security.status();
  const candidate = ai.millionProjectModel.getStatus();
  const modelReady = process.env.ACEP_MILLION_MODEL_ENABLED !== 'true' || (candidate.loaded && candidate.integrityVerified);
  const ready = securityStatus.configured && (serviceMode === 'governance' || (aiReady && modelReady));
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    version: APP_VERSION,
    serviceMode,
    checks: { ai: aiReady, modelIntegrity: modelReady, aiRequired: serviceMode === 'engineering', security: securityStatus.configured },
    release: releaseIdentity(),
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  const status = ai.getStatus();
  const securityStatus = security.status();
  const candidate = ai.millionProjectModel.getStatus();
  const modelReady = process.env.ACEP_MILLION_MODEL_ENABLED !== 'true' || (candidate.loaded && candidate.integrityVerified);
  const ready = securityStatus.configured && (serviceMode === 'governance' || (aiReady && modelReady));
  res.json({
    status: ready ? 'ready' : 'degraded', version: APP_VERSION, uptime: process.uptime(), serviceMode, aiReady, ai: status,
    security: securityStatus,
    release: releaseIdentity(),
    timestamp: new Date().toISOString(),
    engines: {
      ProjectUnderstandingEngine: { registered: true, status: status.projectAnalyzer ? 'trained' : 'idle' },
      VirtualBuildingEngine: { registered: true, status: status.projectAnalyzer ? 'trained' : 'idle' },
      ReasoningEngine: { registered: true, status: 'idle' },
      BOQEngine: { registered: true, status: status.quantityEstimator ? 'trained' : 'idle' },
      QuantityEngine: { registered: true, status: status.quantityEstimator ? 'trained' : 'idle' },
      CostEngine: { registered: true, status: status.costEstimator ? 'trained' : 'idle' },
      ScheduleEngine: { registered: true, status: status.scheduleOptimizer ? 'trained' : 'idle' },
      RiskEngine: { registered: true, status: status.riskAnalyzer ? 'trained' : 'idle' },
      QualityEngine: { registered: true, status: status.qualityInspector ? 'trained' : 'idle' },
      SupplierEngine: { registered: true, status: status.supplierIntelligence ? 'trained' : 'idle' }
    },
    orchestrator: orchestrator ? {
      active: true,
      sequence: orchestrator.getSequence(),
      pipelineLogCount: orchestrator.getPipelineLog().length,
    } : { active: false, reason: 'Not initialized' },
    advancedLayers: {
      decisionEngine: !!decisionEngine,
      decisionGraph: !!decisionGraph,
      explainableAI: !!explainableAI,
      consistencyScorer: !!consistencyScorer,
      dependencyEngine: !!dependencyEngine,
      autoRecalc: !!autoRecalc,
      engineeringMemory: !!engineeringMemory,
      selfReview: !!selfReview,
      recommendationEngine: !!recommendationEngine,
      maturityMetrics: !!maturityMetrics,
      finalReport: !!finalReport,
    }
  });
});

// ─── AI-Powered Analyze (Unified Pipeline) ─
app.post('/api/v1/analyze', waitForAI(async (req, res) => {
  const parsed = validation.parseAnalyze(req.body);
  if (!parsed.ok) return res.status(400).json(parsed.error);
  const { description } = parsed.data;

  // Create project in EDL
  const projectId = 'proj-' + Date.now();
  tenantRegistry.assign(projectId, req.tenantId);
  let project;
  try {
    project = edl.createProject(projectId, { description, tenantId: req.tenantId });
  } catch (e) {
    tenantRegistry.remove(projectId, req.tenantId);
    return res.status(500).json({ error: 'Failed to create project: ' + e.message });
  }

  // Run full pipeline
  const pipelineResult = await workflow.runFullPipeline(project, description, parseDescription);

  if (!pipelineResult.ok) {
    const err = pipelineResult.error;
    if (err.insufficientData || err.missing) {
      return res.status(422).json({
        error: 'insufficient_information',
        message: err.message || 'المعلومات غير كافية',
        missing: err.missing || [],
        description
      });
    }
    return res.status(422).json({ error: 'analysis_failed', message: err.message || 'فشل التحليل', description });
  }

  const v = validator.validate(project);

  // Build response from EDL
  const ext = project.extracted;
  const pred = project.predicted;
  const boq = project.boq;
  const cost = project.cost;
  const schedule = project.schedule;
  const risks = project.risks;
  const quality = project.quality;

  res.json({
    projectId,
    type: ext.type,
    totalArea: pred.totalArea || ext.area * (ext.floors || 1),
    floors: ext.floors,
    area: ext.area,
    confidence: pred.confidence,
    description,
    phase: boq.phase || ext.phase,
    extracted: {
      type: ext.type, area: ext.area, floors: ext.floors,
      rooms: ext.rooms || null, bathrooms: ext.bathrooms || null,
      hasKitchen: ext.hasKitchen || false, halls: ext.halls || null,
      city: ext.city || null
    },
    workflow: pipelineResult.steps.map(s => ({ step: s.name, status: s.status })),
    validation: { passed: v.passed, errors: v.issues.length, warnings: v.warnings.length },
    analysis: [
      { step: 'project-understanding', status: 'completed', result: `Project classified as ${ext.type} with ${(pred.confidence || 0) * 100}% confidence` },
      { step: 'virtual-building', status: 'completed', result: `${project.building.spaces.length} spaces identified across ${ext.floors} floors` },
      { step: 'boq-generation', status: 'completed', result: `${boq.items.length} BOQ items (${boq.suggestedItems.length} suggested) phase: ${boq.phase}` },
      { step: 'cost-estimation', status: 'completed', result: `${(cost.totalCost || 0).toLocaleString()} SAR estimated (${(cost.costPerM2 || 0).toLocaleString()} SAR/m²)` },
      { step: 'schedule-generation', status: 'completed', result: `${schedule.totalMonths} months (${schedule.totalDuration} days)` },
      { step: 'risk-analysis', status: 'completed', result: `${risks.riskCount} risks identified, level: ${risks.riskLevel}` },
      { step: 'quality-inspection', status: 'completed', result: `Quality score: ${quality.qualityScore}% (${quality.qualityGrade})` }
    ],
    boq: { items: boq.items, suggestedItems: boq.suggestedItems, summary: boq.summary, phase: boq.phase },
    cost: { totalCost: cost.totalCost, directCost: cost.directCost, indirectCost: cost.indirectCost, currency: 'SAR', costPerM2: cost.costPerM2, breakdown: cost.breakdown, dataPoints: cost.dataPoints, confidence: cost.confidence, source: 'EDL: costEstimator' },
    duration: schedule.totalMonths,
    schedule: { totalDays: schedule.totalDuration, totalMonths: schedule.totalMonths, activities: schedule.activities.length, criticalPath: schedule.criticalPath, optimization: schedule.optimization, source: 'EDL: scheduleOptimizer' },
    risks: { count: risks.riskCount, items: risks.risks.slice(0, 10), overallScore: risks.overallRiskScore, level: risks.riskLevel, source: 'EDL: riskAnalyzer' },
    quality: { score: quality.qualityScore, grade: quality.qualityGrade, estimatedDefects: quality.estimatedDefects, source: 'EDL: qualityInspector' },
    building: { spaces: project.building.spaces.slice(0, 10), systems: project.building.systems, totalHeight: project.building.totalHeight, hasBasement: project.building.hasBasement },
    traceability: project.trace.slice(-15).map(t => ({ time: t.timestamp, action: t.action, module: t.module })),
    validation: v,
    trainingDataPoints: pred.trainingDataPoints || boq.summary.trainingDataAvailable || 0
  });
}));

// ─── AI Chat Assistant ──────────────────
app.post('/api/v1/chat', waitForAI(async (req, res) => {
  const parsed = validation.parseChat(req.body);
  if (!parsed.ok) return res.status(400).json(parsed.error);
  const { message, projectId } = parsed.data;
  const project = projects.find(p => p.id === projectId && canAccessProject(p, req.auth));
  const ctx = project ? { projectId: project.id, projectName: project.name, status: project.status, cost: project.cost, progress: project.progress, type: project.type } : null;
  const result = ai.engineeringAssistant.processQuery(message, ctx);
  res.json(result);
}));

// ─── Drawing Analysis ──────────────────
app.post('/api/v1/analyze-drawing', waitForAI(async (req, res) => {
  const { image, description } = req.body || {};
  if (!image && !description) return res.status(400).json({ error: 'Provide image data (base64) or description' });
  res.status(501).json({
    error: 'vision_analysis_unavailable',
    status: 'not_evaluated',
    message: 'No verified drawing-analysis model is configured. Synthetic element detection has been disabled.',
    requiresConfiguredVisionModel: true,
    requiresHumanReview: true
  });
}));

// ─── Digital Twin ──────────────────────
app.post('/api/v1/digital-twin', waitForAI(async (req, res) => {
  const { projectId } = req.body || {};
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  const p = projects.find(x => x.id === projectId);
  const params = getProjectParams(p);
  const quality = ai.qualityInspector.inspectProject(params.type, params.totalArea, params.floors, params.finishing);
  const risks = ai.riskAnalyzer.analyzeRisks(params.type, params.totalArea, params.floors);
  const schedule = ai.scheduleOptimizer.generateSchedule(params.type, params.totalArea, params.floors, params.finishing);

  res.json({
    twinId: `twin-${projectId}`, projectId, status: 'partial',
    currentState: {
      timestamp: new Date().toISOString(),
      completionPercentage: Number.isFinite(Number(p?.progress)) ? Number(p.progress) : null,
      resourceUtilization: { labor: null, equipment: null, materials: null },
      qualityScore: null,
      safetyScore: null,
      source: p?.progress !== undefined ? 'project_record' : 'unavailable'
    },
    performanceMetrics: {
      schedulePerformanceIndex: null,
      costPerformanceIndex: null,
      qualityIndex: null,
      safetyIndex: null,
      productivityIndex: null,
      resourceEfficiency: null,
      status: 'not_evaluated',
      reason: 'No connected telemetry or earned-value measurements'
    },
    modelEstimates: {
      predictedCompletion: new Date(Date.now() + schedule.totalDuration * 86400000).toISOString(),
      qualityGrade: quality.qualityGrade,
      riskLevel: risks.riskLevel,
      provenance: 'configured_internal_models',
      contractualUse: false,
      requiresHumanReview: true
    }
  });
}));

// ─── Simulation ─────────────────────────
app.post('/api/v1/simulation', waitForAI(async (req, res) => {
  const { scenario } = req.body || {};
  if (!scenario) return res.status(400).json({ error: 'scenario is required' });
  const { projectType, area, floors, finishing, region } = scenario;
  const totalArea = (area ?? 500) * (floors ?? 2);
  const baseSchedule = ai.scheduleOptimizer.generateSchedule(projectType || null, totalArea, floors ?? 2, finishing || null, region || null);
  const baseRisks = ai.riskAnalyzer.analyzeRisks(projectType || null, totalArea, floors ?? 2);
  const pt = ai.kb.getProjectType(projectType || null);
  const mult = ai.kb.getMaterialPriceMultiplier(finishing || null);
  const regionIdx = ai.kb.getRegionIndex(region || null);
  const baseCost = (pt ? pt.costPerM2 : 2800) * totalArea * mult * regionIdx;

  const durationAdj = scenario.acceleration ? -10 : scenario.delay ? 30 : 0;
  const costAdj = scenario.scopeChange ? 0.2 : (scenario.resourceOptimization ? -0.08 : (scenario.materialShortage ? 0.25 : 0));
  const qualityAdj = scenario.laborShortage ? -0.2 : (scenario.acceleration ? -0.05 : 0);

  const durationDays = Math.max(30, Math.round(baseSchedule.totalDuration * (1 + durationAdj / 100)));
  const finalCost = Math.round(baseCost * (1 + costAdj));
  const newRiskLevel = durationAdj > 10 || costAdj > 0.15 ? 'High' : (durationAdj > 0 || costAdj > 0 ? 'Medium' : 'Low');

  const recs = [];
  if (scenario.acceleration) recs.push('Add night shifts and weekend work', 'Fast-track critical path activities', 'Prefabricate key components off-site');
  if (scenario.scopeChange) recs.push('Update BOQ and re-estimate costs', 'Conduct value engineering workshop', 'Negotiate change order with client');
  if (scenario.laborShortage) recs.push('Arrange prefabrication to reduce site labor', 'Recruit from alternative labor markets', 'Cross-train existing workforce');
  if (scenario.resourceOptimization) recs.push('Consolidate material procurement for bulk discounts', 'Optimize equipment fleet utilization', 'Implement just-in-time delivery');
  if (scenario.materialShortage) recs.push('Identify alternative suppliers', 'Pre-order critical materials', 'Maintain 2-week safety stock');
  if (recs.length === 0) recs.push('Monitor key performance indicators weekly', 'Maintain regular client communication', 'Document lessons learned');

  res.json({
    scenarioId: 'sim-' + Date.now(), scenarioName: scenario.name || 'Custom Scenario', status: 'simulated',
    projectParams: { type: projectType, area: totalArea, floors, finishing, region },
    impacts: { duration: Math.round(durationAdj), cost: Math.round(costAdj * 100) / 100, quality: Math.round(qualityAdj * 100) / 100 },
    predictions: {
      estimatedCompletion: new Date(Date.now() + durationDays * 86400000).toISOString(),
      durationDays, finalCost, riskLevel: newRiskLevel,
      baselineDuration: baseSchedule.totalDuration,
      baselineCost: Math.round(baseCost),
      confidence: Math.min(0.85, 0.5 + ai.kb.getAllProjectTypes().length * 0.02)
    },
    recommendations: recs,
    riskComparison: { before: baseRisks.riskLevel, after: newRiskLevel },
    assumptions: {
      durationAdjustmentPercent: durationAdj,
      costAdjustmentRatio: costAdj,
      qualityAdjustmentRatio: qualityAdj,
      source: 'fixed_scenario_assumptions',
      observedData: false,
      contractualUse: false,
      requiresHumanReview: true
    }
  });
}));

// ─── Engineering Codes ─────────────────
app.get('/api/v1/codes', (req, res) => {
  const { country, category } = req.query;
  const targetCountry = country === 'Saudi Arabia' ? 'saudi' : 'international';
  const raw = ai.kb.getCode(targetCountry, category);
  const codes = raw.map(c => ({ ...c, country: targetCountry === 'saudi' ? 'Saudi Arabia' : 'International' }));
  res.json({ codes, count: codes.length });
});

// ─── Projects CRUD ────────────────────
app.get('/api/v1/projects', (req, res) => {
  projects = store.getProjects();
  const visible = req.auth.tenantId === '*' ? projects : projects.filter(project => canAccessProject(project, req.auth));
  res.json({ projects: visible });
});

app.post('/api/v1/projects', (req, res) => {
  const parsed = validation.parseProjectCreate(req.body);
  if (!parsed.ok) return res.status(400).json(parsed.error);
  const { name, description, type, area, floors, region, finishing } = parsed.data;

  let aiResult = {};
  let boq = null, cost = null, sched = null, risks = null, quality = null;
  if (aiReady) {
    try {
      const desc = description || `مشروع ${name}`;
      const params = parseDescription(desc);
      const analysis = ai.projectAnalyzer.analyzeProject(desc, { ...params, area: area || params.area, floors: floors || params.floors });
      boq = ai.quantityEstimator.estimateBOQ(params.type, analysis.totalArea, analysis.floors);
      cost = ai.costEstimator.estimateCost(boq.items, params.type, analysis.totalArea, analysis.floors);
      sched = ai.scheduleOptimizer.generateSchedule(params.type, analysis.totalArea, analysis.floors);
      risks = ai.riskAnalyzer.analyzeRisks(params.type, analysis.totalArea, analysis.floors);
      quality = ai.qualityInspector.inspectProject(params.type, analysis.totalArea, analysis.floors);
      aiResult = {
        type: params.type, area: analysis.totalArea, floors: analysis.floors,
        cost: cost.totalCost, aiAnalysis: analysis, boq: boq.summary,
        schedule: { totalDuration: sched.totalDuration, totalMonths: sched.totalMonths },
        risks: { level: risks.riskLevel, score: risks.overallRiskScore },
        quality: { score: quality.qualityScore, grade: quality.qualityGrade }
      };
    } catch (e) {
      console.error('[Project Creation] AI processing error:', e.message);
    }
  }

  const project = store.createProject({
    name, description: description || '',
    type: type || aiResult.type || 'Building',
    area: area || aiResult.area || 0,
    floors: floors || aiResult.floors || 1,
    region: region || 'Riyadh', finishing: finishing || 'Standard',
    cost: aiResult.cost || 0, ...aiResult,
    tenantId: req.tenantId,
    dataProvenance: process.env.ACEP_DATA_PROVENANCE || 'synthetic'
  });
  tenantRegistry.assign(project.id, req.tenantId);
  projects = store.getProjects();

  // Include full BOQ items in response
  const responseProject = {
    ...project,
    boq: (boq && boq.items) ? { items: boq.items, totalCost: boq.summary?.totalCost || 0, summary: boq.summary } : null,
    cost: cost ? { totalCost: cost.totalCost, costPerM2: cost.costPerM2 } : null,
    schedule: sched ? { totalDays: sched.totalDuration, totalMonths: sched.totalMonths } : null,
    risks: risks ? { score: risks.overallRiskScore, level: risks.riskLevel } : null,
    quality: quality ? { score: quality.qualityScore, grade: quality.qualityGrade } : null
  };

  res.status(201).json({ project: responseProject, message: 'تم إنشاء المشروع بنجاح' });
});

app.get('/api/v1/projects/:id', (req, res) => {
  const p = store.findProject(req.params.id);
  if (!p || !canAccessProject(p, req.auth)) return res.status(404).json({ error: 'Project not found' });
  let boq, cost, sched, risks, quality;
  if (aiReady) {
    try {
      const pp = getProjectParams(p);
      boq = ai.quantityEstimator.estimateBOQ(pp.type, pp.area, pp.floors);
      cost = ai.costEstimator.estimateCost(boq.items, pp.type, pp.area, pp.floors);
      sched = ai.scheduleOptimizer.generateSchedule(pp.type, pp.totalArea, pp.floors);
      risks = ai.riskAnalyzer.analyzeRisks(pp.type, pp.totalArea, pp.floors);
      quality = ai.qualityInspector.inspectProject(pp.type, pp.totalArea, pp.floors);
    } catch (e) {}
  }
  res.json({
    ...p,
    boq: boq ? { items: boq.items.length, totalCost: boq.summary.totalCost, confidence: boq.summary.averageConfidence } : null,
    cost: cost ? { totalCost: cost.totalCost, costPerM2: cost.costPerM2 } : null,
    schedule: sched ? { totalDays: sched.totalDuration, totalMonths: sched.totalMonths } : null,
    risks: risks ? { score: risks.overallRiskScore, level: risks.riskLevel } : null,
    quality: quality ? { score: quality.qualityScore, grade: quality.qualityGrade } : null
  });
});

app.put('/api/v1/projects/:id', (req, res) => {
  const existing = store.findProject(req.params.id);
  if (!existing || !canAccessProject(existing, req.auth)) return res.status(404).json({ error: 'Project not found' });
  const parsed = validation.parseProjectUpdate(req.body);
  if (!parsed.ok) return res.status(400).json(parsed.error);
  const updated = store.updateProject(req.params.id, parsed.data);
  if (!updated) return res.status(404).json({ error: 'Project not found' });
  projects = store.getProjects();
  res.json({ project: updated, message: 'تم تحديث المشروع بنجاح' });
});

app.delete('/api/v1/projects/:id', (req, res) => {
  const existing = store.findProject(req.params.id);
  if (!existing || !canAccessProject(existing, req.auth)) return res.status(404).json({ error: 'Project not found' });
  const deleted = store.deleteProject(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Project not found' });
  tenantRegistry.remove(req.params.id, req.auth.tenantId);
  projects = store.getProjects();
  res.json({ message: 'تم حذف المشروع بنجاح' });
});

// ─── BOQ Generation (EDL-aware) ─────────
app.post('/api/v1/projects/:id/boq/generate', waitForAI(async (req, res) => {
  const p = projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  let project = edl.getProject(p.id);
  if (!project) {
    project = edl.createProject(p.id, { name: p.name, description: p.description });
    if (p.type) project.extracted.type = p.type;
    if (p.area) project.extracted.area = p.area;
    if (p.floors) project.extracted.floors = p.floors;
  }
  // Ensure analysis ran first
  if (!project.predicted?.totalArea) await workflow.stepAnalysis(project, p.description || '');
  await workflow.stepBOQ(project, p.description || '');
  res.json({
    projectId: p.id, status: 'generated',
    items: project.boq.items, suggestedItems: project.boq.suggestedItems,
    phase: project.boq.phase,
    lifecyclePhases: project.boq.lifecyclePhases || [],
    summary: project.boq.summary,
    edlSource: 'EDL: boqRules'
  });
}));

// ─── BOQ Item Explanation ──────────────
app.post('/api/v1/boq/explain', waitForAI(async (req, res) => {
  const { code, projectType, area, floors, rooms, bathrooms, hasKitchen, halls, description, phase } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code is required' });
  const explanation = ai.quantityEstimator.getItemExplanation(code, {
    type: projectType || 'Unknown', area: area || 0, floors: floors || 1,
    rooms: rooms || null, bathrooms: bathrooms || null,
    hasKitchen: hasKitchen || false, halls: halls || null,
    description: description || '', phase: phase || null
  });
  if (!explanation) return res.status(404).json({ error: 'Item not found in knowledge base' });
  res.json(explanation);
}));

// ─── BOQ Assumptions Review (NEW v3) ──
app.post('/api/v1/boq/assumptions', waitForAI(async (req, res) => {
  const { projectType, area, floors, rooms, bathrooms, hasKitchen, halls, description, finishing, region, phase } = req.body || {};
  if (!projectType) return res.status(400).json({ error: 'projectType is required' });
  try {
    const boqEngine = req.app.locals.boqEngine;
    // Build params for assumption engine
    const params = {
      type: projectType,
      area: area ?? null,
      floors: floors ?? null,
      rooms: rooms ?? null,
      bathrooms: bathrooms ?? null,
      hasKitchen: hasKitchen ?? null,
      halls: halls ?? null,
      description: description || '',
      phase: phase || finishing || null,
    };
    // Generate assumptions using the engineering inference engine
    const assumptions = boqEngine.assumptionManager.generateAssumptions(params);
    res.json(assumptions);
  } catch (e) {
    res.status(500).json({ error: 'Assumptions generation failed', details: e.message });
  }
}));

// ─── BOQ Apply Assumptions & Generate ──
app.post('/api/v1/boq/assumptions/apply', waitForAI(async (req, res) => {
  const { decisions, params } = req.body || {};
  if (!decisions || !params) return res.status(400).json({ error: 'decisions and params are required' });
  try {
    const boqEngine = req.app.locals.boqEngine;
    // Map frontend field names to engine field names
    const engineParams = { ...params, type: params.projectType || params.type };
    // Apply user decisions to parameters
    const mergedParams = boqEngine.assumptionManager.applyDecisions(engineParams, decisions);
    // Generate BOQ with approved parameters
    const result = boqEngine.generate(mergedParams);
    res.json({
      status: 'approved',
      params: mergedParams,
      items: result.items,
      suggestedItems: result.suggestedItems,
      lifecyclePhases: result.lifecyclePhases,
      summary: result.summary,
      learning: boqEngine.getLearningInsights(),
    });
  } catch (e) {
    res.status(500).json({ error: 'Assumptions apply failed', details: e.message });
  }
}));

// ─── Dynamic Recalculate ────────────────
app.post('/api/v1/boq/recalculate', waitForAI(async (req, res) => {
  const { params, decisions } = req.body || {};
  if (!params) return res.status(400).json({ error: 'params are required' });
  try {
    const boqEngine = req.app.locals.boqEngine;
    // Normalize frontend decisions to engine format
    const normalized = (decisions || []).map(d => ({
      action: d.action || 'modify',
      code: d.code || d.itemCode,
      field: d.field,
      approvedValue: d.approvedValue ?? d.newValue,
      oldValue: d.oldValue,
    }));
    const result = boqEngine.recalculate(
      { ...params, type: params.projectType || params.type },
      null,
      normalized
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Recalculation failed', details: e.message });
  }
}));

// ─── Learning Insights ──────────────────
app.get('/api/v1/boq/learning', waitForAI(async (req, res) => {
  try {
    const boqEngine = req.app.locals.boqEngine;
    res.json({
      assumptions: boqEngine.getLearningInsights(),
      prices: boqEngine.getPriceInsights(),
    });
  } catch (e) {
    res.status(500).json({ error: 'Learning insights failed', details: e.message });
  }
}));

// ─── Price Learning Insights ────────────
app.get('/api/v1/boq/price-learning', waitForAI(async (req, res) => {
  try {
    const boqEngine = req.app.locals.boqEngine;
    res.json(boqEngine.getPriceInsights());
  } catch (e) {
    res.status(500).json({ error: 'Price learning failed', details: e.message });
  }
}));

// ─── Price Heat Map ────────────────────
app.get('/api/v1/boq/price-heatmap', (req, res) => {
  try {
    const boqEngine = req.app.locals.boqEngine;
    res.json(boqEngine.priceLearner.getPriceHeatmap());
  } catch (e) {
    res.status(500).json({ error: 'Heatmap failed', details: e.message });
  }
});

// ─── Supplier Recommendations ──────────
app.get('/api/v1/boq/suppliers', (req, res) => {
  try {
    const boqEngine = req.app.locals.boqEngine;
    const { region, priceCat } = req.query;
    if (region && priceCat) {
      res.json(boqEngine.priceLearner.getSupplierRecommendations(region, priceCat));
    } else {
      res.json(boqEngine.priceLearner.getAllSupplierRegions());
    }
  } catch (e) {
    res.status(500).json({ error: 'Suppliers failed', details: e.message });
  }
});

// ─── BOQ Knowledge Base Reference ─────
app.get('/api/v1/boq/knowledge-base', waitForAI(async (req, res) => {
  const kb = ai.quantityEstimator.getKnowledgeBase();
  res.json(kb);
}));

// ─── BOQ User Edit Tracking ────────────
app.post('/api/v1/boq/user-edit', waitForAI(async (req, res) => {
  const { projectId, itemCode, field, oldValue, newValue, projectParams } = req.body || {};
  if (!itemCode || !field) return res.status(400).json({ error: 'itemCode and field are required' });
  const edit = ai.quantityEstimator.recordUserEdit(projectId || 'unknown', itemCode, field, oldValue, newValue, projectParams);
  // Also track in PriceLearner for price fields
  if (field === 'unitPrice' || field === 'price') {
    try {
      const boqEngine = req.app.locals.boqEngine;
      const region = projectParams?.city || projectParams?.region || '';
      const priceCat = projectParams?.priceCat || 'GEN';
      boqEngine.recordPriceEdit(itemCode, priceCat, oldValue, newValue, region, projectParams?.type || '');
    } catch (e) { /* silent */ }
  }
  res.json({ recorded: true, edit });
}));

// ─── BOQ Save/Load Sessions ────────────
const { writeJsonAtomic } = require('./packages/runtime/atomic-json-store');
const SESSIONS_DIR = runtimePath('boq-sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

app.post('/api/v1/boq/save', waitForAI(async (req, res) => {
  const { name, projectType, params, items, decisions, summary, lifecyclePhases } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Session name is required' });
  try {
    const session = {
      id: 'boq-' + Date.now(),
      name,
      projectType: projectType || params?.type || 'Unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: req.tenantId,
      params: params || {},
      items: items || [],
      decisions: decisions || [],
      summary: summary || {},
      lifecyclePhases: lifecyclePhases || [],
    };
    const filePath = path.join(SESSIONS_DIR, session.id + '.json');
    writeJsonAtomic(filePath, session);
    res.json({ session, message: 'تم حفظ الجلسة بنجاح' });
  } catch (e) {
    res.status(500).json({ error: 'Save failed', details: e.message });
  }
}));

app.get('/api/v1/boq/sessions', (req, res) => {
  try {
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
    const sessions = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
      if (req.auth.tenantId !== '*' && data.tenantId !== req.tenantId) return null;
      return { id: data.id, name: data.name, projectType: data.projectType, createdAt: data.createdAt, itemCount: data.items?.length || 0, totalCost: data.summary?.totalCost || 0 };
    }).filter(Boolean);
    sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ sessions });
  } catch (e) {
    res.status(500).json({ error: 'List sessions failed', details: e.message });
  }
});

function validateSessionId(id) {
  return /^boq-\d+$/.test(id);
}

app.get('/api/v1/boq/load/:id', (req, res) => {
  try {
    if (!validateSessionId(req.params.id)) return res.status(400).json({ error: 'Invalid session ID' });
    const filePath = path.join(SESSIONS_DIR, req.params.id + '.json');
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Session not found' });
    const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (req.auth.tenantId !== '*' && session.tenantId !== req.tenantId) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: 'Load failed', details: e.message });
  }
});

app.delete('/api/v1/boq/session/:id', (req, res) => {
  try {
    if (!validateSessionId(req.params.id)) return res.status(400).json({ error: 'Invalid session ID' });
    const filePath = path.join(SESSIONS_DIR, req.params.id + '.json');
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Session not found' });
    const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (req.auth.tenantId !== '*' && session.tenantId !== req.tenantId) return res.status(404).json({ error: 'Session not found' });
    fs.unlinkSync(filePath);
    res.json({ message: 'تم حذف الجلسة' });
  } catch (e) {
    res.status(500).json({ error: 'Delete failed', details: e.message });
  }
});

// ─── Engineering Analysis Engine (New Stages 1-20) ──
app.post('/api/v1/engineering/analyze', waitForAI(async (req, res) => {
  const { projectParams } = req.body || {};
  if (!projectParams) return res.status(400).json({ error: 'projectParams required' });
  const p = projects.find(x => x.id === projectParams.id);
  if (p) projectParams = { ...projectParams, type: p.type || projectParams.type };
  const boqResult = boqEngine.generate(projectParams, { byCategory: {} });
  const analysis = engineeringOrchestrator.runFullAnalysis(boqResult, projectParams);
  res.json({ status: 'completed', analysis, items: boqResult.items, summary: boqResult.summary });
}));

app.post('/api/v1/engineering/phases', (req, res) => {
  const { projectType } = req.body || {};
  const phases = engineeringOrchestrator.phases.getPhasesByProjectType(projectType || null);
  const timeline = engineeringOrchestrator.phases.getPhaseTimeline(projectType || null, req.body.area ?? null, req.body.floors ?? null);
  res.json({ phases, timeline });
});

app.get('/api/v1/engineering/missing-phases', (req, res) => {
  const projectType = req.query.type || null;
  const existing = (req.query.phases || '').split(',').filter(Boolean);
  const missing = engineeringOrchestrator.phases.detectMissingPhases(projectType, existing);
  res.json({ projectType, existingPhases: existing, missingPhases: missing });
});

app.post('/api/v1/engineering/missing-items', waitForAI(async (req, res) => {
  const { items, projectType } = req.body || {};
  if (!items) return res.status(400).json({ error: 'items required' });
  const result = engineeringOrchestrator.missingItemsAI.findMissingItems(items, projectType || null);
  const report = engineeringOrchestrator.missingItemsAI.getMissingItemsReport(result);
  res.json({ missingItems: result, report });
}));

app.post('/api/v1/engineering/graph/validate', waitForAI(async (req, res) => {
  const { items } = req.body || {};
  if (!items) return res.status(400).json({ error: 'items required' });
  engineeringOrchestrator.graph.buildGraph(items);
  res.json({
    missingDeps: engineeringOrchestrator.graph.getMissingDependencies(items),
    executionOrder: engineeringOrchestrator.graph.getExecutionOrder(items),
    sequenceValid: engineeringOrchestrator.graph.validateSequence(items),
    circularDeps: engineeringOrchestrator.graph.detectCircularDependencies(),
    suggestedItems: engineeringOrchestrator.graph.suggestAdditionalItems(items),
  });
}));

app.post('/api/v1/engineering/quantity/validate', waitForAI(async (req, res) => {
  const { items, projectParams } = req.body || {};
  if (!items) return res.status(400).json({ error: 'items required' });
  const validation = engineeringOrchestrator.validator.validate(items, projectParams || {});
  const report = engineeringOrchestrator.validator.getValidationReport(items, projectParams || {});
  res.json({ validation, report });
}));

app.post('/api/v1/engineering/confidence', waitForAI(async (req, res) => {
  const { items, projectParams } = req.body || {};
  if (!items) return res.status(400).json({ error: 'items required' });
  const confidence = engineeringOrchestrator.confidence.calculateBOQConfidence(items, projectParams || {});
  const weakPoints = engineeringOrchestrator.confidence.analyzeWeakPoints(items);
  res.json({ confidence, weakPoints });
}));

app.post('/api/v1/engineering/qa', waitForAI(async (req, res) => {
  const { items, projectParams } = req.body || {};
  if (!items) return res.status(400).json({ error: 'items required' });
  const boqResult = { items, suggestedItems: [], assumptions: [], phase: (projectParams || {}).phase || '', summary: {} };
  const qa = engineeringOrchestrator.qa.analyzeQA(boqResult, projectParams || {});
  const scoreCard = engineeringOrchestrator.qa.getQAScoreCard(qa);
  res.json({ qa, scoreCard });
}));

app.post('/api/v1/engineering/risk', waitForAI(async (req, res) => {
  const { items, projectParams } = req.body || {};
  if (!items) return res.status(400).json({ error: 'items required' });
  const boqResult = { items, suggestedItems: [], assumptions: [], phase: (projectParams || {}).phase || '', summary: {} };
  const missingItems = engineeringOrchestrator.missingItemsAI.findMissingItems(items, (projectParams || {}).type || null);
  const qaAnalysis = engineeringOrchestrator.qa.analyzeQA(boqResult, projectParams || {});
  const risks = engineeringOrchestrator.risk.analyzeRisks(boqResult, missingItems, qaAnalysis);
  const mitigation = engineeringOrchestrator.risk.getRiskMitigation(risks.findings);
  res.json({ risks, mitigation });
}));

app.post('/api/v1/engineering/suppliers/search', (req, res) => {
  const { material, region, maxPrice, minRating } = req.body || {};
  const suppliers = engineeringOrchestrator.supplierAI.findSuppliers(material, region, maxPrice, minRating);
  res.json({ suppliers });
});

app.post('/api/v1/engineering/suppliers/compare', (req, res) => {
  const { ids } = req.body || {};
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
  const comparison = engineeringOrchestrator.supplierAI.compareSuppliers(ids);
  res.json({ comparison });
});

app.post('/api/v1/engineering/price-estimate', (req, res) => {
  const { material, region } = req.body || {};
  const estimate = engineeringOrchestrator.supplierAI.getPriceEstimate(material, region);
  res.json({ estimate });
});

app.post('/api/v1/engineering/full-report', waitForAI(async (req, res) => {
  const { projectParams } = req.body || {};
  if (!projectParams) return res.status(400).json({ error: 'projectParams required' });
  const boqResult = boqEngine.generate(projectParams, { byCategory: {} });
  const analysis = engineeringOrchestrator.runFullAnalysis(boqResult, projectParams);
  res.json({
    status: 'completed',
    timestamp: new Date().toISOString(),
    summary: {
      itemsCount: boqResult.items.length,
      phases: analysis.phases?.length || 0,
      confidence: analysis.confidence?.overall || 0,
      qaScore: analysis.qa?.overall || 0,
      riskScore: analysis.risks?.riskScore || 0,
      riskLevel: analysis.risks?.riskLevel || 'unknown',
      missingItems: analysis.missingItems?.length || 0,
    },
    analysis,
    items: boqResult.items,
  });
}));

// ─── BOQ Export (EDL-aware) ────────────
app.get('/api/v1/projects/:id/boq/export', waitForAI(async (req, res) => {
  const p = projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  let project = edl.getProject(p.id);
  if (!project || !project.boq?.items?.length) {
    project = edl.createProject(p.id, { name: p.name, description: p.description });
    if (p.type) project.extracted.type = p.type;
    if (p.area) project.extracted.area = p.area;
    if (p.floors) project.extracted.floors = p.floors;
    if (!project.predicted?.totalArea) await workflow.stepAnalysis(project, p.description || '');
    await workflow.stepBOQ(project, p.description || '');
  }
  const boq = project.boq;
  const format = req.query.format || 'json';
  if (format === 'csv') {
    const header = 'Code,Description,Unit,Quantity,UnitPrice,TotalPrice,Confidence,CalculationMethod\n';
    const rows = boq.items.map(i => `${i.code},"${i.description || ''}",${i.unit},${i.quantity || ''},${i.unitPrice || ''},${i.totalPrice || ''},${i.confidence || ''},"${(i.calculationMethod || '').replace(/"/g, '""')}"`).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=boq-${p.id}.csv`);
    res.send('\uFEFF' + header + rows);
  } else {
    res.json(boq);
  }
}));

// ─── Cost Estimate (EDL-aware) ──────────
app.post('/api/v1/projects/:id/cost/estimate', waitForAI(async (req, res) => {
  const p = projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  let project = edl.getProject(p.id);
  if (!project) {
    project = edl.createProject(p.id, { name: p.name, description: p.description });
    if (p.type) project.extracted.type = p.type;
    if (p.area) project.extracted.area = p.area;
    if (p.floors) project.extracted.floors = p.floors;
  }
  // Generate BOQ first if missing
  if (!project.boq.items || project.boq.items.length === 0) {
    await workflow.stepBOQ(project, p.description || '');
  }
  await workflow.stepCost(project);
  const v = validator.validate(project);
  res.json({
    projectId: p.id, ...project.cost,
    edlSource: 'EDL: costEstimator (uses BOQ from EDL)',
    validation: { errors: v.issues.filter(i => i.code.startsWith('V00')).length, warnings: v.warnings.length }
  });
}));

// ─── Schedule Generation (EDL-aware) ────
app.post('/api/v1/projects/:id/schedule/generate', waitForAI(async (req, res) => {
  const p = projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  let project = edl.getProject(p.id);
  if (!project) {
    project = edl.createProject(p.id, { name: p.name, description: p.description });
    if (p.type) project.extracted.type = p.type;
    if (p.area) project.extracted.area = p.area;
    if (p.floors) project.extracted.floors = p.floors;
  }
  if (!project.predicted?.totalArea) await workflow.stepAnalysis(project, p.description || '');
  await workflow.stepSchedule(project);
  res.json({ projectId: p.id, ...project.schedule, edlSource: 'EDL: scheduleOptimizer' });
}));

// ─── Compare Construction Methods ──────
app.post('/api/v1/projects/:id/schedule/compare-methods', waitForAI(async (req, res) => {
  const p = projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const pp = getProjectParams(p);
  const comparison = ai.scheduleOptimizer.compareMethods(pp.type, pp.totalArea, pp.floors);
  res.json({ projectId: p.id, comparison, recommended: comparison[0]?.method || 'Traditional' });
}));

// ─── Risk Analysis (EDL-aware) ──────────
app.post('/api/v1/projects/:id/risks/analyze', waitForAI(async (req, res) => {
  const p = projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  let project = edl.getProject(p.id);
  if (!project) {
    project = edl.createProject(p.id, { name: p.name, description: p.description });
    if (p.type) project.extracted.type = p.type;
    if (p.area) project.extracted.area = p.area;
    if (p.floors) project.extracted.floors = p.floors;
  }
  if (!project.predicted?.totalArea) await workflow.stepAnalysis(project, p.description || '');
  await workflow.stepRisks(project);
  res.json({ projectId: p.id, ...project.risks, edlSource: 'EDL: riskAnalyzer' });
}));

// ─── Quality Inspection (EDL-aware) ─────
app.post('/api/v1/projects/:id/quality/inspect', waitForAI(async (req, res) => {
  const p = projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  let project = edl.getProject(p.id);
  if (!project) {
    project = edl.createProject(p.id, { name: p.name, description: p.description });
    if (p.type) project.extracted.type = p.type;
    if (p.area) project.extracted.area = p.area;
    if (p.floors) project.extracted.floors = p.floors;
  }
  if (!project.predicted?.totalArea) await workflow.stepAnalysis(project, p.description || '');
  await workflow.stepQuality(project);
  res.json({ projectId: p.id, ...project.quality, edlSource: 'EDL: qualityInspector' });
}));

// ─── Supplier Match ────────────────────
app.post('/api/v1/cmpep/match-supplier', waitForAI(async (req, res) => {
  const { category, city } = req.body || {};
  if (typeof category !== 'string' || !category.trim()) return res.status(400).json({ error: 'category is required' });
  const result = ai.supplierIntelligence.findBestSupplier(category.trim(), city);
  res.json({ platform: 'CMPEP', status: 'matched', ...result });
}));

// ─── Supplier Price Comparison ─────────
app.post('/api/v1/cmpep/compare-prices', waitForAI(async (req, res) => {
  const { category } = req.body || {};
  if (!category) return res.status(400).json({ error: 'category is required' });
  const comparison = ai.supplierIntelligence.comparePrices(category);
  res.json({ platform: 'CMPEP', status: 'analyzed', category, comparison });
}));

// ─── Supplier Market Analysis ──────────
app.post('/api/v1/supplier/market-analysis', waitForAI(async (req, res) => {
  const { region } = req.body || {};
  if (typeof region !== 'string' || !region.trim()) return res.status(400).json({ error: 'region is required' });
  const analysis = ai.supplierIntelligence.getMarketAnalysis(region);
  res.json(analysis);
}));

// ─── Platform: GGIP (GIS Geotechnical) ─
app.post('/api/v1/ggip/analyze-terrain', waitForAI(async (req, res) => {
  res.status(501).json({
    platform: 'GGIP', status: 'not_evaluated', error: 'verified_site_data_required',
    requiredInputs: ['surveyed boundaries', 'topographic survey', 'geotechnical report', 'groundwater observations', 'approved planning constraints'],
    message: 'Terrain and soil results are not inferred without verified project-specific surveys.'
  });
}));

// ─── Platform: ISEIP (IoT Sensors) ────
app.post('/api/v1/iseip/sensor-data', waitForAI(async (req, res) => {
  res.status(501).json({
    platform: 'ISEIP', status: 'not_evaluated', error: 'telemetry_connector_required',
    requiredInputs: ['authenticated device registry', 'timestamped sensor readings', 'calibration records', 'quality flags'],
    message: 'No IoT telemetry is fabricated when a verified device connector is unavailable.'
  });
}));

// ─── Platform: PMIAMP (Asset Health) ──
app.post('/api/v1/pmiamp/asset-health', waitForAI(async (req, res) => {
  res.status(501).json({
    platform: 'PMIAMP', status: 'not_evaluated', error: 'asset_telemetry_required',
    requiredInputs: ['asset register', 'maintenance history', 'meter readings', 'inspection results'],
    message: 'Asset health and failure probability require verified asset telemetry and a validated model.'
  });
}));

// ─── Platform: CRAEP (Robotics) ──────
app.post('/api/v1/craep/fleet-status', waitForAI(async (req, res) => {
  res.status(501).json({
    platform: 'CRAEP', status: 'not_evaluated', error: 'fleet_connector_required',
    requiredInputs: ['authenticated fleet inventory', 'robot state', 'mission logs', 'availability telemetry'],
    message: 'Fleet status is unavailable until a verified robotics connector is configured.'
  });
}));

// ─── Platform: EBISDP (Company Dashboard) ─
app.post('/api/v1/ebisdp/dashboard', waitForAI(async (req, res) => {
  const allProjects = store.getProjects();
  const total = allProjects.length;
  const active = allProjects.filter(project => ['Active', 'قيد التنفيذ'].includes(project.status)).length;
  const delayed = allProjects.filter(project => ['Delayed', 'متأخر'].includes(project.status)).length;
  const completed = allProjects.filter(project => ['Completed', 'مكتمل'].includes(project.status)).length;
  const totalCost = allProjects.reduce((s, p) => s + (p.cost || 0), 0);
  res.json({
    platform: 'EBISDP', status: 'partial',
    company: { projects: total, active, delayed, completed },
    financial: { recordedProjectBudgets: totalCost, revenue: null, profit: null, margin: null },
    healthIndex: null,
    limitations: ['Revenue, profit, margin, and organizational health are not available from the project store.']
  });
}));

// ─── Platform: SECIP (Carbon/Sustainability) ─
app.post('/api/v1/secip/carbon-footprint', waitForAI(async (req, res) => {
  res.status(501).json({
    platform: 'SECIP', status: 'not_evaluated', error: 'verified_lca_inputs_required',
    requiredInputs: ['quantity takeoff', 'EPD or approved emission factors', 'system boundary', 'energy model', 'factor versions'],
    message: 'Carbon, energy, and ESG scores are not estimated without governed life-cycle assessment inputs.'
  });
}));

// ─── Platform: QAIIP (Quality Inspection) ─
app.post('/api/v1/qaiip/inspection', waitForAI(async (req, res) => {
  const { projectId } = req.body || {};
  const p = projects.find(x => x.id === projectId);
  const pp = getProjectParams(p);
  const quality = ai.qualityInspector.inspectProject(pp.type, pp.totalArea, pp.floors, pp.finishing);
  const inspections = quality.defects.slice(0, 5).map((d, i) => ({
    id: `INS-${String(i + 1).padStart(3, '0')}`,
    defectType: d.type, severity: d.severity,
    status: d.severity === 'Critical' ? 'Failed' : d.severity === 'High' ? 'Conditional' : 'Passed',
    expectedCount: d.expectedCount, confidence: d.confidence
  }));
  res.json({
    platform: 'QAIIP', status: 'completed', inspections,
    qualityIndex: quality.qualityScore, passRate: Math.round((quality.qualityScore / 100) * 100) / 100,
    totalTrainingDefects: quality.totalTrainingDefects
  });
}));

// ─── Platform: SIAPP (Safety) ─────────
app.post('/api/v1/siapp/risk-assessment', waitForAI(async (req, res) => {
  const { projectId } = req.body || {};
  const p = projects.find(x => x.id === projectId);
  const pp = getProjectParams(p);
  const risks = ai.riskAnalyzer.analyzeRisks(pp.type, pp.totalArea, pp.floors);
  const alertCount = risks.risks.filter(r => r.score > 0.3).length;
  res.json({
    platform: 'SIAPP', status: 'analyzed',
    riskScore: risks.overallRiskScore, riskLevel: risks.riskLevel,
    alerts: alertCount, ppeCompliance: null,
    safetyIndex: null,
    limitations: ['PPE compliance and a safety index require verified site observations.'],
    topRisks: risks.risks.slice(0, 3).map(r => r.risk)
  });
}));

// ─── Platform: EASGP (Security) ──────
app.post('/api/v1/easgp/security-status', (req, res) => {
  res.json({
    platform: 'EASGP', status: 'configuration_only',
    users: null, activeSessions: null, complianceScore: null, threatsBlocked: null, lastAudit: null,
    controlsObserved: ['API authentication middleware', 'role authorization', 'tenant checks', 'request rate limiting'],
    limitations: ['This endpoint is not a security certification, audit, SIEM feed, or identity-provider report.']
  });
});

// ─── Platform: SADP (Developer API) ──
app.post('/api/v1/sadp/platform-status', (req, res) => {
  res.json({
    platform: 'SADP', status: 'configuration_only',
    apis: null, plugins: null, developers: null, avgResponseTime: null,
    message: 'Developer inventory and service-level metrics require a connected API catalog and observability backend.'
  });
});

// ─── Platform: GDLMSP (Multi-Country) ─
app.post('/api/v1/gdlmsp/country-status', (req, res) => {
  res.json({
    platform: 'GDLMSP', status: 'not_evaluated',
    countries: null, languages: null, currencies: null, standards: [], activeProjects: null,
    message: 'Country, currency, language, and standards configuration has not been verified for this deployment.'
  });
});

// ─── AI Project Visualizer (Visual Digital Twin) ──
app.post('/api/v1/visualizer/session', waitForAI(async (req, res) => {
  const { projectParams } = req.body || {};
  if (!projectParams) return res.status(400).json({ error: 'projectParams required' });
  const session = projectVisualizer.createSession(projectParams);
  res.json({ sessionId: session.id, visualIdentity: session.visualIdentity, createdAt: session.createdAt });
}));

app.post('/api/v1/visualizer/generate', waitForAI(async (req, res) => {
  const { sessionId, params } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  try {
    const result = await projectVisualizer.generateImage(sessionId, params || {});
    res.json({ status: 'completed', image: result });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
}));

app.post('/api/v1/visualizer/concepts', waitForAI(async (req, res) => {
  const { sessionId, count = 5, params } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  try {
    const concepts = await projectVisualizer.generateMultipleConcepts(sessionId, count, params || {});
    res.json({ status: 'completed', count: concepts.length, concepts });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
}));

app.post('/api/v1/visualizer/interior', waitForAI(async (req, res) => {
  const { sessionId, roomType, style } = req.body || {};
  if (!sessionId || !roomType) return res.status(400).json({ error: 'sessionId and roomType required' });
  try {
    const result = await projectVisualizer.generateInterior(sessionId, roomType, style || 'Contemporary');
    res.json({ status: 'completed', image: result });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
}));

app.post('/api/v1/visualizer/exterior', waitForAI(async (req, res) => {
  const { sessionId, params } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  try {
    const result = await projectVisualizer.generateExterior(sessionId, params || {});
    res.json({ status: 'completed', image: result });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
}));

app.post('/api/v1/visualizer/drone', waitForAI(async (req, res) => {
  const { sessionId, params } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  try {
    const result = await projectVisualizer.generateDrone(sessionId, params || {});
    res.json({ status: 'completed', image: result });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
}));

app.post('/api/v1/visualizer/video', waitForAI(async (req, res) => {
  const { sessionId, videoType, params, projectId } = req.body || {};
  if (!sessionId && !projectId) return res.status(400).json({ error: 'sessionId or projectId required' });
  const sid = sessionId || projectId;
  const vtype = videoType || 'walkthrough';
  try {
    const result = await projectVisualizer.generateVideo(sid, vtype, params || {});
    if (result && result.url && result.url.includes('example.com')) {
      res.json({ status: 'completed', video: { url: result.url, title: result.title || 'Construction Walkthrough', duration: result.duration || 30 }, mock: true });
    } else {
      res.json({ status: 'completed', video: result });
    }
  } catch (e) {
    res.json({ status: 'completed', video: { url: null, title: 'Simulation Video', duration: 30 }, mock: true });
  }
}));

app.post('/api/v1/visualizer/analyze-image', (req, res) => {
  const { imageData } = req.body || {};
  if (!imageData) return res.status(400).json({ error: 'imageData required' });
  const analysis = projectVisualizer.analyzeImage(imageData);
  res.json({ status: 'completed', analysis });
});

app.post('/api/v1/visualizer/analyze-room', (req, res) => {
  const { imageData } = req.body || {};
  if (!imageData) return res.status(400).json({ error: 'imageData required' });
  const analysis = projectVisualizer.analyzeRoom(imageData);
  res.json({ status: 'completed', analysis });
});

app.post('/api/v1/visualizer/compare', waitForAI(async (req, res) => {
  const { beforeImage, afterImage, projectData, sessionId } = req.body || {};
  if (!beforeImage || !afterImage) {
    const s = sessionId || req.body.params?.sessionId || 'default';
    res.json({ status: 'completed', comparison: { sessionId: s, differences: [], message: 'يرجى رفع صورتين للمقارنة (قبل/بعد)', imagesRequired: true } });
    return;
  }
  const result = projectVisualizer.compareBeforeAfter(beforeImage, afterImage, projectData || {});
  res.json({ status: 'completed', comparison: result });
}));

app.post('/api/v1/visualizer/compare-reality', waitForAI(async (req, res) => {
  const { realPhoto, predictedImage, projectParams } = req.body || {};
  if (!realPhoto || !predictedImage) return res.status(400).json({ error: 'realPhoto and predictedImage required' });
  const result = projectVisualizer.compareRealityVsPrediction(realPhoto, predictedImage, projectParams || {});
  res.json({ status: 'completed', comparison: result });
}));

app.post('/api/v1/visualizer/track-progress', waitForAI(async (req, res) => {
  const { imageHistory, timeline } = req.body || {};
  if (!imageHistory) return res.status(400).json({ error: 'imageHistory required' });
  const result = projectVisualizer.trackProgress(imageHistory, timeline || []);
  res.json({ status: 'completed', progress: result });
}));

app.post('/api/v1/visualizer/approve', waitForAI(async (req, res) => {
  const { sessionId, imageId } = req.body || {};
  if (!sessionId || !imageId) return res.status(400).json({ error: 'sessionId and imageId required' });
  const result = projectVisualizer.approveDesign(sessionId, imageId);
  if (!result) return res.status(404).json({ error: 'Session or image not found' });
  res.json({ status: 'approved', image: result });
}));

app.post('/api/v1/visualizer/reject', waitForAI(async (req, res) => {
  const { sessionId, imageId, reason } = req.body || {};
  if (!sessionId || !imageId) return res.status(400).json({ error: 'sessionId and imageId required' });
  const result = projectVisualizer.rejectDesign(sessionId, imageId, reason || '');
  if (!result) return res.status(404).json({ error: 'Session or image not found' });
  res.json({ status: 'rejected', image: result });
}));

app.get('/api/v1/visualizer/session/:id', (req, res) => {
  const session = projectVisualizer.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ session });
});

app.get('/api/v1/visualizer/models', (req, res) => {
  const models = projectVisualizer.getAvailableModels();
  res.json({ models });
});

app.get('/api/v1/visualizer/estimate-cost', (req, res) => {
  const { model, imageType } = req.query;
  const cost = projectVisualizer.estimateCost(model, imageType, {});
  res.json({ estimatedCost: cost });
});

app.post('/api/v1/visualizer/boq-impact', waitForAI(async (req, res) => {
  const { sessionId, materialChanges } = req.body || {};
  if (!sessionId || !materialChanges) return res.status(400).json({ error: 'sessionId and materialChanges required' });
  const report = projectVisualizer.generateBOQImpactReport(sessionId, materialChanges);
  if (!report) return res.status(404).json({ error: 'Session not found' });
  res.json({ status: 'completed', report });
}));

// ─── Vision Context Builder ──
const VisionContextBuilder = require('./packages/vision-context-builder');
const visionContext = new VisionContextBuilder(edl);

app.post('/api/v1/vision-context/:projectId', async (req, res) => {
  const ctx = await visionContext.buildContext(req.params.projectId);
  if (!ctx) return res.status(404).json({ error: 'Project not found' });
  res.json({ status: 'completed', context: ctx });
});

app.post('/api/v1/vision-context/:projectId/prompt', async (req, res) => {
  const result = await visionContext.getPrompt(req.params.projectId, req.body || {});
  if (!result) return res.status(404).json({ error: 'Project not found' });
  res.json({ status: 'completed', prompt: result.prompt, context: result.context, promptType: result.promptType, stage: result.stage, materials: result.materials });
});

// ─── Digital Project Profile (Phase 1) ──
app.post('/api/v1/project-profile/:projectId', async (req, res) => {
  try {
    const projectData = await store.findProject(req.params.projectId);
    if (!projectData) return res.status(404).json({ error: 'مشروع غير موجود' });
    const project = edl.getProject(req.params.projectId) || edl.createProject(req.params.projectId, projectData.metadata || {});
    if (projectData.aiAnalysis) project.fromJSON(projectData.aiAnalysis);
    const profile = ai.projectProfiler.buildProfile(project);
    project.setDigitalProfile(profile);
    res.json({ status: 'completed', profile });
  } catch (e) {
    console.error('[PROFILE] Error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/v1/project-profile/:projectId', async (req, res) => {
  try {
    const project = edl.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'مشروع غير موجود' });
    if (!project.digitalProfile) return res.status(404).json({ error: 'الملف الرقمي غير موجود، قم بإنشائه أولاً' });
    res.json({ status: 'completed', profile: project.digitalProfile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Job Queue & Logging System ──
const VisionAICore = require('./packages/vision-ai/core');
if (typeof promptBridge !== 'undefined' && promptBridge) {
  VisionAICore.setPromptBridge(promptBridge);
}
const genJobs = new Map();
let jobCounter = 0;

function genLog(jobId, step, detail) {
  const entry = { time: new Date().toISOString(), step, detail };
  const job = genJobs.get(jobId);
  if (job) { if (!job.logs) job.logs = []; job.logs.push(entry); }
  console.log(`[Gen][${jobId || '?'}] ${step}: ${detail}`);
}

function createJob(projectId, type, prompt, options) {
  if (genJobs.size >= 1000) {
    const completed = Array.from(genJobs.values())
      .filter(entry => ['completed', 'failed'].includes(entry.status))
      .sort((left, right) => new Date(left.completedAt) - new Date(right.completedAt));
    while (genJobs.size >= 1000 && completed.length > 0) genJobs.delete(completed.shift().id);
    if (genJobs.size >= 1000) throw new Error('Legacy vision queue is at capacity');
  }
  jobCounter++;
  const jobId = 'gen-' + Date.now() + '-' + jobCounter;
  const job = {
    id: jobId, projectId, type, prompt, options: options || {},
    status: 'queued', progress: 0, step: 'جارٍ تحليل المشروع...',
    createdAt: new Date().toISOString(), startedAt: null, completedAt: null,
    result: null, error: null, logs: []
  };
  genJobs.set(jobId, job);
  genLog(jobId, 'QUEUE', `Job created for project ${projectId}, type ${type}`);
  return job;
}

function updateJob(jobId, updates) {
  const job = genJobs.get(jobId);
  if (!job) return;
  Object.assign(job, updates);
}

async function processGenerationJob(jobId, prompt) {
  const job = genJobs.get(jobId);
  if (!job) return;
  const startTime = Date.now();

  updateJob(jobId, { status: 'processing', startedAt: new Date().toISOString(), progress: 5, step: 'تحليل بيانات المشروع...' });
  genLog(jobId, 'CONTROLLER', 'Entered real Vision AI pipeline');

  try {
    // ── 1. Load project data and build projectParams ──
    const project = store.findProject(job.projectId);
    if (!project) throw new Error('لم يتم العثور على المشروع');

    let edlProject = null;
    try { edlProject = edl ? edl.getProject(job.projectId) : null; } catch (e) { /* ignore */ }

    const extracted = edlProject ? edlProject.extracted : {};
    const building = edlProject ? edlProject.building : {};
    const boq = edlProject ? edlProject.boq : { items: [] };

    const type = edlProject ? edlProject.getEffective('type').value : (extracted.type || project.type || null);
    const floors = edlProject ? edlProject.getEffective('floors').value : (extracted.floors || project.floors || null);
    const area = edlProject ? edlProject.getEffective('area').value : (extracted.area || project.area || null);
    const city = edlProject ? edlProject.getEffective('city').value : (extracted.city || project.city || null);

    const topMaterials = boq.items && boq.items.length > 0
      ? [...new Set(boq.items.filter(i => i.material).map(i => i.material))].slice(0, 8)
      : (building.materials || []).slice(0, 8);

    const topSpaces = building.spaces && building.spaces.length > 0
      ? building.spaces.slice(0, 6).map(s => s.name || s.type || 'Space')
      : null;

    const projectParams = {
      type,
      area,
      floors,
      city,
      style: project.style || extracted.style || null,
      description: project.description || null,
      materials: topMaterials.length > 0 ? topMaterials : null,
      spaces: topSpaces,
      structureType: building.structureType || predicted.structureType || null,
      finishing: building.finishing || extracted.finishing || null,
      hasBasement: building.hasBasement || false,
      roofType: building.roofType || null,
      mepSystems: building.systems || null,
    };

    const phase = job.options.phase || extracted.phase || project.phase || 'Completed';
    const viewType = job.options.angle || job.options.viewType || 'front';

    genLog(jobId, 'PROJECT', `Type=${type}, Area=${area}, Floors=${floors}, City=${city}, Phase=${phase}`);

    // ── 2. Generate via real Vision AI pipeline ──
    updateJob(jobId, { progress: 20, step: 'تجهيز Prompt احترافي...' });
    genLog(jobId, 'PROMPT', 'Building professional prompt from project data');

    updateJob(jobId, { progress: 35, step: 'جارٍ إرسال الطلب إلى مزود التوليد...' });
    genLog(jobId, 'PROVIDER', 'Calling VisionAICore.images.generate()');

    updateJob(jobId, { progress: 50, step: 'في انتظار استجابة الذكاء الاصطناعي...' });
    genLog(jobId, 'WAITING', 'Waiting for AI model response');

    const result = await VisionAICore.images.generate(job.projectId, projectParams, {
      phase,
      viewType,
      provider: job.options.model || null,
      style: projectParams.style || undefined,
      renderingStyle: job.options.renderingStyle || 'Photorealistic',
      weather: job.options.weather || null,
      width: 1024,
      height: 768,
      steps: 10,
    });

    const elapsed = Date.now() - startTime;
    genLog(jobId, 'RECEIVE', `Image received from ${result.provider}/${result.model} in ${elapsed}ms, size: ${result.imageBuffer ? result.imageBuffer.length + ' bytes' : 'unknown'}`);

    if (!result.imageBuffer || !result.url || result.mediaScreening?.passed !== true) {
      throw new Error('لم يجتز ناتج الصورة فحص الوسائط التقني');
    }
    genLog(jobId, 'VERIFY', 'Image passed technical media screening; semantic engineering review remains required');
    genLog(jobId, 'TRAINING', 'Automatic training capture is disabled; governed intake and rights review are required');

    updateJob(jobId, {
      progress: 100,
      step: 'اكتمل التوليد',
      status: 'completed',
      completedAt: new Date().toISOString(),
      result: {
        imageUrl: result.url,
        prompt: result.prompt || prompt,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        model: result.model || 'unknown',
        provider: result.provider || 'unknown',
        seed: result.seed || null,
        width: result.width || 1024,
        height: result.height || 768,
        elapsed,
        phase: result.phase || phase,
        engineeringValidated: false,
        requiresExternalReview: true,
        metadata: {
          prompt: result.prompt,
          model: result.model,
          provider: result.provider,
          seed: result.seed,
          width: result.width,
          height: result.height,
          phase: result.phase || phase,
          generationTimeMs: elapsed,
        },
      },
    });
    genLog(jobId, 'COMPLETE', `Generation completed successfully in ${elapsed}ms via ${result.provider}/${result.model}`);
  } catch (e) {
    genLog(jobId, 'ERROR', `Generation failed: ${e.message}`);
    updateJob(jobId, {
      progress: 0,
      status: 'failed',
      error: e.message,
      completedAt: new Date().toISOString(),
    });
  }
}

// ─── Async Generation Endpoint (creates job, returns immediately) ──
app.post('/api/v1/vision-generate', async (req, res) => {
  const { projectId, type, angle, renderingStyle, weather, model, image, roomType, phase } = req.body || {};
  if (!projectId) return res.status(400).json({ error: 'projectId required' });
  genLog('?', 'API', `POST /api/v1/vision-generate projectId=${projectId} type=${type || 'exterior'}`);
  const promptResult = await visionContext.getPrompt(projectId, { type, angle, renderingStyle, weather, model });
  if (!promptResult) return res.status(404).json({ error: 'Project not found' });
  const job = createJob(projectId, type || 'exterior', promptResult.prompt, { angle, renderingStyle, weather, model, roomType, phase, image });
  genLog(job.id, 'API', `Job created, returning jobId=${job.id}`);
  setImmediate(() => processGenerationJob(job.id, promptResult.prompt));
  res.json({ status: 'queued', jobId: job.id, message: 'تمت إضافة المهمة إلى قائمة الانتظار' });
});

// ─── Generation Status (Polling) ──
app.get('/api/v1/vision-generate/status/:jobId', (req, res) => {
  const job = genJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    jobId: job.id, status: job.status, progress: job.progress,
    step: job.step, createdAt: job.createdAt, startedAt: job.startedAt,
    completedAt: job.completedAt, result: job.result, error: job.error,
    logs: job.logs
  });
});

// ─── All Generation Jobs ──
app.get('/api/v1/vision-jobs', (req, res) => {
  const jobs = Array.from(genJobs.values()).map(j => ({
    id: j.id, projectId: j.projectId, type: j.type,
    status: j.status, progress: j.progress, step: j.step,
    createdAt: j.createdAt, completedAt: j.completedAt
  }));
  res.json({ jobs });
});

// ─── Full Analysis Endpoint (legacy contract backed by the real orchestrator) ──
app.post('/api/v1/full-analysis', waitForAI(async (req, res) => {
  const { description, projectId } = req.body || {};
  if (!description && !projectId) return res.status(400).json({ error: 'description or projectId required' });
  if (!orchestrator) return res.status(503).json({ error: 'orchestrator_not_ready' });

  const storedProject = projectId ? store.findProject(projectId) : null;
  const rawDescription = String(description || storedProject?.description || '').trim();
  if (!rawDescription) return res.status(422).json({ error: 'project_description_required' });
  const extracted = parseDescription(rawDescription);
  if ((!extracted.area || !extracted.floors) && storedProject) {
    extracted.area = extracted.area || storedProject.area || null;
    extracted.floors = extracted.floors || storedProject.floors || null;
    extracted.type = extracted.type === 'Unknown' ? storedProject.type : extracted.type;
    extracted.city = extracted.city || storedProject.region || null;
  }
  const sufficiency = hasSufficientInfo(extracted);
  if (!sufficiency.sufficient) return insufficientResponse(res, sufficiency.missing);

  const id = projectId || `proj-${Date.now()}`;
  if (!projectId) tenantRegistry.assign(id, req.tenantId);
  const project = edl.getProject(id) || edl.createProject(id, {
    name: storedProject?.name || rawDescription.slice(0, 120),
    description: rawDescription,
    tenantId: req.tenantId
  });
  project.rawInput.description = rawDescription;
  project.setExtracted(extracted);
  const startedAt = Date.now();
  const result = await orchestrator.runFullPipeline(project, rawDescription, () => extracted);
  if (!result.ok) {
    return res.status(422).json({
      projectId: id,
      status: 'failed',
      failedStep: result.failedStep || null,
      error: result.error,
      workflow: result.steps,
      traceability: project.trace.slice(-50)
    });
  }
  res.json({
    projectId: id,
    status: 'completed',
    facts: {
      projectType: { value: project.getEffective('type').value, confidence: project.extracted.typeConfidence || 0 },
      floors: project.getEffective('floors').value,
      hasBasement: project.building.hasBasement,
      spaces: project.building.spaces,
      region: project.extracted.city,
      finishing: project.digitalProfile?.finishing?.value || null
    },
    extracted: project.extracted,
    building: project.building,
    boq: project.boq,
    cost: project.cost,
    schedule: project.schedule,
    risks: project.risks,
    quality: project.quality,
    digitalProfile: project.digitalProfile,
    workflow: result.steps,
    validation: result.validation,
    traceability: project.trace.slice(-50),
    metadata: {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startedAt,
      aiTrained: aiReady,
      edlVersion: '1.0',
      simulatedDefaultsUsed: false
    }
  });
}));

// ─── Knowledge Base (Phase 8) ──
app.get('/api/v1/knowledge-base/stats', (req, res) => {
  try {
    res.json(ai.knowledgeEngine.getStatistics());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-base/projects', (req, res) => {
  try {
    const { type, minArea, maxArea, limit } = req.query;
    const results = ai.knowledgeEngine.getRecordedProjects({ type, minArea: Number(minArea) || 0, maxArea: Number(maxArea) || 0, limit: Number(limit) || 50 });
    res.json({ count: results.length, projects: results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/knowledge-base/record-project', async (req, res) => {
  try {
    const { projectId } = req.body || {};
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const projectData = await store.findProject(projectId);
    if (!projectData) return res.status(404).json({ error: 'مشروع غير موجود' });
    const proj = edl.getProject(projectId) || edl.createProject(projectId, projectData.metadata || {});
    if (projectData.aiAnalysis) proj.fromJSON(projectData.aiAnalysis);
    const entry = ai.knowledgeEngine.recordProject(proj, proj.boq, proj.cost, proj.digitalProfile);
    res.json({ status: 'recorded', entry });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-base/similar', (req, res) => {
  try {
    const { type, area, floors, city, limit } = req.query;
    const results = ai.knowledgeEngine.findSimilarProjects(type || null, Number(area) || null, Number(floors) ?? null, city, Number(limit) || 5);
    res.json({ count: results.length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-base/standard-quantities', (req, res) => {
  try {
    const { type, area } = req.query;
    if (type) {
      if (area) return res.json(ai.knowledgeEngine.estimateStandardMaterials(type, Number(area)));
      return res.json(ai.knowledgeEngine.getStandardQuantities(type));
    }
    res.json(ai.knowledgeEngine.standards.data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-base/productivity', (req, res) => {
  try {
    res.json(ai.knowledgeEngine.getProductivity());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Multi-Agent Pipeline (Phase 3) ──
app.post('/api/v1/agent-pipeline/run', async (req, res) => {
  try {
    const { projectId } = req.body || {};
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const pipeline = ai.getAgentPipeline();
    if (!pipeline) return res.status(503).json({ error: 'Agent pipeline not initialized' });
    const projectData = await store.findProject(projectId);
    if (!projectData) return res.status(404).json({ error: 'مشروع غير موجود' });
    const proj = edl.getProject(projectId) || edl.createProject(projectId, projectData.metadata || {});
    if (projectData.aiAnalysis) proj.fromJSON(projectData.aiAnalysis);
    if (!proj.digitalProfile && ai.projectProfiler) {
      const p = ai.projectProfiler.buildProfile(proj);
      proj.setDigitalProfile(p);
    }
    const result = await pipeline.runAll(proj);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/agent-pipeline/status', (req, res) => {
  try {
    const pipeline = ai.getAgentPipeline();
    if (!pipeline) return res.json({ initialized: false });
    res.json({ initialized: true, agentCount: 12, agents: Object.keys(pipeline.agents).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Knowledge Graph (Phase 2) ──
app.get('/api/v1/knowledge-graph', (req, res) => {
  try {
    res.json({ nodes: ai.knowledgeGraph.getAllNodes(), edges: ai.knowledgeGraph.edges });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-graph/node/:id', (req, res) => {
  try {
    const node = ai.knowledgeGraph.getNode(req.params.id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    res.json({ node, dependencies: ai.knowledgeGraph.getDependencies(req.params.id), dependents: ai.knowledgeGraph.getDependents(req.params.id) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-graph/sequence', (req, res) => {
  try {
    res.json({ sequence: ai.knowledgeGraph.getConstructionSequence() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Review System (Phase 6) ──
function ensureProject(projectId, projectData) {
  const proj = edl.getProject(projectId) || edl.createProject(projectId, projectData.metadata || {});
  if (projectData.aiAnalysis) proj.fromJSON(projectData.aiAnalysis);
  if (!proj.boq?.items?.length) {
    const type = projectData.type || proj.extracted?.type || null;
    const area = projectData.area || proj.extracted?.area || null;
    const floors = projectData.floors || proj.extracted?.floors || null;
    const city = projectData.city || proj.extracted?.city || null;
    try {
      const boq = ai.quantityEstimator.estimateBOQ(type, area, floors, 'Standard', city, {});
      if (boq && boq.items) proj.boq.items = boq.items;
    } catch (_) {}
  }
  return proj;
}

app.post('/api/v1/review/items', async (req, res) => {
  try {
    const { projectId } = req.body || {};
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const projectData = await store.findProject(projectId);
    if (!projectData) return res.status(404).json({ error: 'مشروع غير موجود' });
    const proj = ensureProject(projectId, projectData);
    const rs = ai.getReviewSystem();
    const items = proj.boq?.items || [];
    const params = { type: proj.extracted?.type || null, area: proj.extracted?.area, floors: proj.extracted?.floors, city: proj.extracted?.city };
    const review = rs.reviewAllItems(items, params);
    res.json(review);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Continuous Learning (Phase 7) ──
app.post('/api/v1/learning/record-approval', async (req, res) => {
  try {
    const { projectId } = req.body || {};
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const projectData = await store.findProject(projectId);
    if (!projectData) return res.status(404).json({ error: 'مشروع غير موجود' });
    const proj = ensureProject(projectId, projectData);
    const cl = ai.getContinuousLearner();
    const entry = cl.recordApprovedProject(proj, proj.digitalProfile, proj.boq, proj.cost);
    res.json({ status: 'recorded', entry });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/learning/record-execution', async (req, res) => {
  try {
    const { projectId, actualBOQ } = req.body || {};
    if (!projectId || !actualBOQ) return res.status(400).json({ error: 'projectId and actualBOQ required' });
    const projectData = await store.findProject(projectId);
    if (!projectData) return res.status(404).json({ error: 'مشروع غير موجود' });
    const proj = edl.getProject(projectId);
    const expected = proj?.boq?.items || [];
    const cl = ai.getContinuousLearner();
    const fb = cl.recordExecutionFeedback(projectId, expected, actualBOQ);
    res.json({ feedback: fb });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/learning/stats', (req, res) => {
  try {
    res.json(ai.getContinuousLearner().getStatistics());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/learning/price-trends', (req, res) => {
  try {
    res.json(ai.getContinuousLearner().getPriceTrends());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Quality Indicators (Phase 17) ──
app.post('/api/v1/quality/assess', async (req, res) => {
  try {
    const { projectId } = req.body || {};
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const projectData = await store.findProject(projectId);
    if (!projectData) return res.status(404).json({ error: 'مشروع غير موجود' });
    const proj = ensureProject(projectId, projectData);
    const qi = ai.getQualityIndicators();
    const assessment = qi.assess(proj, proj.boq?.items || [], {});
    res.json(assessment);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Visual Linkage (Phase 10+11) ──
app.post('/api/v1/visual-linkage/item-prompt', async (req, res) => {
  try {
    const { projectId, itemCode } = req.body || {};
    if (!projectId || !itemCode) return res.status(400).json({ error: 'projectId and itemCode required' });
    const projectData = await store.findProject(projectId);
    if (!projectData) return res.status(404).json({ error: 'مشروع غير موجود' });
    const proj = ensureProject(projectId, projectData);
    const item = (proj.boq?.items || []).find(i => i.code === itemCode);
    if (!item) return res.status(404).json({ error: 'البند غير موجود' });
    const vl = ai.getVisualLinkage();
    res.json(vl.generateItemPrompt(item, proj));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/visual-linkage/phase-prompts', async (req, res) => {
  try {
    const { projectId } = req.body || {};
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const projectData = await store.findProject(projectId);
    if (!projectData) return res.status(404).json({ error: 'مشروع غير موجود' });
    const proj = ensureProject(projectId, projectData);
    const vl = ai.getVisualLinkage();
    res.json({ phases: vl.generatePhasePrompts(proj, proj.boq?.items || []) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/visual-linkage/video-script', async (req, res) => {
  try {
    const { projectId } = req.body || {};
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const projectData = await store.findProject(projectId);
    if (!projectData) return res.status(404).json({ error: 'مشروع غير موجود' });
    const proj = ensureProject(projectId, projectData);
    const vl = ai.getVisualLinkage();
    res.json(vl.generateVideoScript(proj, proj.boq?.items || []));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Cloud AI Image Generation (legacy sync) ──
app.post('/api/v1/ai/generate-image', async (req, res) => {
  const { prompt } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 4000) return res.status(400).json({ error: 'prompt must contain 1 to 4000 characters' });

  try {
    const result = await VisionAICore.images.generate('direct', { description: prompt }, {
      phase: 'Completed',
      viewType: 'front',
      width: 1024,
      height: 768,
      additional: prompt,
    });

    if (!result || !result.imageBuffer) {
      throw new Error('لم يتم استلام صورة من مزود التوليد');
    }
    return res.json({
      status: 'completed',
      image: {
        imageUrl: result.url,
        prompt: result.prompt,
        mimeType: result.mimeType,
        engineeringValidated: false,
        requiresExternalReview: true,
        metadata: { model: result.model, provider: result.provider, seed: result.seed, width: result.width, height: result.height },
      },
    });
  } catch (e) {
    return res.status(503).json({
      status: 'error',
      error: `فشل توليد الصورة: ${e.message}`,
      hint: 'تأكد من تشغيل مزود توليد (Stable Diffusion محلي، أو ضبط REPLICATE_API_KEY أو OPENAI_API_KEY)',
    });
  }
});

// ─── Construction Simulation (Time-Lapse) ──
app.post('/api/v1/simulation/session', waitForAI(async (req, res) => {
  const { projectParams } = req.body || {};
  if (!projectParams) return res.status(400).json({ error: 'projectParams required' });
  const session = constructionSimulation.createSession(projectParams);
  res.json({ sessionId: session.id, createdAt: session.createdAt });
}));

app.post('/api/v1/simulation/generate', waitForAI(async (req, res) => {
  const { sessionId, params } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  try {
    const video = constructionSimulation.generateSimulation(sessionId, params || {});
    res.json({ status: 'completed', simulation: video });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
}));

app.post('/api/v1/simulation/validate', waitForAI(async (req, res) => {
  const { sessionId, stages } = req.body || {};
  if (!sessionId || !stages) return res.status(400).json({ error: 'sessionId and stages required' });
  try {
    const validation = constructionSimulation.validateProject(sessionId, stages);
    res.json({ status: 'completed', validation });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
}));

app.post('/api/v1/simulation/predict', waitForAI(async (req, res) => {
  const { sessionId, currentProgress, currentStage } = req.body || {};
  if (!sessionId || currentProgress === undefined) return res.status(400).json({ error: 'sessionId and currentProgress required' });
  try {
    const prediction = constructionSimulation.predictProgress(sessionId, currentProgress, currentStage);
    res.json({ status: 'completed', prediction });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
}));

app.post('/api/v1/simulation/compare-reality', waitForAI(async (req, res) => {
  const { sessionId, sitePhotos, predictedStage } = req.body || {};
  if (!sessionId || !sitePhotos || !predictedStage) return res.status(400).json({ error: 'sessionId, sitePhotos, predictedStage required' });
  const comparison = constructionSimulation.compareReality(sessionId, sitePhotos, predictedStage);
  res.json({ status: 'completed', comparison });
}));

app.post('/api/v1/simulation/compare-videos', waitForAI(async (req, res) => {
  const { sessionId, videoId1, videoId2 } = req.body || {};
  if (!sessionId || !videoId1 || !videoId2) return res.status(400).json({ error: 'sessionId, videoId1, videoId2 required' });
  try {
    const comparison = constructionSimulation.compareSimulations(sessionId, videoId1, videoId2);
    res.json({ status: 'completed', comparison });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
}));

app.post('/api/v1/simulation/scenarios', waitForAI(async (req, res) => {
  const { sessionId, params } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  const scenarios = constructionSimulation.generateMultipleScenarios(sessionId, params || {});
  res.json({ status: 'completed', count: scenarios.length, scenarios });
}));

app.post('/api/v1/simulation/feedback', (req, res) => {
  const { sessionId, videoId, action, details } = req.body || {};
  if (!sessionId || !videoId || !action) return res.status(400).json({ error: 'sessionId, videoId, action required' });
  const result = constructionSimulation.recordFeedback(sessionId, videoId, action, details);
  res.json({ status: 'recorded', ...result });
});

app.get('/api/v1/simulation/session/:id', (req, res) => {
  const session = constructionSimulation.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ session });
});

app.get('/api/v1/simulation/stages', (req, res) => {
  const mode = req.query.mode || '';
  const stages = mode ? constructionSimulation.stageLogic.getStagesForMode(mode) : constructionSimulation.stageLogic.getAllStages();
  res.json({ stages });
});

app.get('/api/v1/simulation/modes', (req, res) => {
  res.json({ modes: constructionSimulation.getSupportedModes() });
});

app.get('/api/v1/simulation/cameras', (req, res) => {
  res.json({ cameras: constructionSimulation.getSupportedCameras() });
});

app.get('/api/v1/simulation/resolutions', (req, res) => {
  res.json({ resolutions: constructionSimulation.getSupportedResolutions() });
});

app.get('/api/v1/simulation/durations', (req, res) => {
  res.json({ durations: constructionSimulation.getSupportedDurations() });
});

app.get('/api/v1/simulation/weather', (req, res) => {
  res.json({ weather: constructionSimulation.getSupportedWeather() });
});

// ─── ACEP Vision AI Module ──
let visionAICore = null;
try {
  const visionAIRoutes = require('./packages/vision-ai/api/routes');
  visionAIRoutes.createRouter(app, {
    boqEngine,
    projectProfiler: ai.projectProfiler,
    engineeringOrchestrator,
    aiEngine: ai,
  }, edl);
  visionAICore = require('./packages/vision-ai/core');
  console.log('  ✓ ACEP Vision AI module loaded');
} catch (e) {
  console.log('  ⚠ ACEP Vision AI module not available:', e.message);
}

// ─── Initialize Training Data Bridge ──
const trainingBridge = new TrainingDataBridge();
try {
  const bridgeStats = trainingBridge.loadAll();
  console.log(`  ✓ Training Data Bridge: ${bridgeStats.totalRecords} records from ${Object.keys(bridgeStats.sources).length} sources`);
  Object.entries(bridgeStats.sources).forEach(([key, s]) => {
    if (s.status === 'loaded') console.log(`    - ${key}: ${s.count} records`);
  });
} catch (e) {
  console.log('  ⚠ Training Data Bridge init error:', e.message);
}

// ─── Initialize Knowledge Dataset Loader ──
const KnowledgeDatasetLoader = require('./packages/ai-engine/knowledge-dataset-loader');
const knowledgeDataset = new KnowledgeDatasetLoader(trainingBridge);
try {
  knowledgeDataset.initialize();
  const dsStats = knowledgeDataset.getStats();
  console.log(`  ✓ Knowledge Dataset: ${dsStats.projectTypes} project types, ${dsStats.unitPriceItems} BOQ items, ${dsStats.materials} materials, ${dsStats.laborTrades} labor trades`);
} catch (e) {
  console.log('  ⚠ Knowledge Dataset init error:', e.message);
}

// Feed dataset into knowledge engine (replaces hardcoded standards)
try {
  if (ai && ai.knowledgeEngine && ai.knowledgeEngine.setDatasetLoader) {
    ai.knowledgeEngine.setDatasetLoader(knowledgeDataset);
    console.log('  ✓ Knowledge Engine updated with dataset-driven standard quantities');
  }
} catch (e) {
  console.log('  ⚠ Knowledge Engine dataset load error:', e.message);
}

// ─── Initialize Data Standards (Phase 3) ──
const DataStandards = require('./packages/ai-engine/data-standards');
const dataStandards = new DataStandards();
console.log(`  ✓ Data Standards: ${dataStandards.getStats().schemas} schemas, ${dataStandards.getStats().unitStandards} unit standards`);

// ─── Initialize Data Quality Pipeline (Phase 4) ──
const DataQualityPipeline = require('./packages/ai-engine/data-quality-pipeline');
const dataQualityPipeline = new DataQualityPipeline(dataStandards, trainingBridge, knowledgeDataset);
try {
  const qcResult = dataQualityPipeline.runFullCheck();
  console.log(`  ✓ Data Quality: ${qcResult.overall.grade} grade (${qcResult.overall.qualityScore}%), ${qcResult.overall.anomalyCount} anomalies, ${qcResult.overall.consistencyIssues} consistency issues`);
} catch (e) {
  console.log('  ⚠ Data Quality init error:', e.message);
}

// ─── Initialize AI Orchestrator (after all modules are loaded) ──
let navEngine = null;
try {
  navEngine = require('./packages/vision-ai/engines/3d-engine');
} catch (e) {
  console.log('  ⚠ 3D Engine not available for orchestrator:', e.message);
}
try {
  orchestrator = new AIOrchestrator(ai, edl, visionAICore, navEngine, trainingBridge);
  console.log('  ✓ AI Orchestrator ready — sequence:', orchestrator.getSequence().join(' → '));
} catch (e) {
  console.log('  ⚠ AI Orchestrator init error:', e.message);
}

function configuredExternalEngines() {
  const llmProvider = String(process.env.ACEP_LLM_PROVIDER || 'none').trim().toLowerCase();
  const llmConfigured = llmProvider === 'openai'
    ? Boolean(process.env.OPENAI_API_KEY && process.env.ACEP_LLM_MODEL)
    : llmProvider === 'together'
      ? Boolean(process.env.TOGETHER_API_KEY && process.env.ACEP_LLM_MODEL)
      : false;
  const visionProviders = visionAICore?.getProviders ? visionAICore.getProviders().map(provider => ({
    id: provider.name,
    kind: provider.type,
    configured: provider.configured,
    ready: false,
    status: provider.configured ? 'configured_not_verified' : 'not_configured',
    note: provider.configured
      ? 'A live provider request is required before this provider is marked ready.'
      : 'Provider credentials and an immutable model identifier are required.'
  })) : [];
  return [
    {
      id: 'llm-review', kind: 'language', provider: llmProvider,
      configured: llmConfigured, ready: false,
      status: llmConfigured ? 'configured_not_verified' : 'not_configured',
      note: llmConfigured
        ? 'A live provider request is required before this provider is marked ready.'
        : 'Set ACEP_LLM_PROVIDER, ACEP_LLM_MODEL, and the matching provider secret.'
    },
    ...visionProviders
  ];
}

function coreEngineCatalog() {
  const status = ai.getStatus();
  const readiness = {
    PUE: status.projectAnalyzer,
    VBE: status.projectAnalyzer,
    BOQ: status.quantityEstimator,
    COST: status.costEstimator,
    TIME: status.scheduleOptimizer,
    RISK: status.riskAnalyzer,
    QUALITY: status.qualityInspector,
    SAFETY: status.riskAnalyzer,
    ESG: true,
    SUPPLY: status.supplierIntelligence
  };
  return Object.entries(ENGINE_LABELS).map(([code, label]) => {
    const ready = Boolean(aiReady && readiness[code]);
    const supplierVerified = code !== 'SUPPLY' || ai.supplierIntelligence.dataVerified;
    return {
      code,
      label,
      registered: true,
      ready,
      status: ready
        ? (supplierVerified ? 'ready_for_experiment' : 'ready_to_assess_inputs_no_verified_market_data')
        : 'initializing',
      execution: code === 'ESG' ? 'qualitative_target_review_until_lca_inputs_are_supplied' : 'local_cpu',
      recommendationReady: code === 'SUPPLY' ? Boolean(ready && supplierVerified) : undefined
    };
  });
}

function stepState(stepMap, names) {
  const steps = names.map(name => stepMap.get(name)).filter(Boolean);
  const durationMs = steps.reduce((sum, step) => sum + (step.durationMs || 0), 0);
  if (!steps.length) return { status: 'not_run', durationMs: 0, executed: false };
  if (steps.some(step => step.status === 'failed')) return { status: 'failed', durationMs, executed: true };
  if (steps.some(step => step.status === 'blocked')) return { status: 'blocked', durationMs, executed: false };
  const executed = steps.some(step => step.status === 'completed');
  return { status: executed ? 'completed' : 'skipped', durationMs, executed };
}

function buildSafetyProjection(brief, effective) {
  const modelType = String(effective.modelType || brief.type || '').trim().toLowerCase();
  const grossArea = Number(effective.grossBuiltArea) > 0
    ? Number(effective.grossBuiltArea)
    : Math.max(1, Number(effective.area) || 1) * Math.max(1, Number(effective.floors) || 1);
  const floors = Math.max(1, Number(effective.floors) || 1);
  const basements = Math.max(0, Number(effective.basements) || 0);
  const definitions = [
    ['Excavation and temporary support', 0.78 + basements * 0.05, 1.02, 'Approve excavation, shoring, access, and inspection controls before work starts.', basements > 0 || grossArea > 1000],
    ['Work at height and falling objects', 0.80 + Math.min(0.12, floors / 120), 1.08, 'Use engineered access, edge protection, lifting exclusion zones, and permit controls.', floors > 1 || ['bridge', 'tower', 'telecom'].includes(modelType)],
    ['Lifting and mobile plant interfaces', 0.76, 1.04, 'Approve lifting plans, segregate people and plant, and verify competent operators.', grossArea > 500 || ['port', 'factory', 'warehouse'].includes(modelType)],
    ['Electrical energization and temporary power', 0.70, 1.12, 'Apply isolation, lockout/tagout, inspection, and controlled energization procedures.', true],
    ['Hot work and fire load', 0.66, 1.08, 'Use permits, fire watch, combustible controls, and tested emergency arrangements.', true]
  ];
  const specific = {
    hospital: [
      ['Medical gas installation and commissioning', 0.72, 1.18, 'Segregate oxygen-compatible work, verify cleanliness, and independently witness testing.', true],
      ['Clinical systems commissioning interfaces', 0.68, 1.12, 'Coordinate energization and testing under a clinical commissioning safety plan.', true]
    ],
    tunnel: [
      ['Confined-space atmosphere and egress', 0.88, 1.20, 'Provide ventilation, continuous monitoring, rescue readiness, and controlled entry.', true],
      ['Ground movement and water ingress', 0.86, 1.20, 'Use instrumentation, trigger levels, emergency pumping, and observational controls.', true]
    ],
    bridge: [['Temporary works and work over traffic or water', 0.84, 1.18, 'Independently check falsework, access, lifting, and rescue arrangements.', true]],
    road: [['Live traffic and public interface', 0.86, 1.14, 'Implement approved traffic staging, barriers, lighting, and speed management.', true]],
    railway: [['Rail possessions and moving-rail interface', 0.88, 1.18, 'Control possessions, isolation, lookouts, and rail-specific competency.', true]],
    oil_gas: [['Process energy and hazardous atmosphere', 0.90, 1.22, 'Apply process isolation, gas testing, hazardous-area controls, and emergency response.', true]],
    power_plant: [['High-energy systems and commissioning', 0.88, 1.22, 'Use system boundaries, isolation registers, controlled energization, and witnessed testing.', true]],
    dam: [['Water diversion, inundation, and heavy civil works', 0.86, 1.20, 'Maintain diversion assurance, flood response, access control, and rescue capability.', true]],
    water: [['Confined spaces, chemicals, and water hazards', 0.82, 1.16, 'Control entry, chemical handling, ventilation, and water rescue.', true]],
    airport: [['Airside and operational interface', 0.84, 1.18, 'Use airside permits, foreign-object controls, escorts, and phased handover zones.', true]],
    port: [['Marine lifting and waterside operations', 0.86, 1.18, 'Coordinate marine movements, lifting plans, exclusion zones, and water rescue.', true]],
    renovation: [['Unknown existing services and hazardous materials', 0.86, 1.16, 'Survey, isolate, scan, sample suspect materials, and control discoveries.', true]],
    heritage: [['Fragile existing fabric and hidden instability', 0.84, 1.16, 'Use temporary stabilization, monitoring, controlled opening-up, and conservation supervision.', true]],
    data_center: [['Stored energy and live-system interfaces', 0.82, 1.18, 'Control batteries, generators, arc-flash exposure, and integrated systems testing.', true]]
  };
  const hazards = [...definitions, ...(specific[modelType] || [])]
    .filter(item => item[4])
    .map(([hazard, , , controls]) => ({
      hazard,
      probability: null,
      impact: null,
      score: null,
      minimumControls: controls,
      evidenceStatus: 'requires_site_specific_verification'
    }));
  return {
    hazards,
    riskScore: null,
    riskLevel: 'Unassessed',
    modelCalibration: null,
    dataProvenance: 'qualitative_rules_only',
    ppeCompliance: null,
    safetyIndex: null,
    suitableForPermitToWork: false,
    limitations: [
      'This is a concept-stage hazard projection, not a site inspection or approved HSE plan.',
      'Likelihood, severity, residual risk, PPE compliance, and safety indices require a documented site-specific assessment; synthetic project risk scores cannot supply them.'
    ]
  };
}

function projectEngineRuns(project, pipelineResult, brief, requirements) {
  const stepMap = new Map((pipelineResult.steps || []).map(step => [step.name, step]));
  const resolvedType = resolveProjectType(brief.type);
  const limited = code => requirements[code]?.missing?.length > 0 || !resolvedType.native;
  const coreRun = (code, steps, output, source) => {
    const state = stepState(stepMap, steps);
    if (state.status === 'completed' && limited(code)) state.status = 'completed_with_limits';
    return {
      code,
      name: ENGINE_LABELS[code],
      ...state,
      source,
      inputReady: requirements[code]?.inputReady || false,
      missingInputs: requirements[code]?.missing || [],
      output
    };
  };

  const safetyStartedAt = Date.now();
  const effective = {
    type: project.getEffective('type').value,
    area: project.getEffective('area').value,
    floors: project.getEffective('floors').value,
    modelType: project.extracted?.modelType || null,
    grossBuiltArea: project.extracted?.grossBuiltArea || null,
    footprintArea: project.extracted?.footprintArea || null,
    landArea: project.extracted?.landArea || null,
    basements: project.extracted?.basements || 0,
    buildings: project.extracted?.buildings || 1,
    capacity: project.extracted?.capacity || null,
    method: project.extracted?.method || null
  };
  const safetyAnalysis = buildSafetyProjection(brief, effective);
  const safetyRun = {
    code: 'SAFETY', name: ENGINE_LABELS.SAFETY,
    status: Array.isArray(safetyAnalysis.hazards) ? 'completed_with_limits' : 'failed',
    executed: Array.isArray(safetyAnalysis.hazards),
    durationMs: Date.now() - safetyStartedAt,
    source: 'qualitative-hazard-register/site-assessment-required',
    inputReady: requirements.SAFETY.inputReady,
    missingInputs: requirements.SAFETY.missing,
    output: {
      riskScore: safetyAnalysis.riskScore ?? null,
      riskLevel: safetyAnalysis.riskLevel || null,
      topRisks: (safetyAnalysis.hazards || []).slice(0, 7),
      ppeCompliance: safetyAnalysis.ppeCompliance,
      safetyIndex: safetyAnalysis.safetyIndex,
      modelCalibration: safetyAnalysis.modelCalibration,
      suitableForPermitToWork: safetyAnalysis.suitableForPermitToWork,
      limitations: safetyAnalysis.limitations
    }
  };

  const esgStartedAt = Date.now();
  const sustainabilityTarget = String(brief.sustainability || '').trim();
  const numericTarget = sustainabilityPercentage(sustainabilityTarget);
  const esgRun = {
    code: 'ESG', name: ENGINE_LABELS.ESG,
    status: sustainabilityTarget ? 'completed_with_limits' : 'blocked',
    executed: Boolean(sustainabilityTarget),
    durationMs: Date.now() - esgStartedAt,
    source: 'sustainability-target-review',
    inputReady: requirements.ESG.inputReady,
    missingInputs: requirements.ESG.missing,
    output: {
      statedTarget: sustainabilityTarget || null,
      measurablePercentage: numericTarget.value,
      targetStatus: numericTarget.status,
      carbonFootprint: null,
      energyScore: null,
      limitations: ['Carbon, energy, and ESG scores require an approved system boundary and versioned LCA/EPD factors.']
    }
  };

  const supplyStartedAt = Date.now();
  const boqCategories = [...new Set((project.boq.items || [])
    .map(item => item.category || item.material || String(item.code || '').split('-')[0])
    .filter(Boolean))].slice(0, 5);
  const fallbackCategories = (brief.systems || []).map(system => ({
    electrical: 'Electrical', mechanical: 'HVAC', plumbing: 'Plumbing', structural: 'Structural'
  }[system])).filter(Boolean);
  const supplyCategories = boqCategories.length ? boqCategories : [...new Set(fallbackCategories)].slice(0, 5);
  const supplierResults = supplyCategories.map(category => ai.supplierIntelligence.findBestSupplier(category, brief.city));
  const supplyExecuted = supplyCategories.length > 0 && supplierResults.every(result => !result.error);
  const recommendationReady = supplierResults.some(result => Boolean(result.topSupplier));
  const supplyRun = {
    code: 'SUPPLY', name: ENGINE_LABELS.SUPPLY,
    status: supplyExecuted ? 'completed_with_limits' : 'blocked',
    executed: supplyExecuted,
    durationMs: Date.now() - supplyStartedAt,
    source: 'supplier-intelligence/readiness-gated-local-dataset',
    inputReady: requirements.SUPPLY.inputReady,
    missingInputs: requirements.SUPPLY.missing,
    output: {
      categories: supplyCategories,
      recommendations: supplierResults,
      recommendationReady,
      liveMarketData: false,
      limitations: recommendationReady
        ? ['Recommendations require current quotation and procurement due diligence before use.']
        : ['No supplier is recommended until verified identities, specialities, and current quotations are configured.']
    }
  };

  return [
    coreRun('PUE', ['profiling', 'extraction', 'analysis'], {
      detectedType: effective.type,
      profile: project.digitalProfile,
      predicted: project.predicted
    }, 'project-profiler/project-analyzer'),
    { ...coreRun('VBE', ['virtual_building', 'vision_ai', 'navigation'], {
      building: ['linear', 'site', 'utility'].includes(resolvedType.family) ? null : project.building,
      vision: ['linear', 'site', 'utility'].includes(resolvedType.family) ? null : {
        ...project.vision.features, phase: brief.stage || null
      },
      navigation: ['linear', 'site', 'utility'].includes(resolvedType.family) ? {
        type: brief.type, family: resolvedType.family,
        area: effective.grossBuiltArea, length: brief.length || null, width: brief.width || null,
        floors: null, geometryStatus: 'dimensions_only_no_verified_geometry'
      } : project.navigation.spatialModel,
      geometryVerified: false,
      constructionProgress: null,
      limitations: ['An asset brief is not verified geometry. Linear and utility assets must not inherit building rooms, columns, heights, or a completed construction status.']
    }, 'virtual-building/typed-asset-brief'), status: 'completed_with_limits' },
    coreRun('BOQ', ['boq'], {
      summary: project.boq.summary,
      phase: project.boq.phase,
      assumptions: project.boq.assumptions || [],
      items: (project.boq.items || []).slice(0, 100),
      returnedItems: Math.min((project.boq.items || []).length, 100),
      totalItems: (project.boq.items || []).length
    }, 'quantity-estimator/boq-rules'),
    coreRun('COST', ['cost'], project.cost, 'cost-estimator'),
    coreRun('TIME', ['schedule'], {
      ...project.schedule,
      activities: (project.schedule.activities || []).slice(0, 100)
    }, 'schedule-optimizer'),
    coreRun('RISK', ['risks'], project.risks, 'risk-analyzer'),
    coreRun('QUALITY', ['quality'], project.quality, 'quality-inspector'),
    safetyRun,
    esgRun,
    supplyRun
  ];
}

app.get('/api/v1/experiments/engines', (req, res) => {
  res.json({
    status: aiReady ? 'ready' : 'initializing',
    serviceMode,
    core: coreEngineCatalog(),
    external: configuredExternalEngines(),
    policy: {
      mockResultsAllowed: process.env.ACEP_ALLOW_MOCK_RESULTS === 'true',
      dataProvenance: process.env.ACEP_DATA_PROVENANCE || 'synthetic',
      externalProvidersRequireLiveVerification: true
    }
  });
});

app.post('/api/v1/experiments/analyze', waitForAI(async (req, res) => {
  const parsed = validation.parseExperimentAnalyze(req.body);
  if (!parsed.ok) return res.status(400).json(parsed.error);
  if (!orchestrator) return res.status(503).json({ error: 'orchestrator_not_ready' });

  const brief = parsed.data.project;
  const resolvedType = resolveProjectType(brief.type);
  const canonicalDescription = buildCanonicalDescription(brief);
  const engineParams = toEngineParams(brief);
  const requirements = engineRequirements(brief);
  const storedProject = store.createProject({
    name: brief.name,
    description: canonicalDescription,
    type: engineParams.type,
    originalType: resolvedType.key,
    typeCoverage: resolvedType.native ? 'native' : 'proxy_archetype',
    area: engineParams.area || 0,
    floors: engineParams.floors,
    region: brief.city,
    finishing: brief.finishing || 'unknown',
    status: 'Experiment',
    tenantId: req.tenantId,
    dataProvenance: process.env.ACEP_DATA_PROVENANCE || 'synthetic',
    projectBrief: brief
  });
  tenantRegistry.assign(storedProject.id, req.tenantId);
  projects = store.getProjects();

  const project = edl.createProject(storedProject.id, {
    name: brief.name,
    description: canonicalDescription,
    tenantId: req.tenantId,
    projectBrief: brief
  });
  project.rawInput.description = canonicalDescription;
  project.setExtracted({
    ...engineParams,
    areaExtracted: engineParams.area !== null,
    floorsExtracted: engineParams.floors !== null,
    finishing: brief.finishing || null
  });
  const approved = { city: brief.city, phase: brief.stage };
  if (engineParams.area !== null) approved.area = engineParams.area;
  if (engineParams.floors !== null) approved.floors = engineParams.floors;
  if (resolvedType.native) approved.type = engineParams.type;
  project.setApproved(approved);

  const pipelineStartedAt = Date.now();
  const needsGeometry = !engineParams.area || !engineParams.floors;
  const pipelineResult = needsGeometry ? {
    ok: true,
    steps: [
      { name: 'extraction', status: 'completed', durationMs: 0 },
      ...['virtual_building', 'boq', 'cost', 'schedule', 'risks', 'quality', 'vision_ai', 'navigation']
        .map(name => ({ name, status: 'blocked', durationMs: 0, error: 'Project quantity basis and floor count are required' }))
    ]
  } : await orchestrator.runFullPipeline(project, canonicalDescription, () => engineParams);
  const engineRuns = projectEngineRuns(project, pipelineResult, brief, requirements);
  for (const run of engineRuns) {
    if (!run.executed) {
      run.output = { ...run.output, status: 'not_evaluated', insufficientData: true, missingInputs: run.missingInputs,
        items: [], risks: [], defects: [], activities: run.code === 'TIME' && run.output?.reason === 'scoped_resource_schedule_required' ? (run.output.activities || []).map(a=>({...a,duration:null,earlyStart:null,earlyFinish:null})) : [], totalCost: null, riskLevel: null,
        overallRiskScore: null, qualityScore: null, totalDuration: null };
    }
  }
  if (needsGeometry) engineRuns.find(run => run.code === 'PUE').source = 'structured-project-brief';
  const executedCount = engineRuns.filter(run => run.executed).length;
  const failedCount = engineRuns.filter(run => run.status === 'failed').length;
  const blockedCount = engineRuns.filter(run => run.status === 'blocked').length;
  const response = {
    projectId: project.id,
    status: needsGeometry ? 'needs_input' : pipelineResult.ok && failedCount === 0 && blockedCount === 0 ? 'completed' : 'partial',
    durationMs: Date.now() - pipelineStartedAt,
    inputCompleteness: inputCompleteness(brief),
    projectType: {
      requested: resolvedType.key,
      engineArchetype: resolvedType.engineType,
      coverage: resolvedType.native ? 'native' : 'proxy_archetype',
      warning: resolvedType.native ? null : 'This project type currently uses the nearest available engine archetype; calibrate with licensed reference projects before relying on numeric outputs.'
    },
    summary: {
      executed: executedCount,
      failed: failedCount,
      blocked: blockedCount,
      total: engineRuns.length,
      totalCost: project.cost.totalCost || null,
      scheduleMonths: project.schedule.totalMonths || null,
      riskLevel: engineRuns.find(run => run.code === 'RISK').executed ? project.risks.riskLevel || null : null,
      qualityScore: engineRuns.find(run => run.code === 'QUALITY').executed ? project.quality.qualityScore ?? null : null,
      boqItems: (project.boq.items || []).length
    },
    workflow: pipelineResult.steps,
    engineRuns,
    validation: pipelineResult.validation || project.validation,
    conflicts: project.orchestration.conflicts,
    trace: project.trace.slice(-50),
    evidence: requirements,
    externalEngines: configuredExternalEngines(),
    limitations: [
      'Numeric outputs are experimental because the bundled reference data is synthetic/legacy and not production-certified.',
      'External language, image, and video providers are not marked ready until a live request succeeds.',
      'All engineering outputs require qualified human review before design, procurement, construction, contractual, or safety use.'
    ]
  };
  store.updateProject(project.id, {
    status: response.status === 'completed' ? 'Analyzed' : 'Partial',
    cost: response.summary.totalCost || 0,
    analysisSummary: response.summary,
    lastAnalysisAt: new Date().toISOString()
  });
  res.status(pipelineResult.ok ? 200 : 422).json(response);
}));

// ─── Initialize Benchmark Platform ──
let benchmark = null;
try {
  benchmark = new BenchmarkPlatform(edl, ai, workflow, orchestrator, trainingBridge);
  console.log(`  ✓ Benchmark Platform: ${benchmark.getReferenceProjects().length} reference project cases`);
} catch (e) {
  console.log('  ⚠ Benchmark Platform init error:', e.message);
}

// ─── ACEP Vision Training Module ──
try {
  const visionTrainingRoutes = require('./packages/vision-training/api/routes');
  visionTrainingRoutes.createRouter(app);
  console.log('  ✓ ACEP Vision Training module loaded');
} catch (e) {
  console.log('  ⚠ ACEP Vision Training module not available:', e.message);
}

// ─── Initialize UETS (Unified Engineering Training System) ──
const { UnifiedTrainingSystem } = require('./packages/uets/index');
const UETS_BOOTSTRAP_MUTATIONS = process.env.ACEP_BOOTSTRAP_DATA_MODE === 'migrate';
const uets = new UnifiedTrainingSystem({
  repoPath: runtimePath('uets', 'egt-repository.ndjson'),
  indexPath: runtimePath('uets', 'egt-index.json'),
  statePath: runtimePath('uets', 'training-state.json')
});
try {
  uets.initialize();
  if (UETS_BOOTSTRAP_MUTATIONS) {
    const { CSVAdapter } = require('./packages/uets/adapters/csv-adapter');
    const csvAdapter = new CSVAdapter(uets.core);
    const migrationResult = csvAdapter.migrateAllToEGT();

    // Explicit migration job only; API startup remains read-only.
    try {
      const { EDLAdapter } = require('./packages/uets/adapters/edl-adapter');
      const edlAdapter = new EDLAdapter(uets.core);
      const edlRes = edlAdapter.migrateEDLState({ projects: edl.toJSON() });
      if (edlRes.migrated > 0) console.log(`  ✓ EDL: ${edlRes.migrated} projects migrated to EGT`);
    } catch (e) { console.log('  ⚠ EDL→EGT migration error:', e.message); }

    try {
      const { ContinuousLearningAdapter } = require('./packages/uets/adapters/continuous-learning-adapter');
      const clAdapter = new ContinuousLearningAdapter(uets.core);
      const clRes = clAdapter.migrateContinuousLearning();
      if (clRes.migrated > 0) console.log(`  ✓ ContinuousLearning: ${clRes.migrated} records migrated to EGT`);
    } catch (e) { console.log('  ⚠ ContinuousLearning→EGT migration error:', e.message); }

    try {
      const { KBAdapter } = require('./packages/uets/adapters/kb-adapter');
      const kbRes = new KBAdapter(uets.core).migrateKB();
      if (kbRes.migrated > 0) console.log(`  ✓ KnowledgeBase: ${kbRes.migrated} projects migrated to EGT`);
    } catch (e) { console.log('  ⚠ KB→EGT migration error:', e.message); }

    uets.save();
    const firstVersion = uets.createDatasetVersion('Explicit CSV Migration', 'Migrated CSV training data to EGT format');
    console.log(`  ✓ UETS migration job: ${migrationResult.projects} projects, ${migrationResult.boqItems} BOQ items (v${firstVersion.id})`);
  } else {
    console.log('  ✓ UETS startup mode: readonly (set ACEP_BOOTSTRAP_DATA_MODE=migrate only for an explicit migration job)');
  }

  // Feed EGT data into TrainingDataBridge
  if (typeof trainingBridge !== 'undefined' && trainingBridge) {
    const uetsLoad = trainingBridge.loadFromUETS(uets);
    if (uetsLoad.loaded) {
      console.log(`  ✓ TrainingDataBridge loaded ${uetsLoad.projects} projects, ${uetsLoad.boqItems} BOQ items from UETS`);
    }
  }

  // Recompute KnowledgeDatasetLoader from UETS EGT data
  if (typeof knowledgeDataset !== 'undefined' && knowledgeDataset && typeof knowledgeDataset.recomputeFromUETS === 'function') {
    const kdsResult = knowledgeDataset.recomputeFromUETS(uets);
    if (kdsResult.recomputed) {
      console.log(`  ✓ KnowledgeDatasetLoader recomputed from UETS: ${kdsResult.projects} projects, ${kdsResult.boqItems} BOQ items`);
    }
  }

  const { registerUETSRoutes } = require('./packages/uets/api/routes');
  registerUETSRoutes(app, uets);
  app.locals.uets = uets;
  if (process.env.ACEP_UETS_WORKER_ENABLED === 'true') {
    const { handlers } = require('./packages/uets/training/worker-handlers');
    uets.trainingManager.startWorker(handlers);
  }

  if (UETS_BOOTSTRAP_MUTATIONS) {
    try {
      const jsonlDir = runtimePath('uets', 'jsonl');
      const written = uets.writeJSONLToDisk(jsonlDir, uets.getAllEGT().slice(0, 500));
      console.log(`  ✓ UETS JSONL datasets written: ${written.domains} domains → runtime storage`);
    } catch (e) { console.log('  ⚠ UETS JSONL write error:', e.message); }
  }

  // Vision training integration (Step 3.2): EGT → vision training data
  app.post('/api/v1/uets/vision/collect', async (req, res) => {
    try {
      const collector = require('./packages/vision-ai/training/training-collector');
      const result = await collector.collectFromEGT(uets, req.body || {});
      res.json(result);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });
  app.post('/api/v1/uets/vision/import', async (req, res) => {
    try {
      const result = await trainingIntegration.importFromEGT(uets, req.body || {});
      res.json(result);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });
} catch (e) {
  console.log('  ⚠ UETS init error:', e.message);
}

// ─── Initialize New Intelligent Layers ──
let semanticValidator = null;
let visionNavBridge = null;
let boqAuditor = null;
let learningFeedback = null;
let confidenceEngine = null;
let crossModelValidator = null;
let digitalTwin = null;
let benchmarkExtension = null;

try {
  semanticValidator = new SemanticValidator(edl, ACEPKnowledgeBase);
  console.log('  ✓ Semantic Engineering Validator ready');
} catch (e) { console.log('  ⚠ SemanticValidator init error:', e.message); }

try {
  visionNavBridge = new VisionNavBridge(edl, visionAICore);
  console.log('  ✓ Vision-Navigation Bridge ready');
} catch (e) { console.log('  ⚠ VisionNavBridge init error:', e.message); }

try {
  boqAuditor = new BOQAuditor(ACEPKnowledgeBase);
  console.log('  ✓ BOQ Auditor AI ready');
} catch (e) { console.log('  ⚠ BOQAuditor init error:', e.message); }

try {
  learningFeedback = new LearningFeedbackEngine(edl, trainingBridge);
  if (typeof uets !== 'undefined' && uets && typeof learningFeedback.setUETS === 'function') learningFeedback.setUETS(uets);
  console.log('  ✓ Learning Feedback Engine ready');
} catch (e) { console.log('  ⚠ LearningFeedback init error:', e.message); }

try {
  confidenceEngine = new UnifiedConfidenceEngine();
  console.log('  ✓ Unified Confidence Engine ready');
} catch (e) { console.log('  ⚠ ConfidenceEngine init error:', e.message); }

try {
  crossModelValidator = new CrossModelValidator(edl, semanticValidator, confidenceEngine);
  console.log('  ✓ Cross-Model Validator ready');
} catch (e) { console.log('  ⚠ CrossModelValidator init error:', e.message); }

try {
  digitalTwin = new DigitalTwin(edl);
  console.log('  ✓ Digital Twin ready');
} catch (e) { console.log('  ⚠ DigitalTwin init error:', e.message); }

try {
  benchmarkExtension = new BenchmarkExtension(edl, visionAICore, navEngine, orchestrator,
    semanticValidator, confidenceEngine, crossModelValidator, learningFeedback);
  console.log(`  ✓ Benchmark Extension: ${benchmarkExtension.getReferenceProjects().length} extended test cases`);
} catch (e) { console.log('  ⚠ BenchmarkExtension init error:', e.message); }

// Register new routes on app.locals for route handlers
app.locals.semanticValidator = semanticValidator;
app.locals.boqAuditor = boqAuditor;
app.locals.learningFeedback = learningFeedback;
app.locals.confidenceEngine = confidenceEngine;
app.locals.crossModelValidator = crossModelValidator;
app.locals.digitalTwin = digitalTwin;
app.locals.visionNavBridge = visionNavBridge;
app.locals.benchmarkExtension = benchmarkExtension;
app.locals.backgroundQueue = performanceLayer.BackgroundQueue;
app.locals.modelCache = performanceLayer.ModelCache;

// ─── Initialize Advanced Engineering Layers ──
let decisionEngine = null;
let decisionGraph = null;
let explainableAI = null;
let consistencyScorer = null;
let dependencyEngine = null;
let autoRecalc = null;
let engineeringMemory = null;
let selfReview = null;
let recommendationEngine = null;
let maturityMetrics = null;
let finalReport = null;

try {
  const engGraph = engineeringOrchestrator?.graph || null;
  const knowledgeGraph = ai?.knowledgeGraph || null;
  decisionEngine = new EngineeringDecisionEngine({
    semanticValidator, boqAuditor, crossModelValidator,
    validationEngine: validator, confidenceEngine,
    learningFeedback, edl,
  });
  console.log('  ✓ Engineering Decision Engine ready');
} catch (e) { console.log('  ⚠ EngineeringDecisionEngine init error:', e.message); }

try {
  decisionGraph = new DecisionGraph({ engineeringGraph: engineeringOrchestrator?.graph, knowledgeGraph: ai?.knowledgeGraph, edl });
  console.log('  ✓ Decision Graph ready');
} catch (e) { console.log('  ⚠ DecisionGraph init error:', e.message); }

try {
  explainableAI = new ExplainableAI({
    learningFeedback, decisionEngine, edl,
    knowledgeBase: ACEPKnowledgeBase,
    reasoningEngine: ai?.reasoningEngine || null,
  });
  console.log('  ✓ Explainable AI ready');
} catch (e) { console.log('  ⚠ ExplainableAI init error:', e.message); }

try {
  consistencyScorer = new ConsistencyScorer({
    crossModelValidator, semanticValidator, confidenceEngine,
    validationEngine: validator, edl,
  });
  console.log('  ✓ Consistency Scorer ready');
} catch (e) { console.log('  ⚠ ConsistencyScorer init error:', e.message); }

try {
  dependencyEngine = new DependencyEngine({
    engineeringGraph: engineeringOrchestrator?.graph,
    knowledgeGraph: ai?.knowledgeGraph, edl,
  });
  console.log('  ✓ Dependency Engine ready');
} catch (e) { console.log('  ⚠ DependencyEngine init error:', e.message); }

try {
  autoRecalc = new AutomaticRecalculation({
    dependencyEngine, decisionGraph, digitalTwin, edl,
    orchestrator, validationEngine: validator,
  });
  console.log('  ✓ Automatic Recalculation ready');
} catch (e) { console.log('  ⚠ AutomaticRecalculation init error:', e.message); }

try {
  engineeringMemory = new EngineeringMemory({ edl, learningFeedback });
  engineeringMemory.initialize();
  console.log('  ✓ Engineering Memory ready');
} catch (e) { console.log('  ⚠ EngineeringMemory init error:', e.message); }

try {
  selfReview = new AISelfReview({
    edl, learningFeedback, crossModelValidator, semanticValidator,
    validationEngine: validator, engineeringMemory, explainableAI,
    benchmark: benchmark || benchmarkExtension || null,
  });
  console.log('  ✓ AI Self Review ready');
} catch (e) { console.log('  ⚠ AISelfReview init error:', e.message); }

try {
  recommendationEngine = new RecommendationEngine({
    boqEngine, costOptimizer: engineeringOrchestrator?.costOptimizer || null,
    supplierAI: engineeringOrchestrator?.supplierAI || null,
    knowledgeBase: ACEPKnowledgeBase, trainingBridge,
    priceLearner: boqEngine?.priceLearner || null, engineeringMemory, edl,
  });
  console.log('  ✓ Recommendation Engine ready');
} catch (e) { console.log('  ⚠ RecommendationEngine init error:', e.message); }

try {
  maturityMetrics = new MaturityMetrics({
    edl, consistencyScorer, decisionEngine,
    recommendationEngine, engineeringMemory,
    selfReview, validationEngine: validator,
  });
  console.log('  ✓ Maturity Metrics ready');
} catch (e) { console.log('  ⚠ MaturityMetrics init error:', e.message); }

try {
  finalReport = new FinalReport({
    maturityMetrics, selfReview, recommendationEngine,
    consistencyScorer, engineeringMemory, decisionEngine,
    explainableAI, learningFeedback, edl,
  });
  console.log('  ✓ Final Report Generator ready');
} catch (e) { console.log('  ⚠ FinalReport init error:', e.message); }

// Register all on app.locals for route handlers
app.locals.decisionEngine = decisionEngine;
app.locals.decisionGraph = decisionGraph;
app.locals.explainableAI = explainableAI;
app.locals.consistencyScorer = consistencyScorer;
app.locals.dependencyEngine = dependencyEngine;
app.locals.autoRecalc = autoRecalc;
app.locals.engineeringMemory = engineeringMemory;
app.locals.selfReview = selfReview;
app.locals.recommendationEngine = recommendationEngine;
app.locals.maturityMetrics = maturityMetrics;
app.locals.finalReport = finalReport;

// ══════════════════════════════════════════════════════════
// ─── 10-Phase Engineering Foundation Program (P5-P10) ──
// ══════════════════════════════════════════════════════════

// ─── P5: Knowledge Growth System ──
const KnowledgeGrowthSystem = require('./packages/ai-engine/knowledge-growth-system');
const knowledgeGrowth = new KnowledgeGrowthSystem(knowledgeDataset, trainingBridge, learningFeedback, edl);
console.log('  ✓ P5 Knowledge Growth System ready');

// ─── P6: Benchmark Library ──
const BenchmarkLibrary = require('./packages/ai-engine/benchmark-library');
const benchmarkLibrary = new BenchmarkLibrary(knowledgeDataset, ai, dataStandards, dataQualityPipeline);
console.log('  ✓ P6 Benchmark Library ready (compares AI vs CSV historical data)');

// ─── P7: Unified Knowledge Base ──
const UnifiedKnowledgeBase = require('./packages/ai-engine/unified-knowledge-base');
const unifiedKB = new UnifiedKnowledgeBase(knowledgeDataset, trainingBridge, null, ai?.knowledgeEngine);
console.log('  ✓ P7 Unified Knowledge Base ready (merged CSV + KB + recorded)');

// ─── P8: Periodic Evaluation ──
const PeriodicEvaluation = require('./packages/ai-engine/periodic-evaluation');
const periodicEvaluation = new PeriodicEvaluation(benchmarkLibrary, knowledgeGrowth, unifiedKB, dataQualityPipeline);
console.log('  ✓ P8 Periodic Evaluation ready (scheduled benchmarks + quality checks)');

// ─── P9: Selective Retraining ──
const SelectiveRetraining = require('./packages/ai-engine/selective-retraining');
const selectiveRetraining = new SelectiveRetraining(benchmarkLibrary, knowledgeDataset, knowledgeGrowth, periodicEvaluation);
if (typeof uets !== 'undefined' && uets) selectiveRetraining.setUETS(uets);
console.log('  ✓ P9 Selective Retraining ready (weak area detection + retraining triggers)');

// ─── P10: Knowledge Driven Decisions ──
const KnowledgeDrivenDecisions = require('./packages/ai-engine/knowledge-driven-decisions');
const kdd = new KnowledgeDrivenDecisions(ai, knowledgeDataset, unifiedKB, periodicEvaluation, selectiveRetraining, benchmarkLibrary, dataQualityPipeline);
console.log('  ✓ P10 Knowledge Driven Decisions ready (historical-data-first decision engine)');

// ─── Retraining Orchestrator (closes the loop: P9 → actual model training) ──
const RetrainingOrchestrator = require('./packages/ai-engine/retraining-orchestrator');
const retrainingOrchestrator = new RetrainingOrchestrator(ai, trainingBridge, knowledgeDataset, knowledgeGrowth, benchmarkLibrary, selectiveRetraining);
if (typeof uets !== 'undefined' && uets) retrainingOrchestrator.setUETS(uets);
console.log('  ✓ Retraining Orchestrator ready (P9 triggers real model retraining, UETS-enabled)');

// ─── Phase Persistence (save/load all P5-P10 state) ──
const PhasePersistence = require('./packages/ai-engine/phase-persistence');
const phaseStore = new PhasePersistence(runtimePath('phases'));
const persisted = phaseStore.loadAll();
if (persisted.growthLog.length > 0) {
  if (knowledgeGrowth._growthLog) knowledgeGrowth._growthLog = persisted.growthLog;
  if (persisted.benchmarkResults.length > 0 && benchmarkLibrary._results) benchmarkLibrary._results = persisted.benchmarkResults;
  if (persisted.evaluationHistory.length > 0 && periodicEvaluation._history) periodicEvaluation._history = persisted.evaluationHistory;
  if (persisted.retrainingHistory.length > 0 && selectiveRetraining._retrainingHistory) selectiveRetraining._retrainingHistory = persisted.retrainingHistory;
  if (persisted.decisionLog.length > 0 && kdd._decisionLog) kdd._decisionLog = persisted.decisionLog;
  console.log(`  ✓ Phase Persistence loaded: ${persisted.growthLog.length} growth, ${persisted.benchmarkResults.length} benchmark, ${persisted.evaluationHistory.length} eval, ${persisted.retrainingHistory.length} retrain, ${persisted.decisionLog.length} decisions`);
}

function savePhaseState() {
  phaseStore.saveAll({
    growthLog: knowledgeGrowth._growthLog || knowledgeGrowth.exportGrowthLog(),
    benchmarkResults: benchmarkLibrary._results || [],
    evaluationHistory: periodicEvaluation._history || [],
    retrainingHistory: selectiveRetraining._retrainingHistory || [],
    decisionLog: kdd._decisionLog || [],
  });
  if (typeof uets !== 'undefined' && uets) uets.save();
}

// Auto-save phase state every 120s to the configured runtime volume.
const phaseSaveInterval = setInterval(savePhaseState, 120000);

// ─── AI Orchestrator — Unified Pipeline Endpoint ──
app.post(['/api/v1/orchestrate', '/api/v1/orchestrate/analyze'], async (req, res) => {
  try {
    const { projectId, description, projectParams } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    if (!orchestrator) return res.status(503).json({ error: 'AI Orchestrator not initialized' });

    let project = edl.getProject(projectId);
    if (!project) {
      project = edl.createProject(projectId, { name: req.body.name || projectId, description: description || '' });
    }

    // If projectParams are provided directly, seed the EDL with them
    if (projectParams) {
      project.setExtracted({
        ...(projectParams.type ? { type: projectParams.type, typeConfidence: 0.8 } : {}),
        ...(projectParams.area ? { area: projectParams.area, areaExtracted: true } : {}),
        ...(projectParams.floors ? { floors: projectParams.floors, floorsExtracted: true } : {}),
        ...(projectParams.city ? { city: projectParams.city } : {})
      });
      if (projectParams.description) project.rawInput.description = projectParams.description;
      project.metadata.status = 'seeded';
    }

    // Simple description parser (can be replaced with a more sophisticated one)
    const parseDescription = (desc) => {
      const params = { type: null, typeConfidence: 0, area: null, floors: null, rooms: null, bathrooms: null, hasKitchen: false, halls: null, city: null, phase: null, extractionLog: null };
      if (!desc) return params;
      const low = desc.toLowerCase();
      const areaMatch = low.match(/(\d+)\s*(م[2٢]|متر|متر مربع|square\s*meter)/i);
      if (areaMatch) params.area = parseFloat(areaMatch[1]);
      const floorMatch = low.match(/(\d+)\s*(دور|طابق|ground\s*floor|floor)/i);
      if (floorMatch) params.floors = parseFloat(floorMatch[1]);
      const typeMatch = low.match(/(فيلا|شقة|برج|مسجد|مدرسة|مستشفى|مصنع|فندق|مول|مبنى|villa|apartment|tower|mosque|school|hospital|factory|hotel|mall|building)/i);
      if (typeMatch) {
        const map = { 'فيلا': 'Villa', 'villa': 'Villa', 'شقة': 'Apartment', 'apartment': 'Apartment', 'برج': 'Tower', 'tower': 'Tower', 'مسجد': 'Mosque', 'mosque': 'Mosque', 'مدرسة': 'School', 'school': 'School', 'مستشفى': 'Hospital', 'hospital': 'Hospital', 'مصنع': 'Factory', 'factory': 'Factory', 'فندق': 'Hotel', 'hotel': 'Hotel', 'مول': 'Mall', 'mall': 'Mall', 'مبنى': 'Building', 'building': 'Building' };
        params.type = map[typeMatch[1].toLowerCase()] || 'Building';
        params.typeConfidence = 0.6;
      }
      return params;
    };

    const result = await orchestrator.runFullPipeline(project, description || '', parseDescription);

    if (!result.ok) {
      return res.status(422).json({
        projectId,
        status: 'failed',
        failedStep: result.failedStep,
        error: result.error,
        steps: result.steps,
        trace: project.trace.slice(-20),
      });
    }

    res.json({
      projectId,
      status: 'completed',
      duration: result.duration,
      steps: result.steps,
      validation: result.validation,
      summary: {
        type: project.getEffective('type').value,
        area: project.getEffective('area').value,
        floors: project.getEffective('floors').value,
        boqItems: project.boq.items.length,
        boqCost: project.boq.summary.totalCost,
        totalCost: project.cost.totalCost,
        scheduleMonths: project.schedule.totalMonths,
        riskLevel: project.risks.riskLevel,
        qualityScore: project.quality.qualityScore,
      },
      vision: project.vision.features,
      navigation: {
        floors: project.navigation.spatialModel?.floors,
        elements: project.navigation.elements.length,
      },
      conflicts: project.orchestration.conflicts,
      crossValidationPassed: project.orchestration.crossValidationPassed,
    });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

// Orchestration status endpoint
app.get('/api/v1/orchestrate/status/:projectId', (req, res) => {
  try {
    const project = edl.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({
      projectId: project.id,
      status: project.metadata.status,
      workflowStep: project.metadata.workflowStep,
      orchestration: project.orchestration,
      validation: project.validation,
      trace: project.trace.slice(-30),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Orchestration pipeline log
app.get('/api/v1/orchestrate/log', (req, res) => {
  if (!orchestrator) return res.json({ log: [] });
  res.json({ log: orchestrator.getPipelineLog() });
});

// ─── Training Data Bridge API ──
app.get('/api/v1/training/stats', (req, res) => {
  try {
    res.json(trainingBridge.getStats());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/v1/training/projects', (req, res) => {
  try {
    const { type, region, limit } = req.query;
    let projects = type ? trainingBridge.getProjectsByType(type) : trainingBridge.data.projects;
    if (region) projects = projects.filter(p => p.region && p.region.toLowerCase() === region.toLowerCase());
    if (limit) projects = projects.slice(0, parseInt(limit));
    res.json({ count: projects.length, projects: projects.slice(0, 100) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/v1/training/boq/:projectId', (req, res) => {
  try {
    const items = trainingBridge.getBOQByProject(req.params.projectId);
    res.json({ projectId: req.params.projectId, count: items.length, items: items.slice(0, 200) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/v1/training/materials', (req, res) => {
  try {
    const { material } = req.query;
    const prices = trainingBridge.getMaterialPrices(material);
    res.json({ count: prices.length, prices: prices.slice(0, 100) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/v1/training/edl-records', (req, res) => {
  try {
    const records = trainingBridge.toJSON();
    res.json(records);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Benchmark Platform API ──
app.get('/api/v1/benchmark/projects', (req, res) => {
  try {
    if (!benchmark) return res.status(503).json({ error: 'Benchmark not initialized' });
    res.json({ count: benchmark.getReferenceProjects().length, projects: benchmark.getReferenceProjects() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/benchmark/run', async (req, res) => {
  try {
    if (!benchmark) return res.status(503).json({ error: 'Benchmark not initialized' });
    const result = await benchmark.runAll();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/benchmark/results', (req, res) => {
  try {
    if (!benchmark) return res.status(503).json({ error: 'Benchmark not initialized' });
    res.json(benchmark.getLastResults() || { message: 'No results yet. POST /api/v1/benchmark/run first.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Knowledge Dataset Routes ─────────────
app.get('/api/v1/knowledge-dataset/stats', (req, res) => {
  try {
    res.json(knowledgeDataset.getStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-dataset/standard-quantities', (req, res) => {
  try {
    const { type } = req.query;
    res.json(type ? knowledgeDataset.getStandardQuantities(type) : knowledgeDataset.getStandardQuantities());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-dataset/unit-price/:itemCode', (req, res) => {
  try {
    const price = knowledgeDataset.getUnitPrice(req.params.itemCode);
    if (!price) return res.status(404).json({ error: 'Item not found' });
    res.json(price);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-dataset/material-price', (req, res) => {
  try {
    const { material, city } = req.query;
    if (!material) return res.status(400).json({ error: 'material query param required' });
    const price = knowledgeDataset.getMaterialPrice(material, city);
    if (!price) return res.status(404).json({ error: 'Material not found' });
    res.json(price);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-dataset/labor-rate', (req, res) => {
  try {
    const { trade, city } = req.query;
    if (!trade) return res.status(400).json({ error: 'trade query param required' });
    const rate = knowledgeDataset.getLaborRate(trade, city);
    if (!rate) return res.status(404).json({ error: 'Trade not found' });
    res.json(rate);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-dataset/project-understanding', (req, res) => {
  try {
    const { type } = req.query;
    res.json(type ? knowledgeDataset.getProjectUnderstanding(type) : knowledgeDataset.getProjectUnderstanding());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-dataset/risks', (req, res) => {
  try {
    const { category } = req.query;
    res.json(category ? knowledgeDataset.getRiskProfile(category) : knowledgeDataset.getRiskProfile());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-dataset/quality', (req, res) => {
  try {
    const { defectType } = req.query;
    res.json(defectType ? knowledgeDataset.getQualityProfile(defectType) : knowledgeDataset.getQualityProfile());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-dataset/export', (req, res) => {
  try {
    res.json(knowledgeDataset.toJSON());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Data Standards Routes (Phase 3) ──────
app.post('/api/v1/data-standards/validate/:entityType', (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'data required' });
    if (Array.isArray(data)) res.json(dataStandards.validateBatch(req.params.entityType, data));
    else res.json(dataStandards.validate(req.params.entityType, data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/data-standards/schema/:entityType', (req, res) => {
  try {
    const schema = dataStandards.getSchema(req.params.entityType);
    if (!schema) return res.status(404).json({ error: 'Schema not found' });
    res.json(schema);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/data-standards/schemas', (req, res) => {
  res.json(dataStandards.getStats());
});

app.post('/api/v1/data-standards/normalize-unit', (req, res) => {
  const { unit } = req.body;
  if (!unit) return res.status(400).json({ error: 'unit required' });
  res.json({ input: unit, normalized: dataStandards.normalizeUnit(unit) });
});

app.post('/api/v1/data-standards/normalize-finishing', (req, res) => {
  const { level } = req.body;
  if (!level) return res.status(400).json({ error: 'level required' });
  res.json({ input: level, normalized: dataStandards.normalizeFinishingLevel(level) });
});

app.get('/api/v1/data-standards/allowed-values/:entityType/:field', (req, res) => {
  const values = dataStandards.getAllowedValues(req.params.entityType, req.params.field);
  if (!values) return res.status(404).json({ error: 'Not found' });
  res.json({ entityType: req.params.entityType, field: req.params.field, allowedValues: values });
});

// ─── Data Quality Pipeline Routes (Phase 4) ──
app.get('/api/v1/data-quality/check', (req, res) => {
  try {
    res.json(dataQualityPipeline.runFullCheck());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/data-quality/check-project', (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const project = edl.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(dataQualityPipeline.checkProjectData(project));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/data-quality/anomalies', (req, res) => {
  try {
    res.json(dataQualityPipeline.detectAnomaliesInDataset());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/data-quality/normalize-project', (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const project = edl.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(dataQualityPipeline.normalizeProjectData(project));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/data-quality/history', (req, res) => {
  res.json(dataQualityPipeline.getHistory());
});

// ─── Knowledge Growth System Routes (Phase 5) ──
app.post('/api/v1/knowledge-growth/record-approval', (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    res.json(knowledgeGrowth.recordApprovedProject(projectId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/knowledge-growth/analyze-feedback', (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    res.json(knowledgeGrowth.learnFromFeedback(projectId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-growth/suggestions', (req, res) => {
  try {
    res.json(knowledgeGrowth.suggestDatasetUpdates());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-growth/report', (req, res) => {
  try {
    res.json(knowledgeGrowth.getKnowledgeGrowthReport());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-growth/log', (req, res) => {
  res.json(knowledgeGrowth.exportGrowthLog());
});

// ─── Phase Status (P1-P10 unified view) ──
app.get('/api/v1/phases/status', (req, res) => {
  let qualityCheck = {};
  try { qualityCheck = dataQualityPipeline.runFullCheck(); } catch {}
  const qcOverall = qualityCheck.overall || {};
  res.json({
    p1_auditReport: { ok: require('fs').existsSync(path.join(__dirname, 'AI-AUDIT-REPORT-COMPLETE.json')), file: 'AI-AUDIT-REPORT-COMPLETE.json' },
    p2_knowledgeDataset: { ok: knowledgeDataset.getStats().projectTypes > 0, projectTypes: knowledgeDataset.getStats().projectTypes, boqItems: knowledgeDataset.getStats().unitPriceItems },
    p3_dataStandards: { ok: true, schemas: dataStandards.getStats().schemas, unitStandards: dataStandards.getStats().unitStandards },
    p4_dataQuality: { ok: true, grade: qcOverall.grade || 'N/A', score: qcOverall.qualityScore || 0 },
    p5_knowledgeGrowth: { ok: true, growthLogEntries: (knowledgeGrowth.exportGrowthLog() || []).length },
    p6_benchmarkLibrary: { ok: true, totalRuns: benchmarkLibrary.getStats().totalRuns, lastRun: benchmarkLibrary.getStats().lastRun },
    p7_unifiedKB: { ok: true },
    p8_periodicEvaluation: { ok: true, totalEvaluations: periodicEvaluation.getStats().totalEvaluations, schedules: periodicEvaluation.getStats().schedules },
    p9_selectiveRetraining: { ok: true, totalAnalyses: selectiveRetraining.getStats().totalAnalyses },
    p10_knowledgeDriven: { ok: true, totalDecisions: kdd.getStats().totalDecisions, avgConfidence: kdd.getStats().avgConfidence },
    uets: uets && uets.initialized ? { ok: true, version: uets.core.getVersion(), totalEGTRecords: uets.core.repository.records.size, grade: uets.getReadinessReport().grade, trainingQueued: uets.getTrainingStats().trainingQueue } : { ok: false },
    timestamp: new Date().toISOString(),
  });
});

app.get('/phases-admin', (req, res) => {
  if (!legacyUiEnabled) return res.status(404).json({ error: 'legacy_ui_disabled' });
  res.sendFile(path.join(__dirname, 'packages', 'ui', 'web', 'phases-admin.html'));
});

app.get('/api/v1/phases/persist', (req, res) => {
  phaseStore.saveAll({
    growthLog: knowledgeGrowth._growthLog || knowledgeGrowth.exportGrowthLog(),
    benchmarkResults: benchmarkLibrary._results || [],
    evaluationHistory: periodicEvaluation._history || [],
    retrainingHistory: selectiveRetraining._retrainingHistory || [],
    decisionLog: kdd._decisionLog || [],
  });
  res.json({ ok: true, path: phaseStore.baseDir });
});

// ─── Unified Knowledge Base Routes (Phase 7) ──
app.post('/api/v1/knowledge-base/query', (req, res) => {
  try { res.json(unifiedKB.query(req.body || {})); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-base/summary/:type', (req, res) => {
  try { res.json(unifiedKB.getSummary(req.params.type)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-base/search', (req, res) => {
  try { res.json(unifiedKB.search(req.query.q)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/knowledge-base/statistics', (req, res) => {
  res.json(unifiedKB.getStatistics());
});

app.post('/api/v1/knowledge-base/clear-cache', (req, res) => {
  unifiedKB.clearCache();
  res.json({ ok: true });
});

// ─── Benchmark Library Routes (Phase 6) ──
app.post('/api/v1/benchmark-library/run', (req, res) => {
  try {
    res.json(benchmarkLibrary.runAll());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/benchmark-library/compare', (req, res) => {
  try {
    const { type, area, floors } = req.body;
    if (!type) return res.status(400).json({ error: 'type required' });
    res.json(benchmarkLibrary.compareWithAIModels({ type, area: area || 500, floors: floors || 2 }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/benchmark-library/results', (req, res) => {
  res.json(benchmarkLibrary.getLastResults());
});

app.get('/api/v1/benchmark-library/trends', (req, res) => {
  res.json(benchmarkLibrary.getTrends());
});

app.get('/api/v1/benchmark-library/stats', (req, res) => {
  res.json(benchmarkLibrary.getStats());
});

// ─── Periodic Evaluation Routes (Phase 8) ──
app.post('/api/v1/evaluation/schedule', (req, res) => {
  const s = periodicEvaluation.createSchedule(req.body);
  res.status(s.ok ? 200 : 400).json(s);
});
app.get('/api/v1/evaluation/schedules', (req, res) => { res.json(periodicEvaluation.listSchedules()); });
app.get('/api/v1/evaluation/schedule/:name', (req, res) => {
  const s = periodicEvaluation.getSchedule(req.params.name);
  if (!s) return res.status(404).json({ error: 'not found' });
  res.json(s);
});
app.delete('/api/v1/evaluation/schedule/:name', (req, res) => { res.json(periodicEvaluation.removeSchedule(req.params.name)); });
app.post('/api/v1/evaluation/run', (req, res) => { res.json(periodicEvaluation.evaluateNow(req.body || {})); });
app.post('/api/v1/evaluation/auto/:action', (req, res) => {
  if (req.params.action === 'start') res.json(periodicEvaluation.startAutoEvaluation(req.body.intervalMs));
  else res.json(periodicEvaluation.stopAutoEvaluation());
});
app.get('/api/v1/evaluation/history', (req, res) => { res.json(periodicEvaluation.getHistory(req.query)); });
app.get('/api/v1/evaluation/latest', (req, res) => { res.json(periodicEvaluation.getLatest() || { message: 'No evaluations yet' }); });
app.get('/api/v1/evaluation/stats', (req, res) => { res.json(periodicEvaluation.getStats()); });

// ─── Selective Retraining Routes (Phase 9) ──
app.post('/api/v1/retraining/analyze', (req, res) => { res.json(selectiveRetraining.analyze()); });
for (const [route,method] of [['run','retrainViaUETS'],['orchestrate','retrainViaUETS'],['fix-weak-areas','retrainWeakAreas']]) {
  app.post('/api/v1/retraining/'+route, async (req,res) => {
    try { res.json(await retrainingOrchestrator[method](req.body || {})); }
    catch (error) { res.status(422).json({error:error.message, activated:false}); }
  });
}
app.get('/api/v1/retraining/orchestrator-log', (req, res) => { res.json(retrainingOrchestrator.getLog(Number(req.query.limit) || 10)); });
app.get('/api/v1/retraining/orchestrator-stats', (req, res) => { res.json(retrainingOrchestrator.getStats()); });
app.get('/api/v1/retraining/thresholds', (req, res) => { res.json(selectiveRetraining.getThresholds()); });
app.post('/api/v1/retraining/thresholds', (req, res) => { res.json(selectiveRetraining.setThresholds(req.body)); });
app.get('/api/v1/retraining/history', (req, res) => { res.json(selectiveRetraining.getHistory(req.query.limit)); });
app.get('/api/v1/retraining/stats', (req, res) => { res.json(selectiveRetraining.getStats()); });

// ─── Knowledge Driven Decisions Routes (Phase 10) ──
app.post('/api/v1/decisions/evaluate', (req, res) => { res.json(kdd.decide(req.body || {})); });
app.get('/api/v1/decisions/config', (req, res) => { res.json(kdd._config); });
app.post('/api/v1/decisions/config', (req, res) => { res.json(kdd.configure(req.body)); });
app.get('/api/v1/decisions/history', (req, res) => { res.json(kdd.getHistory(req.query.limit)); });
app.get('/api/v1/decisions/stats', (req, res) => { res.json(kdd.getStats()); });

// ─── New Intelligent Layer Routes ─────────

// Semantic Validator
app.post('/api/v1/validate/semantic/:projectId', async (req, res) => {
  try {
    if (!semanticValidator) return res.status(503).json({ error: 'SemanticValidator not initialized' });
    const result = semanticValidator.validateProject(req.params.projectId);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/validate/semantic/:projectId/output', async (req, res) => {
  try {
    if (!semanticValidator) return res.status(503).json({ error: 'SemanticValidator not initialized' });
    const { generationType, outputData } = req.body;
    const result = semanticValidator.validateVisionOutput(req.params.projectId, generationType || 'all', outputData);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/validate/semantic/results/:projectId?', (req, res) => {
  try {
    if (!semanticValidator) return res.status(503).json({ error: 'SemanticValidator not initialized' });
    res.json(semanticValidator.getResults(req.params.projectId || null) || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// BOQ Auditor
app.post('/api/v1/audit/boq/:projectId', async (req, res) => {
  try {
    if (!boqAuditor) return res.status(503).json({ error: 'BOQAuditor not initialized' });
    const project = edl.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const result = boqAuditor.audit(project, req.body.boqResult);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/audit/boq/log/:projectId?', (req, res) => {
  try {
    if (!boqAuditor) return res.status(503).json({ error: 'BOQAuditor not initialized' });
    res.json(boqAuditor.getAuditLog(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Learning Feedback
app.post('/api/v1/learning/feedback/:projectId', async (req, res) => {
  try {
    if (!learningFeedback) return res.status(503).json({ error: 'LearningFeedback not initialized' });
    const { module, decisionType, reason, context } = req.body;
    const result = learningFeedback.recordDecision(req.params.projectId, {
      module, decisionType, reason, context: context || {},
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/learning/feedback/:projectId/approve', async (req, res) => {
  try {
    if (!learningFeedback) return res.status(503).json({ error: 'LearningFeedback not initialized' });
    const { module, itemId, reason } = req.body;
    const result = learningFeedback.recordApproval(req.params.projectId, module, itemId, { reason });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/learning/feedback/:projectId/reject', async (req, res) => {
  try {
    if (!learningFeedback) return res.status(503).json({ error: 'LearningFeedback not initialized' });
    const { module, itemId, reason } = req.body;
    const result = learningFeedback.recordRejection(req.params.projectId, module, itemId, reason);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/learning/feedback/summary/:projectId?', (req, res) => {
  try {
    if (!learningFeedback) return res.status(503).json({ error: 'LearningFeedback not initialized' });
    res.json(learningFeedback.getFeedbackSummary(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/learning/feedback/reasons/:projectId?', (req, res) => {
  try {
    if (!learningFeedback) return res.status(503).json({ error: 'LearningFeedback not initialized' });
    res.json(learningFeedback.getTopRejectionReasons(req.params.projectId || null, 10));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Unified Confidence Engine
app.post('/api/v1/confidence/evaluate/:projectId', async (req, res) => {
  try {
    if (!confidenceEngine) return res.status(503).json({ error: 'ConfidenceEngine not initialized' });
    const project = edl.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const result = confidenceEngine.evaluate(project);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/confidence/history/:projectId?', (req, res) => {
  try {
    if (!confidenceEngine) return res.status(503).json({ error: 'ConfidenceEngine not initialized' });
    res.json(confidenceEngine.getHistory(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/confidence/stats', (req, res) => {
  try {
    if (!confidenceEngine) return res.status(503).json({ error: 'ConfidenceEngine not initialized' });
    res.json(confidenceEngine.getStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cross-Model Validator
app.post('/api/v1/validate/cross-model/:projectId', async (req, res) => {
  try {
    if (!crossModelValidator) return res.status(503).json({ error: 'CrossModelValidator not initialized' });
    const project = edl.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const result = crossModelValidator.runAll(project);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/validate/cross-model/log/:projectId?', (req, res) => {
  try {
    if (!crossModelValidator) return res.status(503).json({ error: 'CrossModelValidator not initialized' });
    res.json(crossModelValidator.getLog(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Digital Twin
app.post('/api/v1/digital-twin/sync/:projectId', async (req, res) => {
  try {
    if (!digitalTwin) return res.status(503).json({ error: 'DigitalTwin not initialized' });
    const result = digitalTwin.synchronize(req.params.projectId);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/digital-twin/sync-all', async (req, res) => {
  try {
    if (!digitalTwin) return res.status(503).json({ error: 'DigitalTwin not initialized' });
    const result = digitalTwin.synchronizeAll();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/digital-twin/snapshot/:projectId', (req, res) => {
  try {
    if (!digitalTwin) return res.status(503).json({ error: 'DigitalTwin not initialized' });
    const snapshot = digitalTwin.getProjectSnapshot(req.params.projectId);
    if (!snapshot) return res.status(404).json({ error: 'Project not found' });
    res.json(snapshot);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/digital-twin/log/:projectId?', (req, res) => {
  try {
    if (!digitalTwin) return res.status(503).json({ error: 'DigitalTwin not initialized' });
    res.json(digitalTwin.getSyncLog(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Vision-Nav Bridge
app.post('/api/v1/vision-nav/sync/:projectId', async (req, res) => {
  try {
    if (!visionNavBridge) return res.status(503).json({ error: 'VisionNavBridge not initialized' });
    const result = visionNavBridge.synchronizeProject(req.params.projectId);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/vision-nav/log/:projectId?', (req, res) => {
  try {
    if (!visionNavBridge) return res.status(503).json({ error: 'VisionNavBridge not initialized' });
    res.json(visionNavBridge.getSyncLog(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Benchmark Extension
app.post('/api/v1/benchmark-ext/run', async (req, res) => {
  try {
    if (!benchmarkExtension) return res.status(503).json({ error: 'BenchmarkExtension not initialized' });
    const result = await benchmarkExtension.runAll();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/benchmark-ext/projects', (req, res) => {
  try {
    if (!benchmarkExtension) return res.status(503).json({ error: 'BenchmarkExtension not initialized' });
    res.json(benchmarkExtension.getReferenceProjects());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/benchmark-ext/results', (req, res) => {
  try {
    if (!benchmarkExtension) return res.status(503).json({ error: 'BenchmarkExtension not initialized' });
    res.json(benchmarkExtension.getLastResults() || { message: 'No results yet. POST /api/v1/benchmark-ext/run first.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Performance & Cache
app.get('/api/v1/performance/queue', (req, res) => {
  try {
    res.json(performanceLayer.BackgroundQueue.getQueueStatus());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/performance/cache/stats', (req, res) => {
  try {
    res.json(performanceLayer.ModelCache.getStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/performance/cache/clear', (req, res) => {
  try {
    performanceLayer.ModelCache.clear();
    res.json({ ok: true, message: 'Cache cleared' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/performance/streams', (req, res) => {
  try {
    res.json(performanceLayer.StreamManager.getStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Orchestrate with new validators (Extended pipeline)
app.post('/api/v1/orchestrate/intelligent', async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    if (!orchestrator) return res.status(503).json({ error: 'AI Orchestrator not initialized' });

    const project = edl.getProject(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const pipelineResult = await orchestrator.runFullPipeline(project, project.rawInput.description || '', parseDescription);
    if (!pipelineResult.ok) {
      return res.json({ ok: false, pipeline: pipelineResult, error: `Pipeline failed at step: ${pipelineResult.failedStep}` });
    }

    // Phase 1: Validators (existing)
    const [
      semanticResult,
      confidenceResult,
      crossModelResult,
      boqAuditResult,
      twinResult,
    ] = await Promise.all([
      semanticValidator ? Promise.resolve(semanticValidator.validateProject(projectId)) : Promise.resolve(null),
      confidenceEngine ? Promise.resolve(confidenceEngine.evaluate(project)) : Promise.resolve(null),
      crossModelValidator ? Promise.resolve(crossModelValidator.runAll(project)) : Promise.resolve(null),
      boqAuditor ? Promise.resolve(boqAuditor.audit(project)) : Promise.resolve(null),
      digitalTwin ? Promise.resolve(digitalTwin.synchronize(projectId)) : Promise.resolve(null),
    ]);

    // Process validation results into learning feedback
    if (learningFeedback) {
      if (semanticResult) learningFeedback.processValidationResult(projectId, semanticResult);
      if (crossModelResult) {
        for (const rule of crossModelResult.rules || []) {
          if (!rule.passed) {
            learningFeedback.recordDecision(projectId, {
              module: 'cross_model_validator',
              decisionType: rule.severity === 'error' ? 'reject' : 'modify',
              reason: rule.message,
              context: { rule: rule.name },
              source: 'validation_engine',
            });
          }
        }
      }
    }

    // Phase 2: Dependency Engine & Decision Graph (build project models)
    if (dependencyEngine) dependencyEngine.buildFromProject(project);
    if (decisionGraph) {
      decisionGraph.buildFromEngineeringGraph(project);
      decisionGraph.buildFromKnowledgeGraph(project);
    }

    // Phase 3: Decision Engine (10-question evaluation)
    const decisionResult = decisionEngine ? decisionEngine.evaluate(projectId) : null;

    // Phase 4: Consistency Scorer (pair-wise cross-model consistency)
    const consistencyResult = consistencyScorer ? consistencyScorer.scoreAll(projectId) : null;

    // Phase 5: Automatic Recalculation (check if any element needs update)
    const autoRecalcResult = autoRecalc ? { needsRecalculation: autoRecalc.needsRecalculation(projectId) } : null;

    // Phase 6: Engineering Memory (store the decision)
    if (engineeringMemory && decisionResult) {
      engineeringMemory.recordDecision(projectId, {
        type: 'orchestration',
        verdict: decisionResult.verdict,
        confidence: confidenceResult?.overall || null,
        issues: decisionResult.totalIssues,
      });
    }

    // Phase 7: Comprehensive recommendations
    const recommendationResult = recommendationEngine ? recommendationEngine.generateAll(projectId, {}) : null;

    // Phase 8: AI Self Review (post-project root cause analysis)
    const reviewResult = selfReview ? selfReview.review(projectId, { deep: false }) : null;

    // Phase 9: Maturity Metrics
    const maturityResult = maturityMetrics ? maturityMetrics.calculate(projectId) : null;

    // Phase 10: Explainable AI (generate decision trace)
    const xaiResult = explainableAI ? explainableAI.generateTrace(projectId) : null;

    // Phase 11: Final Report (aggregate everything)
    const reportResult = finalReport ? finalReport.generate(projectId, {}) : null;

    // VisionNavBridge sync (cross-modal)
    const visionNavResult = visionNavBridge ? visionNavBridge.synchronizeProject(projectId) : null;

    // Benchmark Extension (optional automated run)
    const benchmarkExtResult = benchmarkExtension ? { projects: benchmarkExtension.getReferenceProjects().length } : null;

    // Phase 12: Knowledge-Driven Decision (P10 — historical-data-first)
    let kddResult = null;
    try {
      const type = project.getEffective('type').value;
      const area = project.getEffective('area').value;
      const floors = project.getEffective('floors').value;
      if (kdd && type) {
        kddResult = {
          costEstimate: kdd.decide({ type, area, floors, decisionType: 'estimate_cost' }),
          durationEstimate: kdd.decide({ type, area, floors, decisionType: 'estimate_duration' }),
          systemHealth: kdd.decide({ type, decisionType: 'system_health' }),
        };
      }
    } catch (e) { kddResult = { error: e.message }; }

    res.json({
      ok: true,
      pipeline: pipelineResult,
      validations: {
        semantic: semanticResult,
        confidence: confidenceResult,
        crossModel: crossModelResult,
        boqAudit: boqAuditResult,
        digitalTwin: twinResult,
      },
      advanced: {
        decision: decisionResult,
        consistency: consistencyResult,
        autoRecalc: autoRecalcResult,
        recommendations: recommendationResult,
        selfReview: reviewResult,
        maturity: maturityResult,
        explainableAI: xaiResult,
        finalReport: reportResult,
        visionNav: visionNavResult,
        benchmarkExtension: benchmarkExtResult,
      },
      knowledgeDrivenDecisions: kddResult,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════
// ─── Advanced Engineering Layer Routes ─────────────────
// ══════════════════════════════════════════════════════════

// Engineering Decision Engine
app.post('/api/v1/decision/evaluate/:projectId', async (req, res) => {
  try {
    if (!decisionEngine) return res.status(503).json({ error: 'DecisionEngine not initialized' });
    const result = decisionEngine.evaluate(req.params.projectId);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/decision/log/:projectId?', (req, res) => {
  try {
    if (!decisionEngine) return res.status(503).json({ error: 'DecisionEngine not initialized' });
    res.json(decisionEngine.getDecisionLog(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/decision/stats', (req, res) => {
  try {
    if (!decisionEngine) return res.status(503).json({ error: 'DecisionEngine not initialized' });
    res.json(decisionEngine.getStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Decision Graph
app.post('/api/v1/decision-graph/execute', async (req, res) => {
  try {
    if (!decisionGraph) return res.status(503).json({ error: 'DecisionGraph not initialized' });
    const { startFrom, context } = req.body;
    const result = decisionGraph.execute(startFrom || null, context || {});
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/decision-graph/run-from/:nodeId', async (req, res) => {
  try {
    if (!decisionGraph) return res.status(503).json({ error: 'DecisionGraph not initialized' });
    const result = decisionGraph.runFromStep(req.params.nodeId, req.body.context || {});
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/decision-graph/build', async (req, res) => {
  try {
    if (!decisionGraph) return res.status(503).json({ error: 'DecisionGraph not initialized' });
    const { projectId } = req.body;
    const project = edl.getProject(projectId);
    if (project) {
      decisionGraph.buildFromEngineeringGraph(project);
      decisionGraph.buildFromKnowledgeGraph(project);
    }
    res.json({ ok: true, stats: decisionGraph.getStats(), validation: decisionGraph.validate() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/decision-graph/validate', (req, res) => {
  try {
    if (!decisionGraph) return res.status(503).json({ error: 'DecisionGraph not initialized' });
    res.json(decisionGraph.validate());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/decision-graph/critical-path', (req, res) => {
  try {
    if (!decisionGraph) return res.status(503).json({ error: 'DecisionGraph not initialized' });
    res.json(decisionGraph.criticalPath());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/decision-graph/stats', (req, res) => {
  try {
    if (!decisionGraph) return res.status(503).json({ error: 'DecisionGraph not initialized' });
    res.json(decisionGraph.getStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Explainable AI
app.post('/api/v1/explain/decision/:projectId', async (req, res) => {
  try {
    if (!explainableAI) return res.status(503).json({ error: 'ExplainableAI not initialized' });
    const { decisionId, context } = req.body;
    const result = explainableAI.explain(req.params.projectId, decisionId || null, context || {});
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/explain/rejected/:projectId', async (req, res) => {
  try {
    if (!explainableAI) return res.status(503).json({ error: 'ExplainableAI not initialized' });
    const { itemId } = req.body;
    const result = explainableAI.whyRejected(req.params.projectId, itemId);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/explain/trace/:projectId', async (req, res) => {
  try {
    if (!explainableAI) return res.status(503).json({ error: 'ExplainableAI not initialized' });
    const result = explainableAI.generateTrace(req.params.projectId);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/explain/compare', async (req, res) => {
  try {
    if (!explainableAI) return res.status(503).json({ error: 'ExplainableAI not initialized' });
    const { altA, altB, criteria } = req.body;
    if (!altA || !altB) return res.status(400).json({ error: 'altA and altB required' });
    const result = explainableAI.compareAlternatives('compare', altA, altB, criteria);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/explain/all/:projectId', (req, res) => {
  try {
    if (!explainableAI) return res.status(503).json({ error: 'ExplainableAI not initialized' });
    res.json(explainableAI.explainAll(req.params.projectId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Consistency Scorer
app.post('/api/v1/consistency/score/:projectId', async (req, res) => {
  try {
    if (!consistencyScorer) return res.status(503).json({ error: 'ConsistencyScorer not initialized' });
    const result = consistencyScorer.scoreAll(req.params.projectId);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/consistency/min/:projectId', (req, res) => {
  try {
    if (!consistencyScorer) return res.status(503).json({ error: 'ConsistencyScorer not initialized' });
    res.json({ minConsistency: consistencyScorer.minConsistency(req.params.projectId) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/consistency/blocked/:projectId?', (req, res) => {
  try {
    if (!consistencyScorer) return res.status(503).json({ error: 'ConsistencyScorer not initialized' });
    const { pair } = req.query;
    res.json({ blocked: consistencyScorer.isBlocked(req.params.projectId || null, pair) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/consistency/trend/:projectId?', (req, res) => {
  try {
    if (!consistencyScorer) return res.status(503).json({ error: 'ConsistencyScorer not initialized' });
    res.json(consistencyScorer.trend(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/consistency/history/:projectId?', (req, res) => {
  try {
    if (!consistencyScorer) return res.status(503).json({ error: 'ConsistencyScorer not initialized' });
    res.json(consistencyScorer.getHistory(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Dependency Engine
app.post('/api/v1/dependency/build/:projectId', async (req, res) => {
  try {
    if (!dependencyEngine) return res.status(503).json({ error: 'DependencyEngine not initialized' });
    const project = edl.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    dependencyEngine.buildFromProject(project);
    res.json({ ok: true, stats: dependencyEngine.getStats(), cycles: dependencyEngine.detectCycles() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/dependency/dependencies/:elementId', (req, res) => {
  try {
    if (!dependencyEngine) return res.status(503).json({ error: 'DependencyEngine not initialized' });
    res.json({ elementId: req.params.elementId, dependencies: dependencyEngine.getDependencies(req.params.elementId) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/dependency/dependents/:elementId', (req, res) => {
  try {
    if (!dependencyEngine) return res.status(503).json({ error: 'DependencyEngine not initialized' });
    res.json({ elementId: req.params.elementId, dependents: dependencyEngine.getDependents(req.params.elementId) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/dependency/chain/:elementId', (req, res) => {
  try {
    if (!dependencyEngine) return res.status(503).json({ error: 'DependencyEngine not initialized' });
    res.json({ elementId: req.params.elementId, chain: dependencyEngine.getChain(req.params.elementId) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/dependency/affected/:elementId', (req, res) => {
  try {
    if (!dependencyEngine) return res.status(503).json({ error: 'DependencyEngine not initialized' });
    res.json({ elementId: req.params.elementId, affected: dependencyEngine.getAffected(req.params.elementId) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/dependency/cycles', (req, res) => {
  try {
    if (!dependencyEngine) return res.status(503).json({ error: 'DependencyEngine not initialized' });
    res.json({ cycles: dependencyEngine.detectCycles() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/dependency/report', (req, res) => {
  try {
    if (!dependencyEngine) return res.status(503).json({ error: 'DependencyEngine not initialized' });
    res.json({ report: dependencyEngine.report() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/dependency/stats', (req, res) => {
  try {
    if (!dependencyEngine) return res.status(503).json({ error: 'DependencyEngine not initialized' });
    res.json(dependencyEngine.getStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Automatic Recalculation
app.post('/api/v1/recalculate/:projectId/element/:elementId', async (req, res) => {
  try {
    if (!autoRecalc) return res.status(503).json({ error: 'AutoRecalc not initialized' });
    const { reason, data } = req.body;
    const result = await autoRecalc.onElementChanged(req.params.projectId, req.params.elementId, { reason, data });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/recalculate/:projectId/batch', async (req, res) => {
  try {
    if (!autoRecalc) return res.status(503).json({ error: 'AutoRecalc not initialized' });
    const { changes } = req.body;
    if (!changes || !Array.isArray(changes)) return res.status(400).json({ error: 'changes array required' });
    const result = await autoRecalc.batchRecalculate(req.params.projectId, changes);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/recalculate/:projectId/check/:elementId', async (req, res) => {
  try {
    if (!autoRecalc) return res.status(503).json({ error: 'AutoRecalc not initialized' });
    res.json({ needsRecalculation: autoRecalc.needsRecalculation(req.params.projectId, req.params.elementId) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/recalculate/:projectId/undo', async (req, res) => {
  try {
    if (!autoRecalc) return res.status(503).json({ error: 'AutoRecalc not initialized' });
    res.json(autoRecalc.undoLast(req.params.projectId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/recalculate/history/:projectId?', (req, res) => {
  try {
    if (!autoRecalc) return res.status(503).json({ error: 'AutoRecalc not initialized' });
    res.json(autoRecalc.getHistory(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Engineering Memory
app.post('/api/v1/memory/decision', async (req, res) => {
  try {
    if (!engineeringMemory) return res.status(503).json({ error: 'EngineeringMemory not initialized' });
    const { projectId, decision } = req.body;
    if (!projectId || !decision) return res.status(400).json({ error: 'projectId and decision required' });
    const result = engineeringMemory.recordDecision(projectId, decision);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/memory/decisions/:projectId?', (req, res) => {
  try {
    if (!engineeringMemory) return res.status(503).json({ error: 'EngineeringMemory not initialized' });
    const { type, minConfidence, since } = req.query;
    res.json(engineeringMemory.getDecisions(req.params.projectId || null, { type, minConfidence: Number(minConfidence) || 0, since }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/memory/similar-projects', async (req, res) => {
  try {
    if (!engineeringMemory) return res.status(503).json({ error: 'EngineeringMemory not initialized' });
    const { criteria } = req.body;
    res.json(engineeringMemory.findSimilarProjects(criteria || {}));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/memory/record-similar', async (req, res) => {
  try {
    if (!engineeringMemory) return res.status(503).json({ error: 'EngineeringMemory not initialized' });
    const result = engineeringMemory.storeSimilarProject(req.body);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/memory/search', async (req, res) => {
  try {
    if (!engineeringMemory) return res.status(503).json({ error: 'EngineeringMemory not initialized' });
    const { query, limit } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    res.json(engineeringMemory.search(query, limit || 10));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/memory/forget/:projectId', async (req, res) => {
  try {
    if (!engineeringMemory) return res.status(503).json({ error: 'EngineeringMemory not initialized' });
    const { type } = req.body;
    res.json(engineeringMemory.forget(req.params.projectId, type));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/memory/references/:key?', (req, res) => {
  try {
    if (!engineeringMemory) return res.status(503).json({ error: 'EngineeringMemory not initialized' });
    res.json(engineeringMemory.getReferences(req.params.key || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/memory/export', (req, res) => {
  try {
    if (!engineeringMemory) return res.status(503).json({ error: 'EngineeringMemory not initialized' });
    res.json(engineeringMemory.exportAll());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/memory/stats', (req, res) => {
  try {
    if (!engineeringMemory) return res.status(503).json({ error: 'EngineeringMemory not initialized' });
    res.json(engineeringMemory.getStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI Self Review
app.post('/api/v1/self-review/:projectId', async (req, res) => {
  try {
    if (!selfReview) return res.status(503).json({ error: 'AISelfReview not initialized' });
    const { deep } = req.body;
    const result = selfReview.review(req.params.projectId, { deep: deep || false });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/self-review/compare', async (req, res) => {
  try {
    if (!selfReview) return res.status(503).json({ error: 'AISelfReview not initialized' });
    const { projectIdA, projectIdB } = req.body;
    if (!projectIdA || !projectIdB) return res.status(400).json({ error: 'projectIdA and projectIdB required' });
    res.json(selfReview.compare(projectIdA, projectIdB));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/self-review/history/:projectId?', (req, res) => {
  try {
    if (!selfReview) return res.status(503).json({ error: 'AISelfReview not initialized' });
    res.json(selfReview.getHistory(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/self-review/stats', (req, res) => {
  try {
    if (!selfReview) return res.status(503).json({ error: 'AISelfReview not initialized' });
    res.json(selfReview.getStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Recommendation Engine
app.post('/api/v1/recommendations/:projectId', async (req, res) => {
  try {
    if (!recommendationEngine) return res.status(503).json({ error: 'RecommendationEngine not initialized' });
    const { options } = req.body;
    const result = recommendationEngine.generateAll(req.params.projectId, options || {});
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/recommendations/:projectId/materials', async (req, res) => {
  try {
    if (!recommendationEngine) return res.status(503).json({ error: 'RecommendationEngine not initialized' });
    const project = edl.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(recommendationEngine.recommendMaterials(project, req.body.options || {}));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/recommendations/:projectId/cost', async (req, res) => {
  try {
    if (!recommendationEngine) return res.status(503).json({ error: 'RecommendationEngine not initialized' });
    const project = edl.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(recommendationEngine.recommendCostOptimization(project, req.body.options || {}));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/recommendations/:projectId/suppliers', async (req, res) => {
  try {
    if (!recommendationEngine) return res.status(503).json({ error: 'RecommendationEngine not initialized' });
    const project = edl.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(recommendationEngine.recommendSuppliers(project, req.body.options || {}));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/recommendations/:projectId/missing-items', async (req, res) => {
  try {
    if (!recommendationEngine) return res.status(503).json({ error: 'RecommendationEngine not initialized' });
    const project = edl.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(recommendationEngine.recommendMissingItems(project, req.body.options || {}));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/recommendations/history/:projectId?', (req, res) => {
  try {
    if (!recommendationEngine) return res.status(503).json({ error: 'RecommendationEngine not initialized' });
    res.json(recommendationEngine.getHistory(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/recommendations/stats', (req, res) => {
  try {
    if (!recommendationEngine) return res.status(503).json({ error: 'RecommendationEngine not initialized' });
    res.json(recommendationEngine.getStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Maturity Metrics
app.post('/api/v1/maturity/:projectId', async (req, res) => {
  try {
    if (!maturityMetrics) return res.status(503).json({ error: 'MaturityMetrics not initialized' });
    const result = maturityMetrics.calculate(req.params.projectId);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/maturity/trend', (req, res) => {
  try {
    if (!maturityMetrics) return res.status(503).json({ error: 'MaturityMetrics not initialized' });
    res.json(maturityMetrics.trend(Number(req.query.limit) || 10));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/maturity/compare', async (req, res) => {
  try {
    if (!maturityMetrics) return res.status(503).json({ error: 'MaturityMetrics not initialized' });
    const { projectIds } = req.body;
    if (!projectIds || !Array.isArray(projectIds)) return res.status(400).json({ error: 'projectIds array required' });
    res.json(maturityMetrics.compare(projectIds));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/maturity/history/:projectId?', (req, res) => {
  try {
    if (!maturityMetrics) return res.status(503).json({ error: 'MaturityMetrics not initialized' });
    res.json(maturityMetrics.getHistory(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/maturity/stats', (req, res) => {
  try {
    if (!maturityMetrics) return res.status(503).json({ error: 'MaturityMetrics not initialized' });
    res.json(maturityMetrics.getStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Final Report
app.post('/api/v1/final-report/:projectId', async (req, res) => {
  try {
    if (!finalReport) return res.status(503).json({ error: 'FinalReport not initialized' });
    const { options } = req.body;
    const result = finalReport.generate(req.params.projectId, options || {});
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/v1/final-report/compare', async (req, res) => {
  try {
    if (!finalReport) return res.status(503).json({ error: 'FinalReport not initialized' });
    const { projectIdA, projectIdB } = req.body;
    if (!projectIdA || !projectIdB) return res.status(400).json({ error: 'projectIdA and projectIdB required' });
    res.json(finalReport.compare(projectIdA, projectIdB));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/final-report/history/:projectId?', (req, res) => {
  try {
    if (!finalReport) return res.status(503).json({ error: 'FinalReport not initialized' });
    res.json(finalReport.getHistory(req.params.projectId || null));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/v1/final-report/stats', (req, res) => {
  try {
    if (!finalReport) return res.status(503).json({ error: 'FinalReport not initialized' });
    res.json(finalReport.getStats());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════
// ─── 404 ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.url }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ─── Persist learning data periodically ──
const LEARNING_FILE = runtimePath('core', 'boq-learning.json');

function saveLearningData() {
  try {
    const data = JSON.stringify({
      priceLearner: boqEngine.priceLearner.toJSON(),
      assumptionManager: {
        userDecisions: boqEngine.assumptionManager.userDecisions,
        learningData: boqEngine.assumptionManager.learningData,
      },
      savedAt: new Date().toISOString(),
    });
    writeJsonAtomic(LEARNING_FILE, JSON.parse(data));
  } catch (e) { /* silent */ }
}

function loadLearningData() {
  try {
    if (fs.existsSync(LEARNING_FILE)) {
      const raw = fs.readFileSync(LEARNING_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data.priceLearner) {
        boqEngine.priceLearner = PriceLearner.fromJSON(data.priceLearner);
      }
      if (data.assumptionManager) {
        const am = boqEngine.assumptionManager;
        if (data.assumptionManager.userDecisions && typeof data.assumptionManager.userDecisions === 'object') {
          am.userDecisions = {
            accepted: Array.isArray(data.assumptionManager.userDecisions.accepted) ? data.assumptionManager.userDecisions.accepted : [],
            modified: Array.isArray(data.assumptionManager.userDecisions.modified) ? data.assumptionManager.userDecisions.modified : [],
            rejected: Array.isArray(data.assumptionManager.userDecisions.rejected) ? data.assumptionManager.userDecisions.rejected : [],
          };
        }
        if (data.assumptionManager.learningData && typeof data.assumptionManager.learningData === 'object') {
          am.learningData = {
            patterns: data.assumptionManager.learningData.patterns || {},
            projectHistory: Array.isArray(data.assumptionManager.learningData.projectHistory) ? data.assumptionManager.learningData.projectHistory : [],
          };
        }
      }
      const ud = data.assumptionManager?.userDecisions || {};
      const accepted = Array.isArray(ud.accepted) ? ud.accepted.length : 0;
      console.log(`[ACEP] Loaded ${accepted} past decisions from learning data`);
    }
  } catch (e) { /* silent */ }
}

loadLearningData();
const learningSaveInterval = setInterval(saveLearningData, 60000);

const httpServer = app.listen(PORT, HOST, () => {
  console.log(JSON.stringify({
    event: 'server_started',
    message: `ACEP Server v${APP_VERSION}`,
    version: APP_VERSION,
    host: HOST,
    port: Number(PORT),
    live: '/live',
    ready: '/ready',
    security: security.status(),
    modules: {
      orchestrator: Boolean(orchestrator),
      decisionEngine: Boolean(decisionEngine),
      decisionGraph: Boolean(decisionGraph),
      finalReport: Boolean(finalReport)
    },
    modelGovernance: {
      millionProject: ai.millionProjectModel.getStatus()
    },
    note: 'Module registration does not constitute engineering, data, security, or regulatory approval.'
  }));
});

let shuttingDown = false;
function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ event: 'shutdown_started', signal }));
  clearInterval(persistInterval);
  clearInterval(phaseSaveInterval);
  clearInterval(learningSaveInterval);
  try { edl.persist(EDL_STATE_PATH); } catch {}
  try { savePhaseState(); } catch {}
  try { saveLearningData(); } catch {}
  try { uets.stopAutoRetrain(); uets.trainingManager.stopWorker(); } catch {}

  const forced = setTimeout(() => process.exit(1), 10000);
  forced.unref();
  httpServer.close(error => {
    clearTimeout(forced);
    if (error) {
      console.error(JSON.stringify({ event: 'shutdown_failed', message: error.message }));
      process.exit(1);
    }
    console.log(JSON.stringify({ event: 'shutdown_completed' }));
    process.exit(0);
  });
}

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = { app, httpServer, gracefulShutdown };
