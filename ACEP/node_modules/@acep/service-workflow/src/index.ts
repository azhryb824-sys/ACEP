import { v4 as uuidv4 } from 'uuid';
import { ExecutionStatus } from '@acep/core';

type WorkflowState =
  | 'Draft'
  | 'Understanding'
  | 'Questions'
  | 'VirtualBuilding'
  | 'Reasoning'
  | 'BOQ'
  | 'Quantity'
  | 'Review'
  | 'Pricing'
  | 'Schedule'
  | 'Validation'
  | 'Approved'
  | 'Rejected';

const STATE_ORDER: Record<WorkflowState, number> = {
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

const EXECUTION_STATUS_MAP: Record<WorkflowState, ExecutionStatus> = {
  Draft: ExecutionStatus.Draft,
  Understanding: ExecutionStatus.Understanding,
  Questions: ExecutionStatus.Questioning,
  VirtualBuilding: ExecutionStatus.Building,
  Reasoning: ExecutionStatus.Reasoning,
  BOQ: ExecutionStatus.BOQGeneration,
  Quantity: ExecutionStatus.QuantityCalculation,
  Review: ExecutionStatus.Reviewing,
  Pricing: ExecutionStatus.Pricing,
  Schedule: ExecutionStatus.Scheduling,
  Validation: ExecutionStatus.Validation,
  Approved: ExecutionStatus.Approved,
  Rejected: ExecutionStatus.Rejected,
};

interface WorkflowHistoryEntry {
  from: WorkflowState;
  to: WorkflowState;
  timestamp: string;
  triggeredBy: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

interface Workflow {
  id: string;
  projectId: string;
  currentState: WorkflowState;
  previousState: WorkflowState | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  history: WorkflowHistoryEntry[];
  metadata: Record<string, unknown>;
  isComplete: boolean;
}

interface CreateWorkflowRequest {
  projectId: string;
  createdBy: string;
  skipTo?: WorkflowState;
  metadata?: Record<string, unknown>;
}

interface AdvanceWorkflowRequest {
  workflowId: string;
  triggeredBy: string;
  targetState?: WorkflowState;
  reason?: string;
  metadata?: Record<string, unknown>;
}

class WorkflowService {
  private workflows: Map<string, Workflow> = new Map();

  create(request: CreateWorkflowRequest): Workflow {
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
    const history: WorkflowHistoryEntry[] = [
      {
        from: 'Draft' as WorkflowState,
        to: initialState,
        timestamp: now,
        triggeredBy: request.createdBy,
        reason: request.skipTo ? 'Create now bypass' : 'Workflow created',
        metadata: request.metadata,
      },
    ];

    const workflow: Workflow = {
      id: uuidv4(),
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

  advance(request: AdvanceWorkflowRequest): Workflow {
    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${request.workflowId}`);
    }

    if (workflow.isComplete) {
      throw new Error(`Workflow ${request.workflowId} is already complete (${workflow.currentState})`);
    }

    const currentIdx = STATE_ORDER[workflow.currentState];
    let targetState: WorkflowState;

    if (request.targetState) {
      const targetIdx = STATE_ORDER[request.targetState];
      if (targetIdx < 0 && request.targetState !== 'Rejected') {
        throw new Error(`Invalid target state: ${request.targetState}`);
      }
      if (request.targetState === 'Rejected' || targetIdx > currentIdx) {
        targetState = request.targetState;
      } else {
        throw new Error(`Cannot move to ${request.targetState} from ${workflow.currentState}`);
      }
    } else {
      const nextStates: WorkflowState[] = [
        'Understanding', 'Questions', 'VirtualBuilding', 'Reasoning', 'BOQ',
        'Quantity', 'Review', 'Pricing', 'Schedule', 'Validation', 'Approved',
      ];
      const nextIdx = nextStates.findIndex(s => STATE_ORDER[s] > currentIdx);
      targetState = nextIdx >= 0 ? nextStates[nextIdx] : 'Approved';
    }

    const now = new Date().toISOString();
    workflow.previousState = workflow.currentState;

    const entry: WorkflowHistoryEntry = {
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

  getById(workflowId: string): Workflow | null {
    return this.workflows.get(workflowId) || null;
  }

  getByProjectId(projectId: string): Workflow | null {
    return Array.from(this.workflows.values()).find(w => w.projectId === projectId) || null;
  }

  list(filter?: { state?: WorkflowState; projectId?: string }): Workflow[] {
    let results = Array.from(this.workflows.values());
    if (filter?.state) results = results.filter(w => w.currentState === filter.state);
    if (filter?.projectId) results = results.filter(w => w.projectId === filter.projectId);
    return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getHistory(workflowId: string): WorkflowHistoryEntry[] {
    const workflow = this.workflows.get(workflowId);
    return workflow ? workflow.history : [];
  }

  canTransition(from: WorkflowState, to: WorkflowState): boolean {
    const fromIdx = STATE_ORDER[from];
    const toIdx = STATE_ORDER[to];
    if (fromIdx < 0 || toIdx < 0) return false;
    if (to === 'Rejected') return true;
    return toIdx > fromIdx;
  }

  getExecutionStatus(workflowId: string): ExecutionStatus | null {
    const workflow = this.workflows.get(workflowId);
    return workflow ? EXECUTION_STATUS_MAP[workflow.currentState] : null;
  }
}

class WorkflowApp {
  private service: WorkflowService;

  constructor() {
    this.service = new WorkflowService();
  }

  async handleRequest(action: string, payload: unknown): Promise<unknown> {
    switch (action) {
      case 'create':
        return this.service.create(payload as CreateWorkflowRequest);
      case 'advance':
        return this.service.advance(payload as AdvanceWorkflowRequest);
      case 'getById':
        return this.service.getById(payload as string);
      case 'getByProject':
        return this.service.getByProjectId(payload as string);
      case 'list':
        return this.service.list(payload as { state?: WorkflowState; projectId?: string });
      case 'getHistory':
        return this.service.getHistory(payload as string);
      case 'canTransition':
        return this.service.canTransition(
          (payload as Record<string, unknown>).from as WorkflowState,
          (payload as Record<string, unknown>).to as WorkflowState
        );
      case 'getStatus':
        return this.service.getExecutionStatus(payload as string);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

function main(): void {
  const app = new WorkflowApp();
  console.log('[Workflow Engine] Initialized');
  console.log('[Workflow Engine] States: Draft -> Understanding -> Questions -> VirtualBuilding -> Reasoning -> BOQ -> Quantity -> Review -> Pricing -> Schedule -> Validation -> Approved');
}

if (require.main === module) {
  main();
}

export { WorkflowService, WorkflowApp, Workflow, WorkflowState, WorkflowHistoryEntry, CreateWorkflowRequest, AdvanceWorkflowRequest, STATE_ORDER };
