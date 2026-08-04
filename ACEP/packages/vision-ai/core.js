const ImageGenerationEngine = require('./engines/image-engine');
const VideoGenerationEngine = require('./engines/video-engine');
const ModelAbstractionLayer = require('./model-abstraction');
const BackgroundQueue = require('./queue/background-queue');
const GalleryEngine = require('./gallery/gallery-engine');
const TrainingCollector = require('./training/training-collector');
const StorageEngine = require('./storage-engine');
const Database = require('./database/db');
const { getLogger } = require('./logger');

const LOGGER = getLogger({ service: 'VisionAI-Core' });

class VisionAICore {
  constructor(options) {
    this.promptBridge = (options && options.promptBridge) || null;
    this.images = new ImageGenerationEngine(this.promptBridge);
    this.videos = new VideoGenerationEngine();
    this.models = new ModelAbstractionLayer();
    this.initialized = false;
  }

  setPromptBridge(bridge) {
    this.promptBridge = bridge;
    this.images.promptBridge = bridge;
    LOGGER.info('Prompt-Vision Bridge attached');
  }

  async initialize() {
    if (this.initialized) return;
    StorageEngine.initialize();
    await Database.initialize();
    this.initialized = true;
    LOGGER.info('ACEP Vision AI initialized');
  }

  async createProject(params) {
    await this.initialize();
    const id = StorageEngine.generateId();
    const stmt = Database.prepare(`
      INSERT INTO vision_projects (id, name, description, project_type, project_params)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      params.name || `${params.type || 'Project'} Vision`,
      params.description || `${params.type || 'Project'} visualization project`,
      params.type || 'general',
      JSON.stringify(params)
    );
    LOGGER.info(`Vision project created: ${id}`);
    return { projectId: id, ...params };
  }

  async generateImage(projectId, projectParams, options = {}) {
    await this.initialize();
    const generationId = StorageEngine.generateId();
    const hasUPM = !!(options.upm);

    const jobId = BackgroundQueue.enqueue({
      id: generationId,
      type: 'image',
      priority: options.priority || 5,
      data: { projectId, projectParams, options },
      handler: async (data, progress) => {
        progress(10, 'بدء توليد الصورة');
        const result = await this.images.generate(data.projectId, data.projectParams, data.options);
        progress(80, 'حفظ النتيجة');
        const galleryId = await GalleryEngine.addEntry(
          generationId, projectId, 'image', result,
          {
            title: result.phase,
            description: result.prompt?.substring(0, 200),
            tags: [result.phase, result.provider, hasUPM ? 'upm' : 'legacy'].filter(Boolean),
            ...(result.upmSummary ? { upmSummary: result.upmSummary } : {}),
          }
        );
        progress(100, 'اكتمل التوليد');
        return { ...result, galleryId };
      },
    });

    return {
      generationId,
      jobId,
      projectId,
      status: 'queued',
      message: 'تمت إضافة المهمة إلى قائمة الانتظار',
      estimatedTime: '30-60 ثانية',
    };
  }

  async generateVideo(projectId, projectParams, videoType, options = {}) {
    await this.initialize();
    const generationId = StorageEngine.generateId();

    const jobId = BackgroundQueue.enqueue({
      id: generationId,
      type: 'video',
      priority: options.priority || 3,
      data: { projectId, projectParams, videoType, options },
      handler: async (data, progress) => {
        progress(10, 'بدء توليد الفيديو');
        const result = await this.videos.generate(data.projectId, data.projectParams, data.videoType, data.options);
        progress(80, 'حفظ النتيجة');
        const galleryId = await GalleryEngine.addEntry(
          generationId, projectId, 'video', result,
          { title: `${videoType} video`, description: result.prompt?.substring(0, 200) }
        );
        progress(100, 'اكتمل التوليد');
        return { ...result, galleryId };
      },
    });

    return {
      generationId,
      jobId,
      projectId,
      videoType,
      status: 'queued',
      message: 'تمت إضافة الفيديو إلى قائمة الانتظار',
      estimatedTime: '2-5 دقائق',
    };
  }

  async generateConcepts(projectId, projectParams, count = 5, options = {}) {
    await this.initialize();
    return this.images.generateConcepts(projectId, projectParams, count, options);
  }

  async generateBeforeAfter(projectId, projectParams, options = {}) {
    await this.initialize();
    return this.images.generateBeforeAfter(projectId, projectParams, options);
  }

  async generatePhaseSequence(projectId, projectParams, phases = null) {
    await this.initialize();
    return this.images.generatePhaseSequence(projectId, projectParams, phases);
  }

  async getGenerationStatus(generationId) {
    const job = BackgroundQueue.getJob(generationId);
    if (job) {
      const result = {
        id: generationId,
        status: job.status,
        progress: job.progress,
        progressMessage: job.progressMessage,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      };
      if (job.result) {
        result.imageUrl = job.result.url || null;
        result.projectId = job.result.projectId || job.data?.projectId || null;
        result.thumbnailUrl = job.result.thumbnailUrl || null;
        result.generationId = job.result.generationId || null;
        result.image = job.result.image || null;
      }
      return result;
    }
    const dbResult = Database.prepare('SELECT * FROM vision_generations WHERE id = ?').get(generationId);
    const out = dbResult || { id: generationId, status: 'unknown', errorMessage: 'لم يتم العثور على المهمة' };
    if (dbResult) {
      out.imageUrl = dbResult.url || null;
      out.projectId = dbResult.project_id || null;
    }
    return out;
  }

  getProviders() {
    return this.models.getAvailableProviders();
  }

  async getGallery(projectId, type = null) {
    return GalleryEngine.listByProject(projectId, type);
  }

  async getStats() {
    return {
      gallery: await GalleryEngine.getStats(),
      training: await TrainingCollector.getTrainingStats(),
      queue: BackgroundQueue.getQueueStatus(),
      providers: this.getProviders(),
    };
  }

  async approveGeneration(galleryId) {
    await GalleryEngine.approve(galleryId);
    const entry = await GalleryEngine.getById(galleryId);
    if (entry) {
      await TrainingCollector.recordApproval(galleryId, entry.project_id, entry.type, {
        prompt: entry.description,
        approvedBy: 'user',
      });
    }
    return { success: true, galleryId };
  }
}

module.exports = new VisionAICore();