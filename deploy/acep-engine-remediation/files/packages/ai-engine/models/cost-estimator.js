/**
 * ACEP Internal Cost Estimator — v2 (dataset-assisted).
 * Data is loaded by column name and its provenance is reported with every result.
 * Estimates are decision support only until their source data is independently verified.
 */

const fs = require('fs');
const path = require('path');
const kb = require('../knowledge-base');
const millionProjectModel = require('./million-project-model');
const { getCostComposition } = require('../engineering-concept-estimator');

function parseCSV(content) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const text = String(content || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const nonEmpty = rows.filter(values => values.some(value => value.trim() !== ''));
  if (nonEmpty.length < 2) return [];
  const headers = nonEmpty[0].map(value => value.trim().toLowerCase());
  return nonEmpty.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, (values[index] || '').trim()])));
}

function readCSV(filePath) {
  return parseCSV(fs.readFileSync(filePath, 'utf8'));
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

class CostEstimator {
  constructor() {
    this.trained = false;
    this.materialPrices = [];
    this.laborRates = [];
    this.equipmentRates = [];
    this.supplierData = [];
    this.materialStats = {};
    this.laborStats = {};
    this.equipStats = {};
    this.dataProvenance = process.env.ACEP_DATA_PROVENANCE || 'synthetic';
    this.sources = {};
  }

  async train(materialPath, laborPath, equipPath, supplierPath) {
    const baseDir = path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv');
    this.trained = false;
    this.materialPrices = [];
    this.laborRates = [];
    this.equipmentRates = [];
    this.supplierData = [];
    this.materialStats = {};
    this.laborStats = {};
    this.equipStats = {};
    this.sources = {};

    // Material prices
    try {
      const source = materialPath || path.join(baseDir, 'material_prices.csv');
      this.sources.materials = path.basename(source);
      this.materialPrices = readCSV(source).map(row => ({
        name: row.material_name, category: row.category, unit: row.unit, city: row.city,
        supplier: row.supplier_name, price: finiteNumber(row.avg_price_sar), date: row.price_date, grade: row.quality_grade
      })).filter(material => material.name && material.price > 0);
    } catch { this.materialPrices = []; }

    // Labor rates
    try {
      const source = laborPath || path.join(baseDir, 'labor_rates.csv');
      this.sources.labor = path.basename(source);
      this.laborRates = readCSV(source).map(row => ({
        trade: row.trade, category: row.category || '', dailyRate: finiteNumber(row.daily_rate_sar),
        city: row.city, year: finiteNumber(row.year)
      })).filter(labor => labor.trade && labor.dailyRate > 0);
    } catch { this.laborRates = []; }

    // Equipment rates
    try {
      const source = equipPath || path.join(baseDir, 'equipment_rates.csv');
      this.sources.equipment = path.basename(source);
      this.equipmentRates = readCSV(source).map(row => ({
        name: row.equipment_name, category: row.category, city: row.city,
        dailyRate: finiteNumber(row.daily_rate_sar), withOperator: row.with_operator === 'true'
      })).filter(equipment => equipment.name && equipment.dailyRate > 0);
    } catch { this.equipmentRates = []; }

    // Supplier data
    try {
      const source = supplierPath || path.join(baseDir, 'suppliers.csv');
      this.sources.suppliers = path.basename(source);
      this.supplierData = readCSV(source).map(row => ({
        name: row.supplier_name, category: row.speciality, city: row.city,
        rating: finiteNumber(row.rating), projects: finiteNumber(row.total_deals),
        deliverySpeedDays: finiteNumber(row.delivery_speed_days), contractYears: finiteNumber(row.contract_years),
        compliancePercent: finiteNumber(row.compliance_percent)
      })).filter(supplier => supplier.name);
    } catch { this.supplierData = []; }

    // Build material category stats
    const matGroups = {};
    this.materialPrices.forEach(m => {
      if (!matGroups[m.category]) matGroups[m.category] = [];
      matGroups[m.category].push(m.price);
    });
    for (const [cat, prices] of Object.entries(matGroups)) {
      prices.sort((a, b) => a - b);
      this.materialStats[cat] = {
        count: prices.length,
        avg: prices.reduce((s, v) => s + v, 0) / prices.length,
        median: prices[Math.floor(prices.length / 2)],
        min: prices[0], max: prices[prices.length - 1]
      };
    }

    // Build labor stats by trade
    const laborGroups = {};
    this.laborRates.forEach(l => {
      if (!laborGroups[l.trade]) laborGroups[l.trade] = [];
      laborGroups[l.trade].push(l.dailyRate);
    });
    for (const [trade, rates] of Object.entries(laborGroups)) {
      rates.sort((a, b) => a - b);
      this.laborStats[trade] = {
        count: rates.length,
        avg: rates.reduce((s, v) => s + v, 0) / rates.length,
        min: rates[0], max: rates[rates.length - 1]
      };
    }

    // Build equipment stats
    const equipGroups = {};
    this.equipmentRates.forEach(e => {
      if (!equipGroups[e.category]) equipGroups[e.category] = [];
      equipGroups[e.category].push(e.dailyRate);
    });
    for (const [cat, rates] of Object.entries(equipGroups)) {
      rates.sort((a, b) => a - b);
      this.equipStats[cat] = {
        count: rates.length,
        avg: rates.reduce((s, v) => s + v, 0) / rates.length,
        min: rates[0], max: rates[rates.length - 1]
      };
    }

    this.trained = this.materialPrices.length > 0;
    return {
      materials: this.materialPrices.length,
      labor: this.laborRates.length,
      equipment: this.equipmentRates.length,
      suppliers: this.supplierData.length
    };
  }

  estimateCost(boqItems, projectType, area, floors, finishing = 'Standard', region = 'Riyadh', modelInputs = {}) {
    if (!kb.initialized) kb.initialize();
    const numericArea = Number(area);
    const numericFloors = Number(floors);
    if (!Number.isFinite(numericArea) || numericArea <= 0) throw new TypeError('area must be a positive finite number');
    if (!Number.isFinite(numericFloors) || numericFloors <= 0) throw new TypeError('floors must be a positive finite number');
    const multiplier = kb.getMaterialPriceMultiplier(finishing);
    const regionIndex = kb.getRegionIndex(region);
    const totalArea = Number(modelInputs.grossBuiltArea) > 0
      ? Number(modelInputs.grossBuiltArea)
      : numericArea * numericFloors;
    const pt = kb.getProjectType(projectType);

    const trainedPrediction = millionProjectModel.predict({
      projectType: modelInputs.modelType || projectType,
      grossBuiltArea: totalArea,
      footprintArea: modelInputs.footprintArea || numericArea,
      landArea: modelInputs.landArea,
      floors: numericFloors,
      basements: modelInputs.basements,
      buildings: modelInputs.buildings,
      capacity: modelInputs.capacity,
      city: region,
      finishing,
      method: modelInputs.method
    });
    if (trainedPrediction.blocked) return { status: 'blocked', reason: trainedPrediction.reason, totalCost: null, costPerM2: null };
    const pricedBOQ = Array.isArray(boqItems) && boqItems.length > 0 && boqItems.every(item =>
      finiteNumber(item.quantity) > 0 && finiteNumber(item.unitPrice) > 0
    );
    if (pricedBOQ) {
      return this._estimateFromBOQ(boqItems, trainedPrediction, totalArea, projectType);
    }
    if (trainedPrediction.available) return this._trainedEstimate(trainedPrediction, totalArea, regionIndex, multiplier);

    if (!this.trained || this.materialPrices.length === 0) {
      return this._fallbackEstimate(totalArea, projectType, finishing, region);
    }

    // ─── Material Cost from training data ───
    let materialCost = 0;
    if (boqItems && boqItems.length > 0) {
      // Use BOQ unit prices if available, but adjust by actual market prices
      for (const item of boqItems) {
        const quantity = finiteNumber(item.quantity);
        if (quantity <= 0) continue;
        const matCat = this._mapBOQtoMaterialCategory(item.category);
        const stats = this.materialStats[matCat];
        const boqPrice = finiteNumber(item.unitPrice);
        const marketPrice = stats ? stats.avg : boqPrice;
        if (marketPrice <= 0 && boqPrice <= 0) continue;
        // Blend: 60% market data, 40% BOQ data
        const blendedPrice = marketPrice > 0 && boqPrice > 0
          ? marketPrice * 0.6 + boqPrice * 0.4
          : Math.max(marketPrice, boqPrice);
        materialCost += quantity * blendedPrice;
      }
    } else {
      // Estimate from project type + area
      const baseRate = pt ? pt.costPerM2 * 0.45 : 1260; // 45% of total cost is materials
      materialCost = totalArea * baseRate * multiplier * regionIndex;
    }

    // ─── Labor Cost from training data ───
    const laborTrades = Object.keys(this.laborStats);
    let laborCost = 0;
    if (laborTrades.length > 0) {
      const avgLaborRate = laborTrades.reduce((s, t) => s + this.laborStats[t].avg, 0) / laborTrades.length;
      const durationDays = pt ? pt.durationMonths * 22 : 180;
      const workers = Math.max(10, Math.round(numericArea * 0.003 * (1 + (multiplier - 1) * 0.2)));
      laborCost = workers * durationDays * avgLaborRate * regionIndex;
    } else {
      laborCost = materialCost * 0.3; // fallback
    }

    // ─── Equipment Cost from training data ───
    const equipCats = Object.keys(this.equipStats);
    let equipmentCost = 0;
    if (equipCats.length > 0) {
      const avgEquipRate = equipCats.reduce((s, c) => s + this.equipStats[c].avg, 0) / equipCats.length;
      const equipDays = (pt ? pt.durationMonths * 22 : 180) * 0.6;
      const equipCount = Math.max(2, Math.round(numericArea * 0.001));
      equipmentCost = equipCount * equipDays * avgEquipRate * regionIndex * 0.5;
    } else {
      equipmentCost = materialCost * 0.12; // fallback
    }

    // ─── Build final breakdown ───
    const directCost = materialCost + laborCost + equipmentCost;
    const indirectRate = 0.12 + (pt ? Math.max(0, pt.floors[1] - 10) * 0.002 : 0);
    const indirectCost = directCost * indirectRate;
    const contingencyRate = 0.03 + (floors > 10 ? 0.02 : 0) + (totalArea > 10000 ? 0.02 : 0);
    const contingency = directCost * contingencyRate;
    const profit = (directCost + indirectCost + contingency) * 0.1;
    const taxes = (directCost + indirectCost + contingency + profit) * 0.15;
    const totalCost = directCost + indirectCost + contingency + profit + taxes;

    const breakdown = {
      materials: { cost: Math.round(materialCost), percentage: Math.round(materialCost / totalCost * 100) },
      labor: { cost: Math.round(laborCost), percentage: Math.round(laborCost / totalCost * 100) },
      equipment: { cost: Math.round(equipmentCost), percentage: Math.round(equipmentCost / totalCost * 100) },
      indirect: { cost: Math.round(indirectCost), percentage: Math.round(indirectCost / totalCost * 100) },
      contingency: { cost: Math.round(contingency), percentage: Math.round(contingency / totalCost * 100) },
      profit: { cost: Math.round(profit), percentage: Math.round(profit / totalCost * 100) },
      taxes: { cost: Math.round(taxes), percentage: Math.round(taxes / totalCost * 100) }
    };

    const confidence = Math.min(0.5 + this.materialPrices.length * 0.001, 0.9);

    return {
      directCost: Math.round(directCost),
      indirectCost: Math.round(indirectCost),
      contingency: Math.round(contingency),
      profit: Math.round(profit),
      taxes: Math.round(taxes),
      totalCost: Math.round(totalCost),
      currency: 'SAR',
      costPerM2: Math.round(totalCost / totalArea),
      breakdown,
      confidence: Math.round(confidence * 100) / 100,
      regionalFactor: regionIndex,
      finishingMultiplier: multiplier,
      dataPoints: {
        materials: this.materialPrices.length,
        labor: this.laborRates.length,
        equipment: this.equipmentRates.length,
        suppliers: this.supplierData.length
      },
      dataProvenance: this.dataProvenance,
      sourceFiles: { ...this.sources },
      status: this.dataProvenance === 'verified' ? 'preliminary' : 'experimental',
      contractualUse: false,
      requiresHumanReview: true
    };
  }

  _estimateFromBOQ(boqItems, prediction, totalArea, projectType) {
    const projectKey = prediction.available ? prediction.projectType : String(projectType || 'other').toLowerCase();
    const family = prediction.available ? prediction.family : 'other';
    const composition = getCostComposition(projectKey, family);
    const directCost = Math.round(boqItems.reduce((sum, item) => {
      const explicitTotal = finiteNumber(item.totalPrice);
      return sum + (explicitTotal > 0 ? explicitTotal : finiteNumber(item.quantity) * finiteNumber(item.unitPrice));
    }, 0));
    const indirectCost = Math.round(directCost * composition.indirectRate);
    const contingency = Math.round(directCost * composition.contingencyRate);
    const beforeProfit = directCost + indirectCost + contingency;
    const profit = Math.round(beforeProfit * composition.profitRate);
    const beforeTax = beforeProfit + profit;
    const taxes = Math.round(beforeTax * composition.taxRate);
    const totalCost = beforeTax + taxes;

    const categoryCosts = new Map();
    for (const item of boqItems) {
      const category = String(item.category || item.material || 'WorkPackages');
      const cost = finiteNumber(item.totalPrice) || finiteNumber(item.quantity) * finiteNumber(item.unitPrice);
      categoryCosts.set(category, (categoryCosts.get(category) || 0) + cost);
    }
    const components = [
      ...[...categoryCosts.entries()].map(([key, cost]) => ({ key, cost: Math.round(cost) })),
      { key: 'indirect', cost: indirectCost },
      { key: 'contingency', cost: contingency },
      { key: 'profit', cost: profit },
      { key: 'taxes', cost: taxes }
    ];
    let allocatedPercentage = 0;
    const breakdown = {};
    components.forEach((component, index) => {
      const percentage = index === components.length - 1
        ? 100 - allocatedPercentage
        : Math.max(0, Math.floor(component.cost / totalCost * 100));
      allocatedPercentage += percentage;
      breakdown[component.key] = { cost: component.cost, percentage };
    });

    const modelTotal = prediction.available ? Math.round(prediction.predictions.costSar) : null;
    const includedShare = boqItems.reduce((sum, item) => sum + Number(item.costShare || 0), 0);
    const partialScope = includedShare > 0 && includedShare < 0.999;
    const modelVariancePercent = modelTotal
      ? Math.round(Math.abs(totalCost - modelTotal) / modelTotal * 10000) / 100
      : null;
    return {
      directCost,
      boqSubtotal: directCost,
      indirectCost,
      contingency,
      profit,
      taxes,
      totalCost,
      currency: 'SAR',
      costPerM2: Math.round(totalCost / totalArea),
      costRange: prediction.available && !partialScope ? {
        lower: Math.round(prediction.intervals.costSar.lower),
        upper: Math.round(prediction.intervals.costSar.upper),
        basis: 'synthetic_holdout_p90_error'
      } : null,
      breakdown,
      composition,
      boqReconciliation: {
        independentValidation: false,
        relationship: 'arithmetic_only_shared_parametric_reference',
        partialScope,
        pricedItems: boqItems.length,
        lineItemSubtotal: directCost,
        directCost,
        indirectCost,
        contingency,
        profit,
        taxes,
        totalCost,
        arithmeticVariance: 0,
        modelReferenceTotal: modelTotal,
        modelVariancePercent,
        formula: 'BOQ subtotal + indirect + contingency + profit + VAT'
      },
      confidence: 0.62,
      dataPoints: {
        boqItems: boqItems.length,
        projects: prediction.available ? prediction.trainingRecords : 0
      },
      sourceFiles: { ...this.sources },
      dataProvenance: prediction.available ? prediction.dataProvenance : this.dataProvenance,
      modelId: prediction.available ? prediction.modelId : null,
      projectType: projectKey,
      status: 'experimental_concept_cost_plan',
      pricingStatus: 'parametric_not_live_market',
      marketPriceVerified: false,
      rangeStatus: partialScope ? 'not_calibrated_for_reduced_scope' : 'synthetic_reference_only',
      contractualUse: false,
      suitableForModelApproval: false,
      suitableForProcurement: false,
      requiresHumanReview: true,
      limitations: [
        ...(prediction.available ? prediction.limitations : []),
        'The estimate is arithmetically reconciled to the concept BOQ, but rates are parametric and require a dated local rate book.'
      ]
    };
  }

  _trainedEstimate(prediction, totalArea, regionIndex, finishingMultiplier) {
    const totalCost = Math.round(prediction.predictions.costSar);
    const shares = { materials: 0.42, labor: 0.24, equipment: 0.08, indirect: 0.08, contingency: 0.05, profit: 0.06, taxes: 0.07 };
    const amounts = Object.fromEntries(Object.entries(shares).map(([key, share]) => [key, Math.round(totalCost * share)]));
    const roundingDifference = totalCost - Object.values(amounts).reduce((sum, value) => sum + value, 0);
    amounts.contingency += roundingDifference;
    const directCost = amounts.materials + amounts.labor + amounts.equipment;
    const holdout = prediction.syntheticHoldout.costSar || {};
    return {
      directCost,
      indirectCost: amounts.indirect,
      contingency: amounts.contingency,
      profit: amounts.profit,
      taxes: amounts.taxes,
      totalCost,
      currency: 'SAR',
      costPerM2: Math.round(totalCost / totalArea),
      costRange: {
        lower: Math.round(prediction.intervals.costSar.lower),
        upper: Math.round(prediction.intervals.costSar.upper),
        basis: 'synthetic_holdout_p90_error'
      },
      breakdown: Object.fromEntries(Object.entries(shares).map(([key, share]) => [key, {
        cost: amounts[key], percentage: Math.round(share * 100)
      }])),
      confidence: 0.65,
      regionalFactor: regionIndex,
      finishingMultiplier,
      dataPoints: { projects: prediction.trainingRecords },
      dataProvenance: prediction.dataProvenance,
      modelId: prediction.modelId,
      projectType: prediction.projectType,
      holdoutMetrics: holdout,
      sourceFiles: {},
      status: 'experimental',
      contractualUse: false,
      suitableForModelApproval: false,
      requiresHumanReview: true,
      limitations: prediction.limitations
    };
  }

  _mapBOQtoMaterialCategory(boqCat) {
    const map = {
      'EarthWork': 'Excavation', 'Concrete': 'Concrete', 'Reinforcement': 'Steel',
      'Block': 'Block', 'Plaster': 'Cement', 'Ceramic': 'Ceramic',
      'Marble': 'Marble', 'Paint': 'Paint', 'Doors': 'Doors',
      'Windows': 'Aluminum', 'Waterproofing': 'Waterproofing',
      'Electrical': 'Electrical', 'Plumbing': 'Plumbing',
      'HVAC': 'HVAC', 'FireFighting': 'Fire',
      'Ceiling': 'Gypsum', 'Landscape': 'Landscaping'
    };
    return map[boqCat] || 'General';
  }

  _fallbackEstimate(totalArea, projectType, finishing, region) {
    if (!Number.isFinite(totalArea) || totalArea <= 0) throw new TypeError('totalArea must be a positive finite number');
    const pt = kb.getProjectType(projectType);
    const costPerM2 = pt ? pt.costPerM2 : 2800;
    const multiplier = kb.getMaterialPriceMultiplier(finishing);
    const regionIndex = kb.getRegionIndex(region);
    const base = totalArea * costPerM2 * multiplier * regionIndex;
    const direct = base * 0.85;
    const indirect = base * 0.1;
    const contingency = base * 0.05;
    const profit = (direct + indirect + contingency) * 0.1;
    const taxes = (direct + indirect + contingency + profit) * 0.15;
    const total = direct + indirect + contingency + profit + taxes;
    return {
      directCost: Math.round(direct), indirectCost: Math.round(indirect),
      contingency: Math.round(contingency), profit: Math.round(profit),
      taxes: Math.round(taxes), totalCost: Math.round(total),
      currency: 'SAR', costPerM2: Math.round(total / totalArea),
      breakdown: { materials: { cost: Math.round(direct * 0.5), percentage: 50 },
        labor: { cost: Math.round(direct * 0.3), percentage: 30 },
        equipment: { cost: Math.round(direct * 0.2), percentage: 20 },
        indirect: { cost: Math.round(indirect), percentage: Math.round(indirect / total * 100) },
        contingency: { cost: Math.round(contingency), percentage: Math.round(contingency / total * 100) },
        profit: { cost: Math.round(profit), percentage: Math.round(profit / total * 100) },
        taxes: { cost: Math.round(taxes), percentage: Math.round(taxes / total * 100) } },
      confidence: 0.35, fallback: true,
      dataProvenance: this.dataProvenance,
      sourceFiles: { ...this.sources },
      status: 'experimental', contractualUse: false, requiresHumanReview: true
    };
  }

  getMaterialPrices(category, city) {
    let filtered = this.materialPrices;
    if (category) filtered = filtered.filter(m => m.category.toLowerCase().includes(category.toLowerCase()));
    if (city) filtered = filtered.filter(m => m.city === city);
    return filtered.sort((a, b) => a.price - b.price);
  }

  getLaborRates(trade, city) {
    let filtered = this.laborRates;
    if (trade) filtered = filtered.filter(l => l.trade.toLowerCase().includes(trade.toLowerCase()));
    if (city) filtered = filtered.filter(l => l.city === city);
    return filtered;
  }

  getSupplierMatches(category, region) {
    let filtered = this.supplierData;
    if (category) filtered = filtered.filter(s => s.category.toLowerCase().includes(category.toLowerCase()));
    if (region) filtered = filtered.filter(s => s.city.toLowerCase().includes(region.toLowerCase()));
    return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  compareSupplierPrices(category) {
    const items = this.getMaterialPrices(category);
    const grouped = {};
    items.forEach(item => {
      if (!grouped[item.name]) grouped[item.name] = [];
      grouped[item.name].push(item);
    });
    return Object.entries(grouped).map(([name, prices]) => ({
      name,
      avgPrice: Math.round(prices.reduce((s, p) => s + p.price, 0) / prices.length),
      minPrice: Math.round(Math.min(...prices.map(p => p.price))),
      maxPrice: Math.round(Math.max(...prices.map(p => p.price))),
      suppliers: prices.length
    })).sort((a, b) => a.minPrice - b.minPrice);
  }
}

const estimator = new CostEstimator();
estimator.parseCSV = parseCSV;
module.exports = estimator;
