const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const COLLECTIONS = {
  training_images: 'training_images.json',
  training_projects: 'training_projects.json',
  training_videos: 'training_videos.json',
  training_prompts: 'training_prompts.json',
  quality_assessments: 'quality_assessments.json',
  duplicate_groups: 'duplicate_groups.json',
  dataset_versions: 'dataset_versions.json',
  dataset_splits: 'dataset_splits.json',
  training_readiness: 'training_readiness.json',
  balance_analyses: 'balance_analyses.json',
};

class TrainingDatabase {
  constructor() {
    this.initialized = false;
    this.stores = {};
  }

  initialize() {
    if (this.initialized) return this;
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    for (const [name, file] of Object.entries(COLLECTIONS)) {
      const filePath = path.join(DATA_DIR, file);
      if (fs.existsSync(filePath)) {
        try { this.stores[name] = JSON.parse(fs.readFileSync(filePath, 'utf8')); }
        catch { this.stores[name] = []; }
      } else {
        this.stores[name] = [];
      }
    }
    this.initialized = true;
    return this;
  }

  _save(collection) {
    const filePath = path.join(DATA_DIR, COLLECTIONS[collection]);
    fs.writeFileSync(filePath, JSON.stringify(this.stores[collection] || [], null, 2));
  }

  _ensureCollection(collection) {
    if (!this.stores[collection]) this.stores[collection] = [];
  }

  find(collection, filters = {}) {
    this._ensureCollection(collection);
    let results = this.stores[collection];
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null) {
        results = results.filter(r => r[key] === val);
      }
    }
    return results;
  }

  findOne(collection, filters = {}) {
    this._ensureCollection(collection);
    const results = this.find(collection, filters);
    return results.length > 0 ? results[0] : null;
  }

  getById(collection, id) {
    this._ensureCollection(collection);
    return this.stores[collection].find(r => r.id === id) || null;
  }

  insert(collection, data) {
    this._ensureCollection(collection);
    const record = { id: crypto.randomBytes(12).toString('hex'), ...data, _created_at: new Date().toISOString(), _updated_at: new Date().toISOString() };
    this.stores[collection].push(record);
    this._save(collection);
    return record;
  }

  update(collection, id, data) {
    this._ensureCollection(collection);
    const idx = this.stores[collection].findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.stores[collection][idx] = { ...this.stores[collection][idx], ...data, _updated_at: new Date().toISOString() };
    this._save(collection);
    return this.stores[collection][idx];
  }

  delete(collection, id) {
    this._ensureCollection(collection);
    const idx = this.stores[collection].findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.stores[collection].splice(idx, 1);
    this._save(collection);
    return true;
  }

  count(collection, filters = {}) { return this.find(collection, filters).length; }

  aggregate(collection, field) {
    const items = this.stores[collection] || [];
    const result = {};
    for (const item of items) {
      const key = item[field];
      if (key !== undefined && key !== null) {
        result[key] = (result[key] || 0) + 1;
      }
    }
    return result;
  }

  avg(collection, field, filters = {}) {
    const items = this.find(collection, filters);
    const vals = items.map(i => i[field]).filter(v => v !== undefined && v !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  distinct(collection, field) {
    return [...new Set((this.stores[collection] || []).map(r => r[field]).filter(v => v !== undefined && v !== null))];
  }

  search(collection, query, fields = ['prompt', 'caption', 'project_type', 'phase']) {
    if (!query) return this.stores[collection] || [];
    const q = query.toLowerCase();
    return (this.stores[collection] || []).filter(r =>
      fields.some(f => r[f] && String(r[f]).toLowerCase().includes(q))
    );
  }
}

module.exports = new TrainingDatabase();
