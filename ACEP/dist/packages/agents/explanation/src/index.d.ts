import { IAgent, DecisionRecord, BOQItem, CostBreakdown } from '@acep/core';
interface Explanation {
    id: string;
    type: 'decision' | 'item' | 'quantity' | 'cost' | 'report-section';
    title: string;
    content: string;
    language: string;
    references: string[];
    confidence: number;
    timestamp: string;
}
interface ExplanationReport {
    id: string;
    projectId: string;
    title: string;
    language: string;
    sections: Explanation[];
    generatedAt: string;
    totalExplanations: number;
}
export declare class ExplanationAgent implements IAgent {
    readonly id = "agent-explanation";
    readonly type = "explanation";
    readonly name = "Explanation Agent";
    private logger;
    process(input: unknown): Promise<ExplanationReport>;
    canHandle(input: unknown): boolean;
    getCapabilities(): string[];
    private findTemplate;
    private fillTemplate;
    explainDecision(decision: DecisionRecord, language?: string): Explanation;
    explainItem(item: BOQItem, language?: string): Explanation;
    explainQuantity(item: BOQItem, language?: string): Explanation;
    explainCost(item: BOQItem, cost?: CostBreakdown, language?: string): Explanation;
    generateReport(input: unknown): Promise<ExplanationReport>;
}
export {};
//# sourceMappingURL=index.d.ts.map