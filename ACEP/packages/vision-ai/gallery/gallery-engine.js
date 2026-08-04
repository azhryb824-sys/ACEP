const { getLogger } = require('../logger');
const Database = require('../database/db');
const StorageEngine = require('../storage-engine');

const LOGGER = getLogger({ service: 'VisionAI-Gallery' });

class GalleryEngine {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    await Database.initialize();
    this.initialized = true;
  }

  async addEntry(generationId, projectId, type, fileInfo, metadata = {}) {
    await this.initialize();
    const id = StorageEngine.generateId();
    const stmt = Database.prepare(`
      INSERT INTO vision_gallery (id, generation_id, project_id, type, format, file_path, file_size, thumbnail_path, title, description, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id, generationId, projectId, type,
      fileInfo.format || 'png',
      fileInfo.filePath || '',
      fileInfo.fileSize || 0,
      fileInfo.thumbnailPath || '',
      metadata.title || `${type} ${id}`,
      metadata.description || '',
      JSON.stringify(metadata.tags || [])
    );
    LOGGER.info(`Gallery entry added: ${id} (${type})`);
    return id;
  }

  async listByProject(projectId, type = null) {
    await this.initialize();
    let sql = 'SELECT * FROM vision_gallery WHERE project_id = ?';
    const params = [projectId];
    if (type) { sql += ' AND type = ?'; params.push(type); }
    sql += ' ORDER BY created_at DESC';
    return Database.prepare(sql).all(...params);
  }

  async getById(id) {
    await this.initialize();
    return Database.prepare('SELECT * FROM vision_gallery WHERE id = ?').get(id);
  }

  async approve(id) {
    await this.initialize();
    Database.prepare('UPDATE vision_gallery SET is_approved = 1, approved_at = datetime(\'now\') WHERE id = ?').run(id);
    LOGGER.info(`Gallery entry approved: ${id}`);
  }

  async deleteEntry(id) {
    await this.initialize();
    const entry = await this.getById(id);
    if (entry) {
      try { StorageEngine.deleteGeneration(entry.project_id, entry.generation_id); } catch {}
    }
    Database.prepare('DELETE FROM vision_gallery WHERE id = ?').run(id);
  }

  async getStats() {
    await this.initialize();
    const total = Database.prepare('SELECT COUNT(*) as count FROM vision_gallery').get();
    const byType = Database.prepare('SELECT type, COUNT(*) as count FROM vision_gallery GROUP BY type').all();
    const approved = Database.prepare('SELECT COUNT(*) as count FROM vision_gallery WHERE is_approved = 1').get();
    return {
      total: total?.count || 0,
      byType: byType || [],
      approved: approved?.count || 0,
      storage: StorageEngine.getStorageStats(),
    };
  }
}

module.exports = new GalleryEngine();