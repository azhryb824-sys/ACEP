const path = require('path');
const fs = require('fs');

const VERSIONS_PATH = path.join(__dirname, '..', '..', '..', 'data', 'uets', 'dataset-versions.json');

class UETSDatasetValidator {
  constructor(uetsCore) {
    this.core = uetsCore;
    this.versionsPath = VERSIONS_PATH;
    this.versions = [];
    this._ensureDirectory();
    this._loadVersions();
  }

  // === Dataset Versioning ===

  createVersion(label, description = '') {
    const stats = this.core.getStats();
    const version = {
      id: `v${this.versions.length + 1}.0.0`,
      label: label || `Version ${this.versions.length + 1}`,
      description,
      createdAt: new Date().toISOString(),
      totalRecords: stats.total,
      byProjectType: { ...stats.byProjectType },
      bySource: { ...stats.bySource },
      coverage: { ...stats.coverage },
      hash: this._computeHash()
    };
    this.versions.push(version);
    this._saveVersions();
    return version;
  }

  getVersions() {
    return this.versions;
  }

  getLatestVersion() {
    return this.versions.length > 0 ? this.versions[this.versions.length - 1] : null;
  }

  diffVersions(v1Id, v2Id) {
    const v1 = this.versions.find(v => v.id === v1Id);
    const v2 = this.versions.find(v => v.id === v2Id);
    if (!v1 || !v2) return null;

    const addedTypes = {};
    const removedTypes = {};
    const allTypes = new Set([...Object.keys(v1.byProjectType), ...Object.keys(v2.byProjectType)]);

    for (const type of allTypes) {
      const c1 = v1.byProjectType[type] || 0;
      const c2 = v2.byProjectType[type] || 0;
      if (c2 > c1) addedTypes[type] = c2 - c1;
      if (c1 > c2) removedTypes[type] = c1 - c2;
    }

    return {
      v1: v1.id, v2: v2.id,
      totalChange: v2.totalRecords - v1.totalRecords,
      addedTypes,
      removedTypes,
      newSources: Object.keys(v2.bySource).filter(s => !v1.bySource[s]),
      removedSources: Object.keys(v1.bySource).filter(s => !v2.bySource[s])
    };
  }

  // === Cross-Dataset Integrity Check ===

  checkIntegrity(egts) {
    const issues = [];
    const boqCodes = new Set();
    const projectUUIDs = new Set();
    let orphanBOQItems = 0;
    let emptyProjects = 0;
    let duplicateBOQCodes = 0;

    for (const egt of egts) {
      if (projectUUIDs.has(egt.uuid)) {
        issues.push(`Duplicate project UUID: ${egt.uuid}`);
      }
      projectUUIDs.add(egt.uuid);

      if (!egt.geometry || !egt.geometry.totalArea) {
        issues.push(`Project ${egt.uuid.substr(0, 8)} missing geometry/totalArea`);
      }

      if (egt.boq.length === 0) {
        emptyProjects++;
        if (emptyProjects < 5) issues.push(`Project ${egt.uuid.substr(0, 8)} has empty BOQ`);
      }

      for (const item of egt.boq) {
        const codeKey = `${egt.uuid}:${item.code}`;
        if (boqCodes.has(codeKey)) {
          duplicateBOQCodes++;
        }
        boqCodes.add(codeKey);
      }
    }

    return {
      passed: issues.length === 0,
      totalProjects: egts.length,
      uniqueUUIDs: projectUUIDs.size,
      totalBOQItems: boqCodes.size,
      duplicateBOQCodes,
      emptyBOQProjects: emptyProjects,
      issues: issues.slice(0, 20),
      issueCount: issues.length
    };
  }

  // === Cross-Dataset Consistency Check ===

  checkConsistency(egts) {
    const results = {
      boqVsCost: { checked: 0, consistent: 0, avgRatio: 0 },
      costVsSchedule: { checked: 0, consistent: 0, avgMonthlyCost: 0 },
      areaVsFloors: { checked: 0, consistent: 0 },
      typeVsCost: {},
      total: 0, consistent: 0
    };

    for (const egt of egts) {
      if (egt.boq.length > 0 && egt.cost.total > 0) {
        results.boqVsCost.checked++;
        const boqTotal = egt.boq.reduce((s, i) => s + i.totalPrice, 0);
        const costTotal = egt.cost.total;
        const ratio = costTotal > 0 ? boqTotal / costTotal : 0;
        results.boqVsCost.avgRatio += ratio;
        if (ratio >= 0.3 && ratio <= 3.0) results.boqVsCost.consistent++;
      }

      if (egt.cost.total > 0 && egt.schedule.totalDurationMonths > 0) {
        results.costVsSchedule.checked++;
        results.costVsSchedule.avgMonthlyCost += egt.cost.total / egt.schedule.totalDurationMonths;
        results.costVsSchedule.consistent++;
      }

      if (egt.geometry.totalArea > 0 && egt.geometry.floors > 0) {
        results.areaVsFloors.checked++;
        const areaPerFloor = egt.geometry.totalArea / egt.geometry.floors;
        if (areaPerFloor >= 50 && areaPerFloor <= 10000) results.areaVsFloors.consistent++;
      }

      const type = egt.classification.projectType;
      if (!results.typeVsCost[type]) results.typeVsCost[type] = { count: 0, totalCost: 0, totalArea: 0 };
      results.typeVsCost[type].count++;
      results.typeVsCost[type].totalCost += egt.cost.total;
      results.typeVsCost[type].totalArea += egt.geometry.totalArea;

      results.total++;
      results.consistent++;
    }

    if (results.boqVsCost.checked > 0) results.boqVsCost.avgRatio /= results.boqVsCost.checked;
    if (results.costVsSchedule.checked > 0) results.costVsSchedule.avgMonthlyCost /= results.costVsSchedule.checked;

    for (const type of Object.keys(results.typeVsCost)) {
      const d = results.typeVsCost[type];
      d.avgCostPerM2 = d.totalArea > 0 ? d.totalCost / d.totalArea : 0;
    }

    const overallScore = results.boqVsCost.checked > 0 ? results.boqVsCost.consistent / results.boqVsCost.checked : 1;

    return {
      results,
      overallScore: Math.round(overallScore * 100) / 100,
      passed: overallScore >= 0.7
    };
  }

  // === Coverage Analysis ===

  checkCoverage() {
    const stats = this.core.getStats();
    const coverage = stats.coverage || {};
    const summary = {
      excellent: 0, good: 0, adequate: 0, minimal: 0, low: 0, none: 0,
      lowCoverageTypes: []
    };
    for (const [type, info] of Object.entries(coverage)) {
      summary[info.status]++;
      if (info.status === 'none' || info.status === 'low' || info.status === 'minimal') {
        summary.lowCoverageTypes.push({ type, count: info.count, status: info.status });
      }
    }
    return summary;
  }

  getReadinessReport() {
    const stats = this.core.getStats();
    const integrity = this.checkIntegrity(this.core.getAll());
    const consistency = this.checkConsistency(this.core.getAll());
    const coverage = this.checkCoverage();

    const score = (
      (stats.total > 0 ? 20 : 0) +
      (integrity.passed ? 20 : 0) +
      (consistency.passed ? 20 : 0) +
      (coverage.excellent * 5 + coverage.good * 3 + coverage.adequate * 1) +
      (stats.total >= 10000 ? 10 : stats.total >= 1000 ? 5 : 0)
    );

    let grade = 'D';
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 50) grade = 'C';

    return {
      overallScore: Math.min(100, score),
      grade,
      totalRecords: stats.total,
      byProjectType: stats.byProjectType,
      bySource: stats.bySource,
      integrity: { passed: integrity.passed, issues: integrity.issueCount },
      consistency: { passed: consistency.passed, score: consistency.overallScore },
      coverage,
      lowCoverageTypes: coverage.lowCoverageTypes,
      recommendation: grade === 'A' ? 'Dataset is ready for training' :
        grade === 'B' ? 'Dataset is adequate, consider improving low-coverage areas' :
        'Dataset needs improvement before training'
    };
  }

  // === Private ===

  _computeHash() {
    const all = this.core.getAll();
    let hash = 0;
    for (const egt of all.slice(0, 100)) {
      for (const char of egt.uuid) {
        hash = ((hash << 5) - hash) + char.charCodeAt(0);
        hash |= 0;
      }
    }
    return Math.abs(hash).toString(16);
  }

  _ensureDirectory() {
    const dir = path.dirname(this.versionsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  _saveVersions() {
    fs.writeFileSync(this.versionsPath, JSON.stringify(this.versions, null, 2), 'utf8');
  }

  _loadVersions() {
    try {
      if (fs.existsSync(this.versionsPath)) {
        this.versions = JSON.parse(fs.readFileSync(this.versionsPath, 'utf8'));
      }
    } catch (e) {
      // start fresh
    }
  }
}

module.exports = { UETSDatasetValidator };
