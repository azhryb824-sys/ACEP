const { getLogger } = require('../logger');
const Database = require('../database/db');
const StorageEngine = require('../storage-engine');

const LOGGER = getLogger({ service: 'VisionAI-Training' });

class TrainingDataCollector {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    await Database.initialize();
    this.initialized = true;
  }

  async recordApproval(galleryId, projectId, type, metadata = {}) {
    await this.initialize();
    const id = StorageEngine.generateId();
    const stmt = Database.prepare(`
      INSERT INTO vision_training_data (id, gallery_id, project_id, type, prompt, params, rating, approved_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id, galleryId, projectId, type,
      metadata.prompt || '',
      JSON.stringify(metadata.params || {}),
      metadata.rating || 5,
      metadata.approvedBy || 'system'
    );
    LOGGER.info(`Training data recorded: ${id} (${type})`);
    return id;
  }

  async getTrainingStats() {
    await this.initialize();
    const total = Database.prepare('SELECT COUNT(*) as count FROM vision_training_data').get();
    const byType = Database.prepare('SELECT type, COUNT(*) as count FROM vision_training_data GROUP BY type').all();
    const inDataset = Database.prepare('SELECT COUNT(*) as count FROM vision_training_data WHERE included_in_dataset = 1').get();
    return {
      total: total?.count || 0,
      byType: byType || [],
      inDataset: inDataset?.count || 0,
    };
  }

  async getTrainingBatch(limit = 100) {
    await this.initialize();
    return Database.prepare(`
      SELECT td.*, g.file_path, g.thumbnail_path, g.title, g.description
      FROM vision_training_data td
      JOIN vision_gallery g ON td.gallery_id = g.id
      WHERE td.included_in_dataset = 0
      ORDER BY td.rating DESC
      LIMIT ?
    `).all(limit);
  }

  async markIncludedInDataset(ids) {
    await this.initialize();
    const stmt = Database.prepare('UPDATE vision_training_data SET included_in_dataset = 1 WHERE id = ?');
    for (const id of ids) stmt.run(id);
    LOGGER.info(`${ids.length} items marked for training dataset`);
  }

  /**
   * Collect vision training samples directly from the UETS EGT repository.
   * Returns prompt samples (EGT image prompts + stored generated images).
   * When persist=true, writes them into vision_training_data.
   */
  async collectFromEGT(uets, options = {}) {
    const limit = options.limit || 200;
    const persist = !!options.persist;
    if (!uets) return { ok: false, error: 'UETS not configured' };

    let egts = [];
    try { egts = uets.getAllEGT ? uets.getAllEGT() : []; } catch { egts = []; }

    const samples = [];
    for (const egt of egts.slice(0, limit)) {
      const prompts = (egt.images && Array.isArray(egt.images.prompts)) ? egt.images.prompts : [];
      let prompt = prompts[0] || '';
      if (!prompt && typeof uets.generateImagePrompts === 'function') {
        try {
          const gen = uets.generateImagePrompts(egt);
          if (Array.isArray(gen)) {
            prompt = (gen[0] && gen[0].prompt) || '';
          } else if (gen) {
            prompt = gen.primary || gen.exterior || gen.main || gen.prompt || '';
          }
        } catch { /* ignore */ }
      }
      if (!prompt) continue;
      samples.push({
        projectId: egt.uuid,
        projectType: egt.classification && egt.classification.projectType,
        prompt,
        images: (egt.images && egt.images.generated) || [],
        confidence: egt.confidence || 0,
      });
    }

    if (persist) {
      await this.initialize();
      const stmt = Database.prepare(`
        INSERT INTO vision_training_data (id, gallery_id, project_id, type, prompt, params, rating, approved_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      let inserted = 0;
      for (const s of samples) {
        try {
          stmt.run(StorageEngine.generateId(), s.images[0] || '', s.projectId, 'egt', s.prompt, JSON.stringify({ projectType: s.projectType, confidence: s.confidence }), 5, 'uets');
          inserted++;
        } catch { /* skip duplicates / invalid gallery */ }
      }
      LOGGER.info(`${inserted} EGT samples persisted to vision training data`);
    }

    return { ok: true, total: samples.length, samples };
  }
}

module.exports = new TrainingDataCollector();