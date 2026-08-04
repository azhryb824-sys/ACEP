const db = require('./database');

class DuplicateDetectionSystem {
  async findExactDuplicates(imageRecord) {
    if (!imageRecord || !imageRecord.file_path) return [];
    return db.find('training_images', { file_path: imageRecord.file_path }).filter(r => r.id !== imageRecord.id);
  }

  async findNearDuplicates(imageRecord, threshold = 0.9) {
    if (!imageRecord) return [];
    const candidates = db.find('training_images', { project_type: imageRecord.project_type }).filter(r => r.id !== imageRecord.id && r.quality_score != null);
    const results = [];
    for (const candidate of candidates) {
      const score = this._computeSimilarity(imageRecord, candidate);
      if (score >= threshold) results.push({ image: candidate, similarity: score });
    }
    return results.sort((a, b) => b.similarity - a.similarity);
  }

  async findSimilarByPrompt(imageRecord, threshold = 0.85) {
    if (!imageRecord || !imageRecord.prompt) return [];
    const candidates = db.find('training_images', {}).filter(r => r.id !== imageRecord.id && r.prompt);
    const results = [];
    for (const candidate of candidates) {
      const score = this._promptSimilarity(imageRecord.prompt, candidate.prompt);
      if (score >= threshold) results.push({ image: candidate, similarity: score });
    }
    return results.sort((a, b) => b.similarity - a.similarity);
  }

  async detectAll(imageRecord) {
    const exact = await this.findExactDuplicates(imageRecord);
    const near = await this.findNearDuplicates(imageRecord, 0.9);
    const similar = await this.findSimilarByPrompt(imageRecord, 0.85);
    const all = [...exact.map(d => ({ ...d, type: 'exact' })), ...near.map(d => ({ ...d, type: 'near' })), ...similar.map(d => ({ ...d, type: 'similar' }))];
    const groupId = all.length > 0 ? require('crypto').randomBytes(8).toString('hex') : null;

    if (groupId) {
      db.insert('duplicate_groups', {
        group_type: all[0]?.type || 'mixed', primary_image_id: imageRecord.id,
        scores: JSON.stringify(all.map(d => d.similarity)),
        resolution: `${all.length} duplicates`,
      });
      db.update('training_images', imageRecord.id, { duplicate_status: 'duplicate', duplicate_group: groupId });
    }

    return { groupId, exact: exact.length, near: near.length, similar: similar.length, total: all.length, duplicates: all };
  }

  async getDuplicateStats() {
    const images = db.stores.training_images || [];
    const total = images.length;
    const duplicates = images.filter(i => i.duplicate_status === 'duplicate').length;
    const groups = (db.stores.duplicate_groups || []).length;
    return {
      total, duplicates,
      duplicateRate: total > 0 ? Math.round(duplicates / total * 1000) / 10 : 0,
      groups,
    };
  }

  _computeSimilarity(a, b) {
    let score = 0; let factors = 0;
    if (a.project_type && a.project_type === b.project_type) { score += 20; factors++; }
    if (a.phase && a.phase === b.phase) { score += 15; factors++; }
    if (a.finishing && a.finishing === b.finishing) { score += 10; factors++; }
    if (a.architectural_style && a.architectural_style === b.architectural_style) { score += 10; factors++; }
    if (a.camera_angle && a.camera_angle === b.camera_angle) { score += 10; factors++; }
    if (a.lighting_type && a.lighting_type === b.lighting_type) { score += 10; factors++; }
    if (a.area && b.area && Math.abs(a.area - b.area) / Math.max(a.area, b.area) < 0.1) { score += 10; factors++; }
    if (a.floors && b.floors && a.floors === b.floors) { score += 5; factors++; }
    if (a.prompt && b.prompt) { score += this._promptSimilarity(a.prompt, b.prompt) * 10; factors++; }
    return factors > 0 ? score / (factors * 100) * 100 : 0;
  }

  _promptSimilarity(p1, p2) {
    if (!p1 || !p2) return 0;
    const w1 = new Set(p1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const w2 = new Set(p2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    if (w1.size === 0 || w2.size === 0) return 0;
    let common = 0;
    for (const w of w1) { if (w2.has(w)) common++; }
    return common / Math.min(w1.size, w2.size);
  }
}

module.exports = new DuplicateDetectionSystem();
