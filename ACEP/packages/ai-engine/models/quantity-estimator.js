/**
 * ACEP Smart Quantity Estimator — v3 (Rule Engine + Training Data)
 *
 * Hybrid approach:
 * 1. Rule Engine determines WHICH items to generate based on project type + phase
 * 2. Training data (85,062 real BOQ items) provides unit prices per category
 * 3. No hardcoded building defaults. Every item is derived from project params + rules.
 */

const fs = require('fs');
const path = require('path');
const kb = require('../knowledge-base');
const boqRules = require('./boq-rules');

class QuantityEstimator {
  constructor() {
    this.trained = false;
    this.boqData = [];
    this.byCategory = {};
    this.byProjectType = {};
    this.userEdits = []; // tracked training feedback
  }

  async train(csvPath) {
    const fp = csvPath || path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv', 'boq_items.csv');
    this.boqData = fs.readFileSync(fp, 'utf8').trim().split('\n').slice(1).map(l => {
      const c = l.split(',');
      return {
        projectId: c[0], itemCode: c[1], description: c[2],
        category: c[3], unit: c[4], quantity: parseFloat(c[5]) || 0,
        unitPrice: parseFloat(c[6]) || 0, confidence: parseInt(c[7]) || 0,
        wasteFactor: parseFloat(c[8]) || 0
      };
    });

    // Build per-category price stats from training data
    const cats = {};
    for (const item of this.boqData) {
      if (!item.unitPrice || item.unitPrice <= 0) continue;
      const prefix = (item.itemCode || item.category || 'GEN').split('-')[0];
      if (!cats[prefix]) cats[prefix] = [];
      cats[prefix].push(item.unitPrice);
    }
    for (const [cat, prices] of Object.entries(cats)) {
      prices.sort((a, b) => a - b);
      this.byCategory[cat] = {
        count: prices.length,
        priceMean: prices.reduce((s, v) => s + v, 0) / prices.length,
        priceMedian: prices[Math.floor(prices.length / 2)],
        priceMin: prices[0],
        priceMax: prices[prices.length - 1]
      };
    }

    this.trained = true;
    return { items: this.boqData.length, categories: Object.keys(this.byCategory).length };
  }

  /**
   * Generate BOQ for a project.
   *
   * @param {string} projectType - e.g. 'Apartment_Finishing', 'Villa', etc.
   * @param {number} area - land/building area in m²
   * @param {number} floors - number of floors
   * @param {string} finishing - finishing level (Standard, Premium, etc.)
   * @param {string} region - region/city name
   * @param {object} extraParams - { rooms, bathrooms, hasKitchen, halls, city, description, phase }
   * @returns {{ items: object[], summary: object }}
   */
  estimateBOQ(projectType, area, floors, finishing = 'Standard', region = 'Riyadh', extraParams = {}) {
    if (!this.trained) return { items: [], summary: { totalItems: 0, totalCost: 0, averageConfidence: 0 } };

    const params = {
      type: projectType,
      area: area || 0,
      floors: floors || 1,
      rooms: extraParams.rooms || null,
      bathrooms: extraParams.bathrooms || null,
      hasKitchen: extraParams.hasKitchen || false,
      halls: extraParams.halls || null,
      city: extraParams.city || region,
      description: extraParams.description || '',
      phase: extraParams.phase || null
    };

    // Generate BOQ via Engineering Knowledge Base engine (v3)
    const result = boqRules.generateBOQ(params, { byCategory: this.byCategory });

    // Apply finishing & region price adjustments from training data
    const multiplier = kb.getMaterialPriceMultiplier(finishing);
    const regionIndex = kb.getRegionIndex(region);
    if (multiplier !== 1 || regionIndex !== 1) {
      for (const item of result.items) {
        if (item.unitPrice && !item.insufficient) {
          item.unitPrice = Math.round(item.unitPrice * multiplier * regionIndex * 100) / 100;
          item.totalPrice = Math.round(item.quantity * item.unitPrice * 100) / 100;
          item.priceNote = `سعر الأساس معدل بعامل التشطيب (${multiplier}) وعامل المنطقة (${regionIndex})`;
        }
      }
    }

    return {
      items: result.items,
      suggestedItems: result.suggestedItems,
      assumptions: result.assumptions,
      lifecyclePhases: result.lifecyclePhases,
      phase: result.phase,
      summary: {
        ...result.summary,
        trainingDataAvailable: this.boqData.length,
        priceDataPoints: Object.keys(this.byCategory).length,
        region,
        finishing
      }
    };
  }

  /**
   * Get BOQ assumptions for review (before final approval).
   */
  getBOQAssumptions(projectType, area, floors, finishing = 'Standard', region = 'Riyadh', extraParams = {}) {
    const params = {
      type: projectType,
      area: area || 0,
      floors: floors || 1,
      rooms: extraParams.rooms || null,
      bathrooms: extraParams.bathrooms || null,
      hasKitchen: extraParams.hasKitchen || false,
      halls: extraParams.halls || null,
      city: extraParams.city || region,
      description: extraParams.description || '',
      phase: extraParams.phase || null
    };
    return boqRules.getBOQAssumptions(params);
  }

  /**
   * Get calculation explanation for a specific BOQ item code.
   */
  getItemExplanation(code, params) {
    return boqRules.getItemExplanation(code, params);
  }

  /**
   * Record user edit for training feedback.
   */
  recordUserEdit(projectId, itemCode, field, oldValue, newValue, projectParams) {
    return boqRules.recordUserEdit(projectId, itemCode, field, oldValue, newValue, projectParams);
  }

  /**
   * Get knowledge base reference.
   */
  getKnowledgeBase() {
    return boqRules.getKnowledgeBase();
  }

  getUserEdits() {
    return boqRules.engine ? boqRules.engine.userEdits : this.userEdits;
  }
}

module.exports = new QuantityEstimator();
