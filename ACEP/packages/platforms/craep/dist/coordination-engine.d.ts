import { BaseEngine, EngineStatus } from '@acep/core';
import { Robot, CoordinationPlan, SwarmConfig, HumanRobotCollaboration } from './types';
import { ICoordinationEngine, CollisionAvoidanceResult } from './interfaces';
export declare class CoordinationEngine extends BaseEngine implements ICoordinationEngine {
    private plans;
    private swarms;
    private collaborations;
    private robots;
    private safetyZones;
    private operationLog;
    constructor(config?: Record<string, unknown>);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    setRobots(robots: Robot[]): void;
    createCoordinationPlan(projectId: string, robotIds: string[], equipmentIds: string[]): Promise<CoordinationPlan>;
    deconflict(planId: string): Promise<{
        conflicts: number;
        resolved: number;
        remaining: number;
    }>;
    preventCollisions(planId: string): Promise<CollisionAvoidanceResult>;
    resolveConflicts(planId: string): Promise<void>;
    optimizeSwarm(swarmConfig: SwarmConfig): Promise<void>;
    manageHumanRobotCollaboration(collaboration: HumanRobotCollaboration): Promise<void>;
    getStatus(): EngineStatus;
    private calculateDistance;
    private calculateDistanceToZone;
    private log;
    getOperationLog(): string[];
}
//# sourceMappingURL=coordination-engine.d.ts.map