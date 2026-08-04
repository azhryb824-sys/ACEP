const path = require('path');
const fs = require('fs');

const STATE_PATH = path.join(__dirname, '..', '..', '..', 'data', 'uets', 'training-state.json');

class UETSTrainingManager {
  constructor(uetsCore, options = {}) {
    this.core = uetsCore;
    this.statePath = options.statePath || STATE_PATH;

    this.trainingQueue = [];
    this.retrainingQueue = [];
    this.evaluationQueue = [];
    this.feedbackQueue = [];

    this.history = [];
    this.isRunning = false;
    this.autoRetrainInterval = null;

    this.listeners = {};

    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return this;
    this._loadState();
    this.initialized = true;
    return this;
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  _emit(event, data) {
    if (this.listeners[event]) {
      for (const cb of this.listeners[event]) cb(data);
    }
  }

  // === Training Queue ===

  enqueueTraining(modelNames, options = {}) {
    const job = {
      id: `train-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'training',
      models: Array.isArray(modelNames) ? modelNames : [modelNames],
      options,
      status: 'queued',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null
    };
    this.trainingQueue.push(job);
    this._emit('training:enqueued', job);
    this._saveState();
    return job;
  }

  async processTrainingQueue(trainerFn) {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.trainingQueue.length > 0) {
      const job = this.trainingQueue.shift();
      job.status = 'processing';
      job.startedAt = new Date().toISOString();
      this._emit('training:started', job);

      try {
        const result = await trainerFn(job.models, job.options);
        job.status = 'completed';
        job.completedAt = new Date().toISOString();
        job.result = result;
        this._emit('training:completed', job);
      } catch (err) {
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        job.error = err.message;
        this._emit('training:failed', job);
      }

      this.history.push(job);
      this._saveState();
    }

    this.isRunning = false;
    this._emit('training:drain', {});
  }

  // === Retraining Queue ===

  enqueueRetraining(reason, options = {}) {
    const job = {
      id: `retrain-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'retraining',
      reason: reason || 'scheduled',
      options,
      status: 'queued',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null
    };
    this.retrainingQueue.push(job);
    this._emit('retraining:enqueued', job);
    this._saveState();
    return job;
  }

  async processRetrainingQueue(retrainFn) {
    while (this.retrainingQueue.length > 0) {
      const job = this.retrainingQueue.shift();
      job.status = 'processing';
      job.startedAt = new Date().toISOString();
      this._emit('retraining:started', job);

      try {
        const result = await retrainFn(job.reason, job.options);
        job.status = 'completed';
        job.completedAt = new Date().toISOString();
        job.result = result;
        this._emit('retraining:completed', job);
      } catch (err) {
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        job.error = err.message;
        this._emit('retraining:failed', job);
      }

      this.history.push(job);
      this._saveState();
    }
  }

  // === Evaluation Queue ===

  enqueueEvaluation(type = 'full', options = {}) {
    const job = {
      id: `eval-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'evaluation',
      evalType: type,
      options,
      status: 'queued',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null
    };
    this.evaluationQueue.push(job);
    this._emit('evaluation:enqueued', job);
    this._saveState();
    return job;
  }

  async processEvaluationQueue(evalFn) {
    while (this.evaluationQueue.length > 0) {
      const job = this.evaluationQueue.shift();
      job.status = 'processing';
      job.startedAt = new Date().toISOString();
      this._emit('evaluation:started', job);

      try {
        const result = await evalFn(job.evalType, job.options);
        job.status = 'completed';
        job.completedAt = new Date().toISOString();
        job.result = result;
        this._emit('evaluation:completed', job);
      } catch (err) {
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        job.error = err.message;
        this._emit('evaluation:failed', job);
      }

      this.history.push(job);
      this._saveState();
    }
  }

  // === Feedback Queue ===

  enqueueFeedback(feedback) {
    const entry = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      ...feedback,
      status: 'queued',
      createdAt: new Date().toISOString(),
      processedAt: null
    };
    this.feedbackQueue.push(entry);
    this._emit('feedback:enqueued', entry);
    this._saveState();
    return entry;
  }

  processFeedbackQueue(feedbackFn) {
    while (this.feedbackQueue.length > 0) {
      const entry = this.feedbackQueue.shift();
      try {
        feedbackFn(entry);
        entry.status = 'processed';
        entry.processedAt = new Date().toISOString();
      } catch (err) {
        entry.status = 'failed';
        entry.error = err.message;
      }
      this.history.push(entry);
    }
    this._saveState();
  }

  // === Auto-retrain ===

  startAutoRetrain(intervalMs = 86400000) {
    this.stopAutoRetrain();
    this.autoRetrainInterval = setInterval(() => {
      this.enqueueRetraining('auto-scheduled', { auto: true });
    }, intervalMs);
    console.log(`[UETS] Auto-retrain started every ${intervalMs / 60000} minutes`);
  }

  stopAutoRetrain() {
    if (this.autoRetrainInterval) {
      clearInterval(this.autoRetrainInterval);
      this.autoRetrainInterval = null;
    }
  }

  // === Stats ===

  getStats() {
    return {
      trainingQueue: this.trainingQueue.length,
      retrainingQueue: this.retrainingQueue.length,
      evaluationQueue: this.evaluationQueue.length,
      feedbackQueue: this.feedbackQueue.length,
      historyTotal: this.history.length,
      isRunning: this.isRunning,
      lastActivity: this.history.length > 0 ? this.history[this.history.length - 1].createdAt : null
    };
  }

  getHistory(limit = 50) {
    return this.history.slice(-limit);
  }

  // === Persistence ===

  _saveState() {
    try {
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.statePath, JSON.stringify({
        trainingQueue: this.trainingQueue,
        retrainingQueue: this.retrainingQueue,
        evaluationQueue: this.evaluationQueue,
        feedbackQueue: this.feedbackQueue,
        history: this.history.slice(-200)
      }, null, 2), 'utf8');
    } catch (e) {
      console.warn(`[UETS] Could not save training state: ${e.message}`);
    }
  }

  _loadState() {
    try {
      if (fs.existsSync(this.statePath)) {
        const data = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
        this.trainingQueue = data.trainingQueue || [];
        this.retrainingQueue = data.retrainingQueue || [];
        this.evaluationQueue = data.evaluationQueue || [];
        this.feedbackQueue = data.feedbackQueue || [];
        this.history = data.history || [];
      }
    } catch (e) {
      // start fresh
    }
  }
}

module.exports = { UETSTrainingManager };
