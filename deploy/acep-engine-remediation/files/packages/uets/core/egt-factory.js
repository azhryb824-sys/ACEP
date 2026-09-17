const { EngineeringGroundTruth } = require('./engineering-ground-truth');
const crypto = require('crypto');

class EGTFactory {
  constructor() {
    this.PROJECT_TYPES = ['Villa', 'Building', 'Tower', 'Hotel', 'Mosque', 'Hospital', 'School', 'Mall', 'Warehouse', 'Bridge', 'Road', 'Factory', 'Farm', 'Infrastructure', 'WaterTreatment', 'Sports', 'Office', 'Residential', 'Commercial', 'Apartment', 'Compound', 'Palace', 'MixedUse'];
    this.FINISHING_LEVELS = ['Raw', 'Standard', 'Good', 'Premium', 'Luxury', 'UltraLuxury'];
  }

  fromCSVProject(row) {
    const projectType = this._normalizeProjectType(row.project_type || row.type || 'Building');
    const area = parseFloat(row.building_area_m2 || row.area || 0);
    const floors = parseInt(row.floors || 1);
    const finishing = this._normalizeFinishing(row.finishing_level || row.finishing || 'Standard');

    const egt = new EngineeringGroundTruth({
      source: 'csv',
      sourceYear: Number(row.year) || null,
      originalId: row.project_id || `csv-${crypto.randomUUID()}`,
      description: {
        ar: `${projectType} بمساحة ${area} متر مربع و ${floors} دور${floors > 1 ? 'ور' : ''}`,
        en: `${projectType} with area ${area} sqm and ${floors} floor${floors > 1 ? 's' : ''}`
      },
      classification: {
        projectType,
        complexity: this._calculateComplexity(area, floors),
        constructionStage: 'shell_and_core',
        confidence: 0.85
      },
      geometry: {
        landArea: parseFloat(row.land_area_m2 || 0),
        buildingArea: area,
        totalArea: area * floors,
        areaBasis: 'gross_floor_area',
        floors,
        floorHeight: 3.0,
        rooms: parseInt(row.units || 0),
        units: parseInt(row.units || 0),
        structure: row.structural_system || 'RC Frame',
        finishing,
        constructionMethod: row.construction_method || 'Conventional'
      },
      location: {
        city: row.city || '',
        region: row.region || ''
      },
      cost: {
        total: parseFloat(row.estimated_cost_sar || 0),
        perM2: area > 0 && floors > 0 ? parseFloat(row.estimated_cost_sar || 0) / (area * floors) : 0,
        areaBasis: 'gross_floor_area'
      },
      schedule: {
        totalDurationMonths: parseFloat(row.duration_months || 0)
      },
      confidence: 0.85,
      tags: ['csv', projectType.toLowerCase(), row.city ? row.city.toLowerCase() : 'unknown']
    });

    if (row.concrete_m3) egt.materials.push({ name: 'Concrete', nameAr: 'خرسانة', unit: 'm³', quantity: parseFloat(row.concrete_m3) });
    if (row.steel_ton) egt.materials.push({ name: 'Steel Reinforcement', nameAr: 'حديد تسليح', unit: 'ton', quantity: parseFloat(row.steel_ton) });
    if (row.blocks_m2) egt.materials.push({ name: 'Concrete Blocks', nameAr: 'بلوك', unit: 'm²', quantity: parseFloat(row.blocks_m2) });
    if (row.tiles_m2) egt.materials.push({ name: 'Tiles', nameAr: 'بلاط', unit: 'm²', quantity: parseFloat(row.tiles_m2) });
    if (row.paint_m2) egt.materials.push({ name: 'Paint', nameAr: 'دهان', unit: 'm²', quantity: parseFloat(row.paint_m2) });
    if (row.electrical_points) egt.materials.push({ name: 'Electrical Points', nameAr: 'نقاط كهرباء', unit: 'point', quantity: parseFloat(row.electrical_points) });
    if (row.plumbing_points) egt.materials.push({ name: 'Plumbing Points', nameAr: 'نقاط سباكة', unit: 'point', quantity: parseFloat(row.plumbing_points) });

    return egt;
  }

  fromCSVBOQItem(row) {
    return {
      code: row.item_code || '',
      description: row.description_ar || '',
      descriptionAr: row.description_ar || '',
      category: row.category || '',
      unit: row.unit || 'm³',
      quantity: parseFloat(row.quantity || 0),
      unitPrice: parseFloat(row.unit_price_sar || 0),
      totalPrice: parseFloat(row.quantity || 0) * parseFloat(row.unit_price_sar || 0),
      wasteFactor: parseFloat(row.waste_factor || 1.05),
      confidence: parseFloat(row.confidence || 0.7)
    };
  }

  fromCSVMaterialPrice(row) {
    return {
      name: row.material_name || '',
      category: (row.material_name || '').toLowerCase().includes('cement') ? 'Cement' : (row.material_name || '').toLowerCase().includes('steel') || (row.material_name || '').toLowerCase().includes('rebar') ? 'Steel' : 'General',
      unit: row.unit || 'm³',
      quantity: 0,
      unitPrice: parseFloat(row.avg_price_sar || 0),
      totalPrice: 0,
      qualityGrade: row.quality_grade || 'Standard'
      , priceDate: row.price_date || null
    };
  }

  fromCSVRisk(row) {
    return {
      category: row.risk_category || 'general',
      description: row.description || '',
      descriptionAr: row.description || '',
      probability: Number(row.probability) / 5,
      impact: Number(row.impact) / 5,
      riskScore: Number(row.probability) * Number(row.impact) / 25,
      mitigation: row.mitigation || ''
    };
  }

  fromCSVQualityDefect(row) {
    return {
      type: row.defect_type || 'general',
      severity: ({ Critical: 3, High: 2, Medium: 1, Low: 0.5 })[row.severity] ?? Number(row.severity),
      location: row.location || '',
      elementType: row.element_type || '',
      confidence: parseFloat(row.confidence || 0.7)
    };
  }

  fromEDLProject(edlProject) {
    const projectData = typeof edlProject.getEffective === 'function' ? edlProject.getEffective() : edlProject;
    const boqData = projectData.boq || projectData.boqItems || [];
    const costData = projectData.cost || {};
    const scheduleData = projectData.schedule || {};
    const risksData = projectData.risks || projectData.risk || [];

    const egt = new EngineeringGroundTruth({
      source: 'edl',
      originalId: projectData.projectId || projectData.id || `edl-${Date.now()}`,
      description: {
        ar: projectData.description || projectData.projectDescription || '',
        en: projectData.descriptionEn || projectData.projectDescription || ''
      },
      classification: {
        projectType: this._normalizeProjectType(projectData.projectType || projectData.type || 'Building'),
        complexity: projectData.complexity || 5,
        constructionStage: projectData.constructionStage || '',
        confidence: projectData.confidence || 0.8
      },
      geometry: {
        totalArea: parseFloat(projectData.area || projectData.totalArea || 0),
        buildingArea: parseFloat(projectData.buildingArea || projectData.area || 0),
        floors: parseInt(projectData.floors || 1),
        finishing: projectData.finishing || projectData.finishingLevel || 'Standard'
      },
      location: {
        city: projectData.city || '',
        region: projectData.region || ''
      },
      boq: Array.isArray(boqData) ? boqData.map(b => ({
        code: b.code || b.itemCode || '',
        description: b.description || b.descriptionAr || '',
        descriptionAr: b.descriptionAr || b.description || '',
        category: b.category || '',
        unit: b.unit || 'm³',
        quantity: parseFloat(b.quantity || 0),
        unitPrice: parseFloat(b.unitPrice || b.unit_price || 0),
        totalPrice: parseFloat(b.totalPrice || b.total_price || 0),
        confidence: parseFloat(b.confidence || 0.7)
      })) : [],
      cost: {
        total: parseFloat(costData.total || costData.totalCost || costData.estimatedCost || 0),
        perM2: parseFloat(costData.perM2 || costData.costPerM2 || 0),
        breakdown: {
          materials: parseFloat((costData.breakdown && costData.breakdown.materials) || 0),
          labor: parseFloat((costData.breakdown && costData.breakdown.labor) || 0),
          equipment: parseFloat((costData.breakdown && costData.breakdown.equipment) || 0),
          subcontractor: parseFloat((costData.breakdown && costData.breakdown.subcontractor) || 0),
          overhead: parseFloat((costData.breakdown && costData.breakdown.overhead) || 0),
          contingency: parseFloat((costData.breakdown && costData.breakdown.contingency) || 0)
        }
      },
      schedule: {
        totalDurationMonths: parseFloat(scheduleData.totalDurationMonths || scheduleData.durationMonths || scheduleData.duration || 0),
        phases: Array.isArray(scheduleData.phases) ? scheduleData.phases : []
      },
      risks: Array.isArray(risksData) ? risksData.map(r => ({
        category: r.category || r.riskCategory || 'general',
        description: r.description || '',
        probability: parseFloat(r.probability || 0.3),
        impact: parseFloat(r.impact || 0.5),
        riskScore: parseFloat(r.probability || 0.3) * parseFloat(r.impact || 0.5),
        mitigation: r.mitigation || ''
      })) : [],
      confidence: 0.8,
      tags: ['edl']
    });

    return egt;
  }

  fromContinuousLearningRecord(record) {
    const egt = new EngineeringGroundTruth({
      source: 'continuous-learning',
      originalId: record.projectId || record.id || `cl-${Date.now()}`,
      description: {
        ar: record.description || '',
        en: record.descriptionEn || ''
      },
      classification: {
        projectType: this._normalizeProjectType(record.projectType || record.type || 'Building'),
        complexity: record.complexity || 5
      },
      geometry: {
        totalArea: parseFloat(record.area || 0),
        floors: parseInt(record.floors || 1)
      },
      boq: Array.isArray(record.boq) ? record.boq : [],
      cost: {
        total: parseFloat(record.cost || record.totalCost || 0)
      },
      confidence: record.confidence || 0.75,
      tags: ['continuous-learning']
    });

    return egt;
  }

  fromKBProject(kbProject) {
    return new EngineeringGroundTruth({
      source: 'knowledge-base',
      originalId: kbProject.id || kbProject.projectId || `kb-${Date.now()}`,
      description: {
        ar: kbProject.descriptionAr || kbProject.description || '',
        en: kbProject.description || ''
      },
      classification: {
        projectType: this._normalizeProjectType(kbProject.projectType || kbProject.type || 'Building')
      },
      geometry: {
        totalArea: parseFloat(kbProject.area || kbProject.totalArea || 0),
        floors: parseInt(kbProject.floors || 1)
      },
      location: {
        city: kbProject.city || '',
        region: kbProject.region || ''
      },
      cost: {
        total: parseFloat(kbProject.cost || kbProject.totalCost || 0)
      },
      confidence: 0.7,
      tags: ['knowledge-base']
    });
  }

  fromProjectProfile(profile) {
    return new EngineeringGroundTruth({
      source: 'project-profile',
      originalId: profile.projectId || profile.id || `profile-${Date.now()}`,
      description: {
        ar: profile.descriptionAr || profile.description || '',
        en: profile.description || ''
      },
      classification: {
        projectType: this._normalizeProjectType(profile.projectType || profile.type || 'Building'),
        subType: profile.subType || '',
        complexity: profile.complexity || 5,
        constructionStage: profile.constructionStage || '',
        confidence: profile.confidence || 0.9
      },
      geometry: {
        landArea: parseFloat(profile.landArea || profile.land_area || 0),
        buildingArea: parseFloat(profile.buildingArea || profile.building_area || 0),
        totalArea: parseFloat(profile.totalArea || profile.area || 0),
        floors: parseInt(profile.floors || 1),
        rooms: parseInt(profile.rooms || 0),
        units: parseInt(profile.units || 0),
        structure: profile.structuralSystem || profile.structure || 'RC Frame',
        finishing: profile.finishingLevel || profile.finishing || 'Standard'
      },
      location: {
        city: profile.city || '',
        region: profile.region || ''
      },
      confidence: 0.9,
      tags: ['project-profile']
    });
  }

  _normalizeProjectType(type) {
    if (!type || typeof type !== 'string') return 'Building';
    const t = type.trim();
    const map = {
      'villa': 'Villa', 'building': 'Building', 'tower': 'Tower', 'hotel': 'Hotel',
      'mosque': 'Mosque', 'hospital': 'Hospital', 'school': 'School', 'mall': 'Mall',
      'warehouse': 'Warehouse', 'bridge': 'Bridge', 'road': 'Road', 'factory': 'Factory',
      'farm': 'Farm', 'infrastructure': 'Infrastructure', 'water treatment': 'WaterTreatment',
      'sports': 'Sports', 'office': 'Office', 'residential': 'Residential',
      'commercial': 'Commercial', 'apartment': 'Apartment', 'compound': 'Compound',
      'palace': 'Palace', 'mixed use': 'MixedUse', 'mixed-use': 'MixedUse',
      'فيلا': 'Villa', 'عمارة': 'Building', 'برج': 'Tower', 'فندق': 'Hotel',
      'مسجد': 'Mosque', 'مستشفى': 'Hospital', 'مدرسة': 'School', 'مول': 'Mall',
      'مستودع': 'Warehouse', 'جسر': 'Bridge', 'طريق': 'Road', 'مصنع': 'Factory',
      'مزرعة': 'Farm', 'بنية تحتية': 'Infrastructure', 'محطة معالجة': 'WaterTreatment',
      'نادي': 'Sports', 'مكتب': 'Office', 'سكني': 'Residential', 'تجاري': 'Commercial',
      'شقة': 'Apartment', 'مجمع سكني': 'Compound', 'قصر': 'Palace', 'استخدامات متعددة': 'MixedUse'
    };
    return map[t.toLowerCase()] || 'Building';
  }

  _normalizeFinishing(level) {
    if (!level || typeof level !== 'string') return 'Standard';
    const l = level.toLowerCase();
    const map = { 'raw': 'Raw', 'standard': 'Standard', 'good': 'Good', 'premium': 'Premium', 'luxury': 'Luxury', 'ultra luxury': 'UltraLuxury', 'ultra-luxury': 'UltraLuxury' };
    return map[l] || 'Standard';
  }

  _calculateComplexity(area, floors) {
    let score = 3;
    if (area > 1000) score += 1;
    if (area > 5000) score += 1;
    if (floors > 3) score += 1;
    if (floors > 10) score += 1;
    if (floors > 20) score += 1;
    return Math.min(10, Math.max(1, score));
  }

  mergeEGTs(egts) {
    if (!egts || egts.length === 0) return null;
    if (egts.length === 1) return egts[0];

    const base = egts[0].toJSON();
    for (let i = 1; i < egts.length; i++) {
      const other = egts[i].toJSON();
      if (!base.description.ar && other.description.ar) base.description.ar = other.description.ar;
      if (!base.description.en && other.description.en) base.description.en = other.description.en;
      if (other.classification.confidence > base.classification.confidence) {
        base.classification.projectType = other.classification.projectType;
        base.classification.confidence = other.classification.confidence;
      }
      if (!base.geometry.totalArea && other.geometry.totalArea) base.geometry.totalArea = other.geometry.totalArea;
      if (!base.location.city && other.location.city) base.location.city = other.location.city;
      if (other.boq.length > base.boq.length) base.boq = other.boq;
      if (other.cost.total > base.cost.total) base.cost = other.cost;
      if (other.schedule.totalDurationMonths > base.schedule.totalDurationMonths) base.schedule = other.schedule;
      if (other.risks.length > base.risks.length) base.risks = other.risks;
    }
    return new EngineeringGroundTruth(base);
  }
}

module.exports = { EGTFactory };
