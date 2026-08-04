const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionAI-Queue' });

class BackgroundQueue {
  constructor() {
    this.jobs = new Map();
    this.processing = new Set();
    this.maxConcurrent = 2;
  }

  enqueue(job) {
    const id = job.id || `JOB-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const entry = {
      id,
      type: job.type || 'generation',
      status: 'queued',
      priority: job.priority || 0,
      data: job.data || {},
      progress: 0,
      progressMessage: 'في قائمة الانتظار',
      errorMessage: null,
      retryCount: 0,
      maxRetries: job.maxRetries || 3,
      handler: job.handler || null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };
    this.jobs.set(id, entry);
    LOGGER.info(`Job queued: ${id} (${job.type})`);
    this._processNext();
    return id;
  }

  async _processNext() {
    if (this.processing.size >= this.maxConcurrent) return;
    const queued = Array.from(this.jobs.values())
      .filter(j => j.status === 'queued')
      .sort((a, b) => b.priority - a.priority);
    if (queued.length === 0) return;
    const job = queued[0];
    this.processing.add(job.id);
    job.status = 'processing';
    job.startedAt = new Date().toISOString();
    LOGGER.info(`Processing job: ${job.id}`);
    try {
      if (typeof job.handler === 'function') {
        const updateProgress = (pct, msg) => {
          job.progress = pct;
          job.progressMessage = msg;
        };
        job.result = await job.handler(job.data, updateProgress);
      }
      job.status = 'completed';
      job.progress = 100;
      job.progressMessage = 'اكتمل بنجاح';
      LOGGER.info(`Job completed: ${job.id}`);
    } catch (e) {
      job.retryCount++;
      job.errorMessage = e.message;
      if (job.retryCount < job.maxRetries) {
        job.status = 'queued';
        LOGGER.warn(`Job ${job.id} failed, retrying (${job.retryCount}/${job.maxRetries}): ${e.message}`);
      } else {
        job.status = 'failed';
        LOGGER.error(`Job ${job.id} failed after ${job.retryCount} retries: ${e.message}`);
      }
    }
    job.completedAt = new Date().toISOString();
    this.processing.delete(job.id);
    this._processNext();
  }

  getJob(id) {
    return this.jobs.get(id) || null;
  }

  getQueueStatus() {
    return {
      queued: Array.from(this.jobs.values()).filter(j => j.status === 'queued').length,
      processing: this.processing.size,
      completed: Array.from(this.jobs.values()).filter(j => j.status === 'completed').length,
      failed: Array.from(this.jobs.values()).filter(j => j.status === 'failed').length,
      total: this.jobs.size,
    };
  }

  getRecentJobs(limit = 20) {
    return Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }
}

module.exports = new BackgroundQueue();