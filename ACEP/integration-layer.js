/**
 * ACEP Integration Layer
 * Connects Express server to compiled TypeScript modules
 */
const path = require('path');

let KnowledgeGraph, BOQItemsLibrary, SpacesLibrary, MaterialLibrary, KnowledgeBaseManager;

try {
  const kb = require('@acep/knowledge-base');
  KnowledgeGraph = kb.KnowledgeGraph;
  BOQItemsLibrary = kb.BOQItemsLibrary;
  SpacesLibrary = kb.SpacesLibrary;
  MaterialLibrary = kb.MaterialLibrary;
  KnowledgeBaseManager = kb.KnowledgeBaseManager;
} catch (e) {
  console.warn('[Integration] Knowledge-base not compiled, using fallback');
}

let initialized = false;
let knowledgeGraph, boqLib, spacesLib, materialLib;

async function initialize() {
  if (initialized) return;
  if (KnowledgeGraph) {
    knowledgeGraph = new KnowledgeGraph();
    boqLib = new BOQItemsLibrary();
    spacesLib = new SpacesLibrary();
    materialLib = new MaterialLibrary();
    console.log('[Integration] Knowledge-base modules loaded');
  }
  initialized = true;
}

function generateProjectId() { return 'proj-' + Date.now(); }

function generateBOQItems(projectType, floors, area) {
  if (boqLib) {
    try {
      const items = boqLib.getAll().slice(0, 20).map((t, i) => ({
        code: t.code || `BOQ-${String(i + 1).padStart(4, '0')}`,
        description: t.description || `Item ${i + 1}`,
        unit: t.unit || 'm³',
        quantity: Math.round((area * (floors || 1) * (0.05 + Math.random() * 0.3)) * 100) / 100,
        unitPrice: t.referencePrice || 100 + Math.floor(Math.random() * 500),
        totalPrice: 0,
        confidence: 0.7 + Math.random() * 0.25,
        category: t.category || 'General'
      }));
      items.forEach(item => { item.totalPrice = Math.round(item.quantity * item.unitPrice * 100) / 100; });
      return items;
    } catch (e) { /* fall through */ }
  }
  return [];
}

function estimateCost(items) {
  const materials = items.reduce((s, i) => s + i.totalPrice, 0) * 0.35;
  const labor = items.reduce((s, i) => s + i.totalPrice, 0) * 0.25;
  const equip = items.reduce((s, i) => s + i.totalPrice, 0) * 0.10;
  const subcon = items.reduce((s, i) => s + i.totalPrice, 0) * 0.133;
  const overhead = items.reduce((s, i) => s + i.totalPrice, 0) * 0.125;
  const baseCost = materials + labor + equip + subcon + overhead;
  return {
    directCost: Math.round((materials + labor + equip) * 100) / 100,
    indirectCost: Math.round(overhead * 100) / 100,
    contingency: Math.round(baseCost * 0.042 * 100) / 100,
    totalCost: Math.round(baseCost * 1.042 * 100) / 100,
    breakdown: { materials: { cost: Math.round(materials), percentage: 35 },
      labor: { cost: Math.round(labor), percentage: 25 },
      equipment: { cost: Math.round(equip), percentage: 10 },
      subcontractor: { cost: Math.round(subcon), percentage: 13.3 },
      overhead: { cost: Math.round(overhead), percentage: 12.5 },
      contingency: { cost: Math.round(baseCost * 0.042), percentage: 4.2 } }
  };
}

module.exports = { initialize, generateProjectId, generateBOQItems, estimateCost, getKnowledgeGraph: () => knowledgeGraph };
