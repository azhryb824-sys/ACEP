(function() {
'use strict';

class ACEP3DNavEngine {
  constructor() {
    this.initialized = false;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.elements = [];
    this.elementInfo = null;
    this.overlays = null;
    this.schedule = null;
    this.projectData = null;
    this.selectedElement = null;
    this.hoveredElement = null;
    this.animFrameId = null;
    this.container = null;
    this.clock = null;
    this.THREE = null;
    this._callbacks = {};
    this._layers = { structure: true, architecture: true, finishing: true, mep: false };
    this._phaseProgress = 1;
    this._currentFloor = 0;
    this._totalFloors = 0;
  }

  async init(containerId = 'acep-3d-container') {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`3D container #${containerId} not found`);

    this.THREE = await this._loadThree();
    if (!this.THREE) throw new Error('Three.js failed to load');

    this.clock = new this.THREE.Clock();
    this._createScene();
    this._createRenderer();
    this._createCamera();
    this._addLights();
    this._addGround();
    this._initControls();
    this._initElementInfo();
    this._initOverlays();
    this._bindEvents();
    this._startLoop();

    this.initialized = true;
    this._emit('ready', { engine: this });
    return this;
  }

  _initControls() {
    this.controls = new window.ACEP_3D.SmartCameraController(this);
  }

  _initElementInfo() {
    this.elementInfo = new window.ACEP_3D.ElementInfoSystem(this);
  }

  _initOverlays() {
    this.overlays = new window.ACEP_3D.OverlayManager(this);
  }

  async loadProject(projectData) {
    this.projectData = projectData || {};
    await this._buildSpatialModel();
    this._emit('projectLoaded', { elements: this.elements.length });
    return this.elements;
  }

  setNavigationMode(mode) {
    if (this.controls) {
      this.controls.setMode(mode);
    }
  }

  goToFloor(floor) {
    if (floor < 0 || floor >= this._totalFloors) return;
    this._currentFloor = floor;
    const y = floor * 3.5 + 1.5;
    if (this.controls) {
      this.controls.focusOn(new this.THREE.Vector3(0, y, 0));
    }
    this._emit('floorChanged', floor);
  }

  setPhaseProgress(progress) {
    this._phaseProgress = Math.max(0, Math.min(1, progress));
    this._updatePhaseVisibility();
    this._emit('phaseChanged', progress);
  }

  toggleLayer(layerId) {
    this._layers[layerId] = !this._layers[layerId];
    this._updateLayerVisibility();
    this._emit('layerToggled', layerId, this._layers[layerId]);
  }

  setLayerVisible(layerId, visible) {
    this._layers[layerId] = visible;
    this._updateLayerVisibility();
  }

  searchElements(query) {
    if (!query) return this.elements;
    const q = query.toLowerCase();
    return this.elements.filter(e =>
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.type && e.type.toLowerCase().includes(q)) ||
      (e.boqCode && e.boqCode.toLowerCase().includes(q)) ||
      (e.material && e.material.toLowerCase().includes(q))
    );
  }

  getElementById(id) {
    return this.elements.find(e => e.id === id) || null;
  }

  highlightElements(filter, color = 0x00ff88) {
    this._clearHighlights();
    this.elements.forEach(e => {
      if (filter(e)) {
        e.mesh && this._highlightMesh(e.mesh, color);
      }
    });
  }

  clearHighlights() {
    this._clearHighlights();
  }

  applyOverlay(type, data) {
    if (this.overlays) {
      this.overlays.apply(type, data);
    }
  }

  clearOverlays() {
    if (this.overlays) this.overlays.clear();
  }

  showElementInfo(elementId) {
    const el = this.getElementById(elementId);
    if (!el) return;
    this.selectedElement = el;
    if (this.elementInfo) this.elementInfo.select(el);
    this._emit('elementSelected', el);
  }

  hideElementInfo() {
    this.selectedElement = null;
    if (this.elementInfo) this.elementInfo.deselect();
    this._emit('elementDeselected');
  }

  focusOnElement(elementId) {
    const el = this.getElementById(elementId);
    if (!el || !el.mesh) return;
    const box = new this.THREE.Box3().setFromObject(el.mesh);
    const center = box.getCenter(new this.THREE.Vector3());
    const size = box.getSize(new this.THREE.Vector3());
    const dist = Math.max(size.x, size.y, size.z) * 2;
    if (this.controls) {
      this.controls.focusOn(center, dist);
    }
  }

  getFloors() {
    return this._totalFloors;
  }

  getCurrentFloor() {
    return this._currentFloor;
  }

  getProjectSummary() {
    if (!this.projectData) return null;
    return {
      type: this.projectData.type || 'Unknown',
      floors: this._totalFloors,
      elements: this.elements.length,
      boqItems: (this.projectData.boqItems || []).length,
      totalCost: this.projectData.totalCost || 0,
    };
  }

  on(event, callback) {
    if (!this._callbacks[event]) this._callbacks[event] = [];
    this._callbacks[event].push(callback);
  }

  off(event, callback) {
    if (!this._callbacks[event]) return;
    this._callbacks[event] = this._callbacks[event].filter(c => c !== callback);
  }

  dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.elementInfo) this.elementInfo.dispose();
    if (this.overlays) this.overlays.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    this._clearEvents();
    this.initialized = false;
  }

  _emit(event, ...args) {
    if (this._callbacks[event]) {
      this._callbacks[event].forEach(cb => cb(...args));
    }
  }

  async _loadThree() {
    if (typeof window.THREE !== 'undefined') return window.THREE;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => {
        if (window.THREE) {
          const script2 = document.createElement('script');
          script2.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
          script2.onload = () => resolve(window.THREE);
          script2.onerror = () => resolve(window.THREE);
          document.head.appendChild(script2);
        } else {
          reject(new Error('Failed to load THREE'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Three.js'));
      document.head.appendChild(script);
    });
  }

  _createScene() {
    this.scene = new this.THREE.Scene();
    this.scene.background = new this.THREE.Color(0x1a1a2e);
    this.scene.fog = new this.THREE.Fog(0x1a1a2e, 100, 300);
  }

  _createRenderer() {
    this.renderer = new this.THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  _createCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new this.THREE.PerspectiveCamera(60, aspect, 0.1, 500);
    this.camera.position.set(25, 18, 30);
    this.camera.lookAt(0, 0, 0);
  }

  _addLights() {
    const ambient = new this.THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);
    const sun = new this.THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(30, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    this.scene.add(sun);
    const fill = new this.THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-20, 10, -20);
    this.scene.add(fill);
    const hemi = new this.THREE.HemisphereLight(0x87ceeb, 0x3a3a5c, 0.4);
    this.scene.add(hemi);
  }

  _addGround() {
    const geo = new this.THREE.PlaneGeometry(200, 200);
    const mat = new this.THREE.MeshStandardMaterial({
      color: 0x2a2a3e, roughness: 0.9, metalness: 0.0,
    });
    const ground = new this.THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    ground.name = '__ground';
    this.scene.add(ground);
    const grid = new this.THREE.GridHelper(200, 40, 0x4444aa, 0x333366);
    grid.position.y = 0.01;
    this.scene.add(grid);
  }

  _bindEvents() {
    this._onResize = () => {
      if (!this.container || !this.camera || !this.renderer) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', this._onResize);

    this._onClick = (e) => {
      if (this.controls) {
        this.controls.handleClick(e);
      }
    };
    this.renderer.domElement.addEventListener('click', this._onClick);

    this._onHover = (e) => {
      if (!this.controls || !this.elementInfo) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new this.THREE.Raycaster();
      raycaster.setFromCamera(new this.THREE.Vector2(x, y), this.camera);
      const meshes = [];
      this.elements.forEach(el => {
        if (el.mesh) {
          if (el.mesh.type === 'Group') {
            el.mesh.children.forEach(c => { if (c.isMesh) { c.userData._elementId = el.id; meshes.push(c); } });
          } else {
            el.mesh.userData._elementId = el.id;
            meshes.push(el.mesh);
          }
        }
      });
      const intersects = raycaster.intersectObjects(meshes, false);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const elementId = hit.userData._elementId;
        if (elementId) {
          const el = this.getElementById(elementId);
          this.hoveredElement = el;
          this.elementInfo.showTooltip(el, { x: e.clientX, y: e.clientY });
          this.renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      this.hoveredElement = null;
      this.elementInfo.hideTooltip();
      this.renderer.domElement.style.cursor = 'default';
    };
    this.renderer.domElement.addEventListener('mousemove', this._onHover);
  }

  _clearEvents() {
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this._onClick && this.renderer) {
      this.renderer.domElement.removeEventListener('click', this._onClick);
    }
    if (this._onHover && this.renderer) {
      this.renderer.domElement.removeEventListener('mousemove', this._onHover);
    }
  }

  _startLoop() {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta();
      if (this.controls) {
        this.controls.update(delta);
      }
      if (this.elementInfo) {
        this.elementInfo.update();
      }
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  async _buildSpatialModel() {
    const pd = this.projectData || {};
    const type = pd.type || 'Building';
    const floors = pd.floors || 3;
    const area = pd.area || 200;
    const width = Math.sqrt(area) * (type === 'Tower' ? 0.6 : 1);
    const depth = Math.sqrt(area) * (type === 'Tower' ? 0.6 : 1);
    this._totalFloors = floors;
    const floorHeight = 3.5;
    const boqItems = pd.boqItems || [];
    this.elements = [];

    for (let f = 0; f < floors; f++) {
      const baseY = f * floorHeight;
      const floorElem = this._createFloor(f, width, depth, baseY, floorHeight);
      this.elements.push(floorElem);

      if (f < floors - 1) {
        const colsPerSide = Math.max(3, Math.round(width / 4));
        for (let i = 0; i < colsPerSide; i++) {
          for (let j = 0; j < colsPerSide; j++) {
            if ((i === 0 || i === colsPerSide - 1) && (j === 0 || j === colsPerSide - 1)) continue;
            const cx = -width / 2 + (i + 0.5) * (width / colsPerSide);
            const cz = -depth / 2 + (j + 0.5) * (depth / colsPerSide);
            const col = this._createColumn(f, cx, cz, baseY, floorHeight);
            this.elements.push(col);
          }
        }
      }

      if (f > 0) {
        for (let side = 0; side < 4; side++) {
          const isFront = side === 0;
          const wallLen = isFront || side === 2 ? width : depth;
          if (wallLen > 4) {
            const wall = this._createWall(f, side, width, depth, baseY, floorHeight, boqItems);
            this.elements.push(wall);
          }
        }
      }

      const rooms = this._createRooms(f, width, depth, baseY, floorHeight, boqItems);
      this.elements.push(...rooms);
    }

    if (type === 'Tower' && floors > 5) {
      this._addElevatorCore();
    }

    if ((boqItems.some(i => (i.name || '').toLowerCase().includes('stair')) || floors > 1)) {
      this._addStairs();
    }

    this._emit('modelBuilt', { elements: this.elements.length, floors: this._totalFloors });
  }

  _createFloor(floor, width, depth, baseY, height) {
    const geo = new this.THREE.BoxGeometry(width - 0.1, 0.3, depth - 0.1);
    const mat = new this.THREE.MeshStandardMaterial({
      color: 0x555577, roughness: 0.7, metalness: 0.1, transparent: true, opacity: 0.9,
    });
    const mesh = new this.THREE.Mesh(geo, mat);
    mesh.position.set(0, baseY, 0);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
    return {
      id: `floor-${floor}`, name: `Floor ${floor}`, type: 'floor',
      floor, mesh, layer: 'structure',
      boqCode: null, cost: 0, material: 'Reinforced Concrete',
      properties: { area: width * depth, thickness: 0.3 },
      metadata: {},
    };
  }

  _createColumn(floor, x, z, baseY, height) {
    const geo = new this.THREE.BoxGeometry(0.4, height, 0.4);
    const mat = new this.THREE.MeshStandardMaterial({
      color: 0x888899, roughness: 0.5, metalness: 0.3,
    });
    const mesh = new this.THREE.Mesh(geo, mat);
    mesh.position.set(x, baseY + height / 2, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    return {
      id: `col-f${floor}-${x.toFixed(1)}-${z.toFixed(1)}`,
      name: `Column (F${floor})`, type: 'column',
      floor, mesh, layer: 'structure',
      boqCode: 'STR-COL', cost: 0, material: 'Reinforced Concrete',
      properties: { width: 0.4, depth: 0.4, height },
      metadata: {},
    };
  }

  _createWall(floor, side, width, depth, baseY, height, boqItems) {
    const isFront = side === 0;
    const isBack = side === 2;
    const wallW = (isFront || isBack) ? width : depth;
    const wallD = 0.2;
    const wallH = height * 0.85;
    const geo = new this.THREE.BoxGeometry(wallW, wallH, wallD);
    const wallMat = boqItems.some(i => (i.name || '').toLowerCase().includes('glass'))
      ? new this.THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.4 })
      : new this.THREE.MeshStandardMaterial({ color: 0x9999aa, roughness: 0.6, metalness: 0.05 });
    const mesh = new this.THREE.Mesh(geo, wallMat);
    const cx = (isFront || isBack) ? 0 : -width / 2 + (side === 3 ? width : 0);
    const cz = (isFront || isBack) ? (isFront ? -depth / 2 : depth / 2) : 0;
    mesh.position.set(cx, baseY + wallH / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return {
      id: `wall-f${floor}-s${side}`, name: `Wall ${['Front','Right','Back','Left'][side]} (F${floor})`,
      type: 'wall', floor, mesh, layer: 'structure',
      boqCode: 'STR-WAL', cost: 0, material: 'Concrete Block',
      properties: { width: wallW, height: wallH, thickness: wallD },
      metadata: {},
    };
  }

  _createRooms(floor, width, depth, baseY, height, boqItems) {
    const rooms = [];
    const roomNames = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Hallway', 'Master Bedroom'];
    const roomColors = [0x667788, 0x778899, 0x8899aa, 0x99aabb, 0xaabbcc, 0x556677];

    for (let i = 0; i < Math.min(4, roomNames.length); i++) {
      const rw = width / 3;
      const rd = depth / 3;
      const rx = -width / 2 + (i % 2) * rw * 1.5 + rw / 2;
      const rz = -depth / 2 + Math.floor(i / 2) * rd * 1.5 + rd / 2;
      const geo = new this.THREE.BoxGeometry(rw * 0.95, 0.01, rd * 0.95);
      const mat = new this.THREE.MeshStandardMaterial({
        color: roomColors[i % roomColors.length],
        roughness: 0.8, transparent: true, opacity: 0.3,
      });
      const mesh = new this.THREE.Mesh(geo, mat);
      mesh.position.set(rx, baseY + height * 0.01, rz);
      this.scene.add(mesh);
      rooms.push({
        id: `room-f${floor}-${i}`, name: `${roomNames[i]} (F${floor})`, type: 'room',
        floor, mesh, layer: 'architecture',
        boqCode: null, cost: 0, material: '',
        properties: { area: rw * rd, width: rw, depth: rd },
        metadata: { roomType: roomNames[i], finishing: 'Standard' },
      });
    }
    return rooms;
  }

  _addElevatorCore() {
    const geo = new this.THREE.BoxGeometry(2.5, this._totalFloors * 3.5, 2.5);
    const mat = new this.THREE.MeshStandardMaterial({
      color: 0x445566, roughness: 0.8, metalness: 0.2, transparent: true, opacity: 0.5,
    });
    const mesh = new this.THREE.Mesh(geo, mat);
    mesh.position.set(0, this._totalFloors * 3.5 / 2, 0);
    this.scene.add(mesh);
    this.elements.push({
      id: 'elevator-core', name: 'Elevator Core', type: 'elevator',
      floor: -1, mesh, layer: 'structure',
      boqCode: 'MEP-ELEV', cost: 0, material: 'Reinforced Concrete',
      properties: { width: 2.5, depth: 2.5, height: this._totalFloors * 3.5 },
      metadata: { capacity: '8 persons', speed: '1.5 m/s' },
    });
  }

  _addStairs() {
    const stairsMesh = this._createStairsMesh();
    if (stairsMesh) {
      this.elements.push({
        id: 'stairs-main', name: 'Main Staircase', type: 'stairs',
        floor: -1, mesh: stairsMesh, layer: 'structure',
        boqCode: 'STR-STAIR', cost: 0, material: 'Reinforced Concrete',
        properties: {},
        metadata: {},
      });
    }
  }

  _createStairsMesh() {
    const group = new this.THREE.Group();
    const totalRisers = this._totalFloors * 14;
    for (let i = 0; i < totalRisers; i++) {
      const riserGeo = new this.THREE.BoxGeometry(1.2, 0.15, 0.3);
      const riserMat = new this.THREE.MeshStandardMaterial({ color: 0x777788 });
      const riser = new this.THREE.Mesh(riserGeo, riserMat);
      riser.position.set(6, i * 0.25 + 0.15, 0);
      riser.rotation.y = Math.PI / 2;
      riser.castShadow = true;
      group.add(riser);
    }
    if (group.children.length === 0) return null;
    this.scene.add(group);
    return group;
  }

  _updatePhaseVisibility() {
    const progress = this._phaseProgress;
    this.elements.forEach(e => {
      if (e.mesh) {
        const floorStart = e.floor / this._totalFloors;
        const visible = floorStart <= progress;
        e.mesh.visible = visible;
        if (visible) {
          const opacity = Math.min(1, (progress - floorStart) * 3);
          if (e.mesh.material && e.mesh.material.opacity !== undefined) {
            if (Array.isArray(e.mesh.material)) {
              e.mesh.material.forEach(m => { m.opacity = Math.max(0.3, opacity); m.transparent = true; });
            } else {
              e.mesh.material.opacity = Math.max(0.3, opacity);
              e.mesh.material.transparent = true;
            }
          }
        }
      }
    });
  }

  _updateLayerVisibility() {
    this.elements.forEach(e => {
      if (e.mesh && e.layer) {
        e.mesh.visible = this._layers[e.layer] !== false;
      }
    });
  }

  _highlightMesh(mesh, color) {
    if (!mesh) return;
    const handleMat = (mat) => {
      if (mat && mat._origColor === undefined) {
        mat._origColor = mat.color.getHex();
        mat._origEmissive = mat.emissive ? mat.emissive.getHex() : 0;
      }
      if (mat && mat.color) {
        mat.color.setHex(color);
        if (mat.emissive) mat.emissive.setHex(color);
        if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0.3;
      }
    };
    if (Array.isArray(mesh.material)) mesh.material.forEach(handleMat);
    else handleMat(mesh.material);
  }

  _clearHighlights() {
    this.elements.forEach(e => {
      if (e.mesh) {
        const handleMat = (mat) => {
          if (mat && mat._origColor !== undefined) {
            mat.color.setHex(mat._origColor);
            if (mat.emissive) mat.emissive.setHex(mat._origEmissive || 0);
            if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0;
            delete mat._origColor;
            delete mat._origEmissive;
          }
        };
        if (Array.isArray(e.mesh.material)) e.mesh.material.forEach(handleMat);
        else handleMat(e.mesh.material);
      }
    });
  }
}

window.ACEP3DNavEngine = ACEP3DNavEngine;
})();
