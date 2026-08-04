import { BaseEngine } from '@acep/core';
import { KnowledgeGraph } from '@acep/knowledge-base';
interface SupplierProfile {
    supplierId: string;
    classification: string;
    specialization: string;
    products: string[];
    coverageRegions: string[];
    productionCapacity: number;
    deliveryTime: number;
    averagePrice: number;
    quality: number;
    commitmentRate: number;
    delayRate: number;
    projectRatings: ProjectRating[];
    certifications: string[];
    financialStatus: FinancialStatus;
    risks: SupplierRisk[];
    supplierIntelligenceScore: number;
}
interface ProjectRating {
    projectId: string;
    rating: number;
    comments: string;
    date: Date;
}
interface FinancialStatus {
    creditScore: number;
    paymentTerms: string;
    financialStability: 'Stable' | 'Moderate' | 'Risky';
}
interface SupplierRisk {
    riskType: string;
    probability: number;
    impact: number;
    mitigation: string;
}
interface PurchaseOrder {
    purchaseOrderId: string;
    purchaseRequestId: string;
    projectId: string;
    activityId: string;
    supplierId: string;
    items: PurchaseItem[];
    totalCost: number;
    currency: string;
    status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Ordered' | 'Delivered' | 'Cancelled';
    deliveryDate: Date;
    actualDeliveryDate?: Date;
    paymentTerms: string;
    createdAt: Date;
    updatedAt: Date;
}
interface PurchaseItem {
    itemId: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    specifications: string;
}
interface DeliveryTracking {
    trackingId: string;
    purchaseOrderId: string;
    manufacturingStatus: string;
    manufacturingDate?: Date;
    shippingDate?: Date;
    currentLocation: string;
    expectedDelivery: Date;
    inspectionStatus: 'Pending' | 'Passed' | 'Failed';
    inspectionDate?: Date;
    receptionStatus: 'Pending' | 'Received' | 'Rejected';
    receptionDate?: Date;
    storageLocation?: string;
    siteDispatchStatus: 'Pending' | 'Dispatched';
    siteDispatchDate?: Date;
}
interface MaterialAlternative {
    originalMaterialId: string;
    alternativeId: string;
    alternativeType: 'Technical' | 'Commercial';
    description: string;
    qualityImpact: number;
    priceImpact: number;
    timeImpact: number;
    warrantyImpact: number;
    codeCompliance: boolean;
    alternativeSuppliers: string[];
    recommendation: string;
}
interface Tender {
    tenderId: string;
    projectId: string;
    tenderType: 'RFQ' | 'RFP' | 'PublicTender';
    description: string;
    requirements: TenderRequirement[];
    deadline: Date;
    status: 'Draft' | 'Published' | 'Closed' | 'Evaluated' | 'Awarded';
    bids: TenderBid[];
    evaluationCriteria: EvaluationCriteria[];
    recommendation?: TenderRecommendation;
}
interface TenderRequirement {
    requirementId: string;
    description: string;
    specifications: string;
    quantity: number;
    unit: string;
}
interface TenderBid {
    bidId: string;
    supplierId: string;
    totalPrice: number;
    deliveryTime: number;
    warranty: string;
    specifications: string;
    paymentTerms: string;
    complianceScore: number;
    riskScore: number;
    submittedAt: Date;
}
interface EvaluationCriteria {
    criterionId: string;
    name: string;
    weight: number;
    type: 'Price' | 'Quality' | 'Delivery' | 'Warranty' | 'Compliance' | 'Risk';
}
interface TenderRecommendation {
    recommendedSupplierId: string;
    totalScore: number;
    priceScore: number;
    qualityScore: number;
    deliveryScore: number;
    riskScore: number;
    justification: string;
    advantages: string[];
    disadvantages: string[];
}
export declare class ProcurementEngine extends BaseEngine {
    private knowledgeGraph;
    private suppliers;
    private purchaseOrders;
    private deliveryTracking;
    private inventory;
    private alternatives;
    private tenders;
    private decisionGraph;
    constructor(kg: KnowledgeGraph);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    planProcurement(projectData: any): Promise<{
        procurementPlan: ProcurementPlanItem[];
        recommendations: string[];
        budgetAnalysis: BudgetAnalysis;
    }>;
    createSupplierProfile(supplierData: any): Promise<SupplierProfile>;
    evaluateSupplier(supplierId: string): Promise<SupplierEvaluation>;
    createTender(tenderData: any): Promise<Tender>;
    evaluateBids(tenderId: string): Promise<TenderRecommendation>;
    createPurchaseOrder(orderData: any): Promise<PurchaseOrder>;
    trackDelivery(purchaseOrderId: string): Promise<DeliveryTracking>;
    manageInventory(materialCode: string): Promise<InventoryManagementResult>;
    findAlternatives(materialId: string): Promise<MaterialAlternative[]>;
    predictSupplyChainRisks(projectData: any): Promise<SupplyChainPrediction>;
    getPerformanceMetrics(): Promise<ProcurementMetrics>;
    private calculateSupplierIntelligenceScore;
    private evaluatePriceScore;
    private evaluateDeliveryScore;
    private evaluateFinancialScore;
    private evaluatePastPerformance;
    private evaluateEmergencyResponse;
    private evaluateAfterSalesService;
    private evaluateWarrantyScore;
    private generateSupplierRecommendation;
    private calculateBidScore;
    private calculateCriterionScore;
    private generateBidJustification;
    private generateBidAdvantages;
    private generateBidDisadvantages;
    private getDefaultEvaluationCriteria;
    private recordProcurementDecision;
    private updateTrackingStatus;
    private calculateInventoryStatus;
    private generateInventoryRecommendations;
    private calculateTurnoverRate;
    private generateAlternatives;
    private predictMaterialShortage;
    private predictShipmentDelay;
    private predictPriceIncrease;
    private predictSupplierFailure;
    private predictSeasonalDemand;
    private identifyBottlenecks;
    private calculateAverageDeliveryTime;
    private calculateOverallCommitmentRate;
    private calculateOverallDelayRate;
    private calculateRejectionRate;
    private calculateAveragePurchaseCost;
    private calculateSavingsRate;
    private calculateInventoryTurnover;
    private calculateTotalInventoryValue;
    private calculateCriticalOrderRate;
    private normalizeScore;
    private loadInitialData;
    private initializeSampleSuppliers;
    private initializeSampleInventory;
    private linkToKnowledgeGraph;
    private analyzeMaterialRequirements;
    private analyzeProcurementTiming;
    private identifyPotentialSuppliers;
    private canDeferMaterial;
    private checkStockAvailability;
    private generateProcurementRecommendations;
}
interface ProcurementPlanItem {
    itemId: string;
    description: string;
    quantity: number;
    unit: string;
    requiredBy: Date;
    suggestedSuppliers: string[];
    estimatedCost: number;
    canDefer: boolean;
    alternatives: MaterialAlternative[];
    stockCheck: boolean;
    budgetImpact: number;
}
interface BudgetAnalysis {
    totalEstimatedCost: number;
    budgetAllocated: number;
    variance: number;
    cashFlowRequirements: CashFlowRequirement[];
}
interface CashFlowRequirement {
    period: string;
    amount: number;
    description: string;
}
interface SupplierEvaluation {
    supplierId: string;
    priceScore: number;
    qualityScore: number;
    deliveryScore: number;
    financialStabilityScore: number;
    contractComplianceScore: number;
    pastProjectPerformance: number;
    emergencyResponse: number;
    afterSalesService: number;
    warrantyScore: number;
    complaintRate: number;
    overallScore: number;
    recommendation: string;
    confidence: number;
}
interface InventoryManagementResult {
    currentStock: number;
    minimumLevel: number;
    maximumLevel: number;
    reorderPoint: number;
    status: string;
    recommendations: string[];
    category: string;
    turnoverRate: number;
    stockValue: number;
    reorderRecommended?: boolean;
    reorderQuantity?: number;
}
interface SupplyChainPrediction {
    materialShortageProbability: number;
    shipmentDelayProbability: number;
    priceIncreaseProbability: number;
    supplierFailureProbability: number;
    seasonalDemandIncrease: number;
    supplyChainBottlenecks: string[];
    confidence: number;
}
interface ProcurementMetrics {
    averageDeliveryTime: number;
    commitmentRate: number;
    delayRate: number;
    rejectionRate: number;
    averagePurchaseCost: number;
    savingsRate: number;
    inventoryTurnover: number;
    inventoryValue: number;
    criticalOrderRate: number;
}
export {};
//# sourceMappingURL=index.d.ts.map