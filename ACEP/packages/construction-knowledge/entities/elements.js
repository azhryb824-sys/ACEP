const ELEMENTS = {
  column: { id: 'column', name: 'عمود', nameEn: 'Column', category: 'Structure', phases: ['foundation','structure'], boqCategory: 'Concrete', unit: 'm³', codeRefs: ['ACI 318','SBC 304'] },
  beam: { id: 'beam', name: 'جسر', nameEn: 'Beam', category: 'Structure', phases: ['structure'], boqCategory: 'Concrete', unit: 'm³', codeRefs: ['ACI 318','SBC 304'] },
  slab: { id: 'slab', name: 'بلاطة', nameEn: 'Slab', category: 'Structure', phases: ['structure'], boqCategory: 'Concrete', unit: 'm³', codeRefs: ['ACI 318','SBC 304'] },
  foundation: { id: 'foundation', name: 'أساس', nameEn: 'Foundation', category: 'Structure', phases: ['foundation'], boqCategory: 'Concrete', unit: 'm³', codeRefs: ['ACI 318','SBC 301'] },
  wall: { id: 'wall', name: 'جدار', nameEn: 'Wall', category: 'Architecture', phases: ['masonry','finishing'], boqCategory: 'Masonry', unit: 'm²', codeRefs: ['SBC 304','ASTM C90'] },
  door: { id: 'door', name: 'باب', nameEn: 'Door', category: 'Architecture', phases: ['finishing'], boqCategory: 'Doors', unit: 'no.', codeRefs: ['SBC 304','NFPA 80'] },
  window: { id: 'window', name: 'نافذة', nameEn: 'Window', category: 'Architecture', phases: ['finishing'], boqCategory: 'Windows', unit: 'no.', codeRefs: ['SBC 304','ASTM E119'] },
  stairs: { id: 'stairs', name: 'سلم', nameEn: 'Stairs', category: 'Architecture', phases: ['structure','finishing'], boqCategory: 'Concrete', unit: 'set', codeRefs: ['SBC 304','IBC 1011'] },
  ceiling: { id: 'ceiling', name: 'سقف', nameEn: 'Ceiling', category: 'Architecture', phases: ['finishing'], boqCategory: 'Ceilings', unit: 'm²', codeRefs: ['SBC 304','ASTM C635'] },
  facade: { id: 'facade', name: 'واجهة', nameEn: 'Facade', category: 'Architecture', phases: ['finishing'], boqCategory: 'Facade', unit: 'm²', codeRefs: ['SBC 304','ASTM E330'] },
  flooring: { id: 'flooring', name: 'أرضية', nameEn: 'Flooring', category: 'Architecture', phases: ['finishing'], boqCategory: 'Flooring', unit: 'm²', codeRefs: ['SBC 304','ASTM C1028'] },
  fence: { id: 'fence', name: 'سور', nameEn: 'Fence', category: 'Architecture', phases: ['finishing'], boqCategory: 'Site Work', unit: 'm', codeRefs: ['SBC 304'] },
  elevator: { id: 'elevator', name: 'مصعد', nameEn: 'Elevator', category: 'MEP', phases: ['electrical','mechanical'], boqCategory: 'Elevators', unit: 'no.', codeRefs: ['SBC 301','ASME A17.1'] },
  canopy: { id: 'canopy', name: 'مظلة', nameEn: 'Canopy', category: 'Architecture', phases: ['finishing'], boqCategory: 'Steel', unit: 'm²', codeRefs: ['SBC 304','AISC 360'] },
  hvac: { id: 'hvac', name: 'تكييف', nameEn: 'HVAC', category: 'MEP', phases: ['mechanical'], boqCategory: 'HVAC', unit: 'ton', codeRefs: ['ASHRAE','SMACNA'] },
  plumbing_pipe: { id: 'plumbing_pipe', name: 'مواسير', nameEn: 'Plumbing Pipe', category: 'MEP', phases: ['plumbing'], boqCategory: 'Plumbing', unit: 'm', codeRefs: ['IPC','SBC 401'] },
  electrical_cable: { id: 'electrical_cable', name: 'كابل كهرباء', nameEn: 'Electrical Cable', category: 'MEP', phases: ['electrical'], boqCategory: 'Electrical', unit: 'm', codeRefs: ['NEC','SBC 401'] },
  switchgear: { id: 'switchgear', name: 'لوحة كهرباء', nameEn: 'Switchgear', category: 'MEP', phases: ['electrical'], boqCategory: 'Electrical', unit: 'no.', codeRefs: ['IEC 61439','NEC'] },
  fire_extinguisher: { id: 'fire_extinguisher', name: 'طفاية حريق', nameEn: 'Fire Extinguisher', category: 'MEP', phases: ['fire_fighting'], boqCategory: 'Fire Fighting', unit: 'no.', codeRefs: ['NFPA 10','SBC 801'] },
  fire_sprinkler: { id: 'fire_sprinkler', name: 'رشاش حريق', nameEn: 'Fire Sprinkler', category: 'MEP', phases: ['fire_fighting'], boqCategory: 'Fire Fighting', unit: 'no.', codeRefs: ['NFPA 13','SBC 801'] },
  fire_alarm_device: { id: 'fire_alarm_device', name: 'جهاز إنذار', nameEn: 'Fire Alarm Device', category: 'MEP', phases: ['fire_alarm'], boqCategory: 'Fire Alarm', unit: 'no.', codeRefs: ['NFPA 72','SBC 801'] },
  camera: { id: 'camera', name: 'كاميرا', nameEn: 'CCTV Camera', category: 'MEP', phases: ['low_current'], boqCategory: 'Low Current', unit: 'no.', codeRefs: ['SBC 402'] },
  data_cable: { id: 'data_cable', name: 'كابل بيانات', nameEn: 'Data Cable', category: 'MEP', phases: ['low_current'], boqCategory: 'Low Current', unit: 'm', codeRefs: ['TIA/EIA 568'] },
  door_frame: { id: 'door_frame', name: 'إطار باب', nameEn: 'Door Frame', category: 'Architecture', phases: ['masonry','finishing'], boqCategory: 'Doors', unit: 'no.', codeRefs: ['SBC 304'] },
  window_frame: { id: 'window_frame', name: 'إطار نافذة', nameEn: 'Window Frame', category: 'Architecture', phases: ['finishing'], boqCategory: 'Windows', unit: 'no.', codeRefs: ['SBC 304'] },
  handrail: { id: 'handrail', name: 'درابزين', nameEn: 'Handrail', category: 'Architecture', phases: ['finishing'], boqCategory: 'Metal Works', unit: 'm', codeRefs: ['SBC 304','IBC 1014'] },
  painting: { id: 'painting', name: 'دهان', nameEn: 'Painting', category: 'Architecture', phases: ['finishing'], boqCategory: 'Painting', unit: 'm²', codeRefs: ['ASTM D3451','SBC 304'] },
  plaster: { id: 'plaster', name: 'لياسة', nameEn: 'Plaster', category: 'Architecture', phases: ['finishing'], boqCategory: 'Plaster', unit: 'm²', codeRefs: ['ASTM C926','SBC 304'] },
  tiles: { id: 'tiles', name: 'بلاط', nameEn: 'Tiles', category: 'Architecture', phases: ['finishing'], boqCategory: 'Flooring', unit: 'm²', codeRefs: ['ASTM C1028','SBC 304'] },
  gypsum: { id: 'gypsum', name: 'جبس', nameEn: 'Gypsum', category: 'Architecture', phases: ['finishing'], boqCategory: 'Ceilings', unit: 'm²', codeRefs: ['ASTM C1396','SBC 304'] },
  roof: { id: 'roof', name: 'سطح', nameEn: 'Roof', category: 'Structure', phases: ['structure'], boqCategory: 'Concrete', unit: 'm²', codeRefs: ['SBC 304','ASTM D6163'] },
  waterproofing: { id: 'waterproofing', name: 'عزل مائي', nameEn: 'Waterproofing', category: 'Architecture', phases: ['finishing'], boqCategory: 'Waterproofing', unit: 'm²', codeRefs: ['ASTM D6163','SBC 304'] },
  insulation: { id: 'insulation', name: 'عزل حراري', nameEn: 'Thermal Insulation', category: 'Architecture', phases: ['finishing'], boqCategory: 'Insulation', unit: 'm²', codeRefs: ['ASTM C518','SBC 601'] },
};

const ELEMENT_RELATIONSHIPS = {
  wall: { dependsOn: ['foundation','column','beam'], requiredBy: ['plaster','painting','tiles','electrical_cable','camera'] },
  plaster: { dependsOn: ['wall','column'], requiredBy: ['painting','tiles','gypsum'] },
  painting: { dependsOn: ['plaster','gypsum'], requiredBy: ['lighting','furniture'] },
  column: { dependsOn: ['foundation'], requiredBy: ['beam','slab','wall'] },
  beam: { dependsOn: ['column'], requiredBy: ['slab','wall'] },
  slab: { dependsOn: ['column','beam'], requiredBy: ['ceiling','flooring','tiles'] },
  foundation: { dependsOn: ['excavation'], requiredBy: ['column','wall'] },
  door: { dependsOn: ['wall','door_frame'], requiredBy: ['painting','furniture'] },
  window: { dependsOn: ['wall','window_frame'], requiredBy: ['painting','facade'] },
  electrical_cable: { dependsOn: ['wall','slab','ceiling'], requiredBy: ['switchgear','lighting','camera'] },
  hvac: { dependsOn: ['wall','slab','ceiling'], requiredBy: ['ceiling','finishing'] },
  plumbing_pipe: { dependsOn: ['wall','slab','foundation'], requiredBy: ['fixtures','finishing'] },
  fire_sprinkler: { dependsOn: ['ceiling','plumbing_pipe'], requiredBy: ['ceiling','finishing'] },
  fire_alarm_device: { dependsOn: ['wall','ceiling','electrical_cable'], requiredBy: ['commissioning'] },
  camera: { dependsOn: ['wall','ceiling','electrical_cable','data_cable'], requiredBy: ['commissioning'] },
  tiles: { dependsOn: ['flooring','plaster'], requiredBy: ['furniture','finishing'] },
  gypsum: { dependsOn: ['ceiling','plaster'], requiredBy: ['painting','lighting'] },
  ceiling: { dependsOn: ['slab','hvac','electrical_cable'], requiredBy: ['gypsum','lighting','fire_sprinkler'] },
  facade: { dependsOn: ['wall','insulation'], requiredBy: ['painting','finishing'] },
  waterproofing: { dependsOn: ['slab','foundation','roof'], requiredBy: ['tiles','finishing'] },
};

function getElement(id) {
  return Object.values(ELEMENTS).find(e => e.id === id || e.nameEn.toLowerCase() === id?.toLowerCase());
}

function getElementsByCategory(category) {
  return Object.values(ELEMENTS).filter(e => e.category === category);
}

function getElementsByPhase(phaseId) {
  return Object.values(ELEMENTS).filter(e => e.phases.includes(phaseId));
}

function getElementRelationships(elementId) {
  return ELEMENT_RELATIONSHIPS[elementId] || { dependsOn: [], requiredBy: [] };
}

module.exports = { ELEMENTS, ELEMENT_RELATIONSHIPS, getElement, getElementsByCategory, getElementsByPhase, getElementRelationships };
