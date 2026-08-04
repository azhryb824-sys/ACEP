const { getLogger } = require('./logger');
const { ImageProviderLayer, ImageGenerationError } = require('./image-provider-layer');
const { VideoProviderLayer } = require('./video-provider-layer');
const ProjectVisualIdentity = require('./project-visual-identity');
const ImageGenerationEngine = require('./image-generation-engine');
const VideoGenerationEngine = require('./video-generation-engine');
const ComputerVisionEngine = require('./computer-vision-engine');
const ComparisonEngine = require('./comparison-engine');

class AIProjectVisualizer {
  constructor() {
    this.logger = getLogger({ service: 'AI-Visualization', level: 'info', enableConsole: true, enableFile: false });
    
    this.identity = new ProjectVisualIdentity();
    this.imageProviderLayer = new ImageProviderLayer();
    this.imageProviderLayer.setLogger(this.logger);
    this.videoProviderLayer = new VideoProviderLayer();
    this.videoProviderLayer.setLogger(this.logger);
    
    this.images = new ImageGenerationEngine();
    this.videos = new VideoGenerationEngine();
    this.vision = new ComputerVisionEngine();
    this.comparison = new ComparisonEngine();
    
    this.sessions = new Map();
    this.generationHistory = [];
    this.userFeedback = new Map();
  }

  // ==================== Session Management ====================
  
  createSession(projectParams) {
    const sessionId = "VIZ-" + Math.random().toString(36).substr(2, 9);
    const session = {
      id: sessionId,
      projectParams,
      visualIdentity: this.identity.generate(projectParams),
      createdAt: new Date().toISOString(),
      generatedImages: [],
      generatedVideos: [],
      concepts: [],
      approvedDesigns: [],
      rejectedDesigns: [],
      userFeedback: [],
    };
    this.sessions.set(sessionId, session);
    this.logger.info(`Created visualizer session ${sessionId} for project ${projectParams.type}`, {
      sessionId,
      projectType: projectParams.type
    });
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  getAllSessions() {
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      projectParams: s.projectParams,
      createdAt: s.createdAt,
      imageCount: s.generatedImages.length,
      videoCount: s.generatedVideos.length
    }));
  }

  // ==================== Image Generation ====================
  
  async generateImage(sessionId, params) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    
    this.logger.info(`Generating image for session ${sessionId}`, { phase: params.phase, imageType: params.imageType });
    
    try {
      // Use the image provider layer for actual generation
      const result = await this.imageProviderLayer.generateImage(
        this._buildPrompt(params),
        {
          width: 1024,
          height: 768,
          style: params.style,
          phase: params.phase,
          imageType: params.imageType
        }
      );

      const imageData = {
        id: "IMG-" + Math.random().toString(36).substr(2, 12),
        sessionId,
        phase: params.phase || "Generated",
        imageType: params.imageType || "front",
        viewType: "Professional Architectural Visualization",
        width: 1024,
        height: 768,
        elements: this._generateElements(params.phase),
        materials: this._generateMaterials(params.style),
        equipment: [],
        colors: ["#FFFFFF", "#F5F5F5", "#E0E0E0"],
        lighting: this._getLightingConditions(params),
        prompt: this._buildPrompt(params),
        imageUrl: result.imageUrl,
        imageData: result.imageData,
        metadata: {
          model: result.metadata?.model || 'unknown',
          provider: result.provider,
          generatedAt: new Date().toISOString(),
          style: params.style || "Contemporary"
        }
      };
      
      session.generatedImages.push(imageData);
      this.generationHistory.push(imageData);
      
      this.logger.info(`Image generated successfully for session ${sessionId}`, { imageId: imageData.id });
      return imageData;
    } catch (error) {
      this.logger.error(`Image generation failed for session ${sessionId}`, { error: error.message });
      throw new Error(`Image generation failed: ${error.message}`);
    }
  }

  async generateMultipleConcepts(sessionId, count = 5, params = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    
    this.logger.info(`Generating ${count} concepts for session`, { sessionId, count });
    
    const concepts = [];
    for (let i = 1; i <= count; i++) {
      const conceptParams = { ...params, conceptNumber: i, variation: `concept_${i}` };
      try {
        const image = await this.generateImage(sessionId, { ...params, variant: i });
        concepts.push({
          conceptNumber: i,
          imageUrl: image.imageUrl,
          imageData: image.imageData,
          prompt: image.prompt,
          style: params.style || 'Contemporary',
          metadata: image.metadata
        });
      } catch (error) {
        this.logger.error(`Failed to generate concept ${i}`, { error: error.message });
        concepts.push({ conceptNumber: i, error: error.message });
      }
    }
    session.concepts = concepts;
    return concepts;
  }

  async generateInterior(sessionId, roomType, style) {
    return this.generateImage(sessionId, { 
      phase: 'Interior', 
      imageType: 'interior', 
      roomType, 
      style: style || 'Contemporary' 
    });
  }

  async generateExterior(sessionId, params) {
    return this.generateImage(sessionId, { 
      phase: 'Exterior', 
      imageType: params.view || 'front', 
      ...params 
    });
  }

  async generateDrone(sessionId, params) {
    return this.generateImage(sessionId, { 
      phase: 'Drone', 
      imageType: 'drone', 
      ...params 
    });
  }

  // ==================== Video Generation ====================
  
  async generateVideo(sessionId, videoType, params = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    
    this.logger.info(`Generating video for session`, { sessionId, videoType });
    
    try {
      const prompt = this._buildPrompt({ ...params, scene: videoType });
      const videoResult = await this.videoProviderLayer.generateVideo(prompt, {
        duration: params.duration || 30,
        fps: params.fps || 10,
        resolution: params.resolution || '1080p'
      });
      
      const video = this.videos.generateWalkthrough(session.visualIdentity, { 
        duration: params.duration || 30,
        fps: params.fps || 10 
      });
      
      video.url = videoResult.videoUrl || video.url;
      video.videoData = videoResult.videoData;
      video.provider = videoResult.provider;
      
      session.generatedVideos.push(video);
      this.logger.info(`Video generated for session ${sessionId}`, { videoId: video.id, provider: videoResult.provider });
      return video;
    } catch (error) {
      this.logger.error(`Video generation failed for session ${sessionId}`, { error: error.message });
      
      const video = this.videos.generateWalkthrough(session.visualIdentity, { 
        duration: params.duration || 30,
        fps: params.fps || 10 
      });
      session.generatedVideos.push(video);
      return video;
    }
  }

  // ==================== Computer Vision ====================
  
  analyzeImage(imageData) {
    return this.vision.analyzeImage(imageData);
  }

  analyzeRoom(imageData) {
    return this.vision.analyzeRoom(imageData);
  }

  detectChanges(imageBefore, imageAfter) {
    return this.vision.detectChanges(imageBefore, imageAfter);
  }

  // ==================== Comparison ====================
  
  compareBeforeAfter(beforeData, afterData, projectData) {
    return this.comparison.compareBeforeAfter(beforeData, afterData, projectData);
  }

  compareRealityVsPrediction(realPhoto, predictedImage, projectParams) {
    return this.comparison.compareRealityVsPrediction(realPhoto, predictedImage, projectParams);
  }

  trackProgress(imageHistory, timeline) {
    return this.comparison.trackProgress(imageHistory, timeline);
  }

  // ==================== Design Approval ====================
  
  approveDesign(sessionId, imageId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    const img = session.generatedImages.find(i => i.id === imageId);
    if (img) {
      img.approved = true;
      img.approvedAt = new Date().toISOString();
      session.approvedDesigns.push(img);
      this._recordPreference(sessionId, img, 'approved');
    }
    return img;
  }

  rejectDesign(sessionId, imageId, reason) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    const img = session.generatedImages.find(i => i.id === imageId);
    if (img) {
      img.approved = false;
      img.rejectionReason = reason;
      img.rejectedAt = new Date().toISOString();
      session.rejectedDesigns.push(img);
      this._recordPreference(sessionId, img, 'rejected');
    }
    return img;
  }

  _recordPreference(sessionId, image, action) {
    const prefs = this.userFeedback.get(sessionId) || { likes: [], dislikes: [] };
    if (action === 'approved') {
      prefs.likes.push({ style: image.style || image.metadata?.style, timestamp: new Date().toISOString() });
    } else {
      prefs.dislikes.push({ style: image.style || image.metadata?.style, reason: image.rejectionReason, timestamp: new Date().toISOString() });
    }
    this.userFeedback.set(sessionId, prefs);
  }

  getRecommendedStyle(sessionId) {
    const prefs = this.userFeedback.get(sessionId);
    if (!prefs || prefs.likes.length === 0) return 'Contemporary';
    const styleCounts = {};
    prefs.likes.forEach(l => { styleCounts[l.style] = (styleCounts[l.style] || 0) + 1; });
    return Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Contemporary';
  }

  // ==================== Models & Cost ====================
  
  getAvailableModels() {
    return this.imageProviderLayer.getAvailableProviders();
  }

  estimateCost(modelName, imageType, params) {
    return this.imageProviderLayer.estimateCost({ modelName, imageType, ...params });
  }

  // ==================== BOQ Integration ====================
  
  generateBOQImpactReport(sessionId, materialChanges) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const impacts = [];
    for (const change of materialChanges) {
      const impact = {
        change,
        boqImpact: `تغيير ${change.from} → ${change.to}`,
        costDelta: Math.round((Math.random() * 0.4 + 0.8) * (change.quantity || 100)),
        scheduleDelta: Math.round(Math.random() * 5 + 1),
        supplierImpact: change.from !== change.to ? 'تغيير الموردين ضروري' : 'لا تغيير',
        riskLevel: change.from !== change.to ? 'medium' : 'low',
      };
      impacts.push(impact);
    }

    return {
      sessionId,
      materialChanges: impacts,
      totalCostImpact: impacts.reduce((s, i) => s + i.costDelta, 0),
      totalScheduleImpact: Math.max(...impacts.map(i => i.scheduleDelta)),
      recommendation: impacts.length > 2 ? 'يوصى بمراجعة تأثير التغييرات قبل الاعتماد' : 'تأثير التغييرات محدود',
    };
  }

  // ==================== Helpers ====================
  
  _buildPrompt(params) {
    const scene = params.scene || "architectural visualization";
    const style = params.style || "contemporary";
    const phase = params.phase || "construction";
    return `Photorealistic ${scene} of a ${style} building during ${phase} phase, architectural rendering, 8K, professional lighting, detailed textures, cinematic quality`;
  }

  _generateElements(phase) {
    const elementsMap = {
      "Excavation": ["excavators", "dump trucks", "workers", "barriers"],
      "Foundation": ["concrete pumps", "reinforcement steel", "workers", "formwork"],
      "Columns": ["cranes", "formwork", "reinforcement", "concrete pumps"],
      "Structure": ["steel beams", "concrete", "workers", "scaffolding"],
      "Walls": ["bricks", "mortar", "workers", "scaffolding"],
      "Finishing": ["tiles", "paint", "workers", "equipment"],
    };
    return elementsMap[phase] || ["construction materials", "workers", "equipment"];
  }

  _generateMaterials(style) {
    const materialsMap = {
      "Luxury": ["marble", "granite", "aluminum", "custom fixtures"],
      "Minimal": ["concrete", "steel", "glass", "minimal finishes"],
      "Industrial": ["reinforced concrete", "steel", "bricks", "industrial fixtures"],
      "Contemporary": ["composite", "aluminum", "painted steel", "modern finishes"],
    };
    return materialsMap[style] || ["standard materials"];
  }

  _getLightingConditions(params) {
    const time = params.timeOfDay || "day";
    return {
      natural: time === "night" ? 0.3 : 0.9,
      artificial: time === "night" ? 0.7 : 0.3,
      intensity: 1.0,
      temperature: 4000,
    };
  }

  _generateMockImageUrl(params) {
    const seed = Math.random().toString(36).substr(2, 8);
    return `https://picsum.photos/seed/${seed}/1024/768`;
  }

  _generateMockImageData(params) {
    const seed = Math.random().toString(36).substr(2, 8);
    return `data:image/png;base64,${seed}mockimage`;
  }
}

module.exports = AIProjectVisualizer;