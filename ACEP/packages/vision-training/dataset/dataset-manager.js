const fs = require('fs');
const path = require('path');
const Config = require('../config');
const MetadataSchema = require('./metadata-schema');
const ImageProcessor = require('./image-processor');
const CaptionGenerator = require('./caption-generator');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-Dataset' });

class DatasetManager {
  constructor() {
    this.entries = [];
    this.version = '1.0.0';
    this.datasetPath = Config.paths.datasets;
    this.imagesPath = Config.paths.images;
    this.captionsPath = Config.paths.captions;
    this.metadataPath = Config.paths.metadata;
  }

  getStats() {
    return {
      totalImages: this.entries.length,
      version: this.version,
      projects: [...new Set(this.entries.map(e => e.projectType).filter(Boolean))].length,
      disciplines: [...new Set(this.entries.map(e => e.discipline).filter(Boolean))],
      stages: [...new Set(this.entries.map(e => e.stage).filter(Boolean))],
      styles: [...new Set(this.entries.map(e => e.style).filter(Boolean))],
      lastUpdated: this._lastUpdated,
    };
  }

  async addImage(imagePath, metadata) {
    const validation = MetadataSchema.validate(metadata);
    if (!validation.valid) {
      throw new Error(`Invalid metadata: ${validation.errors.join('; ')}`);
    }

    const imageValidation = ImageProcessor.validateImage(imagePath);
    if (!imageValidation.valid) {
      throw new Error(`Invalid image: ${imageValidation.error}`);
    }

    const entry = MetadataSchema.createRecord(metadata);
    entry.image = path.basename(imagePath);
    entry.resolution = entry.resolution || `${imageValidation.size}`;
    entry.version = this.version;

    const entryId = `acep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const destPath = path.join(this.imagesPath, entry.image);

    if (!fs.existsSync(this.imagesPath)) {
      fs.mkdirSync(this.imagesPath, { recursive: true });
    }
    fs.copyFileSync(imagePath, destPath);

    const caption = metadata.caption || CaptionGenerator.generateForTraining(entry);
    entry.caption = caption;

    const captionPath = path.join(this.captionsPath, `${path.parse(entry.image).name}.txt`);
    if (!fs.existsSync(this.captionsPath)) {
      fs.mkdirSync(this.captionsPath, { recursive: true });
    }
    fs.writeFileSync(captionPath, caption, 'utf-8');

    const metadataFile = path.join(this.metadataPath, `${path.parse(entry.image).name}.json`);
    if (!fs.existsSync(this.metadataPath)) {
      fs.mkdirSync(this.metadataPath, { recursive: true });
    }
    fs.writeFileSync(metadataFile, JSON.stringify(entry, null, 2), 'utf-8');

    entry._id = entryId;
    entry._imagePath = destPath;
    entry._captionPath = captionPath;
    entry._metadataPath = metadataFile;
    entry._addedAt = new Date().toISOString();

    this.entries.push(entry);
    this._lastUpdated = new Date().toISOString();
    LOGGER.info(`Image added to dataset: ${entry.image} (${entry.projectType} - ${entry.discipline})`);
    return entry;
  }

  async importDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) throw new Error(`Directory not found: ${dirPath}`);
    const files = fs.readdirSync(dirPath).filter(f =>
      ImageProcessor.supportedFormats.includes(path.extname(f).toLowerCase())
    );
    const results = { added: [], skipped: [] };
    for (const file of files) {
      const imagePath = path.join(dirPath, file);
      const metadataPath = path.join(dirPath, `${path.parse(file).name}.json`);
      const captionPath = path.join(dirPath, `${path.parse(file).name}.txt`);

      let metadata = {};
      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        } catch (e) {
          LOGGER.warn(`Invalid metadata JSON for ${file}, using defaults`);
        }
      }
      if (fs.existsSync(captionPath)) {
        metadata.caption = fs.readFileSync(captionPath, 'utf-8').trim();
      }

      try {
        const entry = await this.addImage(imagePath, metadata);
        results.added.push(entry);
      } catch (e) {
        LOGGER.warn(`Skipping ${file}: ${e.message}`);
        results.skipped.push({ file, error: e.message });
      }
    }
    LOGGER.info(`Import complete: ${results.added.length} added, ${results.skipped.length} skipped`);
    return results;
  }

  async importFromGallery(galleryEntries) {
    const results = { added: [], skipped: [] };
    for (const entry of galleryEntries) {
      try {
        const metadata = {
          projectType: entry.project_type || null,
          discipline: 'Architecture',
          stage: 'Completed',
          style: 'Modern',
          caption: entry.description || entry.title || '',
        };
        const result = await this.addImage(entry.file_path, metadata);
        results.added.push(result);
      } catch (e) {
        results.skipped.push({ id: entry.id, error: e.message });
      }
    }
    return results;
  }

  splitDataset(trainRatio = 0.8, valRatio = 0.15, testRatio = 0.05) {
    const shuffled = [...this.entries].sort(() => Math.random() - 0.5);
    const total = shuffled.length;
    const trainEnd = Math.floor(total * trainRatio);
    const valEnd = trainEnd + Math.floor(total * valRatio);
    return {
      train: shuffled.slice(0, trainEnd),
      val: shuffled.slice(trainEnd, valEnd),
      test: shuffled.slice(valEnd),
    };
  }

  exportDataset(format = 'json') {
    const exportDir = path.join(this.datasetPath, `export_${this.version}`);
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    if (format === 'json') {
      const exportPath = path.join(exportDir, 'dataset.json');
      fs.writeFileSync(exportPath, JSON.stringify({ version: this.version, entries: this.entries }, null, 2));
      return exportPath;
    }

    if (format === 'diffusers') {
      const metadata = [];
      for (const entry of this.entries) {
        const captionFile = `${path.parse(entry.image).name}.txt`;
        metadata.push({ file_name: entry.image, text: entry.caption });
      }
      const metaPath = path.join(exportDir, 'metadata.jsonl');
      fs.writeFileSync(metaPath, metadata.map(m => JSON.stringify(m)).join('\n'), 'utf-8');
      return metaPath;
    }

    throw new Error(`Unsupported export format: ${format}`);
  }
}

module.exports = new DatasetManager();
