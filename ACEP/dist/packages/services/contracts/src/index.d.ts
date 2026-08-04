import { BaseEngine } from '@acep/core';
import { KnowledgeGraph } from '@acep/knowledge-base';
interface SmartContract {
    contractId: string;
    projectId: string;
    contractType: 'MainContract' | 'Subcontract' | 'PurchaseOrder' | 'ConsultingAgreement' | 'LaborContract';
    contractNumber: string;
    title: string;
    parties: ContractParty[];
    effectiveDate: Date;
    expirationDate: Date;
    contractValue: number;
    currency: string;
    status: 'Draft' | 'Active' | 'Suspended' | 'Terminated' | 'Completed';
    clauses: ContractClause[];
    obligations: ContractObligation[];
    milestones: ContractMilestone[];
    paymentTerms: PaymentTerm[];
    changeOrders: ChangeOrder[];
    claims: Claim[];
    riskFactors: ContractRisk[];
    complianceStatus: ComplianceStatus;
    aiUnderstanding: ContractUnderstanding;
}
interface ContractParty {
    partyId: string;
    name: string;
    role: 'Owner' | 'Contractor' | 'Subcontractor' | 'Consultant' | 'Supplier';
    contactInfo: ContactInfo;
    responsibilities: string[];
    liabilities: string[];
}
interface ContactInfo {
    email: string;
    phone: string;
    address: string;
    representative: string;
}
interface ContractClause {
    clauseId: string;
    type: 'Payment' | 'Performance' | 'Termination' | 'Indemnity' | 'Warranty' | 'ForceMajeure' | 'DisputeResolution' | 'ChangeOrder' | 'Insurance' | 'Safety';
    title: string;
    content: string;
    importance: 'Critical' | 'High' | 'Medium' | 'Low';
    conditions: ClauseCondition[];
    obligations: string[];
    penalties?: string;
    aiInterpretation: string;
}
interface ClauseCondition {
    conditionId: string;
    description: string;
    triggerEvent: string;
    requiredAction: string;
    deadline?: Date;
}
interface ContractObligation {
    obligationId: string;
    description: string;
    responsibleParty: string;
    dueDate: Date;
    status: 'Pending' | 'InProgress' | 'Completed' | 'Overdue' | 'Waived';
    priority: 'High' | 'Medium' | 'Low';
    linkedClauses: string[];
    completionEvidence?: string;
}
interface ContractMilestone {
    milestoneId: string;
    description: string;
    targetDate: Date;
    actualDate?: Date;
    percentage: number;
    paymentAmount: number;
    status: 'Pending' | 'InProgress' | 'Completed' | 'Delayed';
    deliverables: string[];
    prerequisites: string[];
}
interface PaymentTerm {
    termId: string;
    type: 'ProgressPayment' | 'MilestonePayment' | 'AdvancePayment' | 'Retention' | 'FinalPayment';
    description: string;
    percentage: number;
    amount: number;
    conditions: string[];
    dueDate?: Date;
    paidDate?: Date;
    status: 'Pending' | 'Approved' | 'Paid' | 'Overdue';
}
interface ChangeOrder {
    changeOrderId: string;
    description: string;
    reason: string;
    impact: ChangeOrderImpact;
    status: 'Requested' | 'Approved' | 'Rejected' | 'Implemented';
    requestedDate: Date;
    approvedDate?: Date;
    costImpact: number;
    scheduleImpact: number;
    approvedBy: string;
    justification: string;
    riskAssessment: string;
}
interface ChangeOrderImpact {
    affectedItems: string[];
    affectedActivities: string[];
    costChange: number;
    scheduleChange: number;
    qualityImpact: string;
}
interface Claim {
    claimId: string;
    claimType: 'Delay' | 'Cost' | 'ScopeChange' | 'ForceMajeure' | 'Breach' | 'Disruption';
    description: string;
    cause: string;
    basis: string;
    amount: number;
    currency: string;
    status: 'Draft' | 'Submitted' | 'UnderReview' | 'Accepted' | 'Rejected' | 'Settled' | 'Disputed';
    submittedDate: Date;
    responseDate?: Date;
    supportingDocuments: string[];
    contractReferences: string[];
    aiPrediction: ClaimPrediction;
    recommendation: string;
}
interface ClaimPrediction {
    successProbability: number;
    estimatedAmount: number;
    timeToResolution: number;
    riskFactors: string[];
    similarCases: SimilarCase[];
    confidence: number;
}
interface SimilarCase {
    caseId: string;
    projectId: string;
    outcome: string;
    amount: number;
    similarity: number;
}
interface ContractRisk {
    riskId: string;
    riskType: string;
    description: string;
    probability: number;
    impact: number;
    mitigation: string;
    status: 'Open' | 'Mitigated' | 'Closed';
}
interface ComplianceStatus {
    overallCompliance: number;
    clauseCompliance: Map<string, number>;
    overdueObligations: number;
    pendingObligations: number;
    complianceIssues: ComplianceIssue[];
}
interface ComplianceIssue {
    issueId: string;
    description: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    affectedClauses: string[];
    recommendation: string;
    deadline: Date;
}
interface ContractUnderstanding {
    summary: string;
    keyTerms: string[];
    obligations: string[];
    rights: string[];
    risks: string[];
    opportunities: string[];
    criticalDates: Date[];
    paymentSchedule: PaymentScheduleItem[];
}
interface PaymentScheduleItem {
    milestone: string;
    amount: number;
    dueDate: Date;
    conditions: string[];
}
export declare class ContractEngine extends BaseEngine {
    private knowledgeGraph;
    private contracts;
    private contractTemplates;
    constructor(kg: KnowledgeGraph);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    understandContract(contractText: string): Promise<ContractUnderstanding>;
    extractClauses(contractText: string): Promise<ContractClause[]>;
    mapObligations(contract: SmartContract): Promise<ContractObligation[]>;
    monitorContractExecution(contractId: string): Promise<ExecutionReport>;
    createChangeOrder(changeOrderData: any): Promise<ChangeOrder>;
    evaluateChangeOrder(changeOrderId: string): Promise<ChangeOrderEvaluation>;
    predictClaim(claimData: any): Promise<ClaimPrediction>;
    analyzeClaim(claimData: any): Promise<ClaimAnalysis>;
    manageDispute(disputeData: any): Promise<DisputeResolution>;
    checkContractCompliance(contractId: string): Promise<ComplianceStatus>;
    getContractDashboard(projectId: string): Promise<ContractDashboard>;
    private generateContractSummary;
    private extractKeyTerms;
    private extractObligations;
    private extractRights;
    private identifyContractRisks;
    private identifyOpportunities;
    private extractCriticalDates;
    private extractPaymentSchedule;
    private extractClauseContent;
    private determineClauseImportance;
    private extractClauseConditions;
    private extractClauseObligations;
    private extractClausePenalties;
    private generateClauseInterpretation;
    private determineResponsibleParty;
    private calculateObligationDueDate;
    private determineObligationPriority;
    private calculateOverallStatus;
    private monitorObligations;
    private monitorMilestones;
    private monitorPayments;
    private checkCompliance;
    private assessContractRisks;
    private generateExecutionRecommendations;
    private generateEarlyWarnings;
    private assessChangeOrderRisk;
    private calculateClaimSuccessProbability;
    private identifyClaimRiskFactors;
    private findSimilarCases;
    private validateClaim;
    private identifyContractBasis;
    private assessSupportingEvidence;
    private generateCounterarguments;
    private recommendClaimStrategy;
    private estimateClaimOutcome;
    private identifyNegotiationPoints;
    private recommendResolutionMethod;
    private estimateResolutionTimeline;
    private estimateResolutionCost;
    private estimateResolutionSuccess;
    private generateNextSteps;
    private calculateOverallCompliance;
    private calculateClauseCompliance;
    private countOverdueObligations;
    private countPendingObligations;
    private identifyComplianceIssues;
    private calculateProjectComplianceScore;
    private calculateProjectRiskScore;
    private getUpcomingDeadlines;
    private getCriticalIssues;
    private loadContractTemplates;
}
interface ExecutionReport {
    contractId: string;
    monitoringDate: Date;
    overallStatus: string;
    obligationStatus: any;
    milestoneStatus: any;
    paymentStatus: any;
    complianceStatus: ComplianceStatus;
    riskStatus: any;
    recommendations: string[];
    earlyWarnings: string[];
}
interface ChangeOrderEvaluation {
    costJustification: boolean;
    scheduleJustification: boolean;
    technicalFeasibility: boolean;
    contractCompliance: boolean;
    riskAcceptable: boolean;
    recommendation: string;
    conditions: string[];
    confidence: number;
}
interface ClaimAnalysis {
    claimValid: boolean;
    contractBasis: string;
    supportingEvidence: string;
    counterarguments: string[];
    recommendedStrategy: string;
    estimatedOutcome: string;
    negotiationPoints: string[];
    confidence: number;
}
interface DisputeResolution {
    disputeId: string;
    disputeType: string;
    description: string;
    parties: string[];
    status: string;
    resolutionMethod: string;
    timeline: number;
    costEstimate: number;
    successProbability: number;
    nextSteps: string[];
    confidence: number;
}
interface ContractDashboard {
    totalContracts: number;
    activeContracts: number;
    totalContractValue: number;
    pendingChangeOrders: number;
    openClaims: number;
    complianceScore: number;
    riskScore: number;
    upcomingDeadlines: any[];
    criticalIssues: string[];
}
export {};
//# sourceMappingURL=index.d.ts.map