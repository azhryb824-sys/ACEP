const db = require('./database');

class ReadinessReport {
  async generate(datasetVersionId) {
    const images = db.stores.training_images || [];
    const certified = images.filter(i => i.certification_status === 'certified');
    const projects = [...new Set(images.map(i => i.project_id).filter(Boolean))];
    const prompts = db.stores.training_prompts || [];
    const videos = db.stores.training_videos || [];
    const types = [...new Set(images.map(i => i.project_type).filter(Boolean))];
    const phases = [...new Set(images.map(i => i.phase).filter(Boolean))];
    const materialsSet = new Set();
    images.forEach(i => { if (i.materials_used) i.materials_used.split(',').forEach(m => { if (m.trim()) materialsSet.add(m.trim()); }); });
    const codes = [...new Set(images.map(i => i.code_reference).filter(Boolean))];
    const scores = images.map(i => i.quality_score).filter(s => s > 0);
    const qualityAvg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100 : 0;
    const complete = images.filter(i => (i.metadata_complete || 0) > 0.5).length;
    const metadataCompleteness = images.length > 0 ? Math.round(complete / images.length * 10000) / 100 : 0;
    const duplicates = images.filter(i => i.duplicate_status === 'duplicate').length;
    const duplicateRate = images.length > 0 ? Math.round(duplicates / images.length * 10000) / 100 : 0;
    const acceptanceRate = images.length > 0 ? Math.round(certified.length / images.length * 10000) / 100 : 0;

    const typeCounts = {};
    images.forEach(i => { const t = i.project_type || 'unknown'; typeCounts[t] = (typeCounts[t] || 0) + 1; });
    const balancing = this._assessBalance(typeCounts);

    const gaps = [];
    if (types.length < 5) gaps.push('Low project type diversity — only ' + types.length + ' types');
    if (phases.length < 5) gaps.push('Low phase diversity — only ' + phases.length + ' phases');
    if (metadataCompleteness < 70) gaps.push('Metadata completeness is low (' + metadataCompleteness + '%)');
    if (duplicateRate > 10) gaps.push('High duplicate rate (' + duplicateRate + '%)');
    if (qualityAvg < 60) gaps.push('Average quality below minimum threshold');
    if (certified.length < 100) gaps.push('Very few certified images (' + certified.length + ')');
    if (balancing.imbalanceScore < 50) gaps.push('Dataset is imbalanced (score: ' + balancing.imbalanceScore + '/100)');

    const recommendations = [];
    if (gaps.length > 0) recommendations.push('Address the following gaps: ' + gaps.join('; '));
    if (certified.length < 1000) recommendations.push('Generate more training data — current certified count: ' + certified.length);
    if (metadataCompleteness < 90) recommendations.push('Run auto-classification to improve metadata completeness');
    if (duplicateRate > 5) recommendations.push('Run duplicate removal to reduce duplicate rate');
    if (types.length < 10) recommendations.push('Increase project type diversity — current: ' + types.length + ' types');
    if (balancing.gapCategories && balancing.gapCategories.length > 0) recommendations.push('Prioritize underrepresented project types: ' + balancing.gapCategories.slice(0, 3).join(', '));
    if (gaps.length === 0 && certified.length >= 100) recommendations.push('Dataset appears ready for training');

    const overallScore = this._computeOverall(certified.length, qualityAvg, metadataCompleteness, duplicateRate, types.length, phases.length, balancing.imbalanceScore, acceptanceRate);
    const readinessStatus = overallScore >= 80 ? 'ready' : overallScore >= 50 ? 'conditional' : 'not_ready';

    db.insert('training_readiness', {
      dataset_version_id: datasetVersionId, overall_score: overallScore,
      projects_count: projects.length, images_count: certified.length,
      videos_count: videos.length, prompts_count: prompts.length,
      project_types_count: types.length, phases_count: phases.length,
      materials_count: materialsSet.size, codes_count: codes.length,
      metadata_completeness: metadataCompleteness, duplicate_rate: duplicateRate,
      quality_avg: qualityAvg, balance_scores: JSON.stringify(balancing),
      certification_stats: JSON.stringify({ certified: certified.length, total: images.length, acceptanceRate }),
      readiness_status: readinessStatus, gaps: JSON.stringify(gaps),
      recommendations: JSON.stringify(recommendations),
    });

    return {
      overallScore, readinessStatus, certifiedImages: certified.length,
      totalImages: images.length, projects: projects.length,
      prompts: prompts.length, videos: videos.length,
      projectTypes: types.length, phases: phases.length,
      materials: materialsSet.size, codes: codes.length,
      metadataCompleteness, duplicateRate, qualityAvg, acceptanceRate,
      balancing, gaps, recommendations,
      isReady: readinessStatus === 'ready',
    };
  }

  async getLatest(datasetVersionId) {
    const reports = db.find('training_readiness', { dataset_version_id: datasetVersionId });
    reports.sort((a, b) => (b._created_at || '').localeCompare(a._created_at || ''));
    return reports.length > 0 ? reports[0] : null;
  }

  _assessBalance(typeCounts) {
    const entries = Object.entries(typeCounts);
    if (entries.length === 0) return { imbalanceScore: 0, gapCategories: [] };
    const counts = entries.map(([, c]) => c);
    const max = Math.max(...counts); const min = Math.min(...counts);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const ratio = max / Math.max(min, 1);
    const imbalanceScore = ratio <= 2 ? 100 : ratio <= 5 ? Math.round(100 - (ratio - 2) * 10) : Math.max(0, 50 - (ratio - 5) * 5);
    const gapCategories = entries.filter(([, c]) => c < avg * 0.5).map(([k]) => k);
    return { imbalanceScore, ratio, avgCount: Math.round(avg), maxCategory: entries.sort((a, b) => b[1] - a[1])[0]?.[0], gapCategories };
  }

  _computeOverall(imageCount, quality, completeness, dupRate, typeCount, phaseCount, balance, acceptance) {
    let score = 0;
    score += Math.min(imageCount / 1000, 1) * 15;
    score += Math.min(quality / 100, 1) * 20;
    score += Math.min(completeness / 100, 1) * 15;
    score += Math.max(0, 1 - dupRate / 100) * 10;
    score += Math.min(typeCount / 15, 1) * 10;
    score += Math.min(phaseCount / 15, 1) * 10;
    score += Math.min(balance / 100, 1) * 10;
    score += Math.min(acceptance / 100, 1) * 10;
    return Math.round(score * 10) / 10;
  }
}

module.exports = new ReadinessReport();
