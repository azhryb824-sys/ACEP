"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySearchIndex = exports.SearchApp = exports.SearchService = void 0;
class InMemorySearchIndex {
    documents = new Map();
    invertedIndex = new Map();
    async index(doc) {
        this.documents.set(doc.id, doc);
        const terms = this.tokenize(`${doc.title} ${doc.content} ${JSON.stringify(doc.metadata)}`);
        for (const term of terms) {
            if (!this.invertedIndex.has(term)) {
                this.invertedIndex.set(term, new Set());
            }
            this.invertedIndex.get(term).add(doc.id);
        }
    }
    async search(query) {
        const startTime = Date.now();
        const keywords = this.tokenize(query.keyword);
        if (keywords.length === 0) {
            return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0, queryTimeMs: 0 };
        }
        let docIds = null;
        for (const keyword of keywords) {
            const matching = this.invertedIndex.get(keyword) || new Set();
            if (docIds === null) {
                docIds = new Set(matching);
            }
            else {
                docIds = new Set([...docIds].filter(x => matching.has(x)));
            }
        }
        if (!docIds) {
            return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0, queryTimeMs: Date.now() - startTime };
        }
        let results = [];
        for (const docId of docIds) {
            const doc = this.documents.get(docId);
            if (!doc)
                continue;
            if (query.type && doc.type !== query.type)
                continue;
            if (query.projectType && doc.metadata?.projectType !== query.projectType)
                continue;
            if (query.status && doc.metadata?.status !== query.status)
                continue;
            if (query.startDate && new Date(doc.createdAt) < new Date(query.startDate))
                continue;
            if (query.endDate && new Date(doc.createdAt) > new Date(query.endDate))
                continue;
            const score = this.computeScore(doc, keywords);
            const highlights = this.generateHighlights(doc, keywords);
            results.push({ document: doc, score, highlights });
        }
        results.sort((a, b) => b.score - a.score);
        const page = query.page || 1;
        const pageSize = query.pageSize || 20;
        const total = results.length;
        const totalPages = Math.ceil(total / pageSize);
        const start = (page - 1) * pageSize;
        const paged = results.slice(start, start + pageSize);
        return {
            items: paged,
            total,
            page,
            pageSize,
            totalPages,
            queryTimeMs: Date.now() - startTime,
        };
    }
    async remove(id) {
        const doc = this.documents.get(id);
        if (!doc)
            return false;
        const terms = this.tokenize(`${doc.title} ${doc.content}`);
        for (const term of terms) {
            const ids = this.invertedIndex.get(term);
            if (ids) {
                ids.delete(id);
                if (ids.size === 0) {
                    this.invertedIndex.delete(term);
                }
            }
        }
        return this.documents.delete(id);
    }
    async clear() {
        this.documents.clear();
        this.invertedIndex.clear();
    }
    getStats() {
        return {
            totalDocuments: this.documents.size,
            totalTerms: this.invertedIndex.size,
        };
    }
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s\u0600-\u06FF]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 1);
    }
    computeScore(doc, keywords) {
        const text = `${doc.title} ${doc.content}`.toLowerCase();
        let score = 0;
        for (const keyword of keywords) {
            const regex = new RegExp(keyword, 'gi');
            const matches = text.match(regex);
            if (matches) {
                score += matches.length * 10;
            }
            if (doc.title.toLowerCase().includes(keyword)) {
                score += 20;
            }
        }
        return score;
    }
    generateHighlights(doc, keywords) {
        const highlights = [];
        const text = `${doc.title} ${doc.content}`;
        for (const keyword of keywords) {
            const regex = new RegExp(`.{0,40}${keyword}.{0,40}`, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                highlights.push(`...${match[0]}...`);
                if (highlights.length >= 5)
                    break;
            }
            if (highlights.length >= 5)
                break;
        }
        return highlights.slice(0, 5);
    }
}
exports.InMemorySearchIndex = InMemorySearchIndex;
class SearchService {
    index;
    constructor() {
        this.index = new InMemorySearchIndex();
    }
    async indexProject(project) {
        const doc = {
            id: project.id,
            type: 'project',
            title: project.name,
            content: `${project.description} ${project.clientName || ''} ${project.location || ''} ${project.tags.join(' ')}`,
            projectId: project.id,
            metadata: {
                projectType: project.projectType,
                status: project.status,
                clientName: project.clientName,
                location: project.location,
                tags: project.tags,
            },
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
        await this.index.index(doc);
    }
    async indexBOQItem(item) {
        const doc = {
            id: item.id,
            type: 'boq_item',
            title: `${item.code} - ${item.description}`,
            content: `${item.description} ${item.category} ${item.unit}`,
            projectId: item.projectId,
            metadata: { code: item.code, category: item.category, unit: item.unit },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await this.index.index(doc);
    }
    async indexMaterial(material) {
        const doc = {
            id: material.id,
            type: 'material',
            title: material.name,
            content: `${material.name} ${material.category} ${material.description || ''} ${material.unit || ''}`,
            metadata: { category: material.category, unit: material.unit },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await this.index.index(doc);
    }
    async search(query) {
        return this.index.search(query);
    }
    async remove(id) {
        return this.index.remove(id);
    }
    getStats() {
        return this.index.getStats();
    }
}
exports.SearchService = SearchService;
class SearchApp {
    service;
    constructor() {
        this.service = new SearchService();
    }
    async handleRequest(action, payload) {
        switch (action) {
            case 'search':
                return this.service.search(payload);
            case 'indexProject':
                await this.service.indexProject(payload);
                return { indexed: true };
            case 'indexBOQItem':
                await this.service.indexBOQItem(payload);
                return { indexed: true };
            case 'indexMaterial':
                await this.service.indexMaterial(payload);
                return { indexed: true };
            case 'remove':
                return this.service.remove(payload);
            case 'stats':
                return this.service.getStats();
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
}
exports.SearchApp = SearchApp;
function main() {
    const app = new SearchApp();
    console.log('[Search Service] Initialized');
    console.log('[Search Service] In-memory full-text search index ready');
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map