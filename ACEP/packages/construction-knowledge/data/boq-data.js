class BOQDatabase {
  constructor() {
    this.items = [];
    this._initDefaults();
  }

  _initDefaults() {
    this.items = [
      { code: 'CON-001', name: 'Concrete for Foundation', elementType: 'foundation', unit: 'm³', formula: 'Length × Width × Depth', wasteFactor: 0.03, complexity: 3, category: 'Concrete', unitPrice: 350, standardRef: 'ACI 318' },
      { code: 'CON-002', name: 'Concrete for Columns', elementType: 'column', unit: 'm³', formula: 'Width × Depth × Height × Count', wasteFactor: 0.03, complexity: 4, category: 'Concrete', unitPrice: 380, standardRef: 'ACI 318' },
      { code: 'CON-003', name: 'Concrete for Beams', elementType: 'beam', unit: 'm³', formula: 'Width × Depth × Length × Count', wasteFactor: 0.03, complexity: 4, category: 'Concrete', unitPrice: 370, standardRef: 'ACI 318' },
      { code: 'CON-004', name: 'Concrete for Slabs', elementType: 'slab', unit: 'm³', formula: 'Thickness × Area', wasteFactor: 0.03, complexity: 3, category: 'Concrete', unitPrice: 360, standardRef: 'ACI 318' },
      { code: 'REB-001', name: 'Steel Reinforcement (T16)', elementType: 'column', unit: 'ton', formula: 'Volume × Density × Ratio', wasteFactor: 0.05, complexity: 4, category: 'Steel', unitPrice: 2800, standardRef: 'ACI 318' },
      { code: 'REB-002', name: 'Steel Reinforcement (T12)', elementType: 'beam', unit: 'ton', formula: 'Volume × Density × Ratio', wasteFactor: 0.05, complexity: 4, category: 'Steel', unitPrice: 2850, standardRef: 'ACI 318' },
      { code: 'REB-003', name: 'Steel Reinforcement (T10)', elementType: 'slab', unit: 'ton', formula: 'Area × Density', wasteFactor: 0.05, complexity: 3, category: 'Steel', unitPrice: 2900, standardRef: 'ACI 318' },
      { code: 'MSE-001', name: 'Concrete Block Masonry 200mm', elementType: 'wall', unit: 'm²', formula: 'Length × Height', wasteFactor: 0.05, complexity: 2, category: 'Masonry', unitPrice: 85, standardRef: 'ASTM C90' },
      { code: 'MSE-002', name: 'Concrete Block Masonry 100mm', elementType: 'wall', unit: 'm²', formula: 'Length × Height', wasteFactor: 0.05, complexity: 2, category: 'Masonry', unitPrice: 65, standardRef: 'ASTM C90' },
      { code: 'PLA-001', name: 'Internal Plaster (Cement)', elementType: 'wall', unit: 'm²', formula: 'Length × Height × 2 Sides', wasteFactor: 0.1, complexity: 2, category: 'Plaster', unitPrice: 28, standardRef: 'ASTM C926' },
      { code: 'PLA-002', name: 'External Plaster', elementType: 'facade', unit: 'm²', formula: 'Perimeter × Height', wasteFactor: 0.1, complexity: 3, category: 'Plaster', unitPrice: 35, standardRef: 'ASTM C926' },
      { code: 'PNT-001', name: 'Internal Paint (2 coats)', elementType: 'wall', unit: 'm²', formula: 'Plaster Area × 2', wasteFactor: 0.1, complexity: 1, category: 'Painting', unitPrice: 22, standardRef: 'ASTM D3451' },
      { code: 'PNT-002', name: 'External Paint', elementType: 'facade', unit: 'm²', formula: 'External Wall Area', wasteFactor: 0.1, complexity: 2, category: 'Painting', unitPrice: 30, standardRef: 'ASTM D3451' },
      { code: 'FLR-001', name: 'Ceramic Tiles 400x400mm', elementType: 'tiles', unit: 'm²', formula: 'Room Area', wasteFactor: 0.07, complexity: 2, category: 'Flooring', unitPrice: 95, standardRef: 'ASTM C1028' },
      { code: 'FLR-002', name: 'Porcelain Tiles 600x600mm', elementType: 'tiles', unit: 'm²', formula: 'Room Area', wasteFactor: 0.07, complexity: 3, category: 'Flooring', unitPrice: 140, standardRef: 'ASTM C1028' },
      { code: 'FLR-003', name: 'Marble Flooring', elementType: 'tiles', unit: 'm²', formula: 'Room Area', wasteFactor: 0.1, complexity: 4, category: 'Flooring', unitPrice: 280, standardRef: 'ASTM C1028' },
      { code: 'DOO-001', name: 'Wooden Door 900x2100mm', elementType: 'door', unit: 'no.', formula: 'Count', wasteFactor: 0.02, complexity: 2, category: 'Doors', unitPrice: 950, standardRef: 'NFPA 80' },
      { code: 'DOO-002', name: 'Fire Rated Door (1hr)', elementType: 'door', unit: 'no.', formula: 'Count', wasteFactor: 0.02, complexity: 3, category: 'Doors', unitPrice: 1800, standardRef: 'NFPA 80' },
      { code: 'DOO-003', name: 'Aluminum Door with Glass', elementType: 'door', unit: 'no.', formula: 'Count', wasteFactor: 0.02, complexity: 3, category: 'Doors', unitPrice: 2200, standardRef: 'NFPA 80' },
      { code: 'WDW-001', name: 'Aluminum Window 1200x1200mm', elementType: 'window', unit: 'no.', formula: 'Count', wasteFactor: 0.02, complexity: 3, category: 'Windows', unitPrice: 1500, standardRef: 'ASTM E119' },
      { code: 'WDW-002', name: 'Aluminum Window 1500x1500mm', elementType: 'window', unit: 'no.', formula: 'Count', wasteFactor: 0.02, complexity: 3, category: 'Windows', unitPrice: 1900, standardRef: 'ASTM E119' },
      { code: 'CEL-001', name: 'Gypsum Board Ceiling', elementType: 'ceiling', unit: 'm²', formula: 'Room Area', wasteFactor: 0.08, complexity: 3, category: 'Ceilings', unitPrice: 85, standardRef: 'ASTM C1396' },
      { code: 'CEL-002', name: 'Suspended Ceiling (T-Bar)', elementType: 'ceiling', unit: 'm²', formula: 'Room Area', wasteFactor: 0.05, complexity: 3, category: 'Ceilings', unitPrice: 110, standardRef: 'ASTM C635' },
      { code: 'CEL-003', name: 'Gypsum Board with Molding', elementType: 'gypsum', unit: 'm²', formula: 'Ceiling Area + Wall Trim', wasteFactor: 0.08, complexity: 4, category: 'Ceilings', unitPrice: 130, standardRef: 'ASTM C1396' },
      { code: 'WPR-001', name: 'Waterproofing Membrane (Roof)', elementType: 'waterproofing', unit: 'm²', formula: 'Roof Area × 1.1', wasteFactor: 0.05, complexity: 3, category: 'Waterproofing', unitPrice: 75, standardRef: 'ASTM D6163' },
      { code: 'INS-001', name: 'Thermal Insulation (50mm XPS)', elementType: 'insulation', unit: 'm²', formula: 'External Wall Area + Roof Area', wasteFactor: 0.05, complexity: 3, category: 'Insulation', unitPrice: 65, standardRef: 'ASTM C518' },
      { code: 'ELE-001', name: 'PVC Conduit 20mm', elementType: 'electrical_cable', unit: 'm', formula: 'Per Point × 3m avg', wasteFactor: 0.05, complexity: 2, category: 'Electrical', unitPrice: 8, standardRef: 'NEC 2020' },
      { code: 'ELE-002', name: 'Copper Cable 4mm²', elementType: 'electrical_cable', unit: 'm', formula: 'Circuit Length', wasteFactor: 0.03, complexity: 2, category: 'Electrical', unitPrice: 12, standardRef: 'NEC 2020' },
      { code: 'ELE-003', name: 'Electrical Switchgear Panel', elementType: 'switchgear', unit: 'no.', formula: 'Per Panel', wasteFactor: 0, complexity: 5, category: 'Electrical', unitPrice: 8500, standardRef: 'IEC 61439' },
      { code: 'PLM-001', name: 'PVC Pipe 50mm (Water)', elementType: 'plumbing_pipe', unit: 'm', formula: 'Run Length', wasteFactor: 0.05, complexity: 2, category: 'Plumbing', unitPrice: 22, standardRef: 'IPC' },
      { code: 'PLM-002', name: 'PVC Pipe 110mm (Sewage)', elementType: 'plumbing_pipe', unit: 'm', formula: 'Run Length', wasteFactor: 0.05, complexity: 2, category: 'Plumbing', unitPrice: 35, standardRef: 'IPC' },
      { code: 'HVAC-001', name: 'Split AC Unit 18000 BTU', elementType: 'hvac', unit: 'no.', formula: 'Count per Room', wasteFactor: 0, complexity: 3, category: 'HVAC', unitPrice: 3500, standardRef: 'ASHRAE 90.1' },
      { code: 'HVAC-002', name: 'HVAC Duct (Galvanized)', elementType: 'duct', unit: 'm²', formula: 'Duct Surface Area', wasteFactor: 0.05, complexity: 3, category: 'HVAC', unitPrice: 140, standardRef: 'SMACNA' },
      { code: 'FF-001', name: 'Fire Extinguisher (ABC)', elementType: 'fire_extinguisher', unit: 'no.', formula: 'Per NFPA 10 Requirements', wasteFactor: 0, complexity: 2, category: 'Fire Fighting', unitPrice: 450, standardRef: 'NFPA 10' },
      { code: 'FF-002', name: 'Fire Sprinkler Head', elementType: 'fire_sprinkler', unit: 'no.', formula: 'Ceiling Area / Coverage', wasteFactor: 0.02, complexity: 3, category: 'Fire Fighting', unitPrice: 85, standardRef: 'NFPA 13' },
      { code: 'FA-001', name: 'Smoke Detector', elementType: 'fire_alarm_device', unit: 'no.', formula: 'Per NFPA 72', wasteFactor: 0.02, complexity: 2, category: 'Fire Alarm', unitPrice: 120, standardRef: 'NFPA 72' },
      { code: 'FA-002', name: 'Fire Alarm Control Panel', elementType: 'fire_alarm_device', unit: 'no.', formula: '1 per Zone', wasteFactor: 0, complexity: 4, category: 'Fire Alarm', unitPrice: 4500, standardRef: 'NFPA 72' },
      { code: 'LC-001', name: 'CCTV Camera (IP)', elementType: 'camera', unit: 'no.', formula: 'Per Location', wasteFactor: 0, complexity: 3, category: 'Low Current', unitPrice: 850, standardRef: 'SBC 402' },
      { code: 'LC-002', name: 'Cat6 Data Cable', elementType: 'data_cable', unit: 'm', formula: 'Per Point × 15m avg', wasteFactor: 0.03, complexity: 2, category: 'Low Current', unitPrice: 7, standardRef: 'TIA/EIA 568' },
      { code: 'SIT-001', name: 'Site Clearance', elementType: 'foundation', unit: 'm²', formula: 'Site Area', wasteFactor: 0, complexity: 1, category: 'Site Work', unitPrice: 8, standardRef: 'SBC 301' },
      { code: 'SIT-002', name: 'Excavation', elementType: 'foundation', unit: 'm³', formula: 'Foundation Volume × 1.2', wasteFactor: 0, complexity: 2, category: 'Site Work', unitPrice: 35, standardRef: 'SBC 301' },
      { code: 'SIT-003', name: 'Backfilling', elementType: 'foundation', unit: 'm³', formula: 'Excavation Volume × 0.5', wasteFactor: 0, complexity: 2, category: 'Site Work', unitPrice: 20, standardRef: 'SBC 301' },
    ];
  }

  getByCode(code) {
    return this.items.find(i => i.code === code);
  }

  getByElementType(elementType) {
    return this.items.filter(i => i.elementType === elementType);
  }

  getByCategory(category) {
    return this.items.filter(i => i.category === category);
  }

  addItem(item) {
    item.code = item.code || `CUS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    this.items.push(item);
    return item;
  }

  updateItem(code, updates) {
    const idx = this.items.findIndex(i => i.code === code);
    if (idx === -1) return null;
    this.items[idx] = { ...this.items[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.items[idx];
  }

  calculateQuantity(elementType, params) {
    const items = this.getByElementType(elementType);
    return items.map(item => {
      let qty = 0;
      try { qty = eval(item.formula.replace(/[a-zA-Z]/g, match => params[match.toLowerCase()] || 0)); } catch { qty = 0; }
      return { ...item, quantity: qty, totalCost: qty * item.unitPrice };
    });
  }

  search(query) {
    const q = query.toLowerCase();
    return this.items.filter(i =>
      i.code.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      i.elementType.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  }
}

module.exports = { BOQDatabase };
