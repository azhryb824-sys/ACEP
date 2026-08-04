const { ElementsV2Generator } = require('./entities/elements-v2');
const { BoqV2Generator } = require('./data/boq-data-v2');
const { MaterialsV2Generator } = require('./entities/materials-v2');
const { CodesV2Generator } = require('./entities/codes-v2');
const { ValidationEngine } = require('./validation/validation-engine');
const { TrainingReadinessReporter } = require('./validation/training-readiness');

class KnowledgeBaseV2 {
  constructor(parentKB) {
    this.parentKB = parentKB;
    this._initialized = false;
    this.validationEngine = new ValidationEngine({ strict: true, logResults: true });
    this.generators = {
      elements: new ElementsV2Generator(),
      boq: new BoqV2Generator(),
      materials: new MaterialsV2Generator(),
      codes: new CodesV2Generator(),
    };
  }

  initialize() {
    if (this._initialized) return this;
    console.log('[KB V2] Generating expanded datasets...');
    this.elementsV2 = this.generators.elements.generate();
    const boqResult = this.generators.boq.generate();
    this.boqItemsV2 = boqResult.items;
    this.boqDivisions = boqResult.divisions;
    this.materialsV2 = this.generators.materials.generate();
    this.codesV2 = this.generators.codes.generate();
    console.log(`[KB V2] Generated: ${this.elementsV2.length} elements, ${this.boqItemsV2.length} BOQ items, ${this.materialsV2.length} materials, ${this.codesV2.length} codes`);
    this._initialized = true;
    return this;
  }

  validate() {
    const results = this.validationEngine.runAllValidations({
      elements: this.elementsV2,
      boqItems: this.boqItemsV2,
      materials: this.materialsV2,
      codes: this.codesV2,
    });
    const report = this.validationEngine.report(results);
    console.log(`[KB V2] Validation: ${report.totalPassed} passed, ${report.totalErrors} errors`);
    if (!report.passed && report.totalErrors > 0) {
      const sample = results.boqItems?.errors?.slice(0, 5) || results.elements?.errors?.slice(0, 5) || [];
      console.warn(`[KB V2] Sample errors: ${JSON.stringify(sample)}`);
    }
    return report;
  }

  getTrainingReadiness() {
    const reporter = new TrainingReadinessReporter(this);
    return reporter.generateReport();
  }

  getElements() { return this.elementsV2; }
  getBOQItems() { return this.boqItemsV2; }
  getMaterials() { return this.materialsV2; }
  getCodes() { return this.codesV2; }

  getElementById(id) { return this.elementsV2.find(e => e.id === id); }
  getElementsByCategory(cat) { return this.elementsV2.filter(e => e.category === cat); }
  getElementsByPhase(phase) { return this.elementsV2.filter(e => e.phases.includes(phase)); }
  getBOQByDivision(div) { return this.boqItemsV2.filter(i => i.divisionCode === div); }
  getBOQByCategory(cat) { return this.boqItemsV2.filter(i => i.category === cat); }
  getMaterialById(id) { return this.materialsV2.find(m => m.id === id); }
  getMaterialsByCategory(cat) { return this.materialsV2.filter(m => m.category === cat); }
  getCodeByCode(code) { return this.codesV2.find(c => c.code === code); }
  getCodesByBody(body) { return this.codesV2.filter(c => c.body === body); }

  getSummary() {
    return {
      elements: { count: this.elementsV2.length, categories: [...new Set(this.elementsV2.map(e => e.category))] },
      boqItems: { count: this.boqItemsV2.length, divisions: Object.keys(this.boqDivisions).length },
      materials: { count: this.materialsV2.length, categories: [...new Set(this.materialsV2.map(m => m.category))] },
      codes: { count: this.codesV2.length, bodies: [...new Set(this.codesV2.map(c => c.body))] },
    };
  }
}

module.exports = { KnowledgeBaseV2 };
