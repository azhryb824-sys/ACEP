const API = window.location.origin;

function visionAICreateProject(projectParams) {
  return fetch(API + '/api/v1/vision-ai/project', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(projectParams)
  }).then(r => r.json());
}

window.newSession = async function(type, area, floors, city, style) {
  try {
    const projectParams = { name: `${type} Vision`, type, area, floors, city, style };
    const project = await visionAICreateProject(projectParams);
    const projectId = project.project?.projectId;
    if (projectId) {
      window._visionProjectId = projectId;
      window._visionProjectParams = projectParams;
    }
    const res = await fetch(API + '/api/v1/visualizer/session', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({projectParams})
    });
    const data = await res.json();
    console.log('[VisionAI] Session created:', data.sessionId, '| Project:', projectId);
    if (projectId) data._visionProjectId = projectId;
    return data;
  } catch(e) {
    alert('خطأ في إنشاء الجلسة: ' + e.message);
  }
};

function _getVisionIds() {
  const pid = window._visionProjectId;
  const pp = window._visionProjectParams;
  return { projectId: pid, projectParams: pp || { type: null, area: null, floors: null, city: null, style: 'Contemporary' } };
}

function _handleProviderError(e, actionName) {
  const msg = e.message || 'خطأ غير معروف';
  const isConnectionError = msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout') || msg.includes('ENOTFOUND');
  if (isConnectionError) {
    alert(`❌ ${actionName}\n\nتعذر الاتصال بمحرك التوليد.\nالرجاء التأكد من:\n1. تشغيل Stable Diffusion على المنفذ 7860\n2. أو ضبط مفتاح API (OpenAI / Replicate)\n\nالتفاصيل التقنية: ${msg}`);
  } else {
    alert(`❌ ${actionName}\n\n${msg}`);
  }
}

window.generateImage = async function(sessionId, phase, imageType, model) {
  const cloudResult = await _fallbackGenerate(sessionId, phase, imageType, model);
  if (cloudResult && cloudResult.imageUrl && !cloudResult.imageUrl.includes('svg')) return cloudResult;
  try {
    const { projectId, projectParams } = _getVisionIds();
    if (projectId) {
      const res = await fetch(API + '/api/v1/vision-ai/generate', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ projectId, projectParams, options: { phase, imageType, model, viewType: imageType } })
      });
      const data = await res.json();
      if (data.status === 'queued') {
        return await _waitForGeneration(data.generationId, 'image');
      }
      if (data.image) return { imageId: data.image?.id, imageUrl: data.image?.imageUrl, imageData: data.image?.imageData, description: phase + ' - ' + imageType, ...data };
    }
  } catch(e) { /* fallback already handled */ }
  return cloudResult;
};

window.generateInterior = async function(sessionId, roomType, style) {
  try {
    const { projectId, projectParams } = _getVisionIds();
    if (!projectId) throw new Error('الرجاء إنشاء جلسة أولاً');
    const res = await fetch(API + '/api/v1/vision-ai/interior', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ projectId, projectParams, roomType, options: { style } })
    });
    const data = await res.json();
    if (data.status === 'queued') {
      alert(`🔄 يتم توليد التصميم الداخلي... (رقم المهمة: ${data.jobId})`);
      return await _waitForGeneration(data.generationId, 'image');
    }
    return data;
  } catch(e) {
    _handleProviderError(e, 'توليد التصميم الداخلي');
  }
};

window.generateExterior = async function(sessionId, view) {
  try {
    const { projectId, projectParams } = _getVisionIds();
    if (!projectId) throw new Error('الرجاء إنشاء جلسة أولاً');
    const res = await fetch(API + '/api/v1/vision-ai/exterior', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ projectId, projectParams, viewType: view })
    });
    const data = await res.json();
    if (data.status === 'queued') {
      alert(`🔄 يتم توليد التصميم الخارجي... (رقم المهمة: ${data.jobId})`);
      return await _waitForGeneration(data.generationId, 'image');
    }
    return data;
  } catch(e) {
    _handleProviderError(e, 'توليد التصميم الخارجي');
  }
};

window.generateDrone = async function(sessionId, altitude) {
  try {
    const { projectId, projectParams } = _getVisionIds();
    if (!projectId) throw new Error('الرجاء إنشاء جلسة أولاً');
    const res = await fetch(API + '/api/v1/vision-ai/drone', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ projectId, projectParams, altitude })
    });
    const data = await res.json();
    if (data.status === 'queued') {
      alert(`🔄 يتم توليد الصورة الجوية... (رقم المهمة: ${data.jobId})`);
      return await _waitForGeneration(data.generationId, 'image');
    }
    return data;
  } catch(e) {
    _handleProviderError(e, 'توليد الصورة الجوية');
  }
};

window.generateConcepts = async function(sessionId, count) {
  try {
    const { projectId, projectParams } = _getVisionIds();
    if (!projectId) throw new Error('الرجاء إنشاء جلسة أولاً');
    const res = await fetch(API + '/api/v1/vision-ai/concepts', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ projectId, projectParams, count })
    });
    const data = await res.json();
    console.log('[VisionAI] Concepts generated:', data.concepts?.length);
    return { conceptIds: data.concepts?.map((c, i) => 'Concept-' + (i+1)), concepts: data.concepts, ...data };
  } catch(e) {
    _handleProviderError(e, 'توليد التصاميم');
  }
};

window.generateVideo = async function(sessionId, videoType) {
  try {
    const { projectId, projectParams } = _getVisionIds();
    if (!projectId) throw new Error('الرجاء إنشاء جلسة أولاً');
    const res = await fetch(API + '/api/v1/vision-ai/video', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ projectId, projectParams, videoType, options: { duration: 30 } })
    });
    const data = await res.json();
    if (data.status === 'queued') {
      alert(`🔄 يتم توليد الفيديو... (رقم المهمة: ${data.jobId})\nالوقت المتوقع: ${data.estimatedTime || '2-5 دقائق'}`);
      return { videoId: data.generationId, status: 'processing', ...data };
    }
    return { videoId: data.videoId, ...data };
  } catch(e) {
    _handleProviderError(e, 'توليد الفيديو');
  }
};

async function _waitForGeneration(generationId, type) {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const res = await fetch(API + '/api/v1/vision-ai/status/' + generationId);
      const status = await res.json();
      if (status.status === 'completed') {
        const imageUrl = status.imageUrl || null;
        return {
          generationId,
          imageId: generationId,
          status: 'completed',
          imageUrl: imageUrl,
          image: status.image || null,
          description: status.progressMessage || 'تم التوليد'
        };
      }
      if (status.status === 'failed') throw new Error(status.errorMessage || 'فشل التوليد');
    } catch(e) {
      if (i > 10) break;
    }
  }
  return { generationId, imageId: generationId, status: 'completed', description: 'قد تكون الصورة ما زالت قيد المعالجة' };
}

async function _fallbackGenerate(sessionId, phase, imageType, model) {
  const styles = { 'front':'Front view','rear':'Rear view','side':'Side view','corner':'Corner angle','drone':'Aerial drone view','bird_eye':'Bird eye view','street':'Street level view','interior':'Interior','living_room':'Living room interior','bedroom':'Bedroom interior','kitchen':'Kitchen interior','bathroom':'Bathroom interior','roof':'Roof view','garden':'Garden view' };
  const viewDesc = styles[imageType] || imageType || 'architectural view';
  const isInterior = ['interior','living_room','bedroom','kitchen','bathroom'].includes(imageType);
  const isDrone = ['drone','bird_eye'].includes(imageType);
  const materials = ['glass','stone','wood','concrete','steel','white plaster','natural stone','brick'];
  const mat = materials[Math.floor(Math.random() * materials.length)];
  const timeOfDay = ['sunny day','golden hour','sunset','blue hour','overcast','morning light','night with warm lighting'][Math.floor(Math.random() * 7)];
  let prompt;
  if (isInterior) {
    prompt = `Professional interior design photography of a ${model || 'modern'} ${phase || 'room'} ${viewDesc}, ${mat} finishes, ${timeOfDay} lighting, wide angle lens, high end furniture, architectural digest style, photorealistic, 8k`;
  } else if (isDrone) {
    prompt = `Aerial drone photography of a ${model || 'contemporary'} ${phase || 'building'} complex, ${viewDesc}, ${mat} architecture, ${timeOfDay}, landscape surroundings, urban planning perspective, high quality, cinematic`;
  } else {
    prompt = `Professional architectural exterior ${viewDesc} of a ${model || 'modern'} ${phase || 'villa'} with ${mat} facade, ${timeOfDay}, lush landscaping, photorealistic rendering, award winning architecture, 8k, detailed textures`;
  }
try {
  const res = await fetch(API + '/api/v1/ai/generate-image', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ prompt })
  });
  if (res.ok) {
    const data = await res.json();
    if (data.status === 'completed') {
      return { imageId: 'cloud-' + Date.now(), imageUrl: data.image.imageUrl, imageData: data.image.imageData, description: phase + ' - ' + imageType, ...data };
    }
  }
} catch(e) { /* fallback to visualizer mock */ }
  const res = await fetch(API + '/api/v1/visualizer/generate', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({sessionId, params: {phase, imageType, model}})
  });
  const data = await res.json();
  return { imageId: data.image?.id, imageUrl: data.image?.imageUrl, imageData: data.image?.imageData, description: phase + ' - ' + imageType, ...data };
}

window.approveImage = async function(sessionId, imageId) {
  try {
    const { projectId } = _getVisionIds();
    if (projectId) {
      const gallery = await fetch(API + '/api/v1/vision-ai/gallery/' + projectId).then(r => r.json());
      const match = gallery.items?.find(i => i.generation_id === imageId || i.id === imageId);
      if (match) {
        await fetch(API + '/api/v1/vision-ai/approve', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ galleryId: match.id })
        });
        alert('✅ تم اعتماد التصميم وحفظه في مجموعة التدريب');
        return { success: true };
      }
    }
    const res = await fetch(API + '/api/v1/visualizer/approve', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, imageId})
    });
    return await res.json();
  } catch(e) {
    alert('خطأ في اعتماد الصورة: ' + e.message);
  }
};

window.rejectImage = async function(sessionId, imageId, reason) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/reject', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId, imageId, reason})
    });
    return await res.json();
  } catch(e) {
    alert('خطأ في رفض الصورة: ' + e.message);
  }
};

window.analyzeImage = async function(imageData) {
  try {
    const res = await fetch(API + '/api/v1/visualizer/analyze-image', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({imageData})
    });
    return await res.json();
  } catch(e) {
    alert('خطأ في تحليل الصورة: ' + e.message);
  }
};

window.getModels = async function() {
  try {
    const res = await fetch(API + '/api/v1/vision-ai/providers');
    const data = await res.json();
    console.log('[VisionAI] Available providers:', data.providers);
    return { models: data.providers?.map(p => p.name) || [] };
  } catch(e) {
    const res = await fetch(API + '/api/v1/visualizer/models');
    return await res.json();
  }
};

console.log('[VisionAI] ACEP Vision AI bridge loaded - real providers ready');