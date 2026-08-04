export interface ExtractedText {
  fullText: string;
  paragraphs: string[];
  confidence: number;
  language: string;
  processedAt: string;
}

export interface BOQEntry {
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  confidence: number;
}

export interface ParsedBOQ {
  projectName: string;
  entries: BOQEntry[];
  totalAmount: number;
  currency: string;
  confidence: number;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  confidence: number;
}

export class OCRService {
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async extractText(image: Buffer | string): Promise<ExtractedText> {
    return {
      fullText: typeof image === 'string' ? image : '[OCR extracted text from image]',
      paragraphs: ['Sample paragraph 1', 'Sample paragraph 2'],
      confidence: 0.85,
      language: 'ar',
      processedAt: new Date().toISOString()
    };
  }

  async parseBOQ(document: Buffer | string): Promise<ParsedBOQ> {
    return {
      projectName: 'Extracted Project',
      entries: [
        { code: 'CON-001', description: 'Ready Mix Concrete', unit: 'm³', quantity: 100, unitPrice: 280, totalPrice: 28000, confidence: 0.8 }
      ],
      totalAmount: 28000,
      currency: 'SAR',
      confidence: 0.75
    };
  }

  async detectTables(image: Buffer | string): Promise<TableData[]> {
    return [
      {
        headers: ['Item', 'Quantity', 'Unit', 'Unit Price'],
        rows: [['CON-001', '100', 'm³', '280']],
        confidence: 0.7
      }
    ];
  }

  isInitialized(): boolean { return this.initialized; }
}
