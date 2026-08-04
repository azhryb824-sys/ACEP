const db = require('./database');

class ImageRecordManager {
  async createImageRecord(data) {
    const record = db.insert('training_images', {
      project_id: data.project_id, project_type: data.project_type,
      subtype: data.subtype, area: data.area, floors: data.floors,
      rooms: data.rooms, bathrooms: data.bathrooms,
      phase: data.phase, phase_id: data.phase_id,
      finishing: data.finishing, architectural_style: data.architectural_style,
      country: data.country || 'Saudi Arabia', city: data.city,
      image_source: data.image_source || 'generated',
      prompt: data.prompt, prompt_id: data.prompt_id,
      caption: data.caption,
      boq_item_id: data.boq_item_id,
      engineering_elements: Array.isArray(data.engineering_elements) ? data.engineering_elements.join(',') : data.engineering_elements,
      materials_used: Array.isArray(data.materials_used) ? data.materials_used.join(',') : data.materials_used,
      code_reference: data.code_reference,
      camera_angle: data.camera_angle, lighting_type: data.lighting_type,
      file_path: data.file_path, thumbnail_path: data.thumbnail_path,
      width: data.width, height: data.height, format: data.format,
      file_size: data.file_size, quality_score: 0,
      certification_status: 'pending', duplicate_status: 'pending',
      metadata_complete: 0, auto_classified: 0,
    });
    return record.id;
  }

  async createFromPrompt(promptRecord, imageData = {}) {
    return this.createImageRecord({
      project_id: imageData.project_id || 'unknown',
      project_type: promptRecord.projectType,
      subtype: promptRecord.subtype, area: promptRecord.area,
      floors: promptRecord.floors, phase: promptRecord.phase,
      phase_id: promptRecord.phaseId, finishing: promptRecord.finishing,
      architectural_style: promptRecord.architecturalStyle,
      prompt: promptRecord.prompt, prompt_id: promptRecord.id || null,
      camera_angle: promptRecord.cameraAngle,
      lighting_type: promptRecord.lighting,
      caption: promptRecord.prompt,
      engineering_elements: promptRecord.features,
      materials_used: [promptRecord.facadeMaterial, promptRecord.floorMaterial, promptRecord.wallMaterial].filter(Boolean).join(','),
      ...imageData,
    });
  }

  async updateImageRecord(id, data) {
    return db.update('training_images', id, data);
  }

  async getImageRecord(id) { return db.getById('training_images', id); }

  async getImageByFile(filePath) {
    return db.findOne('training_images', { file_path: filePath });
  }

  async searchImages(filters = {}, limit = 100, offset = 0) {
    let results = db.find('training_images', {
      project_type: filters.project_type, phase: filters.phase,
      finishing: filters.finishing,
      certification_status: filters.certification_status,
      split_type: filters.split_type,
    });
    if (filters.quality_min) results = results.filter(r => (r.quality_score || 0) >= filters.quality_min);
    if (filters.quality_max) results = results.filter(r => (r.quality_score || 0) <= filters.quality_max);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      results = results.filter(r => (r.caption && r.caption.toLowerCase().includes(q)) || (r.prompt && r.prompt.toLowerCase().includes(q)));
    }
    results.sort((a, b) => (b._created_at || '').localeCompare(a._created_at || ''));
    return { results: results.slice(offset, offset + limit), total: results.length };
  }

  async countImages(filters = {}) {
    return this.searchImages(filters, 1, 0).then(r => r.total);
  }

  async getProjectTypes() { return db.distinct('training_images', 'project_type').map(t => ({ project_type: t })); }

  async getPhases() { return db.distinct('training_images', 'phase').map(p => ({ phase: p })); }

  async getStats() {
    const images = db.stores.training_images || [];
    const total = images.length;
    const certified = images.filter(i => i.certification_status === 'certified').length;
    const rejected = images.filter(i => i.certification_status === 'rejected').length;
    const pending = images.filter(i => i.certification_status === 'pending').length;
    const scores = images.map(i => i.quality_score).filter(s => s > 0);
    const avgQuality = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100 : 0;
    const projectTypes = new Set(images.map(i => i.project_type).filter(Boolean)).size;
    const phases = new Set(images.map(i => i.phase).filter(Boolean)).size;
    return { total, certified, rejected, pending, avgQuality, projectTypes, phases };
  }
}

module.exports = new ImageRecordManager();
