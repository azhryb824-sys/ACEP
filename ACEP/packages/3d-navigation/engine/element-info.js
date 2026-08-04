(function() {
'use strict';

class ElementInfoSystem {
  constructor(engine) {
    this.engine = engine;
    this.THREE = engine.THREE;
    this.scene = engine.scene;
    this.camera = engine.camera;
    this.container = engine.container;
    this.selectedElement = null;
    this._tooltipEl = null;
    this._popupEl = null;
    this._labelEls = [];
    this._labelGroup = new this.THREE.Group();
    this.scene.add(this._labelGroup);
    this._createUI();
  }

  select(element) {
    if (this.selectedElement && this.selectedElement.mesh) {
      this._unhighlight(this.selectedElement.mesh);
    }
    this.selectedElement = element;
    if (element && element.mesh) {
      this._highlight(element.mesh);
      this._showPopup(element);
      this._updateLabel(element);
    } else {
      this._hidePopup();
      this._removeLabels();
    }
  }

  deselect() {
    if (this.selectedElement && this.selectedElement.mesh) {
      this._unhighlight(this.selectedElement.mesh);
    }
    this.selectedElement = null;
    this._hidePopup();
    this._removeLabels();
  }

  showTooltip(element, screenPos) {
    if (!this._tooltipEl) return;
    this._tooltipEl.innerHTML = `<strong>${element.name || element.id}</strong>`;
    if (element.type) this._tooltipEl.innerHTML += ` <span class="type">${element.type}</span>`;
    this._tooltipEl.style.left = (screenPos.x + 12) + 'px';
    this._tooltipEl.style.top = (screenPos.y - 10) + 'px';
    this._tooltipEl.style.display = 'block';
  }

  hideTooltip() {
    if (this._tooltipEl) this._tooltipEl.style.display = 'none';
  }

  _createUI() {
    this._tooltipEl = document.createElement('div');
    this._tooltipEl.className = 'acep-3d-tooltip';
    Object.assign(this._tooltipEl.style, {
      position: 'fixed', display: 'none', zIndex: '1000',
      background: 'rgba(0,0,0,0.8)', color: '#e0e0e0', padding: '6px 12px',
      borderRadius: '6px', fontSize: '13px', pointerEvents: 'none',
      border: '1px solid #4488ff', backdropFilter: 'blur(4px)',
      maxWidth: '260px', whiteSpace: 'nowrap',
    });
    document.body.appendChild(this._tooltipEl);

    this._popupEl = document.createElement('div');
    this._popupEl.className = 'acep-3d-popup';
    Object.assign(this._popupEl.style, {
      position: 'fixed', display: 'none', zIndex: '1001',
      background: 'rgba(10,10,30,0.92)', color: '#ccc',
      padding: '16px', borderRadius: '10px', fontSize: '13px',
      border: '1px solid #4488ff', backdropFilter: 'blur(8px)',
      minWidth: '220px', maxWidth: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      right: '20px', top: '80px',
    });
    document.body.appendChild(this._popupEl);
  }

  _showPopup(element) {
    if (!this._popupEl) return;
    const p = element.properties || {};
    const m = element.metadata || {};
    const boq = element.cost > 0 ? `<div class="row"><span>Cost</span><span>${element.cost.toLocaleString()} AED</span></div>` : '';
    this._popupEl.innerHTML = `
      <div class="header" style="color:#fff;font-size:15px;font-weight:bold;margin-bottom:8px;border-bottom:1px solid #4488ff;padding-bottom:6px;">
        ${element.name || element.id}
        <span style="float:right;font-size:11px;color:#888;font-weight:normal;">${element.type || ''}</span>
      </div>
      <div class="body" style="line-height:1.8;">
        ${element.boqCode ? `<div class="row" style="display:flex;justify-content:space-between;"><span>BOQ Code</span><span style="color:#88aaff">${element.boqCode}</span></div>` : ''}
        ${element.material ? `<div class="row"><span>Material</span><span style="color:#aacc88">${element.material}</span></div>` : ''}
        ${element.floor >= 0 ? `<div class="row"><span>Floor</span><span style="color:#ffaa44">${element.floor}</span></div>` : ''}
        ${Object.entries(p).map(([k, v]) => `<div class="row"><span>${k}</span><span>${v}</span></div>`).join('')}
        ${boq}
        ${Object.entries(m).map(([k, v]) => `<div class="row"><span>${k}</span><span style="color:#aaa">${v}</span></div>`).join('')}
      </div>
    `;
    this._popupEl.style.display = 'block';
  }

  _hidePopup() {
    if (this._popupEl) this._popupEl.style.display = 'none';
  }

  _updateLabel(element) {
    this._removeLabels();
    if (!element.mesh) return;
    const box = new this.THREE.Box3().setFromObject(element.mesh);
    const center = box.getCenter(new this.THREE.Vector3());
    const pos = center.clone();
    pos.y = box.max.y + 0.5;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(element.name || element.id, 128, 32);

    const tex = new this.THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const spriteMat = new this.THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new this.THREE.Sprite(spriteMat);
    sprite.position.copy(pos);
    sprite.scale.set(4, 1, 1);
    this._labelGroup.add(sprite);
    this._labelEls.push(sprite);
  }

  _removeLabels() {
    while (this._labelEls.length) {
      const s = this._labelEls.pop();
      this._labelGroup.remove(s);
      s.material.dispose();
      s.material.map && s.material.map.dispose();
    }
  }

  _highlight(mesh) {
    if (!mesh) return;
    const apply = (mat) => {
      if (mat && mat._origEmissive === undefined) {
        mat._origEmissive = mat.emissive ? mat.emissive.getHex() : 0;
      }
      if (mat && mat.emissive) {
        mat.emissive.setHex(0x4488ff);
        mat.emissiveIntensity = 0.4;
      }
    };
    if (mesh.type === 'Group') {
      mesh.children.forEach(c => { if (c.isMesh) apply(c.material); });
    } else {
      apply(mesh.material);
    }
  }

  _unhighlight(mesh) {
    if (!mesh) return;
    const apply = (mat) => {
      if (mat && mat._origEmissive !== undefined) {
        if (mat.emissive) mat.emissive.setHex(mat._origEmissive);
        if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0;
        delete mat._origEmissive;
      }
    };
    if (mesh.type === 'Group') {
      mesh.children.forEach(c => { if (c.isMesh) apply(c.material); });
    } else {
      apply(mesh.material);
    }
  }

  update() {
    if (!this.selectedElement || !this.selectedElement.mesh || !this.camera) return;
    const box = new this.THREE.Box3().setFromObject(this.selectedElement.mesh);
    const center = box.getCenter(new this.THREE.Vector3());
    if (this._labelEls.length > 0) {
      const labelPos = center.clone();
      labelPos.y = box.max.y + 0.5;
      this._labelEls[0].position.copy(labelPos);
    }
  }

  dispose() {
    this._removeLabels();
    if (this._tooltipEl && this._tooltipEl.parentNode) this._tooltipEl.parentNode.removeChild(this._tooltipEl);
    if (this._popupEl && this._popupEl.parentNode) this._popupEl.parentNode.removeChild(this._popupEl);
    this.scene.remove(this._labelGroup);
  }
}

window.ACEP_3D = window.ACEP_3D || {};
window.ACEP_3D.ElementInfoSystem = ElementInfoSystem;
})();
