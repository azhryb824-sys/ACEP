class UnifiedKnowledgeBase {
  constructor(knowledgeDataset, trainingBridge, acepKnowledgeBase, knowledgeEngine) {
    this.dataset = knowledgeDataset;
    this.bridge = trainingBridge;
    this.acepKB = acepKnowledgeBase;
    this.knowledgeEngine = knowledgeEngine;
    this._queryCache = new Map();
  }

  query(options = {}) {
    const cacheKey = JSON.stringify(options);
    if (this._queryCache.has(cacheKey)) return this._queryCache.get(cacheKey);

    const { type, city, region, finishing, minArea, maxArea, minFloors, maxFloors, limit = 20 } = options;
    const results = [];

    const projects = this.bridge?.data?.projects || [];
    for (const p of projects) {
      if (type && p.projectType !== type) continue;
      if (city && p.city !== city) continue;
      if (region && p.region !== region) continue;
      if (finishing && p.finishingLevel !== finishing) continue;
      if (minArea && (p.buildingArea || 0) < minArea) continue;
      if (maxArea && (p.buildingArea || 0) > maxArea) continue;
      if (minFloors && (p.floors || 0) < minFloors) continue;
      if (maxFloors && (p.floors || 0) > maxFloors) continue;

      results.push({
        projectId: p.projectId,
        type: p.projectType,
        city: p.city,
        region: p.region,
        area: p.buildingArea,
        floors: p.floors,
        finishing: p.finishingLevel,
        cost: p.estimatedCost,
        duration: p.duration,
        source: 'csv_training',
      });
    }

    const recorded = this.knowledgeEngine?.getRecordedProjects?.({ type, minArea, maxArea, limit }) || [];
    for (const r of recorded) {
      results.push({
        projectId: r.id,
        type: r.type,
        city: r.physical?.city,
        area: r.physical?.area,
        floors: r.physical?.floors,
        cost: r.cost?.totalCost,
        duration: r.schedule?.totalMonths,
        source: 'kb_recorded',
      });
    }

    const sorted = results.sort((a, b) => (b.area || 0) - (a.area || 0));
    const trimmed = sorted.slice(0, limit);
    const result = { total: results.length, returned: trimmed.length, results: trimmed };
    this._queryCache.set(cacheKey, result);
    return result;
  }

  getSummary(type) {
    const sq = this.dataset.getStandardQuantities(type);
    const understanding = this.dataset.getProjectUnderstanding(type);
    const unitPrices = sq ? Object.keys(sq.data).length : 0;
    const projectInfo = this.query({ type, limit: 5 });

    return {
      type,
      standardQuantities: sq || null,
      understanding: understanding || null,
      recentProjects: projectInfo,
      sourceCounts: {
        csvProjects: this.bridge?.data?.projects?.filter(p => p.projectType === type).length || 0,
        recordedProjects: this.knowledgeEngine?.getRecordedProjects?.({ type }).length || 0,
      },
    };
  }

  search(query) {
    const lowQuery = (query || '').toLowerCase();
    if (!lowQuery) return { total: 0, results: [] };

    const results = [];

    const projectTypes = this.dataset.getStandardQuantities().projectTypes || [];
    for (const t of projectTypes) {
      if (t.toLowerCase().includes(lowQuery)) {
        results.push({ type: 'projectType', name: t, source: 'standard_quantities' });
      }
    }

    const items = this.dataset.getUnitPrices();
    for (const [code, info] of Object.entries(items)) {
      if (code.toLowerCase().includes(lowQuery) || (info.description || '').toLowerCase().includes(lowQuery)) {
        results.push({ type: 'boqItem', code, description: info.description, avgPrice: info.avgPrice, source: 'unit_prices' });
      }
    }

    const materials = this.dataset.getMaterialPrice(null);
    if (materials && materials.data) {
      for (const [name] of Object.entries(materials.data)) {
        if (name.toLowerCase().includes(lowQuery)) {
          results.push({ type: 'material', name, source: 'material_prices' });
        }
      }
    }

    return { total: results.length, results: results.slice(0, 50) };
  }

  getStatistics() {
    const sq = this.dataset.getStandardQuantities();
    const bridgeData = this.bridge?.data;

    return {
      knowledgeSources: {
        csvProjects: bridgeData?.projects?.length || 0,
        csvBOQItems: bridgeData?.boqItems?.length || 0,
        csvMaterialPrices: bridgeData?.materialPrices?.length || 0,
        csvLaborRates: bridgeData?.laborRates?.length || 0,
        csvEquipmentRates: bridgeData?.equipmentRates?.length || 0,
        csvSuppliers: bridgeData?.suppliers?.length || 0,
        csvRisks: bridgeData?.risks?.length || 0,
        csvQualityDefects: bridgeData?.qualityDefects?.length || 0,
        recordedProjects: this.knowledgeEngine?.getStatistics?.()?.totalProjects || 0,
      },
      projectTypes: sq.projectTypes.length,
      boqItemsWithPrices: Object.keys(this.dataset.getUnitPrices()).length,
      cacheSize: this._queryCache.size,
    };
  }

  clearCache() {
    this._queryCache.clear();
  }
}

module.exports = UnifiedKnowledgeBase;
