/**
 * ACEP Explainable AI Layer
 *
 * Adds "why?" to every decision made by the system.
 *
 * Uses:
 *   - ExplanationAgent (packages/agents/explanation) patterns
 *   - LearningFeedbackEngine for rejection reasons
 *   - EngineeringDecisionEngine decisions
 *   - EDL trace for step-by-step reasoning
 *   - EngineeringKnowledgeBase for Arabic explanations (200+ already)
 *   - Existing decision records from SelfAuditAgent
 */
class ExplainableAI {
  constructor(options = {}) {
    this.learningFeedback = options.learningFeedback || null;
    this.decisionEngine = options.decisionEngine || null;
    this.edl = options.edl || null;
    this.knowledgeBase = options.knowledgeBase || null;
    this.explanationAgent = options.explanationAgent || null;
    this.reasoningEngine = options.reasoningEngine || null;
    this._explanationCache = new Map();
  }

  /**
   * Generate explanation for any system decision.
   */
  explain(projectId, decisionId, context = {}) {
    const cacheKey = `${projectId}:${decisionId}`;
    if (this._explanationCache.has(cacheKey)) {
      return this._explanationCache.get(cacheKey);
    }

    // Try EDL trace
    const decision = this._findDecision(projectId, decisionId);

    if (!decision) {
      return this._buildFromModules(projectId, decisionId, context);
    }

    const explanation = this._buildExplanation(decision, projectId);
    this._explanationCache.set(cacheKey, explanation);
    return explanation;
  }

  /**
   * Explain a specific issue/error.
   */
  explainIssue(issue) {
    const kb = this.knowledgeBase;
    const kbEntry = kb?.getExplanation?.(issue.category, issue.message);

    return {
      what: issue.message,
      why: kbEntry?.why || this._inferWhy(issue),
      howToFix: kbEntry?.solution || this._inferFix(issue),
      severity: issue.severity,
      category: issue.category,
      referencedRule: kbEntry?.rule || null,
      source: kbEntry ? 'knowledge_base' : 'inferred',
    };
  }

  /**
   * Get all explanations for a project's decisions.
   */
  explainAll(projectId) {
    const explanations = [];

    // From decision engine
    if (this.decisionEngine) {
      const decisions = this.decisionEngine.getDecisionLog(projectId);
      for (const d of decisions) {
        const e = this._buildExplanation(d, projectId);
        explanations.push(e);
      }
    }

    // From learning feedback
    if (this.learningFeedback) {
      const feedbackLog = this.learningFeedback.getLog(projectId);
      for (const entry of (feedbackLog || [])) {
        explanations.push({
          projectId,
          type: 'learning_feedback',
          decisionType: entry.decisionType,
          reason: entry.reason,
          explanation: this._lookupKBExplanation(entry.reason, 'feedback'),
          timestamp: entry.timestamp,
        });
      }
    }

    return explanations;
  }

  /**
   * Generate a human-readable trace from EDL events.
   */
  generateTrace(projectId) {
    if (!this.edl) return { ok: false, error: 'No EDL available' };
    const events = this.edl.getProjectLog(projectId);
    if (!events || events.length === 0) {
      return { ok: true, trace: 'No events recorded for this project' };
    }

    const steps = [];
    for (const event of events) {
      const step = {
        step: steps.length + 1,
        module: event.module || event.source || 'system',
        action: event.action || event.type || 'unknown',
        detail: this._describeEvent(event),
        timestamp: event.timestamp,
      };
      steps.push(step);
    }

    return {
      ok: true,
      projectId,
      totalSteps: steps.length,
      steps,
      summary: this._summarizeTrace(steps),
    };
  }

  /**
   * Generate a "Why was this rejected?" answer.
   */
  whyRejected(projectId, itemId) {
    const reasons = [];

    // From learning feedback
    if (this.learningFeedback) {
      const log = this.learningFeedback.getLog(projectId) || [];
      const itemRejections = log.filter(e =>
        e.decisionType === 'reject' &&
        (!itemId || e.context?.item === itemId)
      );
      for (const r of itemRejections) {
        reasons.push({
          item: itemId || 'general',
          reason: r.reason,
          howToFix: this._inferFix({ message: r.reason, category: r.context?.module }),
          timestamp: r.timestamp,
        });
      }
    }

    // From decision engine
    if (this.decisionEngine) {
      const decisions = this.decisionEngine.getDecisionLog(projectId) || [];
      for (const d of decisions) {
        if (d.verdict === 'rejected') {
          for (const issue of d.criticalIssues || []) {
            if (!itemId || issue.item === itemId || issue.question === itemId) {
              reasons.push({
                item: issue.item || itemId || 'general',
                reason: issue.message,
                howToFix: this._inferFix(issue),
                category: issue.category,
              });
            }
          }
        }
      }
    }

    return {
      projectId,
      itemId: itemId || 'all',
      rejected: true,
      reasons,
      totalReasons: reasons.length,
      summary: reasons.length > 0
        ? `رفض بسبب ${reasons.length} مشكلة: ${reasons.map(r => r.reason).join('; ')}`
        : 'لم يتم العثور على سبب الرفض',
    };
  }

  /**
   * Compare two alternatives and explain why one was chosen.
   */
  compareAlternatives(projectId, altA, altB, criteria) {
    const result = {
      alternativeA: altA,
      alternativeB: altB,
      winner: null,
      reasons: [],
    };

    const effectiveCriteria = criteria || ['cost', 'quality', 'schedule', 'risk', 'materials'];
    let scoreA = 0, scoreB = 0;

    for (const criterion of effectiveCriteria) {
      const aVal = altA[criterion];
      const bVal = altB[criterion];
      if (aVal === undefined || bVal === undefined) continue;

      const comparison = this._compareByCriterion(criterion, aVal, bVal);
      if (comparison.winner === 'A') scoreA++;
      else if (comparison.winner === 'B') scoreB++;

      result.reasons.push({
        criterion,
        valueA: aVal,
        valueB: bVal,
        explanation: comparison.explanation,
        winner: comparison.winner || 'tie',
      });
    }

    result.winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'tie';
    result.score = { A: scoreA, B: scoreB };

    if (result.winner !== 'tie') {
      const bestReasons = result.reasons.filter(r => r.winner === result.winner);
      result.summary = `تم اختيار البديل ${result.winner} لأنه أفضل في ${bestReasons.length} من ${result.reasons.length} معايير: ${bestReasons.map(r => r.criterion).join('، ')}`;
    } else {
      result.summary = 'البديلان متساويان';
    }

    return result;
  }

  _findDecision(projectId, decisionId) {
    // Try decision engine log
    if (this.decisionEngine) {
      const log = this.decisionEngine.getDecisionLog(projectId);
      const found = (log || []).find(d => d.id === decisionId);
      if (found) return found;
    }

    // Try EDL trace
    if (this.edl) {
      const events = this.edl.getProjectLog(projectId) || [];
      if (!decisionId) return events[events.length - 1] || null;
      return events.find(e => e.id === decisionId) || null;
    }

    return null;
  }

  _buildExplanation(decision, projectId) {
    const verdict = decision.verdict || decision.type || 'unknown';
    const approved = verdict === 'approved';
    const questionsExplained = [];

    if (decision.questions) {
      for (const [key, value] of Object.entries(decision.questions)) {
        if (typeof value === 'boolean' || key === 'verdict' || key === 'canProceed') continue;
        const explanation = this._lookupKBExplanation(key, 'decision_question');
        questionsExplained.push(explanation);
      }
    }

    return {
      projectId,
      verdict: approved ? 'تم الاعتماد' : 'تم الرفض',
      summary: decision.summary || (approved ? 'اجتازت جميع الفحوصات' : 'فشلت بعض الفحوصات'),
      why: approved
        ? 'جميع الفحوصات التسعة اجتازت بنجاح، لا توجد مشاكل حرجة تمنع الاعتماد'
        : `فشل في ${decision.criticalIssues?.length || 0} فحص حرج: ${(decision.criticalIssues || []).map(i => i.message).join('; ')}`,
      issues: (decision.issues || []).map(i => this.explainIssue(i)),
      criticalCount: decision.criticalIssues?.length || 0,
      warningCount: decision.warnings?.length || 0,
      timestamp: decision.timestamp,
      confidence: decision.confidence,
    };
  }

  _buildFromModules(projectId, decisionId, context) {
    const explanations = [];
    if (this.reasoningEngine?.getReasoning) {
      const reasoning = this.reasoningEngine.getReasoning(projectId);
      if (reasoning) explanations.push({ source: 'reasoning_engine', content: reasoning });
    }
    if (this.explanationAgent?.generate) {
      const agentExp = this.explanationAgent.generate(projectId, decisionId, context);
      if (agentExp) explanations.push({ source: 'explanation_agent', content: agentExp });
    }
    const merged = explanations.map(e => e.content).filter(Boolean).join('\n');
    return { projectId, decisionId, explanations, summary: merged || 'No explanation found' };
  }

  _describeEvent(event) {
    const details = event.details || event.data || {};
    if (typeof details === 'object') {
      return Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(', ');
    }
    return String(details);
  }

  _summarizeTrace(steps) {
    const modules = new Set(steps.map(s => s.module));
    const total = steps.length;
    return {
      totalSteps: total,
      uniqueModules: modules.size,
      modules: [...modules],
      estimatedTokens: total * 5,
    };
  }

  _lookupKBExplanation(topic, category) {
    if (this.knowledgeBase?.getExplanation) {
      return this.knowledgeBase.getExplanation(category, topic);
    }
    return null;
  }

  _inferWhy(issue) {
    const map = {
      boq: 'بيانات BOQ تحتاج مراجعة',
      vision: 'نتائج الرؤية لا تتوافق مع المتطلبات',
      navigation: 'بيانات الملاحة غير متسقة مع النموذج',
      cost: 'التكلفة المحسوبة لا تتطابق مع الكميات',
      schedule: 'الجدول الزمني غير واقعي',
      materials: 'المواد المستخدمة لا تتوافق مع الكود السعودي',
      conflict: 'تعارض بين مكونات النظام المختلفة',
      optimization: 'عنصر غير ضروري أو قابل للتحسين',
    };
    return map[issue.category] || 'خطأ في النظام — يرجى مراجعة السجلات';
  }

  _inferFix(issue) {
    const map = {
      boq: 'مراجعة بنود BOQ وتصحيح الكميات أو الأسعار',
      vision: 'إعادة توليد الصور بمواصفات مختلفة',
      navigation: 'إعادة بناء نموذج الملاحة ليتوافق مع الرؤية',
      cost: 'إعادة حساب التكلفة بناءً على الكميات الصحيحة',
      schedule: 'مراجعة الجدول الزمني وتوزيع المهام',
      materials: 'تحديث المواد لتتوافق مع الكود السعودي',
      conflict: 'حل التعارض عن طريق تعديل أحد المكونات المتضاربة',
      optimization: 'مراجعة جدوى العنصر وإزالته إذا لم يكن ضرورياً',
    };
    return map[issue.category] || 'مراجعة النظام واستشارة مهندس مختص';
  }

  _compareByCriterion(criterion, aVal, bVal) {
    const cmp = {
      cost: { better: 'lower', explanation: (a, b) => a < b ? `تكلفة أقل (${a} < ${b})` : `تكلفة أعلى (${a} > ${b})` },
      quality: { better: 'higher', explanation: (a, b) => a > b ? `جودة أعلى (${a} > ${b})` : `جودة أقل (${a} < ${b})` },
      schedule: { better: 'lower', explanation: (a, b) => a < b ? `مدة أقل (${a} < ${b})` : `مدة أطول (${a} > ${b})` },
      risk: { better: 'lower', explanation: (a, b) => a < b ? `مخاطر أقل (${a} < ${b})` : `مخاطر أعلى (${a} > ${b})` },
      materials: { better: 'higher', explanation: (a, b) => a > b ? `مواد أفضل (${a})` : `مواد أقل جودة (${a})` },
    };

    const rule = cmp[criterion] || { better: 'higher', explanation: (a, b) => `${a} vs ${b}` };
    const aIsBetter = rule.better === 'lower' ? aVal < bVal : aVal > bVal;
    const bIsBetter = rule.better === 'lower' ? bVal < aVal : bVal > aVal;

    return {
      winner: aIsBetter ? 'A' : bIsBetter ? 'B' : 'tie',
      explanation: rule.explanation(aVal, bVal),
    };
  }
}

module.exports = ExplainableAI;
