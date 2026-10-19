/**
 * ACEP Internal Cost Estimator — v2 (Training-Data Driven)
 * Fits descriptive statistics from supplied CSV records; provenance is not verified.
 * Project totals retain heuristic staffing, duration, overhead and tax assumptions.
 */

const csv = require('./training-csv');
const path = require('path');
const kb = require('../knowledge-base');

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
  }

  async train(materialPath, laborPath, equipPath, supplierPath) {
    const baseDir = path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv');

    // Load atomically: a failed fit preserves the previous valid snapshot.
    const materials = csv.load(materialPath || path.join(baseDir, 'material_prices.csv'),
      ['material_name','category','unit','city','supplier_name','avg_price_sar','price_date','quality_grade'],
      r=>({name:r.material_name,category:r.category,unit:r.unit,city:r.city,supplier:r.supplier_name,price:csv.number(r.avg_price_sar),date:r.price_date,grade:r.quality_grade}));
    const labor = csv.load(laborPath || path.join(baseDir, 'labor_rates.csv'),
      ['trade','city','daily_rate_sar','year'],
      r=>({trade:r.trade,city:r.city,dailyRate:csv.number(r.daily_rate_sar),year:csv.number(r.year)}));
    const equipment = csv.load(equipPath || path.join(baseDir, 'equipment_rates.csv'),
      ['equipment_name','category','city','daily_rate_sar','with_operator'],
      r=>{if(!['true','false'].includes(r.with_operator))throw Error('Invalid operator flag');return {name:r.equipment_name,category:r.category,city:r.city,unit:'day',dailyRate:csv.number(r.daily_rate_sar),withOperator:r.with_operator==='true'};});
    const suppliers = csv.load(supplierPath || path.join(baseDir, 'suppliers.csv'),
      ['supplier_name','city','speciality','rating','delivery_speed_days','contract_years','compliance_percent','total_deals'],
      r=>({name:r.supplier_name,city:r.city,category:r.speciality,rating:csv.number(r.rating),deliveryDays:csv.number(r.delivery_speed_days),contractYears:csv.number(r.contract_years),compliancePercent:csv.number(r.compliance_percent),projects:csv.number(r.total_deals)}));
    this.materialPrices=materials.data; this.laborRates=labor.data;
    this.equipmentRates=equipment.data; this.supplierData=suppliers.data;
    this.materialStats=Object.create(null);this.laborStats=Object.create(null);this.equipStats=Object.create(null);
    this.trainingAudit={materials:materials.audit,labor:labor.audit,equipment:equipment.audit,suppliers:suppliers.audit,provenance:'unverified_csv',accuracyValidated:false};

    // Build material category stats
    const matGroups = Object.create(null);
    this.materialPrices.forEach(m => {
      if (!matGroups[m.category+'|'+csv.unit(m.unit)]) matGroups[m.category+'|'+csv.unit(m.unit)] = [];
      matGroups[m.category+'|'+csv.unit(m.unit)].push(m.price);
    });
    for (const [cat, prices] of Object.entries(matGroups)) {
      prices.sort((a, b) => a - b);
      this.materialStats[cat] = {
        count: prices.length,
        avg: prices.reduce((s, v) => s + v, 0) / prices.length,
        median: (prices[Math.floor((prices.length - 1) / 2)] + prices[Math.floor(prices.length / 2)]) / 2,
        min: prices[0], max: prices[prices.length - 1]
      };
    }

    // Build labor stats by trade
    const laborGroups = Object.create(null);
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
    const equipGroups = Object.create(null);
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

    this.trained = true;
    return {
      materials: this.materialPrices.length,
      labor: this.laborRates.length,
      equipment: this.equipmentRates.length,
      suppliers: this.supplierData.length,
      audit: this.trainingAudit
    };
  }

  estimateCost(boqItems, projectType, area, floors, finishing = 'Standard', region = 'Riyadh') {
    if (!Number.isFinite(area) || area <= 0 || !Number.isInteger(floors) || floors <= 0 || !Number.isFinite(area * floors)) throw new RangeError('area and floors must be positive finite project dimensions');
    const multiplier = kb.getMaterialPriceMultiplier(finishing);
    const regionIndex = kb.getRegionIndex(region);
    const totalArea = area * floors;
    const pt = kb.getProjectType(projectType);

    if ((!this.trained || this.materialPrices.length === 0) && !(Array.isArray(boqItems) && boqItems.length)) {
      return this._fallbackEstimate(totalArea, projectType, finishing, region);
    }

    // Explicit BOQ prices are authoritative, including zero. Supply rates must
    // never be blended into installed rates or multiplied by incompatible units.
    let materialCost = 0;
    const pricingIssues=[];
    if (boqItems && boqItems.length > 0) {
      for (const [index,item] of boqItems.entries()) {
        if (!item || item.insufficient || !Number.isFinite(item.quantity) || item.quantity < 0) {
          pricingIssues.push({index,reason:'insufficient_or_invalid_quantity'}); continue;
        }
        let price=item.unitPrice;
        if (price === undefined || price === null) {
          // A material name, unit, city and grade establish a supply-rate match.
          const matches=this.materialPrices.filter(m=>item.materialName && item.unit && item.grade &&
            m.name===item.materialName && csv.unit(m.unit)===csv.unit(item.unit) &&
            m.city===region && m.grade===item.grade);
          if(matches.length)price=matches.reduce((sum,m)=>sum+m.price,0)/matches.length;
        }
        if (!Number.isFinite(price) || price < 0 || !Number.isFinite(item.quantity*price)) {
          pricingIssues.push({index,reason:'missing_or_invalid_compatible_price'}); continue;
        }
        materialCost += item.quantity * price;
      }
    } else {
      const baseRate = pt ? pt.costPerM2 * 0.45 : 1260;
      materialCost = totalArea * baseRate * multiplier * regionIndex;
    }

    // ─── Labor Cost from training data ───
    const laborTrades = Object.keys(this.laborStats);
    let laborCost = 0;
    if (laborTrades.length > 0) {
      const avgLaborRate = laborTrades.reduce((s, t) => s + this.laborStats[t].avg, 0) / laborTrades.length;
      const durationDays = pt ? pt.durationMonths * 22 : 180;
      const workers = Math.max(10, Math.round(area * 0.003 * (1 + (multiplier - 1) * 0.2)));
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
      const equipCount = Math.max(2, Math.round(area * 0.001));
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
      materials: { cost: Math.round(materialCost), percentage: Math.round(materialCost / (directCost || 1) * 100) },
      labor: { cost: Math.round(laborCost), percentage: Math.round(laborCost / (directCost || 1) * 100) },
      equipment: { cost: Math.round(equipmentCost), percentage: Math.round(equipmentCost / (directCost || 1) * 100) },
      indirect: { cost: Math.round(indirectCost), percentage: Math.round(indirectCost / (totalCost || 1) * 100) },
      contingency: { cost: Math.round(contingency), percentage: Math.round(contingency / (totalCost || 1) * 100) },
      profit: { cost: Math.round(profit), percentage: Math.round(profit / (totalCost || 1) * 100) },
      taxes: { cost: Math.round(taxes), percentage: Math.round(taxes / (totalCost || 1) * 100) }
    };

    const confidence = 0; // No held-out project-cost calibration is available.

    return {
      directCost: Math.round(directCost),
      indirectCost: Math.round(indirectCost),
      contingency: Math.round(contingency),
      profit: Math.round(profit),
      taxes: Math.round(taxes),
      status: pricingIssues.length ? 'incomplete' : 'heuristic_estimate',
      pricingIssues,
      pricedMaterialSubtotal: Math.round(materialCost),
      estimateBasis: 'explicit_BOQ_or_exact_supply_match_plus_heuristic_labor_equipment_overheads',
      confidenceCalibrated: false,
      requiresCostScopeReview: Boolean(boqItems && boqItems.length),
      totalCost: pricingIssues.length ? null : Math.round(totalCost),
      currency: 'SAR',
      costPerM2: pricingIssues.length ? null : Math.round(Math.round(totalCost) / totalArea),
      breakdown,
      confidence: Math.round(confidence * 100) / 100,
      regionalFactor: regionIndex,
      finishingMultiplier: multiplier,
      dataPoints: {
        materials: this.materialPrices.length,
        labor: this.laborRates.length,
        equipment: this.equipmentRates.length,
        suppliers: this.supplierData.length
      }
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
    const pt = kb.getProjectType(projectType);
    const costPerM2 = pt ? pt.costPerM2 : 2800;
    const multiplier = kb.getMaterialPriceMultiplier(finishing);
    const regionIndex = kb.getRegionIndex(region);
    const base = totalArea * costPerM2 * multiplier * regionIndex;
    const direct = base * 0.85;
    return {
      directCost: Math.round(direct), indirectCost: Math.round(base * 0.1),
      contingency: Math.round(base * 0.05), profit: Math.round(base * 0.1),
      taxes: Math.round(base * 0.15), totalCost: Math.round(base * 1.25),
      currency: 'SAR', costPerM2: Math.round(Math.round(base * 1.25) / totalArea),
      breakdown: { materials: { cost: Math.round(direct * 0.5), percentage: 50 },
        labor: { cost: Math.round(direct * 0.3), percentage: 30 },
        equipment: { cost: Math.round(direct * 0.2), percentage: 20 },
        indirect: { cost: Math.round(base * 0.1), percentage: 10 },
        contingency: { cost: Math.round(base * 0.05), percentage: 5 } },
      confidence: 0, confidenceCalibrated: false, status: 'heuristic_estimate', fallback: true
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

module.exports = new CostEstimator();
