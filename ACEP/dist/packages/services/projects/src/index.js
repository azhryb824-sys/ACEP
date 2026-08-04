"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectApp = exports.ProjectService = void 0;
const uuid_1 = require("uuid");
const core_1 = require("@acep/core");
class ProjectService {
    projects = new Map();
    create(request) {
        if (!request.name || !request.description || !request.projectType || !request.createdBy) {
            throw new Error('name, description, projectType, and createdBy are required');
        }
        const now = new Date().toISOString();
        const project = {
            id: (0, uuid_1.v4)(),
            name: request.name,
            description: request.description,
            projectType: request.projectType,
            status: 'Draft',
            executionStatus: core_1.ExecutionStatus.Draft,
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
                    status: core_1.ExecutionStatus.Draft,
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
    getById(id) {
        return this.projects.get(id) || null;
    }
    list(page = 1, pageSize = 20, filter) {
        let items = Array.from(this.projects.values());
        if (filter?.status)
            items = items.filter(p => p.status === filter.status);
        if (filter?.projectType)
            items = items.filter(p => p.projectType === filter.projectType);
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
    update(id, request) {
        const project = this.projects.get(id);
        if (!project)
            return null;
        if (request.name !== undefined)
            project.name = request.name;
        if (request.description !== undefined)
            project.description = request.description;
        if (request.projectType !== undefined)
            project.projectType = request.projectType;
        if (request.status !== undefined)
            project.status = request.status;
        if (request.clientName !== undefined)
            project.clientName = request.clientName;
        if (request.location !== undefined)
            project.location = request.location;
        if (request.budget !== undefined)
            project.budget = request.budget;
        if (request.area !== undefined)
            project.area = request.area;
        if (request.floors !== undefined)
            project.floors = request.floors;
        if (request.tags !== undefined)
            project.tags = request.tags;
        if (request.metadata !== undefined)
            project.metadata = { ...project.metadata, ...request.metadata };
        project.updatedAt = new Date().toISOString();
        return project;
    }
    delete(id) {
        return this.projects.delete(id);
    }
    updateExecutionStatus(projectId, status, updatedBy) {
        const project = this.projects.get(projectId);
        if (!project)
            return null;
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
    getProjectVersions(projectId) {
        const project = this.projects.get(projectId);
        return project ? project.versions : [];
    }
}
exports.ProjectService = ProjectService;
class ProjectApp {
    service;
    constructor() {
        this.service = new ProjectService();
    }
    async handleRequest(action, payload) {
        switch (action) {
            case 'create':
                return this.service.create(payload);
            case 'getById':
                return this.service.getById(payload);
            case 'list':
                return this.service.list(payload.page || 1, payload.pageSize || 20, payload.filter);
            case 'update':
                return this.service.update(payload.id, payload.updates);
            case 'delete':
                return this.service.delete(payload);
            case 'updateStatus':
                return this.service.updateExecutionStatus(payload.projectId, payload.status, payload.updatedBy);
            case 'getVersions':
                return this.service.getProjectVersions(payload);
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
}
exports.ProjectApp = ProjectApp;
function main() {
    const app = new ProjectApp();
    console.log('[Projects Service] Initialized');
    console.log('[Projects Service] Available actions: create, getById, list, update, delete, updateStatus, getVersions');
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map