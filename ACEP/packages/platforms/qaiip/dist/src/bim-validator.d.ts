import { BIMComparison, BIMElement, BIMDeviation, BIMComparisonSummary } from './types';
import { IBIMValidator } from './interfaces';
export declare class BIMValidator implements IBIMValidator {
    private comparisons;
    private toleranceDefaults;
    constructor(kg?: any);
    compareElement(bimElement: BIMElement, actual: BIMElement): Promise<BIMComparison>;
    batchCompare(elements: BIMElement[], actuals: BIMElement[]): Promise<BIMComparison[]>;
    detectMissingElements(bimElements: BIMElement[], actualElements: BIMElement[]): Promise<BIMElement[]>;
    detectDeviations(bimElement: BIMElement, actual: BIMElement): Promise<BIMDeviation[]>;
    calculateMatchPercent(bimElements: BIMElement[], actualElements: BIMElement[]): Promise<number>;
    generateComparisonReport(projectId: string, comparisons: BIMComparison[]): Promise<string>;
    getComplianceSummary(projectId: string): Promise<BIMComparisonSummary>;
    private compareDimensions;
    private comparePosition;
    private compareProperties;
    private findMatchingId;
    private categorizeDeviation;
    private generateSummary;
    clearComparisons(elementId?: string): void;
    getComparisonHistory(elementId: string): BIMComparison[];
}
//# sourceMappingURL=bim-validator.d.ts.map