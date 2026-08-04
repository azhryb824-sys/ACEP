class Navigation3DIntegration {
  constructor(kb) {
    this.kb = kb;
  }

  generateStructure(projectData) {
    const elements = this.kb.getElements(projectData);
    const boqData = this.kb.getBOQData();
    const scheduleData = this.kb.getScheduleData();

    const structure = [];
    for (const el of elements) {
      const boqItems = boqData.getByElementType(el.id).slice(0, 3);
      const schedule = scheduleData.getTasksByElementType(el.id);

      structure.push({
        id: `elem_${el.id}`,
        type: el.type || el.id,
        name: el.nameEn || el.name,
        category: el.category,
        boqLinks: boqItems.map(i => ({ code: i.code, name: i.name, unitPrice: i.unitPrice })),
        scheduleLinks: schedule.map(s => ({ id: s.id, name: s.name, duration: s.duration })),
        materials: this._getMaterialsForElement(el.id),
        codes: el.codeRefs || [],
      });
    }

    return structure;
  }

  _getMaterialsForElement(elementId) {
    const materials = this.kb._getDataRefs().materials;
    const map = {
      foundation: ['concrete', 'rebar', 'waterproof_membrane'],
      column: ['concrete', 'rebar'],
      beam: ['concrete', 'rebar'],
      slab: ['concrete', 'rebar'],
      wall: ['block', 'plaster_material', 'paint'],
      door: ['aluminum', 'glass', 'wood'],
      window: ['aluminum', 'glass'],
      ceiling: ['gypsum_board', 'paint'],
      tiles: ['ceramic', 'porcelain', 'marble'],
      hvac: ['duct'],
    };
    const matIds = map[elementId] || [];
    return matIds.map(id => materials[id]).filter(Boolean);
  }
}

module.exports = { Navigation3DIntegration };
