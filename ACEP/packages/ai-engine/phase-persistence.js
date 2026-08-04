const path = require('path');
const fs = require('fs');

class PhasePersistence {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(__dirname, '..', '..', 'data', 'phases');
    if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true });
  }

  saveGrowthLog(data) {
    this._write('growth-log.json', data);
  }
  loadGrowthLog() { return this._read('growth-log.json', []); }

  saveBenchmarkResults(data) {
    this._write('benchmark-results.json', data);
  }
  loadBenchmarkResults() { return this._read('benchmark-results.json', []); }

  saveEvaluationHistory(data) {
    this._write('evaluation-history.json', data);
  }
  loadEvaluationHistory() { return this._read('evaluation-history.json', []); }

  saveRetrainingHistory(data) {
    this._write('retraining-history.json', data);
  }
  loadRetrainingHistory() { return this._read('retraining-history.json', []); }

  saveDecisionLog(data) {
    this._write('decision-log.json', data);
  }
  loadDecisionLog() { return this._read('decision-log.json', []); }

  saveQualityHistory(data) {
    this._write('quality-history.json', data);
  }
  loadQualityHistory() { return this._read('quality-history.json', []); }

  saveAll(phases) {
    if (phases.growthLog) this.saveGrowthLog(phases.growthLog);
    if (phases.benchmarkResults) this.saveBenchmarkResults(phases.benchmarkResults);
    if (phases.evaluationHistory) this.saveEvaluationHistory(phases.evaluationHistory);
    if (phases.retrainingHistory) this.saveRetrainingHistory(phases.retrainingHistory);
    if (phases.decisionLog) this.saveDecisionLog(phases.decisionLog);
    if (phases.qualityHistory) this.saveQualityHistory(phases.qualityHistory);
    return { ok: true, path: this.baseDir };
  }

  loadAll() {
    return {
      growthLog: this.loadGrowthLog(),
      benchmarkResults: this.loadBenchmarkResults(),
      evaluationHistory: this.loadEvaluationHistory(),
      retrainingHistory: this.loadRetrainingHistory(),
      decisionLog: this.loadDecisionLog(),
      qualityHistory: this.loadQualityHistory(),
    };
  }

  _write(name, data) {
    try { fs.writeFileSync(path.join(this.baseDir, name), JSON.stringify(data, null, 2), 'utf8'); } catch {}
  }
  _read(name, def) {
    try {
      const p = path.join(this.baseDir, name);
      return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : def;
    } catch { return def; }
  }
}

module.exports = PhasePersistence;
