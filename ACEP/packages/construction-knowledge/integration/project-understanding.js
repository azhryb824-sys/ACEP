class ProjectUnderstandingIntegration {
  constructor(kb) {
    this.kb = kb;
  }

  analyze(projectData) {
    const type = this.kb.getProjectType(projectData.type);
    const phases = this.kb.getProjectPhases();

    const elements = [];
    if (type) {
      for (const phase of phases) {
        const phaseElements = this.kb.getElementsByPhase(phase.id);
        elements.push(...phaseElements.map(el => ({
          ...el,
          phase: phase.id,
          estimatedQuantity: this._estimateQuantity(el, projectData),
        })));
      }
    }

    return {
      projectType: type,
      totalPhases: phases.length,
      estimatedElements: elements,
      complexity: type?.complexity || 5,
      recommendations: this._generateRecommendations(type, projectData),
    };
  }

  _estimateQuantity(element, projectData) {
    const area = projectData.area || 500;
    const floors = projectData.floors || 2;
    const ratios = {
      column: 0.04 * area * floors,
      beam: 0.03 * area * floors,
      slab: 0.15 * area * floors,
      wall: 2.5 * Math.sqrt(area) * floors,
      door: 0.03 * area * floors,
      window: 0.02 * area * floors,
      tiles: 0.7 * area * floors,
      plaster: 2.0 * Math.sqrt(area) * floors * 3,
      painting: 2.0 * Math.sqrt(area) * floors * 3,
      ceiling: area * floors * 0.8,
      hvac: 0.004 * area * floors,
    };
    return ratios[element.id] || 1;
  }

  _generateRecommendations(type, data) {
    const recs = [];
    if (type?.complexity >= 8) recs.push('يتطلب المشروع استشاري متخصص نظراً لتعقيده العالي');
    if (data.floors > 5) recs.push('يفضل استخدام نظام إنشائي من الخرسانة المسلحة مع مصاعد');
    if (data.area > 1000) recs.push('يتطلب المشروع تقسيم المراحل لضمان الجدول الزمني');
    return recs;
  }
}

module.exports = { ProjectUnderstandingIntegration };
