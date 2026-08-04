const path = require('path');
const fs = require('fs');

class PromptDatabase {
  constructor(storagePath) {
    this.storagePath = storagePath || path.join(__dirname, '..', '..', '..', 'data', 'prompts');
    this._ensureDir();
    this.prompts = [];
    this.imageLinks = new Map();
    this.index = new Map();
    this._loaded = false;
  }

  _ensureDir() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  _getBatchPath(batchIndex) {
    return path.join(this.storagePath, `prompts_batch_${String(batchIndex).padStart(6, '0')}.json`);
  }

  _getIndexPath() {
    return path.join(this.storagePath, 'prompt_index.json');
  }

  save(promptData) {
    const entry = {
      id: `PRM-${String(this.prompts.length + 1).padStart(8, '0')}`,
      ...promptData,
      savedAt: new Date().toISOString(),
    };
    this.prompts.push(entry);
    this.index.set(entry.hash, entry.id);
    return entry;
  }

  saveBatch(promptArray) {
    const saved = [];
    for (const p of promptArray) {
      saved.push(this.save(p));
    }
    this._flushBatch();
    return saved;
  }

  linkImage(promptId, imageData) {
    if (!this.imageLinks.has(promptId)) {
      this.imageLinks.set(promptId, []);
    }
    this.imageLinks.get(promptId).push({
      imageId: imageData.id || imageData.imageId,
      filePath: imageData.filePath,
      thumbnailPath: imageData.thumbnailPath,
      url: imageData.url,
      generatedAt: imageData.generatedAt || new Date().toISOString(),
      modelUsed: imageData.modelUsed || 'unknown',
      metadata: imageData.metadata || {},
    });
  }

  getByHash(hash) {
    return this.prompts.find(p => p.hash === hash);
  }

  getById(id) {
    return this.prompts.find(p => p.id === id);
  }

  getByProjectType(type) {
    return this.prompts.filter(p => p.projectType === type);
  }

  getByPhase(phaseId) {
    return this.prompts.filter(p => p.phaseId === phaseId);
  }

  getByFinishing(finishing) {
    return this.prompts.filter(p => p.finishing && p.finishing.toLowerCase() === finishing.toLowerCase());
  }

  getImagesForPrompt(promptId) {
    return this.imageLinks.get(promptId) || [];
  }

  search(query) {
    const q = query.toLowerCase();
    return this.prompts.filter(p =>
      p.prompt.toLowerCase().includes(q) ||
      p.projectType?.toLowerCase().includes(q) ||
      p.subtype?.toLowerCase().includes(q) ||
      p.phase?.toLowerCase().includes(q)
    );
  }

  getStats() {
    const byType = {};
    const byPhase = {};
    const byFinishing = {};
    const byStyle = {};

    for (const p of this.prompts) {
      byType[p.projectType] = (byType[p.projectType] || 0) + 1;
      byPhase[p.phaseId] = (byPhase[p.phaseId] || 0) + 1;
      if (p.finishing) byFinishing[p.finishing] = (byFinishing[p.finishing] || 0) + 1;
      if (p.architecturalStyle) byStyle[p.architecturalStyle] = (byStyle[p.architecturalStyle] || 0) + 1;
    }

    return {
      total: this.prompts.length,
      totalImagesLinked: this.imageLinks.size,
      uniqueHashes: this.index.size,
      byProjectType: byType,
      byPhase: byPhase,
      byFinishing: byFinishing,
      byStyle: byStyle,
    };
  }

  _flushBatch() {
    if (this.prompts.length === 0) return;
    const batchIndex = Math.floor((this.prompts.length - 1) / 10000);
    const batchPath = this._getBatchPath(batchIndex);
    const start = batchIndex * 10000;
    const batch = this.prompts.slice(start, start + 10000);
    fs.writeFileSync(batchPath, JSON.stringify(batch, null, 2), 'utf8');
    this._saveIndex();
  }

  _saveIndex() {
    const indexData = {
      total: this.prompts.length,
      lastBatch: Math.floor(this.prompts.length / 10000),
      updatedAt: new Date().toISOString(),
      stats: this.getStats(),
    };
    fs.writeFileSync(this._getIndexPath(), JSON.stringify(indexData, null, 2), 'utf8');
  }

  exportToJSONL(filePath) {
    const outPath = filePath || path.join(this.storagePath, 'training_prompts.jsonl');
    const stream = fs.createWriteStream(outPath, { flags: 'w' });
    for (const p of this.prompts) {
      const entry = {
        prompt: p.prompt,
        projectType: p.projectType,
        subtype: p.subtype,
        area: p.area,
        floors: p.floors,
        phase: p.phase,
        phaseId: p.phaseId,
        finishing: p.finishing,
        style: p.architecturalStyle,
        lighting: p.lighting,
        cameraAngle: p.cameraAngle,
        qualityTags: p.qualityTags,
        constraintTags: p.constraintTags,
        images: this.imageLinks.get(p.id) || [],
      };
      stream.write(JSON.stringify(entry) + '\n');
    }
    stream.end();
    return outPath;
  }

  exportToJSON(filePath) {
    const outPath = filePath || path.join(this.storagePath, 'training_prompts.json');
    const data = {
      exportedAt: new Date().toISOString(),
      total: this.prompts.length,
      prompts: this.prompts,
      imageLinks: Object.fromEntries(this.imageLinks),
    };
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
    return outPath;
  }
}

module.exports = { PromptDatabase };
