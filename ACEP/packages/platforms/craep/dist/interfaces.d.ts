import { IEngine, EngineStatus } from '@acep/core';
import { Robot, Mission, CoordinationPlan, DroneMission, SafetyZone, HazardAlert, RoboticsPerformanceIndex, SwarmConfig, HumanRobotCollaboration, DigitalTwinRobotics, KnowledgeGraph, DecisionLog, RobotStatus, GeoLocation, RobotType, AutonomousEquipment } from './types';
export interface IRoboticsEngine extends IEngine {
    registerRobot(robot: Robot): Promise<void>;
    unregisterRobot(robotId: string): Promise<void>;
    getRobot(robotId: string): Promise<Robot | null>;
    getAllRobots(): Promise<Robot[]>;
    getRobotsByType(type: RobotType): Promise<Robot[]>;
    getRobotsByStatus(status: RobotStatus): Promise<Robot[]>;
    updateRobotStatus(robotId: string, status: RobotStatus): Promise<void>;
    dispatchMission(mission: Mission): Promise<void>;
    cancelMission(missionId: string): Promise<void>;
    getMission(missionId: string): Promise<Mission | null>;
    getAllMissions(): Promise<Mission[]>;
    getPerformanceIndex(): Promise<RoboticsPerformanceIndex>;
    getKnowledgeGraph(): Promise<KnowledgeGraph>;
    getDigitalTwin(robotId: string): Promise<DigitalTwinRobotics | null>;
}
export interface IFleetManager {
    registerEquipment(equipment: AutonomousEquipment, id: string, model: string): Promise<void>;
    unregisterEquipment(equipmentId: string): Promise<void>;
    getEquipmentStatus(equipmentId: string): Promise<RobotStatus>;
    getAllEquipment(): Promise<{
        id: string;
        type: AutonomousEquipment;
        model: string;
        status: RobotStatus;
    }[]>;
    assignEquipmentToMission(equipmentId: string, missionId: string): Promise<void>;
    getUtilizationRates(): Promise<Record<string, number>>;
    scheduleMaintenance(equipmentId: string, date: string): Promise<void>;
    getMaintenanceSchedule(): Promise<{
        equipmentId: string;
        nextMaintenance: string;
        type: string;
    }[]>;
}
export interface IMissionPlanner {
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
}
export interface ICoordinationEngine {
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
}
export interface CollisionAvoidanceResult {
    planId: string;
    potentialCollisions: number;
    avoided: number;
    robotsRerouted: string[];
    missionsDelayed: string[];
    timestamp: string;
}
export interface IDroneManager {
    registerDrone(droneId: string, model: string, capabilities: string[]): Promise<void>;
    createDroneMission(mission: DroneMission): Promise<void>;
    launchMission(droneMissionId: string): Promise<void>;
    abortMission(droneMissionId: string): Promise<void>;
    getDroneMissionStatus(droneMissionId: string): Promise<string>;
    processSurveyData(droneMissionId: string): Promise<unknown>;
    processThermalData(droneMissionId: string): Promise<unknown>;
    processLidarData(droneMissionId: string): Promise<unknown>;
    generateProgressReport(projectId: string, droneMissionId: string): Promise<unknown>;
    getAllDroneMissions(projectId: string): Promise<DroneMission[]>;
}
export interface ISafetyMonitor {
    defineSafetyZone(zone: SafetyZone): Promise<void>;
    updateSafetyZone(zoneId: string, updates: Partial<SafetyZone>): Promise<void>;
    removeSafetyZone(zoneId: string): Promise<void>;
    checkProximity(robotId: string): Promise<HazardAlert[]>;
    monitorRestrictedZones(robotId: string): Promise<HazardAlert[]>;
    enforceSpeedLimits(robotId: string, currentSpeed: number): Promise<boolean>;
    checkLoadLimits(robotId: string): Promise<boolean>;
    generateAlert(alert: HazardAlert): Promise<void>;
    acknowledgeAlert(alertId: string): Promise<void>;
    resolveAlert(alertId: string): Promise<void>;
    getActiveAlerts(): Promise<HazardAlert[]>;
    getSafetyReport(): Promise<{
        totalAlerts: number;
        criticalAlerts: number;
        resolvedAlerts: number;
        activeZones: number;
    }>;
}
//# sourceMappingURL=interfaces.d.ts.map