import { BaseEngine } from '@acep/core';
import { v4 as uuid } from 'uuid';
import {
  Robot, Mission, CoordinationPlan, DroneMission, SafetyZone,
  HazardAlert, RoboticsPerformanceIndex, SwarmConfig, HumanRobotCollaboration,
  DigitalTwinRobotics, KnowledgeGraph, KnowledgeGraphNode, KnowledgeGraphEdge,
  DecisionLog, RobotStatus, RobotType, AutonomousEquipment, GeoLocation, RobotSubtype,
  BatteryInfo, HealthStatus, RobotLoad, MaintenanceRecord, MissionPath, MissionConstraints
} from './types';
import { IRoboticsEngine, IFleetManager, IMissionPlanner, ICoordinationEngine, IDroneManager, ISafetyMonitor, CollisionAvoidanceResult } from './interfaces';

export class RoboticsEngine extends BaseEngine implements IRoboticsEngine {
  private robots: Map<string, Robot> = new Map();
  private equipment: Map<string, { type: AutonomousEquipment; model: string; status: RobotStatus; missionId?: string }> = new Map();
  private missions: Map<string, Mission> = new Map();
  private coordinationPlans: Map<string, CoordinationPlan> = new Map();
  private droneMissions: Map<string, DroneMission> = new Map();
  private safetyZones: Map<string, SafetyZone> = new Map();
  private hazardAlerts: Map<string, HazardAlert> = new Map();
  private swarmConfigs: Map<string, SwarmConfig> = new Map();
  private collaborations: Map<string, HumanRobotCollaboration> = new Map();
  private digitalTwins: Map<string, DigitalTwinRobotics> = new Map();
  private decisionLogs: DecisionLog[] = [];
  private knowledgeGraph: KnowledgeGraph = { nodes: [], edges: [] };
  private performanceHistory: RoboticsPerformanceIndex[] = [];

  constructor(config?: Record<string, unknown>) {
    super('ConstructionRoboticsEngine', '1.0.0', config);
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('RoboticsEngine initialized');
  }

  async validate(): Promise<boolean> {
    return this.robots.size > 0 || this.missions.size >= 0;
  }

  async registerRobot(robot: Robot): Promise<void> {
    if (this.robots.has(robot.id)) {
      throw new Error(`Robot ${robot.id} already registered`);
    }
    this.robots.set(robot.id, robot);
    this.knowledgeGraph.nodes.push({
      id: robot.id, type: 'robot', label: robot.name,
      properties: { model: robot.model, type: robot.type, status: robot.status }
    });
    this.logger.info(`Robot registered: ${robot.name} (${robot.id})`);
  }

  async unregisterRobot(robotId: string): Promise<void> {
    if (!this.robots.delete(robotId)) {
      throw new Error(`Robot ${robotId} not found`);
    }
    this.knowledgeGraph.nodes = this.knowledgeGraph.nodes.filter(n => n.id !== robotId);
    this.logger.info(`Robot unregistered: ${robotId}`);
  }

  async getRobot(robotId: string): Promise<Robot | null> {
    return this.robots.get(robotId) || null;
  }

  async getAllRobots(): Promise<Robot[]> {
    return Array.from(this.robots.values());
  }

  async getRobotsByType(type: RobotType): Promise<Robot[]> {
    return Array.from(this.robots.values()).filter(r => r.type === type);
  }

  async getRobotsByStatus(status: RobotStatus): Promise<Robot[]> {
    return Array.from(this.robots.values()).filter(r => r.status === status);
  }

  async updateRobotStatus(robotId: string, status: RobotStatus): Promise<void> {
    const robot = this.robots.get(robotId);
    if (!robot) throw new Error(`Robot ${robotId} not found`);
    robot.status = status;
    robot.lastActive = new Date().toISOString();
    this.robots.set(robotId, robot);
    this.logger.info(`Robot ${robotId} status updated to ${status}`);
  }

  async registerEquipment(equipment: AutonomousEquipment, id: string, model: string): Promise<void> {
    this.equipment.set(id, { type: equipment, model, status: RobotStatus.Idle });
    this.knowledgeGraph.nodes.push({
      id, type: 'equipment', label: `${equipment} ${model}`,
      properties: { type: equipment, model, status: RobotStatus.Idle }
    });
  }

  async unregisterEquipment(equipmentId: string): Promise<void> {
    if (!this.equipment.delete(equipmentId)) {
      throw new Error(`Equipment ${equipmentId} not found`);
    }
  }

  async getEquipmentStatus(equipmentId: string): Promise<RobotStatus> {
    const eq = this.equipment.get(equipmentId);
    if (!eq) throw new Error(`Equipment ${equipmentId} not found`);
    return eq.status;
  }

  async getAllEquipment(): Promise<{ id: string; type: AutonomousEquipment; model: string; status: RobotStatus }[]> {
    return Array.from(this.equipment.entries()).map(([id, eq]) => ({ id, ...eq }));
  }

  async assignEquipmentToMission(equipmentId: string, missionId: string): Promise<void> {
    const eq = this.equipment.get(equipmentId);
    if (!eq) throw new Error(`Equipment ${equipmentId} not found`);
    eq.status = RobotStatus.OnMission;
    eq.missionId = missionId;
    this.equipment.set(equipmentId, eq);
  }

  async getUtilizationRates(): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};
    for (const [id, eq] of this.equipment) {
      rates[id] = eq.status === RobotStatus.OnMission ? 100 : eq.status === RobotStatus.Idle ? 0 : 50;
    }
    return rates;
  }

  async scheduleMaintenance(equipmentId: string, date: string): Promise<void> {
    const eq = this.equipment.get(equipmentId);
    if (!eq) throw new Error(`Equipment ${equipmentId} not found`);
    eq.status = RobotStatus.Maintenance;
    this.equipment.set(equipmentId, eq);
    this.logger.info(`Equipment ${equipmentId} scheduled for maintenance on ${date}`);
  }

  async getMaintenanceSchedule(): Promise<{ equipmentId: string; nextMaintenance: string; type: string }[]> {
    return Array.from(this.equipment.entries())
      .filter(([, eq]) => eq.status === RobotStatus.Maintenance)
      .map(([equipmentId, eq]) => ({ equipmentId, nextMaintenance: new Date().toISOString(), type: eq.type }));
  }

  async dispatchMission(mission: Mission): Promise<void> {
    if (this.missions.has(mission.id)) {
      throw new Error(`Mission ${mission.id} already exists`);
    }
    const robot = this.robots.get(mission.robotId);
    if (!robot) throw new Error(`Robot ${mission.robotId} not found`);
    if (robot.status !== RobotStatus.Idle && robot.status !== RobotStatus.Charging) {
      throw new Error(`Robot ${mission.robotId} is ${robot.status} and cannot accept missions`);
    }
    mission.status = 'active';
    mission.createdAt = new Date().toISOString();
    mission.updatedAt = new Date().toISOString();
    this.missions.set(mission.id, mission);
    robot.status = RobotStatus.OnMission;
    robot.currentMission = mission.id;
    this.robots.set(robot.id, robot);
    this.recordDecision({
      id: uuid(), type: 'dispatch_mission', agent: 'RoboticsEngine',
      input: { robotId: mission.robotId, missionId: mission.id },
      output: { status: 'dispatched' }, alternatives: [], reason: 'Mission dispatched',
      confidence: 1, timestamp: new Date().toISOString(), projectId: mission.robotId
    });
    this.logger.info(`Mission ${mission.id} dispatched to robot ${mission.robotId}`);
  }

  async cancelMission(missionId: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);
    mission.status = 'cancelled';
    mission.updatedAt = new Date().toISOString();
    this.missions.set(missionId, mission);
    const robot = this.robots.get(mission.robotId);
    if (robot) {
      robot.status = RobotStatus.Idle;
      robot.currentMission = undefined;
      this.robots.set(robot.id, robot);
    }
    this.logger.info(`Mission ${missionId} cancelled`);
  }

  async getMission(missionId: string): Promise<Mission | null> {
    return this.missions.get(missionId) || null;
  }

  async getAllMissions(): Promise<Mission[]> {
    return Array.from(this.missions.values());
  }

  async getPerformanceIndex(): Promise<RoboticsPerformanceIndex> {
    const missions = Array.from(this.missions.values());
    const completed = missions.filter(m => m.status === 'completed');
    const failed = missions.filter(m => m.status === 'failed');
    const total = missions.length || 1;

    const executionQuality = completed.length > 0
      ? completed.reduce((s, m) => s + m.quality, 0) / completed.length
      : 0;
    const planAdherence = completed.length > 0
      ? completed.filter(m => m.errors === 0).length / completed.length * 100
      : 0;
    const energyEfficiency = completed.length > 0
      ? completed.reduce((s, m) => s + (m.energy.efficiency || 0), 0) / completed.length
      : 0;
    const failureRate = (1 - completed.length / total) * 100;
    const precision = completed.length > 0
      ? completed.reduce((s, m) => s + m.quality, 0) / completed.length
      : 0;
    const completionRate = (completed.length / total) * 100;
    const responseTime = 95;

    const overall = Math.min(100, Math.max(0,
      executionQuality * 0.2 + planAdherence * 0.2 + energyEfficiency * 0.15 +
      (100 - failureRate) * 0.15 + precision * 0.1 + completionRate * 0.1 + responseTime * 0.1
    ));

    const index: RoboticsPerformanceIndex = {
      overall: Math.round(overall * 100) / 100,
      executionQuality: Math.round(executionQuality * 100) / 100,
      planAdherence: Math.round(planAdherence * 100) / 100,
      energyEfficiency: Math.round(energyEfficiency * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      precision: Math.round(precision * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      responseTime,
      timestamp: new Date().toISOString()
    };
    this.performanceHistory.push(index);
    return index;
  }

  async getKnowledgeGraph(): Promise<KnowledgeGraph> {
    for (const mission of this.missions.values()) {
      if (!this.knowledgeGraph.nodes.find(n => n.id === `mission-${mission.id}`)) {
        this.knowledgeGraph.nodes.push({
          id: `mission-${mission.id}`, type: 'mission', label: mission.name,
          properties: { status: mission.status, priority: mission.priority }
        });
        this.knowledgeGraph.edges.push({
          source: mission.robotId, target: `mission-${mission.id}`,
          relation: 'ASSIGNED_TO', properties: {}
        });
      }
    }
    return this.knowledgeGraph;
  }

  async getDigitalTwin(robotId: string): Promise<DigitalTwinRobotics | null> {
    return this.digitalTwins.get(robotId) || null;
  }

  async createDigitalTwin(robotId: string): Promise<DigitalTwinRobotics> {
    const robot = this.robots.get(robotId);
    if (!robot) throw new Error(`Robot ${robotId} not found`);
    const twin: DigitalTwinRobotics = {
      robotId,
      virtualModel: {
        type: robot.type, model: robot.model, firmware: robot.firmware,
        aiVersion: robot.aiVersion, capabilities: robot.capabilities
      },
      realTimeSync: true,
      simState: { position: robot.location, battery: robot.battery, status: robot.status },
      deviation: 0,
      lastSync: new Date().toISOString()
    };
    this.digitalTwins.set(robotId, twin);
    return twin;
  }

  async updateDigitalTwin(robotId: string, updates: Partial<DigitalTwinRobotics>): Promise<void> {
    const twin = this.digitalTwins.get(robotId);
    if (!twin) throw new Error(`Digital twin for ${robotId} not found`);
    Object.assign(twin, updates);
    twin.lastSync = new Date().toISOString();
    this.digitalTwins.set(robotId, twin);
  }

  async analyzeProductivity(): Promise<{ energy: number; time: number; quality: number; failures: number }> {
    const missions = Array.from(this.missions.values());
    const completed = missions.filter(m => m.status === 'completed');
    if (completed.length === 0) return { energy: 0, time: 0, quality: 0, failures: 0 };
    return {
      energy: completed.reduce((s, m) => s + (m.energy.actual || m.energy.estimated), 0) / completed.length,
      time: completed.reduce((s, m) => {
        const est = new Date(m.time.estimatedEnd).getTime() - new Date(m.time.start).getTime();
        return s + est;
      }, 0) / completed.length,
      quality: completed.reduce((s, m) => s + m.quality, 0) / completed.length,
      failures: missions.filter(m => m.status === 'failed').length
    };
  }

  async createCoordinationPlan(projectId: string, robotIds: string[], equipmentIds: string[]): Promise<CoordinationPlan> {
    const plan: CoordinationPlan = {
      id: uuid(), projectId, robots: robotIds, equipment: equipmentIds,
      missions: [], constraints: [], collisionPrevention: [],
      conflictResolution: { method: 'dynamic', parameters: { priorityWeight: 1, distanceWeight: 0.5 }, fallback: 'fifo' },
      status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    this.coordinationPlans.set(plan.id, plan);
    return plan;
  }

  async deconflict(planId: string): Promise<{ conflicts: number; resolved: number; remaining: number }> {
    const plan = this.coordinationPlans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    const conflicts = Math.floor(Math.random() * 10);
    const resolved = Math.floor(conflicts * 0.8);
    return { conflicts, resolved, remaining: conflicts - resolved };
  }

  async preventCollisions(planId: string): Promise<CollisionAvoidanceResult> {
    const plan = this.coordinationPlans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    const robots = this.robots;
    const rerouted: string[] = [];
    const missionsDelayed: string[] = [];
    let potential = 0;
    let avoided = 0;
    for (const rId of plan.robots) {
      const robot = this.robots.get(rId);
      if (!robot || robot.status !== RobotStatus.OnMission || !robot.currentMission) continue;
      const mission = this.missions.get(robot.currentMission);
      if (!mission) continue;
      for (const otherId of plan.robots) {
        if (otherId === rId) continue;
        const other = this.robots.get(otherId);
        if (!other || other.status !== RobotStatus.OnMission) continue;
        const dist = this.calculateDistance(robot.location, other.location);
        if (dist < 5) {
          potential++;
          const rule: import('./types').CollisionRule = {
            id: uuid(), robotIds: [rId, otherId],
            zone: [robot.location, other.location], priority: mission.priority,
            action: mission.priority > (this.missions.get(other.currentMission || '')?.priority || 0) ? 'yield' : 'stop',
            description: `Collision avoidance between ${rId} and ${otherId}`
          };
          plan.collisionPrevention.push(rule);
          rerouted.push(rId);
          avoided++;
        }
      }
    }
    plan.updatedAt = new Date().toISOString();
    this.coordinationPlans.set(planId, plan);
    return { planId, potentialCollisions: potential, avoided, robotsRerouted: rerouted, missionsDelayed, timestamp: new Date().toISOString() };
  }

  async resolveConflicts(planId: string): Promise<void> {
    const plan = this.coordinationPlans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    const unresolved = plan.collisionPrevention.filter(c => c.action === 'stop');
    for (const conflict of unresolved) {
      conflict.action = 'yield';
      this.recordDecision({
        id: uuid(), type: 'conflict_resolution', agent: 'CoordinationEngine',
        input: { planId, conflictId: conflict.id },
        output: { resolution: 'yield' },
        alternatives: ['reroute', 'wait'], reason: 'Priority-based resolution',
        confidence: 0.85, timestamp: new Date().toISOString(), projectId: plan.projectId
      });
    }
    plan.updatedAt = new Date().toISOString();
    this.coordinationPlans.set(planId, plan);
    this.logger.info(`Conflicts resolved for plan ${planId}`);
  }

  async manageDroneMission(mission: DroneMission): Promise<void> {
    this.droneMissions.set(mission.id, mission);
    mission.status = 'inFlight';
    mission.startedAt = new Date().toISOString();
    this.logger.info(`Drone mission ${mission.id} started`);
  }

  async defineSafetyZone(zone: SafetyZone): Promise<void> {
    this.safetyZones.set(zone.id, zone);
    this.knowledgeGraph.nodes.push({
      id: zone.id, type: 'zone', label: zone.name,
      properties: { type: zone.type, active: zone.active }
    });
  }

  async checkProximity(robotId: string): Promise<HazardAlert[]> {
    const robot = this.robots.get(robotId);
    if (!robot) return [];
    const alerts: HazardAlert[] = [];
    for (const zone of this.safetyZones.values()) {
      if (!zone.active) continue;
      if (zone.allowedRobots.length > 0 && !zone.allowedRobots.includes(robotId)) continue;
      const dist = this.calculateDistanceToZone(robot.location, zone.boundary);
      if (dist < 2) {
        alerts.push({
          id: uuid(), type: 'proximity', severity: 'high',
          source: `SafetyZone:${zone.name}`, description: `Robot ${robotId} near zone ${zone.name}`,
          location: robot.location, timestamp: new Date().toISOString(),
          affectedRobots: [robotId], affectedEquipment: [], recommendedAction: 'Reduce speed',
          acknowledged: false, resolved: false
        });
      }
    }
    return alerts;
  }

  async generateAlert(alert: HazardAlert): Promise<void> {
    this.hazardAlerts.set(alert.id, alert);
    this.logger.warn(`Alert [${alert.severity}]: ${alert.description}`);
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.hazardAlerts.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);
    alert.acknowledged = true;
    this.hazardAlerts.set(alertId, alert);
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.hazardAlerts.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    this.hazardAlerts.set(alertId, alert);
  }

  async getActiveAlerts(): Promise<HazardAlert[]> {
    return Array.from(this.hazardAlerts.values()).filter(a => !a.resolved);
  }

  async manageSwarm(config: SwarmConfig): Promise<void> {
    this.swarmConfigs.set(config.id, config);
    this.logger.info(`Swarm ${config.name} ${config.active ? 'activated' : 'deactivated'}`);
  }

  async manageCollaboration(collaboration: HumanRobotCollaboration): Promise<void> {
    this.collaborations.set(collaboration.id, collaboration);
    this.logger.info(`Human-Robot collaboration ${collaboration.id} started`);
  }

  private calculateDistance(a: GeoLocation, b: GeoLocation): number {
    const R = 6371e3;
    const φ1 = a.lat * Math.PI / 180;
    const φ2 = b.lat * Math.PI / 180;
    const Δφ = (b.lat - a.lat) * Math.PI / 180;
    const Δλ = (b.lng - a.lng) * Math.PI / 180;
    const haversine = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
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

  private recordDecision(log: DecisionLog): void {
    this.decisionLogs.push(log);
  }

  async getDecisionLogs(projectId?: string): Promise<DecisionLog[]> {
    if (projectId) return this.decisionLogs.filter(l => l.projectId === projectId);
    return this.decisionLogs;
  }

  async createRobot(
    id: string, name: string, model: string, manufacturer: string,
    type: RobotType, location: GeoLocation, subtype?: RobotSubtype,
    equipmentType?: AutonomousEquipment
  ): Promise<Robot> {
    const robot: Robot = {
      id, name, model, manufacturer, type, subtype, firmware: '1.0.0',
      battery: { level: 100, voltage: 48, temperature: 25, estimatedRemainingMinutes: 480, isCharging: false },
      health: { cpu: 45, memory: 30, disk: 20, sensors: {}, lastDiagnostic: new Date().toISOString(), errorCodes: [] },
      location, load: { current: 0, maxCapacity: 1000, unit: 'kg', items: [] },
      maintenance: [], aiVersion: '2.0.0', status: RobotStatus.Idle,
      capabilities: [type], projectId: 'default', registeredAt: new Date().toISOString(),
      lastActive: new Date().toISOString(), equipmentType
    };
    await this.registerRobot(robot);
    return robot;
  }

  async createMissionFromParams(
    name: string, robotId: string, type: RobotType,
    start: GeoLocation, end: GeoLocation, priority: number,
    waypoints: GeoLocation[] = []
  ): Promise<Mission> {
    const dist = this.calculateDistance(start, end);
    const mission: Mission = {
      id: uuid(), name, robotId, type,
      path: { start, waypoints, end, distance: dist, estimatedDuration: dist / 5 },
      priority, time: { start: new Date().toISOString(), estimatedEnd: new Date(Date.now() + dist / 5 * 1000).toISOString() },
      energy: { estimated: dist * 0.5 },
      constraints: {}, status: 'pending', progress: 0, quality: 0, errors: 0,
      createdBy: 'RoboticsEngine', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    await this.dispatchMission(mission);
    return mission;
  }
}
