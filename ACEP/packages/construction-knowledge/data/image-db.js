class ImageDatabase {
  constructor() {
    this.images = [];
  }

  addImage(entry) {
    const record = {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      elementType: entry.elementType || 'general',
      projectType: entry.projectType || 'general',
      phase: entry.phase || 'general',
      angle: entry.angle || 'front',
      timeOfDay: entry.timeOfDay || 'day',
      viewType: entry.viewType || 'exterior',
      url: entry.url || '',
      thumbnailUrl: entry.thumbnailUrl || '',
      metadata: entry.metadata || {},
      tags: entry.tags || [],
      description: entry.description || '',
      createdAt: new Date().toISOString(),
    };
    this.images.push(record);
    return record;
  }

  findByElementType(elementType) {
    return this.images.filter(i => i.elementType === elementType);
  }

  findByProjectType(projectType) {
    return this.images.filter(i => i.projectType === projectType);
  }

  findByPhase(phase) {
    return this.images.filter(i => i.phase === phase);
  }

  search(query) {
    const q = query.toLowerCase();
    return this.images.filter(i =>
      i.elementType.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.tags.some(t => t.toLowerCase().includes(q)) ||
      i.phase.toLowerCase().includes(q)
    );
  }
}

module.exports = { ImageDatabase };
