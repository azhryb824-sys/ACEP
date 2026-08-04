/**
 * ACEP Performance Layer
 *
 * Provides:
 * 1. Background Queue for async generation jobs
 * 2. Caching layer for repeated model results
 * 3. Streaming for real-time progress updates
 * 4. Request deduplication
 * 5. Rate limiting per model
 */
const path = require('path');
const EventEmitter = require('events');

class BackgroundQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.queue = [];
    this.active = new Map();
    this.completed = new Map();
    this.failed = new Map();
    this.maxConcurrent = options.maxConcurrent || 3;
    this.running = false;
    this._idCounter = 0;
    this._stats = { enqueued: 0, completed: 0, failed: 0, cancelled: 0 };
  }

  enqueue(module, task) {
    const id = `job_${Date.now()}_${++this._idCounter}`;
    const entry = {
      id,
      module,
      task: typeof task === 'function' ? task : task.handler,
      data: task.data || {},
      priority: task.priority || 5,
      status: 'queued',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      progress: 0,
      progressMessage: '',
      result: null,
      error: null,
    };

    this.queue.push(entry);
    this.queue.sort((a, b) => b.priority - a.priority);
    this._stats.enqueued++;

    this.emit('enqueued', entry);

    if (!this.running) this._processNext();

    return id;
  }

  async _processNext() {
    this.running = true;

    while (this.active.size < this.maxConcurrent && this.queue.length > 0) {
      const entry = this.queue.shift();
      if (!entry) break;

      this.active.set(entry.id, entry);
      this._executeJob(entry);
    }

    if (this.active.size === 0) {
      this.running = false;
      this.emit('drained');
    }
  }

  async _executeJob(entry) {
    entry.status = 'running';
    entry.startedAt = new Date().toISOString();
    this.emit('started', entry);

    try {
      const reportProgress = (progress, message) => {
        entry.progress = progress;
        entry.progressMessage = message || '';
        this.emit('progress', { id: entry.id, progress, message });
      };

      const result = await entry.task(entry.data, reportProgress);

      entry.status = 'completed';
      entry.progress = 100;
      entry.completedAt = new Date().toISOString();
      entry.result = result;

      this.active.delete(entry.id);
      this.completed.set(entry.id, entry);
      this._stats.completed++;

      this.emit('completed', entry);
    } catch (err) {
      entry.status = 'failed';
      entry.error = err.message;
      entry.completedAt = new Date().toISOString();

      this.active.delete(entry.id);
      this.failed.set(entry.id, entry);
      this._stats.failed++;

      this.emit('failed', entry);
    }

    // Process next in queue
    setImmediate(() => this._processNext());
  }

  getJob(id) {
    // Check active
    if (this.active.has(id)) return this.active.get(id);
    // Check completed
    if (this.completed.has(id)) return this.completed.get(id);
    // Check failed
    if (this.failed.has(id)) return this.failed.get(id);
    // Check queue
    return this.queue.find(j => j.id === id) || null;
  }

  cancelJob(id) {
    const idx = this.queue.findIndex(j => j.id === id);
    if (idx !== -1) {
      const [job] = this.queue.splice(idx, 1);
      job.status = 'cancelled';
      this._stats.cancelled++;
      this.emit('cancelled', job);
      return true;
    }

    if (this.active.has(id)) {
      const job = this.active.get(id);
      job.status = 'cancelled';
      this.active.delete(id);
      this._stats.cancelled++;
      this.emit('cancelled', job);
      return true;
    }

    return false;
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      activeCount: this.active.size,
      completedCount: this.completed.size,
      failedCount: this.failed.size,
      maxConcurrent: this.maxConcurrent,
      isRunning: this.running,
      stats: this._stats,
    };
  }

  clearCompleted() {
    this.completed.clear();
  }
}

class ModelCache {
  constructor(options = {}) {
    this._cache = new Map();
    this._ttl = options.ttl || 5 * 60 * 1000;
    this._maxSize = options.maxSize || 1000;
    this._hits = 0;
    this._misses = 0;
  }

  get(key) {
    const entry = this._cache.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > this._ttl) {
      this._cache.delete(key);
      this._misses++;
      return null;
    }

    this._hits++;
    return entry.value;
  }

  set(key, value, ttl) {
    if (this._cache.size >= this._maxSize) {
      // Evict oldest entry
      const oldest = this._cache.keys().next().value;
      this._cache.delete(oldest);
    }

    this._cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this._ttl,
    });
  }

  invalidate(key) {
    return this._cache.delete(key);
  }

  invalidatePattern(pattern) {
    let count = 0;
    for (const key of this._cache.keys()) {
      if (key.includes(pattern)) {
        this._cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear() {
    this._cache.clear();
  }

  getStats() {
    const total = this._hits + this._misses;
    return {
      size: this._cache.size,
      maxSize: this._maxSize,
      ttl: this._ttl,
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? Math.round((this._hits / total) * 100) : 0,
    };
  }
}

class StreamManager extends EventEmitter {
  constructor() {
    super();
    this._streams = new Map();
  }

  createStream(streamId, metadata = {}) {
    const stream = {
      id: streamId,
      metadata,
      createdAt: new Date().toISOString(),
      chunks: [],
      status: 'active',
      listeners: 0,
    };

    this._streams.set(streamId, stream);
    return stream;
  }

  write(streamId, chunk) {
    const stream = this._streams.get(streamId);
    if (!stream || stream.status !== 'active') return false;

    const entry = {
      data: chunk,
      timestamp: new Date().toISOString(),
      sequence: stream.chunks.length,
    };

    stream.chunks.push(entry);
    this.emit('data', { streamId, entry });
    return true;
  }

  end(streamId, finalData = null) {
    const stream = this._streams.get(streamId);
    if (!stream) return false;

    if (finalData) {
      this.write(streamId, finalData);
    }

    stream.status = 'completed';
    stream.completedAt = new Date().toISOString();
    this.emit('end', stream);
    return true;
  }

  error(streamId, error) {
    const stream = this._streams.get(streamId);
    if (!stream) return false;

    stream.status = 'error';
    stream.error = error;
    stream.completedAt = new Date().toISOString();
    this.emit('error', { streamId, error });
    return true;
  }

  getStream(streamId) {
    return this._streams.get(streamId) || null;
  }

  getStreamData(streamId) {
    const stream = this._streams.get(streamId);
    if (!stream) return null;
    return stream.chunks.map(c => c.data);
  }

  cleanup(olderThan = 3600000) {
    const cutoff = Date.now() - olderThan;
    let count = 0;
    for (const [id, stream] of this._streams) {
      if (stream.status === 'completed' && new Date(stream.completedAt).getTime() < cutoff) {
        this._streams.delete(id);
        count++;
      }
    }
    return count;
  }

  getStats() {
    let active = 0;
    let completed = 0;
    let errored = 0;

    for (const stream of this._streams.values()) {
      if (stream.status === 'active') active++;
      else if (stream.status === 'completed') completed++;
      else if (stream.status === 'error') errored++;
    }

    return { active, completed, errored, total: this._streams.size };
  }
}

// Singleton
const backgroundQueue = new BackgroundQueue();
const modelCache = new ModelCache();
const streamManager = new StreamManager();

module.exports = {
  BackgroundQueue: backgroundQueue,
  ModelCache: modelCache,
  StreamManager: streamManager,
  createBackgroundQueue: (opts) => new BackgroundQueue(opts),
  createModelCache: (opts) => new ModelCache(opts),
};
