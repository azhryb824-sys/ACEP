import {
  BIMComparison, BIMElement, BIMDeviation, BIMComparisonSummary
} from './types';
import { IBIMValidator } from './interfaces';

interface DimensionComparison {
  width: number;
  height: number;
  depth: number;
}

export class BIMValidator implements IBIMValidator {
  private comparisons: Map<string, BIMComparison[]> = new Map();
  private toleranceDefaults = {
    width: 12,
    height: 12,
    depth: 12,
    position: 25,
    angle: 2
  };

  constructor(kg?: any) {
    if (kg) { /* knowledge graph integration */ }
  }

  async compareElement(bimElement: BIMElement, actual: BIMElement): Promise<BIMComparison> {
    const deviations: BIMDeviation[] = [];

    if (bimElement.dimensions && actual.dimensions) {
      deviations.push(...this.compareDimensions(bimElement.dimensions, actual.dimensions));
    }

    deviations.push(...this.comparePosition(bimElement.location, actual.location));

    if (bimElement.properties && actual.properties) {
      deviations.push(...this.compareProperties(bimElement.properties, actual.properties));
    }

    const matching: BIMElement[] = [];
    const nonMatching: BIMElement[] = [];
    const missing: BIMElement[] = [];

    const acceptableDeviations = deviations.filter(d => d.acceptable);
    const unacceptableDeviations = deviations.filter(d => !d.acceptable);

    if (unacceptableDeviations.length === 0 && deviations.length > 0) {
      matching.push(actual);
    } else if (unacceptableDeviations.length > 0) {
      nonMatching.push(actual);
    }

    const totalParams = deviations.length || 1;
    const acceptableCount = acceptableDeviations.length;
    const matchPercent = Math.round((acceptableCount / totalParams) * 10000) / 100;

    const comparison: BIMComparison = {
      id: `BIMCMP-${Date.now()}`,
      projectId: '',
      elementId: bimElement.id || actual.id,
      elementType: bimElement.type || actual.type,
      elementName: bimElement.name || actual.name,
      floor: bimElement.location?.z?.toString() || actual.location?.z?.toString() || '',
      matching,
      nonMatching,
      missing,
      deviations,
      comparisonDate: new Date().toISOString(),
      overallMatchPercent: matchPercent,
      summary: this.generateSummary(matchPercent, unacceptableDeviations.length, missing.length)
    };

    const projectComps = this.comparisons.get(comparison.elementId) || [];
    projectComps.push(comparison);
    this.comparisons.set(comparison.elementId, projectComps);

    return comparison;
  }

  async batchCompare(elements: BIMElement[], actuals: BIMElement[]): Promise<BIMComparison[]> {
    const results: BIMComparison[] = [];
    const actualMap = new Map<string, BIMElement>();

    for (const actual of actuals) {
      actualMap.set(actual.id, actual);
    }

    for (const bim of elements) {
      const actual = actualMap.get(bim.id) || actualMap.get(this.findMatchingId(bim, actuals));
      if (actual) {
        const comp = await this.compareElement(bim, actual);
        results.push(comp);
      } else {
        results.push({
          id: `BIMCMP-${Date.now()}-${results.length}`,
          projectId: '',
          elementId: bim.id,
          elementType: bim.type,
          elementName: bim.name,
          floor: bim.location?.z?.toString() || '',
          matching: [],
          nonMatching: [],
          missing: [bim],
          deviations: [],
          comparisonDate: new Date().toISOString(),
          overallMatchPercent: 0,
          summary: `Element ${bim.name} (${bim.id}) is missing from actual construction`
        });
      }
    }

    return results;
  }

  async detectMissingElements(bimElements: BIMElement[], actualElements: BIMElement[]): Promise<BIMElement[]> {
    const actualIds = new Set(actualElements.map(a => a.id));
    return bimElements.filter(bim => !actualIds.has(bim.id) && !actualIds.has(this.findMatchingId(bim, actualElements)));
  }

  async detectDeviations(bimElement: BIMElement, actual: BIMElement): Promise<BIMDeviation[]> {
    const deviations: BIMDeviation[] = [];

    if (bimElement.dimensions && actual.dimensions) {
      deviations.push(...this.compareDimensions(bimElement.dimensions, actual.dimensions));
    }

    deviations.push(...this.comparePosition(bimElement.location, actual.location));

    return deviations;
  }

  async calculateMatchPercent(bimElements: BIMElement[], actualElements: BIMElement[]): Promise<number> {
    if (bimElements.length === 0) return 100;

    const comparisons = await this.batchCompare(bimElements, actualElements);
    const totalMatch = comparisons.reduce((sum, c) => sum + c.overallMatchPercent, 0);
    return Math.round((totalMatch / comparisons.length) * 100) / 100;
  }

  async generateComparisonReport(projectId: string, comparisons: BIMComparison[]): Promise<string> {
    const totalElements = comparisons.length;
    const matching = comparisons.filter(c => c.overallMatchPercent >= 95).length;
    const nonMatching = comparisons.filter(c => c.overallMatchPercent < 95 && c.overallMatchPercent > 0).length;
    const missing = comparisons.filter(c => c.missing.length > 0).length;
    const avgMatch = comparisons.reduce((s, c) => s + c.overallMatchPercent, 0) / (totalElements || 1);

    let report = `BIM COMPARISON REPORT\n`;
    report += `=====================\n\n`;
    report += `Project: ${projectId}\n`;
    report += `Date: ${new Date().toISOString()}\n`;
    report += `Total Elements Compared: ${totalElements}\n`;
    report += `Matching: ${matching}\n`;
    report += `Non-Matching: ${nonMatching}\n`;
    report += `Missing: ${missing}\n`;
    report += `Average Match: ${avgMatch.toFixed(1)}%\n\n`;

    const criticalDeviations = comparisons.flatMap(c => c.deviations.filter(d => !d.acceptable && d.severity === 'Critical'));
    if (criticalDeviations.length > 0) {
      report += `CRITICAL DEVIATIONS FOUND: ${criticalDeviations.length}\n`;
      for (const dev of criticalDeviations) {
        report += `  - ${dev.parameter}: design=${dev.designValue}, actual=${dev.actualValue}, deviation=${dev.deviation}${dev.unit}\n`;
      }
    }

    return report;
  }

  async getComplianceSummary(projectId: string): Promise<BIMComparisonSummary> {
    const projectComparisons = Array.from(this.comparisons.values()).flat();
    const relevant = projectComparisons.filter(c => c.id.startsWith('BIMCMP-'));

    const matchingElements = relevant.filter(c => c.overallMatchPercent >= 95).length;
    const nonMatchingElements = relevant.filter(c => c.overallMatchPercent < 95 && c.overallMatchPercent > 0).length;
    const missingElements = relevant.reduce((s, c) => s + c.missing.length, 0);
    const totalElements = relevant.length || 1;
    const matchPercent = Math.round(((matchingElements) / totalElements) * 10000) / 100;
    const criticalDeviations = relevant.reduce((s, c) => s + c.deviations.filter(d => d.severity === 'Critical').length, 0);

    return {
      elementsCompared: relevant.length,
      matchingElements,
      nonMatchingElements,
      missingElements,
      matchPercent,
      criticalDeviations
    };
  }

  private compareDimensions(design: DimensionComparison, actual: DimensionComparison): BIMDeviation[] {
    const deviations: BIMDeviation[] = [];
    const params: (keyof DimensionComparison)[] = ['width', 'height', 'depth'];

    for (const param of params) {
      const designVal = design[param];
      const actualVal = actual[param];
      const tolerance = this.toleranceDefaults[param] || 12;
      const deviation = actualVal - designVal;
      const deviationMm = Math.abs(deviation);

      deviations.push({
        id: `DEV-${param}-${Date.now()}`,
        parameter: `${param} (mm)`,
        designValue: designVal,
        actualValue: actualVal,
        deviation: deviationMm,
        unit: 'mm',
        tolerance,
        acceptable: deviationMm <= tolerance,
        severity: this.categorizeDeviation(deviationMm, tolerance),
        recommendation: deviationMm > tolerance
          ? `Adjust ${param} to match design specification of ${designVal}mm (current: ${actualVal}mm)`
          : undefined
      });
    }

    return deviations;
  }

  private comparePosition(design: { x: number; y: number; z: number }, actual: { x: number; y: number; z: number }): BIMDeviation[] {
    const deviations: BIMDeviation[] = [];
    const params: (keyof typeof design)[] = ['x', 'y', 'z'];

    for (const param of params) {
      const designVal = design[param];
      const actualVal = actual[param];
      const deviation = Math.abs(actualVal - designVal);
      const tolerance = this.toleranceDefaults.position;

      deviations.push({
        id: `DEV-POS-${param}-${Date.now()}`,
        parameter: `Position ${param.toUpperCase()}`,
        designValue: designVal,
        actualValue: actualVal,
        deviation,
        unit: 'mm',
        tolerance,
        acceptable: deviation <= tolerance,
        severity: this.categorizeDeviation(deviation, tolerance),
        recommendation: deviation > tolerance
          ? `Realign element position at ${param.toUpperCase()}=${actualVal}mm to design value of ${designVal}mm`
          : undefined
      });
    }

    return deviations;
  }

  private compareProperties(design: Record<string, unknown>, actual: Record<string, unknown>): BIMDeviation[] {
    const deviations: BIMDeviation[] = [];
    const allKeys = new Set([...Object.keys(design), ...Object.keys(actual)]);

    for (const key of allKeys) {
      const designVal = design[key];
      const actualVal = actual[key];

      if (designVal !== undefined && actualVal !== undefined && designVal !== actualVal) {
        const dVal = typeof designVal === 'number' ? designVal : 0;
        const aVal = typeof actualVal === 'number' ? actualVal : 0;
        const deviation = Math.abs(aVal - dVal);

        deviations.push({
          id: `DEV-PROP-${key}-${Date.now()}`,
          parameter: key,
          designValue: dVal,
          actualValue: aVal,
          deviation,
          unit: '',
          tolerance: dVal * 0.05 || 1,
          acceptable: deviation <= (dVal * 0.05 || 1),
          severity: 'Medium',
          recommendation: `Verify property ${key} deviation`
        });
      }
    }

    return deviations;
  }

  private findMatchingId(element: BIMElement, actuals: BIMElement[]): string {
    const match = actuals.find(a =>
      a.type === element.type &&
      a.name === element.name
    );
    return match?.id || '';
  }

  private categorizeDeviation(deviation: number, tolerance: number): 'Low' | 'Medium' | 'High' | 'Critical' {
    const ratio = deviation / (tolerance || 1);
    if (ratio <= 1) return 'Low';
    if (ratio <= 1.5) return 'Medium';
    if (ratio <= 2) return 'High';
    return 'Critical';
  }

  private generateSummary(matchPercent: number, nonMatchingCount: number, missingCount: number): string {
    if (matchPercent >= 95) {
      return 'Element matches design specification within acceptable tolerances';
    } else if (matchPercent >= 80) {
      return `Element has minor deviations (${nonMatchingCount} parameters) that may require adjustment`;
    } else {
      return `Element has significant deviations (${nonMatchingCount} parameters) requiring corrective action`;
    }
  }

  clearComparisons(elementId?: string): void {
    if (elementId) {
      this.comparisons.delete(elementId);
    } else {
      this.comparisons.clear();
    }
  }

  getComparisonHistory(elementId: string): BIMComparison[] {
    return this.comparisons.get(elementId) || [];
  }
}
