const crypto = require('crypto');

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const EGT_VERSION = '1.0.0';

class EngineeringGroundTruth {
  constructor(data = {}) {
    this.uuid = data.uuid || uuidv4();
    this.version = data.version || EGT_VERSION;
    this.source = data.source || 'unknown';
    this.originalId = data.originalId || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || this.createdAt;

    this.description = {
      ar: (data.description && data.description.ar) || '',
      en: (data.description && data.description.en) || ''
    };

    this.projectUnderstanding = data.projectUnderstanding || '';

    this.classification = {
      projectType: (data.classification && data.classification.projectType) || 'Building',
      subType: (data.classification && data.classification.subType) || '',
      complexity: (data.classification && data.classification.complexity) || 5,
      constructionStage: (data.classification && data.classification.constructionStage) || '',
      confidence: (data.classification && data.classification.confidence) || 0
    };

    this.geometry = {
      landArea: (data.geometry && data.geometry.landArea) || 0,
      buildingArea: (data.geometry && data.geometry.buildingArea) || 0,
      totalArea: (data.geometry && data.geometry.totalArea) || 0,
      floors: (data.geometry && data.geometry.floors) || 0,
      floorHeight: (data.geometry && data.geometry.floorHeight) || 3.0,
      totalHeight: (data.geometry && data.geometry.totalHeight) || 0,
      rooms: (data.geometry && data.geometry.rooms) || 0,
      units: (data.geometry && data.geometry.units) || 0,
      structure: (data.geometry && data.geometry.structure) || 'RC Frame',
      foundation: (data.geometry && data.geometry.foundation) || '',
      finishing: (data.geometry && data.geometry.finishing) || 'Standard',
      constructionMethod: (data.geometry && data.geometry.constructionMethod) || 'Conventional'
    };

    this.location = {
      city: (data.location && data.location.city) || '',
      region: (data.location && data.location.region) || '',
      country: (data.location && data.location.country) || 'Saudi Arabia'
    };

    this.boq = (data.boq || []).map(item => ({
      code: item.code || '',
      description: item.description || '',
      descriptionAr: item.descriptionAr || '',
      category: item.category || '',
      unit: item.unit || 'm³',
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || 0,
      wasteFactor: item.wasteFactor || 1.05,
      confidence: item.confidence || 0.7
    }));

    this.cost = {
      total: (data.cost && data.cost.total) || 0,
      perM2: (data.cost && data.cost.perM2) || 0,
      breakdown: {
        materials: ((data.cost && data.cost.breakdown && data.cost.breakdown.materials) || 0),
        labor: ((data.cost && data.cost.breakdown && data.cost.breakdown.labor) || 0),
        equipment: ((data.cost && data.cost.breakdown && data.cost.breakdown.equipment) || 0),
        subcontractor: ((data.cost && data.cost.breakdown && data.cost.breakdown.subcontractor) || 0),
        overhead: ((data.cost && data.cost.breakdown && data.cost.breakdown.overhead) || 0),
        contingency: ((data.cost && data.cost.breakdown && data.cost.breakdown.contingency) || 0)
      }
    };

    this.schedule = {
      totalDurationMonths: (data.schedule && data.schedule.totalDurationMonths) || 0,
      phases: (data.schedule && data.schedule.phases || []).map(p => ({
        name: p.name || '',
        nameAr: p.nameAr || '',
        durationMonths: p.durationMonths || 0,
        order: p.order || 0,
        percentage: p.percentage || 0
      }))
    };

    this.risks = (data.risks || []).map(r => ({
      category: r.category || '',
      description: r.description || '',
      descriptionAr: r.descriptionAr || '',
      probability: r.probability || 0,
      impact: r.impact || 0,
      riskScore: r.riskScore || 0,
      mitigation: r.mitigation || ''
    }));

    this.quality = {
      expectedDefects: (data.quality && data.quality.expectedDefects) || 0,
      defectTypes: (data.quality && data.quality.defectTypes || []).map(d => ({
        type: d.type || '',
        severity: d.severity || 0,
        location: d.location || '',
        elementType: d.elementType || '',
        confidence: d.confidence || 0.7
      }))
    };

    this.images = {
      generated: (data.images && data.images.generated) || [],
      reference: (data.images && data.images.reference) || [],
      prompts: (data.images && data.images.prompts) || [],
      analysis: (data.images && data.images.analysis) || []
    };

    this.navigation = {
      modelPath: (data.navigation && data.navigation.modelPath) || '',
      elements: (data.navigation && data.navigation.elements) || [],
      scheduleLink: (data.navigation && data.navigation.scheduleLink) || null,
      boqLink: (data.navigation && data.navigation.boqLink) || null
    };

    this.digitalTwin = {
      status: (data.digitalTwin && data.digitalTwin.status) || 'inactive',
      lastSync: (data.digitalTwin && data.digitalTwin.lastSync) || null,
      dataSources: (data.digitalTwin && data.digitalTwin.dataSources) || [],
      twinId: (data.digitalTwin && data.digitalTwin.twinId) || ''
    };

    this.materials = (data.materials || []).map(m => ({
      name: m.name || '',
      nameAr: m.nameAr || '',
      category: m.category || '',
      unit: m.unit || '',
      quantity: m.quantity || 0,
      unitPrice: m.unitPrice || 0,
      totalPrice: m.totalPrice || 0,
      qualityGrade: m.qualityGrade || ''
    }));

    this.suppliers = (data.suppliers || []).map(s => ({
      name: s.name || '',
      city: s.city || '',
      speciality: s.speciality || '',
      rating: s.rating || 0,
      deliverySpeedDays: s.deliverySpeedDays || 0,
      compliancePercent: s.compliancePercent || 0,
      totalDeals: s.totalDeals || 0
    }));

    this.constructionSequence = (data.constructionSequence || []).map(cs => ({
      phase: cs.phase || '',
      phaseAr: cs.phaseAr || '',
      order: cs.order || 0,
      durationDays: cs.durationDays || 0,
      dependencies: cs.dependencies || []
    }));

    this.lessonsLearned = data.lessonsLearned || [];

    this.validation = {
      schemaCompliance: (data.validation && data.validation.schemaCompliance) || false,
      completeness: (data.validation && data.validation.completeness) || 0,
      consistency: {
        boqVsCost: (data.validation && data.validation.consistency && data.validation.consistency.boqVsCost) || 0,
        costVsSchedule: (data.validation && data.validation.consistency && data.validation.consistency.costVsSchedule) || 0,
        boqVsImages: (data.validation && data.validation.consistency && data.validation.consistency.boqVsImages) || 0
      },
      integrity: (data.validation && data.validation.integrity) || 'unknown',
      errors: (data.validation && data.validation.errors) || [],
      warnings: (data.validation && data.validation.warnings) || []
    };

    this.confidence = data.confidence || 0;
    this.tags = data.tags || [];
  }

  toJSON() {
    return {
      uuid: this.uuid,
      version: this.version,
      source: this.source,
      originalId: this.originalId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      description: this.description,
      projectUnderstanding: this.projectUnderstanding,
      classification: this.classification,
      geometry: this.geometry,
      location: this.location,
      boq: this.boq,
      cost: this.cost,
      schedule: this.schedule,
      risks: this.risks,
      quality: this.quality,
      images: this.images,
      navigation: this.navigation,
      digitalTwin: this.digitalTwin,
      materials: this.materials,
      suppliers: this.suppliers,
      constructionSequence: this.constructionSequence,
      lessonsLearned: this.lessonsLearned,
      validation: this.validation,
      confidence: this.confidence,
      tags: this.tags
    };
  }

  static fromJSON(json) {
    return new EngineeringGroundTruth(json);
  }

  static getSchema() {
    return {
      type: 'object',
      required: ['uuid', 'classification', 'geometry'],
      properties: {
        uuid: { type: 'string', pattern: '^[0-9a-f-]{36}$' },
        version: { type: 'string' },
        classification: {
          type: 'object',
          required: ['projectType'],
          properties: {
            projectType: { type: 'string', enum: ['Villa', 'Building', 'Tower', 'Hotel', 'Mosque', 'Hospital', 'School', 'Mall', 'Warehouse', 'Bridge', 'Road', 'Factory', 'Farm', 'Infrastructure', 'WaterTreatment', 'Sports', 'Office', 'Residential', 'Commercial', 'Apartment', 'Compound', 'Palace', 'MixedUse'] },
            complexity: { type: 'number', min: 0, max: 10 },
            confidence: { type: 'number', min: 0, max: 1 }
          }
        },
        geometry: {
          type: 'object',
          required: ['totalArea', 'floors'],
          properties: {
            totalArea: { type: 'number', min: 0 },
            floors: { type: 'number', min: 0 },
            finishing: { type: 'string', enum: ['Raw', 'Standard', 'Good', 'Premium', 'Luxury', 'UltraLuxury'] }
          }
        },
        boq: { type: 'array', items: { type: 'object' } },
        cost: { type: 'object' },
        schedule: { type: 'object' }
      }
    };
  }

  static getEmpty() {
    return new EngineeringGroundTruth({});
  }
}

module.exports = { EngineeringGroundTruth, EGT_VERSION };
