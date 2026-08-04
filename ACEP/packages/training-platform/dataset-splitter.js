const db = require('./database');

class DatasetSplitter {
  constructor() { this.defaultRatios = { train: 0.7, validation: 0.15, test: 0.15 }; }

  async split(versionId, ratios = this.defaultRatios, options = {}) {
    const certified = db.find('training_images', { certification_status: 'certified' });
    if (certified.length === 0) return { error: 'No certified images available', total: 0 };

    const balanceBy = options.balanceBy || 'project_type';
    const grouped = {};
    for (const img of certified) {
      const key = img[balanceBy] || 'unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(img);
    }

    const splits = { train: [], validation: [], test: [] };
    for (const images of Object.values(grouped)) {
      const shuffled = this._shuffle([...images]);
      const nTrain = Math.max(1, Math.floor(shuffled.length * ratios.train));
      const nVal = Math.max(1, Math.floor(shuffled.length * ratios.validation));
      splits.train.push(...shuffled.slice(0, nTrain));
      splits.validation.push(...shuffled.slice(nTrain, nTrain + nVal));
      splits.test.push(...shuffled.slice(nTrain + nVal));
    }

    const allSplit = db.insert('dataset_splits', {
      version_id: versionId, split_type: 'all',
      image_count: certified.length,
      project_types: JSON.stringify(this._countBy(certified, 'project_type')),
      phases: JSON.stringify(this._countBy(certified, 'phase')),
    });

    for (const [splitType, images] of Object.entries(splits)) {
      db.insert('dataset_splits', {
        version_id: versionId, split_type: splitType,
        image_count: images.length,
        project_types: JSON.stringify(this._countBy(images, 'project_type')),
        phases: JSON.stringify(this._countBy(images, 'phase')),
      });
      for (const img of images) {
        db.update('training_images', img.id, { split_type: splitType });
      }
    }

    return {
      splitId: allSplit.id, versionId,
      total: certified.length,
      train: splits.train.length, validation: splits.validation.length,
      test: splits.test.length, ratios, balanceBy,
      groupedTypes: Object.keys(grouped).length,
    };
  }

  async getSplitStats(versionId) {
    return db.find('dataset_splits', { version_id: versionId });
  }

  _shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  _countBy(arr, field) { const c = {}; for (const i of arr) { const k = i[field] || 'unknown'; c[k] = (c[k] || 0) + 1; } return c; }
}

module.exports = new DatasetSplitter();
