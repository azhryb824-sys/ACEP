/**
 * Standard Quantities — Reference quantities per project type per m2
 * @deprecated Superseded by knowledge-dataset-loader.js (real CSV data).
 * Keep for reference only.
 */
const FIELD_MAP = {
  concrete: 'concrete',
  steel: 'steel',
  blocks: 'block',
  tiles: 'tiles',
  paint: 'paint',
  electricalPoints: 'wiring',
  plumbingPoints: 'piping',
};

class StandardQuantities {
  constructor(datasetLoader) {
    this.loader = datasetLoader || null;
    this.data = this._load();
    this._datasetLoaded = false;
  }

  _load() {
    return {
      Villa: { concrete: 0.24, steel: 0.024, block: 0.65, plaster: 2.5, paint: 1.8, tiles: 0.85, piping: 0.12, wiring: 2.5, formwork: 2.8, excavation: 1.2, backfill: 0.6, waterproofing: 0.3, doors: 0.015, windows: 0.012 },
      Luxury_Villa: { concrete: 0.26, steel: 0.028, block: 0.55, plaster: 2.8, paint: 2.0, tiles: 1.0, piping: 0.15, wiring: 3.0, formwork: 3.0, excavation: 1.3, backfill: 0.6, waterproofing: 0.35, doors: 0.012, windows: 0.01 },
      Apartment_Building: { concrete: 0.30, steel: 0.030, block: 0.70, plaster: 3.0, paint: 2.2, tiles: 0.90, piping: 0.14, wiring: 3.2, formwork: 3.2, excavation: 1.5, backfill: 0.7, waterproofing: 0.35, doors: 0.018, windows: 0.014 },
      Residential_Tower: { concrete: 0.33, steel: 0.038, block: 0.50, plaster: 2.5, paint: 1.8, tiles: 0.70, piping: 0.12, wiring: 3.5, formwork: 3.5, excavation: 2.0, backfill: 0.8, waterproofing: 0.30, doors: 0.015, windows: 0.012 },
      Hotel: { concrete: 0.32, steel: 0.035, block: 0.60, plaster: 3.0, paint: 2.5, tiles: 1.2, piping: 0.20, wiring: 4.0, formwork: 3.2, excavation: 1.5, backfill: 0.5, waterproofing: 0.40, doors: 0.02, windows: 0.015 },
      Hospital: { concrete: 0.40, steel: 0.045, block: 0.55, plaster: 3.5, paint: 3.0, tiles: 1.5, piping: 0.35, wiring: 5.0, formwork: 4.0, excavation: 2.0, backfill: 0.7, waterproofing: 0.50, doors: 0.025, windows: 0.018 },
      School: { concrete: 0.26, steel: 0.025, block: 0.75, plaster: 3.0, paint: 2.5, tiles: 1.0, piping: 0.10, wiring: 2.5, formwork: 2.8, excavation: 1.2, backfill: 0.5, waterproofing: 0.25, doors: 0.02, windows: 0.015 },
      Office_Building: { concrete: 0.28, steel: 0.030, block: 0.50, plaster: 2.5, paint: 2.0, tiles: 1.1, piping: 0.12, wiring: 3.5, formwork: 2.8, excavation: 1.5, backfill: 0.6, waterproofing: 0.30, doors: 0.015, windows: 0.018 },
      Mall: { concrete: 0.28, steel: 0.032, block: 0.40, plaster: 2.0, paint: 1.5, tiles: 1.8, piping: 0.15, wiring: 4.0, formwork: 2.5, excavation: 2.0, backfill: 0.8, waterproofing: 0.40, doors: 0.01, windows: 0.025 },
      Factory: { concrete: 0.20, steel: 0.022, block: 0.30, plaster: 1.0, paint: 0.8, tiles: 0.30, piping: 0.08, wiring: 2.0, formwork: 1.5, excavation: 2.5, backfill: 1.5, waterproofing: 0.15, doors: 0.005, windows: 0.005 },
      Warehouse: { concrete: 0.15, steel: 0.018, block: 0.20, plaster: 0.5, paint: 0.5, tiles: 0.15, piping: 0.05, wiring: 1.0, formwork: 1.0, excavation: 1.5, backfill: 1.0, waterproofing: 0.10, doors: 0.003, windows: 0.003 },
      Mosque: { concrete: 0.22, steel: 0.024, block: 0.55, plaster: 3.0, paint: 2.0, tiles: 1.5, piping: 0.08, wiring: 2.0, formwork: 2.5, excavation: 1.0, backfill: 0.4, waterproofing: 0.30, doors: 0.008, windows: 0.01 },
      Data_Center: { concrete: 0.28, steel: 0.035, block: 0.35, plaster: 1.5, paint: 1.0, tiles: 0.60, piping: 0.10, wiring: 6.0, formwork: 2.5, excavation: 1.8, backfill: 0.6, waterproofing: 0.50, doors: 0.008, windows: 0.002 },
    };
  }

  loadFromDataset() {
    if (this._datasetLoaded || !this.loader) return;
    const sq = this.loader.getStandardQuantities();
    if (!sq || !sq.data) return;

    for (const [type, info] of Object.entries(sq.data)) {
      const perM2 = info.perM2;
      if (!perM2) continue;

      const mapped = {};
      let hasData = false;
      for (const [csvField, targetField] of Object.entries(FIELD_MAP)) {
        const stat = perM2[csvField];
        if (stat && stat.mean > 0) {
          mapped[targetField] = Math.round(stat.mean * 10000) / 10000;
          hasData = true;
        }
      }

      if (hasData) {
        if (!this.data[type]) this.data[type] = { ...this.data.Villa };
        Object.assign(this.data[type], mapped);
      }
    }

    this._datasetLoaded = true;
    console.log(`[SQ] Loaded ${Object.keys(sq.data).length} project types from dataset`);
  }

  getQuantities(type) {
    if (!this._datasetLoaded) this.loadFromDataset();
    return this.data[type] || this.data.Villa;
  }

  estimateMaterial(type, area) {
    const q = this.getQuantities(type);
    const result = {};
    for (const [material, rate] of Object.entries(q)) {
      result[material] = Math.round(rate * area * 100) / 100;
    }
    return result;
  }

  compareWithStandard(type, actualQuantities, area) {
    const standard = this.estimateMaterial(type, area);
    const comparison = {};
    for (const [material, stdQty] of Object.entries(standard)) {
      const actual = actualQuantities[material];
      if (actual !== undefined) {
        const diff = actual - stdQty;
        const pct = stdQty > 0 ? Math.round((diff / stdQty) * 100) : 0;
        comparison[material] = { standard: stdQty, actual, diff: Math.round(diff * 100) / 100, variance: pct, flag: Math.abs(pct) > 20 ? 'high' : Math.abs(pct) > 10 ? 'medium' : 'normal' };
      }
    }
    return comparison;
  }

  getAllTypes() { return Object.keys(this.data); }
}

module.exports = StandardQuantities;
