const { ThreeScene } = require('./core');
const { Navigator } = require('./navigator');
const { AIStructureGenerator } = require('./ai-structure-generator');
const { BOQLinker } = require('./boq-linker');
const { ScheduleLinker } = require('./schedule-linker');
const { InteractionManager } = require('./interaction');
const { LayerManager } = require('./layers');
const { SearchManager } = require('./search');
const { MiniMap } = require('./mini-map');
const { LODManager } = require('./lod-manager');
const { VRBridge } = require('./vr-bridge');

class ThreeDEngine {
  constructor(containerId = 'acep-3d-container') {
    this.containerId = containerId;
    this.scene = null;
    this.navigator = null;
    this.structureGenerator = null;
    this.boqLinker = null;
    this.scheduleLinker = null;
    this.interaction = null;
    this.layers = null;
    this.search = null;
    this.miniMap = null;
    this.lod = null;
    this.vr = null;
    this.initialized = false;
  }

  async init() {
    this.scene = new ThreeScene(this.containerId);
    await this.scene.init();

    this.structureGenerator = new AIStructureGenerator(this.scene);
    this.navigator = new Navigator(this.scene);
    this.boqLinker = new BOQLinker(this.scene, this.structureGenerator);
    this.scheduleLinker = new ScheduleLinker(this.scene, this.structureGenerator);
    this.interaction = new InteractionManager(this.scene);
    this.layers = new LayerManager(this.scene, this.structureGenerator);
    this.search = new SearchManager(this.scene, this.structureGenerator, this.navigator);
    this.miniMap = new MiniMap(this.scene);
    this.lod = new LODManager(this.scene);
    this.vr = new VRBridge(this.scene);

    this.initialized = true;
    return this;
  }

  async buildProject(projectId, projectParams, aiData = {}) {
    if (!this.initialized) await this.init();
    await this.structureGenerator.generate(projectId, projectParams, aiData);
    await this.boqLinker.loadBOQ(projectId);
    this.boqLinker.linkElementsToBOQ();
    await this.scheduleLinker.loadSchedule(projectId);
    this.layers._applyLayers();
    this.scene.emit('projectBuilt', { projectId, elements: this.structureGenerator.elements.length });
    return this.structureGenerator.elements;
  }

  setNavigationMode(mode) {
    this.navigator.setMode(mode);
  }

  setTimeProgress(progress) {
    this.scheduleLinker.setTime(progress);
  }

  setSectionHeight(y) {
    this.navigator.setSectionHeight(y);
  }

  setBirdAltitude(alt) {
    this.navigator.setBirdAltitude(alt);
  }

  goToFloor(floor) {
    this.navigator.goToFloor(floor);
  }

  searchElements(query) {
    return this.search.search(query);
  }

  toggleLayer(layerId) {
    this.layers.toggleLayer(layerId);
  }

  setLayerVisible(layerId, visible) {
    this.layers.setLayerVisible(layerId, visible);
  }

  getElementData(elementId) {
    const elem = this.structureGenerator.getElementById(elementId);
    if (!elem) return null;
    return {
      ...elem,
      boq: this.boqLinker.getElementBOQ(elementId),
      schedule: this.scheduleLinker.getElementSchedule(elementId),
    };
  }

  dispose() {
    this.navigator?.dispose();
    this.interaction?.dispose();
    this.lod?.dispose();
    this.scene?.dispose();
    this.initialized = false;
  }
}

module.exports = { ThreeDEngine, ThreeScene, Navigator, AIStructureGenerator, BOQLinker, ScheduleLinker, InteractionManager, LayerManager, SearchManager, MiniMap, LODManager, VRBridge };
