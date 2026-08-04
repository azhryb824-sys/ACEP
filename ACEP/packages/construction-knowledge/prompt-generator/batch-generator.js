const path = require('path');
const fs = require('fs');
const { EngineeringPromptGenerator } = require('./prompt-generator');
const { PromptDatabase } = require('./prompt-database');

class BatchPromptGenerator {
  constructor(knowledgeBase, options = {}) {
    this.kb = knowledgeBase;
    this.generator = new EngineeringPromptGenerator(knowledgeBase);
    this.db = new PromptDatabase();
    this.running = false;
    this.timer = null;
    this.stats = {
      totalGenerated: 0,
      totalBatches: 0,
      startTime: null,
      lastBatchTime: null,
      batchSize: options.batchSize || 1000,
      intervalMs: options.intervalMs || 300000,
      language: options.language || 'en',
      autoExport: options.autoExport || false,
      exportPath: options.exportPath || path.join(__dirname, '..', '..', '..', 'data', 'prompts'),
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.stats.startTime = new Date().toISOString();
    console.log(`[BatchPromptGenerator] Started — batch: ${this.stats.batchSize}, interval: ${this.stats.intervalMs}ms, language: ${this.stats.language}`);
    this._runBatch();
    this.timer = setInterval(() => this._runBatch(), this.stats.intervalMs);
    return this;
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log(`[BatchPromptGenerator] Stopped — total generated: ${this.stats.totalGenerated}, batches: ${this.stats.totalBatches}`);
    return this;
  }

  _runBatch() {
    if (!this.running) return;
    try {
      const batch = this.generator.generateBatch(this.stats.batchSize, this.stats.language);
      if (batch.length > 0) {
        this.db.saveBatch(batch);
        this.stats.totalGenerated += batch.length;
        this.stats.totalBatches++;
        this.stats.lastBatchTime = new Date().toISOString();

        if (this.stats.autoExport && this.stats.totalBatches % 5 === 0) {
          this._export();
        }
      }
    } catch (err) {
      console.error('[BatchPromptGenerator] Error:', err.message);
    }
  }

  _export() {
    try {
      const dir = this.stats.exportPath;
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(dir, `prompts_batch_${ts}.jsonl`);
      this.db.exportToJSONL(filePath);
    } catch (err) {
      console.error('[BatchPromptGenerator] Export error:', err.message);
    }
  }

  getStats() {
    return {
      ...this.stats,
      generatorCombinations: this.generator.getTotalCombinations(),
      dbStats: this.db.getStats(),
    };
  }

  resetGenerator() { this.generator.resetDeduplication(); }

  configure(options = {}) {
    if (options.batchSize) this.stats.batchSize = options.batchSize;
    if (options.intervalMs) this.stats.intervalMs = options.intervalMs;
    if (options.language) this.stats.language = options.language;
    if (options.autoExport !== undefined) this.stats.autoExport = options.autoExport;
  }
}

module.exports = { BatchPromptGenerator };
