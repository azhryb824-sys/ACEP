const { readRows } = require('./csv-rows');
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
    this.projects = readRows(fp).map(l => {
      const c = l;
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
    if (trainedPrediction.blocked) return { status: 'blocked', reason: trainedPrediction.reason, totalDuration: null, totalMonths: null, activities: [], criticalPath: [] };
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
    const networks = {
      road: ['Survey, permits & traffic staging', 'Utility diversions', 'Earthworks', 'Drainage & culverts', 'Subgrade improvement', 'Subbase & roadbase', 'Asphalt paving', 'Lighting, signs & barriers', 'Testing & road opening'],
      bridge: ['Investigations & temporary traffic works', 'Piling & foundations', 'Piers and abutments', 'Superstructure erection', 'Deck slab & post-tensioning', 'Bearings and expansion joints', 'Waterproofing & surfacing', 'Barriers, drainage & lighting', 'Load testing & opening'],
      tunnel: ['Ground investigation & enabling works', 'Portal and shaft works', 'Excavation & initial support', 'Permanent lining & waterproofing', 'Road or track slab', 'Ventilation and life-safety systems', 'Power, controls & communications', 'Emergency systems integration', 'Trial operation & handover'],
      railway: ['Survey, permits & possessions', 'Earthworks & formation', 'Drainage and structures', 'Ballast, sleepers & rails', 'Stations and depots', 'Signalling & communications', 'Traction power', 'System integration', 'Dynamic testing & operation'],
      renewable_energy: ['Studies, permits & grid agreement', 'Site roads & civil works', 'Foundations and mounting', 'Generation equipment installation', 'DC collection', 'Inverters and transformers', 'Grid connection', 'SCADA and protection', 'Performance testing & energization'],
      water: ['Survey, design & permits', 'Enabling works and access', 'Civil structures or trenching', 'Pipelines and process equipment', 'Mechanical installation', 'Electrical, controls & SCADA', 'Testing, flushing & disinfection', 'Performance trial & handover'],
      dam: ['Investigation & river diversion', 'Foundation excavation & treatment', 'Dam body construction', 'Spillway and hydraulic structures', 'Outlets, gates & MEP', 'Instrumentation and monitoring', 'Reservoir preparation', 'First filling & emergency readiness'],
      power: ['Studies & grid coordination', 'Civil works and foundations', 'Primary equipment installation', 'Switchgear and cabling', 'Protection and control', 'Earthing and auxiliaries', 'Pre-commissioning', 'Energization & reliability run'],
      telecom: ['Survey, design & permits', 'Civil ducts and chambers', 'Fiber or feeder installation', 'Towers and passive equipment', 'Active equipment installation', 'Power and grounding', 'Network integration', 'Testing and service activation'],
      renovation: ['Surveys, opening-up & design freeze', 'Isolation and selective demolition', 'Structural and envelope repairs', 'MEP replacement', 'Partitions and finishes', 'Fire and life-safety upgrade', 'Testing & phased handover'],
      heritage: ['Documentation & conservation trials', 'Temporary stabilization', 'Controlled dismantling and repair', 'Fabric conservation', 'Discreet MEP installation', 'Specialist finishes', 'Authority inspection & handover'],
      fitout: ['Survey and design coordination', 'Strip-out and enabling works', 'Partitions and ceilings', 'MEP alterations', 'Joinery and finishes', 'Testing, snagging & handover']
    };
    const familyNetworks = {
      industrial: ['Design and permitting', 'Site preparation', 'Foundations and undergrounds', 'Structural frame and envelope', 'Process equipment', 'Mechanical and utility systems', 'Power and controls', 'Integrated testing', 'Performance run & handover'],
      site: ['Studies and permits', 'Site preparation and earthworks', 'Civil works and pavements', 'Buildings and utilities', 'Specialist operational systems', 'Safety and security systems', 'Integrated testing & handover'],
      existing: networks.renovation,
      building: ['Design and mobilization', 'Excavation & substructure', 'Structural frame', 'Envelope and roofing', 'Partitions and architectural works', 'MEP first fix', 'Finishes and second fix', 'External works', 'Testing & commissioning', 'Handover'],
      other: ['Definition and design', 'Mobilization', 'Civil and structural works', 'Architecture and systems', 'External works', 'Testing & handover']
    };
    const names = networks[prediction.projectType] || familyNetworks[prediction.family] || familyNetworks.other;
    const shares = names.map((unused, index) => {
      if (index === 0) return 0.08;
      if (index === names.length - 1) return 0.10;
      return 0.82 / Math.max(1, names.length - 2);
    });
    // Allocate whole working days without changing the predicted total.
    // Cumulative boundaries eliminate rounding drift in a sequential network.
    let elapsedDays = 0;
    let cumulativeShare = 0;
    const activities = names.map((name, index) => {
      cumulativeShare += shares[index];
      const finish = index === names.length - 1 ? totalDays : Math.round(totalDays * cumulativeShare);
      const activity = {
        id: `A${index + 1}`, name, duration: finish - elapsedDays,
        earlyStart: elapsedDays, earlyFinish: finish, critical: true,
        predecessors: index === 0 ? [] : [`A${index}`]
      };
      elapsedDays = finish;
      return activity;
    });
    const criticalPath = activities.map(activity => activity.id);
    return {
      activities,
      totalDuration: totalDays,
      totalMonths: Math.round(totalDays / 22 * 10) / 10,
      criticalPath,
      optimization: {
        parallelExecution: null,
        compressionPotential: 'Not evaluated',
        note: 'Sequential concept network; no overlap or acceleration has been evaluated.'
      },
      trainingData: prediction.trainingRecords,
      confidence: 0.65,
      calendar: { dayType: 'working', workingDaysPerMonth: 22, calendarDatesCalculated: false },
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
