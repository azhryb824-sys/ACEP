'use strict';
const path = require('node:path');
const csv = require('./training-csv');
const input = require('./model-input');
const { analyzeActivityNetwork } = require('./activity-network');
const finishingFactors = Object.freeze({ Raw: 0.7, Standard: 1, Good: 1.15, Premium: 1.3, Luxury: 1.5 });
const methodFactors = Object.freeze({ Traditional: 1, Precast: 0.7, SteelFrame: 0.6, ICF: 0.85, AAC: 0.9, PostTension: 0.8 });
const own = (o, key) => o && Object.hasOwn(o, key);
const positive = n => typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER;
const mean = rows => rows.reduce((s,n) => s+n/rows.length,0);
class ScheduleOptimizer {
  constructor() {
    this.trained = false; this.projects = []; this.byType = Object.create(null);
    // Planning assumptions, not measured task productivity or resource limits.
    this.activityTemplates = {
      'Site Preparation': {weight:.08,min:3}, 'Foundation': {weight:.15,min:7},
      'Structural Frame': {weight:.25,min:14}, 'MEP Rough-in': {weight:.12,min:10},
      'Masonry & Block': {weight:.08,min:7}, 'Plaster & Finishing': {weight:.10,min:10},
      'Flooring & Tiles': {weight:.06,min:7}, 'Ceiling & Partitions': {weight:.05,min:5},
      'Doors & Windows': {weight:.03,min:5}, 'Painting & Decoration': {weight:.04,min:5},
      'Exterior & Landscape': {weight:.06,min:7}, 'Commissioning & Handover': {weight:.03,min:5}
    };
  }
  // Fitting runs only in the authorized training environment. Never guess area basis.
  async train(csvPath, options = {}) {
    this.trained = false; this.byType = Object.create(null);
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Invalid training options');
    if (options.areaBasis !== undefined && !['per_floor','total_built_up'].includes(options.areaBasis)) throw new TypeError('Invalid training area basis');
    const fp = csvPath || path.join(__dirname,'..','..','..','packages','databases','training','csv','projects.csv');
    const fit = csv.load(fp,['project_id','project_type','building_area_m2','floors','duration_months'],r=>{
      const buildingArea=csv.number(r.building_area_m2,Number.MIN_VALUE), floors=csv.number(r.floors,1);
      const durationMonths=csv.number(r.duration_months,Number.MIN_VALUE);
      if (!positive(buildingArea) || !Number.isSafeInteger(floors) || !positive(durationMonths*22)) throw new RangeError('Unsafe project dimensions or duration');
      const areaBasis=r.area_basis || options.areaBasis || null;
      if (areaBasis !== null && !['per_floor','total_built_up'].includes(areaBasis)) throw new TypeError('Invalid area basis');
      if (r.area_basis && options.areaBasis && r.area_basis !== options.areaBasis) throw new Error('Conflicting area basis');
      const totalBuiltUpArea=areaBasis===null ? null : areaBasis==='per_floor' ? buildingArea*floors : buildingArea;
      if (totalBuiltUpArea!==null && !positive(totalBuiltUpArea)) throw new RangeError('Unsafe built-up area');
      return {id:r.project_id,type:r.project_type,buildingArea,floors,durationMonths,areaBasis,totalBuiltUpArea};
    });
    const groups=new Map(), ids=new Set();
    for (const row of fit.data) {
      if (ids.has(row.id)) throw new Error('Duplicate training project: '+row.id);
      ids.add(row.id); if (!groups.has(row.type)) groups.set(row.type,[]); groups.get(row.type).push(row);
    }
    for (const [type,rows] of groups) {
      const durations=rows.map(r=>r.durationMonths).sort((a,b)=>a-b), floors=rows.map(r=>r.floors);
      const areas=rows.map(r=>r.totalBuiltUpArea), completeArea=areas.every(positive);
      this.byType[type]={ profileVersion:2,count:rows.length,durationMean:mean(durations),
        durationMedian:(durations[Math.floor((rows.length-1)/2)]+durations[Math.floor(rows.length/2)])/2,
        durationMin:durations[0],durationMax:durations.at(-1),areaMean:mean(rows.map(r=>r.buildingArea)),floorsAvg:mean(floors),
        totalBuiltUpAreaMean:completeArea?mean(areas):null,areaBasis:completeArea?'total_built_up':null,
        totalAreaMin:completeArea?Math.min(...areas):null,totalAreaMax:completeArea?Math.max(...areas):null,
        floorsMin:Math.min(...floors),floorsMax:Math.max(...floors) };
    }
    this._projectCount=fit.data.length; this.projects=null;
    this.trainingAudit={...fit.audit,areaBasisMissing:fit.data.filter(r=>r.areaBasis===null).length,provenance:'unverified_csv',accuracyValidated:false};
    this.trained=true;
    return {total:this._projectCount,types:groups.size,audit:this.trainingAudit};
  }
  _incomplete(missing,status='incomplete') {
    return {...input.incomplete(missing),estimateStatus:status,inferenceVersion:10,activities:[],totalDuration:null,totalMonths:null,
      criticalPath:[],optimization:null,resourceFeasible:null,requiresScheduleReview:true,confidence:null};
  }
  analyzeActivityNetwork(activities) { return analyzeActivityNetwork(activities); }
  scheduleFromActivities(activities,timeUnit) {
    if (!['working_day','calendar_day'].includes(timeUnit)) throw new TypeError('Explicit timeUnit must be working_day or calendar_day');
    const network=analyzeActivityNetwork(activities);
    return {...network,inferenceVersion:10,criticalPath:network.criticalActivities,totalMonths:null,timeBasis:timeUnit,
      calendar:{timeUnit,workingDaysPerMonth:null,assumed:false},optimization:null,predictiveAccuracy:null,
      message:'المدة محسوبة من الأنشطة والروابط المقدمة؛ توافر الموارد والتقويم التفصيلي يحتاجان مراجعة.'};
  }
  generateSchedule(projectType,totalArea,floors,finishing='Standard',region='Riyadh',method='Traditional') {
    const missing=input.geometry(projectType,totalArea,floors);
    if (missing.length) return this._incomplete(missing);
    if (!own(finishingFactors,finishing)) return this._incomplete(['supported_finishing'],'unsupported_scope');
    if (!own(methodFactors,method)) return this._incomplete(['supported_construction_method'],'unsupported_scope');
    if (!this.trained) return this._incomplete(['trained_schedule_profile'],'not_trained');
    if (!own(this.byType,projectType)) return this._incomplete(['project_type_schedule_history'],'unsupported_project_type');
    const s=this.byType[projectType];
    if (s.profileVersion!==2 || s.areaBasis!=='total_built_up' || !positive(s.totalBuiltUpAreaMean)) return this._incomplete(['declared_training_area_basis'],'incompatible_training_profile');
    if (!Number.isSafeInteger(s.count) || s.count<1 || ![s.durationMean,s.floorsAvg,s.totalAreaMin,s.totalAreaMax,s.floorsMin,s.floorsMax].every(positive) ||
      s.totalAreaMin>s.totalAreaMax || s.floorsMin>s.floorsMax || s.totalBuiltUpAreaMean<s.totalAreaMin || s.totalBuiltUpAreaMean>s.totalAreaMax || s.floorsAvg<s.floorsMin || s.floorsAvg>s.floorsMax) return this._incomplete(['valid_schedule_profile'],'invalid_training_profile');
    if (totalArea<s.totalAreaMin || totalArea>s.totalAreaMax || floors<s.floorsMin || floors>s.floorsMax) return {
      ...this._incomplete(['comparable_project_history'],'outside_training_support'),trainingSupport:{totalArea:[s.totalAreaMin,s.totalAreaMax],floors:[s.floorsMin,s.floorsMax]}};
    const baseDuration=s.durationMean*22,areaFactor=1+Math.log2(Math.max(1,totalArea/s.totalBuiltUpAreaMean))*.15;
    const floorsFactor=1+(floors-s.floorsAvg)*.08;
    if (floorsFactor<=0) return this._incomplete(['supported_floor_adjustment'],'outside_heuristic_domain');
    const finishingFactor=finishingFactors[finishing],methodFactor=methodFactors[method];
    const estimate=Math.max(30,Math.round(baseDuration*areaFactor*floorsFactor*finishingFactor*methodFactor));
    return this._allocate(estimate,{trainingData:s.count,
      parameters:{baseDuration,referenceTotalBuiltUpArea:s.totalBuiltUpAreaMean,areaFactor,floorsFactor,finishingFactor,methodFactor},
      assumptions:{finishing,method,region,regionAdjustmentApplied:false,factorsCalibrated:false},
      dataBasis:'declared_area_basis_historical_profile',provenance:this.trainingAudit?.provenance || 'unverified_profile'});
  }
  // Explicit scenario API; never a fallback for missing evidence.
  generateTemplateSchedule(totalArea,floors,finishing='Standard') {
    const missing=input.geometry('Template',totalArea,floors);
    if (missing.length) return this._incomplete(missing);
    if (!own(finishingFactors,finishing)) return this._incomplete(['supported_finishing'],'unsupported_scope');
    return this._allocate(Math.round((30+floors*10+totalArea*.01)*finishingFactors[finishing]),
      {dataBasis:'explicit_template_scenario',trainingData:0,assumptions:{finishing,factorsCalibrated:false}});
  }
  _allocate(estimate,metadata) {
    if (!Number.isSafeInteger(estimate) || estimate<0) throw new RangeError('Unsafe duration estimate');
    const entries=Object.entries(this.activityTemplates),minimum=entries.reduce((s,[,t])=>s+t.min,0);
    const target=Math.max(estimate,minimum),extra=target-minimum,weight=entries.reduce((s,[,t])=>s+t.weight,0);
    const shares=entries.map(([,t],i)=>({i,value:extra*(t.weight/weight)}));
    const durations=entries.map(([,t],i)=>t.min+Math.floor(shares[i].value));
    const remainder=target-durations.reduce((s,n)=>s+n,0);
    if (!Number.isSafeInteger(remainder) || remainder<0 || remainder>entries.length) throw new RangeError('Unsafe duration allocation');
    shares.sort((a,b)=>(b.value-Math.floor(b.value))-(a.value-Math.floor(a.value)) || a.i-b.i);
    for(let i=0;i<remainder;i++) durations[shares[i].i]++;
    const activities=entries.map(([name],i)=>({id:'A'+(i+1),name,duration:durations[i],predecessors:i?['A'+i]:[]}));
    const network=analyzeActivityNetwork(activities);
    return {...network,...metadata,activities:network.activities.map(a=>({...a,predecessors:a.predecessors.map(p=>p.id)})),inferenceVersion:10,heuristicDurationEstimate:estimate,minimumTemplateDuration:minimum,minimumDurationAdjustment:target-estimate,
      totalMonths:Math.round(network.totalDuration/22*10)/10,criticalPath:network.criticalActivities,
      calendar:{workingDaysPerMonth:22,assumed:true},schedulingBasis:'sequential_template',timeBasis:'assumed_working_day',
      estimateStatus:'heuristic_estimate',requiresScheduleReview:true,optimization:{parallelExecution:0,compressionPotential:null},confidence:null,
      message:'سيناريو تخطيط أولي بعوامل غير معايرة؛ يلزم اعتماد الأنشطة والموارد والتقويم.'};
  }
  compareMethods(projectType,totalArea,floors) {
    return Object.keys(methodFactors).map(method=>{
      const s=this.generateSchedule(projectType,totalArea,floors,'Standard','Riyadh',method);
      return {method,durationDays:s.totalDuration,criticalPath:s.criticalPath,estimateStatus:s.estimateStatus,missing:s.missing || [],
        requiresScheduleReview:true,recommendationEligible:false,comparisonBasis:'uncalibrated_factor_scenarios'};
    });
  }
}
module.exports=new ScheduleOptimizer();
