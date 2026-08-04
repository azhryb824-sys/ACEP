class LODManager {
  constructor(scene) {
    this.scene = scene;
    this.maxDistance = 150;
    this.highDetailDistance = 30;
    this.mediumDetailDistance = 70;
  }

  update(cameraPosition) {
    const camPos = new THREE.Vector3(...cameraPosition);
    this.scene.traverse(child => {
      if (!child.isMesh || !child.geometry) return;
      const dist = camPos.distanceTo(child.position);
      if (dist > this.maxDistance) {
        child.visible = false;
      } else {
        child.visible = true;
        if (dist < this.highDetailDistance) {
          this._setDetail(child, 'high');
        } else if (dist < this.mediumDetailDistance) {
          this._setDetail(child, 'medium');
        } else {
          this._setDetail(child, 'low');
        }
      }
    });
  }

  _setDetail(mesh, level) {
    if (!mesh.userData) return;
    const scale = level === 'high' ? 1 : level === 'medium' ? 0.6 : 0.3;
    if (mesh.material) {
      mesh.material.roughness = 0.5 + (1 - scale) * 0.4;
    }
  }

  dispose() {}
}

module.exports = { LODManager };
