import { IEngine } from '@acep/core';
import { InspectionType, InspectionCategory, InspectionPoint, InspectionStatus, InspectionResult, NCR, NCRSeverity, NCRStatus, CAPA, CAPAStatus, QualityAnalysis, ImageAnalysisResult, BIMComparison, CodeComplianceResult, QualityMetrics, DailyReport, InspectorReport, NCRReport, LabReport, HandoverReport, MonthlyReport, QualityElement, LabResultReference, InspectionDocument, SignatureInfo, QualityPattern, RecurringDefect, SuggestedAction, ActionPriority, QualityTrend, CrackInfo, HoneycombingInfo, SpallingInfo, RustInfo, LeakageInfo, PoorFinishInfo, DeviationInfo, BIMElement, BIMDeviation, ComplianceItem, NonComplianceItem, BIMComparisonSummary } from './types';
export { QualityAnalysis, ImageAnalysisResult, BIMComparison, CodeComplianceResult, QualityMetrics, EnterpriseQualityIndex, DailyReport, InspectorReport, NCRReport, LabReport, HandoverReport, MonthlyReport, CAPASchedule, CAPAMilestone } from './types';
export interface IQualityEngine extends IEngine {
    requestInspection(point: InspectionPoint): Promise<string>;
    assignInspector(inspectionId: string, inspectorId: string): Promise<void>;
    completeInspection(inspectionId: string, result: InspectionResult): Promise<void>;
    approveInspection(inspectionId: string, approvedBy: string): Promise<void>;
    rejectInspection(inspectionId: string, reason: string): Promise<void>;
    getInspection(inspectionId: string): InspectionPoint | undefined;
    listInspections(type?: InspectionType, status?: InspectionStatus): InspectionPoint[];
    getInspectionsByDate(from: string, to: string): InspectionPoint[];
    addPhoto(inspectionId: string, photoUrl: string): Promise<void>;
    addDocument(inspectionId: string, doc: InspectionDocument): Promise<void>;
    addLabResult(inspectionId: string, result: LabResultReference): Promise<void>;
    signInspection(inspectionId: string, signature: SignatureInfo, role: 'inspector' | 'contractor' | 'consultant'): Promise<void>;
    getPendingSignatures(inspectionId: string): string[];
}
export interface IInspectionManager {
    createInspection(data: Partial<InspectionPoint>): Promise<string>;
    updateInspection(id: string, data: Partial<InspectionPoint>): Promise<void>;
    deleteInspection(id: string): Promise<void>;
    getInspection(id: string): InspectionPoint | undefined;
    listInspections(filter?: InspectionFilter): InspectionPoint[];
    submitForApproval(id: string): Promise<void>;
    approve(id: string, reviewer: string): Promise<void>;
    reject(id: string, reason: string): Promise<void>;
    scheduleInspection(id: string, date: string): Promise<void>;
    rescheduleInspection(id: string, date: string): Promise<void>;
    cancelInspection(id: string): Promise<void>;
}
export interface InspectionFilter {
    type?: InspectionType;
    status?: InspectionStatus;
    category?: InspectionCategory;
    element?: QualityElement;
    location?: string;
    inspector?: string;
    fromDate?: string;
    toDate?: string;
    priority?: string;
}
export interface IQualityAnalyzer {
    analyzeProject(projectId: string, from: string, to: string): Promise<QualityAnalysis>;
    detectPatterns(inspections: InspectionPoint[], ncrs: NCR[]): Promise<QualityPattern[]>;
    findRecurringDefects(ncrs: NCR[]): Promise<RecurringDefect[]>;
    estimateReworkProbability(inspections: InspectionPoint[]): Promise<number>;
    suggestCorrectiveActions(ncrs: NCR[]): Promise<SuggestedAction[]>;
    prioritizeActions(defects: RecurringDefect[]): Promise<ActionPriority[]>;
    analyzeTrends(metrics: QualityMetrics[]): Promise<QualityTrend[]>;
    learnFromPast(projectId: string): Promise<void>;
    getRecommendations(projectId: string): Promise<string[]>;
}
export interface IBIMValidator {
    compareElement(bimElement: BIMElement, actual: BIMElement): Promise<BIMComparison>;
    batchCompare(elements: BIMElement[], actuals: BIMElement[]): Promise<BIMComparison[]>;
    detectMissingElements(bimElements: BIMElement[], actualElements: BIMElement[]): Promise<BIMElement[]>;
    detectDeviations(bimElement: BIMElement, actual: BIMElement): Promise<BIMDeviation[]>;
    calculateMatchPercent(bimElements: BIMElement[], actualElements: BIMElement[]): Promise<number>;
    generateComparisonReport(projectId: string, comparisons: BIMComparison[]): Promise<string>;
    getComplianceSummary(projectId: string): Promise<BIMComparisonSummary>;
}
export interface INCRAnalyzer {
    raiseNCR(data: Partial<NCR>): Promise<string>;
    updateNCR(id: string, data: Partial<NCR>): Promise<void>;
    getNCR(id: string): NCR | undefined;
    listNCRs(severity?: NCRSeverity, status?: NCRStatus): NCR[];
    closeNCR(id: string, evidence: string, closedBy: string): Promise<void>;
    reopenNCR(id: string, reason: string): Promise<void>;
    addEvidence(ncrId: string, evidence: import('./types').NCREvidence): Promise<void>;
    linkToCAPA(ncrId: string, capaId: string): Promise<void>;
    getNCRStats(projectId: string): Promise<{
        total: number;
        open: number;
        closed: number;
        bySeverity: Record<NCRSeverity, number>;
        avgClosureDays: number;
    }>;
    generateNCRReport(projectId: string): Promise<NCRReport>;
}
export interface ICAPAManager {
    createCAPA(data: Partial<CAPA>): Promise<string>;
    updateCAPA(id: string, data: Partial<CAPA>): Promise<void>;
    getCAPA(id: string): CAPA | undefined;
    listCAPAs(status?: CAPAStatus): CAPA[];
    executeCAPA(id: string, milestoneId: string): Promise<void>;
    verifyCAPA(id: string, verifiedBy: string, score: number, evaluation: string): Promise<void>;
    closeCAPA(id: string): Promise<void>;
    getCAPAEffectiveness(id: string): Promise<number>;
    generateCAPAReport(projectId: string): Promise<{
        total: number;
        open: number;
        closed: number;
        overdue: number;
        closureRate: number;
    }>;
}
export interface ICodeComplianceChecker {
    checkCompliance(projectId: string, standard: string, version: string): Promise<CodeComplianceResult>;
    checkElement(elementId: string, code: string): Promise<ComplianceItem[]>;
    checkDesign(bimElements: BIMElement[], code: string): Promise<NonComplianceItem[]>;
    getApplicableCodes(projectType: string, location: string): Promise<string[]>;
    resolveNonCompliance(itemId: string, resolution: string): Promise<void>;
    generateComplianceReport(projectId: string, standard: string): Promise<string>;
}
export interface IImageAnalyzer {
    analyzeImage(imageUrl: string, inspectionId: string): Promise<ImageAnalysisResult>;
    detectCracks(imageUrl: string): Promise<CrackInfo[]>;
    detectHoneycombing(imageUrl: string): Promise<HoneycombingInfo[]>;
    detectSpalling(imageUrl: string): Promise<SpallingInfo[]>;
    detectRust(imageUrl: string): Promise<RustInfo[]>;
    detectLeakage(imageUrl: string): Promise<LeakageInfo[]>;
    detectPoorFinish(imageUrl: string): Promise<PoorFinishInfo[]>;
    detectDeviations(imageUrl: string, bimData: BIMElement): Promise<DeviationInfo[]>;
    calculateHealthScore(defects: ImageAnalysisResult): Promise<number>;
    batchAnalyze(imageUrls: string[], inspectionId: string): Promise<ImageAnalysisResult[]>;
}
export interface IReportGenerator {
    generateDailyReport(projectId: string, date: string): Promise<DailyReport>;
    generateInspectorReport(projectId: string, inspectorId: string, from: string, to: string): Promise<InspectorReport>;
    generateNCRReport(projectId: string): Promise<NCRReport>;
    generateLabReport(projectId: string): Promise<LabReport>;
    generateHandoverReport(projectId: string, systemType: string): Promise<HandoverReport>;
    generateMonthlyReport(projectId: string, month: number, year: number): Promise<MonthlyReport>;
    exportReport(report: DailyReport | InspectorReport | NCRReport | LabReport | HandoverReport | MonthlyReport, format: 'PDF' | 'Excel' | 'Word'): Promise<string>;
}
//# sourceMappingURL=interfaces.d.ts.map