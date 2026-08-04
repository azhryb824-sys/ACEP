class PhasesEngine {
  constructor() {
    this.phases = [
      {
        id: 'EXC',
        nameAr: 'الحفر والأعمال الترابية',
        nameEn: 'Excavation & Earthworks',
        order: 1,
        parent: null,
        childPhases: ['FDN'],
        required: true,
        typicalDuration: 15,
        description: 'أعمال الحفر والردم وتسوية الموقع',
        dependencies: []
      },
      {
        id: 'FDN',
        nameAr: 'الأساسات',
        nameEn: 'Foundation',
        order: 2,
        parent: 'EXC',
        childPhases: ['STR'],
        required: true,
        typicalDuration: 25,
        description: 'أعمال الأساسات الخرسانية والقواعد المسلحة',
        dependencies: ['EXC']
      },
      {
        id: 'STR',
        nameAr: 'الهيكل الخرساني',
        nameEn: 'Structure',
        order: 3,
        parent: 'FDN',
        childPhases: ['MSN', 'INS', 'ELC', 'PLB', 'HVAC', 'ELV'],
        required: true,
        typicalDuration: 45,
        description: 'أعمال الهيكل الخرساني والأعمدة والسقوف',
        dependencies: ['FDN']
      },
      {
        id: 'MSN',
        nameAr: 'المباني',
        nameEn: 'Masonry',
        order: 4,
        parent: 'STR',
        childPhases: ['WPR', 'WDW', 'GAS'],
        required: true,
        typicalDuration: 30,
        description: 'أعمال بناء الطوب والطابوق والقواطع',
        dependencies: ['STR']
      },
      {
        id: 'WPR',
        nameAr: 'العزل المائي',
        nameEn: 'Waterproofing',
        order: 5,
        parent: 'MSN',
        childPhases: ['PLS'],
        required: true,
        typicalDuration: 10,
        description: 'أعمال العزل المائي للأسطح والحمامات والخزانات',
        dependencies: ['MSN']
      },
      {
        id: 'INS',
        nameAr: 'العزل الحراري',
        nameEn: 'Thermal Insulation',
        order: 6,
        parent: 'STR',
        childPhases: ['PLS'],
        required: false,
        typicalDuration: 8,
        description: 'أعمال العزل الحراري للجدران والأسقف',
        dependencies: ['STR']
      },
      {
        id: 'PLS',
        nameAr: 'اللياسة',
        nameEn: 'Plastering',
        order: 7,
        parent: 'WPR',
        childPhases: ['CER'],
        required: true,
        typicalDuration: 20,
        description: 'أعمال اللياسة والتلييس للجدران والأسقف',
        dependencies: ['WPR', 'INS']
      },
      {
        id: 'CER',
        nameAr: 'السيراميك والبلاط',
        nameEn: 'Ceramic & Tiling',
        order: 8,
        parent: 'PLS',
        childPhases: ['STN', 'PNT'],
        required: true,
        typicalDuration: 25,
        description: 'أعمال تركيب السيراميك والبلاط للأرضيات والجدران',
        dependencies: ['PLS']
      },
      {
        id: 'STN',
        nameAr: 'الحجر والواجهات',
        nameEn: 'Stone & Facade',
        order: 9,
        parent: 'CER',
        childPhases: [],
        required: false,
        typicalDuration: 20,
        description: 'أعمال تكسية الواجهات بالحجر والمواد الطبيعية',
        dependencies: ['CER']
      },
      {
        id: 'WDW',
        nameAr: 'الأبواب والشبابيك',
        nameEn: 'Doors & Windows',
        order: 10,
        parent: 'MSN',
        childPhases: [],
        required: true,
        typicalDuration: 15,
        description: 'أعمال تركيب الأبواب والشبابيك والألمنيوم',
        dependencies: ['MSN']
      },
      {
        id: 'PNT',
        nameAr: 'الدهانات',
        nameEn: 'Painting',
        order: 11,
        parent: 'CER',
        childPhases: ['FIN'],
        required: true,
        typicalDuration: 15,
        description: 'أعمال الدهانات والديكورات الداخلية',
        dependencies: ['CER']
      },
      {
        id: 'FIN',
        nameAr: 'التشطيبات النهائية',
        nameEn: 'Finishing',
        order: 12,
        parent: 'PNT',
        childPhases: ['CLN'],
        required: true,
        typicalDuration: 20,
        description: 'أعمال التشطيبات النهائية والتجهيزات الداخلية',
        dependencies: ['PNT']
      },
      {
        id: 'ELC',
        nameAr: 'الكهرباء',
        nameEn: 'Electrical',
        order: 13,
        parent: 'STR',
        childPhases: ['FIR', 'COM'],
        required: true,
        typicalDuration: 30,
        description: 'أعمال التمديدات الكهربائية واللوحات والتوصيلات',
        dependencies: ['STR']
      },
      {
        id: 'PLB',
        nameAr: 'السباكة',
        nameEn: 'Plumbing',
        order: 14,
        parent: 'STR',
        childPhases: ['FIR'],
        required: true,
        typicalDuration: 25,
        description: 'أعمال التمديدات الصحية والسباكة الداخلية',
        dependencies: ['STR']
      },
      {
        id: 'HVAC',
        nameAr: 'التكييف',
        nameEn: 'HVAC',
        order: 15,
        parent: 'STR',
        childPhases: ['ACO'],
        required: false,
        typicalDuration: 20,
        description: 'أعمال أنظمة التكييف والتهوية والتبريد',
        dependencies: ['STR']
      },
      {
        id: 'GAS',
        nameAr: 'الغاز',
        nameEn: 'Gas',
        order: 16,
        parent: 'MSN',
        childPhases: [],
        required: false,
        typicalDuration: 10,
        description: 'أعمال تمديدات الغاز الطبيعي',
        dependencies: ['MSN']
      },
      {
        id: 'FIR',
        nameAr: 'أنظمة الحريق',
        nameEn: 'Fire Protection',
        order: 17,
        parent: 'ELC',
        childPhases: [],
        required: true,
        typicalDuration: 15,
        description: 'أعمال أنظمة الحريق والإنذار والإطفاء',
        dependencies: ['ELC', 'PLB']
      },
      {
        id: 'ACO',
        nameAr: 'الصوتيات',
        nameEn: 'Acoustics',
        order: 18,
        parent: 'HVAC',
        childPhases: [],
        required: false,
        typicalDuration: 10,
        description: 'أعمال العزل الصوتي والمعالجة الصوتية',
        dependencies: ['HVAC']
      },
      {
        id: 'COM',
        nameAr: 'الاتصالات',
        nameEn: 'Communications',
        order: 19,
        parent: 'ELC',
        childPhases: [],
        required: false,
        typicalDuration: 10,
        description: 'أعمال شبكات الاتصالات والبيانات والإنترنت',
        dependencies: ['ELC']
      },
      {
        id: 'ELV',
        nameAr: 'المصاعد',
        nameEn: 'Elevators',
        order: 20,
        parent: 'STR',
        childPhases: [],
        required: false,
        typicalDuration: 30,
        description: 'أعمال تركيب المصاعد والسلالم الكهربائية',
        dependencies: ['STR']
      },
      {
        id: 'EXT',
        nameAr: 'الأعمال الخارجية',
        nameEn: 'External Works',
        order: 21,
        parent: null,
        childPhases: ['LND'],
        required: false,
        typicalDuration: 20,
        description: 'أعمال الطرق والأرصفة والمواقف الخارجية',
        dependencies: ['FIN']
      },
      {
        id: 'LND',
        nameAr: 'اللاندسكيب',
        nameEn: 'Landscaping',
        order: 22,
        parent: 'EXT',
        childPhases: ['SWM'],
        required: false,
        typicalDuration: 15,
        description: 'أعمال تنسيق الموقع والزراعة والتشجير',
        dependencies: ['EXT']
      },
      {
        id: 'SWM',
        nameAr: 'شبكات الصرف',
        nameEn: 'Drainage & Sewerage',
        order: 23,
        parent: 'LND',
        childPhases: [],
        required: true,
        typicalDuration: 15,
        description: 'أعمال شبكات الصرف الصحي والمياه السطحية',
        dependencies: ['LND']
      },
      {
        id: 'CLN',
        nameAr: 'التنظيف النهائي',
        nameEn: 'Final Cleaning',
        order: 24,
        parent: 'FIN',
        childPhases: [],
        required: true,
        typicalDuration: 5,
        description: 'أعمال التنظيف النهائي للموقع والمبنى',
        dependencies: ['FIN']
      }
    ];

    this.projectTypes = {
      villa: {
        name: 'Villa',
        nameAr: 'فيلا',
        phases: ['EXC', 'FDN', 'STR', 'MSN', 'WPR', 'INS', 'PLS', 'CER', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'EXT', 'LND', 'SWM', 'CLN']
      },
      luxury_villa: {
        name: 'Luxury_Villa',
        nameAr: 'فيلا فاخرة',
        phases: ['EXC', 'FDN', 'STR', 'MSN', 'WPR', 'INS', 'PLS', 'CER', 'STN', 'WDW', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'GAS', 'FIR', 'COM', 'EXT', 'LND', 'SWM', 'CLN']
      },
      apartment_finishing: {
        name: 'Apartment_Finishing',
        nameAr: 'تشطيب شقة',
        phases: ['WPR', 'INS', 'PLS', 'CER', 'WDW', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'FIR', 'ACO', 'COM', 'CLN']
      },
      apartment_building: {
        name: 'Apartment_Building',
        nameAr: 'مبنى سكني',
        phases: ['EXC', 'FDN', 'STR', 'MSN', 'WPR', 'PLS', 'CER', 'STN', 'WDW', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'GAS', 'FIR', 'COM', 'ELV', 'EXT', 'LND', 'SWM', 'CLN']
      },
      tower: {
        name: 'Tower',
        nameAr: 'برج',
        phases: ['EXC', 'FDN', 'STR', 'MSN', 'WPR', 'INS', 'PLS', 'CER', 'STN', 'WDW', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'GAS', 'FIR', 'ACO', 'COM', 'ELV', 'EXT', 'LND', 'SWM', 'CLN']
      },
      residential_tower: {
        name: 'Residential_Tower',
        nameAr: 'برج سكني',
        phases: ['EXC', 'FDN', 'STR', 'MSN', 'WPR', 'INS', 'PLS', 'CER', 'STN', 'WDW', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'GAS', 'FIR', 'ACO', 'COM', 'ELV', 'EXT', 'LND', 'SWM', 'CLN']
      },
      residential_compound: {
        name: 'Residential_Compound',
        nameAr: 'مجمع سكني',
        phases: ['EXC', 'FDN', 'STR', 'MSN', 'WPR', 'INS', 'PLS', 'CER', 'STN', 'WDW', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'GAS', 'FIR', 'ACO', 'COM', 'EXT', 'LND', 'SWM', 'CLN']
      },
      school: {
        name: 'School',
        nameAr: 'مدرسة',
        phases: ['EXC', 'FDN', 'STR', 'MSN', 'WPR', 'PLS', 'CER', 'WDW', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'FIR', 'ACO', 'COM', 'EXT', 'LND', 'SWM', 'CLN']
      },
      hospital: {
        name: 'Hospital',
        nameAr: 'مستشفى',
        phases: ['EXC', 'FDN', 'STR', 'MSN', 'WPR', 'INS', 'PLS', 'CER', 'STN', 'WDW', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'GAS', 'FIR', 'ACO', 'COM', 'ELV', 'EXT', 'LND', 'SWM', 'CLN']
      },
      mosque: {
        name: 'Mosque',
        nameAr: 'مسجد',
        phases: ['EXC', 'FDN', 'STR', 'MSN', 'WPR', 'INS', 'PLS', 'CER', 'STN', 'WDW', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'FIR', 'ACO', 'EXT', 'LND', 'SWM', 'CLN']
      },
      mall: {
        name: 'Mall',
        nameAr: 'مول تجاري',
        phases: ['EXC', 'FDN', 'STR', 'MSN', 'WPR', 'INS', 'PLS', 'CER', 'STN', 'WDW', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'FIR', 'ACO', 'COM', 'ELV', 'EXT', 'LND', 'SWM', 'CLN']
      },
      commercial_building: {
        name: 'Commercial_Building',
        nameAr: 'مبنى تجاري',
        phases: ['EXC', 'FDN', 'STR', 'MSN', 'WPR', 'PLS', 'CER', 'STN', 'WDW', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'FIR', 'COM', 'ELV', 'EXT', 'LND', 'SWM', 'CLN']
      },
      warehouse: {
        name: 'Warehouse',
        nameAr: 'مستودع',
        phases: ['EXC', 'FDN', 'STR', 'WPR', 'PLS', 'CER', 'PNT', 'FIN', 'ELC', 'PLB', 'FIR', 'EXT', 'SWM', 'CLN']
      },
      office: {
        name: 'Office',
        nameAr: 'مكتب',
        phases: ['EXC', 'FDN', 'STR', 'MSN', 'WPR', 'INS', 'PLS', 'CER', 'WDW', 'PNT', 'FIN', 'ELC', 'PLB', 'HVAC', 'FIR', 'ACO', 'COM', 'EXT', 'LND', 'SWM', 'CLN']
      }
    };
  }

  getAllPhases() {
    return [...this.phases].sort((a, b) => a.order - b.order);
  }

  getPhase(id) {
    return this.phases.find(p => p.id === id) || null;
  }

  getPhasesByProjectType(type) {
    const key = (type || '').toLowerCase();
    const projectType = this.projectTypes[key];
    if (!projectType) return [];
    return projectType.phases
      .map(id => this.getPhase(id))
      .filter(p => p !== null)
      .sort((a, b) => a.order - b.order);
  }

  getRequiredPhases() {
    return this.phases
      .filter(p => p.required)
      .sort((a, b) => a.order - b.order);
  }

  getChildPhases(parentId) {
    const parent = this.getPhase(parentId);
    if (!parent) return [];
    return parent.childPhases
      .map(id => this.getPhase(id))
      .filter(p => p !== null)
      .sort((a, b) => a.order - b.order);
  }

  getPhaseTimeline(projectType, area = 300, floors = 2) {
    const phases = this.getPhasesByProjectType(projectType);
    if (phases.length === 0) return [];

    const baseMultiplier = 1 + (area - 300) / 500 + (floors - 1) * 0.15;
    const multiplier = Math.max(0.5, Math.min(3, baseMultiplier));
    let currentDay = 1;

    return phases.map(phase => {
      const duration = Math.round(phase.typicalDuration * multiplier);
      const start = currentDay;
      const end = currentDay + duration - 1;
      currentDay = end + 1;

      return {
        id: phase.id,
        nameAr: phase.nameAr,
        nameEn: phase.nameEn,
        duration,
        startDay: start,
        endDay: end,
        order: phase.order
      };
    });
  }

  validatePhaseSequence(phaseIds) {
    const results = [];
    const phaseMap = {};
    phaseIds.forEach(id => {
      const phase = this.getPhase(id);
      if (phase) phaseMap[id] = phase;
    });

    for (let i = 0; i < phaseIds.length; i++) {
      const current = phaseMap[phaseIds[i]];
      if (!current) {
        results.push({ id: phaseIds[i], valid: false, message: `المرحلة ${phaseIds[i]} غير موجودة` });
        continue;
      }

      const missingDeps = current.dependencies.filter(dep => !phaseIds.includes(dep));
      if (missingDeps.length > 0) {
        results.push({
          id: current.id,
          valid: false,
          message: `تفتقد للمراحل التابعة: ${missingDeps.join(', ')}`
        });
        continue;
      }

      const depPositions = current.dependencies.map(dep => phaseIds.indexOf(dep));
      const maxDepPos = Math.max(...depPositions, -1);
      if (i < maxDepPos) {
        results.push({
          id: current.id,
          valid: false,
          message: `ترتيب غير صحيح: يجب أن تأتي بعد المراحل ${current.dependencies.join(', ')}`
        });
        continue;
      }

      results.push({ id: current.id, valid: true, message: 'الترتيب صحيح' });
    }

    return results;
  }

  detectMissingPhases(projectType, existingPhases) {
    const required = this.getPhasesByProjectType(projectType);
    if (required.length === 0) return [];

    const existingSet = new Set(existingPhases);
    const missing = [];

    for (const phase of required) {
      if (!existingSet.has(phase.id)) {
        const depsMet = phase.dependencies.every(d => existingSet.has(d) || missing.some(m => m.id === d));
        missing.push({
          id: phase.id,
          nameAr: phase.nameAr,
          nameEn: phase.nameEn,
          order: phase.order,
          required: phase.required,
          dependenciesMet: depsMet,
          message: depsMet
            ? `المرحلة ${phase.nameAr} مفقودة وجاهزة للإضافة`
            : `المرحلة ${phase.nameAr} مفقودة (تحتاج لإكمال المراحل التابعة أولاً)`
        });
      }
    }

    return missing.sort((a, b) => a.order - b.order);
  }
}

module.exports = PhasesEngine;