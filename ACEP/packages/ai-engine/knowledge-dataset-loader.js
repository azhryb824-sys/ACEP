const path = require('path');
const fs = require('fs');

class KnowledgeDatasetLoader {
  constructor(trainingBridge) {
    this.bridge = trainingBridge;
    this.dataset = null;
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return this;
    const data = this.bridge.data;
    if (!data || !data.projects || data.projects.length === 0) {
      console.warn('[KDS] No training data available — dataset will be empty');
      this.dataset = this._emptyDataset();
      this._initialized = true;
      return this;
    }

    this.dataset = {
      generatedAt: new Date().toISOString(),
      sourceStats: this.bridge.getStats(),
      standardQuantities: this._computeStandardQuantities(data.projects, data.boqItems),
      unitPrices: this._computeUnitPrices(data.boqItems),
      materialPrices: this._computeMaterialPrices(data.materialPrices),
      laborRates: this._computeLaborRates(data.laborRates),
      equipmentRates: this._computeEquipmentRates(data.equipmentRates),
      projectUnderstanding: this._computeProjectUnderstanding(data.projects),
      riskProfile: this._computeRiskProfile(data.risks),
      qualityProfile: this._computeQualityProfile(data.qualityDefects),
    };

    this._initialized = true;
    const total = this.dataset.standardQuantities.projectTypes.length;
    const items = Object.keys(this.dataset.unitPrices).length;
    const materials = this.dataset.materialPrices.materials;
    console.log(`[KDS] Dataset ready: ${total} project types, ${items} BOQ items, ${materials} materials`);
    return this;
  }

  _computeStandardQuantities(projects, boqItems) {
    const groups = {};
    for (const p of projects) {
      const type = p.projectType || 'Unknown';
      if (!groups[type]) groups[type] = [];
      groups[type].push(p);
    }

    const result = {};
    for (const [type, list] of Object.entries(groups)) {
      const areaValues = list.filter(p => p.buildingArea > 0).map(p => p.buildingArea);
      if (areaValues.length < 3) continue;

      const getAvg = (field) => {
        const vals = list.filter(p => p[field] > 0).map(p => p[field]);
        if (vals.length < 3) return null;
        const sum = vals.reduce((a, b) => a + b, 0);
        const mean = sum / vals.length;
        const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
        return {
          mean: Math.round(mean * 100) / 100,
          median: this._median(vals),
          min: Math.round(Math.min(...vals) * 100) / 100,
          max: Math.round(Math.max(...vals) * 100) / 100,
          stddev: Math.round(Math.sqrt(variance) * 100) / 100,
          samples: vals.length,
        };
      };

      const getPerM2 = (field) => {
        const ratios = [];
        for (const p of list) {
          if (p.buildingArea > 0 && p[field] > 0) {
            ratios.push(p[field] / p.buildingArea);
          }
        }
        if (ratios.length < 3) return null;
        const sum = ratios.reduce((a, b) => a + b, 0);
        const mean = sum / ratios.length;
        const variance = ratios.reduce((s, v) => s + (v - mean) ** 2, 0) / ratios.length;
        return {
          mean: Math.round(mean * 10000) / 10000,
          median: this._median(ratios),
          min: Math.round(Math.min(...ratios) * 10000) / 10000,
          max: Math.round(Math.max(...ratios) * 10000) / 10000,
          stddev: Math.round(Math.sqrt(variance) * 10000) / 10000,
          samples: ratios.length,
        };
      };

      const areaMean = areaValues.reduce((a, b) => a + b, 0) / areaValues.length;

      const finishingLevels = {};
      for (const p of list) {
        const fl = p.finishingLevel || 'Standard';
        if (!finishingLevels[fl]) finishingLevels[fl] = 0;
        finishingLevels[fl]++;
      }

      const methods = {};
      for (const p of list) {
        const cm = p.constructionMethod || 'Unknown';
        if (!methods[cm]) methods[cm] = 0;
        methods[cm]++;
      }

      result[type] = {
        samples: list.length,
        avgBuildingArea: Math.round(areaMean * 100) / 100,
        avgFloors: getAvg('floors'),
        avgUnits: getAvg('units'),
        avgCost: getAvg('estimatedCost'),
        avgDuration: getAvg('duration'),
        perM2: {
          concrete: getPerM2('concrete'),
          steel: getPerM2('steel'),
          blocks: getPerM2('blocks'),
          tiles: getPerM2('tiles'),
          paint: getPerM2('paint'),
          electricalPoints: getPerM2('electrical'),
          plumbingPoints: getPerM2('plumbing'),
        },
        finishingDistribution: finishingLevels,
        constructionMethods: methods,
      };
    }

    return {
      projectTypes: Object.keys(result).sort(),
      data: result,
    };
  }

  _computeUnitPrices(boqItems) {
    const groups = {};
    for (const item of boqItems) {
      const code = item.itemCode || item.code;
      if (!code) continue;
      if (!groups[code]) groups[code] = [];
      groups[code].push(item);
    }

    const result = {};
    for (const [code, items] of Object.entries(groups)) {
      const prices = items.filter(i => (i.unitPrice || i.unit_price_sar) > 0).map(i => i.unitPrice || i.unit_price_sar);
      if (prices.length < 3) continue;
      const sum = prices.reduce((a, b) => a + b, 0);
      const mean = sum / prices.length;
      const variance = prices.reduce((s, v) => s + (v - mean) ** 2, 0) / prices.length;

      const categories = {};
      for (const item of items) {
        const cat = item.category || 'General';
        if (!categories[cat]) categories[cat] = 0;
        categories[cat]++;
      }

      const topCat = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';
      const desc = items.find(i => i.description)?.description || '';

      result[code] = {
        description: desc,
        category: topCat,
        unit: items.find(i => i.unit)?.unit || 'no',
        avgPrice: Math.round(mean * 100) / 100,
        medianPrice: this._median(prices),
        minPrice: Math.round(Math.min(...prices) * 100) / 100,
        maxPrice: Math.round(Math.max(...prices) * 100) / 100,
        stddev: Math.round(Math.sqrt(variance) * 100) / 100,
        samples: prices.length,
      };
    }

    return result;
  }

  _computeMaterialPrices(materialPrices) {
    const groups = {};
    for (const mp of materialPrices) {
      const key = mp.material || mp.material_name;
      if (!key) continue;
      if (!groups[key]) groups[key] = [];
      groups[key].push(mp);
    }

    const materials = {};
    for (const [name, list] of Object.entries(groups)) {
      const prices = list.filter(p => p.price > 0).map(p => p.price);
      if (prices.length < 2) continue;
      const sum = prices.reduce((a, b) => a + b, 0);
      const mean = sum / prices.length;

      const byCity = {};
      for (const p of list) {
        const city = p.city || p.region || 'Unknown';
        if (!byCity[city]) byCity[city] = [];
        byCity[city].push(p.price);
      }
      const cityAvgs = {};
      for (const [city, cPrices] of Object.entries(byCity)) {
        cityAvgs[city] = Math.round(cPrices.reduce((a, b) => a + b, 0) / cPrices.length * 100) / 100;
      }

      materials[name] = {
        unit: list.find(i => i.unit)?.unit || 'unit',
        category: list.find(i => i.category)?.category || 'General',
        avgPrice: Math.round(mean * 100) / 100,
        medianPrice: this._median(prices),
        samples: prices.length,
        byCity: cityAvgs,
      };
    }

    return { materials: Object.keys(materials).length, data: materials };
  }

  _computeLaborRates(laborRates) {
    const groups = {};
    for (const lr of laborRates) {
      const trade = lr.trade || lr.description || 'Unknown';
      if (!groups[trade]) groups[trade] = [];
      groups[trade].push(lr);
    }

    const result = {};
    for (const [trade, list] of Object.entries(groups)) {
      const rates = list.filter(p => p.rate > 0).map(p => p.rate);
      if (rates.length < 2) continue;
      const sum = rates.reduce((a, b) => a + b, 0);
      const mean = sum / rates.length;

      const byCity = {};
      for (const lr of list) {
        const city = lr.city || 'Unknown';
        if (!byCity[city]) byCity[city] = [];
        byCity[city].push(lr.rate);
      }
      const cityAvgs = {};
      for (const [city, cRates] of Object.entries(byCity)) {
        cityAvgs[city] = Math.round(cRates.reduce((a, b) => a + b, 0) / cRates.length * 100) / 100;
      }

      result[trade] = {
        avgRate: Math.round(mean * 100) / 100,
        medianRate: this._median(rates),
        minRate: Math.round(Math.min(...rates) * 100) / 100,
        maxRate: Math.round(Math.max(...rates) * 100) / 100,
        samples: rates.length,
        byCity: cityAvgs,
        unit: list.find(i => i.unit)?.unit || 'day',
      };
    }

    return result;
  }

  _computeEquipmentRates(equipmentRates) {
    const groups = {};
    for (const eq of equipmentRates) {
      const name = eq.equipment || eq.equipment_name || 'Unknown';
      if (!groups[name]) groups[name] = [];
      groups[name].push(eq);
    }

    const result = {};
    for (const [name, list] of Object.entries(groups)) {
      const rates = list.filter(p => p.rate > 0).map(p => p.rate);
      if (rates.length < 2) continue;
      const sum = rates.reduce((a, b) => a + b, 0);
      const mean = sum / rates.length;

      result[name] = {
        category: list.find(i => i.category)?.category || 'General',
        avgRate: Math.round(mean * 100) / 100,
        medianRate: this._median(rates),
        samples: rates.length,
        unit: list.find(i => i.unit)?.unit || 'day',
      };
    }

    return result;
  }

  _computeProjectUnderstanding(projects) {
    const groups = {};
    for (const p of projects) {
      const type = p.projectType || 'Unknown';
      if (!groups[type]) groups[type] = { projects: [], cities: {}, finishingLevels: {} };
      groups[type].projects.push(p);
      if (p.city) groups[type].cities[p.city] = (groups[type].cities[p.city] || 0) + 1;
      if (p.finishingLevel) groups[type].finishingLevels[p.finishingLevel] = (groups[type].finishingLevels[p.finishingLevel] || 0) + 1;
    }

    const result = {};
    for (const [type, info] of Object.entries(groups)) {
      const areas = info.projects.filter(p => p.buildingArea > 0).map(p => p.buildingArea);
      const floors = info.projects.filter(p => p.floors > 0).map(p => p.floors);
      const costs = info.projects.filter(p => p.estimatedCost > 0).map(p => p.estimatedCost);

      result[type] = {
        samples: info.projects.length,
        commonCities: Object.entries(info.cities).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c),
        finishingLevels: info.finishingLevels,
        avgArea: areas.length > 0 ? Math.round(areas.reduce((a, b) => a + b, 0) / areas.length * 100) / 100 : null,
        avgFloors: floors.length > 0 ? Math.round(floors.reduce((a, b) => a + b, 0) / floors.length * 100) / 100 : null,
        avgCost: costs.length > 0 ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length * 100) / 100 : null,
      };
    }

    return result;
  }

  _computeRiskProfile(risks) {
    if (!risks || risks.length === 0) return {};
    const categories = {};
    for (const r of risks) {
      const cat = r.riskCategory || r.category || 'General';
      if (!categories[cat]) categories[cat] = { count: 0, probSum: 0, impactSum: 0 };
      categories[cat].count++;
      categories[cat].probSum += r.probability || 0;
      categories[cat].impactSum += r.impact || 0;
    }

    const result = {};
    for (const [cat, info] of Object.entries(categories)) {
      result[cat] = {
        count: info.count,
        avgProbability: Math.round(info.probSum / info.count * 10) / 10,
        avgImpact: Math.round(info.impactSum / info.count * 10) / 10,
        riskScore: Math.round(info.probSum / info.count * info.impactSum / info.count * 10) / 10,
      };
    }
    return result;
  }

  _computeQualityProfile(defects) {
    if (!defects || defects.length === 0) return {};
    const types = {};
    for (const d of defects) {
      const dt = d.defectType || d.type || 'Unknown';
      if (!types[dt]) types[dt] = { count: 0, severity: {} };
      types[dt].count++;
      const sev = d.severity || 'Medium';
      types[dt].severity[sev] = (types[dt].severity[sev] || 0) + 1;
    }

    const result = {};
    for (const [type, info] of Object.entries(types)) {
      result[type] = {
        count: info.count,
        severityDistribution: info.severity,
        topSeverity: Object.entries(info.severity).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Medium',
      };
    }
    return result;
  }

  getStandardQuantities(type) {
    if (!this._initialized) this.initialize();
    if (type) return this.dataset.standardQuantities.data[type] || null;
    return this.dataset.standardQuantities;
  }

  getUnitPrice(itemCode) {
    if (!this._initialized) this.initialize();
    return this.dataset.unitPrices[itemCode] || null;
  }

  getUnitPrices() {
    if (!this._initialized) this.initialize();
    return this.dataset.unitPrices || {};
  }

  getMaterialPrice(material, city) {
    if (!this._initialized) this.initialize();
    const mat = this.dataset.materialPrices.data[material];
    if (!mat) return null;
    if (city && mat.byCity[city]) return { price: mat.byCity[city], unit: mat.unit };
    return { price: mat.avgPrice, unit: mat.unit };
  }

  getLaborRate(trade, city) {
    if (!this._initialized) this.initialize();
    const rate = this.dataset.laborRates[trade];
    if (!rate) return null;
    if (city && rate.byCity[city]) return { rate: rate.byCity[city], unit: rate.unit };
    return { rate: rate.avgRate, unit: rate.unit };
  }

  getEquipmentRate(name) {
    if (!this._initialized) this.initialize();
    return this.dataset.equipmentRates[name] || null;
  }

  getProjectUnderstanding(type) {
    if (!this._initialized) this.initialize();
    if (type) return this.dataset.projectUnderstanding[type] || null;
    return this.dataset.projectUnderstanding;
  }

  getRiskProfile(category) {
    if (!this._initialized) this.initialize();
    if (category) return this.dataset.riskProfile[category] || null;
    return this.dataset.riskProfile;
  }

  getQualityProfile(defectType) {
    if (!this._initialized) this.initialize();
    if (defectType) return this.dataset.qualityProfile[defectType] || null;
    return this.dataset.qualityProfile;
  }

  getStats() {
    if (!this._initialized) this.initialize();
    const ds = this.dataset;
    return {
      projectTypes: ds.standardQuantities.projectTypes.length,
      unitPriceItems: Object.keys(ds.unitPrices).length,
      materials: ds.materialPrices.materials,
      laborTrades: Object.keys(ds.laborRates).length,
      equipmentTypes: Object.keys(ds.equipmentRates).length,
      riskCategories: Object.keys(ds.riskProfile).length,
      qualityDefectTypes: Object.keys(ds.qualityProfile).length,
      understandingTypes: Object.keys(ds.projectUnderstanding).length,
    };
  }

  toJSON() {
    if (!this._initialized) this.initialize();
    return this.dataset;
  }

  saveToFile(filePath) {
    if (!this._initialized) this.initialize();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(this.dataset, null, 2), 'utf8');
    console.log(`[KDS] Dataset saved to ${filePath} (${(Buffer.byteLength(JSON.stringify(this.dataset), 'utf8') / 1024 / 1024).toFixed(1)} MB)`);
  }

  _median(values) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2 * 100) / 100;
    return Math.round(sorted[mid] * 100) / 100;
  }

  /**
   * Recompute aggregates using UETS EGT data as primary source
   */
  recomputeFromUETS(uets) {
    if (!uets || !uets.initialized) return { recomputed: false, reason: 'UETS not initialized' };
    try {
      const allEGT = uets.getAllEGT();
      if (!allEGT || allEGT.length === 0) return { recomputed: false, reason: 'No EGT records' };

      const projects = allEGT.map(egt => ({
        project_id: egt.uuid,
        city: egt.location.city,
        region: egt.location.region,
        project_type: egt.classification.projectType,
        land_area_m2: egt.geometry.landArea,
        building_area_m2: egt.geometry.buildingArea || egt.geometry.totalArea / Math.max(1, egt.geometry.floors),
        floors: egt.geometry.floors,
        units: egt.geometry.units,
        finishing_level: egt.geometry.finishing,
        construction_method: egt.geometry.constructionMethod,
        structural_system: egt.geometry.structure,
        concrete_m3: egt.materials.find(m => m.name === 'Concrete')?.quantity || 0,
        steel_ton: egt.materials.find(m => m.name === 'Steel Reinforcement')?.quantity || 0,
        blocks_m2: egt.materials.find(m => m.name === 'Concrete Blocks')?.quantity || 0,
        tiles_m2: egt.materials.find(m => m.name === 'Tiles')?.quantity || 0,
        paint_m2: egt.materials.find(m => m.name === 'Paint')?.quantity || 0,
        estimated_cost_sar: egt.cost.total,
        duration_months: egt.schedule.totalDurationMonths,
        year: new Date().getFullYear()
      }));

      this.bridge.data.projects = projects;

      const boqItems = [];
      for (const egt of allEGT) {
        for (const boq of egt.boq) {
          boqItems.push({
            project_id: egt.uuid,
            item_code: boq.code,
            description_ar: boq.descriptionAr || boq.description,
            category: boq.category,
            unit: boq.unit,
            quantity: boq.quantity,
            unit_price_sar: boq.unitPrice,
            confidence: boq.confidence,
            waste_factor: boq.wasteFactor
          });
        }
      }
      this.bridge.data.boqItems = boqItems;

      const materialPrices = [];
      for (const egt of allEGT) {
        for (const mat of egt.materials) {
          if (mat.unitPrice > 0) {
            materialPrices.push({
              material_name: mat.name,
              category: mat.category || 'General',
              unit: mat.unit,
              city: egt.location.city,
              supplier_name: '',
              avg_price_sar: mat.unitPrice,
              price_date: new Date().toISOString().split('T')[0],
              quality_grade: mat.qualityGrade || 'Standard'
            });
          }
        }
      }
      this.bridge.data.materialPrices = materialPrices;

      const risks = [];
      for (const egt of allEGT) {
        for (const risk of egt.risks) {
          risks.push({
            project_id: egt.uuid,
            risk_category: risk.category,
            description: risk.description,
            probability: risk.probability,
            impact: risk.impact,
            mitigation: risk.mitigation,
            detected_by_ai: true
          });
        }
      }
      this.bridge.data.risks = risks;

      const qualityDefects = [];
      for (const egt of allEGT) {
        for (const defect of (egt.quality && egt.quality.defectTypes || [])) {
          qualityDefects.push({
            project_id: egt.uuid,
            defect_type: defect.type,
            severity: defect.severity,
            location: defect.location || '',
            element_type: defect.elementType || '',
            detected_by: 'ai',
            confidence: defect.confidence,
            status: 'open'
          });
        }
      }
      this.bridge.data.qualityDefects = qualityDefects;

      // Save suppliers from EGT
      const supplierMap = new Map();
      for (const egt of allEGT) {
        for (const sup of egt.suppliers) {
          const key = `${sup.name}|${sup.city || egt.location.city}`;
          if (!supplierMap.has(key)) {
            supplierMap.set(key, {
              supplier_name: sup.name,
              city: sup.city || egt.location.city,
              speciality: sup.speciality || egt.classification.projectType,
              rating: sup.rating,
              delivery_speed_days: sup.deliverySpeedDays || 30,
              contract_years: 1,
              compliance_percent: sup.compliancePercent || 85,
              total_deals: sup.totalDeals || 1
            });
          }
        }
      }
      this.bridge.data.suppliers = Array.from(supplierMap.values());

      // Recompute all aggregates
      this.initialize();
      console.log(`[KDS] Recomputed from UETS: ${allEGT.length} EGT records → ${projects.length} projects, ${boqItems.length} BOQ items`);
      return { recomputed: true, projects: projects.length, boqItems: boqItems.length };
    } catch (e) {
      console.warn(`[KDS] UETS recompute error: ${e.message}`);
      return { recomputed: false, error: e.message };
    }
  }

  _emptyDataset() {
    return {
      generatedAt: new Date().toISOString(),
      sourceStats: { totalRecords: 0, sources: {} },
      standardQuantities: { projectTypes: [], data: {} },
      unitPrices: {},
      materialPrices: { materials: 0, data: {} },
      laborRates: {},
      equipmentRates: {},
      projectUnderstanding: {},
      riskProfile: {},
      qualityProfile: {},
    };
  }
}

module.exports = KnowledgeDatasetLoader;
