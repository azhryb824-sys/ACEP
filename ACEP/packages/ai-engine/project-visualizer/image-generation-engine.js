const { ImageProviderLayer } = require('./image-provider-layer');
const { getLogger } = require('./logger');

class ImageGenerationEngine {
  constructor() {
    this.sceneTemplates = {
      Land: { elements: ['ارض_فارغة', 'سياج', 'لافتة_مشروع'], colors: ['ترابي', 'بني'], lighting: 'day', prohibited: [] },
      Site_Preparation: { elements: ['معدات_تسوية', 'جرافة', 'عمال', 'سياج'], colors: ['ترابي', 'أصفر'], prohibited: ['تشطيب'] },
      Excavation: { elements: ['حفارات', 'قلابات', 'عمال', 'مهندسون', 'حواجز', 'معدات_سلامة'], colors: ['ترابي', 'أصفر', 'برتقالي'], prohibited: ['دهان', 'بلاط', 'تشطيب', 'نوافذ'] },
      Foundation: { elements: ['قواعد', 'خرسانة', 'حديد_تسليح', 'عمال', 'مضخات_خرسانة'], colors: ['رمادي', 'أحمر_الحديد'], prohibited: ['جدران', 'تشطيب'] },
      Columns: { elements: ['أعمدة', 'شدات', 'رافعات', 'خرسانة', 'حديد', 'عمال'], colors: ['رمادي', 'أصفر_الشدات'], prohibited: ['جدران_كاملة', 'تشطيب', 'نوافذ'] },
      Structure: { elements: ['هيكل_خرساني', 'أعمدة', 'سقف', 'جدران', 'سلالم'], colors: ['رمادي'], prohibited: ['تشطيب', 'دهان'] },
      Masonry: { elements: ['طوب', 'جدران', 'عمال_بناء', 'مونة', 'سقالات'], colors: ['أحمر_طوب', 'رمادي'], prohibited: ['دهان'] },
      Waterproofing: { elements: ['عزل', 'لفائف', 'عمال', 'مواد_عزل'], colors: ['أسود', 'أزرق'], prohibited: ['تشطيب'] },
      Plaster: { elements: ['لياسة', 'عمال_لياسة', 'سقالات', 'مونة'], colors: ['أبيض', 'رمادي_فاتح'], prohibited: ['دهان_نهائي'] },
      Electrical: { elements: ['تمديدات', 'مواسير_كهرباء', 'علب_توزيع', 'أسلاك'], colors: ['أبيض', 'أسود', 'أحمر'], prohibited: ['تشطيب_نهائي'] },
      Plumbing: { elements: ['مواسير_صحية', 'تمديدات_مياه', 'خلاطات', 'عمال_سباكة'], colors: ['أبيض', 'أزرق', 'نحاسي'], prohibited: ['تشطيب_نهائي'] },
      HVAC: { elements: ['مجاري_هواء', 'مكيفات', 'مواسير_نحاس', 'عمال_تكييف'], colors: ['فضي', 'أبيض', 'نحاسي'], prohibited: [] },
      Tiling: { elements: ['بلاط', 'سيراميك', 'عمال_بلاط', 'غراء_بلاط', 'أدوات_قطع'], colors: ['بيج', 'أبيض', 'رمادي'], prohibited: [] },
      Painting: { elements: ['دهان', 'عمال_دهان', 'سقالات', 'فرش_دهان', 'رولات'], colors: ['أبيض', 'ملون'], prohibited: ['بلاط'] },
      Doors_Windows: { elements: ['أبواب', 'شبابيك', 'ألمنيوم', 'زجاج', 'عمال_نجارة'], colors: ['بني', 'أبيض', 'فضي'], prohibited: [] },
      Facade: { elements: ['واجهة', 'حجر', 'ألمنيوم', 'زجاج', 'إضاءة_واجهة'], colors: ['بيج', 'رمادي', 'ذهبي'], prohibited: [] },
      Finishing: { elements: ['أرضيات', 'أسقف_مستعارة', 'إضاءة', 'دهان_نهائي', 'أثاث'], colors: ['أبيض', 'بيج', 'ذهبي_فاتح'], prohibited: ['خرسانة_ظاهرة'] },
      Ceilings: { elements: ['سقف_مستعار', 'إضاءة_سقف', 'جيبسوم', 'أسلاك'], colors: ['أبيض', 'بيج'], prohibited: [] },
      Flooring: { elements: ['أرضيات', 'باركيه', 'بلاط', 'رخام', 'عمال_تركيب'], colors: ['بني', 'بيج', 'رمادي'], prohibited: [] },
      Landscape: { elements: ['حديقة', 'أشجار', 'نافورة', 'ممرات', 'إنارة_حديقة', 'سيارة'], colors: ['أخضر', 'أزرق', 'بني'], prohibited: [] },
      External_Works: { elements: ['مواقف', 'أرصفة', 'إنارة_خارجية', 'سور'], colors: ['رمادي', 'أخضر'], prohibited: [] },
      Completed: { elements: ['مبنى_كامل', 'لاندسكيب', 'إنارة', 'سيارة', 'أشخاص'], colors: ['متعدد'], prohibited: [] },
      Renovation: { elements: ['غرفة_حالية', 'أثاث_قديم', 'عمال_هدم', 'مواد_بناء'], colors: ['بيج', 'رمادي'], prohibited: [] },
    };

    this.elementMap = {
      حفارات: 'excavators', قلابات: 'dump trucks', عمال: 'workers', مهندسون: 'engineers',
      خرسانة: 'concrete', حديد_تسليح: 'reinforcement steel', قواعد: 'footings', أعمدة: 'columns',
      شدات: 'formwork', رافعات: 'cranes', جدران: 'walls', طوب: 'bricks',
      دهان: 'paint', بلاط: 'tiles', سيراميك: 'ceramic tiles', نوافذ: 'windows',
      أبواب: 'doors', سقالات: 'scaffolding', عزل: 'waterproofing', سقف: 'slab/roof',
      تشطيب: 'finishing', أثاث: 'furniture', إضاءة: 'lighting', ألمنيوم: 'aluminum',
      زجاج: 'glass', حجر: 'stone', أسقف_مستعارة: 'false ceiling', حديقة: 'garden',
      أشجار: 'trees', نافورة: 'fountain', مضخات_خرسانة: 'concrete pumps', سلالم: 'stairs',
      مونة: 'mortar', مواد_عزل: 'insulation materials', مواسير_كهرباء: 'electrical conduits',
      مواسير_صحية: 'plumbing pipes', مجاري_هواء: 'air ducts', مكيفات: 'AC units',
      غراء_بلاط: 'tile adhesive', رخام: 'marble', باركيه: 'parquet flooring',
      جيبسوم: 'gypsum', أرضيات: 'flooring', ممرات: 'pathways',
      مواقف: 'parking spaces', سور: 'fence', أشخاص: 'people',
    };

    this.imageTypes = {
      front: { cameraAngle: 'front_view', description: 'واجهة المبنى', width: 1024, height: 768 },
      rear: { cameraAngle: 'rear_view', description: 'الواجهة الخلفية', width: 1024, height: 768 },
      side: { cameraAngle: 'side_view', description: 'الواجهة الجانبية', width: 1024, height: 768 },
      corner: { cameraAngle: 'corner_view', description: 'زاوية المبنى', width: 1024, height: 768 },
      top: { cameraAngle: 'top_view', description: 'من الأعلى', width: 1024, height: 768 },
      drone: { cameraAngle: 'aerial_45', description: 'تصوير جوي', width: 1920, height: 1080 },
      bird_eye: { cameraAngle: 'bird_eye', description: 'عين الطائر', width: 1920, height: 1080 },
      street: { cameraAngle: 'street_view', description: 'من الشارع', width: 1024, height: 768 },
      interior: { cameraAngle: 'interior_wide', description: 'داخلي', width: 1024, height: 768 },
      living_room: { cameraAngle: 'interior_living', description: 'غرفة معيشة', width: 1024, height: 768 },
      bedroom: { cameraAngle: 'interior_bedroom', description: 'غرفة نوم', width: 1024, height: 768 },
      kitchen: { cameraAngle: 'interior_kitchen', description: 'مطبخ', width: 1024, height: 768 },
      bathroom: { cameraAngle: 'interior_bathroom', description: 'حمام', width: 1024, height: 768 },
      majlis: { cameraAngle: 'interior_majlis', description: 'مجلس', width: 1024, height: 768 },
      roof: { cameraAngle: 'roof_view', description: 'سطح', width: 1024, height: 768 },
      garden: { cameraAngle: 'garden_view', description: 'حديقة', width: 1024, height: 768 },
      pool: { cameraAngle: 'pool_view', description: 'مسبح', width: 1024, height: 768 },
    };

    // Initialize provider layer
    this.providerLayer = new ImageProviderLayer();
    this.logger = getLogger({ service: 'ImageGenerationEngine', level: 'info' });
    this.providerLayer.setLogger(this.logger);
    
    // Set provider from environment or default to mock
    const defaultProvider = process.env.IMAGE_PROVIDER || 'mock';
    try {
      this.providerLayer.setProvider(defaultProvider);
      this.logger.info(`Image provider initialized: ${defaultProvider}`);
    } catch (error) {
      this.logger.warn(`Failed to set provider ${defaultProvider}, falling back to mock`);
      this.providerLayer.setProvider('mock');
    }
  }

  setProvider(providerName) {
    try {
      this.providerLayer.setProvider(providerName);
      this.logger.info(`Provider changed to: ${providerName}`);
    } catch (error) {
      this.logger.error(`Failed to set provider: ${error.message}`);
      throw error;
    }
  }

  getCurrentProvider() {
    return this.providerLayer.getCurrentProvider();
  }

  getAvailableProviders() {
    return this.providerLayer.getAvailableProviders();
  }

  async generateScene(projectIdentity, params = {}) {
    const phase = params.phase || 'Completed';
    const imageType = params.imageType || 'front';
    const template = this.sceneTemplates[phase] || this.sceneTemplates.Completed;
    const imgType = this.imageTypes[imageType] || this.imageTypes.front;

    const elements = template.elements.map(e => this.elementMap[e] || e).filter(Boolean);
    const prohibited = template.prohibited.map(p => this.elementMap[p] || p).filter(Boolean);

    const prompt = this._buildFullPrompt(projectIdentity, phase, elements, imageType, params);
    const negativePrompt = prohibited.length > 0 ? prohibited.join(', ') : 'low quality, blurry, distorted';

    this.logger.info(`Generating scene: phase=${phase}, imageType=${imageType}`);

    try {
      const result = await this.providerLayer.generateImage(prompt, {
        width: imgType.width,
        height: imgType.height,
        negative_prompt: negativePrompt,
        style: params.style || projectIdentity.visualDNA?.style || 'Contemporary',
        ...params
      });

      return {
        ...result,
        phase,
        imageType,
        viewType: imgType.description,
        elements,
        prompt,
        negativePrompt,
        description: `تصور ${imgType.description} لمرحلة ${phase} - ${projectIdentity.projectType}`,
      };
    } catch (error) {
      this.logger.error(`Failed to generate scene: ${error.message}`);
      throw error;
    }
  }

  async generateInterior(roomType, style, projectIdentity) {
    const roomTypes = ['living_room', 'bedroom', 'kitchen', 'bathroom', 'majlis', 'office', 'lobby', 'dining'];
    const rt = roomTypes.includes(roomType) ? roomType : 'living_room';
    const styleTitle = style || 'Contemporary';

    this.logger.info(`Generating interior: roomType=${rt}, style=${styleTitle}`);

    const prompt = `Interior design of a ${rt} in ${styleTitle} style, high quality architectural visualization, photorealistic, 8K`;
    const negativePrompt = 'exterior, outside, low quality, blurry, distorted';

    try {
      const result = await this.providerLayer.generateImage(prompt, {
        width: 1024,
        height: 768,
        negative_prompt: negativePrompt,
        style: styleTitle
      });

      return {
        ...result,
        roomType: rt,
        style: styleTitle,
        prompt,
        negativePrompt,
        description: `تصميم داخلي لـ ${rt} بأسلوب ${styleTitle}`,
        suggestions: this._getInteriorSuggestions(roomType, styleTitle),
      };
    } catch (error) {
      this.logger.error(`Failed to generate interior: ${error.message}`);
      throw error;
    }
  }

  async generateExterior(params, projectIdentity) {
    const view = params.view || 'front';
    const style = projectIdentity.visualDNA?.style || 'Contemporary';

    this.logger.info(`Generating exterior: view=${view}, style=${style}`);

    const prompt = `Exterior view of a ${projectIdentity.projectType} in ${style} style, photorealistic, 8K, architectural rendering`;
    const negativePrompt = 'low quality, blurry, distorted, cartoon';

    try {
      const result = await this.providerLayer.generateImage(prompt, {
        width: 1024,
        height: 768,
        negative_prompt: negativePrompt,
        style: style
      });

      return {
        ...result,
        viewType: view,
        prompt,
        negativePrompt,
        description: `واجهة ${projectIdentity.projectType} - الرؤية ${view}`,
        facadeProfile: projectIdentity.facadeProfile,
        materialProfile: projectIdentity.materialProfile,
      };
    } catch (error) {
      this.logger.error(`Failed to generate exterior: ${error.message}`);
      throw error;
    }
  }

  async generateDrone(params, projectIdentity) {
    const altitude = params.altitude || 50;

    this.logger.info(`Generating drone view: altitude=${altitude}m`);

    const prompt = `Aerial drone photography of a ${projectIdentity.projectType} construction site at ${altitude}m altitude, photorealistic, 8K, architectural rendering`;
    const negativePrompt = 'low quality, blurry, distorted';

    try {
      const result = await this.providerLayer.generateImage(prompt, {
        width: 1920,
        height: 1080,
        negative_prompt: negativePrompt
      });

      return {
        ...result,
        altitude,
        prompt,
        negativePrompt,
        description: `تصوير جوي بارتفاع ${altitude} متر`,
      };
    } catch (error) {
      this.logger.error(`Failed to generate drone view: ${error.message}`);
      throw error;
    }
  }

  async generateNight(params, projectIdentity) {
    const style = params.style || projectIdentity.visualDNA?.style || 'Contemporary';

    this.logger.info(`Generating night view: style=${style}`);

    const prompt = `Night view of a ${projectIdentity.projectType} with architectural lighting, ${style} style, photorealistic, 8K, dramatic shadows`;
    const negativePrompt = 'daytime, bright, low quality, blurry';

    try {
      const result = await this.providerLayer.generateImage(prompt, {
        width: 1024,
        height: 768,
        negative_prompt: negativePrompt,
        style: style
      });

      return {
        ...result,
        prompt,
        negativePrompt,
        description: 'منظر ليلي للمشروع مع الإضاءة المعمارية',
      };
    } catch (error) {
      this.logger.error(`Failed to generate night view: ${error.message}`);
      throw error;
    }
  }

  async generateMultipleConcepts(projectIdentity, count = 1, params = {}) {
    this.logger.info(`Generating ${count} concepts`);

    const styles = ['Contemporary', 'Luxury', 'Minimal', 'Classical', 'Islamic', 'Modern', 'NeoClassical'];
    const concepts = [];

    for (let i = 0; i < count; i++) {
      const conceptStyle = styles[i % styles.length];
      const prompt = `Architectural concept ${i + 1} of a ${projectIdentity.projectType} in ${conceptStyle} style, photorealistic, 8K, architectural rendering`;
      const negativePrompt = 'low quality, blurry, distorted, cartoon';

      try {
        const result = await this.providerLayer.generateImage(prompt, {
          width: 1024,
          height: 768,
          negative_prompt: negativePrompt,
          style: conceptStyle
        });

        concepts.push({
          conceptNumber: i + 1,
          ...result,
          style: conceptStyle,
          description: `Concept ${i + 1}: ${conceptStyle} style interpretation`,
          features: ['جودة عالية', `أسلوب ${conceptStyle}`, 'إضاءة طبيعية', 'تكامل مع الموقع'],
        });
      } catch (error) {
        this.logger.error(`Failed to generate concept ${i + 1}: ${error.message}`);
        concepts.push({
          conceptNumber: i + 1,
          error: error.message,
          style: conceptStyle,
          description: `Concept ${i + 1}: Failed to generate`,
        });
      }
    }

    return concepts;
  }

  _buildFullPrompt(projectIdentity, phase, elements, imageType, params) {
    const style = params.style || projectIdentity.visualDNA?.style || 'Contemporary';
    const timeOfDay = params.timeOfDay || 'day';

    const parts = [
      `Architectural visualization of a ${projectIdentity.projectType.toLowerCase()}`,
      `during ${phase} construction phase`,
      `style: ${style}`,
      `showing: ${elements.join(', ')}`,
      `view: ${imageType}`,
      timeOfDay === 'night' ? 'night scene, architectural lighting, dramatic shadows' : 'natural daylight, clear sky',
      'photorealistic, 8K, architectural rendering, professional',
    ];

    return parts.join(', ');
  }

  _getInteriorSuggestions(roomType, style) {
    const suggestions = {
      colorPalette: style === 'Luxury' ? ['ذهبي', 'كريمي', 'بني'] : ['أبيض', 'بيج', 'رمادي فاتح'],
      flooring: style === 'Luxury' ? 'رخام' : 'باركيه',
      lighting: style === 'Luxury' ? 'ثريات كريستال' : 'إضاءة مخفية LED',
      furniture: style === 'Minimal' ? 'بسيط وعملي' : 'فاخر ومريح',
      accessories: ['ستائر', 'نباتات داخلية', 'لوحات فنية'],
    };
    return suggestions;
  }
}

module.exports = ImageGenerationEngine;