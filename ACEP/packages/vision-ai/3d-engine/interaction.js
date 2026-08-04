class InteractionManager {
  constructor(scene) {
    this.scene = scene;
    this._selected = null;
    this._hovered = null;
    this._onSelect = null;
    this._onHover = null;
    this._onDeselect = null;

    this._handleClick = (e) => this._onClick(e);
    this._handleMouseMove = (e) => this._onMouseMove(e);

    const container = document.getElementById(this.scene.containerId);
    if (container) {
      container.addEventListener('click', this._handleClick);
      container.addEventListener('mousemove', this._handleMouseMove);
    }
  }

  onSelect(callback) { this._onSelect = callback; }
  onHover(callback) { this._onHover = callback; }
  onDeselect(callback) { this._onDeselect = callback; }

  dispose() {
    const container = document.getElementById(this.scene.containerId);
    if (container) {
      container.removeEventListener('click', this._handleClick);
      container.removeEventListener('mousemove', this._handleMouseMove);
    }
  }

  selectElement(elementId) {
    const mesh = this.scene.getObjectById(elementId);
    if (mesh) this._highlightElement(mesh);
  }

  _onClick(e) {
    const intersection = this.scene.getIntersection(e.clientX, e.clientY);
    if (intersection?.object?.userData?.id) {
      const mesh = intersection.object;
      this._highlightElement(mesh);
    } else {
      this._deselectElement();
    }
  }

  _onMouseMove(e) {
    const intersection = this.scene.getIntersection(e.clientX, e.clientY);
    if (intersection?.object?.userData?.id) {
      const mesh = intersection.object;
      if (this._hovered !== mesh) {
        this._hovered = mesh;
        if (this._onHover) this._onHover(mesh.userData);
      }
    } else {
      if (this._hovered) {
        this._hovered = null;
        if (this._onHover) this._onHover(null);
      }
    }
  }

  _highlightElement(mesh) {
    if (this._selected && this._selected !== mesh) {
      this._restoreHighlight(this._selected);
    }
    this._selected = mesh;
    if (mesh.material) {
      mesh.material.emissive = new THREE.Color(0x4466ff);
      mesh.material.emissiveIntensity = 0.3;
    }
    if (this._onSelect) this._onSelect(mesh.userData);
  }

  _deselectElement() {
    if (this._selected) {
      this._restoreHighlight(this._selected);
      this._selected = null;
      if (this._onDeselect) this._onDeselect();
    }
  }

  _restoreHighlight(mesh) {
    if (mesh.material) {
      mesh.material.emissive = new THREE.Color(0x000000);
      mesh.material.emissiveIntensity = 0;
    }
  }
}

module.exports = { InteractionManager };
