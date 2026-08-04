/**
 * ACEP Simulation Validator — التحقق الهندسي قبل إنشاء فيديو المحاكاة
 *
 * يتحقق من صحة تسلسل البناء واتساق البيانات قبل إنتاج الفيديو.
 */
class SimulationValidator {
  constructor() {
    this.rules = this.getConstructionRules();
  }

  /**
   * يرجع قوانين البناء المعتمدة
   */
  getConstructionRules() {
    return [
      {
        id: 'R001',
        rule: 'لا يمكن صب الخرسانة قبل الحفر',
        ruleEn: 'Cannot pour concrete before excavation',
        dependsOn: 'excavation',
        blockedBy: ['concrete', 'foundation']
      },
      {
        id: 'R002',
        rule: 'لا يمكن تركيب النوافذ قبل الجدران',
        ruleEn: 'Cannot install windows before walls',
        dependsOn: 'walls',
        blockedBy: ['windows', 'glazing']
      },
      {
        id: 'R003',
        rule: 'لا يمكن الدهان قبل اللياسة',
        ruleEn: 'Cannot paint before plastering',
        dependsOn: 'plastering',
        blockedBy: ['painting', 'paint']
      },
      {
        id: 'R004',
        rule: 'لا يمكن تركيب البلاط قبل اللياسة',
        ruleEn: 'Cannot install tiles before plastering',
        dependsOn: 'plastering',
        blockedBy: ['tiles', 'tiling', 'flooring']
      },
      {
        id: 'R005',
        rule: 'لا يمكن تركيب الأسقف قبل الجدران',
        ruleEn: 'Cannot install ceilings before walls',
        dependsOn: 'walls',
        blockedBy: ['ceiling', 'suspended ceiling']
      },
      {
        id: 'R006',
        rule: 'لا يمكن التشطيب قبل الهيكل',
        ruleEn: 'Cannot finish before structure',
        dependsOn: 'structure',
        blockedBy: ['finishing', 'finish']
      },
      {
        id: 'R007',
        rule: 'كل مرحلة تعتمد على المرحلة التي تسبقها',
        ruleEn: 'Each stage depends on the previous stage',
        dependsOn: 'previous',
        blockedBy: []
      }
    ];
  }

  /**
   * يتحقق من ترتيب التنفيذ
   */
  validateConstructionSequence(stages) {
    const errors = [];
    const warnings = [];

    if (!stages || stages.length === 0) {
      return {
        valid: false,
        errors: [{ stage: 'all', issue: 'لا توجد مراحل للتحقق', severity: 'error', suggestedFix: 'أضف مراحل المشروع', rule: 'N/A' }],
        warnings: []
      };
    }

    const stageNames = stages.map(s => (s.nameAr || s.nameEn || '').toLowerCase());

    for (let i = 0; i < stages.length; i++) {
      const current = stages[i];
      const currentName = (current.nameAr || current.nameEn || '').toLowerCase();

      // تحقق من القاعدة R007: كل مرحلة تعتمد على التي تسبقها
      if (i > 0) {
        const prev = stages[i - 1];
        const prevName = (prev.nameAr || prev.nameEn || '').toLowerCase();
        const prevDays = prev.duration || 0;

        if (current.startDay != null && prev.endDay != null && current.startDay < prev.endDay) {
          errors.push({
            stage: current.nameAr || current.nameEn,
            issue: `"${current.nameAr}" تبدأ قبل انتهاء "${prev.nameAr}"`,
            severity: 'error',
            suggestedFix: `اجعل بداية "${current.nameAr}" بعد يوم ${prev.endDay}`,
            rule: 'R007 - كل مرحلة تعتمد على المرحلة التي تسبقها'
          });
        }
      }

      // تحقق من باقي القوانين
      for (const rule of this.rules) {
        if (rule.id === 'R007') continue; // تم التحقق منها أعلاه

        const dependsOn = rule.dependsOn;
        const blockedBy = rule.blockedBy;

        // هل المرحلة الحالية مخالفة؟
        const isBlocked = blockedBy.some(b => currentName.includes(b));
        if (isBlocked) {
          // ابحث عن مرحلة الاعتماد
          const hasDependency = stageNames.some(
            (sn, si) => si < i && (sn.includes(dependsOn) || sn.includes(rule.dependsOn))
          );
          if (!hasDependency) {
            errors.push({
              stage: current.nameAr || current.nameEn,
              issue: `${rule.rule}: "${current.nameAr}"`,
              severity: 'error',
              suggestedFix: `أضف مرحلة "${dependsOn}" قبل "${current.nameAr}"`,
              rule: `${rule.id} - ${rule.rule}`
            });
          }
        }
      }

      // تحذيرات للمراحل القصيرة جداً
      if (current.duration != null && current.duration < 1) {
        warnings.push({
          stage: current.nameAr || current.nameEn,
          issue: `مدة المرحلة "${current.nameAr}" أقل من يوم واحد`,
          severity: 'warning',
          suggestedFix: `زد مدة "${current.nameAr}" إلى يوم واحد على الأقل`,
          rule: 'N/A'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * يتحقق من اكتمال المرحلة
   */
  validateStageCompletion(stage, progress = 0, minimumRequired = 0.95) {
    if (!stage) {
      return {
        completed: false,
        progress: 0,
        issue: 'المرحلة غير موجودة',
        severity: 'error'
      };
    }
    const completed = progress >= minimumRequired;
    return {
      completed,
      progress: Math.min(1, Math.max(0, progress)),
      minimumRequired,
      issue: completed
        ? null
        : `"${stage.nameAr}" لم تكتمل بعد (${Math.round(progress * 100)}% من أصل ${Math.round(minimumRequired * 100)}%)`,
      severity: completed ? null : 'warning',
      stage: stage.id || stage.nameEn
    };
  }

  /**
   * يتحقق من ترتيب المواد
   */
  validateMaterialOrder(materials = []) {
    const errors = [];
    if (materials.length === 0) {
      return { valid: true, errors: [], warnings: [{ message: 'لا توجد مواد للتحقق' }] };
    }

    const priority = {
      خرسانة: 1, concrete: 1,
      بلوك: 2, block: 2, bricks: 2,
      لياسة: 3, plaster: 3,
      دهان: 4, paint: 4, painting: 4,
      بلاط: 5, tiles: 5, flooring: 5,
      سباكة: 6, plumbing: 6,
      كهرباء: 7, electrical: 7, wiring: 7
    };

    let lastPriority = 0;
    let lastName = '';
    for (const mat of materials) {
      const matName = (mat.name || mat.type || '').toLowerCase();
      const matPriority = priority[matName] || Object.entries(priority).find(([k]) => matName.includes(k))?.[1] || 0;

      if (matPriority > 0 && matPriority < lastPriority) {
        errors.push({
          material: mat.name || mat.type,
          issue: `"${mat.name || mat.type}" بعد "${lastName}" (ترتيب غير صحيح)`,
          severity: 'error',
          suggestedFix: `قدّم "${mat.name || mat.type}" قبل "${lastName}"`,
          rule: 'R003/R004 - ترتيب المواد: خرسانة ← بلوك ← لياسة ← دهان ← بلاط'
        });
      }

      if (matPriority > 0) {
        lastPriority = matPriority;
        lastName = mat.name || mat.type;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * يتحقق من اتساق BOQ مع المراحل
   */
  validateBOQConsistency(boqItems = [], stages = []) {
    const errors = [];
    const warnings = [];

    if (boqItems.length === 0) {
      warnings.push({ issue: 'لا توجد بنود BOQ للتحقق', severity: 'warning' });
    }
    if (stages.length === 0) {
      warnings.push({ issue: 'لا توجد مراحل للتحقق', severity: 'warning' });
    }

    // تحقق من أن كل بند في BOQ مرتبط بمرحلة
    const stageIds = new Set(stages.map(s => s.id));
    for (const item of boqItems) {
      if (item.stageId && !stageIds.has(item.stageId)) {
        errors.push({
          stage: item.stageId,
          item: item.description || item.name,
          issue: `البند "${item.description || item.name}" مرتبط بمرحلة غير موجودة "${item.stageId}"`,
          severity: 'error',
          suggestedFix: `اربط البند بإحدى المراحل الموجودة: ${Array.from(stageIds).join('، ')}`,
          rule: 'اتساق BOQ مع المراحل'
        });
      }
    }

    // تحقق من أن تكلفة BOQ لا تقل كثيراً عن تكلفة المراحل
    const boqTotal = boqItems.reduce((s, i) => s + (i.cost || i.totalCost || 0), 0);
    const stagesTotal = stages.reduce((s, st) => s + (st.cost || 0), 0);
    if (boqTotal > 0 && stagesTotal > 0) {
      const ratio = stagesTotal / boqTotal;
      if (ratio < 0.8) {
        warnings.push({
          issue: `تكلفة المراحل (${stagesTotal.toLocaleString()}) أقل بكثير من تكلفة BOQ (${boqTotal.toLocaleString()})`,
          severity: 'warning',
          suggestedFix: 'راجع توزيع التكلفة على المراحل',
          rule: 'اتساق التكلفة'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * يتحقق من الجدول الزمني
   */
  validateSchedule(schedule = {}, stages = []) {
    const errors = [];
    const warnings = [];

    if (!schedule || stages.length === 0) {
      return {
        valid: false,
        errors: [{ issue: 'الجدول الزمني أو المراحل غير موجودة', severity: 'error', suggestedFix: 'أضف الجدول الزمني والمراحل', rule: 'N/A' }],
        warnings: []
      };
    }

    const { startDate, endDate, totalDays } = schedule;

    // تحقق من أن totalDays يتوافق مع مجموع durations
    const stagesDays = stages.reduce((s, st) => s + (st.duration || 0), 0);
    if (totalDays && stagesDays > totalDays * 1.1) {
      errors.push({
        issue: `إجمالي أيام المراحل (${stagesDays}) يتجاوز totalDays (${totalDays})`,
        severity: 'error',
        suggestedFix: `قلل مدة المراحل أو زد totalDays إلى ${stagesDays}`,
        rule: 'مطابقة الجدول الزمني'
      });
    }

    // تحقق من تواريخ البدء والانتهاء
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (e <= s) {
        errors.push({
          issue: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء',
          severity: 'error',
          suggestedFix: 'صحح التواريخ',
          rule: 'الجدول الزمني'
        });
      }
    }

    // تحذير للمشاريع القصيرة جداً
    if (totalDays && totalDays < 30) {
      warnings.push({
        issue: `الجدول الزمني قصير جداً (${totalDays} يوم)`,
        severity: 'warning',
        suggestedFix: 'راجع مدة المشروع',
        rule: 'N/A'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * يتحقق من توافق BIM مع المراحل
   */
  validateBIMSync(bimData = {}, stages = []) {
    const errors = [];
    const warnings = [];

    if (!bimData || Object.keys(bimData).length === 0) {
      return {
        valid: false,
        errors: [{ issue: 'لا توجد بيانات BIM للتحقق', severity: 'error', suggestedFix: 'أضف بيانات BIM', rule: 'N/A' }],
        warnings: []
      };
    }

    const bimElements = bimData.elements || bimData.Elements || [];
    if (bimElements.length === 0) {
      warnings.push({ issue: 'لا توجد عناصر BIM', severity: 'warning' });
      return { valid: true, errors, warnings };
    }

    // تحقق من أن كل مرحلة لها عناصر BIM مقابلة
    for (const stage of stages) {
      const stageName = (stage.nameAr || stage.nameEn || '').toLowerCase();
      const matchingElements = bimElements.filter(e => {
        const elemStage = (e.stage || e.phase || '').toLowerCase();
        return elemStage.includes(stageName) || stageName.includes(elemStage);
      });

      if (matchingElements.length === 0) {
        warnings.push({
          stage: stage.nameAr || stage.nameEn,
          issue: `لا توجد عناصر BIM للمرحلة "${stage.nameAr}"`,
          severity: 'warning',
          suggestedFix: `أضف عناصر BIM للمرحلة "${stage.nameAr}"`,
          rule: 'توافق BIM مع المراحل'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * يقترح تصحيحات للأخطاء
   */
  suggestCorrections(validationErrors) {
    if (!validationErrors || validationErrors.length === 0) {
      return [];
    }

    const suggestions = validationErrors.map((err, index) => {
      const fix = err.suggestedFix || this._generateFixSuggestion(err);
      return {
        id: `fix_${index + 1}`,
        stage: err.stage,
        issue: err.issue,
        severity: err.severity,
        suggestedFix: fix,
        priority: err.severity === 'error' ? 'عالية' : 'متوسطة',
        automated: fix !== err.suggestedFix
      };
    });

    // رتب حسب الأولوية
    suggestions.sort((a, b) => {
      if (a.priority === 'عالية' && b.priority !== 'عالية') return -1;
      if (a.priority !== 'عالية' && b.priority === 'عالية') return 1;
      return 0;
    });

    return suggestions;
  }

  /**
   * يولد إصلاحاً مقترحاً بشكل تلقائي
   */
  _generateFixSuggestion(error) {
    if (!error) return 'راجع البيانات';
    const issue = (error.issue || '').toLowerCase();
    const stage = error.stage || '';

    if (issue.includes('قبل')) return `أعد ترتيب "${stage}" لتكون بعد المرحلة المطلوبة`;
    if (issue.includes('غير موجود')) return `أضف "${stage}"`;
    if (issue.includes('يتجاوز') || issue.includes('أقل')) return `راجع القيم لـ "${stage}"`;
    if (issue.includes('غير صحيح')) return `صحح ترتيب "${stage}"`;

    return `راجع "${stage}" وحاول مرة أخرى`;
  }
}

module.exports = SimulationValidator;
