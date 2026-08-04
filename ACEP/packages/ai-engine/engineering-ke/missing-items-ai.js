/**
 * ACEP Engineering Missing Items AI
 *
 * Stage 5: Detect missing BOQ items by analyzing existing items
 * and checking for associated required items that are absent.
 */

const DEFAULT_IMPACTS = {
  paint: 'تنفيذ الدهان بدون تجهيز السطح يؤدي إلى تشقق وتقشر الدهان مستقبلاً',
  tile: 'نقص مواد التركيب يؤدي إلى ضعف في تثبيت البلاط وعدم متانة التشطيب',
  bathroom: 'نقص تجهيزات الحمام يؤدي إلى تأخير مرحلة التشطيبات وتكلفة إضافية',
  kitchen: 'المطبخ يحتاج لتكامل جميع العناصر لضمان الجودة والوظيفية',
  electrical: 'نقص التمديدات الكهربائية يؤدي إلى إعادة العمل وتكاليف إضافية',
  hvac: 'نظام التكييف يحتاج تكامل جميع المكونات لضمان الكفاءة',
  concrete: 'نقص مكونات الخرسانة يؤدي إلى ضعف في الهيكل الإنشائي',
  steel: 'نقص أعمال الحديد يؤثر على سلامة المنشأ',
  formwork: 'نقص أعمال الشدات يؤثر على جودة الصب',
};

class MissingItemsAI {
  constructor() {
    this.rules = this._buildRules();
  }

  _buildRules() {
    return [
      {
        category: 'دهانات',
        triggers: ['دهان', 'paint'],
        required: [
          'معجون', 'putty',
          'برايمر', 'primer',
          'صنفرة', 'sandpaper',
          'وجه أول', 'first coat',
          'وجه ثاني', 'second coat',
          'تنظيف السطح', 'surface cleaning',
        ],
        impact: DEFAULT_IMPACTS.paint,
        priority: 'high',
        confidence: 0.85,
      },
      {
        category: 'بلاط',
        triggers: ['بلاط', 'سيراميك', 'ceramic', ' tiles'],
        required: [
          'غراء بلاط', 'tile adhesive',
          'روبة', 'grout',
          'وزرات', 'skirting',
          'قص بلاط', 'tile cutting',
          'فواصل', 'expansion joint',
          'تنظيف', 'cleaning',
        ],
        impact: DEFAULT_IMPACTS.tile,
        priority: 'high',
        confidence: 0.85,
      },
      {
        category: 'حمام',
        triggers: ['حمام', 'bathroom', 'حمامات'],
        required: [
          'عزل مائي', 'waterproofing',
          'سباكة', 'plumbing rough-in',
          'سيراميك', 'ceramic tiles',
          'سقف مستعار', 'false ceiling',
          'خلاطات', 'faucets',
          'كرسي', 'wc',
          'مغسلة', 'sink',
          'شفاط', 'exhaust fan',
          'مرآة', 'mirror',
          'إكسسوارات حمام', 'bathroom accessories',
        ],
        impact: DEFAULT_IMPACTS.bathroom,
        priority: 'critical',
        confidence: 0.9,
      },
      {
        category: 'مطبخ',
        triggers: ['مطبخ', 'kitchen'],
        required: [
          'رخام', 'marble', 'granite countertop',
          'خزائن مطبخ', 'kitchen cabinet',
          'حوض', 'kitchen sink',
          'خلاط مطبخ', 'kitchen faucet',
          'شفاط مطبخ', 'range hood',
          'سيراميك مطبخ', 'kitchen tiles',
        ],
        impact: DEFAULT_IMPACTS.kitchen,
        priority: 'critical',
        confidence: 0.9,
      },
      {
        category: 'كهرباء',
        triggers: ['كهرباء', 'electrical'],
        required: [
          'تمديدات كهربائية', 'electrical conduits',
          'لوحات توزيع', 'distribution panel',
          'قواطع', 'circuit breaker',
          'التأريض', 'grounding system',
          'الإنارة', 'lighting fixture',
          'المفاتيح', 'switches',
          'المخارج', 'sockets', 'outlets',
          'ups',
          'مولد', 'generator',
          'مانع الصواعق', 'lightning protection',
        ],
        impact: DEFAULT_IMPACTS.electrical,
        priority: 'critical',
        confidence: 0.9,
      },
      {
        category: 'تكييف',
        triggers: ['تكييف', 'hvac', 'air condition'],
        required: [
          'مجاري الهواء', 'ductwork',
          'عزل المواسير', 'pipe insulation',
          'جريلات', 'grilles',
          'دفيوزر', 'diffusers',
          'تصريف', 'condensate drain',
          'توصيلات كهربائية', 'electrical connections',
          'قواعد المكيف', 'ac unit support',
          'نظام تحكم', 'control system',
        ],
        impact: DEFAULT_IMPACTS.hvac,
        priority: 'critical',
        confidence: 0.9,
      },
      {
        category: 'خرسانة',
        triggers: ['خرسانة', 'concrete', 'صب'],
        required: [
          'حديد', 'steel', 'rebar',
          'شدات', 'formwork',
          'صب', 'pouring', 'casting',
          'معالجة', 'curing',
        ],
        impact: DEFAULT_IMPACTS.concrete,
        priority: 'critical',
        confidence: 0.85,
      },
      {
        category: 'حديد',
        triggers: ['حديد', 'steel', 'rebar', 'تسليح'],
        required: [
          'تقطيع', 'cutting',
          'ثني', 'bending',
          'تركيب', 'fixing', 'installation',
        ],
        impact: DEFAULT_IMPACTS.steel,
        priority: 'high',
        confidence: 0.8,
      },
      {
        category: 'شدات',
        triggers: ['شدات', 'formwork', 'قوالب'],
        required: [
          'نجارة', 'carpentry',
          'فك', 'stripping', 'removal',
        ],
        impact: DEFAULT_IMPACTS.formwork,
        priority: 'medium',
        confidence: 0.75,
      },
    ];
  }

  /**
   * Search items for a keyword (case-insensitive partial match in both code and description).
   * Returns the first matched item or null.
   */
  hasItem(items, keyword) {
    if (!items || !Array.isArray(items) || !keyword) return false;
    const kw = keyword.toLowerCase();
    for (const item of items) {
      const code = (item.code || item.itemCode || '').toLowerCase();
      const desc = (item.description || item.name || item.itemDescription || '').toLowerCase();
      if (code.includes(kw) || desc.includes(kw)) return true;
    }
    return false;
  }

  /**
   * Find missing items in a BOQ item list.
   *
   * @param {Array} boqItems - Array of BOQ items with { code, description, ... }
   * @param {string} projectType - e.g. 'villa', 'building', 'warehouse'
   * @returns {Array} - Array of { category, foundItem, missingItems, impact, priority, confidence }
   */
  findMissingItems(boqItems, projectType) {
    const results = [];

    if (!boqItems || !Array.isArray(boqItems) || boqItems.length === 0) return results;

    for (const rule of this.rules) {
      // Check if any of the trigger keywords exist in the BOQ
      const matchedItem = this._findTriggeredItem(boqItems, rule.triggers);
      if (!matchedItem) continue;

      const missing = [];

      for (let i = 0; i < rule.required.length; i += 2) {
        const arKw = rule.required[i];
        const enKw = rule.required[i + 1];

        const foundAr = arKw ? this.hasItem(boqItems, arKw) : false;
        const foundEn = enKw ? this.hasItem(boqItems, enKw) : false;
        const foundAny = foundAr || foundEn;

        if (!foundAny) {
          missing.push(enKw ? `${arKw} (${enKw})` : arKw);
        }
      }

      if (missing.length > 0) {
        results.push({
          category: rule.category,
          foundItem: matchedItem,
          missingItems: missing,
          impact: rule.impact,
          priority: rule.priority,
          confidence: Math.min(1, rule.confidence + (missing.length / rule.required.length) * 0.1),
        });
      }
    }

    return results;
  }

  _findTriggeredItem(items, triggers) {
    for (const item of items) {
      const code = (item.code || item.itemCode || '').toLowerCase();
      const desc = (item.description || item.name || item.itemDescription || '').toLowerCase();
      for (const trigger of triggers) {
        if (code.includes(trigger.toLowerCase()) || desc.includes(trigger.toLowerCase())) {
          return `${item.code || item.itemCode || ''} - ${item.description || item.name || item.itemDescription || ''}`;
        }
      }
    }
    return null;
  }

  /**
   * Generate a detailed human-readable report of missing items.
   *
   * @param {Array} missingItems - Result from findMissingItems
   * @returns {string} - Formatted report
   */
  getMissingItemsReport(missingItems) {
    if (!missingItems || missingItems.length === 0) {
      return 'لم يتم العثور على بنود مفقودة';
    }

    const lines = [];
    lines.push('═══════════════════════════════════════════');
    lines.push('  تقرير البنود المفقودة - Missing Items Report');
    lines.push('═══════════════════════════════════════════');
    lines.push('');

    let totalMissing = 0;
    let criticalCount = 0;
    let highCount = 0;

    for (const item of missingItems) {
      totalMissing += item.missingItems.length;
      if (item.priority === 'critical') criticalCount++;
      if (item.priority === 'high') highCount++;

      lines.push(`┌── ${item.category}`);
      lines.push(`│  البند الموجود (Found Item): ${item.foundItem}`);
      lines.push(`│  الأولوية (Priority): ${item.priority}`);
      lines.push(`│  الثقة (Confidence): ${(item.confidence * 100).toFixed(0)}%`);
      lines.push(`│  التأثير (Impact): ${item.impact}`);
      lines.push(`│  البنود المفقودة (Missing Items):`);
      for (const mi of item.missingItems) {
        lines.push(`│    • ${mi}`);
      }
      lines.push('└──');
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════');
    lines.push(`  الملخص (Summary):`);
    lines.push(`  إجمالي الفئات المتأثرة: ${missingItems.length}`);
    lines.push(`  حرجة (Critical): ${criticalCount}`);
    lines.push(`  عالية (High): ${highCount}`);
    lines.push(`  إجمالي البنود المفقودة: ${totalMissing}`);
    lines.push('═══════════════════════════════════════════');

    return lines.join('\n');
  }
}

module.exports = MissingItemsAI;
