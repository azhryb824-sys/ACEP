import { ProjectType } from '@acep/core';
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
declare class InMemorySearchIndex implements ISearchIndex {
    private documents;
    private invertedIndex;
    index(doc: SearchDocument): Promise<void>;
    search(query: SearchQuery): Promise<PaginatedSearchResults>;
    remove(id: string): Promise<boolean>;
    clear(): Promise<void>;
    getStats(): {
        totalDocuments: number;
        totalTerms: number;
    };
    private tokenize;
    private computeScore;
    private generateHighlights;
}
declare class SearchService {
    private index;
    constructor();
    indexProject(project: IndexableProject): Promise<void>;
    indexBOQItem(item: IndexableBOQItem): Promise<void>;
    indexMaterial(material: IndexableMaterial): Promise<void>;
    search(query: SearchQuery): Promise<PaginatedSearchResults>;
    remove(id: string): Promise<boolean>;
    getStats(): {
        totalDocuments: number;
        totalTerms: number;
    };
}
declare class SearchApp {
    private service;
    constructor();
    handleRequest(action: string, payload: unknown): Promise<unknown>;
}
export { SearchService, SearchApp, InMemorySearchIndex, ISearchIndex, SearchDocument, SearchDocumentType, SearchQuery, SearchResult, PaginatedSearchResults, IndexableProject, IndexableBOQItem, IndexableMaterial, };
//# sourceMappingURL=index.d.ts.map