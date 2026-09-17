'use strict';
const { normalizedCapacity } = require('./engineering-input-guards');

const TYPE_ARCHETYPES = Object.freeze({
  villa: { engineType: 'Villa', native: true, family: 'building' },
  apartment: { engineType: 'Apartment_Finishing', native: true, family: 'existing' },
  apartment_building: { engineType: 'Apartment_Building', native: true, family: 'building' },
  residential_tower: { engineType: 'Residential_Tower', native: true, family: 'building' },
  residential_compound: { engineType: 'Residential_Compound', native: true, family: 'building' },
  mixed_use: { engineType: 'Office_Building', native: false, family: 'building' },
  office: { engineType: 'Office_Building', native: true, family: 'building' },
  mall: { engineType: 'Mall', native: true, family: 'building' },
  hotel: { engineType: 'Hotel', native: true, family: 'building' },
  hospital: { engineType: 'Hospital', native: true, family: 'building' },
  school: { engineType: 'School', native: true, family: 'building' },
  mosque: { engineType: 'Mosque', native: true, family: 'building' },
  sports: { engineType: 'Office_Building', native: false, family: 'building' },
  cultural: { engineType: 'Office_Building', native: false, family: 'building' },
  data_center: { engineType: 'Factory', native: false, family: 'industrial' },
  factory: { engineType: 'Factory', native: true, family: 'industrial' },
  warehouse: { engineType: 'Warehouse', native: true, family: 'industrial' },
  power_plant: { engineType: 'Factory', native: false, family: 'industrial' },
  renewable_energy: { engineType: 'Factory', native: false, family: 'site' },
  oil_gas: { engineType: 'Factory', native: false, family: 'industrial' },
  road: { engineType: 'Road', native: true, family: 'linear' },
  bridge: { engineType: 'Bridge', native: true, family: 'linear' },
  tunnel: { engineType: 'Bridge', native: false, family: 'linear' },
  railway: { engineType: 'Road', native: false, family: 'linear' },
  airport: { engineType: 'Road', native: false, family: 'site' },
  port: { engineType: 'Warehouse', native: false, family: 'site' },
  water: { engineType: 'Road', native: false, family: 'utility' },
  dam: { engineType: 'Bridge', native: false, family: 'utility' },
  power: { engineType: 'Road', native: false, family: 'utility' },
  telecom: { engineType: 'Road', native: false, family: 'utility' },
  landscape: { engineType: 'Road', native: false, family: 'site' },
  renovation: { engineType: 'Office_Building', native: false, family: 'existing' },
  heritage: { engineType: 'Office_Building', native: false, family: 'existing' },
  fitout: { engineType: 'Apartment_Finishing', native: true, family: 'existing' },
  other: { engineType: 'Office_Building', native: false, family: 'other' }
});

const ENGINE_LABELS = Object.freeze({
  PUE: 'Project Understanding',
  VBE: 'Virtual Building',
  BOQ: 'Bill of Quantities',
  COST: 'Cost',
  TIME: 'Schedule',
  RISK: 'Risk',
  QUALITY: 'Quality',
  SAFETY: 'Safety',
  ESG: 'Sustainability',
  SUPPLY: 'Supply Market'
});

function compact(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resolveProjectType(type) {
  const key = compact(type).toLowerCase() || 'other';
  const resolved = TYPE_ARCHETYPES[key] || TYPE_ARCHETYPES.other;
  return { key, ...resolved };
}

function primaryScale(brief, family) {
  if (family === 'linear') return numberOrNull(brief.length) || numberOrNull(brief.area);
  if (family === 'utility') return numberOrNull(brief.length) || numberOrNull(brief.capacity) || numberOrNull(brief.area);
  return numberOrNull(brief.area) || numberOrNull(brief.landArea);
}

function quantitativeArea(brief, family) {
  const directArea = numberOrNull(brief.area);
  const floors = numberOrNull(brief.floors);
  if (directArea) {
    if (['building', 'industrial', 'existing', 'other'].includes(family)) {
      return {
        value: floors ? directArea / floors : directArea,
        grossBuiltArea: directArea,
        footprintArea: floors ? directArea / floors : null,
        basis: 'gross_built_area'
      };
    }
    return { value: directArea, grossBuiltArea: directArea, footprintArea: directArea, basis: 'treated_area' };
  }
  const length = numberOrNull(brief.length);
  const width = numberOrNull(brief.width);
  if (['linear', 'utility'].includes(family) && length && width) {
    return { value: length * width, grossBuiltArea: length * width, footprintArea: length * width, basis: 'length_times_width' };
  }
  const landArea = numberOrNull(brief.landArea);
  if (['site', 'utility'].includes(family) && landArea) {
    return { value: landArea, grossBuiltArea: landArea, footprintArea: landArea, basis: 'treated_site_area' };
  }
  return { value: null, grossBuiltArea: null, footprintArea: null, basis: landArea ? 'land_area_not_quantity_basis' : null };
}

function buildCanonicalDescription(brief) {
  const resolved = resolveProjectType(brief.type);
  const lines = [
    `Project name: ${compact(brief.name)}`,
    `Project classification: ${compact(brief.typeLabel) || resolved.key}; engine archetype: ${resolved.engineType}`,
    `Purpose and subtype: ${compact(brief.subtype) || 'not supplied'}`,
    `Location: ${[compact(brief.city), compact(brief.country)].filter(Boolean).join(', ') || 'not supplied'}`,
    `Stage and delivery: ${compact(brief.stage) || 'not supplied'}; ${compact(brief.delivery) || 'not supplied'}`,
    `Scale: land area ${numberOrNull(brief.landArea) || 'n/a'} m2; built/treated area ${numberOrNull(brief.area) || 'n/a'} m2; length ${numberOrNull(brief.length) || 'n/a'} m; width ${numberOrNull(brief.width) || 'n/a'} m; floors ${numberOrNull(brief.floors) || 'n/a'}; basements ${Number(brief.basements) || 0}; buildings ${numberOrNull(brief.buildings) || 1}; capacity ${numberOrNull(brief.capacity) || 'n/a'} ${compact(brief.capacityUnit)}`,
    `Technical basis: structure ${compact(brief.structure) || 'not supplied'}; foundation/existing asset ${compact(brief.foundation) || 'not supplied'}; finish ${compact(brief.finishing) || 'not supplied'}; site ${compact(brief.siteCondition) || 'not supplied'}`,
    `Included scope: ${compact(brief.inclusions) || 'not supplied'}`,
    `Excluded scope: ${compact(brief.exclusions) || 'none supplied'}`,
    `Disciplines: ${Array.isArray(brief.systems) && brief.systems.length ? brief.systems.join(', ') : 'not supplied'}`,
    `Standards: ${compact(brief.standards) || 'not supplied'}`,
    `Constraints and known risks: ${compact(brief.constraints) || 'not supplied'}`,
    `Budget and price basis: ${numberOrNull(brief.budget) || 'n/a'} ${compact(brief.currency) || ''}; ${compact(brief.priceBasis) || 'not supplied'}`,
    `Target dates: ${compact(brief.startDate) || 'n/a'} to ${compact(brief.targetDate) || 'n/a'}`,
    `Sustainability target: ${compact(brief.sustainability) || 'not supplied'}`,
    `Available evidence: ${Array.isArray(brief.documents) && brief.documents.length ? brief.documents.join(', ') : 'none declared'}`,
    `User narrative: ${compact(brief.description)}`
  ];
  return lines.join('\n');
}

function toEngineParams(brief) {
  const resolved = resolveProjectType(brief.type);
  const capacity = normalizedCapacity(brief);
  const area = quantitativeArea(brief, resolved.family);
  const normalizedNonBuildingFloors = ['linear', 'utility', 'site'].includes(resolved.family) ? 1 : null;
  return {
    type: resolved.engineType,
    modelType: resolved.key,
    typeConfidence: resolved.native ? 0.95 : 0.55,
    area: area.value,
    grossBuiltArea: area.grossBuiltArea,
    footprintArea: area.footprintArea,
    landArea: numberOrNull(brief.landArea),
    length: numberOrNull(brief.length),
    width: numberOrNull(brief.width),
    areaBasis: area.basis,
    floors: numberOrNull(brief.floors) || normalizedNonBuildingFloors,
    basements: Number.isFinite(Number(brief.basements)) ? Math.max(0, Number(brief.basements)) : 0,
    buildings: numberOrNull(brief.buildings) || 1,
    capacity: capacity.valid ? capacity.value : null,
    capacityUnit: capacity.unit,
    capacityUnitAssumed: capacity.assumed,
    finishing: compact(brief.finishing) || null,
    // Procurement delivery (EPC/CM) is not a physical construction method.
    method: compact(brief.constructionMethod) || null,
    systems: Array.isArray(brief.systems) ? brief.systems : [],
    inclusions: brief.inclusions || '',
    exclusions: brief.exclusions || '',
    rooms: null,
    bathrooms: null,
    hasKitchen: false,
    halls: null,
    city: compact(brief.city) || null,
    phase: compact(brief.stage) || null,
    extractionLog: {
      source: 'structured_project_brief',
      originalType: resolved.key,
      engineArchetype: resolved.engineType,
      nativeCoverage: resolved.native,
      quantitativeAreaBasis: area.basis,
      grossBuiltArea: area.grossBuiltArea,
      footprintArea: area.footprintArea,
      floorBasis: numberOrNull(brief.floors) ? 'user_input' : (normalizedNonBuildingFloors ? 'non_building_normalization' : null)
    }
  };
}

function inputCompleteness(brief) {
  const resolved = resolveProjectType(brief.type);
  const checks = [
    [compact(brief.name), 8], [compact(brief.description).length >= 80, 15], [compact(brief.type), 8],
    [compact(brief.city), 7], [compact(brief.stage), 5], [primaryScale(brief, resolved.family), 12],
    [compact(brief.inclusions).length >= 20, 12], [compact(brief.siteCondition), 5], [compact(brief.constraints), 6],
    [compact(brief.standards), 6], [Array.isArray(brief.systems) && brief.systems.length > 0, 6],
    [Array.isArray(brief.documents) && brief.documents.length > 0, 5], [compact(brief.priceBasis), 5]
  ];
  const earned = checks.reduce((sum, [passed, weight]) => sum + (passed ? weight : 0), 0);
  return Math.min(100, earned);
}

function engineRequirements(brief) {
  const documents = new Set(Array.isArray(brief.documents) ? brief.documents : []);
  const resolved = resolveProjectType(brief.type);
  const hasScale = Boolean(primaryScale(brief, resolved.family));
  const hasQuantitativeArea = Boolean(quantitativeArea(brief, resolved.family).value);
  const needsFloors = ['building', 'industrial', 'existing', 'other'].includes(resolved.family);
  const hasGeometry = ['drawings', 'bim', 'survey'].some(item => documents.has(item));
  const hasQuantityEvidence = ['drawings', 'bim', 'boq', 'specifications'].some(item => documents.has(item));
  const scopeDefined = compact(brief.inclusions).length >= 20;
  const missing = {
    PUE: [], VBE: [], BOQ: [], COST: [], TIME: [], RISK: [], QUALITY: [], SAFETY: [], ESG: [], SUPPLY: []
  };
  if (!compact(brief.description) || compact(brief.description).length < 80) missing.PUE.push('professional_description');
  if (!compact(brief.city)) missing.PUE.push('location');
  if (!hasScale) for (const code of ['VBE', 'BOQ', 'COST', 'TIME', 'RISK', 'QUALITY', 'SAFETY', 'ESG', 'SUPPLY']) missing[code].push('project_scale');
  if (!hasQuantitativeArea) {
    for (const code of ['VBE', 'BOQ', 'COST', 'TIME', 'QUALITY', 'ESG', 'SUPPLY']) {
      missing[code].push('treated_area_or_length_and_width');
    }
  }
  if (needsFloors && !numberOrNull(brief.floors)) {
    for (const code of ['VBE', 'BOQ', 'COST', 'TIME', 'RISK', 'QUALITY', 'SAFETY']) missing[code].push('floor_count');
  }
  if (!hasGeometry) missing.VBE.push('drawing_bim_or_survey');
  if (!scopeDefined) for (const code of ['BOQ', 'COST', 'TIME', 'RISK', 'QUALITY', 'SAFETY', 'SUPPLY']) missing[code].push('defined_scope');
  if (!hasQuantityEvidence) {
    missing.BOQ.push('quantity_evidence');
    missing.COST.push('quantity_evidence');
    missing.SUPPLY.push('quantity_evidence');
  }
  if (!compact(brief.priceBasis)) {
    missing.COST.push('dated_price_basis');
    missing.SUPPLY.push('dated_market_basis');
  }
  if (!brief.startDate && !brief.targetDate && !documents.has('schedule')) missing.TIME.push('target_date_or_schedule');
  if (!compact(brief.constraints) && !compact(brief.siteCondition)) missing.RISK.push('constraints_or_site_conditions');
  if (!compact(brief.standards) || !['specifications', 'drawings'].some(item => documents.has(item))) missing.QUALITY.push('standards_and_quality_evidence');
  if (!compact(brief.siteCondition) || !hasGeometry) missing.SAFETY.push('site_and_geometry_evidence');
  if (!compact(brief.sustainability)) missing.ESG.push('measurable_sustainability_target');
  missing.ESG.push('approved_lca_factors_and_system_boundary');
  if (!compact(brief.city)) missing.SUPPLY.push('delivery_location');
  if (brief.capacity && normalizedCapacity(brief).assumed) {
    for (const code of ['BOQ', 'COST', 'TIME', 'VBE']) missing[code].push('capacity_unit');
  }
  return Object.fromEntries(Object.entries(missing).map(([code, values]) => [code, {
    code,
    label: ENGINE_LABELS[code],
    missing: [...new Set(values)],
    inputReady: values.length === 0
  }]));
}

module.exports = {
  TYPE_ARCHETYPES,
  ENGINE_LABELS,
  resolveProjectType,
  buildCanonicalDescription,
  toEngineParams,
  inputCompleteness,
  engineRequirements
};
