export interface LLMProvider {
  generate(prompt: string, options?: Record<string, unknown>): Promise<string>;
  analyze(text: string, task: string): Promise<Record<string, unknown>>;
}

export class LLMService {
  private provider: LLMProvider | null = null;
  private initialized = false;

  async initialize(provider?: LLMProvider): Promise<void> {
    this.provider = provider || null;
    this.initialized = true;
  }

  async generateResponse(prompt: string): Promise<string> {
    if (!this.provider) return `[LLM Mock] Response for: ${prompt.substring(0, 50)}...`;
    return this.provider.generate(prompt);
  }

  async analyzeText(text: string): Promise<Record<string, unknown>> {
    if (!this.provider) return { source: 'mock', textLength: text.length, entities: [] };
    return this.provider.analyze(text, 'analysis');
  }

  async generateQuestions(context: string): Promise<string[]> {
    if (!this.provider) return [`What is the scope of work for: ${context.substring(0, 50)}?`];
    const response = await this.provider.generate(`Generate clarifying questions about: ${context}`);
    return response.split('\n').filter(q => q.trim().endsWith('?'));
  }

  async explain(decision: string): Promise<string> {
    if (!this.provider) return `Explanation: ${decision} was selected based on engineering best practices.`;
    return this.provider.generate(`Explain the reasoning behind this engineering decision: ${decision}`);
  }

  isInitialized(): boolean { return this.initialized; }
}
