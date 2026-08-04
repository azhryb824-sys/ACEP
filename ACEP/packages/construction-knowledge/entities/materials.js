const MATERIALS = {
  concrete: { id: 'concrete', name: 'خرسانة', nameEn: 'Concrete', category: 'structural', unit: 'm³', avgPrice: 350, wasteFactor: 0.03 },
  rebar: { id: 'rebar', name: 'حديد', nameEn: 'Steel Rebar', category: 'structural', unit: 'ton', avgPrice: 2800, wasteFactor: 0.05 },
  block: { id: 'block', name: 'بلوك', nameEn: 'Concrete Block', category: 'masonry', unit: 'm²', avgPrice: 45, wasteFactor: 0.05 },
  brick: { id: 'brick', name: 'طوب', nameEn: 'Brick', category: 'masonry', unit: 'm²', avgPrice: 55, wasteFactor: 0.04 },
  plaster_material: { id: 'plaster_material', name: 'لياسة', nameEn: 'Plaster', category: 'finishing', unit: 'm²', avgPrice: 18, wasteFactor: 0.1 },
  gypsum_board: { id: 'gypsum_board', name: 'جبس', nameEn: 'Gypsum Board', category: 'finishing', unit: 'm²', avgPrice: 65, wasteFactor: 0.08 },
  paint: { id: 'paint', name: 'دهانات', nameEn: 'Paint', category: 'finishing', unit: 'liter', avgPrice: 35, wasteFactor: 0.1 },
  ceramic: { id: 'ceramic', name: 'سيراميك', nameEn: 'Ceramic Tiles', category: 'finishing', unit: 'm²', avgPrice: 85, wasteFactor: 0.07 },
  porcelain: { id: 'porcelain', name: 'بورسلان', nameEn: 'Porcelain', category: 'finishing', unit: 'm²', avgPrice: 120, wasteFactor: 0.07 },
  marble: { id: 'marble', name: 'رخام', nameEn: 'Marble', category: 'finishing', unit: 'm²', avgPrice: 250, wasteFactor: 0.1 },
  aluminum: { id: 'aluminum', name: 'ألمنيوم', nameEn: 'Aluminum', category: 'finishing', unit: 'm²', avgPrice: 180, wasteFactor: 0.05 },
  glass: { id: 'glass', name: 'زجاج', nameEn: 'Glass', category: 'finishing', unit: 'm²', avgPrice: 150, wasteFactor: 0.08 },
  wood: { id: 'wood', name: 'خشب', nameEn: 'Wood', category: 'finishing', unit: 'm³', avgPrice: 2000, wasteFactor: 0.15 },
  pvc: { id: 'pvc', name: 'PVC', nameEn: 'PVC', category: 'plumbing', unit: 'm', avgPrice: 25, wasteFactor: 0.05 },
  epoxy: { id: 'epoxy', name: 'إيبوكسي', nameEn: 'Epoxy', category: 'finishing', unit: 'kg', avgPrice: 45, wasteFactor: 0.08 },
  insulation_material: { id: 'insulation_material', name: 'عوازل', nameEn: 'Insulation', category: 'finishing', unit: 'm²', avgPrice: 55, wasteFactor: 0.05 },
  steel_section: { id: 'steel_section', name: 'قطاعات حديد', nameEn: 'Steel Section', category: 'structural', unit: 'ton', avgPrice: 3500, wasteFactor: 0.05 },
  copper_cable: { id: 'copper_cable', name: 'كابل نحاس', nameEn: 'Copper Cable', category: 'electrical', unit: 'm', avgPrice: 45, wasteFactor: 0.03 },
  pvc_pipe: { id: 'pvc_pipe', name: 'مواسير PVC', nameEn: 'PVC Pipe', category: 'plumbing', unit: 'm', avgPrice: 18, wasteFactor: 0.05 },
  duct: { id: 'duct', name: 'مجرى هواء', nameEn: 'HVAC Duct', category: 'mechanical', unit: 'm²', avgPrice: 120, wasteFactor: 0.05 },
  fire_alarm_cable: { id: 'fire_alarm_cable', name: 'كابل إنذار', nameEn: 'Fire Alarm Cable', category: 'electrical', unit: 'm', avgPrice: 8, wasteFactor: 0.03 },
  data_cable: { id: 'data_cable', name: 'كابل بيانات', nameEn: 'Data Cable (Cat6)', category: 'low_current', unit: 'm', avgPrice: 6, wasteFactor: 0.03 },
  tiles_ceramic: { id: 'tiles_ceramic', name: 'سيراميك حمام', nameEn: 'Bathroom Ceramic', category: 'finishing', unit: 'm²', avgPrice: 75, wasteFactor: 0.07 },
  marble_fake: { id: 'marble_fake', name: 'شبيه الرخام', nameEn: 'Marble-like Tiles', category: 'finishing', unit: 'm²', avgPrice: 140, wasteFactor: 0.07 },
  waterproof_membrane: { id: 'waterproof_membrane', name: 'غشاء عزل', nameEn: 'Waterproof Membrane', category: 'finishing', unit: 'm²', avgPrice: 65, wasteFactor: 0.05 },
};

function getMaterial(id) {
  return Object.values(MATERIALS).find(m => m.id === id || m.nameEn.toLowerCase() === id?.toLowerCase());
}

function getMaterialsByCategory(category) {
  return Object.values(MATERIALS).filter(m => m.category === category);
}

module.exports = { MATERIALS, getMaterial, getMaterialsByCategory };
