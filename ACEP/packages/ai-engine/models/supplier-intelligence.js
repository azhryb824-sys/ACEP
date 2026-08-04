const fs = require('fs');
const path = require('path');

class SupplierIntelligence {
  constructor() {
    this.trained = false;
    this.suppliers = [];
    this.materialPrices = [];
    this.bySpeciality = {};
    this.byCity = {};
  }

  async train(supplierPath, materialPath) {
    this.bySpeciality = {};
    this.byCity = {};
    const baseDir = path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv');

    try {
      const sp = supplierPath || path.join(baseDir, 'suppliers.csv');
      this.suppliers = fs.readFileSync(sp, 'utf8').trim().split('\n').slice(1).map(l => {
        const c = l.split(',');
        return {
          name: c[0], city: c[1], speciality: c[2] || 'General',
          rating: parseFloat(c[3]) || 0, deliverySpeed: parseInt(c[4]) || 0,
          contractYears: parseInt(c[5]) || 0, compliance: parseFloat(c[6]) || 0,
          totalDeals: parseInt(c[7]) || 0
        };
      });
    } catch (e) { this.suppliers = []; }

    try {
      const mp = materialPath || path.join(baseDir, 'material_prices.csv');
      this.materialPrices = fs.readFileSync(mp, 'utf8').trim().split('\n').slice(1).map(l => {
        const c = l.split(',');
        return { material: c[0], category: c[1], unit: c[2], city: c[3], supplier: c[4], price: parseFloat(c[5]) || 0 };
      }).filter(m => m.price > 0);
    } catch (e) { this.materialPrices = []; }

    for (const s of this.suppliers) {
      const spec = s.speciality || 'General';
      if (!this.bySpeciality[spec]) this.bySpeciality[spec] = [];
      this.bySpeciality[spec].push(s);
      if (!this.byCity[s.city]) this.byCity[s.city] = [];
      this.byCity[s.city].push(s);
    }

    this.trained = true;
    return { suppliers: this.suppliers.length, priceRecords: this.materialPrices.length };
  }

  findBestSupplier(category, city, requirements = {}) {
    if (!this.trained) return { error: 'Not trained' };
    const categoryMap = {
      'Concrete': 'Concrete', 'Steel': 'Steel', 'Block': 'Block', 'Cement': 'Cement',
      'Tiles': 'Ceramic', 'Ceramic': 'Ceramic', 'Marble': 'Marble', 'Paint': 'Paint',
      'Doors': 'Wood', 'Windows': 'Aluminum', 'Aluminum': 'Aluminum',
      'Plumbing': 'Plumbing', 'Electrical': 'Electrical', 'HVAC': 'HVAC',
      'Waterproofing': 'Waterproofing', 'Glass': 'Glass', 'Aggregate': 'Aggregate',
      'General': 'General Construction', 'Finishing': 'Finishing',
      'Structural': 'Structural', 'MEP': 'MEP'
    };
    const mapped = categoryMap[category] || category;

    let candidates = this.suppliers.filter(s => {
      const specMatch = s.speciality === mapped || s.speciality.includes(mapped) || mapped.includes(s.speciality);
      const cityMatch = !city || s.city === city;
      return specMatch || cityMatch;
    });

    if (candidates.length === 0) {
      candidates = this.suppliers.filter(s => s.speciality === 'General Construction' || s.speciality === 'General');
    }
    if (candidates.length === 0) candidates = this.suppliers;

    const prices = this.materialPrices.filter(m => m.category === category || m.category === mapped);
    const avgPrice = prices.length > 0 ? prices.reduce((s, p) => s + p.price, 0) / prices.length : 0;

    const scored = candidates.map(s => {
      const priceScore = prices.filter(p => p.supplier === s.name).length > 0 ? 0.8 : 0.5;
      const ratingScore = s.rating / 5;
      const deliveryScore = Math.min(1, 15 / Math.max(1, s.deliverySpeed));
      const complianceScore = s.compliance / 100;
      const experienceScore = Math.min(1, s.contractYears / 10);
      const volumeScore = Math.min(1, s.totalDeals / 100);

      const totalScore = priceScore * 0.25 + ratingScore * 0.20 + deliveryScore * 0.15 +
                         complianceScore * 0.15 + experienceScore * 0.15 + volumeScore * 0.10;

      return {
        supplier: s.name, city: s.city, speciality: s.speciality,
        rating: s.rating, deliveryDays: s.deliverySpeed,
        compliance: s.compliance, totalDeals: s.totalDeals,
        scores: {
          price: Math.round(priceScore * 100),
          rating: Math.round(ratingScore * 100),
          delivery: Math.round(deliveryScore * 100),
          compliance: Math.round(complianceScore * 100),
          experience: Math.round(experienceScore * 100),
          volume: Math.round(volumeScore * 100),
          overall: Math.round(totalScore * 100)
        }
      };
    }).sort((a, b) => b.scores.overall - a.scores.overall);

    return {
      category, city: city || 'All',
      topSupplier: scored[0] ? {
        name: scored[0].supplier, score: scored[0].scores.overall,
        reason: `Best overall score: rating ${scored[0].rating}/5, ${scored[0].deliveryDays} days delivery, ${scored[0].compliance}% compliance`
      } : null,
      alternatives: scored.slice(1, 4).map(s => ({ name: s.supplier, score: s.scores.overall, rating: s.rating })),
      allCandidates: scored.slice(0, 10),
      marketAvgPrice: Math.round(avgPrice),
      totalSuppliers: candidates.length,
      totalPriceRecords: prices.length
    };
  }

  comparePrices(category) {
    const prices = this.materialPrices.filter(m => m.category === category);
    const grouped = {};
    prices.forEach(p => {
      if (!grouped[p.material]) grouped[p.material] = [];
      grouped[p.material].push(p);
    });
    return Object.entries(grouped).map(([name, items]) => ({
      material: name,
      unit: items[0].unit,
      suppliers: items.length,
      prices: items.map(i => ({ supplier: i.supplier, city: i.city, price: i.price })),
      avgPrice: Math.round(items.reduce((s, i) => s + i.price, 0) / items.length),
      minPrice: Math.round(Math.min(...items.map(i => i.price))),
      maxPrice: Math.round(Math.max(...items.map(i => i.price)))
    })).sort((a, b) => a.avgPrice - b.avgPrice);
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
      averageRating: Math.round(avgRating * 10) / 10,
      topSpecialities: Object.entries(specialities).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => ({ speciality: x[0], count: x[1] })),
      averageDelivery: Math.round(suppliers.reduce((s, sup) => s + sup.deliverySpeed, 0) / Math.max(1, suppliers.length)),
      averageCompliance: Math.round(suppliers.reduce((s, sup) => s + sup.compliance, 0) / Math.max(1, suppliers.length)),
      region: region || 'All Saudi Arabia'
    };
  }
}

module.exports = new SupplierIntelligence();
