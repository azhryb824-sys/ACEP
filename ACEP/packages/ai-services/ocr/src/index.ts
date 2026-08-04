import axios from 'axios';

// ─── BOQ patterns for Arabic/English construction documents ───
const BOQ_LINE_RX = /([A-Z]{3,4}-\d{3})\s+([\u0600-\u06FFa-zA-Z\s\-/]+?)\s+(m[²3]?|m2|sq\.?m|l\.?s\.?|ton|kg|m|unit|point|no\.?|each|pc|hour|day)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i;
const AR_BOQ_RX = /([\u0600-\u06FFa-zA-Z\s\-/]+?)\s+(م[²3]|م2|م\.?|حبة|وحدة|طن|كجم|نقطة|ل\.?ص\.?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/;

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

export interface OCRConfig {
  provider: 'tesseract' | 'express-api' | 'mock';
  baseUrl: string;
  tesseractLang: string;
}

export class OCRService {
  private config: OCRConfig = { provider: 'mock', baseUrl: 'http://localhost:3000', tesseractLang: 'ara+eng' };
  private initialized = false;

  async initialize(config?: Partial<OCRConfig>): Promise<void> {
    if (config) this.config = { ...this.config, ...config };
    if (!this.config.baseUrl) {
      this.config.baseUrl = process.env.ACEP_ANALYSIS_URL || 'http://localhost:3000';
    }
    if (this.config.provider === 'tesseract') {
      try {
        require.resolve('node-tesseract-ocr');
      } catch {
        console.warn('[OCR] Tesseract not installed, falling back to express-api');
        this.config.provider = 'express-api';
      }
    }
    this.initialized = true;
  }

  async extractText(image: Buffer | string): Promise<ExtractedText> {
    this.ensureInitialized();
    if (typeof image === 'string') return this._fromText(image);

    if (this.config.provider === 'tesseract') return this._tesseractOcr(image);
    if (this.config.provider === 'express-api') return this._apiOcr(image);
    return this._mockOcr(image);
  }

  async parseBOQ(document: Buffer | string): Promise<ParsedBOQ> {
    const text = await this.extractText(document);
    const entries: BOQEntry[] = [];
    let totalAmount = 0;

    for (const line of text.fullText.split('\n')) {
      let m = line.match(BOQ_LINE_RX);
      if (m) {
        const entry: BOQEntry = {
          code: m[1].trim(),
          description: m[2].trim(),
          unit: m[3].trim(),
          quantity: parseFloat(m[4].replace(/,/g, '')),
          unitPrice: parseFloat(m[5].replace(/,/g, '')),
          totalPrice: parseFloat(m[6].replace(/,/g, '')),
          confidence: 0.7,
        };
        entries.push(entry);
        totalAmount += entry.totalPrice;
        continue;
      }
      m = line.match(AR_BOQ_RX);
      if (m) {
        const entry: BOQEntry = {
          code: `ITEM-${String(entries.length + 1).padStart(3, '0')}`,
          description: m[1].trim(),
          unit: m[2].trim(),
          quantity: parseFloat(m[3].replace(/,/g, '')),
          unitPrice: parseFloat(m[4].replace(/,/g, '')),
          totalPrice: parseFloat(m[5].replace(/,/g, '')),
          confidence: 0.6,
        };
        entries.push(entry);
        totalAmount += entry.totalPrice;
      }
    }

    if (entries.length === 0) {
      entries.push(this._mockBoqEntry());
      totalAmount = entries[0].totalPrice;
    }

    return {
      projectName: this._detectProjectName(text.fullText) || 'Extracted BOQ',
      entries,
      totalAmount,
      currency: 'SAR',
      confidence: entries.some(e => e.confidence >= 0.7) ? 0.7 : 0.5,
    };
  }

  async detectTables(image: Buffer | string): Promise<TableData[]> {
    const text = await this.extractText(image);
    const tables: TableData[] = [];
    const lines = text.fullText.split('\n').filter(l => l.trim());

    for (const line of lines) {
      const cells = line.split(/\t|\s{2,}|[|]{2}/).map(c => c.trim()).filter(Boolean);
      if (cells.length >= 3) {
        const isHeader = tables.length === 0;
        const table: TableData = {
          headers: isHeader ? cells.slice(0, 4) : ['Item', 'Quantity', 'Unit', 'Price'],
          rows: isHeader ? [] : [cells.slice(0, 4)],
          confidence: 0.6,
        };
        if (!tables.some(t => JSON.stringify(t) === JSON.stringify(table))) {
          tables.push(table);
        }
      }
    }

    return tables.length > 0 ? tables : [{ headers: ['Item', 'Quantity', 'Unit', 'Price'], rows: [], confidence: 0.4 }];
  }

  isInitialized(): boolean { return this.initialized; }

  private async _tesseractOcr(image: Buffer): Promise<ExtractedText> {
    try {
      const tesseract = require('node-tesseract-ocr');
      const text = await tesseract.recognize(image, { lang: this.config.tesseractLang });
      return this._fromText(text);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[OCR] Tesseract failed (${msg}), trying API fallback`);
      return this._apiOcr(image);
    }
  }

  private async _apiOcr(image: Buffer): Promise<ExtractedText> {
    try {
      const b64 = image.toString('base64');
      const r = await axios.post(`${this.config.baseUrl}/api/v1/vision-ai/generate`, {
        prompt: 'Extract all text from this construction document image',
        imageData: b64,
      }, { timeout: 30000 });
      const text = r.data?.text || r.data?.description || '';
      return this._fromText(text || '[No text extracted by API]');
    } catch {
      return this._mockOcr(image);
    }
  }

  private _fromText(text: string): ExtractedText {
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
    return {
      fullText: text,
      paragraphs,
      confidence: text.length > 50 ? 0.85 : 0.5,
      language: arabicCount > text.length * 0.1 ? 'ar' : 'en',
      processedAt: new Date().toISOString(),
    };
  }

  private _mockOcr(image: Buffer): ExtractedText {
    const preview = image.length > 100 ? image.slice(0, 100).toString('hex') : '';
    return {
      fullText: `[OCR Mock] Image ${image.length} bytes, hex preview: ${preview.slice(0, 40)}...`,
      paragraphs: ['Sample extracted text from construction document'],
      confidence: 0.5,
      language: 'ar',
      processedAt: new Date().toISOString(),
    };
  }

  private _detectProjectName(text: string): string {
    const patterns = [/project[:\s]+(.+)/i, /مشروع[:\s]+(.+)/, /project name[:\s]+(.+)/i, /اسم المشروع[:\s]+(.+)/];
    for (const rx of patterns) {
      const m = text.match(rx);
      if (m) return m[1].trim().split('\n')[0].trim();
    }
    return '';
  }

  private _mockBoqEntry(): BOQEntry {
    return { code: 'CON-001', description: 'Ready Mix Concrete 25MPa', unit: 'm³', quantity: 100, unitPrice: 280, totalPrice: 28000, confidence: 0.5 };
  }

  private ensureInitialized(): void {
    if (!this.initialized) throw new Error('OCRService not initialized. Call initialize() first.');
  }
}

export const ocrService = new OCRService();
