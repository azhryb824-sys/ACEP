/**
 * ACEP Internal Project Analyzer Model
 * Pure JS - trained on CSV project data. No external ML dependencies.
 */

const {loadProjects,positive,validSupport,mean} = require('./project-training');
const snapshots = require('./training-profile');
const path = require('path');
const kb = require('../knowledge-base');
const input = require('./model-input');

class ProjectAnalyzer {
  constructor() {
    this.trained = false;
    this.trainingStats = { mean: {}, std: {}, correlations: {}, projectTypeStats: {} };
    this.projects = [];
  }

  async train(csvPath, options = {}) {
    this.trained = false;
    this.trainingStats.projectTypeStats = Object.create(null);
    const fp = csvPath || path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv', 'projects.csv');
    const fit = loadProjects(fp, options, true), groups = new Map();
    for (const row of fit.data) { if (!groups.has(row.type)) groups.set(row.type, []); groups.get(row.type).push(row); }
    for (const [type,rows] of groups) {
      const areas=rows.map(p=>p.totalBuiltUpArea), floors=rows.map(p=>p.floors), complete=areas.every(positive);
      this.trainingStats.projectTypeStats[type] = {
        profileVersion:3,count:rows.length,areaBasis:complete?'total_built_up':null,
        avgCost:mean(rows.map(p=>p.estimatedCost)),avgArea:mean(rows.map(p=>p.buildingArea)),
        avgTotalBuiltUpArea:complete?mean(areas):null,avgFloors:mean(floors),
        avgConcrete:mean(rows.map(p=>p.concrete)),avgSteel:mean(rows.map(p=>p.steel)),
        avgDuration:mean(rows.map(p=>p.durationMonths)),
        avgCostPerM2:complete?mean(rows.map(p=>p.estimatedCost/p.totalBuiltUpArea)):null,
        totalAreaMin:complete?Math.min(...areas):null,totalAreaMax:complete?Math.max(...areas):null,
        floorsMin:Math.min(...floors),floorsMax:Math.max(...floors)
      };
    }
    this._projectCount=fit.data.length;this.projects=null;this.trainingAudit=fit.audit;this.trained=true;
    const eligibleTypes=Object.values(this.trainingStats.projectTypeStats).filter(s=>this._validProfile(s)).length;
    return {projectCount:this._projectCount,typeCount:groups.size,eligibleTypes,readyForInference:eligibleTypes>0,audit:this.trainingAudit};
  }
  _validProfile(s) {
    return s && s.profileVersion===3 && s.areaBasis==='total_built_up' && Number.isSafeInteger(s.count) && s.count>5 &&
      [s.avgCost,s.avgConcrete,s.avgSteel,s.avgDuration].every(positive) && validSupport(s,'avgTotalBuiltUpArea','avgFloors');
  }
  exportProfile() {
    if (!this.trained) throw new Error('Model not trained');
    const eligible=Object.fromEntries(Object.entries(this.trainingStats.projectTypeStats).filter(([,s])=>this._validProfile(s)));
    return snapshots.exportProfile('projectAnalyzer',eligible,this.trainingAudit,s=>this._validProfile(s));
  }
  loadProfile(value) {
    this.trained=false;this.trainingStats.projectTypeStats=Object.create(null);
    const v=snapshots.readProfile(value,'projectAnalyzer',s=>this._validProfile(s));
    this.trainingStats.projectTypeStats=v.profiles;this.trainingAudit=v.audit;
    this._projectCount=Object.values(v.profiles).reduce((n,s)=>n+s.count,0);this.trained=true;
    return {loadedTypes:Object.keys(v.profiles).length,accuracyValidated:false};
  }

  analyzeProject(description, options = {}) {
    const requestedType = options.type ?? kb.detectProjectType(description);
    const missing = input.geometry(requestedType, options.area, options.floors, { perFloor: true });
    if (missing.length) return { ...input.incomplete(missing), description, projectType: requestedType,
      message: 'يلزم استكمال نوع المشروع والمساحة وعدد الأدوار' };
    if (!this.trained) return {...input.incomplete(['trained_project_profile']), estimateStatus:'not_trained',trained:false};
    let type = requestedType;
    const pt = kb.getProjectType(type);
    let stats = this.trainingStats.projectTypeStats[type];

    const area = options.area;
    const floors = options.floors;
    const finishing = options.finishing || null;
    const region = options.region || null;
    const multiplier = finishing ? kb.getMaterialPriceMultiplier(finishing) : 1.0;
    const regionIndex = region ? kb.getRegionIndex(region) : 1.0;

    let estimatedCost, concreteM3, steelTon, duration;
    if (this._validProfile(stats)) {
      if (area*floors<stats.totalAreaMin || area*floors>stats.totalAreaMax || floors<stats.floorsMin || floors>stats.floorsMax) return {
        ...input.incomplete(['comparable_project_history']),estimateStatus:'outside_training_support',requiresEngineeringReview:true,
        trainingSupport:{totalArea:[stats.totalAreaMin,stats.totalAreaMax],floors:[stats.floorsMin,stats.floorsMax]}};
      const scaleFactor = (area * floors) / stats.avgTotalBuiltUpArea;
      estimatedCost = stats.avgCost * scaleFactor * multiplier * regionIndex;
      concreteM3 = stats.avgConcrete * scaleFactor;
      steelTon = stats.avgSteel * scaleFactor;
      duration = stats.avgDuration * Math.sqrt(scaleFactor) * (floors / (stats.avgFloors || 1));
    } else {
      return {
        ...input.incomplete(['comparable_project_history_with_total_area']),
        estimateStatus:'incompatible_or_insufficient_training_profile',
        requiresEngineeringReview: true,
        message: 'لا توجد بيانات تدريب كافية لنوع المشروع "' + type + '". يرجى توفير تفاصيل إضافية.',
        description,
        projectType: type,
        typeConfidence: null
      };
    }

    for (const value of [estimatedCost, concreteM3, steelTon, duration]) {
      if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER / 100) throw new RangeError('Prediction exceeds supported numeric range');
    }
    const spaces = kb.estimateSpaces(type, area, floors);

    return {
      projectType: type,
      totalArea: area * floors,
      areaPerFloor: area,
      floors,
      finishing,
      region,
      estimatedCost: Math.round(estimatedCost),
      concreteM3: Math.round(concreteM3),
      steelTon: Math.round(steelTon * 100) / 100,
      durationMonths: Math.round(duration),
      spaces,
      confidence: 0,
      confidenceCalibrated: false,
      estimateStatus: 'heuristic_estimate',
      requiresEngineeringReview: true,
      trainingDataPoints: stats ? stats.count : 0,
      historicalReference: { totalBuiltUpArea: stats.avgTotalBuiltUpArea, areaBasis: stats.areaBasis, provenance:this.trainingAudit?.provenance || 'unverified_profile', sourceVerified: false },
      insufficientData: false
    };
  }

  getTypeStats() { return this.trainingStats.projectTypeStats; }
}

module.exports = new ProjectAnalyzer();



