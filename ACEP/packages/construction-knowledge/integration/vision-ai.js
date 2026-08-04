class VisionAIIntegration {
  constructor(kb) {
    this.kb = kb;
  }

  getPromptContext(projectData, options = {}) {
    const type = this.kb.getProjectType(projectData.type);
    const elements = this.kb.getElementsByPhase(options.phase || 'finishing');
    const materials = this.kb.getMaterials(projectData.style);

    return {
      projectType: type?.name || projectData.type,
      style: projectData.style || 'Modern',
      area: projectData.area,
      floors: projectData.floors,
      elements: elements.slice(0, 15).map(e => e.nameEn),
      suggestedMaterials: Object.values(materials).slice(0, 10).map(m => m.nameEn),
      prompt: this._buildPrompt(projectData, options, type, elements),
    };
  }

  _buildPrompt(projectData, options, type, elements) {
    const style = projectData.style || 'Modern';
    const area = projectData.area || 500;
    const floors = projectData.floors || 2;
    const phase = options.phase || 'Completed';
    return `Professional architectural ${options.viewType || 'exterior'} view of a ${style} ${type?.nameEn || 'building'} with ${floors} floors, ${area}m² total area. ${phase} stage. High-end finishes, photorealistic rendering.`;
  }

  getElementVisualData(elementType) {
    return this.kb.getImagesByElementType(elementType);
  }
}

module.exports = { VisionAIIntegration };
