const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const STORAGE_ROOT = path.join(__dirname, 'storage');

class StorageEngine {
  constructor() {
    this.roots = {
      images: path.join(STORAGE_ROOT, 'images'),
      videos: path.join(STORAGE_ROOT, 'videos'),
      thumbnails: path.join(STORAGE_ROOT, 'thumbnails'),
      temp: path.join(STORAGE_ROOT, 'temp'),
      projects: path.join(STORAGE_ROOT, 'projects'),
    };
  }

  initialize() {
    for (const dir of Object.values(this.roots)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  generateId() {
    return crypto.randomBytes(12).toString('hex');
  }

  getProjectDir(projectId) {
    const dir = path.join(this.roots.projects, projectId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  getGenerationDir(projectId, generationId) {
    const dir = path.join(this.getProjectDir(projectId), generationId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  saveImage(projectId, generationId, imageBuffer, format = 'png', filename = null) {
    const dir = this.getGenerationDir(projectId, generationId);
    const ext = format === 'jpeg' ? 'jpg' : format;
    const name = filename || `${generationId}.${ext}`;
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, imageBuffer);
    const thumbPath = this._createThumbnail(filePath, generationId);
    return {
      filePath,
      thumbnailPath: thumbPath,
      fileSize: imageBuffer.length,
      format: ext,
      url: `/vision-ai/storage/projects/${projectId}/${generationId}/${name}`,
      thumbnailUrl: thumbPath ? `/vision-ai/storage/thumbnails/${generationId}.jpg` : null,
    };
  }

  saveVideo(projectId, generationId, videoBuffer, format = 'mp4', filename = null) {
    const dir = this.getGenerationDir(projectId, generationId);
    const ext = format;
    const name = filename || `${generationId}.${ext}`;
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, videoBuffer);
    const thumbPath = this._createThumbnail(null, generationId, true);
    return {
      filePath,
      thumbnailPath: thumbPath,
      fileSize: videoBuffer.length,
      format: ext,
      url: `/vision-ai/storage/projects/${projectId}/${generationId}/${name}`,
      thumbnailUrl: thumbPath ? `/vision-ai/storage/thumbnails/${generationId}.jpg` : null,
    };
  }

  _createThumbnail(sourcePath, id, isVideo = false) {
    try {
      const thumbDir = this.roots.thumbnails;
      const thumbPath = path.join(thumbDir, `${id}.jpg`);
      if (isVideo) {
        fs.writeFileSync(thumbPath, Buffer.alloc(100));
      }
      return thumbPath;
    } catch {
      return null;
    }
  }

  getFilePath(relativePath) {
    return path.join(STORAGE_ROOT, relativePath.replace(/^\/vision-ai\/storage\//, ''));
  }

  deleteGeneration(projectId, generationId) {
    const dir = this.getGenerationDir(projectId, generationId);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }

  getStorageStats() {
    let totalSize = 0;
    let fileCount = 0;
    const walkDir = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) walkDir(fullPath);
          else { totalSize += fs.statSync(fullPath).size; fileCount++; }
        }
      } catch {}
    };
    walkDir(STORAGE_ROOT);
    return { totalSize, fileCount, storageRoot: STORAGE_ROOT };
  }
}

module.exports = new StorageEngine();