import { IAgent, IEngineeringBrain, DecisionRecord } from '@acep/core';
declare class DecisionTraceRecorder {
    private records;
    record(record: DecisionRecord): void;
    getProjectRecords(projectId: string): DecisionRecord[];
    getAllRecords(): Map<string, DecisionRecord[]>;
    clearProject(projectId: string): void;
}
declare class AgentRegistry {
    private agents;
    private dependencyGraph;
    register(agent: IAgent, dependencies?: string[]): void;
    getAgent(type: string): IAgent | undefined;
    getDependencies(type: string): string[];
    getAffectedByChange(changedType: string): string[];
    getAllAgents(): IAgent[];
    getTypes(): string[];
}
export declare class EngineeringBrain implements IEngineeringBrain {
    readonly id = "engineering-brain";
    readonly name = "Engineering Brain";
    readonly version = "1.0.0";
    private registry;
    private tracer;
    private logger;
    private projectResults;
    constructor();
    private registerDefaultAgents;
    registerAgent(agent: IAgent, dependencies?: string[]): void;
    getRegistry(): AgentRegistry;
    getTracer(): DecisionTraceRecorder;
    orchestrate(projectId: string, input: unknown): Promise<unknown>;
    determineAgent(input: unknown): IAgent;
    runPipeline(projectId: string, pipeline: string[]): Promise<unknown>;
    handleChange(projectId: string, changes: unknown): Promise<void>;
    getProjectResults(projectId: string): Map<string, unknown> | undefined;
}
export {};
//# sourceMappingURL=index.d.ts.map