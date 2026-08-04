"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentAnalyzer = exports.DocumentAnalyzerService = void 0;
const axios_1 = __importDefault(require("axios"));
class DocumentAnalyzerService {
    config = { baseUrl: 'http://localhost:3000', timeout: 30000 };
    initialized = false;
    async initialize(config) {
        if (config)
            this.config = { ...this.config, ...config };
        if (!this.config.baseUrl) {
            this.config.baseUrl = process.env.ACEP_ANALYSIS_URL || 'http://localhost:3000';
        }
        this.initialized = true;
    }
    async analyzeDocument(text, title) {
        this.ensureInitialized();
        try {
            const r = await axios_1.default.post(`${this.config.baseUrl}/api/v1/analyze`, {
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
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[DocAnalyzer] API failed (${msg}), returning text-based analysis`);
            return this._localAnalysis(text, title);
        }
    }
    async extractSpecifications(text) {
        this.ensureInitialized();
        const specs = [];
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
    async extractContractTerms(text) {
        this.ensureInitialized();
        const terms = [
            { clause: '2.1', description: 'Scope of Work', risk: 'medium' },
            { clause: '4.3', description: 'Payment Terms', risk: 'high' },
            { clause: '7.2', description: 'Variation Orders', risk: 'medium' },
        ];
        return terms;
    }
    isInitialized() { return this.initialized; }
    _localAnalysis(text, title) {
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
    ensureInitialized() {
        if (!this.initialized)
            throw new Error('DocumentAnalyzerService not initialized. Call initialize() first.');
    }
}
exports.DocumentAnalyzerService = DocumentAnalyzerService;
exports.documentAnalyzer = new DocumentAnalyzerService();
//# sourceMappingURL=index.js.map