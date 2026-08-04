const { getLogger } = require('../logger');
const LOGGER = getLogger({ service: 'VisionAI-Verifier' });

class PreGenerationVerifier {
  constructor() {
    this.minCompleteness = 70;
    this.minBOQItems = 3;
    this.minBOQConfidence = 0.4;
    this.requiredFields = [
      { field: 'projectType.main', label: 'Project Type', critical: true },
      { field: 'physical.area', label: 'Area', critical: false },
      { field: 'physical.floors', label: 'Floor Count', critical: false },
      { field: 'metadata.description', label: 'Description', critical: false },
    ];
  }

  verify(upm, featureMap) {
    const startTime = Date.now();
    const checks = [];

    checks.push(this._checkField(upm, 'projectType.main', 'Project Type', true));
    checks.push(this._checkField(upm, 'physical.area', 'Area', false));
    checks.push(this._checkField(upm, 'physical.floors', 'Floor Count', false));
    checks.push(this._checkField(upm, 'location.city', 'City', false));
    checks.push(this._checkField(upm, 'phase.current', 'Phase', false));
    checks.push(this._checkField(upm, 'finishing.level', 'Finishing Level', false));

    const hasMaterials = upm.materials && upm.materials.length > 0;
    checks.push({
      name: 'Materials',
      passed: hasMaterials,
      value: hasMaterials ? upm.materials.length + ' materials' : 'None',
      critical: false,
    });

    const boqCount = upm.boqSummary.items ? upm.boqSummary.items.length : 0;
    checks.push({
      name: 'BOQ Items',
      passed: boqCount >= this.minBOQItems,
      value: `${boqCount} items`,
      critical: true,
    });

    const boqConfidence = upm.boqSummary.confidence || 0;
    checks.push({
      name: 'BOQ Confidence',
      passed: boqConfidence >= this.minBOQConfidence,
      value: `${Math.round(boqConfidence * 100)}%`,
      critical: false,
    });

    const featureCount = featureMap ? featureMap.features.length : 0;
    const boqFeatureCount = featureMap ? featureMap.boqMatchCount : 0;
    checks.push({
      name: 'Features from BOQ',
      passed: boqFeatureCount > 0,
      value: `${boqFeatureCount} / ${featureCount}`,
      critical: true,
    });

    const completeness = upm.verification.completeness || 0;
    checks.push({
      name: 'Data Completeness',
      passed: completeness >= this.minCompleteness,
      value: `${completeness}%`,
      critical: true,
    });

    const criticalFailed = checks.filter(c => c.critical && !c.passed);
    const allFailed = checks.filter(c => !c.passed);
    const warnings = checks.filter(c => !c.passed && !c.critical);
    const errors = criticalFailed.map(c => `Missing critical data: ${c.name}`);

    const passed = criticalFailed.length === 0;
    const score = Math.round((checks.filter(c => c.passed).length / checks.length) * 100);

    const report = {
      passed,
      score,
      checks,
      errors,
      warnings: warnings.map(w => `Warning: ${w.name} (${w.value})`),
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      summary: passed
        ? `✅ All checks passed (${score}%)`
        : `❌ ${errors.length} critical issue(s) found`,
      details: this._formatReport(checks, completeness),
    };

    LOGGER.info(`Pre-generation verification: ${passed ? 'PASSED' : 'FAILED'} (${score}%)`);
    return report;
  }

  _checkField(upm, path, label, critical) {
    const parts = path.split('.');
    let val = upm;
    for (const p of parts) val = val ? val[p] : undefined;
    return {
      name: label,
      passed: val !== null && val !== undefined && val !== '' && val !== 0,
      value: val || 'N/A',
      critical,
    };
  }

  _formatReport(checks, completeness) {
    const lines = [];
    lines.push('═══════════════════════════════════════');
    lines.push('  Data Completeness Verification');
    lines.push(`  Score: ${completeness}%`);
    lines.push('═══════════════════════════════════════');
    for (const c of checks) {
      const icon = c.passed ? '✅' : (c.critical ? '❌' : '⚠️');
      lines.push(`  ${icon} ${c.name}: ${c.value}`);
    }
    return lines.join('\n');
  }
}

module.exports = new PreGenerationVerifier();
