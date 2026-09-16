const kb = require('./knowledge-base');
const projectAnalyzer = require('./models/project-analyzer');
const quantityEstimator = require('./models/quantity-estimator');
const costEstimator = require('./models/cost-estimator');
const engineeringAssistant = require('./models/engineering-assistant');
const riskAnalyzer = require('./models/risk-analyzer');
const qualityInspector = require('./models/quality-inspector');
const scheduleOptimizer = require('./models/schedule-optimizer');
const supplierIntelligence = require('./models/supplier-intelligence');
const millionProjectModel = require('./models/million-project-model');
const trainer = require('./models/trainer');
const ProjectProfiler = require('./project-understanding/project-profiler');
const KnowledgeBaseEngine = require('./knowledge-engine/knowledge-base-engine');
const KnowledgeGraph = require('./knowledge-engine/knowledge-graph');
const ReviewSystem = require('./knowledge-engine/review-system');
const ContinuousLearner = require('./knowledge-engine/continuous-learner');
const QualityIndicators = require('./knowledge-engine/quality-indicators');
const VisualLinkage = require('./knowledge-engine/visual-linkage');
const AgentPipeline = require('./agents/agent-pipeline');

let initialized = false;
const projectProfiler = new ProjectProfiler(kb);
const knowledgeEngine = new KnowledgeBaseEngine();
const knowledgeGraph = new KnowledgeGraph();
let reviewSystem = null;
let continuousLearner = null;
let qualityIndicators = null;
let visualLinkage = null;
let agentPipeline = null;

async function initialize() {
  if (initialized) return { totalRecords: 0 };
  kb.initialize();
  const result = await trainer.trainAllModels();
  const { EngineeringDataLayer } = require('./engineering-data-layer');
  const edl = new EngineeringDataLayer();
  agentPipeline = new AgentPipeline(
    { projectProfiler, quantityEstimator, knowledgeEngine, kb },
    edl, kb
  );
  reviewSystem = new ReviewSystem({ knowledgeEngine }, kb);
  continuousLearner = new ContinuousLearner();
  qualityIndicators = new QualityIndicators(kb);
  visualLinkage = new VisualLinkage({}, kb);
  initialized = true;
  return result;
}

function getStatus() {
  return {
    initialized,
    knowledgeBase: kb.initialized,
    projectAnalyzer: projectAnalyzer.trained,
    quantityEstimator: quantityEstimator.trained,
    costEstimator: costEstimator.trained,
    engineeringAssistant: engineeringAssistant.trained,
    riskAnalyzer: riskAnalyzer.trained,
    qualityInspector: qualityInspector.trained,
    scheduleOptimizer: scheduleOptimizer.trained,
    supplierIntelligence: supplierIntelligence.trained,
    millionProjectModel: millionProjectModel.getStatus()
  };
}

module.exports = {
  initialize, getStatus, kb,
  projectAnalyzer, quantityEstimator, costEstimator,
  engineeringAssistant, riskAnalyzer, qualityInspector,
  scheduleOptimizer, supplierIntelligence,
  millionProjectModel,
  projectProfiler, knowledgeEngine, knowledgeGraph,
  getAgentPipeline: () => agentPipeline,
  getReviewSystem: () => reviewSystem,
  getContinuousLearner: () => continuousLearner,
  getQualityIndicators: () => qualityIndicators,
  getVisualLinkage: () => visualLinkage
};

module.exports.detectProjectType = kb.detectProjectType.bind(kb);
module.exports.detectProjectTypeConfidence = kb.detectProjectTypeConfidence.bind(kb);
