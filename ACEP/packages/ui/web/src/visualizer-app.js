const API = window.location.origin;

window.newSession = async function(type, area, floors, city, style) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/session', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({projectParams: {type, area, floors, city, style}})
    });
    const data = await res.json();
    console.log('[Visualizer] Session created:', data.sessionId);
    return data;
  } catch(e) {
    alert('خطأ في إنشاء الجلسة: ' + e.message);
  }
};

window.generateImage = async function(sessionId, phase, imageType, model) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, params: {phase, imageType, model}})
    });
    const data = await res.json();
    console.log('[Visualizer] Image generated:', data.image?.id);
    return { imageId: data.image?.id, imageUrl: data.image?.imageUrl, imageData: data.image?.imageData, description: data.image?.phase + ' - ' + data.image?.imageType, ...data };
  } catch(e) {
    alert('خطأ في توليد الصورة: ' + e.message);
  }
};

window.generateInterior = async function(sessionId, roomType, style) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/interior', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, roomType, style})
    });
    const data = await res.json();
    console.log('[Visualizer] Interior generated:', data.image?.id);
    return { imageId: data.image?.id, imageUrl: data.image?.imageUrl, imageData: data.image?.imageData, description: 'Interior - ' + roomType, ...data };
  } catch(e) {
    alert('خطأ في توليد التصميم الداخلي: ' + e.message);
  }
};

window.generateExterior = async function(sessionId, view) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/exterior', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, params: {view}})
    });
    const data = await res.json();
    console.log('[Visualizer] Exterior generated:', data.image?.id);
    return { imageId: data.image?.id, imageUrl: data.image?.imageUrl, imageData: data.image?.imageData, description: 'Exterior - ' + view, ...data };
  } catch(e) {
    alert('خطأ في توليد التصميم الخارجي: ' + e.message);
  }
};

window.generateDrone = async function(sessionId, altitude) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/drone', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, params: {altitude}})
    });
    const data = await res.json();
    console.log('[Visualizer] Drone image generated:', data.image?.id);
    return { imageId: data.image?.id, imageUrl: data.image?.imageUrl, imageData: data.image?.imageData, description: 'Drone view at ' + altitude + 'm', ...data };
  } catch(e) {
    alert('خطأ في توليد الصورة الجوية: ' + e.message);
  }
};

window.generateConcepts = async function(sessionId, count) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/concepts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, count})
    });
    const data = await res.json();
    console.log('[Visualizer] Concepts generated:', data.concepts?.length);
    return { conceptIds: data.concepts?.map(c => c.conceptNumber), concepts: data.concepts, ...data };

window.generateVideo = async function(sessionId, videoType) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/video', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, videoType})
    });
    const data = await res.json();
    console.log('[Visualizer] Video generation started:', data.video?.id);
    return { videoId: data.video?.id, videoUrl: data.video?.url, ...data };
  } catch(e) {
    alert('خطأ في توليد الفيديو: ' + e.message);
  }
};

window.approveImage = async function(sessionId, imageId) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/approve', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, imageId})
    });
    const data = await res.json();
    console.log('[Visualizer] Image approved:', imageId);
    return data;
  } catch(e) {
    alert('خطأ في اعتماد الصورة: ' + e.message);
  }
};

window.rejectImage = async function(sessionId, imageId, reason) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/reject', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, imageId, reason})
    });
    const data = await res.json();
    console.log('[Visualizer] Image rejected:', imageId);
    return data;
  } catch(e) {
    alert('خطأ في رفض الصورة: ' + e.message);
  }
};

window.analyzeImage = async function(imageData) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/analyze-image', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({imageData})
    });
    const data = await res.json();
    console.log('[Visualizer] Image analysis:', data);
    return data;
  } catch(e) {
    alert('خطأ في تحليل الصورة: ' + e.message);
  }
};

window.compareBeforeAfter = async function(sessionId, beforeId, afterId) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/compare', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, beforeImage: beforeId, afterImage: afterId})
    });
    const data = await res.json();
    console.log('[Visualizer] Comparison result:', data);
    return data;
  } catch(e) {
    alert('خطأ في المقارنة: ' + e.message);
  }
};

window.getBOQImpact = async function(sessionId, changes) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/boq-impact', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, materialChanges: changes})
    });
    const data = await res.json();
    console.log('[Visualizer] BOQ impact:', data);
    return data;
  } catch(e) {
    alert('خطأ في حساب تأثير BOQ: ' + e.message);
  }
};

window.getSessionInfo = async function(sessionId) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/session/' + sessionId, {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });
    const data = await res.json();
    console.log('[Visualizer] Session info:', data);
    return data;
  } catch(e) {
    alert('خطأ في جلب معلومات الجلسة: ' + e.message);
  }
};

window.loadSessionList = async function() {
  try {
    const res = await fetch(API + '/api/v1/visualizer/sessions', {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });
    const data = await res.json();
    console.log('[Visualizer] Session list:', data);
    return data;
  } catch(e) {
    alert('خطأ في جلب قائمة الجلسات: ' + e.message);
  }
};

window.analyzeRoom = async function(imageData) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/analyze-room', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({imageData})
    });
    const data = await res.json();
    console.log('[Visualizer] Room analysis:', data);
    return data;
  } catch(e) {
    alert('خطأ في تحليل الغرفة: ' + e.message);
  }
};

window.compareReality = async function(realPhoto, predictedImage, projectParams) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/compare-reality', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({realPhoto, predictedImage, projectParams})
    });
    const data = await res.json();
    console.log('[Visualizer] Reality comparison:', data);
    return data;
  } catch(e) {
    alert('خطأ في مقارنة الواقع: ' + e.message);
  }
};

window.trackProgress = async function(imageHistory, timeline) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/track-progress', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({imageHistory, timeline})
    });
    const data = await res.json();
    console.log('[Visualizer] Progress tracking:', data);
    return data;
  } catch(e) {
    alert('خطأ في تتبع التقدم: ' + e.message);
  }
};

window.getModels = async function() {
  try {
    const res = await fetch(API + '/api/v1/visualizer/models', {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });
    const data = await res.json();
    console.log('[Visualizer] Available models:', data);
    return data;
  } catch(e) {
    alert('خطأ في جلب النماذج: ' + e.message);
  }
};

window.getCostEstimate = async function(model, imageType) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/estimate-cost?model=' + model + '&imageType=' + imageType, {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });
    const data = await res.json();
    console.log('[Visualizer] Cost estimate:', data);
    return data;
  } catch(e) {
    alert('خطأ في تقدير التكلفة: ' + e.message);
  }
};
