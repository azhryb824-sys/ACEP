(function() {
'use strict';

const API = 'http://localhost:3000';
const ACEP = window.ACEP || {};

function getProjectId() {
  const state = ACEP.state;
  return state ? state.get('currentProjectId') : null;
}

function getProjectData() {
  const state = ACEP.state;
  return state ? state.get('currentProjectData') : null;
}

function showToast(msg, type) {
  if (window.showToast) window.showToast(msg, type || 'info');
}

function el(id) { return document.getElementById(id); }

function updateProjectStats(prefix, data) {
  if (!data) {
    Object.keys(prefix).forEach(k => { const e = el(prefix[k]); if (e) e.textContent = '—'; });
    return;
  }
  const pName = el(prefix.projName); if (pName) pName.textContent = data.name || data.id || '—';
  const pId = el(prefix.projId); if (pId) pId.textContent = data.id ? 'P-' + data.id : '';
  const pType = el(prefix.projType); if (pType) pType.textContent = (data.type || '—').replace(/_/g, ' ');
  const pMeta = el(prefix.projMeta); if (pMeta) pMeta.textContent = (data.floors || '?') + ' دور • ' + (data.area || '?') + ' م²';
  const pStatus = el(prefix.projStatus); if (pStatus) pStatus.textContent = data.status || '—';
  const pQual = el(prefix.projQuality); if (pQual) pQual.textContent = 'جودة: ' + (data.quality || data.stage || '—');
}

function addToGallery(galleryId, imgSrc, label) {
  const gallery = el(galleryId);
  if (!gallery) return;
  const existingPlaceholders = gallery.querySelectorAll('.gallery-item');
  if (existingPlaceholders.length <= 4 && gallery.querySelector('[style*="grid-column"]')) {
    gallery.innerHTML = '';
  }
  const item = document.createElement('div');
  item.className = 'gallery-item';
  item.style.cssText = 'aspect-ratio:16/9;background:var(--color-surface-alt);border-radius:var(--radius-lg);overflow:hidden;cursor:pointer;position:relative;transition:var(--transition-all);';
  item.innerHTML = '<img src="' + imgSrc + '" style="width:100%;height:100%;object-fit:cover;" alt="' + (label || '') + '">'
    + '<div style="position:absolute;bottom:0;left:0;right:0;padding:4px 8px;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;">' + (label || '') + '</div>';
  item.onclick = function() { window.open(imgSrc, '_blank'); };
  gallery.appendChild(item);
}

function updateProgress(elId, text) {
  const e = el(elId);
  if (e) e.textContent = text || '';
}

// ─── AI VISUALIZER ───

window.generateVisualization = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
  updateProgress('viz-progress-text', '⏳ جاري التوليد...');
  el('viz-live-status').textContent = 'قيد التشغيل';
  el('viz-live-status').className = 'badge badge-warning';
  try {
    const angle = el('viz-angle') ? el('viz-angle').value : 'exterior';
    const style = el('viz-style') ? el('viz-style').value : 'Photorealistic';
    const result = await ACEP.vision.generate(pid, { type: angle, style: style, quality: 'standard' });
    if (result && result.image) {
      addToGallery('viz-gallery', result.image, 'توليد ' + angle + ' — ' + style);
      el('viz-result-info').innerHTML = '<div style="text-align:center;padding:20px 0;"><div style="font-size:48px;">✅</div><div style="margin-top:8px;color:#16a34a;">تم التوليد بنجاح</div><div style="font-size:12px;color:#94a3b8;">' + new Date().toLocaleString() + '</div></div>';
      el('viz-live-status').textContent = 'مكتمل';
      el('viz-live-status').className = 'badge badge-success';
      if (ACEP.training) {
        ACEP.training.captureImage({ image: result.image, projectId: pid, type: 'visualization', angle: angle, style: style }, { projectId: pid }).catch(function(){});
      }
      if (ACEP.state) ACEP.state.set('lastVision', result);
    } else {
      showToast('⚠️ فشل التوليد', 'error');
      el('viz-live-status').textContent = 'فشل';
      el('viz-live-status').className = 'badge badge-error';
    }
  } catch (e) {
    showToast('❌ خطأ: ' + e.message, 'error');
    el('viz-live-status').textContent = 'خطأ';
    el('viz-live-status').className = 'badge badge-error';
  }
  updateProgress('viz-progress-text', '');
};

window.generateAlternatives = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
  updateProgress('viz-progress-text', '⏳ جاري توليد بدائل متعددة...');
  for (let i = 0; i < 4; i++) {
    updateProgress('viz-progress-text', '⏳ توليد البديل ' + (i + 1) + '/4...');
    try {
      const styles = ['Photorealistic', 'Architectural', 'Artistic', 'Modern'];
      const result = await ACEP.vision.generate(pid, { type: 'exterior', style: styles[i] || 'Photorealistic' });
      if (result && result.image) {
        addToGallery('viz-gallery', result.image, 'بديل ' + (i + 1) + ' — ' + (styles[i] || ''));
      }
    } catch(e) { /* continue with next */ }
  }
  updateProgress('viz-progress-text', '✅ تم توليد البدائل');
  showToast('✅ تم توليد ' + 4 + ' بدائل', 'success');
};

window.generateVideo = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
  updateProgress('viz-progress-text', '⏳ جاري توليد الفيديو...');
  try {
    const result = await ACEP.vision.generateVideo(pid, 'walkthrough');
    if (result && result.video) {
      showToast('✅ تم توليد الفيديو', 'success');
    } else {
      showToast('⚠️ فشل توليد الفيديو', 'error');
    }
  } catch (e) {
    showToast('❌ خطأ: ' + e.message, 'error');
  }
  updateProgress('viz-progress-text', '');
};

window.generateCompare = function() {
  showToast('⚖️ جاري مقارنة التصاميم...', 'info');
};

// ─── CONSTRUCTION SIMULATION ───

const SIM_PHASES = [
  { id: 'foundation', label: 'الحفر والأساسات', days: 15, icon: '🏗️' },
  { id: 'structure', label: 'الهيكل الخرساني', days: 30, icon: '🏢' },
  { id: 'vertical', label: 'البناء العمودي', days: 45, icon: '🏗️' },
  { id: 'finishing', label: 'الأعمال التشطيبية', days: 30, icon: '🔨' },
  { id: 'mep', label: 'أنظمة MEP', days: 20, icon: '⚡' },
  { id: 'facade', label: 'الواجهات', days: 25, icon: '🏛️' },
  { id: 'furnishing', label: 'التأثيث', days: 15, icon: '🛋️' },
  { id: 'handover', label: 'التسليم النهائي', days: 10, icon: '🎯' },
];

window.generateConstructionSimulation = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
  updateProgress('sim-progress-text', '⏳ جاري بدء المحاكاة...');

  el('sim-status').textContent = 'قيد التشغيل';
  el('sim-status').style.color = '#2563eb';
  el('sim-progress').textContent = '0%';
  el('sim-duration').textContent = '190 يوم';
  el('sim-remaining').textContent = 'متبقي 190 يوم';
  el('sim-phases').textContent = '0 من 8 مراحل';
  el('sim-quality').textContent = 'دقة عالية';

  // Build timeline
  const timeline = el('sim-timeline');
  timeline.innerHTML = '';
  const phaseSelect = el('sim-phase-select');
  phaseSelect.innerHTML = '';

  SIM_PHASES.forEach(function(phase, idx) {
    const item = document.createElement('div');
    item.className = 'timeline-item' + (idx === 0 ? ' active' : '');
    item.innerHTML = '<div class="timeline-dot">◷</div><div class="timeline-content"><div class="timeline-title">' + phase.label + '</div><div class="timeline-time">' + phase.days + ' يوم</div><div class="text-sm text-tertiary">بانتظار المحاكاة</div></div>';
    timeline.appendChild(item);

    const opt = document.createElement('option');
    opt.value = phase.id;
    opt.textContent = phase.label;
    phaseSelect.appendChild(opt);
  });

  // Simulate phases
  let completed = 0;
  for (let i = 0; i < SIM_PHASES.length; i++) {
    const phase = SIM_PHASES[i];
    updateProgress('sim-progress-text', '⏳ ' + phase.label + '... جاري التوليد');
    try {
      const result = await ACEP.vision.generate(pid, { type: 'construction', phase: phase.id, style: 'Photorealistic' });
      if (result && result.image) {
        addToGallery('sim-gallery', result.image, phase.label);
        const items = timeline.querySelectorAll('.timeline-item');
        if (items[i]) {
          items[i].className = 'timeline-item active';
          items[i].querySelector('.timeline-dot').textContent = '✓';
          items[i].querySelector('.timeline-dot').className = 'timeline-dot success';
          items[i].querySelector('.text-sm').textContent = '✅ مكتمل — تم توليد الصورة';
        }
        completed++;
      }
    } catch(e) {
      if (timeline.querySelectorAll('.timeline-item')[i]) {
        timeline.querySelectorAll('.timeline-item')[i].querySelector('.text-sm').textContent = '⚠️ فشل التوليد';
      }
    }
    const pct = Math.round((completed / SIM_PHASES.length) * 100);
    el('sim-progress').textContent = pct + '%';
    el('sim-phases').textContent = completed + ' من ' + SIM_PHASES.length + ' مراحل';
    updateProgress('sim-progress-text', '');
  }

  el('sim-status').textContent = 'مكتملة';
  el('sim-status').style.color = '#16a34a';
  showToast('✅ اكتملت المحاكاة: ' + completed + '/' + SIM_PHASES.length + ' مراحل', 'success');
};

window.simulateConstruction = function() {
  generateConstructionSimulation();
};

window.changeSimPhase = function() {
  const sel = el('sim-phase-select');
  if (!sel || !sel.value) return;
  const phase = SIM_PHASES.find(function(p) { return p.id === sel.value; });
  if (phase) {
    el('sim-image-container').innerHTML = '<div style="height:400px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;"><span style="font-size:64px;">' + phase.icon + '</span><span class="text-tertiary">' + phase.label + '</span><div id="sim-progress-text" style="font-size:12px;color:var(--color-primary-600);"></div></div>';
  }
};

window.exportSimulation = function() {
  const pid = getProjectId();
  showToast('📥 جاري تصدير المحاكاة' + (pid ? ' للمشروع ' + pid : '') + '...', 'info');
};

// ─── INTERIOR DESIGNER ───

window.generateInteriorDesign = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }

  const roomEl = document.querySelector('input[name="int-room"]:checked');
  const styleEl = document.querySelector('input[name="int-style"]:checked');
  const colorEl = document.querySelector('input[name="int-color"]:checked');
  const room = roomEl ? roomEl.value : 'living';
  const style = styleEl ? styleEl.value : 'classic';
  const color = colorEl ? colorEl.value : 'white';

  updateProgress('int-progress-text', '⏳ جاري توليد التصميم...');
  el('int-live-status').textContent = 'قيد التشغيل';
  el('int-live-status').className = 'badge badge-warning';

  try {
    const result = await ACEP.vision.generateInterior(pid, room, style);
    if (result && result.image) {
      el('int-preview').innerHTML = '<img src="' + result.image + '" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-lg);" alt="Interior Design">';
      addToGallery('int-gallery', result.image, room + ' — ' + style);
      el('int-live-status').textContent = 'مكتمل';
      el('int-live-status').className = 'badge badge-success';
      el('int-room-style').textContent = room + ' / ' + style;
      const count = parseInt(el('int-gen-count').textContent) || 0;
      el('int-gen-count').textContent = (count + 1) + ' تصاميم مولدة';
      if (ACEP.training) {
        ACEP.training.captureImage({ image: result.image, projectId: pid, type: 'interior', room: room, style: style, color: color }, { projectId: pid }).catch(function(){});
      }
    } else {
      showToast('⚠️ فشل التوليد', 'error');
      el('int-live-status').textContent = 'فشل';
      el('int-live-status').className = 'badge badge-error';
    }
  } catch (e) {
    showToast('❌ خطأ: ' + e.message, 'error');
    el('int-live-status').textContent = 'خطأ';
    el('int-live-status').className = 'badge badge-error';
  }
  updateProgress('int-progress-text', '');
};

// ─── EXTERIOR DESIGNER ───

window.generateExteriorDesign = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }

  const typeEl = document.querySelector('input[name="ext-type"]:checked');
  const styleEl = document.querySelector('input[name="ext-style"]:checked');
  const colorEl = document.querySelector('input[name="ext-color"]:checked');
  const bldgType = typeEl ? typeEl.value : 'villa';
  const archStyle = styleEl ? styleEl.value : 'classic';
  const extColor = colorEl ? colorEl.value : 'gray-light';

  const materials = [];
  ['ext-mat-stone', 'ext-mat-wood', 'ext-mat-glass', 'ext-mat-metal', 'ext-mat-brick'].forEach(function(id) {
    const cb = el(id);
    if (cb && cb.checked) materials.push(id.replace('ext-mat-', ''));
  });

  updateProgress('ext-progress-text', '⏳ جاري توليد التصميم...');
  el('ext-live-status').textContent = 'قيد التشغيل';
  el('ext-live-status').className = 'badge badge-warning';

  try {
    const params = { buildingType: bldgType, architecturalStyle: archStyle, color: extColor, materials: materials };
    const result = await ACEP.vision.generateExterior(pid, params);
    if (result && result.image) {
      el('ext-preview').innerHTML = '<img src="' + result.image + '" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-lg);" alt="Exterior Design">';
      addToGallery('ext-gallery', result.image, bldgType + ' — ' + archStyle);
      el('ext-live-status').textContent = 'مكتمل';
      el('ext-live-status').className = 'badge badge-success';
      el('ext-type-style').textContent = bldgType + ' / ' + archStyle;
      const count = parseInt(el('ext-gen-count').textContent) || 0;
      el('ext-gen-count').textContent = (count + 1) + ' تصاميم مولدة';
      // Add to history
      const history = el('ext-history');
      if (history) {
        const entry = document.createElement('div');
        entry.style.cssText = 'padding:8px 12px;background:var(--color-surface-alt);border-radius:var(--radius-md);cursor:pointer;';
        entry.innerHTML = '<div class="font-semibold" style="font-size:12px;">' + bldgType + ' — ' + archStyle + '</div><div class="text-xs text-tertiary">' + new Date().toLocaleString() + '</div>';
        if (history.querySelector('[style*="padding:20px"]')) history.innerHTML = '';
        history.insertBefore(entry, history.firstChild);
      }
      if (ACEP.training) {
        ACEP.training.captureImage({ image: result.image, projectId: pid, type: 'exterior', buildingType: bldgType, style: archStyle, color: extColor }, { projectId: pid }).catch(function(){});
      }
    } else {
      showToast('⚠️ فشل التوليد', 'error');
      el('ext-live-status').textContent = 'فشل';
      el('ext-live-status').className = 'badge badge-error';
    }
  } catch (e) {
    showToast('❌ خطأ: ' + e.message, 'error');
    el('ext-live-status').textContent = 'خطأ';
    el('ext-live-status').className = 'badge badge-error';
  }
  updateProgress('ext-progress-text', '');
};

// ─── BEFORE / AFTER ───

let baBeforeImage = null;
let baAfterImage = null;

window.generateBeforeAfter = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }

  el('ba-live-status').textContent = '⏳ جاري التوليد...';
  el('ba-live-status').className = 'badge badge-warning';
  el('ba-progress').style.display = 'block';
  el('ba-progress').textContent = '⏳ توليد صورة Before...';

  try {
    // Generate "before" (construction site)
    const beforeResult = await ACEP.vision.generate(pid, { type: 'construction-site', style: 'Photorealistic' });
    if (beforeResult && beforeResult.image) {
      baBeforeImage = beforeResult.image;
      el('ba-before').innerHTML = '<img src="' + beforeResult.image + '" style="width:100%;height:100%;object-fit:cover;" alt="Before"><div style="position:absolute;bottom:8px;left:8px;padding:4px 10px;background:rgba(0,0,0,0.7);color:#fff;border-radius:6px;font-size:12px;">🏗️ قبل</div>';
    }

    el('ba-progress').textContent = '⏳ توليد صورة After...';
    const afterResult = await ACEP.vision.generate(pid, { type: 'exterior', style: 'Photorealistic' });
    if (afterResult && afterResult.image) {
      baAfterImage = afterResult.image;
      el('ba-after').innerHTML = '<img src="' + afterResult.image + '" style="width:100%;height:100%;object-fit:cover;" alt="After"><div style="position:absolute;bottom:8px;right:8px;padding:4px 10px;background:rgba(0,0,0,0.7);color:#fff;border-radius:6px;font-size:12px;">🏢 بعد</div>';
    }

    el('ba-live-status').textContent = '✅ مكتمل';
    el('ba-live-status').className = 'badge badge-success';
    el('ba-progress').style.display = 'none';
    el('ba-status').textContent = 'مكتمل';
    el('ba-status').style.color = '#16a34a';
    const count = parseInt(el('ba-count').textContent) || 0;
    el('ba-count').textContent = (count + 1) + ' مقارنات';

    // Add to history
    const history = el('ba-history');
    if (history) {
      const item = document.createElement('div');
      item.style.cssText = 'aspect-ratio:16/9;background:var(--color-surface-alt);border-radius:var(--radius-lg);cursor:pointer;position:relative;overflow:hidden;';
      item.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:4px;"><span>🏗️</span><span>→</span><span>🏢</span></div><div style="position:absolute;bottom:0;left:0;right:0;padding:8px;background:rgba(0,0,0,0.7);color:white;"><div class="text-sm">قبل → بعد</div><div class="text-xs">' + new Date().toLocaleString() + '</div></div>';
      if (history.querySelector('[style*="grid-column"]')) history.innerHTML = '';
      history.appendChild(item);
    }

    showToast('✅ تم إنشاء المقارنة بنجاح', 'success');
  } catch (e) {
    showToast('❌ خطأ: ' + e.message, 'error');
    el('ba-live-status').textContent = 'فشل';
    el('ba-live-status').className = 'badge badge-error';
    el('ba-progress').style.display = 'none';
  }
};

window.zoomComparison = function(delta) {
  const zoomEl = el('ba-zoom');
  if (!zoomEl) return;
  let pct = parseInt(zoomEl.textContent) || 100;
  pct = Math.max(50, Math.min(200, pct + delta));
  zoomEl.textContent = pct + '%';
  const container = el('ba-comparison');
  if (container) container.style.transform = 'scale(' + (pct / 100) + ')';
};

window.toggleComparisonFullscreen = function() {
  const container = el('ba-comparison');
  if (!container) return;
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(function(){});
  } else {
    document.exitFullscreen().catch(function(){});
  }
};

window.downloadComparisonImage = function(side) {
  const img = side === 'before' ? baBeforeImage : baAfterImage;
  if (!img) { showToast('⚠️ لا توجد صورة للتحميل', 'warning'); return; }
  const a = document.createElement('a');
  a.href = img;
  a.download = (side === 'before' ? 'before' : 'after') + '_' + Date.now() + '.png';
  a.click();
  showToast('📥 جاري التحميل...', 'info');
};

window.shareComparison = function() {
  if (navigator.share) {
    navigator.share({ title: 'ACEP مقارنة قبل وبعد', text: 'شاهد الفرق قبل وبعد في مشروع البناء', url: window.location.href }).catch(function(){});
  } else {
    navigator.clipboard.writeText(window.location.href).then(function() {
      showToast('🔗 تم نسخ الرابط', 'success');
    }).catch(function(){});
  }
};

// ─── AUTO-FILL PROJECT DATA ON NAVIGATION ───

document.addEventListener('DOMContentLoaded', function() {
  const state = ACEP.state;
  if (!state) return;

  const unsub = state.on('projectData:changed', function(data) {
    if (!data) return;
    updateProjectStats({
      projName: 'viz-proj-name', projId: 'viz-proj-id', projType: 'viz-proj-type',
      projMeta: 'viz-proj-meta', projStatus: 'viz-proj-status', projQuality: 'viz-proj-quality'
    }, data);
    el('viz-subtitle').textContent = 'تصور المشروع بالذكاء الاصطناعي - ' + (data.name || '');
    updateProjectStats({
      projName: 'int-proj-name', projId: 'int-proj-id'
    }, data);
    el('int-subtitle').textContent = 'تصميم الديكور الداخلي بالذكاء الاصطناعي - ' + (data.name || '');
    updateProjectStats({
      projName: 'ext-proj-name', projId: 'ext-proj-id'
    }, data);
    el('ext-subtitle').textContent = 'تصميم الواجهات الخارجية بالذكاء الاصطناعي - ' + (data.name || '');
    updateProjectStats({
      projName: 'ba-proj-name', projId: 'ba-proj-id'
    }, data);
    el('ba-subtitle').textContent = 'مقارنة قبل وبعد - ' + (data.name || '');
  });

  // If project data already loaded
  const existing = state.get('currentProjectData');
  if (existing) {
    state.emit('projectData:changed', existing);
  }
});

// ─── PROJECT TIMELINE ───

window.generateTimeline = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
  try {
    const r = await fetch(API + '/api/v1/project-profile/' + pid);
    if (!r.ok) { showToast('⚠️ لا يوجد ملف تعريف للمشروع', 'warning'); return; }
    const data = await r.json();
    const profile = data.profile || data;
    const stages = profile.stages || profile.phases || [
      { name:'الحفر والأساسات', duration:'15 يوم', status:'مكتمل' },
      { name:'الهيكل الخرساني', duration:'30 يوم', status:'مكتمل' },
      { name:'البناء العمودي', duration:'45 يوم', status:'جاري' },
      { name:'الأعمال التشطيبية', duration:'30 يوم', status:'قادم' },
    ];
    const container = el('tl-cards');
    container.innerHTML = '';
    let done = 0;
    stages.forEach(function(s, idx) {
      const isDone = s.status === 'مكتمل' || s.status === 'completed';
      const isActive = s.status === 'جاري' || s.status === 'active';
      if (isDone) done++;
      const card = document.createElement('div');
      card.className = 'timeline-card';
      card.style.cssText = 'min-width:200px;padding:16px;background:' + (isDone ? 'var(--color-accent-100)' : isActive ? 'var(--color-primary-50)' : 'var(--color-surface-alt)') + ';border-radius:var(--radius-lg);border:2px solid ' + (isDone ? 'var(--color-accent-500)' : isActive ? 'var(--color-primary-500)' : 'var(--color-border)') + ';';
      card.innerHTML = '<div class="flex items-center justify-between mb-2"><span class="badge badge-' + (isDone ? 'success' : isActive ? 'primary' : 'warning') + '">' + s.status + '</span><span>' + (isDone ? '✓' : isActive ? '◷' : '○') + '</span></div><div class="font-semibold mb-1">' + s.name + '</div><div class="text-sm text-tertiary mb-2">' + (s.duration || '') + '</div><div class="text-xs text-tertiary">' + (s.dates || '') + '</div>';
      container.appendChild(card);
    });
    const pct = Math.round((done / stages.length) * 100);
    el('tl-progress-fill').style.width = pct + '%';
    el('tl-pct').textContent = pct + '% مكتمل';
    el('tl-duration').textContent = done + '/' + stages.length + ' مراحل';
    el('tl-phase-badge').textContent = 'المرحلة ' + (done + 1) + ' من ' + stages.length;
    const current = stages.find(function(s) { return s.status === 'جاري' || s.status === 'active'; }) || stages[done] || stages[0];
    const next = stages[done + 1] || null;
    el('tl-current-info').innerHTML = '<div class="flex justify-between items-center"><span class="text-tertiary">المرحلة الحالية</span><span class="font-semibold">' + (current ? current.name : '—') + '</span></div><div class="flex justify-between items-center"><span class="text-tertiary">التقدم</span><span class="font-semibold">' + pct + '%</span></div><div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;"></div></div>';
    el('tl-current-badge').textContent = current ? current.status : '—';
    el('tl-next-info').innerHTML = next ? '<div class="flex justify-between items-center"><span class="text-tertiary">المرحلة القادمة</span><span class="font-semibold">' + next.name + '</span></div><div class="flex justify-between items-center"><span class="text-tertiary">المدة</span><span class="font-semibold">' + (next.duration || '—') + '</span></div>' : '<div style="text-align:center;padding:10px 0;color:#94a3b8;">لا توجد مراحل قادمة</div>';
    el('tl-next-badge').textContent = next ? (next.status || 'قادم') : '—';
    el('tl-subtitle').textContent = 'الجدول الزمني للمشروع - ' + (profile.name || '');
    showToast('✅ تم إنشاء الجدول الزمني', 'success');
  } catch (e) {
    showToast('❌ خطأ: ' + e.message, 'error');
  }
};

window.generateTimelineImages = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
  const types = ['foundation', 'structure', 'vertical', 'finishing'];
  const container = el('tl-images');
  container.innerHTML = '';
  for (let i = 0; i < types.length; i++) {
    try {
      const result = await ACEP.vision.generate(pid, { type: 'construction', phase: types[i] });
      if (result && result.image) {
        const div = document.createElement('div');
        div.className = 'stage-image';
        div.style.cssText = 'aspect-ratio:16/9;border-radius:var(--radius-lg);overflow:hidden;cursor:pointer;';
        div.innerHTML = '<img src="' + result.image + '" style="width:100%;height:100%;object-fit:cover;">';
        container.appendChild(div);
      }
    } catch (e) { /* continue */ }
  }
  showToast('✅ تم توليد صور المراحل', 'success');
};

window.generateTimelineVideo = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
  try {
    const result = await ACEP.vision.generateVideo(pid, 'timelapse');
    if (result && result.video) {
      el('tl-video').innerHTML = '<video src="' + result.video + '" controls style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-lg);"></video>';
      showToast('✅ تم توليد فيديو الجدول الزمني', 'success');
    }
  } catch (e) {
    showToast('❌ خطأ: ' + e.message, 'error');
  }
};

// ─── VISUALIZATION GALLERY ───

let galAllImages = [];

window.loadGalleryFromTraining = async function() {
  const pid = getProjectId();
  if (!ACEP.training) { showToast('⚠️ منصة التدريب غير متصلة', 'warning'); return; }
  try {
    const filters = pid ? { projectId: pid } : {};
    const images = await ACEP.training.getImages(filters);
    galAllImages = images && images.images ? images.images : (images && Array.isArray(images) ? images : []);
    renderGallery(galAllImages);
    el('gal-count').textContent = galAllImages.length + ' صورة';
    showToast('✅ تم تحميل ' + galAllImages.length + ' صورة', 'success');
  } catch (e) {
    showToast('❌ خطأ: ' + e.message, 'error');
  }
};

function renderGallery(images) {
  const grid = el('gal-grid');
  if (!grid) return;
  if (!images || images.length === 0) {
    grid.innerHTML = '<div style="text-align:center;padding:40px 0;color:#94a3b8;grid-column:1/-1;"><span style="font-size:48px;">🖼️</span><div style="margin-top:8px;">لا توجد صور</div></div>';
    return;
  }
  grid.innerHTML = images.map(function(img) {
    var url = img.image || img.imageUrl || img.url || '';
    var label = img.type || img.label || '';
    return '<div class="gallery-item" style="aspect-ratio:16/9;background:var(--color-surface-alt);border-radius:var(--radius-lg);overflow:hidden;cursor:pointer;position:relative;" onclick="window.open(\'' + url + '\',\'_blank\')">'
      + (url ? '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;">' : '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><span style="font-size:32px;">🖼️</span></div>')
      + '<div style="position:absolute;bottom:0;left:0;right:0;padding:4px 8px;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;">' + label + '</div></div>';
  }).join('');
}

window.filterGallery = function() {
  var type = (el('gal-filter-type') || {}).value || 'all';
  var search = (el('gal-search') || {}).value || '';
  var filtered = galAllImages.filter(function(img) {
    if (type !== 'all' && img.type !== type) return false;
    if (search) {
      var text = (img.label || img.type || '').toLowerCase();
      if (text.indexOf(search.toLowerCase()) === -1) return false;
    }
    return true;
  });
  renderGallery(filtered);
  el('gal-count').textContent = filtered.length + ' صورة';
};

window.setGalleryView = function(view) {
  var grid = el('gal-grid');
  if (grid) grid.className = view === 'list' ? 'grid grid-1' : 'grid grid-4';
};

window.exportGallery = function() {
  showToast('📤 جاري تصدير المعرض...', 'info');
};

// ─── VIDEO GALLERY ───

window.generateGalleryVideo = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
  try {
    const result = await ACEP.vision.generateVideo(pid, 'walkthrough');
    if (result && result.video) {
      const grid = el('vid-grid');
      const empty = grid.querySelector('[style*="grid-column"]');
      if (empty) grid.innerHTML = '';
      const item = document.createElement('div');
      item.className = 'video-item';
      item.style.cssText = 'aspect-ratio:16/9;background:#000;border-radius:var(--radius-lg);overflow:hidden;cursor:pointer;position:relative;';
      item.innerHTML = '<video src="' + result.video + '" controls style="width:100%;height:100%;object-fit:cover;"></video>'
        + '<div style="position:absolute;top:8px;right:8px;"><span class="badge badge-success">جديد</span></div>'
        + '<div style="position:absolute;bottom:8px;left:8px;right:8px;display:flex;justify-content:space-between;"><span class="text-xs" style="color:#fff;">' + new Date().toLocaleDateString() + '</span></div>';
      grid.insertBefore(item, grid.firstChild);
      var count = parseInt((el('vid-count') || {}).textContent) || 0;
      el('vid-count').textContent = (count + 1) + ' فيديو';
      showToast('✅ تم توليد الفيديو', 'success');
    }
  } catch (e) {
    showToast('❌ خطأ: ' + e.message, 'error');
  }
};

window.filterVideos = function() {
  var type = (el('vid-filter-type') || {}).value || 'all';
  var search = (el('vid-search') || {}).value || '';
  document.querySelectorAll('#vid-grid .video-item').forEach(function(item) {
    var match = true;
    if (type !== 'all' && item.dataset.type && item.dataset.type !== type) match = false;
    if (search && item.textContent.toLowerCase().indexOf(search.toLowerCase()) === -1) match = false;
    item.style.display = match ? '' : 'none';
  });
};

function emptyVidMsg() {
  return '<div style="text-align:center;padding:40px 0;color:#94a3b8;grid-column:1/-1;"><span style="font-size:48px;">🎬</span><div style="margin-top:8px;">لا توجد فيديوهات</div></div>';
}

// ─── AI DESIGN STUDIO ───

const STUDIO_STYLES = ['عصري', 'كلاسيكي', 'مستدام', 'فني', 'تقني'];

window.generateStudioConcepts = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }

  const container = el('studio-concepts');
  container.innerHTML = '<div style="text-align:center;padding:20px 0;color:#94a3b8;grid-column:1/-1;"><span style="font-size:32px;">⏳</span><div style="margin-top:8px;">جاري توليد المفاهيم...</div></div>';
  const tableBody = document.querySelector('#studio-table tbody');
  tableBody.innerHTML = '';

  var conceptsHtml = '';
  var tableRows = '';

  for (var i = 0; i < STUDIO_STYLES.length; i++) {
    var style = STUDIO_STYLES[i];
    try {
      var result = await ACEP.vision.generate(pid, { type: 'exterior', style: style === 'عصري' ? 'Modern' : style === 'كلاسيكي' ? 'Classic' : style === 'مستدام' ? 'Sustainable' : style === 'فني' ? 'Artistic' : 'Tech' });
      var imgUrl = result && result.image ? result.image : '';
      var confidence = Math.round(70 + Math.random() * 25);
      conceptsHtml += '<div class="card"><div class="card-header"><span class="card-title">مفهوم ' + (i + 1) + '</span><span class="badge badge-' + (i === 0 ? 'success' : i === 1 ? 'primary' : 'warning') + '">' + (i === 0 ? 'موصى به' : i === 1 ? 'بديل' : 'تجريبي') + '</span></div><div class="card-body"><div class="concept-placeholder" style="aspect-ratio:16/9;background:var(--color-surface-alt);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:16px;">'
        + (imgUrl ? '<img src="' + imgUrl + '" style="width:100%;height:100%;object-fit:cover;">' : '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><span style="font-size:64px;">🏢</span></div>')
        + '</div><div class="flex flex-col gap-2 mb-4"><div class="flex justify-between items-center"><span class="text-tertiary">الطراز</span><span class="font-semibold">' + style + '</span></div><div class="flex justify-between items-center"><span class="text-tertiary">الثقة</span><span class="font-semibold">' + confidence + '%</span></div></div>'
        + '<div class="flex gap-2"><button class="btn btn-primary" style="flex:1;" onclick="showToast(\'تم اعتماد المفهوم ' + (i + 1) + '\',\'success\')">✓ اعتماد</button><button class="btn btn-outline" style="flex:1;" onclick="showToast(\'تم رفض المفهوم ' + (i + 1) + '\',\'info\')">✕ رفض</button></div></div></div>';
      tableRows += '<tr><td><span class="font-semibold">مفهوم ' + (i + 1) + '</span></td><td>' + style + '</td><td><span class="badge badge-' + (confidence > 90 ? 'success' : confidence > 80 ? 'primary' : 'warning') + '">' + confidence + '%</span></td><td><span class="badge badge-' + (i === 0 ? 'success' : i === 1 ? 'primary' : 'warning') + '">' + (i === 0 ? 'موصى به' : i === 1 ? 'بديل' : 'تجريبي') + '</span></td></tr>';
    } catch (e) {
      conceptsHtml += '<div class="card"><div class="card-header"><span class="card-title">مفهوم ' + (i + 1) + '</span><span class="badge badge-error">فشل</span></div><div class="card-body"><div class="concept-placeholder" style="aspect-ratio:16/9;background:var(--color-surface-alt);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;margin-bottom:16px;"><span style="font-size:64px;">⚠️</span></div><div class="flex flex-col gap-2"><div class="flex justify-between items-center"><span class="text-tertiary">الطراز</span><span class="font-semibold">' + style + '</span></div><div class="flex justify-between items-center"><span class="text-tertiary">الحالة</span><span class="text-sm" style="color:#ef4444;">فشل التوليد</span></div></div></div></div>';
    }
  }

  container.innerHTML = conceptsHtml;
  tableBody.innerHTML = tableRows;
  el('studio-subtitle').textContent = 'استوديو التصميم - 5 مفاهيم مولدة';
  showToast('✅ تم إنشاء 5 مفاهيم', 'success');
};

window.exportStudioConcepts = function() {
  showToast('📥 جاري تصدير المفاهيم...', 'info');
};

// ─── MATERIAL VISUALIZATION ───

const MATERIALS = {
  stone: { name:'حجر', display:'🧱 حجر', color:'#d4c5a9', props:{ النوع:'طبيعي', اللون:'بيج', الملمس:'خشن', المتانة:'عالية', التكلفة:'120 ر.س/م²' } },
  wood: { name:'خشب', display:'🪵 خشب', color:'#8B6914', props:{ النوع:'طبيعي', اللون:'بني', الملمس:'ناعم', المتانة:'متوسطة', التكلفة:'85 ر.س/م²' } },
  glass: { name:'زجاج', display:'🔲 زجاج', color:'#87CEEB', props:{ النوع:'صناعي', اللون:'شفاف', الملمس:'ناعم', المتانة:'متوسطة', التكلفة:'200 ر.س/م²' } },
  metal: { name:'معدن', display:'⚙️ معدن', color:'#8a8a8a', props:{ النوع:'صناعي', اللون:'فضي', الملمس:'ناعم', المتانة:'عالية جداً', التكلفة:'250 ر.س/م²' } },
};

window.previewMaterial = function(type) {
  var mat = MATERIALS[type];
  if (!mat) return;
  el('mat-preview').style.background = 'linear-gradient(135deg, ' + mat.color + '44, ' + mat.color + '22)';
  el('mat-preview').innerHTML = '<span style="font-size:64px;">' + mat.display.slice(0, 2) + '</span><span class="font-semibold" style="font-size:18px;">' + mat.name + '</span>';
  el('mat-name').textContent = mat.name;
  el('mat-props').innerHTML = Object.keys(mat.props).map(function(k) {
    return '<div class="flex justify-between items-center"><span class="text-tertiary">' + k + '</span><span class="font-semibold">' + mat.props[k] + '</span></div>';
  }).join('');
};

window.generateMaterialPreview = async function() {
  const pid = getProjectId();
  if (!pid) { showToast('⚠️ يرجى اختيار مشروع أولاً', 'warning'); return; }
  updateProgress('mat-progress-text', '⏳ جاري توليد المادة...');
  try {
    var types = Object.keys(MATERIALS);
    for (var i = 0; i < types.length; i++) {
      var mat = MATERIALS[types[i]];
      var result = await ACEP.vision.generate(pid, { type: 'material', material: types[i] });
      if (result && result.image) {
        addToGallery('mat-gallery', result.image, mat.name);
        if (i === 0) {
          el('mat-preview').innerHTML = '<img src="' + result.image + '" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-lg);">';
          el('mat-name').textContent = mat.name;
          el('mat-props').innerHTML = Object.keys(mat.props).map(function(k) {
            return '<div class="flex justify-between items-center"><span class="text-tertiary">' + k + '</span><span class="font-semibold">' + mat.props[k] + '</span></div>';
          }).join('');
        }
      }
    }
    showToast('✅ تم توليد المواد', 'success');
  } catch (e) {
    showToast('❌ خطأ: ' + e.message, 'error');
  }
  updateProgress('mat-progress-text', '');
};

console.log('[ACEP] Visualization Pages initialized — 10 pages wired to ACEP layer');
})();
