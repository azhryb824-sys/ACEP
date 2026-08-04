class ValidationEngine {
  constructor(options = {}) {
    this.strict = options.strict ?? true;
    this.logResults = options.logResults ?? true;
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  validateElements(elements) {
    const results = { total: elements.length, passed: 0, failed: 0, errors: [] };
    const required = ['id', 'baseId', 'name', 'nameEn', 'category', 'boqCategory', 'unit', 'phases', 'codeRefs'];
    for (const el of elements) {
      for (const field of required) {
        if (el[field] == null || (typeof el[field] === 'string' && !el[field].trim())) {
          results.errors.push(`Element ${el.id}: missing required field '${field}'`);
          results.failed++;
          continue;
        }
      }
      if (el.phases && !Array.isArray(el.phases)) {
        results.errors.push(`Element ${el.id}: 'phases' must be an array`);
        results.failed++;
        continue;
      }
      if (el.codeRefs && !Array.isArray(el.codeRefs)) {
        results.errors.push(`Element ${el.id}: 'codeRefs' must be an array`);
        results.failed++;
        continue;
      }
      results.passed++;
    }
    if (this.logResults) console.log(`Validation [Elements]: ${results.passed}/${results.total} passed, ${results.failed} errors`);
    return results;
  }

  validateBOQItems(items) {
    if (!Array.isArray(items)) items = items.items || [];
    const results = { total: items.length, passed: 0, failed: 0, errors: [] };
    const required = ['id', 'code', 'description', 'unit', 'unitRate', 'materialCategory', 'division'];
    const seen = new Set();
    for (const item of items) {
      for (const field of required) {
        if (item[field] == null) {
          results.errors.push(`BOQ ${item.id}: missing '${field}'`);
          results.failed++;
          continue;
        }
      }
      if (!item.description || item.description.includes('undefined')) {
        results.errors.push(`BOQ ${item.id}: description contains 'undefined'`);
        results.failed++;
        continue;
      }
      if (seen.has(item.code)) {
        results.errors.push(`BOQ ${item.id}: duplicate code '${item.code}'`);
        results.failed++;
        continue;
      }
      seen.add(item.code);
      if (item.unitRate != null && item.unitRate <= 0) {
        results.errors.push(`BOQ ${item.id}: unitRate must be > 0 (got ${item.unitRate})`);
        results.failed++;
        continue;
      }
      results.passed++;
    }
    if (this.logResults) console.log(`Validation [BOQ Items]: ${results.passed}/${results.total} passed, ${results.failed} errors`);
    return results;
  }

  validateMaterials(materials) {
    const results = { total: materials.length, passed: 0, failed: 0, errors: [] };
    const required = ['id', 'name', 'grade', 'category', 'specs'];
    for (const mat of materials) {
      for (const field of required) {
        if (mat[field] == null) {
          results.errors.push(`Material ${mat.id}: missing '${field}'`);
          results.failed++;
          continue;
        }
      }
      if (mat.specs && typeof mat.specs === 'object' && Object.keys(mat.specs).length === 0) {
        results.errors.push(`Material ${mat.id}: 'specs' is empty`);
        results.failed++;
        continue;
      }
      results.passed++;
    }
    if (this.logResults) console.log(`Validation [Materials]: ${results.passed}/${results.total} passed, ${results.failed} errors`);
    return results;
  }

  validateCodes(codes) {
    const results = { total: codes.length, passed: 0, failed: 0, errors: [] };
    const required = ['id', 'code', 'title', 'body', 'country'];
    const seen = new Set();
    for (const code of codes) {
      for (const field of required) {
        if (code[field] == null) {
          results.errors.push(`Code ${code.id}: missing '${field}'`);
          results.failed++;
          continue;
        }
      }
      if (seen.has(code.code)) {
        results.errors.push(`Code ${code.id}: duplicate code '${code.code}'`);
        results.failed++;
        continue;
      }
      seen.add(code.code);
      results.passed++;
    }
    if (this.logResults) console.log(`Validation [Codes]: ${results.passed}/${results.total} passed, ${results.failed} errors`);
    return results;
  }

  validateKnowledgeGraph(nodes, edges) {
    const results = { nodes: { total: nodes.length, passed: 0, failed: 0, errors: [] }, edges: { total: edges.length, passed: 0, failed: 0, errors: [] } };
    const nodeIds = new Set(nodes.map(n => n.id));
    for (const node of nodes) {
      if (!node.id || !node.type) {
        results.nodes.errors.push(`Node missing id/type: ${JSON.stringify(node)}`);
        results.nodes.failed++;
        continue;
      }
      results.nodes.passed++;
    }
    for (const edge of edges) {
      if (!edge.source || !edge.target || !edge.relation) {
        results.edges.errors.push(`Edge missing source/target/relation: ${JSON.stringify(edge)}`);
        results.edges.failed++;
        continue;
      }
      if (!nodeIds.has(edge.source)) {
        results.edges.errors.push(`Edge source '${edge.source}' not found in nodes`);
        results.edges.failed++;
        continue;
      }
      if (!nodeIds.has(edge.target)) {
        results.edges.errors.push(`Edge target '${edge.target}' not found in nodes`);
        results.edges.failed++;
        continue;
      }
      results.edges.passed++;
    }
    if (this.logResults) {
      console.log(`Validation [Graph Nodes]: ${results.nodes.passed}/${results.nodes.total} passed, ${results.nodes.failed} errors`);
      console.log(`Validation [Graph Edges]: ${results.edges.passed}/${results.edges.total} passed, ${results.edges.failed} errors`);
    }
    return results;
  }

  runAllValidations({ elements, boqItems, materials, codes, graphNodes, graphEdges }) {
    const results = {};
    if (elements) results.elements = this.validateElements(elements);
    if (boqItems) results.boqItems = this.validateBOQItems(boqItems);
    if (materials) results.materials = this.validateMaterials(materials);
    if (codes) results.codes = this.validateCodes(codes);
    if (graphNodes || graphEdges) results.graph = this.validateKnowledgeGraph(graphNodes || [], graphEdges || []);
    return results;
  }

  report(results) {
    let totalErrors = 0;
    let totalPassed = 0;
    for (const [key, val] of Object.entries(results)) {
      if (val.total != null) {
        totalErrors += val.failed || 0;
        totalPassed += val.passed || 0;
      } else if (val.nodes && val.edges) {
        totalErrors += val.nodes.failed + val.edges.failed;
        totalPassed += val.nodes.passed + val.edges.passed;
      }
    }
    return { totalPassed, totalErrors, passed: totalErrors === 0, results };
  }
}
module.exports = { ValidationEngine };
