const db = require('./database');

class DatasetBalancer {
  async analyze(versionId) {
    const certified = db.find('training_images', { certification_status: 'certified' });
    if (certified.length === 0) return { error: 'No certified images', total: 0 };

    const analysis = {
      total: certified.length,
      projectTypeDistribution: this._analyzeField(certified, 'project_type'),
      phaseDistribution: this._analyzeField(certified, 'phase'),
      finishingDistribution: this._analyzeField(certified, 'finishing'),
      styleDistribution: this._analyzeField(certified, 'architectural_style'),
      qualityDistribution: this._analyzeQuality(certified),
      gaps: this._findGaps(this._analyzeField(certified, 'project_type')),
      recommendations: [],
      imbalanceScore: 0,
    };

    analysis.recommendations = this._generateRecommendations(analysis.gaps);
    analysis.imbalanceScore = this._computeImbalanceScore(analysis.projectTypeDistribution);

    db.insert('balance_analyses', {
      dataset_version_id: versionId,
      project_type_distribution: JSON.stringify(analysis.projectTypeDistribution),
      phase_distribution: JSON.stringify(analysis.phaseDistribution),
      finishing_distribution: JSON.stringify(analysis.finishingDistribution),
      style_distribution: JSON.stringify(analysis.styleDistribution),
      quality_distribution: JSON.stringify(analysis.qualityDistribution),
      gaps: JSON.stringify(analysis.gaps),
      recommendations: JSON.stringify(analysis.recommendations),
    });

    return analysis;
  }

  async getLatestAnalysis(versionId) {
    const analyses = db.find('balance_analyses', { dataset_version_id: versionId });
    analyses.sort((a, b) => (b._created_at || '').localeCompare(a._created_at || ''));
    return analyses.length > 0 ? analyses[0] : null;
  }

  _analyzeField(images, field) {
    const counts = {};
    for (const img of images) { const k = img[field] || 'unknown'; counts[k] = (counts[k] || 0) + 1; }
    const total = images.length;
    const result = {};
    for (const [k, c] of Object.entries(counts)) result[k] = { count: c, percentage: Math.round(c / total * 10000) / 100 };
    return result;
  }

  _analyzeQuality(images) {
    const ranges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    for (const img of images) {
      const s = img.quality_score || 0;
      if (s <= 20) ranges['0-20']++; else if (s <= 40) ranges['21-40']++; else if (s <= 60) ranges['41-60']++; else if (s <= 80) ranges['61-80']++; else ranges['81-100']++;
    }
    const total = images.length;
    const result = {};
    for (const [k, c] of Object.entries(ranges)) result[k] = { count: c, percentage: total > 0 ? Math.round(c / total * 10000) / 100 : 0 };
    return result;
  }

  _findGaps(distribution) {
    const gaps = [];
    const vals = Object.values(distribution).map(v => v.count);
    if (vals.length === 0) return gaps;
    const max = Math.max(...vals); const min = Math.min(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const threshold = avg * 0.5;
    for (const [k, v] of Object.entries(distribution)) {
      if (v.count < threshold) gaps.push({ category: k, count: v.count, percentage: v.percentage, gap: Math.round((threshold - v.count) / threshold * 100), priority: v.count < threshold * 0.5 ? 'high' : 'medium' });
    }
    gaps.push({ category: 'BALANCE_SUMMARY', maxCategory: Object.entries(distribution).sort((a, b) => b[1].count - a[1].count)[0]?.[0], maxCount: max, minCount: min, avgCount: Math.round(avg), ratio: Math.round(max / Math.max(min, 1)) });
    return gaps.sort((a, b) => a.priority === 'high' ? -1 : 1);
  }

  _generateRecommendations(gaps) {
    const recs = [];
    for (const gap of gaps) {
      if (gap.priority === 'high') recs.push(`Prioritize generating data for "${gap.category}" — only ${gap.count} images (${gap.percentage}%), gap: ${gap.gap}% below target`);
      else if (gap.priority === 'medium') recs.push(`Consider adding more "${gap.category}" data — ${gap.count} images (${gap.percentage}%)`);
    }
    const s = gaps.find(g => g.category === 'BALANCE_SUMMARY');
    if (s && s.ratio > 5) recs.push(`CRITICAL: Dataset is heavily imbalanced — ${s.maxCategory} has ${s.ratio}x more images than the smallest category`);
    if (recs.length === 0) recs.push('Dataset appears well-balanced across categories');
    return recs;
  }

  _computeImbalanceScore(distribution) {
    const vals = Object.values(distribution).map(v => v.count);
    if (vals.length <= 1) return 100;
    const ratio = Math.max(...vals) / Math.max(Math.min(...vals), 1);
    if (ratio <= 2) return 100; if (ratio <= 5) return Math.round(100 - (ratio - 2) * 10); if (ratio <= 10) return Math.round(50 - (ratio - 5) * 5);
    return Math.max(0, Math.round(25 - (ratio - 10) * 2));
  }
}

module.exports = new DatasetBalancer();
