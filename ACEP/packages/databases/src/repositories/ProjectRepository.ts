import { BaseRepository } from './BaseRepository';
import { ProjectModel } from '../models/ProjectModel';

export class ProjectRepository extends BaseRepository<ProjectModel> {
  async findByUserId(userId: string): Promise<ProjectModel[]> {
    const all = await this.findAll();
    return all.filter(p => p.userId === userId);
  }

  async findByStatus(status: string): Promise<ProjectModel[]> {
    const all = await this.findAll();
    return all.filter(p => p.status === status);
  }

  async findRecent(limit: number = 10): Promise<ProjectModel[]> {
    const all = await this.findAll();
    return all
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async incrementVersion(id: string): Promise<ProjectModel> {
    const project = await this.findById(id);
    if (!project) throw new Error(`Project ${id} not found`);
    return this.update(id, { version: project.version + 1 });
  }

  async archive(id: string): Promise<ProjectModel> {
    return this.update(id, { status: 'Archived' as never });
  }
}
