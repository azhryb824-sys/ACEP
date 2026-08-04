const API = window.location.origin;

window.newSimulation = async function(type, area, floors, city) {
  try {
    const res = await fetch(API + '/api/v1/simulation/session', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({type, area, floors, city})
    });
    const data = await res.json();
    console.log('[Simulation] Session created:', data.sessionId);
    return data;
  } catch(e) {
    alert('خطأ في إنشاء الجلسة: ' + e.message);
  }
};

window.generateSimulation = async function(sessionId, mode, duration, camera, resolution, weather, startStage, endStage) {
  try {
    const res = await fetch(API + '/api/v1/simulation/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, mode, duration, camera, resolution, weather, startStage, endStage})
    });
    const data = await res.json();
    console.log('[Simulation] Generated:', data.videoId);
    return data;
  } catch(e) {
    alert('خطأ في توليد المحاكاة: ' + e.message);
  }
};

window.validateStages = async function(sessionId, stages) {
  try {
    const res = await fetch(API + '/api/v1/simulation/validate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, stages})
    });
    const data = await res.json();
    console.log('[Simulation] Validation result:', data);
    return data;
  } catch(e) {
    alert('خطأ في التحقق الهندسي: ' + e.message);
  }
};

window.predictProgress = async function(sessionId, currentProgress, currentStage) {
  try {
    const res = await fetch(API + '/api/v1/simulation/predict', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, currentProgress, currentStage})
    });
    const data = await res.json();
    console.log('[Simulation] Prediction result:', data);
    return data;
  } catch(e) {
    alert('خطأ في توقع الإكمال: ' + e.message);
  }
};

window.generateScenarios = async function(sessionId, mode, duration) {
  try {
    const res = await fetch(API + '/api/v1/simulation/scenarios', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, mode, duration})
    });
    const data = await res.json();
    console.log('[Simulation] Scenarios generated:', data);
    return data;
  } catch(e) {
    alert('خطأ في توليد السيناريوهات: ' + e.message);
  }
};

window.compareReality = async function(sessionId, photos, stage) {
  try {
    const res = await fetch(API + '/api/v1/simulation/compare-reality', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, photos, stage})
    });
    const data = await res.json();
    console.log('[Simulation] Reality comparison:', data);
    return data;
  } catch(e) {
    alert('خطأ في المقارنة مع الواقع: ' + e.message);
  }
};

window.compareVideos = async function(sessionId, vid1, vid2) {
  try {
    const res = await fetch(API + '/api/v1/simulation/compare-videos', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, vid1, vid2})
    });
    const data = await res.json();
    console.log('[Simulation] Video comparison:', data);
    return data;
  } catch(e) {
    alert('خطأ في مقارنة الفيديوهات: ' + e.message);
  }
};

window.sendFeedback = async function(sessionId, videoId, action, details) {
  try {
    const res = await fetch(API + '/api/v1/simulation/feedback', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, videoId, action, details})
    });
    const data = await res.json();
    console.log('[Simulation] Feedback sent:', data);
    return data;
  } catch(e) {
    alert('خطأ في إرسال التقييم: ' + e.message);
  }
};

window.getSessionInfo = async function(sessionId) {
  try {
    const res = await fetch(API + '/api/v1/simulation/session/' + sessionId, {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });
    const data = await res.json();
    console.log('[Simulation] Session info:', data);
    return data;
  } catch(e) {
    alert('خطأ في جلب معلومات الجلسة: ' + e.message);
  }
};

window.loadConfig = async function() {
  try {
    const res = await fetch(API + '/api/v1/simulation/config', {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });
    const data = await res.json();
    console.log('[Simulation] Config loaded:', data);
    return data;
  } catch(e) {
    console.warn('[Simulation] Config load failed (likely not implemented):', e.message);
  }
};
