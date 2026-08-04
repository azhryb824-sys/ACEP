"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutiveCopilot = void 0;
const core_1 = require("@acep/core");
class ExecutiveCopilot extends core_1.BaseEngine {
    engine;
    conversationHistory = [];
    contextCache = new Map();
    constructor(engine, config) {
        super('ExecutiveCopilot', '1.0.0', config);
        this.engine = engine;
    }
    async initialize() {
        this.setStatus('initialized');
        this.logger.info('ExecutiveCopilot initialized');
    }
    async validate() {
        return true;
    }
    async ask(question, context) {
        this.setStatus('running');
        const query = { question, context };
        this.logger.info(`Processing executive query: ${question.substring(0, 80)}...`);
        const response = await this.engine.answerExecutiveQuery(query);
        const enriched = await this.enrichResponse(response, question);
        this.conversationHistory.push({ question, response: enriched });
        if (this.conversationHistory.length > 50)
            this.conversationHistory.shift();
        this.setStatus('initialized');
        return enriched;
    }
    async enrichResponse(response, question) {
        const q = question.toLowerCase();
        if (q.includes('dashboard') || q.includes('health')) {
            const dashboard = await this.engine.generateExecutiveDashboard();
            response.relatedMetrics = [...response.relatedMetrics, 'companyHealth'];
            response.evidence.push(`Company Health Index: ${dashboard.companyHealth.overall}/100`);
        }
        if (q.includes('scenario') || q.includes('what if')) {
            const scenarios = await this.engine.getScenarioHistory();
            if (scenarios.length > 0) {
                const latest = scenarios[scenarios.length - 1];
                response.evidence.push(`Latest scenario: ${latest.name} - recommends ${latest.recommendedScenario}`);
                response.evidence.push(`Scenario A profit: SAR ${latest.scenarioA.profit.toLocaleString()}`);
                response.evidence.push(`Scenario B profit: SAR ${latest.scenarioB.profit.toLocaleString()}`);
                response.evidence.push(`Scenario C profit: SAR ${latest.scenarioC.profit.toLocaleString()}`);
            }
        }
        if (q.includes('alert') || q.includes('risk') || q.includes('issue')) {
            const alerts = await this.engine.getAlerts();
            const critical = alerts.filter(a => a.severity === 'critical');
            const high = alerts.filter(a => a.severity === 'high');
            response.evidence.push(`Active critical alerts: ${critical.length}, High alerts: ${high.length}`);
            if (critical.length > 0) {
                response.evidence.push(`Critical: ${critical.map(a => a.alertName).join(', ')}`);
            }
        }
        if (q.includes('predict') || q.includes('forecast') || q.includes('future')) {
            const prediction = await this.engine.predictRevenue(6);
            response.evidence.push(`Revenue forecast (6 months): SAR ${prediction.revenue.value.toLocaleString()} (confidence: ${prediction.revenue.confidence}%)`);
            response.evidence.push(`Lower bound: SAR ${prediction.revenue.lowerBound.toLocaleString()}, Upper bound: SAR ${prediction.revenue.upperBound.toLocaleString()}`);
        }
        if (q.includes('benchmark') || q.includes('compare') || q.includes('ranking')) {
            const benchResult = await this.engine.runBenchmark({
                name: 'copilot-benchmark', scope: 'projects',
                metrics: ['profitability', 'productivity', 'quality', 'safety'],
                period: new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' }),
                groupBy: 'project'
            });
            response.evidence.push(`Benchmark top performer: ${benchResult.topPerformer} (${benchResult.rankings[0]?.overallScore}/100)`);
            response.evidence.push(`Average score: ${benchResult.averageScore}/100 across ${benchResult.rankings.length} entities`);
            response.evidence.push(...benchResult.insights.slice(0, 2));
        }
        return response;
    }
    async summarizeDailyEvents() {
        const dashboard = await this.engine.generateExecutiveDashboard();
        const alerts = await this.engine.getAlerts();
        const health = await this.engine.getCompanyHealth();
        const activeAlerts = alerts.filter(a => !a.acknowledged);
        const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
        const summary = `Daily Executive Summary - ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

COMPANY HEALTH: ${health.overall}/100 (${health.overall >= 75 ? 'Good' : health.overall >= 60 ? 'Fair' : 'Needs Attention'})
- Financial: ${health.financial}/100 | Projects: ${health.projects}/100 | Quality: ${health.quality}/100
- Safety: ${health.safety}/100 | Customer: ${health.customer}/100 | Innovation: ${health.innovation}/100

PROJECTS: ${dashboard.projectPerformance.overall.active} active, ${dashboard.projectPerformance.overall.delayed} delayed, ${dashboard.projectPerformance.overall.critical} critical
- Overall completion: ${dashboard.projectPerformance.overall.completion}%
- Productivity index: ${dashboard.projectPerformance.overall.productivity}/100
- Quality index: ${dashboard.projectPerformance.overall.quality}/100

FINANCIALS: Revenue SAR ${dashboard.financials.overall.revenue.toLocaleString()}
- Profit: SAR ${dashboard.financials.overall.profit.toLocaleString()} (${dashboard.financials.profitability}% margin)
- Cash flow: ${dashboard.financials.cashFlowStatus}
- Budget variance: ${dashboard.financials.budgetVariance}%

ALERTS: ${activeAlerts.length} active (${criticalAlerts.length} critical)
${criticalAlerts.slice(0, 5).map(a => `- [CRITICAL] ${a.alertName}: ${a.message}`).join('\n')}

RISK PROJECTS: ${dashboard.projectPerformance.atRisk.join(', ')}
TOP PERFORMERS: ${dashboard.projectPerformance.topPerformers.join(', ')}`;
        const response = {
            answer: summary,
            evidence: [
                `Health index: ${JSON.stringify(health)}`,
                `Active alerts: ${activeAlerts.length}`,
                `Dashboard generated at: ${dashboard.timestamp}`
            ],
            assumptions: ['All data sources synced within last 24 hours', 'Metrics calculated using standard formulas'],
            confidence: 89.5,
            relatedMetrics: ['overall health', 'active projects', 'profitability', 'cash flow', 'alerts'],
            timestamp: new Date().toISOString()
        };
        return response;
    }
    async prepareBoardMeeting() {
        const dashboard = await this.engine.generateExecutiveDashboard();
        const health = await this.engine.getCompanyHealth();
        const prediction = await this.engine.predictRevenue(12);
        const pendingDecisions = (await this.engine.getDecisions()).filter(d => !d.actualOutcome);
        const decisionQuality = await this.engine.evaluateDecisionQuality();
        const boardSummary = `BOARD MEETING PREPARATION - ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}

1. EXECUTIVE SUMMARY
   - Company Health: ${health.overall}/100 (${this.trendIndicator(health.overall, 70)})
   - Revenue: SAR ${dashboard.financials.overall.revenue.toLocaleString()}
   - Net Profit: SAR ${dashboard.financials.overall.profit.toLocaleString()} (${dashboard.financials.profitability}% margin)
   - Active Projects: ${dashboard.projectPerformance.overall.active}

2. FINANCIAL PERFORMANCE
   - Cash Flow: ${dashboard.financials.cashFlowStatus}
   - Receivables: SAR ${dashboard.financials.overall.receivables.toLocaleString()}
   - Payables: SAR ${dashboard.financials.overall.payables.toLocaleString()}
   - Budget Variance: ${dashboard.financials.budgetVariance}%

3. PROJECT PORTFOLIO
   - Total Projects: ${dashboard.projectPerformance.overall.count}
   - Completed: ${dashboard.projectPerformance.overall.completed}
   - At Risk: ${dashboard.projectPerformance.atRisk.join(', ')}
   - Top Performers: ${dashboard.projectPerformance.topPerformers.join(', ')}

4. KEY RISKS & MITIGATION
   - ${dashboard.projectPerformance.atRisk.length} projects flagged at risk
   - ${pendingDecisions.length} strategic decisions pending outcome evaluation

5. STRATEGIC OUTLOOK (12 MONTHS)
   - Projected Revenue: SAR ${prediction.revenue.value.toLocaleString()}
   - Confidence: ${prediction.revenue.confidence}%
   - Trend: ${prediction.revenue.trend}

6. DECISION INTELLIGENCE
   - Total Decisions Tracked: ${decisionQuality.totalDecisions}
   - Met/Exceeded Expectations: ${decisionQuality.exceeded + decisionQuality.met}
   - Decision Accuracy: ${decisionQuality.averageAccuracy}%

7. RECOMMENDATIONS FOR BOARD
   ${dashboard.projectPerformance.atRisk.length > 0 ? `- Review and approve contingency plans for: ${dashboard.projectPerformance.atRisk.join(', ')}` : ''}
   - Approve annual budget allocation
   - Review strategic investment opportunities`;
        const response = {
            answer: boardSummary,
            evidence: [
                `Financial data: Q${Math.ceil(new Date().getMonth() / 3)} ${new Date().getFullYear()}`,
                `Health trend: ${this.healthTrend()}`,
                `Prediction model: Linear regression with ${prediction.revenue.confidence}% confidence`
            ],
            assumptions: [
                'Financial data reflects latest month-end close',
                'Market conditions remain stable',
                'No major regulatory changes expected',
                'Project pipeline assumptions are based on signed LOIs'
            ],
            confidence: 91.2,
            relatedMetrics: ['revenue', 'profit', 'cashFlow', 'projectCompletion', 'decisionQuality'],
            visualizations: ['revenue_trend.html', 'portfolio_health.png', 'risk_heatmap.png'],
            timestamp: new Date().toISOString()
        };
        return response;
    }
    trendIndicator(current, baseline) {
        const diff = current - baseline;
        if (diff > 10)
            return 'Strong growth';
        if (diff > 0)
            return 'Moderate improvement';
        if (diff > -10)
            return 'Stable';
        return 'Declining';
    }
    healthTrend() {
        const history = this.engine.getHealthHistory();
        if (history.length < 2)
            return 'Insufficient data';
        const recent = history.slice(-5);
        const avg = recent.reduce((s, h) => s + h.overall, 0) / recent.length;
        if (recent.length >= 2) {
            const last = recent[recent.length - 1].overall;
            const prev = recent[recent.length - 2].overall;
            if (last > prev + 2)
                return 'Improving';
            if (last < prev - 2)
                return 'Declining';
        }
        return avg > 70 ? 'Stable - Good' : 'Stable - Needs attention';
    }
    async analyzeProfitDrop(details) {
        return this.ask('Why did profits drop this month?', { details });
    }
    async recommendInvestment() {
        return this.ask('What is the best project to invest in?');
    }
    async identifyBudgetRisks() {
        return this.ask('Which projects are at risk of budget overrun?');
    }
    async simulateSteelPriceIncrease(percentage = 15) {
        return this.ask(`What happens if steel prices rise ${percentage}%?`, { steelPriceIncrease: percentage });
    }
    getConversationHistory() {
        return this.conversationHistory;
    }
    clearHistory() {
        this.conversationHistory = [];
        this.logger.info('Conversation history cleared');
    }
}
exports.ExecutiveCopilot = ExecutiveCopilot;
//# sourceMappingURL=executive-copilot.js.map