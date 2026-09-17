'use strict';

// These are the learned domain's limits, not statutory or structural limits.
function assessModelDomain(input, profile, config) {
  const issues = [];
  const check = (field, value, range, integer = false) => {
    if (value === undefined || value === null || value === '') return;
    const n = Number(value);
    if (!Number.isFinite(n) || (integer && !Number.isInteger(n)) || n < range[0] || n > range[1]) {
      issues.push({ field, code: 'outside_model_domain', supplied: value, supported: range,
        message: `${field} is outside the research model domain (${range.join('–')}); a separately reviewed estimate is required.` });
    }
  };
  if (!profile) return [{ field: 'type', code: 'unsupported_project_type', message: 'No model is available for this project type.' }];
  const gross = input.grossBuiltArea ?? input.totalArea ?? input.area;
  check('area', gross, profile.area);
  check('floors', input.floors, profile.floors, true);
  check('basements', input.basements, [0, 3], true);
  check('buildings', input.buildings, [1, 6], true);
  check('complexity', input.complexity, [1, 10]);
  check('landArea', input.landArea, [0.0001, 1e12]);
  check('footprintArea', input.footprintArea, [0.0001, 1e12]);
  check('capacity', input.capacity, [0.0001, 1e12]);
  const multiFloor = ['building', 'industrial', 'existing', 'other'].includes(profile.family);
  const footprint = Number(input.footprintArea) || (multiFloor ? Number(gross) / Number(input.floors) : Number(gross));
  if (Number(input.landArea) > 0 && footprint > Number(input.landArea) * 1.001) {
    issues.push({ field: 'landArea', code: 'footprint_exceeds_land', message: 'The derived footprint exceeds the declared land area. Correct the area basis or supply separately reviewed geometry.', footprint, landArea: Number(input.landArea) });
  }
  if (Number(input.footprintArea) > 0 && multiFloor && Number(gross) > 0 && Number(input.floors) > 0 &&
      Math.abs(Number(input.footprintArea) * Number(input.floors) - Number(gross)) > Math.max(0.01, Number(gross) * 0.001)) {
    issues.push({ field: 'footprintArea', code: 'inconsistent_area_basis', message: 'This model requires total floor area to equal the aggregate footprint times floor count. Non-uniform geometry requires a separate estimate.' });
  }
  const method = String(input.method || '').trim().toLowerCase();
  const compatibility = config.compatibility?.[profile.family];
  if (method && compatibility?.methods && !compatibility.methods.includes(method)) {
    issues.push({ field: 'constructionMethod', code: 'incompatible_construction_method', message: `Construction method ${method} is not supported for ${profile.family}.` });
  }
  const finish = String(input.finishing || '').trim().toLowerCase();
  if (finish && compatibility?.finishes && !compatibility.finishes.includes(finish)) issues.push({ field: 'finishing', code: 'incompatible_finishing', message: `Finishing ${finish} is not supported for ${profile.family}.` });
  return issues;
}

module.exports = { assessModelDomain };
