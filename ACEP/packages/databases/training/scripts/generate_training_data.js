/**
 * ACEP Training Data Generator
 * Generates 100,000+ realistic Saudi construction records
 * Usage: node generate_training_data.js [--records=50000]
 */

const fs = require('fs');
const path = require('path');

// ===== CONSTANTS =====

const CITIES = [
  { name: 'Riyadh',    region: 'Central',    costIndex: 1.00 },
  { name: 'Jeddah',    region: 'Western',    costIndex: 0.95 },
  { name: 'Makkah',    region: 'Western',    costIndex: 0.92 },
  { name: 'Madinah',   region: 'Western',    costIndex: 0.90 },
  { name: 'Dammam',    region: 'Eastern',    costIndex: 0.93 },
  { name: 'Khobar',    region: 'Eastern',    costIndex: 0.96 },
  { name: 'Taif',      region: 'Western',    costIndex: 0.85 },
  { name: 'Abha',      region: 'Southern',   costIndex: 0.82 },
  { name: 'Tabuk',     region: 'Northern',   costIndex: 0.80 },
  { name: 'Buraydah',  region: 'Central',    costIndex: 0.88 },
  { name: 'Khamis Mushait', region: 'Southern', costIndex: 0.78 },
  { name: 'Najran',    region: 'Southern',   costIndex: 0.76 },
  { name: 'Hail',      region: 'Northern',   costIndex: 0.82 }
];

const PROJECT_TYPES = [
  { type: 'Villa',         minArea: 250,  maxArea: 1200, minFloors: 1, maxFloors: 3,  concreteFactor: 0.24, steelPerConcrete: 110 },
  { type: 'Luxury_Villa',  minArea: 800,  maxArea: 3000, minFloors: 2, maxFloors: 4,  concreteFactor: 0.26, steelPerConcrete: 120 },
  { type: 'Apartment_Building', minArea: 1500, maxArea: 8000, minFloors: 4, maxFloors: 12, concreteFactor: 0.30, steelPerConcrete: 115 },
  { type: 'Residential_Compound', minArea: 5000, maxArea: 50000, minFloors: 1, maxFloors: 3, concreteFactor: 0.22, steelPerConcrete: 100 },
  { type: 'Townhouse_Project', minArea: 2000, maxArea: 15000, minFloors: 2, maxFloors: 4, concreteFactor: 0.25, steelPerConcrete: 108 },
  { type: 'Residential_Tower', minArea: 8000, maxArea: 40000, minFloors: 15, maxFloors: 60, concreteFactor: 0.33, steelPerConcrete: 130 },
  { type: 'Hotel',         minArea: 3000, maxArea: 30000, minFloors: 5, maxFloors: 40, concreteFactor: 0.32, steelPerConcrete: 125 },
  { type: 'Hospital',      minArea: 5000, maxArea: 80000, minFloors: 3, maxFloors: 15, concreteFactor: 0.40, steelPerConcrete: 135 },
  { type: 'School',        minArea: 1000, maxArea: 10000, minFloors: 1, maxFloors: 4,  concreteFactor: 0.26, steelPerConcrete: 105 },
  { type: 'University',    minArea: 10000, maxArea: 100000, minFloors: 2, maxFloors: 8, concreteFactor: 0.28, steelPerConcrete: 110 },
  { type: 'Mosque',        minArea: 300,  maxArea: 5000,  minFloors: 1, maxFloors: 3,  concreteFactor: 0.22, steelPerConcrete: 100 },
  { type: 'Mall',          minArea: 5000, maxArea: 100000, minFloors: 2, maxFloors: 6, concreteFactor: 0.28, steelPerConcrete: 120 },
  { type: 'CommercialComplex', minArea: 3000, maxArea: 30000, minFloors: 3, maxFloors: 10, concreteFactor: 0.30, steelPerConcrete: 118 },
  { type: 'Office_Building', minArea: 2000, maxArea: 20000, minFloors: 4, maxFloors: 20, concreteFactor: 0.28, steelPerConcrete: 112 },
  { type: 'Factory',       minArea: 2000, maxArea: 50000, minFloors: 1, maxFloors: 3,  concreteFactor: 0.20, steelPerConcrete: 95 },
  { type: 'Warehouse',     minArea: 1000, maxArea: 20000, minFloors: 1, maxFloors: 2,  concreteFactor: 0.15, steelPerConcrete: 85 },
  { type: 'DataCenter',    minArea: 500,  maxArea: 5000,  minFloors: 1, maxFloors: 4,  concreteFactor: 0.30, steelPerConcrete: 130 },
  { type: 'Government_Building', minArea: 2000, maxArea: 30000, minFloors: 3, maxFloors: 10, concreteFactor: 0.28, steelPerConcrete: 110 },
  { type: 'Parking',       minArea: 2000, maxArea: 20000, minFloors: 1, maxFloors: 5,  concreteFactor: 0.20, steelPerConcrete: 90 },
  { type: 'Bridge',        minArea: 0,    maxArea: 0,     minFloors: 0, maxFloors: 0,  concreteFactor: 0,    steelPerConcrete: 140 },
  { type: 'Road',          minArea: 0,    maxArea: 0,     minFloors: 0, maxFloors: 0,  concreteFactor: 0,    steelPerConcrete: 0 }
];

const FINISHING_LEVELS = ['Raw','Standard','Good','Premium','Luxury','UltraLuxury'];
const CONSTRUCTION_METHODS = ['Traditional','Precast','SteelFrame','ICF','AAC','SlipForm','PostTension'];
const QUALITY_GRADES = ['Economy','Standard','Premium'];

const STRUCTURAL_SYSTEMS = {
  'Villa': ['RC Frame','Load Bearing','Steel Frame'],
  'Apartment_Building': ['RC Frame','Flat Slab','Shear Wall'],
  'Residential_Tower': ['Shear Wall','Core Wall','Flat Slab','Post Tension'],
  'Hospital': ['RC Frame','Shear Wall','Steel Frame'],
  'Factory': ['Steel Frame','Precast','RC Frame'],
  'Warehouse': ['Steel Frame','Precast','RC Frame']
};

// BOQ Item templates per category
const BOQ_CATEGORIES = [
  { category: 'EarthWork',    items: ['Excavation for foundations','Backfilling','Soil compaction','Site grading','Trench excavation'],
    unit: 'm3',  basePrice: 25,  waste: 0.05 },
  { category: 'Concrete',     items: ['Plain concrete (PC)','Reinforced concrete (RC) foundations','RC columns','RC beams',
    'RC slabs','RC stairs','RC shear walls','Lightweight concrete screed'],
    unit: 'm3',  basePrice: 450, waste: 0.05 },
  { category: 'Reinforcement',items: ['Steel reinforcement 60ksi','Steel reinforcement 40ksi','Steel mesh','Tie wire'],
    unit: 'ton', basePrice: 3800, waste: 0.07 },
  { category: 'Block',        items: ['Hollow concrete blocks 20cm','Hollow concrete blocks 15cm','Hollow concrete blocks 10cm',
    'Concrete bricks','AAC blocks'],
    unit: 'm2',  basePrice: 42,  waste: 0.06 },
  { category: 'Plaster',      items: ['Cement plaster external','Cement plaster internal','Gypsum plaster','Scratch coat'],
    unit: 'm2',  basePrice: 28,  waste: 0.10 },
  { category: 'Waterproofing',items: ['Bitumen waterproofing','Polymer waterproofing','Liquid membrane','Water stop'],
    unit: 'm2',  basePrice: 55,  waste: 0.08 },
  { category: 'Paint',        items: ['Emulsion paint internal','Oil paint external','Textured paint','Anti-mold paint'],
    unit: 'm2',  basePrice: 18,  waste: 0.10 },
  { category: 'Ceramic',      items: ['Porcelain tiles 60x60','Ceramic tiles 40x40','Mosaic tiles','Wall tiles','Skirting'],
    unit: 'm2',  basePrice: 65,  waste: 0.10 },
  { category: 'Marble',       items: ['Marble flooring','Marble cladding','Granite flooring','Granite countertop'],
    unit: 'm2',  basePrice: 180, waste: 0.08 },
  { category: 'Doors',        items: ['Wooden door','Metal door','Sliding door','Fire rated door','UPVC door'],
    unit: 'no',  basePrice: 1200, waste: 0.02 },
  { category: 'Windows',      items: ['Aluminum window sliding','Aluminum window fixed','Curtain wall','Glass partition'],
    unit: 'm2',  basePrice: 750, waste: 0.05 },
  { category: 'Electrical',   items: ['PVC conduit','Wire 2.5mm','Wire 4mm','Wire 6mm','Switch socket','Light point',
    'MCB','DB panel','Cable tray','Earthing system'],
    unit: 'no',  basePrice: 85,  waste: 0.05 },
  { category: 'Plumbing',     items: ['PVC pipe 50mm','PVC pipe 110mm','Copper pipe 15mm','Water tank GRP',
    'Sanitary fitting','Floor drain','Water heater','Pump set','Grey water pipe'],
    unit: 'no',  basePrice: 120, waste: 0.05 },
  { category: 'HVAC',         items: ['Split AC unit','Ducted AC','Air handling unit','Ductwork','Diffuser','Exhaust fan'],
    unit: 'no',  basePrice: 2500, waste: 0.03 },
  { category: 'FireFighting',  items: ['Fire hose cabinet','Sprinkler head','Smoke detector','Fire alarm panel',
    'Fire extinguisher','Emergency light'],
    unit: 'no',  basePrice: 350, waste: 0.03 },
  { category: 'Elevator',     items: ['Passenger elevator 6 stop','Passenger elevator 10 stop','Freight elevator','Escalator'],
    unit: 'no',  basePrice: 250000, waste: 0.01 }
];

// Material price database (avg prices by city tier)
const MATERIAL_PRICES = {
  'Cement (ton)':           { unit: 'ton', economy: 380, standard: 420, premium: 480 },
  'Rebar 60ksi (ton)':      { unit: 'ton', economy: 3400, standard: 3800, premium: 4200 },
  'Ready Mix Concrete (m3)':{ unit: 'm3',  economy: 280, standard: 320, premium: 380 },
  'Hollow Block (m2)':      { unit: 'm2',  economy: 32,  standard: 38,  premium: 48 },
  'Porcelain Tiles (m2)':   { unit: 'm2',  economy: 45,  standard: 65,  premium: 120 },
  'Marble (m2)':            { unit: 'm2',  economy: 120, standard: 180, premium: 350 },
  'Paint (gallon)':         { unit: 'gal', economy: 45,  standard: 65,  premium: 120 },
  'PVC Pipe 110mm (m)':     { unit: 'm',   economy: 18,  standard: 25,  premium: 35 },
  'Copper Pipe 15mm (m)':   { unit: 'm',   economy: 22,  standard: 30,  premium: 42 },
  'Electrical Cable 4mm (m)':{unit: 'm',   economy: 3.5, standard: 5,   premium: 8 },
  'Aluminum Window (m2)':   { unit: 'm2',  economy: 550, standard: 750, premium: 1200 },
  'Wooden Door (no)':       { unit: 'no',  economy: 800, standard: 1200, premium: 2500 },
  'Gypsum Board (m2)':      { unit: 'm2',  economy: 28,  standard: 38,  premium: 55 },
  'Steel Section (ton)':    { unit: 'ton', economy: 3800, standard: 4200, premium: 5200 },
  'Glass (m2)':             { unit: 'm2',  economy: 120, standard: 180, premium: 380 }
};

const SUPPLIER_NAMES = [
  'Saudi Building Materials Co.','Arabian Construction Supply','Al-Rajhi Steel','National Ready Mix',
  'Saudi Ceramics','Al-Babtain Group','Saudi Panel','Yamama Cement','Al-Yamama Steel',
  'Safwa Cement','Al-Muhaidib Group','Al-Jabr Trading','Bin Laden Group','Saudi Technical Supply',
  'Arabian Pipes','Al-Zamil Steel','Saudi Glass','Siemens Saudi','ABB Saudi','Schneider Saudi',
  'Al-Fanar Group','Al-Ghurair','Dubai Cable','Saudi Cable','National Gypsum','Saudi Plaster',
  'Al-Safi Danone','Al-Wehaiby Co.','Saudi Modern Factory','Al-Omran Group','Sahara PVC',
  'Saudi Chemical Co.','Al-Dabbagh Group','Saudi Elevator','Otis Saudi','Kone Saudi',
  'Arabian Cement','Al-Madina Cement','Qassim Cement','Southern Province Cement'
];

const LABOR_TRADES = [
  { trade: 'Mason', dailyRate: 180 },
  { trade: 'Steel Fixer', dailyRate: 220 },
  { trade: 'Carpenter', dailyRate: 200 },
  { trade: 'Concrete Worker', dailyRate: 170 },
  { trade: 'Plasterer', dailyRate: 190 },
  { trade: 'Painter', dailyRate: 175 },
  { trade: 'Tiler', dailyRate: 210 },
  { trade: 'Plumber', dailyRate: 250 },
  { trade: 'Electrician', dailyRate: 260 },
  { trade: 'HVAC Technician', dailyRate: 280 },
  { trade: 'Welder', dailyRate: 300 },
  { trade: 'Crane Operator', dailyRate: 450 },
  { trade: 'Excavator Operator', dailyRate: 380 },
  { trade: 'Safety Officer', dailyRate: 350 },
  { trade: 'Site Engineer', dailyRate: 500 },
  { trade: 'Surveyor', dailyRate: 320 },
  { trade: 'Supervisor', dailyRate: 400 },
  { trade: 'General Laborer', dailyRate: 150 }
];

const EQUIPMENT = [
  { name: 'Excavator 20ton', category: 'Excavation', daily: 1200 },
  { name: 'Crane 50ton', category: 'Lifting', daily: 3500 },
  { name: 'Concrete Pump', category: 'Concrete', daily: 1800 },
  { name: 'Concrete Mixer', category: 'Concrete', daily: 600 },
  { name: 'Dump Truck', category: 'Transportation', daily: 800 },
  { name: 'Compactor', category: 'Compaction', daily: 500 },
  { name: 'Bulldozer', category: 'Excavation', daily: 2500 },
  { name: 'Forklift', category: 'Lifting', daily: 700 },
  { name: 'Scaffolding Set', category: 'Scaffolding', daily: 200 },
  { name: 'Generator 50kVA', category: 'Electrical', daily: 350 },
  { name: 'Welding Machine', category: 'Finishing', daily: 150 },
  { name: 'Tower Crane', category: 'Lifting', daily: 5000 }
];

const RISK_CATEGORIES = [
  { category: 'Structural', descs: ['Foundation settlement risk','Column failure potential','Crack propagation in shear walls',
    'Inadequate reinforcement detailing','Slab deflection beyond limits'] },
  { category: 'Material', descs: ['Concrete strength below spec','Steel corrosion risk','Block moisture absorption high',
    'Cement setting time abnormal','Aggregate gradation issue'] },
  { category: 'Schedule', descs: ['Weather delay potential','Permit approval delay','Subcontractor availability',
    'Material procurement delay','Site handover delay'] },
  { category: 'Financial', descs: ['Steel price volatility','Cement price increase','Labor shortage cost impact',
    'Currency fluctuation risk','Cash flow constraint'] },
  { category: 'Safety', descs: ['Working at height risk','Confined space hazard','Heavy lifting accident potential',
    'Electrical shock risk','Fire hazard from hot work'] },
  { category: 'Quality', descs: ['Poor workmanship risk','Testing failure rate high','Tolerance deviation',
    'Incomplete waterproofing','Curing duration not met'] }
];

const DEFECT_TYPES = [
  { type: 'Crack', severity: 'Medium', elements: ['Wall','Column','Beam','Slab'] },
  { type: 'Spalling', severity: 'High', elements: ['Column','Beam','Slab'] },
  { type: 'Corrosion', severity: 'High', elements: ['Column','Beam','Foundation'] },
  { type: 'Honeycombing', severity: 'Medium', elements: ['Column','Wall','Beam'] },
  { type: 'Efflorescence', severity: 'Low', elements: ['Wall','Slab'] },
  { type: 'Settlement Crack', severity: 'Critical', elements: ['Foundation','Wall'] }
];

// ===== UTILITY FUNCTIONS =====

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const pickMulti = (arr, n) => { const shuffled = [...arr].sort(() => 0.5 - Math.random()); return shuffled.slice(0, n); };
const rnorm = (mean, std) => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function generateProjectId(index) {
  return `SA-R${String(index).padStart(5, '0')}`;
}

function jitter(value, percent) {
  return value * (1 + rnorm(0, percent / 3));
}

// ===== GENERATORS =====

function generateProjects(count, startIndex = 1) {
  const records = [];
  const projectIds = [];

  for (let i = 0; i < count; i++) {
    const city = pick(CITIES);
    const pt = pick(PROJECT_TYPES);
    const projectId = generateProjectId(startIndex + i);
    projectIds.push(projectId);

    const buildingArea = pt.type === 'Bridge' || pt.type === 'Road'
      ? 0 : rand(pt.minArea, pt.maxArea);

    const floors = pt.type === 'Bridge' || pt.type === 'Road'
      ? 0 : (pt.maxFloors > 1 ? randInt(pt.minFloors, pt.maxFloors) : 1);

    const units = pt.type === 'Villa' || pt.type === 'Luxury_Villa'
      ? 1 : (pt.maxArea > 0 ? Math.round(buildingArea / rand(80, 200)) : 0);

    // Quantity calculations based on engineering ratios
    const concretePerM2 = pt.concreteFactor + rnorm(0, 0.03);
    const concreteM3 = buildingArea > 0 ? Math.round(buildingArea * concretePerM2 * Math.max(1, floors * 0.8)) : 0;
    const steelTon = concreteM3 > 0 ? Math.round(concreteM3 * pt.steelPerConcrete / 1000 * jitter(1, 0.1) * 100) / 100 : 0;

    const blocksM2 = buildingArea > 0 ? Math.round(buildingArea * floors * 1.8) : 0;
    const tilesM2 = buildingArea > 0 ? Math.round(buildingArea * floors * 0.65) : 0;
    const paintM2 = buildingArea > 0 ? Math.round(buildingArea * floors * 2.2) : 0;
    const elecPoints = buildingArea > 0 ? Math.round(buildingArea * floors * 0.15) : 0;
    const plumbPoints = buildingArea > 0 ? Math.round(buildingArea * floors * 0.04) : 0;

    // Finishing level
    const finish = pick(FINISHING_LEVELS);
    const finishMultipliers = { 'Raw': 0.5, 'Standard': 1.0, 'Good': 1.4, 'Premium': 2.0, 'Luxury': 3.0, 'UltraLuxury': 5.0 };
    const finishMult = finishMultipliers[finish];

    // Cost calculation
    let costPerM2 = { 'Raw': 1000, 'Standard': 2000, 'Good': 3000, 'Premium': 4500, 'Luxury': 7000, 'UltraLuxury': 12000 };
    const baseCost = buildingArea * floors * costPerM2[finish] * city.costIndex;
    const totalCost = Math.round(baseCost * jitter(1, 0.08) / 10000) * 10000;

    // Duration
    const complexity = { 'Villa': 1, 'Luxury_Villa': 1.3, 'Apartment_Building': 1.5, 'Residential_Tower': 2.5,
      'Hospital': 2.8, 'Hotel': 2.2, 'Mall': 2.0, 'Factory': 1.8, 'Warehouse': 1.2, 'Mosque': 1.2,
      'School': 1.4, 'Government_Building': 2.0, 'Residential_Compound': 1.8, 'Townhouse_Project': 1.6 };
    const complexityFactor = complexity[pt.type] || 1.5;
    const baseMonths = Math.sqrt(buildingArea || 1000) * 0.2 + floors * 0.5 + 4;
    const duration = Math.round(baseMonths * complexityFactor * jitter(1, 0.15) * 2) / 2;

    const year = randInt(2020, 2026);

    records.push({
      project_id: projectId,
      city: city.name,
      region: city.region,
      project_type: pt.type,
      land_area_m2: pt.type === 'Villa' || pt.type === 'Luxury_Villa' ? Math.round(buildingArea * rand(0.3, 0.7)) : null,
      building_area_m2: buildingArea || null,
      floors: floors || null,
      units: units > 0 ? units : null,
      finishing_level: finish,
      construction_method: pick(CONSTRUCTION_METHODS),
      structural_system: STRUCTURAL_SYSTEMS[pt.type] ? pick(STRUCTURAL_SYSTEMS[pt.type]) : 'RC Frame',
      concrete_m3: concreteM3 || null,
      steel_ton: steelTon || null,
      blocks_m2: blocksM2 || null,
      tiles_m2: tilesM2 || null,
      paint_m2: paintM2 || null,
      electrical_points: elecPoints || null,
      plumbing_points: plumbPoints || null,
      estimated_cost_sar: totalCost,
      duration_months: duration,
      year: year
    });
  }
  return { records, projectIds };
}

function generateBOQItems(project, maxItems = 12) {
  const items = [];
  const numCategories = randInt(5, maxItems);
  const selectedCats = pickMulti(BOQ_CATEGORIES, numCategories);

  selectedCats.forEach((cat, idx) => {
    const itemDesc = pick(cat.items);
    const baseQty = project.building_area_m2 > 0
      ? project.building_area_m2 * project.floors * rand(0.02, 0.15)
      : rand(50, 500);
    const qty = Math.round(baseQty * jitter(1, 0.15) * 100) / 100;

    const city = CITIES.find(c => c.name === project.city) || CITIES[0];
    const price = cat.basePrice * city.costIndex * jitter(1, 0.1);

    items.push({
      project_id: project.project_id,
      item_code: `${String(idx + 1).padStart(2, '0')}${cat.category.substring(0, 2).toUpperCase()}`,
      description_ar: itemDesc,
      category: cat.category,
      unit: cat.unit,
      quantity: qty,
      unit_price_sar: Math.round(price * 100) / 100,
      confidence: randInt(75, 99),
      waste_factor: cat.waste
    });
  });
  return items;
}

function generateMaterialPrices() {
  const records = [];
  let id = 1;
  CITIES.forEach(city => {
    Object.entries(MATERIAL_PRICES).forEach(([mat, info]) => {
      const basePrice = info.standard * city.costIndex;
      const jittered = basePrice * jitter(1, 0.08);
      for (let m = 0; m < randInt(1, 3); m++) {
        const supplier = pick(SUPPLIER_NAMES);
        records.push({
          material_name: mat,
          category: mat.split('(')[0].trim(),
          unit: info.unit,
          city: city.name,
          supplier_name: supplier,
          avg_price_sar: Math.round(jittered * 100) / 100,
          price_date: `2024-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
          quality_grade: pick(QUALITY_GRADES)
        });
      }
    });
  });
  return records;
}

function generateSuppliers() {
  const records = [];
  const used = new Set();
  for (let i = 0; i < 200; i++) {
    const name = pick(SUPPLIER_NAMES);
    if (used.has(name + i % 5)) continue;
    used.add(name + i % 5);
    records.push({
      supplier_name: `${name} - ${i + 1}`,
      city: pick(CITIES).name,
      speciality: pick(['Concrete','Steel','Finishing','Electrical','Plumbing','HVAC','General Construction']),
      rating: Math.round(rnorm(4.0, 0.5) * 10) / 10,
      delivery_speed_days: randInt(1, 21),
      contract_years: randInt(0, 10),
      compliance_percent: randInt(75, 100),
      total_deals: randInt(5, 500)
    });
  }
  return records;
}

function generateRisks(project) {
  const records = [];
  const numRisks = randInt(2, 6);
  const selected = pickMulti(RISK_CATEGORIES, numRisks);
  selected.forEach(rc => {
    const prob = randInt(1, 5);
    const impact = randInt(1, 5);
    records.push({
      project_id: project.project_id,
      risk_category: rc.category,
      description: pick(rc.descs),
      probability: prob,
      impact: impact,
      mitigation: rc.category === 'Schedule' ? 'Accelerated procurement plan' :
                  rc.category === 'Financial' ? 'Fixed price contracts' :
                  rc.category === 'Safety' ? 'Enhanced safety training' :
                  rc.category === 'Quality' ? 'Additional testing regime' :
                  rc.category === 'Material' ? 'Alternative supplier sourcing' :
                  'Design review and structural analysis',
      detected_by_ai: Math.random() > 0.6
    });
  });
  return records;
}

function generateLaborRates() {
  const records = [];
  LABOR_TRADES.forEach(lt => {
    CITIES.forEach(city => {
      const rate = lt.dailyRate * city.costIndex * jitter(1, 0.08);
      records.push({
        trade: lt.trade,
        city: city.name,
        daily_rate_sar: Math.round(rate * 10) / 10,
        year: randInt(2023, 2025)
      });
    });
  });
  return records;
}

function generateEquipmentRates() {
  const records = [];
  EQUIPMENT.forEach(eq => {
    CITIES.forEach(city => {
      const rate = eq.daily * city.costIndex * jitter(1, 0.1);
      records.push({
        equipment_name: eq.name,
        category: eq.category,
        city: city.name,
        daily_rate_sar: Math.round(rate * 10) / 10,
        with_operator: Math.random() > 0.3
      });
    });
  });
  return records;
}

function generateDefects(project, count) {
  const records = [];
  for (let i = 0; i < count; i++) {
    const dt = pick(DEFECT_TYPES);
    records.push({
      project_id: project.project_id,
      defect_type: dt.type,
      severity: Math.random() > 0.7 ? pick(['Critical','High']) : dt.severity,
      location: `Floor ${randInt(1, project.floors || 5)} - ${pick(['Zone A','Zone B','Zone C','Core Area','East Wing','West Wing'])}`,
      element_type: pick(dt.elements),
      detected_by: Math.random() > 0.5 ? 'AI' : 'Inspector',
      confidence: randInt(75, 99),
      status: pick(['Open','InProgress','Resolved','Verified'])
    });
  }
  return records;
}

function generateProjectUnderstanding(count) {
  const ptNames = PROJECT_TYPES.map(p => p.type);
  const records = [];
  const templates = [
    (t,c,a,f) => `مشروع ${t} في ${c} بمساحة ${a} م² وعدد ${f} أدوار. يشمل المبنى تشطيبات عالية الجودة.`,
    (t,c,a,f) => `${t} ${c} على أرض مساحتها ${Math.round(a / rand(0.3, 0.7))} م²، مساحة البناء ${a} م²، ${f} أدوار.`,
    (t,c,a,f) => `إنشاء ${t} في مدينة ${c} بمساحة إجمالية ${a} متر مربع مكون من ${f} طوابق.`,
    (t,c,a,f) => `Project: ${t} in ${c}, built-up area ${a} sqm, ${f} floors. Quality finishing required.`,
    (t,c,a,f) => `Development of a ${t} in ${c} with a total area of ${a} square meters across ${f} floors.`
  ];
  for (let i = 0; i < count; i++) {
    const city = pick(CITIES);
    const pt = pick(ptNames);
    const area = Math.round(rand(300, 20000));
    const floors = randInt(1, 30);
    const template = pick(templates);
    records.push({
      raw_description: template(pt, city.name, area, floors, randInt(1,5)),
      project_type: pt,
      city: city.name,
      area_m2: Math.round(area * jitter(1, 0.1)),
      floors: Math.round(floors * jitter(1, 0.1)),
      finishing_level: pick(FINISHING_LEVELS),
      confidence: randInt(60, 98),
      source: 'synthetic'
    });
  }
  return records;
}

// ===== CSV WRITER =====

function toCSV(records, columns) {
  const header = columns.join(',');
  const rows = records.map(r => columns.map(col => {
    const val = r[col];
    if (val === null || val === undefined) return '';
    if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return String(val);
  }).join(','));
  return header + '\n' + rows.join('\n');
}

function toJSON(records) {
  return JSON.stringify(records, null, 2);
}

// ===== MAIN =====

async function main() {
  const args = process.argv.slice(2);
  const numRecords = parseInt(args.find(a => a.startsWith('--records='))?.split('=')[1] || '10000', 10);
  const outputDir = path.join(__dirname, '..');
  const csvDir = path.join(outputDir, 'csv');
  const jsonDir = path.join(outputDir, 'json');

  console.log(`\n  🏗️  ACEP Training Data Generator`);
  console.log(`  ──────────────────────────────────`);
  console.log(`  📊 Target: ${numRecords.toLocaleString()} projects\n`);

  // Generate projects
  console.log('  📁 Generating projects...');
  const { records: projects, projectIds } = generateProjects(numRecords);
  console.log(`     ✅ ${projects.length} projects generated`);

  // Generate BOQ items
  console.log('  📋 Generating BOQ items...');
  let allBOQ = [];
  projects.forEach((p, idx) => {
    const items = generateBOQItems(p);
    allBOQ = allBOQ.concat(items);
    if ((idx + 1) % 2000 === 0) process.stdout.write('.');
  });
  console.log(`\n     ✅ ${allBOQ.length} BOQ items generated`);

  // Generate material prices
  console.log('  💰 Generating material prices...');
  const materialPrices = generateMaterialPrices();
  console.log(`     ✅ ${materialPrices.length} price records generated`);

  // Generate suppliers
  console.log('  🏪 Generating suppliers...');
  const suppliers = generateSuppliers();
  console.log(`     ✅ ${suppliers.length} suppliers generated`);

  // Generate risks
  console.log('  ⚠️  Generating risks...');
  let allRisks = [];
  projects.forEach((p, idx) => {
    const risks = generateRisks(p);
    allRisks = allRisks.concat(risks);
    if ((idx + 1) % 2000 === 0) process.stdout.write('.');
  });
  console.log(`\n     ✅ ${allRisks.length} risk records generated`);

  // Generate labor rates
  console.log('  👷 Generating labor rates...');
  const laborRates = generateLaborRates();
  console.log(`     ✅ ${laborRates.length} labor rate records generated`);

  // Generate equipment rates
  console.log('  🏗️  Generating equipment rates...');
  const equipmentRates = generateEquipmentRates();
  console.log(`     ✅ ${equipmentRates.length} equipment rate records generated`);

  // Generate defects
  console.log('  🔍 Generating quality defects...');
  let allDefects = [];
  projects.forEach((p, idx) => {
    const defects = generateDefects(p, randInt(0, 3));
    allDefects = allDefects.concat(defects);
    if ((idx + 1) % 2000 === 0) process.stdout.write('.');
  });
  console.log(`\n     ✅ ${allDefects.length} defect records generated`);

  // Generate project understanding data
  console.log('  🧠 Generating project understanding examples...');
  const puData = generateProjectUnderstanding(Math.min(numRecords, 50000));
  console.log(`     ✅ ${puData.length} project understanding records generated`);

  // ---- Write CSV Files ----
  console.log('\n  💾 Writing CSV files...');

  const projectCols = ['project_id','city','region','project_type','land_area_m2','building_area_m2','floors','units',
    'finishing_level','construction_method','structural_system','concrete_m3','steel_ton','blocks_m2','tiles_m2',
    'paint_m2','electrical_points','plumbing_points','estimated_cost_sar','duration_months','year'];

  const boqCols = ['project_id','item_code','description_ar','category','unit','quantity','unit_price_sar','confidence','waste_factor'];
  const matCols = ['material_name','category','unit','city','supplier_name','avg_price_sar','price_date','quality_grade'];
  const supCols = ['supplier_name','city','speciality','rating','delivery_speed_days','contract_years','compliance_percent','total_deals'];
  const riskCols = ['project_id','risk_category','description','probability','impact','mitigation','detected_by_ai'];
  const laborCols = ['trade','city','daily_rate_sar','year'];
  const equipCols = ['equipment_name','category','city','daily_rate_sar','with_operator'];
  const defectCols = ['project_id','defect_type','severity','location','element_type','detected_by','confidence','status'];
  const puCols = ['raw_description','project_type','city','area_m2','floors','finishing_level','confidence','source'];

  // Write CSV
  const csvFiles = [
    { name: 'projects', records: projects, cols: projectCols },
    { name: 'boq_items', records: allBOQ, cols: boqCols },
    { name: 'material_prices', records: materialPrices, cols: matCols },
    { name: 'suppliers', records: suppliers, cols: supCols },
    { name: 'risks', records: allRisks, cols: riskCols },
    { name: 'labor_rates', records: laborRates, cols: laborCols },
    { name: 'equipment_rates', records: equipmentRates, cols: equipCols },
    { name: 'quality_defects', records: allDefects, cols: defectCols },
    { name: 'project_understanding', records: puData, cols: puCols }
  ];

  for (const f of csvFiles) {
    const csv = toCSV(f.records, f.cols);
    fs.writeFileSync(path.join(csvDir, `${f.name}.csv`), '\ufeff' + csv, 'utf8');
    console.log(`     📄 ${f.name}.csv (${f.records.length.toLocaleString()} records)`);
  }

  // Write JSON samples (first 100 records for preview)
  console.log('\n  📦 Writing JSON files (sample: 100 records each)...');
  for (const f of csvFiles) {
    const sample = f.records.slice(0, 100);
    fs.writeFileSync(path.join(jsonDir, `${f.name}.json`), toJSON(sample), 'utf8');
  }
  console.log('     ✅ JSON sample files written');

  // Write full JSON for smaller datasets
  console.log('  📦 Writing full JSON for smaller datasets...');
  ['suppliers','labor_rates','equipment_rates'].forEach(name => {
    const f = csvFiles.find(x => x.name === name);
    if (f && f.records.length <= 20000) {
      fs.writeFileSync(path.join(jsonDir, `${name}_full.json`), toJSON(f.records), 'utf8');
      console.log(`     ✅ ${name}_full.json`);
    }
  });

  // ---- Summary ----
  const totalSizeMB = csvFiles.reduce((sum, f) => sum + f.records.length * Object.keys(f.cols).length * 0.05, 0) / 1000;
  const totalRecords = csvFiles.reduce((sum, f) => sum + f.records.length, 0);

  console.log(`\n  ──────────────────────────────────────`);
  console.log(`  ✅ GENERATION COMPLETE`);
  console.log(`  ──────────────────────────────────────`);
  console.log(`  📁 Output: ${csvDir}`);
  console.log(`  📊 Total records: ${totalRecords.toLocaleString()}`);
  console.log(`  💾 Est. size: ${totalSizeMB.toFixed(1)} MB`);
  console.log(`  ──────────────────────────────────────\n`);
}

main().catch(console.error);
