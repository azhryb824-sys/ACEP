import { BaseRepository } from './BaseRepository';
import { ProjectModel } from '../models/ProjectModel';
export declare class ProjectRepository extends BaseRepository<ProjectModel> {
    findByUserId(userId: string): Promise<ProjectModel[]>;
    findByStatus(status: string): Promise<ProjectModel[]>;
    findRecent(limit?: number): Promise<ProjectModel[]>;
    incrementVersion(id: string): Promise<ProjectModel>;
    archive(id: string): Promise<ProjectModel>;
}
//# sourceMappingURL=ProjectRepository.d.ts.map