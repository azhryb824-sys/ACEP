import { BaseEngine } from '@acep/core';
import { Robot, Mission, RobotType, GeoLocation, DecisionLog } from './types';
import { IMissionPlanner } from './interfaces';
export declare class MissionPlanner extends BaseEngine implements IMissionPlanner {
    private robots;
    private missions;
    private decisionLogs;
    private missionHistory;
    constructor(config?: Record<string, unknown>);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    setRobots(robots: Robot[]): void;
    createMission(name: string, type: RobotType, path: {
        start: GeoLocation;
        waypoints: GeoLocation[];
        end: GeoLocation;
    }, priority: number): Promise<Mission>;
    assignRobot(missionId: string, robotId: string): Promise<void>;
    optimizePath(missionId: string): Promise<void>;
    getOptimalRobot(type: RobotType, location: GeoLocation): Promise<Robot | null>;
    replanOnFailure(missionId: string, reason: string): Promise<Mission>;
    scheduleBatteryAware(robotId: string, mission: Mission): Promise<boolean>;
    getDecisionLog(missionId: string): Promise<DecisionLog[]>;
    validateMission(mission: Mission): Promise<{
        valid: boolean;
        issues: string[];
    }>;
    estimateEnergy(robotId: string, path: {
        start: GeoLocation;
        waypoints: GeoLocation[];
        end: GeoLocation;
    }): Promise<number>;
    private calculateDistance;
    private calculatePathDistance;
    private optimizeWaypoints;
    private calculateAngle;
    private getNearestChargingStation;
    private computeAlternativePath;
    private logDecision;
}
//# sourceMappingURL=mission-planner.d.ts.map