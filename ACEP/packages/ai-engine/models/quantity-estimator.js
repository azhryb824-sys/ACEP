/**
 * ACEP Smart Quantity Estimator — v3 (Rule Engine + Training Data)
 *
 * Hybrid approach:
 * 1. Rule Engine determines WHICH items to generate based on project type + phase
 * 2. Supplied CSV records provide descriptive unit-price statistics; provenance is unverified
 * 3. No hardcoded building defaults. Every item is derived from project params + rules.
 */

const csv = require('./training-csv');
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
    const fit = csv.load(fp,
      ['project_id','item_code','description_ar','category','unit','quantity','unit_price_sar','confidence','waste_factor'],
      r=>({projectId:r.project_id,description:r.description_ar,category:r.category,unit:csv.unit(r.unit),quantity:csv.number(r.quantity),unitPrice:csv.number(r.unit_price_sar),confidence:csv.number(r.confidence),wasteFactor:csv.number(r.waste_factor)}));
    const group=(key)=>{
      const groups=Object.create(null),stats=Object.create(null);
      for(const item of fit.data){const k=key(item);(groups[k] ||= []).push(item.unitPrice);}
      for(const [k,p] of Object.entries(groups)){
        p.sort((a,b)=>a-b);const n=p.length;
        stats[k]={count:n,priceMean:p.reduce((a,b)=>a+b,0)/n,priceMedian:(p[Math.floor((n-1)/2)]+p[Math.floor(n/2)])/2,priceMin:p[0],priceMax:p[n-1]};
      }
      return stats;
    };
    this.byCategory=group(r=>r.category+'|'+r.unit);
    this.byItemUnit=group(r=>r.description+'|'+r.unit);
    this.trainingAudit={...fit.audit,provenance:'unverified_csv',accuracyValidated:false};
    this.trained=true;this._boqCount=fit.data.length;this.boqData=null;
    return {items:this._boqCount,categories:Object.keys(this.byCategory).length,itemUnitGroups:Object.keys(this.byItemUnit).length,audit:this.trainingAudit};
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
    const result = boqRules.generateBOQ(params, { byItemUnit: this.byItemUnit, suppressRegionalAdjustment: true });

    // Apply finishing & region price adjustments from training data
    const multiplier = kb.getMaterialPriceMultiplier(finishing);
    const regionIndex = kb.getRegionIndex(region);
    if (multiplier !== 1 || regionIndex !== 1) {
      for (const item of [...result.items, ...(result.suggestedItems || [])]) {
        if (item.unitPrice && !item.insufficient) {
          item.unitPrice = Math.round(item.unitPrice * multiplier * regionIndex * 100) / 100;
          item.totalPrice = Math.round(item.quantity * item.unitPrice * 100) / 100;
          item.priceNote = `سعر الأساس معدل بعامل التشطيب (${multiplier}) وعامل المنطقة (${regionIndex})`;
        }
      }
    }

    result.summary.totalCost=Math.round(result.items.reduce((s,i)=>s+(i.totalPrice||0),0)*100)/100;
    result.summary.totalSuggestedCost=Math.round((result.suggestedItems||[]).reduce((s,i)=>s+(i.totalPrice||0),0)*100)/100;
    return {
      items: result.items,
      suggestedItems: result.suggestedItems,
      assumptions: result.assumptions,
      lifecyclePhases: result.lifecyclePhases,
      phase: result.phase,
      summary: {
        ...result.summary,
        trainingDataAvailable: this._boqCount || 0,
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
