'use strict';
// Unit-aware project ingestion shared by the analyzer and scheduler. No fitting here.
const csv = require('./training-csv');
const positive = n => Number.isFinite(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER / 100;
const bases = ['per_floor', 'total_built_up'];
function loadProjects(file, options = {}, withQuantities = false) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Invalid training options');
  for (const key of Object.keys(options)) if (key !== 'areaBasis') throw new TypeError('Unknown training option: '+key);
  if (options.areaBasis !== undefined && !bases.includes(options.areaBasis)) throw new TypeError('Invalid training area basis');
  const required = ['project_id','project_type','building_area_m2','floors','duration_months'];
  if (withQuantities) required.push('estimated_cost_sar','concrete_m3','steel_ton');
  // A duplicate ID must not silently increase statistical weight, including invalid rows.
  const ids = new Set();
  for (const row of csv.readCSV(file, required).records) {
    const id = row.values?.project_id;
    if (id && ids.has(id)) throw new Error('Duplicate training project: '+id);
    if (id) ids.add(id);
  }
  const fit = csv.load(file, required, r => {
    const buildingArea = csv.number(r.building_area_m2, Number.MIN_VALUE);
    const floors = csv.number(r.floors, 1), durationMonths = csv.number(r.duration_months, Number.MIN_VALUE);
    if (!positive(buildingArea) || !Number.isSafeInteger(floors) || !positive(floors) || !positive(durationMonths*22)) throw new RangeError('Unsafe project dimensions or duration');
    const areaBasis = r.area_basis || options.areaBasis || null;
    if (areaBasis !== null && !bases.includes(areaBasis)) throw new TypeError('Invalid area basis');
    if (r.area_basis && options.areaBasis && r.area_basis !== options.areaBasis) throw new Error('Conflicting area basis');
    const totalBuiltUpArea = areaBasis === null ? null : areaBasis === 'per_floor' ? buildingArea*floors : buildingArea;
    if (totalBuiltUpArea !== null && !positive(totalBuiltUpArea)) throw new RangeError('Unsafe built-up area');
    const out = {id:r.project_id,type:r.project_type,buildingArea,floors,durationMonths,areaBasis,totalBuiltUpArea,
      sourceKind:r.source_kind || 'unverified_csv',sourceId:r.source_id || null};
    if (withQuantities) {
      out.estimatedCost = csv.number(r.estimated_cost_sar, Number.MIN_VALUE);
      out.concrete = csv.number(r.concrete_m3, Number.MIN_VALUE);
      out.steel = csv.number(r.steel_ton, Number.MIN_VALUE);
      if (![out.estimatedCost,out.concrete,out.steel].every(positive)) throw new RangeError('Unsafe cost or material quantity');
    }
    return out;
  });
  const kinds = [...new Set(fit.data.map(r=>r.sourceKind))].sort();
  fit.audit = {...fit.audit,areaBasisMissing:fit.data.filter(r=>r.areaBasis===null).length,
    sourceKinds:kinds,sourceIds:[...new Set(fit.data.map(r=>r.sourceId).filter(Boolean))].sort(),
    provenance:kinds.length===1 && kinds[0]==='synthetic'?'declared_synthetic':'unverified_csv',
    sourceVerified:false,accuracyValidated:false};
  return fit;
}
function validSupport(s, areaKey, floorsKey) {
  return [s[areaKey],s[floorsKey],s.totalAreaMin,s.totalAreaMax,s.floorsMin,s.floorsMax].every(positive) &&
    Number.isSafeInteger(s.floorsMin) && Number.isSafeInteger(s.floorsMax) &&
    s.totalAreaMin<=s[areaKey] && s[areaKey]<=s.totalAreaMax && s.floorsMin<=s[floorsKey] && s[floorsKey]<=s.floorsMax;
}
function mean(values) {
  const origin=values[0];let sum=0,compensation=0;
  for (const value of values) {const term=(value-origin)/values.length-compensation,next=sum+term;compensation=(next-sum)-term;sum=next;}
  return Math.max(Math.min(...values),Math.min(Math.max(...values),origin+sum));
}
module.exports = {loadProjects,positive,validSupport,mean};
