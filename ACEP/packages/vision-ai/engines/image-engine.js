const { getLogger } = require('../logger');
const ModelAbstractionLayer = require('../model-abstraction');
const StorageEngine = require('../storage-engine');
const { UnifiedProjectModel } = require('./unified-project-model');
const { buildFeatureMap } = require('./feature-mapper');
const { buildEngineeringPrompt, buildVerificationReport } = require('./engineering-prompt-builder');
const preGenerationVerifier = require('./pre-generation-verifier');
const postGenerationAnalyzer = require('./post-generation-analyzer');
const {
  FORBIDDEN_CONTENT,
  FORBIDDEN_TERMS_JOINED,
  FORBIDDEN_NEGATIVE,
  containsForbiddenContent,
} = require('../shared/forbidden-content');
const { detectExtension } = require('../shared/format-detection');

const LOGGER = getLogger({ service: 'VisionAI-ImageEngine' });

class ImageGenerationEngine {
  constructor(promptBridge) {
    this.models = new ModelAbstractionLayer();
    this.promptBridge = promptBridge || null;
  }

  buildPrompt(projectParams, options = {}) {
    const type = projectParams.type || null;
    const area = projectParams.area ?? null;
    const floors = projectParams.floors ?? null;
    const city = projectParams.city || null;
    const style = projectParams.style || null;
    const phase = options.phase || 'Completed';
    const viewType = options.viewType || 'front';
    const roomType = options.roomType || null;
    const description = projectParams.description || projectParams.projectDescription || null;
    const materials = projectParams.materials || projectParams.topMaterials || null;
    const structure = projectParams.structureType || projectParams.structuralSystem || null;
    const finishing = projectParams.finishing || projectParams.finishingQuality || null;
    const climate = projectParams.climate || projectParams.climateZone || null;
    const landscape = projectParams.landscapeType || projectParams.landscape || null;
    const rooms = projectParams.rooms || projectParams.spaces || null;
    const basement = projectParams.hasBasement || false;
    const roofType = projectParams.roofType || null;
    const mepSystems = projectParams.mepSystems || null;

    const parts = [];

    if (description) {
      parts.push(description.replace(/[.!]+$/, '') + '.');
    }

    parts.push(`Professional architectural ${viewType} view of a ${style || 'modern'} ${type || 'building'} in ${city || 'Saudi Arabia'}.`);

    if (area) parts.push(`Total built-up area ${area}m².`);
    if (floors) {
      const floorDesc = basement ? `${floors} floors plus basement` : `${floors} floors`;
      parts.push(`${floorDesc}.`);
    }
    if (rooms && Array.isArray(rooms) && rooms.length > 0) {
      parts.push(`Spaces include: ${rooms.slice(0, 6).join(', ')}.`);
    }

    if (materials && Array.isArray(materials) && materials.length > 0) {
      parts.push(`Construction materials: ${materials.slice(0, 8).join(', ')}.`);
    }
    if (structure) parts.push(`Structural system: ${structure}.`);
    if (roofType) parts.push(`Roof type: ${roofType}.`);
    if (finishing) parts.push(`Finishing quality: ${finishing}.`);
    if (climate) parts.push(`Climate consideration: ${climate}.`);
    if (landscape) parts.push(`Landscaping: ${landscape}.`);
    if (mepSystems && Array.isArray(mepSystems) && mepSystems.length > 0) {
      parts.push(`MEP systems: ${mepSystems.slice(0, 4).join(', ')}.`);
    }

    if (roomType) {
      parts.push(`Interior design of ${roomType.replace(/_/g, ' ')} with high-end finishes, furniture, and decor.`);
    }

    const phaseDesc = this.buildPhasePrompt(phase, projectParams);
    if (phaseDesc) parts.push(phaseDesc);

    if (phase === 'Completed' || !phase || phase === 'Finishes') {
      parts.push('Photorealistic, 8K resolution, professional architectural photography, cinematic lighting, detailed textures, ultra-detailed, award-winning architectural rendering.');
    } else {
      parts.push('Documentary construction photography style, realistic site conditions, construction equipment and materials visible, natural lighting, detailed texture of raw construction.');
    }

    if (options.additional) parts.push(options.additional);

    const prompt = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

    if (options.negative) return { prompt, negativePrompt: options.negative };
    return prompt;
  }

  buildPhasePrompt(phase, projectParams) {
    const structure = (projectParams && projectParams.structureType) || null;
    const materials = (projectParams && projectParams.materials) || null;
    const materialStr = (materials && Array.isArray(materials) && materials.length > 0) ? materials.slice(0, 4).join(', ') : '';

    const phaseDescriptions = {
      'Land': `Empty land plot, bare soil, construction site markers, survey stakes, ${materialStr ? materialStr + ' materials stacked on site' : 'preparation for construction'}. Site clearing and grading visible.`,
      'Excavation': `Excavation works, earthmoving equipment, diggers, exposed foundation trenches, soil removal, ${structure ? structure + ' foundation layout' : 'trench excavation'}. Deep excavations with shoring systems.`,
      'Foundations': `Concrete foundation works, formwork installation, reinforcement steel cages, concrete pouring operations, foundation trenches with rebar, ${materialStr ? materialStr + ' concrete mix' : 'ready-mix concrete delivery'}. Waterproofing membrane application.`,
      'Columns': `Reinforced concrete columns rising from foundations, vertical structural elements, steel formwork, tied reinforcement bars, ${structure ? structure + ' column grid' : 'column layout'}. Concrete curing process visible.`,
      'Beams': `Structural beams installation between columns, concrete beams, steel reinforcement extending from columns, horizontal structural framing, ${materialStr ? materialStr + ' beam formwork' : 'formwork in place'}. Slab edge formwork visible.`,
      'Slabs': `Concrete slab installation, floor slabs with reinforcement mesh, concrete pouring and finishing, ${materialStr ? materialStr + ' slab surface' : 'slab curing'}. Post-tensioning cables or rebar网格 visible.`,
      'Walls': `Wall construction, blockwork and masonry walls, concrete block laying, vertical reinforcement, ${structure ? structure + ' wall system' : 'load-bearing walls'}. Mortar joints, wall ties, and openings for doors and windows.`,
      'Roof': `Roof structure installation, ${(projectParams && projectParams.roofType) || 'flat'} roof deck, waterproofing membrane, thermal insulation layers, drainage system, ${materialStr ? materialStr + ' roofing' : 'roof covering'}. Parapet walls and roof accessories.`,
      'MEP': `Mechanical electrical plumbing systems installation, overhead ductwork, electrical conduit runs, plumbing pipes, HVAC equipment, ${materialStr ? materialStr + ' pipework' : 'service installations'}. Ceiling grid and MEP rough-in.`,
      'Finishes': `Interior finishing works, plastering and skim coat application, wall painting, floor tiling installation, ceiling finishes, ${materialStr ? materialStr + ' finish materials' : 'high-quality interior finishes'}. Decorative lighting and trim work.`,
      'Landscape': `Landscaping and exterior site development, garden planting, paving installation, irrigation systems, outdoor lighting, ${materialStr ? materialStr + ' hardscape materials' : 'landscape features'}. Trees, shrubs, and green areas.`,
      'Completed': `Completed building, final construction, professional architectural photography, ${structure ? structure + ' structure' : 'finished architecture'} with ${materialStr ? materialStr + ' facade' : 'high-quality facade materials'}. Landscaping, outdoor spaces, and site fully developed.`,
    };
    return phaseDescriptions[phase] || `Construction phase: ${phase.replace(/_/g, ' ')}. ${materialStr ? 'Materials: ' + materialStr + '.' : ''}`;
  }

  async generate(projectId, projectParams, options = {}) {
    const provider = options.provider || this.models.getDefaultProvider('image');
    const phase = options.phase || 'Completed';
    let fullPrompt;
    let promptRecord = null;
    let useEnginePrompt = false;
    let verificationReport = null;
    let analysisResult = null;
    let featureMap = null;
    let upm = options.upm || null;

    const hasUPM = upm && upm.projectType && upm.projectType.main;

    if (hasUPM) {
      featureMap = buildFeatureMap(upm);
      verificationReport = preGenerationVerifier.verify(upm, featureMap);

      if (!verificationReport.passed) {
        const errMsg = `Pre-generation verification failed: ${verificationReport.errors.join('; ')}`;
        LOGGER.error(errMsg);
        throw new Error(errMsg + '\n' + verificationReport.details);
      }

      const engPrompt = buildEngineeringPrompt(upm, featureMap, options);
      fullPrompt = engPrompt.prompt;
      options.negativePrompt = [options.negativePrompt, engPrompt.negativePrompt, FORBIDDEN_NEGATIVE].filter(Boolean).join(', ');

      LOGGER.info(`Engineering prompt built from UPM for project ${projectId}`, {
        provider, phase, features: featureMap.features.length,
        verificationScore: verificationReport.score,
      });
    } else {
      useEnginePrompt = options.useEngineeringPrompt && this.promptBridge;
      if (useEnginePrompt) {
        const bridgeContext = {
          type: projectParams.type,
          phaseId: phase,
          finishing: projectParams.finishing || projectParams.finishingQuality,
          style: projectParams.style,
        };
        promptRecord = this.promptBridge.generatePromptForVision(bridgeContext);
        fullPrompt = promptRecord ? promptRecord.prompt : this.buildPrompt(projectParams, options);
      } else {
        const prompt = this.buildPrompt(projectParams, options);
        const phasePrompt = this.buildPhasePrompt(phase, projectParams);
        fullPrompt = `${prompt}. ${phasePrompt}`;
      }
      options.negativePrompt = [options.negativePrompt, FORBIDDEN_NEGATIVE].filter(Boolean).join(', ');
    }

    if (containsForbiddenContent(fullPrompt)) {
      LOGGER.error(`Forbidden content detected in prompt for project ${projectId}: ${fullPrompt.substring(0, 200)}`);
      throw new Error('ممنوع توليد صور تحتوي على صليب أو خمر أو تماثيل أو كنائس أو معابد أو بشر أو حيوانات');
    }

    const safePrompt = fullPrompt;
    const mergedOptions = {
      width: options.width || 1024,
      height: options.height || 768,
      steps: options.steps || 3,
      style: hasUPM ? upm.style.architectural : (projectParams.style || 'Modern'),
      phase,
      ...options,
    };

    LOGGER.info(`Generating image for project ${projectId}`, { provider, phase, imageToImage: !!options.image, hasUPM });

    if (options.image) {
      return this._generateImageToImage(projectId, projectParams, mergedOptions, safePrompt, phase, provider, useEnginePrompt, promptRecord);
    }

    const maxAttempts = hasUPM ? 3 : 1;
    let lastResult = null;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.models.generateWithFallback(safePrompt, mergedOptions, 'image', provider);

        if (!result || !result.imageBuffer) {
          throw new Error('لم يتم استلام صورة من مزود التوليد');
        }
        if (typeof result.imageBuffer === 'string' && result.imageBuffer.startsWith('<svg')) {
          throw new Error('تم استرجاع صورة SVG وهمية بدلاً من صورة حقيقية');
        }
        if (Buffer.isBuffer(result.imageBuffer) && result.imageBuffer.length < 1024) {
          throw new Error(`الصورة المولدة صغيرة جداً (${result.imageBuffer.length} بايت) - فشل التوليد`);
        }
        if (Buffer.isBuffer(result.imageBuffer)) {
          const header = result.imageBuffer.slice(0, 20).toString('utf8').toLowerCase();
          if (header.includes('<svg')) {
            throw new Error('تم استرجاع صورة SVG وهمية من المزود');
          }
        }
        if (result.prompt && containsForbiddenContent(result.prompt)) {
          throw new Error('ممنوع توليد صور تحتوي على صليب أو خمر أو تماثيل أو كنائس أو معابد أو بشر أو حيوانات');
        }

        lastResult = result;

        if (hasUPM) {
          const imageBuffer = Buffer.isBuffer(result.imageBuffer) ? result.imageBuffer : Buffer.from(result.imageBuffer, 'base64');
          analysisResult = await postGenerationAnalyzer.analyze(imageBuffer, upm, featureMap, { attempt });

          if (analysisResult.passed) {
            LOGGER.info(`Image analysis PASSED (attempt ${attempt}): ${analysisResult.score}%`);
            break;
          } else if (attempt < maxAttempts) {
            LOGGER.warn(`Image analysis FAILED (attempt ${attempt}): ${analysisResult.score}%. Retrying with adjusted prompt...`);
            continue;
          } else {
            LOGGER.warn(`Image analysis FAILED after ${maxAttempts} attempts. Using last result.`);
          }
        }
        break;
      } catch (e) {
        lastError = e;
        if (attempt >= maxAttempts) throw e;
        LOGGER.warn(`Attempt ${attempt} failed: ${e.message}. Retrying...`);
      }
    }

    if (!lastResult) throw lastError || new Error('All generation attempts failed');

    const imageBuffer = Buffer.isBuffer(lastResult.imageBuffer) ? lastResult.imageBuffer : Buffer.from(lastResult.imageBuffer, 'base64');
    const format = detectExtension(imageBuffer);

    const imageId = StorageEngine.generateId();
    const storageResult = StorageEngine.saveImage(projectId, imageId, imageBuffer, format);

    if (!hasUPM && promptRecord && this.promptBridge) {
      const db = this.promptBridge.getDatabase();
      const saved = db.save(promptRecord);
      db.linkImage(saved.id, {
        id: imageId,
        filePath: storageResult.filePath || '',
        thumbnailPath: storageResult.thumbnailPath || '',
        url: storageResult.url || '',
        generatedAt: new Date().toISOString(),
        modelUsed: lastResult.model || 'unknown',
        metadata: {
          projectId,
          phase,
          provider,
          projectType: options.upm ? (upm.projectType.main || '') : (projectParams.type || ''),
        },
      });
    }

    return {
      success: true,
      generationId: imageId,
      prompt: fullPrompt,
      promptId: promptRecord ? promptRecord.id : null,
      imageBuffer,
      imageData: imageBuffer.toString('base64'),
      mimeType: lastResult.mimeType || 'image/png',
      width: lastResult.width || options.width || 1024,
      height: lastResult.height || options.height || 768,
      model: lastResult.model || 'unknown',
      seed: lastResult.seed || null,
      providerMetadata: lastResult.providerMetadata || {},
      provider,
      phase,
      ...storageResult,
      ...(hasUPM ? {
        upmSummary: upm.summarize(),
        verificationReport: verificationReport ? {
          passed: verificationReport.passed,
          score: verificationReport.score,
          checks: verificationReport.checks,
          errors: verificationReport.errors,
          warnings: verificationReport.warnings,
        } : null,
        analysisResult: analysisResult ? {
          passed: analysisResult.passed,
          score: analysisResult.score,
          checks: analysisResult.checks,
          errors: analysisResult.errors,
          attempts: analysisResult.attempt,
        } : null,
        featureCount: featureMap ? featureMap.features.length : 0,
        boqFeatureCount: featureMap ? featureMap.boqMatchCount : 0,
      } : {}),
    };
  }

  async _generateImageToImage(projectId, projectParams, options, fullPrompt, phase, provider, useEnginePrompt, promptRecord) {
let initImageData = options.image;
     if (typeof initImageData === 'string' && initImageData.includes('base64,')) {
       initImageData = initImageData.split('base64,')[1];
     } else if (Buffer.isBuffer(initImageData)) {
       initImageData = initImageData.toString('base64');
     }
    const initImageBuffer = Buffer.from(initImageData, 'base64');

    if (initImageBuffer.length < 100) {
      throw new Error('الصورة المرفقة صغيرة جداً أو تالفة');
    }

    const sdProviderConfig = this.models.getProvider('stable-diffusion');
    if (!sdProviderConfig) {
      throw new Error('مزود Stable Diffusion غير متاح لتوليد الصور من صورة');
    }

    const sdProvider = await this.models.instantiateProvider('stable-diffusion');
    if (!sdProvider.available) {
      const ok = await sdProvider.initialize();
      if (!ok) throw new Error('مزود Stable Diffusion غير متصل');
    }

    const result = await sdProvider.generateImageFromImage(initImageBuffer, fullPrompt, {
      width: options.width || 1024,
      height: options.height || 768,
      denoisingStrength: options.denoisingStrength || 0.75,
      steps: options.steps || 3,
      cfgScale: options.cfgScale || 7,
      seed: options.seed || -1,
    });

    if (!result || !result.imageBuffer) {
      throw new Error('لم يتم استلام صورة من مزود التوليد (Image-to-Image)');
    }

    const imageBuffer = Buffer.isBuffer(result.imageBuffer) ? result.imageBuffer : Buffer.from(result.imageBuffer, 'base64');
    const i2iImageId = StorageEngine.generateId();
    const storageResult = StorageEngine.saveImage(projectId, i2iImageId, imageBuffer, 'png');

    if (useEnginePrompt && promptRecord && this.promptBridge) {
      const db = this.promptBridge.getDatabase();
      const saved = db.save(promptRecord);
      db.linkImage(saved.id, {
        id: i2iImageId, filePath: storageResult.filePath || '',
        generatedAt: new Date().toISOString(), modelUsed: 'stable-diffusion',
        metadata: { projectId, phase, projectType: projectParams.type },
      });
    }

    return {
      success: true, generationId: i2iImageId, prompt: fullPrompt,
      promptId: promptRecord ? promptRecord.id : null,
      imageBuffer, imageData: imageBuffer.toString('base64'), mimeType: 'image/png',
      width: result.width || options.width || 1024, height: result.height || options.height || 768,
      model: result.model || 'stable-diffusion', seed: result.seed || null,
      providerMetadata: result.providerMetadata || {},
      provider: 'stable-diffusion', phase, imageToImage: true,
      ...storageResult,
    };
  }

  async generateInterior(projectId, projectParams, roomType, options = {}) {
    return this.generate(projectId, projectParams, {
      ...options,
      roomType: roomType || 'living_room',
      phase: 'Finishes',
      additional: `High-end ${options.style || 'Contemporary'} interior design of ${roomType}, furniture, decor, elegant finishes`,
    });
  }

  async generateExterior(projectId, projectParams, viewType, options = {}) {
    return this.generate(projectId, projectParams, {
      ...options,
      viewType: viewType || 'front',
      phase: 'Completed',
      additional: `Complete ${projectParams.style || 'Contemporary'} ${projectParams.type} exterior, ${viewType} elevation view`,
    });
  }

  async generateDrone(projectId, projectParams, altitude = 50, options = {}) {
    return this.generate(projectId, projectParams, {
      ...options,
      viewType: 'drone',
      phase: options.phase || 'Completed',
      additional: `Aerial drone photography view from ${altitude}m altitude, bird's eye perspective`,
      width: 1280,
      height: 720,
    });
  }

  async generateConcepts(projectId, projectParams, count = 5, options = {}) {
    const concepts = [];
    const styles = ['Contemporary', 'Luxury', 'Minimal', 'Classical', 'Modern'];
    const colors = ['warm', 'cool', 'neutral', 'earth', 'monochrome'];

    for (let i = 0; i < count; i++) {
      try {
        const conceptStyle = options.styles?.[i] || styles[i % styles.length];
        const colorPalette = options.colors?.[i] || colors[i % colors.length];
        const result = await this.generate(projectId, projectParams, {
          ...options,
          style: conceptStyle,
          additional: `Concept design variation ${i + 1}, ${colorPalette} color palette, innovative architectural design, ${conceptStyle} style interpretation`,
          phase: 'Completed',
        });
        concepts.push({ ...result, conceptNumber: i + 1, conceptStyle, colorPalette });
      } catch (e) {
        concepts.push({ conceptNumber: i + 1, error: e.message });
      }
    }
    return concepts;
  }

  async generateBeforeAfter(projectId, projectParams, options = {}) {
    const before = await this.generate(projectId, projectParams, {
      ...options, phase: options.beforePhase || 'Excavation',
      additional: 'Before construction, raw site, early stage documentation photo',
    });
    const after = await this.generate(projectId, projectParams, {
      ...options, phase: options.afterPhase || 'Completed',
      additional: 'After construction, completed project, final architectural photography',
    });
    return { before, after, comparisonId: StorageEngine.generateId() };
  }

  async generatePhaseSequence(projectId, projectParams, phases = null) {
    const allPhases = phases || ['Land', 'Excavation', 'Foundations', 'Columns', 'Beams', 'Slabs', 'Walls', 'Roof', 'MEP', 'Finishes', 'Landscape', 'Completed'];
    const results = [];
    for (const phase of allPhases) {
      try {
        const result = await this.generate(projectId, projectParams, { phase });
        results.push({ phase, ...result });
      } catch (e) {
        results.push({ phase, error: e.message });
      }
    }
    return results;
  }
}

module.exports = ImageGenerationEngine;