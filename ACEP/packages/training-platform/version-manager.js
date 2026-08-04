const db = require('./database');

class VersionManager {
  async createVersion(description = '', creator = 'system', notes = '') {
    const version = this._nextVersion();
    const record = db.insert('dataset_versions', {
      version, description, creator, notes,
      project_count: 0, image_count: 0, video_count: 0, prompt_count: 0,
      quality_avg: 0, acceptance_rate: 0, metadata_completeness: 0,
      balance_scores: '{}', status: 'draft',
    });
    return { id: record.id, version };
  }

  async publishVersion(id) {
    const images = db.stores.training_images || [];
    const projects = [...new Set(images.map(i => i.project_id).filter(Boolean))];
    const prompts = db.stores.training_prompts || [];
    const videos = db.stores.training_videos || [];
    const certified = images.filter(i => i.certification_status === 'certified').length;
    const scores = images.map(i => i.quality_score).filter(s => s > 0);
    const avgQ = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100 : 0;
    const acceptance = images.length > 0 ? Math.round(certified / images.length * 10000) / 100 : 0;
    const complete = images.filter(i => (i.metadata_complete || 0) > 0.5).length;
    const comp = images.length > 0 ? Math.round(complete / images.length * 10000) / 100 : 0;

    return db.update('dataset_versions', id, {
      project_count: projects.length, image_count: images.length,
      video_count: videos.length, prompt_count: prompts.length,
      quality_avg: avgQ, acceptance_rate: acceptance,
      metadata_completeness: comp, status: 'published',
    });
  }

  async getVersion(id) { return db.getById('dataset_versions', id); }

  async listVersions() {
    const versions = [...(db.stores.dataset_versions || [])];
    versions.sort((a, b) => (b._created_at || '').localeCompare(a._created_at || ''));
    return versions;
  }

  async getLatestVersion() {
    const versions = (db.stores.dataset_versions || []).filter(v => v.status === 'published');
    versions.sort((a, b) => (b._created_at || '').localeCompare(a._created_at || ''));
    return versions.length > 0 ? versions[0] : null;
  }

  _nextVersion() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = now.getTime().toString(36).slice(-4).toUpperCase();
    return `v${date}-${seq}`;
  }
}

module.exports = new VersionManager();
