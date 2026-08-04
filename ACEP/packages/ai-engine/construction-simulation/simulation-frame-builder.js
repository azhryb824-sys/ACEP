const ConstructionStageLogic = require('./construction-stage-logic');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MODE_CONFIG = {
  Presentation: {
    hideEquipment: true,
    hideWorkers: true,
    label: 'عرض تقديمي',
    description: 'Presentation view with aesthetic focus',
  },
  Clean_Engineering: {
    hideEquipment: true,
    hideWorkers: true,
    structuralOnly: true,
    label: 'هندسة إنشائية',
    description: 'Structural engineering elements only',
  },
  BIM_Assembly: {
    showDetails: true,
    showConnections: true,
    label: 'تجميع BIM',
    description: 'Detailed BIM assembly with connections',
  },
  Equipment: {
    equipmentOnly: true,
    label: 'معدات',
    description: 'Equipment and machinery view',
  },
};

const PROGRESSION_DESCRIPTORS = {
  Excavation: [
    { progress: 0.0, desc: 'Marking excavation area' },
    { progress: 0.2, desc: 'Starting excavation - shallow cut' },
    { progress: 0.4, desc: 'Excavation in progress - mid depth' },
    { progress: 0.6, desc: 'Deep excavation reaching target depth' },
    { progress: 0.8, desc: 'Final shaping of excavation pit' },
    { progress: 1.0, desc: 'Excavation complete - ready for foundations' },
  ],
  Foundations: [
    { progress: 0.0, desc: 'Setting out foundation lines' },
    { progress: 0.2, desc: 'Blinding layer poured' },
    { progress: 0.4, desc: 'Reinforcement cage in progress' },
    { progress: 0.6, desc: 'Formwork installed' },
    { progress: 0.8, desc: 'Concrete pouring in progress' },
    { progress: 1.0, desc: 'Foundations complete - curing' },
  ],
  Columns: [
    { progress: 0.0, desc: 'Marking column positions' },
    { progress: 0.2, desc: 'Column reinforcement emerging' },
    { progress: 0.4, desc: 'Formwork assembled around reinforcement' },
    { progress: 0.6, desc: 'Concrete poured - column rising' },
    { progress: 0.8, desc: 'Formwork removal - columns visible' },
    { progress: 1.0, desc: 'All columns complete' },
  ],
  Beams: [
    { progress: 0.0, desc: 'Beam layout preparation' },
    { progress: 0.2, desc: 'Beam reinforcement tied' },
    { progress: 0.4, desc: 'Formwork in place' },
    { progress: 0.6, desc: 'Concrete pouring beams' },
    { progress: 0.8, desc: 'Curing in progress' },
    { progress: 1.0, desc: 'Beams complete and cured' },
  ],
  Slabs: [
    { progress: 0.0, desc: 'Slab formwork scaffolding' },
    { progress: 0.2, desc: 'Formwork deck installed' },
    { progress: 0.4, desc: 'Reinforcement mesh laid' },
    { progress: 0.6, desc: 'Concrete pouring slab' },
    { progress: 0.8, desc: 'Slab curing and finishing' },
    { progress: 1.0, desc: 'Slab complete - floor ready' },
  ],
  Walls: [
    { progress: 0.0, desc: 'Wall layout marked' },
    { progress: 0.2, desc: 'First block courses laid' },
    { progress: 0.4, desc: 'Walls rising - midway' },
    { progress: 0.6, desc: 'Reinforcement and grouting' },
    { progress: 0.8, desc: 'Walls nearing full height' },
    { progress: 1.0, desc: 'All walls complete' },
  ],
};

const DEFAULT_PROGRESSION = [
  { progress: 0.0, desc: 'Starting stage' },
  { progress: 0.2, desc: 'Stage in early progress' },
  { progress: 0.4, desc: 'Stage advancing' },
  { progress: 0.6, desc: 'Stage halfway complete' },
  { progress: 0.8, desc: 'Stage nearly complete' },
  { progress: 1.0, desc: 'Stage complete' },
];

class SimulationFrameBuilder {
  constructor() {
    this.stageLogic = new ConstructionStageLogic();
  }

  buildFrame(stage, progress, camera, mode, projectIdentity, frameNumber) {
    const stageObj = typeof stage === 'string' ? this.stageLogic.getStage(stage) : stage;
    if (!stageObj) throw new Error(`Stage not found: ${stage}`);

    const modeCfg = MODE_CONFIG[mode] || MODE_CONFIG.Presentation;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const totalStages = this.stageLogic.getAllStages();
    const completedWeight = totalStages
      .filter(s => s.order < stageObj.order)
      .reduce((sum, s) => sum + s.progressWeight, 0);
    const currentWeight = stageObj.progressWeight * clampedProgress;
    const overallProgress = Math.min(100, (completedWeight + currentWeight) / totalStages.reduce((sum, s) => sum + s.progressWeight, 0) * 100);

    const cumulativeElements = this._getCumulativeElementsForFrame(stageObj, clampedProgress, mode, modeCfg);
    const activeMaterials = this.stageLogic.getActiveMaterialsAtStage(stageObj.id);
    const activeEquipment = modeCfg.hideEquipment ? [] : this._getEquipmentForFrame(stageObj, clampedProgress);

    const totalBudget = projectIdentity?.budget || 1000000;
    const costSpent = Math.round(totalBudget * overallProgress / 100);
    const costRemaining = totalBudget - costSpent;

    const allElements = cumulativeElements.length;
    const itemsCompleted = Math.round(clampedProgress * allElements);
    const itemsRemaining = allElements - itemsCompleted;

    const startDate = new Date(projectIdentity?.startDate || '2025-01-01');
    const daysElapsed = Math.round((overallProgress / 100) * (projectIdentity?.totalDays || 365));
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + daysElapsed);
    const currentMonth = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    const stageProgress = this.stageLogic.getStageProgression(stageObj.id, clampedProgress);

    const frameData = {
      frameNumber,
      stage: {
        id: stageObj.id,
        nameAr: stageObj.nameAr,
        nameEn: stageObj.nameEn,
        order: stageObj.order,
      },
      progress: {
        stage: clampedProgress,
        overall: Math.round(overallProgress * 100) / 100,
      },
      camera: {
        x: camera?.x || 0,
        y: camera?.y || 50,
        z: camera?.z || 100,
        angle: camera?.angle || 45,
      },
      mode,
      projectIdentity: projectIdentity || {},
      elements: cumulativeElements,
      materials: activeMaterials,
      equipment: activeEquipment,
      overlay: {
        progressPercentage: Math.round(overallProgress * 100) / 100,
        currentMonth,
        currentStage: `${stageObj.nameEn} | ${stageObj.nameAr}`,
        costSpent,
        costRemaining,
        itemsCompleted,
        itemsRemaining,
        confidence: this._calculateConfidence(stageObj, clampedProgress),
      },
      description: this._getDescriptiveText(stageObj, clampedProgress, mode),
      stageProgress,
      imageData: this.generateFrameImage({
        stage: stageObj,
        progress: clampedProgress,
        elements: cumulativeElements,
        materials: activeMaterials,
        mode,
        frameNumber,
        camera,
      }),
      timestamp: new Date().toISOString(),
    };

    return frameData;
  }

  buildStageSequence(stages, camera, mode, projectIdentity, totalFrames) {
    if (!Array.isArray(stages) || stages.length === 0) return [];

    const frames = [];
    const framesPerStage = Math.max(1, Math.floor(totalFrames / stages.length));
    let frameNumber = 0;

    for (const stage of stages) {
      const stageObj = typeof stage === 'string' ? this.stageLogic.getStage(stage) : stage;
      if (!stageObj) continue;

      const stageFrames = this._buildStageFrames(stageObj, framesPerStage, camera, mode, projectIdentity, frameNumber);
      frames.push(...stageFrames);
      frameNumber += stageFrames.length;
    }

    return frames;
  }

  buildProgressiveTransition(fromStage, toStage, frames, camera, mode) {
    const fromObj = typeof fromStage === 'string' ? this.stageLogic.getStage(fromStage) : fromStage;
    const toObj = typeof toStage === 'string' ? this.stageLogic.getStage(toStage) : toStage;
    if (!fromObj || !toObj) throw new Error('Invalid stage for transition');

    const transitionFrames = [];
    for (let i = 0; i < frames; i++) {
      const t = i / (frames - 1 || 1);
      const fromWeight = 1 - t;
      const toWeight = t;

      const interpolatedStage = fromWeight > 0.5 ? fromObj : toObj;
      const progress = fromWeight > 0.5 ? fromWeight : toWeight;

      const frame = this.buildFrame(interpolatedStage, progress, camera, mode, {}, i);
      frame.transition = {
        from: fromObj.id,
        to: toObj.id,
        blendFactor: t,
      };
      frame.description = `Transitioning from ${fromObj.nameEn} to ${toObj.nameEn} (${Math.round(t * 100)}%)`;
      transitionFrames.push(frame);
    }

    return transitionFrames;
  }

  generateFrameImage(frameData) {
    const { stage, progress, elements, materials, mode, frameNumber, camera } = frameData;
    const modeLabel = mode || 'Presentation';
    const colorHex = stage?.colorPalette?.[0] || '#CCCCCC';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#87CEEB"/>
      <stop offset="100%" stop-color="#E0F0FF"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${colorHex}"/>
      <stop offset="100%" stop-color="#654321"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#sky)"/>
  <rect x="0" y="600" width="1920" height="480" fill="url(#ground)"/>
  <text x="960" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="#333" font-weight="bold">${stage?.nameEn || 'Construction'} - ${modeLabel}</text>
  <text x="960" y="130" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#666">Frame ${frameNumber} | Progress ${Math.round(progress * 100)}%</text>
  <rect x="100" y="160" width="1720" height="30" rx="15" fill="#E0E0E0"/>
  <rect x="100" y="160" width="${Math.round(1720 * progress)}" height="30" rx="15" fill="#4CAF50"/>
  <text x="960" y="180" text-anchor="middle" font-family="Arial" font-size="14" fill="#FFF" font-weight="bold">${Math.round(progress * 100)}%</text>
  <text x="100" y="220" font-family="Arial" font-size="18" fill="#333" font-weight="bold">Elements: ${elements?.slice(0, 8).join(', ') || 'N/A'}${elements?.length > 8 ? '...' : ''}</text>
  <text x="100" y="250" font-family="Arial" font-size="18" fill="#555">Materials: ${materials?.slice(0, 6).map(m => m.material).join(', ') || 'N/A'}</text>
  <text x="100" y="280" font-family="Arial" font-size="18" fill="#555">Mode: ${modeLabel}</text>
  <text x="960" y="1040" text-anchor="middle" font-family="Arial" font-size="20" fill="#999">ACEP Simulation Engine | ${stage?.nameAr || ''}</text>
</svg>`;

    return Buffer.from(svg).toString('base64');
  }

  assembleFrames(frames) {
    if (!Array.isArray(frames) || frames.length === 0) {
      return { frames: [], totalFrames: 0, totalDuration: 0, fps: 10 };
    }

    const fps = 10;
    const totalFrames = frames.length;
    const totalDuration = totalFrames / fps;

    const stageBreakdown = {};
    for (const frame of frames) {
      const stageId = frame.stage?.id;
      if (stageId) {
        if (!stageBreakdown[stageId]) stageBreakdown[stageId] = 0;
        stageBreakdown[stageId]++;
      }
    }

    const firstFrame = frames[0];
    const lastFrame = frames[frames.length - 1];

    return {
      frames,
      totalFrames,
      totalDuration,
      fps,
      metadata: {
        startProgress: firstFrame?.progress?.overall || 0,
        endProgress: lastFrame?.progress?.overall || 100,
        stagesIncluded: Object.keys(stageBreakdown),
        stageFrameCounts: stageBreakdown,
        startMonth: firstFrame?.overlay?.currentMonth || null,
        endMonth: lastFrame?.overlay?.currentMonth || null,
        totalBudget: firstFrame?.overlay?.costSpent + firstFrame?.overlay?.costRemaining || 0,
        totalCostSpent: lastFrame?.overlay?.costSpent || 0,
      },
      summary: {
        from: firstFrame?.stage?.nameEn || 'Start',
        to: lastFrame?.stage?.nameEn || 'End',
        progressRange: `${Math.round(firstFrame?.progress?.overall || 0)}% → ${Math.round(lastFrame?.progress?.overall || 100)}%`,
      },
    };
  }

  _buildStageFrames(stageObj, count, camera, mode, projectIdentity, startFrameNumber) {
    const frames = [];
    for (let i = 0; i < count; i++) {
      const progress = count > 1 ? i / (count - 1) : 1;
      const interpolatedCamera = this._interpolateCamera(camera, progress);
      const frame = this.buildFrame(stageObj, progress, interpolatedCamera, mode, projectIdentity, startFrameNumber + i);
      frames.push(frame);
    }
    return frames;
  }

  _interpolateCamera(baseCamera, progress) {
    if (!baseCamera || typeof baseCamera !== 'object') {
      return { x: 0, y: 50, z: 100, angle: 45 };
    }
    const zoomIn = baseCamera.zoomIn !== false;
    const zOffset = zoomIn ? -30 * progress : 0;
    const angleVariation = Math.sin(progress * Math.PI * 2) * 5;

    return {
      x: (baseCamera.x || 0) + (baseCamera.panX || 0) * progress,
      y: ((baseCamera.y || 50) + (baseCamera.panY || 0) * progress) + 10 * progress,
      z: (baseCamera.z || 100) + zOffset,
      angle: (baseCamera.angle || 45) + angleVariation,
    };
  }

  _getCumulativeElementsForFrame(stageObj, progress, mode, modeCfg) {
    if (modeCfg.equipmentOnly) return [];
    if (modeCfg.structuralOnly) {
      return this.stageLogic.getAllStages()
        .filter(s => s.order <= stageObj.order && ['Site_Preparation', 'Excavation', 'Backfilling', 'Foundations', 'Columns', 'Beams', 'Slabs', 'Walls', 'Roof', 'Waterproofing', 'Facade'].includes(s.id))
        .reduce((acc, s) => [...acc, ...s.constructionElements], []);
    }

    const cumulative = this.stageLogic.getCumulativeElements(stageObj.id);
    const visibleCount = Math.max(1, Math.floor(progress * cumulative.length));
    return cumulative.slice(0, visibleCount);
  }

  _getEquipmentForFrame(stageObj, progress) {
    if (progress <= 0) return [];
    const equipment = [...stageObj.equipment];
    if (stageObj.equipment.length === 0) return [];

    const visibleCount = Math.max(1, Math.floor(progress * equipment.length));
    return equipment.slice(0, visibleCount).map(name => ({
      name,
      active: true,
      progress,
    }));
  }

  _calculateConfidence(stage, progress) {
    const baseConfidence = 75;
    const progressBonus = progress * 20;
    const stageComplexity = Math.min(15, stage.duration / 2);
    return Math.min(99, Math.round(baseConfidence + progressBonus - stage.dependencies.length * 2 + stageComplexity));
  }

  _getDescriptiveText(stage, progress, mode) {
    const progression = PROGRESSION_DESCRIPTORS[stage.id] || DEFAULT_PROGRESSION;
    let desc = progression[0]?.desc || `${stage.nameEn} in progress`;

    for (const step of progression) {
      if (progress >= step.progress) {
        desc = step.desc;
      }
    }

    const modeConfig = MODE_CONFIG[mode];
    if (modeConfig) {
      desc += ` | Mode: ${modeConfig.label}`;
    }

    return desc;
  }
}

module.exports = SimulationFrameBuilder;
