const db = require('./database');

class StatsDashboard {
  async getAllStats() {
    const images = db.stores.training_images || [];
    const projects = db.stores.training_projects || [];
    const prompts = db.stores.training_prompts || [];
    const videos = db.stores.training_videos || [];

    const totalImages = images.length;
    const certified = images.filter(i => i.certification_status === 'certified').length;
    const rejected = images.filter(i => i.certification_status === 'rejected').length;
    const pending = images.filter(i => i.certification_status === 'pending').length;
    const scores = images.map(i => i.quality_score).filter(s => s > 0);
    const avgQuality = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100 : 0;
    const duplicates = images.filter(i => i.duplicate_status === 'duplicate').length;
    const duplicateRate = totalImages > 0 ? Math.round(duplicates / totalImages * 10000) / 100 : 0;
    const complete = images.filter(i => (i.metadata_complete || 0) > 0.5).length;
    const metadataCompleteness = totalImages > 0 ? Math.round(complete / totalImages * 10000) / 100 : 0;

    const projectTypes = [...new Set(images.map(i => i.project_type).filter(Boolean))];
    const phases = [...new Set(images.map(i => i.phase).filter(Boolean))];
    const styles = [...new Set(images.map(i => i.architectural_style).filter(Boolean))];
    const materialsSet = new Set();
    images.forEach(i => { if (i.materials_used) i.materials_used.split(',').forEach(m => { if (m.trim()) materialsSet.add(m.trim()); }); });
    const codes = [...new Set(images.map(i => i.code_reference).filter(Boolean))];

    const typeBreakdown = this._groupBy(images, 'project_type');
    const phaseBreakdown = this._groupBy(images, 'phase');
    const certBreakdown = this._groupBy(images, 'certification_status');
    const qualityRanges = { '80-100': 0, '60-80': 0, '40-60': 0, '20-40': 0, '0-20': 0 };
    images.forEach(i => {
      const s = i.quality_score || 0;
      if (s >= 80) qualityRanges['80-100']++; else if (s >= 60) qualityRanges['60-80']++; else if (s >= 40) qualityRanges['40-60']++; else if (s >= 20) qualityRanges['20-40']++; else qualityRanges['0-20']++;
    });

    return {
      projects: { total: projects.length, withImages: new Set(images.map(i => i.project_id).filter(Boolean)).size },
      images: { total: totalImages, avgQuality, certified, rejected, pending, duplicateRate, metadataCompleteness, projectTypeBreakdown: typeBreakdown, phaseBreakdown, certificationBreakdown: certBreakdown, qualityBreakdown: Object.entries(qualityRanges).map(([k, v]) => ({ range: k, count: v })).filter(x => x.count > 0) },
      videos: { total: videos.length },
      prompts: { total: prompts.length },
      diversity: { projectTypes: projectTypes.length, phases: phases.length, styles: styles.length, materials: materialsSet.size, codes: codes.length },
    };
  }

  async getTimeSeries(days = 30) {
    const images = db.stores.training_images || [];
    const dayCounts = {};
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    for (const img of images) {
      const d = img._created_at || '';
      if (d >= cutoff) {
        const day = d.slice(0, 10);
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    }
    return Object.entries(dayCounts).sort().map(([day, count]) => ({ day, count }));
  }

  _groupBy(arr, field) {
    const c = {};
    for (const i of arr) { const k = i[field] || 'unknown'; c[k] = (c[k] || 0) + 1; }
    return Object.entries(c).map(([k, v]) => ({ [field]: k, count: v })).sort((a, b) => b.count - a.count);
  }
}

module.exports = new StatsDashboard();
