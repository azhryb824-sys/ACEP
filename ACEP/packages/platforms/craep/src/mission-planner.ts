import { BaseEngine } from '@acep/core';
import { v4 as uuid } from 'uuid';
import {
  Robot, Mission, RobotStatus, RobotType, GeoLocation,
  MissionConstraints, DecisionLog, MissionPath
} from './types';
import { IMissionPlanner } from './interfaces';

export class MissionPlanner extends BaseEngine implements IMissionPlanner {
  private robots: Map<string, Robot> = new Map();
  private missions: Map<string, Mission> = new Map();
  private decisionLogs: DecisionLog[] = [];
  private missionHistory: Map<string, DecisionLog[]> = new Map();

  constructor(config?: Record<string, unknown>) {
    super('MissionPlanner', '1.0.0', config);
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('MissionPlanner initialized');
  }

  async validate(): Promise<boolean> {
    return true;
  }

  setRobots(robots: Robot[]): void {
    for (const robot of robots) {
      this.robots.set(robot.id, robot);
    }
  }

  async createMission(
    name: string, type: RobotType,
    path: { start: GeoLocation; waypoints: GeoLocation[]; end: GeoLocation },
    priority: number
  ): Promise<Mission> {
    const robot = await this.getOptimalRobot(type, path.start);
    if (!robot) {
      throw new Error(`No available robot for type ${type} near the start location`);
    }
    const dist = this.calculateDistance(path.start, path.end);
    let totalDist = dist;
    for (let i = 0; i < path.waypoints.length - 1; i++) {
      totalDist += this.calculateDistance(path.waypoints[i], path.waypoints[i + 1]);
    }
    const mission: Mission = {
      id: uuid(), name, robotId: robot.id, type,
      path: { ...path, distance: totalDist, estimatedDuration: totalDist / 5 },
      priority, time: { start: new Date().toISOString(), estimatedEnd: new Date(Date.now() + (totalDist / 5) * 1000).toISOString() },
      energy: { estimated: totalDist * 0.4 },
      constraints: {}, status: 'pending', progress: 0, quality: 0, errors: 0,
      createdBy: 'MissionPlanner', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    this.missions.set(mission.id, mission);
    this.robots.set(robot.id, { ...robot, status: RobotStatus.OnMission, currentMission: mission.id });
    this.logDecision('create_mission', { name, type, priority }, { missionId: mission.id, robotId: robot.id }, 'Optimal robot assignment');
    this.logger.info(`Mission ${mission.id} created for robot ${robot.id}`);
    return mission;
  }

  async assignRobot(missionId: string, robotId: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);
    const robot = this.robots.get(robotId);
    if (!robot) throw new Error(`Robot ${robotId} not found`);
    if (robot.status !== RobotStatus.Idle && robot.status !== RobotStatus.Charging) {
      throw new Error(`Robot ${robotId} is ${robot.status}`);
    }
    mission.robotId = robotId;
    mission.updatedAt = new Date().toISOString();
    this.missions.set(missionId, mission);
    robot.status = RobotStatus.OnMission;
    robot.currentMission = missionId;
    this.robots.set(robotId, robot);
    this.logger.info(`Robot ${robotId} assigned to mission ${missionId}`);
  }

  async optimizePath(missionId: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);
    const optimized = this.optimizeWaypoints(mission.path);
    mission.path = optimized;
    mission.path.distance = this.calculatePathDistance(optimized);
    mission.path.estimatedDuration = mission.path.distance / 5;
    mission.energy.estimated = mission.path.distance * 0.4;
    mission.updatedAt = new Date().toISOString();
    this.missions.set(missionId, mission);
    this.logDecision('optimize_path', { missionId }, { distance: mission.path.distance }, 'Path optimized for efficiency');
    this.logger.info(`Path optimized for mission ${missionId}`);
  }

  async getOptimalRobot(type: RobotType, location: GeoLocation): Promise<Robot | null> {
    const available = Array.from(this.robots.values())
      .filter(r => r.type === type && (r.status === RobotStatus.Idle || r.status === RobotStatus.Charging))
      .sort((a, b) => {
        const distA = this.calculateDistance(a.location, location);
        const distB = this.calculateDistance(b.location, location);
        const batteryA = a.battery.level;
        const batteryB = b.battery.level;
        return (distA * 0.6 - batteryA * 0.4) - (distB * 0.6 - batteryB * 0.4);
      });
    return available[0] || null;
  }

  async replanOnFailure(missionId: string, reason: string): Promise<Mission> {
    const mission = this.missions.get(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);
    this.logDecision('replan_on_failure', { missionId, reason }, {}, `Replanning due to: ${reason}`);
    const robot = this.robots.get(mission.robotId);
    if (robot) {
      if (reason.includes('battery')) {
        const charger = await this.getNearestChargingStation(robot.location);
        if (charger) {
          mission.path.waypoints = [charger, ...mission.path.waypoints];
          this.logger.info(`Re-routing robot ${robot.id} to charging station`);
        }
      } else if (reason.includes('weather') || reason.includes('road') || reason.includes('hazard')) {
        const alternativePath = await this.computeAlternativePath(mission.path);
        mission.path = alternativePath;
        this.logger.info(`Alternative path computed for mission ${missionId}`);
      }
      if (robot.battery.level < 20) {
        robot.status = RobotStatus.Charging;
        this.robots.set(robot.id, robot);
        mission.status = 'paused';
        this.logger.warn(`Mission ${missionId} paused due to low battery`);
      }
    }
    mission.updatedAt = new Date().toISOString();
    this.missions.set(missionId, mission);
    return mission;
  }

  async scheduleBatteryAware(robotId: string, mission: Mission): Promise<boolean> {
    const robot = this.robots.get(robotId);
    if (!robot) return false;
    const requiredEnergy = mission.path.distance * 0.4;
    const availableEnergy = robot.battery.level * 0.01 * robot.battery.voltage * robot.battery.estimatedRemainingMinutes / 60;
    if (availableEnergy < requiredEnergy * 1.2) {
      this.logDecision('battery_check', { robotId, requiredEnergy, availableEnergy }, { canSchedule: false }, 'Insufficient battery');
      this.logger.warn(`Robot ${robotId} has insufficient battery for mission ${mission.id}`);
      return false;
    }
    this.logger.info(`Robot ${robotId} battery sufficient for mission ${mission.id}`);
    return true;
  }

  async getDecisionLog(missionId: string): Promise<DecisionLog[]> {
    return this.missionHistory.get(missionId) || [];
  }

  async validateMission(mission: Mission): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    if (!mission.robotId) issues.push('No robot assigned');
    if (mission.path.distance <= 0) issues.push('Invalid path distance');
    if (mission.energy.estimated <= 0) issues.push('Invalid energy estimate');
    if (mission.priority < 1 || mission.priority > 10) issues.push('Priority out of range (1-10)');
    return { valid: issues.length === 0, issues };
  }

  async estimateEnergy(robotId: string, path: { start: GeoLocation; waypoints: GeoLocation[]; end: GeoLocation }): Promise<number> {
    const robot = this.robots.get(robotId);
    if (!robot) throw new Error(`Robot ${robotId} not found`);
    const dist = this.calculatePathDistance({
      start: path.start, waypoints: path.waypoints, end: path.end,
      distance: 0, estimatedDuration: 0
    });
    const baseEnergy = dist * 0.4;
    const loadFactor = robot.load.current > 0 ? 1 + (robot.load.current / robot.load.maxCapacity) * 0.3 : 1;
    const terrainFactor = 1.1;
    return baseEnergy * loadFactor * terrainFactor;
  }

  private calculateDistance(a: GeoLocation, b: GeoLocation): number {
    const R = 6371e3;
    const φ1 = a.lat * Math.PI / 180;
    const φ2 = b.lat * Math.PI / 180;
    const Δφ = (b.lat - a.lat) * Math.PI / 180;
    const Δλ = (b.lng - a.lng) * Math.PI / 180;
    return R * 2 * Math.atan2(Math.sqrt(Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2), Math.sqrt(1 - (Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2)));
  }

  private calculatePathDistance(path: MissionPath): number {
    let dist = this.calculateDistance(path.start, path.end);
    for (let i = 0; i < path.waypoints.length - 1; i++) {
      dist += this.calculateDistance(path.waypoints[i], path.waypoints[i + 1]);
    }
    return dist;
  }

  private optimizeWaypoints(path: MissionPath): MissionPath {
    if (path.waypoints.length <= 2) return path;
    const optimized: GeoLocation[] = [path.waypoints[0]];
    for (let i = 1; i < path.waypoints.length - 1; i++) {
      const prev = path.waypoints[i - 1];
      const curr = path.waypoints[i];
      const next = path.waypoints[i + 1];
      const angle = this.calculateAngle(prev, curr, next);
      if (angle > 150) {
        optimized.push(curr);
      }
    }
    optimized.push(path.waypoints[path.waypoints.length - 1]);
    return { ...path, waypoints: optimized };
  }

  private calculateAngle(a: GeoLocation, b: GeoLocation, c: GeoLocation): number {
    const ab = this.calculateDistance(a, b);
    const bc = this.calculateDistance(b, c);
    const ac = this.calculateDistance(a, c);
    return Math.acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc)) * 180 / Math.PI;
  }

  private async getNearestChargingStation(location: GeoLocation): Promise<GeoLocation | null> {
    return { lat: location.lat + 0.001, lng: location.lng + 0.001 };
  }

  private async computeAlternativePath(path: MissionPath): Promise<MissionPath> {
    const deviation = 0.002;
    return {
      ...path,
      waypoints: path.waypoints.map(wp => ({ lat: wp.lat + deviation, lng: wp.lng + deviation }))
    };
  }

  private logDecision(type: string, input: unknown, output: unknown, reason: string): void {
    const log: DecisionLog = {
      id: uuid(), type, agent: 'MissionPlanner',
      input, output, alternatives: [],
      reason, confidence: 0.9, timestamp: new Date().toISOString(),
      projectId: 'craep'
    };
    this.decisionLogs.push(log);
    this.logger.debug(`Decision: ${type} - ${reason}`);
  }
}
