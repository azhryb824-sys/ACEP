const fs = require('fs');
const path = require('path');
const millionProjectModel = require('./million-project-model');

class ScheduleOptimizer {
  constructor() {
    this.trained = false;
    this.projects = [];
    this.byType = {};
    this.activityTemplates = {
      'Site Preparation': { weight: 0.08, min: 3, max: 30 },
      'Foundation': { weight: 0.15, min: 7, max: 60 },
      'Structural Frame': { weight: 0.25, min: 14, max: 180 },
      'MEP Rough-in': { weight: 0.12, min: 10, max: 90 },
      'Masonry & Block': { weight: 0.08, min: 7, max: 60 },
      'Plaster & Finishing': { weight: 0.10, min: 10, max: 90 },
      'Flooring & Tiles': { weight: 0.06, min: 7, max: 60 },
      'Ceiling & Partitions': { weight: 0.05, min: 5, max: 45 },
      'Doors & Windows': { weight: 0.03, min: 5, max: 30 },
      'Painting & Decoration': { weight: 0.04, min: 5, max: 45 },
      'Exterior & Landscape': { weight: 0.06, min: 7, max: 60 },
      'Commissioning & Handover': { weight: 0.03, min: 5, max: 30 }
    };
  }

  async train(csvPath) {
    this.byType = {};
    const fp = csvPath || path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv', 'projects.csv');
    this.projects = fs.readFileSync(fp, 'utf8').trim().split('\n').slice(1).map(l => {
      const c = l.split(',');
      return {
        id: c[0], city: c[1], region: c[2], type: c[3],
        landArea: parseFloat(c[4]) || 0, buildingArea: parseFloat(c[5]) || 0,
        floors: parseInt(c[6]) || 1, units: parseInt(c[7]) || 0,
        finishing: c[8] || 'Standard', method: c[9] || 'Traditional',
        structure: c[10] || 'RC Frame',
        concrete: parseFloat(c[11]) || 0, steel: parseFloat(c[12]) || 0,
        blocks: parseFloat(c[13]) || 0, tiles: parseFloat(c[14]) || 0,
        paint: parseFloat(c[15]) || 0, electrical: parseFloat(c[16]) || 0,
        plumbing: parseFloat(c[17]) || 0,
        cost: parseFloat(c[18]) || 0, durationMonths: parseFloat(c[19]) || 0
      };
    }).filter(p => p.durationMonths > 0);

    for (const p of this.projects) {
      if (!this.byType[p.type]) this.byType[p.type] = [];
      this.byType[p.type].push(p);
    }

    for (const [type, items] of Object.entries(this.byType)) {
      const durations = items.map(i => i.durationMonths).sort((a, b) => a - b);
      const areas = items.map(i => i.buildingArea).filter(a => a > 0);
      const floors = items.map(i => i.floors);
      const n = items.length;
      this.byType[type] = {
        count: n,
        durationMean: durations.reduce((s, v) => s + v, 0) / n,
        durationMedian: durations[Math.floor(n / 2)],
        durationMin: durations[0], durationMax: durations[n - 1],
        durationStd: Math.sqrt(durations.reduce((s, v) => s + (v - durations.reduce((s2, v2) => s2 + v2, 0) / n) ** 2, 0) / n),
        areaMean: areas.length > 0 ? areas.reduce((s, v) => s + v, 0) / areas.length : 0,
        floorsAvg: floors.reduce((s, v) => s + v, 0) / n,
        costPerDay: items.reduce((s, i) => s + i.cost, 0) / items.reduce((s, i) => s + i.durationMonths * 22, 0)
      };
    }

    this.trained = true;
    this._projectCount = this.projects.length;
    this.projects = null;
    return { total: this._projectCount, types: Object.keys(this.byType).length };
  }

  generateSchedule(projectType, totalArea, floors, finishing = 'Standard', region = 'Riyadh', method = 'Traditional', modelInputs = {}) {
    const trainedPrediction = millionProjectModel.predict({
      projectType: modelInputs.modelType || projectType,
      grossBuiltArea: totalArea,
      footprintArea: modelInputs.footprintArea,
      landArea: modelInputs.landArea,
      floors,
      basements: modelInputs.basements,
      buildings: modelInputs.buildings,
      capacity: modelInputs.capacity,
      city: region,
      finishing,
      method
    });
    if (trainedPrediction.available) return this._trainedSchedule(trainedPrediction);
    if (!this.trained) return this._fallbackSchedule(totalArea, floors, finishing);

    const stats = this.byType[projectType];
    const baseMonths = stats ? stats.durationMean : 8;
    const baseDuration = baseMonths * 22;

    const avgArea = stats && stats.areaMean > 0 ? stats.areaMean : 5000;
    const avgFloors = stats && stats.floorsAvg > 0 ? stats.floorsAvg : 2;
    const areaFactor = 1 + Math.log2(Math.max(1, totalArea / avgArea)) * 0.15;
    const floorsFactor = 1 + (floors - avgFloors) * 0.08;
    const finishingFactor = { Raw: 0.7, Standard: 1.0, Good: 1.15, Premium: 1.3, Luxury: 1.5 }[finishing] || 1.0;
    const methodFactor = { Traditional: 1.0, Precast: 0.7, SteelFrame: 0.6, ICF: 0.85, AAC: 0.9, PostTension: 0.8 }[method] || 1.0;

    const totalDays = Math.max(30, Math.round(baseDuration * areaFactor * floorsFactor * finishingFactor * methodFactor));

    const activities = Object.entries(this.activityTemplates).map(([name, tmpl], i) => {
      const base = Math.max(tmpl.min, Math.round(tmpl.weight * totalDays));
      const scaled = Math.round(base * (1 + (floors - 2) * 0.05) * (method === 'Precast' ? 0.8 : 1));
      return {
        id: `A${i + 1}`,
        name,
        duration: Math.max(tmpl.min, scaled),
        predecessors: i > 0 ? [`A${i}`] : []
      };
    });

    const criticalPath = activities.map(a => a.id);
    const totalActivityDays = activities.reduce((s, a) => s + a.duration, 0);
    const optimization = {
      parallelExecution: Math.round((1 - totalActivityDays / (totalDays * 1.5)) * 100),
      compressionPotential: totalDays > 365 ? 'Medium' : totalDays > 180 ? 'Low' : 'Minimal'
    };

    return {
      activities,
      totalDuration: totalDays,
      totalMonths: Math.round(totalDays / 22 * 10) / 10,
      criticalPath,
      optimization,
      parameters: { baseDuration, areaFactor: Math.round(areaFactor * 100) / 100, floorsFactor: Math.round(floorsFactor * 100) / 100, finishingFactor, methodFactor },
      trainingData: stats ? stats.count : 0,
      confidence: stats ? Math.min(0.9, 0.5 + stats.count * 0.0002) : 0.6
    };
  }

  _trainedSchedule(prediction) {
    const totalDays = Math.max(30, Math.round(prediction.predictions.durationDays));
    const definitions = [
      ['Site Preparation', 0.08, []],
      ['Foundation', 0.16, ['A1']],
      ['Structural Frame', 0.30, ['A2']],
      ['MEP Rough-in', 0.24, ['A3']],
      ['Masonry & Envelope', 0.20, ['A3']],
      ['Plaster & Finishing', 0.22, ['A4', 'A5']],
      ['Flooring & Tiles', 0.15, ['A6']],
      ['Ceiling & Partitions', 0.14, ['A4', 'A5']],
      ['Doors & Windows', 0.12, ['A5']],
      ['Painting & Decoration', 0.12, ['A6', 'A8', 'A9']],
      ['Exterior & Landscape', 0.14, ['A2']],
      ['Commissioning & Handover', 0.10, ['A4', 'A10', 'A11']]
    ];
    const activities = definitions.map(([name, share, predecessors], index) => ({
      id: `A${index + 1}`,
      name,
      duration: Math.max(3, Math.round(totalDays * share)),
      predecessors
    }));
    const criticalPath = ['A1', 'A2', 'A3', 'A5', 'A6', 'A8', 'A10', 'A12'];
    return {
      activities,
      totalDuration: totalDays,
      totalMonths: Math.round(totalDays / 22 * 10) / 10,
      criticalPath,
      optimization: {
        parallelExecution: 38,
        compressionPotential: totalDays > 660 ? 'Medium' : 'Low',
        note: 'Parallel logic is a concept-stage network and requires resource-loaded CPM validation.'
      },
      trainingData: prediction.trainingRecords,
      confidence: 0.65,
      durationRange: {
        lower: Math.round(prediction.intervals.durationDays.lower),
        upper: Math.round(prediction.intervals.durationDays.upper),
        basis: 'synthetic_holdout_p90_error'
      },
      modelId: prediction.modelId,
      projectType: prediction.projectType,
      dataProvenance: prediction.dataProvenance,
      status: 'experimental',
      contractualUse: false,
      suitableForModelApproval: false,
      requiresHumanReview: true,
      limitations: [
        ...prediction.limitations,
        'The activity network is not a contractor resource-loaded baseline schedule.'
      ]
    };
  }

  _fallbackSchedule(totalArea, floors, finishing) {
    const base = 30 + floors * 10 + totalArea * 0.01;
    const finishingF = { Raw: 0.7, Standard: 1.0, Good: 1.15, Premium: 1.3, Luxury: 1.5 }[finishing] || 1.0;
    const totalDays = Math.round(base * finishingF);
    const activities = [
      { id: 'A1', name: 'Site Preparation', duration: 7, predecessors: [] },
      { id: 'A2', name: 'Foundation', duration: 14, predecessors: ['A1'] },
      { id: 'A3', name: 'Structure', duration: Math.round(21 + floors * 7), predecessors: ['A2'] },
      { id: 'A4', name: 'Finishing', duration: Math.round(30 + totalArea * 0.005), predecessors: ['A3'] },
      { id: 'A5', name: 'Handover', duration: 10, predecessors: ['A4'] }
    ];
    return { activities, totalDuration: totalDays, criticalPath: activities.map(a => a.id), confidence: 0.6 };
  }

  compareMethods(projectType, totalArea, floors) {
    const methods = ['Traditional', 'Precast', 'SteelFrame', 'ICF', 'AAC', 'PostTension'];
    return methods.map(m => {
      const s = this.generateSchedule(projectType, totalArea, floors, 'Standard', 'Riyadh', m);
      return { method: m, durationDays: s.totalDuration, criticalPath: s.criticalPath };
    }).sort((a, b) => a.durationDays - b.durationDays);
  }
}

module.exports = new ScheduleOptimizer();
