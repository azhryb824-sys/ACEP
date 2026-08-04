import { IRepository } from '@acep/core';
export declare class BaseRepository<T extends {
    id: string;
}> implements IRepository<T> {
    protected items: Map<string, T>;
    findById(id: string): Promise<T | null>;
    findAll(filter?: Partial<T>): Promise<T[]>;
    create(data: T): Promise<T>;
    update(id: string, data: Partial<T>): Promise<T>;
    delete(id: string): Promise<boolean>;
    count(filter?: Partial<T>): Promise<number>;
    exists(id: string): Promise<boolean>;
}
//# sourceMappingURL=BaseRepository.d.ts.map