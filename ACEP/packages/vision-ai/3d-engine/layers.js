class LayerManager {
  constructor(scene, structureGenerator) {
    this.scene = scene;
    this.structure = structureGenerator;
    this.layers = {
      structure: { name: 'الهيكل', enabled: true, categories: ['Structure'] },
      architecture: { name: 'المعمار', enabled: true, categories: ['Architecture'] },
      electrical: { name: 'الكهرباء', enabled: false, categories: ['Electrical'] },
      mechanical: { name: 'الميكانيكا', enabled: false, categories: ['Mechanical'] },
      plumbing: { name: 'السباكة', enabled: false, categories: ['Plumbing'] },
      firefighting: { name: 'Fire Fighting', enabled: false, categories: ['FireFighting'] },
      firealarm: { name: 'Fire Alarm', enabled: false, categories: ['FireAlarm'] },
      networks: { name: 'الشبكات', enabled: false, categories: ['Networks', 'IT', 'Data'] },
      furniture: { name: 'الأثاث', enabled: false, categories: ['Furniture'] },
      finishing: { name: 'التشطيبات', enabled: true, categories: ['Finishing'] },
    };
  }

  setLayerVisible(layerId, visible) {
    const layer = this.layers[layerId];
    if (!layer) return;
    layer.enabled = visible;
    this._applyLayers();
  }

  toggleLayer(layerId) {
    this.setLayerVisible(layerId, !this.layers[layerId]?.enabled);
  }

  _applyLayers() {
    const enabledCategories = new Set();
    for (const layer of Object.values(this.layers)) {
      if (layer.enabled) {
        for (const cat of layer.categories) enabledCategories.add(cat);
      }
    }
    for (const elem of this.structure.elements) {
      const mesh = this.scene.getObjectById(elem.id);
      if (mesh) {
        mesh.visible = enabledCategories.has(elem.category) || elem.category === 'Structure';
      }
    }
  }

  getLayers() {
    const result = {};
    for (const [id, layer] of Object.entries(this.layers)) {
      result[id] = { ...layer };
    }
    return result;
  }

  getEnabledCategories() {
    const cats = new Set();
    for (const layer of Object.values(this.layers)) {
      if (layer.enabled) {
        for (const cat of layer.categories) cats.add(cat);
      }
    }
    return cats;
  }
}

module.exports = { LayerManager };
