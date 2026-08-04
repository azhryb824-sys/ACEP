class StageClassifier {
  constructor() {
    this.stages = this._defineStages();
  }

  _defineStages() {
    return {
      'Studies': {
        id: 'Studies',
        keywords: {
          ar: ['دراسة', 'دراسات', 'feasibility', 'جدوى', 'مسح', 'مسحية', 'مسحي',
               'geotechnical', 'بيئية', 'environmental', 'حفر مبدئي', 'تخطيط',
               'transport', 'دراسة جدوى', 'دراسة بيئية', 'دراسة تقنية',
               'مسح الموقع', 'المسح الجيوتقني'],
          en: ['concept', 'feasibility', 'site study', 'survey', 'geotechnical',
               'environmental', 'traffic study', 'planning', 'concept design',
               'pre-feasibility']
        },
        boqKeywords: ['site clearing', 'survey', 'geotechnical investigation'],
        boqWeights: [0.15, 0.15, 0.10],
        category: 'studies'
      },
      'Design': {
        id: 'Design',
        keywords: {
          ar: ['تصميم', 'مخطط', 'مخططات', 'رسم', 'رسومات', 'تصميمي',
               'IFC', 'IFC drawings', 'shop drawing', 'shop drawings',
               'BIM', 'التنسيق', 'coordination', 'تصميم معماري',
               'تصميم إنشائي', 'تصميم تركيبات', 'عملية', 'working drawing'],
          en: ['architectural design', 'structural design', 'MEP design', 'BIM modeling',
               'shop drawings', 'IFC drawings', 'working drawings', 'coordination',
               'architectural design', 'design development']
        },
        boqKeywords: ['design', 'BIM', 'coordination', 'shop drawing'],
        boqWeights: [0.15, 0.10, 0.10],
        category: 'design'
      },
      'Foundation': {
        id: 'Foundation',
        keywords: {
          ar: ['تأسيس', 'أساس', 'أساسات', 'حفر', 'خوازيق', 'بئر', 'بنية تحتية',
               'backfill', 'backfilling', 'blinding', 'بلنة', 'قواعد', 'أساسات',
               'raft', 'pile cap', 'pile caps', 'grade beam', 'grade beams',
               'تحتية', 'أساس'],
          en: ['foundation', 'excavation', 'piles', 'pile cap', 'raft',
               'footings', 'grade beam', 'blinding', 'backfill', 'underpinning',
               'foundation waterproofing', 'shoring']
        },
        boqKeywords: ['excavation', 'piles', 'foundation', 'raft', 'footing', 'pile cap', 'grade beam', 'shoring', 'groundwork', 'substructure',
          'حفر', 'خوازيق', 'أساسات', 'ردم', 'لبسة', 'بنية تحتية', 'تأسيس', 'قواعد', 'أساس', 'تحتية', 'تحتية', 'كمرات أرضية'],
        boqWeights: [0.20, 0.15, 0.15, 0.10, 0.10, 0.10, 0.08, 0.07, 0.06, 0.05, 0.05, 0.05, 0.03],
        category: 'foundation'
      },
      'Construction': {
        id: 'Construction',
        keywords: {
          ar: ['عمود', 'أعمدة', 'جدار', 'جدران', 'خرسانة', 'حديد', 'بلوك',
               'سقف', 'علية', 'هيكلي', 'هيكل', 'سقالات', 'إنشاء',
               'إنشائي', 'تنفيذ', 'بناية', 'بناء'],
          en: ['column', 'columns', 'wall', 'walls', 'concrete', 'steel', 'block',
               'roof', 'structural', 'frame', 'scaffolding', 'construction',
               'beam', 'slab', 'shear wall', 'core wall']
        },
        boqKeywords: ['column', 'beam', 'slab', 'wall', 'concrete', 'steel', 'block work',
                      'roof structure', 'structural frame', 'staircase'],
        boqWeights: [0.15, 0.12, 0.12, 0.10, 0.10, 0.10, 0.08, 0.08, 0.08, 0.07],
        category: 'construction'
      },
      'Building Completion': {
        id: 'Building Completion',
        description: 'Completion of main building structure (roof structure, staircase, building envelope, final structural elements)',
        keywords: {
          ar: ['مبنى', 'تشطيب الهيكل', 'إكمال', 'إنشاء المبنى', 'بناء كامل',
               'تشميع', 'تسقيف', 'أعمال سقف', 'سلم', 'سلالم',
               'غلاف', 'envelope', 'building envelope'],
          en: ['roof structure', 'staircase', 'building envelope', 'building completion',
               'enclosure', 'sheathing', 'structural completion']
        },
        boqKeywords: ['roofing', 'staircase', 'roof', 'envelope', 'façade structure'],
        boqWeights: [0.25, 0.20, 0.15, 0.10, 0.10],
        category: 'building_completion'
      },
      'MEP': {
        id: 'MEP',
        description: 'Mechanical, Electrical, and Plumbing installations (first fix and second fix)',
        keywords: {
          ar: ['تركيبات', 'كهرباء', 'مبرد', 'تكييف', 'صرف', 'سباكة',
               'دكت', 'دكتات', 'حريق', 'حماية', 'انذار', 'رشاش',
               'لوحات', 'تمديدات', 'توصيلات', 'ميكانيكي', 'كهربائي',
               'مروحة', 'شفاط', 'مكيف', 'توزيع', 'سباكة', 'حوض', 'مرحاض'],
          en: ['electrical', 'mechanical', 'plumbing', 'hvac', 'duct', 'air conditioning',
               'fire fighting', 'fire alarm', 'drainage', 'water supply', 'panel',
               'lighting', 'power', 'low voltage', 'CCTV', 'LAN', 'BMS',
               'first fix', 'second fix', 'fire sprinkler']
        },
        boqKeywords: ['electrical', 'mechanical', 'plumbing', 'hvac', 'fire', 'ductwork',
                      'sprinkler', 'lighting', 'panel', 'cable', 'pipe', 'ac unit',
                      'air handler', 'fan coil', 'chiller', 'booster'],
        boqWeights: [0.12, 0.12, 0.12, 0.10, 0.10, 0.10, 0.09, 0.08, 0.07, 0.05, 0.05, 0.04],
        category: 'mep'
      },
      'Finishing': {
        id: 'Finishing',
        description: 'Interior and exterior finishing works (plaster, paint, tiles, flooring, doors, windows, aluminum, glass)',
        keywords: {
          ar: ['تشطيب', 'لياسة', 'جبس', 'دهان', 'دهانات', 'معجون', 'برايمر',
               'بلاط', 'رخام', 'بورسلان', 'سيراميك', 'باركيه', 'PVC',
               'ألمنيوم', 'زجاج', 'أبواب', 'شبابيك', 'نجارة',
               'ديكور', 'واجهات', 'كسوة', 'تنظيف', 'نقاية',
               'تلميع', 'خزائن', 'نوافذ', 'واجهة', 'واجهات'],
          en: ['finishing', 'plaster', 'paint', 'tiles', 'marble', 'porcelain',
               'ceramic', 'parquet', 'pvc', 'aluminum', 'glass', 'doors', 'windows',
               'cabinetry', 'ceiling', 'decoration', 'facade', 'cladding', 'stone',
               'cleaning', 'polishing', 'final touch', 'interior finish', 'exterior finish']
        },
        boqKeywords: ['plaster', 'paint', 'tiles', 'marble', 'granite', 'porcelain',
                      'ceramic', 'parquet', 'PVC flooring', 'aluminum', 'glass',
                      'doors', 'windows', 'cabinets', 'drywall', 'ceiling',
                      'facing', 'cladding', 'stone', 'cleaning'],
        boqWeights: [0.13, 0.12, 0.11, 0.10, 0.09, 0.09, 0.08, 0.07, 0.06, 0.05, 0.05, 0.05],
        category: 'finishing'
      },
      'Furnishing': {
        id: 'Furnishing',
        keywords: {
          ar: ['أثاث', 'مطابخ', 'ستائر', 'سجاد', 'مفروشات', 'تجهيز',
               'ديكور', 'لوحات', 'نبات', 'حديقة', 'خوص', 'مبلمان'],
          en: ['furniture', 'carpets', 'curtains', 'decoration', 'mattress', 'bedding',
               'signage', 'accessories', 'landscape furniture', 'interior furnishing',
               'built-in', 'kitchen cabinets', 'wardrobe']
        },
        boqKeywords: ['furniture', 'carpet', 'curtain', 'signage', 'accessories',
                      'built-in wardrobe', 'kitchen'],
        boqWeights: [0.20, 0.15, 0.10, 0.10, 0.08, 0.08, 0.08, 0.06, 0.05, 0.05],
        category: 'furnishing'
      },
      'Testing': {
        id: 'Testing',
        keywords: {
          ar: ['اختبار', 'تشغيل', 'ضبط', 'تجريبي', 'تجريبية', 'trial',
               'فحص', 'تدفق', 'balance', 'balancing', 'calibration'],
          en: ['testing', 'commissioning', 'trial run', 'balancing', 'calibration',
               'handover testing', 'performance test', 'integration testing',
               'pressure test', 'flush', 'snagging test']
        },
        boqKeywords: ['testing', 'commissioning', 'trial', 'balancing', 'calibration', 'flushing'],
        boqWeights: [0.20, 0.15, 0.15, 0.10, 0.10, 0.10, 0.10, 0.05],
        category: 'testing'
      },
      'Handover': {
        id: 'Handover',
        keywords: {
          ar: ['تسليم', 'تسليم نهائي', 'المستندات', 'أدلة', 'تشغيل',
               'أدلة', 'O&M', 'O&M Manual', 'صيانة', 'تدريب',
               'قائمة', 'Punch', 'snag', 'as built', 'إجازة',
               'خروج', 'استلام', 'إغلاق', 'closeout', 'close-out',
               'تقرير', 'Certificate'],
          en: ['handover', 'punch list', 'snagging', 'as built', 'O&M manual',
               'training', 'final handover', 'closeout', 'completion certificate',
               'occupancy', 'inspection', 'final acceptance', 'defects']
        },
        boqKeywords: ['handover', 'punch list', 'snagging', 'as-built', 'O&M',
                      'closeout', 'training', 'inspection', 'certificate', 'commissioning report'],
        boqWeights: [0.20, 0.15, 0.15, 0.10, 0.10, 0.10, 0.10, 0.05, 0.05],
        category: 'handover'
      }
    };
  }

  analyze(projectData) {
    const factors = this._collectFactors(projectData);
    const scores = this._computeStageScores(factors);
    const distribution = this._computeDistribution(scores);
    const primaryStage = this._determinePrimaryStage(scores, distribution);
    const confidence = this._computeConfidence(factors, primaryStage, scores);

    const result = {
      project_type: projectData.type || 'unknown',
      primary_stage: primaryStage.id,
      secondary_stage: primaryStage.id,
      stage_confidence: confidence.overall,
      stage_percentages: distribution,
      reasoning: this._buildReasoning(factors, primaryStage, confidence, scores),
      evidence: {
        description_signals: factors.description.signals,
        boq_signals: factors.boq.signals,
        building_signals: factors.building.signals,
        mep_signals: factors.mep.signals,
        stage_override: factors.stageOverride
      },
      stages_detail: scores
    };

    console.log(`[StageClassifier] Classified: ${primaryStage.id} (confidence: ${confidence.overall.toFixed(2)}, project: ${projectData.type || 'unknown'})`);

    return result;
  }

  _collectFactors(projectData) {
    const description = this._getText(projectData);
    const boqItems = projectData.boq_items || projectData.boq?.items || [];
    const building = projectData.building || {};
    const mepSystems = projectData.mep_systems || building.systems || [];
    const finishing = projectData.finishing || building.finishing || '';
    const stageOverride = projectData.phase || projectData.stage || null;
    const projectName = projectData.name || '';

    return {
      description: this._analyzeText(description + ' ' + projectName),
      boq: this._analyzeBOQ(boqItems),
      building: this._analyzeBuilding(building, mepSystems, finishing),
      mep: this._analyzeMEP(mepSystems),
      stageOverride,
      finishing: finishing
    };
  }

  _getText(projectData) {
    const parts = [];
    if (projectData.description) parts.push(projectData.description);
    if (projectData.name) parts.push(projectData.name);
    if (projectData.project_type) parts.push(projectData.project_type);
    if (projectData.type) parts.push(projectData.type);
    if (projectData.summary) parts.push(projectData.summary);
    return parts.join(' ');
  }

  _analyzeText(text) {
    const signals = {};
    const lower = (text || '').toLowerCase();

    for (const [stageId, stageDef] of Object.entries(this.stages)) {
      let score = 0;
      const matchedKeywords = [];

      for (const kw of stageDef.keywords.ar) {
        if (lower.includes(kw)) {
          score += 1.0;
          matchedKeywords.push(kw);
        }
      }

      for (const kw of stageDef.keywords.en) {
        if (lower.includes(kw.toLowerCase())) {
          score += 1.0;
          matchedKeywords.push(kw);
        }
      }

      if (score > 0) {
        signals[stageId] = { score: Math.min(score / 5, 1.0), matchedKeywords };
      }
    }

    return signals;
  }

  _analyzeBOQ(items) {
    const signals = {};
    if (!items || !Array.isArray(items) || items.length === 0) return signals;

    for (const [stageId, stageDef] of Object.entries(this.stages)) {
      let matched = 0;
      const matchedItems = [];

      for (const item of items) {
        const desc = ((item.description || item.name || '') + ' ' + (item.category || '') + ' ' + (item.type || '')).toLowerCase();
        for (let i = 0; i < stageDef.boqKeywords.length; i++) {
          const kw = stageDef.boqKeywords[i];
          if (desc.includes(kw.toLowerCase())) {
            matched += stageDef.boqWeights[i] || 0.05;
            matchedItems.push(item.description || item.name);
          }
        }
      }

      if (matched > 0) {
        signals[stageId] = { score: Math.min(matched, 1.0), matchedItems: matchedItems.slice(0, 10) };
      }
    }

    return signals;
  }

  _analyzeBuilding(building, mepSystems, finishing) {
    const signals = {};
    const structuralElements = building.structuralElements || [];
    const materials = building.materials || [];
    const spaces = building.spaces || [];
    const finishingText = (finishing || '') + ' ' + building.finishingQuality + ' ' + building.finishingType;

    const hasStructural = structuralElements.some(e =>
      /column|beam|slab|wall|foundation|pile|raft|footing|grade beam|عمود|جدار|خرسانة|حديد/i.test(e)
    );
    const hasMEP = mepSystems.length > 0;
    const hasFinishing = /plaster|paint|tile|marble|aluminum|glass|door|window|finishing|لياسة|دهان|جبس|بلاط|رخام|بورسلان|سيراميك|ألمنيوم|زجاج|أبواب|شبابيك|ديكور|نجارة|باركيه|واجهة|معجون|برايمر|فساين/i.test(finishingText);
    const hasFoundation = materials.some(m => /concrete|foundation|pile|raft|خرسانة|أساس|خوازيق|قاعدة|لبة|لبشة/i.test(m));
    const isHighRise = building.floors > 3;

    if (hasStructural) signals['Construction'] = { score: 0.6, source: 'structural_elements' };
    if (hasMEP) signals['MEP'] = { score: Math.min(mepSystems.length * 0.2, 0.8), source: 'mep_systems' };
    if (hasFinishing) signals['Finishing'] = { score: 0.7, source: 'finishing' };
    if (hasFoundation) signals['Foundation'] = { score: 0.5, source: 'materials' };
    if (isHighRise) {
      if (!hasFinishing) signals['Construction'] = { score: (signals['Construction']?.score || 0) + 0.15, source: 'high_floor_count' };
      if (hasStructural) signals['Building Completion'] = { score: 0.25, source: 'high_rise_structure' };
    }

    return signals;
  }

  _analyzeMEP(mepSystems) {
    const signals = {};
    if (!mepSystems || mepSystems.length === 0) return signals;

    const score = Math.min(mepSystems.length * 0.15, 0.9);
    signals['MEP'] = { score, source: 'mep_count:' + mepSystems.length };

    return signals;
  }

  _computeStageScores(factors) {
    const scores = {};

    for (const [stageId, stageDef] of Object.entries(this.stages)) {
      let score = 0;
      const evidence = [];

      const descSignal = factors.description[stageId];
      if (descSignal) { score += descSignal.score * 1.0; evidence.push(`description match (${descSignal.matchedKeywords.length} keywords)`); }

      const boqSignal = factors.boq[stageId];
      if (boqSignal) { score += boqSignal.score; evidence.push(`BOQ match (${boqSignal.matchedItems.length} items, score: ${boqSignal.score.toFixed(2)})`); }

      const buildingSignal = factors.building[stageId];
      if (buildingSignal) { score += buildingSignal.score * 0.5; evidence.push(`building data match (${buildingSignal.source})`); }

      const mepSignal = factors.mep[stageId];
      if (mepSignal) { score += mepSignal.score * 0.5; evidence.push(`MEP data match (${mepSignal.source})`); }

      if (factors.stageOverride && factors.stageOverride.toLowerCase().includes(stageId.toLowerCase().split(' ')[0])) {
        score += 0.3;
        evidence.push(`stage override: ${factors.stageOverride}`);
      }

      scores[stageId] = { score: Math.min(score, 1.0), evidence };
    }

    return scores;
  }

  _computeDistribution(scores) {
    const total = Object.values(scores).reduce((sum, s) => sum + s.score, 0);
    if (total === 0) {
      return { 'Construction': 100 };
    }

    const distribution = {};
    for (const [stageId, stageScore] of Object.entries(scores)) {
      distribution[stageId] = Math.round((stageScore.score / total) * 100);
    }

    const distTotal = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (distTotal !== 100) {
      const topStage = Object.entries(distribution).sort((a, b) => b[1] - a[1])[0];
      distribution[topStage[0]] = (distribution[topStage[0]] || 0) + (100 - distTotal);
    }

    return distribution;
  }

  _determinePrimaryStage(scores, distribution) {
    const sorted = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
    const topId = sorted[0][0];
    const topScore = sorted[0][1].score;

    if (topScore < 0.02) {
      return this.stages['Construction'];
    }

    return this.stages[topId];
  }

  _computeConfidence(factors, primaryStage, scores) {
    const evidenceSources = [];
    if (Object.keys(factors.description).length > 0) evidenceSources.push('description');
    if (Object.keys(factors.boq).length > 0) evidenceSources.push('BOQ');
    if (Object.keys(factors.building).length > 0) evidenceSources.push('building data');
    if (Object.keys(factors.mep).length > 0) evidenceSources.push('MEP data');
    if (factors.stageOverride) evidenceSources.push('stage override');
    if (factors.finishing) evidenceSources.push('finishing quality');

    const dataCount = evidenceSources.length;
    const baseConfidence = Math.min(dataCount * 0.20, 0.70);
    const topScore = scores[primaryStage.id]?.score || 0;
    const scoreBoost = topScore * 0.25;
    const overrideBoost = factors.stageOverride ? 0.15 : 0;

    const overall = Math.min(baseConfidence + scoreBoost + overrideBoost, 0.99);
    const perStage = {};
    for (const [stageId, stageScore] of Object.entries(scores)) {
      perStage[stageId] = Math.min(stageScore.score * 0.85 + baseConfidence * 0.15, 0.99);
    }

    return { overall: Math.round(overall * 100) / 100, perStage, evidenceSources, dataCount };
  }

  _buildReasoning(factors, primaryStage, confidence, scores) {
    const reasons = [];
    reasons.push(`Primary stage: ${primaryStage.id} (${(confidence.overall * 100).toFixed(0)}% confidence)`);

    if (factors.stageOverride) {
      reasons.push(`User-provided stage override: "${factors.stageOverride}"`);
    }

    const descKeys = Object.keys(factors.description || {});
    if (descKeys.length > 0) {
      const topDesc = descKeys.slice(0, 3).join(', ');
      reasons.push(`Description keywords matched: ${topDesc}`);
    }

    const boqKeys = Object.keys(factors.boq || {});
    if (boqKeys.length > 0) {
      const topBoq = boqKeys.slice(0, 3).join(', ');
      reasons.push(`BOQ items matched stages: ${topBoq}`);
    }

    if (factors.building && Object.keys(factors.building).length > 0) {
      const bKeys = Object.keys(factors.building).join(', ');
      reasons.push(`Building data indicators: ${bKeys}`);
    }

    if (factors.mep && Object.keys(factors.mep).length > 0) {
      reasons.push(`MEP systems detected (${factors.mep.MEP?.source || 'multiple'})`);
    }

    if (factors.finishing) {
      reasons.push(`Finishing quality detected: "${factors.finishing}"`);
    }

    const dist = this._computeDistribution(
      Object.fromEntries(Object.entries(this.stages).map(([id]) => [id, (scores?.[id] || {}).score || 0]))
    );
    const nonZeroStages = Object.entries(dist).filter(([_, v]) => v > 0);
    if (nonZeroStages.length > 1) {
      reasons.push(`Multi-stage project: ${nonZeroStages.map(([s, v]) => `${s} ${v}%`).join(', ')}`);
    }

    return reasons;
  }

  getStageDef(stageId) {
    return this.stages[stageId] || null;
  }
}
module.exports = new StageClassifier();
