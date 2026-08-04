import { ExecutionStatus } from '@acep/core';
type WorkflowState = 'Draft' | 'Understanding' | 'Questions' | 'VirtualBuilding' | 'Reasoning' | 'BOQ' | 'Quantity' | 'Review' | 'Pricing' | 'Schedule' | 'Validation' | 'Approved' | 'Rejected';
declare const STATE_ORDER: Record<WorkflowState, number>;
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
declare class WorkflowService {
    private workflows;
    create(request: CreateWorkflowRequest): Workflow;
    advance(request: AdvanceWorkflowRequest): Workflow;
    getById(workflowId: string): Workflow | null;
    getByProjectId(projectId: string): Workflow | null;
    list(filter?: {
        state?: WorkflowState;
        projectId?: string;
    }): Workflow[];
    getHistory(workflowId: string): WorkflowHistoryEntry[];
    canTransition(from: WorkflowState, to: WorkflowState): boolean;
    getExecutionStatus(workflowId: string): ExecutionStatus | null;
}
declare class WorkflowApp {
    private service;
    constructor();
    handleRequest(action: string, payload: unknown): Promise<unknown>;
}
export { WorkflowService, WorkflowApp, Workflow, WorkflowState, WorkflowHistoryEntry, CreateWorkflowRequest, AdvanceWorkflowRequest, STATE_ORDER };
//# sourceMappingURL=index.d.ts.map