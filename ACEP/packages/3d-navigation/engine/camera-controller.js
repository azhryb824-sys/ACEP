(function() {
'use strict';

class SmartCameraController {
  constructor(engine) {
    this.engine = engine;
    this.THREE = engine.THREE;
    this.camera = engine.camera;
    this.scene = engine.scene;
    this.modes = {};
    this.currentMode = 'orbit';
    this._isDragging = false;
    this._prevMouse = { x: 0, y: 0 };
    this._keys = {};
    this._target = new this.THREE.Vector3(0, 0, 0);
    this._initModes();
    this._bindInput();
  }

  _initModes() {
    this.modes = {
      orbit: new OrbitMode(this),
      walk: new WalkMode(this),
      fly: new FlyMode(this),
      firstperson: new FirstPersonMode(this),
      drone: new DroneMode(this),
      section: new SectionMode(this),
      xray: new XRayMode(this),
    };
    this.modes.orbit.activate();
  }

  setMode(mode) {
    if (!this.modes[mode]) return;
    if (this.currentMode) this.modes[this.currentMode].deactivate();
    this.currentMode = mode;
    this.modes[mode].activate();
    this.engine._emit('modeChanged', mode);
  }

  focusOn(center, distance) {
    this._target.copy(center);
    if (this.modes[this.currentMode]) {
      this.modes[this.currentMode].focus(center, distance);
    }
  }

  handleClick(event) {
    const rect = this.engine.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new this.THREE.Raycaster();
    raycaster.setFromCamera(new this.THREE.Vector2(x, y), this.camera);
    const meshes = [];
    this.engine.elements.forEach(e => {
      if (e.mesh) {
        if (e.mesh.type === 'Group') {
          e.mesh.children.forEach(c => { if (c.isMesh) { c.userData._elementId = e.id; meshes.push(c); } });
        } else {
          e.mesh.userData._elementId = e.id;
          meshes.push(e.mesh);
        }
      }
    });
    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const elementId = hit.userData._elementId;
      if (elementId) {
        this.engine.selectedElement = this.engine.getElementById(elementId);
        this.engine._emit('elementSelected', this.engine.selectedElement);
        return;
      }
    }
    this.engine.selectedElement = null;
    this.engine._emit('elementDeselected');
  }

  update(delta) {
    if (this.modes[this.currentMode]) {
      this.modes[this.currentMode].update(delta);
    }
  }

  _bindInput() {
    const canvas = this.engine.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      this._isDragging = true;
      this._prevMouse.x = e.clientX;
      this._prevMouse.y = e.clientY;
      if (this.modes[this.currentMode]) {
        this.modes[this.currentMode].onPointerDown(e);
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      this._isDragging = false;
      if (this.modes[this.currentMode]) {
        this.modes[this.currentMode].onPointerUp(e);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this._isDragging) return;
      const dx = e.clientX - this._prevMouse.x;
      const dy = e.clientY - this._prevMouse.y;
      this._prevMouse.x = e.clientX;
      this._prevMouse.y = e.clientY;
      if (this.modes[this.currentMode]) {
        this.modes[this.currentMode].onPointerMove(dx, dy);
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.modes[this.currentMode]) {
        this.modes[this.currentMode].onWheel(e.deltaY);
      }
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      this._keys[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.key === 'Escape') {
        if (this.modes[this.currentMode]) {
          this.modes[this.currentMode].onKey(e.key);
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      this._keys[e.key.toLowerCase()] = false;
    });
  }
}

class OrbitMode {
  constructor(ctrl) {
    this.ctrl = ctrl;
    this.camera = ctrl.camera;
    this.THREE = ctrl.THREE;
    this.radius = 30;
    this.theta = Math.PI / 4;
    this.phi = Math.PI / 3;
    this.target = new this.THREE.Vector3(0, 0, 0);
    this._lookSpeed = 0.005;
    this._zoomSpeed = 0.05;
  }

  activate() { this._updateCamera(); }
  deactivate() {}
  onPointerDown() {}
  onPointerUp() {}
  onPointerMove(dx, dy) {
    this.theta -= dx * this._lookSpeed;
    this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi - dy * this._lookSpeed));
    this._updateCamera();
  }
  onWheel(delta) {
    this.radius = Math.max(3, Math.min(150, this.radius + delta * this._zoomSpeed));
    this._updateCamera();
  }
  onKey(key) {
    if (key === ' ') this._resetView();
  }
  focus(center, distance) {
    this.target.copy(center);
    this.radius = distance || 20;
    this._updateCamera();
  }
  update() { this._updateCamera(); }
  _resetView() {
    this.target.set(0, 0, 0);
    this.radius = 30;
    this.theta = Math.PI / 4;
    this.phi = Math.PI / 3;
    this._updateCamera();
  }
  _updateCamera() {
    this.camera.position.x = this.target.x + this.radius * Math.sin(this.theta) * Math.sin(this.phi);
    this.camera.position.y = this.target.y + this.radius * Math.cos(this.phi);
    this.camera.position.z = this.target.z + this.radius * Math.cos(this.theta) * Math.sin(this.phi);
    this.camera.lookAt(this.target);
  }
}

class WalkMode {
  constructor(ctrl) {
    this.ctrl = ctrl;
    this.camera = ctrl.camera;
    this.THREE = ctrl.THREE;
    this.yaw = 0;
    this.pitch = -0.2;
    this.speed = 5;
    this.height = 1.7;
    this._lookSpeed = 0.003;
    this._pos = new this.THREE.Vector3(0, this.height, 10);
  }

  activate() {
    this._pos.copy(this.camera.position);
    this._pos.y = this.height;
    this.yaw = 0;
    this.pitch = -0.2;
  }
  deactivate() {}
  onPointerDown() {}
  onPointerUp() {}
  onPointerMove(dx, dy) {
    this.yaw -= dx * this._lookSpeed;
    this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch - dy * this._lookSpeed));
  }
  onWheel(delta) { this.speed = Math.max(1, Math.min(20, this.speed + delta * 0.01)); }
  onKey() {}
  focus() {}
  update(delta) {
    const keys = this.ctrl._keys;
    const fwd = new this.THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new this.THREE.Vector3(fwd.z, 0, -fwd.x);
    const speed = this.speed * delta;
    if (keys['w'] || keys['arrowup']) this._pos.add(fwd.clone().multiplyScalar(speed));
    if (keys['s'] || keys['arrowdown']) this._pos.add(fwd.clone().multiplyScalar(-speed));
    if (keys['a'] || keys['arrowleft']) this._pos.add(right.clone().multiplyScalar(-speed));
    if (keys['d'] || keys['arrowright']) this._pos.add(right.clone().multiplyScalar(speed));
    if (keys['shift']) this._pos.y -= speed;
    if (keys[' ']) this._pos.y += speed;
    this.camera.position.copy(this._pos);
    const lookDir = new this.THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.camera.lookAt(this._pos.clone().add(lookDir));
  }
}

class FlyMode {
  constructor(ctrl) {
    this.ctrl = ctrl;
    this.camera = ctrl.camera;
    this.THREE = ctrl.THREE;
    this.yaw = 0;
    this.pitch = -0.3;
    this.speed = 8;
    this._lookSpeed = 0.003;
    this._pos = new this.THREE.Vector3(0, 20, 25);
  }

  activate() { this._pos.copy(this.camera.position); }
  deactivate() {}
  onPointerDown() {}
  onPointerUp() {}
  onPointerMove(dx, dy) {
    this.yaw -= dx * this._lookSpeed * 0.5;
    this.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.pitch - dy * this._lookSpeed * 0.5));
  }
  onWheel(delta) { this.speed = Math.max(1, Math.min(50, this.speed + delta * 0.02)); }
  onKey() {}
  focus(center) { this._pos.copy(center); this._pos.y += 10; }
  update(delta) {
    const keys = this.ctrl._keys;
    const fwd = new this.THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    const right = new this.THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const up = new this.THREE.Vector3(0, 1, 0);
    const speed = this.speed * delta;
    if (keys['w'] || keys['arrowup']) this._pos.add(fwd.clone().multiplyScalar(speed));
    if (keys['s'] || keys['arrowdown']) this._pos.add(fwd.clone().multiplyScalar(-speed));
    if (keys['a'] || keys['arrowleft']) this._pos.add(right.clone().multiplyScalar(-speed));
    if (keys['d'] || keys['arrowright']) this._pos.add(right.clone().multiplyScalar(speed));
    if (keys['shift']) this._pos.add(up.clone().multiplyScalar(-speed));
    if (keys[' ']) this._pos.add(up.clone().multiplyScalar(speed));
    this.camera.position.copy(this._pos);
    this.camera.lookAt(this._pos.clone().add(fwd));
  }
}

class FirstPersonMode {
  constructor(ctrl) {
    this.ctrl = ctrl;
    this.camera = ctrl.camera;
    this.THREE = ctrl.THREE;
    this.yaw = 0;
    this.pitch = 0;
    this.speed = 4;
    this.height = 1.7;
    this._lookSpeed = 0.003;
    this._pos = new this.THREE.Vector3(0, this.height, 5);
  }

  activate() {
    this._pos.copy(this.camera.position);
    this._pos.y = this.height;
  }
  deactivate() {}
  onPointerDown() { this._isPointerLocked = true; }
  onPointerUp() {}
  onPointerMove(dx, dy) {
    this.yaw -= dx * this._lookSpeed;
    this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch - dy * this._lookSpeed));
  }
  onWheel(delta) { this.speed = Math.max(1, Math.min(10, this.speed + delta * 0.01)); }
  onKey(key) { if (key === 'escape') this._isPointerLocked = false; }
  focus(center) { this._pos.copy(center); this._pos.y = this.height; }
  update(delta) {
    const keys = this.ctrl._keys;
    const fwd = new this.THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new this.THREE.Vector3(fwd.z, 0, -fwd.x);
    const speed = this.speed * delta;
    if (keys['w']) this._pos.add(fwd.clone().multiplyScalar(speed));
    if (keys['s']) this._pos.add(fwd.clone().multiplyScalar(-speed));
    if (keys['a']) this._pos.add(right.clone().multiplyScalar(-speed));
    if (keys['d']) this._pos.add(right.clone().multiplyScalar(speed));
    this.camera.position.copy(this._pos);
    const lookDir = new this.THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.camera.lookAt(this._pos.clone().add(lookDir));
  }
}

class DroneMode {
  constructor(ctrl) {
    this.ctrl = ctrl;
    this.camera = ctrl.camera;
    this.THREE = ctrl.THREE;
    this.altitude = 40;
    this.angle = 0;
    this.orbitRadius = 60;
    this.speed = 0.5;
    this._target = new this.THREE.Vector3(0, 0, 0);
  }

  activate() {
    this.altitude = Math.max(15, this.camera.position.y);
    this.orbitRadius = Math.sqrt(
      this.camera.position.x ** 2 + this.camera.position.z ** 2
    );
  }
  deactivate() {}
  onPointerDown() {}
  onPointerUp() {}
  onPointerMove(dx, dy) {
    this.angle -= dx * 0.005;
    this.altitude = Math.max(10, Math.min(100, this.altitude + dy * 0.1));
  }
  onWheel(delta) {
    this.orbitRadius = Math.max(20, Math.min(150, this.orbitRadius + delta * 0.05));
  }
  onKey() {}
  focus(center) { this._target.copy(center); }
  update(delta) {
    this.angle += this.speed * delta * 0.3;
    this.camera.position.x = this._target.x + this.orbitRadius * Math.sin(this.angle);
    this.camera.position.z = this._target.z + this.orbitRadius * Math.cos(this.angle);
    this.camera.position.y = this.altitude;
    this.camera.lookAt(this._target);
  }
}

class SectionMode {
  constructor(ctrl) {
    this.ctrl = ctrl;
    this.camera = ctrl.camera;
    this.scene = ctrl.scene;
    this.THREE = ctrl.THREE;
    this.sectionY = 0;
    this._clipPlane = null;
  }

  activate() {
    this.sectionY = this.camera.position.y;
    this._applyClip();
  }
  deactivate() { this._removeClip(); }
  onPointerDown() {}
  onPointerUp() {}
  onPointerMove(dx, dy) {
    this.sectionY = Math.max(0, this.sectionY + dy * 0.05);
    this._applyClip();
  }
  onWheel(delta) {
    this.sectionY = Math.max(0, this.sectionY + delta * 0.02);
    this._applyClip();
  }
  onKey() {}
  focus() {}
  update() {}
  _applyClip() {
    this.scene.traverse(child => {
      if (child.isMesh && child.material) {
        const plane = new this.THREE.Plane(new this.THREE.Vector3(0, -1, 0), this.sectionY);
        if (Array.isArray(child.material)) {
          child.material.forEach(m => { m.clippingPlanes = [plane]; m.clipShadows = true; });
        } else {
          child.material.clippingPlanes = [plane];
          child.material.clipShadows = true;
        }
      }
    });
    this.ctrl.engine.renderer.localClippingEnabled = true;
  }
  _removeClip() {
    this.scene.traverse(child => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => { m.clippingPlanes = []; });
        } else {
          child.material.clippingPlanes = [];
        }
      }
    });
    this.ctrl.engine.renderer.localClippingEnabled = false;
  }
}

class XRayMode {
  constructor(ctrl) {
    this.ctrl = ctrl;
    this.scene = ctrl.scene;
    this.THREE = ctrl.THREE;
    this._xrayMeshes = [];
  }

  activate() {
    this.scene.traverse(child => {
      if (child.isMesh && child.material) {
        const mat = Array.isArray(child.material) ? child.material[0] : child.material;
        if (mat._origOpacity === undefined) {
          mat._origOpacity = mat.opacity;
          mat._origTransparent = mat.transparent;
        }
        mat.transparent = true;
        const isExterior = child.position.length() > 5;
        mat.opacity = isExterior ? 0.15 : 0.85;
        if (mat.emissive) {
          mat._origEmissive = mat._origEmissive || mat.emissive.getHex();
          mat.emissive.setHex(isExterior ? 0x4488ff : 0x000000);
          mat.emissiveIntensity = isExterior ? 0.05 : 0;
        }
      }
    });
  }

  deactivate() {
    this.scene.traverse(child => {
      if (child.isMesh && child.material) {
        const mat = Array.isArray(child.material) ? child.material[0] : child.material;
        if (mat._origOpacity !== undefined) {
          mat.opacity = mat._origOpacity;
          mat.transparent = mat._origTransparent || false;
          delete mat._origOpacity;
          delete mat._origTransparent;
        }
        if (mat._origEmissive !== undefined) {
          mat.emissive.setHex(mat._origEmissive);
          mat.emissiveIntensity = 0;
          delete mat._origEmissive;
        }
      }
    });
  }

  onPointerDown() {}
  onPointerUp() {}
  onPointerMove() {}
  onWheel() {}
  onKey() {}
  focus() {}
  update() {}
}

window.ACEP_3D = window.ACEP_3D || {};
window.ACEP_3D.SmartCameraController = SmartCameraController;
})();
