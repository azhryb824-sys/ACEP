/* ACEP UI Prototype - App Logic */
(function() {
  'use strict';

  // --- State ---
  const state = {
    currentPage: 'dashboard',
    sidebarOpen: true,
    aiPanelOpen: false,
    modalOpen: false,
    currentProject: 'P-2024-001',
    theme: 'light'
  };

  const pages = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
    { id: 'projects', label: 'المشاريع', icon: '📁' },
    { id: 'analysis', label: 'تحليل AI', icon: '🤖' },
    { id: 'boq', label: 'جدول الكميات', icon: '📋' },
    { id: 'cost', label: 'التكاليف', icon: '💰' },
    { id: 'schedule', label: 'الجدول الزمني', icon: '📅' },
    { id: 'risks', label: 'المخاطر', icon: '⚠️' },
    { id: 'gis', label: 'GIS', icon: '🗺️' },
    { id: 'iot', label: 'IoT', icon: '📡' },
    { id: 'quality', label: 'الجودة', icon: '✅' },
    { id: 'safety', label: 'السلامة', icon: '🛡️' },
    { id: 'sustainability', label: 'الاستدامة', icon: '🌱' },
    { id: 'marketplace', label: 'السوق', icon: '🏪' },
    { id: 'bi', label: 'ذكاء الأعمال', icon: '📈' },
    { id: 'admin', label: 'الإدارة', icon: '⚙️' },
    { id: 'developer', label: 'المطورين', icon: '💻' }
  ];

  // --- Navigation ---
  function navigate(pageId) {
    state.currentPage = pageId;
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.add('active');
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    const navItem = document.querySelector(`.sidebar-item[data-page="${pageId}"]`);
    if (navItem) navItem.classList.add('active');
    // Update breadcrumb
    const page = pages.find(p => p.id === pageId);
    if (page) {
      document.getElementById('breadcrumb-current').textContent = page.label;
    }
    if (window.innerWidth <= 768) {
      document.querySelector('.sidebar').classList.remove('mobile-open');
    }
  }

  // --- AI Panel ---
  function toggleAiPanel() {
    state.aiPanelOpen = !state.aiPanelOpen;
    document.getElementById('ai-panel').classList.toggle('open', state.aiPanelOpen);
  }

  // --- Modal ---
  function openModal(title) {
    state.modalOpen = true;
    document.getElementById('modal-overlay').classList.add('open');
  }
  function closeModal() {
    state.modalOpen = false;
    document.getElementById('modal-overlay').classList.remove('open');
  }

  // --- Toast ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>
      <button onclick="this.parentElement.remove()" style="margin-right:auto;background:none;border:none;cursor:pointer;font-size:16px;">&times;</button>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
  }

  // --- Modal confirm/cancel ---
  window.confirmAction = function(msg) {
    return new Promise((resolve) => {
      document.getElementById('modal-message').textContent = msg;
      document.getElementById('modal-confirm-btn').onclick = () => { closeModal(); resolve(true); };
      document.getElementById('modal-cancel-btn').onclick = () => { closeModal(); resolve(false); };
      openModal();
    });
  };

  // --- Sidebar Toggle (Mobile) ---
  function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('mobile-open');
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', function() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', function(e) {
        const page = this.dataset.page;
        if (page) navigate(page);
      });
    });

    // Mobile nav
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.addEventListener('click', function(e) {
        const page = this.dataset.page;
        if (page) navigate(page);
      });
    });

    // AI FAB
    document.getElementById('ai-fab')?.addEventListener('click', toggleAiPanel);
    document.getElementById('ai-panel-close')?.addEventListener('click', toggleAiPanel);
    document.getElementById('ai-send-btn')?.addEventListener('click', function() {
      const input = document.getElementById('ai-input');
      if (input && input.value.trim()) {
        const msg = input.value.trim();
        const container = document.getElementById('ai-messages');
        const userMsg = document.createElement('div');
        userMsg.className = 'ai-message user';
        userMsg.innerHTML = '<div class="ai-message-content">' + msg + '</div>';
        container.appendChild(userMsg);
        input.value = '';
        container.scrollTop = container.scrollHeight;
        setTimeout(() => {
          const aiMsg = document.createElement('div');
          aiMsg.className = 'ai-message';
          aiMsg.innerHTML = '<div class="ai-message-avatar">🤖</div><div class="ai-message-content">أقوم بتحليل طلبك... سأقدم النتائج فور اكتمال المعالجة.</div>';
          container.appendChild(aiMsg);
          container.scrollTop = container.scrollHeight;
        }, 1000);
      }
    });

    // Tabs
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.addEventListener('click', function(e) {
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

    // Modal
    document.getElementById('modal-overlay')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });

    // Mobile toggle
    document.getElementById('mobile-toggle')?.addEventListener('click', toggleSidebar);

    // Buttons with data-toast
    document.querySelectorAll('[data-toast]').forEach(btn => {
      btn.addEventListener('click', function() {
        showToast(this.dataset.toast, this.dataset.toastType || 'success');
      });
    });

    // Buttons with data-modal
    document.querySelectorAll('[data-modal]').forEach(btn => {
      btn.addEventListener('click', function() {
        openModal(this.dataset.modal);
      });
    });
    document.getElementById('modal-close')?.addEventListener('click', closeModal);

    // Send AI query from FAB quick buttons
    document.querySelectorAll('.ai-quick-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const text = this.dataset.query || this.textContent.trim();
        document.getElementById('ai-input').value = text;
        document.getElementById('ai-send-btn').click();
        if (!state.aiPanelOpen) toggleAiPanel();
      });
    });

    // Navigate to first page
    navigate('dashboard');
  });

  // Expose for inline handlers
  window.navigate = navigate;
  window.toggleAiPanel = toggleAiPanel;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.showToast = showToast;
  window.toggleSidebar = toggleSidebar;
})();
