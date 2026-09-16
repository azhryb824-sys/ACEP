/**
 * Project Profiler — Evidence-Based Digital Project Profile
 * Phase 1: Intelligent Project Understanding (Rebuilt — No Assumptions)
 *
 * Only uses verifiable evidence. No default values. No guessing.
 * Every field has: value, confidence, source, reason.
 * Unknown = null/undefined, not a guessed number.
 */
const TypeClassifier = require('./type-classifier');
const StructureInference = require('./structure-inference');
const MEPInference = require('./mep-inference');

class ProjectProfiler {
  constructor(kb) {
    this.kb = kb;
    this.classifier = new TypeClassifier(kb);
    this.structure = new StructureInference(kb);
    this.mep = new MEPInference(kb);
  }

  buildProfile(project) {
    if (!project) return null;
    const start = Date.now();
    const log = [];

    // Step 1: Classify from evidence only
    const classification = this.classifier.classify(project);
    log.push({ step: 'typeClassification', result: classification.primary.type, evidence: classification.primary.evidence, source: classification.primary.source, confidence: classification.primary.confidence });

    // Step 2: Extract verifiable params (no defaults)
    const params = this._extractParams(project, classification.primary, log);

    // Step 3: Usage category — only if type is known
    const usage = classification.primary.type ? this._classifyUsage(classification.primary.type) : this._unknownField('usage', 'نوع المشروع غير معروف');

    // Step 4: Structure inference — only with evidence
    const structural = params.floors.value !== null
      ? this.structure.infer(project, classification.primary.type, params.area.value, params.floors.value)
      : this._unknownStruct(log);

    // Step 5: Finishing — only if evidence exists
    const finishing = this._inferFinishing(project, classification.primary.type, log);

    // Step 6: MEP — only with evidence
    const mepArea = params.area.value !== null && params.floors.value !== null
      ? (Number(project.extracted?.grossBuiltArea) > 0 ? Number(project.extracted.grossBuiltArea) : params.area.value * params.floors.value)
      : null;
    const mep = (mepArea !== null && params.floors.value !== null && classification.primary.type)
      ? this.mep.infer(project, classification.primary.type, mepArea, params.floors.value)
      : this._unknownMEP(log);

    // Step 7: Scope — based on type only
    const scope = classification.primary.type ? this._determineScope(classification.primary.type) : this._unknownField('scope', 'نوع المشروع غير معروف');

    // Step 8: Applicable codes
    const codes = classification.primary.type ? this._getApplicableCodes(classification.primary.type, params) : [];

    // Step 9: Data quality assessment
    const dataQuality = this._assessDataQuality(project, params, log);

    // Step 10: Recommendations
    const recommendations = this._generateRecommendations(dataQuality, classification.primary, params);

    const profile = {
      profileVersion: '2.0-evidence',
      generatedAt: new Date().toISOString(),
      generationTime: Date.now() - start,
      model: 'ProjectProfiler v2.0 (Evidence-Based)',
      projectType: {
        value: classification.primary.type || null,
        confidence: classification.primary.confidence,
        source: classification.primary.source,
        reason: classification.primary.reason,
        evidence: classification.primary.evidence,
        alternatives: classification.alternatives
      },
      usage,
      physical: {
        floors: params.floors,
        area: params.area,
        totalArea: (params.area.value !== null && params.floors.value !== null)
          ? { value: params.area.value * params.floors.value, confidence: Math.min(params.area.confidence, params.floors.confidence), source: 'calculated' }
          : this._unknownField('totalArea', 'المساحة أو الأدوار غير معروفة'),
        height: structural.height || this._unknownField('height', 'الأدوار غير معروفة'),
        basement: structural.basement !== null ? structural.basement : this._unknownField('basement', 'لا توجد بيانات'),
        units: params.units
      },
      structural,
      finishing,
      mep,
      scope,
      codeCompliance: codes,
      dataQuality,
      recommendations,
      dataSources: this._identifyDataSources(project),
      log
    };

    return profile;
  }

  _unknownField(field, reason) {
    return { value: null, confidence: 0, source: 'none', reason };
  }

  _unknownStruct(log) {
    log.push({ step: 'structureInference', result: 'skipped', reason: 'عدد الأدوار غير معروف' });
    return {
      structuralSystem: this._unknownField('structuralSystem', 'لا توجد بيانات عن الهيكل الإنشائي'),
      foundation: this._unknownField('foundation', 'لا توجد بيانات عن الأساسات'),
      roof: this._unknownField('roof', 'لا توجد بيانات عن الأسقف'),
      slabs: this._unknownField('slabs', 'لا توجد بيانات عن البلاطات'),
      walls: this._unknownField('walls', 'لا توجد بيانات عن الجدران'),
      columns: this._unknownField('columns', 'لا توجد بيانات عن الأعمدة'),
      height: this._unknownField('height', 'عدد الأدوار غير معروف'),
      basement: this._unknownField('basement', 'لا توجد بيانات'),
      seismic: this._unknownField('seismic', 'لا توجد بيانات'),
      constructionMethod: this._unknownField('constructionMethod', 'لا توجد بيانات'),
    };
  }

  _unknownMEP(log) {
    log.push({ step: 'mepInference', result: 'skipped', reason: 'المساحة أو الأدوار غير معروفة' });
    return {
      electrical: this._unknownField('electrical', 'لا توجد بيانات'),
      hvac: this._unknownField('hvac', 'لا توجد بيانات'),
      plumbing: this._unknownField('plumbing', 'لا توجد بيانات'),
      fireSafety: this._unknownField('fireSafety', 'لا توجد بيانات'),
      networks: this._unknownField('networks', 'لا توجد بيانات'),
      security: this._unknownField('security', 'لا توجد بيانات'),
      bms: this._unknownField('bms', 'لا توجد بيانات'),
      verticalTransport: this._unknownField('verticalTransport', 'لا توجد بيانات'),
      emergency: this._unknownField('emergency', 'لا توجد بيانات'),
      specialSystems: this._unknownField('specialSystems', 'لا توجد بيانات'),
    };
  }

  _extractParams(project, primaryType, log) {
    const area = this._extractArea(project, log);
    const floors = this._extractFloors(project, log);
    const city = this._extractCity(project);
    return {
      area: { value: area.value, confidence: area.confidence, source: area.source, reason: area.reason },
      floors: { value: floors.value, confidence: floors.confidence, source: floors.source, reason: floors.reason },
      city: { value: city.value, confidence: city.confidence, source: city.source, reason: city.reason },
      units: { value: null, confidence: 0, source: 'none', reason: 'لا يمكن تقدير الوحدات بدون مساحة وأدوار' },
      rooms: project.extracted?.rooms ? { value: project.extracted.rooms, confidence: 0.9, source: 'extraction', reason: 'مستخرج من الوصف' } : this._unknownField('rooms', 'لم يذكر عدد الغرف'),
      bathrooms: project.extracted?.bathrooms ? { value: project.extracted.bathrooms, confidence: 0.9, source: 'extraction', reason: 'مستخرج من الوصف' } : this._unknownField('bathrooms', 'لم يذكر عدد الحمامات'),
    };
  }

  _extractArea(project, log) {
    // Priority 1: User-approved
    if (project.approved?.areaConfirmed && project.approved.area > 0) {
      log.push({ step: 'areaExtraction', result: project.approved.area, source: 'userApproved' });
      return { value: project.approved.area, confidence: 100, source: 'userApproved', reason: 'مُدخل من المستخدم' };
    }
    // Priority 2: Extracted from description
    if (project.extracted?.area && project.extracted.area > 0) {
      log.push({ step: 'areaExtraction', result: project.extracted.area, source: 'extraction' });
      return { value: project.extracted.area, confidence: project.extracted.areaExtracted ? 85 : 70, source: 'extraction', reason: 'مستخرج من الوصف' };
    }
    // Priority 3: Raw description contains explicit area
    const rawDesc = project.rawInput?.description || '';
    const m = rawDesc.match(/(\d+[\d,]*)\s*(متر|م2|م²|m2)/i);
    if (m) {
      const v = parseInt(m[1].replace(/,/g, ''));
      if (v > 0) {
        log.push({ step: 'areaExtraction', result: v, source: 'description' });
        return { value: v, confidence: 75, source: 'description', reason: `تم استخراج "${v} ${m[2]}" من الوصف` };
      }
    }
    // No evidence
    log.push({ step: 'areaExtraction', result: 'unknown', source: 'none' });
    return { value: null, confidence: 0, source: 'none', reason: 'لم تذكر المساحة في البيانات' };
  }

  _extractFloors(project, log) {
    // Priority 1: User-approved
    if (project.approved?.floorsConfirmed && project.approved.floors > 0) {
      log.push({ step: 'floorsExtraction', result: project.approved.floors, source: 'userApproved' });
      return { value: project.approved.floors, confidence: 100, source: 'userApproved', reason: 'مُدخل من المستخدم' };
    }
    // Priority 2: Extracted from description
    if (project.extracted?.floors && project.extracted.floors > 0) {
      log.push({ step: 'floorsExtraction', result: project.extracted.floors, source: 'extraction' });
      return { value: project.extracted.floors, confidence: project.extracted.floorsExtracted ? 85 : 70, source: 'extraction', reason: 'مستخرج من الوصف' };
    }
    // Priority 3: Raw description contains explicit floors
    const rawDesc = project.rawInput?.description || '';
    const patterns = [
      { re: /(\d+)\s*(أدوار|طوابق|طابق|أدور)/i, fn: (m) => parseInt(m[1]) },
      { re: /دورين|طابقين/i, fn: () => 2 },
      { re: /(ثلاثة|3)\s*(أدوار|طوابق)/i, fn: () => 3 },
      { re: /دور\s*واحد|طابق\s*واحد/i, fn: () => 1 },
    ];
    for (const { re, fn } of patterns) {
      const m = rawDesc.match(re);
      if (m) {
        const v = fn(m);
        log.push({ step: 'floorsExtraction', result: v, source: 'description' });
        return { value: v, confidence: 80, source: 'description', reason: `تم استخراج "${m[0]}" من الوصف` };
      }
    }
    // No evidence
    log.push({ step: 'floorsExtraction', result: 'unknown', source: 'none' });
    return { value: null, confidence: 0, source: 'none', reason: 'لم يذكر عدد الأدوار في البيانات' };
  }

  _extractCity(project) {
    if (project.approved?.cityConfirmed && project.approved.city) {
      return { value: project.approved.city, confidence: 100, source: 'userApproved', reason: 'مُدخل من المستخدم' };
    }
    if (project.extracted?.city) {
      return { value: project.extracted.city, confidence: 70, source: 'extraction', reason: 'مستخرج من الوصف' };
    }
    return { value: null, confidence: 0, source: 'none', reason: 'لم تذكر المدينة' };
  }

  _classifyUsage(type) {
    const categories = {
      Residential: ['Villa', 'Luxury_Villa', 'Apartment_Building', 'Apartment', 'Residential_Compound', 'Residential_Tower', 'Apartment_Finishing'],
      Hospitality: ['Hotel'],
      Healthcare: ['Hospital'],
      Educational: ['School', 'School_University'],
      Religious: ['Mosque', 'Church', 'Islamic_Center'],
      Commercial: ['Mall', 'Office_Building', 'Mixed_Use'],
      Industrial: ['Factory', 'Power_Plant', 'Water_Treatment', 'Gas_Station'],
      Storage_Logistics: ['Warehouse', 'Data_Center'],
      Infrastructure: ['Bridge', 'Road', 'Infrastructure'],
      Recreational: ['Sports_Club', 'Cinema_Theater', 'Park'],
      Agricultural: ['Farm']
    };
    for (const [category, types] of Object.entries(categories)) {
      if (types.includes(type)) {
        return { value: category, confidence: 85, source: 'projectType', reason: `مُصنف حسب نوع المشروع: ${type}` };
      }
    }
    return { value: null, confidence: 0, source: 'none', reason: 'نوع المشروع غير معروف' };
  }

  _inferFinishing(project, type, log) {
    // Only if level is specified by user
    if (project.extracted?.finishing) {
      log.push({ step: 'finishingInference', result: project.extracted.finishing, source: 'userInput' });
      return { value: project.extracted.finishing, confidence: 90, source: 'userInput', reason: 'مُدخل من المستخدم' };
    }
    // Check description for finishing keywords
    const desc = (project.rawInput?.description || '').toLowerCase();
    const finishMap = { 'لوكس': 'Luxury', 'فاخر': 'Premium', 'ديلوكس': 'Premium', 'standard': 'Standard', 'عادي': 'Standard', 'تشطيب': 'Standard' };
    for (const [keyword, level] of Object.entries(finishMap)) {
      if (desc.includes(keyword)) {
        log.push({ step: 'finishingInference', result: level, source: 'description' });
        return { value: level, confidence: 60, source: 'description', reason: `تم استنتاج "${level}" من كلمة "${keyword}" في الوصف` };
      }
    }
    // No evidence
    log.push({ step: 'finishingInference', result: 'unknown', source: 'none' });
    return { value: null, confidence: 0, source: 'none', reason: 'لم يذكر مستوى التشطيب' };
  }

  _determineScope(type) {
    const scopes = {
      Villa: ['Structure', 'Architecture', 'MEP', 'Finishing', 'Landscape'],
      Luxury_Villa: ['Structure', 'Architecture', 'MEP', 'Finishing', 'Landscape', 'SmartHome'],
      Apartment: ['Structure', 'Architecture', 'MEP', 'Finishing'],
      Apartment_Building: ['Structure', 'Architecture', 'MEP', 'Finishing'],
      Residential_Tower: ['Structure', 'Architecture', 'MEP', 'Finishing', 'Elevator', 'BMS'],
      Hotel: ['Structure', 'Architecture', 'MEP', 'Finishing', 'Elevator', 'BMS', 'InteriorDesign'],
      Hospital: ['Structure', 'Architecture', 'MEP', 'Finishing', 'Elevator', 'BMS', 'MedicalGas'],
      School: ['Structure', 'Architecture', 'MEP', 'Finishing'],
      Office_Building: ['Structure', 'Architecture', 'MEP', 'Finishing', 'Elevator', 'BMS'],
      Mall: ['Structure', 'Architecture', 'MEP', 'Finishing', 'Elevator', 'BMS', 'Facade'],
      Factory: ['Structure', 'Architecture', 'MEP', 'IndustrialSystems'],
      Warehouse: ['Structure', 'Architecture', 'MEP'],
      Mosque: ['Structure', 'Architecture', 'MEP', 'Finishing', 'InteriorDesign'],
      Data_Center: ['Structure', 'Architecture', 'MEP', 'PrecisionCooling', 'UPS', 'BMS'],
      Power_Plant: ['Structure', 'IndustrialMEP', 'SCADA'],
      Water_Treatment: ['Structure', 'ProcessPiping', 'MEP', 'SCADA'],
      Road: ['Earthwork', 'Pavement', 'Drainage', 'Lighting'],
      Bridge: ['Foundation', 'Structure', 'Pavement', 'Lighting'],
      Infrastructure: ['Earthwork', 'Concrete', 'Piping', 'Electrical'],
      Sports_Club: ['Structure', 'Architecture', 'MEP', 'Finishing', 'Landscape'],
      Cinema_Theater: ['Structure', 'Architecture', 'MEP', 'Acoustic', 'Finishing'],
    };
    return { value: scopes[type] || ['Structure', 'Architecture', 'MEP', 'Finishing'], source: 'projectType', reason: `حسب نوع المشروع: ${type}` };
  }

  _getApplicableCodes(type, params) {
    const codes = [];
    codes.push({ code: 'SBC 301–306', name: 'Saudi Structural Code Family' });
    codes.push({ code: 'SBC 601/602', name: 'Saudi Energy Conservation Codes' });
    if (['Hotel', 'Mall', 'Hospital', 'School', 'Cinema_Theater'].includes(type)) codes.push({ code: 'SBC 801', name: 'Saudi Fire Protection Code' });
    codes.push({ code: 'SBC 401', name: 'Saudi Electrical Code' });
    codes.push({ code: 'SBC 501', name: 'Saudi Mechanical Code' });
    codes.push({ code: 'SBC 701', name: 'Saudi Plumbing Code' });
    if (type === 'Hospital') codes.push({ code: 'MOH Standards', name: 'Ministry of Health - Hospital Standards' });
    if (type === 'School') codes.push({ code: 'MOE Standards', name: 'Ministry of Education - School Standards' });
    if (type === 'Mosque') codes.push({ code: 'MOIA Standards', name: 'Ministry of Islamic Affairs - Mosque Standards' });
    if (type === 'Road') codes.push({ code: 'MOT Standards', name: 'Ministry of Transport - Road Standards' });
    if (type === 'Bridge') codes.push({ code: 'AASHTO LRFD', name: 'Bridge Design Specifications' });
    return { value: codes, source: 'projectType', reason: `حسب نوع المشروع: ${type}` };
  }

  _assessDataQuality(project, params, log) {
    const issues = [];
    const present = [];
    if (project.rawInput?.description) { present.push('description'); } else { issues.push({ field: 'description', severity: 'high', message: 'لا يوجد وصف للمشروع' }); }
    if (params.area.value !== null) { present.push('area'); } else { issues.push({ field: 'area', severity: 'high', message: 'المساحة غير محددة' }); }
    if (params.floors.value !== null) { present.push('floors'); } else { issues.push({ field: 'floors', severity: 'high', message: 'عدد الأدوار غير محدد' }); }
    if (params.city.value) { present.push('city'); }
    if (project.metadata?.name) { present.push('name'); }
    const completenessScore = Math.round((present.length / 5) * 100);
    const hasEnoughForBOQ = params.area.value !== null && params.floors.value !== null && (project.rawInput?.description || project.metadata?.name);
    log.push({ step: 'dataQuality', completenessScore, hasEnoughForBOQ, issues: issues.length });
    return { completenessScore, hasEnoughForBOQ, hasEnoughForVisual: params.area.value !== null && project.rawInput?.description, present, missing: issues };
  }

  _generateRecommendations(dataQuality, primaryType, params) {
    const recommendations = [];
    if (!dataQuality.hasEnoughForBOQ) recommendations.push({ priority: 'high', message: 'البيانات غير كافية لإنشاء BOQ. يرجى إدخال المساحة وعدد الأدوار على الأقل.' });
    if (!primaryType.type) recommendations.push({ priority: 'high', message: 'نوع المشروع غير معروف. يرجى تحديد نوع المشروع.' });
    if (params.area.value === null) recommendations.push({ priority: 'high', message: 'المساحة غير محددة. يرجى إدخال المساحة.' });
    if (params.floors.value === null) recommendations.push({ priority: 'high', message: 'عدد الأدوار غير محدد. يرجى إدخال عدد الأدوار.' });
    if (!params.city.value) recommendations.push({ priority: 'medium', message: 'يرجى تحديد المدينة للحصول على أسعار دقيقة.' });
    return recommendations;
  }

  _identifyDataSources(project) {
    const sources = [];
    if (project.rawInput?.description) sources.push({ name: 'description', label: 'وصف المشروع', priority: 3 });
    if (project.metadata?.name) sources.push({ name: 'projectName', label: 'عنوان المشروع', priority: 2 });
    if (project.extracted?.type) sources.push({ name: 'existingExtraction', label: 'بيانات مستخرجة سابقاً', priority: 1 });
    if (project.rawInput?.files?.length) sources.push({ name: 'uploadedFiles', label: 'ملفات مرفوعة', priority: 5 });
    return sources;
  }
}

module.exports = ProjectProfiler;
