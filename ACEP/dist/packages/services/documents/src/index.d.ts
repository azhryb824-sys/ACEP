import { BaseEngine } from '@acep/core';
import { KnowledgeGraph } from '@acep/knowledge-base';
interface IntelligentDocument {
    documentId: string;
    projectId: string;
    documentType: DocumentType;
    title: string;
    originalFileName: string;
    fileType: string;
    fileSize: number;
    uploadDate: Date;
    uploadedBy: string;
    version: number;
    status: 'Processing' | 'Processed' | 'Failed' | 'Archived';
    content: DocumentContent;
    metadata: DocumentMetadata;
    extractedInfo: ExtractedInformation;
    linkedElements: LinkedElement[];
    tags: string[];
    permissions: DocumentPermission[];
    versionHistory: DocumentVersion[];
}
type DocumentType = 'Contract' | 'Drawing' | 'Specification' | 'Report' | 'Correspondence' | 'Invoice' | 'PurchaseOrder' | 'ChangeOrder' | 'Permit' | 'Certificate' | 'Schedule' | 'BOQ' | 'Photograph' | 'Video' | 'Email' | 'MeetingMinutes' | 'InspectionReport' | 'SafetyReport' | 'QualityReport';
interface DocumentContent {
    text: string;
    pages: DocumentPage[];
    tables: ExtractedTable[];
    images: ExtractedImage[];
    ocrConfidence: number;
}
interface DocumentPage {
    pageNumber: number;
    text: string;
    images: string[];
    tables: TableData[];
}
interface ExtractedTable {
    tableId: string;
    pageNumber: number;
    headers: string[];
    rows: string[][];
    confidence: number;
}
interface ExtractedImage {
    imageId: string;
    pageNumber: number;
    description: string;
    confidence: number;
    objects: DetectedObject[];
}
interface TableData {
    headers: string[];
    rows: string[][];
}
interface DetectedObject {
    type: string;
    confidence: number;
    boundingBox: number[];
}
interface DocumentMetadata {
    author: string;
    creationDate: Date;
    modificationDate: Date;
    keywords: string[];
    language: string;
    pageCount: number;
    wordCount: number;
    characterCount: number;
}
interface ExtractedInformation {
    entities: ExtractedEntity[];
    keyPhrases: string[];
    sentiment: DocumentSentiment;
    topics: DocumentTopic[];
    summary: string;
    actionItems: ActionItem[];
    deadlines: Deadline[];
    financialData: FinancialData[];
    technicalSpecs: TechnicalSpec[];
}
interface ExtractedEntity {
    entityId: string;
    text: string;
    type: 'Person' | 'Organization' | 'Location' | 'Date' | 'Money' | 'Percentage' | 'Quantity' | 'Contract' | 'Project';
    confidence: number;
    startPosition: number;
    endPosition: number;
}
interface DocumentSentiment {
    overall: 'Positive' | 'Neutral' | 'Negative';
    score: number;
    positiveAspects: string[];
    negativeAspects: string[];
}
interface DocumentTopic {
    topicId: string;
    name: string;
    confidence: number;
    keywords: string[];
}
interface ActionItem {
    actionId: string;
    description: string;
    assignee: string;
    dueDate: Date;
    priority: 'High' | 'Medium' | 'Low';
    status: 'Pending' | 'InProgress' | 'Completed';
    sourceText: string;
}
interface Deadline {
    deadlineId: string;
    description: string;
    date: Date;
    responsibleParty: string;
    importance: 'Critical' | 'High' | 'Medium' | 'Low';
}
interface FinancialData {
    dataId: string;
    type: 'Cost' | 'Revenue' | 'Budget' | 'Invoice' | 'Payment';
    amount: number;
    currency: string;
    description: string;
    date: Date;
}
interface TechnicalSpec {
    specId: string;
    parameter: string;
    value: string;
    unit: string;
    standard: string;
}
interface LinkedElement {
    elementId: string;
    elementType: 'Activity' | 'Material' | 'Equipment' | 'Resource' | 'Contract' | 'Drawing' | 'Specification';
    relationship: 'References' | 'Specifies' | 'Approves' | 'Documents' | 'RelatedTo';
    confidence: number;
}
interface DocumentPermission {
    userId: string;
    permission: 'Read' | 'Write' | 'Delete' | 'Admin';
    grantedDate: Date;
}
interface DocumentVersion {
    versionId: string;
    versionNumber: number;
    modifiedBy: string;
    modificationDate: Date;
    changeDescription: string;
    fileSize: number;
}
interface Communication {
    communicationId: string;
    projectId: string;
    communicationType: CommunicationType;
    subject: string;
    participants: CommunicationParticipant[];
    content: string;
    timestamp: Date;
    direction: 'Incoming' | 'Outgoing' | 'Internal';
    status: 'New' | 'Read' | 'Replied' | 'Archived';
    importance: 'Critical' | 'High' | 'Medium' | 'Low';
    extractedInfo: ExtractedInformation;
    linkedDocuments: string[];
    linkedActivities: string[];
    responseRequired: boolean;
    responseDeadline?: Date;
    sentiment: DocumentSentiment;
    urgency: number;
}
type CommunicationType = 'Email' | 'Letter' | 'Memo' | 'MeetingMinutes' | 'ChatMessage' | 'Notification' | 'FormalNotice' | 'RFI' | 'RFQ' | 'Proposal';
interface CommunicationParticipant {
    participantId: string;
    name: string;
    role: string;
    organization: string;
    email: string;
    participationType: 'From' | 'To' | 'CC' | 'BCC';
}
interface SearchResult {
    documentId: string;
    title: string;
    relevanceScore: number;
    snippet: string;
    matchedKeywords: string[];
    documentType: DocumentType;
    uploadDate: Date;
}
export declare class DocumentEngine extends BaseEngine {
    private knowledgeGraph;
    private documents;
    private communications;
    private documentIndex;
    constructor(kg: KnowledgeGraph);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    processDocument(fileData: any): Promise<IntelligentDocument>;
    extractContent(fileData: any): Promise<DocumentContent>;
    extractInformation(fileData: any): Promise<ExtractedInformation>;
    extractEntities(text: string): Promise<ExtractedEntity[]>;
    extractKeyPhrases(text: string): Promise<string[]>;
    analyzeSentiment(text: string): Promise<DocumentSentiment>;
    extractTopics(text: string): Promise<DocumentTopic[]>;
    generateSummary(text: string): Promise<string>;
    extractActionItems(text: string): Promise<ActionItem[]>;
    extractDeadlines(text: string): Promise<Deadline[]>;
    extractFinancialData(text: string): Promise<FinancialData[]>;
    extractTechnicalSpecs(text: string): Promise<TechnicalSpec[]>;
    classifyDocument(document: IntelligentDocument): Promise<DocumentType>;
    createVersion(documentId: string, changes: string, modifiedBy: string): Promise<DocumentVersion>;
    compareVersions(documentId: string, version1: number, version2: number): Promise<VersionComparison>;
    searchDocuments(query: string, filters?: SearchFilter): Promise<SearchResult[]>;
    processCommunication(commData: any): Promise<Communication>;
    analyzeCommunicationPattern(projectId: string): Promise<CommunicationPattern>;
    linkToProjectElements(document: IntelligentDocument): Promise<LinkedElement[]>;
    private detectDocumentType;
    private performOCR;
    private extractPages;
    private extractTables;
    private extractImages;
    private extractMetadata;
    private generateTags;
    private indexDocument;
    private linkToKnowledgeGraph;
    private generateSnippet;
    private assessImportance;
    private linkToActivities;
    private checkResponseRequired;
    private calculateResponseDeadline;
    private calculateUrgency;
    private groupByType;
    private groupByDirection;
    private calculateAverageResponseTime;
    private identifyTopParticipants;
    private analyzeSentimentTrend;
    private analyzeUrgencyTrend;
    private calculateResponseRate;
}
interface SearchFilter {
    documentType?: DocumentType;
    projectId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    uploadedBy?: string;
}
interface VersionComparison {
    documentId: string;
    version1: number;
    version2: number;
    changes: string[];
    addedContent: string[];
    removedContent: string[];
    modifiedContent: string[];
    confidence: number;
}
interface CommunicationPattern {
    totalCommunications: number;
    communicationByType: Record<string, number>;
    communicationByDirection: Record<string, number>;
    averageResponseTime: number;
    topParticipants: any[];
    sentimentTrend: any;
    urgencyTrend: number;
    responseRate: number;
}
export {};
//# sourceMappingURL=index.d.ts.map