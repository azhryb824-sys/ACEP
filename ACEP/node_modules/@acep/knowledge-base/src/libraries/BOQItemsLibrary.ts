export interface BOQItemTemplate {
  id: string;
  code: string;
  description: string;
  descriptionAr: string;
  category: string;
  unit: string;
  defaultWaste: number;
  hasFormula: boolean;
  formula?: string;
  dependsOn: string[];
  requiredSpaces: string[];
  optionalSpaces: string[];
  laborRequired: string[];
  equipmentRequired: string[];
  materialsRequired: string[];
  version: string;
}

export class BOQItemsLibrary {
  private items: Map<string, BOQItemTemplate> = new Map();

  register(item: BOQItemTemplate): void {
    this.items.set(item.id, item);
  }

  get(id: string): BOQItemTemplate | undefined {
    return this.items.get(id);
  }

  findByCategory(category: string): BOQItemTemplate[] {
    return Array.from(this.items.values()).filter(i => i.category === category);
  }

  findBySpace(spaceType: string): BOQItemTemplate[] {
    return Array.from(this.items.values()).filter(
      i => i.requiredSpaces.includes(spaceType) || i.optionalSpaces.includes(spaceType)
    );
  }

  getAll(): BOQItemTemplate[] {
    return Array.from(this.items.values());
  }

  initializeDefaults(): void {
    const defaults: BOQItemTemplate[] = [
      { id: 'boq-001', code: 'EAR-001', description: 'Excavation', descriptionAr: 'حفر', category: 'EarthWork', unit: 'm³', defaultWaste: 0.02, hasFormula: true, formula: 'length * width * depth', dependsOn: [], requiredSpaces: ['Basement', 'Foundation'], optionalSpaces: [], laborRequired: ['ExcavatorOperator', 'ConcreteWorker'], equipmentRequired: ['Excavator'], materialsRequired: [], version: '1.0.0' },
      { id: 'boq-002', code: 'EAR-002', description: 'Backfilling', descriptionAr: 'ردم', category: 'EarthWork', unit: 'm³', defaultWaste: 0.05, hasFormula: true, formula: 'excavationVolume * 0.6', dependsOn: ['EAR-001'], requiredSpaces: ['Basement'], optionalSpaces: [], laborRequired: ['ConcreteWorker'], equipmentRequired: ['Compactor'], materialsRequired: ['Sand'], version: '1.0.0' },
      { id: 'boq-003', code: 'CON-001', description: 'Ready Mix Concrete', descriptionAr: 'خرسانة جاهزة', category: 'Concrete', unit: 'm³', defaultWaste: 0.02, hasFormula: true, formula: 'volume', dependsOn: [], requiredSpaces: [], optionalSpaces: [], laborRequired: ['ConcreteWorker', 'Carpenter'], equipmentRequired: ['ConcretePump', 'ConcreteMixer'], materialsRequired: ['ReadyMixConcrete'], version: '1.0.0' },
      { id: 'boq-004', code: 'CON-002', description: 'Steel Reinforcement', descriptionAr: 'حديد تسليح', category: 'Reinforcement', unit: 'ton', defaultWaste: 0.03, hasFormula: true, formula: 'concreteVolume * reinforcementRatio', dependsOn: ['CON-001'], requiredSpaces: [], optionalSpaces: [], laborRequired: ['SteelFixer'], equipmentRequired: [], materialsRequired: ['SteelReinforcement'], version: '1.0.0' },
      { id: 'boq-005', code: 'CON-003', description: 'Formwork', descriptionAr: 'شدات خشبية', category: 'Concrete', unit: 'm²', defaultWaste: 0.05, hasFormula: true, formula: 'surfaceArea', dependsOn: ['CON-001'], requiredSpaces: [], optionalSpaces: [], laborRequired: ['Carpenter'], equipmentRequired: [], materialsRequired: ['Plywood', 'Timber'], version: '1.0.0' },
      { id: 'boq-006', code: 'BLK-001', description: 'Cement Block Wall', descriptionAr: 'جدار بلوك إسمنتي', category: 'Block', unit: 'm²', defaultWaste: 0.05, hasFormula: true, formula: 'wallArea - openingsArea', dependsOn: [], requiredSpaces: [], optionalSpaces: ['Bedroom', 'Bathroom', 'Kitchen', 'LivingRoom'], laborRequired: ['Mason'], equipmentRequired: [], materialsRequired: ['CementBlock', 'CementMortar'], version: '1.0.0' },
      { id: 'boq-007', code: 'PLA-001', description: 'Internal Plaster', descriptionAr: 'لياسة داخلية', category: 'Plaster', unit: 'm²', defaultWaste: 0.05, hasFormula: true, formula: 'wallArea - openingsArea', dependsOn: ['BLK-001'], requiredSpaces: [], optionalSpaces: ['Bedroom', 'Bathroom', 'Kitchen', 'LivingRoom'], laborRequired: ['Plasterer'], equipmentRequired: [], materialsRequired: ['Cement', 'Sand'], version: '1.0.0' },
      { id: 'boq-008', code: 'WAT-001', description: 'Waterproofing', descriptionAr: 'عزل مائي', category: 'Waterproofing', unit: 'm²', defaultWaste: 0.05, hasFormula: true, formula: 'area', dependsOn: [], requiredSpaces: ['Bathroom', 'Roof', 'Basement', 'Pool'], optionalSpaces: [], laborRequired: ['Waterproofer'], equipmentRequired: [], materialsRequired: ['WaterproofingMembrane'], version: '1.0.0' },
      { id: 'boq-009', code: 'PNT-001', description: 'Internal Paint', descriptionAr: 'دهان داخلي', category: 'Paint', unit: 'm²', defaultWaste: 0.05, hasFormula: true, formula: 'wallArea * layers', dependsOn: ['PLA-001'], requiredSpaces: [], optionalSpaces: ['Bedroom', 'Bathroom', 'Kitchen', 'LivingRoom', 'Office'], laborRequired: ['Painter'], equipmentRequired: [], materialsRequired: ['Paint', 'Primer', 'Putty'], version: '1.0.0' },
      { id: 'boq-010', code: 'CER-001', description: 'Ceramic Floor Tiles', descriptionAr: 'سيراميك أرضيات', category: 'Ceramic', unit: 'm²', defaultWaste: 0.08, hasFormula: true, formula: 'floorArea * wasteFactor', dependsOn: ['WAT-001'], requiredSpaces: ['Bathroom', 'Kitchen'], optionalSpaces: ['LivingRoom', 'Entrance'], laborRequired: ['Tiler'], equipmentRequired: [], materialsRequired: ['Ceramic', 'TileAdhesive', 'Grout'], version: '1.0.0' },
      { id: 'boq-011', code: 'CER-002', description: 'Ceramic Wall Tiles', descriptionAr: 'سيراميك جدران', category: 'Ceramic', unit: 'm²', defaultWaste: 0.1, hasFormula: true, formula: 'wallArea * height', dependsOn: ['WAT-001'], requiredSpaces: ['Bathroom'], optionalSpaces: ['Kitchen'], laborRequired: ['Tiler'], equipmentRequired: [], materialsRequired: ['CeramicWall', 'TileAdhesive', 'Grout'], version: '1.0.0' },
      { id: 'boq-012', code: 'DR-001', description: 'Interior Door', descriptionAr: 'باب داخلي', category: 'Doors', unit: 'each', defaultWaste: 0, hasFormula: false, dependsOn: [], requiredSpaces: [], optionalSpaces: ['Bedroom', 'Bathroom', 'Kitchen', 'LivingRoom', 'Office'], laborRequired: ['Carpenter'], equipmentRequired: [], materialsRequired: ['Door', 'DoorFrame', 'Hinges', 'Lock'], version: '1.0.0' },
      { id: 'boq-013', code: 'WIN-001', description: 'Window', descriptionAr: 'شباك', category: 'Windows', unit: 'each', defaultWaste: 0, hasFormula: false, dependsOn: [], requiredSpaces: [], optionalSpaces: ['Bedroom', 'LivingRoom', 'Kitchen', 'Office'], laborRequired: ['Carpenter'], equipmentRequired: [], materialsRequired: ['Window', 'Glass', 'Frame'], version: '1.0.0' },
      { id: 'boq-014', code: 'ELE-001', description: 'Electrical Conduit', descriptionAr: 'تمديدات كهربائية', category: 'Electrical', unit: 'm', defaultWaste: 0.03, hasFormula: true, formula: 'wallLength * 0.3', dependsOn: [], requiredSpaces: [], optionalSpaces: ['Bedroom', 'Bathroom', 'Kitchen', 'LivingRoom', 'Office'], laborRequired: ['Electrician'], equipmentRequired: [], materialsRequired: ['PVCConduit', 'Cable', 'Boxes'], version: '1.0.0' },
      { id: 'boq-015', code: 'ELE-002', description: 'Lighting Fixture', descriptionAr: 'لمبة إضاءة', category: 'Lighting', unit: 'each', defaultWaste: 0, hasFormula: false, dependsOn: ['ELE-001'], requiredSpaces: [], optionalSpaces: ['Bedroom', 'Bathroom', 'Kitchen', 'LivingRoom', 'Office'], laborRequired: ['Electrician'], equipmentRequired: [], materialsRequired: ['LightFixture', 'Bulb'], version: '1.0.0' },
      { id: 'boq-016', code: 'ELE-003', description: 'Power Socket', descriptionAr: 'مقبس كهرباء', category: 'Power', unit: 'each', defaultWaste: 0, hasFormula: false, dependsOn: ['ELE-001'], requiredSpaces: [], optionalSpaces: ['Bedroom', 'Bathroom', 'Kitchen', 'LivingRoom', 'Office'], laborRequired: ['Electrician'], equipmentRequired: [], materialsRequired: ['Socket', 'Cable'], version: '1.0.0' },
      { id: 'boq-017', code: 'ELE-004', description: 'Switch', descriptionAr: 'مفتاح كهرباء', category: 'Electrical', unit: 'each', defaultWaste: 0, hasFormula: false, dependsOn: ['ELE-001'], requiredSpaces: [], optionalSpaces: ['Bedroom', 'Bathroom', 'Kitchen', 'LivingRoom', 'Office'], laborRequired: ['Electrician'], equipmentRequired: [], materialsRequired: ['Switch', 'Cable'], version: '1.0.0' },
      { id: 'boq-018', code: 'PLU-001', description: 'Water Supply Pipes', descriptionAr: 'مواسير مياه', category: 'Plumbing', unit: 'm', defaultWaste: 0.03, hasFormula: true, formula: 'length', dependsOn: [], requiredSpaces: ['Bathroom', 'Kitchen'], optionalSpaces: ['Laundry', 'MaidRoom'], laborRequired: ['Plumber'], equipmentRequired: [], materialsRequired: ['PVC Pipe', 'Fittings'], version: '1.0.0' },
      { id: 'boq-019', code: 'PLU-002', description: 'Drainage Pipes', descriptionAr: 'مواسير صرف', category: 'Drainage', unit: 'm', defaultWaste: 0.03, hasFormula: true, formula: 'length', dependsOn: [], requiredSpaces: ['Bathroom', 'Kitchen'], optionalSpaces: ['Laundry', 'Roof'], laborRequired: ['Plumber'], equipmentRequired: [], materialsRequired: ['PVC Pipe', 'Fittings'], version: '1.0.0' },
      { id: 'boq-020', code: 'PLU-003', description: 'Sanitary Fixtures', descriptionAr: 'أدوات صحية', category: 'Plumbing', unit: 'set', defaultWaste: 0, hasFormula: false, dependsOn: ['PLU-001', 'PLU-002'], requiredSpaces: ['Bathroom'], optionalSpaces: [], laborRequired: ['Plumber'], equipmentRequired: [], materialsRequired: ['WC', 'WashBasin', 'Shower', 'Faucet'], version: '1.0.0' },
      { id: 'boq-021', code: 'PLU-004', description: 'Floor Drain', descriptionAr: 'بالوعة أرضية', category: 'Plumbing', unit: 'each', defaultWaste: 0, hasFormula: false, dependsOn: ['PLU-002'], requiredSpaces: ['Bathroom', 'Laundry'], optionalSpaces: ['Kitchen', 'Balcony', 'Roof'], laborRequired: ['Plumber'], equipmentRequired: [], materialsRequired: ['FloorDrain'], version: '1.0.0' },
      { id: 'boq-022', code: 'HVAC-001', description: 'AC Unit', descriptionAr: 'وحدة تكييف', category: 'HVAC', unit: 'unit', defaultWaste: 0, hasFormula: true, formula: 'roomArea / acCapacity', dependsOn: [], requiredSpaces: ['Bedroom', 'LivingRoom', 'Office'], optionalSpaces: ['Kitchen', 'Majlis'], laborRequired: ['HVAC'], equipmentRequired: [], materialsRequired: ['ACUnit', 'CopperPipes', 'Insulation'], version: '1.0.0' },
      { id: 'boq-023', code: 'FF-001', description: 'Fire Extinguisher', descriptionAr: 'طفاية حريق', category: 'FireFighting', unit: 'each', defaultWaste: 0, hasFormula: false, dependsOn: [], requiredSpaces: ['Kitchen', 'MechanicalRoom', 'ElectricalRoom', 'GeneratorRoom'], optionalSpaces: ['Corridor', 'Office'], laborRequired: ['FireFightingTech'], equipmentRequired: [], materialsRequired: ['Extinguisher'], version: '1.0.0' },
      { id: 'boq-024', code: 'FF-002', description: 'Hose Reel', descriptionAr: 'خرطوم حريق', category: 'FireFighting', unit: 'each', defaultWaste: 0, hasFormula: false, dependsOn: ['PLU-001'], requiredSpaces: ['Corridor', 'MechanicalRoom'], optionalSpaces: ['Office', 'Parking'], laborRequired: ['FireFightingTech'], equipmentRequired: [], materialsRequired: ['HoseReel', 'Valve'], version: '1.0.0' },
      { id: 'boq-025', code: 'FAL-001', description: 'Smoke Detector', descriptionAr: 'كاشف دخان', category: 'FireAlarm', unit: 'each', defaultWaste: 0, hasFormula: false, dependsOn: [], requiredSpaces: [], optionalSpaces: ['Bedroom', 'LivingRoom', 'Office', 'Corridor', 'Kitchen'], laborRequired: ['FireAlarmTech'], equipmentRequired: [], materialsRequired: ['SmokeDetector', 'Cable'], version: '1.0.0' },
      { id: 'boq-026', code: 'ELE-005', description: 'CCTV Camera', descriptionAr: 'كاميرا مراقبة', category: 'CCTV', unit: 'each', defaultWaste: 0, hasFormula: false, dependsOn: ['ELE-001'], requiredSpaces: ['Entrance', 'Parking'], optionalSpaces: ['Corridor', 'Office', 'LivingRoom'], laborRequired: ['Electrician'], equipmentRequired: [], materialsRequired: ['Camera', 'Cable', 'DVR'], version: '1.0.0' },
      { id: 'boq-027', code: 'GYP-001', description: 'Gypsum Ceiling', descriptionAr: 'سقف جبس', category: 'Ceiling', unit: 'm²', defaultWaste: 0.05, hasFormula: true, formula: 'ceilingArea', dependsOn: [], requiredSpaces: [], optionalSpaces: ['LivingRoom', 'Majlis', 'Bedroom', 'Office'], laborRequired: ['Carpenter', 'GypsumInstaller'], equipmentRequired: [], materialsRequired: ['GypsumBoard', 'SteelFrame', 'JointCompound'], version: '1.0.0' }
    ];

    for (const item of defaults) {
      this.register(item);
    }
  }
}
