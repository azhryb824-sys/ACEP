"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityApp = exports.IdentityService = void 0;
const uuid_1 = require("uuid");
const crypto_1 = require("crypto");
class IdentityService {
    users = new Map();
    tokens = new Map();
    TOKEN_EXPIRY_HOURS = 24;
    async register(request) {
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
            const validRoles = ['admin', 'engineer', 'contractor', 'consultant', 'viewer'];
            const role = request.role && validRoles.includes(request.role) ? request.role : 'viewer';
            const salt = (0, crypto_1.randomBytes)(16).toString('hex');
            const passwordHash = this.hashPassword(request.password, salt);
            const user = {
                id: (0, uuid_1.v4)(),
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
        }
        catch (err) {
            return { success: false, error: `Registration failed: ${err.message}` };
        }
    }
    async login(request) {
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
        }
        catch (err) {
            return { success: false, error: `Login failed: ${err.message}` };
        }
    }
    validateToken(tokenString) {
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
    revokeToken(tokenString) {
        return this.tokens.delete(tokenString);
    }
    getUserProfile(userId) {
        const user = this.users.get(userId);
        return user ? this.toProfile(user) : null;
    }
    updateUser(userId, updates) {
        const user = this.users.get(userId);
        if (!user)
            return null;
        if (updates.name !== undefined)
            user.name = updates.name;
        if (updates.role !== undefined)
            user.role = updates.role;
        if (updates.isActive !== undefined)
            user.isActive = updates.isActive;
        user.updatedAt = new Date().toISOString();
        return this.toProfile(user);
    }
    listUsers(filter) {
        let results = Array.from(this.users.values());
        if (filter?.role)
            results = results.filter(u => u.role === filter.role);
        if (filter?.isActive !== undefined)
            results = results.filter(u => u.isActive === filter.isActive);
        return results.map(u => this.toProfile(u));
    }
    hasPermission(userRole, requiredRole) {
        const hierarchy = {
            admin: 100,
            engineer: 80,
            contractor: 60,
            consultant: 60,
            viewer: 20,
        };
        return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0);
    }
    generateToken(user) {
        const now = new Date();
        const expires = new Date(now.getTime() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
        const raw = `${user.id}:${user.role}:${now.toISOString()}:${(0, crypto_1.randomBytes)(8).toString('hex')}`;
        const token = (0, crypto_1.createHash)('sha256').update(raw).digest('hex');
        return {
            token,
            userId: user.id,
            role: user.role,
            issuedAt: now.toISOString(),
            expiresAt: expires.toISOString(),
        };
    }
    hashPassword(password, salt) {
        return (0, crypto_1.createHash)('sha256').update(password + salt).digest('hex');
    }
    toProfile(user) {
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
exports.IdentityService = IdentityService;
class IdentityApp {
    service;
    constructor() {
        this.service = new IdentityService();
    }
    async handleRequest(action, payload) {
        switch (action) {
            case 'register':
                return this.service.register(payload);
            case 'login':
                return this.service.login(payload);
            case 'validate':
                return this.service.validateToken(payload.token);
            case 'revoke':
                return this.service.revokeToken(payload.token);
            case 'getProfile':
                return this.service.getUserProfile(payload.userId);
            case 'updateUser':
                return this.service.updateUser(payload.userId, payload.updates);
            case 'listUsers':
                return this.service.listUsers(payload);
            case 'checkPermission':
                return this.service.hasPermission(payload.userRole, payload.requiredRole);
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
}
exports.IdentityApp = IdentityApp;
function main() {
    const app = new IdentityApp();
    console.log('[Identity Service] Initialized');
    console.log('[Identity Service] Available actions: register, login, validate, revoke, getProfile, updateUser, listUsers, checkPermission');
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map