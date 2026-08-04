import { IRepository } from '@acep/core';

export class BaseRepository<T extends { id: string }> implements IRepository<T> {
  protected items: Map<string, T> = new Map();

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) || null;
  }

  async findAll(filter?: Partial<T>): Promise<T[]> {
    const all = Array.from(this.items.values());
    if (!filter || Object.keys(filter).length === 0) return all;

    return all.filter(item => {
      for (const [key, value] of Object.entries(filter)) {
        if (item[key as keyof T] !== value) return false;
      }
      return true;
    });
  }

  async create(data: T): Promise<T> {
    this.items.set(data.id, data);
    return data;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const existing = this.items.get(id);
    if (!existing) throw new Error(`Entity with id ${id} not found`);
    const updated = { ...existing, ...data };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  async count(filter?: Partial<T>): Promise<number> {
    const all = await this.findAll(filter);
    return all.length;
  }

  async exists(id: string): Promise<boolean> {
    return this.items.has(id);
  }
}
