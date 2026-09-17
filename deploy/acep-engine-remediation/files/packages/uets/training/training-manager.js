"use strict";
const fs = require('fs');
const crypto = require('crypto');
const { runtimePath } = require('../../runtime/paths');
const { writeJsonAtomic } = require('../../runtime/atomic-json-store');
const KINDS = ['training', 'retraining', 'evaluation', 'feedback'];

// Single-process development worker. Production uses an external, reviewed runner.
class UETSTrainingManager {
  constructor(core, options = {}) {
    this.core = core;
    this.statePath = options.statePath || runtimePath('uets', 'training-state.json');
    for (const kind of KINDS) this[kind + 'Queue'] = [];
    this.history = [];
    this.listeners = {};
    this.isRunning = false;
    this.initialized = false;
    this.worker = null;
    this.autoRetrainInterval = null;
    this.lastWorkerError = null;
  }
  initialize() {
    if (this.initialized) return this;
    if (fs.existsSync(this.statePath)) {
      const data = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
      for (const key of [...KINDS.map(k => k + 'Queue'), 'history']) {
        if (!Array.isArray(data[key])) throw new Error('Invalid persisted UETS state: ' + key);
        this[key] = data[key];
      }
    }
    this.initialized = true;
    return this;
  }
  on(event, callback) { (this.listeners[event] ||= []).push(callback); }
  _emit(event, data) {
    for (const cb of this.listeners[event] || []) {
      try { cb(data); } catch (error) { this.lastWorkerError = error.message; }
    }
  }
  _saveState() {
    const data = { schemaVersion: 2, history: this.history.slice(-200) };
    for (const kind of KINDS) data[kind + 'Queue'] = this[kind + 'Queue'];
    writeJsonAtomic(this.statePath, data); // Persistence errors must reach the caller.
  }
  _enqueue(kind, attributes) {
    if (!this.initialized) this.initialize();
    const ownedLock = this.isRunning ? null : this._acquire();
    if (!this.isRunning && !ownedLock) throw new Error('UETS worker busy; retry enqueue');
    try {
    if (ownedLock && fs.existsSync(this.statePath)) { this.initialized = false; this.initialize(); }
    const queue = this[kind + 'Queue'];
    if (queue.length >= 1000) throw new Error('UETS queue capacity reached');
    if (Buffer.byteLength(JSON.stringify(attributes)) > 32768) throw new Error('UETS job payload too large');
    const job = { ...attributes, id: kind + '-' + crypto.randomUUID(), type: kind,
      status: 'queued', createdAt: new Date().toISOString(), attempts: 0,
      startedAt: null, completedAt: null, result: null, error: null };
    queue.push(job);
    try { this._saveState(); } catch (error) { queue.pop(); throw error; }
    this._emit(kind + ':enqueued', job);
    return job;
    } finally { if (ownedLock) fs.unlinkSync(ownedLock); }
  }
  enqueueTraining(models, options = {}) {
    const names = Array.isArray(models) ? models : [models];
    const allowed = ['projectAnalyzer', 'quantityEstimator', 'costEstimator', 'riskAnalyzer', 'qualityInspector', 'scheduleOptimizer', 'supplierIntelligence'];
    if (!names.length || names.length > 7 || names.some(n => !allowed.includes(n))) throw new Error('Unknown or empty UETS model selection');
    if (Object.keys(options).some(k => !['snapshotId'].includes(k))) throw new Error('Unsupported training options; runner and data paths are server-owned');
    return this._enqueue('training', { models: [...new Set(names)], options });
  }
  enqueueRetraining(reason = 'manual', options = {}) {
    if (Object.keys(options).some(k => !['snapshotId','models'].includes(k))) throw new Error('Unsupported retraining options');
    if (!options.snapshotId) throw new Error('An immutable UETS snapshot is required for retraining');
    return this._enqueue('retraining', { reason, options });
  }
  enqueueEvaluation(evalType = 'full', options = {}) { return this._enqueue('evaluation', { evalType, options }); }
  enqueueFeedback(feedback) { return this._enqueue('feedback', { feedback }); }
  _acquire() {
    const lock = this.statePath + '.worker-lock';
    try {
      const fd = fs.openSync(lock, 'wx', 0o600);
      fs.writeFileSync(fd, String(process.pid)); fs.closeSync(fd); return lock;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const pid = Number(fs.readFileSync(lock, 'utf8'));
      if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('UETS worker lock requires operator recovery');
      try { process.kill(pid, 0); return null; } catch (e) { if (e.code !== 'ESRCH') return null; }
      fs.unlinkSync(lock);
      return this._acquire();
    }
  }
  async _process(kind, fn) {
    if (this.isRunning) return;
    if (typeof fn !== 'function') throw new Error('UETS runner is not configured for ' + kind);
    if (!this.initialized) this.initialize();
    const lock = this._acquire();
    if (!lock) return;
    this.isRunning = true;
    try {
      if (fs.existsSync(this.statePath)) { this.initialized = false; this.initialize(); }
      const queue = this[kind + 'Queue'];
      while (queue.length) {
        const job = queue[0]; // Remains persisted until a terminal outcome is saved.
        if (job.status === 'processing') job.recoveredAfterInterruption = true;
        job.status = 'processing'; job.attempts = (job.attempts || 0) + 1;
        job.startedAt = new Date().toISOString();
        this._saveState();
        this._emit(kind + ':started', job);
        try {
          if (job.attempts > 3) throw new Error('Interrupted job exceeded retry limit');
          const args = kind === 'training' ? [job.models, job.options] : kind === 'retraining' ? [job.reason, job.options] : kind === 'evaluation' ? [job.evalType, job.options] : [job.feedback];
          job.result = await fn(...args);
          job.status = 'completed';
        } catch (error) { job.status = 'failed'; job.error = error.message; }
        job.completedAt = new Date().toISOString();
        queue.shift(); this.history.push(job);
        try { this._saveState(); } catch (error) { this.history.pop(); queue.unshift(job); throw error; }
        this._emit(kind + ':' + job.status, job);
      }
    } finally { this.isRunning = false; fs.unlinkSync(lock); }
  }
  processTrainingQueue(fn) { return this._process('training', fn); }
  processRetrainingQueue(fn) { return this._process('retraining', fn); }
  processEvaluationQueue(fn) { return this._process('evaluation', fn); }
  processFeedbackQueue(fn) { return this._process('feedback', fn); }
  startWorker(handlers, intervalMs = 5000) {
    if (process.env.NODE_ENV === 'production') throw new Error('In-process UETS training worker is forbidden in production');
    if (this.worker) return;
    const tick = async () => {
      try { for (const kind of KINDS) if (handlers[kind]) await this._process(kind, handlers[kind]); this.lastWorkerError = null; }
      catch (error) { this.lastWorkerError = error.message; }
    };
    this.worker = setInterval(tick, Math.max(1000, intervalMs)); this.worker.unref?.();
    return tick();
  }
  stopWorker() { if (this.worker) clearInterval(this.worker); this.worker = null; }
  startAutoRetrain(intervalMs = 86400000) {
    if (!this.worker) throw new Error('A configured UETS worker is required before auto-retraining');
    if (!Number.isFinite(intervalMs) || intervalMs < 60000) throw new Error('Auto-retraining interval must be at least 60 seconds');
    this.stopAutoRetrain();
    this.autoRetrainInterval = setInterval(() => {
      try { const {createSnapshot}=require('./snapshot'); this.enqueueRetraining('auto-scheduled',{snapshotId:createSnapshot({getAllEGT:()=>this.core.getAll(),generateCSVTrainingData:egts=>new (require('../dataset/generator').UETSDatasetGenerator)(this.core).generateCSVTrainingData(egts)})}); } catch (error) { this.lastWorkerError = error.message; }
    }, intervalMs); this.autoRetrainInterval.unref?.();
  }
  stopAutoRetrain() { clearInterval(this.autoRetrainInterval); this.autoRetrainInterval = null; }
  getStats() {
    return { ...Object.fromEntries(KINDS.map(k => [k + 'Queue', this[k + 'Queue'].length])),
      historyTotal: this.history.length, isRunning: this.isRunning, workerEnabled: Boolean(this.worker),
      lastWorkerError: this.lastWorkerError, lastActivity: this.history.at(-1)?.completedAt || null };
  }
  getHistory(limit = 50) { return this.history.slice(-Math.max(1, Math.min(200, Number(limit) || 50))); }
}
module.exports = { UETSTrainingManager };
