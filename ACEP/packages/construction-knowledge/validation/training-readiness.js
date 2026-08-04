class TrainingReadinessReporter {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
  }

  generateReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {},
      details: {},
      recommendations: [],
      overall: 'pending',
    };

    if (this.kb.elementsV2) report.details.elements = this._assess(this.kb.elementsV2, 'Elements', 'elements_v2', 1000, ['id', 'name', 'category', 'unit', 'phases', 'codeRefs']);
    if (this.kb.boqItemsV2) report.details.boq = this._assess(this.kb.boqItemsV2, 'BOQ Items', 'boq_v2', 5000, ['id', 'code', 'description', 'unit', 'unitRate', 'materialCategory', 'division']);
    if (this.kb.materialsV2) report.details.materials = this._assess(this.kb.materialsV2, 'Materials', 'materials_v2', 300, ['id', 'name', 'grade', 'category', 'specs', 'referenceCodes']);
    if (this.kb.codesV2) report.details.codes = this._assess(this.kb.codesV2, 'Codes', 'codes_v2', 200, ['id', 'code', 'title', 'body', 'country']);

    if (this.kb.knowledgeGraph) {
      const nodes = this.kb.knowledgeGraph.getNodes ? this.kb.knowledgeGraph.getNodes() : [];
      const edges = this.kb.knowledgeGraph.getEdges ? this.kb.knowledgeGraph.getEdges() : [];
      report.details.knowledgeGraph = this._assess({ nodes, edges }, 'Knowledge Graph', 'graph', 50000, ['nodes', 'edges']);
    }

    let totalScore = 0;
    let totalWeight = 0;
    const weights = { elements: 25, boq: 25, materials: 15, codes: 15, knowledgeGraph: 20 };

    for (const [key, detail] of Object.entries(report.details)) {
      const w = weights[key] || 10;
      totalScore += detail.readinessScore * w / 100;
      totalWeight += w;
    }

    report.summary = {
      readinessScore: Math.round(totalScore / totalWeight * 10000) / 100,
      datasetsAssessed: Object.keys(report.details).length,
      datasetsReady: Object.values(report.details).filter(d => d.isReady).length,
      totalCount: Object.values(report.details).reduce((s, d) => s + (d.count || 0), 0),
      totalErrors: Object.values(report.details).reduce((s, d) => s + (d.errors || 0), 0),
    };

    report.overall = report.summary.readinessScore >= 0.8 ? 'ready' : report.summary.readinessScore >= 0.5 ? 'needs_work' : 'not_ready';

    if (report.summary.datasetsReady < Object.keys(report.details).length) {
      const notReady = Object.entries(report.details).filter(([k, v]) => !v.isReady).map(([k]) => k);
      report.recommendations.push(`Improve: ${notReady.join(', ')}`);
    }
    if (report.summary.totalErrors > 0) {
      report.recommendations.push(`Fix ${report.summary.totalErrors} validation errors before training`);
    }
    if (report.summary.readinessScore < 0.6) {
      report.recommendations.push('Expand dataset size and fix missing fields');
    }
    report.recommendations.push('Run validation engine before each training cycle');

    return report;
  }

  _assess(data, name, key, minTarget, requiredFields) {
    let count = 0;
    let errors = 0;
    const fieldsPresent = {};

    if (Array.isArray(data)) {
      count = data.length;
      for (const item of data) {
        for (const f of requiredFields) {
          if (item[f] != null && item[f] !== '') fieldsPresent[f] = (fieldsPresent[f] || 0) + 1;
        }
      }
    } else if (data && data.items) {
      count = data.items.length;
      for (const item of data.items) {
        for (const f of requiredFields) {
          if (item[f] != null && item[f] !== '') fieldsPresent[f] = (fieldsPresent[f] || 0) + 1;
        }
      }
    } else if (data && data.nodes && data.edges) {
      count = (data.nodes.length || 0) + (data.edges.length || 0);
      fieldsPresent.nodes = data.nodes.length;
      fieldsPresent.edges = data.edges.length;
    }

    const fieldCompleteness = {};
    for (const f of requiredFields) {
      const present = fieldsPresent[f] || 0;
      fieldCompleteness[f] = count > 0 ? present / count : 0;
    }
    const avgCompleteness = Object.values(fieldCompleteness).reduce((s, v) => s + v, 0) / requiredFields.length;

    let sizeScore = count >= minTarget ? 1 : count / minTarget;
    let completenessScore = avgCompleteness;
    let readinessScore = sizeScore * 0.4 + completenessScore * 0.6;

    return {
      count,
      errors,
      minTarget,
      sizeScore: Math.round(sizeScore * 100) / 100,
      completenessScore: Math.round(completenessScore * 100) / 100,
      readinessScore: Math.round(readinessScore * 100) / 100,
      isReady: readinessScore >= 0.7,
      fieldCompleteness,
    };
  }
}
module.exports = { TrainingReadinessReporter };
