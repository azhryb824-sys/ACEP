const path = require('path');
const csv = require('./training-csv');
const input = require('./model-input');

class QualityInspector {
  constructor() {
    this.trained = false;
    this.defects = [];
    this.byDefectType = Object.create(null);
    this.severityStats = {};
  }

  async train(csvPath, projectPath) {
    this.trained = false;
    this.byDefectType = Object.create(null);
    this.byProjectType = Object.create(null);
    this.severityStats = {};
    const fp = csvPath || path.join(__dirname, '..', '..', '..', 'packages', 'databases', 'training', 'csv', 'quality_defects.csv');
    const severities = { Critical: 3, High: 2, Medium: 1, Low: 0.5 };
    const fit = csv.load(fp, ['project_id','defect_type','severity','location','element_type','confidence','status'], r => {
      const confidence = csv.number(r.confidence);
      if (confidence > 100 || !Object.hasOwn(severities, r.severity)) throw Error('Invalid quality observation');
      return { projectId: r.project_id, defectType: r.defect_type, severity: r.severity,
        location: r.location, elementType: r.element_type, detectedBy: r.detected_by || '', confidence, status: r.status };
    });
    this.defects = fit.data;
    const projectTypes = csv.projectTypes(projectPath || path.join(path.dirname(fp), 'projects.csv'));
    for (const d of this.defects) {
      const type = projectTypes[d.projectId];
      if (type) (this.byProjectType[type] ||= []).push(d);
    }
    this.trainingAudit = { ...fit.audit, unmatchedProjects: this.defects.filter(d => !projectTypes[d.projectId]).length,
      provenance: 'unverified_csv', accuracyValidated: false, inspectionExposureAvailable: false };
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
    return { total: this.defects.length, types: Object.keys(this.byDefectType).length, audit: this.trainingAudit };
  }

  inspectProject(projectType, totalArea, floors, finishing) {
    const missing = input.geometry(projectType, totalArea, floors);
    if (missing.length) return { ...input.incomplete(missing), defects: [], qualityScore: null, qualityGrade: null, estimatedDefects: null, requiresQualityReview: true };
    if (!this.trained) return { error: 'Not trained', defects: [] };
    // Defect-only records omit inspected exposure and projects with no defects.
    // They support historical descriptions, not incidence or a project quality grade.
    const rows = this.byProjectType[projectType] || [];
    const groups = Object.create(null), weights = { Critical: 3, High: 2, Medium: 1, Low: 0.5 };
    for (const d of rows) (groups[d.defectType] ||= []).push(d);
    const defects = Object.entries(groups).map(([type, items]) => {
      const severityScore = items.reduce((s,d) => s + weights[d.severity], 0) / items.length;
      return { type, expectedCount: null,
        severity: severityScore > 2 ? 'Critical' : severityScore > 1.5 ? 'High' : severityScore > 0.8 ? 'Medium' : 'Low',
        severityScore: Math.round(severityScore * 100) / 100,
        confidence: 0, confidenceCalibrated: false,
        commonElements: [...new Set(items.map(d => d.elementType))].sort().slice(0,3),
        typicalLocations: [...new Set(items.map(d => d.location))].sort().slice(0,3),
        trainingSamples: items.length, dataBasis: 'project_type_historical_observations' };
    }).sort((a,b) => b.severityScore - a.severityScore || a.type.localeCompare(b.type));
    return {
      defects,
      qualityScore: null, qualityGrade: null, estimatedDefects: null,
      estimateStatus: 'insufficient_inspection_exposure', requiresQualityReview: true,
      confidence: 0, confidenceCalibrated: false,
      message: 'بيانات العيوب التاريخية لا تكفي لحساب درجة جودة المشروع أو عدد عيوبه المتوقع؛ يلزم سجل تفتيش يشمل نطاق الفحص ونتائجه، بما فيها الحالات دون عيوب.',
      missing: ['inspected_exposure', 'zero_defect_inspections', 'project_inspection_results'],
      projectType, projectSpecificData: rows.length,
      dataBasis: rows.length ? 'project_type_historical_observations' : 'no_project_type_history',
      totalTrainingDefects: this.defects.length,
      defectTypes: defects.length
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
