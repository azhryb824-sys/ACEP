const path = require('path');
const fs = require('fs');
const db = require('../database');

class BaseExporter {
  getImages(filters = {}) {
    let images = (db.stores.training_images || []).filter(i => i.certification_status === 'certified');
    if (filters.project_type) images = images.filter(i => i.project_type === filters.project_type);
    if (filters.phase) images = images.filter(i => i.phase === filters.phase);
    if (filters.split_type) images = images.filter(i => i.split_type === filters.split_type);
    if (filters.limit) images = images.slice(0, parseInt(filters.limit));
    return images;
  }
  formatDate() { return new Date().toISOString().replace(/[:.]/g, '-'); }
}

class JSONExporter extends BaseExporter {
  async export(filters, outputDir) {
    const images = this.getImages(filters);
    const filePath = path.join(outputDir, `training_data_${this.formatDate()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(images, null, 2));
    return { format: 'json', count: images.length, path: filePath };
  }
}

class CSVExporter extends BaseExporter {
  async export(filters, outputDir) {
    const images = this.getImages(filters);
    if (images.length === 0) return { format: 'csv', count: 0, path: null };
    const filePath = path.join(outputDir, `training_data_${this.formatDate()}.csv`);
    const headers = ['id', 'project_type', 'phase', 'finishing', 'architectural_style', 'camera_angle', 'lighting_type', 'quality_score', 'caption', 'prompt', 'area', 'floors', 'country', 'city'];
    const lines = [headers.join(',')];
    for (const img of images) {
      const vals = headers.map(h => {
        const v = img[h]; if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
      });
      lines.push(vals.join(','));
    }
    fs.writeFileSync(filePath, '\uFEFF' + lines.join('\n'), 'utf8');
    return { format: 'csv', count: images.length, path: filePath };
  }
}

class WebDatasetExporter extends BaseExporter {
  async export(filters, outputDir) {
    const images = this.getImages(filters);
    const basePath = path.join(outputDir, `webdataset_${this.formatDate()}`);
    if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
    let count = 0;
    for (const img of images) {
      const base = String(count).padStart(7, '0');
      const meta = { caption: img.caption || img.prompt, project_type: img.project_type, phase: img.phase, finishing: img.finishing, architectural_style: img.architectural_style, camera_angle: img.camera_angle, lighting_type: img.lighting_type, quality_score: img.quality_score };
      fs.writeFileSync(path.join(basePath, `${base}.json`), JSON.stringify(meta));
      if (img.file_path && fs.existsSync(img.file_path)) {
        const ext = path.extname(img.file_path) || '.png';
        fs.copyFileSync(img.file_path, path.join(basePath, `${base}${ext}`));
      }
      count++;
    }
    return { format: 'webdataset', count, path: basePath + '/' };
  }
}

class HuggingFaceExporter extends BaseExporter {
  async export(filters, outputDir) {
    const images = this.getImages(filters);
    const basePath = path.join(outputDir, `hf_dataset_${this.formatDate()}`);
    if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
    const metadata = images.map((img, i) => ({
      image_id: img.id, caption: img.caption || img.prompt, project_type: img.project_type, phase: img.phase, finishing: img.finishing, style: img.architectural_style, quality: img.quality_score, split: img.split_type || 'train',
    }));
    fs.writeFileSync(path.join(basePath, 'metadata.jsonl'), metadata.map(m => JSON.stringify(m)).join('\n'));
    fs.writeFileSync(path.join(basePath, 'dataset_info.json'), JSON.stringify({ description: 'ACEP Construction Training Dataset', version: this.formatDate(), total: images.length, features: Object.keys(metadata[0] || {}) }, null, 2));
    return { format: 'huggingface', count: images.length, path: basePath + '/' };
  }
}

class DiffusersExporter extends BaseExporter {
  async export(filters, outputDir) {
    const images = this.getImages(filters);
    const basePath = path.join(outputDir, `diffusers_${this.formatDate()}`);
    if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
    const captions = images.map(img => ({ file_name: img.id + (img.format ? '.' + img.format : '.png'), text: img.caption || img.prompt || '' }));
    fs.writeFileSync(path.join(basePath, 'metadata.jsonl'), captions.map(c => JSON.stringify(c)).join('\n'));
    return { format: 'diffusers', count: images.length, path: basePath + '/' };
  }
}

class FLUXExporter extends BaseExporter {
  async export(filters, outputDir) {
    const images = this.getImages(filters);
    const basePath = path.join(outputDir, `flux_${this.formatDate()}`);
    if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
    const entries = images.map(img => ({ image: img.id + (img.format ? '.' + img.format : '.png'), prompt: img.caption || img.prompt || '', project_type: img.project_type, phase: img.phase }));
    fs.writeFileSync(path.join(basePath, 'train_data.jsonl'), entries.map(e => JSON.stringify(e)).join('\n'));
    fs.writeFileSync(path.join(basePath, 'prompts.txt'), entries.map(e => e.prompt).join('\n'));
    return { format: 'flux', count: images.length, path: basePath + '/' };
  }
}

class ParquetExporter extends BaseExporter {
  async export(filters, outputDir) {
    const images = this.getImages(filters);
    const filePath = path.join(outputDir, `training_data_${this.formatDate()}.parquet-compatible.json`);
    fs.writeFileSync(filePath, JSON.stringify(images.map(i => ({ id: i.id, project_type: i.project_type, phase: i.phase, quality: i.quality_score, caption: i.caption })), null, 2));
    return { format: 'parquet', count: images.length, path: filePath, note: 'JSON format compatible with Parquet conversion. Install pyarrow for direct Parquet export.' };
  }
}

const EXPORTERS = {
  json: new JSONExporter(), csv: new CSVExporter(),
  parquet: new ParquetExporter(), webdataset: new WebDatasetExporter(),
  huggingface: new HuggingFaceExporter(), diffusers: new DiffusersExporter(),
  flux: new FLUXExporter(),
};

module.exports = { EXPORTERS };
