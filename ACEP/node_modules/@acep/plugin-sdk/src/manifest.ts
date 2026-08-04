import { z } from 'zod';

export type PluginType = 'engine' | 'knowledge' | 'ui' | 'integration' | 'ai' | 'report';
export type SettingType = 'string' | 'number' | 'boolean' | 'select';
export type HookName =
  | 'onProjectCreated'
  | 'onBOQGenerated'
  | 'onBeforeReview'
  | 'onAfterApproval'
  | 'onQuestionnaireComplete'
  | 'onScheduleGenerated'
  | 'onRiskIdentified'
  | 'onKnowledgeUpdated'
  | 'onEngineComplete'
  | 'onPluginLoad'
  | 'onPluginUnload';

export interface PluginDependency {
  pluginId: string;
  version: string;
  required: boolean;
}

export interface PluginSetting {
  key: string;
  type: SettingType;
  label: string;
  defaultValue?: unknown;
  options?: string[];
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  type: PluginType;
  dependencies: PluginDependency[];
  hooks: HookName[];
  permissions: string[];
  minCoreVersion: string;
  maxCoreVersion?: string;
  settings: PluginSetting[];
  documentation?: string;
  repository?: string;
  license?: string;
  icon?: string;
  tags?: string[];
}

export const PluginManifestSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_-]+$/),
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1).max(1000),
  author: z.string().min(1),
  type: z.enum(['engine', 'knowledge', 'ui', 'integration', 'ai', 'report']),
  dependencies: z.array(z.object({
    pluginId: z.string().min(1),
    version: z.string().min(1),
    required: z.boolean(),
  })).default([]),
  hooks: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  minCoreVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  maxCoreVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  settings: z.array(z.object({
    key: z.string().min(1),
    type: z.enum(['string', 'number', 'boolean', 'select']),
    label: z.string().min(1),
    defaultValue: z.unknown().optional(),
    options: z.array(z.string()).optional(),
    required: z.boolean(),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      message: z.string().optional(),
    }).optional(),
  })).default([]),
  documentation: z.string().optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  icon: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export class PluginManifestValidator {
  validate(manifest: unknown): { valid: boolean; errors: string[] } {
    const result = PluginManifestSchema.safeParse(manifest);
    if (result.success) {
      return { valid: true, errors: [] };
    }
    return {
      valid: false,
      errors: result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      ),
    };
  }

  validateVersion(version: string, minVersion: string, maxVersion?: string): boolean {
    const parse = (v: string): number[] => v.split('.').map(Number);
    const v = parse(version);
    const min = parse(minVersion);
    if (maxVersion) {
      const max = parse(maxVersion);
      for (let i = 0; i < 3; i++) {
        if (v[i] < min[i]) return false;
        if (v[i] > max[i]) return false;
      }
      return true;
    }
    for (let i = 0; i < 3; i++) {
      if (v[i] < min[i]) return false;
    }
    return true;
  }

  validateDependencies(
    manifest: PluginManifest,
    installedPlugins: Map<string, string>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const dep of manifest.dependencies) {
      const installedVersion = installedPlugins.get(dep.pluginId);
      if (!installedVersion) {
        if (dep.required) {
          errors.push(`Required dependency "${dep.pluginId}" is not installed`);
        }
        continue;
      }
      if (!this.validateVersion(installedVersion, dep.version)) {
        errors.push(
          `Dependency "${dep.pluginId}" version ${installedVersion} does not satisfy requirement ${dep.version}`
        );
      }
    }
    return { valid: errors.length === 0, errors };
  }

  validatePermissions(
    manifest: PluginManifest,
    grantedPermissions: Set<string>
  ): { valid: boolean; missing: string[] } {
    const missing = manifest.permissions.filter((p) => !grantedPermissions.has(p));
    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

export function createManifest(data: Partial<PluginManifest>): PluginManifest {
  const defaults: PluginManifest = {
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
