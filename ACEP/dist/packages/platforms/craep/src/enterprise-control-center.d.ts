import { BaseEngine } from '@acep/core';
import { Robot, Mission, RobotStatus, RobotType, AutonomousEquipment, HazardAlert, RoboticsPerformanceIndex, DecisionLog, GeoLocation } from './types';
export interface EnterpriseDashboard {
    totalRobots: number;
    totalEquipment: number;
    activeMissions: number;
    onlineRobots: number;
    offlineRobots: number;
    chargingRobots: number;
    maintenanceCount: number;
    errorCount: number;
    activeAlerts: number;
    criticalAlerts: number;
    energyConsumption: number;
    averageBattery: number;
    performanceIndex: number;
    completionRate: number;
    failureRate: number;
    lastUpdated: string;
}
export interface ProjectView {
    projectId: string;
    projectName: string;
    robots: Robot[];
    equipment: {
        id: string;
        type: AutonomousEquipment;
        model: string;
        status: RobotStatus;
    }[];
    missions: Mission[];
    alerts: HazardAlert[];
    performance: RoboticsPerformanceIndex;
}
export declare class EnterpriseRoboticsControlCenter extends BaseEngine {
    private robots;
    private equipment;
    private missions;
    private droneMissions;
    private alerts;
    private decisionLogs;
    private projectRegistry;
    constructor(config?: Record<string, unknown>);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    registerProject(projectId: string, projectName: string): void;
    addRobot(robot: Robot): void;
    addEquipment(id: string, type: AutonomousEquipment, model: string): void;
    addMission(mission: Mission): void;
    addAlert(alert: HazardAlert): void;
    getDashboard(): EnterpriseDashboard;
    getProjectView(projectId: string): ProjectView | null;
    getRobotsByProject(projectId: string): Promise<Robot[]>;
    getRobotsByStatus(status: RobotStatus): Promise<Robot[]>;
    getRobotsByType(type: RobotType): Promise<Robot[]>;
    getRobotsNearLocation(location: GeoLocation, radiusMeters: number): Promise<Robot[]>;
    getActiveMissions(): Promise<Mission[]>;
    getMissionReport(missionId: string): Promise<{
        mission: Mission | null;
        robot: Robot | null;
        alerts: HazardAlert[];
        decisions: DecisionLog[];
    }>;
    generateAnalyticsReport(): Promise<{
        overview: EnterpriseDashboard;
        byProject: Record<string, ProjectView>;
        trends: {
            performance: number[];
            energy: number[];
            completion: number[];
        };
    }>;
    delegateTask(robotId: string, task: string, targetRobotId: string): Promise<void>;
    setPermissions(robotId: string, permissions: string[]): Promise<void>;
    private calculateDistance;
    private recordDecision;
}
//# sourceMappingURL=enterprise-control-center.d.ts.map