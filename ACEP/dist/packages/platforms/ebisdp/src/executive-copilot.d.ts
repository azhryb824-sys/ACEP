import { BaseEngine } from '@acep/core';
import { ExecutiveResponse } from './types';
import { BusinessIntelligenceEngine } from './engine';
export declare class ExecutiveCopilot extends BaseEngine {
    private engine;
    private conversationHistory;
    private contextCache;
    constructor(engine: BusinessIntelligenceEngine, config?: Record<string, unknown>);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    ask(question: string, context?: Record<string, unknown>): Promise<ExecutiveResponse>;
    private enrichResponse;
    summarizeDailyEvents(): Promise<ExecutiveResponse>;
    prepareBoardMeeting(): Promise<ExecutiveResponse>;
    private trendIndicator;
    private healthTrend;
    analyzeProfitDrop(details?: string): Promise<ExecutiveResponse>;
    recommendInvestment(): Promise<ExecutiveResponse>;
    identifyBudgetRisks(): Promise<ExecutiveResponse>;
    simulateSteelPriceIncrease(percentage?: number): Promise<ExecutiveResponse>;
    getConversationHistory(): {
        question: string;
        response: ExecutiveResponse;
    }[];
    clearHistory(): void;
}
//# sourceMappingURL=executive-copilot.d.ts.map