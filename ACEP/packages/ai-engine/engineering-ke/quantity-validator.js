class QuantityValidator {
  constructor() {
    this.rules = {
      'م²': { type: 'area-based', min: 0.1, max: 100000 },
      'م³': { type: 'volume-based', min: 0.01, max: 50000 },
      'م طولي': { type: 'length-based', min: 0.1, max: 50000 },
      'وحدة': { type: 'count-based', min: 1, max: 100000 },
      'طن': { type: 'weight-based', min: 0.001, max: 10000 },
      'كجم': { type: 'weight-based', min: 0.1, max: 100000 },
      'لتر': { type: 'volume-based', min: 0.1, max: 100000 },
      'م³/ساعة': { type: 'flow-based', min: 0.1, max: 10000 },
    };

    this.ratios = {
      'حديد تسليح': { relatedTo: 'خرسانة مسلحة', ratio: { min: 80, max: 150, unit: 'كجم/م³' } },
      'غراء بلاط': { relatedTo: 'بلاط', ratio: { min: 3, max: 6, unit: 'كجم/م²' } },
      'معجون': { relatedTo: 'دهان', ratio: { min: 1, max: 3, unit: 'كجم/م²' } },
      'برايمر': { relatedTo: 'دهان', ratio: { min: 0.1, max: 0.3, unit: 'لتر/م²' } },
      'دهان وجه أول': { relatedTo: 'دهان وجه ثاني', ratio: { min: 0.8, max: 1.5, unit: 'نسبة' } },
      'خرسانة عادية': { relatedTo: 'خرسانة مسلحة', ratio: { min: 0.1, max: 0.5, unit: 'نسبة' } },
    };
  }

  validate(items, projectParams = {}) {
    const results = [];
    for (const item of items) {
      results.push(this.validateItem(item, projectParams));
    }
    return results;
  }

  validateItem(item, projectParams = {}) {
    const result = {
      code: item.code,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      isValid: true,
      issues: [],
      suggestedQuantity: item.quantity,
      confidence: 1,
    };

    const unitCheck = this.checkUnit(item.unit);
    if (!unitCheck.isValid) {
      result.isValid = false;
      result.issues.push({
        type: 'INVALID_UNIT',
        message: unitCheck.message,
        severity: 'error',
      });
      result.confidence = Math.min(result.confidence, 0.3);
    }

    const rangeCheck = this.checkQuantityRange(item.quantity, item.unit, this.rules[item.unit]?.type);
    if (!rangeCheck.isValid) {
      result.isValid = false;
      result.issues.push({
        type: 'OUT_OF_RANGE',
        message: rangeCheck.message,
        severity: 'error',
      });
      result.suggestedQuantity = rangeCheck.suggested;
      result.confidence = Math.min(result.confidence, 0.4);
    }

    if (item.area && item.unit === 'م²') {
      const areaDiff = Math.abs(item.quantity - item.area);
      const areaRatio = areaDiff / item.area;
      if (areaRatio > 0.3) {
        result.issues.push({
          type: 'AREA_MISMATCH',
          message: `الكمية (${item.quantity} م²) لا تتطابق مع المساحة المرجعية (${item.area} م²)`,
          severity: 'warning',
        });
        result.confidence = Math.min(result.confidence, 0.6);
      }
    }

    if (item.volume && item.unit === 'م³') {
      const volDiff = Math.abs(item.quantity - item.volume);
      const volRatio = volDiff / item.volume;
      if (volRatio > 0.3) {
        result.issues.push({
          type: 'VOLUME_MISMATCH',
          message: `الكمية (${item.quantity} م³) لا تتطابق مع الحجم المرجعي (${item.volume} م³)`,
          severity: 'warning',
        });
        result.confidence = Math.min(result.confidence, 0.6);
      }
    }

    return result;
  }

  checkUnit(unit) {
    if (!unit) {
      return { isValid: false, message: 'الوحدة فارغة' };
    }
    if (!this.rules[unit]) {
      return { isValid: false, message: `الوحدة "${unit}" غير معروفة` };
    }
    return { isValid: true, message: 'الوحدة صحيحة' };
  }

  checkQuantityRange(qty, unit, type) {
    const rule = this.rules[unit];
    if (!rule) {
      return { isValid: false, message: `لا توجد قواعد للوحدة "${unit}"` };
    }
    if (qty < rule.min) {
      return {
        isValid: false,
        message: `الكمية (${qty} ${unit}) أقل من الحد الأدنى (${rule.min} ${unit})`,
        suggested: rule.min,
      };
    }
    if (qty > rule.max) {
      return {
        isValid: false,
        message: `الكمية (${qty} ${unit}) أكبر من الحد الأعلى (${rule.max} ${unit})`,
        suggested: rule.max,
      };
    }
    return { isValid: true, message: 'الكمية ضمن النطاق المنطقي' };
  }

  checkQuantityConsistency(items, relatedPairs = null) {
    const pairs = relatedPairs || Object.entries(this.ratios);
    const issues = [];

    for (const [itemCode, rule] of pairs) {
      const parentItem = items.find((i) => i.code === itemCode);
      const relatedItem = items.find((i) => i.code === rule.relatedTo);
      if (!parentItem || !relatedItem) continue;

      const actualRatio = parentItem.quantity / relatedItem.quantity;
      if (actualRatio < rule.ratio.min || actualRatio > rule.ratio.max) {
        issues.push({
          code: itemCode,
          relatedCode: rule.relatedTo,
          actual: `${actualRatio.toFixed(2)} ${rule.ratio.unit}`,
          expected: `${rule.ratio.min}-${rule.ratio.max} ${rule.ratio.unit}`,
          message: `${itemCode}: النسبة الفعلية ${actualRatio.toFixed(2)} ${rule.ratio.unit} خارج النطاق المتوقع (${rule.ratio.min}-${rule.ratio.max} ${rule.ratio.unit})`,
          severity: actualRatio < rule.ratio.min * 0.5 || actualRatio > rule.ratio.max * 2 ? 'error' : 'warning',
        });
      }
    }
    return issues;
  }

  checkDuplicateItems(items) {
    const seen = new Map();
    const duplicates = [];
    for (const item of items) {
      const key = `${item.code}_${item.unit}`;
      if (seen.has(key)) {
        duplicates.push({
          code: item.code,
          unit: item.unit,
          index: items.indexOf(item),
          previousIndex: seen.get(key),
          message: `بند مكرر: "${item.code}" (${item.description})`,
          severity: 'warning',
        });
      }
      seen.set(key, items.indexOf(item));
    }
    return duplicates;
  }

  getValidationReport(items, projectParams = {}) {
    const validationResults = this.validate(items, projectParams);
    const duplicates = this.checkDuplicateItems(items);

    const ratioIssues = this.checkQuantityConsistency(items);
    for (const issue of ratioIssues) {
      const target = validationResults.find((r) => r.code === issue.code);
      if (target) {
        target.isValid = target.isValid && issue.severity !== 'error';
        target.issues.push({
          type: 'RATIO_MISMATCH',
          message: issue.message,
          severity: issue.severity,
        });
        target.confidence = Math.min(
          target.confidence,
          issue.severity === 'error' ? 0.3 : 0.6
        );
      }
    }

    const totalItems = validationResults.length;
    const validItems = validationResults.filter((r) => r.isValid).length;
    const invalidItems = totalItems - validItems;
    const avgConfidence =
      validationResults.reduce((sum, r) => sum + r.confidence, 0) / totalItems;

    return {
      items: validationResults,
      duplicates,
      summary: {
        totalItems,
        validItems,
        invalidItems,
        avgConfidence: parseFloat(avgConfidence.toFixed(2)),
      },
    };
  }
}

module.exports = QuantityValidator;
