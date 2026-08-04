(function () {
  'use strict';

  const ACEP_3D_CONTAINER_ID = 'acep-3d-viewer';
  let engine = null;
  let initialized = false;
  let initPromise = null;

  function getInitPromise() {
    if (!initPromise) {
      initPromise = new Promise((resolve) => {
        const check = () => {
          if (window.ACEP3DNavEngine) resolve();
          else setTimeout(check, 100);
        };
        check();
      });
    }
    return initPromise;
  }

  async function init3DNavigation(projectData) {
    if (initialized && engine) {
      if (projectData) await engine.loadProject(projectData);
      return engine;
    }

    const container = document.getElementById(ACEP_3D_CONTAINER_ID);
    if (!container) {
      console.warn('3D container not found in DOM');
      return null;
    }

    await getInitPromise();
    const { ACEP3DNavEngine } = window;
    engine = new ACEP3DNavEngine();

    engine.on('ready', () => {
      if (projectData) engine.loadProject(projectData);
      _setupModeUI();
      _setupFloorUI();
      _setupLayerUI();
      _setupOverlayUI();
      _setupSearchUI();
      _setupPhaseUI();
      _setupElementUI();
    });

    engine.on('elementSelected', (el) => {
      _updateElementPopup(el);
    });

    engine.on('elementDeselected', () => {
      _hideElementPopup();
    });

    try {
      await engine.init(ACEP_3D_CONTAINER_ID);
      initialized = true;
    } catch (e) {
      console.error('3D Nav init failed:', e);
      container.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;">
        <span style="font-size:48px;">⚠️</span>
        <div style="margin-top:12px;">3D Navigation failed to load: ${e.message}</div>
        <button onclick="location.reload()" style="margin-top:12px;padding:8px 20px;background:#3b82f6;border:none;border-radius:6px;color:#fff;cursor:pointer;">Retry</button>
      </div>`;
      return null;
    }

    return engine;
  }

  function getEngine() {
    return engine;
  }

  function setup3DControls(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="nav-3d-panel" style="display:flex;gap:16px;flex-wrap:wrap;padding:12px 0;">
        <div class="nav-3d-group" style="display:flex;flex-direction:column;gap:6px;min-width:120px;">
          <label style="font-size:11px;color:#888;">Camera Mode</label>
          <div class="mode-buttons" style="display:flex;gap:4px;flex-wrap:wrap;">
            ${['orbit','walk','fly','firstperson','drone','section','xray'].map(m =>
              `<button class="nav3d-btn mode-btn${m==='orbit'?' active':''}" data-mode="${m}"
                style="padding:4px 10px;border:1px solid #334155;border-radius:4px;background:#1e293b;color:#ccc;font-size:11px;cursor:pointer;">${m}</button>`
            ).join('')}
          </div>
        </div>

        <div class="nav-3d-group" style="display:flex;flex-direction:column;gap:6px;min-width:140px;">
          <label style="font-size:11px;color:#888;">Floor <span id="nav3d-floor-label">Ground</span></label>
          <input type="range" id="nav3d-floor-slider" min="0" max="5" value="0" step="1"
            style="width:100%;accent-color:#3b82f6;">
        </div>

        <div class="nav-3d-group" style="display:flex;flex-direction:column;gap:6px;min-width:140px;">
          <label style="font-size:11px;color:#888;">Phase Progress <span id="nav3d-phase-label">100%</span></label>
          <input type="range" id="nav3d-phase-slider" min="0" max="100" value="100" step="1"
            style="width:100%;accent-color:#10b981;">
        </div>

        <div class="nav-3d-group" style="display:flex;flex-direction:column;gap:4px;min-width:100px;">
          <label style="font-size:11px;color:#888;">Layers</label>
          <div class="layer-toggles" style="display:flex;gap:6px;flex-wrap:wrap;">
            ${['structure','architecture','finishing','mep'].map(l =>
              `<label style="font-size:10px;display:flex;align-items:center;gap:3px;cursor:pointer;">
                <input type="checkbox" class="layer-cb" data-layer="${l}" ${l==='mep'?'':'checked'} style="accent-color:#3b82f6;">
                ${l}
              </label>`
            ).join('')}
          </div>
        </div>

        <div class="nav-3d-group" style="display:flex;flex-direction:column;gap:6px;min-width:120px;">
          <label style="font-size:11px;color:#888;">Overlays</label>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <button class="nav3d-overlay-btn" data-overlay="cost" style="padding:3px 8px;border:1px solid #334155;border-radius:4px;background:#1e293b;color:#f59e0b;font-size:10px;cursor:pointer;">Cost</button>
            <button class="nav3d-overlay-btn" data-overlay="risk" style="padding:3px 8px;border:1px solid #334155;border-radius:4px;background:#1e293b;color:#ef4444;font-size:10px;cursor:pointer;">Risk</button>
            <button class="nav3d-overlay-btn" data-overlay="structural" style="padding:3px 8px;border:1px solid #334155;border-radius:4px;background:#1e293b;color:#8888ff;font-size:10px;cursor:pointer;">Struct</button>
            <button class="nav3d-clear-overlay-btn" style="padding:3px 8px;border:1px solid #334155;border-radius:4px;background:#1e293b;color:#aaa;font-size:10px;cursor:pointer;">Clear</button>
          </div>
        </div>

        <div class="nav-3d-group" style="display:flex;flex-direction:column;gap:6px;min-width:160px;">
          <label style="font-size:11px;color:#888;">Search</label>
          <div style="display:flex;gap:4px;">
            <input type="text" id="nav3d-search-input" placeholder="Element name, type, or BOQ code..."
              style="flex:1;padding:4px 8px;background:#0f172a;border:1px solid #334155;border-radius:4px;color:#ccc;font-size:11px;">
            <button id="nav3d-search-btn" style="padding:4px 10px;background:#3b82f6;border:none;border-radius:4px;color:#fff;font-size:11px;cursor:pointer;">Go</button>
          </div>
        </div>
      </div>

      <div id="nav3d-element-popup" class="nav3d-element-popup" style="display:none;position:fixed;right:20px;top:80px;z-index:1001;background:rgba(10,10,30,0.92);color:#ccc;padding:16px;border-radius:10px;font-size:13px;border:1px solid #4488ff;backdrop-filter:blur(8px);min-width:220px;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,0.5);"></div>
    `;

    _bindModeButtons(container);
    _bindFloorSlider(container);
    _bindPhaseSlider(container);
    _bindLayerToggles(container);
    _bindOverlayButtons(container);
    _bindSearch(container);
  }

  function _bindModeButtons(container) {
    container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (engine) engine.setNavigationMode(btn.dataset.mode);
      });
    });
  }

  function _bindFloorSlider(container) {
    const slider = container.querySelector('#nav3d-floor-slider');
    const label = container.querySelector('#nav3d-floor-label');
    if (!slider) return;
    slider.addEventListener('input', () => {
      const floorNames = ['Ground', 'F1', 'F2', 'F3', 'F4', 'F5'];
      const f = parseInt(slider.value);
      label.textContent = floorNames[f] || `F${f}`;
      if (engine) engine.goToFloor(f);
    });
  }

  function _bindPhaseSlider(container) {
    const slider = container.querySelector('#nav3d-phase-slider');
    const label = container.querySelector('#nav3d-phase-label');
    if (!slider) return;
    slider.addEventListener('input', () => {
      const p = parseInt(slider.value) / 100;
      label.textContent = Math.round(p * 100) + '%';
      if (engine) engine.setPhaseProgress(p);
    });
  }

  function _bindLayerToggles(container) {
    container.querySelectorAll('.layer-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        if (engine) engine.setLayerVisible(cb.dataset.layer, cb.checked);
      });
    });
  }

  function _bindOverlayButtons(container) {
    container.querySelectorAll('.nav3d-overlay-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!engine) return;
        const type = btn.dataset.overlay;
        const items = engine.elements
          .filter(e => e.boqCode)
          .map(e => ({ boqCode: e.boqCode, name: e.name, cost: e.cost || Math.round(Math.random() * 100000), risk: Math.random() }));
        engine.applyOverlay(type, { items, categories: [{ code: 'STR-COL', name: 'Columns' }, { code: 'STR-WAL', name: 'Walls' }, { code: 'MEP-ELEV', name: 'Elevator' }, { code: 'STR-STAIR', name: 'Stairs' }] });
      });
    });
    container.querySelector('.nav3d-clear-overlay-btn')?.addEventListener('click', () => {
      if (engine) engine.clearOverlays();
    });
  }

  function _bindSearch(container) {
    const input = container.querySelector('#nav3d-search-input');
    const btn = container.querySelector('#nav3d-search-btn');
    const doSearch = () => {
      if (!engine) return;
      const q = input.value.trim();
      if (!q) { engine.clearHighlights(); return; }
      const results = engine.searchElements(q);
      engine.clearHighlights();
      if (results.length > 0) {
        engine.highlightElements(e => results.includes(e), 0x00ff88);
        if (results.length === 1) engine.focusOnElement(results[0].id);
      }
    };
    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  }

  function _setupModeUI() {
    const container = document.getElementById(ACEP_3D_CONTAINER_ID)?.parentElement;
    if (!container) return;
    const existing = container.querySelector('.nav-3d-panel');
    if (existing) {
      _bindModeButtons(container);
      _bindFloorSlider(container);
      _bindPhaseSlider(container);
      _bindLayerToggles(container);
      _bindOverlayButtons(container);
      _bindSearch(container);
    }
  }

  function _setupFloorUI() {
    if (!engine) return;
    const slider = document.getElementById('nav3d-floor-slider');
    if (slider) {
      slider.max = Math.max(0, engine.getFloors() - 1);
    }
  }

  function _setupLayerUI() { }
  function _setupOverlayUI() { }
  function _setupSearchUI() { }
  function _setupPhaseUI() { }
  function _setupElementUI() { }

  function _updateElementPopup(el) {
    const popup = document.getElementById('nav3d-element-popup');
    if (!popup || !el) return;
    const p = el.properties || {};
    const m = el.metadata || {};
    popup.innerHTML = `
      <div style="color:#fff;font-size:15px;font-weight:bold;margin-bottom:8px;border-bottom:1px solid #4488ff;padding-bottom:6px;">
        ${el.name || el.id}
        <span style="float:right;font-size:11px;color:#888;font-weight:normal;">${el.type || ''}</span>
      </div>
      <div style="line-height:1.8;">
        ${el.boqCode ? `<div style="display:flex;justify-content:space-between;"><span>BOQ Code</span><span style="color:#88aaff">${el.boqCode}</span></div>` : ''}
        ${el.material ? `<div><span>Material</span><span style="color:#aacc88;float:right">${el.material}</span></div>` : ''}
        ${el.floor >= 0 ? `<div><span>Floor</span><span style="color:#ffaa44;float:right">${el.floor}</span></div>` : ''}
        ${Object.entries(p).map(([k, v]) => `<div><span>${k}</span><span style="float:right">${v}</span></div>`).join('')}
        ${el.cost > 0 ? `<div><span>Cost</span><span style="color:#f59e0b;float:right">${el.cost.toLocaleString()} AED</span></div>` : ''}
        ${Object.entries(m).map(([k, v]) => `<div><span>${k}</span><span style="color:#aaa;float:right">${v}</span></div>`).join('')}
      </div>
      <div style="margin-top:8px;display:flex;gap:4px;">
        <button onclick="ACEP3D.focusElement('${el.id}')" style="padding:3px 10px;background:#3b82f6;border:none;border-radius:4px;color:#fff;font-size:11px;cursor:pointer;">Focus</button>
        <button onclick="ACEP3D.hideElementPopup()" style="padding:3px 10px;background:#334155;border:none;border-radius:4px;color:#aaa;font-size:11px;cursor:pointer;">Close</button>
      </div>
    `;
    popup.style.display = 'block';
  }

  function _hideElementPopup() {
    const popup = document.getElementById('nav3d-element-popup');
    if (popup) popup.style.display = 'none';
  }

  function focusElement(id) {
    if (engine) engine.focusOnElement(id);
  }

  function hideElementPopup() {
    _hideElementPopup();
    if (engine) engine.hideElementInfo();
  }

  window.ACEP3D = {
    init: init3DNavigation,
    getEngine,
    focusElement,
    hideElementPopup,
    setup3DControls,
  };

  window.init3DNavigation = async function(projectData) {
    const container = document.getElementById(ACEP_3D_CONTAINER_ID);
    const statusEl = document.getElementById('nav3d-init-status');
    if (!container) return;
    if (!projectData) {
      try {
        const p = window.getCurrentProject && window.getCurrentProject();
        if (p) {
          projectData = {
            type: p.type || 'Villa',
            area: p.area || 500,
            floors: p.floors || 2,
            boqItems: [],
            totalCost: p.cost || 0,
          };
        }
      } catch(e) {}
    }
    if (statusEl) statusEl.textContent = '⏳ Loading 3D engine...';
    const engine = await ACEP3D.init(projectData);
    if (engine) {
      const controlsContainer = document.getElementById('nav3d-controls-container');
      if (controlsContainer) ACEP3D.setup3DControls(controlsContainer);
      if (statusEl) statusEl.textContent = '✅ 3D Navigation ready';
      document.getElementById('nav3d-init-btn').textContent = '🔄 Reload 3D';
    } else {
      if (statusEl) statusEl.textContent = '❌ Failed to load 3D engine';
    }
  };

  console.log('ACEP 3D Navigation Panel loaded');
})();
