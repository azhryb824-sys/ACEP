const fs = require('fs');
const path = require('path');
const { getLogger } = require('../logger');

const LOGGER = getLogger({ service: 'VisionTraining-ImageProcessor' });

class ImageProcessor {
  static get supportedFormats() {
    return ['.png', '.jpg', '.jpeg', '.webp'];
  }

  static validateImage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (!this.supportedFormats.includes(ext)) {
      return { valid: false, error: `Unsupported format: ${ext}. Supported: ${this.supportedFormats.join(', ')}` };
    }
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File not found' };
    }
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return { valid: false, error: 'File is empty' };
    }
    return { valid: true, size: stats.size, format: ext.substring(1) };
  }

  static async prepareImage(inputPath, outputDir, options = {}) {
    const { maxSize = 1024, format = 'png' } = options;
    const validation = this.validateImage(inputPath);
    if (!validation.valid) throw new Error(validation.error);

    const outputFilename = `${path.parse(inputPath).name}.${format}`;
    const outputPath = path.join(outputDir, outputFilename);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    LOGGER.info(`Preparing image: ${inputPath} -> ${outputPath}`);
    return { inputPath, outputPath, outputFilename, ...validation };
  }

  static async prepareBatch(inputDir, outputDir, options = {}) {
    if (!fs.existsSync(inputDir)) throw new Error(`Input directory not found: ${inputDir}`);
    const files = fs.readdirSync(inputDir).filter(f => this.supportedFormats.includes(path.extname(f).toLowerCase()));
    const results = [];
    for (const file of files) {
      try {
        const result = await this.prepareImage(path.join(inputDir, file), outputDir, options);
        results.push(result);
      } catch (e) {
        LOGGER.warn(`Skipping ${file}: ${e.message}`);
      }
    }
    return results;
  }

  static getImageDimensions(filePath) {
    return { width: 0, height: 0 };
  }

  static extractMetadata(filePath) {
    const stats = fs.statSync(filePath);
    return {
      filename: path.basename(filePath),
      size: stats.size,
      format: path.extname(filePath).substring(1).toLowerCase(),
      created: stats.birthtime,
      modified: stats.mtime,
    };
  }
}

module.exports = ImageProcessor;
