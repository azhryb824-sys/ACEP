"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManifestValidator = exports.PluginManifestSchema = void 0;
exports.createManifest = createManifest;
const zod_1 = require("zod");
exports.PluginManifestSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).regex(/^[a-z0-9_-]+$/),
    name: zod_1.z.string().min(1).max(100),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
    description: zod_1.z.string().min(1).max(1000),
    author: zod_1.z.string().min(1),
    type: zod_1.z.enum(['engine', 'knowledge', 'ui', 'integration', 'ai', 'report']),
    dependencies: zod_1.z.array(zod_1.z.object({
        pluginId: zod_1.z.string().min(1),
        version: zod_1.z.string().min(1),
        required: zod_1.z.boolean(),
    })).default([]),
    hooks: zod_1.z.array(zod_1.z.string()).default([]),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
    minCoreVersion: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
    maxCoreVersion: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
    settings: zod_1.z.array(zod_1.z.object({
        key: zod_1.z.string().min(1),
        type: zod_1.z.enum(['string', 'number', 'boolean', 'select']),
        label: zod_1.z.string().min(1),
        defaultValue: zod_1.z.unknown().optional(),
        options: zod_1.z.array(zod_1.z.string()).optional(),
        required: zod_1.z.boolean(),
        validation: zod_1.z.object({
            min: zod_1.z.number().optional(),
            max: zod_1.z.number().optional(),
            pattern: zod_1.z.string().optional(),
            message: zod_1.z.string().optional(),
        }).optional(),
    })).default([]),
    documentation: zod_1.z.string().optional(),
    repository: zod_1.z.string().optional(),
    license: zod_1.z.string().optional(),
    icon: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
class PluginManifestValidator {
    validate(manifest) {
        const result = exports.PluginManifestSchema.safeParse(manifest);
        if (result.success) {
            return { valid: true, errors: [] };
        }
        return {
            valid: false,
            errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
        };
    }
    validateVersion(version, minVersion, maxVersion) {
        const parse = (v) => v.split('.').map(Number);
        const v = parse(version);
        const min = parse(minVersion);
        if (maxVersion) {
            const max = parse(maxVersion);
            for (let i = 0; i < 3; i++) {
                if (v[i] < min[i])
                    return false;
                if (v[i] > max[i])
                    return false;
            }
            return true;
        }
        for (let i = 0; i < 3; i++) {
            if (v[i] < min[i])
                return false;
        }
        return true;
    }
    validateDependencies(manifest, installedPlugins) {
        const errors = [];
        for (const dep of manifest.dependencies) {
            const installedVersion = installedPlugins.get(dep.pluginId);
            if (!installedVersion) {
                if (dep.required) {
                    errors.push(`Required dependency "${dep.pluginId}" is not installed`);
                }
                continue;
            }
            if (!this.validateVersion(installedVersion, dep.version)) {
                errors.push(`Dependency "${dep.pluginId}" version ${installedVersion} does not satisfy requirement ${dep.version}`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
    validatePermissions(manifest, grantedPermissions) {
        const missing = manifest.permissions.filter((p) => !grantedPermissions.has(p));
        return {
            valid: missing.length === 0,
            missing,
        };
    }
}
exports.PluginManifestValidator = PluginManifestValidator;
function createManifest(data) {
    const defaults = {
        id: '',
        name: '',
        version: '1.0.0',
        description: '',
        author: '',
        type: 'engine',
        dependencies: [],
        hooks: [],
        permissions: [],
        minCoreVersion: '1.0.0',
        settings: [],
    };
    return { ...defaults, ...data };
}
//# sourceMappingURL=manifest.js.map