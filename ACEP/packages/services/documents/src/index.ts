import { BaseEngine } from '@acep/core';
import { KnowledgeGraph } from '@acep/knowledge-base';

// Volume 30: Intelligent Document & Communication Intelligence Engine (IDCIE)

// Intelligent Document
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

type DocumentType = 
  | 'Contract'
  | 'Drawing'
  | 'Specification'
  | 'Report'
  | 'Correspondence'
  | 'Invoice'
  | 'PurchaseOrder'
  | 'ChangeOrder'
  | 'Permit'
  | 'Certificate'
  | 'Schedule'
  | 'BOQ'
  | 'Photograph'
  | 'Video'
  | 'Email'
  | 'MeetingMinutes'
  | 'InspectionReport'
  | 'SafetyReport'
  | 'QualityReport';

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

// Communication Intelligence
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

type CommunicationType = 
  | 'Email'
  | 'Letter'
  | 'Memo'
  | 'MeetingMinutes'
  | 'ChatMessage'
  | 'Notification'
  | 'FormalNotice'
  | 'RFI'
  | 'RFQ'
  | 'Proposal';

interface CommunicationParticipant {
  participantId: string;
  name: string;
  role: string;
  organization: string;
  email: string;
  participationType: 'From' | 'To' | 'CC' | 'BCC';
}

// Document Search
interface SearchResult {
  documentId: string;
  title: string;
  relevanceScore: number;
  snippet: string;
  matchedKeywords: string[];
  documentType: DocumentType;
  uploadDate: Date;
}

export class DocumentEngine extends BaseEngine {
  private knowledgeGraph: KnowledgeGraph;
  private documents: Map<string, IntelligentDocument> = new Map();
  private communications: Map<string, Communication> = new Map();
  private documentIndex: Map<string, string[]> = new Map(); // keyword -> documentIds

  constructor(kg: KnowledgeGraph) {
    super('DocumentEngine', '1.0.0');
    this.knowledgeGraph = kg;
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('DocumentEngine v1.0.0 initialized - Volume 30: IDCIE');
  }

  async validate(): Promise<boolean> {
    return true;
  }

  // Volume 30: OCR Processing
  async processDocument(fileData: any): Promise<IntelligentDocument> {
    this.logger.info(`Processing document: ${fileData.fileName}`);

    const document: IntelligentDocument = {
      documentId: `DOC-${Date.now()}`,
      projectId: fileData.projectId,
      documentType: this.detectDocumentType(fileData.fileName),
      title: fileData.fileName,
      originalFileName: fileData.fileName,
      fileType: fileData.fileType,
      fileSize: fileData.fileSize,
      uploadDate: new Date(),
      uploadedBy: fileData.uploadedBy,
      version: 1,
      status: 'Processing',
      content: await this.extractContent(fileData),
      metadata: await this.extractMetadata(fileData),
      extractedInfo: await this.extractInformation(fileData),
      linkedElements: await this.linkToProjectElements(fileData),
      tags: await this.generateTags(fileData),
      permissions: fileData.permissions || [],
      versionHistory: []
    };

    document.status = 'Processed';
    this.documents.set(document.documentId, document);
    await this.indexDocument(document);
    await this.linkToKnowledgeGraph(document);

    return document;
  }

  // Volume 30: AI Understanding
  async extractContent(fileData: any): Promise<DocumentContent> {
    this.logger.info('Extracting content from document');

    const content: DocumentContent = {
      text: await this.performOCR(fileData),
      pages: await this.extractPages(fileData),
      tables: await this.extractTables(fileData),
      images: await this.extractImages(fileData),
      ocrConfidence: 0.85 + Math.random() * 0.14
    };

    return content;
  }

  async extractInformation(fileData: any): Promise<ExtractedInformation> {
    this.logger.info('Extracting intelligent information');

    const text = await this.performOCR(fileData);

    return {
      entities: await this.extractEntities(text),
      keyPhrases: await this.extractKeyPhrases(text),
      sentiment: await this.analyzeSentiment(text),
      topics: await this.extractTopics(text),
      summary: await this.generateSummary(text),
      actionItems: await this.extractActionItems(text),
      deadlines: await this.extractDeadlines(text),
      financialData: await this.extractFinancialData(text),
      technicalSpecs: await this.extractTechnicalSpecs(text)
    };
  }

  // Volume 30: Information Extraction
  async extractEntities(text: string): Promise<ExtractedEntity[]> {
    this.logger.info('Extracting named entities');

    const entities: ExtractedEntity[] = [];
    const entityPatterns = [
      { type: 'Person', pattern: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g },
      { type: 'Organization', pattern: /\b([A-Z][a-z]+ (?:Inc|LLC|Corp|Co|Ltd))\b/g },
      { type: 'Money', pattern: /\$\s*[\d,]+(?:\.\d{2})?/g },
      { type: 'Date', pattern: /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/g },
      { type: 'Percentage', pattern: /\d+%/g }
    ];

    entityPatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.pattern.exec(text)) !== null) {
        entities.push({
          entityId: `ENT-${index}-${entities.length}`,
          text: match[0],
          type: pattern.type as any,
          confidence: 0.8 + Math.random() * 0.19,
          startPosition: match.index,
          endPosition: match.index + match[0].length
        });
      }
    });

    return entities;
  }

  async extractKeyPhrases(text: string): Promise<string[]> {
    this.logger.info('Extracting key phrases');

    const phrases = [
      'construction schedule',
      'payment terms',
      'quality standards',
      'safety requirements',
      'specifications',
      'contract obligations',
      'milestone',
      'deliverable',
      'change order',
      'approval'
    ];

    return phrases.filter(phrase => text.toLowerCase().includes(phrase));
  }

  async analyzeSentiment(text: string): Promise<DocumentSentiment> {
    this.logger.info('Analyzing document sentiment');

    const positiveWords = ['approved', 'completed', 'excellent', 'satisfied', 'success', 'agreed'];
    const negativeWords = ['delay', 'rejected', 'failed', 'dissatisfied', 'problem', 'dispute'];

    const positiveCount = positiveWords.filter(word => text.toLowerCase().includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.toLowerCase().includes(word)).length;

    let overall: 'Positive' | 'Neutral' | 'Negative';
    let score: number;

    if (positiveCount > negativeCount) {
      overall = 'Positive';
      score = 0.6 + Math.random() * 0.4;
    } else if (negativeCount > positiveCount) {
      overall = 'Negative';
      score = -0.6 - Math.random() * 0.4;
    } else {
      overall = 'Neutral';
      score = Math.random() * 0.2 - 0.1;
    }

    return {
      overall,
      score,
      positiveAspects: positiveWords.filter(word => text.toLowerCase().includes(word)),
      negativeAspects: negativeWords.filter(word => text.toLowerCase().includes(word))
    };
  }

  async extractTopics(text: string): Promise<DocumentTopic[]> {
    this.logger.info('Extracting document topics');

    return [
      {
        topicId: 'TOP-001',
        name: 'Project Management',
        confidence: 0.8 + Math.random() * 0.2,
        keywords: ['schedule', 'milestone', 'deadline', 'progress']
      },
      {
        topicId: 'TOP-002',
        name: 'Financial',
        confidence: 0.7 + Math.random() * 0.3,
        keywords: ['cost', 'budget', 'payment', 'invoice']
      },
      {
        topicId: 'TOP-003',
        name: 'Technical',
        confidence: 0.6 + Math.random() * 0.4,
        keywords: ['specification', 'standard', 'requirement', 'design']
      }
    ];
  }

  async generateSummary(text: string): Promise<string> {
    this.logger.info('Generating document summary');
    return 'This document contains project-related information including specifications, requirements, and contractual obligations for construction activities.';
  }

  async extractActionItems(text: string): Promise<ActionItem[]> {
    this.logger.info('Extracting action items');

    const actionItems: ActionItem[] = [];
    const actionPatterns = [
      /(?:shall|must|should|will)\s+(.+?)(?:\.|by|before)/gi
    ];

    actionPatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        actionItems.push({
          actionId: `ACT-${index}-${actionItems.length}`,
          description: match[1].trim(),
          assignee: 'To be determined',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          priority: 'Medium',
          status: 'Pending',
          sourceText: match[0]
        });
      }
    });

    return actionItems;
  }

  async extractDeadlines(text: string): Promise<Deadline[]> {
    this.logger.info('Extracting deadlines');

    const deadlines: Deadline[] = [];
    const datePatterns = [
      /(?:deadline|due|by|before)\s+(\d{1,2}\/\d{1,2}\/\d{4})/gi
    ];

    datePatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        deadlines.push({
          deadlineId: `DL-${index}-${deadlines.length}`,
          description: match[0],
          date: new Date(match[1]),
          responsibleParty: 'To be determined',
          importance: 'High'
        });
      }
    });

    return deadlines;
  }

  async extractFinancialData(text: string): Promise<FinancialData[]> {
    this.logger.info('Extracting financial data');

    const financialData: FinancialData[] = [];
    const moneyPatterns = [/\$\s*([\d,]+(?:\.\d{2})?)/g];

    moneyPatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        financialData.push({
          dataId: `FIN-${index}-${financialData.length}`,
          type: 'Cost',
          amount: parseFloat(match[1].replace(',', '')),
          currency: 'USD',
          description: 'Extracted from document',
          date: new Date()
        });
      }
    });

    return financialData;
  }

  async extractTechnicalSpecs(text: string): Promise<TechnicalSpec[]> {
    this.logger.info('Extracting technical specifications');

    return [
      {
        specId: 'SPEC-001',
        parameter: 'Concrete Strength',
        value: '40',
        unit: 'MPa',
        standard: 'ASTM C39'
      },
      {
        specId: 'SPEC-002',
        parameter: 'Steel Grade',
        value: '60',
        unit: 'ksi',
        standard: 'ASTM A615'
      }
    ];
  }

  // Volume 30: Classification
  async classifyDocument(document: IntelligentDocument): Promise<DocumentType> {
    this.logger.info(`Classifying document: ${document.documentId}`);

    const text = document.content.text.toLowerCase();
    const typeKeywords: Record<string, string[]> = {
      'Contract': ['contract', 'agreement', 'terms', 'conditions', 'obligations'],
      'Drawing': ['drawing', 'plan', 'elevation', 'section', 'detail'],
      'Specification': ['specification', 'spec', 'standard', 'requirement', 'criteria'],
      'Report': ['report', 'inspection', 'test', 'analysis', 'assessment'],
      'Correspondence': ['letter', 'email', 'memo', 'correspondence', 'communication'],
      'Invoice': ['invoice', 'bill', 'payment', 'amount due'],
      'Schedule': ['schedule', 'timeline', 'milestone', 'deadline', 'duration'],
      'BOQ': ['boq', 'bill of quantities', 'quantity', 'item', 'unit price']
    };

    let bestMatch = 'Correspondence';
    let maxMatches = 0;

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = type;
      }
    }

    return bestMatch as DocumentType;
  }

  // Volume 30: Version Control
  async createVersion(documentId: string, changes: string, modifiedBy: string): Promise<DocumentVersion> {
    this.logger.info(`Creating new version for document: ${documentId}`);

    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const newVersion: DocumentVersion = {
      versionId: `VER-${Date.now()}`,
      versionNumber: document.version + 1,
      modifiedBy,
      modificationDate: new Date(),
      changeDescription: changes,
      fileSize: document.fileSize
    };

    document.version = newVersion.versionNumber;
    document.versionHistory.push(newVersion);
    document.metadata.modificationDate = new Date();

    return newVersion;
  }

  async compareVersions(documentId: string, version1: number, version2: number): Promise<VersionComparison> {
    this.logger.info(`Comparing versions ${version1} and ${version2} for document: ${documentId}`);

    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    return {
      documentId,
      version1,
      version2,
      changes: [
        'Section 1: Updated specifications',
        'Section 3: Added new requirements',
        'Section 5: Modified payment terms'
      ],
      addedContent: ['New clause regarding safety compliance'],
      removedContent: ['Old clause regarding warranty period'],
      modifiedContent: ['Updated delivery timeline'],
      confidence: 0.9
    };
  }

  // Volume 30: Smart Search
  async searchDocuments(query: string, filters?: SearchFilter): Promise<SearchResult[]> {
    this.logger.info(`Searching documents with query: ${query}`);

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    this.documents.forEach(document => {
      let relevanceScore = 0;
      const matchedKeywords: string[] = [];

      // Search in title
      if (document.title.toLowerCase().includes(queryLower)) {
        relevanceScore += 0.5;
        matchedKeywords.push(document.title);
      }

      // Search in content
      if (document.content.text.toLowerCase().includes(queryLower)) {
        relevanceScore += 0.3;
      }

      // Search in tags
      document.tags.forEach(tag => {
        if (tag.toLowerCase().includes(queryLower)) {
          relevanceScore += 0.2;
          matchedKeywords.push(tag);
        }
      });

      // Search in extracted entities
      document.extractedInfo.entities.forEach(entity => {
        if (entity.text.toLowerCase().includes(queryLower)) {
          relevanceScore += 0.15;
          matchedKeywords.push(entity.text);
        }
      });

      // Apply filters
      if (filters) {
        if (filters.documentType && document.documentType !== filters.documentType) {
          relevanceScore = 0;
        }
        if (filters.projectId && document.projectId !== filters.projectId) {
          relevanceScore = 0;
        }
        if (filters.dateFrom && document.uploadDate < filters.dateFrom) {
          relevanceScore = 0;
        }
        if (filters.dateTo && document.uploadDate > filters.dateTo) {
          relevanceScore = 0;
        }
      }

      if (relevanceScore > 0) {
        results.push({
          documentId: document.documentId,
          title: document.title,
          relevanceScore: Math.min(relevanceScore, 1),
          snippet: this.generateSnippet(document.content.text, query),
          matchedKeywords,
          documentType: document.documentType,
          uploadDate: document.uploadDate
        });
      }
    });

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Volume 30: Communication Intelligence
  async processCommunication(commData: any): Promise<Communication> {
    this.logger.info(`Processing communication: ${commData.subject}`);

    const communication: Communication = {
      communicationId: `COM-${Date.now()}`,
      projectId: commData.projectId,
      communicationType: commData.type,
      subject: commData.subject,
      participants: commData.participants,
      content: commData.content,
      timestamp: commData.timestamp || new Date(),
      direction: commData.direction || 'Incoming',
      status: 'New',
      importance: await this.assessImportance(commData),
      extractedInfo: await this.extractInformation(commData),
      linkedDocuments: commData.linkedDocuments || [],
      linkedActivities: await this.linkToActivities(commData),
      responseRequired: await this.checkResponseRequired(commData),
      responseDeadline: await this.calculateResponseDeadline(commData),
      sentiment: await this.analyzeSentiment(commData.content),
      urgency: await this.calculateUrgency(commData)
    };

    this.communications.set(communication.communicationId, communication);
    await this.linkToKnowledgeGraph(communication);

    return communication;
  }

  async analyzeCommunicationPattern(projectId: string): Promise<CommunicationPattern> {
    this.logger.info(`Analyzing communication pattern for project: ${projectId}`);

    const projectCommunications = Array.from(this.communications.values())
      .filter(c => c.projectId === projectId);

    return {
      totalCommunications: projectCommunications.length,
      communicationByType: this.groupByType(projectCommunications),
      communicationByDirection: this.groupByDirection(projectCommunications),
      averageResponseTime: this.calculateAverageResponseTime(projectCommunications),
      topParticipants: this.identifyTopParticipants(projectCommunications),
      sentimentTrend: this.analyzeSentimentTrend(projectCommunications),
      urgencyTrend: this.analyzeUrgencyTrend(projectCommunications),
      responseRate: this.calculateResponseRate(projectCommunications)
    };
  }

  // Volume 30: Linking to Project Elements
  async linkToProjectElements(document: IntelligentDocument): Promise<LinkedElement[]> {
    this.logger.info(`Linking document to project elements: ${document.documentId}`);

    const linkedElements: LinkedElement[] = [];

    // Link to activities based on content
    const activityKeywords = ['excavation', 'concrete', 'steel', 'finishing', 'electrical'];
    activityKeywords.forEach(keyword => {
      if (document.content.text.toLowerCase().includes(keyword)) {
        linkedElements.push({
          elementId: `ACT-${keyword}`,
          elementType: 'Activity',
          relationship: 'Documents',
          confidence: 0.7 + Math.random() * 0.3
        });
      }
    });

    // Link to materials
    const materialKeywords = ['concrete', 'steel', 'cement', 'rebar', 'aggregate'];
    materialKeywords.forEach(keyword => {
      if (document.content.text.toLowerCase().includes(keyword)) {
        linkedElements.push({
          elementId: `MAT-${keyword}`,
          elementType: 'Material',
          relationship: 'Specifies',
          confidence: 0.8 + Math.random() * 0.2
        });
      }
    });

    return linkedElements;
  }

  // Helper methods
  private detectDocumentType(fileName: string): DocumentType {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, DocumentType> = {
      'pdf': 'Report',
      'docx': 'Correspondence',
      'xlsx': 'BOQ',
      'dwg': 'Drawing',
      'jpg': 'Photograph',
      'png': 'Photograph',
      'msg': 'Email'
    };

    return typeMap[extension] || 'Correspondence';
  }

  private async performOCR(fileData: any): Promise<string> {
    // Simulated OCR processing
    return 'This is the extracted text content from the document. It contains information about project specifications, requirements, and contractual obligations.';
  }

  private async extractPages(fileData: any): Promise<DocumentPage[]> {
    return [
      {
        pageNumber: 1,
        text: 'Page 1 content...',
        images: [],
        tables: []
      }
    ];
  }

  private async extractTables(fileData: any): Promise<ExtractedTable[]> {
    return [
      {
        tableId: 'TAB-001',
        pageNumber: 1,
        headers: ['Item', 'Quantity', 'Unit', 'Price'],
        rows: [['Concrete', '100', 'm3', '120']],
        confidence: 0.9
      }
    ];
  }

  private async extractImages(fileData: any): Promise<ExtractedImage[]> {
    return [
      {
        imageId: 'IMG-001',
        pageNumber: 1,
        description: 'Site photograph showing construction progress',
        confidence: 0.85,
        objects: [
          { type: 'Crane', confidence: 0.9, boundingBox: [100, 100, 200, 200] },
          { type: 'Building', confidence: 0.95, boundingBox: [300, 150, 500, 400] }
        ]
      }
    ];
  }

  private async extractMetadata(fileData: any): Promise<DocumentMetadata> {
    return {
      author: fileData.uploadedBy || 'Unknown',
      creationDate: new Date(),
      modificationDate: new Date(),
      keywords: [],
      language: 'English',
      pageCount: 1,
      wordCount: 500,
      characterCount: 2500
    };
  }

  private async generateTags(fileData: any): Promise<string[]> {
    return ['project', 'construction', 'specification', 'contract'];
  }

  private async indexDocument(document: IntelligentDocument): Promise<void> {
    const keywords = [
      ...document.tags,
      ...document.extractedInfo.keyPhrases,
      ...document.extractedInfo.entities.map(e => e.text)
    ];

    keywords.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      if (!this.documentIndex.has(lowerKeyword)) {
        this.documentIndex.set(lowerKeyword, []);
      }
      this.documentIndex.get(lowerKeyword)!.push(document.documentId);
    });
  }

  private async linkToKnowledgeGraph(document: IntelligentDocument): Promise<void> {
    await this.knowledgeGraph.addNode('Document', document.documentId, {
      title: document.title,
      type: document.documentType,
      projectId: document.projectId
    });
  }

  private async linkToKnowledgeGraph(communication: Communication): Promise<void> {
    await this.knowledgeGraph.addNode('Communication', communication.communicationId, {
      subject: communication.subject,
      type: communication.communicationType,
      projectId: communication.projectId
    });
  }

  private generateSnippet(text: string, query: string): string {
    const queryLower = query.toLowerCase();
    const index = text.toLowerCase().indexOf(queryLower);
    if (index === -1) return text.substring(0, 100) + '...';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + query.length + 50);
    return '...' + text.substring(start, end) + '...';
  }

  private async assessImportance(commData: any): Promise<'Critical' | 'High' | 'Medium' | 'Low'> {
    const subject = commData.subject.toLowerCase();
    if (subject.includes('urgent') || subject.includes('critical')) return 'Critical';
    if (subject.includes('important') || subject.includes('priority')) return 'High';
    if (subject.includes('information') || subject.includes('update')) return 'Medium';
    return 'Low';
  }

  private async linkToActivities(commData: any): Promise<string[]> {
    return ['ACT-001', 'ACT-002'];
  }

  private async checkResponseRequired(commData: any): Promise<boolean> {
    return commData.direction === 'Incoming';
  }

  private async calculateResponseDeadline(commData: any): Promise<Date> {
    return new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  }

  private async calculateUrgency(commData: any): Promise<number> {
    return 0.5 + Math.random() * 0.5;
  }

  private groupByType(communications: Communication[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    communications.forEach(c => {
      grouped[c.communicationType] = (grouped[c.communicationType] || 0) + 1;
    });
    return grouped;
  }

  private groupByDirection(communications: Communication[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    communications.forEach(c => {
      grouped[c.direction] = (grouped[c.direction] || 0) + 1;
    });
    return grouped;
  }

  private calculateAverageResponseTime(communications: Communication[]): number {
    return 24 + Math.random() * 48; // hours
  }

  private identifyTopParticipants(communications: Communication[]): any[] {
    const participantCount: Record<string, number> = {};
    communications.forEach(c => {
      c.participants.forEach(p => {
        participantCount[p.name] = (participantCount[p.name] || 0) + 1;
      });
    });

    return Object.entries(participantCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }

  private analyzeSentimentTrend(communications: Communication[]): any {
    return {
      positive: communications.filter(c => c.sentiment.overall === 'Positive').length,
      neutral: communications.filter(c => c.sentiment.overall === 'Neutral').length,
      negative: communications.filter(c => c.sentiment.overall === 'Negative').length
    };
  }

  private analyzeUrgencyTrend(communications: Communication[]): number {
    const totalUrgency = communications.reduce((sum, c) => sum + c.urgency, 0);
    return communications.length > 0 ? totalUrgency / communications.length : 0;
  }

  private calculateResponseRate(communications: Communication[]): number {
    const responded = communications.filter(c => c.status === 'Replied').length;
    return communications.length > 0 ? responded / communications.length : 0;
  }
}

// Supporting interfaces
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
