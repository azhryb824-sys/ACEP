class ContinuousLearning {
  constructor(kb) {
    this.kb = kb;
    this.history = [];
    this.learningRate = 0.05;
  }

  recordProject(projectData, results) {
    const record = {
      projectId: projectData.projectId || `proj_${Date.now()}`,
      type: projectData.type,
      area: projectData.area,
      floors: projectData.floors,
      style: projectData.style,
      results,
      timestamp: new Date().toISOString(),
    };
    this.history.push(record);
    this._updateKnowledge(record);
    return record;
  }

  _updateKnowledge(record) {
    const { type, area, floors } = record;
    if (record.results?.boq?.items) {
      const boqData = this.kb.getBOQData();
      if (boqData) {
        for (const item of record.results.boq.items) {
          const existing = boqData.getByCode(item.code);
          if (existing) {
            const newPrice = existing.unitPrice * (1 - this.learningRate) + (item.unitPrice || existing.unitPrice) * this.learningRate;
            boqData.updateItem(item.code, { unitPrice: Math.round(newPrice) });
          }
        }
      }
    }

    const materials = this.kb._getDataRefs().materials;
    if (record.results?.cost?.breakdown?.materials && materials) {
      const totalMatCost = record.results.cost.breakdown.materials;
      for (const mat of Object.values(materials)) {
        const oldTotal = mat.avgPrice * area * floors;
        const ratio = totalMatCost / oldTotal;
        if (ratio > 0 && ratio < 10) {
          Object.assign(mat, { avgPrice: Math.round(mat.avgPrice * (1 - this.learningRate + ratio * this.learningRate)) });
        }
      }
    }

    const projectTypes = this.kb._getDataRefs().projectTypes;
    if (projectTypes?.[type]) {
      const pt = projectTypes[type];
      const expectedComplexity = pt.complexity;
      const actualComplexity = record.results?.projectUnderstanding?.complexity || expectedComplexity;
      Object.assign(pt, { complexity: Math.round(expectedComplexity * 0.95 + actualComplexity * 0.05) });
    }

    this.kb._version++;
    this.kb._lastUpdated = new Date().toISOString();
  }

  getLearningStats() {
    return {
      totalProjects: this.history.length,
      lastUpdate: this.kb._lastUpdated,
      version: this.kb._version,
      learningRate: this.learningRate,
    };
  }

  getRecentProjects(limit = 10) {
    return this.history.slice(-limit).reverse();
  }
}

module.exports = { ContinuousLearning };
