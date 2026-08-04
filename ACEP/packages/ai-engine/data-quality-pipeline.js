class DataQualityPipeline {
  constructor(standards, trainingBridge, knowledgeDataset) {
    this.standards = standards;
    this.bridge = trainingBridge;
    this.dataset = knowledgeDataset;
    this._history = [];
  }

  runFullCheck() {
    const data = this.bridge.data;
    if (!data) return { ok: false, error: 'No training data loaded' };

    const checks = {
      schemaCompliance: this._checkSchemaCompliance(data),
      completeness: this._checkCompleteness(data),
      anomalyDetection: this._detectAnomalies(data),
      consistency: this._checkConsistency(data),
      freshness: this._checkFreshness(data),
    };

    const overall = this._computeOverall(checks);

    const result = { timestamp: new Date().toISOString(), overall, checks };
    this._history.push(result);
    return result;
  }

  runUETSCheck(uets) {
    if (!uets) return { ok: false, error: 'UETS not configured' };

    let egts = [];
    try { egts = uets.getAllEGT ? uets.getAllEGT() : (uets.core ? uets.core.getAll() : []); } catch { egts = []; }

    const schemaIssues = [];
    const consistencyIssues = [];
    let completenessSum = 0;
    let completenessCount = 0;

    for (const egt of egts) {
      const r = this.standards.validateEGT(egt);
      if (!r.valid) schemaIssues.push({ uuid: egt.uuid, errors: r.errors });

      if (egt.boq && egt.boq.length > 0 && egt.cost && egt.cost.total > 0) {
        const boqTotal = egt.boq.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 0), 0);
        const ratio = boqTotal / egt.cost.total;
        if (ratio < 0.3 || ratio > 1.7) consistencyIssues.push({ uuid: egt.uuid, type: 'boq_vs_cost', ratio: Math.round(ratio * 100) / 100 });
      }
      if (egt.schedule && egt.schedule.totalDurationMonths <= 0 && egt.cost && egt.cost.total > 0) {
        consistencyIssues.push({ uuid: egt.uuid, type: 'cost_vs_schedule' });
      }

      const comp = uets.calculateCompleteness ? uets.calculateCompleteness(egt) : null;
      if (comp && typeof comp === 'object' && comp.score !== undefined) {
        completenessSum += comp.score;
        completenessCount++;
      } else if (typeof comp === 'number') {
        completenessSum += comp;
        completenessCount++;
      }
    }

    const total = egts.length;
    const schemaValid = total - schemaIssues.length;
    const avgCompleteness = completenessCount > 0 ? Math.round((completenessSum / completenessCount) * 100) / 100 : 0;
    const consistencyRate = total > 0 ? Math.round(((total - consistencyIssues.length) / total) * 100) : 100;

    const result = {
      ok: true,
      timestamp: new Date().toISOString(),
      totalEGTs: total,
      schemaComplianceRate: total > 0 ? Math.round((schemaValid / total) * 10000) / 100 : 100,
      schemaIssues: schemaIssues.slice(0, 20),
      avgCompleteness,
      consistencyRate,
      consistencyIssues: consistencyIssues.slice(0, 20),
      coverage: uets.checkCoverage ? uets.checkCoverage() : null,
    };
    this._history.push({ timestamp: result.timestamp, uetsCheck: result });
    return result;
  }

  checkProjectData(project) {
    const issues = [];
    const ext = project.extracted || {};
    const boq = project.boq || { items: [] };
    const cost = project.cost || {};

    if (!ext.type) issues.push({ severity: 'error', category: 'completeness', message: 'Project type missing' });
    if (!ext.area) issues.push({ severity: 'error', category: 'completeness', message: 'Area missing' });
    if (!ext.floors) issues.push({ severity: 'error', category: 'completeness', message: 'Floors missing' });
    if (ext.area && ext.floors && ext.area * ext.floors > 1000000) issues.push({ severity: 'warning', category: 'anomaly', message: `Total area ${ext.area * ext.floors} m² seems extremely large` });
    if (ext.floors && ext.floors > 100) issues.push({ severity: 'warning', category: 'anomaly', message: `${ext.floors} floors is unusually high` });

    const zeroPriceItems = boq.items.filter(i => !i.unitPrice || i.unitPrice === 0);
    if (zeroPriceItems.length > boq.items.length * 0.5) issues.push({ severity: 'error', category: 'quality', message: `${zeroPriceItems.length}/${boq.items.length} BOQ items have zero unit price` });

    if (cost.totalCost && ext.area) {
      const cpm = cost.totalCost / ext.area;
      if (cpm < 200) issues.push({ severity: 'warning', category: 'anomaly', message: `Cost per m² (${Math.round(cpm)} SAR) is very low` });
      if (cpm > 50000) issues.push({ severity: 'warning', category: 'anomaly', message: `Cost per m² (${Math.round(cpm)} SAR) is very high` });
    }

    const schedule = project.schedule || {};
    if (schedule.totalDuration && schedule.totalDuration < 7) issues.push({ severity: 'warning', category: 'anomaly', message: `Schedule (${schedule.totalDuration} days) seems too short` });

    return { projectId: project.id, issues, issueCount: issues.length, criticalCount: issues.filter(i => i.severity === 'error').length };
  }

  detectAnomaliesInDataset() {
    const data = this.bridge.data;
    if (!data) return { ok: false, error: 'No data' };
    const anomalies = [];

    const projects = data.projects || [];
    const boqItems = data.boqItems || [];

    const typeGroups = {};
    for (const p of projects) {
      const t = p.projectType || 'Unknown';
      if (!typeGroups[t]) typeGroups[t] = [];
      typeGroups[t].push(p);
    }

    for (const [type, list] of Object.entries(typeGroups)) {
      if (list.length < 10) continue;
      const areas = list.filter(p => p.buildingArea > 0).map(p => p.buildingArea);
      const costs = list.filter(p => p.estimatedCost > 0).map(p => p.estimatedCost);

      if (areas.length > 5) {
        const mean = areas.reduce((a, b) => a + b, 0) / areas.length;
        const std = Math.sqrt(areas.reduce((s, v) => s + (v - mean) ** 2, 0) / areas.length);
        for (const p of list) {
          if (p.buildingArea > 0 && Math.abs(p.buildingArea - mean) > 3 * std) {
            anomalies.push({ type: 'outlier', entity: 'project', id: p.projectId, field: 'buildingArea', value: p.buildingArea, expected: `${Math.round(mean)}±${Math.round(std)}`, severity: 'warning' });
          }
        }
      }

      if (costs.length > 5) {
        const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
        const std = Math.sqrt(costs.reduce((s, v) => s + (v - mean) ** 2, 0) / costs.length);
        for (const p of list) {
          if (p.estimatedCost > 0 && Math.abs(p.estimatedCost - mean) > 3 * std) {
            anomalies.push({ type: 'outlier', entity: 'project', id: p.projectId, field: 'estimatedCost', value: p.estimatedCost, expected: `${Math.round(mean)}±${Math.round(std)}`, severity: 'info' });
          }
        }
      }
    }

    const priceGroups = {};
    for (const item of boqItems) {
      const code = item.itemCode || 'Unknown';
      if (!priceGroups[code]) priceGroups[code] = [];
      priceGroups[code].push(item);
    }

    for (const [code, items] of Object.entries(priceGroups)) {
      if (items.length < 10) continue;
      const prices = items.filter(i => (i.unitPrice || 0) > 0).map(i => i.unitPrice);
      if (prices.length < 10) continue;
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const std = Math.sqrt(prices.reduce((s, v) => s + (v - mean) ** 2, 0) / prices.length);
      for (const item of items) {
        if (item.unitPrice > 0 && Math.abs(item.unitPrice - mean) > 3 * std) {
          anomalies.push({ type: 'price_anomaly', entity: 'boqItem', id: `${item.projectId}:${item.itemCode}`, field: 'unitPrice', value: item.unitPrice, expected: `${Math.round(mean)}±${Math.round(std)}`, severity: 'warning' });
        }
      }
    }

    return { totalAnomalies: anomalies.length, anomalies: anomalies.slice(0, 100) };
  }

  normalizeProjectData(project) {
    const ext = project.extracted || {};
    const cleaned = { changes: [], projectId: project.id };

    if (ext.area && ext.area > 1000000) {
      cleaned.changes.push({ field: 'area', from: ext.area, to: ext.area / 1000, reason: 'Area seems unrealistically large, divided by 1000' });
      ext.area = ext.area / 1000;
    }
    if (ext.floors && ext.floors > 200) {
      cleaned.changes.push({ field: 'floors', from: ext.floors, to: 1, reason: 'Floor count unrealistically high, reset to 1' });
      ext.floors = 1;
    }

    return cleaned;
  }

  _checkSchemaCompliance(data) {
    const entityMap = {
      projects: 'project', boqItems: 'boqItem', materialPrices: 'materialPrice',
      laborRates: 'laborRate', equipmentRates: 'equipmentRate', suppliers: 'supplier',
      risks: 'risk', qualityDefects: 'qualityDefect',
    };
    const results = {};
    for (const [entityType, items] of Object.entries(data)) {
      if (!Array.isArray(items) || items.length === 0) continue;
      const schemaName = entityMap[entityType] || entityType;
      const schema = this.standards.getSchema(schemaName);
      if (!schema) continue;

      let validCount = 0;
      let errorCount = 0;
      for (const item of items) {
        const r = this.standards.validate(schemaName, item);
        if (r.valid) validCount++; else errorCount++;
      }
      results[entityType] = { total: items.length, valid: validCount, invalid: errorCount, complianceRate: items.length > 0 ? Math.round(validCount / items.length * 10000) / 100 : 0 };
    }
    return results;
  }

  _checkCompleteness(data) {
    const entityMap = {
      projects: 'project', boqItems: 'boqItem', materialPrices: 'materialPrice',
      laborRates: 'laborRate', equipmentRates: 'equipmentRate', suppliers: 'supplier',
      risks: 'risk', qualityDefects: 'qualityDefect',
    };
    const results = {};
    for (const [entityType, items] of Object.entries(data)) {
      if (!Array.isArray(items)) continue;
      const schemaName = entityMap[entityType] || entityType;
      const schema = this.standards.getSchema(schemaName);
      if (!schema) continue;

      const requiredFields = Object.entries(schema.fields).filter(([, r]) => r.required).map(([k]) => k);
      let completeCount = 0;
      for (const item of items) {
        const missing = requiredFields.filter(f => item[f] === undefined || item[f] === null || item[f] === '');
        if (missing.length === 0) completeCount++;
      }
      results[entityType] = { total: items.length, complete: completeCount, incomplete: items.length - completeCount, completenessRate: items.length > 0 ? Math.round(completeCount / items.length * 10000) / 100 : 0 };
    }
    return results;
  }

  _detectAnomalies(data) {
    const anomalies = [];
    const projects = data.projects || [];

    const typeAreas = {};
    for (const p of projects) {
      const t = p.projectType || 'Unknown';
      if (!typeAreas[t]) typeAreas[t] = { areas: [], costs: [] };
      if (p.buildingArea > 0) typeAreas[t].areas.push(p.buildingArea);
      if (p.estimatedCost > 0) typeAreas[t].costs.push(p.estimatedCost);
    }

    for (const [type, stats] of Object.entries(typeAreas)) {
      if (stats.areas.length >= 10) {
        const mean = stats.areas.reduce((a, b) => a + b, 0) / stats.areas.length;
        const std = Math.sqrt(stats.areas.reduce((s, v) => s + (v - mean) ** 2, 0) / stats.areas.length);
        anomalies.push({ type, sampleCount: stats.areas.length, meanArea: Math.round(mean), stdArea: Math.round(std), anomalyThreshold: Math.round(mean + 3 * std) });
      }
    }

    return anomalies;
  }

  _checkConsistency(data) {
    const issues = [];
    const projects = data.projects || [];
    const boqItems = data.boqItems || [];

    const projTotals = {};
    for (const item of boqItems) {
      const pid = item.projectId;
      if (!pid) continue;
      if (!projTotals[pid]) projTotals[pid] = { count: 0, totalCost: 0 };
      projTotals[pid].count++;
      projTotals[pid].totalCost += (item.unitPrice || 0) * (item.quantity || 0);
    }

    for (const p of projects) {
      const boqInfo = projTotals[p.projectId];
      if (!boqInfo || boqInfo.count < 5) continue;
      if (p.estimatedCost > 0) {
        const ratio = boqInfo.totalCost / p.estimatedCost;
        if (ratio < 0.3 || ratio > 1.7) {
          issues.push({ projectId: p.projectId, type: 'cost_mismatch', boqTotal: Math.round(boqInfo.totalCost), estimatedCost: Math.round(p.estimatedCost), ratio: Math.round(ratio * 100) / 100, severity: 'warning' });
        }
      }
    }

    return { issues, issueCount: issues.length };
  }

  _checkFreshness(data) {
    const now = Date.now();
    const year = new Date().getFullYear();
    const projects = data.projects || [];
    const oldProjects = projects.filter(p => p.year && p.year < year - 5);
    return {
      totalProjects: projects.length,
      projectsOlderThan5Years: oldProjects.length,
      oldestYear: projects.length > 0 ? Math.min(...projects.filter(p => p.year).map(p => p.year)) : null,
      newestYear: projects.length > 0 ? Math.max(...projects.filter(p => p.year).map(p => p.year)) : null,
    };
  }

  _computeOverall(checks) {
    const schemaRates = Object.values(checks.schemaCompliance || {}).map(s => s.complianceRate || 0);
    const completenessRates = Object.values(checks.completeness || {}).map(s => s.completenessRate || 0);
    const allRates = [...schemaRates, ...completenessRates];
    const avgQuality = allRates.length > 0 ? allRates.reduce((a, b) => a + b, 0) / allRates.length : 0;
    const anomalyCount = (checks.anomalyDetection || []).length;
    const consistencyIssues = checks.consistency?.issueCount || 0;

    let grade = 'A';
    if (avgQuality < 90 || anomalyCount > 50 || consistencyIssues > 20) grade = 'B';
    if (avgQuality < 80 || anomalyCount > 100 || consistencyIssues > 50) grade = 'C';
    if (avgQuality < 60) grade = 'D';

    return {
      qualityScore: Math.round(avgQuality * 100) / 100,
      grade,
      anomalyCount,
      consistencyIssues,
      totalChecks: Object.keys(checks).length,
    };
  }

  getHistory(limit = 10) {
    return this._history.slice(-limit);
  }
}

module.exports = DataQualityPipeline;
