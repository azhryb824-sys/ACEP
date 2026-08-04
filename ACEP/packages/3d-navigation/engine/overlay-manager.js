(function() {
'use strict';

class OverlayManager {
  constructor(engine) {
    this.engine = engine;
    this.THREE = engine.THREE;
    this.scene = engine.scene;
    this._activeOverlays = new Set();
    this._colorOverrides = new Map();
    this._colorLegend = {};
    this._htmlOverlay = null;
    this._createHTMLLegend();
  }

  apply(type, data) {
    switch (type) {
      case 'cost':
        this._applyCostOverlay(data);
        break;
      case 'risk':
        this._applyRiskOverlay(data);
        break;
      case 'mep':
        this._applyMEPOverlay(data);
        break;
      case 'colorByBOQ':
        this._applyColorByBOQ(data);
        break;
      case 'phase':
        this._applyPhaseOverlay(data);
        break;
      case 'structural':
        this._applyStructuralOverlay(data);
        break;
      default:
        console.warn(`Unknown overlay type: ${type}`);
    }
  }

  clear() {
    this._restoreColors();
    this._activeOverlays.clear();
    this._colorOverrides.clear();
    this._colorLegend = {};
    this._updateLegend();
  }

  getActiveOverlays() {
    return [...this._activeOverlays];
  }

  _applyCostOverlay(data) {
    this._activeOverlays.add('cost');
    const items = data.items || [];
    const maxCost = Math.max(...items.map(i => i.cost || 0), 1);
    const legend = {};

    items.forEach(item => {
      const elements = this._findElements(item.boqCode, item.name);
      const ratio = (item.cost || 0) / maxCost;
      const color = this._heatColor(ratio);
      legend[item.name || item.boqCode] = { color, cost: item.cost };
      elements.forEach(el => {
        this._overrideColor(el.mesh, color);
      });
    });
    this._colorLegend = legend;
    this._updateLegend();
  }

  _applyRiskOverlay(data) {
    this._activeOverlays.add('risk');
    const items = data.items || [];
    const legend = {};
    items.forEach(item => {
      const risk = (item.risk || 0.5);
      const color = risk > 0.7 ? 0xff4444 : risk > 0.4 ? 0xffaa44 : 0x44ff44;
      const elements = this._findElements(item.boqCode, item.name);
      legend[item.name || item.boqCode] = {
        color, risk: Math.round(risk * 100) + '%',
      };
      elements.forEach(el => {
        this._overrideColor(el.mesh, color);
      });
    });
    this._colorLegend = legend;
    this._updateLegend();
  }

  _applyMEPOverlay(data) {
    this._activeOverlays.add('mep');
    const systems = data.systems || ['plumbing', 'electrical', 'hvac'];
    const colors = { plumbing: 0x44aaff, electrical: 0xffaa44, hvac: 0x88ff88 };
    const legend = {};
    systems.forEach(sys => {
      const color = colors[sys] || 0x888888;
      legend[sys] = { color };
      const elems = this.engine.elements.filter(e =>
        e.layer === 'mep' && e.metadata && e.metadata.system === sys
      );
      elems.forEach(el => this._overrideColor(el.mesh, color));
    });
    this._colorLegend = legend;
    this._updateLegend();
  }

  _applyColorByBOQ(data) {
    this._activeOverlays.add('colorByBOQ');
    const categories = data.categories || [];
    const palette = [0x4488ff, 0xff8844, 0x44ff88, 0xff44aa, 0xaaff44, 0xaa44ff];
    const legend = {};
    categories.forEach((cat, i) => {
      const color = palette[i % palette.length];
      legend[cat.name || cat.code] = { color };
      const elems = this._findElements(cat.code, cat.name);
      elems.forEach(el => this._overrideColor(el.mesh, color));
    });
    this._colorLegend = legend;
    this._updateLegend();
  }

  _applyPhaseOverlay(data) {
    this._activeOverlays.add('phase');
    if (data.phase === undefined) return;
    const progress = data.phase;
    this.engine.elements.forEach(el => {
      if (el.mesh) {
        const floorStart = el.floor / (this.engine._totalFloors || 1);
        if (floorStart <= progress) {
          const t = (progress - floorStart) / Math.max(0.01, 1 - floorStart);
          const color = this._lerpColor(0x4444aa, 0x44ff88, Math.min(1, t));
          this._overrideColor(el.mesh, color);
        } else {
          this._overrideColor(el.mesh, 0x333333);
          if (el.mesh.visible !== undefined) el.mesh.visible = false;
        }
      }
    });
  }

  _applyStructuralOverlay(data) {
    this._activeOverlays.add('structural');
    const colors = {
      column: 0x8888ff, beam: 0x88ff88, slab: 0xffaa44, wall: 0xff8888,
      foundation: 0xaa88ff, stair: 0x88aaff,
    };
    const legend = {};
    Object.entries(colors).forEach(([type, color]) => {
      legend[type] = { color };
      this.engine.elements
        .filter(e => e.type === type)
        .forEach(el => this._overrideColor(el.mesh, color));
    });
    this._colorLegend = legend;
    this._updateLegend();
  }

  _findElements(boqCode, name) {
    if (!boqCode && !name) return [];
    const q = (boqCode || name || '').toLowerCase();
    return this.engine.elements.filter(e =>
      (e.boqCode && e.boqCode.toLowerCase().includes(q)) ||
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.material && e.material.toLowerCase().includes(q)) ||
      (e.type && e.type.toLowerCase().includes(q))
    );
  }

  _overrideColor(mesh, color) {
    if (!mesh) return;
    const apply = (mat) => {
      if (this._colorOverrides.has(mat)) return;
      if (mat && mat._origColor === undefined) {
        mat._origColor = mat.color.getHex();
        mat._origEmissive = mat.emissive ? mat.emissive.getHex() : 0;
      }
      if (mat && mat.color) {
        mat.color.setHex(color);
        this._colorOverrides.set(mat, true);
      }
    };
    if (mesh.type === 'Group') mesh.children.forEach(c => { if (c.isMesh) apply(c.material); });
    else apply(mesh.material);
  }

  _restoreColors() {
    this.engine.elements.forEach(el => {
      if (!el.mesh) return;
      const apply = (mat) => {
        if (mat && mat._origColor !== undefined) {
          mat.color.setHex(mat._origColor);
          if (mat.emissive && mat._origEmissive !== undefined) mat.emissive.setHex(mat._origEmissive);
          delete mat._origColor;
          delete mat._origEmissive;
        }
      };
      if (el.mesh.type === 'Group') el.mesh.children.forEach(c => { if (c.isMesh) apply(c.material); });
      else apply(el.mesh.material);
    });
    this._colorOverrides.clear();
  }

  _heatColor(ratio) {
    const r = Math.min(255, Math.round(255 * ratio));
    const g = Math.min(255, Math.round(255 * (1 - ratio)));
    const b = Math.round(100 * (1 - ratio));
    return (r << 16) | (g << 8) | b;
  }

  _lerpColor(c1, c2, t) {
    const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  }

  _createHTMLLegend() {
    this._htmlOverlay = document.createElement('div');
    this._htmlOverlay.className = 'acep-3d-legend';
    Object.assign(this._htmlOverlay.style, {
      position: 'fixed', display: 'none', zIndex: '1002',
      background: 'rgba(10,10,30,0.88)', color: '#ccc',
      padding: '12px', borderRadius: '8px', fontSize: '12px',
      border: '1px solid #4488ff', backdropFilter: 'blur(8px)',
      left: '20px', bottom: '60px', minWidth: '140px',
    });
    document.body.appendChild(this._htmlOverlay);
  }

  _updateLegend() {
    if (!this._htmlOverlay) return;
    const entries = Object.entries(this._colorLegend);
    if (entries.length === 0) {
      this._htmlOverlay.style.display = 'none';
      return;
    }
    this._htmlOverlay.innerHTML = '<div style="font-weight:bold;margin-bottom:6px;color:#fff;">Legend</div>' +
      entries.map(([name, info]) => {
        const hex = '#' + info.color.toString(16).padStart(6, '0');
        return `<div style="display:flex;align-items:center;margin:3px 0;">
          <span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${hex};margin-right:8px;"></span>
          <span>${name}</span>
          ${info.cost ? `<span style="margin-left:auto;color:#aaa">${info.cost.toLocaleString()} AED</span>` : ''}
          ${info.risk ? `<span style="margin-left:auto;color:#aaa">${info.risk}</span>` : ''}
        </div>`;
      }).join('');
    this._htmlOverlay.style.display = 'block';
  }

  dispose() {
    this.clear();
    if (this._htmlOverlay && this._htmlOverlay.parentNode) {
      this._htmlOverlay.parentNode.removeChild(this._htmlOverlay);
    }
  }
}

window.ACEP_3D = window.ACEP_3D || {};
window.ACEP_3D.OverlayManager = OverlayManager;
})();
