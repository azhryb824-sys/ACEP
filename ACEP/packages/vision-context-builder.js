const store = require('../data/store');

const constructionStages = [
  { id: 'Site', label: 'Site Preparation', description: 'Site clearing, grading, and temporary facilities' },
  { id: 'Excavation', label: 'Excavation', description: 'Earthwork, trenching, and foundation preparation' },
  { id: 'Foundation', label: 'Foundation', description: 'Foundation walls, footings, and slab on grade' },
  { id: 'Columns', label: 'Columns & Structure', description: 'Reinforced concrete columns, beams, and structural frame' },
  { id: 'Slabs', label: 'Slabs & Roof', description: 'Floor slabs, roof slab, and staircases' },
  { id: 'Walls', label: 'Walls & Masonry', description: 'Block walls, brickwork, and partition walls' },
  { id: 'MEP', label: 'MEP Systems', description: 'Electrical conduits, plumbing pipes, and HVAC ducts' },
  { id: 'Finishing', label: 'Finishing Works', description: 'Plaster, tiling, painting, and final finishes' },
  { id: 'Landscape', label: 'Landscaping', description: 'External paving, green areas, and site development' },
  { id: 'Completed', label: 'Completed', description: 'Fully completed project' },
];

const cameraAngles = {
  exterior: ['Front View', 'Corner Angle', 'Side View', 'Aerial View', 'Street Level', 'Bird Eye View'],
  interior: ['Wide Angle', 'Eye Level', 'Corner Perspective', 'Detail Shot'],
  drone: ['Top Down', '45 Degree Aerial', 'Orbiting Shot', 'Vertical Panorama'],
};

const renderingStyles = [
  'Photorealistic', 'Architectural Visualization', 'Cinematic', 'Ray Traced',
  'Hyper Realistic', 'Artistic', 'Technical Illustration',
];

const weatherConditions = [
  'Clear Sunny Day', 'Golden Hour Sunset', 'Blue Hour Twilight',
  'Overcast Diffuse Light', 'Morning Light with Soft Shadows',
  'Night Scene with Architectural Lighting',
];

class VisionContextBuilder {
  constructor(edl) {
    this.edl = edl;
  }

  async buildContext(projectId) {
    let edlProject = null;
    try { edlProject = this.edl ? this.edl.getProject(projectId) : null; } catch (e) { /* ignore */ }

    if (!edlProject) {
      const legacy = store.findProject(projectId);
      if (!legacy) return null;
      return this._buildFromLegacy(legacy);
    }

    const getEffective = (key) => {
      const r = edlProject.getEffective(key);
      return r.value;
    };

    const projectType = getEffective('type') || 'Building';
    const floors = getEffective('floors') || 1;
    const area = getEffective('area') || 0;
    const city = getEffective('city') || 'الرياض';

    const boq = edlProject.boq || { items: [], summary: {} };
    const building = edlProject.building || {};
    const cost = edlProject.cost || {};
    const schedule = edlProject.schedule || {};
    const risks = edlProject.risks || {};
    const quality = edlProject.quality || {};

    const topMaterials = boq.items && boq.items.length > 0
      ? [...new Set(boq.items.filter(i => i.material).map(i => i.material))].slice(0, 8)
      : (building.materials || []).slice(0, 8);

    const topSpaces = building.spaces && building.spaces.length > 0
      ? building.spaces.slice(0, 6).map(s => s.name || s.type || 'Space')
      : [];

    return {
      project: { id: projectId, name: edlProject.metadata.name || projectId, type: projectType, status: edlProject.metadata.status || 'active' },
      site: {
        city, area: `${area} m²`, floors: `${floors} floors`,
        totalHeight: building.totalHeight ? `${building.totalHeight}m` : `${floors * 3.2}m`,
        hasBasement: building.hasBasement || false,
        description: edlProject.rawInput.description || '',
      },
      construction: {
        currentStage: getEffective('phase') || 'Site',
        stages: constructionStages,
        totalDuration: schedule.totalDuration ? `${schedule.totalDuration} days` : null,
      },
      building: {
        spaces: topSpaces,
        materials: topMaterials,
        systems: building.systems || [],
        structuralElements: building.structuralElements || [],
      },
      analysis: {
        totalCost: cost.totalCost ? `${cost.totalCost.toLocaleString()} SAR` : null,
        costPerM2: cost.costPerM2 ? `${cost.costPerM2} SAR/m²` : null,
        riskLevel: risks.riskLevel || 'Low',
        qualityScore: quality.qualityScore ? `${quality.qualityScore}%` : null,
        boqItems: boq.summary ? boq.summary.totalItems || boq.items.length : boq.items.length,
        boqTotalCost: boq.summary && boq.summary.totalCost ? `${boq.summary.totalCost.toLocaleString()} SAR` : null,
      },
      client: { style: getEffective('style') || 'Contemporary', preferences: '' },
    };
  }

  _buildFromLegacy(project) {
    return {
      project: { id: project.id, name: project.name, type: project.type || 'Building', status: project.status },
      site: {
        city: project.city || 'الرياض', area: `${project.area || 0} m²`, floors: `${project.floors || 1} floors`,
        totalHeight: null, hasBasement: false, description: project.description || '',
      },
      construction: { currentStage: project.phase || 'Site', stages: constructionStages, totalDuration: null },
      building: { spaces: [], materials: [], systems: [], structuralElements: [] },
      analysis: { totalCost: null, costPerM2: null, riskLevel: 'Low', qualityScore: null, boqItems: 0, boqTotalCost: null },
      client: { style: project.style || 'Contemporary', preferences: project.preferences || '' },
    };
  }

  buildPrompt(context, options = {}) {
    if (!context) return options.fallbackPrompt || 'Architectural building rendering, professional quality';

    const p = context.project;
    const s = context.site;
    const c = context.construction;
    const b = context.building;
    const a = context.analysis;
    const cl = context.client;

    const stage = constructionStages.find(st => st.id === (c.currentStage || 'Site'));
    const stageLabel = stage ? stage.label : c.currentStage;
    const stageDesc = stage ? stage.description : '';

    const promptType = options.type || 'exterior';
    const angle = options.angle || cameraAngles[promptType]?.[0] || 'Architectural View';
    const style = options.renderingStyle || renderingStyles[0];
    const weather = options.weather || weatherConditions[0];
    const model = options.model || 'modern';

    const materialStr = b.materials && b.materials.length > 0
      ? b.materials.join(', ')
      : 'concrete, glass, steel';

    const spaceStr = b.spaces && b.spaces.length > 0
      ? `featuring ${b.spaces.join(', ')}`
      : '';

    const systemStr = b.systems && b.systems.length > 0
      ? `with ${b.systems.join(', ')} systems`
      : '';

    const costContext = a.totalCost ? `Project value: ${a.totalCost}.` : '';
    const riskContext = a.riskLevel ? `Risk level: ${a.riskLevel}.` : '';
    const qualityContext = a.qualityScore ? `Quality target: ${a.qualityScore}.` : '';

    const clientPrefs = cl.preferences ? `Client preferences: ${cl.preferences}.` : '';
    const stylePref = cl.style ? `${cl.style} style.` : '';

    let prompt;

    if (promptType === 'interior') {
      prompt = `Professional interior architectural photography of a ${model} ${p.type} interior space, ${stylePref} ${style} rendering, ${weather}. ${spaceStr} ${materialStr} finishes, ${systemStr} ${stageLabel} construction stage. ${costContext} ${qualityContext} ${clientPrefs} High end furniture, decorative lighting, ambient occlusion, wide angle lens, 8k resolution, architectural digest quality.`;
    } else if (promptType === 'drone') {
      prompt = `Professional aerial drone photography of a ${stylePref} ${p.type}, ${angle} perspective, ${stageLabel} construction phase - ${stageDesc}, ${weather}, ${materialStr} architecture, ${spaceStr} ${systemStr} surrounding landscape, urban context, ${costContext} ${riskContext} cinematic quality, high resolution, architectural photography.`;
    } else {
      prompt = `Professional architectural ${angle} of a ${stylePref} ${p.type}, ${stageLabel} construction stage, ${weather}, ${style} rendering, ${materialStr} facade, ${spaceStr} ${systemStr} ${s.totalHeight ? s.totalHeight + ' height,' : ''} ${s.floors} ${s.area}, ${costContext} ${riskContext} ${clientPrefs} photorealistic, highly detailed textures, lush landscaping, award winning architecture, 8k resolution.`;
    }

    return prompt.trim().replace(/\s+/g, ' ');
  }

  async getPrompt(projectId, options = {}) {
    const context = await this.buildContext(projectId);
    if (!context) return null;
    return {
      context,
      prompt: this.buildPrompt(context, options),
      promptType: options.type || 'exterior',
      stage: context.construction.currentStage,
      materials: context.building.materials,
      systems: context.building.systems,
    };
  }
}

module.exports = VisionContextBuilder;
