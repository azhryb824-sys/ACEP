const fs = require('fs');
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
    this.defects = fs.readFileSync(fp, 'utf8').trim().split('\n').slice(1).map(l => {
      const c = l.split(',');
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
      defects: topDefects,
      qualityScore,
      qualityGrade: qualityScore > 85 ? 'ممتاز' : qualityScore > 70 ? 'جيد' : qualityScore > 50 ? 'متوسط' : 'ضعيف',
      totalTrainingDefects: this.defects.length,
      defectTypes: types.length,
      estimatedDefects: topDefects.reduce((s, d) => s + d.expectedCount, 0)
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
      ]
    };
    const generic = [
      ['Concrete cracking', 'High', 'Structural element'],
      ['Waterproofing discontinuity', 'High', 'Wet or below-grade area'],
      ['MEP coordination', 'High', 'Service zone'],
      ['Finish tolerance', 'Medium', 'Finished area'],
      ['Fire stopping', 'Critical', 'Service penetration']
    ];
    const selected = definitions[prediction.projectType] || generic;
    const weights = [0.24, 0.21, 0.20, 0.19, 0.16];
    let allocated = 0;
    const defects = selected.map(([type, severity, location], index) => {
      const count = index === selected.length - 1
        ? Math.max(0, expectedDefects - allocated)
        : Math.max(0, Math.round(expectedDefects * weights[index]));
      allocated += count;
      const floor = Math.max(1, Math.min(Math.max(1, Math.round(floors)), index + 1));
      return {
        type,
        expectedCount: count,
        severity,
        confidence: 0.60,
        commonElements: [location],
        typicalLocations: [`Floor ${floor} - ${location}`],
        trainingSamples: prediction.trainingRecords
      };
    });
    const density = expectedDefects / Math.max(1, totalArea / 1000);
    const qualityScore = Math.max(0, Math.min(100, Math.round(96 - density * 7.5)));
    return {
      defects,
      qualityScore,
      qualityGrade: qualityScore > 85 ? 'ممتاز' : qualityScore > 70 ? 'جيد' : qualityScore > 50 ? 'متوسط' : 'ضعيف',
      totalTrainingDefects: prediction.trainingRecords,
      defectTypes: defects.length,
      estimatedDefects: expectedDefects,
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
