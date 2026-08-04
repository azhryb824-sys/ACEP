import { BaseRepository } from './BaseRepository';
import { UserModel } from '../models/UserModel';
export declare class UserRepository extends BaseRepository<UserModel> {
    findByEmail(email: string): Promise<UserModel | null>;
    findByRole(role: UserModel['role']): Promise<UserModel[]>;
    emailExists(email: string): Promise<boolean>;
}
//# sourceMappingURL=UserRepository.d.ts.map