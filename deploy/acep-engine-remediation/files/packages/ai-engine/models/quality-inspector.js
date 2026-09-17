const { readRows } = require('./csv-rows');
const path = require('path');
const millionProjectModel = require('./million-project-model');

class QualityInspector {
  constructor() {
    this.trained = false;
    this.defects = [];
    this.byDefectType = {};
    this.severityStats = {};
  }

  async train(csvPath) {
    this.byDefectType = {};
    this.severityStats = {};
    const fp = csvPath || path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv', 'quality_defects.csv');
    this.defects = readRows(fp).map(l => {
      const c = l;
      return {
        projectId: c[0], defectType: c[1], severity: c[2],
        location: c[3], elementType: c[4], detectedBy: c[5],
        confidence: parseInt(c[6]) || 0, status: c[7] || 'Open'
      };
    });

    const severities = { Critical: 3, High: 2, Medium: 1, Low: 0.5 };
    for (const d of this.defects) {
      if (!this.byDefectType[d.defectType]) this.byDefectType[d.defectType] = [];
      this.byDefectType[d.defectType].push(d);
    }
    for (const [type, items] of Object.entries(this.byDefectType)) {
      const n = items.length;
      const sevs = items.map(i => severities[i.severity] || 1);
      this.byDefectType[type] = {
        count: n,
        severityAvg: sevs.reduce((s, v) => s + v, 0) / n,
        severityMedian: sevs.sort((a, b) => a - b)[Math.floor(n / 2)],
        confidenceAvg: items.reduce((s, i) => s + i.confidence, 0) / n,
        elements: [...new Set(items.map(i => i.elementType))],
        locations: [...new Set(items.map(i => i.location))].slice(0, 10),
        statuses: Object.entries(items.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).map(x => x[0])
      };
    }

    for (const s of ['Critical', 'High', 'Medium', 'Low']) {
      const items = this.defects.filter(d => d.severity === s);
      if (items.length > 0) {
        this.severityStats[s] = {
          count: items.length,
          types: [...new Set(items.map(i => i.defectType))],
          elements: [...new Set(items.map(i => i.elementType))],
          resolved: items.filter(i => i.status === 'Resolved').length / items.length
        };
      }
    }

    this.trained = true;
    return { total: this.defects.length, types: Object.keys(this.byDefectType).length };
  }

  inspectProject(projectType, totalArea, floors, finishing, modelInputs = {}) {
    if (!this.trained) return { error: 'Not trained', defects: [] };
    const trainedPrediction = millionProjectModel.predict({
      projectType: modelInputs.modelType || projectType,
      grossBuiltArea: totalArea,
      footprintArea: modelInputs.footprintArea,
      landArea: modelInputs.landArea,
      floors,
      basements: modelInputs.basements,
      buildings: modelInputs.buildings,
      capacity: modelInputs.capacity,
      city: modelInputs.city,
      finishing,
      method: modelInputs.method
    });
    if (trainedPrediction.blocked) return { status: 'blocked', reason: trainedPrediction.reason, defects: [], qualityScore: null, qualityGrade: null };
    if (trainedPrediction.available) return this._trainedInspection(trainedPrediction, totalArea, floors);
    const types = Object.keys(this.byDefectType);
    const scaleFactor = Math.max(0.3, Math.min(3, 1 + (totalArea / 20000) * 0.3 + (floors / 10) * 0.2));
    const finishingFactor = { Raw: 0.6, Standard: 1.0, Good: 1.2, Premium: 1.5, Luxury: 2.0 }[finishing] || 1.0;

    const defects = types.map(type => {
      const stats = this.byDefectType[type];
      const defectsPerM2 = stats.count / (totalArea || 1000);
      const expectedDefects = Math.max(0, Math.round(defectsPerM2 * (totalArea / 100) * scaleFactor * finishingFactor));
      const severityLabel = stats.severityAvg > 2 ? 'Critical' : stats.severityAvg > 1.5 ? 'High' : stats.severityAvg > 0.8 ? 'Medium' : 'Low';
      const confidence = Math.min(0.95, stats.confidenceAvg / 100 * 1.1);

      return {
        type,
        expectedCount: expectedDefects,
        severity: severityLabel,
        severityScore: Math.round(stats.severityAvg * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        commonElements: stats.elements.slice(0, 3),
        typicalLocations: stats.locations.slice(0, 3),
        trainingSamples: stats.count
      };
    });

    defects.sort((a, b) => b.severityScore - a.severityScore);
    const topDefects = defects.filter(d => d.expectedCount > 0).slice(0, 8);
    const qualityIndex = Math.round(100 - topDefects.reduce((s, d) => s + d.severityScore * d.expectedCount * 5, 0) / (totalArea || 1000) * 100);
    const qualityScore = Math.max(0, Math.min(100, qualityIndex));

    return {
      defects: topDefects.map(d => ({ ...d, syntheticAllocation: d.expectedCount, expectedCount: null, confidence: null })),
      qualityScore: null,
      qualityGrade: null,
      researchIndicator: { index: qualityScore, fieldCalibrated: false },
      researchGrade: qualityScore > 85 ? 'ممتاز' : qualityScore > 70 ? 'جيد' : qualityScore > 50 ? 'متوسط' : 'ضعيف',
      totalTrainingDefects: this.defects.length,
      defectTypes: types.length,
      estimatedDefects: null,
      syntheticDefectCount: topDefects.reduce((s, d) => s + d.expectedCount, 0)
    };
  }

  _trainedInspection(prediction, totalArea, floors) {
    const expectedDefects = Math.max(0, Math.round(prediction.predictions.expectedDefects));
    const definitions = {
      hospital: [
        ['MEP coordination', 'High', 'Ceiling service zone'],
        ['Infection-control finish', 'High', 'Clinical room'],
        ['Medical-gas interface', 'Critical', 'Clinical service zone'],
        ['Waterproofing', 'High', 'Wet area'],
        ['Fire stopping', 'Critical', 'Service penetration']
      ],
      data_center: [
        ['Power-path installation', 'Critical', 'Electrical room'],
        ['Cooling containment', 'High', 'Data hall'],
        ['Fire stopping', 'Critical', 'Service penetration'],
        ['Raised floor tolerance', 'Medium', 'Data hall'],
        ['Controls integration', 'High', 'Control room']
      ],
      road: [
        ['Subgrade compaction', 'High', 'Formation layer'],
        ['Pavement layer thickness', 'High', 'Roadbase and asphalt'],
        ['Asphalt density and segregation', 'High', 'Wearing course'],
        ['Drainage level and falls', 'High', 'Drainage run'],
        ['Road marking retroreflectivity', 'Medium', 'Finished carriageway']
      ],
      bridge: [
        ['Pile and foundation integrity', 'Critical', 'Substructure'],
        ['Concrete durability and cover', 'High', 'Piers and deck'],
        ['Prestress and grout acceptance', 'Critical', 'Superstructure'],
        ['Bearing and joint alignment', 'High', 'Bearing shelf'],
        ['Deck waterproofing', 'High', 'Bridge deck']
      ],
      tunnel: [
        ['Ground support conformity', 'Critical', 'Excavation face'],
        ['Lining thickness and defects', 'Critical', 'Permanent lining'],
        ['Waterproofing continuity', 'High', 'Tunnel envelope'],
        ['Ventilation performance', 'Critical', 'Ventilation zone'],
        ['Life-safety integration', 'Critical', 'Emergency system']
      ],
      railway: [
        ['Formation compaction', 'High', 'Track formation'],
        ['Track geometry', 'Critical', 'Track alignment'],
        ['Rail weld integrity', 'Critical', 'Running rail'],
        ['Signalling installation', 'Critical', 'Signalling zone'],
        ['Traction power clearances', 'Critical', 'Electrification zone']
      ],
      renewable_energy: [
        ['Foundation alignment', 'High', 'Generation field'],
        ['Module or turbine installation', 'High', 'Generation equipment'],
        ['DC insulation and polarity', 'Critical', 'DC collection'],
        ['Cable termination quality', 'High', 'Electrical collection'],
        ['Protection and performance ratio', 'Critical', 'Grid interface']
      ],
      water: [
        ['Pipe bedding and alignment', 'High', 'Pipeline or process train'],
        ['Joint integrity', 'Critical', 'Pressure boundary'],
        ['Concrete water tightness', 'High', 'Hydraulic structure'],
        ['Instrumentation calibration', 'High', 'Control point'],
        ['Disinfection and water quality', 'Critical', 'Commissioned system']
      ],
      dam: [
        ['Foundation treatment', 'Critical', 'Dam foundation'],
        ['Fill placement and compaction', 'Critical', 'Dam body'],
        ['Concrete lift and joint quality', 'High', 'Hydraulic structure'],
        ['Instrumentation installation', 'Critical', 'Monitoring section'],
        ['Gate and outlet functional test', 'Critical', 'Outlet works']
      ],
      power: [
        ['Primary equipment installation', 'Critical', 'High-voltage yard'],
        ['Cable termination and testing', 'Critical', 'Cable system'],
        ['Earthing continuity', 'Critical', 'Earthing grid'],
        ['Protection settings', 'Critical', 'Protection panel'],
        ['Interlock and energization test', 'Critical', 'Control system']
      ],
      telecom: [
        ['Duct and chamber installation', 'High', 'Civil route'],
        ['Fiber splice loss', 'High', 'Fiber link'],
        ['Tower plumb and bolt torque', 'Critical', 'Tower site'],
        ['Grounding continuity', 'Critical', 'Equipment site'],
        ['End-to-end service performance', 'High', 'Network segment']
      ],
      renovation: [
        ['Existing-condition interface', 'High', 'Existing fabric'],
        ['Structural repair acceptance', 'Critical', 'Repair zone'],
        ['Hidden MEP coordination', 'High', 'Service zone'],
        ['Fire stopping upgrade', 'Critical', 'Service penetration'],
        ['Finish compatibility', 'Medium', 'Renovated area']
      ],
      heritage: [
        ['Historic fabric condition', 'Critical', 'Conservation zone'],
        ['Repair material compatibility', 'Critical', 'Historic element'],
        ['Moisture and salt control', 'High', 'Masonry zone'],
        ['Reversibility of intervention', 'High', 'Intervention area'],
        ['Conservation documentation', 'High', 'Recorded fabric']
      ]
    };
    const generic = [
      ['Concrete cracking', 'High', 'Structural element'],
      ['Waterproofing discontinuity', 'High', 'Wet or below-grade area'],
      ['MEP coordination', 'High', 'Service zone'],
      ['Finish tolerance', 'Medium', 'Finished area'],
      ['Fire stopping', 'Critical', 'Service penetration']
    ];
    const familyDefinitions = {
      industrial: [
        ['Foundation tolerance', 'High', 'Equipment foundation'],
        ['Structural connection', 'Critical', 'Primary frame'],
        ['Industrial floor flatness', 'High', 'Production floor'],
        ['Process utility pressure test', 'Critical', 'Utility system'],
        ['Integrated controls test', 'Critical', 'Control system']
      ],
      site: [
        ['Earthworks compaction', 'High', 'Site formation'],
        ['Pavement tolerance', 'High', 'Operational pavement'],
        ['Utility testing', 'Critical', 'Utility network'],
        ['Specialist system performance', 'Critical', 'Operational system'],
        ['Drainage falls', 'High', 'Drainage zone']
      ],
      utility: [
        ['Civil structure conformity', 'High', 'Civil work zone'],
        ['Equipment installation', 'Critical', 'Equipment zone'],
        ['Cable or pipeline testing', 'Critical', 'Network section'],
        ['Protection and control test', 'Critical', 'Control system'],
        ['Integrated performance test', 'Critical', 'Commissioned system']
      ]
    };
    const selected = definitions[prediction.projectType] || familyDefinitions[prediction.family] || generic;
    const weights = [0.24, 0.21, 0.20, 0.19, 0.16];
    let allocated = 0;
    const defects = selected.map(([type, severity, location], index) => {
      const count = index === selected.length - 1
        ? Math.max(0, expectedDefects - allocated)
        : Math.max(0, Math.round(expectedDefects * weights[index]));
      allocated += count;
      const floor = Math.max(1, Math.min(Math.max(1, Math.round(floors)), index + 1));
      const contextualLocation = prediction.family === 'linear'
        ? `Chainage zone ${index + 1} - ${location}`
        : ['site', 'utility'].includes(prediction.family)
          ? `Work zone ${index + 1} - ${location}`
          : prediction.family === 'existing'
            ? `Existing asset zone ${index + 1} - ${location}`
            : `Floor ${floor} - ${location}`;
      return {
        type,
        expectedCount: null,
        syntheticAllocation: count,
        severity,
        confidence: null,
        commonElements: [location],
        typicalLocations: [contextualLocation],
        trainingSamples: prediction.trainingRecords
      };
    });
    const density = expectedDefects / Math.max(1, totalArea / 1000);
    const qualityScore = Math.max(0, Math.min(100, Math.round(96 - density * 7.5)));
    return {
      defects,
      qualityScore: null,
      qualityGrade: null,
      researchIndicator: { index: qualityScore, meaning: 'synthetic_defect_density_index_not_inspection_quality', fieldCalibrated: false },
      totalTrainingDefects: prediction.trainingRecords,
      defectTypes: defects.length,
      estimatedDefects: null,
      syntheticDefectCount: expectedDefects,
      defectRange: {
        lower: Math.round(prediction.intervals.expectedDefects.lower),
        upper: Math.round(prediction.intervals.expectedDefects.upper),
        basis: 'synthetic_holdout_p90_error'
      },
      modelId: prediction.modelId,
      projectType: prediction.projectType,
      dataProvenance: prediction.dataProvenance,
      status: 'experimental',
      contractualUse: false,
      suitableForModelApproval: false,
      requiresInspectionEvidence: true,
      requiresHumanReview: true,
      limitations: [
        ...prediction.limitations,
        'Predicted defect prevalence is not an inspection finding and cannot replace ITP records or site evidence.'
      ]
    };
  }

  getCommonDefects(elementType) {
    const filtered = elementType ? this.defects.filter(d => d.elementType === elementType) : this.defects;
    const byType = {};
    filtered.forEach(d => {
      if (!byType[d.defectType]) byType[d.defectType] = [];
      byType[d.defectType].push(d);
    });
    return Object.entries(byType).map(([type, items]) => ({
      type, count: items.length,
      severity: items.filter(i => i.severity === 'Critical' || i.severity === 'High').length / items.length * 100,
      resolvedRate: items.filter(i => i.status === 'Resolved').length / items.length * 100
    })).sort((a, b) => b.count - a.count);
  }
}

module.exports = new QualityInspector();
