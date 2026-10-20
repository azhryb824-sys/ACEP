const path = require('path');
const csv = require('./training-csv');
const aliases = { 'خرسانة': 'Concrete', 'حديد': 'Steel', Tiles: 'Ceramic', Doors: 'Wood', Windows: 'Aluminum', General: 'General Construction' };
const priceCategories = {
  Concrete: ['Ready Mix Concrete'], Steel: ['Rebar 60ksi', 'Steel Section'], Block: ['Hollow Block'],
  Ceramic: ['Porcelain Tiles'], Wood: ['Wooden Door'], Aluminum: ['Aluminum Window'],
  Plumbing: ['PVC Pipe 110mm', 'Copper Pipe 15mm'], Electrical: ['Electrical Cable 4mm']
};
const text = (value, name) => { if (typeof value !== 'string' || !value.trim()) throw new TypeError('Invalid ' + name); return value.trim(); };
const canonical = category => aliases[category] || category;
const bounded = (value, max, integer = false) => { const n = csv.number(value); if (n > max || (integer && !Number.isSafeInteger(n))) throw Error('Out-of-range supplier field'); return n; };

class SupplierIntelligence {
  constructor() { this.trained = false; this.suppliers = []; this.materialPrices = []; this.bySpeciality = {}; this.byCity = {}; }

  async train(supplierPath, materialPath) {
    this.trained = false;
    this.suppliers = []; this.materialPrices = []; this.bySpeciality = Object.create(null); this.byCity = Object.create(null);
    const baseDir = path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv');
    const suppliers = csv.load(supplierPath || path.join(baseDir, 'suppliers.csv'),
      ['supplier_name','city','speciality','rating','delivery_speed_days','contract_years','compliance_percent','total_deals'], r => ({
        name: r.supplier_name, city: r.city, speciality: r.speciality, rating: bounded(r.rating,5),
        deliverySpeed: bounded(r.delivery_speed_days,Number.MAX_SAFE_INTEGER,true), contractYears: bounded(r.contract_years,Number.MAX_SAFE_INTEGER),
        compliance: bounded(r.compliance_percent,100), totalDeals: bounded(r.total_deals,Number.MAX_SAFE_INTEGER,true)
      }));
    this.suppliers = suppliers.data;
    let prices;
    try {
      prices = csv.load(materialPath || path.join(baseDir, 'material_prices.csv'),
        ['material_name','category','unit','city','supplier_name','avg_price_sar','price_date','quality_grade'], r => {
          const price = csv.number(r.avg_price_sar,Number.MIN_VALUE);
          if (price > Number.MAX_SAFE_INTEGER / 100 || !/^\d{4}-\d{2}-\d{2}$/.test(r.price_date) || !Number.isFinite(Date.parse(r.price_date)) || new Date(r.price_date).toISOString().slice(0,10) !== r.price_date) throw Error('Invalid price record');
          return { material: r.material_name, category: r.category, unit: csv.unit(r.unit), city: r.city,
            supplier: r.supplier_name, price, priceDate: r.price_date, qualityGrade: r.quality_grade, currency: 'SAR' };
        });
      this.materialPrices = prices.data;
    } catch (e) { if (e.code !== 'ENOENT') throw e; prices = { audit: { status: 'missing_file', accepted: 0 } }; }
    for (const s of this.suppliers) { (this.bySpeciality[s.speciality] ||= []).push(s); (this.byCity[s.city] ||= []).push(s); }
    this.trainingAudit = { suppliers: suppliers.audit, prices: prices.audit, provenance: 'unverified_csv', accuracyValidated: false };
    this.trained = true;
    return { suppliers: this.suppliers.length, priceRecords: this.materialPrices.length, audit: this.trainingAudit };
  }

  _requirements(requirements) {
    if (!requirements || typeof requirements !== 'object' || Array.isArray(requirements)) throw new TypeError('Invalid requirements');
    const numeric = { minRating: 5, maxDeliveryDays: Number.MAX_SAFE_INTEGER, minCompliance: 100, minContractYears: Number.MAX_SAFE_INTEGER };
    for (const [key,value] of Object.entries(requirements)) {
      if (Object.hasOwn(numeric,key)) { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > numeric[key]) throw new RangeError('Invalid ' + key); }
      else if (['material','unit','qualityGrade'].includes(key)) text(value,key);
      else throw new TypeError('Unsupported supplier requirement: ' + key);
    }
  }

  _prices(category, city, requirements = {}) {
    const mapped = canonical(category), categories = priceCategories[mapped] || [mapped];
    return this.materialPrices.filter(p => categories.includes(p.category) && (!city || p.city === city) &&
      (!requirements.material || p.material === requirements.material) &&
      (!requirements.unit || p.unit === csv.unit(requirements.unit)) &&
      (!requirements.qualityGrade || p.qualityGrade === requirements.qualityGrade));
  }

  _priceGroups(prices) {
    const grouped = new Map();
    for (const p of prices) {
      const key = JSON.stringify([p.material,p.unit,p.city,p.qualityGrade,p.priceDate,p.currency]);
      if (!grouped.has(key)) grouped.set(key,[]);
      grouped.get(key).push(p);
    }
    return [...grouped.values()].map(items => ({
      material: items[0].material, unit: items[0].unit, city: items[0].city, qualityGrade: items[0].qualityGrade,
      priceDate: items[0].priceDate, currency: items[0].currency, records: items.length,
      suppliers: new Set(items.map(p=>p.supplier)).size,
      prices: items.map(p=>({ supplier: p.supplier, city: p.city, price: p.price })),
      avgPrice: Math.round(items.reduce((s,p)=>s+p.price/items.length,0)*100)/100,
      minPrice: Math.min(...items.map(p=>p.price)), maxPrice: Math.max(...items.map(p=>p.price))
    })).sort((a,b)=>JSON.stringify([a.material,a.unit,a.city,a.qualityGrade,a.priceDate]).localeCompare(JSON.stringify([b.material,b.unit,b.city,b.qualityGrade,b.priceDate])));
  }

  findBestSupplier(category, city, requirements = {}) {
    category = text(category,'category');
    if (city != null) city = text(city,'city');
    this._requirements(requirements);
    if (!this.trained) return { error: 'Not trained' };
    const mapped = canonical(category);
    const prices = this._prices(category,city,requirements), priceGroups = this._priceGroups(prices);
    const candidates = this.suppliers.filter(s => s.speciality === mapped && (!city || s.city === city) &&
      s.rating >= (requirements.minRating ?? 0) && s.deliverySpeed <= (requirements.maxDeliveryDays ?? Number.MAX_SAFE_INTEGER) &&
      s.compliance >= (requirements.minCompliance ?? 0) && s.contractYears >= (requirements.minContractYears ?? 0) &&
      (!['material','unit','qualityGrade'].some(k=>requirements[k] != null) || prices.some(p=>p.supplier === s.name && p.city === s.city)));
    const scored = candidates.map(s => {
      const rating = s.rating / 5, delivery = Math.min(1,15/Math.max(1,s.deliverySpeed)), compliance = s.compliance / 100,
        experience = Math.min(1,s.contractYears/10), volume = Math.min(1,s.totalDeals/100);
      // Price availability does not establish a competitive price. Rank only the stated non-price criteria.
      const overall = (rating*0.20 + delivery*0.15 + compliance*0.15 + experience*0.15 + volume*0.10)/0.75;
      return { supplier: s.name, city: s.city, speciality: s.speciality, rating: s.rating, deliveryDays: s.deliverySpeed,
        compliance: s.compliance, totalDeals: s.totalDeals,
        priceRecords: prices.filter(p=>p.supplier === s.name && p.city === s.city).length,
        scores: { price: null, rating: Math.round(rating*100), delivery: Math.round(delivery*100), compliance: Math.round(compliance*100),
          experience: Math.round(experience*100), volume: Math.round(volume*100), overall: Math.round(overall*100) } };
    }).sort((a,b)=>b.scores.overall-a.scores.overall || a.supplier.localeCompare(b.supplier));
    return {
      category, city: city || 'All', status: scored.length ? 'matched' : 'no_match',
      topSupplier: scored[0] ? { name: scored[0].supplier, score: scored[0].scores.overall,
        reason: 'Highest heuristic non-price score among matching specialty, city and requirements' } : null,
      alternatives: scored.slice(1,4).map(s=>({name:s.supplier,score:s.scores.overall,rating:s.rating})), allCandidates: scored.slice(0,10),
      marketAvgPrice: priceGroups.length === 1 ? priceGroups[0].avgPrice : null,
      priceStatus: !priceGroups.length ? 'missing' : priceGroups.length === 1 ? 'single_comparable_group' : 'multiple_groups',
      priceGroups, totalSuppliers: candidates.length, totalPriceRecords: prices.length,
      requiresSupplierReview: true, requiresPriceReview: true, priceBasis: 'historical_csv_not_live_quote',
      confidence: 0, confidenceCalibrated: false
    };
  }

  comparePrices(category, city, requirements = {}) {
    category = text(category,'category');
    if (city != null) city = text(city,'city');
    this._requirements(requirements);
    return this._priceGroups(this._prices(category,city,requirements));
  }

  getMarketAnalysis(region) {
    const suppliers = region ? this.suppliers.filter(s => s.city === region) : this.suppliers;
    const specialities = {};
    suppliers.forEach(s => {
      specialities[s.speciality] = (specialities[s.speciality] || 0) + 1;
    });
    const avgRating = suppliers.reduce((s, sup) => s + sup.rating, 0) / Math.max(1, suppliers.length);
    return {
      totalSuppliers: suppliers.length,
      status: suppliers.length ? 'historical_observations' : 'no_data',
      requiresSupplierReview: true,
      averageRating: suppliers.length ? Math.round(avgRating * 10) / 10 : null,
      topSpecialities: Object.entries(specialities).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => ({ speciality: x[0], count: x[1] })),
      averageDelivery: suppliers.length ? Math.round(suppliers.reduce((s, sup) => s + sup.deliverySpeed, 0) / suppliers.length) : null,
      averageCompliance: suppliers.length ? Math.round(suppliers.reduce((s, sup) => s + sup.compliance, 0) / suppliers.length) : null,
      region: region || 'All Saudi Arabia'
    };
  }
}

module.exports = new SupplierIntelligence();

