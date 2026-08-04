import { BaseRepository } from './BaseRepository';
import { UserModel } from '../models/UserModel';

export class UserRepository extends BaseRepository<UserModel> {
  async findByEmail(email: string): Promise<UserModel | null> {
    const all = await this.findAll();
    return all.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async findByRole(role: UserModel['role']): Promise<UserModel[]> {
    const all = await this.findAll();
    return all.filter(u => u.role === role);
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }
}
