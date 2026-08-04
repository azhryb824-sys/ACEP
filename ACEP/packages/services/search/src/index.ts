import { v4 as uuidv4 } from 'uuid';
import { ProjectType, ExecutionStatus } from '@acep/core';

type SearchDocumentType = 'project' | 'boq_item' | 'material' | 'user';

interface SearchDocument {
  id: string;
  type: SearchDocumentType;
  title: string;
  content: string;
  projectId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface IndexableProject {
  id: string;
  name: string;
  description: string;
  projectType: ProjectType;
  status: string;
  clientName?: string;
  location?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface IndexableBOQItem {
  id: string;
  code: string;
  description: string;
  category: string;
  unit: string;
  projectId: string;
}

interface IndexableMaterial {
  id: string;
  name: string;
  category: string;
  description?: string;
  unit?: string;
}

interface SearchQuery {
  keyword: string;
  type?: SearchDocumentType;
  projectType?: ProjectType;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

interface SearchResult {
  document: SearchDocument;
  score: number;
  highlights: string[];
}

interface PaginatedSearchResults {
  items: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  queryTimeMs: number;
}

interface ISearchIndex {
  index(doc: SearchDocument): Promise<void>;
  search(query: SearchQuery): Promise<PaginatedSearchResults>;
  remove(id: string): Promise<boolean>;
  clear(): Promise<void>;
}

class InMemorySearchIndex implements ISearchIndex {
  private documents: Map<string, SearchDocument> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();

  async index(doc: SearchDocument): Promise<void> {
    this.documents.set(doc.id, doc);
    const terms = this.tokenize(`${doc.title} ${doc.content} ${JSON.stringify(doc.metadata)}`);

    for (const term of terms) {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, new Set());
      }
      this.invertedIndex.get(term)!.add(doc.id);
    }
  }

  async search(query: SearchQuery): Promise<PaginatedSearchResults> {
    const startTime = Date.now();
    const keywords = this.tokenize(query.keyword);

    if (keywords.length === 0) {
      return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0, queryTimeMs: 0 };
    }

    let docIds: Set<string> | null = null;

    for (const keyword of keywords) {
      const matching = this.invertedIndex.get(keyword) || new Set();
      if (docIds === null) {
        docIds = new Set(matching);
      } else {
        docIds = new Set([...docIds].filter(x => matching.has(x)));
      }
    }

    if (!docIds) {
      return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0, queryTimeMs: Date.now() - startTime };
    }

    let results: SearchResult[] = [];

    for (const docId of docIds) {
      const doc = this.documents.get(docId);
      if (!doc) continue;

      if (query.type && doc.type !== query.type) continue;
      if (query.projectType && doc.metadata?.projectType !== query.projectType) continue;
      if (query.status && doc.metadata?.status !== query.status) continue;
      if (query.startDate && new Date(doc.createdAt) < new Date(query.startDate)) continue;
      if (query.endDate && new Date(doc.createdAt) > new Date(query.endDate)) continue;

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

  async remove(id: string): Promise<boolean> {
    const doc = this.documents.get(id);
    if (!doc) return false;

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

  async clear(): Promise<void> {
    this.documents.clear();
    this.invertedIndex.clear();
  }

  getStats(): { totalDocuments: number; totalTerms: number } {
    return {
      totalDocuments: this.documents.size,
      totalTerms: this.invertedIndex.size,
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s\u0600-\u06FF]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  private computeScore(doc: SearchDocument, keywords: string[]): number {
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

  private generateHighlights(doc: SearchDocument, keywords: string[]): string[] {
    const highlights: string[] = [];
    const text = `${doc.title} ${doc.content}`;

    for (const keyword of keywords) {
      const regex = new RegExp(`.{0,40}${keyword}.{0,40}`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        highlights.push(`...${match[0]}...`);
        if (highlights.length >= 5) break;
      }
      if (highlights.length >= 5) break;
    }

    return highlights.slice(0, 5);
  }
}

class SearchService {
  private index: InMemorySearchIndex;

  constructor() {
    this.index = new InMemorySearchIndex();
  }

  async indexProject(project: IndexableProject): Promise<void> {
    const doc: SearchDocument = {
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

  async indexBOQItem(item: IndexableBOQItem): Promise<void> {
    const doc: SearchDocument = {
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

  async indexMaterial(material: IndexableMaterial): Promise<void> {
    const doc: SearchDocument = {
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

  async search(query: SearchQuery): Promise<PaginatedSearchResults> {
    return this.index.search(query);
  }

  async remove(id: string): Promise<boolean> {
    return this.index.remove(id);
  }

  getStats(): { totalDocuments: number; totalTerms: number } {
    return this.index.getStats();
  }
}

class SearchApp {
  private service: SearchService;

  constructor() {
    this.service = new SearchService();
  }

  async handleRequest(action: string, payload: unknown): Promise<unknown> {
    switch (action) {
      case 'search':
        return this.service.search(payload as SearchQuery);
      case 'indexProject':
        await this.service.indexProject(payload as IndexableProject);
        return { indexed: true };
      case 'indexBOQItem':
        await this.service.indexBOQItem(payload as IndexableBOQItem);
        return { indexed: true };
      case 'indexMaterial':
        await this.service.indexMaterial(payload as IndexableMaterial);
        return { indexed: true };
      case 'remove':
        return this.service.remove(payload as string);
      case 'stats':
        return this.service.getStats();
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

function main(): void {
  const app = new SearchApp();
  console.log('[Search Service] Initialized');
  console.log('[Search Service] In-memory full-text search index ready');
}

if (require.main === module) {
  main();
}

export {
  SearchService, SearchApp, InMemorySearchIndex, ISearchIndex,
  SearchDocument, SearchDocumentType, SearchQuery, SearchResult, PaginatedSearchResults,
  IndexableProject, IndexableBOQItem, IndexableMaterial,
};
