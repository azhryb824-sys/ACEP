class BOQLinker {
  constructor(scene, structureGenerator) {
    this.scene = scene;
    this.structure = structureGenerator;
    this.boqData = null;
  }

  async loadBOQ(projectId) {
    try {
      const API = process.env.ACEP_API || 'http://localhost:3000';
      const res = await fetch(`${API}/api/v1/boq/project/${projectId}`);
      if (res.ok) {
        this.boqData = await res.json();
        return this.boqData;
      }
    } catch (e) {
      console.warn('[BOQLinker] Could not load BOQ:', e.message);
    }
    return null;
  }

  linkElementsToBOQ() {
    if (!this.boqData?.items) return [];
    const links = [];
    for (const elem of this.structure.elements) {
      const matchingItems = this.boqData.items.filter(item =>
        item.category?.toLowerCase() === (elem.boqCategory || '').toLowerCase() ||
        item.name?.toLowerCase().includes(elem.type.toLowerCase())
      );
      if (matchingItems.length > 0) {
        const mesh = this.scene.getObjectById(elem.id);
        if (mesh) {
          mesh.userData.boqItems = matchingItems;
          links.push({ elementId: elem.id, boqItems: matchingItems });
        }
      }
    }
    return links;
  }

  getElementBOQ(elementId) {
    const mesh = this.scene.getObjectById(elementId);
    return mesh?.userData?.boqItems || [];
  }

  getBOQSummary() {
    if (!this.boqData?.items) return {};
    const summary = {};
    for (const item of this.boqData.items) {
      const cat = item.category || 'Other';
      if (!summary[cat]) summary[cat] = { count: 0, totalCost: 0 };
      summary[cat].count += item.quantity || 0;
      summary[cat].totalCost += (item.unitPrice || 0) * (item.quantity || 0);
    }
    return summary;
  }
}

module.exports = { BOQLinker };
