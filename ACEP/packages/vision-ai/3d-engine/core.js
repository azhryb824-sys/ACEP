const EventEmitter = require('events');

class ThreeScene extends EventEmitter {
  constructor(containerId = 'acep-3d-container') {
    super();
    this.containerId = containerId;
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.clock = null;
    this.animId = null;
    this.objects = new Map();
    this._raycaster = null;
    this._mouse = null;
  }

  async init() {
    const THREE = await import('three');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 100, 300);

    const container = document.getElementById(this.containerId);
    if (!container) throw new Error(`Container #${this.containerId} not found`);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 500);
    this.camera.position.set(20, 15, 25);

    this.clock = new THREE.Clock();

    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();

    this._addLights();
    this._addGround();
    this._addHelpers();
    this._bindResize();

    this.emit('ready', this);
    this._animate();
    return this;
  }

  _addLights() {
    const THREE = this.constructor.THREE || require('three');
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(30, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-20, 10, -20);
    this.scene.add(fill);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a3a5c, 0.4);
    this.scene.add(hemi);
  }

  _addGround() {
    const THREE = this.constructor.THREE || require('three');
    const geo = new THREE.PlaneGeometry(200, 200);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      roughness: 0.9,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    ground.name = '__ground';
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(200, 40, 0x4444aa, 0x333366);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  _addHelpers() {
    const THREE = this.constructor.THREE || require('three');
    const axes = new THREE.AxesHelper(5);
    axes.position.y = 0.01;
    this.scene.add(axes);
  }

  _bindResize() {
    window.addEventListener('resize', () => {
      const container = document.getElementById(this.containerId);
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  _animate() {
    this.animId = requestAnimationFrame(() => this._animate());
    const delta = this.clock.getDelta();
    this.emit('update', delta);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.removeAllListeners();
  }

  addObject(obj, id) {
    if (id) {
      obj.userData.id = id;
      this.objects.set(id, obj);
    }
    this.scene.add(obj);
  }

  removeObject(id) {
    const obj = this.objects.get(id);
    if (obj) {
      this.scene.remove(obj);
      this.objects.delete(id);
    }
  }

  getObjectById(id) {
    return this.objects.get(id);
  }

  getIntersection(clientX, clientY) {
    const container = document.getElementById(this.containerId);
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    this._mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this.camera);
    const meshes = [];
    this.scene.traverse(child => {
      if (child.isMesh) meshes.push(child);
    });
    const intersects = this._raycaster.intersectObjects(meshes, false);
    return intersects.length > 0 ? intersects[0] : null;
  }

  traverse(callback) {
    this.scene.traverse(callback);
  }

  getTHREE() {
    try { return require('three'); } catch { return window.THREE; }
  }
}

module.exports = { ThreeScene };
