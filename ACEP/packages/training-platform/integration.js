const db = require('./database');
const imageRecords = require('./image-record');
const qa = require('./quality-assessment');
const dups = require('./duplicate-detection');
const cert = require('./certification');
const background = require('./background-processor');

class TrainingPlatformIntegration {
  constructor() {
    this.connected = false;
    this.modules = {};
  }

  connect(moduleName, moduleInstance) {
    this.modules[moduleName] = moduleInstance;
    return this;
  }

  async captureGeneratedImage(generationResult, projectParams = {}) {
    if (!generationResult || !generationResult.prompt) return null;

    const existing = db.findOne('training_images', { file_path: generationResult.filePath || '' });
    if (existing) return existing;

    const imageId = await imageRecords.createImageRecord({
      project_id: projectParams.projectId || generationResult.projectId || 'unknown',
      project_type: projectParams.type || generationResult.projectType || 'unknown',
      phase: generationResult.phase || projectParams.phase || 'unknown',
      finishing: projectParams.finishing || null,
      architectural_style: projectParams.style || generationResult.architecturalStyle || null,
      prompt: generationResult.prompt,
      prompt_id: generationResult.promptId || null,
      caption: generationResult.prompt,
      camera_angle: generationResult.cameraAngle || projectParams.viewType || null,
      lighting_type: generationResult.lighting || null,
      file_path: generationResult.filePath || '',
      thumbnail_path: generationResult.thumbnailPath || '',
      width: generationResult.width || 0,
      height: generationResult.height || 0,
      format: generationResult.mimeType ? generationResult.mimeType.split('/')[1] : 'png',
      image_source: 'generated',
    });

    const record = await imageRecords.getImageRecord(imageId);
    background.enqueueImage(record);

    return record;
  }

  async captureImportedImage(imageData, projectData = {}) {
    return imageRecords.createImageRecord({
      project_id: projectData.projectId || 'imported',
      project_type: imageData.project_type || projectData.type || 'unknown',
      phase: imageData.phase || projectData.phase || null,
      finishing: imageData.finishing || null,
      architectural_style: imageData.architectural_style || null,
      prompt: imageData.prompt || imageData.caption || null,
      caption: imageData.caption || imageData.description || null,
      file_path: imageData.file_path || '',
      width: imageData.width || 0,
      height: imageData.height || 0,
      format: imageData.format || 'png',
      image_source: imageData.image_source || 'imported',
      ...projectData,
    });
  }

  async getTrainingBatch(splitType = 'train', limit = 100, filters = {}) {
    let images = (db.stores.training_images || []).filter(i => i.certification_status === 'certified' && i.split_type === splitType);
    if (filters.project_type) images = images.filter(i => i.project_type === filters.project_type);
    images.sort(() => Math.random() - 0.5);
    return images.slice(0, limit);
  }

  async getDatasetStats() {
    const images = db.stores.training_images || [];
    const total = images.length;
    const certified = images.filter(i => i.certification_status === 'certified').length;
    const ready = images.filter(i => i.certification_status === 'certified' && i.split_type).length;
    return { total, certified, readyForTraining: ready };
  }

  async importFromEGT(uets, options = {}) {
    const limit = options.limit || 200;
    if (!uets) return { ok: false, error: 'UETS not configured' };

    let egts = [];
    try { egts = uets.getAllEGT ? uets.getAllEGT() : []; } catch { egts = []; }

    let imported = 0;
    const importedIds = [];
    for (const egt of egts.slice(0, limit)) {
      const images = (egt.images && Array.isArray(egt.images.generated)) ? egt.images.generated : [];
      const prompts = (egt.images && Array.isArray(egt.images.prompts)) ? egt.images.prompts : [];
      const type = egt.classification && egt.classification.projectType;
      if (images.length === 0 && prompts.length === 0) continue;
      try {
        const rec = await this.captureImportedImage({
          prompt: prompts[0] || '',
          caption: (egt.description && egt.description.en) || type || '',
          file_path: images[0] || '',
          project_type: type,
        }, {
          projectId: egt.uuid,
          source: 'egt',
          confidence: egt.confidence,
        });
        importedIds.push(rec && rec.id);
        imported++;
      } catch { /* skip */ }
    }

    return { ok: true, imported, importedIds };
  }

  isReady() { return true; }
}

module.exports = new TrainingPlatformIntegration();
