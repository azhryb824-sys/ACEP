"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATE_ORDER = exports.WorkflowApp = exports.WorkflowService = void 0;
const uuid_1 = require("uuid");
const core_1 = require("@acep/core");
const STATE_ORDER = {
    Draft: 0,
    Understanding: 1,
    Questions: 2,
    VirtualBuilding: 3,
    Reasoning: 4,
    BOQ: 5,
    Quantity: 6,
    Review: 7,
    Pricing: 8,
    Schedule: 9,
    Validation: 10,
    Approved: 11,
    Rejected: -1,
};
exports.STATE_ORDER = STATE_ORDER;
const EXECUTION_STATUS_MAP = {
    Draft: core_1.ExecutionStatus.Draft,
    Understanding: core_1.ExecutionStatus.Understanding,
    Questions: core_1.ExecutionStatus.Questioning,
    VirtualBuilding: core_1.ExecutionStatus.Building,
    Reasoning: core_1.ExecutionStatus.Reasoning,
    BOQ: core_1.ExecutionStatus.BOQGeneration,
    Quantity: core_1.ExecutionStatus.QuantityCalculation,
    Review: core_1.ExecutionStatus.Reviewing,
    Pricing: core_1.ExecutionStatus.Pricing,
    Schedule: core_1.ExecutionStatus.Scheduling,
    Validation: core_1.ExecutionStatus.Validation,
    Approved: core_1.ExecutionStatus.Approved,
    Rejected: core_1.ExecutionStatus.Rejected,
};
class WorkflowService {
    workflows = new Map();
    create(request) {
        if (!request.projectId || !request.createdBy) {
            throw new Error('projectId and createdBy are required');
        }
        const initialState = request.skipTo || 'Draft';
        if (request.skipTo && !STATE_ORDER[request.skipTo]) {
            throw new Error(`Invalid target state: ${request.skipTo}`);
        }
        if (request.skipTo && request.skipTo !== 'Draft' && STATE_ORDER[request.skipTo] <= STATE_ORDER.Draft) {
            throw new Error('Cannot skip to a state before or at Draft');
        }
        const now = new Date().toISOString();
        const history = [
            {
                from: 'Draft',
                to: initialState,
                timestamp: now,
                triggeredBy: request.createdBy,
                reason: request.skipTo ? 'Create now bypass' : 'Workflow created',
                metadata: request.metadata,
            },
        ];
        const workflow = {
            id: (0, uuid_1.v4)(),
            projectId: request.projectId,
            currentState: initialState,
            previousState: null,
            createdAt: now,
            updatedAt: now,
            createdBy: request.createdBy,
            history,
            metadata: request.metadata || {},
            isComplete: initialState === 'Approved' || initialState === 'Rejected',
        };
        this.workflows.set(workflow.id, workflow);
        console.log(`[Workflow] Created workflow ${workflow.id} for project ${request.projectId} (state: ${initialState})`);
        return workflow;
    }
    advance(request) {
        const workflow = this.workflows.get(request.workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${request.workflowId}`);
        }
        if (workflow.isComplete) {
            throw new Error(`Workflow ${request.workflowId} is already complete (${workflow.currentState})`);
        }
        const currentIdx = STATE_ORDER[workflow.currentState];
        let targetState;
        if (request.targetState) {
            const targetIdx = STATE_ORDER[request.targetState];
            if (targetIdx < 0 && request.targetState !== 'Rejected') {
                throw new Error(`Invalid target state: ${request.targetState}`);
            }
            if (request.targetState === 'Rejected' || targetIdx > currentIdx) {
                targetState = request.targetState;
            }
            else {
                throw new Error(`Cannot move to ${request.targetState} from ${workflow.currentState}`);
            }
        }
        else {
            const nextStates = [
                'Understanding', 'Questions', 'VirtualBuilding', 'Reasoning', 'BOQ',
                'Quantity', 'Review', 'Pricing', 'Schedule', 'Validation', 'Approved',
            ];
            const nextIdx = nextStates.findIndex(s => STATE_ORDER[s] > currentIdx);
            targetState = nextIdx >= 0 ? nextStates[nextIdx] : 'Approved';
        }
        const now = new Date().toISOString();
        workflow.previousState = workflow.currentState;
        const entry = {
            from: workflow.currentState,
            to: targetState,
            timestamp: now,
            triggeredBy: request.triggeredBy,
            reason: request.reason || `Advanced from ${workflow.currentState} to ${targetState}`,
            metadata: request.metadata,
        };
        workflow.history.push(entry);
        workflow.currentState = targetState;
        workflow.updatedAt = now;
        workflow.isComplete = targetState === 'Approved' || targetState === 'Rejected';
        if (workflow.isComplete) {
            console.log(`[Workflow] Workflow ${workflow.id} completed at state: ${targetState}`);
        }
        return workflow;
    }
    getById(workflowId) {
        return this.workflows.get(workflowId) || null;
    }
    getByProjectId(projectId) {
        return Array.from(this.workflows.values()).find(w => w.projectId === projectId) || null;
    }
    list(filter) {
        let results = Array.from(this.workflows.values());
        if (filter?.state)
            results = results.filter(w => w.currentState === filter.state);
        if (filter?.projectId)
            results = results.filter(w => w.projectId === filter.projectId);
        return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    getHistory(workflowId) {
        const workflow = this.workflows.get(workflowId);
        return workflow ? workflow.history : [];
    }
    canTransition(from, to) {
        const fromIdx = STATE_ORDER[from];
        const toIdx = STATE_ORDER[to];
        if (fromIdx < 0 || toIdx < 0)
            return false;
        if (to === 'Rejected')
            return true;
        return toIdx > fromIdx;
    }
    getExecutionStatus(workflowId) {
        const workflow = this.workflows.get(workflowId);
        return workflow ? EXECUTION_STATUS_MAP[workflow.currentState] : null;
    }
}
exports.WorkflowService = WorkflowService;
class WorkflowApp {
    service;
    constructor() {
        this.service = new WorkflowService();
    }
    async handleRequest(action, payload) {
        switch (action) {
            case 'create':
                return this.service.create(payload);
            case 'advance':
                return this.service.advance(payload);
            case 'getById':
                return this.service.getById(payload);
            case 'getByProject':
                return this.service.getByProjectId(payload);
            case 'list':
                return this.service.list(payload);
            case 'getHistory':
                return this.service.getHistory(payload);
            case 'canTransition':
                return this.service.canTransition(payload.from, payload.to);
            case 'getStatus':
                return this.service.getExecutionStatus(payload);
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
}
exports.WorkflowApp = WorkflowApp;
function main() {
    const app = new WorkflowApp();
    console.log('[Workflow Engine] Initialized');
    console.log('[Workflow Engine] States: Draft -> Understanding -> Questions -> VirtualBuilding -> Reasoning -> BOQ -> Quantity -> Review -> Pricing -> Schedule -> Validation -> Approved');
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map