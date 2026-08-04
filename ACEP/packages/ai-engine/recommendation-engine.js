/**
 * ACEP Recommendation Engine
 *
 * Generates comprehensive, AI-driven recommendations for:
 *   - Design alternatives (materials, methods)
 *   - Cost optimization
 *   - Schedule improvements
 *   - Supplier selection
 *   - Risk mitigation
 *   - Execution methods
 *   - Missing items
 *   - Alternative substitutions
 *
 * Uses existing:
 *   - BOQEngine for item suggestions
 *   - CostOptimizer for cost optimization
 *   - SupplierAI for supplier recommendations
 *   - EngineeringKnowledgeBase for methods/materials
 *   - TrainingDataBridge for historical data
 *   - PriceLearner for price insights
 *   - EngineeringMemory for past decisions
 */
class RecommendationEngine {
  constructor(options = {}) {
    this.boqEngine = options.boqEngine || null;
    this.costOptimizer = options.costOptimizer || null;
    this.supplierAI = options.supplierAI || null;
    this.knowledgeBase = options.knowledgeBase || null;
    this.trainingBridge = options.trainingBridge || null;
    this.priceLearner = options.priceLearner || null;
    this.engineeringMemory = options.engineeringMemory || null;
    this.edl = options.edl || null;
    this._recommendationLog = [];
  }

  /**
   * Generate all recommendations for a project.
   */
  generateAll(projectId, options = {}) {
    const project = this.edl?.getProject(projectId);
    if (!project) return { ok: false, error: 'Project not found' };

    const sections = {};

    // 1. Material Recommendations
    sections.materials = this.recommendMaterials(project, options);

    // 2. Cost Optimization
    sections.cost = this.recommendCostOptimization(project, options);

    // 3. Schedule Recommendations
    sections.schedule = this.recommendSchedule(project, options);

    // 4. Supplier Recommendations
    sections.suppliers = this.recommendSuppliers(project, options);

    // 5. Risk Mitigation
    sections.risk = this.recommendRiskMitigation(project, options);

    // 6. Missing Items
    sections.missingItems = this.recommendMissingItems(project, options);

    // 7. Design Alternatives
    sections.design = this.recommendDesignAlternatives(project, options);

    // 8. Execution Methods
    sections.execution = this.recommendExecutionMethods(project, options);

    // Aggregate
    const allRecs = [];
    for (const [, recs] of Object.entries(sections)) {
      if (Array.isArray(recs)) allRecs.push(...recs);
      else if (recs?.recommendations) allRecs.push(...recs.recommendations);
    }

    const result = {
      projectId,
      timestamp: new Date().toISOString(),
      totalRecommendations: allRecs.length,
      sections: Object.keys(sections).map(k => ({
        category: k,
        count: Array.isArray(sections[k]) ? sections[k].length : (sections[k]?.recommendations?.length || 0),
        label: this._sectionLabel(k),
      })),
      recommendations: allRecs,
      highPriority: allRecs.filter(r => r.priority === 'high'),
      mediumPriority: allRecs.filter(r => r.priority === 'medium'),
      lowPriority: allRecs.filter(r => r.priority === 'low'),
      savings: allRecs.reduce((s, r) => s + (r.estimatedSavings || 0), 0),
    };

    if (this.edl) {
      project.traceEvent('recommendations_generated', 'RecommendationEngine', {
        total: result.totalRecommendations,
        savings: result.savings,
      });
    }

    this._recommendationLog.push(result);
    return result;
  }

  /**
   * Recommend optimal materials based on project type, budget, and climate.
   */
  recommendMaterials(project, options) {
    const recs = [];
    const building = project.building || project.upm || {};
    const boq = project.boq || {};
    const budget = options.budget || project.cost?.totalCost || 500000;
    const region = options.region || project.getEffective?.('region').value || 'Riyadh';
    const projectType = project.getEffective?.('type').value || building.type || 'Villa';

    // Concrete grade recommendation
    const floors = project.getEffective?.('floors').value || building.floors || 2;
    if (floors <= 2) {
      recs.push({
        type: 'material',
        item: 'خرسانة مسلحة',
        current: 'C25/30',
        suggested: 'C30/37',
        reason: `للمباني ذات ${floors} دور، الخرسانة C30/37 توفر متانة أعلى بتكلفة إضافية طفيفة`,
        estimatedSavings: 0,
        priority: 'medium',
        source: 'engineering_kb',
        confidence: 0.85,
      });
    }

    // Block type recommendation
    const hasThermal = boq.items?.some(i =>
      (i.name || '').toLowerCase().includes('thermal') ||
      (i.name || '').toLowerCase().includes('insulation') ||
      (i.name || '').toLowerCase().includes('عازل')
    );
    if (!hasThermal && ['Riyadh', 'Jeddah', 'Makkah', 'Madinah'].includes(region)) {
      recs.push({
        type: 'material',
        item: 'طابوق عازل حراري',
        current: 'طابوق عادي',
        suggested: 'طابوق عازل (Thermal Block)',
        reason: `منطقة ${region} تتطلب عزل حراري — الطابوق العازل يقلل استهلاك التكييف`,
        estimatedSavings: Math.round(budget * 0.05),
        priority: 'high',
        source: 'engineering_kb',
        confidence: 0.9,
      });
    }

    // Use knowledge base for additional recommendations
    if (this.knowledgeBase?.getMaterialRecommendations) {
      try {
        const kbRecs = this.knowledgeBase.getMaterialRecommendations(projectType, region);
        if (Array.isArray(kbRecs)) recs.push(...kbRecs);
      } catch (e) { /* KB method not available */ }
    }

    return recs;
  }

  /**
   * Recommend cost optimizations.
   */
  recommendCostOptimization(project, options) {
    const recs = [];
    const boq = project.boq || {};
    const cost = project.cost || {};

    // Use CostOptimizer if available
    if (this.costOptimizer) {
      try {
        const optimizerRecs = this.costOptimizer.optimize(project, options);
        if (Array.isArray(optimizerRecs)) recs.push(...optimizerRecs);
      } catch (e) { /* optimizer not available */ }
    }

    // Analyze BOQ for cost reduction opportunities
    const items = boq.items || [];
    const highCostItems = items.filter(i => (i.totalCost || i.total || 0) > (cost.totalCost || 1) * 0.1);
    for (const item of highCostItems) {
      recs.push({
        type: 'cost',
        item: item.name || item.code || 'Unknown',
        current: `${item.quantity} × ${item.unitCost || item.unitPrice}`,
        suggested: `مراجعة ${item.name || item.code} لخفض التكلفة`,
        reason: `هذا البند يمثل أكثر من 10% من إجمالي التكلفة`,
        estimatedSavings: Math.round((item.totalCost || item.total || 0) * 0.1),
        priority: 'high',
        source: 'cost_analysis',
        confidence: 0.7,
      });
    }

    // Price learner insights
    if (this.priceLearner?.getPriceInsights) {
      try {
        const insights = this.priceLearner.getPriceInsights(project);
        if (Array.isArray(insights)) recs.push(...insights);
      } catch (e) { /* price learner not available */ }
    }

    return recs;
  }

  /**
   * Recommend schedule improvements.
   */
  recommendSchedule(project, options) {
    const recs = [];
    const schedule = project.schedule || {};
    const boq = project.boq || {};

    const totalDays = schedule.totalDuration || 0;
    if (totalDays > 365) {
      recs.push({
        type: 'schedule',
        item: 'مدة المشروع',
        current: `${totalDays} يوم`,
        suggested: 'تقليص المدة عبر التداخل بين المراحل',
        reason: 'المدة طويلة — يمكن تطبيق تنفيذ متوازي للمراحل غير المرتبطة',
        estimatedSavings: Math.round(totalDays * 0.15 * 500), // Assume 500/day overhead
        priority: 'high',
        source: 'schedule_analysis',
        confidence: 0.75,
      });
    }

    // Check if concurrent phases are possible
    const phases = schedule.phases || [];
    if (phases.length > 2) {
      recs.push({
        type: 'schedule',
        item: 'تسلسل المراحل',
        current: 'تسلسلي',
        suggested: 'تنفيذ متوازي للمراحل: ${phases[0].name} مع ${phases[1]?.name}',
        reason: 'بعض المراحل يمكن تنفيذها بالتوازي لتقليل المدة الإجمالية',
        estimatedSavings: Math.round(totalDays * 0.1 * 500),
        priority: 'medium',
        source: 'schedule_analysis',
        confidence: 0.65,
      });
    }

    return recs;
  }

  /**
   * Recommend suppliers.
   */
  recommendSuppliers(project, options) {
    const recs = [];

    // Use SupplierAI if available
    if (this.supplierAI) {
      try {
        const suppliers = this.supplierAI.recommend(project, options);
        if (Array.isArray(suppliers)) {
          for (const s of suppliers) {
            recs.push({
              type: 'supplier',
              item: s.material || s.category || 'General',
              suggested: s.name || s.supplier,
              reason: s.reason || `موصى به للسعر والجودة`,
              estimatedSavings: s.savings || 0,
              priority: s.priority || 'medium',
              source: 'supplier_ai',
              confidence: s.confidence || 0.7,
            });
          }
        }
      } catch (e) { /* supplier AI not available */ }
    }

    // Fallback: use training bridge for historical supplier data
    if (recs.length === 0 && this.trainingBridge?.getSupplierHistory) {
      try {
        const historical = this.trainingBridge.getSupplierHistory(project.getEffective?.('type').value);
        if (Array.isArray(historical)) {
          for (const h of historical) {
            recs.push({
              type: 'supplier',
              item: h.material || h.category,
              suggested: h.supplier,
              reason: h.performance || 'أداء جيد في مشاريع سابقة',
              estimatedSavings: h.avgSavings || 0,
              priority: 'medium',
              source: 'training_bridge',
              confidence: h.confidence || 0.6,
            });
          }
        }
      } catch (e) { /* training bridge not available */ }
    }

    return recs;
  }

  /**
   * Recommend risk mitigation strategies.
   */
  recommendRiskMitigation(project, options) {
    const recs = [];
    const risk = project.risk || {};
    const risks = risk.risks || risk.items || [];

    for (const r of risks) {
      if ((r.probability || 0) > 0.5 || (r.impact || r.severity || 0) > 0.5) {
        recs.push({
          type: 'risk',
          item: r.name || r.description || 'Unknown risk',
          current: `Probability: ${r.probability}, Impact: ${r.impact || r.severity}`,
          suggested: this._suggestMitigation(r),
          reason: `Risk level requires mitigation — ${r.recommendation || ''}`,
          estimatedSavings: (r.cost || 0) * (r.probability || 0) * 0.5,
          priority: 'high',
          source: 'risk_analysis',
          confidence: 0.8,
        });
      }
    }

    // Schedule-based risk
    const schedule = project.schedule || {};
    if (schedule.totalDuration > 500) {
      recs.push({
        type: 'risk',
        item: 'Risk of long duration',
        current: `${schedule.totalDuration} days`,
        suggested: 'تعيين مدير مخاطر متخصص ومراجعة دورية',
        reason: 'المشاريع الطويلة معرضة لمخاطر تراكمية',
        estimatedSavings: Math.round(schedule.totalDuration * 100),
        priority: 'medium',
        source: 'risk_schedule',
        confidence: 0.7,
      });
    }

    return recs;
  }

  /**
   * Recommend missing BOQ items.
   */
  recommendMissingItems(project, options) {
    const recs = [];
    const boq = project.boq || {};
    const items = boq.items || [];
    const itemNames = items.map(i => (i.name || i.description || '').toLowerCase()).join(' ');

    const projectType = project.getEffective?.('type').value || 'Villa';
    const categoryRecommendations = {
      Villa: [
        { name: 'عزل حراري للأسطح', keywords: ['عزل', 'thermal', 'insulation'], priority: 'high' },
        { name: 'نظام تصريف مياه الأمطار', keywords: ['تصريف', 'drainage', 'rain'], priority: 'medium' },
        { name: 'أعمال تنسيق الموقع', keywords: ['تنسيق', 'landscape', 'site work'], priority: 'low' },
      ],
      Apartment: [
        { name: 'نظام إنذار حريق', keywords: ['إنذار', 'fire alarm', 'smoke'], priority: 'high' },
        { name: 'نظام اتصال داخلي', keywords: ['اتصال', 'intercom'], priority: 'medium' },
        { name: 'عدادات كهرباء فردية', keywords: ['عداد', 'meter'], priority: 'high' },
      ],
      Mosque: [
        { name: 'نظام صوتي', keywords: ['صوتي', 'audio', 'speaker'], priority: 'high' },
        { name: 'أعمال زخرفة جدارية', keywords: ['زخرفة', 'decoration'], priority: 'medium' },
      ],
    };

    const projectRecs = categoryRecommendations[projectType] || categoryRecommendations.Villa;
    for (const rec of projectRecs) {
      const exists = rec.keywords.some(kw => itemNames.includes(kw));
      if (!exists) {
        recs.push({
          type: 'missing_item',
          item: rec.name,
          suggested: `إضافة "${rec.name}" إلى BOQ`,
          reason: `هذا البند ضروري لمشاريع ${projectType}`,
          priority: rec.priority,
          source: 'boq_analysis',
          confidence: 0.85,
        });
      }
    }

    return recs;
  }

  /**
   * Recommend design alternatives.
   */
  recommendDesignAlternatives(project, options) {
    const recs = [];
    const boq = project.boq || {};
    const items = boq.items || [];

    // Traditional vs. modern alternatives
    for (const item of items) {
      const name = (item.name || '').toLowerCase();

      // Traditional block → lightweight concrete
      if (name.includes('block') || name.includes('طابوق') || name.includes('concrete block')) {
        recs.push({
          type: 'design',
          item: item.name || 'Concrete Block',
          current: 'طابوق أسمنتي تقليدي',
          suggested: 'طابوق خفيف (Lightweight Concrete Block)',
          reason: 'يقلل وزن المبنى بنسبة 30% مع عزل حراري أفضل',
          estimatedSavings: Math.round((item.totalCost || 0) * 0.1),
          priority: 'medium',
          source: 'design_alternatives',
          confidence: 0.75,
        });
      }

      // Traditional flooring → porcelain
      if (name.includes('ceramic') || name.includes('سيراميك') || name.includes('floor')) {
        recs.push({
          type: 'design',
          item: item.name || 'Ceramic Flooring',
          current: 'سيراميك',
          suggested: 'بورسلان (Porcelain)',
          reason: 'أعلى متانة وأقل امتصاص للماء — مناسب للمناخ السعودي',
          estimatedSavings: 0,
          priority: 'low',
          source: 'design_alternatives',
          confidence: 0.7,
        });
      }

      // Traditional plumbing → PPR
      if (name.includes('pipe') || name.includes('مواسير') || name.includes('plumbing')) {
        recs.push({
          type: 'design',
          item: item.name || 'Plumbing Pipes',
          current: 'مواسير تقليدية',
          suggested: 'مواسير PPR',
          reason: 'مقاومة أعلى للحرارة والضغط وعمر أطول',
          estimatedSavings: 0,
          priority: 'medium',
          source: 'design_alternatives',
          confidence: 0.8,
        });
      }
    }

    return recs;
  }

  /**
   * Recommend execution methods.
   */
  recommendExecutionMethods(project, options) {
    const recs = [];
    const boq = project.boq || {};
    const items = boq.items || [];

    for (const item of items) {
      const name = (item.name || '').toLowerCase();

      if (name.includes('foundation') || name.includes('أساسات') || name.includes('قواعد')) {
        recs.push({
          type: 'execution',
          item: item.name || 'Foundation Work',
          current: 'صب تقليدي',
          suggested: 'صب باستخدام مضخة خرسانة',
          reason: 'للمشاريع الكبيرة، المضخة توفر وقت وتضمن جودة الصب',
          priority: 'medium',
          source: 'execution_methods',
          confidence: 0.7,
        });
      }

      if (name.includes('concrete') || name.includes('خرسانة') || name.includes('slab') || name.includes('بلاطة')) {
        recs.push({
          type: 'execution',
          item: item.name || 'Concrete Work',
          current: 'خرسانة جاهزة',
          suggested: 'خرسانة جاهزة مع إضافات (Plasticizer)',
          reason: 'تحسن قابلية التشغيل وتقلل نسبة الماء',
          priority: 'low',
          source: 'execution_methods',
          confidence: 0.75,
        });
      }
    }

    return recs;
  }

  _suggestMitigation(risk) {
    const name = (risk.name || risk.description || '').toLowerCase();
    const map = {
      financial: 'تخصيص احتياطي مالي بنسبة 10-15% من قيمة العقد',
      schedule: 'إضافة وقت احتياطي بنسبة 20% للجدول الزمني',
      quality: 'تعيين مهندس جودة متفرغ واعتماد نظام QC',
      safety: 'تطبيق خطة سلامة شاملة وتدريب العمال',
      material: 'التعاقد مع موردين بديلين',
      weather: 'تعديل الجدول لتفادي أشهر الصيف',
      labor: 'التعاقد مع مقاولين من الباطن كدعم',
      design: 'مراجعة التصميم مع مهندس مستقل',
    };

    for (const [key, mitigation] of Object.entries(map)) {
      if (name.includes(key)) return mitigation;
    }
    return 'وضع خطة إدارة مخاطر شاملة';
  }

  _sectionLabel(key) {
    const labels = {
      materials: 'توصيات المواد',
      cost: 'تحسين التكلفة',
      schedule: 'تحسين الجدول',
      suppliers: 'توصيات الموردين',
      risk: 'تخفيف المخاطر',
      missingItems: 'إضافة البنود الناقصة',
      design: 'بدائل التصميم',
      execution: 'طرق التنفيذ',
    };
    return labels[key] || key;
  }

  getHistory(projectId) {
    if (projectId) return this._recommendationLog.filter(r => r.projectId === projectId);
    return this._recommendationLog;
  }

  getStats() {
    const all = this._recommendationLog;
    const totalSavings = all.reduce((s, r) => s + (r.savings || 0), 0);
    return {
      totalProjects: new Set(all.map(r => r.projectId)).size,
      totalRecommendations: all.reduce((s, r) => s + r.totalRecommendations, 0),
      totalEstimatedSavings: totalSavings,
      averageSavingsPerProject: all.length > 0 ? Math.round(totalSavings / all.length) : 0,
    };
  }
}

module.exports = RecommendationEngine;
