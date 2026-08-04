/**
 * ACEP Internal Project Analyzer Model
 * Pure JS - trained on CSV project data. No external ML dependencies.
 */

const fs = require('fs');
const path = require('path');
const kb = require('../knowledge-base');

class ProjectAnalyzer {
  constructor() {
    this.trained = false;
    this.trainingStats = { mean: {}, std: {}, correlations: {}, projectTypeStats: {} };
    this.projects = [];
  }

  async train(csvPath) {
    const content = fs.readFileSync(csvPath || path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv', 'projects.csv'), 'utf8');
    const lines = content.trim().split('\n').slice(1);
    this.projects = lines.map(l => {
      const c = l.split(',');
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
        duration: parseFloat(c[19]) || 0, year: parseInt(c[20]) || 2024
      };
    });

    // Compute per-project-type statistics
    const groups = {};
    this.projects.forEach(p => {
      if (!groups[p.projectType]) groups[p.projectType] = [];
      groups[p.projectType].push(p);
    });
    for (const [type, items] of Object.entries(groups)) {
      if (items.length < 2) continue;
      this.trainingStats.projectTypeStats[type] = {
        count: items.length,
        avgCost: items.reduce((s, p) => s + p.estimatedCost, 0) / items.length,
        avgArea: items.reduce((s, p) => s + p.buildingArea, 0) / items.length,
        avgFloors: items.reduce((s, p) => s + p.floors, 0) / items.length,
        avgConcrete: items.reduce((s, p) => s + p.concrete, 0) / items.length,
        avgSteel: items.reduce((s, p) => s + p.steel, 0) / items.length,
        avgDuration: items.reduce((s, p) => s + p.duration, 0) / items.length,
        avgCostPerM2: items.reduce((s, p) => s + (p.buildingArea > 0 ? p.estimatedCost / (p.buildingArea * p.floors) : 0), 0) / items.length
      };
    }
    this.trained = true;
    this._projectCount = this.projects.length;
    this.projects = null;
    return { projectCount: this._projectCount, typeCount: Object.keys(groups).length };
  }

  analyzeProject(description, options = {}) {
    if (!this.trained) return { error: 'Model not trained', trained: false };
    let type = kb.detectProjectType(description);
    const pt = kb.getProjectType(type);
    let stats = this.trainingStats.projectTypeStats[type];

    // Fallback mapping for types not in training data
    if (!stats || stats.count <= 5) {
      const fallbackMap = {
        'Apartment_Finishing': 'Apartment_Building',
      };
      const fallback = fallbackMap[type];
      if (fallback && this.trainingStats.projectTypeStats[fallback]) {
        type = fallback;
        stats = this.trainingStats.projectTypeStats[fallback];
      }
    }

    const missing = [];
    if (options.area === null || options.area === undefined) missing.push('area');
    if (options.floors === null || options.floors === undefined) missing.push('floors');

    if (missing.length > 0) {
      const msgs = { area: 'مساحة المشروع', floors: 'عدد الأدوار' };
      return {
        insufficientData: true,
        message: 'لا يمكن استنتاج ' + missing.map(m => msgs[m] || m).join('، ') + ' من الوصف الحالي',
        missing,
        description,
        projectType: type,
        typeConfidence: options.typeConfidence || 0.5
      };
    }

    const area = options.area;
    const floors = options.floors;
    const finishing = options.finishing || null;
    const region = options.region || null;
    const multiplier = finishing ? kb.getMaterialPriceMultiplier(finishing) : 1.0;
    const regionIndex = region ? kb.getRegionIndex(region) : 1.0;

    let estimatedCost, concreteM3, steelTon, duration;
    if (stats && stats.count > 5) {
      const scaleFactor = (area * floors) / (stats.avgArea * stats.avgFloors || 1);
      estimatedCost = stats.avgCost * scaleFactor * multiplier * regionIndex;
      concreteM3 = stats.avgConcrete * scaleFactor;
      steelTon = stats.avgSteel * scaleFactor;
      duration = stats.avgDuration * Math.sqrt(scaleFactor) * (floors / (stats.avgFloors || 1));
    } else {
      return {
        insufficientData: true,
        message: 'لا توجد بيانات تدريب كافية لنوع المشروع "' + type + '". يرجى توفير تفاصيل إضافية.',
        missing: ['training_data'],
        description,
        projectType: type,
        typeConfidence: 0.5
      };
    }

    const spaces = kb.estimateSpaces(type, area, floors);
    const confidence = stats ? Math.min(0.5 + stats.count * 0.005, 0.95) : 0.5;

    return {
      projectType: type,
      totalArea: Math.round(area * floors),
      areaPerFloor: Math.round(area),
      floors: Math.round(floors),
      finishing,
      region,
      estimatedCost: Math.round(estimatedCost),
      concreteM3: Math.round(concreteM3),
      steelTon: Math.round(steelTon * 100) / 100,
      durationMonths: Math.round(duration),
      spaces,
      confidence: Math.round(confidence * 100) / 100,
      trainingDataPoints: stats ? stats.count : 0,
      insufficientData: false
    };
  }

  getTypeStats() { return this.trainingStats.projectTypeStats; }
}

module.exports = new ProjectAnalyzer();
