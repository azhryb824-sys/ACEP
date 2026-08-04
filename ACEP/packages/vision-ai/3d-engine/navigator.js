class Navigator {
  constructor(scene) {
    this.scene = scene;
    this.mode = 'orbit';
    this.modes = new Map();
    this._keys = {};
    this._isPointerDown = false;
    this._prevPointer = { x: 0, y: 0 };
    this._moveSpeed = 5;
    this._lookSpeed = 0.003;
    this._orbitRadius = 30;
    this._orbitTheta = Math.PI / 4;
    this._orbitPhi = Math.PI / 3;
    this._flyVelocity = { x: 0, y: 0, z: 0 };
    this._target = { x: 0, y: 0, z: 0 };
    this._euler = { pitch: -0.3, yaw: 0 };
    this._birdAltitude = 40;
    this._sectionY = 0;
    this._enabled = true;
    this._onKeyDown = (e) => { this._keys[e.key.toLowerCase()] = true; };
    this._onKeyUp = (e) => { this._keys[e.key.toLowerCase()] = false; };
    this._onPointerDown = (e) => { this._isPointerDown = true; this._prevPointer.x = e.clientX; this._prevPointer.y = e.clientY; };
    this._onPointerUp = () => { this._isPointerDown = false; };
    this._onPointerMove = (e) => {
      if (!this._isPointerDown || !this._enabled) return;
      const dx = e.clientX - this._prevPointer.x;
      const dy = e.clientY - this._prevPointer.y;
      this._prevPointer.x = e.clientX;
      this._prevPointer.y = e.clientY;
      this._handlePointerDelta(dx, dy);
    };
    this._onWheel = (e) => {
      if (!this._enabled) return;
      this._handleWheel(e.deltaY);
    };
    this._bindEvents();
    this.scene.on('update', (delta) => this._update(delta));
  }

  _bindEvents() {
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    const container = document.getElementById(this.scene.containerId);
    if (container) {
      container.addEventListener('pointerdown', this._onPointerDown);
      container.addEventListener('pointerup', this._onPointerUp);
      container.addEventListener('pointermove', this._onPointerMove);
      container.addEventListener('wheel', this._onWheel, { passive: true });
    }
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    const container = document.getElementById(this.scene.containerId);
    if (container) {
      container.removeEventListener('pointerdown', this._onPointerDown);
      container.removeEventListener('pointerup', this._onPointerUp);
      container.removeEventListener('pointermove', this._onPointerMove);
      container.removeEventListener('wheel', this._onWheel);
    }
  }

  setMode(mode) {
    if (!['walk', 'fly', 'orbit', 'firstperson', 'bird', 'section'].includes(mode)) return;
    this.mode = mode;
    if (mode === 'bird') {
      const cam = this.scene.camera;
      this._birdAltitude = cam.position.y;
    }
    if (mode === 'section') {
      this._sectionY = this.scene.camera.position.y;
      this._applySectionClip();
    }
    this.scene.emit('modeChanged', mode);
  }

  focusOn(objectId) {
    const obj = this.scene.getObjectById(objectId);
    if (!obj) return;
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const dist = Math.max(size.x, size.y, size.z) * 1.5;
    this._target.x = center.x;
    this._target.y = center.y;
    this._target.z = center.z;
    this._orbitRadius = dist;
  }

  goToFloor(floor) {
    const y = floor * 3.5;
    this._target.y = y;
    this.scene.camera.position.y = y + 2;
  }

  setBirdAltitude(alt) {
    this._birdAltitude = Math.max(10, Math.min(100, alt));
  }

  setSectionHeight(y) {
    this._sectionY = y;
    this._applySectionClip();
  }

  _applySectionClip() {
    this.scene.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.clippingPlanes = [
          new THREE.Plane(new THREE.Vector3(0, -1, 0), this._sectionY)
        ];
        child.material.clipShadows = true;
        child.material.needsUpdate = true;
      }
    });
  }

  _handlePointerDelta(dx, dy) {
    switch (this.mode) {
      case 'orbit':
        this._orbitTheta -= dx * this._lookSpeed;
        this._orbitPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this._orbitPhi - dy * this._lookSpeed));
        break;
      case 'walk':
      case 'firstperson':
        this._euler.yaw -= dx * this._lookSpeed;
        this._euler.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this._euler.pitch - dy * this._lookSpeed));
        break;
      case 'fly':
        this._euler.yaw -= dx * this._lookSpeed * 0.5;
        this._euler.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this._euler.pitch - dy * this._lookSpeed * 0.5));
        break;
    }
  }

  _handleWheel(delta) {
    switch (this.mode) {
      case 'orbit':
        this._orbitRadius = Math.max(5, Math.min(150, this._orbitRadius + delta * 0.05));
        break;
      case 'bird':
        this._birdAltitude = Math.max(10, Math.min(100, this._birdAltitude + delta * 0.1));
        break;
      case 'walk':
      case 'firstperson':
        this._moveSpeed = Math.max(1, Math.min(20, this._moveSpeed + delta * 0.01));
        break;
    }
  }

  _update(delta) {
    if (!this._enabled) return;
    const cam = this.scene.camera;
    const speed = this._moveSpeed * delta;

    switch (this.mode) {
      case 'orbit':
        cam.position.x = this._target.x + this._orbitRadius * Math.sin(this._orbitTheta) * Math.sin(this._orbitPhi);
        cam.position.y = this._target.y + this._orbitRadius * Math.cos(this._orbitPhi);
        cam.position.z = this._target.z + this._orbitRadius * Math.cos(this._orbitTheta) * Math.sin(this._orbitPhi);
        cam.lookAt(this._target.x, this._target.y, this._target.z);
        break;

      case 'walk': {
        const fwd = new THREE.Vector3(-Math.sin(this._euler.yaw), 0, -Math.cos(this._euler.yaw));
        const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
        if (this._keys['w'] || this._keys['arrowup']) cam.position.add(fwd.clone().multiplyScalar(speed));
        if (this._keys['s'] || this._keys['arrowdown']) cam.position.add(fwd.clone().multiplyScalar(-speed));
        if (this._keys['a'] || this._keys['arrowleft']) cam.position.add(right.clone().multiplyScalar(-speed));
        if (this._keys['d'] || this._keys['arrowright']) cam.position.add(right.clone().multiplyScalar(speed));
        cam.position.y = this._target.y + 1.7;
        const lookDir = new THREE.Vector3(
          -Math.sin(this._euler.yaw) * Math.cos(this._euler.pitch),
          Math.sin(this._euler.pitch),
          -Math.cos(this._euler.yaw) * Math.cos(this._euler.pitch)
        );
        cam.lookAt(cam.position.clone().add(lookDir));
        break;
      }

      case 'fly': {
        const fwd = new THREE.Vector3(-Math.sin(this._euler.yaw), 0, -Math.cos(this._euler.yaw));
        const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
        const up = new THREE.Vector3(0, 1, 0);
        if (this._keys['w'] || this._keys['arrowup']) cam.position.add(fwd.clone().multiplyScalar(speed * 2));
        if (this._keys['s'] || this._keys['arrowdown']) cam.position.add(fwd.clone().multiplyScalar(-speed * 2));
        if (this._keys['a'] || this._keys['arrowleft']) cam.position.add(right.clone().multiplyScalar(-speed));
        if (this._keys['d'] || this._keys['arrowright']) cam.position.add(right.clone().multiplyScalar(speed));
        if (this._keys['q']) cam.position.add(up.clone().multiplyScalar(speed));
        if (this._keys['e']) cam.position.add(up.clone().multiplyScalar(-speed));
        const lookDir = new THREE.Vector3(
          -Math.sin(this._euler.yaw) * Math.cos(this._euler.pitch),
          Math.sin(this._euler.pitch),
          -Math.cos(this._euler.yaw) * Math.cos(this._euler.pitch)
        );
        cam.lookAt(cam.position.clone().add(lookDir));
        break;
      }

      case 'firstperson': {
        const fwd = new THREE.Vector3(-Math.sin(this._euler.yaw), 0, -Math.cos(this._euler.yaw));
        const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
        if (this._keys['w'] || this._keys['arrowup']) cam.position.add(fwd.clone().multiplyScalar(speed));
        if (this._keys['s'] || this._keys['arrowdown']) cam.position.add(fwd.clone().multiplyScalar(-speed));
        if (this._keys['a'] || this._keys['arrowleft']) cam.position.add(right.clone().multiplyScalar(-speed));
        if (this._keys['d'] || this._keys['arrowright']) cam.position.add(right.clone().multiplyScalar(speed));
        const lookDir = new THREE.Vector3(
          -Math.sin(this._euler.yaw) * Math.cos(this._euler.pitch),
          Math.sin(this._euler.pitch),
          -Math.cos(this._euler.yaw) * Math.cos(this._euler.pitch)
        );
        cam.lookAt(cam.position.clone().add(lookDir));
        break;
      }

      case 'bird': {
        const panSpeed = speed * 3;
        if (this._keys['w'] || this._keys['arrowup']) cam.position.z -= panSpeed;
        if (this._keys['s'] || this._keys['arrowdown']) cam.position.z += panSpeed;
        if (this._keys['a'] || this._keys['arrowleft']) cam.position.x -= panSpeed;
        if (this._keys['d'] || this._keys['arrowright']) cam.position.x += panSpeed;
        cam.position.y = this._birdAltitude;
        cam.lookAt(cam.position.x, 0, cam.position.z);
        break;
      }

      case 'section':
        if (this._keys['w'] || this._keys['arrowup']) this._sectionY += speed;
        if (this._keys['s'] || this._keys['arrowdown']) this._sectionY -= speed;
        this._applySectionClip();
        break;
    }

    this.scene.emit('cameraMoved', {
      position: cam.position.toArray(),
      mode: this.mode,
    });
  }
}

module.exports = { Navigator };
