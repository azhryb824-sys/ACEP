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
export declare const PluginManifestSchema: any;
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