import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';

type UserRole = 'admin' | 'engineer' | 'contractor' | 'consultant' | 'viewer';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  isActive: boolean;
}

interface AuthToken {
  token: string;
  userId: string;
  role: UserRole;
  issuedAt: string;
  expiresAt: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResult {
  success: boolean;
  token?: AuthToken;
  user?: UserProfile;
  error?: string;
}

class IdentityService {
  private users: Map<string, User> = new Map();
  private tokens: Map<string, AuthToken> = new Map();
  private readonly TOKEN_EXPIRY_HOURS = 24;

  async register(request: RegisterRequest): Promise<AuthResult> {
    try {
      if (!request.email || !request.password || !request.name) {
        return { success: false, error: 'email, password, and name are required' };
      }

      const existing = Array.from(this.users.values()).find(u => u.email === request.email);
      if (existing) {
        return { success: false, error: 'Email already registered' };
      }

      if (request.password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
      }

      const validRoles: UserRole[] = ['admin', 'engineer', 'contractor', 'consultant', 'viewer'];
      const role = request.role && validRoles.includes(request.role) ? request.role : 'viewer';

      const salt = randomBytes(16).toString('hex');
      const passwordHash = this.hashPassword(request.password, salt);

      const user: User = {
        id: uuidv4(),
        email: request.email,
        name: request.name,
        role,
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };

      this.users.set(user.id, user);

      const token = this.generateToken(user);
      this.tokens.set(token.token, token);

      return {
        success: true,
        token,
        user: this.toProfile(user),
      };
    } catch (err) {
      return { success: false, error: `Registration failed: ${(err as Error).message}` };
    }
  }

  async login(request: LoginRequest): Promise<AuthResult> {
    try {
      if (!request.email || !request.password) {
        return { success: false, error: 'email and password are required' };
      }

      const user = Array.from(this.users.values()).find(u => u.email === request.email);
      if (!user) {
        return { success: false, error: 'Invalid email or password' };
      }

      if (!user.isActive) {
        return { success: false, error: 'Account is deactivated' };
      }

      const hash = this.hashPassword(request.password, user.salt);
      if (hash !== user.passwordHash) {
        return { success: false, error: 'Invalid email or password' };
      }

      const token = this.generateToken(user);
      this.tokens.set(token.token, token);

      return {
        success: true,
        token,
        user: this.toProfile(user),
      };
    } catch (err) {
      return { success: false, error: `Login failed: ${(err as Error).message}` };
    }
  }

  validateToken(tokenString: string): { valid: boolean; userId?: string; role?: UserRole; error?: string } {
    const token = this.tokens.get(tokenString);
    if (!token) {
      return { valid: false, error: 'Token not found' };
    }

    const now = new Date();
    const expires = new Date(token.expiresAt);
    if (now > expires) {
      this.tokens.delete(tokenString);
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, userId: token.userId, role: token.role };
  }

  revokeToken(tokenString: string): boolean {
    return this.tokens.delete(tokenString);
  }

  getUserProfile(userId: string): UserProfile | null {
    const user = this.users.get(userId);
    return user ? this.toProfile(user) : null;
  }

  updateUser(userId: string, updates: Partial<Pick<User, 'name' | 'role' | 'isActive'>>): UserProfile | null {
    const user = this.users.get(userId);
    if (!user) return null;

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.isActive !== undefined) user.isActive = updates.isActive;
    user.updatedAt = new Date().toISOString();

    return this.toProfile(user);
  }

  listUsers(filter?: { role?: UserRole; isActive?: boolean }): UserProfile[] {
    let results = Array.from(this.users.values());
    if (filter?.role) results = results.filter(u => u.role === filter.role);
    if (filter?.isActive !== undefined) results = results.filter(u => u.isActive === filter.isActive);
    return results.map(u => this.toProfile(u));
  }

  hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const hierarchy: Record<UserRole, number> = {
      admin: 100,
      engineer: 80,
      contractor: 60,
      consultant: 60,
      viewer: 20,
    };
    return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0);
  }

  private generateToken(user: User): AuthToken {
    const now = new Date();
    const expires = new Date(now.getTime() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    const raw = `${user.id}:${user.role}:${now.toISOString()}:${randomBytes(8).toString('hex')}`;
    const token = createHash('sha256').update(raw).digest('hex');

    return {
      token,
      userId: user.id,
      role: user.role,
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
  }

  private hashPassword(password: string, salt: string): string {
    return createHash('sha256').update(password + salt).digest('hex');
  }

  private toProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      isActive: user.isActive,
    };
  }
}

class IdentityApp {
  private service: IdentityService;

  constructor() {
    this.service = new IdentityService();
  }

  async handleRequest(action: string, payload: unknown): Promise<unknown> {
    switch (action) {
      case 'register':
        return this.service.register(payload as RegisterRequest);
      case 'login':
        return this.service.login(payload as LoginRequest);
      case 'validate':
        return this.service.validateToken((payload as Record<string, unknown>).token as string);
      case 'revoke':
        return this.service.revokeToken((payload as Record<string, unknown>).token as string);
      case 'getProfile':
        return this.service.getUserProfile((payload as Record<string, unknown>).userId as string);
      case 'updateUser':
        return this.service.updateUser(
          (payload as Record<string, unknown>).userId as string,
          (payload as Record<string, unknown>).updates as any
        );
      case 'listUsers':
        return this.service.listUsers(payload as { role?: UserRole; isActive?: boolean });
      case 'checkPermission':
        return this.service.hasPermission(
          (payload as Record<string, unknown>).userRole as UserRole,
          (payload as Record<string, unknown>).requiredRole as UserRole
        );
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

function main(): void {
  const app = new IdentityApp();
  console.log('[Identity Service] Initialized');
  console.log('[Identity Service] Available actions: register, login, validate, revoke, getProfile, updateUser, listUsers, checkPermission');
}

if (require.main === module) {
  main();
}

export { IdentityService, IdentityApp, User, UserProfile, AuthToken, UserRole, RegisterRequest, LoginRequest, AuthResult };
