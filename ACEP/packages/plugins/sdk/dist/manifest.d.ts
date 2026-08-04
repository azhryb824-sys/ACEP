import { z } from 'zod';
export type PluginType = 'engine' | 'knowledge' | 'ui' | 'integration' | 'ai' | 'report';
export type SettingType = 'string' | 'number' | 'boolean' | 'select';
export type HookName = 'onProjectCreated' | 'onBOQGenerated' | 'onBeforeReview' | 'onAfterApproval' | 'onQuestionnaireComplete' | 'onScheduleGenerated' | 'onRiskIdentified' | 'onKnowledgeUpdated' | 'onEngineComplete' | 'onPluginLoad' | 'onPluginUnload';
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
export declare const PluginManifestSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    version: z.ZodString;
    description: z.ZodString;
    author: z.ZodString;
    type: z.ZodEnum<{
        ai: "ai";
        engine: "engine";
        integration: "integration";
        knowledge: "knowledge";
        report: "report";
        ui: "ui";
    }>;
    dependencies: z.ZodDefault<z.ZodArray<z.ZodObject<{
        pluginId: z.ZodString;
        version: z.ZodString;
        required: z.ZodBoolean;
    }, z.core.$strip>>>;
    hooks: z.ZodDefault<z.ZodArray<z.ZodString>>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodString>>;
    minCoreVersion: z.ZodString;
    maxCoreVersion: z.ZodOptional<z.ZodString>;
    settings: z.ZodDefault<z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        type: z.ZodEnum<{
            boolean: "boolean";
            number: "number";
            select: "select";
            string: "string";
        }>;
        label: z.ZodString;
        defaultValue: z.ZodOptional<z.ZodUnknown>;
        options: z.ZodOptional<z.ZodArray<z.ZodString>>;
        required: z.ZodBoolean;
        validation: z.ZodOptional<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            pattern: z.ZodOptional<z.ZodString>;
            message: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    documentation: z.ZodOptional<z.ZodString>;
    repository: z.ZodOptional<z.ZodString>;
    license: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare class PluginManifestValidator {
    validate(manifest: unknown): {
        valid: boolean;
        errors: string[];
    };
    validateVersion(version: string, minVersion: string, maxVersion?: string): boolean;
    validateDependencies(manifest: PluginManifest, installedPlugins: Map<string, string>): {
        valid: boolean;
        errors: string[];
    };
    validatePermissions(manifest: PluginManifest, grantedPermissions: Set<string>): {
        valid: boolean;
        missing: string[];
    };
}
export declare function createManifest(data: Partial<PluginManifest>): PluginManifest;
//# sourceMappingURL=manifest.d.ts.map