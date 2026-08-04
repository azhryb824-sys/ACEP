"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseRoboticsControlCenter = void 0;
const core_1 = require("@acep/core");
const uuid_1 = require("uuid");
const types_1 = require("./types");
class EnterpriseRoboticsControlCenter extends core_1.BaseEngine {
    robots = new Map();
    equipment = new Map();
    missions = new Map();
    droneMissions = new Map();
    alerts = new Map();
    decisionLogs = [];
    projectRegistry = new Map();
    constructor(config) {
        super('EnterpriseRoboticsControlCenter', '1.0.0', config);
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('Enterprise Robotics Control Center initialized');
    }
    async validate() {
        return true;
    }
    registerProject(projectId, projectName) {
        this.projectRegistry.set(projectId, projectName);
    }
    addRobot(robot) {
        this.robots.set(robot.id, robot);
    }
    addEquipment(id, type, model) {
        this.equipment.set(id, { type, model, status: types_1.RobotStatus.Idle });
    }
    addMission(mission) {
        this.missions.set(mission.id, mission);
    }
    addAlert(alert) {
        this.alerts.set(alert.id, alert);
    }
    getDashboard() {
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
            onlineRobots: allRobots.filter(r => r.status === types_1.RobotStatus.OnMission || r.status === types_1.RobotStatus.Idle).length,
            offlineRobots: allRobots.filter(r => r.status === types_1.RobotStatus.Offline).length,
            chargingRobots: allRobots.filter(r => r.status === types_1.RobotStatus.Charging).length,
            maintenanceCount: allRobots.filter(r => r.status === types_1.RobotStatus.Maintenance).length,
            errorCount: allRobots.filter(r => r.status === types_1.RobotStatus.Error).length,
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
    getProjectView(projectId) {
        if (!this.projectRegistry.has(projectId))
            return null;
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
    async getRobotsByProject(projectId) {
        return Array.from(this.robots.values()).filter(r => r.projectId === projectId);
    }
    async getRobotsByStatus(status) {
        return Array.from(this.robots.values()).filter(r => r.status === status);
    }
    async getRobotsByType(type) {
        return Array.from(this.robots.values()).filter(r => r.type === type);
    }
    async getRobotsNearLocation(location, radiusMeters) {
        return Array.from(this.robots.values()).filter(r => {
            const dist = this.calculateDistance(r.location, location);
            return dist <= radiusMeters;
        });
    }
    async getActiveMissions() {
        return Array.from(this.missions.values()).filter(m => m.status === 'active');
    }
    async getMissionReport(missionId) {
        const mission = this.missions.get(missionId) || null;
        const robot = mission ? this.robots.get(mission.robotId) || null : null;
        const alerts = Array.from(this.alerts.values()).filter(a => a.affectedRobots.includes(mission?.robotId || ''));
        const decisions = this.decisionLogs.filter(d => d.input && typeof d.input === 'object' && 'missionId' in d.input && d.input.missionId === missionId);
        return { mission, robot, alerts, decisions };
    }
    async generateAnalyticsReport() {
        const overview = this.getDashboard();
        const byProject = {};
        for (const [projectId] of this.projectRegistry) {
            const view = this.getProjectView(projectId);
            if (view)
                byProject[projectId] = view;
        }
        return {
            overview,
            byProject,
            trends: { performance: [85, 87, 86, 88, 90], energy: [450, 420, 480, 410, 390], completion: [88, 90, 87, 91, 93] }
        };
    }
    async delegateTask(robotId, task, targetRobotId) {
        const robot = this.robots.get(robotId);
        const target = this.robots.get(targetRobotId);
        if (!robot || !target)
            throw new Error('Robot not found');
        this.recordDecision({
            id: (0, uuid_1.v4)(), type: 'task_delegation', agent: 'ControlCenter',
            input: { robotId, task, targetRobotId },
            output: { delegated: true }, alternatives: [],
            reason: `Task delegation from ${robot.name} to ${target.name}`,
            confidence: 0.95, timestamp: new Date().toISOString(), projectId: robot.projectId
        });
        this.logger.info(`Task delegated from ${robotId} to ${targetRobotId}: ${task}`);
    }
    async setPermissions(robotId, permissions) {
        const robot = this.robots.get(robotId);
        if (!robot)
            throw new Error('Robot not found');
        robot.capabilities = permissions;
        this.robots.set(robotId, robot);
        this.logger.info(`Permissions set for ${robotId}: ${permissions.join(', ')}`);
    }
    calculateDistance(a, b) {
        const R = 6371e3;
        const φ1 = a.lat * Math.PI / 180;
        const φ2 = b.lat * Math.PI / 180;
        const Δφ = (b.lat - a.lat) * Math.PI / 180;
        const Δλ = (b.lng - a.lng) * Math.PI / 180;
        return R * 2 * Math.atan2(Math.sqrt(Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2), Math.sqrt(1 - (Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2)));
    }
    recordDecision(log) {
        this.decisionLogs.push(log);
    }
}
exports.EnterpriseRoboticsControlCenter = EnterpriseRoboticsControlCenter;
//# sourceMappingURL=enterprise-control-center.js.map