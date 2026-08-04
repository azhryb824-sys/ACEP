const { EngineeringGroundTruth, EGT_VERSION } = require('./engineering-ground-truth');
const { EGTFactory } = require('./egt-factory');
const { EGTRepository } = require('./egt-repository');
const { EGTValidator } = require('./egt-validator');

class UETSCore {
  constructor(options = {}) {
    this.factory = new EGTFactory();
    this.repository = new EGTRepository(options.repoPath, options.indexPath);
    this.validator = new EGTValidator();
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return this;
    this.repository.initialize();
    this.initialized = true;
    return this;
  }

  createEGT(data) {
    return new EngineeringGroundTruth(data);
  }

  fromCSV(row) {
    return this.factory.fromCSVProject(row);
  }

  fromEDL(project) {
    return this.factory.fromEDLProject(project);
  }

  fromKB(project) {
    return this.factory.fromKBProject(project);
  }

  fromContinuousLearning(record) {
    return this.factory.fromContinuousLearningRecord(record);
  }

  fromProfile(profile) {
    return this.factory.fromProjectProfile(profile);
  }

  add(egt) {
    return this.repository.add(egt);
  }

  addBatch(egts) {
    return this.repository.addBatch(egts);
  }

  get(uuid) {
    return this.repository.get(uuid);
  }

  getAll() {
    return this.repository.getAll();
  }

  query(filters) {
    return this.repository.query(filters);
  }

  validate(egt) {
    return this.validator.validate(egt);
  }

  validateBatch(egts) {
    return this.validator.validateBatch(egts);
  }

  checkConsistency(egt) {
    return this.validator.checkConsistency(egt);
  }

  checkIntegrity(egt) {
    return this.validator.checkIntegrity(egt);
  }

  calculateCompleteness(egt) {
    return this.validator.calculateCompleteness(egt);
  }

  getStats() {
    return this.repository.getStats();
  }

  save() {
    return this.repository.save();
  }

  getVersion() {
    return EGT_VERSION;
  }

  getStatus() {
    return {
      version: EGT_VERSION,
      initialized: this.initialized,
      records: this.repository.records.size,
      lastUpdated: this.repository.index.lastUpdated
    };
  }

  validateAgainstGroundTruth(projectData) {
    const projectType = projectData.projectType || projectData.classification?.projectType || 'Building';
    const peers = this.repository.query({ projectType });

    const agg = (arr) => {
      const nums = arr.filter(v => typeof v === 'number' && v > 0);
      if (nums.length === 0) return null;
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const sd = Math.sqrt(nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length);
      return { mean, sd, n: nums.length };
    };

    const area = projectData.totalArea || projectData.area || projectData.geometry?.totalArea;
    const floors = projectData.floors || projectData.geometry?.floors;
    const cost = projectData.cost?.total || projectData.totalCost || projectData.cost || 0;
    const schedule = projectData.schedule?.totalDurationMonths || projectData.schedule?.totalDuration ? (projectData.schedule.totalDuration / 30) : projectData.durationMonths || 0;

    const areaStats = agg(peers.map(p => p.geometry.totalArea));
    const floorsStats = agg(peers.map(p => p.geometry.floors));
    const costStats = agg(peers.map(p => p.cost.total));
    const scheduleStats = agg(peers.map(p => p.schedule.totalDurationMonths));

    const score = (value, stats) => {
      if (!stats || value === undefined || !value) return null;
      if (stats.n < 5) return { zScore: null, deviationPct: null, sampleSize: stats.n, note: 'insufficient samples' };
      const z = Math.abs(value - stats.mean) / (stats.sd || 1);
      const devPct = stats.mean > 0 ? Math.round(((value - stats.mean) / stats.mean) * 1000) / 10 : 0;
      return { zScore: Math.round(z * 100) / 100, deviationPct: devPct, sampleSize: stats.n, mean: Math.round(stats.mean), ok: z <= 2 };
    };

    const dims = {
      totalArea: { value: area, stats: areaStats, result: score(area, areaStats) },
      floors: { value: floors, stats: floorsStats, result: score(floors, floorsStats) },
      cost: { value: cost, stats: costStats, result: score(cost, costStats) },
      scheduleMonths: { value: schedule, stats: scheduleStats, result: score(schedule, scheduleStats) },
    };

    const results = {};
    for (const [k, d] of Object.entries(dims)) results[k] = d.result;

    const checked = Object.values(results).filter(r => r && r.ok !== null);
    const passCount = checked.filter(r => r.ok).length;
    const inconsistent = checked.filter(r => !r.ok);

    return {
      projectType,
      peers: peers.length,
      results,
      passed: checked.length > 0 ? Math.round((passCount / checked.length) * 100) : null,
      inconsistent,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { UETSCore };
