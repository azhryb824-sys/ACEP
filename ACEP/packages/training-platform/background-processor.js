const db = require('./database');
const qa = require('./quality-assessment');
const dups = require('./duplicate-detection');
const cert = require('./certification');

class BackgroundProcessor {
  constructor() {
    this.queue = [];
    this.running = false;
    this.workers = 0;
    this.maxWorkers = 3;
    this.processed = 0;
    this.logs = [];
  }

  enqueue(task) {
    const job = { id: require('crypto').randomBytes(8).toString('hex'), ...task, status: 'queued', createdAt: new Date().toISOString() };
    this.queue.push(job);
    setImmediate(() => this._processQueue());
    return job;
  }

  async enqueueImage(imageRecord) { return this.enqueue({ type: 'process_image', data: { imageId: imageRecord.id }, priority: 10 }); }

  enqueueBatch(limit = 100) { return this.enqueue({ type: 'batch_process', data: { limit }, priority: 5 }); }

  enqueueClassification(limit = 50) { return this.enqueue({ type: 'batch_classify', data: { limit }, priority: 5 }); }

  getStatus() {
    return {
      running: this.running, workers: this.workers,
      queued: this.queue.filter(j => j.status === 'queued').length,
      processing: this.queue.filter(j => j.status === 'processing').length,
      completed: this.queue.filter(j => j.status === 'completed').length,
      failed: this.queue.filter(j => j.status === 'failed').length,
      total: this.queue.length, processed: this.processed,
      recentLogs: this.logs.slice(-20),
    };
  }

  async _processQueue() {
    if (this.running && this.workers >= this.maxWorkers) return;
    this.running = true;
    const next = this.queue.find(j => j.status === 'queued');
    if (!next) { this.running = this.queue.some(j => j.status === 'processing'); return; }

    this.workers++;
    next.status = 'processing';
    next.startedAt = new Date().toISOString();

    try {
      if (next.type === 'batch_process') {
        await this._handleBatchProcess(next);
      } else if (next.type === 'process_image') {
        await this._handleProcessImage(next);
      } else if (next.type === 'batch_classify') {
        await this._handleBatchClassify(next);
      }
      next.status = 'completed';
      next.completedAt = new Date().toISOString();
    } catch (err) {
      next.status = 'failed';
      next.error = err.message;
    }

    this.workers--;
    this.processed++;
    this.logs.push({ time: new Date().toISOString(), jobId: next.id, type: next.type, status: next.status, error: next.error });
    if (this.logs.length > 100) this.logs = this.logs.slice(-100);
    setImmediate(() => this._processQueue());
  }

  async _handleProcessImage(job) {
    const image = db.getById('training_images', job.data.imageId);
    if (!image) throw new Error('Image not found: ' + job.data.imageId);
    await qa.assessImage(image);
    const updated = db.getById('training_images', job.data.imageId);
    await dups.detectAll(updated);
    const reupdated = db.getById('training_images', job.data.imageId);
    await cert.certifyImage(reupdated);
  }

  async _handleBatchProcess(job) {
    const pending = (db.stores.training_images || []).filter(i => i.certification_status === 'pending').slice(0, job.data.limit || 100);
    for (const img of pending) { await this.enqueueImage(img); }
  }

  async _handleBatchClassify(job) {
    const AutoClassifier = require('./auto-classifier');
    const classifier = new AutoClassifier(null);
    await classifier.batchClassify(job.data.limit || 50);
  }
}

module.exports = new BackgroundProcessor();
