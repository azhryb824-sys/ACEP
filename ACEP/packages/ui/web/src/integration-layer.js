(function() {
'use strict';

const API = 'http://localhost:3000';

// ─── 1. Central State Manager (Event-driven) ───
class CentralState {
  constructor() {
    this._listeners = {};
    this._data = {
      currentProjectId: null,
      currentProjectData: null,
      lastAnalysis: null,
      lastBOQ: null,
      lastCost: null,
      lastSchedule: null,
      lastRisks: null,
      lastVision: null,
      generationJobs: [],
      trainingStats: null,
      knowledgeInsights: null,
      projectProfile: null,
      chainRunning: false,
    };
    this._patchedExisting();
  }

  _patchedExisting() {
    const origNavigate = window.navigateWithProject;
    if (origNavigate) {
      window.navigateWithProject = (pageId, projectId) => {
        this.setCurrentProject(projectId);
        origNavigate(pageId, projectId);
      };
    }
    const origOpen = window.openProject;
    if (origOpen) {
      window.openProject = (projectId) => {
        this.setCurrentProject(projectId);
        origOpen(projectId);
      };
    }
  }

  on(event, fn) {
    (this._listeners[event] = this._listeners[event] || []).push(fn);
    return () => { this._listeners[event] = this._listeners[event].filter(f => f !== fn); };
  }

  emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  get(key) { return this._data[key]; }
  getAll() { return { ...this._data }; }

  set(key, val) {
    this._data[key] = val;
    this.emit(key + ':changed', val);
    this.emit('state:changed', { key, value: val });
  }

  async setCurrentProject(projectId) {
    if (this._data.currentProjectId === projectId) return;
    this._data.currentProjectId = projectId;
    this._data.currentProjectData = null;
    this.emit('project:changed', projectId);
    this._loadProjectData(projectId);
  }

  async _loadProjectData(projectId) {
    try {
      const r = await fetch(API + '/api/v1/projects/' + projectId);
      if (r.ok) {
        const data = await r.json();
        this._data.currentProjectData = data;
        this.emit('projectData:changed', data);
      }
      const profile = await fetch(API + '/api/v1/project-profile/' + projectId);
      if (profile.ok) {
        const p = await profile.json();
        this._data.projectProfile = p.profile || p;
        this.emit('profile:changed', this._data.projectProfile);
      }
    } catch (e) { /* project may not have profile */ }
  }

  // ─── Smart Actions ───
  getAvailableActions(afterModule) {
    const pid = this._data.currentProjectId;
    if (!pid) return [];
    const actions = {
      analysis: [
        { id: 'boq', label: '🧮 إنشاء BOQ', icon: '📊', action: 'generateBOQ', page: 'boq' },
        { id: 'cost', label: '💰 تقدير التكلفة', icon: '💰', action: 'loadCostAnalysis', page: 'cost' },
        { id: 'schedule', label: '📅 جدول زمني', icon: '📅', action: 'generateSchedule', page: 'schedule' },
        { id: 'risks', label: '⚠️ تحليل مخاطر', icon: '⚠️', action: 'analyzeRisks', page: 'risks' },
        { id: 'quality', label: '✅ فحص جودة', icon: '✅', action: 'inspectQuality', page: 'quality' },
        { id: 'vision', label: '🎨 تصور بصري', icon: '🎨', action: 'generateVision', page: 'ai-visualizer' },
      ],
      boq: [
        { id: 'vision', label: '🎨 إنشاء تصور من BOQ', icon: '🎨', action: 'generateVisionFromBOQ', page: 'ai-visualizer' },
        { id: 'cost', label: '💰 تقدير التكلفة', icon: '💰', action: 'loadCostAnalysis', page: 'cost' },
        { id: 'schedule', label: '📅 جدول زمني', icon: '📅', action: 'generateSchedule', page: 'schedule' },
        { id: 'risks', label: '⚠️ تحليل مخاطر BOQ', icon: '⚠️', action: 'analyzeRisks', page: 'risks' },
        { id: 'report', label: '📄 تقرير PDF', icon: '📄', action: 'generatePDF', page: 'boq' },
        { id: 'image-from-boq', label: '🎨 صورة من BOQ', icon: '🎨', action: 'generateImageFromBOQ', page: 'boq' },
        { id: 'video', label: '🎬 فيديو بناء', icon: '🎬', action: 'generateVideo', page: 'construction-simulation' },
      ],
      cost: [
        { id: 'schedule', label: '📅 جدول زمني', icon: '📅', action: 'generateSchedule', page: 'schedule' },
        { id: 'vision', label: '🎨 تصور بصري', icon: '🎨', action: 'generateVision', page: 'ai-visualizer' },
        { id: 'risks', label: '⚠️ تحليل مخاطر', icon: '⚠️', action: 'analyzeRisks', page: 'risks' },
      ],
      schedule: [
        { id: 'vision', label: '🎨 تصور لكل مرحلة', icon: '🎨', action: 'generateVision', page: 'ai-visualizer' },
        { id: 'risks', label: '⚠️ تحليل مخاطر', icon: '⚠️', action: 'analyzeRisks', page: 'risks' },
        { id: 'video', label: '🎬 فيديو محاكاة', icon: '🎬', action: 'generateVideo', page: 'construction-simulation' },
      ],
      risks: [
        { id: 'quality', label: '✅ فحص جودة', icon: '✅', action: 'inspectQuality', page: 'quality' },
        { id: 'report', label: '📄 تقرير شامل', icon: '📄', action: 'runFullReport', page: 'analysis' },
      ],
      vision: [
        { id: 'video', label: '🎬 فيديو من التصور', icon: '🎬', action: 'generateVideo', page: 'construction-simulation' },
        { id: 'boq', label: '🧮 BOQ من التصور', icon: '📊', action: 'generateBOQ', page: 'boq' },
      ],
    };
    return actions[afterModule] || [];
  }

  // ─── Chain Pipeline ───
  async runFullChain(projectId) {
    if (this._data.chainRunning) return;
    this._data.chainRunning = true;
    this.emit('chain:start', projectId);

    try {
      // 1. Analysis
      this.emit('chain:step', { step: 1, name: 'تحليل المشروع', status: 'running' });
      const analysis = await fetch(API + '/api/v1/full-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      }).then(r => r.json());
      this._data.lastAnalysis = analysis;
      this.emit('chain:step', { step: 1, name: 'تحليل المشروع', status: 'done', data: analysis });

      // 2. BOQ
      this.emit('chain:step', { step: 2, name: 'إنشاء BOQ', status: 'running' });
      const boq = await fetch(API + '/api/v1/projects/' + projectId + '/boq/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      }).then(r => r.json());
      this._data.lastBOQ = boq;
      this.emit('chain:step', { step: 2, name: 'إنشاء BOQ', status: 'done', data: boq });

      // 3. Cost
      this.emit('chain:step', { step: 3, name: 'تقدير التكلفة', status: 'running' });
      const cost = await fetch(API + '/api/v1/projects/' + projectId + '/cost/estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      }).then(r => r.json());
      this._data.lastCost = cost;
      this.emit('chain:step', { step: 3, name: 'تقدير التكلفة', status: 'done', data: cost });

      // 4. Schedule
      this.emit('chain:step', { step: 4, name: 'الجدول الزمني', status: 'running' });
      const schedule = await fetch(API + '/api/v1/projects/' + projectId + '/schedule/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      }).then(r => r.json());
      this._data.lastSchedule = schedule;
      this.emit('chain:step', { step: 4, name: 'الجدول الزمني', status: 'done', data: schedule });

      // 5. Risks
      this.emit('chain:step', { step: 5, name: 'تحليل المخاطر', status: 'running' });
      const risks = await fetch(API + '/api/v1/projects/' + projectId + '/risks/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      }).then(r => r.json());
      this._data.lastRisks = risks;
      this.emit('chain:step', { step: 5, name: 'تحليل المخاطر', status: 'done', data: risks });

      // 6. Quality
      this.emit('chain:step', { step: 6, name: 'فحص الجودة', status: 'running' });
      const quality = await fetch(API + '/api/v1/projects/' + projectId + '/quality/inspect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      }).then(r => r.json());
      this.emit('chain:step', { step: 6, name: 'فحص الجودة', status: 'done', data: quality });

      // 7. Save to Knowledge Base
      this.emit('chain:step', { step: 7, name: 'حفظ في قاعدة المعرفة', status: 'running' });
      try {
        await fetch(API + '/api/v1/knowledge-base/record-project', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId })
        });
      } catch (e) { /* KB save optional */ }
      this.emit('chain:step', { step: 7, name: 'حفظ في قاعدة المعرفة', status: 'done' });

      this.emit('chain:complete', { projectId });
    } catch (e) {
      this.emit('chain:error', { projectId, error: e.message });
    } finally {
      this._data.chainRunning = false;
    }
  }
}

const centralState = new CentralState();
window.ACEP = window.ACEP || {};
window.ACEP.state = centralState;

// ─── 2. Background Job Queue ───
class JobQueue {
  constructor() {
    this.jobs = new Map();
    this._polling = false;
    this._intervals = {};
  }

  createJob(projectId, type, prompt, options) {
    return fetch(API + '/api/v1/vision-generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, type, ...options })
    }).then(r => r.json());
  }

  watchJob(jobId, callbacks) {
    if (this._intervals[jobId]) clearInterval(this._intervals[jobId]);
    const poll = async () => {
      try {
        const r = await fetch(API + '/api/v1/vision-generate/status/' + jobId);
        const status = await r.json();
        if (callbacks.onProgress) callbacks.onProgress(status);
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(this._intervals[jobId]);
          delete this._intervals[jobId];
          if (status.status === 'completed' && callbacks.onComplete) callbacks.onComplete(status);
          if (status.status === 'failed' && callbacks.onError) callbacks.onError(status);
        }
      } catch (e) {
        if (callbacks.onError) callbacks.onError({ error: e.message });
      }
    };
    this._intervals[jobId] = setInterval(poll, 1000);
    poll();
    return () => { clearInterval(this._intervals[jobId]); delete this._intervals[jobId]; };
  }

  stopWatching(jobId) {
    if (this._intervals[jobId]) { clearInterval(this._intervals[jobId]); delete this._intervals[jobId]; }
  }

  getActiveJobs() {
    return Array.from(this._intervals.keys());
  }
}

window.ACEP.jobs = new JobQueue();

// ─── 3. Training Platform Bridge ───
class TrainingBridge {
  async getStats() {
    try {
      const r = await fetch(API + '/api/v1/training-platform/stats');
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  async getImages(filters) {
    const params = new URLSearchParams(filters || {});
    try {
      const r = await fetch(API + '/api/v1/training-platform/images?' + params);
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  async captureImage(result, params) {
    try {
      const r = await fetch(API + '/api/v1/training-platform/capture', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationResult: result, projectParams: params })
      });
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  async getVersions() {
    try {
      const r = await fetch(API + '/api/v1/training-platform/versions');
      return r.ok ? r.json() : [];
    } catch { return []; }
  }

  async getReadiness(versionId) {
    try {
      const r = await fetch(API + '/api/v1/training-platform/readiness', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });
      return r.ok ? r.json() : null;
    } catch { return null; }
  }
}

window.ACEP.training = new TrainingBridge();

// ─── 4. Knowledge Base Bridge ───
class KnowledgeBridge {
  async recordProject(projectId) {
    try {
      const r = await fetch(API + '/api/v1/knowledge-base/record-project', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      return r.ok;
    } catch { return false; }
  }

  async getStats() {
    try {
      const r = await fetch(API + '/api/v1/knowledge-base/stats');
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  async getSimilar(type, area, floors, city) {
    const params = new URLSearchParams({ type, area, floors, city, limit: 5 });
    try {
      const r = await fetch(API + '/api/v1/knowledge-base/similar?' + params);
      return r.ok ? r.json() : null;
    } catch { return null; }
  }
}

window.ACEP.knowledge = new KnowledgeBridge();

// ─── 5. Vision Generation Bridge ───
class VisionBridge {
  async generate(projectId, options) {
    try {
      const r = await fetch(API + '/api/v1/vision-generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...options })
      });
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  async generateInterior(projectId, roomType, style) {
    try {
      const r = await fetch(API + '/api/v1/visualizer/interior', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: projectId, roomType, style })
      });
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  async generateExterior(projectId, params) {
    try {
      const r = await fetch(API + '/api/v1/visualizer/exterior', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: projectId, params })
      });
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  async generateVideo(projectId, videoType) {
    try {
      const r = await fetch(API + '/api/v1/visualizer/video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, videoType: videoType || 'walkthrough' })
      });
      return r.ok ? r.json() : null;
    } catch { return null; }
  }
}

window.ACEP.vision = new VisionBridge();

// ─── 6. Smart Actions UI Manager ───
class SmartActionsUI {
  constructor() {
    this._container = null;
    this._setup();
  }

  _setup() {
    this._container = document.getElementById('smart-actions');
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.id = 'smart-actions';
      this._container.className = 'smart-actions-panel';
      this._container.style.cssText = 'display:none;margin-bottom:16px;';
      const analysisPage = document.getElementById('page-analysis');
      if (analysisPage) {
        const infoCard = analysisPage.querySelector('.card');
        if (infoCard) infoCard.parentNode.insertBefore(this._container, infoCard);
      }
    }

    centralState.on('chain:complete', () => this.showActions());
    centralState.on('chain:step', (step) => this._updateProgress(step));
    centralState.on('chain:start', () => this._showProgress());
    centralState.on('chain:error', (err) => this._showError(err));
  }

  showActions(module) {
    const actions = centralState.getAvailableActions(module || 'analysis');
    if (!actions.length) return;
    const pid = centralState.get('currentProjectId');
    this._container.style.display = 'block';
    this._container.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,#1a56db11,#1a56db05);border:1px solid #1a56db33;border-radius:12px;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <h4 style="font-size:14px;font-weight:700;color:#1a56db;">🚀 الإجراءات الذكية للمشروع</h4>
          <span style="font-size:11px;color:#666;">${pid || ''}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${actions.map(a => `
            <button class="btn btn-sm smart-action-btn" data-action="${a.action}" data-page="${a.page}"
              style="padding:8px 14px;border-radius:8px;border:1px solid #1a56db44;background:#fff;font-size:12px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px;
                ${a.id === 'vision' || a.id === 'report' ? 'background:linear-gradient(135deg,#1a56db,#2563eb);color:#fff;border-color:#1a56db;' : ''}"
              onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 2px 8px rgba(26,86,219,0.15)'"
              onmouseout="this.style.transform='';this.style.boxShadow=''">
              ${a.icon} ${a.label}
            </button>
          `).join('')}
        </div>
      </div>`;

    this._container.querySelectorAll('.smart-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const page = btn.dataset.page;
        const fn = window[action];
        if (typeof fn === 'function') {
          if (page) {
            if (pid) window.navigateWithProject(page, pid);
            setTimeout(() => fn(), 100);
          } else {
            fn();
          }
        } else if (action === 'generateVision') {
          window.navigateWithProject('ai-visualizer', pid);
        } else if (action === 'generateImageFromBOQ') {
          window.generateImageFromBOQ();
        } else if (action === 'generateVisionFromBOQ') {
          window.navigateWithProject('ai-visualizer', pid);
        } else if (action === 'generateVideo') {
          window.navigateWithProject('construction-simulation', pid);
        } else if (action === 'runFullReport') {
          window.navigateWithProject('analysis', pid);
        }
      });
    });
  }

  _showProgress() {
    this._container.style.display = 'block';
    this._container.innerHTML = `
      <div class="card" style="border:1px solid #2563eb33;border-radius:12px;padding:16px;">
        <h4 style="font-size:14px;font-weight:700;color:#2563eb;margin-bottom:12px;">🔄 السلسلة الذكية قيد التشغيل</h4>
        <div id="chain-progress" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>`;
  }

  _updateProgress(step) {
    const container = document.getElementById('chain-progress');
    if (!container) return;
    const existing = container.querySelector(`[data-step="${step.step}"]`);
    const icon = step.status === 'done' ? '✅' : step.status === 'running' ? '⏳' : '❌';
    if (existing) {
      existing.innerHTML = `${icon} ${step.name} ${step.status === 'done' ? '— تم' : ''}`;
      existing.style.color = step.status === 'done' ? '#16a34a' : '#2563eb';
    } else {
      const el = document.createElement('div');
      el.dataset.step = step.step;
      el.style.cssText = 'padding:6px 10px;border-radius:6px;font-size:12px;background:#f8fafc;border:1px solid #e2e8f0;';
      el.innerHTML = `${icon} ${step.name} ${step.status === 'running' ? '<span style="color:#2563eb">جاري...</span>' : ''}`;
      el.style.color = step.status === 'done' ? '#16a34a' : '#2563eb';
      container.appendChild(el);
    }
    if (step.status === 'done' && step.data) {
      const summary = document.createElement('div');
      summary.style.cssText = 'font-size:11px;color:#64748b;padding:2px 10px 6px 24px;';
      if (step.step === 2 && step.data.items) summary.textContent = `${step.data.items.length} بند`;
      if (step.step === 3 && step.data.totalCost) summary.textContent = `${(step.data.totalCost / 1e6).toFixed(1)}M ر.س`;
      if (step.step === 4 && step.data.totalDuration) summary.textContent = `${step.data.totalDuration} يوم`;
      if (step.step === 5 && step.data.riskLevel) summary.textContent = `المستوى: ${step.data.riskLevel}`;
      if (summary.textContent) container.appendChild(summary);
    }
  }

  _showError(err) {
    const container = document.getElementById('chain-progress');
    if (container) {
      const el = document.createElement('div');
      el.style.cssText = 'padding:8px;border-radius:6px;font-size:12px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;';
      el.textContent = '❌ خطأ: ' + (err.error || 'فشل غير معروف');
      container.appendChild(el);
    }
  }

  hide() { this._container.style.display = 'none'; }
}

// ─── 7. Project Hub Panel ───
class ProjectHub {
  constructor() {
    this._panel = null;
    this._setup();
  }

  _setup() {
    // Add project info bar to header
    const header = document.querySelector('.header');
    if (header) {
      const infoBar = document.createElement('div');
      infoBar.id = 'project-info-bar';
      infoBar.style.cssText = 'display:none;align-items:center;gap:12px;padding:6px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;overflow-x:auto;white-space:nowrap;';
      infoBar.innerHTML = `
        <span id="pi-name" style="font-weight:700;color:#1a56db;"></span>
        <span id="pi-type" class="badge badge-primary"></span>
        <span id="pi-status" class="badge"></span>
        <span id="pi-meta" style="color:#64748b;"></span>
        <span style="flex:1"></span>
        <button id="pi-chain-btn" class="btn btn-sm" style="background:#1a56db;color:#fff;border:none;border-radius:6px;padding:4px 12px;font-size:11px;cursor:pointer;">🚀 تشغيل السلسلة</button>
        <button id="pi-actions-btn" class="btn btn-sm" style="background:#059669;color:#fff;border:none;border-radius:6px;padding:4px 12px;font-size:11px;cursor:pointer;">📋 إجراءات ذكية</button>
      `;
      header.parentNode.insertBefore(infoBar, header.nextSibling);

      document.getElementById('pi-chain-btn')?.addEventListener('click', () => {
        const pid = centralState.get('currentProjectId');
        if (pid) centralState.runFullChain(pid);
      });

      document.getElementById('pi-actions-btn')?.addEventListener('click', () => {
        const actions = new SmartActionsUI();
        actions.showActions('analysis');
        document.getElementById('smart-actions')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    centralState.on('project:changed', (pid) => this._updateInfo(pid));
    centralState.on('projectData:changed', (data) => this._updateData(data));
  }

  _updateInfo(pid) {
    const bar = document.getElementById('project-info-bar');
    if (bar) {
      bar.style.display = pid ? 'flex' : 'none';
      if (pid) document.getElementById('pi-name').textContent = pid;
    }
  }

  _updateData(data) {
    if (!data) return;
    const name = document.getElementById('pi-name');
    if (name) name.textContent = data.name || data.id || '';
    const type = document.getElementById('pi-type');
    if (type) type.textContent = (data.type || '').replace(/_/g, ' ');
    const status = document.getElementById('pi-status');
    if (status) {
      const st = data.status || 'Active';
      status.textContent = st === 'Active' ? 'قيد التنفيذ' : st === 'Delayed' ? 'متأخر' : st;
      status.className = 'badge ' + (st === 'Active' ? 'badge-success' : st === 'Delayed' ? 'badge-warning' : 'badge-primary');
    }
    const meta = document.getElementById('pi-meta');
    if (meta) meta.textContent = (data.floors || '?') + ' دور • ' + (data.area || '?') + ' م²' + (data.region ? ' • ' + data.region : '');
  }
}

// ─── 8. Cross-page Navigation Enhancements ───
class NavigationEnhancer {
  constructor() {
    this._enhanceSidebar();
    this._enhanceProjectCards();
  }

  _enhanceSidebar() {
    // Add visualizer/simulation pages to sidebar navigation support
    const visualizerPages = ['ai-visualizer', 'interior-designer', 'exterior-designer', 'construction-simulation', 'before-after', 'project-timeline', 'visualization-gallery', 'video-gallery', 'ai-design-studio', 'material-visualization'];
    document.querySelectorAll('.sidebar-item').forEach(item => {
      const page = item.dataset.page;
      if (visualizerPages.includes(page)) {
        item.addEventListener('click', function() {
          const pid = centralState.get('currentProjectId');
          if (!pid) {
            window.showToast?.('⚠️ يرجى اختيار مشروع أولاً', 'warning');
          }
        });
      }
    });
  }

  _enhanceProjectCards() {
    // Intercept project card opens
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('[data-project-id]');
      if (btn) {
        const pid = btn.dataset.projectId;
        centralState.setCurrentProject(pid);
      }
    });
  }
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', function() {
  window.ACEP.smartActions = new SmartActionsUI();
  window.ACEP.projectHub = new ProjectHub();
  window.ACEP.nav = new NavigationEnhancer();

  // Load project bar when navigating
  const origNav = window.navigate;
  if (origNav) {
    window.navigate = function(pageId) {
      const pid = centralState.get('currentProjectId');
      if (pid) {
        const bar = document.getElementById('project-info-bar');
        if (bar) bar.style.display = 'flex';
      }
      return origNav(pageId);
    };
  }
});

console.log('[ACEP] Integration Layer loaded — Central State, Smart Actions, Job Queue, Training Bridge, Knowledge Bridge');
})();
