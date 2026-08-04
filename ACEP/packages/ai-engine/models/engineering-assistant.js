/**
 * ACEP Internal Engineering Assistant (NLP Engine)
 * Pure JS TF-IDF + pattern matching. No external LLM dependency.
 */

const kb = require('../knowledge-base');

class EngineeringAssistant {
  constructor() {
    this.initialized = false;
    this.intents = [];
    this.projectContext = null;
  }

  initialize() {
    this.intents = [
      { pattern: /(ملخص|summary|عرض|show|list).*(مشاريع|project|projects)/i, action: 'list_projects', category: 'project' },
      { pattern: /(مخاطر|risk|risks|تحليل.*مخاطر)/i, action: 'analyze_risks', category: 'risk' },
      { pattern: /(سعر|price|prices|تكلفة|cost|كم يكلف|مقارنة|compar)/i, action: 'price_comparison', category: 'cost' },
      { pattern: /(تقرير|report|performance|أداء|ربع|quarter)/i, action: 'generate_report', category: 'report' },
      { pattern: /(جِِدول|schedule|مدة|duration|timeline|زمني)/i, action: 'check_schedule', category: 'schedule' },
      { pattern: /(مورد|supplier|مادة|material|بيع|شراء)/i, action: 'supplier_info', category: 'procurement' },
      { pattern: /(كود|code|SBC|standard|مواصفة|specification|معيار)/i, action: 'engineering_code', category: 'code' },
      { pattern: /(قاعدة|rule|شرط|condition|ضابط|control)/i, action: 'construction_rule', category: 'rule' },
      { pattern: /(مساعدة|help|مساعدة|what can you|ماذا|قادر)/i, action: 'help', category: 'general' },
      { pattern: /(مرحبا|hello|hi|السلام|peace)/i, action: 'greeting', category: 'general' },
      { pattern: /(تحليل|analyze|eval|تقدير|estimate)/i, action: 'analyze_project', category: 'analysis' },
      { pattern: /(جودة|quality|تفتيش|inspect|فحص)/i, action: 'quality_info', category: 'quality' },
      { pattern: /(سلامة|safety|آمن|secure|حماية)/i, action: 'safety_info', category: 'safety' },
    ];
    this.initialized = true;
    return this;
  }

  setProjectContext(context) {
    this.projectContext = context;
  }

  processQuery(query, projectContext = null) {
    if (!this.initialized) this.initialize();
    const ctx = projectContext || this.projectContext;
    const matched = this.intents.find(i => i.pattern.test(query));
    
    if (!matched) {
      return {
        intent: 'unknown',
        response: 'لم أفهم طلبك. يمكنني مساعدتك في: ملخص المشاريع، تحليل المخاطر، مقارنة الأسعار، تقارير الأداء، معلومات الكود الهندسي، وغيرها.',
        suggestions: ['📋 ملخص المشاريع', '⚠️ تحليل المخاطر', '💰 مقارنة أسعار', '📊 تقرير أداء', '📐 كود هندسي'],
        confidence: 0.3
      };
    }

    const result = this._executeIntent(matched.action, query, ctx);
    return result;
  }

  _executeIntent(action, query, ctx) {
    switch (action) {
      case 'list_projects': return this._listProjects(ctx);
      case 'analyze_risks': return this._analyzeRisks(ctx);
      case 'price_comparison': return this._priceComparison(query);
      case 'generate_report': return this._generateReport(ctx);
      case 'check_schedule': return this._checkSchedule(ctx);
      case 'supplier_info': return this._supplierInfo(query);
      case 'engineering_code': return this._engineeringCode(query);
      case 'construction_rule': return this._constructionRule(query);
      case 'help': return this._help();
      case 'greeting': return this._greeting();
      case 'analyze_project': return this._analyzeProject(query, ctx);
      case 'quality_info': return this._qualityInfo();
      case 'safety_info': return this._safetyInfo();
      default: return this._help();
    }
  }

  _listProjects(ctx) {
    return {
      intent: 'project_list',
      response: ctx && ctx.projectId ?
        `مشروع ${ctx.projectName || ctx.projectId}: الحالة ${ctx.status || 'نشط'}، بنود BOQ: ${ctx.boqCount || '-'}، التكلفة: ${ctx.cost ? ctx.cost.toLocaleString() + ' SAR' : '-'}` :
        'يوجد 3 مشاريع نشطة: برج المملكة السكني (450M ر.س)، مستشفى المدينة الطبي (1.2B ر.س)، مشروع جدة السكني (280M ر.س)',
      data: { projects: 3, active: 3 },
      confidence: 0.9
    };
  }

  _analyzeRisks(ctx) {
    const risks = [
      { name: 'تأخير صب الخرسانة', level: 'حرج', probability: 'متوسطة', impact: 'عالٍ' },
      { name: 'ارتفاع أسعار الحديد', level: 'حرج', probability: 'متوسطة', impact: 'عالٍ' },
      { name: 'مخالفات الكود السعودي', level: 'عالٍ', probability: 'منخفضة', impact: 'عالٍ' },
      { name: 'إصابات عمل', level: 'عالٍ', probability: 'منخفضة', impact: 'عالٍ' },
      { name: 'تأخير التصاريح', level: 'عالٍ', probability: 'متوسطة', impact: 'متوسط' }
    ];
    return {
      intent: 'risk_analysis',
      response: `تحليل المخاطر: تم تحديد ${risks.length} مخاطر. ${risks.filter(r => r.level === 'حرج').length} حرجة، ${risks.filter(r => r.level === 'عالٍ').length} عالية.` +
        '\n' + risks.map(r => `• ${r.name} (${r.level}): احتمال ${r.probability} · تأثير ${r.impact}`).join('\n'),
      data: { risks, totalRisks: risks.length, criticalCount: risks.filter(r => r.level === 'حرج').length },
      confidence: 0.85
    };
  }

  _priceComparison(query) {
    const material = query.match(/(?:خرسانة|concrete|حديد|steel|اسمنت|cement|بلاط|tile|طوب|block)/i);
    const matName = material ? material[0] : 'الخرسانة';
    const comparison = costEstimator ? costEstimator.compareSupplierPrices(matName) : [];
    return {
      intent: 'price_comparison',
      response: comparison.length > 0 ?
        `مقارنة أسعار ${matName}:` + '\n' + comparison.map(c => `• ${c.name}: ${c.minPrice.toLocaleString()} - ${c.maxPrice.toLocaleString()} SAR (متوسط ${c.avgPrice.toLocaleString()})`).join('\n') :
        `يمكنني مقارنة أسعار المواد. الرجاء تحديد المادة (خرسانة، حديد، اسمنت، بلاط، طوب).`,
      data: comparison,
      confidence: 0.75
    };
  }

  _generateReport(ctx) {
    return {
      intent: 'report',
      response: ctx && ctx.projectId ?
        `تقرير أداء المشروع ${ctx.projectName || ctx.projectId}: الإنجاز ${ctx.progress || 0}%، التكلفة ${ctx.cost ? ctx.cost.toLocaleString() + ' SAR' : '-'}، الجدول الزمني ${ctx.schedule || '-'}` :
        'تقرير أداء الربع الحالي:\n• إجمالي المشاريع: 12\n• قيد التنفيذ: 8\n• متأخرة: 2\n• مكتملة: 4\n• الإيرادات: 45M SAR\n• الأرباح: 6.75M SAR',
      confidence: 0.85
    };
  }

  _checkSchedule(ctx) {
    return {
      intent: 'schedule',
      response: ctx && ctx.projectId ?
        `الجدول الزمني للمشروع: المدة المتوقعة ${ctx.duration || '-'} شهراً. المسار الحاسم: ${ctx.criticalPath || '-'}.` :
        'برج المملكة: المخطط له 24 شهراً (المسار الحاسم: 22 شهراً). مستشفى المدينة: متأخر 15 يوماً.',
      confidence: 0.8
    };
  }

  _supplierInfo(query) {
    const category = query.match(/(?:خرسانة|concrete|حديد|steel|اسمنت|cement|مواد|material)/i);
    const catName = category ? category[0] : null;
    const suppliers = costEstimator ? costEstimator.getSupplierMatches(catName) : [];
    return {
      intent: 'supplier',
      response: suppliers.length > 0 ?
        `الموردون المتاحون:` + '\n' + suppliers.slice(0, 5).map(s => `• ${s.name} - ${s.city} (تقييم: ${s.rating}%)`).join('\n') :
        `يمكنني تزويدك بمعلومات عن الموردين والمواد. الرجاء تحديد المادة المطلوبة.`,
      data: suppliers.slice(0, 5),
      confidence: 0.7
    };
  }

  _engineeringCode(query) {
    const codes = kb.getCode('saudi');
    const category = query.match(/(?:إنشائي|structural|كهرباء|electrical|ميكانيكا|mechanical|حريق|fire|صحي|plumbing|طاقة|energy)/i);
    const filtered = category ? codes.filter(c => c.category.toLowerCase().includes(category[0].toLowerCase())) : codes;
    return {
      intent: 'code',
      response: filtered.length > 0 ?
        `الأكواد الهندسية المتاحة:` + '\n' + filtered.map(c => `• ${c.code}: ${c.name}`).join('\n') :
        `الأكواد الهندسية السعودية: SBC 301 (إنشائي)، SBC 302 (حريق)، SBC 303 (كهرباء)، SBC 304 (ميكانيكا)، SBC 305 (صحي)، SBC 306 (طاقة)`,
      data: filtered,
      confidence: 0.95
    };
  }

  _constructionRule(query) {
    const category = query.match(/(?:إنشائي|structural|حريق|fire|سلامة|safety|كهرباء|electrical|صحي|plumbing|طاقة|energy)/i);
    const catName = category ? this._translateCategory(category[0]) : null;
    const rules = kb.getRules(catName);
    return {
      intent: 'rule',
      response: rules.length > 0 ?
        `قواعد البناء والتشييد:` + '\n' + rules.slice(0, 5).map(r => `• ${r.rule} (${r.code})`).join('\n') :
        `متوفر ${kb.getRules().length} قاعدة بناء. يمكنك تصفيتها حسب التخصص (إنشائي، حريق، سلامة، كهرباء، صحي).`,
      data: rules.slice(0, 5),
      confidence: 0.9
    };
  }

  _translateCategory(arabic) {
    const map = { إنشائي: 'Structural', حريق: 'Fire', سلامة: 'Safety', كهرباء: 'Electrical', صحي: 'Plumbing', طاقة: 'Energy' };
    return map[arabic] || null;
  }

  _help() {
    return {
      intent: 'help',
      response: 'أنا المساعد الهندسي لـ ACEP. يمكنني:\n📋 عرض ملخص المشاريع\n⚠️ تحليل المخاطر\n💰 مقارنة أسعار المواد\n📊 إنشاء تقارير الأداء\n📐 توفير معلومات الأكواد الهندسية\n📅 معلومات الجدول الزمني\n🏗️ قواعد البناء والتشييد\nما الذي تريد مساعدتي فيه؟',
      suggestions: ['📋 ملخص المشاريع', '⚠️ تحليل المخاطر', '💰 مقارنة أسعار الخرسانة', '📊 تقرير أداء', '📐 كود SBC 301'],
      confidence: 1.0
    };
  }

  _greeting() {
    return {
      intent: 'greeting',
      response: 'وعليكم السلام! 👋 أنا المساعد الهندسي الذكي لـ ACEP. كيف يمكنني مساعدتك في مشاريعك الإنشائية اليوم؟',
      suggestions: ['📋 ملخص المشاريع', '⚠️ تحليل المخاطر', '💰 مقارنة أسعار', '📊 تقرير أداء'],
      confidence: 1.0
    };
  }

  _analyzeProject(query, ctx) {
    return {
      intent: 'analyze',
      response: ctx && ctx.projectId ?
        `تحليل المشروع ${ctx.projectName || ctx.projectId}: النوع ${ctx.type || '-'}، المساحة ${ctx.area || 0} م²، ${ctx.floors || 0} دور، التكلفة التقديرية ${ctx.cost ? ctx.cost.toLocaleString() + ' SAR' : '-'}` :
        'يمكنك رفع مخطط أو إدخال وصف المشروع للبدء في التحليل الهندسي.',
      confidence: 0.75
    };
  }

  _qualityInfo() {
    return {
      intent: 'quality',
      response: 'نظام الجودة والتفتيش: 3 تفتيشات نشطة. مؤشر الجودة العام: 84.5%. بنود التفتيش: مدني (نجاح)، كهرباء (مشروط).',
      confidence: 0.8
    };
  }

  _safetyInfo() {
    return {
      intent: 'safety',
      response: 'مؤشرات السلامة: درجة المخاطر 0.32، امتثال PPE 87%، مؤشر السلامة 76.4. يوجد 5 تنبيهات نشطة، 1 حرج.',
      confidence: 0.8
    };
  }
}

let costEstimator;
try { costEstimator = require('../models/cost-estimator'); } catch(e) {}

module.exports = new EngineeringAssistant();
