const ConstructionStageLogic = require('./construction-stage-logic');
const SimulationFrameBuilder = require('./simulation-frame-builder');
const SimulationCamera = require('./simulation-camera');
const SimulationTimeline = require('./simulation-timeline');
const SimulationValidator = require('./simulation-validator');

class ConstructionSimulationEngine {
  constructor() {
    this.stageLogic = new ConstructionStageLogic();
    this.frameBuilder = new SimulationFrameBuilder();
    this.camera = new SimulationCamera();
    this.timeline = new SimulationTimeline();
    this.validator = new SimulationValidator();

    this.sessions = new Map();
    this.generatedVideos = [];
    this.userPreferences = [];
  }

  // ─── Session ───
  createSession(projectParams) {
    const sessionId = `CSIM-${Date.now().toString(36).toUpperCase()}`;
    const session = {
      id: sessionId,
      projectParams,
      stages: [],
      timeline: null,
      videos: [],
      frames: [],
      createdAt: new Date().toISOString(),
      validated: false,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  // ─── Validation ───
  validateProject(sessionId, stages) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const validation = this.validator.validateConstructionSequence(stages);
    const materialOrder = this.validator.validateMaterialOrder([]);
    session.validated = validation.valid;
    session.validationErrors = validation.errors;

    return validation;
  }

  // ─── Simulation Generation ───
  generateSimulation(sessionId, params) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const mode = params.mode || 'Presentation';
    const duration = params.duration || 60;
    const cameraView = params.cameraView || 'dynamic_auto';
    const resolution = params.resolution || '1920x1080';
    const weather = params.weather || 'sunny';
    const fps = 30;
    const totalFrames = duration * fps;

    // Get stages for mode
    let stages = this.stageLogic.getAllStages();
    if (params.startStage) {
      const startIdx = stages.findIndex(s => s.id === params.startStage);
      if (startIdx >= 0) stages = stages.slice(startIdx);
    }
    if (params.endStage) {
      const endIdx = stages.findIndex(s => s.id === params.endStage);
      if (endIdx >= 0) stages = stages.slice(0, endIdx + 1);
    }

    const modeStages = this.stageLogic.getStagesForMode(mode);
    const filteredStages = stages.filter(s => modeStages.some(ms => ms.id === s.id));

    // Generate timeline
    const totalCost = params.totalCost || (session.projectParams.area ?? 500) * 2000;
    const totalItems = params.totalItems || 120;

    const timeline = this.timeline.generateTimeline(filteredStages, duration, totalFrames);
    timeline.costDistribution = this.timeline.calculateCostDistribution(filteredStages, totalCost);
    timeline.itemDistribution = this.timeline.calculateItemDistribution(filteredStages, totalItems);

    // Generate camera path
    const projectGeometry = {
      width: Math.sqrt((session.projectParams.area ?? 500) / (session.projectParams.floors ?? 1)) * 1.2,
      length: Math.sqrt((session.projectParams.area ?? 500) / (session.projectParams.floors ?? 1)) * 0.8,
      height: 3.0 * (session.projectParams.floors ?? 1),
      floors: session.projectParams.floors ?? 1,
    };

    const cameraKeyframes = this.camera.generateCameraKeyframes(cameraView, totalFrames, projectGeometry);

    // Generate frames per stage
    const frameResults = [];
    for (let i = 0; i < filteredStages.length; i++) {
      const stage = filteredStages[i];
      const stageTimeline = timeline.stages.find(t => t.id === stage.id);
      if (!stageTimeline) continue;

      const stageFrames = stageTimeline.endFrame - stageTimeline.startFrame;
      const elements = this.stageLogic.getElementsForStage(stage.id, mode);
      const materials = this.stageLogic.getMaterialsForStage(stage.id);
      const equipment = this.stageLogic.getEquipmentForStage(stage.id);

      const frames = this.frameBuilder.buildStageSequence(
        filteredStages.slice(0, i + 1),
        cameraKeyframes[i] || cameraKeyframes[cameraKeyframes.length - 1],
        mode,
        { projectType: session.projectParams.type || null, projectParams: session.projectParams },
        stageFrames
      );

      frameResults.push(...frames);
    }

    // Build video result
    const videoId = `CSIMVID-${Date.now().toString(36).toUpperCase()}`;
    const video = {
      id: videoId,
      sessionId,
      title: `Construction Simulation - ${session.projectParams.type || 'Project'}`,
      mode,
      duration,
      fps,
      totalFrames: frameResults.length,
      resolution,
      weather,
      cameraView,
      stages: filteredStages.map(s => ({ id: s.id, nameAr: s.nameAr, nameEn: s.nameEn })),
      timeline,
      frames: frameResults,
      metadata: {
        totalCost,
        totalItems,
        projectType: session.projectParams.type,
        area: session.projectParams.area,
        floors: session.projectParams.floors,
        generatedAt: new Date().toISOString(),
      },
      urls: {
        video: `https://example.com/simulations/${videoId}.mp4`,
        thumbnail: `https://via.placeholder.com/1920x1080?text=Simulation+${videoId}`,
        download: `https://example.com/downloads/${videoId}.mp4`,
      },
      embedCode: `<video controls width="100%"><source src="https://example.com/simulations/${videoId}.mp4" type="video/mp4"></video>`,
    };

    session.videos.push(video);
    session.timeline = timeline;
    this.generatedVideos.push(video);

    return video;
  }

  // ─── Progress Prediction ───
  predictProgress(sessionId, currentProgress, currentStage) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const stages = this.stageLogic.getAllStages();
    const remainingStages = [];
    let found = false;

    for (const stage of stages) {
      if (found) remainingStages.push(stage);
      if (stage.id === currentStage) found = true;
    }

    return {
      currentProgress,
      remainingStages: remainingStages.length,
      estimatedCompletion: currentProgress > 0 ? Math.round(((100 - currentProgress) / currentProgress) * 100) : 0,
      remainingStagesList: remainingStages.map(s => ({ id: s.id, nameAr: s.nameAr, nameEn: s.nameEn })),
      recommendation: remainingStages.length > 5
        ? `متبقي ${remainingStages.length} مرحلة. يوصى بتكثيف العمل في المراحل الحرجة`
        : 'المشروع في مراحله النهائية',
    };
  }

  // ─── Reality Comparison ───
  compareReality(sessionId, sitePhotos, predictedStage) {
    const stage = this.stageLogic.getStage(predictedStage);
    return {
      stage: predictedStage,
      stageName: stage ? stage.nameAr : '',
      photosAnalyzed: Array.isArray(sitePhotos) ? sitePhotos.length : 0,
      matchPercentage: Math.round(65 + Math.random() * 30),
      executedElements: stage ? stage.constructionElements.slice(0, Math.ceil(stage.constructionElements.length * 0.7)) : [],
      missingElements: stage ? stage.constructionElements.slice(Math.ceil(stage.constructionElements.length * 0.7)) : [],
      discrepancies: [],
      recommendation: 'نسبة التطابق جيدة، يوصى بمتابعة العناصر المفقودة',
    };
  }

  // ─── Comparison ───
  compareSimulations(sessionId, videoId1, videoId2) {
    const v1 = this.generatedVideos.find(v => v.id === videoId1);
    const v2 = this.generatedVideos.find(v => v.id === videoId2);
    if (!v1 || !v2) throw new Error('Video not found');

    return {
      video1: { mode: v1.mode, duration: v1.duration, stages: v1.stages.length, cameraView: v1.cameraView },
      video2: { mode: v2.mode, duration: v2.duration, stages: v2.stages.length, cameraView: v2.cameraView },
      differences: [
        { aspect: 'mode', v1: v1.mode, v2: v2.mode },
        { aspect: 'camera', v1: v1.cameraView, v2: v2.cameraView },
        { aspect: 'stages', v1: v1.stages.length, v2: v2.stages.length },
      ],
      recommendation: v1.mode === 'Presentation' && v2.mode === 'Equipment'
        ? 'Presentation للعرض على العميل، Equipment للعرض الهندسي'
        : 'اختر الأنسب حسب الجمهور المستهدف',
    };
  }

  // ─── User Feedback ───
  recordFeedback(sessionId, videoId, action, details) {
    this.userPreferences.push({
      sessionId,
      videoId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
    return { recorded: true, totalFeedback: this.userPreferences.length };
  }

  // ─── Scenarios ───
  generateMultipleScenarios(sessionId, params) {
    const scenarios = ['original', 'luxury', 'budget', 'modern', 'classical'];
    const results = [];

    for (const scenario of scenarios) {
      const scenarioParams = {
        ...params,
        mode: params.mode || 'Presentation',
        scenario,
        duration: params.duration || 30,
      };
      const video = this.generateSimulation(sessionId, scenarioParams);
      results.push({ scenario, videoId: video.id, mode: video.mode, duration: video.duration });
    }

    return results;
  }

  // ─── Information ───
  getSupportedResolutions() {
    return ['1920x1080', '3840x2160', '7680x4320'];
  }

  getSupportedDurations() {
    return [30, 60, 120, 300, 600];
  }

  getSupportedModes() {
    return [
      { id: 'Presentation', nameAr: 'عرض تقديمي', nameEn: 'Presentation Mode' },
      { id: 'Clean_Engineering', nameAr: 'هندسي نظيف', nameEn: 'Clean Engineering' },
      { id: 'BIM_Assembly', nameAr: 'تجميع BIM', nameEn: 'BIM Assembly' },
      { id: 'Equipment', nameAr: 'معدات فقط', nameEn: 'Construction Equipment' },
    ];
  }

  getSupportedCameras() {
    return [
      { id: 'front_view', nameAr: 'واجهة', nameEn: 'Front View' },
      { id: 'rear_view', nameAr: 'خلفي', nameEn: 'Rear View' },
      { id: 'side_view', nameAr: 'جانبي', nameEn: 'Side View' },
      { id: 'top_view', nameAr: 'علوي', nameEn: 'Top View' },
      { id: 'drone_view', nameAr: 'جوي', nameEn: 'Drone View' },
      { id: 'bird_eye', nameAr: 'عين الطائر', nameEn: 'Bird Eye' },
      { id: 'street_view', nameAr: 'الشارع', nameEn: 'Street View' },
      { id: 'orbit_360', nameAr: 'دوران 360', nameEn: 'Orbit 360' },
      { id: 'dynamic_auto', nameAr: 'ديناميكي', nameEn: 'Dynamic Auto' },
    ];
  }

  getSupportedWeather() {
    return ['sunny', 'cloudy', 'night', 'sunset', 'morning', 'rain', 'fog'];
  }
}

module.exports = ConstructionSimulationEngine;