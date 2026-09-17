'use strict';

const aliases = {
  structural: /structur|concrete|انشائي|انشائ|خرسان|اساسات|هيكل/,
  architecture: /architect|finish|معمار|تشطيب|واجه/,
  electrical: /electric|كهرب/,
  mechanical: /mechanic|hvac|ميكانيك|تكييف|تهويه/,
  plumbing: /plumb|سباك|صحي|صرف/,
  fire: /fire|حريق|اطفاء/,
  infrastructure: /infrastruct|بنيه تحتيه|طرق|جسور/,
  landscape: /landscap|تنسيق|زراع/,
  specialist: /specialist|clinical|hospitality|تخصص|طبي|ضيافه/,
  ict: /\bict\b|telecom|اتصالات|تيار خفيف/
};
const categoryGroups = {
  structural: 'Earthworks Substructure Structure Foundations Superstructure StructuralSteel StructuralRepairs Conservation CivilWorks CivilStructures Excavation ExcavationSupport Lining GroundTreatment DamBody Spillway HydraulicStructures MountingSystems BearingsJoints Demolition',
  architecture: 'Envelope Architecture IndustrialFloor DeckFinishes Waterproofing Buildings',
  electrical: 'Electrical ElectricalControls Lighting Cabling Power Earthing Switchgear PrimaryEquipment DCCollection InvertersTransformers GridConnection TractionPower GenerationEquipment MissionCritical',
  mechanical: 'Mechanical Ventilation ProcessEquipment ProcessSystems',
  plumbing: 'Plumbing Drainage Pipeline Trenching Bedding ValvesChambers',
  fire: 'FireLifeSafety SafetySecurity',
  infrastructure: 'Roadbase RoadMarking RoadFurniture Asphalt Kerbs Subbase Subgrade Pavements ApproachWorks TrackRoadSlab Formation Ballast Trackwork Reinstatement Utilities UtilityDiversions SiteClearance Survey Investigations',
  landscape: 'ExternalWorks Softscape Hardscape Irrigation SiteFurniture',
  ict: 'FiberNetwork ActiveEquipment Controls Instrumentation Signalling Security Towers'
};
const categoryDiscipline = Object.fromEntries(Object.entries(categoryGroups).flatMap(([group, names]) => names.split(' ').map(name => [name, group])));
const shared = new Set(['Preliminaries', 'Commissioning', 'TestingCommissioning']);
const specialist = new Set(['ClinicalSystems', 'HospitalitySystems', 'RetailSystems', 'EducationSystems', 'WorshipSystems', 'MixedUseInterfaces', 'SpecialistSystems']);
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ً-ْ]/g, '');

function resolveScope(input = {}) {
  const selected = new Set(input.systems || []);
  const text = normalize(input.exclusions);
  const costOnlyExclusions = /^(لا يشمل |باستثناء |استبعاد )?(ثمن الارض|تكلفه الارض|الارض)( او | و| وال)?(التمويل)?[.، ]*$/.test(text.trim());
  const excluded = new Set(Object.entries(aliases).filter(([, pattern]) => pattern.test(text)).map(([name]) => name));
  if (/\bmep\b/.test(text)) ['mechanical', 'electrical', 'plumbing'].forEach(name => excluded.add(name));
  const hasText = text.trim() && !/^(لا يوجد|لا توجد|لا شيء|لايوجد|none|n\/a|not supplied)$/.test(text.trim());
  const words = text.split(/[\s,،;؛.]+/).filter(Boolean);
  const permitted = /^(و|او|لا|يشمل|تشمل|استبعاد|استثناء|باستثناء|كامل|كامله|كافه|جميع|اعمال|الاعمال|نطاق|انظمه|الانظمه|عدا|فقط|بدون|خارج|حدود|المشروع|exclude|excluding|exclusion|all|works|the|and|or|no|mep)$/;
  const unrecognizedWords = words.filter(word => !permitted.test(word.replace(/^و(?=.{2})/, '')) && !Object.values(aliases).some(pattern => pattern.test(word)));
  const unresolved = Boolean(hasText && !costOnlyExclusions && (excluded.size === 0 || unrecognizedWords.length));
  return { selected: [...selected], excluded: [...excluded], mode: selected.size ? 'explicit_disciplines' : 'full_project_assumption',
    unresolved, unrecognizedWords: costOnlyExclusions ? [] : unrecognizedWords, requiresConfirmation: !selected.size, priority: 'explicit_exclusions_override_selected_disciplines',
    limitations: ['Shared preliminaries and commissioning remain in scope; their resources require review.', 'A discipline selection does not validate design interfaces or authorize omitting required safety systems.'] };
}

function applyScope(definitions, input, family) {
  const scope = resolveScope(input);
  const allShare = definitions.reduce((sum, line) => sum + line.share, 0);
  const rows = definitions.map(line => {
    const discipline = categoryDiscipline[line.category] || (specialist.has(line.category) ? 'specialist' : null);
    const isShared = shared.has(line.category);
    const infrastructureIncludesCivil = ['linear', 'site', 'utility'].includes(family) && scope.selected.includes('infrastructure') &&
      ['structural', 'plumbing', 'infrastructure'].includes(discipline);
    const isSelected = !scope.selected.length || scope.selected.includes(discipline) || infrastructureIncludesCivil;
    const excluded = scope.excluded.includes(discipline);
    const state = scope.unresolved || (!discipline && !isShared) || (discipline === 'specialist' && scope.selected.length && !scope.selected.includes('specialist')) ? 'unknown' :
      excluded ? 'excluded' : isShared || isSelected ? 'included' : 'excluded';
    return { ...line, discipline, scopeStatus: state };
  });
  const unknown = rows.filter(line => line.scopeStatus === 'unknown');
  const items = rows.filter(line => line.scopeStatus === 'included');
  return { ...scope, items, ledger: rows.map(({ code, description, discipline, scopeStatus }) => ({ code, description, discipline, status: scopeStatus })),
    unresolved: scope.unresolved || unknown.length > 0, allShare,
    includedShare: items.reduce((sum, line) => sum + line.share, 0),
    excludedPackages: rows.filter(line => line.scopeStatus === 'excluded').map(line => line.code) };
}

module.exports = { resolveScope, applyScope, categoryDiscipline };
