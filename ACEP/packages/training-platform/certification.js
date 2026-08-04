const db = require('./database');
const qa = require('./quality-assessment');
const dups = require('./duplicate-detection');

class CertificationSystem {
  getRequiredFields() { return ['project_type', 'phase', 'architectural_style', 'finishing', 'camera_angle', 'lighting_type']; }

  async certifyImage(imageRecord) {
    if (!imageRecord) return { certified: false, reason: 'No image record' };
    const checks = {};
    checks.quality = await this._checkQuality(imageRecord);
    checks.metadata = this._checkMetadata(imageRecord);
    checks.duplicates = await this._checkDuplicates(imageRecord);

    const failed = Object.entries(checks).filter(([, v]) => !v.passed);
    const allPassed = failed.length === 0;

    if (allPassed) {
      db.update('training_images', imageRecord.id, { certification_status: 'certified', certification_date: new Date().toISOString() });
      return { certified: true, imageId: imageRecord.id, checks };
    }
    db.update('training_images', imageRecord.id, { certification_status: 'rejected' });
    return { certified: false, imageId: imageRecord.id, checks, failed: failed.map(f => f[0]), reasons: failed.map(f => f[1].reason) };
  }

  async batchCertify(limit = 100) {
    const pending = (db.stores.training_images || []).filter(i => i.certification_status === 'pending').slice(0, limit);
    const results = [];
    for (const img of pending) results.push(await this.certifyImage(img));
    return { processed: results.length, certified: results.filter(r => r.certified).length, rejected: results.filter(r => !r.certified).length, results };
  }

  async _checkQuality(imageRecord) {
    if (imageRecord.quality_score >= qa.getMinQualityThreshold()) return { passed: true, score: imageRecord.quality_score };
    const assessment = await qa.assessImage(imageRecord);
    if (assessment && assessment.passed) return { passed: true, score: assessment.overall };
    return { passed: false, reason: `Quality score ${imageRecord.quality_score || 0} below minimum ${qa.getMinQualityThreshold()}`, score: imageRecord.quality_score || 0 };
  }

  _checkMetadata(imageRecord) {
    const missing = this.getRequiredFields().filter(f => !imageRecord[f]);
    if (missing.length === 0) return { passed: true };
    return { passed: false, reason: `Missing metadata fields: ${missing.join(', ')}`, missing };
  }

  async _checkDuplicates(imageRecord) {
    if (imageRecord.duplicate_status === 'duplicate') return { passed: false, reason: 'Image is marked as duplicate' };
    const result = await dups.detectAll(imageRecord);
    if (result.total === 0) return { passed: true };
    if (result.exact > 0) return { passed: false, reason: `Exact duplicates found: ${result.exact}`, duplicates: result.exact };
    return { passed: true, warning: `${result.total} similar images found but not exact duplicates` };
  }
}

module.exports = new CertificationSystem();
