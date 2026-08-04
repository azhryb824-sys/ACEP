class ProjectVisualIdentity {
  constructor() {
    this.profiles = new Map();
  }

  generate(projectParams) {
    const seed = this._generateSeed(projectParams);
    const id = `PVID-${seed}`;

    const identity = {
      id,
      projectSeed: seed,
      projectType: projectParams.type || 'Unknown',
      generatedAt: new Date().toISOString(),
      visualDNA: this._generateVisualDNA(projectParams),
      geometryProfile: this._generateGeometryProfile(projectParams),
      facadeProfile: this._generateFacadeProfile(projectParams),
      materialProfile: this._generateMaterialProfile(projectParams),
      lightingProfile: this._generateLightingProfile(projectParams),
      landscapeProfile: this._generateLandscapeProfile(projectParams),
      cameraProfile: this._generateCameraProfile(projectParams),
    };

    this.profiles.set(id, identity);
    return identity;
  }

  get(id) {
    return this.profiles.get(id) || null;
  }

  _generateSeed(params) {
    const type = (params.type || 'unknown').substring(0, 4).toUpperCase();
    const area = Math.round((params.area ?? 0) / 10);
    const floors = params.floors ?? 1;
    const ts = Date.now().toString(36).toUpperCase();
    return `${type}-${area}x${floors}-${ts}`;
  }

  _generateVisualDNA(params) {
    const type = (params.type || 'project').toLowerCase();
    const styleMap = {
      villa: { proportion: 'horizontal', rhythm: 'balanced', complexity: 'moderate' },
      tower: { proportion: 'vertical', rhythm: 'repetitive', complexity: 'high' },
      mosque: { proportion: 'monumental', rhythm: 'symmetrical', complexity: 'very_high' },
      school: { proportion: 'horizontal', rhythm: 'modular', complexity: 'moderate' },
      hospital: { proportion: 'horizontal', rhythm: 'functional', complexity: 'high' },
      warehouse: { proportion: 'horizontal', rhythm: 'simple', complexity: 'low' },
      office: { proportion: 'vertical', rhythm: 'grid', complexity: 'moderate' },
      mall: { proportion: 'horizontal', rhythm: 'dynamic', complexity: 'high' },
    };
    const base = styleMap[type] || { proportion: 'balanced', rhythm: 'standard', complexity: 'moderate' };
    return {
      ...base,
      aspectRatio: params.area && params.floors ? Math.round((params.area / (params.floors || 1)) / 10) / 10 : 1.5,
      orientation: this._getOrientation(params),
      style: params.style || 'Contemporary',
    };
  }

  _getOrientation(params) {
    if (params.city) {
      const northCities = ['تبوك', 'عرعر', 'سكاكا', 'حائل'];
      if (northCities.includes(params.city)) return 'north_south';
    }
    return 'east_west';
  }

  _generateGeometryProfile(params) {
    const type = (params.type || 'project').toLowerCase();
    const area = params.area ?? 300;
    const floors = params.floors ?? 1;
    const floorArea = area / floors;
    const side = Math.sqrt(floorArea);

    const shapeMap = {
      villa: { form: 'L_shape', roofType: 'flat', columnGrid: 'irregular' },
      tower: { form: 'rectangular', roofType: 'flat', columnGrid: 'regular' },
      mosque: { form: 'cruciform', roofType: 'dome', columnGrid: 'hypostyle' },
      warehouse: { form: 'rectangular', roofType: 'pitched', columnGrid: 'wide_span' },
    };
    const base = shapeMap[type] || { form: 'rectangular', roofType: 'flat', columnGrid: 'regular' };

    return {
      ...base,
      width: Math.round(side * 1.2 * 10) / 10,
      length: Math.round(side * 0.8 * 10) / 10,
      floorHeight: 3.0,
      totalHeight: Math.round(3.0 * floors * 10) / 10,
      floorCount: floors,
      windowRatio: type === 'warehouse' ? 0.1 : type === 'villa' ? 0.25 : 0.2,
      balconyRatio: type === 'villa' ? 0.15 : 0.05,
    };
  }

  _generateFacadeProfile(params) {
    const style = params.style || 'Contemporary';
    const type = (params.type || 'project').toLowerCase();

    const facadeStyles = {
      Contemporary: { material: 'stucco', color: 'white', accent: 'glass', pattern: 'clean_lines' },
      Classical: { material: 'stone', color: 'cream', accent: 'columns', pattern: 'symmetrical' },
      Islamic: { material: 'plaster', color: 'sand', accent: 'arches', pattern: 'geometric' },
      Modern: { material: 'concrete', color: 'grey', accent: 'steel', pattern: 'minimal' },
      Luxury: { material: 'marble', color: 'white', accent: 'gold', pattern: 'ornate' },
      Minimal: { material: 'stucco', color: 'white', accent: 'wood', pattern: 'clean_lines' },
    };
    const base = facadeStyles[style] || facadeStyles.Contemporary;

    return {
      ...base,
      hasMashrabiya: type === 'villa' || type === 'mosque',
      mashrabiyaRatio: 0.15,
      columnExposed: type === 'tower' || type === 'office',
      corniceDetail: style === 'Classical' ? 'elaborate' : 'simple',
    };
  }

  _generateMaterialProfile(params) {
    const budget = params.budget || 'medium';
    const style = params.style || 'Contemporary';

    const budgetMap = {
      low: { flooring: 'ceramic', wallFinish: 'paint', ceiling: 'gypsum', countertop: 'laminate' },
      medium: { flooring: 'porcelain', wallFinish: 'paint + wallpaper', ceiling: 'gypsum_board', countertop: 'granite' },
      high: { flooring: 'marble', wallFinish: 'stone_cladding', ceiling: 'decorative', countertop: 'marble' },
    };

    return {
      ...budgetMap[budget] || budgetMap.medium,
      style,
      windowFrame: budget === 'high' ? 'aluminum_thermal' : 'aluminum',
      doorMaterial: budget === 'high' ? 'wood_solid' : 'wood_hollow',
    };
  }

  _generateLightingProfile(params) {
    return {
      type: 'mixed', /* natural + artificial */
      temperature: 4000, /* Kelvin */
      intensity: 0.8,
      accentLighting: true,
      smartControls: false,
      fixtureStyle: (params.style || 'Contemporary').toLowerCase() === 'classical' ? 'chandelier' : 'recessed',
    };
  }

  _generateLandscapeProfile(params) {
    const type = (params.type || 'project').toLowerCase();
    const hasGarden = type === 'villa' || type === 'mosque';
    return {
      hasGarden,
      gardenType: hasGarden ? 'formal' : 'minimal',
      palmTrees: type === 'villa' ? 4 : 0,
      fencing: type === 'villa' ? 'wall' : 'none',
      parkingSpaces: Math.max(1, Math.ceil((params.area || 300) / 200)),
      irrigation: hasGarden ? 'drip' : 'none',
    };
  }

  _generateCameraProfile(params) {
    return {
      defaultView: 'front_angle',
      droneAltitude: 50, /* meters */
      interiorFOV: 90, /* degrees */
      exteriorFOV: 60,
      goldenHourOffset: 1.5, /* hours before/after */
      nightExposure: 2.0,
    };
  }
}

module.exports = ProjectVisualIdentity;