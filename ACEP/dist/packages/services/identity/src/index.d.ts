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
declare class IdentityService {
    private users;
    private tokens;
    private readonly TOKEN_EXPIRY_HOURS;
    register(request: RegisterRequest): Promise<AuthResult>;
    login(request: LoginRequest): Promise<AuthResult>;
    validateToken(tokenString: string): {
        valid: boolean;
        userId?: string;
        role?: UserRole;
        error?: string;
    };
    revokeToken(tokenString: string): boolean;
    getUserProfile(userId: string): UserProfile | null;
    updateUser(userId: string, updates: Partial<Pick<User, 'name' | 'role' | 'isActive'>>): UserProfile | null;
    listUsers(filter?: {
        role?: UserRole;
        isActive?: boolean;
    }): UserProfile[];
    hasPermission(userRole: UserRole, requiredRole: UserRole): boolean;
    private generateToken;
    private hashPassword;
    private toProfile;
}
declare class IdentityApp {
    private service;
    constructor();
    handleRequest(action: string, payload: unknown): Promise<unknown>;
}
export { IdentityService, IdentityApp, User, UserProfile, AuthToken, UserRole, RegisterRequest, LoginRequest, AuthResult };
//# sourceMappingURL=index.d.ts.map