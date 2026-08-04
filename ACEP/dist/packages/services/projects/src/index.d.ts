import { ProjectType, ExecutionStatus } from '@acep/core';
type ProjectStatus = 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Archived';
interface ProjectVersion {
    number: number;
    status: ExecutionStatus;
    data: Record<string, unknown>;
    createdAt: string;
    createdBy: string;
}
interface Project {
    id: string;
    name: string;
    description: string;
    projectType: ProjectType;
    status: ProjectStatus;
    executionStatus: ExecutionStatus;
    clientName?: string;
    location?: string;
    budget?: number;
    currency: string;
    area?: number;
    floors?: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    versions: ProjectVersion[];
    metadata: Record<string, unknown>;
}
interface CreateProjectRequest {
    name: string;
    description: string;
    projectType: ProjectType;
    clientName?: string;
    location?: string;
    budget?: number;
    currency?: string;
    area?: number;
    floors?: number;
    createdBy: string;
    tags?: string[];
}
interface UpdateProjectRequest {
    name?: string;
    description?: string;
    projectType?: ProjectType;
    status?: ProjectStatus;
    clientName?: string;
    location?: string;
    budget?: number;
    area?: number;
    floors?: number;
    tags?: string[];
    metadata?: Record<string, unknown>;
}
interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
declare class ProjectService {
    private projects;
    create(request: CreateProjectRequest): Project;
    getById(id: string): Project | null;
    list(page?: number, pageSize?: number, filter?: {
        status?: ProjectStatus;
        projectType?: ProjectType;
        search?: string;
    }): PaginatedResult<Project>;
    update(id: string, request: UpdateProjectRequest): Project | null;
    delete(id: string): boolean;
    updateExecutionStatus(projectId: string, status: ExecutionStatus, updatedBy: string): Project | null;
    getProjectVersions(projectId: string): ProjectVersion[];
}
declare class ProjectApp {
    private service;
    constructor();
    handleRequest(action: string, payload: unknown): Promise<unknown>;
}
export { ProjectService, ProjectApp, Project, ProjectVersion, CreateProjectRequest, UpdateProjectRequest, ProjectStatus, PaginatedResult };
//# sourceMappingURL=index.d.ts.map