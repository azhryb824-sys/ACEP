"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
class BaseRepository {
    items = new Map();
    async findById(id) {
        return this.items.get(id) || null;
    }
    async findAll(filter) {
        const all = Array.from(this.items.values());
        if (!filter || Object.keys(filter).length === 0)
            return all;
        return all.filter(item => {
            for (const [key, value] of Object.entries(filter)) {
                if (item[key] !== value)
                    return false;
            }
            return true;
        });
    }
    async create(data) {
        this.items.set(data.id, data);
        return data;
    }
    async update(id, data) {
        const existing = this.items.get(id);
        if (!existing)
            throw new Error(`Entity with id ${id} not found`);
        const updated = { ...existing, ...data };
        this.items.set(id, updated);
        return updated;
    }
    async delete(id) {
        return this.items.delete(id);
    }
    async count(filter) {
        const all = await this.findAll(filter);
        return all.length;
    }
    async exists(id) {
        return this.items.has(id);
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=BaseRepository.js.map