/**
 * ACEP Training Data Bridge
 *
 * Unified training data access for all AI models.
 * Loads CSV training data into EDL on startup and supports
 * continuous learning from completed EDL projects.
 *
 * All 8 CSV data sources are loaded into structured in-memory stores:
 * - projects.csv → historical project records
 * - boq_items.csv → BOQ item records
 * - material_prices.csv, labor_rates.csv, equipment_rates.csv → cost data
 * - suppliers.csv → supplier database
 * - risks.csv → risk records
 * - quality_defects.csv → quality records
 */
const fs = require('fs');
const path = require('path');

const CSV_BASE = path.join(__dirname, '..', '..', 'packages', 'databases', 'training', 'csv');

class TrainingDataBridge {
  constructor() {
    this.data = {
      projects: [],
      boqItems: [],
      materialPrices: [],
      laborRates: [],
      equipmentRates: [],
      suppliers: [],
      risks: [],
      qualityDefects: [],
    };
    this.stats = {
      totalRecords: 0,
      sources: {},
      loadedAt: null,
      lastUpdated: null,
    };
    this.edlRecords = []; // Projects added from EDL
  }

  /**
   * Load all CSV data sources
   */
  loadAll() {
    this._loadCSV('projects', 'projects.csv', this._parseProject);
    this._loadCSV('boqItems', 'boq_items.csv', this._parseBOQItem);
    this._loadCSV('materialPrices', 'material_prices.csv', this._parseMaterialPrice);
    this._loadCSV('laborRates', 'labor_rates.csv', this._parseLaborRate);
    this._loadCSV('equipmentRates', 'equipment_rates.csv', this._parseEquipmentRate);
    this._loadCSV('suppliers', 'suppliers.csv', this._parseSupplier);
    this._loadCSV('risks', 'risks.csv', this._parseRisk);
    this._loadCSV('qualityDefects', 'quality_defects.csv', this._parseQualityDefect);

    this.stats.loadedAt = new Date().toISOString();
    this.stats.totalRecords = Object.values(this.data).reduce((s, arr) => s + arr.length, 0);
    return this.stats;
  }

  /**
   * Load a single CSV file
   */
  _loadCSV(key, filename, parseFn) {
    const filepath = path.join(CSV_BASE, filename);
    if (!fs.existsSync(filepath)) {
      this.stats.sources[key] = { status: 'missing', path: filepath };
      return;
    }
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const lines = content.trim().split('\n');
      const headers = lines[0].split(',');
      this.data[key] = lines.slice(1).map(line => parseFn(line, headers)).filter(Boolean);
      this.stats.sources[key] = { status: 'loaded', count: this.data[key].length, fields: headers.length };
    } catch (e) {
      this.stats.sources[key] = { status: 'error', message: e.message };
    }
  }

  // ─── CSV Parsers ──────────────────────────

  _parseProject(line) {
    const c = line.split(',');
    if (c.length < 21) return null;
    return {
      projectId: c[0], city: c[1], region: c[2], projectType: c[3],
      landArea: parseFloat(c[4]) || 0, buildingArea: parseFloat(c[5]) || 0,
      floors: parseInt(c[6]) || 1, units: parseInt(c[7]) || 0,
      finishingLevel: c[8], constructionMethod: c[9], structuralSystem: c[10],
      concrete: parseFloat(c[11]) || 0, steel: parseFloat(c[12]) || 0,
      blocks: parseFloat(c[13]) || 0, tiles: parseFloat(c[14]) || 0,
      paint: parseFloat(c[15]) || 0, electrical: parseFloat(c[16]) || 0,
      plumbing: parseFloat(c[17]) || 0,
      estimatedCost: parseFloat(c[18]) || 0,
      duration: parseFloat(c[19]) || 0, year: parseInt(c[20]) || 2024,
    };
  }

  _parseBOQItem(line) {
    const c = line.split(',');
    if (c.length < 8) return null;
    return {
      projectId: c[0], itemCode: c[1], description: c[2],
      category: c[3], unit: c[4],
      quantity: parseFloat(c[5]) || 0,
      unitPrice: parseFloat(c[6]) || 0,
      confidence: parseInt(c[7]) || 50,
      wasteFactor: parseFloat(c[8]) || 0,
    };
  }

  _parseMaterialPrice(line) {
    const c = line.split(',');
    if (c.length < 5) return null;
    return {
      material: c[0], unit: c[1], category: c[2],
      price: parseFloat(c[3]) || 0,
      region: c[4] || '', year: parseInt(c[5]) || 2024,
    };
  }

  _parseLaborRate(line) {
    const c = line.split(',');
    if (c.length < 4) return null;
    return {
      trade: c[0], description: c[1],
      rate: parseFloat(c[2]) || 0,
      unit: c[3] || 'day',
    };
  }

  _parseEquipmentRate(line) {
    const c = line.split(',');
    if (c.length < 4) return null;
    return {
      equipment: c[0], description: c[1],
      rate: parseFloat(c[2]) || 0,
      unit: c[3] || 'day',
    };
  }

  _parseSupplier(line) {
    const c = line.split(',');
    if (c.length < 4) return null;
    return {
      name: c[0], category: c[1], city: c[2],
      rating: parseFloat(c[3]) || 0,
      phone: c[4] || '', material: c[5] || '',
    };
  }

  _parseRisk(line) {
    const c = line.split(',');
    if (c.length < 4) return null;
    return {
      projectId: c[0], riskType: c[1], description: c[2],
      probability: parseFloat(c[3]) || 0,
      impact: parseFloat(c[4]) || 0,
      category: c[5] || '',
    };
  }

  _parseQualityDefect(line) {
    const c = line.split(',');
    if (c.length < 4) return null;
    return {
      projectId: c[0], defectType: c[1], description: c[2],
      severity: c[3] || 'low',
      location: c[4] || '',
    };
  }

  // ─── Query Methods ────────────────────────

  getProjectsByType(type) {
    if (!type) return this.data.projects;
    return this.data.projects.filter(p =>
      p.projectType && p.projectType.toLowerCase() === type.toLowerCase()
    );
  }

  getProjectsByRegion(region) {
    if (!region) return this.data.projects;
    return this.data.projects.filter(p =>
      p.region && p.region.toLowerCase() === region.toLowerCase()
    );
  }

  getBOQByProject(projectId) {
    return this.data.boqItems.filter(i => i.projectId === projectId);
  }

  getMaterialPrices(material) {
    if (!material) return this.data.materialPrices;
    return this.data.materialPrices.filter(m =>
      m.material && m.material.toLowerCase().includes(material.toLowerCase())
    );
  }

  getProjectStats() {
    const types = {};
    for (const p of this.data.projects) {
      const t = p.projectType || 'Unknown';
      if (!types[t]) types[t] = { count: 0, totalCost: 0, totalArea: 0 };
      types[t].count++;
      types[t].totalCost += p.estimatedCost;
      types[t].totalArea += p.buildingArea * p.floors;
    }
    return Object.entries(types).map(([type, s]) => ({
      type,
      count: s.count,
      avgCost: s.count > 0 ? Math.round(s.totalCost / s.count) : 0,
      avgArea: s.count > 0 ? Math.round(s.totalArea / s.count) : 0,
    }));
  }

  getStats() {
    return {
      ...this.stats,
      projectsByType: this.getProjectStats(),
      edlRecordsCount: this.edlRecords.length,
    };
  }

  // ─── EDL Integration ─────────────────────

  /**
   * Add a completed project from EDL to training data
   */
  addEDLRecord(project) {
    const record = {
      projectId: project.id,
      city: project.approved.city || project.extracted.city || '',
      region: '',
      projectType: project.getEffective('type').value || 'Unknown',
      buildingArea: project.getEffective('area').value || 0,
      floors: project.getEffective('floors').value || 1,
      units: project.building.numUnits || 0,
      finishingLevel: project.building.finishing?.level || project.approved.finishing || 'Standard',
      constructionMethod: project.digitalProfile?.structure?.constructionMethod || '',
      structuralSystem: project.digitalProfile?.structure?.structuralSystem || '',
      concrete: project.boq.items.reduce((s, i) => {
        return s + ((i.name || '').toLowerCase().includes('concrete') || (i.name || '').toLowerCase().includes('خرسانة') ? (i.quantity || 0) : 0);
      }, 0),
      steel: project.boq.items.reduce((s, i) => {
        return s + ((i.name || '').toLowerCase().includes('steel') || (i.name || '').toLowerCase().includes('حديد') ? (i.quantity || 0) : 0);
      }, 0),
      estimatedCost: project.cost.totalCost || 0,
      duration: project.schedule.totalMonths || 0,
      year: new Date().getFullYear(),
      source: 'edl',
      addedAt: new Date().toISOString(),
    };
    this.edlRecords.push(record);
    this.stats.lastUpdated = new Date().toISOString();
    this.stats.totalRecords += 1;
    return record;
  }

  /**
   * Train ProjectAnalyzer from EDL records + CSV data
   */
  getCombinedTrainingData() {
    return {
      csvProjects: this.data.projects,
      edlProjects: this.edlRecords,
      total: this.data.projects.length + this.edlRecords.length,
    };
  }

  /**
   * Load training data from UETS EGT repository (supplements CSV data)
   */
  loadFromUETS(uets) {
    if (!uets || !uets.initialized) return { loaded: false, reason: 'UETS not initialized' };
    try {
      const allEGT = uets.getAllEGT();
      if (!allEGT || allEGT.length === 0) return { loaded: false, reason: 'No EGT records' };

      let csvProjectsAdded = 0;
      let boqItemsAdded = 0;

      const existingProjectIds = new Set(this.data.projects.map(p => p.project_id));
      const existingBOQKeys = new Set(this.data.boqItems.map(b => `${b.project_id}:${b.item_code}`));

      for (const egt of allEGT) {
        if (egt.source === 'csv' && existingProjectIds.has(egt.originalId)) continue;

        const proj = {
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
          electrical_points: egt.materials.find(m => m.name === 'Electrical Points')?.quantity || 0,
          plumbing_points: egt.materials.find(m => m.name === 'Plumbing Points')?.quantity || 0,
          estimated_cost_sar: egt.cost.total,
          duration_months: egt.schedule.totalDurationMonths,
          year: new Date().getFullYear()
        };

        this.data.projects.push(proj);
        csvProjectsAdded++;

        for (const boq of egt.boq) {
          const key = `${egt.uuid}:${boq.code}`;
          if (existingBOQKeys.has(key)) continue;
          this.data.boqItems.push({
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
          boqItemsAdded++;
        }

        for (const risk of egt.risks) {
          this.data.risks.push({
            project_id: egt.uuid,
            risk_category: risk.category,
            description: risk.description,
            probability: risk.probability,
            impact: risk.impact,
            mitigation: risk.mitigation,
            detected_by_ai: true
          });
        }

        for (const defect of (egt.quality && egt.quality.defectTypes || [])) {
          this.data.qualityDefects.push({
            project_id: egt.uuid,
            defect_type: defect.type,
            severity: defect.severity,
            location: defect.location,
            element_type: defect.elementType,
            detected_by: 'ai',
            confidence: defect.confidence,
            status: 'open'
          });
        }
      }

      this.stats.totalRecords = Object.values(this.data).reduce((s, arr) => s + arr.length, 0);
      this.stats.lastUpdated = new Date().toISOString();
      this.stats.uetsSource = true;

      console.log(`[TrainingDataBridge] Loaded ${csvProjectsAdded} projects, ${boqItemsAdded} BOQ items from UETS EGT`);
      return { loaded: true, projects: csvProjectsAdded, boqItems: boqItemsAdded };
    } catch (e) {
      console.warn(`[TrainingDataBridge] UETS load error: ${e.message}`);
      return { loaded: false, error: e.message };
    }
  }

  toJSON() {
    return {
      stats: this.stats,
      edlRecords: this.edlRecords.slice(-1000),
    };
  }
}

module.exports = TrainingDataBridge;
