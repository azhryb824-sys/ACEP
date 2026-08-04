/**
 * ACEP Smart BOQ Rule Engine — v3 (Knowledge Base Edition)
 *
 * This file is now a thin wrapper around the Engineering BOQ Engine.
 * - All hardcoded templates removed
 * - All items are dynamically generated from the Engineering Knowledge Base
 * - Each item is assigned to its proper lifecycle phase
 * - No items appear outside their phase
 *
 * @see ../engineering-ke/boq-engine.js for the actual engine
 * @see ../engineering-ke/boq-knowledge-base.js for the item definitions
 */

const BOQEngine = require('../engineering-ke/boq-engine');

// Singleton engine instance
const engine = new BOQEngine();

/**
 * Detect project phase from description and type.
 */
function detectPhase(projectType, description) {
  // Delegate to KB's detectPhase
  return require('../engineering-ke/boq-knowledge-base').detectPhase(projectType, description);
}

/**
 * Generate BOQ items using the Engineering Knowledge Base engine.
 *
 * @param {object} params - { type, area, floors, rooms, bathrooms, hasKitchen, halls, city, phase, description }
 * @param {object} trainingStats - Training data stats for unit price estimation
 * @returns {{ items: object[], suggestedItems: object[], assumptions: object[], summary: object }}
 */
function generateBOQ(params, trainingStats) {
  const result = engine.generate(params, trainingStats);
  return {
    items: result.items,
    suggestedItems: result.suggestedItems,
    assumptions: result.assumptions,
    phase: result.phase,
    lifecyclePhases: result.lifecyclePhases,
    summary: result.summary,
  };
}

/**
 * Get BOQ assumptions for review (no final items, just assumptions).
 */
function getBOQAssumptions(params) {
  return engine.getAssumptions(params);
}

/**
 * Get explanation for a specific BOQ item code.
 */
function getItemExplanation(code, params) {
  return engine.getItemExplanation(code, params);
}

/**
 * Record user edit as training feedback.
 */
function recordUserEdit(projectId, itemCode, field, oldValue, newValue, projectParams) {
  return engine.recordUserEdit(projectId, itemCode, field, oldValue, newValue, projectParams);
}

/**
 * Get the full knowledge base reference.
 */
function getKnowledgeBase() {
  return engine.getKnowledgeBase();
}

module.exports = {
  generateBOQ,
  getBOQAssumptions,
  getItemExplanation,
  recordUserEdit,
  getKnowledgeBase,
  detectPhase,
  RULES: null, // intentionally null — no static rules in v3
  engine,
};
