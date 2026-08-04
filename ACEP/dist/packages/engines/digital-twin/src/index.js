"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalTwinEngine = void 0;
const core_1 = require("@acep/core");
class DigitalTwinEngine extends core_1.BaseEngine {
    knowledgeGraph;
    twin = null;
    stateHistory = [];
    scenarios = new Map();
    constructor(kg) {
        super('DigitalTwinEngine', '1.0.0');
        this.knowledgeGraph = kg;
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('DigitalTwinEngine initialized');
    }
    async validate() {
        return true;
    }
    async createTwin(building, facts) {
        this.setStatus('running');
        this.logger.info('Creating digital twin for project');
        const twin = {
            id: `twin-${building.id}`,
            projectId: building.id,
            building,
            facts,
            currentState: this.createInitialState(building, facts),
            lifecycle: this.initializeLifecycle(building),
            performanceMetrics: this.initializeMetrics(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: '1.0.0'
        };
        this.twin = twin;
        this.saveState(twin.currentState);
        this.setStatus('idle');
        return twin;
    }
    async updateTwin(changes) {
        if (!this.twin) {
            throw new Error('No twin exists. Call createTwin first.');
        }
        this.setStatus('running');
        this.logger.info('Updating digital twin');
        Object.assign(this.twin.building, changes);
        this.twin.currentState = this.calculateNewState(this.twin);
        this.twin.updatedAt = new Date().toISOString();
        this.saveState(this.twin.currentState);
        this.setStatus('idle');
        return this.twin;
    }
    async simulateScenario(scenario) {
        this.setStatus('running');
        this.logger.info(`Running simulation: ${scenario.name}`);
        if (!this.twin) {
            throw new Error('No twin exists. Call createTwin first.');
        }
        const result = {
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            timestamp: new Date().toISOString(),
            impacts: this.calculateImpacts(scenario, this.twin),
            predictions: this.generatePredictions(scenario, this.twin),
            recommendations: this.generateRecommendations(scenario, this.twin),
            confidence: this.calculateScenarioConfidence(scenario)
        };
        this.scenarios.set(scenario.id, scenario);
        this.setStatus('idle');
        return result;
    }
    async predictDelay(activityId) {
        if (!this.twin) {
            throw new Error('No twin exists.');
        }
        const probability = Math.random() * 0.4;
        const causes = [];
        const mitigation = [];
        if (probability > 0.2) {
            causes.push('Material shortage risk');
            causes.push('Weather dependency');
            mitigation.push('Pre-order materials');
            mitigation.push('Add buffer time');
        }
        return { probability, causes, mitigation };
    }
    async predictCostOverrun(category) {
        if (!this.twin) {
            throw new Error('No twin exists.');
        }
        const probability = Math.random() * 0.3;
        const amount = this.twin.building.skeleton.numFloors * 50000;
        const factors = ['Market inflation', 'Labor availability', 'Supply chain'];
        return { probability, amount, factors };
    }
    async comparePlannedVsActual() {
        if (!this.twin) {
            throw new Error('No twin exists.');
        }
        const planned = 100;
        const actual = this.twin.currentState.completionPercentage;
        const variance = actual - planned;
        const trend = variance > 0 ? 'Ahead' : variance < 0 ? 'Behind' : 'On Track';
        return { planned, actual, variance, trend };
    }
    async getPerformanceMetrics() {
        if (!this.twin) {
            throw new Error('No twin exists.');
        }
        return this.twin.performanceMetrics;
    }
    async getLifecycleStatus() {
        if (!this.twin) {
            throw new Error('No twin exists.');
        }
        return this.twin.lifecycle;
    }
    async runMonteCarloSimulation(iterations = 1000) {
        const durations = [];
        const baseDuration = 180;
        for (let i = 0; i < iterations; i++) {
            const variance = (Math.random() - 0.5) * 60;
            durations.push(baseDuration + variance);
        }
        durations.sort((a, b) => a - b);
        return {
            meanDuration: durations.reduce((s, d) => s + d, 0) / iterations,
            p50: durations[Math.floor(iterations * 0.5)],
            p80: durations[Math.floor(iterations * 0.8)],
            p95: durations[Math.floor(iterations * 0.95)],
            distribution: durations
        };
    }
    async optimizeResources() {
        return {
            suggestions: [
                'Increase labor crew size by 20% for critical activities',
                'Reorder equipment schedule to reduce idle time',
                'Consolidate material deliveries to reduce transport costs'
            ],
            expectedSavings: 0.15
        };
    }
    createInitialState(building, facts) {
        return {
            timestamp: new Date().toISOString(),
            completionPercentage: 0,
            activeActivities: [],
            completedActivities: [],
            resourceUtilization: {
                labor: 0.7,
                equipment: 0.6,
                materials: 0.8
            },
            qualityScore: 1.0,
            safetyScore: 1.0,
            risks: [],
            issues: []
        };
    }
    calculateNewState(twin) {
        const previousState = twin.currentState;
        const newState = {
            timestamp: new Date().toISOString(),
            completionPercentage: Math.min(previousState.completionPercentage + 0.05, 1),
            activeActivities: previousState.activeActivities,
            completedActivities: previousState.completedActivities,
            resourceUtilization: {
                labor: 0.7 + (Math.random() - 0.5) * 0.2,
                equipment: 0.6 + (Math.random() - 0.5) * 0.2,
                materials: 0.8 + (Math.random() - 0.5) * 0.1
            },
            qualityScore: 0.95 + Math.random() * 0.05,
            safetyScore: 0.98 + Math.random() * 0.02,
            risks: this.detectNewRisks(twin),
            issues: []
        };
        return newState;
    }
    initializeLifecycle(building) {
        return [
            { stage: 'Concept', status: 'Completed', startDate: new Date().toISOString(), endDate: new Date().toISOString() },
            { stage: 'Design', status: 'Completed', startDate: new Date().toISOString(), endDate: new Date().toISOString() },
            { stage: 'Construction', status: 'InProgress', startDate: new Date().toISOString(), endDate: null },
            { stage: 'Inspection', status: 'Pending', startDate: null, endDate: null },
            { stage: 'Commissioning', status: 'Pending', startDate: null, endDate: null },
            { stage: 'Operation', status: 'Pending', startDate: null, endDate: null }
        ];
    }
    initializeMetrics() {
        return {
            schedulePerformanceIndex: 1.0,
            costPerformanceIndex: 1.0,
            qualityIndex: 1.0,
            safetyIndex: 1.0,
            productivityIndex: 1.0,
            resourceEfficiency: 0.85
        };
    }
    calculateImpacts(scenario, twin) {
        const impacts = {};
        for (const change of scenario.changes) {
            if (change.type === 'labor') {
                impacts.duration = (impacts.duration || 0) - change.value * 0.1;
                impacts.cost = (impacts.cost || 0) + change.value * 0.05;
            }
            if (change.type === 'material') {
                impacts.cost = (impacts.cost || 0) + change.value * 0.15;
                impacts.quality = (impacts.quality || 0) + change.value * 0.05;
            }
        }
        return impacts;
    }
    generatePredictions(scenario, twin) {
        return {
            estimatedCompletion: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            finalCost: twin.building.skeleton.numFloors * 500000 * (1 + (scenario.changes.length * 0.1)),
            riskLevel: 'Medium',
            confidence: 0.75
        };
    }
    generateRecommendations(scenario, twin) {
        return [
            'Monitor resource utilization closely',
            'Implement quality control checkpoints',
            'Prepare contingency plans for critical path activities'
        ];
    }
    calculateScenarioConfidence(scenario) {
        return 0.7 + Math.random() * 0.2;
    }
    detectNewRisks(twin) {
        const risks = [];
        if (twin.currentState.resourceUtilization.labor > 0.9) {
            risks.push('High labor utilization - risk of burnout');
        }
        if (twin.currentState.resourceUtilization.materials < 0.5) {
            risks.push('Low material availability - potential delays');
        }
        return risks;
    }
    saveState(state) {
        this.stateHistory.push({ ...state });
        if (this.stateHistory.length > 100) {
            this.stateHistory.shift();
        }
    }
    getStateHistory() {
        return [...this.stateHistory];
    }
    getTwin() {
        return this.twin;
    }
}
exports.DigitalTwinEngine = DigitalTwinEngine;
//# sourceMappingURL=index.js.map