"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class UserRepository extends BaseRepository_1.BaseRepository {
    async findByEmail(email) {
        const all = await this.findAll();
        return all.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }
    async findByRole(role) {
        const all = await this.findAll();
        return all.filter(u => u.role === role);
    }
    async emailExists(email) {
        const user = await this.findByEmail(email);
        return user !== null;
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=UserRepository.js.map