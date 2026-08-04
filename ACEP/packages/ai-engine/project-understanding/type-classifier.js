/**
 * Type Classifier — Evidence-Based Project Type Detection
 * Phase 1: Intelligent Project Understanding (Rebuilt — No Assumptions)
 *
 * Only uses verifiable evidence. No default values. No guessing.
 * Every decision must cite its source.
 */
class TypeClassifier {
  constructor(kb) {
    this.kb = kb;
  }

  classify(project) {
    const signals = this._gatherSignals(project);
    const verdict = this._weighEvidence(signals);
    return {
      primary: verdict,
      alternatives: this._getAlternatives(signals),
      signals: signals._raw || [],
      timestamp: new Date().toISOString()
    };
  }

  _gatherSignals(project) {
    const raw = [];
    const desc = (project.rawInput?.description || '').trim();
    const name = (project.metadata?.name || '').trim();
    const existingType = project.extracted?.type || project.approved?.type || null;
    const area = project.extracted?.area || project.approved?.area || null;
    const floors = project.extracted?.floors || project.approved?.floors || null;
    const city = project.extracted?.city || project.approved?.city || null;
    const hasFiles = !!(project.rawInput?.files?.length);

    if (desc) raw.push({ source: 'description', text: desc, priority: 3 });
    if (name) raw.push({ source: 'projectName', text: name, priority: 2 });
    if (existingType) raw.push({ source: 'existingExtraction', value: existingType, priority: 1 });
    if (area !== null) raw.push({ source: 'area', value: area, priority: 4 });
    if (floors !== null) raw.push({ source: 'floors', value: floors, priority: 4 });
    if (city) raw.push({ source: 'city', value: city, priority: 4 });
    if (hasFiles) raw.push({ source: 'uploadedFiles', value: true, priority: 5 });

    // Extract explicit floors from description
    const explicitFloors = this._extractExplicitFloors(desc);
    const explicitArea = this._extractExplicitArea(desc);

    return {
      desc,
      name,
      combined: (desc + ' ' + name).toLowerCase().trim(),
      existingType,
      area: explicitArea || area,
      floors: explicitFloors || floors,
      city,
      hasFiles,
      _raw: raw,
      explicitFloors,
      explicitArea
    };
  }

  _extractExplicitFloors(text) {
    if (!text) return null;
    // Arabic patterns: "دورين", "3 أدوار", "طابقين", "5 طوابق", "دور واحد"
    const patterns = [
      /(\d+)\s*(أدوار|طوابق|طابق|أدور|دور\b|دور\s)/i,
      /(دورين|طابقين)\b/i,
      /(دور\s+واحد|طابق\s+واحد)\b/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        if (m[1]) return parseInt(m[1]);
        if (/دورين|طابقين/i.test(m[0])) return 2;
        if (/دور\s+واحد|طابق\s+واحد/i.test(m[0])) return 1;
      }
    }
    return null;
  }

  _extractExplicitArea(text) {
    if (!text) return null;
    // Arabic patterns: "مساحة 500", "500 متر", "500 م2"
    const patterns = [
      /مساحة\s*[_:]?\s*(\d+[\d,]*)\s*(متر|م|م2|م²|m2|m²)?/i,
      /(\d+[\d,]*)\s*(متر|م|م2|م²|m2|m²)\s*(مربع)?/i,
      /area[_:]?\s*(\d+)/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return parseInt(m[1].replace(/,/g, ''));
    }
    return null;
  }

  _weighEvidence(signals) {
    const candidates = [];
    const patterns = this._getPatterns();

    // Check all patterns against combined text (description + name)
    for (const [type, pattern] of Object.entries(patterns)) {
      let match = false;
      let matchedText = '';
      let source = '';

      // Check description (highest priority evidence)
      if (signals.desc && pattern.regex.test(signals.desc)) {
        match = true;
        matchedText = signals.desc.match(pattern.regex)?.[0] || '';
        source = 'description';
      }
      // Check name
      if (!match && signals.name && pattern.regex.test(signals.name)) {
        match = true;
        matchedText = signals.name.match(pattern.regex)?.[0] || '';
        source = 'projectName';
      }
      // Check existing extraction
      if (!match && signals.existingType && signals.existingType === type) {
        match = true;
        matchedText = signals.existingType;
        source = 'existingExtraction';
      }

      if (match) {
        candidates.push({
          type,
          evidence: matchedText,
          source,
          confidence: this._evidenceToConfidence(source, pattern.weight)
        });
      }
    }

    // Special: detect apartment/flat that doesn't match Apartment_Building
    const isFlat = /(^|[^a-z])شقة(s|تين)?($|[^a-z]| )|شقق|flat|apartment(?!\s*(building|block))|وحدة\s*سكنية/i.test(signals.combined);
    if (isFlat && !candidates.some(c => c.type === 'Apartment' || c.type === 'Apartment_Finishing')) {
      candidates.push({
        type: 'Apartment',
        evidence: isFlat ? signals.desc.match(/شقة|شقق|flat|apartment|وحدة\s*سكنية/i)?.[0] || 'شقة' : 'apartment',
        source: 'description',
        confidence: 0.85
      });
    }

    // If no evidence found
    if (candidates.length === 0) {
      // Check if any data exists at all
      if (!signals.desc && !signals.name && !signals.existingType && !signals.area && !signals.floors) {
        return { type: null, confidence: 0, source: 'none', reason: 'لا توجد بيانات', evidence: null };
      }
      // Try generic "مشروع" 
      if (/مشروع|project|بناء|construction/i.test(signals.combined)) {
        return { type: 'Unknown', confidence: 0.05, source: 'description', reason: 'وصف عام غير كافٍ للتصنيف', evidence: null };
      }
      return { type: null, confidence: 0, source: 'none', reason: 'لا يوجد دليل كافٍ للتصنيف', evidence: null };
    }

    // Sort by confidence descending
    candidates.sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0];

    return {
      type: best.type,
      confidence: Math.round(best.confidence * 100),
      source: best.source,
      reason: `تم الكشف عن "${best.evidence}" في ${this._sourceName(best.source)}`,
      evidence: best.evidence,
      model: 'TypeClassifier v2.0 (Evidence-Based)'
    };
  }

  _evidenceToConfidence(source, weight) {
    // Different sources have different reliability
    const sourceConfidence = {
      existingExtraction: 0.90,
      projectName: 0.85,
      description: 0.80 * weight,
      uploadedFiles: 0.50,
    };
    return sourceConfidence[source] || 0.5 * weight;
  }

  _getPatterns() {
    return {
      'Apartment': { regex: /(شقة\s*(سكنية|مفروشة)?|شقق|وحدة\s*سكنية|apartment(?!\s*(building|block|tower))|flat|شقة\s*تشطيب|تشطيب\s*شقة)/i, weight: 1.0 },
      'Apartment_Building': { regex: /(عمائ?ر\s*سكنية|apartment\s*(building|block)|مبنى\s*سكني|عمارة\s*سكنية|مجمّع\s*سكني|سكن\s*جماعي|مشروع\s*سكني)/i, weight: 1.0 },
      'Villa': { regex: /(^|[^a-z])فيلا($|[^a-z]|ّ|ء?| )|villa|فيلّ|دور\s*مستقل|منزل\s*مستقل/i, weight: 1.0 },
      'Luxury_Villa': { regex: /(لوكس|luxury|فاخر|قصر|palace|villa\s*luxury|فيلا\s*فاخرة)/i, weight: 0.95 },
      'Residential_Tower': { regex: /(برج\s*(سكني|سكن)|tower.*residential|ناطحة|برج\s*(30|40|50)\s*(دور|طابق))/i, weight: 1.0 },
      'Hotel': { regex: /(فندق|hotel|منتجع|resort)/i, weight: 1.0 },
      'Hospital': { regex: /(مستشفى|hospital|مستوصف|clinic|مركز\s*طبي|مركز\s*صحي)/i, weight: 1.0 },
      'School': { regex: /(مدرسة|school|معهد|institute|جامعة|university|مؤسسة\s*تعليمية)/i, weight: 1.0 },
      'Mosque': { regex: /(مسجد|mosque|جامع|مصلى)/i, weight: 1.0 },
      'Mall': { regex: /(مول|mall|مركز\s*تجاري|سوق\s*تجاري|مجمّع\s*تجاري)/i, weight: 1.0 },
      'Office_Building': { regex: /(مكتب|office\s*(building)?|إداري|مبنى\s*إداري|شركة|مقر\s*شركة)/i, weight: 1.0 },
      'Factory': { regex: /(مصنع|factory|ورشة|workshop|صناعي|منشأة\s*صناعية)/i, weight: 1.0 },
      'Warehouse': { regex: /(مستودع|warehouse|مخزن|storehouse)/i, weight: 1.0 },
      'Bridge': { regex: /(جسر|bridge|كبري)/i, weight: 1.0 },
      'Road': { regex: /(طريق|road|شارع|street|highway|expressway)/i, weight: 1.0 },
      'Residential_Compound': { regex: /(مخطط\s*سكني|compound|مجمع\s*سكني|subdivision|مشروع\s*سكني\s*متكامل)/i, weight: 0.95 },
      'Sports_Club': { regex: /(نادي|club|رياضي|gym|ملعب|stadium)/i, weight: 1.0 },
      'Data_Center': { regex: /(data\s*center|مركز\s*بيانات|server|سيرفر|خادم)/i, weight: 1.0 },
      'Power_Plant': { regex: /(محطة\s*كهرباء|power\s*plant|محطة\s*توليد|generator)/i, weight: 1.0 },
      'Water_Treatment': { regex: /(محطة\s*مياه|water\s*treatment|تحلية|desalination|محطة\s*معالجة)/i, weight: 1.0 },
      'Infrastructure': { regex: /(بنية\s*تحتية|infrastructure|n\s*tunnel|طريق)/i, weight: 0.85 },
      'Farm': { regex: /(مزرعة|farm|زراعي|agricultur|greenhouse|دفيئة)/i, weight: 1.0 },
      'Gas_Station': { regex: /(محطة\s*وقود|gas\s*station|fuel|بنزين)/i, weight: 1.0 },
      'Park': { regex: /(حديقة|park|garden|متنزه|landscape|تنسيق)/i, weight: 0.9 },
      'Church': { regex: /(كنيسة|church)/i, weight: 1.0 },
      'Islamic_Center': { regex: /(مركز\s*إسلامي|islamic\s*center|جالية|مصلى)/i, weight: 0.9 },
      'Mixed_Use': { regex: /(mixed.use|متعدد\s*الاستخدامات|مجمّع\s*متعدد|تجاري\s*سكني)/i, weight: 0.9 },
      'Cinema_Theater': { regex: /(مسرح|theater|سينما|cinema|قاعة|hall|auditorium)/i, weight: 1.0 },
    };
  }

  _getAlternatives(signals) {
    const alts = [];
    const patterns = this._getPatterns();
    for (const [type, pattern] of Object.entries(patterns)) {
      let match = false;
      let source = '';
      if (signals.desc && pattern.regex.test(signals.desc)) { match = true; source = 'description'; }
      else if (signals.name && pattern.regex.test(signals.name)) { match = true; source = 'projectName'; }
      if (match) alts.push({ type, source, confidence: this._evidenceToConfidence(source, pattern.weight) });
    }
    alts.sort((a, b) => b.confidence - a.confidence);
    return alts.slice(1, 4).map(a => ({ type: a.type, confidence: Math.round(a.confidence * 100) }));
  }

  _sourceName(s) {
    const names = { description: 'الوصف', projectName: 'عنوان المشروع', existingExtraction: 'البيانات المستخرجة سابقاً', uploadedFiles: 'الملفات المرفوعة' };
    return names[s] || s;
  }
}

module.exports = TypeClassifier;
