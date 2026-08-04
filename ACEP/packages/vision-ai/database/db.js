const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'storage', 'vision-ai.db');
const DB_DIR = path.dirname(DB_PATH);

class VisionDatabase {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    fs.mkdirSync(DB_DIR, { recursive: true });
    try {
      const Database = require('better-sqlite3');
      this.db = new Database(DB_PATH);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      await this._createSchema();
      this.initialized = true;
    } catch (e) {
      this.db = null;
      this.initialized = true;
    }
  }

  async _createSchema() {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vision_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        project_type TEXT,
        project_params TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS vision_generations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('image','video','concept','comparison','simulation')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
        prompt TEXT,
        params TEXT,
        provider TEXT,
        model TEXT,
        input_data TEXT,
        output_path TEXT,
        output_url TEXT,
        output_metadata TEXT,
        width INTEGER,
        height INTEGER,
        duration INTEGER,
        error_message TEXT,
        error_code TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES vision_projects(id)
      );

      CREATE TABLE IF NOT EXISTS vision_gallery (
        id TEXT PRIMARY KEY,
        generation_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('image','video')),
        format TEXT,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        thumbnail_path TEXT,
        title TEXT,
        description TEXT,
        tags TEXT,
        is_approved INTEGER DEFAULT 0,
        approved_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (generation_id) REFERENCES vision_generations(id),
        FOREIGN KEY (project_id) REFERENCES vision_projects(id)
      );

      CREATE TABLE IF NOT EXISTS vision_training_data (
        id TEXT PRIMARY KEY,
        gallery_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        type TEXT NOT NULL,
        prompt TEXT,
        params TEXT,
        rating INTEGER DEFAULT 1,
        approved_by TEXT,
        approved_at TEXT,
        included_in_dataset INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (gallery_id) REFERENCES vision_gallery(id)
      );

      CREATE TABLE IF NOT EXISTS vision_providers (
        name TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('image','video','both')),
        enabled INTEGER DEFAULT 1,
        config TEXT,
        priority INTEGER DEFAULT 0,
        last_used_at TEXT,
        last_error TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS vision_queue (
        id TEXT PRIMARY KEY,
        generation_id TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'queued' CHECK(status IN ('queued','processing','completed','failed')),
        priority INTEGER DEFAULT 0,
        assigned_provider TEXT,
        progress INTEGER DEFAULT 0,
        progress_message TEXT,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        scheduled_at TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_generations_project ON vision_generations(project_id);
      CREATE INDEX IF NOT EXISTS idx_generations_status ON vision_generations(status);
      CREATE INDEX IF NOT EXISTS idx_gallery_project ON vision_gallery(project_id);
      CREATE INDEX IF NOT EXISTS idx_queue_status ON vision_queue(status);
    `);
  }

  prepare(sql) {
    if (!this.db) return { run: (...args) => {}, get: (...args) => null, all: (...args) => [] };
    return this.db.prepare(sql);
  }

  exec(sql) {
    if (!this.db) return;
    return this.db.exec(sql);
  }

  close() {
    if (this.db && this.db.close) this.db.close();
  }
}

module.exports = new VisionDatabase();