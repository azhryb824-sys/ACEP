const { getLogger } = require('../logger');
const LOGGER = getLogger({ service: 'VisionAI-EPB' });

const PHASE_DESCRIPTIONS = {
  'Land': 'Empty land plot, bare soil, construction site ready for development',
  'Excavation': 'Excavation works, earthmoving equipment, exposed foundation trenches',
  'Foundations': 'Concrete foundation works, formwork, reinforcement steel cages',
  'Columns': 'Reinforced concrete columns rising, vertical structural elements',
  'Beams': 'Structural beams installation, horizontal structural framing',
  'Slabs': 'Concrete slab installation, floor slabs with reinforcement',
  'Walls': 'Wall construction, blockwork and masonry walls',
  'Roof': 'Roof structure installation with waterproofing and insulation',
  'MEP': 'MEP rough-in, ductwork, conduit runs, plumbing pipes',
  'Finishes': 'Interior finishing, plastering, painting, flooring, ceiling installation',
  'Landscape': 'Landscaping, garden planting, paving, outdoor development',
  'Completed': 'Completed building, final construction, professional architectural photography',
};

function buildEngineeringPrompt(upm, featureMap, options = {}) {
  const type = upm.projectType.main || 'Building';
  const subType = upm.projectType.sub;
  const floors = upm.physical.floors || 1;
  const area = upm.physical.area || 0;
  const height = upm.physical.height || floors * 3.2;
  const phase = options.phase || upm.phase.current || 'Completed';
  const city = upm.location.city || 'Saudi Arabia';
  const finishing = upm.finishing.level || 'Standard';
  const style = options.style || upm.style.architectural || 'Modern';
  const viewType = options.viewType || 'front exterior';

  const parts = [];

  if (type === 'Tower' || type === 'Building' || type === 'Hotel' || type === 'Office') {
    parts.push(`Professional architectural ${viewType} view of a ${floors}-story ${subType || ''} ${type} in ${city}`);
  } else {
    parts.push(`Professional architectural ${viewType} view of a ${style || 'Modern'} ${type} in ${city}`);
  }

  if (area > 0) parts.push(`Total built-up area approximately ${area} square meters per floor, total ${area * Math.max(floors, 1)} square meters`);
  if (floors > 0) parts.push(`${floors} stories`);
  if (height > 0) parts.push(`Building height approximately ${Math.round(height)} meters`);

  if (upm.structure.system) {
    parts.push(`Structural system: ${upm.structure.system}`);
  }

  parts.push(`Construction phase: ${phase}`);
  parts.push(`Finish quality: ${finishing}`);

  const featureParts = featureMap.getPromptParts();
  if (featureParts.length > 0) {
    const uniqueFeatures = [...new Set(featureParts)];
    const chunked = chunkArray(uniqueFeatures, 8);
    for (const chunk of chunked) {
      parts.push(chunk.join(', '));
    }
  }

  if (upm.facade.material) {
    parts.push(`Building facade with ${upm.facade.material}${upm.facade.color ? ' (' + upm.facade.color + ')' : ''}`);
  }

  if (upm.colors.paint) {
    parts.push(`${upm.colors.paint} paint color${upm.colors.facade ? ', facade: ' + upm.colors.facade : ''}`);
  }

  if (upm.doors.count > 0) {
    parts.push(`${upm.doors.count} ${upm.doors.material || ''} ${upm.doors.type || 'standard'} doors`.replace(/\s+/g, ' '));
  }

  if (upm.windows.count > 0) {
    parts.push(`${upm.windows.count} ${upm.windows.glazing || ''} ${upm.windows.type || 'standard'} windows`.replace(/\s+/g, ' '));
  }

  if (upm.flooring.type) {
    parts.push(`${upm.flooring.type} flooring`);
  }

  if (upm.ceilings.type) {
    parts.push(`${upm.ceilings.type} ceiling`);
  }

  if (upm.lighting.interior) {
    parts.push(`${upm.lighting.interior} lighting system`);
  }

  const ext = upm.exterior;
  const extParts = [];
  if (ext.landscaping) extParts.push('landscaped');
  if (ext.palmTrees) extParts.push('palm trees');
  if (ext.waterFeatures) extParts.push('water features');
  if (ext.parking) extParts.push('parking area');
  if (ext.roads) extParts.push('access roads');
  if (ext.fences) extParts.push('perimeter fencing');
  if (ext.walkways) extParts.push('walkways');
  if (ext.greenAreas) extParts.push('green areas');
  if (extParts.length > 0) {
    parts.push(`Exterior features: ${extParts.join(', ')}`);
  }

  if (upm.materials.length > 0) {
    parts.push(`Materials used: ${upm.materials.join(', ')}`);
  }

  if (upm.mep.hvac) parts.push(`HVAC system: ${upm.mep.hvac}`);
  if (upm.mep.electrical) parts.push(`Electrical system: ${upm.mep.electrical}`);

  parts.push('Photorealistic, 8K resolution, professional architectural photography, cinematic lighting, detailed textures, ultra-detailed, award-winning architectural rendering');

  const prompt = parts.filter(Boolean).join('. ').replace(/\s+/g, ' ').trim();
  const negativePrompt = [
    options.negativePrompt || '',
    'person, people, human, man, woman, child, baby, crowd, pedestrian, animal, dog, cat, bird, horse, camel',
    'cross, crucifix, red cross, statue, idol, church, temple, alcohol, wine',
    'صليب, خمر, تمثال, كنيسة, معبد, إنسان, حيوان, طير',
  ].filter(Boolean).join(', ');

  LOGGER.info(`Engineering prompt built (${prompt.length} chars, ${featureMap.features.length} features)`);
  return { prompt, negativePrompt, featureCount: featureMap.features.length };
}

function buildVerificationReport(upm, featureMap) {
  const type = upm.projectType.main || 'Unknown';
  const boqItems = upm.boqSummary.items || [];
  const kbMatchRate = upm.knowledgeBase.matchRate;

  const lines = [];
  lines.push('═══════════════════════════════════════');
  lines.push('  Pre-Generation Verification Report');
  lines.push('═══════════════════════════════════════');
  lines.push('');
  lines.push(`Project Type:         ${type}${upm.projectType.sub ? ' - ' + upm.projectType.sub : ''}`);
  lines.push(`Source:               ${upm.projectType.source || 'N/A'}`);
  lines.push(`Confidence:           ${Math.round(upm.projectType.confidence * 100)}%`);
  lines.push('');
  lines.push(`Floors:               ${upm.physical.floors || '?'}`);
  lines.push(`Area:                 ${upm.physical.area || '?'} m²`);
  lines.push(`Total Area:           ${upm.physical.totalArea || '?'} m²`);
  lines.push(`Height:               ${upm.physical.height ? Math.round(upm.physical.height) + 'm' : '?'}`);
  lines.push('');
  lines.push(`BOQ Items:            ${boqItems.length}`);
  lines.push(`BOQ Total Cost:       ${upm.boqSummary.totalCost.toLocaleString()} SAR`);
  lines.push(`BOQ Avg Confidence:   ${Math.round(upm.boqSummary.confidence * 100)}%`);
  lines.push(`BOQ Match Rate:       ${boqItems.length > 0 ? Math.round(boqItems.filter(i => !i.isSuggested).length / boqItems.length * 100) : 0}%`);
  lines.push('');
  lines.push(`Features from BOQ:    ${featureMap.boqMatchCount}`);
  lines.push(`Total Features:       ${featureMap.features.length}`);
  lines.push(`Feature Match Rate:   ${featureMap.toJSON().matchRate}%`);
  lines.push('');
  lines.push(`KB Matches:           ${upm.knowledgeBase.matches}/${upm.knowledgeBase.totalChecked}`);
  lines.push(`KB Match Rate:        ${kbMatchRate}%`);
  lines.push('');
  lines.push(`Materials Loaded:     ${upm.materials.length > 0 ? 'Yes (' + upm.materials.length + ')' : 'No'}`);
  lines.push(`Codes Loaded:         ${upm.codes.length > 0 ? 'Yes (' + upm.codes.length + ')' : 'No'}`);
  lines.push('');
  lines.push(`Phase:                ${upm.phase.current}`);
  lines.push(`Finishing:            ${upm.finishing.level}`);
  lines.push('');
  lines.push(`Doors:                ${upm.doors.count} ${upm.doors.type || ''} ${upm.doors.material || ''}`.trim());
  lines.push(`Windows:              ${upm.windows.count} ${upm.windows.type || ''} ${upm.windows.glazing || ''}`.trim());
  lines.push(`Facade:               ${upm.facade.material || ''} ${upm.facade.type || ''}`.trim());
  lines.push(`Paint Color:          ${upm.colors.paint || '?'}`);
  lines.push('');
  lines.push(`Data Completeness:    ${upm.verification.completeness}%`);

  if (upm.verification.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const w of upm.verification.warnings) lines.push(`  ⚠ ${w}`);
  }

  const ready = upm.verification.completeness >= 70;
  lines.push('');
  lines.push(`Ready For Generation: ${ready ? 'YES ✅' : 'NO ❌'}`);
  lines.push('═══════════════════════════════════════');

  return lines.join('\n');
}

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

module.exports = { buildEngineeringPrompt, buildVerificationReport, PHASE_DESCRIPTIONS };
