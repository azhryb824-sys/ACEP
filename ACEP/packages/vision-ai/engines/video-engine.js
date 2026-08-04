const { getLogger } = require('../logger');
const ModelAbstractionLayer = require('../model-abstraction');
const StorageEngine = require('../storage-engine');

const LOGGER = getLogger({ service: 'VisionAI-VideoEngine' });

class VideoGenerationEngine {
  constructor() {
    this.models = new ModelAbstractionLayer();
  }

  buildPrompt(projectParams, videoType, options = {}) {
    const type = projectParams.type || null;
    const style = projectParams.style || 'Contemporary';
    const city = projectParams.city || 'الرياض';

    const prompts = {
      walkthrough: `Cinematic walkthrough video of a ${style} ${type} in ${city}, smooth camera movement through interior spaces, professional real estate video, natural lighting, high quality`,
      exterior: `Aerial cinematic video of a ${style} ${type} building exterior in ${city}, drone shot, smooth orbit around building, professional architectural video, golden hour lighting`,
      timelapse: `Construction time-lapse video of a ${style} ${type} being built, from foundation to completion, fast forward effect, construction progress, dynamic evolution`,
      beforeAfter: `Split screen transformation video showing before and after of a ${style} ${type} construction project, renovation reveal, dramatic transition`,
      simulation: `3D construction simulation video of a ${style} ${type}, building information modeling, BIM visualization, structural animation, engineering visualization`,
      interior: `Smooth interior walkthrough video of a ${style} home, room to room transition, luxury interior design showcase, professional real estate tour`,
      drone: `Professional drone aerial video of a ${style} ${type} in ${city}, cinematic flyover, bird's eye view, 4K aerial cinematography`,
      animation: `Architectural animation of a ${style} ${type}, 3D model rotation, wireframe to solid transition, design visualization`,
    };

    return prompts[videoType] || prompts.walkthrough;
  }

  async generate(projectId, projectParams, videoType = 'walkthrough', options = {}) {
    const provider = options.provider || this.models.getDefaultProvider('video');
    const prompt = this.buildPrompt(projectParams, videoType, options);

    LOGGER.info(`Generating ${videoType} video for project ${projectId}`, { provider });

    try {
      const result = await this.models.generateWithFallback(prompt, {
        duration: options.duration || 30,
        fps: options.fps || 24,
        resolution: options.resolution || '1080p',
        ...options,
      }, 'video', provider);

      const storageResult = result.videoBuffer
        ? StorageEngine.saveVideo(projectId, result.videoBuffer.substring(0, 16), result.videoBuffer, 'mp4')
        : { url: result.videoUrl || null };

      return {
        success: true,
        generationId: StorageEngine.generateId(),
        videoType,
        prompt,
        duration: options.duration || 30,
        ...result,
        ...storageResult,
        provider: result.provider || provider,
      };
    } catch (error) {
      LOGGER.warn(`Video generation via provider failed: ${error.message}. Building frame sequence instead.`);
      return this._buildFrameSequence(projectId, projectParams, videoType, options);
    }
  }

  async _buildFrameSequence(projectId, projectParams, videoType, options = {}) {
    const frames = options.frameCount || 30;
    const imageEngine = new (require('./image-engine'))();
    const phaseSteps = ['Excavation', 'Foundations', 'Columns', 'Walls', 'Roof', 'Finishes', 'Landscape', 'Completed'];
    const frameResults = [];

    for (let i = 0; i < Math.min(frames, phaseSteps.length); i++) {
      try {
        const img = await imageEngine.generate(projectId, projectParams, {
          phase: phaseSteps[i],
          additional: `Frame ${i + 1} of construction sequence for video timelapse`,
        });
        frameResults.push({ frame: i + 1, phase: phaseSteps[i], imageBuffer: img.imageBuffer });
      } catch (e) {
        frameResults.push({ frame: i + 1, error: e.message });
      }
    }

    return {
      success: frameResults.some(f => !f.error),
      generationId: StorageEngine.generateId(),
      videoType,
      frames: frameResults,
      frameCount: frameResults.length,
      duration: options.duration || 15,
      metadata: { note: 'Frame sequence generated. Use ffmpeg to compile into video.' },
    };
  }

  async generateConstructionTimelapse(projectId, projectParams, options = {}) {
    return this.generate(projectId, projectParams, 'timelapse', {
      duration: options.duration || 60,
      ...options,
    });
  }

  async generateWalkthrough(projectId, projectParams, options = {}) {
    return this.generate(projectId, projectParams, 'walkthrough', {
      duration: options.duration || 30,
      ...options,
    });
  }

  async generateDroneFlyover(projectId, projectParams, options = {}) {
    return this.generate(projectId, projectParams, 'drone', {
      duration: options.duration || 45,
      ...options,
    });
  }
}

module.exports = VideoGenerationEngine;