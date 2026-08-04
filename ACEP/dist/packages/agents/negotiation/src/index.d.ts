import { IAgent } from '@acep/core';
interface SupplierOption {
    supplierId: string;
    supplierName: string;
    materialId: string;
    materialName: string;
    unitPrice: number;
    currency: string;
    quantityAvailable: number;
    quality: number;
    deliveryDays: number;
    deliveryCost: number;
    rating: number;
    warrantyMonths: number;
    paymentTerms: string;
    location: string;
    distance: number;
    totalCost: number;
}
interface ComparisonMatrix {
    materialId: string;
    materialName: string;
    quantity: number;
    options: SupplierOption[];
    weightedScores: WeightedScore[];
    bestOption: WeightedScore | null;
    summary: ComparisonSummary;
}
interface WeightedScore {
    supplierId: string;
    supplierName: string;
    totalScore: number;
    priceScore: number;
    qualityScore: number;
    deliveryScore: number;
    ratingScore: number;
    warrantyScore: number;
    details: Record<string, number>;
}
interface ComparisonSummary {
    totalOptions: number;
    priceRange: {
        min: number;
        max: number;
        average: number;
    };
    deliveryRange: {
        min: number;
        max: number;
        average: number;
    };
    qualityRange: {
        min: number;
        max: number;
        average: number;
    };
    topSuppliers: string[];
}
interface RFQDocument {
    id: string;
    title: string;
    issueDate: string;
    closingDate: string;
    buyer: string;
    projectName: string;
    items: RFQItem[];
    terms: RFQTerms;
    deliveryRequirements: RFQDelivery;
}
interface RFQItem {
    lineNumber: number;
    code: string;
    description: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice: number;
    totalEstimated: number;
    technicalSpecs: string[];
    qualityRequired: string;
}
interface RFQTerms {
    currency: string;
    paymentTerms: string;
    warrantyRequired: number;
    validityDays: number;
    bondingRequired: boolean;
    specialConditions: string[];
}
interface RFQDelivery {
    location: string;
    requiredDate: string;
    partialDelivery: boolean;
    packagingRequirements: string;
}
export declare class NegotiationAgent implements IAgent {
    readonly id = "agent-negotiation";
    readonly type = "negotiation";
    readonly name = "Negotiation Agent";
    private logger;
    process(input: unknown): Promise<unknown>;
    canHandle(input: unknown): boolean;
    getCapabilities(): string[];
    private generateMockSuppliers;
    compareSuppliers(materialId: string, quantity: number, location: string): Promise<ComparisonMatrix>;
    private calculateWeightedScores;
    generateComparisonMatrix(items: Array<{
        code: string;
        description: string;
        quantity: number;
        unit: string;
    }>): Promise<ComparisonMatrix[]>;
    suggestBestOption(options: SupplierOption[]): Promise<{
        bestOption: WeightedScore | null;
        allScores: WeightedScore[];
        rationale: string;
    }>;
    prepareRFQ(materialList: Array<{
        code: string;
        description: string;
        quantity: number;
        unit: string;
        estimatedPrice?: number;
    }>): Promise<RFQDocument>;
}
export {};
//# sourceMappingURL=index.d.ts.map