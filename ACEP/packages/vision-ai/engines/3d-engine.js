const { getLogger } = require('../logger');
const log = getLogger({ service: '3D-Engine-Server' });

const MATERIAL_MAP = {
  'Concrete': { category: 'Structure', boq: 'Concrete', color: '#446688', phase: 'Structure', props: { material: 'RC', grade: 'C40' } },
  'Steel': { category: 'Structure', boq: 'Steel', color: '#6699cc', phase: 'Structure', props: { material: 'Steel', grade: 'S355' } },
  'Masonry': { category: 'Architecture', boq: 'Masonry', color: '#8899aa', phase: 'Finishing', props: { material: 'Concrete Block', thickness: '200mm' } },
  'Block': { category: 'Architecture', boq: 'Masonry', color: '#8899aa', phase: 'Finishing', props: { material: 'Concrete Block', thickness: '200mm' } },
  'Plaster': { category: 'Finishing', boq: 'Plaster', color: '#ccbbaa', phase: 'Finishing', props: { material: 'Plaster' } },
  'Painting': { category: 'Finishing', boq: 'Painting', color: '#dddddd', phase: 'Finishing', props: { material: 'Paint' } },
  'Tiles': { category: 'Finishing', boq: 'Tiles', color: '#aa9966', phase: 'Finishing', props: { material: 'Ceramic Tiles' } },
  'Plumbing': { category: 'MEP', boq: 'Plumbing', color: '#66aaff', phase: 'MEP', props: { material: 'PVC', system: 'Plumbing' } },
  'Electrical': { category: 'MEP', boq: 'Electrical', color: '#ffaa44', phase: 'MEP', props: { material: 'Copper', system: 'Electrical' } },
  'HVAC': { category: 'MEP', boq: 'HVAC', color: '#44ccaa', phase: 'MEP', props: { material: 'Ductwork', system: 'HVAC' } },
};

class Server3DEngine {
  async generateStructure(projectId, projectParams, aiData = {}) {
    log.info(`AI structure generation for ${projectId} (${projectParams.type})`);
    const type = projectParams.type || 'Building';
    const area = projectParams.area || 500;
    const floors = projectParams.floors || 2;
    const style = projectParams.style || 'Modern';
    const boqItems = aiData.boqItems || [];
    const totalCost = aiData.totalCost || 0;
    const schedule = aiData.schedule || {};
    const risks = aiData.risks || {};
    const quality = aiData.quality || {};
    const cost = aiData.cost || {};

    const floorArea = area / Math.max(1, floors);
    const width = Math.sqrt(floorArea * 1.2);
    const length = floorArea / width;

    const elements = [];
    const phases = ['Foundation', 'Structure', 'Masonry', 'Finishing', 'MEP'];
    const colors = {
      Structure: '#446688', Architecture: '#8899aa',
      Finishing: '#aa9966', MEP: '#66aaff',
    };

    const detectedMaterials = this._detectMaterials(boqItems);
    const materialCategories = [...new Set(detectedMaterials.map(m => m.category))];
    const hasStructure = materialCategories.includes('Structure');
    const hasFinishing = materialCategories.includes('Finishing');
    const hasMEP = materialCategories.includes('MEP');

    let idx = 0;
    for (let f = 0; f < floors; f++) {
      const yBase = f * 3.2;
      const gridX = Math.max(2, Math.floor(width / 5));
      const gridZ = Math.max(2, Math.floor(length / 5));
      const spacingX = width / gridX;
      const spacingZ = length / gridZ;

      if (hasStructure) {
        for (let gx = 0; gx <= gridX; gx++) {
          for (let gz = 0; gz <= gridZ; gz++) {
            if (gx > 0 && gx < gridX && gz > 0 && gz < gridZ) continue;
            const rc = detectedMaterials.find(m => m.boq === 'Concrete') || MATERIAL_MAP['Concrete'];
            elements.push(this._makeElem(++idx, 'column', `Column F${f+1}-${gx}x${gz}`,
              rc.category, rc.boq, [0.4, 3.0, 0.4],
              [-width/2 + gx*spacingX, yBase, -length/2 + gz*spacingZ],
              [0,0,0], f+1, 'Structure', rc.color,
              { ...rc.props, grade: 'C40', reinforcement: 'T16@150' }));
          }
        }
      }

      if (hasFinishing) {
        for (let wx = 0; wx < gridX; wx++) {
          for (let wz = 0; wz < gridZ; wz++) {
            const px = -width/2 + wx*spacingX + spacingX/2;
            const pz = -length/2 + wz*spacingZ + spacingZ/2;
            const masonry = detectedMaterials.find(m => m.boq === 'Masonry') || MATERIAL_MAP['Masonry'];
            if (wx === 0 || wx === gridX-1) {
              elements.push(this._makeElem(++idx, 'wall', `Wall F${f+1}-${wx}x${wz}`,
                masonry.category, masonry.boq, [0.2, 2.8, spacingZ],
                [px, yBase+0.15, pz], [0,0,0], f+1, 'Finishing', masonry.color,
                { ...masonry.props, material: 'Concrete Block', thickness: '200mm' }));
            }
            if (wz === 0 || wz === gridZ-1) {
              elements.push(this._makeElem(++idx, 'wall', `Wall F${f+1}-${wx}x${wz}`,
                masonry.category, masonry.boq, [spacingX, 2.8, 0.2],
                [px, yBase+0.15, pz], [0,0,0], f+1, 'Finishing', masonry.color,
                { ...masonry.props, material: 'Concrete Block', thickness: '200mm' }));
            }
          }
        }
      }
    }

    return {
      projectId,
      type,
      area,
      floors,
      style,
      dimensions: { width, length, floorHeight: 3.2, totalHeight: floors * 3.2 },
      elements,
      metadata: {
        generatedBy: 'ACEP-3D-AI',
        timestamp: new Date().toISOString(),
        elementCount: elements.length,
        phases,
        categories: materialCategories.length > 0 ? materialCategories : ['Structure', 'Architecture'],
        boqItems: detectedMaterials.map(m => m.boq),
        colors,
        schedule: schedule.totalDuration ? {
          totalDuration: schedule.totalDuration,
          activities: (schedule.activities || []).slice(0, 20),
        } : null,
        totalCost,
        riskLevel: risks.riskLevel || 'Not assessed',
        qualityScore: quality.qualityScore || null,
        costPerM2: cost.costPerM2 || null,
      },
    };
  }

  _detectMaterials(boqItems) {
    if (!boqItems || boqItems.length === 0) {
      return Object.values(MATERIAL_MAP);
    }
    const detected = new Map();
    for (const item of boqItems) {
      const name = (item.name || item.material || item.specification || '').toLowerCase();
      for (const [keyword, config] of Object.entries(MATERIAL_MAP)) {
        if (name.includes(keyword.toLowerCase()) && !detected.has(keyword)) {
          detected.set(keyword, { ...config });
          break;
        }
      }
    }
    return detected.size > 0 ? [...detected.values()] : Object.values(MATERIAL_MAP);
  }

  _makeElem(id, type, name, category, boqCat, size, pos, rot, floor, phase, color, props) {
    return {
      id: `elem_${id}`, type, name, category,
      boqCategory: boqCat,
      size: { width: size[0], height: size[1], depth: size[2] },
      position: { x: pos[0], y: pos[1], z: pos[2] },
      rotation: { x: rot[0], y: rot[1], z: rot[2] },
      floor, phase, color,
      properties: props || {},
      status: 'pending',
      completion: 0,
    };
  }
}

module.exports = new Server3DEngine();
