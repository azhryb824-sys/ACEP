/**
 * Knowledge Base Engine — Central Repository for Engineering Knowledge
 * Phase 8: Knowledge Base
 *
 * Stores and queries:
 * - Past projects with full data
 * - Standard quantities per type
 * - Productivity rates (labor & equipment)
 * - Material specifications
 * - Item dependencies and relationships
 * - Code compliance references
 * - Construction methods and details
 */
const fs = require('fs');
const path = require('path');
const StandardQuantities = require('./standard-quantities');
const ProductivityRates = require('./productivity-rates');

class KnowledgeBaseEngine {
  constructor(dataDir, datasetLoader) {
    this.dataDir = dataDir || path.join(__dirname, '..', '..', '..', 'data');
    this.projectsFile = path.join(this.dataDir, 'kb-projects.json');
    this.itemsFile = path.join(this.dataDir, 'kb-items.json');
    this.relationsFile = path.join(this.dataDir, 'kb-relations.json');
    this.standards = new StandardQuantities(datasetLoader);
    this.productivity = new ProductivityRates();
    this.store = this._loadStore();
    this.initialized = true;
    this.standards.loadFromDataset();
  }

  _loadStore() {
    return {
      projects: this._loadJSON(this.projectsFile, []),
      items: this._loadJSON(this.itemsFile, {}),
      relations: this._loadJSON(this.relationsFile, [])
    };
  }

  _loadJSON(file, def) {
    try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (_) { /* ignore corrupt files */ }
    return def;
  }

  _saveJSON(file, data) {
    try {
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    } catch (_) { /* silent */ }
  }

  _saveStore() {
    this._saveJSON(this.projectsFile, this.store.projects);
    this._saveJSON(this.itemsFile, this.store.items);
    this._saveJSON(this.relationsFile, this.store.relations);
  }

  // ─── Project Recording ──
  recordProject(project, boqData, costData, profileData) {
    const entry = {
      id: project.id || 'proj-' + Date.now(),
      type: profileData?.projectType?.primary || project.extracted?.type || 'Unknown',
      name: project.metadata?.name || '',
      recordedAt: new Date().toISOString(),
      physical: {
        area: (project.approved?.areaConfirmed ? project.approved.area : project.extracted?.area) || 0,
        floors: (project.approved?.floorsConfirmed ? project.approved.floors : project.extracted?.floors) || 1,
        city: (project.approved?.cityConfirmed ? project.approved.city : project.extracted?.city) || ''
      },
      boq: {
        totalItems: boqData?.items?.length || 0,
        totalCost: boqData?.summary?.totalCost || 0,
        items: (boqData?.items || []).map(i => ({ code: i.code, description: i.description, unit: i.unit, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.totalPrice, phase: i.phase, trade: i.trade })),
        suggestedItems: (boqData?.suggestedItems || []).map(i => ({ code: i.code, description: i.description }))
      },
      cost: {
        totalCost: costData?.totalCost || 0,
        directCost: costData?.directCost || 0,
        costPerM2: costData?.costPerM2 || 0
      },
      schedule: {
        totalDuration: project.schedule?.totalDuration || 0,
        totalMonths: project.schedule?.totalMonths || 0
      },
      profile: profileData ? {
        type: profileData.projectType?.primary,
        structural: profileData.structural?.structuralSystem,
        finishing: profileData.finishing?.level,
        hvac: profileData.mep?.hvac?.systemType,
        scope: profileData.scope
      } : null
    };
    this.store.projects.push(entry);
    this._saveJSON(this.projectsFile, this.store.projects);
    return entry;
  }

  // ─── Similar Project Search ──
  findSimilarProjects(type, area, floors, city, limit = 5) {
    const candidates = this.store.projects.filter(p => {
      if (p.type !== type) return false;
      if (city && p.physical.city && p.physical.city.toLowerCase() !== city.toLowerCase()) return false;
      return true;
    });
    const scored = candidates.map(p => {
      const areaDiff = area > 0 ? Math.abs(p.physical.area - area) / area : 0;
      const floorDiff = floors > 0 ? Math.abs(p.physical.floors - floors) / floors : 0;
      const similarity = Math.max(0, 1 - (areaDiff * 0.5 + floorDiff * 0.3));
      return { ...p, similarity: Math.round(similarity * 100) / 100 };
    });
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
  }

  // ─── Item Dependency Recording ──
  recordRelation(parentCode, childCode, type, description) {
    this.store.relations.push({
      parent: parentCode,
      child: childCode,
      type: type || 'dependency',
      description: description || '',
      recordedAt: new Date().toISOString()
    });
    this._saveJSON(this.relationsFile, this.store.relations);
  }

  getItemDependencies(itemCode) {
    return this.store.relations.filter(r => r.parent === itemCode || r.child === itemCode);
  }

  // ─── Standard Quantities ──
  setDatasetLoader(loader) {
    this.standards = new StandardQuantities(loader);
    this.standards.loadFromDataset();
  }

  getStandardQuantities(type) { return this.standards.getQuantities(type); }
  estimateStandardMaterials(type, area) { return this.standards.estimateMaterial(type, area); }
  compareQuantities(type, actualQuantities, area) { return this.standards.compareWithStandard(type, actualQuantities, area); }

  // ─── Productivity ──
  getProductivity() { return this.productivity.data; }
  getLaborRate(task) { return this.productivity.getLaborRate(task); }
  getEquipmentRate(equip) { return this.productivity.getEquipmentRate(equip); }

  // ─── Statistics ──
  getStatistics() {
    const projects = this.store.projects;
    const typeGroups = {};
    for (const p of projects) {
      if (!typeGroups[p.type]) typeGroups[p.type] = [];
      typeGroups[p.type].push(p);
    }
    const typeStats = {};
    for (const [type, list] of Object.entries(typeGroups)) {
      const costs = list.filter(p => p.cost?.totalCost > 0).map(p => p.cost.totalCost);
      const areas = list.filter(p => p.physical?.area > 0).map(p => p.physical.area);
      const costsPerM2 = list.filter(p => p.cost?.costPerM2 > 0).map(p => p.cost.costPerM2);
      const durations = list.filter(p => p.schedule?.totalMonths > 0).map(p => p.schedule.totalMonths);
      typeStats[type] = {
        count: list.length,
        avgCost: costs.length > 0 ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length) : 0,
        avgArea: areas.length > 0 ? Math.round(areas.reduce((a, b) => a + b, 0) / areas.length) : 0,
        avgCostPerM2: costsPerM2.length > 0 ? Math.round(costsPerM2.reduce((a, b) => a + b, 0) / costsPerM2.length) : 0,
        avgDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length * 10) / 10 : 0
      };
    }
    return {
      totalProjects: projects.length,
      storedItems: Object.keys(this.store.items).length,
      relationsCount: this.store.relations.length,
      types: Object.keys(typeStats),
      byType: typeStats
    };
  }

  // ─── Get all recorded projects ──
  getRecordedProjects(filters = {}) {
    let results = [...this.store.projects];
    if (filters.type) results = results.filter(p => p.type === filters.type);
    if (filters.minArea) results = results.filter(p => p.physical.area >= filters.minArea);
    if (filters.maxArea) results = results.filter(p => p.physical.area <= filters.maxArea);
    if (filters.limit) results = results.slice(0, filters.limit);
    results.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
    return results;
  }
}

module.exports = KnowledgeBaseEngine;
