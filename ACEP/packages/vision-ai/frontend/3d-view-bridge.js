/* ACEP 3D View Bridge - client-side integration */
const API = window.location.origin;

window.ACEP3D = {
  engine: null,
  containerId: 'acep-3d-container',
  initialized: false,

  async init() {
    if (this.initialized) return;
    if (!window.THREE) {
      try {
        window.THREE = await import('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
      } catch {
        await this._loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
      }
    }
    this.initialized = true;
  },

  async loadProject(projectId, projectParams) {
    await this.init();
    try {
      const res = await fetch(API + '/api/v1/vision-ai/3d/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectParams }),
      });
      const data = await res.json();
      if (data.status === 'completed' && data.elements) {
        return data;
      }
      throw new Error(data.error || 'فشل تحميل النموذج');
    } catch (e) {
      console.error('[3D] Load error:', e);
      throw e;
    }
  },

  async buildView(containerId, projectId, projectParams) {
    this.containerId = containerId;
    const structureData = await this.loadProject(projectId, projectParams);
    this._renderStructure(structureData);
    return structureData;
  },

  _renderStructure(data) {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    container.innerHTML = '';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 50, 150);

    const w = container.clientWidth;
    const h = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 500);
    camera.position.set(data.dimensions?.width * 0.8 || 20, data.floors * 3 + 5 || 15, data.dimensions?.length * 0.8 || 25);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    this._addLights(scene);
    this._addGround(scene);

    const elements = [];
    for (const elem of data.elements) {
      const mesh = this._createElementMesh(elem);
      if (mesh) {
        scene.add(mesh);
        elements.push({ elem, mesh });
      }
    }

    const controls = new THREE.OrbitControls?.(camera, renderer.domElement) || { update() {} };
    controls.target.set(0, data.floors * 1.5 || 3, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    });

    this._currentScene = { scene, camera, renderer, controls, elements, container };
  },

  _createElementMesh(elem) {
    const geo = new THREE.BoxGeometry(elem.size.width, elem.size.height, elem.size.depth);
    const color = new THREE.Color(elem.color || '#888899');
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.0,
      transparent: (elem.type === 'room'),
      opacity: elem.type === 'room' ? 0.15 : 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(elem.position.x, elem.position.y, elem.position.z);
    mesh.rotation.set(elem.rotation.x, elem.rotation.y, elem.rotation.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { ...elem };
    return mesh;
  },

  _addLights(scene) {
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(30, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-20, 10, -20);
    scene.add(fill);
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a3a5c, 0.4);
    scene.add(hemi);
  },

  _addGround(scene) {
    const geo = new THREE.PlaneGeometry(200, 200);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a3e, roughness: 0.9 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(200, 40, 0x4444aa, 0x333366);
    grid.position.y = 0.01;
    scene.add(grid);
  },

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  },

  dispose() {
    if (this._currentScene) {
      const { renderer, container } = this._currentScene;
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      this._currentScene = null;
    }
  },
};

console.log('[ACEP-3D] Bridge loaded');
