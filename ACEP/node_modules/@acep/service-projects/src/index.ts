import { v4 as uuidv4 } from 'uuid';
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

class ProjectService {
  private projects: Map<string, Project> = new Map();

  create(request: CreateProjectRequest): Project {
    if (!request.name || !request.description || !request.projectType || !request.createdBy) {
      throw new Error('name, description, projectType, and createdBy are required');
    }

    const now = new Date().toISOString();
    const project: Project = {
      id: uuidv4(),
      name: request.name,
      description: request.description,
      projectType: request.projectType,
      status: 'Draft',
      executionStatus: ExecutionStatus.Draft,
      clientName: request.clientName,
      location: request.location,
      budget: request.budget,
      currency: request.currency || 'SAR',
      area: request.area,
      floors: request.floors,
      createdBy: request.createdBy,
      createdAt: now,
      updatedAt: now,
      tags: request.tags || [],
      versions: [
        {
          number: 1,
          status: ExecutionStatus.Draft,
          data: { name: request.name, description: request.description },
          createdAt: now,
          createdBy: request.createdBy,
        },
      ],
      metadata: {},
    };

    this.projects.set(project.id, project);
    return project;
  }

  getById(id: string): Project | null {
    return this.projects.get(id) || null;
  }

  list(page = 1, pageSize = 20, filter?: { status?: ProjectStatus; projectType?: ProjectType; search?: string }): PaginatedResult<Project> {
    let items = Array.from(this.projects.values());

    if (filter?.status) items = items.filter(p => p.status === filter.status);
    if (filter?.projectType) items = items.filter(p => p.projectType === filter.projectType);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }

    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return { items: paged, total, page, pageSize, totalPages };
  }

  update(id: string, request: UpdateProjectRequest): Project | null {
    const project = this.projects.get(id);
    if (!project) return null;

    if (request.name !== undefined) project.name = request.name;
    if (request.description !== undefined) project.description = request.description;
    if (request.projectType !== undefined) project.projectType = request.projectType;
    if (request.status !== undefined) project.status = request.status;
    if (request.clientName !== undefined) project.clientName = request.clientName;
    if (request.location !== undefined) project.location = request.location;
    if (request.budget !== undefined) project.budget = request.budget;
    if (request.area !== undefined) project.area = request.area;
    if (request.floors !== undefined) project.floors = request.floors;
    if (request.tags !== undefined) project.tags = request.tags;
    if (request.metadata !== undefined) project.metadata = { ...project.metadata, ...request.metadata };

    project.updatedAt = new Date().toISOString();
    return project;
  }

  delete(id: string): boolean {
    return this.projects.delete(id);
  }

  updateExecutionStatus(projectId: string, status: ExecutionStatus, updatedBy: string): Project | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    project.executionStatus = status;
    project.updatedAt = new Date().toISOString();

    const lastVersion = project.versions[project.versions.length - 1];
    const versionNumber = lastVersion ? lastVersion.number + 1 : 1;

    project.versions.push({
      number: versionNumber,
      status,
      data: { status: project.status, executionStatus: status },
      createdAt: new Date().toISOString(),
      createdBy: updatedBy,
    });

    return project;
  }

  getProjectVersions(projectId: string): ProjectVersion[] {
    const project = this.projects.get(projectId);
    return project ? project.versions : [];
  }
}

class ProjectApp {
  private service: ProjectService;

  constructor() {
    this.service = new ProjectService();
  }

  async handleRequest(action: string, payload: unknown): Promise<unknown> {
    switch (action) {
      case 'create':
        return this.service.create(payload as CreateProjectRequest);
      case 'getById':
        return this.service.getById(payload as string);
      case 'list':
        return this.service.list(
          (payload as Record<string, unknown>).page as number || 1,
          (payload as Record<string, unknown>).pageSize as number || 20,
          (payload as Record<string, unknown>).filter as any
        );
      case 'update':
        return this.service.update(
          (payload as Record<string, unknown>).id as string,
          (payload as Record<string, unknown>).updates as UpdateProjectRequest
        );
      case 'delete':
        return this.service.delete(payload as string);
      case 'updateStatus':
        return this.service.updateExecutionStatus(
          (payload as Record<string, unknown>).projectId as string,
          (payload as Record<string, unknown>).status as ExecutionStatus,
          (payload as Record<string, unknown>).updatedBy as string
        );
      case 'getVersions':
        return this.service.getProjectVersions(payload as string);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

function main(): void {
  const app = new ProjectApp();
  console.log('[Projects Service] Initialized');
  console.log('[Projects Service] Available actions: create, getById, list, update, delete, updateStatus, getVersions');
}

if (require.main === module) {
  main();
}

export { ProjectService, ProjectApp, Project, ProjectVersion, CreateProjectRequest, UpdateProjectRequest, ProjectStatus, PaginatedResult };
