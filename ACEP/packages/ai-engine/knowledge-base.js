/**
 * ACEP Internal Knowledge Base - Engineering Knowledge Repository
 * Self-contained, no external dependencies, construction-domain specific
 */

class EngineeringKnowledgeBase {
  constructor() {
    this.initialized = false;
    this.cache = { projectTypes: {}, materials: {}, codes: {}, prices: {}, rules: [] };
  }

  initialize() {
    this._loadProjectTypes();
    this._loadMaterials();
    this._loadEngineeringCodes();
    this._loadPriceReferences();
    this._loadConstructionRules();
    this._loadSpaces();
    this.initialized = true;
    return this;
  }

  _loadProjectTypes() {
    this.cache.projectTypes = {
      Apartment: { minArea: 50, maxArea: 500, floors: [1, 1], concretePerM2: 0.22, steelPerConcrete: 105, costPerM2: 2500, roofType: 'Flat', foundationType: 'Isolated', durationMonths: 5.2 },
      Villa: { minArea: 250, maxArea: 1200, floors: [1, 3], concretePerM2: 0.24, steelPerConcrete: 110, costPerM2: 2800, roofType: 'Sloped', foundationType: 'Isolated', durationMonths: 10.3 },
      Luxury_Villa: { minArea: 800, maxArea: 3000, floors: [2, 4], concretePerM2: 0.26, steelPerConcrete: 120, costPerM2: 4200, roofType: 'Flat', foundationType: 'Raft', durationMonths: 18.2 },
      Apartment_Building: { minArea: 1500, maxArea: 8000, floors: [4, 12], concretePerM2: 0.30, steelPerConcrete: 115, costPerM2: 3200, roofType: 'Flat', foundationType: 'Raft', durationMonths: 32.6 },
      Residential_Compound: { minArea: 5000, maxArea: 50000, floors: [1, 3], concretePerM2: 0.22, steelPerConcrete: 100, costPerM2: 2500, roofType: 'Sloped', foundationType: 'Isolated', durationMonths: 67 },
      Residential_Tower: { minArea: 8000, maxArea: 40000, floors: [15, 60], concretePerM2: 0.33, steelPerConcrete: 130, costPerM2: 4800, roofType: 'Flat', foundationType: 'Mat', durationMonths: 132.2 },
      Hotel: { minArea: 3000, maxArea: 30000, floors: [5, 40], concretePerM2: 0.32, steelPerConcrete: 125, costPerM2: 5500, roofType: 'Flat', foundationType: 'Raft', durationMonths: 88.3 },
      Hospital: { minArea: 5000, maxArea: 80000, floors: [3, 15], concretePerM2: 0.40, steelPerConcrete: 135, costPerM2: 6800, roofType: 'Flat', foundationType: 'Raft', durationMonths: 132.1 },
      School: { minArea: 1000, maxArea: 10000, floors: [1, 4], concretePerM2: 0.26, steelPerConcrete: 105, costPerM2: 2700, roofType: 'Flat', foundationType: 'Isolated', durationMonths: 27.1 },
      Mosque: { minArea: 300, maxArea: 5000, floors: [1, 3], concretePerM2: 0.22, steelPerConcrete: 100, costPerM2: 3500, roofType: 'Dome', foundationType: 'Isolated', durationMonths: 17.8 },
      Mall: { minArea: 5000, maxArea: 100000, floors: [2, 6], concretePerM2: 0.28, steelPerConcrete: 120, costPerM2: 4500, roofType: 'Flat', foundationType: 'Raft', durationMonths: 99.7 },
      Office_Building: { minArea: 2000, maxArea: 20000, floors: [4, 20], concretePerM2: 0.28, steelPerConcrete: 112, costPerM2: 3800, roofType: 'Flat', foundationType: 'Raft', durationMonths: 45.8 },
      Factory: { minArea: 2000, maxArea: 50000, floors: [1, 3], concretePerM2: 0.20, steelPerConcrete: 95, costPerM2: 1800, roofType: 'Metal', foundationType: 'Isolated', durationMonths: 64.9 },
      Warehouse: { minArea: 1000, maxArea: 20000, floors: [1, 2], concretePerM2: 0.15, steelPerConcrete: 85, costPerM2: 1200, roofType: 'Metal', foundationType: 'Isolated', durationMonths: 28.9 },
      Bridge: { minArea: 0, maxArea: 0, floors: [0], concretePerM2: 0, steelPerConcrete: 140, costPerM2: 8500, roofType: null, foundationType: 'Pile', durationMonths: 15.5 },
      Road: { minArea: 0, maxArea: 0, floors: [0], concretePerM2: 0, steelPerConcrete: 0, costPerM2: 1500, roofType: null, foundationType: 'Subgrade', durationMonths: 15.5 }
    };
  }

  _loadMaterials() {
    this.cache.materials = {
      Concrete: { categories: ['Plain Concrete (PC)', 'Reinforced Concrete (RC)', 'Lightweight Concrete', 'Precast Concrete'], unit: 'm3', basePrice: 320, wastage: 0.05 },
      Steel: { categories: ['Steel Reinforcement 60ksi', 'Steel Reinforcement 40ksi', 'Steel Mesh', 'Structural Steel'], unit: 'ton', basePrice: 3600, wastage: 0.07 },
      Block: { categories: ['Hollow Concrete Block 20cm', 'Hollow Concrete Block 15cm', 'AAC Block', 'Cement Brick'], unit: 'm2', basePrice: 42, wastage: 0.06 },
      Cement: { categories: ['Ordinary Portland Cement', 'Sulfate Resistant Cement', 'White Cement'], unit: 'ton', basePrice: 480, wastage: 0.03 },
      Aggregate: { categories: ['Coarse Aggregate 3/4"', 'Fine Aggregate (Sand)', 'Crushed Stone'], unit: 'm3', basePrice: 85, wastage: 0.08 },
      Tiles: { categories: ['Porcelain Tiles 60x60', 'Ceramic Tiles 40x40', 'Mosaic Tiles', 'Marble Tiles'], unit: 'm2', basePrice: 65, wastage: 0.10 },
      Paint: { categories: ['Emulsion Paint - Interior', 'Oil Paint - Exterior', 'Textured Paint', 'Anti-Mold Paint'], unit: 'L', basePrice: 28, wastage: 0.10 },
      Wood: { categories: ['Plywood 18mm', 'MDF Board', 'Timber 2x4', 'Wooden Door'], unit: 'unit', basePrice: 120, wastage: 0.08 },
      Aluminum: { categories: ['Aluminum Window Frame', 'Aluminum Cladding', 'Aluminum Composite Panel'], unit: 'm2', basePrice: 380, wastage: 0.05 },
      Glass: { categories: ['Tempered Glass 6mm', 'Double Glazing', 'Laminated Glass', 'Reflective Glass'], unit: 'm2', basePrice: 280, wastage: 0.05 },
      Plumbing: { categories: ['PVC Pipe 50mm', 'PVC Pipe 110mm', 'Copper Pipe 15mm', 'Water Tank GRP', 'Sanitary Fixture'], unit: 'unit', basePrice: 85, wastage: 0.05 },
      Electrical: { categories: ['PVC Conduit 20mm', 'Wire 2.5mm', 'Wire 4mm', 'Wire 6mm', 'MCB', 'Cable Tray', 'Light Fixture'], unit: 'unit', basePrice: 45, wastage: 0.05 },
      HVAC: { categories: ['Split AC Unit 2ton', 'Ducted AC Unit', 'AHU', 'Ductwork', 'Diffuser', 'Exhaust Fan'], unit: 'unit', basePrice: 2500, wastage: 0.03 },
      Waterproofing: { categories: ['Bitumen Membrane', 'Polymer Waterproofing', 'Liquid Membrane', 'Waterstop'], unit: 'm2', basePrice: 55, wastage: 0.08 }
    };
  }

  _loadEngineeringCodes() {
    this.cache.codes = {
      saudi: [
        { code: 'SBC 301', name: 'Saudi Building Code - Structural', category: 'Structural' },
        { code: 'SBC 302', name: 'Saudi Building Code - Fire Protection', category: 'Fire' },
        { code: 'SBC 303', name: 'Saudi Building Code - Electrical', category: 'Electrical' },
        { code: 'SBC 304', name: 'Saudi Building Code - Mechanical', category: 'Mechanical' },
        { code: 'SBC 305', name: 'Saudi Building Code - Sanitary', category: 'Plumbing' },
        { code: 'SBC 306', name: 'Saudi Energy Code', category: 'Energy' }
      ],
      international: [
        { code: 'ACI 318-19', name: 'Building Code for Structural Concrete', category: 'Structural' },
        { code: 'AISC 360', name: 'Specification for Structural Steel Buildings', category: 'Structural' },
        { code: 'ASCE 7-22', name: 'Minimum Design Loads for Buildings', category: 'Structural' },
        { code: 'NFPA 101', name: 'Life Safety Code', category: 'Fire' },
        { code: 'IBC 2024', name: 'International Building Code', category: 'General' },
        { code: 'ASHRAE 90.1', name: 'Energy Standard for Buildings', category: 'Energy' }
      ]
    };
  }

  _loadPriceReferences() {
    this.cache.prices = {
      regions: {
        Riyadh: { index: 1.00, cities: ['Riyadh', 'Diriyah'] },
        'Makkah': { index: 0.95, cities: ['Jeddah', 'Makkah', 'Taif'] },
        'Eastern': { index: 0.93, cities: ['Dammam', 'Khobar', 'Dhahran', 'Jubail'] },
        'Madinah': { index: 0.90, cities: ['Madinah', 'Yanbu'] },
        'Southern': { index: 0.82, cities: ['Abha', 'Khamis Mushait', 'Najran'] },
        'Northern': { index: 0.80, cities: ['Tabuk', 'Hail', 'Arar'] },
        'Qassim': { index: 0.88, cities: ['Buraydah', 'Unaizah'] }
      }
    };
  }

  _loadConstructionRules() {
    this.cache.rules = [
      { id: 'R001', category: 'Structural', rule: 'Minimum concrete cover for slabs: 20mm', code: 'SBC 301' },
      { id: 'R002', category: 'Structural', rule: 'Minimum concrete cover for beams: 25mm', code: 'SBC 301' },
      { id: 'R003', category: 'Structural', rule: 'Minimum concrete cover for columns: 30mm', code: 'SBC 301' },
      { id: 'R004', category: 'Structural', rule: 'Minimum concrete cover for foundations: 50mm', code: 'SBC 301' },
      { id: 'R005', category: 'Structural', rule: 'Concrete compressive strength f\'c minimum: 25 MPa for residential', code: 'ACI 318' },
      { id: 'R006', category: 'Structural', rule: 'Steel yield strength fy minimum: 420 MPa', code: 'ACI 318' },
      { id: 'R007', category: 'Structural', rule: 'Slab thickness minimum: 120mm for two-way slab', code: 'ACI 318' },
      { id: 'R008', category: 'Fire', rule: 'Fire resistance rating for structural elements: 2 hours', code: 'SBC 302' },
      { id: 'R009', category: 'Fire', rule: 'Maximum travel distance to exit: 45m in sprinklered buildings', code: 'SBC 302' },
      { id: 'R010', category: 'Fire', rule: 'Fire extinguisher spacing: maximum 30m travel distance', code: 'SBC 302' },
      { id: 'R011', category: 'Safety', rule: 'Guardrail height minimum: 1.1m for balconies above 1st floor', code: 'SBC 301' },
      { id: 'R012', category: 'Safety', rule: 'Stair tread minimum width: 280mm, riser max: 170mm', code: 'SBC 301' },
      { id: 'R013', category: 'Energy', rule: 'Wall insulation R-value minimum: R-11 for residential', code: 'SBC 306' },
      { id: 'R014', category: 'Energy', rule: 'Roof insulation R-value minimum: R-22 for residential', code: 'SBC 306' },
      { id: 'R015', category: 'Energy', rule: 'Window U-value maximum: 2.5 W/m²K for residential', code: 'SBC 306' },
      { id: 'R016', category: 'Plumbing', rule: 'Minimum pipe diameter for main water supply: 20mm', code: 'SBC 305' },
      { id: 'R017', category: 'Plumbing', rule: 'Minimum drainage pipe slope: 1:50 for 100mm pipe', code: 'SBC 305' },
      { id: 'R018', category: 'Electrical', rule: 'Minimum receptacle spacing: 3m along walls', code: 'SBC 303' },
      { id: 'R019', category: 'Electrical', rule: 'Kitchen counter receptacle spacing: every 1.2m', code: 'SBC 303' },
      { id: 'R020', category: 'Electrical', rule: 'GFCI protection required for all wet locations', code: 'SBC 303' },
      { id: 'R021', category: 'General', rule: 'Minimum ceiling height for habitable rooms: 2.4m', code: 'IBC' },
      { id: 'R022', category: 'General', rule: 'Minimum bedroom area: 12m²', code: 'IBC' },
      { id: 'R023', category: 'General', rule: 'Minimum window area: 10% of floor area for natural light', code: 'IBC' },
      { id: 'R024', category: 'Structural', rule: 'Maximum reinforcement spacing in slabs: 300mm', code: 'ACI 318' },
      { id: 'R025', category: 'Structural', rule: 'Minimum reinforcement ratio in columns: 1% of gross area', code: 'ACI 318' },
      { id: 'R026', category: 'Structural', rule: 'Maximum reinforcement ratio in columns: 6% of gross area', code: 'ACI 318' },
      { id: 'R027', category: 'Earthwork', rule: 'Foundation depth below grade minimum: 1.2m for frost protection', code: 'SBC 301' },
      { id: 'R028', category: 'Safety', rule: 'Scaffolding maximum height without ties: 4 times base width', code: 'OSHA' },
      { id: 'R029', category: 'Safety', rule: 'Excavation protection required for depths over 1.5m', code: 'OSHA' },
      { id: 'R030', category: 'Safety', rule: 'Personal fall protection required above 2m working height', code: 'OSHA' }
    ];
  }

  _loadSpaces() {
    this.cache.spaces = {
      Bedroom: { minArea: 12, maxArea: 40, typicalArea: 18, requiresWindow: true, finishingLevel: 'Standard' },
      LivingRoom: { minArea: 20, maxArea: 80, typicalArea: 35, requiresWindow: true, finishingLevel: 'Premium' },
      Kitchen: { minArea: 8, maxArea: 30, typicalArea: 15, requiresWindow: true, finishingLevel: 'Premium', requiresWaterproofing: true },
      Bathroom: { minArea: 3, maxArea: 12, typicalArea: 6, requiresWindow: false, finishingLevel: 'Premium', requiresWaterproofing: true },
      MasterBedroom: { minArea: 20, maxArea: 60, typicalArea: 30, requiresWindow: true, finishingLevel: 'Premium' },
      DiningRoom: { minArea: 12, maxArea: 40, typicalArea: 20, requiresWindow: true, finishingLevel: 'Premium' },
      Hallway: { minArea: 5, maxArea: 25, typicalArea: 10, requiresWindow: false, finishingLevel: 'Standard' },
      Roof: { minArea: 20, maxArea: 200, typicalArea: 60, requiresWindow: false, finishingLevel: 'Basic', requiresWaterproofing: true },
      Parking: { minArea: 15, maxArea: 50, typicalArea: 30, requiresWindow: false, finishingLevel: 'Basic' },
      Storage: { minArea: 3, maxArea: 15, typicalArea: 6, requiresWindow: false, finishingLevel: 'Basic' },
      Staircase: { minArea: 8, maxArea: 25, typicalArea: 15, requiresWindow: false, finishingLevel: 'Standard' },
      Elevator: { minArea: 3, maxArea: 8, typicalArea: 5, requiresWindow: false, finishingLevel: 'Standard' },
      Office: { minArea: 10, maxArea: 40, typicalArea: 20, requiresWindow: true, finishingLevel: 'Standard' },
      Reception: { minArea: 15, maxArea: 60, typicalArea: 30, requiresWindow: true, finishingLevel: 'Premium' },
      MeetingRoom: { minArea: 15, maxArea: 50, typicalArea: 25, requiresWindow: true, finishingLevel: 'Premium' },
      Corridor: { minArea: 5, maxArea: 30, typicalArea: 12, requiresWindow: false, finishingLevel: 'Standard' }
    };
  }

  getProjectType(type) { return this.cache.projectTypes[type] || null; }
  getAllProjectTypes() { return Object.keys(this.cache.projectTypes); }
  getMaterial(name) { return this.cache.materials[name] || null; }
  getCode(country, category) {
    const codes = this.cache.codes[country] || [];
    return category ? codes.filter(c => c.category === category) : codes;
  }
  getRules(category) { return category ? this.cache.rules.filter(r => r.category === category) : this.cache.rules; }
  getSpace(type) { return this.cache.spaces[type] || null; }
  getAllSpaces() { return Object.keys(this.cache.spaces); }
  getRegionIndex(city) {
    for (const [region, data] of Object.entries(this.cache.prices.regions)) {
      if (data.cities.includes(city)) return data.index;
    }
    return 1.0;
  }

  detectProjectType(description) {
    const desc = description.toLowerCase();
    const patterns = {
      Residential_Tower: { regex: /(برج\s*(سكني|سكن)|tower.*residential|ناطحة|برج\s*(30|40|50)\s*(دور|طابق))/i, weight: 1.0 },
      Apartment: { regex: /(^|[^a-z])شقة($|[^a-z]|تين|تى|ث)?|شقة\s*(سكنية|مفروشة|واحدة|دور)?|flat|apartment(?!\s*(building|block|tower|complex|compound))|تشطيب\s*شقة|وحدة\s*سكنية/i, weight: 1.0 },
      Apartment_Building: { regex: /(عمائ?ر\s*سكنية|apartment\s*(building|block)|مبنى\s*سكني|عمارة\s*سكنية|مجمّع\s*سكني|سكن\s*جماعي)/i, weight: 1.0 },
      Apartment_Finishing: { regex: /(تشطيب\s*شقة|تشطيب\s*شقق|تلبيس\s*شقة|ديكور\s*شقة|شقة\s*تشطيب|finishing\s*(apartment|flat))/i, weight: 0.9 },
      Hotel: { regex: /(فندق|hotel|منتجع|resort)/i, weight: 1.0 },
      Hospital: { regex: /(مستشفى|hospital|مستوصف|clinic|مركز\s*طبي|مستشفى|مركز\s*صحي)/i, weight: 1.0 },
      Luxury_Villa: { regex: /(لوكس|luxury|فاخر|قصر|palace|villa\s*luxury)/i, weight: 0.9 },
      Villa: { regex: /(فيلا|villa|فيلّ|دور\s*مستقل|منزل\s*مستقل)/i, weight: 1.0 },
      Residential_Compound: { regex: /(مخطط\s*سكني|compound|مجمع\s*سكني|subdivision|مشروع\s*سكني\s*متكامل)/i, weight: 0.9 },
      School: { regex: /(مدرسة|school|معهد|institute|جامعة|university|مؤسسة\s*تعليمية)/i, weight: 1.0 },
      Mosque: { regex: /(مسجد|mosque|جامع|مصلى)/i, weight: 1.0 },
      Mall: { regex: /(مول|mall|مركز\s*تجاري|سوق\s*تجاري|مجمّع\s*تجاري)/i, weight: 1.0 },
      Office_Building: { regex: /(مكتب|office\s*(building)?|إداري|مبنى\s*إداري|شركة|مقر\s*شركة)/i, weight: 1.0 },
      Factory: { regex: /(مصنع|factory|ورشة|workshop|صناعي|منشأة\s*صناعية)/i, weight: 1.0 },
      Warehouse: { regex: /(مستودع|warehouse|مخزن|storehouse|مخزن\s*تجاري)/i, weight: 1.0 },
      Bridge: { regex: /(جسر|bridge|كبري)/i, weight: 1.0 },
      Road: { regex: /(طريق|road|شارع|street|highway|expressway|طريق\s*سريع)/i, weight: 1.0 }
    };

    // Also check for generic "شقة" or "شقق" that doesn't match Apartment_Building
    const isGenericApartment = /(^|[^a-z])شقة(s|تين)?($|[^a-z])|شقق/i.test(desc) && !patterns.Apartment_Building.regex.test(desc);

    let bestMatch = null;
    let bestWeight = 0;
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.regex.test(desc) && pattern.weight > bestWeight) {
        bestMatch = type;
        bestWeight = pattern.weight;
      }
    }

    if (isGenericApartment && !bestMatch) {
      return 'Apartment';
    }

    return bestMatch || 'Unknown';
  }

  detectProjectTypeConfidence(description) {
    const type = this.detectProjectType(description);
    if (type === 'Unknown') return 0;
    const pt = this.getProjectType(type);
    return pt ? 0.7 : 0.4;
  }

  estimateSpaces(type, area, floors) {
    const pt = this.getProjectType(type);
    if (!pt) return [];
    const configs = {
      Apartment: { Bedroom: 2, LivingRoom: 1, Kitchen: 1, Bathroom: 1, MasterBedroom: 1, Hallway: 1 },
      Villa: { Bedroom: 3, LivingRoom: 2, Kitchen: 1, Bathroom: 3, MasterBedroom: 1, DiningRoom: 1, Hallway: 2, Roof: 1 },
      Luxury_Villa: { Bedroom: 4, LivingRoom: 2, Kitchen: 1, Bathroom: 4, MasterBedroom: 2, DiningRoom: 2, Hallway: 3, Roof: 1, Office: 1 },
      Apartment_Building: { Bedroom: 2, LivingRoom: 1, Kitchen: 1, Bathroom: 2, Hallway: 1, Corridor: 1 },
      Hospital: { Reception: 1, Office: 5, MeetingRoom: 3, Bathroom: 10, Corridor: 5, Storage: 4 },
      Office_Building: { Office: 20, MeetingRoom: 4, Reception: 1, Bathroom: 6, Corridor: 3, Storage: 2 },
      School: { Office: 2, MeetingRoom: 1, Bathroom: 6, Corridor: 3, Storage: 2 },
      Hotel: { Bedroom: 50, Reception: 1, MeetingRoom: 2, Bathroom: 55, Corridor: 10, Storage: 3 },
      Mall: { Bathroom: 8, Storage: 4, Corridor: 15 }
    };
    const spaces = configs[type] || { Bedroom: 2, LivingRoom: 1, Kitchen: 1, Bathroom: 1, Hallway: 1 };
    return Object.entries(spaces).flatMap(([spaceType, count]) => {
      const info = this.getSpace(spaceType);
      if (!info) return [];
      return Array.from({ length: count }, (_, i) => ({
        id: `${spaceType.toLowerCase()}-${i + 1}`,
        type: spaceType,
        area: info.typicalArea + Math.floor(Math.random() * 10),
        finishingLevel: info.finishingLevel
      }));
    });
  }

  getConstructionMethods() {
    return [
      { name: 'Traditional', description: 'Cast-in-place reinforced concrete frame', suitableFor: ['Villa', 'Apartment_Building', 'Office_Building'], costFactor: 1.0, durationFactor: 1.0 },
      { name: 'Precast', description: 'Precast concrete elements assembled on site', suitableFor: ['Apartment_Building', 'Residential_Tower', 'Parking'], costFactor: 0.9, durationFactor: 0.7 },
      { name: 'SteelFrame', description: 'Structural steel frame with composite deck', suitableFor: ['Office_Building', 'Factory', 'Warehouse', 'Mall'], costFactor: 1.3, durationFactor: 0.6 },
      { name: 'ICF', description: 'Insulated Concrete Forms', suitableFor: ['Villa', 'Luxury_Villa', 'Residential_Compound'], costFactor: 1.15, durationFactor: 0.85 },
      { name: 'AAC', description: 'Autoclaved Aerated Concrete blocks', suitableFor: ['Villa', 'Apartment_Building', 'Hotel'], costFactor: 0.95, durationFactor: 0.9 },
      { name: 'PostTension', description: 'Post-tensioned concrete slabs', suitableFor: ['Residential_Tower', 'Parking', 'Mall'], costFactor: 1.1, durationFactor: 0.8 }
    ];
  }

  getFinishingLevels() { return ['Raw', 'Standard', 'Good', 'Premium', 'Luxury']; }

  getMaterialPriceMultiplier(finishing) {
    const mults = { Raw: 0.6, Standard: 1.0, Good: 1.3, Premium: 1.8, Luxury: 2.5 };
    return mults[finishing] || 1.0;
  }
}

module.exports = new EngineeringKnowledgeBase();
