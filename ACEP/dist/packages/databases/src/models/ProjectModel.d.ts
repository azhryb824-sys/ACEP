import { ExecutionStatus } from '@acep/core';
export interface ProjectModel {
    id: string;
    userId: string;
    name: string;
    description: string;
    type: string;
    status: ExecutionStatus;
    facts: unknown;
    building: unknown;
    boq: unknown;
    cost: unknown;
    schedule: unknown;
    risks: unknown;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=ProjectModel.d.ts.map