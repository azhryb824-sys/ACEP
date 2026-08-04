const { EngineeringPromptGenerator } = require('./prompt-generator');
const { PromptDatabase } = require('./prompt-database');

class PromptVisionBridge {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
    this.generator = new EngineeringPromptGenerator(knowledgeBase);
    this.db = new PromptDatabase();
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return this;
    console.log('[Prompt-Vision Bridge] Initialized');
    this.initialized = true;
    return this;
  }

  generatePromptForVision(projectParams = {}) {
    const projectType = projectParams.type || this._inferProjectType(projectParams);
    const phaseId = projectParams.phaseId || this._inferPhase(projectParams);
    const finishing = projectParams.finishingQuality || projectParams.finishing || null;
    const style = projectParams.style || null;

    const prompts = this.generator.generateSpecific({
      projectType,
      phaseId,
      finishing,
      style,
      count: 1,
    });

    if (prompts.length === 0) {
      const fallback = this.generator.generateBatch(1);
      return fallback[0] || null;
    }

    return prompts[0];
  }

  async generateAndLink(generationFunction, projectParams, options = {}) {
    const promptData = this.generatePromptForVision(projectParams);
    if (!promptData) return null;

    const savedPrompt = this.db.save(promptData);
    const fullPrompt = promptData.prompt;

    try {
      const generationResult = await generationFunction(fullPrompt, options);

      if (generationResult && generationResult.imageId) {
        this.db.linkImage(savedPrompt.id, {
          id: generationResult.imageId,
          filePath: generationResult.filePath || '',
          thumbnailPath: generationResult.thumbnailPath || '',
          url: generationResult.url || '',
          generatedAt: new Date().toISOString(),
          modelUsed: generationResult.model || 'unknown',
          metadata: {
            projectType: promptData.projectType,
            phase: promptData.phase,
            finishing: promptData.finishing,
            style: promptData.architecturalStyle,
          },
        });
      }

      return {
        prompt: savedPrompt,
        image: generationResult,
        linked: true,
      };
    } catch (error) {
      return {
        prompt: savedPrompt,
        error: error.message,
        linked: false,
      };
    }
  }

  getDatabase() { return this.db; }
  getGenerator() { return this.generator; }

  getStats() {
    return {
      generator: {
        totalCombinations: this.generator.getTotalCombinations(),
      },
      database: this.db.getStats(),
    };
  }

  _inferProjectType(params) {
    if (params.type) return params.type;
    if (params.area && params.floors) {
      if (params.area <= 150 && params.floors <= 2) return 'villa';
      if (params.area <= 500 && params.floors <= 5) return 'building';
      if (params.area > 5000 && params.floors > 10) return 'tower';
    }
    const desc = (params.description || '').toLowerCase();
    if (desc.includes('mosque') || desc.includes('مسجد')) return 'mosque';
    if (desc.includes('school') || desc.includes('مدرسة')) return 'school';
    if (desc.includes('hospital') || desc.includes('مستشفى')) return 'hospital';
    if (desc.includes('hotel') || desc.includes('فندق')) return 'hotel';
    if (desc.includes('mall') || desc.includes('مول')) return 'mall';
    if (desc.includes('factory') || desc.includes('مصنع')) return 'factory';
    if (desc.includes('warehouse') || desc.includes('مستودع')) return 'warehouse';
    if (desc.includes('office') || desc.includes('مكتب')) return 'office';
    if (desc.includes('villa') || desc.includes('فيلا')) return 'villa';
    if (desc.includes('apartment') || desc.includes('شقة')) return 'apartment';
    return 'building';
  }

  _inferPhase(params) {
    if (params.phaseId) return params.phaseId;
    const phase = (params.phase || '').toLowerCase();
    if (phase.includes('excavation') || phase.includes('حفر')) return 'excavation';
    if (phase.includes('foundation') || phase.includes('أساس')) return 'foundation';
    if (phase.includes('structure') || phase.includes('هيكل')) return 'structure';
    if (phase.includes('masonry') || phase.includes('مبان')) return 'masonry';
    if (phase.includes('plaster') || phase.includes('لياسة')) return 'plastering';
    if (phase.includes('electrical') || phase.includes('كهرباء')) return 'electrical';
    if (phase.includes('plumbing') || phase.includes('سباكة')) return 'plumbing';
    if (phase.includes('hvac') || phase.includes('تكييف')) return 'hvac';
    if (phase.includes('gypsum') || phase.includes('جبس')) return 'gypsum';
    if (phase.includes('paint') || phase.includes('دهان')) return 'painting';
    if (phase.includes('tile') || phase.includes('سيراميك')) return 'tiling';
    if (phase.includes('facade') || phase.includes('واجهة')) return 'facade';
    if (phase.includes('finish') || phase.includes('تشطيب')) return 'finishing';
    return 'handover';
  }
}

module.exports = { PromptVisionBridge };
