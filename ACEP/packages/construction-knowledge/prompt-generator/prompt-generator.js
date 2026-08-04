const {
  PROJECT_TYPES, CONSTRUCTION_PHASES, FINISHING_LEVELS,
  ARCHITECTURAL_STYLES, FLOOR_RANGES, LIGHTING_CONDITIONS,
  CAMERA_ANGLES, QUALITY_TAGS, CONSTRAINT_TAGS,
  MATERIALS, ARCHITECTURAL_FEATURES,
} = require('./prompt-variables');
const { PROMPT_TEMPLATES, PHASE_SPECIFIC_MAPPINGS } = require('./prompt-templates');
const { PROMPT_TEMPLATES_AR, PHASE_SPECIFIC_MAPPINGS_AR, QUALITY_TAGS_AR, CONSTRAINT_TAGS_AR } = require('./prompt-templates-ar');

class EngineeringPromptGenerator {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
    this.generatedHashes = new Set();
    this.totalCombinations = this._calculateTotalCombinations();
  }

  _calculateTotalCombinations() {
    const projectTypeCount = Object.keys(PROJECT_TYPES).length;
    let subtypeSum = 0;
    let areaSum = 0;
    let styleSum = 0;
    for (const pt of Object.values(PROJECT_TYPES)) {
      subtypeSum += pt.subtypes.length;
      areaSum += pt.defaultArea.length;
      styleSum += pt.styles.length;
    }
    const avgSubtypes = Math.ceil(subtypeSum / projectTypeCount);
    const avgAreas = Math.ceil(areaSum / projectTypeCount);
    const avgStyles = Math.ceil(styleSum / projectTypeCount);
    const phases = CONSTRUCTION_PHASES.length;
    const finishes = FINISHING_LEVELS.length;
    const floors = FLOOR_RANGES.length;
    const lights = LIGHTING_CONDITIONS.length;
    const angles = CAMERA_ANGLES.length;
    const templateCount = Object.values(PROMPT_TEMPLATES).flat().length;
    const qualityCombo = this._choosePowerSet(QUALITY_TAGS, 2, 4);
    const materialCombos = Object.values(MATERIALS).flat().length;

    return projectTypeCount * avgSubtypes * avgAreas * phases * finishes *
           floors * avgStyles * lights * angles * templateCount *
           qualityCombo * materialCombos;
  }

  _choosePowerSet(arr, min, max) {
    let count = 0;
    const n = arr.length;
    for (let i = 1; i < (1 << n); i++) {
      const bits = i.toString(2).split('1').length - 1;
      if (bits >= min && bits <= max) count++;
    }
    return count || 1;
  }

  getTotalCombinations() { return this.totalCombinations; }

  _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  _pickN(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  _getPhaseSpecificData(phaseId) {
    return PHASE_SPECIFIC_MAPPINGS[phaseId] || { phase: phaseId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
  }

  _getPhaseSpecificDataAr(phaseId) {
    return PHASE_SPECIFIC_MAPPINGS_AR[phaseId] || { phase: phaseId.replace(/_/g, ' '), template: 'construction' };
  }

  _getTypeStyle(projectTypeId, archStyle) {
    const pt = PROJECT_TYPES[projectTypeId];
    if (!pt) return archStyle;
    if (pt.styles.includes(archStyle)) return archStyle;
    return this._pick(pt.styles);
  }

  _fillContext(projectTypeId) {
    const pt = PROJECT_TYPES[projectTypeId];
    if (!pt) return null;

    const subtype = this._pick(pt.subtypes);
    const area = this._pick(pt.defaultArea);
    const floors = this._pick(FLOOR_RANGES.filter(f => {
      if (area <= 200) return f <= 5;
      if (area <= 1000) return f <= 10;
      if (area <= 5000) return f <= 20;
      return f <= 60;
    }));
    const phase = this._pick(CONSTRUCTION_PHASES);
    const finishing = this._pick(FINISHING_LEVELS);
    const archStyle = this._pick(pt.styles);
    const lighting = this._pick(LIGHTING_CONDITIONS);
    const cameraAngle = this._pick(CAMERA_ANGLES);
    const qualityCount = Math.floor(Math.random() * 5) + 3;
    const qualityTags = this._pickN(QUALITY_TAGS, qualityCount).join(', ');
    const constraintTags = this._pickN(CONSTRAINT_TAGS, Math.floor(Math.random() * 4) + 3).join(', ');
    const facadeMaterial = this._pick(MATERIALS.facades);
    const floorMaterial = this._pick(MATERIALS.flooring);
    const wallMaterial = this._pick(MATERIALS.walls);
    const ceilingType = this._pick(MATERIALS.ceilings);
    const structuralSystem = this._pick(MATERIALS.structural);
    const roomType = this._pick([...ARCHITECTURAL_FEATURES.residential, ...ARCHITECTURAL_FEATURES.commercial, ...ARCHITECTURAL_FEATURES.general]);
    const architecturalFeatures = this._pickN(ARCHITECTURAL_FEATURES.general, Math.floor(Math.random() * 3) + 1).join(', ');

    const phaseData = this._getPhaseSpecificData(phase.id);
    const templateCat = phase.id === 'handover' || phase.id === 'finishing' ? this._pick(['exterior', 'interior', 'facade', 'aerial', 'night']) :
                        phase.id === 'pre_construction' ? 'construction' :
                        cameraAngle.id === 'interior' ? 'interior' :
                        cameraAngle.id === 'drone' || cameraAngle.id === 'birdseye' || cameraAngle.id === 'aerial_45' ? 'aerial' :
                        lighting.id === 'night' || lighting.id === 'architectural_lighting' ? 'night' :
                        phase.id === 'facade' ? 'facade' :
                        this._pick(['exterior', 'construction']);

    const templates = PROMPT_TEMPLATES[templateCat] || PROMPT_TEMPLATES.exterior;
    const template = this._pick(templates);

    const context = {
      style: archStyle,
      projectType: pt.name.en,
      subtype,
      area,
      floors,
      phase: phaseData.phase,
      phaseId: phase.id,
      finishing: finishing.name.en,
      archStyle,
      facadeMaterial,
      floorMaterial,
      wallMaterial,
      ceilingType,
      structuralSystem,
      lighting: lighting.name.en,
      cameraAngle: cameraAngle.name.en,
      qualityTags,
      constraintTags,
      architecturalFeatures,
      roomType: cameraAngle.id === 'interior' ? roomType : 'General',
      roofType: this._pick(['Flat', 'Sloped', 'Pitched', 'Gable', 'Hipped', 'Mansard', 'Green', 'Skillion', 'Butterfly', 'Barrel Vault', 'Domed', 'Curved']),
      windows: this._pick(['Large Windows', 'Floor to Ceiling Windows', 'Casement Windows', 'Sliding Windows', 'Bay Windows', 'Fixed Glazing', 'Curtain Wall', 'Aluminum Windows', 'UPVC Windows', 'Wooden Windows', 'Arch Windows', 'Stained Glass']),
      entranceType: this._pick(['Grand Entrance', 'Revolving Door', 'Sliding Door', 'Double Door', 'Wooden Door', 'Glass Door', 'Aluminum Door', 'Archway Entrance', 'Porte Cochere', 'Canopy Entrance']),
      landscape: this._pick(['Green Landscape', 'Desert Landscape', 'Urban Setting', 'Mountain View', 'Coastal Setting', 'Garden', 'Courtyard', 'Street Front', 'Park Setting', 'Waterfront']),
      furnitureStyle: this._pick(['Modern', 'Contemporary', 'Classic', 'Minimalist', 'Luxury', 'Arabic', 'Scandinavian', 'Industrial']),
      weatherCondition: this._pick(['Clear Sky', 'Sunny', 'Partly Cloudy', 'Overcast', 'Desert Heat', 'Mild Weather']),
    };

    return { context, template, templateCat, phaseData };
  }

  _fillContextArabic(projectTypeId) {
    const pt = PROJECT_TYPES[projectTypeId];
    if (!pt) return null;

    const subtype = this._pick(pt.subtypes);
    const area = this._pick(pt.defaultArea);
    const floors = this._pick(FLOOR_RANGES.filter(f => {
      if (area <= 200) return f <= 5;
      if (area <= 1000) return f <= 10;
      if (area <= 5000) return f <= 20;
      return f <= 60;
    }));
    const phase = this._pick(CONSTRUCTION_PHASES);
    const finishing = this._pick(FINISHING_LEVELS);
    const archStyle = this._pick(pt.styles);
    const lighting = this._pick(LIGHTING_CONDITIONS);
    const cameraAngle = this._pick(CAMERA_ANGLES);
    const qualityCount = Math.floor(Math.random() * 4) + 2;
    const qualityTags = this._pickN(QUALITY_TAGS_AR, qualityCount).join('، ');
    const constraintTags = this._pickN(CONSTRAINT_TAGS_AR, Math.floor(Math.random() * 3) + 2).join('، ');
    const facadeMaterial = this._pick(MATERIALS.facades);
    const floorMaterial = this._pick(MATERIALS.flooring);
    const wallMaterial = this._pick(MATERIALS.walls);
    const ceilingType = this._pick(MATERIALS.ceilings);
    const structuralSystem = this._pick(MATERIALS.structural);
    const roomType = this._pick([...ARCHITECTURAL_FEATURES.residential, ...ARCHITECTURAL_FEATURES.commercial, ...ARCHITECTURAL_FEATURES.general]);
    const architecturalFeatures = this._pickN(ARCHITECTURAL_FEATURES.general, Math.floor(Math.random() * 2) + 1).join('، ');

    const phaseData = this._getPhaseSpecificDataAr(phase.id);
    const templateCat = phase.id === 'handover' || phase.id === 'finishing' ? this._pick(['exterior', 'interior', 'facade', 'aerial', 'night']) :
                        cameraAngle.id === 'interior' ? 'interior' :
                        cameraAngle.id === 'drone' || cameraAngle.id === 'birdseye' || cameraAngle.id === 'aerial_45' ? 'aerial' :
                        lighting.id === 'night' || lighting.id === 'architectural_lighting' ? 'night' :
                        phaseData.template || 'exterior';

    const templates = PROMPT_TEMPLATES_AR[templateCat] || PROMPT_TEMPLATES_AR.exterior;
    const template = this._pick(templates);

    const context = {
      style: archStyle,
      projectType: pt.name.ar,
      subtype,
      area,
      floors,
      phase: phaseData.phase || phase.name.ar,
      phaseId: phase.id,
      finishing: finishing.name.ar,
      archStyle,
      facadeMaterial,
      floorMaterial,
      wallMaterial,
      ceilingType,
      structuralSystem,
      lighting: lighting.name.ar,
      cameraAngle: cameraAngle.name.ar,
      qualityTags,
      constraintTags,
      architecturalFeatures,
      roomType: cameraAngle.id === 'interior' ? roomType : 'عام',
      roofType: this._pick(['مسطح', 'مائل', 'جملوني', 'قبة', 'مقوس', 'أخضر']),
      windows: this._pick(['نوافذ كبيرة', 'نوافذ من الأرض للسقف', 'نوافذ قوسية', 'واجهة زجاجية', 'نوافذ ألمنيوم']),
      entranceType: this._pick(['مدخل رئيسي', 'باب زجاجي', 'باب خشبي', 'مدخل مقوس', 'مدخل مظلل']),
      landscape: this._pick(['منظر طبيعي', 'موقع حضري', 'إطلالة جبلية', 'حديقة', 'فناء', 'واجهة شارع']),
      furnitureStyle: this._pick(['حديث', 'كلاسيكي', 'عربي', 'بسيط', 'فاخر']),
      weatherCondition: this._pick(['سماء صافية', 'مشمس', 'غائم جزئياً', 'غائم', 'حرارة صحراوية']),
      angle: cameraAngle.name.ar,
      constraint: constraintTags,
      quality: qualityTags,
      material: facadeMaterial,
      feature: architecturalFeatures,
    };

    return { context, template, templateCat, phaseData };
  }

  generateOne(language = 'en') {
    const projectTypeIds = Object.keys(PROJECT_TYPES);
    const ptId = this._pick(projectTypeIds);

    const filled = this._fillContext(ptId);
    if (!filled) return null;

    const { context, template, templateCat } = filled;
    let prompt = template;

    for (const [key, val] of Object.entries(context)) {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val ?? ''));
    }

    prompt = prompt.replace(/\s+/g, ' ').trim();
    prompt = prompt.replace(/,\s*,/g, ',').replace(/,\s*\./g, '.');

    let hash = this._hash(prompt);
    if (this.generatedHashes.has(hash)) return null;
    this.generatedHashes.add(hash);

    let promptAr = null;
    if (language === 'ar' || language === 'both') {
      const filledAr = this._fillContextArabic(ptId);
      if (filledAr) {
        let pAr = filledAr.template;
        for (const [k, v] of Object.entries(filledAr.context)) {
          pAr = pAr.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v ?? ''));
        }
        pAr = pAr.replace(/\s+/g, ' ').trim().replace(/,\s*,/g, ',').replace(/,\s*\./g, '.');
        const hAr = this._hash(pAr);
        if (!this.generatedHashes.has(hAr)) {
          this.generatedHashes.add(hAr);
          promptAr = pAr;
        }
        if (language === 'ar') {
          prompt = promptAr;
          promptAr = null;
          hash = hAr;
        }
      }
    }

    return {
      prompt,
      promptAr,
      hash,
      language,
      projectType: ptId,
      typeName: language === 'ar' ? context.projectType : context.projectType,
      subtype: context.subtype,
      area: context.area,
      floors: context.floors,
      phase: context.phase,
      phaseId: context.phaseId,
      finishing: context.finishing,
      architecturalStyle: context.archStyle,
      lighting: context.lighting,
      cameraAngle: context.cameraAngle,
      templateCategory: templateCat,
      facadeMaterial: context.facadeMaterial,
      floorMaterial: context.floorMaterial,
      wallMaterial: context.wallMaterial,
      ceilingType: context.ceilingType,
      structuralSystem: context.structuralSystem,
      features: context.architecturalFeatures,
      qualityTags: context.qualityTags,
      constraintTags: context.constraintTags,
      generatedAt: new Date().toISOString(),
    };
  }

  generateBatch(count, language = 'en') {
    const results = [];
    const maxAttempts = count * 100;
    let attempts = 0;

    while (results.length < count && attempts < maxAttempts) {
      attempts++;
      const item = this.generateOne(language);
      if (item) results.push(item);
    }

    return results;
  }

  generateSpecific({ projectType, subtype, phaseId, finishing, style, area, floors, count = 1, language = 'en' }) {
    const results = [];
    let attempts = 0;
    const maxAttempts = count * 50;
    const isAr = language === 'ar';
    const fillFn = isAr ? this._fillContextArabic.bind(this) : this._fillContext.bind(this);

    while (results.length < count && attempts < maxAttempts) {
      attempts++;
      const filled = fillFn(projectType);
      if (!filled) continue;

      const { context, template } = filled;
      if (subtype) context.subtype = subtype;
      if (phaseId) {
        const phase = CONSTRUCTION_PHASES.find(p => p.id === phaseId);
        if (phase) {
          context.phase = isAr ? phase.name.ar : phase.name.en;
          context.phaseId = phaseId;
        }
      }
      if (finishing) {
        const fin = FINISHING_LEVELS.find(f => f.id === finishing);
        if (fin) context.finishing = isAr ? fin.name.ar : fin.name.en;
      }
      if (style) context.archStyle = style;
      if (area) context.area = area;
      if (floors) context.floors = floors;

      let prompt = template;
      for (const [key, val] of Object.entries(context)) {
        prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val ?? ''));
      }
      prompt = prompt.replace(/\s+/g, ' ').trim();

      const hash = this._hash(prompt);
      if (this.generatedHashes.has(hash)) continue;
      this.generatedHashes.add(hash);

      results.push({
        prompt, hash,
        projectType, subtype: context.subtype,
        area: context.area, floors: context.floors,
        phase: context.phase, phaseId: context.phaseId,
        finishing: context.finishing,
        architecturalStyle: context.archStyle,
        lighting: context.lighting,
        cameraAngle: context.cameraAngle,
        language,
        generatedAt: new Date().toISOString(),
      });
    }

    return results;
  }

  resetDeduplication() { this.generatedHashes.clear(); }
}

module.exports = { EngineeringPromptGenerator };
