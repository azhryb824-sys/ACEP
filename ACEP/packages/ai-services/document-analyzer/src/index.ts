import axios from 'axios';

export interface DocumentSection {
  title: string;
  content: string;
  page: number;
}

export interface Specification {
  code: string;
  title: string;
  description: string;
  unit: string;
}

export interface ContractTerm {
  clause: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

export interface DocumentAnalysis {
  title: string;
  pages: number;
  language: string;
  sections: DocumentSection[];
  projectType?: string;
  summary: string;
}

export interface DocumentConfig {
  baseUrl: string;
  timeout: number;
}

export class DocumentAnalyzerService {
  private config: DocumentConfig = { baseUrl: 'http://localhost:3000', timeout: 30000 };
  private initialized = false;

  async initialize(config?: Partial<DocumentConfig>): Promise<void> {
    if (config) this.config = { ...this.config, ...config };
    if (!this.config.baseUrl) {
      this.config.baseUrl = process.env.ACEP_ANALYSIS_URL || 'http://localhost:3000';
    }
    this.initialized = true;
  }

  async analyzeDocument(text: string, title?: string): Promise<DocumentAnalysis> {
    this.ensureInitialized();
    try {
      const r = await axios.post(`${this.config.baseUrl}/api/v1/analyze`, {
        description: text.slice(0, 2000),
      }, { timeout: this.config.timeout });

      const data = r.data;
      return {
        title: title || 'Document Analysis',
        pages: Math.ceil(text.length / 2000) || 1,
        language: 'ar',
        sections: [
          { title: 'Project Type', content: data.projectType || data.type || 'Unknown', page: 1 },
          { title: 'Scope', content: data.scope || data.description || text.slice(0, 200), page: 1 },
        ],
        projectType: data.projectType || data.type,
        summary: data.summary || data.description || `Analyzed ${text.length} characters`,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[DocAnalyzer] API failed (${msg}), returning text-based analysis`);
      return this._localAnalysis(text, title);
    }
  }

  async extractSpecifications(text: string): Promise<Specification[]> {
    this.ensureInitialized();
    const specs: Specification[] = [];
    const specPatterns = [
      { code: 'CON-001', title: 'Concrete', unit: 'm³', keyword: 'خرسانة' },
      { code: 'STL-001', title: 'Steel Reinforcement', unit: 'ton', keyword: 'حديد' },
      { code: 'BLK-001', title: 'Concrete Blocks', unit: 'm²', keyword: 'بلوك' },
      { code: 'TLE-001', title: 'Tiles', unit: 'm²', keyword: 'بلاط' },
      { code: 'PNT-001', title: 'Paint', unit: 'm²', keyword: 'دهان' },
      { code: 'PLB-001', title: 'Plumbing', unit: 'point', keyword: 'سباكة' },
      { code: 'ELC-001', title: 'Electrical', unit: 'point', keyword: 'كهرباء' },
    ];
    for (const sp of specPatterns) {
      if (text.includes(sp.keyword)) {
        specs.push({ code: sp.code, title: sp.title, description: `${sp.title} works as per project specifications`, unit: sp.unit });
      }
    }
    return specs.length > 0 ? specs : [
      { code: 'GEN-001', title: 'General Construction', description: 'General construction works', unit: 'l.s.' },
    ];
  }

  async extractContractTerms(text: string): Promise<ContractTerm[]> {
    this.ensureInitialized();
    const terms = [
      { clause: '2.1', description: 'Scope of Work', risk: 'medium' as const },
      { clause: '4.3', description: 'Payment Terms', risk: 'high' as const },
      { clause: '7.2', description: 'Variation Orders', risk: 'medium' as const },
    ];
    return terms;
  }

  isInitialized(): boolean { return this.initialized; }

  private _localAnalysis(text: string, title?: string): DocumentAnalysis {
    return {
      title: title || 'Local Analysis',
      pages: Math.max(1, Math.ceil(text.length / 3000)),
      language: text.match(/[\u0600-\u06FF]/) ? 'ar' : 'en',
      sections: [
        { title: 'Full Text', content: text.slice(0, 500), page: 1 },
      ],
      summary: `${text.length} characters analyzed locally (server unavailable)`,
    };
  }

  private ensureInitialized(): void {
    if (!this.initialized) throw new Error('DocumentAnalyzerService not initialized. Call initialize() first.');
  }
}

export const documentAnalyzer = new DocumentAnalyzerService();
