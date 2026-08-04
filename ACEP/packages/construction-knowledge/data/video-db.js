class VideoDatabase {
  constructor() {
    this.videos = [];
  }

  addVideo(entry) {
    const record = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      projectType: entry.projectType || 'general',
      phase: entry.phase || 'general',
      stage: entry.stage || 'general',
      url: entry.url || '',
      thumbnailUrl: entry.thumbnailUrl || '',
      duration: entry.duration || 0,
      type: entry.type || 'walkthrough',
      metadata: entry.metadata || {},
      tags: entry.tags || [],
      description: entry.description || '',
      createdAt: new Date().toISOString(),
    };
    this.videos.push(record);
    return record;
  }

  findByProjectType(projectType) {
    return this.videos.filter(v => v.projectType === projectType);
  }

  findByPhase(phase) {
    return this.videos.filter(v => v.phase === phase);
  }

  findByStage(stage) {
    return this.videos.filter(v => v.stage === stage);
  }

  search(query) {
    const q = query.toLowerCase();
    return this.videos.filter(v =>
      v.projectType.toLowerCase().includes(q) ||
      v.phase.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.tags.some(t => t.toLowerCase().includes(q))
    );
  }
}

module.exports = { VideoDatabase };
