import { BaseEngine, EngineStatus } from '@acep/core';
import { v4 as uuid } from 'uuid';
import {
  Robot, Mission, RobotStatus, RobotType, AutonomousEquipment,
  HazardAlert, RoboticsPerformanceIndex, DecisionLog, GeoLocation, DroneMission
} from './types';

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
  equipment: { id: string; type: AutonomousEquipment; model: string; status: RobotStatus }[];
  missions: Mission[];
  alerts: HazardAlert[];
  performance: RoboticsPerformanceIndex;
}

export class EnterpriseRoboticsControlCenter extends BaseEngine {
  private robots: Map<string, Robot> = new Map();
  private equipment: Map<string, { type: AutonomousEquipment; model: string; status: RobotStatus }> = new Map();
  private missions: Map<string, Mission> = new Map();
  private droneMissions: Map<string, DroneMission> = new Map();
  private alerts: Map<string, HazardAlert> = new Map();
  private decisionLogs: DecisionLog[] = [];
  private projectRegistry: Map<string, string> = new Map();

  constructor(config?: Record<string, unknown>) {
    super('EnterpriseRoboticsControlCenter', '1.0.0', config);
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('Enterprise Robotics Control Center initialized');
  }

  async validate(): Promise<boolean> {
    return true;
  }

  registerProject(projectId: string, projectName: string): void {
    this.projectRegistry.set(projectId, projectName);
  }

  addRobot(robot: Robot): void {
    this.robots.set(robot.id, robot);
  }

  addEquipment(id: string, type: AutonomousEquipment, model: string): void {
    this.equipment.set(id, { type, model, status: RobotStatus.Idle });
  }

  addMission(mission: Mission): void {
    this.missions.set(mission.id, mission);
  }

  addAlert(alert: HazardAlert): void {
    this.alerts.set(alert.id, alert);
  }

  getDashboard(): EnterpriseDashboard {
    const allRobots = Array.from(this.robots.values());
    const allEquipment = Array.from(this.equipment.values());
    const allMissions = Array.from(this.missions.values());
    const activeMissions = allMissions.filter(m => m.status === 'active');
    const completedMissions = allMissions.filter(m => m.status === 'completed');
    const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.resolved);
    const totalEnergy = allMissions.reduce((s, m) => s + (m.energy.actual || m.energy.estimated), 0);
    const avgBattery = allRobots.length > 0 ? allRobots.reduce((s, r) => s + r.battery.level, 0) / allRobots.length : 0;

    return {
      totalRobots: allRobots.length,
      totalEquipment: allEquipment.length,
      activeMissions: activeMissions.length,
      onlineRobots: allRobots.filter(r => r.status === RobotStatus.OnMission || r.status === RobotStatus.Idle).length,
      offlineRobots: allRobots.filter(r => r.status === RobotStatus.Offline).length,
      chargingRobots: allRobots.filter(r => r.status === RobotStatus.Charging).length,
      maintenanceCount: allRobots.filter(r => r.status === RobotStatus.Maintenance).length,
      errorCount: allRobots.filter(r => r.status === RobotStatus.Error).length,
      activeAlerts: activeAlerts.length,
      criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
      energyConsumption: totalEnergy,
      averageBattery: Math.round(avgBattery * 100) / 100,
      performanceIndex: 85,
      completionRate: allMissions.length > 0 ? (completedMissions.length / allMissions.length) * 100 : 0,
      failureRate: allMissions.length > 0 ? (allMissions.filter(m => m.status === 'failed').length / allMissions.length) * 100 : 0,
      lastUpdated: new Date().toISOString()
    };
  }

  getProjectView(projectId: string): ProjectView | null {
    if (!this.projectRegistry.has(projectId)) return null;
    const projectRobots = Array.from(this.robots.values()).filter(r => r.projectId === projectId);
    const projectMissions = Array.from(this.missions.values()).filter(m => projectRobots.some(r => r.id === m.robotId));
    const projectAlerts = Array.from(this.alerts.values()).filter(a => a.affectedRobots.some(id => projectRobots.some(r => r.id === id)));
    return {
      projectId,
      projectName: this.projectRegistry.get(projectId) || projectId,
      robots: projectRobots,
      equipment: Array.from(this.equipment.entries()).map(([id, eq]) => ({ id, ...eq })),
      missions: projectMissions,
      alerts: projectAlerts,
      performance: {
        overall: 85, executionQuality: 88, planAdherence: 82,
        energyEfficiency: 79, failureRate: 8, precision: 90,
        completionRate: 92, responseTime: 94, timestamp: new Date().toISOString()
      }
    };
  }

  async getRobotsByProject(projectId: string): Promise<Robot[]> {
    return Array.from(this.robots.values()).filter(r => r.projectId === projectId);
  }

  async getRobotsByStatus(status: RobotStatus): Promise<Robot[]> {
    return Array.from(this.robots.values()).filter(r => r.status === status);
  }

  async getRobotsByType(type: RobotType): Promise<Robot[]> {
    return Array.from(this.robots.values()).filter(r => r.type === type);
  }

  async getRobotsNearLocation(location: GeoLocation, radiusMeters: number): Promise<Robot[]> {
    return Array.from(this.robots.values()).filter(r => {
      const dist = this.calculateDistance(r.location, location);
      return dist <= radiusMeters;
    });
  }

  async getActiveMissions(): Promise<Mission[]> {
    return Array.from(this.missions.values()).filter(m => m.status === 'active');
  }

  async getMissionReport(missionId: string): Promise<{
    mission: Mission | null;
    robot: Robot | null;
    alerts: HazardAlert[];
    decisions: DecisionLog[];
  }> {
    const mission = this.missions.get(missionId) || null;
    const robot = mission ? this.robots.get(mission.robotId) || null : null;
    const alerts = Array.from(this.alerts.values()).filter(a => a.affectedRobots.includes(mission?.robotId || ''));
    const decisions = this.decisionLogs.filter(d => d.input && typeof d.input === 'object' && 'missionId' in (d.input as Record<string, unknown>) && (d.input as Record<string, unknown>).missionId === missionId);
    return { mission, robot, alerts, decisions };
  }

  async generateAnalyticsReport(): Promise<{
    overview: EnterpriseDashboard;
    byProject: Record<string, ProjectView>;
    trends: { performance: number[]; energy: number[]; completion: number[] };
  }> {
    const overview = this.getDashboard();
    const byProject: Record<string, ProjectView> = {};
    for (const [projectId] of this.projectRegistry) {
      const view = this.getProjectView(projectId);
      if (view) byProject[projectId] = view;
    }
    return {
      overview,
      byProject,
      trends: { performance: [85, 87, 86, 88, 90], energy: [450, 420, 480, 410, 390], completion: [88, 90, 87, 91, 93] }
    };
  }

  async delegateTask(robotId: string, task: string, targetRobotId: string): Promise<void> {
    const robot = this.robots.get(robotId);
    const target = this.robots.get(targetRobotId);
    if (!robot || !target) throw new Error('Robot not found');
    this.recordDecision({
      id: uuid(), type: 'task_delegation', agent: 'ControlCenter',
      input: { robotId, task, targetRobotId },
      output: { delegated: true }, alternatives: [],
      reason: `Task delegation from ${robot.name} to ${target.name}`,
      confidence: 0.95, timestamp: new Date().toISOString(), projectId: robot.projectId
    });
    this.logger.info(`Task delegated from ${robotId} to ${targetRobotId}: ${task}`);
  }

  async setPermissions(robotId: string, permissions: string[]): Promise<void> {
    const robot = this.robots.get(robotId);
    if (!robot) throw new Error('Robot not found');
    robot.capabilities = permissions;
    this.robots.set(robotId, robot);
    this.logger.info(`Permissions set for ${robotId}: ${permissions.join(', ')}`);
  }

  private calculateDistance(a: GeoLocation, b: GeoLocation): number {
    const R = 6371e3;
    const φ1 = a.lat * Math.PI / 180;
    const φ2 = b.lat * Math.PI / 180;
    const Δφ = (b.lat - a.lat) * Math.PI / 180;
    const Δλ = (b.lng - a.lng) * Math.PI / 180;
    return R * 2 * Math.atan2(Math.sqrt(Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2), Math.sqrt(1 - (Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2)));
  }

  private recordDecision(log: DecisionLog): void {
    this.decisionLogs.push(log);
  }
}
