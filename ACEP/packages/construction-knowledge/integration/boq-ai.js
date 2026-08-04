class BOQAIIntegration {
  constructor(kb) {
    this.kb = kb;
  }

  generateBOQ(projectData) {
    const { type, area, floors, style } = projectData;
    const boqData = this.kb.getBOQData();
    const elements = this.kb._getDataRefs().elements;
    const items = [];

    for (const el of Object.values(elements)) {
      if (el.boqCategory === 'Concrete' || el.boqCategory === 'Masonry') {
        const boqItems = boqData.getByElementType(el.id);
        for (const template of boqItems) {
          const qty = this._calcQuantity(el.id, { area, floors });
          items.push({
            ...template,
            quantity: Math.round(qty * 100) / 100,
            totalCost: Math.round(qty * template.unitPrice * 100) / 100,
          });
        }
      }
    }

    const total = items.reduce((s, i) => s + (i.totalCost || 0), 0);
    return { projectType: type, items, totalCost: total, itemCount: items.length };
  }

  _calcQuantity(elementId, params) {
    const { area, floors } = params;
    const a = area || 500;
    const f = floors || 2;
    const map = {
      foundation: a * 0.4,
      column: a * 0.04 * f,
      beam: a * 0.03 * f,
      slab: a * 0.15 * f,
      wall: Math.sqrt(a) * 3 * f,
      door: Math.sqrt(a) * 0.3 * f,
      window: Math.sqrt(a) * 0.2 * f,
      tiles: a * 0.7 * f,
      ceiling: a * 0.8 * f,
      plaster: Math.sqrt(a) * 6 * f,
      painting: Math.sqrt(a) * 6 * f,
      facade: Math.sqrt(a) * 3 * f,
      hvac: a * 0.004 * f,
      plumbing_pipe: a * 0.1 * f,
      electrical_cable: a * 0.3 * f,
      fire_sprinkler: a * 0.02 * f,
    };
    return map[elementId] || 1;
  }
}

module.exports = { BOQAIIntegration };
