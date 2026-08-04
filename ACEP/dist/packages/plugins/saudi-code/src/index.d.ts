import { PluginBase, PluginContext, IEngine, EngineInput, EngineOutput, EngineCapability, ValidationResult } from '../../sdk/src/index';
export declare class SaudiBuildingCodePlugin extends PluginBase implements IEngine {
    readonly engineId = "saudi-building-code";
    readonly name = "Saudi Building Code Engine";
    private _rules;
    private _materials;
    private _laborData;
    constructor();
    init(context: PluginContext): Promise<void>;
    enable(): Promise<void>;
    disable(): Promise<void>;
    process(input: EngineInput): Promise<EngineOutput>;
    validate(input: EngineInput): ValidationResult;
    getCapabilities(): EngineCapability[];
    private _initializeRules;
    private _initializeMaterials;
    private _initializeLaborData;
    private _registerHooks;
    private _checkStructuralRequirements;
    private _checkMaterialCompliance;
    private _generateComplianceReport;
    private _simulateRuleCheck;
}
export declare function createPlugin(): SaudiBuildingCodePlugin;
export default createPlugin;
//# sourceMappingURL=index.d.ts.map