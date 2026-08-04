/**
 * Visual Linkage — Link BOQ Items to Vision AI & Video Generation
 * Phase 10: Visual Linkage
 * Phase 11: Video Generation
 *
 * Uses existing Vision AI and Video engines — no new system created.
 */
class VisualLinkage {
  constructor(ai, kb) {
    this.ai = ai;
    this.kb = kb;
  }

  generateItemPrompt(item, project) {
    const type = project.digitalProfile?.projectType?.primary || project.extracted?.type || 'مشروع';
    const stage = item.phaseName || item.phase || 'Construction';
    const element = item.element || item.description || item.code;
    const material = item.material || '';
    return {
      code: item.code,
      description: item.description,
      prompt: `Professional architectural construction photography of ${element} during ${stage} stage for a ${type} project. ${material ? material + ', ' : ''}high detail, photorealistic, construction site, workers in background, safety equipment, 8k resolution, architectural visualization quality. NO people visible in foreground.`,
      stage,
      element: item.element,
      material: item.material,
      quantity: item.quantity,
      unit: item.unit,
      phase: item.phase
    };
  }

  generatePhasePrompts(project, boqItems) {
    const phases = {};
    for (const item of boqItems) {
      const phase = item.phase || 'General';
      if (!phases[phase]) phases[phase] = { phase, phaseName: item.phaseName || phase, items: [], count: 0 };
      phases[phase].items.push(this.generateItemPrompt(item, project));
      phases[phase].count++;
    }
    return Object.values(phases).map(p => ({
      ...p,
      phasePrompt: `Aerial construction timelapse photography of ${p.phaseName} stage of a ${project.digitalProfile?.projectType?.primary || 'construction'} project, showing progress from start to completion of this phase, 4k resolution, architectural photography style, golden hour lighting. NO people or vehicles visible.`
    }));
  }

  generateVideoScript(project, boqItems) {
    const phases = this.generatePhasePrompts(project, boqItems);
    return {
      title: `مراحل تنفيذ ${project.metadata?.name || 'المشروع'}`,
      projectType: project.digitalProfile?.projectType?.primary || project.extracted?.type || 'مشروع',
      totalItems: boqItems.length,
      totalPhases: phases.length,
      duration: phases.length * 3000,
      scenes: phases.map((p, i) => ({
        scene: i + 1,
        phase: p.phaseName,
        prompt: p.phasePrompt,
        duration: 3000,
        items: p.count
      })),
      // Uses existing video generation engine — no new system
      engine: 'existing-acep-video-engine'
    };
  }
}

module.exports = VisualLinkage;
