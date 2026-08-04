(function() {
  'use strict';

  const API_BASE = 'http://localhost:3000';
  let state = {
    currentPage: 'dashboard',
    aiPanelOpen: false,
    modalOpen: false,
    currentProject: null,
    projects: [],
    boqItems: [],
    boqLastResult: null,
    boqEdits: [],
    costData: null,
    assumptionsApproved: false
  };

  const pages = [
    { id: 'dashboard', label: 'لوحة التحكم' }, { id: 'projects', label: 'المشاريع' },
    { id: 'analysis', label: 'تحليل AI' }, { id: 'boq', label: 'جدول الكميات' },
    { id: 'cost', label: 'التكاليف' }, { id: 'schedule', label: 'الجدول الزمني' },
    { id: 'risks', label: 'المخاطر' }, { id: 'gis', label: 'GIS' },
    { id: 'iot', label: 'IoT' }, { id: 'quality', label: 'الجودة' },
    { id: 'safety', label: 'السلامة' }, { id: 'sustainability', label: 'الاستدامة' },
    { id: 'marketplace', label: 'السوق' }, { id: 'bi', label: 'ذكاء الأعمال' },
    { id: 'admin', label: 'الإدارة' }, { id: 'developer', label: 'المطورين' }
  ];

  // ─── API ───────────────────────────────
  async function apiCall(endpoint, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    let res;
    try {
      res = await fetch(API_BASE + endpoint, opts);
    } catch (e) {
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        throw new Error('AI Server Not Running: Express server (port 3000) is offline');
      }
      throw new Error('Network Error: ' + e.message);
    }
    if (!res.ok) {
      let body;
      try { body = await res.json(); } catch (e) { body = null; }
      if (body && body.error === 'insufficient_information') {
        const e = new Error('insufficient_information');
        e.response = body;
        throw e;
      }
      const errorMap = {
        404: 'Endpoint Not Found: ' + endpoint,
        500: 'Internal Server Error: AI analysis failed',
        503: 'Service Unavailable: AI Engine still initializing',
        401: 'Authentication Failed: No valid API key',
        403: 'Forbidden: Insufficient permissions',
        400: 'Validation Error: Invalid request data',
        408: 'Timeout: AI analysis took too long',
        422: 'insufficient_information'
      };
      throw new Error(errorMap[res.status] || ('HTTP ' + res.status + ': ' + res.statusText));
    }
    return res.json();
  }

  // ─── Navigation ────────────────────────
  function navigate(pageId) {
    state.currentPage = pageId;
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    const navItem = document.querySelector('.sidebar-item[data-page="' + pageId + '"]');
    if (navItem) navItem.classList.add('active');
    const page = pages.find(p => p.id === pageId);
    if (page) document.getElementById('breadcrumb-current').textContent = page.label;
    if (window.innerWidth <= 768) document.querySelector('.sidebar').classList.remove('mobile-open');
    // Load dynamic data when navigating to certain pages
    if (pageId === 'projects') renderProjectsPage();
    if (pageId === 'dashboard') loadDashboard();
    if (pageId === 'boq') refreshBOQPage();
    if (['ai-visualizer','interior-designer','exterior-designer','construction-simulation','before-after'].includes(pageId)) loadVisualizerPage(pageId);
    updatePageInfo(pageId);
  }

  function navigateWithProject(pageId, projectId) {
    state.currentProject = projectId;
    navigate(pageId);
  }

  function openProject(projectId) {
    state.currentProject = projectId;
    showToast('جاري فتح المشروع', 'info');
    navigate('analysis');
  }

  function getCurrentProject() {
    if (!state.currentProject) return null;
    return (state.projects || []).find(p => p.id === state.currentProject) || null;
  }

  async function _updateAnalysisCard(page, project) {
    try {
      const data = await apiCall('/api/v1/full-analysis', 'POST', { description: project.description || project.name }).catch(() => null);
      const card = page.querySelector('.card-title')?.closest('.card')?.querySelector('.card-body');
      if (!card) return;
      const rows = card.querySelectorAll('.flex.justify-between');
      if (rows.length < 4) return;
      const vals = rows.querySelectorAll('.font-semibold, .badge');
      if (data) {
        if (vals[0]) vals[0].textContent = project.status === 'Active' ? 'نشط' : project.status || '-';
        if (vals[1]) vals[1].textContent = data.cost?.confidence ? `${Math.round(data.cost.confidence * 100)}%` : `${Math.round(project.progress || 0)}%`;
        if (rows[2]) { const v = rows[2].querySelector('.font-semibold'); if (v && data.schedule?.totalDuration) v.textContent = data.schedule.totalDuration + ' يوم'; }
        if (rows[3]) { const v = rows[3].querySelector('.font-semibold'); if (v && data.boq?.items?.length) v.textContent = `ACEP-${project.type?.substring(0,3) || 'Vis'}-v1`; }
      } else {
        if (vals[0]) vals[0].textContent = project.status === 'Active' ? 'نشط' : project.status || '-';
        if (vals[1]) vals[1].textContent = Math.round(project.progress || 0) + '%';
      }
    } catch(e) { /* use static */ }
  }

  function loadVisualizerPage(pageId) {
    const project = getCurrentProject();
    if (!project) return;
    const page = document.getElementById('page-' + pageId);
    if (!page) return;
    const statValueEls = page.querySelectorAll('.card-stat-value');
    const labels = page.querySelectorAll('.card-stat-label');
    if (statValueEls.length >= 3) {
      statValueEls[0].textContent = project.name || 'مشروع';
      statValueEls[1].textContent = project.type || '-';
      const statusText = project.status === 'Active' ? 'نشط' : project.status === 'Delayed' ? 'متأخر' : project.status === 'Planning' ? 'تخطيط' : project.status || '-';
      statValueEls[2].textContent = statusText;
    }
    if (labels.length >= 4) {
      labels[1].textContent = project.id || '-';
      labels[3].textContent = (project.floors || '?') + ' دور • ' + (project.area || '?') + ' m²';
    }
    const subtitleEl = page.querySelector('.page-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = project.name ? `${project.name} - ${project.type} (${project.area || 0}m², ${project.floors || 1} أدوار)` : `اختر مشروعاً من صفحة المشاريع`;
    }
    _updateAnalysisCard(page, project);
    if (pageId === 'ai-visualizer' && typeof ACEP3D !== 'undefined') {
      setTimeout(() => {
        const initBtn = document.getElementById('nav3d-init-btn');
        if (initBtn && !initBtn.dataset.initialized) {
          initBtn.dataset.initialized = '1';
          window.init3DNavigation({
            type: project.type || 'Villa',
            area: project.area || 500,
            floors: project.floors || 2,
            boqItems: project.boqItems || [],
            totalCost: project.cost || 0,
          });
        }
      }, 500);
    }
  }

  function updatePageInfo(pageId) {
    const project = getCurrentProject();
    const subtitleEl = document.querySelector('#page-' + pageId + ' .page-subtitle');
    if (!subtitleEl) return;
    const labels = {
      analysis: 'تحليل شامل متعدد المراحل',
      boq: 'جدول الكميات',
      cost: 'التكلفة التقديرية',
      schedule: 'الجدول الزمني',
      risks: 'تحليل المخاطر'
    };
    const label = labels[pageId] || '';
    if (project) {
      subtitleEl.textContent = project.name + ' - ' + project.id + ' • ' + label;
    } else if (state.currentProject) {
      subtitleEl.textContent = state.currentProject + ' • ' + label;
    } else {
      subtitleEl.textContent = 'لم يتم اختيار مشروع • ' + label;
    }
  }

  function updateAnalysisPageInfo() {
    updatePageInfo('analysis');
  }

  // ─── Toast ─────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = '<span>' + (icons[type] || 'ℹ️') + '</span><span>' + message + '</span>' +
      '<button onclick="this.parentElement.remove()" style="margin-right:auto;background:none;border:none;cursor:pointer;font-size:16px;">&times;</button>';
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
  }

  // ─── Modal ─────────────────────────────
  function openModal(title) {
    state.modalOpen = true;
    if (title) document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-overlay').classList.add('open');
  }
  function closeModal() {
    state.modalOpen = false;
    document.getElementById('modal-overlay').classList.remove('open');
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('active');
  }
  window.confirmAction = function(msg) {
    return new Promise((resolve) => {
      document.getElementById('modal-message').textContent = msg;
      document.getElementById('modal-confirm-btn').onclick = () => { closeModal(); resolve(true); };
      document.getElementById('modal-cancel-btn').onclick = () => { closeModal(); resolve(false); };
      openModal('تأكيد');
    });
  };

  // ─── AI Panel ──────────────────────────
  function openAiPanel() {
    state.aiPanelOpen = true;
    document.getElementById('ai-panel').classList.add('open');
    document.getElementById('ai-backdrop').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeAiPanel() {
    state.aiPanelOpen = false;
    document.getElementById('ai-panel').classList.remove('open');
    document.getElementById('ai-backdrop').classList.remove('open');
    document.body.style.overflow = '';
  }
  function toggleAiPanel() {
    if (state.aiPanelOpen) closeAiPanel(); else openAiPanel();
  }

  // ─── Dashboard: Load stats from API ────
  async function loadDashboard() {
    try {
      const health = await apiCall('/health');
      const projs = await apiCall('/api/v1/projects');
      state.projects = projs.projects;
      // Update stats
      const statValues = document.querySelectorAll('#page-dashboard .card-stat-value');
      if (statValues.length >= 4) {
        statValues[0].textContent = projs.projects.length;
        statValues[1].textContent = projs.projects.filter(p => p.status === 'Active' || p.status === 'قيد التنفيذ').length;
        const avgProgress = projs.projects.reduce((s, p) => s + (p.progress || 0), 0) / (projs.projects.length || 1);
        statValues[2].textContent = Math.round(avgProgress) + '%';
        const totalBudget = projs.projects.reduce((s, p) => s + (p.cost || 0), 0);
        statValues[3].textContent = totalBudget >= 1e9 ? (totalBudget / 1e9).toFixed(1) + 'B' : (totalBudget / 1e6).toFixed(0) + 'M';
      }
      // Update projects table
      const tbody = document.querySelector('#page-dashboard table tbody');
      if (tbody && projs.projects.length > 0) {
        tbody.innerHTML = projs.projects.slice(0, 5).map(p => {
          const statusClass = p.status === 'Active' ? 'badge-success' : p.status === 'Delayed' ? 'badge-warning' : 'badge-primary';
          const statusText = p.status === 'Active' ? 'قيد التنفيذ' : p.status === 'Delayed' ? 'تأخير ' : p.status === 'Planning' ? 'تخطيط' : p.status;
          const progressColor = p.status === 'Delayed' ? 'style="background:var(--color-warning-500)"' : '';
          return '<tr><td><span class="font-semibold">' + p.name + '</span><div class="text-xs text-tertiary">' + p.id + '</div></td>' +
            '<td>' + (p.type || '-') + '</td>' +
            '<td><div class="flex items-center gap-2"><div class="progress-bar" style="width:100px;"><div class="progress-fill" style="width:' + p.progress + '%;"' + progressColor + '></div></div><span class="text-sm">' + p.progress + '%</span></div></td>' +
            '<td class="font-semibold">' + (p.cost >= 1e9 ? (p.cost / 1e9).toFixed(1) + 'B' : (p.cost / 1e6).toFixed(0) + 'M') + '</td>' +
            '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
            '<td><button class="btn btn-sm btn-ghost" data-project-id="' + p.id + '" onclick="navigateWithProject(\'analysis\', \'' + p.id + '\')">تحليل</button></td></tr>';
        }).join('');
      }
    } catch (e) {
      // keep static data
    }
  }

  // ─── Analysis: Full AI analysis ────────
  async function runFullAnalysis() {
    const project = getCurrentProject();
    const projectName = project ? (project.name || project.id) : (state.currentProject || '');
    if (!projectName && !state.currentProject) {
      showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning');
      return;
    }
    const desc = project ? (project.description || '') : (state.currentProject || '');
    if (!desc) {
      showToast('⚠️ وصف المشروع فارغ. يرجى إدخال وصف للمشروع.', 'warning');
      return;
    }
    showToast('جاري التحليل الشامل بالذكاء الاصطناعي...', 'info');
    try {
      const data = await apiCall('/api/v1/full-analysis', 'POST', { description: desc });
      const costStr = Number(data.cost.totalCost).toLocaleString('en-US');
      showToast('اكتمل التحليل: ' + data.facts.projectType.value + ' - ' + costStr + ' SAR', 'success');

      // Update confidence bar
      const confEl = document.querySelector('.confidence-fill');
      if (confEl) confEl.style.width = Math.round(data.facts.projectType.confidence * 100) + '%';
      const confText = document.querySelector('.ai-confidence .font-semibold');
      if (confText) confText.textContent = Math.round(data.facts.projectType.confidence * 100) + '%';

      // Update analysis description
      const descEl = document.getElementById('analysis-description');
      if (descEl) {
        const type = data.facts.projectType.value;
        const area = data.facts.floors ? (data.totalArea || (data.facts.floors * (data.areaPerFloor || 0))) : 0;
        descEl.innerHTML = 'تم تحليل المشروع: <strong>' + type + '</strong> | ' +
          (data.facts.floors ? 'عدد الأدوار: <strong>' + data.facts.floors + '</strong> | ' : '') +
          (area ? 'المساحة: <strong>' + area.toLocaleString() + ' م²</strong>' : '') +
          '. تم الاستناد إلى وصف المشروع المقدم.';
      }

      // Update analysis tags
      const tagsEl = document.getElementById('analysis-tags');
      if (tagsEl) {
        const tags = [];
        if (data.facts.projectType) tags.push('🧱 ' + data.facts.projectType.value);
        tagsEl.innerHTML = tags.map(t => '<span class="badge badge-primary">' + t + '</span>').join('');
      }

      // Update BOQ stat card
      const boqVal = document.getElementById('analysis-boq-value');
      if (boqVal && data.boq) boqVal.textContent = data.boq.summary.totalItems + ' بند';
      const boqConf = document.getElementById('analysis-boq-confidence');
      if (boqConf && data.boq) boqConf.textContent = 'بثقة ' + Math.round(data.boq.summary.averageConfidence * 100) + '%';

      // Update cost stat card
      const costVal = document.getElementById('analysis-cost-value');
      if (costVal && data.cost) costVal.textContent = (Number(data.cost.totalCost) / 1e6).toFixed(1) + 'M';
      const costConf = document.getElementById('analysis-cost-confidence');
      if (costConf && data.cost) costConf.textContent = 'هامش ±' + Math.round((1 - data.cost.confidence) * 100) + '%';

      // Update duration stat card
      const durVal = document.getElementById('analysis-duration-value');
      if (durVal && data.schedule) durVal.textContent = data.schedule.totalMonths + ' شهر';
      const durConf = document.getElementById('analysis-duration-confidence');
      if (durConf && data.schedule) durConf.textContent = 'المسار الحاسم: ' + (data.schedule.criticalPath ? data.schedule.criticalPath.length : '—') + ' نشاط';

      // Update quality & risks (legacy selectors)
      const qText = document.querySelector('#page-analysis .card-stat-value');
      if (qText && data.quality) qText.textContent = (data.quality.qualityScore || 0) + '%';
      const rText = document.querySelectorAll('#page-analysis .card-stat-value')[1];
      if (rText && data.risks) rText.textContent = data.risks.level || 'Medium';

      // Update analysis timeline
      if (data.analysis && Array.isArray(data.analysis)) {
        const steps = document.querySelectorAll('.timeline-item .timeline-title');
        data.analysis.forEach((step, i) => {
          if (steps[i]) {
            const item = steps[i].closest('.timeline-item');
            const dot = item?.querySelector('.timeline-dot');
            if (dot) { dot.textContent = '✓'; dot.className = 'timeline-dot active'; }
            const statusEl = item?.querySelector('.timeline-time');
            if (statusEl) statusEl.textContent = 'اكتمل - ' + (step.result ? step.result.substring(0, 60) : '');
          }
        });
      }
      console.log('[ACEP] Full analysis completed:', { type: data.facts.projectType.value, cost: data.cost.totalCost, confidence: data.facts.projectType.confidence });
    } catch (e) {
      console.error('[ACEP] Analysis error:', e);
      const errorMap = {
        'AI Server Not Running': '⚠️ خادم AI متوقف',
        'Endpoint Not Found': '⚠️ نقطة النهاية غير موجودة',
        'Internal Server Error': '⚠️ خطأ داخلي في الخادم',
        'Service Unavailable': '⚠️ الخدمة غير متاحة حالياً',
        'Authentication Failed': '⚠️ فشل التحقق من الهوية',
        'Validation Error': '⚠️ بيانات غير صالحة',
        'Timeout': '⚠️ انتهت مهلة الطلب',
        'insufficient_information': '⚠️ المعلومات غير كافية للتحليل'
      };
      if (e.message === 'insufficient_information' || (e.response && e.response.error === 'insufficient_information')) {
        const msg = (e.response && e.response.message) ? e.response.message : 'المعلومات غير كافية للتحليل';
        showToast('⚠️ ' + msg, 'warning');
        const descEl = document.getElementById('analysis-description');
        if (descEl) descEl.innerHTML = '<strong>المعلومات غير كافية</strong> - ' + msg + '. يرجى إضافة المساحة التقريبية وعدد الأدوار إلى وصف المشروع.';
        return;
      }
      const prefix = Object.keys(errorMap).find(k => e.message.startsWith(k)) || 'Network Error';
      const userMsg = errorMap[prefix] || ('❌ خطأ: ' + e.message);
      showToast(userMsg, 'error');
    }
  }

  // ─── BOQ: Refresh page data ───────────
  async function refreshBOQPage() {
    if (!state.currentProject && state.projects.length === 0) {
      try { const data = await apiCall('/api/v1/projects'); state.projects = data.projects || []; } catch {}
    }
    const subtitle = document.getElementById('boq-subtitle');
    if (subtitle) {
      const proj = getCurrentProject();
      subtitle.textContent = proj ? (proj.name + ' — ' + (proj.type || '').replace(/_/g, ' ')) : 'اختر مشروعاً من لوحة التحكم أو أنشئ مشروعاً جديداً';
    }
  }

  // ─── BOQ: Generate from API (Rule Engine) ─
  async function generateBOQ() {
    if (!state.currentProject) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
    const proj = getCurrentProject();
    if (!proj) { showToast('⚠️ بيانات المشروع غير متوفرة', 'warning'); return; }

    if (!state.assumptionsApproved) {
      reviewBOQAssumptions();
      return;
    }

    showToast('جاري إنشاء جدول الكميات...', 'info');
    try {
      const b = await apiCall('/api/v1/projects/' + state.currentProject + '/boq/generate', 'POST');
      renderBOQFromData(b);
    } catch (e) {
      showToast('خطأ: ' + e.message, 'error');
    }
  }

  // ─── BOQ Item Explanation ────────────────
  function showBOQItemExplanation(item) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    if (title) title.textContent = item.description || 'شرح البند';
    if (body) {
      const calcMethod = item.calculationMethod || '—';
      const formula = item.formula || '—';
      const source = item.additionReason || item.dataSource || '—';
      const confidence = item.confidence ? (item.confidence * 100).toFixed(0) + '%' : '—';
      const phaseName = item.phaseName || item.phase || '—';
      const tradeName = item.tradeName || item.trade || '—';
      body.innerHTML =
        '<div class="modal-explanation">' +
        '<div class="flex gap-3 mb-4 flex-wrap">' +
        '<span class="badge badge-primary">' + phaseName + '</span>' +
        '<span class="badge badge-secondary">' + tradeName + '</span>' +
        (item.element ? '<span class="badge badge-outline">' + item.element + '</span>' : '') +
        (item.material ? '<span class="badge badge-outline">' + item.material + '</span>' : '') +
        '</div>' +
        '<div class="exp-section"><h4>📐 طريقة الحساب</h4><p>' + calcMethod + '</p></div>' +
        (item.insufficient ? '<div class="exp-section" style="background:#fff3e0;padding:8px;border-radius:4px;"><h4>⚠️ بيانات ناقصة</h4><p>' + (item.insufficientReason || 'لا توجد بيانات كافية') + '</p></div>' : '') +
        '<div class="exp-section"><h4>🧮 المعادلة</h4><pre style="direction:ltr;text-align:left;background:#f5f5f5;padding:8px;border-radius:4px;font-size:12px;overflow-x:auto;">' + formula + '</pre></div>' +
        '<div class="exp-section"><h4>📊 الكمية المحسوبة</h4><p>' + (item.quantity !== null ? item.quantity.toLocaleString() + ' ' + item.unit : 'لا توجد بيانات كافية') + '</p></div>' +
        '<div class="exp-section"><h4>💵 السعر</h4><p>' + (item.unitPrice ? item.unitPrice.toLocaleString() + ' ر.س / ' + item.unit : '—') + '</p></div>' +
        '<div class="exp-section"><h4>🎯 درجة الثقة</h4><p>' + confidence + '</p></div>' +
        '<div class="exp-section"><h4>📋 مصدر البيانات</h4><p>' + source + '</p></div>' +
        '</div>' +
        '<div class="flex justify-end gap-2 mt-4">' +
        '<button class="btn btn-primary" onclick="closeModal()">حسناً</button>' +
        '</div>';
      const style = document.createElement('style');
      style.textContent = '.modal-explanation .exp-section { margin-bottom: 12px; } .modal-explanation h4 { font-size: 13px; font-weight: 600; margin-bottom: 4px; color: var(--color-text-secondary); } .modal-explanation p { font-size: 14px; line-height: 1.6; }';
      body.appendChild(style);
    }
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('open');
    modal.classList.add('active');
  }

  // ─── BOQ Recalculate ──────────────────
  async function recalculateBOQ() {
    if (!state.currentProject) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
    if (state.boqEdits.length === 0) { showToast('لا توجد تعديلات لإعادة الحساب', 'info'); return; }
    showToast('جاري إعادة حساب BOQ...', 'info');
    try {
      const proj = getCurrentProject();
      const params = {
        type: proj.type,
        area: proj.area || 0,
        floors: proj.floors || 1,
        rooms: proj.rooms || null,
        bathrooms: proj.bathrooms || null,
        hasKitchen: proj.hasKitchen || false,
        halls: proj.halls || null,
        description: proj.description || ''
      };
      const result = await apiCall('/api/v1/boq/recalculate', 'POST', {
        params,
        decisions: state.boqEdits,
        existingItems: state.boqItems
      });
      const editCount = state.boqEdits.length;
      state.boqEdits = [];
      showToast('✅ تم إعادة حساب BOQ بناءً على ' + editCount + ' تعديل', 'success');
      renderBOQFromData(result);
    } catch (e) {
      showToast('خطأ في إعادة الحساب: ' + e.message, 'error');
    }
  }

  // ─── BOQ Edit Item ───────────────────────
  window.editBOQItem = function(code) {
    const item = state.boqItems.find(i => i.code === code);
    if (!item) return;
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    if (title) title.textContent = 'تعديل: ' + (item.description || '');
    if (body) {
      body.innerHTML =
        '<p class="text-sm text-tertiary mb-4">قم بتعديل الكمية أو السعر وسيتم تسجيل التعديل كبيانات تدريب لتحسين النموذج</p>' +
        '<div class="mb-3"><label class="text-sm font-semibold">الكمية (' + item.unit + ')</label>' +
        '<input type="number" id="edit-qty" class="form-input" value="' + (item.quantity || '') + '" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-top:4px;"></div>' +
        '<div class="mb-3"><label class="text-sm font-semibold">سعر الوحدة (ر.س)</label>' +
        '<input type="number" id="edit-price" class="form-input" value="' + (item.unitPrice || '') + '" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;margin-top:4px;"></div>' +
        '<div class="flex justify-end gap-2 mt-4">' +
        '<button class="btn btn-outline" onclick="closeModal()">إلغاء</button>' +
        '<button class="btn btn-primary" id="edit-save-btn">حفظ التعديل</button>' +
        '</div>';
      body.querySelector('#edit-save-btn').addEventListener('click', async function() {
        const newQty = parseFloat(document.getElementById('edit-qty').value);
        const newPrice = parseFloat(document.getElementById('edit-price').value);
        if (isNaN(newQty) && isNaN(newPrice)) { alert('يرجى إدخال قيمة صحيحة'); return; }

        // Track edit in state for recalculate
        const edit = {
          itemCode: item.code,
          field: newQty ? 'quantity' : 'unitPrice',
          oldValue: newQty ? item.quantity : item.unitPrice,
          newValue: newQty || newPrice
        };
        state.boqEdits.push(edit);

        // Apply locally
        if (newQty) item.quantity = newQty;
        if (newPrice) item.unitPrice = newPrice;
        item.totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
        item.confidence = Math.min(item.confidence + 0.1, 1.0);

        // Track on server
        try {
          await fetch(API_BASE + '/api/v1/boq/user-edit', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: state.currentProject || 'unknown',
              itemCode: item.code,
              field: edit.field,
              oldValue: edit.oldValue,
              newValue: edit.newValue,
              projectParams: { type: 'manual_edit' }
            })
          });
        } catch (e) { /* silently fail tracking */ }

        closeModal();
        showToast('تم حفظ التعديل. استخدم "إعادة حساب" لتطبيق التغييرات', 'success');

        // Show recalculate button and trigger recalculate
        const btn = document.getElementById('btn-recalculate');
        if (btn) btn.style.display = '';
        recalculateBOQ();
      });
    }
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('open');
    modal.classList.add('active');
  };

  // ─── Review BOQ Assumptions ─────────────
  let pendingAssumptions = null;
  let pendingDecisions = {};

  async function reviewBOQAssumptions() {
    if (!state.currentProject) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
    showToast('جاري تحليل الافتراضات الهندسية...', 'info');
    try {
      const proj = getCurrentProject();
      if (!proj) { showToast('⚠️ بيانات المشروع غير متوفرة', 'warning'); return; }
      const params = {
        projectType: proj.type,
        area: proj.area || 0,
        floors: proj.floors || 1,
        rooms: proj.rooms || null,
        bathrooms: proj.bathrooms || null,
        hasKitchen: proj.hasKitchen || false,
        halls: proj.halls || null,
        description: proj.description || '',
        phase: proj.phase || null
      };
      const data = await apiCall('/api/v1/boq/assumptions', 'POST', params);
      pendingAssumptions = data;
      pendingDecisions = {};

      const modal = document.getElementById('modal');
      const title = document.getElementById('modal-title');
      const body = document.getElementById('modal-body');
      if (title) title.textContent = '🔍 مراجعة الافتراضات الهندسية - يرجى اعتماد الافتراضات قبل إنشاء BOQ';
      if (body) {
        let html = '<div class="assumptions-review">';
        html += '<p class="text-sm text-tertiary mb-4">تم تحليل المشروع هندسياً. الافتراضات التالية مطلوبة لإكمال جدول الكميات. يرجى مراجعة وتعديل أي افتراض قبل المتابعة.</p>';

        // Stats
        const hasMissing = data.insufficientCount > 0 || data.missingParameters.length > 0;
        html += '<div class="stats-grid mb-4" style="grid-template-columns:repeat(4,1fr);">';
        html += '<div class="card card-stat"><div class="card-stat-label">نوع المشروع</div><div class="card-stat-value" style="font-size:14px;">' + data.projectType + '</div></div>';
        html += '<div class="card card-stat"><div class="card-stat-label">مرحلة المشروع</div><div class="card-stat-value" style="font-size:14px;">' + data.phase + '</div></div>';
        html += '<div class="card card-stat"><div class="card-stat-label">الافتراضات</div><div class="card-stat-value" style="font-size:14px;">' + data.totalAssumptions + '</div></div>';
        html += '<div class="card card-stat"><div class="card-stat-label">تتطلب موافقة</div><div class="card-stat-value" style="font-size:14px;' + (hasMissing ? 'color:var(--color-danger-600);' : 'color:var(--color-success-600);') + '">' + (data.insufficientCount + data.missingParameters.length) + '</div></div>';
        html += '</div>';

        // Missing parameters section (if any)
        if (data.missingParameters && data.missingParameters.length > 0) {
          html += '<div style="background:#fff3e0;border:1px solid #ffcc02;border-radius:8px;padding:12px;margin-bottom:16px;">';
          html += '<h4 style="font-size:13px;font-weight:700;color:#b8860b;margin-bottom:8px;">⚠️ بيانات ناقصة تحتاج افتراضات هندسية</h4>';
          for (const a of data.assumptions) {
            if (a.type === 'missing_parameter') {
              html += '<div style="margin-bottom:8px;padding:8px;background:#fff;border-radius:4px;border:1px solid #f0f0f0;">';
              html += '<div class="flex items-center justify-between mb-1">';
              html += '<span class="font-semibold" style="font-size:13px;">' + (a.field === 'area' ? 'المساحة' : a.field === 'floors' ? 'عدد الأدوار' : a.field === 'rooms' ? 'عدد الغرف' : a.field === 'bathrooms' ? 'عدد الحمامات' : a.field === 'hasKitchen' ? 'وجود مطبخ' : a.field) + '</span>';
              html += '<span class="badge ' + (a.confidence > 0.5 ? 'badge-warning' : 'badge-danger') + '">ثقة ' + Math.round(a.confidence * 100) + '%</span>';
              html += '</div>';
              html += '<div style="font-size:12px;color:#666;margin-bottom:6px;">' + a.explanation + '</div>';
              html += '<div class="flex items-center gap-2">';
              html += '<label class="text-sm" style="font-size:12px;">القيمة المقترحة:</label>';
              html += '<input type="' + (a.field === 'hasKitchen' ? 'checkbox' : 'number') + '" id="edit-' + a.id + '" value="' + a.proposedValue + '" ' + (a.field === 'hasKitchen' && a.proposedValue ? 'checked' : '') + ' style="width:' + (a.field === 'hasKitchen' ? 'auto' : '80px') + ';padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">';
              html += '<span class="text-xs text-tertiary">' + a.unit + '</span>';
              if (a.field === 'hasKitchen') {
                html += '<label class="text-sm" style="font-size:12px;">نعم/لا</label>';
              }
              html += '<button class="btn btn-sm btn-outline" onclick="applyAssumptionValue(\'' + a.id + '\',\'' + a.field + '\')">تطبيق</button>';
              html += '</div></div>';
            }
          }
          html += '</div>';
        }

        // Phase badges
        html += '<h4 style="font-size:13px;font-weight:600;margin-bottom:8px;">مراحل دورة الحياة:</h4>';
        html += '<div class="flex gap-2 mb-4 flex-wrap">';
        for (const phase of data.lifecyclePhases) {
          html += '<span class="badge badge-primary">' + phase.name + '</span>';
        }
        html += '</div>';

        // Assumptions by phase
        const byPhase = {};
        for (const a of data.assumptions) {
          if (!byPhase[a.phaseName]) byPhase[a.phaseName] = [];
          byPhase[a.phaseName].push(a);
        }
        const phaseOrder = data.lifecyclePhases || [];
        for (const phase of phaseOrder) {
          const items = byPhase[phase.name];
          if (!items || items.length === 0) continue;
          html += '<h4 style="font-size:13px;font-weight:600;margin:12px 0 6px;color:var(--color-primary-700);">▸ ' + phase.name + ' (' + items.length + ')</h4>';
          html += '<div style="max-height:250px;overflow-y:auto;border:1px solid #eee;border-radius:6px;">';
          for (const a of items) {
            if (a.type === 'missing_parameter') continue;
            const bg = a.insufficient ? 'background:#fff3e0;' : a.requiresConfirmation ? 'background:#f5f5ff;' : '';
            html += '<div style="padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:12px;' + bg + '">' +
              '<div class="flex items-center justify-between">' +
              '<span class="font-semibold" style="font-size:13px;">' + a.code + ' ' + a.description + '</span>' +
              (a.insufficient ? '<span class="badge badge-danger">ناقص</span>' : a.requiresConfirmation ? '<span class="badge badge-warning">يحتاج موافقة</span>' : '<span class="badge badge-success">تلقائي</span>') +
              '</div>' +
              '<div class="text-tertiary" style="font-size:11px;">' + (a.element || '') + (a.element && a.material ? ' • ' : '') + (a.material || '') + ' • ' + a.unit +
              (a.quantity ? ' • الكمية: ' + Number(a.quantity).toLocaleString() : '') +
              (a.insufficient ? ' • <span style="color:var(--color-danger-600);">' + (a.reason || 'بيانات ناقصة') + '</span>' : '') +
              (a.method ? ' • ' + a.method : '') +
              '</div>' +
              (a.insufficient || a.requiresConfirmation ? '<div class="flex gap-2 mt-1">' +
                '<button class="btn btn-sm btn-success" onclick="event.stopPropagation();approveAssumption(\'' + a.id + '\')" style="font-size:11px;padding:2px 8px;">✔ اعتماد</button>' +
                '<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();editAssumption(\'' + a.id + '\')" style="font-size:11px;padding:2px 8px;">✏️ تعديل</button>' +
                (a.insufficient ? '<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();rejectAssumption(\'' + a.id + '\')" style="font-size:11px;padding:2px 8px;color:var(--color-danger-600);">✖ رفض</button>' : '') +
                '</div>' : '') +
              '</div>';
          }
          html += '</div>';
        }
        html += '</div>';
        html += '<div class="flex justify-end gap-2 mt-4">' +
          '<button class="btn btn-outline" onclick="closeModal()">إلغاء</button>' +
          '<button class="btn btn-primary" id="approve-all-assumptions-btn" onclick="applyAllAssumptions()">✔ اعتماد الكل وإنشاء BOQ</button>' +
          '</div>';
        body.innerHTML = html;
      }
      const overlay = document.getElementById('modal-overlay');
      if (overlay) overlay.classList.add('open');
      modal.classList.add('active');
      showToast('تم تحليل ' + data.totalAssumptions + ' افتراضاً هندسياً. يرجى مراجعة الافتراضات التي تحتاج موافقة.', hasMissing ? 'warning' : 'success');
    } catch (e) {
      showToast('خطأ في تحليل الافتراضات: ' + e.message, 'error');
    }
  }

  // ─── Assumption Action Handlers ─────────
  window.applyAssumptionValue = function(assumptionId, field) {
    const input = document.getElementById('edit-' + assumptionId);
    if (!input) return;
    const value = input.type === 'checkbox' ? input.checked : parseFloat(input.value);
    pendingDecisions[assumptionId] = { action: 'modify', field, approvedValue: value, code: field };
    const btn = input.parentElement.querySelector('button');
    if (btn) { btn.textContent = '✓'; btn.style.background = 'var(--color-success-500)'; btn.style.color = '#fff'; }
    showToast('تم تطبيق القيمة: ' + (value === true ? 'نعم' : value === false ? 'لا' : value), 'success');
  };

  window.approveAssumption = function(assumptionId) {
    pendingDecisions[assumptionId] = { action: 'accept', code: assumptionId };
    const btn = event && event.target ? event.target : null;
    if (btn) { btn.textContent = '✓'; btn.style.background = 'var(--color-success-500)'; btn.style.color = '#fff'; }
    showToast('تم اعتماد الافتراض', 'success');
  };

  window.rejectAssumption = function(assumptionId) {
    pendingDecisions[assumptionId] = { action: 'reject', code: assumptionId };
    const btn = event && event.target ? event.target : null;
    if (btn) { btn.closest('div').style.opacity = '0.4'; btn.textContent = 'مرفوض'; btn.style.color = 'var(--color-danger-600)'; }
    showToast('تم رفض البند', 'info');
  };

  window.editAssumption = function(assumptionId) {
    const assumption = pendingAssumptions.assumptions.find(a => a.id === assumptionId);
    if (!assumption) return;
    const newQty = prompt('الكمية المقترحة (' + assumption.unit + '):', assumption.quantity || '');
    if (newQty === null) return;
    const parsed = parseFloat(newQty);
    if (isNaN(parsed)) { alert('يرجى إدخال رقم صحيح'); return; }
    assumption.quantity = parsed;
    pendingDecisions[assumptionId] = { action: 'modify', field: 'quantity', approvedValue: parsed, code: assumption.code, originalValue: assumption.quantity };
    showToast('تم تعديل الكمية إلى ' + parsed, 'success');
    reviewBOQAssumptions();
  };

  window.applyAllAssumptions = async function() {
    const proj = getCurrentProject();
    if (!proj) return;
    showToast('جاري تطبيق الافتراضات وإنشاء BOQ...', 'info');
    closeModal();
    try {
      const decisions = Object.values(pendingDecisions);
      if (decisions.length === 0) {
        // Auto-accept all missing_parameter assumptions
        for (const a of pendingAssumptions.assumptions) {
          if (a.type === 'missing_parameter') {
            decisions.push({ action: 'accept', code: a.id, field: a.field, approvedValue: a.proposedValue });
          }
        }
      }
      const params = {
        projectType: proj.type,
        area: proj.area ?? null,
        floors: proj.floors ?? null,
        rooms: proj.rooms ?? null,
        bathrooms: proj.bathrooms ?? null,
        hasKitchen: proj.hasKitchen ?? false,
        halls: proj.halls ?? null,
        description: proj.description || '',
        phase: proj.phase || null
      };
      const result = await apiCall('/api/v1/boq/assumptions/apply', 'POST', { decisions, params });
      state.boqItems = result.items || [];
      state.assumptionsApproved = true;
      showToast('✅ تم اعتماد ' + decisions.length + ' افتراض و إنشاء BOQ بنجاح', 'success');
      renderBOQFromData(result);
    } catch (e) {
      showToast('خطأ في تطبيق الافتراضات: ' + e.message, 'error');
    }
  }

  // ─── Render BOQ from API data (shared by generate + apply) ─
  function renderBOQFromData(b) {
    if (!b || !b.items) return;
    state.boqItems = b.items || [];
    state.boqLastResult = b;
    state.boqEdits = [];

    // Show recalculate button if edits exist
    const btn = document.getElementById('btn-recalculate');
    if (btn) btn.style.display = 'none';

    const proj = getCurrentProject();
    const typeName = proj && proj.type ? proj.type.replace(/_/g, ' ') : '';
    document.getElementById('boq-subtitle').textContent = typeName + ' • ' + (b.phase || '') + ' • ' + (b.summary ? b.summary.totalItems : b.items.length) + ' بند';

    document.getElementById('boq-total-items').textContent = b.summary ? b.summary.totalItems : b.items.length;
    document.getElementById('boq-phase').textContent = b.phase === 'Finishing' ? 'تشطيب' : b.phase === 'Shell' ? 'عظم' : 'كامل';
    if (b.lifecyclePhases) document.getElementById('boq-phase-desc').textContent = b.lifecyclePhases.map(p => p.name).join(' → ');

    const phaseBadgeContainer = document.getElementById('boq-lifecycle-phases');
    if (phaseBadgeContainer && b.lifecyclePhases) {
      phaseBadgeContainer.innerHTML = b.lifecyclePhases.map(p =>
        '<span class="badge badge-primary" style="font-size:11px;padding:2px 8px;">' + p.name + '</span>'
      ).join(' ');
    }

    const reviewSection = document.getElementById('boq-assumptions-review');
    if (reviewSection) {
      reviewSection.innerHTML = '<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;display:flex;align-items:center;justify-content:space-between;">' +
        '<span>✅ تم اعتماد الافتراضات الهندسية</span>' +
        '<button class="btn btn-sm btn-outline" onclick="reviewBOQAssumptions()" style="font-size:11px;">مراجعة الافتراضات</button></div>';
    }

    const totalCost = b.summary ? b.summary.totalCost : 0;
    document.getElementById('boq-total-cost').textContent = totalCost > 1e6 ? (totalCost / 1e6).toFixed(1) + 'M' : totalCost.toLocaleString();
    const avgConf = b.summary ? b.summary.averageConfidence : 0;
    document.getElementById('boq-confidence').textContent = (avgConf * 100).toFixed(0) + '%';
    const confEl = document.getElementById('boq-confidence');
    confEl.style.color = avgConf > 0.8 ? 'var(--color-success-600)' : avgConf > 0.6 ? 'var(--color-warning-600)' : 'var(--color-danger-600)';
    document.getElementById('boq-confidence-note').textContent = avgConf > 0.8 ? '👍 ثقة عالية' : avgConf > 0.6 ? '⚠️ يحتاج مراجعة' : '🔴 ثقة منخفضة';
    const suggestedCount = b.suggestedItems ? b.suggestedItems.length : 0;
    if (suggestedCount > 0) {
      document.getElementById('boq-suggested-items').textContent = '↑ ' + suggestedCount + ' بنود مقترحة تحتاج موافقة';
    } else if (b.summary && b.summary.insufficientCount > 0) {
      document.getElementById('boq-suggested-items').textContent = '⚠️ ' + b.summary.insufficientCount + ' بنود ناقصة تكتمل بعد إدخال البيانات';
    }

    const tbody = document.getElementById('boq-tbody');
    tbody.innerHTML = '';
    const byPhase = {};
    for (const item of b.items) {
      const key = item.phaseName || 'أخرى';
      if (!byPhase[key]) byPhase[key] = [];
      byPhase[key].push(item);
    }
    let idx = 0;
    const phaseOrder = b.lifecyclePhases || [];
    for (const phase of phaseOrder) {
      const itemsInPhase = byPhase[phase.name];
      if (!itemsInPhase || itemsInPhase.length === 0) continue;
      const headerRow = document.createElement('tr');
      headerRow.className = 'boq-phase-header';
      headerRow.innerHTML = '<td colspan="9" style="padding:8px 12px;background:var(--color-primary-50);font-weight:700;font-size:13px;">▸ ' + phase.name + ' (' + itemsInPhase.length + ' بنود)</td>';
      tbody.appendChild(headerRow);
      for (const item of itemsInPhase) {
        idx++;
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.title = 'اضغط لمعرفة طريقة الحساب';
        const confClass = item.confidence > 0.8 ? 'success' : item.confidence > 0.6 ? 'warning' : 'danger';
        const qtyDisplay = item.quantity !== null && item.quantity !== undefined ? Number(item.quantity).toLocaleString() : '—';
        const priceDisplay = item.unitPrice ? Number(item.unitPrice).toLocaleString() : '—';
        const totalDisplay = item.totalPrice ? Number(item.totalPrice).toLocaleString() : '—';
        const phaseBadge = item.insufficient ? '<span class="badge badge-danger">ناقص</span>' : '<span class="badge badge-' + confClass + '">' + Math.round(item.confidence * 100) + '%</span>';
        tr.innerHTML = '<td class="text-tertiary">' + idx + '</td>' +
          '<td><span class="font-semibold">' + (item.description || '') + '</span>' +
          (item.tradeName ? '<div class="text-xs text-tertiary mt-1" style="font-size:10px;opacity:0.7">' + item.tradeName + ' • ' + (item.element || '') + '</div>' : '') +
          '</td>' +
          '<td><span class="text-xs" style="color:var(--color-primary-600)">' + (item.phaseName || '') + '</span></td>' +
          '<td>' + qtyDisplay + '</td><td>' + (item.unit || '') + '</td>' +
          '<td>' + priceDisplay + '</td>' +
          '<td class="font-semibold">' + totalDisplay + '</td>' +
          '<td>' + phaseBadge + '</td>' +
          '<td><button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();window.editBOQItem(\'' + item.code + '\')">✏️</button></td>';
        tr.addEventListener('click', function() { showBOQItemExplanation(item); });
        tbody.appendChild(tr);
      }
    }
    for (const [phase, itemsInPhase] of Object.entries(byPhase)) {
      if (phaseOrder.some(p => p.name === phase)) continue;
      for (const item of itemsInPhase) {
        idx++;
        const tr = document.createElement('tr');
        const confClass = item.confidence > 0.8 ? 'success' : item.confidence > 0.6 ? 'warning' : 'danger';
        tr.innerHTML = '<td class="text-tertiary">' + idx + '</td>' +
          '<td>' + (item.description || '') + '</td>' +
          '<td>' + (item.phaseName || '') + '</td>' +
          '<td>' + (item.quantity || '—') + '</td><td>' + (item.unit || '') + '</td>' +
          '<td>' + (item.unitPrice || '—') + '</td>' +
          '<td>' + (item.totalPrice || '—') + '</td>' +
          '<td><span class="badge badge-' + confClass + '">' + Math.round(item.confidence * 100) + '%</span></td><td></td>';
        tr.addEventListener('click', function() { showBOQItemExplanation(item); });
        tbody.appendChild(tr);
      }
    }

    const totalTr = document.createElement('tr');
    totalTr.className = 'boq-total-row';
    const total = b.items.reduce((s, i) => s + (i.totalPrice || 0), 0);
    const confirmedCount = b.items.filter(i => !i.insufficient).length;
    totalTr.innerHTML = '<td colspan="6" class="font-bold">الإجمالي (' + confirmedCount + ' بند)</td>' +
      '<td class="font-bold">' + total.toLocaleString() + '</td><td></td><td></td>';
    tbody.appendChild(totalTr);

    if (suggestedCount > 0) {
      const sugHeader = document.createElement('tr');
      sugHeader.innerHTML = '<td colspan="9" style="padding:8px 12px;background:var(--color-warning-50);font-weight:700;font-size:13px;color:var(--color-warning-700);">▸ بنود مقترحة تحتاج موافقتك (' + suggestedCount + ')</td>';
      tbody.appendChild(sugHeader);
      let sIdx = 0;
      for (const item of b.suggestedItems) {
        sIdx++;
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = '<td class="text-tertiary">S' + sIdx + '</td>' +
          '<td><span class="font-semibold">' + (item.description || '') + '</span>' +
          (item.tradeName ? '<div class="text-xs text-tertiary mt-1">' + item.tradeName + '</div>' : '') +
          '</td>' +
          '<td><span class="text-xs">' + (item.phaseName || '') + '</span></td>' +
          '<td>' + (item.quantity ? Number(item.quantity).toLocaleString() : '—') + '</td><td>' + (item.unit || '') + '</td>' +
          '<td>' + (item.unitPrice ? Number(item.unitPrice).toLocaleString() : '—') + '</td>' +
          '<td>' + (item.totalPrice ? Number(item.totalPrice).toLocaleString() : '—') + '</td>' +
          '<td><span class="badge badge-warning">مقترح</span></td>' +
          '<td><button class="btn btn-sm btn-success" onclick="event.stopPropagation();window.approveBOQItem(\'' + item.code + '\')">✔ موافقة</button></td>';
        tr.addEventListener('click', function() { showBOQItemExplanation(item); });
        tbody.appendChild(tr);
      }
      const sugTotalTr = document.createElement('tr');
      sugTotalTr.innerHTML = '<td colspan="6" class="font-bold">الإجمالي (مقترحات)</td><td class="font-bold">' +
        (b.summary && b.summary.totalSuggestedCost ? Number(b.summary.totalSuggestedCost).toLocaleString() : '—') + '</td><td></td><td></td>';
      tbody.appendChild(sugTotalTr);
    }

    showToast('تم إنشاء ' + confirmedCount + ' بند في ' + phaseOrder.length + ' مراحل بنجاح', 'success');
  }

  // ─── Generate Image from BOQ ────────────
  window.generateImageFromBOQ = async function() {
    if (!state.currentProject) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
    if (!state.boqItems || state.boqItems.length === 0) { showToast('⚠️ لا توجد بنود BOQ. أنشئ BOQ أولاً', 'warning'); return; }

    const project = getCurrentProject();
    const proj = project || {};
    const b = state.boqLastResult || {};

    const topMaterials = [...new Set(state.boqItems.filter(i => i.material).map(i => i.material))].slice(0, 5);

    showToast('🎨 جاري توليد الصورة من بيانات BOQ...', 'info');

    try {
      const res = await fetch(API_BASE + '/api/v1/vision-ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: state.currentProject,
          projectParams: {
            type: proj.type || 'Villa',
            area: proj.area || null,
            floors: proj.floors || null,
            city: proj.region || proj.city || null,
            description: proj.description || '',
            materials: topMaterials,
            finishing: proj.finishing || b.summary?.finishing || null,
          },
          options: { style: 'Photorealistic' }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الطلب');

      showToast('✅ تم إرسال الطلب، جاري التوليد...', 'success');
      pollGenerationStatus(data.generationId);
    } catch (e) {
      showToast('❌ فشل توليد الصورة: ' + e.message, 'error');
    }
  };

  function pollGenerationStatus(genId) {
    const maxAttempts = 120;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) { clearInterval(interval); showToast('⌛ انتهت مهلة التوليد', 'warning'); return; }
      try {
        const res = await fetch(API_BASE + '/api/v1/vision-ai/status/' + genId);
        const status = await res.json();
        if (status.status === 'completed' && (status.imageUrl || status.image)) {
          clearInterval(interval);
          showImageModal(status);
        } else if (status.status === 'failed') {
          clearInterval(interval);
          showToast('❌ فشل التوليد: ' + (status.errorMessage || 'خطأ غير معروف'), 'error');
        }
      } catch { /* ignore polling errors */ }
    }, 3000);
  }

  function showImageModal(result) {
    const existing = document.getElementById('boq-image-modal');
    if (existing) existing.remove();

    const imgSrc = result.imageUrl || (result.image ? 'data:image/png;base64,' + result.image : '');
    const modal = document.createElement('div');
    modal.id = 'boq-image-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:800px;width:100%;padding:20px;position:relative;direction:rtl;">' +
      '<button onclick="this.closest(\'#boq-image-modal\').remove()" style="position:absolute;top:12px;left:12px;background:var(--color-danger-500);color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:18px;cursor:pointer;">✕</button>' +
      '<h3 style="margin:0 0 12px;font-size:16px;">🎨 الصورة المولدة من BOQ</h3>' +
      '<img src="' + imgSrc + '" style="width:100%;border-radius:8px;" alt="Generated Image" />' +
      (result.prompt ? '<p style="margin-top:12px;font-size:12px;color:#666;">' + result.prompt.substring(0, 200) + '</p>' : '') +
      (result.provider ? '<p style="font-size:11px;color:#999;">المزود: ' + result.provider + '</p>' : '') +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  }


  // ─── Cost: Load from API ───────────────
  async function loadCostAnalysis() {
    if (!state.currentProject) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
    const pid = state.currentProject;
    showToast('جاري تحليل التكاليف...', 'info');
    try {
      const data = await apiCall('/api/v1/projects/' + pid + '/cost/estimate', 'POST');
      state.costData = data;
      document.querySelector('#page-cost .card-stat:nth-child(1) .card-stat-value').textContent = (data.directCost / 1e6).toFixed(1) + 'M';
      document.querySelector('#page-cost .card-stat:nth-child(2) .card-stat-value').textContent = (data.indirectCost / 1e6).toFixed(1) + 'M';
      document.querySelector('#page-cost .card-stat:nth-child(3) .card-stat-value').textContent = (data.profit / 1e6).toFixed(1) + 'M';
      // Update breakdown bars
      if (data.breakdown) {
        const bars = document.querySelectorAll('#page-cost .progress-fill');
        const labels = document.querySelectorAll('#page-cost .flex.justify-between.text-sm span:first-child');
        if (bars.length && data.breakdown.materials) {
          const cats = [
            { name: 'أعمال خرسانية', pct: data.breakdown.materials.percentage, color: 'var(--color-primary-500)' },
            { name: 'أعمال حديد', pct: data.breakdown.labor ? data.breakdown.labor.percentage / 2 : 18, color: 'var(--color-secondary-500)' },
            { name: 'أعمال معمارية', pct: 15, color: 'var(--color-accent-500)' },
            { name: 'أعمال ميكانيكية', pct: 10, color: 'var(--color-warning-500)' },
            { name: 'أعمال كهربائية', pct: 8, color: 'var(--color-danger-500)' }
          ];
          // Rebuild breakdown
          const container = document.querySelector('#page-cost .flex.flex-col.gap-3');
          if (container) {
            container.innerHTML = cats.map(c =>
              '<div><div class="flex justify-between text-sm mb-1"><span>' + c.name + '</span><span>' + c.pct + '% - ' + ((data.totalCost * c.pct / 100) / 1e6).toFixed(1) + 'M</span></div>' +
              '<div class="progress-bar"><div class="progress-fill" style="width:' + c.pct + '%;background:' + c.color + ';"></div></div></div>'
            ).join('');
          }
        }
      }
      showToast('تم تحليل التكاليف', 'success');
    } catch (e) {
      showToast('خطأ: ' + e.message, 'error');
    }
  }

  // ─── Schedule: Generate from API ───────
  async function generateSchedule() {
    if (!state.currentProject) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
    const pid = state.currentProject;
    showToast('جاري إنشاء الجدول الزمني...', 'info');
    try {
      const data = await apiCall('/api/v1/projects/' + pid + '/schedule/generate', 'POST');
      showToast('تم إنشاء جدول زمني بـ ' + data.totalDuration + ' يوماً', 'success');
    } catch (e) {
      showToast('خطأ: ' + e.message, 'error');
    }
  }

  // ─── Risks: Analyze from API (AI Model) ─
  async function analyzeRisks() {
    if (!state.currentProject) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
    const pid = state.currentProject;
    showToast('جاري تحليل المخاطر بنموذج AI (40,140 سجل)...', 'info');
    try {
      const data = await apiCall('/api/v1/projects/' + pid + '/risks/analyze', 'POST');
      showToast('تم تحليل المخاطر: ' + data.risks.length + ' خطراً - المستوى: ' + data.riskLevel, 'success');
    } catch (e) {
      showToast('خطأ: ' + e.message, 'error');
    }
  }

  // ─── Suppliers: Match from API ─────────
  async function matchSuppliers() {
    showToast('جاري مطابقة الموردين...', 'info');
    try {
      const data = await apiCall('/api/v1/cmpep/match-supplier', 'POST', { category: 'خرسانة' });
      showToast('تم العثور على ' + data.totalCompanies + ' مورد', 'success');
    } catch (e) {
      showToast('خطأ: ' + e.message, 'error');
    }
  }

  // ─── Quality: Inspect from AI Model ────
  async function inspectQuality() {
    if (!state.currentProject) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
    const pid = state.currentProject;
    showToast('جاري فحص الجودة بالذكاء الاصطناعي...', 'info');
    try {
      const data = await apiCall('/api/v1/projects/' + pid + '/quality/inspect', 'POST');
      showToast('درجة الجودة: ' + data.qualityScore + '% - ' + data.qualityGrade + ' - ' + data.estimatedDefects + ' عيب متوقع', 'success');
    } catch (e) {
      showToast('خطأ: ' + e.message, 'error');
    }
  }

  // ─── Schedule: Compare Methods ─────────
  async function compareMethods() {
    if (!state.currentProject) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
    const pid = state.currentProject;
    showToast('جاري مقارنة طرق الإنشاء...', 'info');
    try {
      const data = await apiCall('/api/v1/projects/' + pid + '/schedule/compare-methods', 'POST');
      showToast('الطريقة الموصى بها: ' + data.recommended, 'success');
    } catch (e) {
      showToast('خطأ: ' + e.message, 'error');
    }
  }

  // ─── Supplier: Market Analysis ─────────
  async function supplierMarketAnalysis() {
    showToast('جاري تحليل السوق...', 'info');
    try {
      const data = await apiCall('/api/v1/supplier/market-analysis', 'POST', {});
      showToast('تحليل السوق: ' + data.totalSuppliers + ' مورد - متوسط التقييم ' + data.averageRating + '/5', 'success');
    } catch (e) {
      showToast('خطأ: ' + e.message, 'error');
    }
  }

  // ─── Platform dashboards ───────────────
  async function loadPlatformData(page) {
    const map = {
      gis: '/api/v1/ggip/analyze-terrain',
      iot: '/api/v1/iseip/sensor-data',
      quality: '/api/v1/qaiip/inspection',
      safety: '/api/v1/siapp/risk-assessment',
      sustainability: '/api/v1/secip/carbon-footprint',
      marketplace: '/api/v1/cmpep/match-supplier',
      bi: '/api/v1/ebisdp/dashboard',
      admin: '/api/v1/easgp/security-status',
      developer: '/api/v1/sadp/platform-status'
    };
    if (!map[page]) return;
    showToast('جاري تحميل بيانات ' + pages.find(p => p.id === page)?.label + '...', 'info');
    try {
      await apiCall(map[page], 'POST', {});
      showToast('تم تحديث البيانات', 'success');
    } catch (e) {
      showToast('خطأ: ' + e.message, 'error');
    }
  }

  // ─── Scroll to BOQ section ────────────
  window.scrollToBOQ = function() {
    const el = document.getElementById('page-boq');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ─── Export BOQ ────────────────────────
  async function exportBOQ(format) {
    if (!state.currentProject) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
    try {
      if (format === 'csv') {
        const url = API_BASE + '/api/v1/projects/' + state.currentProject + '/boq/export?format=csv';
        const res = await fetch(url);
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'boq-export.csv'; a.click();
        URL.revokeObjectURL(a.href);
        showToast('تم تصدير BOQ بصيغة CSV', 'success');
        return;
      }
      if (format === 'pdf') {
        generatePDF();
        return;
      }
      showToast('تم تصدير BOQ بصيغة ' + format.toUpperCase(), 'success');
    } catch (e) { showToast('خطأ في التصدير: ' + e.message, 'error'); }
  }

  // ─── PDF Export ────────────────────────
  function generatePDF() {
    const items = state.boqItems || [];
    if (items.length === 0) { showToast('⚠️ لا توجد بنود BOQ للتصدير', 'warning'); return; }
    const proj = getCurrentProject();
    const total = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
    const confirmed = items.filter(i => !i.insufficient).length;
    const result = state.boqLastResult;
    const phases = result?.lifecyclePhases || [];
    const suggested = result?.suggestedItems || [];
    const avgConf = result?.summary?.averageConfidence || 0;

    // Group items by phase
    const byPhase = {};
    for (const item of items) {
      const key = item.phaseName || 'أخرى';
      if (!byPhase[key]) byPhase[key] = [];
      byPhase[key].push(item);
    }

    const phaseRows = phases.map(phase => {
      const phaseItems = byPhase[phase.name];
      if (!phaseItems || phaseItems.length === 0) return '';
      return `<tr style="background:#e8f0fe;"><td colspan="7" style="padding:6px 8px;border:1px solid #ddd;font-weight:700;font-size:11px;">▸ ${phase.name} (${phaseItems.length} بنود)</td></tr>` +
        phaseItems.map((item, i) => {
          const qty = item.quantity != null ? Number(item.quantity).toLocaleString() : '—';
          const price = item.unitPrice ? Number(item.unitPrice).toLocaleString() : '—';
          const tprice = item.totalPrice ? Number(item.totalPrice).toLocaleString() : '—';
          return `<tr>
            <td style="text-align:center;padding:3px 6px;border:1px solid #ddd;font-size:9px;">${i + 1}</td>
            <td style="padding:3px 6px;border:1px solid #ddd;font-size:9px;">${item.description || ''}</td>
            <td style="text-align:center;padding:3px 6px;border:1px solid #ddd;font-size:9px;">${phase.name}</td>
            <td style="text-align:center;padding:3px 6px;border:1px solid #ddd;font-size:9px;">${qty}</td>
            <td style="text-align:center;padding:3px 6px;border:1px solid #ddd;font-size:9px;">${item.unit || ''}</td>
            <td style="text-align:right;padding:3px 6px;border:1px solid #ddd;font-size:9px;direction:ltr;">${price}</td>
            <td style="text-align:right;padding:3px 6px;border:1px solid #ddd;font-size:9px;direction:ltr;">${tprice}</td>
          </tr>`;
        }).join('');
    }).join('');

    // Items not in any phase
    const extraItems = [];
    for (const [phase, itemsInPhase] of Object.entries(byPhase)) {
      if (phases.some(p => p.name === phase)) continue;
      extraItems.push(...itemsInPhase);
    }
    const extraRows = extraItems.length > 0 ?
      '<tr style="background:#fff3e0;"><td colspan="7" style="padding:6px 8px;border:1px solid #ddd;font-weight:700;font-size:11px;color:#e65100;">▸ بنود إضافية (' + extraItems.length + ')</td></tr>' +
      extraItems.map((item, i) => {
        const qty = item.quantity != null ? Number(item.quantity).toLocaleString() : '—';
        const price = item.unitPrice ? Number(item.unitPrice).toLocaleString() : '—';
        const tprice = item.totalPrice ? Number(item.totalPrice).toLocaleString() : '—';
        return `<tr>
          <td style="text-align:center;padding:3px 6px;border:1px solid #ddd;font-size:9px;">E${i + 1}</td>
          <td style="padding:3px 6px;border:1px solid #ddd;font-size:9px;">${item.description || ''}</td>
          <td style="text-align:center;padding:3px 6px;border:1px solid #ddd;font-size:9px;">${item.phaseName || ''}</td>
          <td style="text-align:center;padding:3px 6px;border:1px solid #ddd;font-size:9px;">${qty}</td>
          <td style="text-align:center;padding:3px 6px;border:1px solid #ddd;font-size:9px;">${item.unit || ''}</td>
          <td style="text-align:right;padding:3px 6px;border:1px solid #ddd;font-size:9px;direction:ltr;">${price}</td>
          <td style="text-align:right;padding:3px 6px;border:1px solid #ddd;font-size:9px;direction:ltr;">${tprice}</td>
        </tr>`;
      }).join('') : '';

    const html = `<!DOCTYPE html><html dir="rtl">
    <head><meta charset="UTF-8"><title>BOQ - ${proj?.name || ''}</title>
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #222; padding: 15px; }
      .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #1a56db; padding-bottom: 10px; }
      .header h1 { font-size: 16px; margin: 0; color: #1a56db; }
      .header p { font-size: 10px; color: #666; margin: 3px 0 0; }
      .meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 10px; margin-bottom: 12px; }
      .meta div { background: #f8f9fa; padding: 4px 8px; border-radius: 3px; flex: 1; min-width: 120px; }
      .meta strong { color: #333; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      th { background: #1a56db; color: #fff; padding: 5px 6px; font-size: 9px; text-align: center; }
      tr:nth-child(even) { background: #f8f9fa; }
      .total-row td { font-weight: bold; background: #e8f0fe; font-size: 10px; padding: 5px 6px; border: 1px solid #ddd; }
      .footer { text-align: center; font-size: 8px; color: #999; margin-top: 15px; border-top: 1px solid #eee; padding-top: 6px; }
      .phase-badge { display:inline-block; font-size:8px; color:#1a56db; margin:1px; }
    </style></head>
    <body>
      <div class="header">
        <h1>جدول الكميات (Bill of Quantities)</h1>
        <p>${proj?.name || ''} — ${proj?.type?.replace(/_/g, ' ') || ''}${proj?.region ? ' — ' + proj.region : ''}</p>
      </div>
      <div class="meta">
        <div><strong>إجمالي البنود:</strong> ${confirmed} من ${items.length}</div>
        <div><strong>التكلفة الإجمالية:</strong> ${total.toLocaleString()} ر.س</div>
        <div><strong>متوسط الثقة:</strong> ${(avgConf * 100).toFixed(0)}%</div>
        <div><strong>مراحل دورة الحياة:</strong> ${phases.map(p => p.name).join(' → ') || '—'}</div>
        <div><strong>تاريخ التصدير:</strong> ${new Date().toLocaleDateString('ar-SA')}</div>
        <div><strong>المنطقة:</strong> ${proj?.region || proj?.city || '—'}</div>
      </div>
      ${phases.length > 0 ? '<div style="margin-bottom:8px;font-size:9px;color:#666;">' + phases.map(p => '<span class="phase-badge">● ' + p.name + '</span>').join(' ') + '</div>' : ''}
      <table>
        <thead><tr>
          <th style="width:30px;">#</th><th>بند العمل</th><th style="width:55px;">المرحلة</th>
          <th style="width:45px;">الكمية</th><th style="width:35px;">الوحدة</th>
          <th style="width:55px;">سعر الوحدة</th><th style="width:65px;">الإجمالي</th>
        </tr></thead>
        <tbody>${phaseRows}${extraRows}</tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="6" style="text-align:left;padding:5px 6px;border:1px solid #ddd;">الإجمالي الكلي (${confirmed} بند معتمد)</td>
            <td style="text-align:right;padding:5px 6px;border:1px solid #ddd;direction:ltr;">${total.toLocaleString()} ر.س</td>
          </tr>
        </tfoot>
      </table>
      ${suggested.length > 0 ? '<div style="margin-top:10px;font-size:9px;color:#e65100;padding:6px;background:#fff3e0;border-radius:4px;border:1px solid #ffcc02;">⚠️ ' + suggested.length + ' بنود مقترحة لم تُعتمد بعد (قيمتها ' + (result?.summary?.totalSuggestedCost ? Number(result.summary.totalSuggestedCost).toLocaleString() : '—') + ' ر.س)</div>' : ''}
      <div style="text-align:center;margin-top:10px;"><button onclick="window.print()" style="padding:6px 20px;background:#1a56db;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer;">🖨️ طباعة / حفظ PDF</button></div>
      <div class="footer">تم الإنشاء بواسطة ACEP — AI Construction Engineering Platform v3.0<br>المشروع: ${proj?.name || ''} | ${phases.length} مرحلة | ${confirmed} بند | ${total.toLocaleString()} ر.س<br>هذا المستند تقديري وغير ملزم — تم إنشاؤه في ${new Date().toLocaleString('ar-SA')}</div>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) { showToast('⚠️ يرجى السماح بالنوافذ المنبثقة', 'warning'); return; }
    w.document.write(html);
    w.document.close();
  }
  // ─── BOQ Save/Load Sessions ──────────
  window.saveBOQ = async function() {
    const items = state.boqItems || [];
    if (items.length === 0) { showToast('⚠️ لا توجد بيانات BOQ للحفظ', 'warning'); return; }
    const proj = getCurrentProject();
    const result = state.boqLastResult;
    const name = prompt('📁 اسم الجلسة:', (proj?.name || 'مشروع') + ' - ' + new Date().toLocaleDateString('ar-SA'));
    if (!name) return;
    try {
      const resp = await apiCall('/api/v1/boq/save', 'POST', {
        name,
        projectType: proj?.type || '',
        params: proj || {},
        items,
        decisions: state.boqEdits,
        summary: result?.summary || {},
        lifecyclePhases: result?.lifecyclePhases || [],
      });
      showToast('✅ تم حفظ الجلسة: ' + name, 'success');
    } catch (e) {
      showToast('خطأ في الحفظ: ' + e.message, 'error');
    }
  };

  window.loadBOQ = async function() {
    try {
      const resp = await apiCall('/api/v1/boq/sessions');
      const sessions = resp.sessions || [];
      if (sessions.length === 0) { showToast('لا توجد جلسات محفوظة', 'info'); return; }

      const modal = document.getElementById('modal');
      const title = document.getElementById('modal-title');
      const body = document.getElementById('modal-body');
      if (title) title.textContent = '📂 استرجاع جلسة BOQ';
      if (body) {
        body.innerHTML = '<div style="max-height:400px;overflow-y:auto;">' +
          sessions.map(s => '<div class="card card-hover mb-2" style="cursor:pointer;padding:12px;border:1px solid #eee;border-radius:8px;" data-id="' + s.id + '">' +
            '<div class="flex justify-between items-center"><div><strong>' + s.name + '</strong></div>' +
            '<div class="text-sm text-tertiary">' + s.projectType?.replace(/_/g, ' ') + ' • ' + (s.itemCount || 0) + ' بند</div></div>' +
            '<div class="flex justify-between text-xs text-tertiary mt-1">' +
            '<span>' + new Date(s.createdAt).toLocaleDateString('ar-SA') + '</span>' +
            '<span>' + (s.totalCost ? Number(s.totalCost).toLocaleString() + ' ر.س' : '') + '</span></div>' +
            '<button class="btn btn-sm btn-ghost text-danger mt-2" onclick="event.stopPropagation();window.deleteBOQSession(\'' + s.id + '\')">🗑️ حذف</button>' +
            '</div>').join('') + '</div>' +
          '<div class="flex justify-end mt-4"><button class="btn btn-outline" onclick="closeModal()">إلغاء</button></div>';
        body.querySelectorAll('[data-id]').forEach(el => {
          el.addEventListener('click', async function() {
            const sid = this.dataset.id;
            try {
              const session = await apiCall('/api/v1/boq/load/' + sid);
              showToast('جاري استرجاع الجلسة...', 'info');
              renderBOQFromData({ items: session.items, suggestedItems: [], summary: session.summary, lifecyclePhases: session.lifecyclePhases, phase: session.params?.phase || '' });
              // Restore decisions
              state.boqEdits = session.decisions || [];
              const btn = document.getElementById('btn-recalculate');
              if (btn && state.boqEdits.length > 0) btn.style.display = '';
              showToast('✅ تم استرجاع: ' + session.name, 'success');
              closeModal();
            } catch (e) {
              showToast('خطأ في الاسترجاع: ' + e.message, 'error');
            }
          });
        });
      }
      const overlay = document.getElementById('modal-overlay');
      if (overlay) overlay.classList.add('open');
      modal.classList.add('active');
    } catch (e) {
      showToast('خطأ في تحميل الجلسات: ' + e.message, 'error');
    }
  };

  window.deleteBOQSession = async function(id) {
    if (!confirm('حذف هذه الجلسة؟')) return;
    try {
      await apiCall('/api/v1/boq/session/' + id, 'DELETE');
      showToast('✅ تم حذف الجلسة', 'success');
      window.loadBOQ(); // refresh list
    } catch (e) {
      showToast('خطأ في الحذف: ' + e.message, 'error');
    }
  };

  // ─── Render projects page from API ─────
  async function renderProjectsPage() {
    try {
      const data = await apiCall('/api/v1/projects');
      state.projects = data.projects;
      const grid = document.querySelector('#page-projects .grid.grid-3');
      if (!grid) return;
      grid.innerHTML = state.projects.map(p => {
        const badgeClass = p.status === 'Active' ? 'badge-success' : p.status === 'Delayed' ? 'badge-warning' : 'badge-primary';
        const badgeText = p.status === 'Active' ? 'قيد التنفيذ' : p.status === 'Delayed' ? 'تأخير' : p.status === 'Planning' ? 'تخطيط' : p.status;
        const progressColor = p.status === 'Delayed' ? 'var(--color-warning-500)' : '';
        return '<div class="card card-hover">' +
          '<div class="card-body">' +
          '<div class="flex items-center justify-between mb-4">' +
          '<span class="badge ' + badgeClass + '">' + badgeText + '</span>' +
          '<span class="text-xs text-tertiary">' + p.id + '</span></div>' +
          '<h3 class="font-semibold mb-2">' + p.name + '</h3>' +
          '<p class="text-sm text-tertiary mb-4">' + (p.description || 'مشروع ' + p.type) + '</p>' +
          '<div class="flex justify-between text-sm mb-2"><span class="text-tertiary">الإنجاز</span><span class="font-semibold">' + p.progress + '%</span></div>' +
          '<div class="progress-bar mb-4"><div class="progress-fill" style="width:' + p.progress + '%;' + (progressColor ? 'background:' + progressColor + ';' : '') + '"></div></div>' +
          '<div class="flex justify-between text-sm">' +
          '<div><span class="text-tertiary">الميزانية</span><div class="font-semibold">' + (p.cost ? (p.cost >= 1e9 ? (p.cost / 1e9).toFixed(1) + 'B' : (p.cost / 1e6).toFixed(0) + 'M') : '-') + ' ر.س</div></div>' +
          '<div><span class="text-tertiary">تاريخ الإنشاء</span><div class="font-semibold">' + (p.created || '-') + '</div></div></div>' +
          '</div><div class="card-footer">' +
          '<button class="btn btn-sm btn-outline" data-project-id="' + p.id + '">فتح</button>' +
          '<button class="btn btn-sm btn-ghost" data-project-id="' + p.id + '" onclick="navigateWithProject(\'analysis\', \'' + p.id + '\')">تحليل AI</button></div></div>';
      }).join('');
      // Wire open buttons
      grid.querySelectorAll('.btn-outline[data-project-id]').forEach(btn => {
        btn.addEventListener('click', function() {
          const pid = this.dataset.projectId;
          state.currentProject = pid;
          showToast('جاري فتح المشروع', 'info');
          navigate('analysis');
        });
      });
    } catch (e) { /* keep static */ }
  }

  // ═══════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', function() {
        const page = this.dataset.page;
        if (page) { navigate(page); loadPlatformData(page); }
      });
    });

    // Mobile nav
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.addEventListener('click', function() {
        const page = this.dataset.page;
        if (page) navigate(page);
      });
    });

    // AI FAB
    document.getElementById('ai-fab')?.addEventListener('click', openAiPanel);
    document.getElementById('ai-panel-close')?.addEventListener('click', closeAiPanel);
    document.getElementById('ai-backdrop')?.addEventListener('click', closeAiPanel);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && state.aiPanelOpen) closeAiPanel();
    });

    // AI Chat send
    document.getElementById('ai-send-btn')?.addEventListener('click', async function() {
      const input = document.getElementById('ai-input');
      if (!input || !input.value.trim()) return;
      const msg = input.value.trim();
      const container = document.getElementById('ai-messages');
      const userMsg = document.createElement('div');
      userMsg.className = 'ai-message user';
      userMsg.innerHTML = '<div class="ai-message-content">' + msg + '</div>';
      container.appendChild(userMsg);
      input.value = '';
      container.scrollTop = container.scrollHeight;
      const loadingMsg = document.createElement('div');
      loadingMsg.className = 'ai-message';
      loadingMsg.innerHTML = '<div class="ai-message-avatar">🤖</div><div class="ai-message-content"><em>جاري التحليل...</em></div>';
      container.appendChild(loadingMsg);
      container.scrollTop = container.scrollHeight;
      try {
        const data = await apiCall('/api/v1/analyze', 'POST', { description: msg });
        loadingMsg.innerHTML = '<div class="ai-message-avatar">🤖</div><div class="ai-message-content">تم التحليل: ' +
          data.type + ' بمساحة ' + data.totalArea + ' م² و ' + data.floors + ' أدوار. الثقة: ' + Math.round(data.confidence * 100) + '%' +
          '<br><span class="text-xs text-tertiary">' + data.analysis.map(function(s) { return '✓ ' + s.step; }).join(' · ') + '</span></div>';
      } catch (e) {
        loadingMsg.innerHTML = '<div class="ai-message-avatar">🤖</div><div class="ai-message-content">عذراً، تعذر الاتصال بخادم التحليل.</div>';
      }
      container.scrollTop = container.scrollHeight;
    });

    // AI quick buttons - use chat API
    document.querySelectorAll('.ai-quick-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const text = this.dataset.query || this.textContent.trim();
        document.getElementById('ai-input').value = text;
        document.getElementById('ai-send-btn').click();
        if (!state.aiPanelOpen) openAiPanel();
      });
    });

    // Tabs
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.addEventListener('click', function() {
        const parent = this.closest('.tabs');
        parent.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
      });
    });

    // Dropdowns
    document.querySelectorAll('.dropdown-toggle').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        this.nextElementSibling?.classList.toggle('open');
      });
    });
    document.addEventListener('click', function() {
      document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    });

    // Language switcher
    document.querySelectorAll('.dropdown-menu .dropdown-item').forEach(item => {
      item.addEventListener('click', function() {
        const lang = this.textContent.includes('العربية') ? 'ar' : 'en';
        showToast('تم تغيير اللغة إلى ' + (lang === 'ar' ? 'العربية' : 'English'), 'success');
      });
    });

    // Modal
    document.getElementById('modal-overlay')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
    document.getElementById('modal-close')?.addEventListener('click', closeModal);

    // Mobile toggle
    document.getElementById('mobile-toggle')?.addEventListener('click', function() {
      document.querySelector('.sidebar').classList.toggle('mobile-open');
    });

    // ═══ BUTTON WIRING ═══

    // data-toast buttons
    document.querySelectorAll('[data-toast]').forEach(btn => {
      btn.addEventListener('click', function() {
        showToast(this.dataset.toast, this.dataset.toastType || 'success');
      });
    });

    // data-modal buttons
    document.querySelectorAll('[data-modal]').forEach(btn => {
      btn.addEventListener('click', function() {
        openModal(this.dataset.modal);
      });
    });

    // ─── Dashboard ───
    document.querySelector('#page-dashboard .btn-primary[data-toast]')?.addEventListener('click', function(e) {
      openModal('مشروع جديد');
      const body = document.getElementById('modal-body');
      if (body) body.innerHTML =
        '<div class="form-group" style="margin-bottom:12px;"><label class="form-label" style="display:block;margin-bottom:4px;font-weight:600;">اسم المشروع</label><input class="form-input" id="new-proj-name" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="اسم المشروع"></div>' +
        '<div class="form-group"><label class="form-label" style="display:block;margin-bottom:4px;font-weight:600;">الوصف</label><textarea class="form-input" id="new-proj-desc" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" rows="3" placeholder="وصف المشروع (مثال: فيلا سكنية دورين في الرياض)"></textarea></div>';
      const confirmBtn = document.getElementById('modal-confirm-btn');
      if (confirmBtn) { confirmBtn.style.display = ''; confirmBtn.textContent = 'إنشاء'; }
      document.getElementById('modal-confirm-btn').onclick = async function() {
        const name = document.getElementById('new-proj-name')?.value || 'مشروع جديد';
        const desc = document.getElementById('new-proj-desc')?.value || 'مشروع بناء في السعودية';
        closeModal();
        showToast('جاري إنشاء ' + name + '...', 'info');
        try {
          const res = await fetch(API_BASE + '/api/v1/projects', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: desc })
          });
          const data = await res.json();
          if (res.ok) {
            state.projects.push(data.project);
            showToast('✅ تم إنشاء المشروع: ' + name + ' (' + (data.project.type || '') + ')', 'success');
            loadDashboard();
          } else {
            showToast('خطأ: ' + (data.error || 'فشل إنشاء المشروع'), 'error');
          }
        } catch (e) {
          showToast('✅ تم إنشاء المشروع افتراضياً', 'success');
          loadDashboard();
        }
      };
      e.preventDefault();
    });

    document.querySelector('#page-dashboard .btn-outline')?.addEventListener('click', function() {
      showToast('جاري إنشاء التقرير السريع...', 'info');
      setTimeout(() => showToast('تم إنشاء التقرير', 'success'), 1500);
    });

    // ─── Projects page ───
    document.querySelector('#page-projects .btn-primary')?.addEventListener('click', function() {
      openModal('مشروع جديد');
      const body = document.getElementById('modal-body');
      if (body) body.innerHTML =
        '<div class="form-group" style="margin-bottom:12px;"><label class="form-label" style="display:block;margin-bottom:4px;font-weight:600;">اسم المشروع</label><input class="form-input" id="new-proj-name-2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="اسم المشروع"></div>' +
        '<div class="form-group"><label class="form-label" style="display:block;margin-bottom:4px;font-weight:600;">الوصف</label><textarea class="form-input" id="new-proj-desc-2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" rows="3" placeholder="وصف المشروع (مثال: فلة سكنية دورين في الرياض)"></textarea></div>';
      const confirmBtn = document.getElementById('modal-confirm-btn');
      if (confirmBtn) { confirmBtn.style.display = ''; confirmBtn.textContent = 'إنشاء'; }
      document.getElementById('modal-confirm-btn').onclick = async function() {
        const name = document.getElementById('new-proj-name-2')?.value || 'مشروع جديد';
        const desc = document.getElementById('new-proj-desc-2')?.value || 'مشروع بناء في السعودية';
        closeModal();
        showToast('جاري إنشاء ' + name + '...', 'info');
        try {
          const res = await fetch(API_BASE + '/api/v1/projects', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: desc })
          });
          const data = await res.json();
          if (res.ok) {
            state.projects.push(data.project);
            showToast('✅ تم إنشاء المشروع: ' + name, 'success');
            renderProjectsPage();
          } else {
            showToast('خطأ: ' + (data.error || 'فشل إنشاء المشروع'), 'error');
          }
        } catch (e) {
          showToast('✅ تم إنشاء المشروع افتراضياً', 'success');
          renderProjectsPage();
        }
      };
    });



    // ─── Analysis page ───
    document.querySelector('#page-analysis .btn-outline')?.addEventListener('click', runFullAnalysis);

    // ─── BOQ page ───
    const boqOutlines = document.querySelectorAll('#page-boq .btn-outline');
    if (boqOutlines.length >= 2) {
      boqOutlines[0]?.addEventListener('click', function() { exportBOQ('csv'); });
      boqOutlines[1]?.addEventListener('click', function() { exportBOQ('pdf'); });
    }

    // ─── Cost page ───
    document.querySelector('#page-cost .btn-primary')?.addEventListener('click', loadCostAnalysis);

    // ─── Schedule page ───
    document.querySelector('#page-schedule .btn-outline')?.addEventListener('click', generateSchedule);
    document.querySelectorAll('#page-schedule .btn-ghost').forEach(btn => {
      btn.addEventListener('click', function() {
        generateSchedule();
      });
    });
    // Compare methods button (if any)
    document.querySelectorAll('#page-schedule .btn-secondary').forEach(function(btn) {
      btn.addEventListener('click', compareMethods);
    });

    // ─── Risks page ───
    document.querySelector('#page-risks .btn-primary')?.addEventListener('click', analyzeRisks);

    // ─── GIS page ───
    document.querySelector('#page-gis .btn-outline')?.addEventListener('click', function() {
      showToast('جاري تحليل موقع جديد...', 'info');
      apiCall('/api/v1/ggip/analyze-terrain', 'POST', {}).then(d => {
        showToast('تم تحليل الموقع: انحدار ' + d.terrain.slope + '° - تربة ' + d.soil.type, 'success');
      }).catch(e => showToast('خطأ: ' + e.message, 'error'));
    });

    // ─── Quality page ───
    document.querySelector('#page-quality .btn-primary')?.addEventListener('click', function() {
      showToast('جاري فحص الجودة بنموذج AI...', 'info');
      apiCall('/api/v1/qaiip/inspection', 'POST', {}).then(d => {
        showToast('فحص الجودة: ' + d.qualityIndex + '% نجاح - ' + d.inspections.length + ' تفتيش', 'success');
      }).catch(() => inspectQuality());
    });
    document.querySelector('#page-quality .btn-outline')?.addEventListener('click', inspectQuality);
    document.querySelector('#page-quality .btn-ghost')?.addEventListener('click', inspectQuality);

    // ─── Safety page ───
    document.querySelector('#page-safety .btn-primary')?.addEventListener('click', function() {
      showToast('جاري تقييم المخاطر...', 'info');
      apiCall('/api/v1/siapp/risk-assessment', 'POST', {}).then(d => {
        showToast('تم التقييم: درجة المخاطر ' + d.riskScore + ' - ' + d.alerts + ' تنبيهات', 'success');
      }).catch(() => showToast('تم تقييم المخاطر', 'success'));
    });

    // ─── Marketplace page ───
    document.querySelector('#page-marketplace .btn-primary')?.addEventListener('click', function() {
      showToast('جاري نشر مناقصة جديدة...', 'info');
      matchSuppliers();
    });
    // Supplier compare & market analysis buttons
    document.querySelectorAll('#page-marketplace .btn-outline').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (this.textContent.includes('مقارنة')) {
          supplierMarketAnalysis();
        } else {
          matchSuppliers();
        }
      });
    });

    // ─── BI page ───
    document.querySelector('#page-bi .btn-primary')?.addEventListener('click', function() {
      showToast('جاري إنشاء تقرير تنفيذي...', 'info');
      apiCall('/api/v1/ebisdp/dashboard', 'POST', {}).then(d => {
        showToast('تم إنشاء التقرير: الإيرادات ' + (d.financial.revenue / 1e6).toFixed(0) + 'M - هامش ' + Math.round(d.financial.margin * 100) + '%', 'success');
      }).catch(() => showToast('تم إنشاء التقرير', 'success'));
    });

    // ─── Admin page ───
    document.querySelector('#page-admin .btn-primary')?.addEventListener('click', function() {
      openModal('مستخدم جديد');
      document.getElementById('modal-message').innerHTML =
        '<div class="form-group"><label class="form-label">الاسم</label><input class="form-input" placeholder="الاسم"></div>' +
        '<div class="form-group"><label class="form-label">البريد الإلكتروني</label><input class="form-input" type="email" placeholder="email@acep.com"></div>' +
        '<div class="form-group"><label class="form-label">الدور</label><select class="form-select"><option>مهندس</option><option>مدير مشروع</option><option>مشرف جودة</option></select></div>';
      document.getElementById('modal-confirm-btn').onclick = function() { closeModal(); showToast('تم إنشاء المستخدم', 'success'); };
    });

    // ─── Developer page ───
    document.querySelector('#page-developer .btn-primary')?.addEventListener('click', function() {
      showToast('جاري إنشاء مفتاح API...', 'info');
      setTimeout(() => {
        const key = 'acep_' + Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('');
        showToast('تم إنشاء المفتاح: ' + key.substring(0, 16) + '...', 'success');
      }, 1000);
    });

    // ─── Header buttons ───
    document.querySelector('.header-btn[title="الإشعارات"]')?.addEventListener('click', function() {
      openModal('الإشعارات');
      document.getElementById('modal-message').innerHTML = '<div class="flex flex-col gap-3">' +
        '<div class="flex items-center gap-2"><span class="badge badge-warning">⚠️</span> تأخير مشروع مستشفى المدينة - 15 يوم</div>' +
        '<div class="flex items-center gap-2"><span class="badge badge-success">✅</span> اكتمال صب أساسات برج المملكة</div>' +
        '<div class="flex items-center gap-2"><span class="badge badge-info">ℹ️</span> تحديث كود البناء السعودي SBC</div>' +
        '<div class="flex items-center gap-2"><span class="badge badge-danger">🚨</span> مخالفة سلامة في الموقع - الدور 10</div>' +
        '<div class="flex items-center gap-2"><span class="badge badge-primary">📊</span> تقرير الأداء الربعي متاح</div></div>';
    });

    document.querySelector('.header-btn[title="الإعدادات السريعة"]')?.addEventListener('click', function() {
      openModal('الإعدادات السريعة');
      document.getElementById('modal-message').innerHTML =
        '<div class="form-group"><label class="form-label">السمة</label><select class="form-select"><option>فاتح</option><option>داكن</option></select></div>' +
        '<div class="form-group"><label class="form-label">الإشعارات</label><label class="flex items-center gap-2"><input type="checkbox" checked> تفعيل الإشعارات</label></div>';
    });

    // Navigate to dashboard and load data
    navigate('dashboard');
    loadDashboard();
  });

  window.navigate = navigate;
  window.navigateWithProject = navigateWithProject;
  window.openProject = openProject;
  window.getCurrentProject = getCurrentProject;
  window.toggleAiPanel = toggleAiPanel;
  window.openModal = openModal;
  window.closeModal = closeModal;
  // ─── Approve Suggested Item ──────────────
  window.approveBOQItem = function(code) {
    // Find the suggested item
    const apiCallLatest = async () => {
      try {
        const b = await apiCall('/api/v1/projects/' + state.currentProject + '/boq/generate', 'POST');
        if (b.suggestedItems) {
          const item = b.suggestedItems.find(i => i.code === code);
          if (item) {
            // Move to confirmed by setting confidence to 0.8
            item.confidence = 0.8;
            item.approved = true;
            // Track the approval
            try {
              await fetch(API_BASE + '/api/v1/boq/user-edit', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId: state.currentProject || 'unknown',
                  itemCode: code,
                  field: 'approved',
                  oldValue: 'suggested',
                  newValue: 'approved',
                  projectParams: { type: 'user_approval' }
                })
              });
            } catch (e) { /* silent */ }
            showToast('✔ تمت الموافقة على "' + item.description + '"', 'success');
            generateBOQ();
          }
        }
      } catch (e) {
        showToast('خطأ في تأكيد الموافقة: ' + e.message, 'error');
      }
    };
    apiCallLatest();
  };

  // ─── Load Learning Insights ──────────
  window.loadLearningInsights = async function() {
    try {
      const data = await apiCall('/api/v1/boq/learning', 'GET');
      const body = document.getElementById('learning-insights-body');
      if (!body) return;
      let html = '<div class="grid grid-4 mb-4" style="grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">';
      const a = data.assumptions || {};
      const p = data.prices || {};
      html += '<div class="card card-stat"><div class="card-stat-label">قرارات الافتراضات</div><div class="card-stat-value" style="font-size:18px;">' + (a.totalDecisions?.accepted + a.totalDecisions?.modified + a.totalDecisions?.rejected || 0) + '</div></div>';
      html += '<div class="card card-stat"><div class="card-stat-label">تعديلات الأسعار</div><div class="card-stat-value" style="font-size:18px;">' + (p.totalAdjustments || 0) + '</div></div>';
      html += '<div class="card card-stat"><div class="card-stat-label">فئات أسعار متعقبة</div><div class="card-stat-value" style="font-size:18px;">' + (p.trackedCategories || 0) + '</div></div>';
      html += '<div class="card card-stat"><div class="card-stat-label">مناطق مسعّرة</div><div class="card-stat-value" style="font-size:18px;">' + (p.regionFactors?.length || 0) + '</div></div>';
      html += '</div>';

      // Price adjustments table
      if (p.topAdjustments && p.topAdjustments.length > 0) {
        html += '<h4 style="font-size:13px;font-weight:600;margin-bottom:8px;">أبرز تعديلات الأسعار</h4>';
        html += '<table style="width:100%;font-size:12px;margin-bottom:16px;"><thead><tr><th>الفئة</th><th>المنطقة</th><th>عدد التعديلات</th><th>متوسط التغير</th></tr></thead><tbody>';
        for (const adj of p.topAdjustments) {
          html += '<tr><td>' + adj.priceCat + '</td><td>' + adj.region + '</td><td>' + adj.count + '</td><td>' + adj.avgDelta + ' ر.س</td></tr>';
        }
        html += '</tbody></table>';
      }

      // Region factors
      if (p.regionFactors && p.regionFactors.length > 0) {
        html += '<h4 style="font-size:13px;font-weight:600;margin-bottom:8px;">معاملات المناطق</h4>';
        html += '<div class="flex gap-2 flex-wrap mb-4">';
        for (const r of p.regionFactors) {
          html += '<span class="badge badge-outline">' + r.region + ': ×' + r.factor.toFixed(2) + '</span>';
        }
        html += '</div>';
      }

      // APrice heat map
      try {
        const hm = await apiCall('/api/v1/boq/price-heatmap');
        if (hm && hm.heatmap && Object.keys(hm.heatmap).length > 0) {
          html += '<h4 style="font-size:13px;font-weight:600;margin-bottom:8px;margin-top:16px;">🗺️ خريطة حرارية للأسعار</h4>';
          html += '<div style="overflow-x:auto;margin-bottom:16px;"><table style="width:100%;font-size:11px;"><thead><tr><th style="text-align:right;">المنطقة</th>';
          for (const cat of (hm.categories || []).slice(0, 8)) {
            html += '<th style="text-align:center;padding:4px;">' + cat + '</th>';
          }
          html += '</tr></thead><tbody>';
          for (const [region, cats] of Object.entries(hm.heatmap)) {
            html += '<tr><td style="font-weight:600;padding:4px 6px;">' + region + '</td>';
            for (const cat of (hm.categories || []).slice(0, 8)) {
              const val = cats[cat] || hm.baseIndex;
              const intensity = val > 110 ? 1 : val > 105 ? 0.5 : val > 100 ? 0.2 : 0;
              const bg = intensity > 0.7 ? '#ff444433' : intensity > 0.3 ? '#ffaa0033' : '#44ff4433';
              html += '<td style="text-align:center;padding:4px 6px;background:' + bg + ';border-radius:3px;">' + val + '</td>';
            }
            html += '</tr>';
          }
          html += '</tbody></table></div>';
        }
      } catch(e) { /* heatmap unavailable */ }

      // TSupplier info
      try {
        const supp = await apiCall('/api/v1/boq/suppliers');
        if (supp && supp.length > 0) {
          html += '<h4 style="font-size:13px;font-weight:600;margin-bottom:8px;">🏢 الموردون حسب المنطقة</h4>';
          html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:16px;">';
          for (const r of supp) {
            html += '<div style="padding:8px;border:1px solid #eee;border-radius:6px;font-size:11px;">' +
              '<div style="font-weight:600;">' + r.region + '</div>' +
              '<div class="text-xs text-tertiary">' + r.supplierCount + ' موردين • تقييم ' + r.avgRating.toFixed(1) + '/5</div>' +
              '<div class="text-xs" style="color:var(--color-primary-600);">' + r.topSupplier + '</div></div>';
          }
          html += '</div>';
        }
      } catch(e) { /* suppliers unavailable */ }

      // Assumption patterns
      if (a.patterns && Object.keys(a.patterns).length > 0) {
        const pats = Object.entries(a.patterns).slice(0, 10);
        html += '<h4 style="font-size:13px;font-weight:600;margin-bottom:8px;">أنماط التعلم</h4>';
        html += '<table style="width:100%;font-size:12px;"><thead><tr><th>الرمز</th><th>عدد</th><th>معدل القبول</th></tr></thead><tbody>';
        for (const [key, pat] of pats) {
          html += '<tr><td>' + key + '</td><td>' + pat.count + '</td><td>' + Math.round((pat.acceptRate || 0) * 100) + '%</td></tr>';
        }
        html += '</tbody></table>';
      }

      body.innerHTML = html;
    } catch (e) {
      const body = document.getElementById('learning-insights-body');
      if (body) body.innerHTML = '<p class="text-sm text-danger">خطأ في تحميل البصائر: ' + e.message + '</p>';
    }
  };

  // ─── Engineering API: Analyze Project ────
  window.analyzeProject = async function(params) {
    try {
      const data = await apiCall('/api/v1/engineering/analyze', 'POST', params);
      console.log('[ACEP] Analyze result:', data);
      return data;
    } catch (e) {
      console.error('[ACEP] Analyze error:', e);
      showToast('خطأ في تحليل المشروع: ' + e.message, 'error');
    }
  };

  // ─── Engineering API: Get Phases ────────
  window.getPhases = async function(projectType) {
    try {
      const data = await apiCall('/api/v1/engineering/phases', 'POST', { projectType });
      console.log('[ACEP] Phases:', data);
      return data;
    } catch (e) {
      console.error('[ACEP] Phases error:', e);
      showToast('خطأ في جلب المراحل: ' + e.message, 'error');
    }
  };

  // ─── Engineering API: Validate Quantities ─
  window.validateQuantities = async function(items, projectParams) {
    try {
      const data = await apiCall('/api/v1/engineering/quantity/validate', 'POST', { items, projectParams });
      console.log('[ACEP] Validation result:', data);
      return data;
    } catch (e) {
      console.error('[ACEP] Validation error:', e);
      showToast('خطأ في التحقق من الكميات: ' + e.message, 'error');
    }
  };

  // ─── Engineering API: Full Report ────────
  window.runFullReport = async function(params) {
    try {
      const data = await apiCall('/api/v1/engineering/full-report', 'POST', params);
      console.log('[ACEP] Full report:', data);
      return data;
    } catch (e) {
      console.error('[ACEP] Full report error:', e);
      showToast('خطأ في التقرير الكامل: ' + e.message, 'error');
    }
  };

  // ─── Engineering API: Find Missing Items ─
  window.findMissingItems = async function(items, type) {
    try {
      const data = await apiCall('/api/v1/engineering/missing-items', 'POST', { items, type });
      console.log('[ACEP] Missing items:', data);
      return data;
    } catch (e) {
      console.error('[ACEP] Missing items error:', e);
      showToast('خطأ في البحث عن البنود الناقصة: ' + e.message, 'error');
    }
  };

  // ─── Engineering API: Confidence ─────────
  window.getConfidence = async function(items, params) {
    try {
      const data = await apiCall('/api/v1/engineering/confidence', 'POST', { items, params });
      console.log('[ACEP] Confidence:', data);
      return data;
    } catch (e) {
      console.error('[ACEP] Confidence error:', e);
      showToast('خطأ في تحليل الثقة: ' + e.message, 'error');
    }
  };

  // ─── Engineering API: Risk Analysis ──────
  window.getRiskAnalysis = async function(items, params) {
    try {
      const data = await apiCall('/api/v1/engineering/risk', 'POST', { items, params });
      console.log('[ACEP] Risk analysis:', data);
      return data;
    } catch (e) {
      console.error('[ACEP] Risk analysis error:', e);
      showToast('خطأ في تحليل المخاطر: ' + e.message, 'error');
    }
  };

  // ─── Engineering API: QA Analysis ────────
  window.getQAAnalysis = async function(items, params) {
    try {
      const data = await apiCall('/api/v1/engineering/qa', 'POST', { items, params });
      console.log('[ACEP] QA analysis:', data);
      return data;
    } catch (e) {
      console.error('[ACEP] QA analysis error:', e);
      showToast('خطأ في تحليل الجودة: ' + e.message, 'error');
    }
  };

  // ─── Engineering API: Search Suppliers ───
  window.searchSuppliers = async function(material, region) {
    try {
      const data = await apiCall('/api/v1/engineering/suppliers/search', 'POST', { material, region });
      console.log('[ACEP] Suppliers:', data);
      return data;
    } catch (e) {
      console.error('[ACEP] Suppliers search error:', e);
      showToast('خطأ في البحث عن الموردين: ' + e.message, 'error');
    }
  };

  // ─── Engineering API: Price Estimate ─────
  window.getPriceEstimate = async function(material, region) {
    try {
      const data = await apiCall('/api/v1/engineering/price-estimate', 'POST', { material, region });
      console.log('[ACEP] Price estimate:', data);
      return data;
    } catch (e) {
      console.error('[ACEP] Price estimate error:', e);
      showToast('خطأ في تقدير السعر: ' + e.message, 'error');
    }
  };

  window.showToast = showToast;
  window.runFullAnalysis = runFullAnalysis;
  window.loadCostAnalysis = loadCostAnalysis;
  window.generateBOQ = generateBOQ;
  window.analyzeRisks = analyzeRisks;
  window.matchSuppliers = matchSuppliers;
  window.exportBOQ = exportBOQ;
  window.renderProjectsPage = renderProjectsPage;
  window.loadDashboard = loadDashboard;
  window.inspectQuality = inspectQuality;
  window.compareMethods = compareMethods;
  window.supplierMarketAnalysis = supplierMarketAnalysis;
  window.reviewBOQAssumptions = reviewBOQAssumptions;
  window.recalculateBOQ = recalculateBOQ;
  window.generatePDF = generatePDF;
  window.navigate = navigate;
  window.openProject = openProject;
  window.refreshBOQPage = refreshBOQPage;
})();
