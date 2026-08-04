"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class ProjectRepository extends BaseRepository_1.BaseRepository {
    async findByUserId(userId) {
        const all = await this.findAll();
        return all.filter(p => p.userId === userId);
    }
    async findByStatus(status) {
        const all = await this.findAll();
        return all.filter(p => p.status === status);
    }
    async findRecent(limit = 10) {
        const all = await this.findAll();
        return all
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }
    async incrementVersion(id) {
        const project = await this.findById(id);
        if (!project)
            throw new Error(`Project ${id} not found`);
        return this.update(id, { version: project.version + 1 });
    }
    async archive(id) {
        return this.update(id, { status: 'Archived' });
    }
}
exports.ProjectRepository = ProjectRepository;
//# sourceMappingURL=ProjectRepository.js.map