import { BaseEngine, IQuestionEngine, ProjectFacts, Question } from '@acep/core';
import { KnowledgeGraph, BOQItemsLibrary } from '@acep/knowledge-base';
export declare class QuestionEngine extends BaseEngine implements IQuestionEngine {
    private knowledgeGraph;
    private boqItemsLib;
    private askedQuestions;
    constructor(kg: KnowledgeGraph, boqLib: BOQItemsLibrary);
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    generateQuestions(facts: ProjectFacts): Promise<Question[]>;
    rankQuestions(questions: Question[]): Question[];
    selectBestQuestion(questions: Question[]): Question | null;
    processAnswer(question: Question, answer: string): Promise<void>;
    private createQuestion;
    private parseAnswer;
}
//# sourceMappingURL=index.d.ts.map