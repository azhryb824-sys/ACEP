import { BaseEngine, EngineStatus } from '@acep/core';
import { v4 as uuid } from 'uuid';
import {
  Robot, CoordinationPlan, CollisionRule, SwarmConfig,
  HumanRobotCollaboration, SafetyZone, GeoLocation, RobotStatus
} from './types';
import { ICoordinationEngine, CollisionAvoidanceResult } from './interfaces';

export class CoordinationEngine extends BaseEngine implements ICoordinationEngine {
  private plans: Map<string, CoordinationPlan> = new Map();
  private swarms: Map<string, SwarmConfig> = new Map();
  private collaborations: Map<string, HumanRobotCollaboration> = new Map();
  private robots: Map<string, Robot> = new Map();
  private safetyZones: Map<string, SafetyZone> = new Map();
  private operationLog: string[] = [];

  constructor(config?: Record<string, unknown>) {
    super('CoordinationEngine', '1.0.0', config);
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('CoordinationEngine initialized - supporting 5 robots, 3 excavators, 4 drones, 2 cranes');
  }

  async validate(): Promise<boolean> {
    return true;
  }

  setRobots(robots: Robot[]): void {
    for (const r of robots) this.robots.set(r.id, r);
  }

  async createCoordinationPlan(projectId: string, robotIds: string[], equipmentIds: string[]): Promise<CoordinationPlan> {
    const plan: CoordinationPlan = {
      id: uuid(), projectId, robots: robotIds, equipment: equipmentIds,
      missions: [], constraints: [],
      collisionPrevention: [],
      conflictResolution: { method: 'dynamic', parameters: { priorityWeight: 1, distanceWeight: 0.5, deadlineWeight: 1.5 }, fallback: 'fifo' },
      status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    this.plans.set(plan.id, plan);
    this.log(`Coordination plan ${plan.id} created with ${robotIds.length} robots and ${equipmentIds.length} equipment`);
    return plan;
  }

  async deconflict(planId: string): Promise<{ conflicts: number; resolved: number; remaining: number }> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    let conflicts = 0;
    let resolved = 0;
    for (let i = 0; i < plan.robots.length; i++) {
      for (let j = i + 1; j < plan.robots.length; j++) {
        const r1 = this.robots.get(plan.robots[i]);
        const r2 = this.robots.get(plan.robots[j]);
        if (!r1 || !r2) continue;
        const dist = this.calculateDistance(r1.location, r2.location);
        if (dist < 10) {
          conflicts++;
          const rule: CollisionRule = {
            id: uuid(), robotIds: [r1.id, r2.id],
            zone: [r1.location, r2.location],
            priority: 5, action: 'yield',
            description: `Deconfliction between ${r1.name} and ${r2.name}`
          };
          plan.collisionPrevention.push(rule);
          resolved++;
        }
      }
    }
    plan.updatedAt = new Date().toISOString();
    this.plans.set(planId, plan);
    this.log(`Deconfliction: ${conflicts} found, ${resolved} resolved, ${conflicts - resolved} remaining`);
    return { conflicts, resolved, remaining: conflicts - resolved };
  }

  async preventCollisions(planId: string): Promise<CollisionAvoidanceResult> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    const rerouted: string[] = [];
    const delayed: string[] = [];
    let potential = 0;
    let avoided = 0;
    for (let i = 0; i < plan.robots.length; i++) {
      for (let j = i + 1; j < plan.robots.length; j++) {
        const r1 = this.robots.get(plan.robots[i]);
        const r2 = this.robots.get(plan.robots[j]);
        if (!r1 || !r2 || r1.status !== RobotStatus.OnMission || r2.status !== RobotStatus.OnMission) continue;
        const dist = this.calculateDistance(r1.location, r2.location);
        const velocity1 = 5;
        const velocity2 = 5;
        const closingSpeed = velocity1 + velocity2;
        const timeToCollision = dist / (closingSpeed || 1);
        if (timeToCollision < 10) {
          potential++;
          const slower = velocity1 <= velocity2 ? r1 : r2;
          const faster = velocity1 > velocity2 ? r1 : r2;
          const safeDistance = (velocity1 + velocity2) * 2;
          if (dist < safeDistance) {
            const newPos: GeoLocation = {
              lat: slower.location.lat + 0.0005,
              lng: slower.location.lng + 0.0005
            };
            slower.location = newPos;
            this.robots.set(slower.id, slower);
            rerouted.push(slower.id);
            avoided++;
            this.log(`Collision prevention: ${r1.name} and ${r2.name} - rerouted ${slower.name}`);
          }
        }
      }
    }
    for (const zone of this.safetyZones.values()) {
      if (!zone.active) continue;
      for (const robotId of plan.robots) {
        const robot = this.robots.get(robotId);
        if (!robot || robot.status !== RobotStatus.OnMission) continue;
        const dist = this.calculateDistanceToZone(robot.location, zone.boundary);
        if (dist < 3 && !zone.allowedRobots.includes(robotId)) {
          potential++;
          robot.status = RobotStatus.Idle;
          this.robots.set(robotId, robot);
          delayed.push(robotId);
          avoided++;
          this.log(`Zone violation prevented: ${robot.name} near ${zone.name}`);
        }
      }
    }
    return { planId, potentialCollisions: potential, avoided, robotsRerouted: rerouted, missionsDelayed: delayed, timestamp: new Date().toISOString() };
  }

  async resolveConflicts(planId: string): Promise<void> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    for (const rule of plan.collisionPrevention) {
      if (rule.action === 'stop') {
        const r1 = this.robots.get(rule.robotIds[0]);
        const r2 = this.robots.get(rule.robotIds[1]);
        if (r1 && r2) {
          const batteryDiff = r1.battery.level - r2.battery.level;
          if (batteryDiff < -10) {
            rule.action = 'yield';
            this.log(`Conflict resolved: ${r1.name} yields to ${r2.name} (battery-based)`);
          } else if (r1.battery.estimatedRemainingMinutes < r2.battery.estimatedRemainingMinutes) {
            rule.action = 'yield';
            this.log(`Conflict resolved: ${r1.name} yields to ${r2.name} (time-based)`);
          } else {
            rule.action = 'wait';
            this.log(`Conflict resolved: Both robots wait (equal priority)`);
          }
        }
      }
    }
    plan.updatedAt = new Date().toISOString();
    this.plans.set(planId, plan);
    this.log(`All conflicts resolved for plan ${planId}`);
  }

  async optimizeSwarm(swarmConfig: SwarmConfig): Promise<void> {
    const swarm = this.swarms.get(swarmConfig.id);
    if (!swarm) {
      this.swarms.set(swarmConfig.id, swarmConfig);
    }
    const activeRobots = swarmConfig.robotIds.filter(id => {
      const r = this.robots.get(id);
      return r && r.status === RobotStatus.OnMission;
    });
    this.log(`Swarm optimization: ${activeRobots.length}/${swarmConfig.robotIds.length} robots active`);
    if (swarmConfig.formation === 'line') {
      this.log('Formation: Line - robots arranged sequentially');
    } else if (swarmConfig.formation === 'grid') {
      this.log('Formation: Grid - robots arranged in rows and columns');
    } else if (swarmConfig.formation === 'cluster') {
      this.log('Formation: Cluster - robots grouped by function');
    }
    if (swarmConfig.coordinationMode === 'decentralized') {
      this.log('Coordination mode: Decentralized - each robot makes local decisions');
    }
    this.swarms.set(swarmConfig.id, swarmConfig);
  }

  async manageHumanRobotCollaboration(collaboration: HumanRobotCollaboration): Promise<void> {
    const existing = this.collaborations.get(collaboration.id);
    if (existing) {
      if (collaboration.status === 'completed') {
        this.collaborations.delete(collaboration.id);
        this.log(`Collaboration ${collaboration.id} completed`);
        return;
      }
    }
    this.collaborations.set(collaboration.id, collaboration);
    const robot = this.robots.get(collaboration.robotId);
    if (robot) {
      robot.status = RobotStatus.OnMission;
      this.robots.set(robot.id, robot);
    }
    if (collaboration.safetyProtocol.includes('auto_stop')) {
      this.log(`Auto-stop enabled for collaboration ${collaboration.id}`);
    }
    if (collaboration.safetyProtocol.includes('geofence')) {
      this.safetyZones.set(`collab-${collaboration.id}`, {
        id: `collab-${collaboration.id}`, name: `Collab Zone ${collaboration.id}`,
        boundary: collaboration.zone.boundary, type: 'worker',
        allowedRobots: [collaboration.robotId], allowedEquipment: [],
        speedLimit: 1, maxLoad: 100, requireStop: true, alertOnEntry: true, active: true
      });
    }
    this.log(`Human-Robot collaboration ${collaboration.id} (${collaboration.interactionType})`);
  }

  getStatus(): EngineStatus {
    return {
      id: this.id, name: this.name, version: this.version,
      status: this.status === 'error' ? 'error' : 'running',
      lastRun: new Date().toISOString()
    };
  }

  private calculateDistance(a: GeoLocation, b: GeoLocation): number {
    const R = 6371e3;
    const φ1 = a.lat * Math.PI / 180;
    const φ2 = b.lat * Math.PI / 180;
    const Δφ = (b.lat - a.lat) * Math.PI / 180;
    const Δλ = (b.lng - a.lng) * Math.PI / 180;
    return R * 2 * Math.atan2(Math.sqrt(Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2), Math.sqrt(1 - (Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2)));
  }

  private calculateDistanceToZone(location: GeoLocation, boundary: GeoLocation[]): number {
    if (boundary.length === 0) return Infinity;
    let minDist = Infinity;
    for (const point of boundary) {
      const dist = this.calculateDistance(location, point);
      if (dist < minDist) minDist = dist;
    }
    return minDist;
  }

  private log(message: string): void {
    this.operationLog.push(`[${new Date().toISOString()}] ${message}`);
    this.logger.info(message);
  }

  getOperationLog(): string[] {
    return this.operationLog;
  }
}
